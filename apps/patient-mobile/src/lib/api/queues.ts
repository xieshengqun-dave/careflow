import { supabase } from "@/lib/supabase";

export interface ClinicQueue {
  queueId: string;
  doctorId: string;
  doctorName: string;
  specialization: string | null;
  consultationDuration: number;
  waitingCount: number;
  status: "ACTIVE" | "CLOSED";
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
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("queues")
    .select(`
      id,
      status,
      doctors (
        id,
        specialization,
        consultation_duration,
        clinic_staff ( full_name )
      ),
      queue_entries ( id, status )
    `)
    .eq("clinic_id", clinicId)
    .eq("queue_date", today)
    .eq("status", "ACTIVE");

  if (!data) return [];

  return data.map((q) => {
    const doc = q.doctors as unknown as {
      id: string;
      specialization: string | null;
      consultation_duration: number;
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
      consultationDuration: doc?.consultation_duration ?? 15,
      waitingCount,
      status: q.status as "ACTIVE" | "CLOSED",
    };
  });
}

export async function joinQueue(
  queueId: string,
  priority = 2,
): Promise<{ entryId: string; queueNumber: number } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check if already in this queue
  const { data: existing } = await supabase
    .from("queue_entries")
    .select("id")
    .eq("queue_id", queueId)
    .eq("patient_id", user.id)
    .in("status", ["WAITING", "CALLED", "IN_CONSULTATION"])
    .maybeSingle();

  if (existing) return { error: "You are already in this queue." };

  // Get next queue number
  const { data: last } = await supabase
    .from("queue_entries")
    .select("queue_number")
    .eq("queue_id", queueId)
    .order("queue_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = (last?.queue_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("queue_entries")
    .insert({
      queue_id: queueId,
      patient_id: user.id,
      queue_number: nextNumber,
      type: "WALK_IN",
      priority,
      status: "WAITING",
      joined_at: new Date().toISOString(),
    })
    .select("id, queue_number")
    .single();

  if (error) return { error: error.message };
  return { entryId: data.id, queueNumber: data.queue_number };
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
          consultation_duration,
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
      consultation_duration: number;
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
    consultationDuration: doc?.consultation_duration ?? 15,
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
          consultation_duration,
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
        consultation_duration: number;
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
      consultationDuration: doc?.consultation_duration ?? 15,
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
