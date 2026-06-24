import { createServerClient } from "@/lib/supabase/server";
import { getMYTToday } from "@careflow/shared";

export type QueueEntryStatus = "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED" | "SKIPPED" | "REMOVED";
export type QueueEntryType = "APPOINTMENT" | "WALK_IN";

export interface QueueEntryData {
  id: string;
  queueNumber: number;
  type: QueueEntryType;
  priority: number;
  status: QueueEntryStatus;
  joinedAt: string;
  calledAt: string | null;
}

/** A single row in the combined, cross-doctor "Current Queue" table. */
export interface CombinedQueueEntry {
  id: string;
  queueId: string;
  queueNumber: number;
  type: QueueEntryType;
  priority: number;
  status: QueueEntryStatus;
  joinedAt: string;
  calledAt: string | null;
  patientName: string;
  patientPhone: string | null;
  doctorId: string;
  doctorName: string;
  specialization: string | null;
}

export interface CombinedQueueSummary {
  entries: CombinedQueueEntry[];
  totalInQueue: number;
  avgWaitMinutes: number | null;
  nextQueueNumber: number | null;
  queuesOpen: number;
}

export async function getCombinedQueue(clinicId: string): Promise<CombinedQueueSummary> {
  const supabase = await createServerClient();
  const today = getMYTToday();

  const { data: queuesData } = await supabase
    .from("queues")
    .select(`
      id,
      doctor_id,
      doctors (
        specialization,
        clinic_staff ( full_name )
      ),
      queue_entries (
        id,
        queue_number,
        type,
        priority,
        status,
        joined_at,
        called_at,
        profiles ( full_name, phone_number )
      )
    `)
    .eq("clinic_id", clinicId)
    .eq("queue_date", today)
    .eq("is_active", true);

  const entries: CombinedQueueEntry[] = [];

  for (const queue of queuesData ?? []) {
    const doc = queue.doctors as unknown as {
      specialization: string | null;
      clinic_staff: { full_name: string } | Array<{ full_name: string }> | null;
    } | null;
    const staff = Array.isArray(doc?.clinic_staff) ? doc?.clinic_staff[0] : doc?.clinic_staff;
    const rawEntries = (queue.queue_entries as unknown as Array<Record<string, unknown>>) ?? [];

    for (const e of rawEntries) {
      const status = e.status as QueueEntryStatus;
      if (!["WAITING", "CALLED", "IN_CONSULTATION"].includes(status)) continue;
      const profile = e.profiles as unknown as { full_name: string | null; phone_number: string | null } | null;

      entries.push({
        id: e.id as string,
        queueId: queue.id as string,
        queueNumber: e.queue_number as number,
        type: e.type as QueueEntryType,
        priority: e.priority as number,
        status,
        joinedAt: e.joined_at as string,
        calledAt: (e.called_at as string | null) ?? null,
        patientName: profile?.full_name ?? "Patient",
        patientPhone: profile?.phone_number ?? null,
        doctorId: queue.doctor_id as string,
        doctorName: staff?.full_name ?? "Doctor",
        specialization: doc?.specialization ?? null,
      });
    }
  }

  entries.sort((a, b) => a.priority - b.priority || a.queueNumber - b.queueNumber);

  // Average wait time today across all entries that have actually been called (real data only)
  const { data: calledToday } = await supabase
    .from("queue_entries")
    .select("joined_at, called_at, queues!inner(clinic_id, queue_date)")
    .eq("queues.clinic_id", clinicId)
    .eq("queues.queue_date", today)
    .not("called_at", "is", null);

  const waits = (calledToday ?? [])
    .map((r: { joined_at: string; called_at: string | null }) =>
      r.called_at ? (new Date(r.called_at).getTime() - new Date(r.joined_at).getTime()) / 60000 : null)
    .filter((w): w is number => w !== null);
  const avgWaitMinutes = waits.length > 0 ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null;

  const nextWaiting = entries.find((e) => e.status === "WAITING");

  return {
    entries,
    totalInQueue: entries.length,
    avgWaitMinutes,
    nextQueueNumber: nextWaiting?.queueNumber ?? null,
    queuesOpen: (queuesData ?? []).length,
  };
}

