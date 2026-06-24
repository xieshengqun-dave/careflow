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

const TYPE_MAP: Record<string, AppNotification["type"]> = {
  APPOINTMENT_CONFIRMED: "APPOINTMENT",
  APPOINTMENT_REMINDER: "APPOINTMENT",
  APPOINTMENT_CANCELLED: "APPOINTMENT",
  QUEUE_JOINED: "QUEUE",
  QUEUE_POSITION_UPDATE: "QUEUE",
  CALLED_TO_CONSULTATION: "QUEUE",
  DOCTOR_DELAYED: "SYSTEM",
};

function actionRouteFor(type: string, data: Record<string, unknown> | null): string | undefined {
  if (type === "APPOINTMENT_CONFIRMED" || type === "APPOINTMENT_REMINDER" || type === "APPOINTMENT_CANCELLED") {
    return "/(tabs)/appointments";
  }
  if ((type === "QUEUE_POSITION_UPDATE" || type === "CALLED_TO_CONSULTATION") && data?.queue_entry_id) {
    return `/queue/${data.queue_entry_id}`;
  }
  return undefined;
}

// Real, event-sourced notifications written by DB triggers (see
// supabase/migrations/20260624000004_notification_dispatch.sql) and the
// appointment-reminder cron job.
async function getRealNotifications(userId: string): Promise<AppNotification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, data, is_read, sent_at")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((n) => ({
    id: n.id,
    type: TYPE_MAP[n.type] ?? "SYSTEM",
    title: n.title,
    body: n.body,
    timestamp: n.sent_at,
    read: n.is_read,
    actionRoute: actionRouteFor(n.type, n.data as Record<string, unknown> | null),
  }));
}

// Live status that has no discrete stored event behind it (the patient is
// currently with the doctor right now) — not fabricated, just not a row in
// `notifications` since there's no single instant it "happened".
async function getLiveStatusNotifications(userId: string): Promise<AppNotification[]> {
  const { data: queueEntries } = await supabase
    .from("queue_entries")
    .select(`
      id, queue_number, status, called_at,
      queues ( doctors ( clinic_staff ( full_name ) ), clinics ( name ) )
    `)
    .eq("patient_id", userId)
    .eq("status", "IN_CONSULTATION")
    .order("called_at", { ascending: false })
    .limit(5);

  return (queueEntries ?? []).map((entry) => {
    const queue = entry.queues as unknown as {
      doctors: { clinic_staff: { full_name: string } | Array<{ full_name: string }> | null } | null;
      clinics: { name: string } | null;
    } | null;
    const doc = queue?.doctors;
    const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;

    return {
      id: `queue-status-${entry.id}`,
      type: "QUEUE" as const,
      title: "You are in consultation",
      body: `${staff?.full_name ?? "Doctor"} at ${queue?.clinics?.name ?? "clinic"} — Queue #${entry.queue_number}`,
      timestamp: entry.called_at ?? new Date().toISOString(),
      read: true,
      actionRoute: `/queue/${entry.id}`,
    };
  });
}

export async function getNotifications(): Promise<AppNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [real, live] = await Promise.all([
    getRealNotifications(user.id),
    getLiveStatusNotifications(user.id),
  ]);

  return [...real, ...live].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  // Only real rows (uuid ids from `notifications`) are persisted; synthetic
  // live-status ids (e.g. "queue-status-...") have nothing to update.
  const realIds = ids.filter((id) => !id.startsWith("queue-status-"));
  if (realIds.length === 0) return;

  await supabase.from("notifications").update({ is_read: true }).in("id", realIds);
}
