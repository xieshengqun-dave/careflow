import type { SupabaseClient } from "../client";

export async function getDoctorById(client: SupabaseClient, doctorId: string) {
  return client
    .from("doctors")
    .select(`
      *,
      clinic_staff (
        clinic_id,
        role,
        profiles:user_id (full_name, profile_picture_url)
      )
    `)
    .eq("id", doctorId)
    .single();
}

export async function getDoctorSchedule(
  client: SupabaseClient,
  doctorId: string,
  dayOfWeek?: number
) {
  let request = client
    .from("doctor_schedules")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("is_active", true)
    .order("day_of_week");

  if (dayOfWeek !== undefined) request = request.eq("day_of_week", dayOfWeek);

  return request;
}
