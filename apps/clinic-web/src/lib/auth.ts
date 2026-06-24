import { createServerClient } from "./supabase/server";
import type { AuthUser, UserRole } from "@careflow/shared";
import { STAFF_ROLE_MAP } from "@careflow/shared";

export async function getServerUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staffData } = await supabase
    .from("clinic_staff")
    .select("role, clinic_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  // Fail closed: no active staff row means no staff access, not a default role.
  if (!staffData) return null;

  const role = STAFF_ROLE_MAP[staffData.role];
  if (!role) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    role,
    clinicId: staffData.clinic_id,
    fullName: user.user_metadata?.full_name ?? user.email ?? "Staff",
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getServerUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<AuthUser | null> {
  const user = await getServerUser();
  if (!user) return null;
  if (!roles.includes(user.role)) return null;
  return user;
}
