"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function updateClinic(data: {
  name: string;
  address: string;
  phoneNumber: string;
  email: string;
}) {
  const user = await requireRole(["clinic_admin", "super_admin"]);
  if (!user?.clinicId) return { error: "Unauthorized" };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("clinics")
    .update({ name: data.name, address: data.address, phone_number: data.phoneNumber, email: data.email })
    .eq("id", user.clinicId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}
