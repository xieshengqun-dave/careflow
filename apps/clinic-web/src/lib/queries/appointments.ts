import { createServerClient } from "@/lib/supabase/server";
import { getMYTToday } from "@careflow/shared";

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface ClinicAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  patientName: string;
  patientPhone: string | null;
  doctorId: string;
  doctorName: string;
  specialization: string | null;
}

export async function getClinicAppointments(
  clinicId: string,
  date?: string,
): Promise<ClinicAppointment[]> {
  const supabase = await createServerClient();
  const targetDate = date ?? getMYTToday();

  const { data } = await supabase
    .from("appointments")
    .select(`
      id,
      appointment_date,
      status,
      notes,
      time_slots ( start_time, end_time ),
      doctors (
        id,
        specialization,
        clinic_staff ( full_name )
      ),
      profiles ( full_name, phone_number )
    `)
    .eq("clinic_id", clinicId)
    .eq("appointment_date", targetDate)
    .not("status", "in", "(CANCELLED)")
    .order("appointment_date", { ascending: true });

  if (!data) return [];

  return data.map((row) => {
    const slot = row.time_slots as unknown as { start_time: string; end_time: string } | null;
    const doc = row.doctors as unknown as {
      id: string;
      specialization: string | null;
      clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
    } | null;
    const profile = row.profiles as unknown as { full_name: string | null; phone_number: string | null } | null;
    const staffEntry = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;

    return {
      id: row.id,
      date: row.appointment_date,
      startTime: slot ? (slot.start_time as string).slice(0, 5) : "",
      endTime: slot ? (slot.end_time as string).slice(0, 5) : "",
      status: row.status as AppointmentStatus,
      notes: row.notes ?? null,
      patientName: profile?.full_name ?? "Patient",
      patientPhone: profile?.phone_number ?? null,
      doctorId: doc?.id ?? "",
      doctorName: staffEntry?.full_name ?? "Doctor",
      specialization: doc?.specialization ?? null,
    };
  });
}
