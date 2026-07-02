"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getDoctorSlotsForDate } from "@/lib/queries/slots";
import { classifyArrival, getEstimatedDuration, FALLBACK_DURATION_MINUTES } from "@careflow/shared";

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

  // Fetch slot time + treatment type for enrichment (before the RPC so we have the data ready)
  const { data: appt } = await supabase
    .from("appointments")
    .select("appointment_date, treatment_type, time_slots(start_time)")
    .eq("id", appointmentId)
    .maybeSingle();

  const { data: entryId, error } = await supabase.rpc("check_in_appointment", { p_appointment_id: appointmentId });
  if (error) return { error: error.message };

  // Enrich entry with arrival status and estimated duration (best-effort)
  if (entryId && appt) {
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
    await supabase.from("queue_entries").update(enrichment as never).eq("id", entryId as string);
  }

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
  treatmentType?: string;
}

export async function createStaffAppointment(
  params: StaffBookingParams,
): Promise<{ appointmentId?: string; error?: string }> {
  const supabase = await createServerClient();

  // Look up patient by phone number
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone_number", params.patientPhone)
    .maybeSingle();

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

  // Save treatment type on the appointment (the RPC predates this column)
  if (data && params.treatmentType) {
    await supabase
      .from("appointments")
      .update({ treatment_type: params.treatmentType })
      .eq("id", data as string);
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
    .eq("phone_number", phone)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, fullName: data.full_name ?? "" };
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newStartTime: string,
): Promise<{ error?: string }> {
  const supabase = await createServerClient();

  // Get current appointment to find doctor and old slot
  const { data: appt } = await supabase
    .from("appointments")
    .select("slot_id, doctor_id")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appt) return { error: "Appointment not found" };

  // Find the new slot by doctor + date + start time
  const { data: newSlot } = await supabase
    .from("time_slots")
    .select("id, status")
    .eq("doctor_id", appt.doctor_id)
    .eq("slot_date", newDate)
    .eq("start_time", newStartTime.length === 5 ? `${newStartTime}:00` : newStartTime)
    .maybeSingle();

  if (!newSlot) return { error: "Slot not found for this date and time" };
  if (newSlot.status !== "AVAILABLE") return { error: "This slot is no longer available" };

  // Free old slot, book new slot, update appointment
  if (appt.slot_id) {
    await supabase.from("time_slots").update({ status: "AVAILABLE" }).eq("id", appt.slot_id);
  }
  await supabase.from("time_slots").update({ status: "BOOKED" }).eq("id", newSlot.id);

  const { error } = await supabase
    .from("appointments")
    .update({ slot_id: newSlot.id, appointment_date: newDate, status: "CONFIRMED" })
    .eq("id", appointmentId);

  if (error) return { error: error.message };

  revalidatePath("/appointments");
  return {};
}
