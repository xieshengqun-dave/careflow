import { createServerClient } from "./supabase/server";
import type { UserRole, AuthUser } from "@careflow/shared";

export async function getServerUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staffData } = await supabase
    .from("clinic_staff")
    .select("role, clinic_id")
    .eq("user_id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    role: (staffData?.role?.toLowerCase() as UserRole) ?? "receptionist",
    clinicId: staffData?.clinic_id ?? null,
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
