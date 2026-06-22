import { createServerClient } from "@/lib/supabase/server";
import { generateSlots } from "@careflow/shared";
import type { GeneratedSlot } from "@careflow/shared";

export interface DoctorSlotData {
  doctorId: string;
  doctorName: string;
  specialization: string | null;
  slotDuration: number;
  slots: GeneratedSlot[];
}

export async function getDoctorSlotsForDate(
  clinicId: string,
  dateStr: string // "YYYY-MM-DD"
): Promise<DoctorSlotData[]> {
  const supabase = await createServerClient();

  // Parse manually to avoid UTC offset issues
  const parts = dateStr.split("-");
  const dayOfWeek = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay();

  const { data: doctors, error: docError } = await supabase
    .from("doctors")
    .select(`
      id,
      specialization,
      consultation_duration_minutes,
      clinic_staff!inner (
        full_name,
        clinic_id,
        is_active
      )
    `)
    .eq("clinic_staff.clinic_id", clinicId)
    .eq("clinic_staff.is_active", true);

  if (docError || !doctors) return [];

  const results: DoctorSlotData[] = [];

  for (const doctor of doctors) {
    const staffArr = doctor.clinic_staff as unknown as Array<{ full_name: string }>;
    const staff = Array.isArray(staffArr) ? staffArr[0] : (staffArr as unknown as { full_name: string });

    const { data: schedules } = await supabase
      .from("doctor_schedules")
      .select("start_time, end_time")
      .eq("doctor_id", doctor.id)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true);

    if (!schedules || schedules.length === 0) continue;

    let breaks: Array<{ start: string; end: string; label: string }> = [];
    try {
      const { data: breakData } = await supabase
        .from("doctor_breaks")
        .select("start_time, end_time, label")
        .eq("doctor_id", doctor.id)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);
      breaks = (breakData ?? []).map((b) => ({
        start: (b.start_time as string).slice(0, 5),
        end: (b.end_time as string).slice(0, 5),
        label: b.label ?? "Break",
      }));
    } catch {
      // doctor_breaks table may not exist yet — run the migration first
    }

    const { data: bookedData } = await supabase
      .from("time_slots")
      .select("start_time, id")
      .eq("doctor_id", doctor.id)
      .eq("slot_date", dateStr)
      .eq("status", "BOOKED");

    const bookedSlots = (bookedData ?? []).map((b) => ({
      startTime: (b.start_time as string).slice(0, 5),
      appointmentId: b.id as string,
    }));

    const workingPeriods = schedules.map((s) => ({
      start: (s.start_time as string).slice(0, 5),
      end: (s.end_time as string).slice(0, 5),
    }));

    const slots = generateSlots({
      workingPeriods,
      breaks,
      slotDuration: doctor.consultation_duration_minutes,
      bookedSlots,
    });

    results.push({
      doctorId: doctor.id,
      doctorName: staff?.full_name ?? "Doctor",
      specialization: doctor.specialization ?? null,
      slotDuration: doctor.consultation_duration_minutes,
      slots,
    });
  }

  return results;
}
