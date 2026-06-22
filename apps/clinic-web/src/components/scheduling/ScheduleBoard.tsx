"use client";

import type { DoctorSlotData } from "@/lib/queries/slots";
import { DateNav } from "./DateNav";
import { SlotBoard } from "./SlotBoard";
import { ColorLegend } from "./ColorLegend";

interface ScheduleBoardProps {
  doctors: DoctorSlotData[];
  date: string; // "YYYY-MM-DD"
}

function formatDateHeading(dateStr: string): string {
  const parts = dateStr.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ScheduleBoard({ doctors, date }: ScheduleBoardProps) {
  return (
    <div className="space-y-6">
      <DateNav selectedDate={date} />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">{formatDateHeading(date)}</h2>
        <ColorLegend />
      </div>

      <SlotBoard doctors={doctors} date={date} />
    </div>
  );
}
