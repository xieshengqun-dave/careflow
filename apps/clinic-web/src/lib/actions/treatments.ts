"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export interface TreatmentTemplate {
  id: string;
  name: string;
  durationMinutes: number;
  isClinicSpecific: boolean;
}

/**
 * Returns merged template list: clinic-specific overrides take precedence over
 * global defaults. Called from both server components and client dialogs (useEffect).
 */
export async function fetchTreatmentTemplates(clinicId: string): Promise<TreatmentTemplate[]> {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("treatment_templates")
    .select("id, name, duration_minutes, clinic_id")
    .or(`clinic_id.eq.${clinicId},clinic_id.is.null`)
    .eq("is_active", true)
    .order("display_order")
    .order("name");

  if (!data) return [];

  // Clinic-specific rows overwrite global defaults of the same name
  const map = new Map<string, TreatmentTemplate>();
  for (const row of data) {
    const existing = map.get(row.name);
    const isClinicSpecific = row.clinic_id !== null;
    // Prefer clinic-specific over global
    if (!existing || isClinicSpecific) {
      map.set(row.name, {
        id: row.id,
        name: row.name,
        durationMinutes: row.duration_minutes,
        isClinicSpecific,
      });
    }
  }

  return [...map.values()];
}

export async function upsertTreatmentTemplate(data: {
  id?: string;
  name: string;
  durationMinutes: number;
}): Promise<{ error?: string }> {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user?.clinicId) return { error: "Unauthorized" };

  const supabase = await createServerClient();

  if (data.id) {
    const { error } = await supabase
      .from("treatment_templates")
      .update({ name: data.name.trim(), duration_minutes: data.durationMinutes, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("clinic_id", user.clinicId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("treatment_templates")
      .insert({ clinic_id: user.clinicId, name: data.name.trim(), duration_minutes: data.durationMinutes });
    if (error) return { error: error.message };
  }

  revalidatePath("/settings");
  return {};
}

export async function deleteTreatmentTemplate(id: string): Promise<{ error?: string }> {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user?.clinicId) return { error: "Unauthorized" };

  const supabase = await createServerClient();

  // Soft-delete clinic-specific rows only — global defaults are never deleted
  const { error } = await supabase
    .from("treatment_templates")
    .update({ is_active: false })
    .eq("id", id)
    .eq("clinic_id", user.clinicId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}
