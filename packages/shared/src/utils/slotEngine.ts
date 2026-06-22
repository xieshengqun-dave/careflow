import type { GeneratedSlot, SlotEngineInput } from "../types/schedule";

function toMinutes(time: string): number {
  const parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function generateSlots(input: SlotEngineInput): GeneratedSlot[] {
  const { workingPeriods, breaks, slotDuration, bookedSlots, blockedSlots = [] } = input;

  const bookedMap = new Map(
    bookedSlots.map((s) => [s.startTime, s.appointmentId])
  );
  const blockedSet = new Set(blockedSlots);
  const breakRanges = breaks.map((b) => ({
    start: toMinutes(b.start),
    end: toMinutes(b.end),
  }));

  const slots: GeneratedSlot[] = [];

  for (const period of workingPeriods) {
    const periodStart = toMinutes(period.start);
    const periodEnd = toMinutes(period.end);

    let current = periodStart;
    while (current + slotDuration <= periodEnd) {
      const slotEnd = current + slotDuration;
      const startStr = toTimeString(current);
      const endStr = toTimeString(slotEnd);

      let status: GeneratedSlot["status"] = "AVAILABLE";

      if (breakRanges.some((b) => rangesOverlap(current, slotEnd, b.start, b.end))) {
        status = "BREAK";
      } else if (blockedSet.has(startStr)) {
        status = "BLOCKED";
      } else if (bookedMap.has(startStr)) {
        status = "BOOKED";
      }

      slots.push({
        start: startStr,
        end: endStr,
        startMinutes: current,
        endMinutes: slotEnd,
        status,
        appointmentId: bookedMap.get(startStr),
      });

      current += slotDuration;
    }
  }

  return slots;
}
