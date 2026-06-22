import type { SupabaseClient } from "../client";

export async function getAvailableSlots(
  client: SupabaseClient,
  doctorId: string,
  date: string
) {
  return client
    .from("time_slots")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("slot_date", date)
    .eq("status", "AVAILABLE")
    .order("start_time");
}

export async function bookAppointment(
  client: SupabaseClient,
  params: {
    patientId: string;
    doctorId: string;
    clinicId: string;
    timeSlotId: string;
    appointmentDate: string;
    notes?: string;
  }
) {
  const { data: slot } = await client
    .from("time_slots")
    .select("status")
    .eq("id", params.timeSlotId)
    .single();

  if (slot?.status !== "AVAILABLE") {
    return { data: null, error: new Error("Time slot is no longer available") };
  }

  const { data: appointment, error } = await client
    .from("appointments")
    .insert({
      patient_id: params.patientId,
      doctor_id: params.doctorId,
      clinic_id: params.clinicId,
      time_slot_id: params.timeSlotId,
      appointment_date: params.appointmentDate,
      notes: params.notes ?? null,
      status: "CONFIRMED",
    })
    .select()
    .single();

  if (error) return { data: null, error };

  await client
    .from("time_slots")
    .update({ status: "BOOKED" })
    .eq("id", params.timeSlotId);

  return { data: appointment, error: null };
}

export async function getPatientAppointments(
  client: SupabaseClient,
  patientId: string,
  options?: { status?: string; limit?: number }
) {
  let request = client
    .from("appointments")
    .select(`
      *,
      doctors (
        specialization,
        clinic_staff (
          profiles:user_id (full_name)
        )
      ),
      clinics (name, address),
      time_slots (start_time, end_time)
    `)
    .eq("patient_id", patientId)
    .order("appointment_date", { ascending: false });

  if (options?.status) request = request.eq("status", options.status);
  if (options?.limit) request = request.limit(options.limit);

  return request;
}
