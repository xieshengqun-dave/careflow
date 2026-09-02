"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ChairStatus } from "@/lib/queries/chairs";

export async function updateChairStatus(
  chairId: string,
  status: ChairStatus,
): Promise<{ error?: string }> {
  const user = await requireRole(["receptionist", "clinic_admin", "super_admin", "doctor"]);
  if (!user) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("chairs" as "queues")
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq("id" as "doctor_id", chairId)
    .eq("clinic_id" as "doctor_id", user.clinicId!);

  if (error) return { error: error.message };

  revalidatePath("/queue");
  return {};
}
