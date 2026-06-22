import type { SupabaseClient } from "../client";

export async function searchClinics(
  client: SupabaseClient,
  query: string,
  options?: { state?: string; city?: string; limit?: number }
) {
  let request = client
    .from("clinics")
    .select("id, name, address, city, state, phone_number, operating_hours, latitude, longitude")
    .eq("is_active", true)
    .ilike("name", `%${query}%`);

  if (options?.state) request = request.eq("state", options.state);
  if (options?.city) request = request.eq("city", options.city);
  if (options?.limit) request = request.limit(options.limit);

  return request;
}

export async function getClinicById(client: SupabaseClient, clinicId: string) {
  return client.from("clinics").select("*").eq("id", clinicId).single();
}

export async function getClinicDoctors(client: SupabaseClient, clinicId: string) {
  return client
    .from("clinic_staff")
    .select(`
      id,
      role,
      doctors (
        id,
        specialization,
        qualification,
        consultation_duration_minutes,
        avatar_url
      ),
      profiles:user_id (
        full_name,
        profile_picture_url
      )
    `)
    .eq("clinic_id", clinicId)
    .eq("role", "DOCTOR")
    .eq("is_active", true);
}
