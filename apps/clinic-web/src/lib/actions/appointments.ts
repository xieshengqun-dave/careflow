"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "CONFIRMED" | "COMPLETED" | "NO_SHOW",
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
  const supabase = await createServerClient();
  const { error } = await supabase.rpc("check_in_appointment", { p_appointment_id: appointmentId });
  if (error) return { error: error.message };
  revalidatePath("/appointments");
  revalidatePath("/queue");
  return {};
}

export async function completeAppointment(appointmentId: string): Promise<{ error?: string }> {
  return updateAppointmentStatus(appointmentId, "COMPLETED");
}

export async function markNoShow(appointmentId: string): Promise<{ error?: string }> {
  // Intentionally a plain status update, not cancel_appointment: the appointment
  // time has already passed, so the slot stays BOOKED (not reopened for rebooking)
  // while the appointment itself still reports as NO_SHOW for analytics.
  return updateAppointmentStatus(appointmentId, "NO_SHOW");
}

export async function cancelAppointmentStaff(appointmentId: string): Promise<{ error?: string }> {
  const supabase = await createServerClient();
  const { error } = await supabase.rpc("cancel_appointment", { p_appointment_id: appointmentId });
  if (error) return { error: error.message };
  revalidatePath("/appointments");
  revalidatePath("/queue");
  return {};
}
