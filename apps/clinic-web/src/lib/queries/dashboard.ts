import { createServerClient } from "@/lib/supabase/server";
import { getMYTToday } from "@careflow/shared";

export interface DashboardMetrics {
  todayAppointments: number;
  inQueueCount: number;
  patientsToday: number;
  completedToday: number;
  avgWaitMinutes: number | null;
  noShowRate: number;
}

export interface QueueStatusBreakdown {
  waiting: number;
  called: number;
  inConsultation: number;
  completed: number;
  cancelled: number;
}

export interface DoctorScheduleTodayEntry {
  doctorId: string;
  doctorName: string;
  specialization: string | null;
  startTime: string | null;
  endTime: string | null;
  isOpenToday: boolean;
}

export interface RecentActivityItem {
  id: string;
  message: string;
  detail: string;
  timestamp: string;
  tone: "success" | "info" | "warning" | "danger";
}

function dayOfWeekFor(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d).getDay();
}

export async function getDashboardMetrics(clinicId: string): Promise<DashboardMetrics> {
  const supabase = await createServerClient();
  const today = getMYTToday();

  const [apptRes, queueEntriesRes, noShowRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("patient_id")
      .eq("clinic_id", clinicId)
      .eq("appointment_date", today),

    supabase
      .from("queue_entries")
      .select("status, patient_id, joined_at, called_at, queues!inner(clinic_id, queue_date)")
      .eq("queues.clinic_id", clinicId)
      .eq("queues.queue_date", today),

    supabase
      .from("appointments")
      .select("status")
      .eq("clinic_id", clinicId)
      .eq("appointment_date", today),
  ]);

  const appts = apptRes.data ?? [];
  const entries = (queueEntriesRes.data ?? []) as Array<{
    status: string;
    patient_id: string;
    joined_at: string;
    called_at: string | null;
  }>;

  const inQueueCount = entries.filter((e) =>
    ["WAITING", "CALLED", "IN_CONSULTATION"].includes(e.status),
  ).length;
  const completedToday = entries.filter((e) => e.status === "COMPLETED").length;

  const patientIds = new Set<string>();
  for (const a of appts) patientIds.add(a.patient_id);
  for (const e of entries) patientIds.add(e.patient_id);

  const waits = entries
    .filter((e) => e.called_at)
    .map((e) => (new Date(e.called_at!).getTime() - new Date(e.joined_at).getTime()) / 60000);
  const avgWaitMinutes =
    waits.length > 0 ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null;

  const noShowAppts = noShowRes.data ?? [];
  const noShowCount = noShowAppts.filter((a: { status: string }) => a.status === "NO_SHOW").length;
  const noShowRate =
    noShowAppts.length > 0 ? Math.round((noShowCount / noShowAppts.length) * 1000) / 10 : 0;

  return {
    todayAppointments: appts.length,
    inQueueCount,
    patientsToday: patientIds.size,
    completedToday,
    avgWaitMinutes,
    noShowRate,
  };
}

export async function getQueueStatusBreakdown(clinicId: string): Promise<QueueStatusBreakdown> {
  const supabase = await createServerClient();
  const today = getMYTToday();

  const { data } = await supabase
    .from("queue_entries")
    .select("status, queues!inner(clinic_id, queue_date)")
    .eq("queues.clinic_id", clinicId)
    .eq("queues.queue_date", today);

  const entries = (data ?? []) as Array<{ status: string }>;
  const breakdown: QueueStatusBreakdown = {
    waiting: 0,
    called: 0,
    inConsultation: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const e of entries) {
    if (e.status === "WAITING") breakdown.waiting++;
    else if (e.status === "CALLED") breakdown.called++;
    else if (e.status === "IN_CONSULTATION") breakdown.inConsultation++;
    else if (e.status === "COMPLETED") breakdown.completed++;
    else if (e.status === "SKIPPED" || e.status === "REMOVED") breakdown.cancelled++;
  }

  return breakdown;
}

