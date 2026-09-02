"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import {
  getMYTToday,
  classifyArrival,
  getEstimatedDuration,
  FALLBACK_DURATION_MINUTES,
} from "@careflow/shared";

async function getAuthedSupabase() {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) return { user: null, supabase: null };
  const supabase = await createServerClient();
  return { user, supabase };
}

export async function openQueue(doctorId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase.from("queues").insert({
    clinic_id: user.clinicId,
    doctor_id: doctorId,
    queue_date: getMYTToday(),
    is_active: true,
    current_number: 0,
  });

  if (error) {
    if (error.code === "23505") return { error: "Queue already open for this doctor today." };
    return { error: error.message };
  }

  revalidatePath("/queue");
  return { success: true };
}

export async function callNext(queueId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { data: next } = await supabase
    .from("queue_entries")
    .select("id")
    .eq("queue_id", queueId)
    .eq("status", "WAITING")
    .order("priority", { ascending: true })
    .order("queue_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!next) return { error: "No waiting patients." };

  // Auto-assign the first available chair in this clinic
  const { data: chair } = await supabase
    .from("chairs" as "queues")
    .select("id")
    .eq("clinic_id" as "doctor_id", user.clinicId!)
    .eq("status" as "doctor_id", "AVAILABLE")
    .eq("is_active" as "doctor_id", true)
    .order("display_order" as "doctor_id")
    .limit(1)
    .maybeSingle();

  const chairId = (chair as unknown as { id: string } | null)?.id ?? null;

  const entryUpdate: Record<string, unknown> = { status: "CALLED", called_at: new Date().toISOString() };
  if (chairId) entryUpdate.chair_id = chairId;

  const { error } = await supabase
    .from("queue_entries")
    .update(entryUpdate as never)
    .eq("id", next.id);

  if (error) return { error: error.message };

  // Mark chair as occupied
  if (chairId) {
    await supabase
      .from("chairs" as "queues")
      .update({ status: "OCCUPIED", updated_at: new Date().toISOString() } as never)
      .eq("id" as "doctor_id", chairId);
  }

  revalidatePath("/queue");
  return { success: true };
}

export async function callSpecific(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "CALLED", called_at: new Date().toISOString() })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function startConsultation(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "IN_CONSULTATION" })
    .eq("id", entryId)
    .eq("status", "CALLED");

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function completeConsultation(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  // Get chair assignment before completing (RPC clears it)
  const { data: entryRow } = await supabase
    .from("queue_entries")
    .select("chair_id")
    .eq("id", entryId)
    .maybeSingle();
  const chairId = (entryRow as unknown as { chair_id: string | null } | null)?.chair_id ?? null;

  // Use atomic RPC when available (records actual duration + updates doctor stats).
  // Falls back to direct update if migration 20260629000003 hasn't been applied yet.
  const { error: rpcError } = await supabase.rpc("record_consultation_complete", {
    p_entry_id: entryId,
  });
  if (rpcError) {
    const { error } = await supabase
      .from("queue_entries")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", entryId);
    if (error) return { error: error.message };
  }

  // Release chair → CLEANING so receptionist knows to prepare it
  if (chairId) {
    await supabase
      .from("chairs" as "queues")
      .update({ status: "CLEANING", updated_at: new Date().toISOString() } as never)
      .eq("id" as "doctor_id", chairId);
  }

  revalidatePath("/queue");
  return { success: true };
}

