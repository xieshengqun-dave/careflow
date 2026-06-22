import { supabase } from "./supabase";

function normalizeMalaysianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+6")) return phone;
  if (digits.startsWith("60")) return `+${digits}`;
  if (digits.startsWith("0")) return `+6${digits.slice(1)}`;
  return `+60${digits}`;
}

export async function sendOTP(phone: string) {
  const normalized = normalizeMalaysianPhone(phone);
  return supabase.auth.signInWithOtp({ phone: normalized });
}

export async function verifyOTP(phone: string, token: string) {
  const normalized = normalizeMalaysianPhone(phone);
  return supabase.auth.verifyOtp({ phone: normalized, token, type: "sms" });
}

export async function updateProfile(userId: string, data: { full_name: string }) {
  return supabase
    .from("profiles")
    .update({ full_name: data.full_name })
    .eq("id", userId);
}
