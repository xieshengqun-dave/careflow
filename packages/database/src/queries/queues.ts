import type { SupabaseClient } from "../client";

export async function getOrCreateQueue(
  client: SupabaseClient,
  doctorId: string,
  clinicId: string,
  queueDate: string
) {
  const { data: existing } = await client
    .from("queues")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("queue_date", queueDate)
    .single();

  if (existing) return { data: existing, error: null };

  return client
    .from("queues")
    .insert({ doctor_id: doctorId, clinic_id: clinicId, queue_date: queueDate, is_active: true, current_number: 0 })
    .select()
    .single();
}

export async function getQueueWithEntries(client: SupabaseClient, queueId: string) {
  return client
    .from("queues")
    .select(`
      *,
      queue_entries (
        *,
        profiles:patient_id (full_name, phone_number)
      )
    `)
    .eq("id", queueId)
    .order("priority", { referencedTable: "queue_entries" })
    .order("queue_number", { referencedTable: "queue_entries" })
    .single();
}

export async function joinQueue(
  client: SupabaseClient,
  params: {
    queueId: string;
    patientId: string;
    appointmentId?: string;
    type: "APPOINTMENT" | "WALK_IN";
    priority: 1 | 2 | 3;
  }
) {
  const { data: queue } = await client
    .from("queues")
    .select("current_number")
    .eq("id", params.queueId)
    .single();

  if (!queue) return { data: null, error: new Error("Queue not found") };

  const nextNumber = (queue.current_number ?? 0) + 1;

  return client
    .from("queue_entries")
    .insert({
      queue_id: params.queueId,
      patient_id: params.patientId,
      appointment_id: params.appointmentId ?? null,
      queue_number: nextNumber,
      type: params.type,
      priority: params.priority,
      status: "WAITING",
      joined_at: new Date().toISOString(),
      called_at: null,
      completed_at: null,
    })
    .select()
    .single();
}

export function subscribeToQueue(
  client: SupabaseClient,
  queueId: string,
  callback: (payload: unknown) => void
) {
  return client
    .channel(`queue:${queueId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "queue_entries",
        filter: `queue_id=eq.${queueId}`,
      },
      callback
    )
    .subscribe();
}