export async function getDoctorScheduleToday(clinicId: string): Promise<DoctorScheduleTodayEntry[]> {
  const supabase = await createServerClient();
  const today = getMYTToday();
  const dayOfWeek = dayOfWeekFor(today);

  const { data: doctors } = await supabase
    .from("doctors")
    .select(`
      id,
      specialization,
      clinic_staff!inner ( full_name, clinic_id, is_active )
    `)
    .eq("clinic_staff.clinic_id", clinicId)
    .eq("clinic_staff.is_active", true);

  if (!doctors) return [];

  const results: DoctorScheduleTodayEntry[] = [];
  for (const doc of doctors) {
    const staffArr = doc.clinic_staff as unknown as Array<{ full_name: string }>;
    const staff = Array.isArray(staffArr) ? staffArr[0] : (staffArr as unknown as { full_name: string });

    const { data: schedule } = await supabase
      .from("doctor_schedules")
      .select("start_time, end_time")
      .eq("doctor_id", doc.id)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)
      .maybeSingle();

    results.push({
      doctorId: doc.id,
      doctorName: staff?.full_name ?? "Doctor",
      specialization: doc.specialization ?? null,
      startTime: schedule?.start_time ? (schedule.start_time as string).slice(0, 5) : null,
      endTime: schedule?.end_time ? (schedule.end_time as string).slice(0, 5) : null,
      isOpenToday: !!schedule,
    });
  }

  return results;
}

export async function getRecentActivity(clinicId: string): Promise<RecentActivityItem[]> {
  const supabase = await createServerClient();
  const today = getMYTToday();

  const [apptRes, queueRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(`
        id, status, updated_at,
        profiles ( full_name ),
        doctors ( clinic_staff ( full_name ) )
      `)
      .eq("clinic_id", clinicId)
      .eq("appointment_date", today)
      .order("updated_at", { ascending: false })
      .limit(6),

    supabase
      .from("queue_entries")
      .select(`
        id, status, updated_at,
        profiles ( full_name ),
        queues!inner ( clinic_id, queue_date )
      `)
      .eq("queues.clinic_id", clinicId)
      .eq("queues.queue_date", today)
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  const items: RecentActivityItem[] = [];

  const APPT_LABEL: Record<string, { message: string; tone: RecentActivityItem["tone"] }> = {
    CHECKED_IN: { message: "checked in for an appointment", tone: "info" },
    COMPLETED: { message: "completed an appointment", tone: "success" },
    CANCELLED: { message: "cancelled an appointment", tone: "danger" },
    NO_SHOW: { message: "was marked as a no-show", tone: "warning" },
    CONFIRMED: { message: "booked an appointment", tone: "info" },
  };

  for (const row of apptRes.data ?? []) {
    const patient = row.profiles as unknown as { full_name: string | null } | null;
    const cfg = APPT_LABEL[row.status as string];
    if (!cfg) continue;
    items.push({
      id: `appt-${row.id}`,
      message: patient?.full_name ?? "A patient",
      detail: cfg.message,
      timestamp: row.updated_at as string,
      tone: cfg.tone,
    });
  }

  const QUEUE_LABEL: Record<string, { message: string; tone: RecentActivityItem["tone"] }> = {
    CALLED: { message: "was called in", tone: "info" },
    IN_CONSULTATION: { message: "is now with the doctor", tone: "success" },
    COMPLETED: { message: "finished their consultation", tone: "success" },
    SKIPPED: { message: "was skipped in the queue", tone: "warning" },
    REMOVED: { message: "left the queue", tone: "danger" },
  };

  for (const row of queueRes.data ?? []) {
    const patient = row.profiles as unknown as { full_name: string | null } | null;
    const cfg = QUEUE_LABEL[row.status as string];
    if (!cfg) continue;
    items.push({
      id: `queue-${row.id}`,
      message: patient?.full_name ?? "A patient",
      detail: cfg.message,
      timestamp: row.updated_at as string,
      tone: cfg.tone,
    });
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);
}
