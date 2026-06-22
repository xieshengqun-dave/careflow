import { supabase } from "@/lib/supabase";

export interface BookingParams {
  patientId: string;
  doctorId: string;
  clinicId: string;
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  notes?: string;
}

export async function bookAppointment(params: BookingParams): Promise<{ appointmentId: string } | { error: string }> {
  const { data, error } = await supabase.rpc("book_appointment", {
    p_patient_id: params.patientId,
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
      : error.message;
    return { error: hint };
  }

  return { appointmentId: data as string };
}

export interface MyAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  doctorName: string;
  specialization: string | null;
  clinicName: string;
  clinicAddress: string;
}

export async function getMyAppointments(): Promise<MyAppointment[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("appointments")
    .select(`
      id,
      appointment_date,
      status,
      time_slots (
        start_time,
        end_time
      ),
      doctors (
        specialization,
        clinic_staff (
          full_name
        )
      ),
      clinics (
        name,
        address
      )
    `)
    .eq("patient_id", user.id)
    .in("status", ["CONFIRMED", "CHECKED_IN", "PENDING"])
    .order("appointment_date", { ascending: true });

  if (!data) return [];

  return data.map((appt) => {
    const slot = (appt.time_slots as unknown) as { start_time: string; end_time: string } | null;
    const doc = (appt.doctors as unknown) as {
      specialization: string | null;
      clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
    } | null;
    const clinic = (appt.clinics as unknown) as { name: string; address: string } | null;

    const staffEntry = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;

    return {
      id: appt.id,
      date: appt.appointment_date,
      startTime: slot ? (slot.start_time as string).slice(0, 5) : "",
      endTime:   slot ? (slot.end_time as string).slice(0, 5) : "",
      status:    appt.status,
      doctorName: staffEntry?.full_name ?? "Doctor",
      specialization: doc?.specialization ?? null,
      clinicName: clinic?.name ?? "",
      clinicAddress: clinic?.address ?? "",
    };
  });
}

export async function cancelAppointment(appointmentId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "CANCELLED" })
    .eq("id", appointmentId);

  return error ? { error: error.message } : {};
}
