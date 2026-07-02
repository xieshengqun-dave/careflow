import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { DoctorTable } from "@/components/doctors/DoctorTable";

async function getDoctors(clinicId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("doctors")
    .select(`
      id,
      specialization,
      consultation_duration_minutes,
      staff:clinic_staff!inner(full_name, email, is_active, clinic_id)
    `)
    .eq("staff.clinic_id", clinicId)
    .eq("staff.is_active", true)
    .order("created_at");

  if (error) { console.error(error.message); return []; }
  return data ?? [];
}

export default async function DoctorsPage() {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/unauthorized");

  const doctors = user.clinicId ? await getDoctors(user.clinicId) : [];
  const canManage = user.role === "clinic_admin" || user.role === "super_admin";

  return <DoctorTable doctors={doctors as any} canManage={canManage} />;
}
