"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getDoctorSlotsForDate } from "@/lib/queries/slots";

export async function fetchSlotsForDialog(
  clinicId: string,
  doctorId: string,
  date: string,
): Promise<Array<{ startTime: string; endTime: string; available: boolean }>> {
  const all = await getDoctorSlotsForDate(clinicId, date);
  const docData = all.find((d) => d.doctorId === doctorId);
  return (
    docData?.slots.map((s) => ({
      startTime: s.start,
      endTime: s.end,
      available: s.status === "AVAILABLE",
    })) ?? []
  );
}

export async function fetchClinicDoctors(
  clinicId: string,
): Promise<Array<{ id: string; name: string; specialization: string | null }>> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("doctors")
    .select(`
      id,
      specialization,
      clinic_staff!inner ( full_name, clinic_id, is_active )
    `)
    .eq("clinic_staff.clinic_id", clinicId)
    .eq("clinic_staff.is_active", true);

  if (!data) return [];
  return data.map((d) => {
    const staff = Array.isArray(d.clinic_staff) ? d.clinic_staff[0] : d.clinic_staff;
    return {
      id: d.id,
      name: (staff as { full_name: string } | null)?.full_name ?? "Doctor",
      specialization: d.specialization ?? null,
    };
  });
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "CONFIRMED" | "COMPLETED" | "NO_SHOW",
): Promise<{ error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) return { error: error.message };

  revalidatePath("/appointments");
  return {};
}

export async function checkInAppointment(appointmentId: string): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const { error } = await supabase.rpc("check_in_appointment", { p_appointment_id: appointmentId });
  if (error) return { error: error.message };
  revalidatePath("/appointments");
  revalidatePath("/queue");
  return {};
}

export async function completeAppointment(appointmentId: string): Promise<{ error?: string }> {
  return updateAppointmentStatus(appointmentId, "COMPLETED");
}

export async function markNoShow(appointmentId: string): Promise<{ error?: string }> {
  // Intentionally a plain status update, not cancel_appointment: the appointment
  // time has already passed, so the slot stays BOOKED (not reopened for rebooking)
  // while the appointment itself still reports as NO_SHOW for analytics.
  return updateAppointmentStatus(appointmentId, "NO_SHOW");
}

export async function cancelAppointmentStaff(appointmentId: string): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const { error } = await supabase.rpc("cancel_appointment", { p_appointment_id: appointmentId });
  if (error) return { error: error.message };
  revalidatePath("/appointments");
  revalidatePath("/queue");
  return {};
}

export interface StaffBookingParams {
  patientPhone: string;
  doctorId: string;
  clinicId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export async function createStaffAppointment(
  params: StaffBookingParams,
): Promise<{ appointmentId?: string; error?: string }> {
  const supabase = await createServerClient();

  // Look up patient by phone number
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", params.patientPhone)
    .single();

  if (!profile) {
    return { error: "No patient found with this phone number. Ask them to register via the patient app first." };
  }

  const { data, error } = await supabase.rpc("staff_book_appointment", {
    p_patient_id: profile.id,
    p_doctor_id:  params.doctorId,
    p_clinic_id:  params.clinicId,
    p_slot_date:  params.date,
    p_start_time: `${params.startTime}:00`,
    p_end_time:   `${params.endTime}:00`,
    p_notes:      params.notes ?? null,
  });

  if (error) {
    const hint = error.message.includes("SLOT_UNAVAILABLE")
      ? "This slot was just taken. Please choose another time."
      : error.message.includes("PATIENT_NOT_FOUND")
      ? "Patient not found. Ask them to register via the patient app first."
      : error.message;
    return { error: hint };
  }

  revalidatePath("/appointments");
  return { appointmentId: data as string };
}

export async function lookupPatientByPhone(
  phone: string,
): Promise<{ id: string; fullName: string } | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("phone", phone)
    .single();
  if (!data) return null;
  return { id: data.id, fullName: data.full_name ?? "" };
}
