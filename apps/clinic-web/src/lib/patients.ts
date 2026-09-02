import type { createServerClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Exact-match patient lookup by phone for staff flows (walk-in, New
 * Appointment, quick check-in). Goes through the staff_lookup_patient_by_phone
 * RPC: after migration 20260902000001, profiles RLS only exposes patients with
 * a relationship to the staff's clinic, and the RPC is the one audited path
 * that can still find a first-visit patient. If the RPC errors (migration not
 * applied yet), falls back to a direct read — the old permissive policy still
 * allows it in that state, and after the migration the fallback can only
 * return patients already related to the caller's clinic.
 */
export async function findPatientByPhone(
  supabase: ServerSupabase,
  phone: string,
): Promise<{ id: string; fullName: string } | null> {
  const { data, error } = await supabase.rpc("staff_lookup_patient_by_phone", { p_phone: phone });
  if (!error) {
    const row = (data as Array<{ id: string; full_name: string | null }> | null)?.[0];
    return row ? { id: row.id, fullName: row.full_name ?? "" } : null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("phone_number", phone)
    .maybeSingle();
  if (!profile) return null;
  return { id: profile.id as string, fullName: (profile.full_name as string | null) ?? "" };
}
