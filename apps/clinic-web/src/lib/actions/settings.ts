"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

export async function updateClinic(data: {
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
}) {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user?.clinicId) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("clinics")
    .update({ name: data.name, address: data.address, phone_number: data.phoneNumber, email: data.email })
    .eq("id", user.clinicId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function getClinicStaff(scopeClinicId?: string): Promise<Array<{
  userId: string;
  name: string;
  email: string | null;
  role: string;
  clinicName?: string;
}>> {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) return [];

  // scopeClinicId (URL param) takes precedence; fall back to user's own clinic for clinic_admin
  const targetClinicId = scopeClinicId ?? user.clinicId ?? null;

  if (!targetClinicId) return [];

  // Use admin client to bypass RLS — platform admins have no clinic_id in their JWT
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clinic_staff")
    .select("user_id, full_name, role, clinics(name)")
    .eq("clinic_id", targetClinicId)
    .in("role", ["DOCTOR", "RECEPTIONIST", "CLINIC_ADMIN"])
    .eq("is_active", true)
    .order("role");

  const rows = data ?? [];

  const results = await Promise.all(
    rows.map(async (s) => {
      const clinic = s.clinics as unknown as { name: string } | null;
      const uid = s.user_id as string;
      let email: string | null = null;
      if (uid) {
        const { data: authUser } = await supabase.auth.admin.getUserById(uid);
        email = authUser.user?.email ?? null;
      }
      return {
        userId: uid,
        name: (s.full_name as string | null) ?? email ?? uid,
        email,
        role: s.role as string,
        clinicName: targetClinicId ? undefined : (clinic?.name ?? undefined),
      };
    }),
  );

  return results;
}

export async function setStaffPassword(
  userId: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) return { error: "Unauthorized" };

  if (newPassword.length < 8) return { error: "Password must be at least 8 characters" };

  // Clinic-scoped admin: verify target user belongs to their clinic
  if (user.clinicId) {
    const supabase = await createServerClient();
    const { data: staff } = await supabase
      .from("clinic_staff")
      .select("user_id")
      .eq("clinic_id", user.clinicId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) return { error: "User not found in this clinic" };
  }
  // Platform super_admin (clinicId null) can reset any user's password

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { error: error.message };

  return { success: true } as { error?: string };
}

const ASSIGNABLE_ROLES = ["DOCTOR", "RECEPTIONIST", "CLINIC_ADMIN"] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

export async function setStaffRole(
  userId: string,
  newRole: AssignableRole,
): Promise<{ error?: string }> {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) return { error: "Unauthorized" };

  if (!ASSIGNABLE_ROLES.includes(newRole)) return { error: "Invalid role" };

  const supabase = createAdminClient();

  let query = supabase
    .from("clinic_staff")
    .update({ role: newRole })
    .eq("user_id", userId)
    .eq("is_active", true);

  // Clinic-scoped admin can only update their own clinic's staff
  if (user.clinicId) query = query.eq("clinic_id", user.clinicId);

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/platform/clinics");
  return { success: true } as { error?: string };
}
