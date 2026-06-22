"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth";

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (key.includes("placeholder") || !key)
    throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY in apps/clinic-web/.env.local");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function addDoctor(data: {
  fullName: string;
  email: string;
  specialization: string;
  consultationDuration: number;
}) {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user?.clinicId) return { error: "Unauthorized" };

  let userId: string;
  try {
    const { data: invited, error } = await adminClient().auth.admin.inviteUserByEmail(
      data.email,
      { data: { full_name: data.fullName } }
    );
    if (error) return { error: error.message };
    userId = invited.user.id;
  } catch (e: any) {
    return { error: e.message };
  }

  const supabase = await createServerClient();
  const { data: staff, error: se } = await supabase
    .from("clinic_staff")
    .insert({ clinic_id: user.clinicId, user_id: userId, role: "DOCTOR", full_name: data.fullName, email: data.email })
    .select()
    .single();
  if (se) return { error: se.message };

  const { error: de } = await supabase.from("doctors").insert({
    staff_id: staff.id,
    specialization: data.specialization,
    consultation_duration_minutes: data.consultationDuration,
  });
  if (de) return { error: de.message };

  revalidatePath("/doctors");
  return { success: true };
}

export async function updateDoctor(doctorId: string, data: {
  fullName: string;
  specialization: string;
  consultationDuration: number;
}) {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: doc } = await supabase.from("doctors").select("staff_id").eq("id", doctorId).single();
  if (!doc) return { error: "Doctor not found" };

  const [r1, r2] = await Promise.all([
    supabase.from("clinic_staff").update({ full_name: data.fullName }).eq("id", doc.staff_id),
    supabase.from("doctors").update({ specialization: data.specialization, consultation_duration_minutes: data.consultationDuration }).eq("id", doctorId),
  ]);
  if (r1.error) return { error: r1.error.message };
  if (r2.error) return { error: r2.error.message };

  revalidatePath("/doctors");
  return { success: true };
}

export async function deleteDoctor(doctorId: string) {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  const { data: doc } = await supabase.from("doctors").select("staff_id").eq("id", doctorId).single();
  if (!doc) return { error: "Doctor not found" };

  const { error } = await supabase.from("clinic_staff").update({ is_active: false }).eq("id", doc.staff_id);
  if (error) return { error: error.message };

  revalidatePath("/doctors");
  return { success: true };
}
