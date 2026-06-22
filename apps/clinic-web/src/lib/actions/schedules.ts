"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function addScheduleSlot(data: {
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  const { error } = await supabase.from("doctor_schedules").insert({
    doctor_id: data.doctorId,
    day_of_week: data.dayOfWeek,
    start_time: data.startTime,
    end_time: data.endTime,
    is_active: true,
  });

  if (error) {
    if (error.message.includes("doctor_schedules_no_overlap"))
      return { error: "This time block overlaps with an existing slot." };
    return { error: error.message };
  }

  revalidatePath("/schedules");
  return { success: true };
}

export async function deleteScheduleSlot(slotId: string) {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("doctor_schedules")
    .update({ is_active: false })
    .eq("id", slotId);

  if (error) return { error: error.message };
  revalidatePath("/schedules");
  return { success: true };
}

export async function updateScheduleSlot(slotId: string, data: { startTime: string; endTime: string }) {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("doctor_schedules")
    .update({ start_time: data.startTime, end_time: data.endTime })
    .eq("id", slotId);

  if (error) {
    if (error.message.includes("doctor_schedules_no_overlap"))
      return { error: "Updated time overlaps with an existing slot." };
    return { error: error.message };
  }

  revalidatePath("/schedules");
  return { success: true };
}
