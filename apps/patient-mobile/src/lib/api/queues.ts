import { supabase } from "@/lib/supabase";
import { getMYTToday } from "@careflow/shared";

export interface ClinicQueue {
  queueId: string;
  doctorId: string;
  doctorName: string;
  specialization: string | null;
  consultationDuration: number;
  waitingCount: number;
}

export interface QueueEntryStatus {
  entryId: string;
  queueId: string;
  queueNumber: number;
  status: "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED" | "SKIPPED" | "REMOVED";
  priority: number;
  joinedAt: string;
  calledAt: string | null;
  position: number;        // people ahead of you
  doctorName: string;
  clinicName: string;
  consultationDuration: number;
}

export async function getClinicActiveQueues(clinicId: string): Promise<ClinicQueue[]> {
  const today = getMYTToday();

  const { data } = await supabase
    .from("queues")
    .select(`
      id,
      doctors (
        id,
        specialization,
        consultation_duration_minutes,
        clinic_staff ( full_name )
      ),
      queue_entries ( id, status )
    `)
    .eq("clinic_id", clinicId)
    .eq("queue_date", today)
    .eq("is_active", true);

  if (!data) return [];

  return data.map((q) => {
    const doc = q.doctors as unknown as {
      id: string;
      specialization: string | null;
      consultation_duration_minutes: number;
      clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
    } | null;
    const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;
    const entries = q.queue_entries as unknown as Array<{ status: string }> | null;
    const waitingCount = entries?.filter((e) => e.status === "WAITING").length ?? 0;

    return {
      queueId: q.id,
      doctorId: doc?.id ?? "",
      doctorName: staff?.full_name ?? "Doctor",
      specialization: doc?.specialization ?? null,
      consultationDuration: doc?.consultation_duration_minutes ?? 15,
      waitingCount,
    };
  });
}

export async function joinQueue(
  queueId: string,
  priority = 2,
): Promise<{ entryId: string; queueNumber: number } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase.rpc("join_queue", {
    p_queue_id: queueId,
    p_type: "WALK_IN",
    p_priority: priority,
  });

  if (error) {
    const hint = error.message.includes("ALREADY_IN_QUEUE")
      ? "You are already in this queue."
      : error.message;
    return { error: hint };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { entryId: row.id, queueNumber: row.queue_number };
}

export async function getQueueEntryStatus(entryId: string): Promise<QueueEntryStatus | null> {
  const { data } = await supabase
    .from("queue_entries")
    .select(`
      id,
      queue_id,
      queue_number,
      status,
      priority,
      joined_at,
      called_at,
      queues (
        doctors (
          consultation_duration_minutes,
          clinic_staff ( full_name )
        ),
        clinics ( name )
      )
    `)
    .eq("id", entryId)
    .single();

  if (!data) return null;

  const queue = data.queues as unknown as {
    doctors: {
      consultation_duration_minutes: number;
      clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
    } | null;
    clinics: { name: string } | null;
  } | null;

  const doc = queue?.doctors ?? null;
  const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;

  // Count entries ahead
  const { count } = await supabase
    .from("queue_entries")
    .select("id", { count: "exact", head: true })
    .eq("queue_id", data.queue_id)
    .eq("status", "WAITING")
    .lt("queue_number", data.queue_number);

  return {
    entryId: data.id,
    queueId: data.queue_id,
    queueNumber: data.queue_number,
    status: data.status as QueueEntryStatus["status"],
    priority: data.priority,
    joinedAt: data.joined_at,
    calledAt: data.called_at ?? null,
    position: count ?? 0,
    doctorName: staff?.full_name ?? "Doctor",
    clinicName: queue?.clinics?.name ?? "",
    consultationDuration: doc?.consultation_duration_minutes ?? 15,
  };
}

export async function getMyActiveQueueEntries(): Promise<QueueEntryStatus[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("queue_entries")
    .select(`
      id,
      queue_id,
      queue_number,
      status,
      priority,
      joined_at,
      called_at,
      queues (
        doctors (
          consultation_duration_minutes,
          clinic_staff ( full_name )
        ),
        clinics ( name )
      )
    `)
    .eq("patient_id", user.id)
    .in("status", ["WAITING", "CALLED", "IN_CONSULTATION"])
    .order("joined_at", { ascending: false });

  if (!data) return [];

  return data.map((row) => {
    const queue = row.queues as unknown as {
      doctors: {
        consultation_duration_minutes: number;
        clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
      } | null;
      clinics: { name: string } | null;
    } | null;
    const doc = queue?.doctors ?? null;
    const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;

    return {
      entryId: row.id,
      queueId: row.queue_id,
      queueNumber: row.queue_number,
      status: row.status as QueueEntryStatus["status"],
      priority: row.priority,
      joinedAt: row.joined_at,
      calledAt: row.called_at ?? null,
      position: 0,
      doctorName: staff?.full_name ?? "Doctor",
      clinicName: queue?.clinics?.name ?? "",
      consultationDuration: doc?.consultation_duration_minutes ?? 15,
    };
  });
}

export async function leaveQueue(entryId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "REMOVED" })
    .eq("id", entryId);
  return error ? { error: error.message } : {};
}
