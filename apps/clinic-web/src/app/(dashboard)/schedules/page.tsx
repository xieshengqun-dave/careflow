import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { ScheduleGrid } from "@/components/schedules/ScheduleGrid";

async function getDoctorsWithSchedules(clinicId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("doctors")
    .select(`
      id,
      specialization,
      consultation_duration_minutes,
      staff:clinic_staff!inner(full_name, clinic_id, is_active),
      doctor_schedules(id, day_of_week, start_time, end_time, is_active)
    `)
    .eq("staff.clinic_id", clinicId)
    .eq("staff.is_active", true)
    .order("created_at");

  if (error) { console.error(error.message); return []; }
  return data ?? [];
}

export default async function SchedulesPage() {
  const user = await requireRole(["doctor", "clinic_admin", "super_admin"]);
  if (!user) redirect("/login");

  const doctors = user.clinicId ? await getDoctorsWithSchedules(user.clinicId) : [];
  const canManage = user.role === "clinic_admin" || user.role === "super_admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedules</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Weekly availability per doctor</p>
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center bg-white">
          <p className="text-muted-foreground text-sm">No doctors found. Add doctors first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {doctors.map((doc: any) => (
            <ScheduleGrid
              key={doc.id}
              doctorId={doc.id}
              doctorName={doc.staff?.full_name ?? "Unknown Doctor"}
              slots={doc.doctor_schedules ?? []}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