export interface DoctorQueueData {
  queueId: string;
  doctorId: string;
  doctorName: string;
  specialization: string | null;
  waiting: QueueEntryData[];
  called: QueueEntryData[];
  inConsultation: QueueEntryData | null;
}

export interface DoctorWithoutQueue {
  doctorId: string;
  doctorName: string;
  specialization: string | null;
}

export interface QueuePageData {
  activeQueues: DoctorQueueData[];
  doctorsWithoutQueue: DoctorWithoutQueue[];
}

function mapEntry(e: Record<string, unknown>): QueueEntryData {
  return {
    id: e.id as string,
    queueNumber: e.queue_number as number,
    type: e.type as QueueEntryType,
    priority: e.priority as number,
    status: e.status as QueueEntryStatus,
    joinedAt: e.joined_at as string,
    calledAt: (e.called_at as string | null) ?? null,
  };
}

export async function getTodayQueueData(clinicId: string): Promise<QueuePageData> {
  const supabase = await createServerClient();
  const today = getMYTToday();

  // Fetch today's active queues with their entries
  const { data: queuesData } = await supabase
    .from("queues")
    .select(`
      id,
      doctor_id,
      queue_entries (
        id,
        queue_number,
        type,
        priority,
        status,
        joined_at,
        called_at
      )
    `)
    .eq("clinic_id", clinicId)
    .eq("queue_date", today)
    .eq("is_active", true);

  const queueDoctorIds = new Set((queuesData ?? []).map((q) => q.doctor_id as string));

  // Fetch all active doctors for this clinic
  const { data: doctorsData } = await supabase
    .from("doctors")
    .select(`
      id,
      specialization,
      clinic_staff!inner (
        full_name,
        clinic_id,
        is_active
      )
    `)
    .eq("clinic_staff.clinic_id", clinicId)
    .eq("clinic_staff.is_active", true);

  // Build doctor name map
  const doctorMap = new Map<string, { name: string; specialization: string | null }>();
  for (const doc of doctorsData ?? []) {
    const staffArr = doc.clinic_staff as unknown as Array<{ full_name: string }>;
    const staff = Array.isArray(staffArr) ? staffArr[0] : (staffArr as unknown as { full_name: string });
    doctorMap.set(doc.id, {
      name: staff?.full_name ?? "Doctor",
      specialization: doc.specialization ?? null,
    });
  }

  // Build active queues
  const activeQueues: DoctorQueueData[] = (queuesData ?? []).map((queue) => {
    const docInfo = doctorMap.get(queue.doctor_id as string);
    const entries = (queue.queue_entries as unknown as Array<Record<string, unknown>>) ?? [];

    const activeEntries = entries
      .filter((e) => ["WAITING", "CALLED", "IN_CONSULTATION"].includes(e.status as string))
      .map(mapEntry)
      .sort((a, b) => a.priority - b.priority || a.queueNumber - b.queueNumber);

    return {
      queueId: queue.id as string,
      doctorId: queue.doctor_id as string,
      doctorName: docInfo?.name ?? "Doctor",
      specialization: docInfo?.specialization ?? null,
      waiting: activeEntries.filter((e) => e.status === "WAITING"),
      called: activeEntries.filter((e) => e.status === "CALLED"),
      inConsultation: activeEntries.find((e) => e.status === "IN_CONSULTATION") ?? null,
    };
  });

  // Doctors without a queue today
  const doctorsWithoutQueue: DoctorWithoutQueue[] = (doctorsData ?? [])
    .filter((doc) => !queueDoctorIds.has(doc.id))
    .map((doc) => {
      const docInfo = doctorMap.get(doc.id);
      return {
        doctorId: doc.id,
        doctorName: docInfo?.name ?? "Doctor",
        specialization: docInfo?.specialization ?? null,
      };
    });

  return { activeQueues, doctorsWithoutQueue };
}
