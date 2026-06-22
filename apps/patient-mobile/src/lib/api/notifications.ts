import { supabase } from "@/lib/supabase";

export interface AppNotification {
  id: string;
  type: "APPOINTMENT" | "QUEUE" | "SYSTEM";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  actionRoute?: string;
  actionParams?: Record<string, string>;
}

function formatTime(t: string): string {
  const parts = t.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

export async function getDerivedNotifications(): Promise<AppNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const today = new Date();
  const threeDaysAhead = new Date(today);
  threeDaysAhead.setDate(today.getDate() + 3);

  const [{ data: appointments }, { data: queueEntries }] = await Promise.all([
    supabase
      .from("appointments")
      .select(`
        id, appointment_date, status,
        time_slots ( start_time ),
        doctors ( clinic_staff ( full_name ) ),
        clinics ( name )
      `)
      .eq("patient_id", user.id)
      .in("status", ["CONFIRMED", "CHECKED_IN"])
      .gte("appointment_date", today.toISOString().slice(0, 10))
      .lte("appointment_date", threeDaysAhead.toISOString().slice(0, 10))
      .order("appointment_date", { ascending: true }),

    supabase
      .from("queue_entries")
      .select(`
        id, queue_number, status, joined_at,
        queues (
          doctors ( clinic_staff ( full_name ) ),
          clinics ( name )
        )
      `)
      .eq("patient_id", user.id)
      .in("status", ["CALLED", "IN_CONSULTATION"])
      .order("joined_at", { ascending: false })
      .limit(5),
  ]);

  const notifications: AppNotification[] = [];

  for (const appt of appointments ?? []) {
    const slot = appt.time_slots as unknown as { start_time: string } | null;
    const doc = appt.doctors as unknown as { clinic_staff: { full_name: string } | Array<{ full_name: string }> | null } | null;
    const clinic = appt.clinics as unknown as { name: string } | null;
    const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;

    const apptDate = new Date(appt.appointment_date);
    const diffDays = Math.round((apptDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const when = diffDays === 0 ? "today" : diffDays === 1 ? "tomorrow" : `in ${diffDays} days`;

    notifications.push({
      id: `appt-${appt.id}`,
      type: "APPOINTMENT",
      title: appt.status === "CHECKED_IN" ? "You are checked in!" : `Appointment ${when}`,
      body: `${staff?.full_name ?? "Doctor"} at ${clinic?.name ?? "clinic"}${slot ? ` · ${formatTime(slot.start_time)}` : ""}`,
      timestamp: appt.appointment_date,
      read: false,
      actionRoute: "/(tabs)/appointments",
    });
  }

  for (const entry of queueEntries ?? []) {
    const queue = entry.queues as unknown as {
      doctors: { clinic_staff: { full_name: string } | Array<{ full_name: string }> | null } | null;
      clinics: { name: string } | null;
    } | null;
    const doc = queue?.doctors;
    const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;

    notifications.push({
      id: `queue-${entry.id}`,
      type: "QUEUE",
      title: entry.status === "CALLED" ? "You are being called!" : "You are in consultation",
      body: `${staff?.full_name ?? "Doctor"} at ${queue?.clinics?.name ?? "clinic"} — Queue #${entry.queue_number}`,
      timestamp: entry.joined_at,
      read: entry.status === "IN_CONSULTATION",
      actionRoute: `/queue/${entry.id}`,
    });
  }

  return notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
