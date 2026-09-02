"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPatientByPhone } from "@/lib/patients";
import { requireRole } from "@/lib/auth";

export interface CreatePatientResult {
  patient?: { id: string; fullName: string };
  existed?: boolean;
  error?: string;
}

/**
 * Find-or-create a patient by phone — the walk-in dialog's logic promoted to a
 * first-class action (Phase 5.2). Lookup goes through the audited
 * staff_lookup_patient_by_phone path; creation mirrors addWalkIn: an auth user
 * with a confirmed phone (the patient can later log in via OTP) plus a
 * profiles row.
 */
export async function createPatient(params: {
  fullName: string;
  phone: string;
}): Promise<CreatePatientResult> {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) return { error: "Unauthorized" };

  const fullName = params.fullName.trim();
  const rawPhone = params.phone.trim();
  if (!fullName) return { error: "Patient name is required" };
  if (!rawPhone) return { error: "Phone number is required" };

  const formattedPhone = rawPhone.startsWith("+") ? rawPhone : `+6${rawPhone}`;
  const supabase = await createServerClient();

  const existing = await findPatientByPhone(supabase, formattedPhone);
  if (existing) {
    return { patient: existing, existed: true };
  }

  const admin = createAdminClient();
  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    phone: formattedPhone,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !authData.user) {
    return { error: createError?.message ?? "Failed to create patient" };
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    { id: authData.user.id, full_name: fullName, phone_number: formattedPhone },
    { onConflict: "id" },
  );
  if (profileError) return { error: profileError.message };

  // Best-effort audit; log_activity swallows its own failures too
  if (user.clinicId) {
    await supabase.rpc("log_activity", {
      p_clinic_id: user.clinicId,
      p_action: "PATIENT_CREATED",
      p_target_type: "profile",
      p_target_id: authData.user.id,
      p_metadata: { phone: formattedPhone },
    });
  }

  revalidatePath("/patients");
  return { patient: { id: authData.user.id, fullName }, existed: false };
}

export interface PatientHistoryEntry {
  id: string;
  date: string;
  startTime: string;
  status: string;
  treatmentType: string | null;
  doctorName: string;
}

/** Appointment history for one patient at the caller's clinic (latest first). */
export async function fetchPatientHistory(
  patientId: string,
): Promise<PatientHistoryEntry[]> {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user?.clinicId) return [];

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("appointments")
    .select(`
      id,
      appointment_date,
      status,
      treatment_type,
      time_slots ( start_time ),
      doctors ( clinic_staff ( full_name ) )
    `)
    .eq("clinic_id", user.clinicId)
    .eq("patient_id", patientId)
    .order("appointment_date", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => {
    const slot = row.time_slots as unknown as { start_time: string } | null;
    const doc = row.doctors as unknown as {
      clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
    } | null;
    const staffEntry = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;
    return {
      id: row.id as string,
      date: row.appointment_date as string,
      startTime: slot ? (slot.start_time as string).slice(0, 5) : "",
      status: row.status as string,
      treatmentType: (row.treatment_type as string | null) ?? null,
      doctorName: staffEntry?.full_name ?? "Doctor",
    };
  });
}
