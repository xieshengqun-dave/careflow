import { createServerClient } from "@/lib/supabase/server";

export interface DashboardMetrics {
  todayAppointments: number;
  walkInPatients: number;
  avgWaitMinutes: number | null;
  noShowRate: number;
}

export async function getDashboardMetrics(clinicId: string): Promise<DashboardMetrics> {
  const supabase = await createServerClient();
  const today = new Date().toISOString().split("T")[0];

  const [apptRes, walkInRes, waitRes, noShowRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("appointment_date", today),

    supabase
      .from("queue_entries")
      .select("id, queues!inner(clinic_id, queue_date)", { count: "exact", head: true })
      .eq("type", "WALK_IN")
      .eq("queues.clinic_id", clinicId)
      .eq("queues.queue_date", today),

    supabase
      .from("queue_entries")
      .select("joined_at, called_at, queues!inner(clinic_id, queue_date)")
      .eq("queues.clinic_id", clinicId)
      .eq("queues.queue_date", today)
      .not("called_at", "is", null),

    supabase
      .from("appointments")
      .select("status")
      .eq("clinic_id", clinicId)
      .eq("appointment_date", today),
  ]);

  let avgWaitMinutes: number | null = null;
  if (waitRes.data && waitRes.data.length > 0) {
    const waits = waitRes.data
      .filter((e: any) => e.called_at && e.joined_at)
      .map((e: any) => (new Date(e.called_at).getTime() - new Date(e.joined_at).getTime()) / 60000);
    if (waits.length > 0)
      avgWaitMinutes = Math.round(waits.reduce((a: number, b: number) => a + b, 0) / waits.length);
  }

  const appts = noShowRes.data ?? [];
  const noShowCount = appts.filter((a: any) => a.status === "NO_SHOW").length;
  const noShowRate = appts.length > 0 ? Math.round((noShowCount / appts.length) * 1000) / 10 : 0;

  return {
    todayAppointments: apptRes.count ?? 0,
    walkInPatients: walkInRes.count ?? 0,
    avgWaitMinutes,
    noShowRate,
  };
}
