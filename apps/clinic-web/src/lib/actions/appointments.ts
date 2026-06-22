"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW",
): Promise<{ error?: string }> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) return { error: error.message };

  revalidatePath("/appointments");
  return {};
}

export async function checkInAppointment(appointmentId: string): Promise<{ error?: string }> {
  return updateAppointmentStatus(appointmentId, "CHECKED_IN");
}

export async function completeAppointment(appointmentId: string): Promise<{ error?: string }> {
  return updateAppointmentStatus(appointmentId, "COMPLETED");
}

export async function markNoShow(appointmentId: string): Promise<{ error?: string }> {
  return updateAppointmentStatus(appointmentId, "NO_SHOW");
}

export async function cancelAppointmentStaff(appointmentId: string): Promise<{ error?: string }> {
  return updateAppointmentStatus(appointmentId, "CANCELLED");
}
