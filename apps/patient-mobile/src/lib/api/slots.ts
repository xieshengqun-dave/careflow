import { supabase } from "@/lib/supabase";
import { generateSlots } from "@careflow/shared";
import type { GeneratedSlot } from "@careflow/shared";

export type { GeneratedSlot };

export async function getDoctorSlotsForDate(
  doctorId: string,
  dateStr: string // "YYYY-MM-DD"
): Promise<GeneratedSlot[]> {
  const parts = dateStr.split("-");
  const dayOfWeek = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay();

  const [schedulesRes, breaksRes, bookedRes] = await Promise.all([
    supabase
      .from("doctor_schedules")
      .select("start_time, end_time")
      .eq("doctor_id", doctorId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true),

    supabase
      .from("doctor_breaks")
      .select("start_time, end_time, label")
      .eq("doctor_id", doctorId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true),

    supabase
      .from("time_slots")
      .select("start_time, id")
      .eq("doctor_id", doctorId)
      .eq("slot_date", dateStr)
      .eq("status", "BOOKED"),
  ]);

  const { data: doctorData } = await supabase
    .from("doctors")
    .select("consultation_duration_minutes")
    .eq("id", doctorId)
    .single();

  const schedules = schedulesRes.data ?? [];
  const breaks = (breaksRes.data ?? []).map((b) => ({
    start: (b.start_time as string).slice(0, 5),
    end: (b.end_time as string).slice(0, 5),
    label: b.label,
  }));
  const bookedSlots = (bookedRes.data ?? []).map((b) => ({
    startTime: (b.start_time as string).slice(0, 5),
    appointmentId: b.id as string,
  }));

  if (schedules.length === 0) return [];

  return generateSlots({
    workingPeriods: schedules.map((s) => ({
      start: (s.start_time as string).slice(0, 5),
      end: (s.end_time as string).slice(0, 5),
    })),
    breaks,
    slotDuration: doctorData?.consultation_duration_minutes ?? 30,
    bookedSlots,
  });
}