export async function skipEntry(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "SKIPPED" })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function requeueEntry(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase.rpc("requeue_entry", { p_entry_id: entryId });
  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function pauseQueue(queueId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queues")
    .update({ is_paused: true })
    .eq("id", queueId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function resumeQueue(queueId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queues")
    .update({ is_paused: false })
    .eq("id", queueId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function notifyQueueDelayed(queueId: string, doctorName: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const message = `Dr. ${doctorName} is running a little behind schedule. Thank you for your patience.`;
  const { error } = await supabase.rpc("notify_queue_delayed", {
    p_queue_id: queueId,
    p_message: message,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function moveToTop(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ priority: 1 })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function removeEntry(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "REMOVED" })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function addWalkIn(data: {
  queueId: string;
  patientName: string;
  phoneNumber: string; // empty string = guest patient (no phone)
  priority: 1 | 2 | 3;
  treatmentType?: string;
  estimatedDurationMinutes?: number;
}) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const hasPhone = data.phoneNumber.trim().length > 0;
  let patientId: string;

  if (hasPhone) {
    const formattedPhone = data.phoneNumber.startsWith("+") ? data.phoneNumber : `+6${data.phoneNumber}`;

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("phone_number", formattedPhone)
      .maybeSingle();

    if (existingProfile) {
      patientId = existingProfile.id as string;
    } else {
      const { data: authData, error: createError } = await admin.auth.admin.createUser({
        phone: formattedPhone,
        phone_confirm: true,
        user_metadata: { full_name: data.patientName },
      });
      if (createError || !authData.user) return { error: createError?.message ?? "Failed to create patient" };
      await admin.from("profiles").upsert(
        { id: authData.user.id, full_name: data.patientName, phone_number: formattedPhone },
        { onConflict: "id" },
      );
      patientId = authData.user.id;
    }
  } else {
    // Guest patient: create an ephemeral account (no phone, no login)
    const guestEmail = `guest.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@careflow.internal`;
    const { data: authData, error: createError } = await admin.auth.admin.createUser({
      email: guestEmail,
      user_metadata: { full_name: data.patientName, is_guest: true },
    });
    if (createError || !authData.user) return { error: createError?.message ?? "Failed to create guest profile" };
    await admin.from("profiles").upsert(
      { id: authData.user.id, full_name: data.patientName },
      { onConflict: "id" },
    );
    patientId = authData.user.id;
  }

  // join_queue returns TABLE(id UUID, queue_number SMALLINT)
  const { data: joinResult, error: joinError } = await supabase.rpc("join_queue", {
    p_queue_id: data.queueId,
    p_type: "WALK_IN",
    p_priority: data.priority,
    p_patient_id: patientId,
  });

  if (joinError) return { error: joinError.message };

  // Enrich the new entry with treatment type and estimated duration
  const rows = joinResult as unknown as Array<{ id: string }> | null;
  const newEntryId = Array.isArray(rows) ? rows[0]?.id : null;
  if (newEntryId) {
    // Prefer template duration passed from UI; fall back to engine estimate
    const estimatedMinutes = data.estimatedDurationMinutes ?? getEstimatedDuration(
      data.treatmentType ?? null,
      { defaultMinutes: FALLBACK_DURATION_MINUTES, byTreatmentType: {} },
    );
    const enrichment: Record<string, unknown> = { estimated_duration_minutes: estimatedMinutes };
    if (data.treatmentType) enrichment.treatment_type = data.treatmentType;
    // Errors silently ignored — enrichment is best-effort (fails gracefully if migration pending)
    await supabase.from("queue_entries").update(enrichment as never).eq("id", newEntryId);
  }

  revalidatePath("/queue");
  return { success: true };
}

export async function addEmergency(data: { name: string; queueId: string }) {
  return addWalkIn({ queueId: data.queueId, patientName: data.name, phoneNumber: "", priority: 1 });
}

/** Enriches a new queue_entry (from check_in_appointment) with arrival status + estimated duration. */
async function enrichCheckInEntry(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  entryId: string | null,
  appt: { appointment_date: string; treatment_type: unknown; time_slots: unknown },
): Promise<void> {
  if (!entryId) return;
  const slot = appt.time_slots as { start_time: string } | Array<{ start_time: string }> | null;
  const startTime = Array.isArray(slot) ? slot[0]?.start_time : slot?.start_time;
  const scheduledStart = startTime
    ? new Date(`${appt.appointment_date}T${startTime}+08:00`)
    : null;
  const arrivalStatus = scheduledStart ? classifyArrival(scheduledStart, new Date()) : null;
  const estimatedMinutes = getEstimatedDuration(
    (appt.treatment_type as string | null) ?? null,
    { defaultMinutes: FALLBACK_DURATION_MINUTES, byTreatmentType: {} },
  );
  const enrichment: Record<string, unknown> = { estimated_duration_minutes: estimatedMinutes };
  if (scheduledStart) enrichment.scheduled_start_time = scheduledStart.toISOString();
  if (arrivalStatus) enrichment.arrival_status = arrivalStatus;
  // Errors silently ignored — enrichment is best-effort (fails gracefully if migration pending)
  await supabase.from("queue_entries").update(enrichment as never).eq("id", entryId);
}

export async function quickCheckInByCode(code: string): Promise<{ patientName?: string; error?: string }> {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const today = getMYTToday();
  const input = code.trim();
  const isHexCode = /^[0-9A-Fa-f]{6}$/.test(input);

  if (isHexCode) {
    // Appointment code: last 6 hex chars of appointment UUID
    const { data: confirmed } = await supabase
      .from("appointments")
      .select("id, appointment_date, treatment_type, time_slots(start_time), profiles(full_name)")
      .eq("clinic_id", user.clinicId)
      .eq("appointment_date", today)
      .eq("status", "CONFIRMED");

    const match = confirmed?.find(
      (a) => a.id.replace(/-/g, "").slice(-6).toUpperCase() === input.toUpperCase(),
    );

    if (!match) return { error: `No confirmed appointment found for code "${input.toUpperCase()}"` };
    const profile = match.profiles as unknown as { full_name: string | null } | null;

    const { data: entryId, error } = await supabase.rpc("check_in_appointment", { p_appointment_id: match.id });
    if (error) return { error: error.message };

    await enrichCheckInEntry(supabase, entryId as string | null, match as {
      appointment_date: string;
      treatment_type: unknown;
      time_slots: unknown;
    });

    revalidatePath("/appointments");
    revalidatePath("/queue");
    return { patientName: profile?.full_name ?? "Patient" };
  }

  // Phone number fallback
  const formatted = input.startsWith("+") ? input : `+6${input}`;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("phone_number", formatted)
    .maybeSingle();

  if (!profile) return { error: "No patient found with this phone number" };

  const { data: apptFull } = await supabase
    .from("appointments")
    .select("id, appointment_date, treatment_type, time_slots(start_time)")
    .eq("clinic_id", user.clinicId)
    .eq("appointment_date", today)
    .eq("patient_id", profile.id)
    .eq("status", "CONFIRMED")
    .maybeSingle();

  if (!apptFull) return { error: "No confirmed appointment today for this patient" };

  const { data: entryId, error } = await supabase.rpc("check_in_appointment", { p_appointment_id: apptFull.id });
  if (error) return { error: error.message };

  await enrichCheckInEntry(supabase, entryId as string | null, apptFull as {
    appointment_date: string;
    treatment_type: unknown;
    time_slots: unknown;
  });

  revalidatePath("/appointments");
  revalidatePath("/queue");
  return { patientName: profile.full_name ?? "Patient" };
}

export async function reassignEntry(entryId: string, targetQueueId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { data: entry } = await supabase
    .from("queue_entries")
    .select("patient_id, type, priority")
    .eq("id", entryId)
    .maybeSingle();

  if (!entry) return { error: "Entry not found" };

  const { error: joinError } = await supabase.rpc("join_queue", {
    p_queue_id: targetQueueId,
    p_type: entry.type,
    p_priority: entry.priority,
    p_patient_id: entry.patient_id,
  });
  if (joinError) return { error: joinError.message };

  await supabase.from("queue_entries").update({ status: "REMOVED" }).eq("id", entryId);

  revalidatePath("/queue");
  return { success: true };
}
