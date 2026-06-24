"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { getMYTToday } from "@careflow/shared";

async function getAuthedSupabase() {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) return { user: null, supabase: null };
  const supabase = await createServerClient();
  return { user, supabase };
}

export async function openQueue(doctorId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase.from("queues").insert({
    clinic_id: user.clinicId,
    doctor_id: doctorId,
    queue_date: getMYTToday(),
    is_active: true,
    current_number: 0,
  });

  if (error) {
    if (error.code === "23505") return { error: "Queue already open for this doctor today." };
    return { error: error.message };
  }

  revalidatePath("/queue");
  return { success: true };
}

export async function callNext(queueId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { data: next } = await supabase
    .from("queue_entries")
    .select("id")
    .eq("queue_id", queueId)
    .eq("status", "WAITING")
    .order("priority", { ascending: true })
    .order("queue_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!next) return { error: "No waiting patients." };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "CALLED", called_at: new Date().toISOString() })
    .eq("id", next.id);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function callSpecific(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "CALLED", called_at: new Date().toISOString() })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function startConsultation(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "IN_CONSULTATION" })
    .eq("id", entryId)
    .eq("status", "CALLED");

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function completeConsultation(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function skipEntry(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "SKIPPED" })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function moveToTop(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ priority: 1 })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function removeEntry(entryId: string) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("queue_entries")
    .update({ status: "REMOVED" })
    .eq("id", entryId);

  if (error) return { error: error.message };
  revalidatePath("/queue");
  return { success: true };
}

export async function addWalkIn(data: {
  queueId: string;
  patientName: string;
  phoneNumber: string;
  priority: 1 | 2 | 3;
}) {
  const { user, supabase } = await getAuthedSupabase();
  if (!user || !supabase) return { error: "Unauthorized" };

  const admin = createAdminClient();
  const formattedPhone = data.phoneNumber.startsWith("+") ? data.phoneNumber : `+6${data.phoneNumber}`;

  // Find or create patient profile
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("phone_number", formattedPhone)
    .maybeSingle();

  let patientId: string;

  if (existingProfile) {
    patientId = existingProfile.id as string;
  } else {
    const { data: authData, error: createError } = await admin.auth.admin.createUser({
      phone: formattedPhone,
      phone_confirm: true,
      user_metadata: { full_name: data.patientName },
    });
    if (createError || !authData.user) return { error: createError?.message ?? "Failed to create patient" };

    await admin.from("profiles").upsert(
      { id: authData.user.id, full_name: data.patientName, phone_number: formattedPhone },
      { onConflict: "id" }
    );
    patientId = authData.user.id;
  }

  // Get next queue number atomically enough for MVP
  const { data: queueRow } = await supabase
    .from("queues")
    .select("current_number")
    .eq("id", data.queueId)
    .single();

  const nextNumber = ((queueRow?.current_number as number) ?? 0) + 1;

  await supabase
    .from("queues")
    .update({ current_number: nextNumber })
    .eq("id", data.queueId);

  const { error: insertError } = await supabase.from("queue_entries").insert({
    queue_id: data.queueId,
    patient_id: patientId,
    queue_number: nextNumber,
    type: "WALK_IN",
    priority: data.priority,
    status: "WAITING",
  });

  if (insertError) return { error: insertError.message };
  revalidatePath("/queue");
  return { success: true };
}
