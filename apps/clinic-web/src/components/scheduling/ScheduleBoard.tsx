"use client";

import { useEffect, useState } from "react";
import type { DoctorSlotData } from "@/lib/queries/slots";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.doctorId ?? "");

  // Keep selection valid if the doctor list changes (e.g. after a date change)
  useEffect(() => {
    if (!doctors.some((d) => d.doctorId === selectedDoctorId)) {
      setSelectedDoctorId(doctors[0]?.doctorId ?? "");
    }
  }, [doctors, selectedDoctorId]);

  const selectedDoctor = doctors.find((d) => d.doctorId === selectedDoctorId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DateNav selectedDate={date} />
        <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select doctor" /></SelectTrigger>
          <SelectContent>
            {doctors.map((d) => (
              <SelectItem key={d.doctorId} value={d.doctorId}>
                Dr. {d.doctorName}{d.specialization ? ` · ${d.specialization}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold">{formatDateHeading(date)}</h2>
        <ColorLegend />
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-sm">No doctors have schedules on this day.</p>
        </div>
      ) : !selectedDoctor ? null : (
        <SlotBoard doctors={[selectedDoctor]} date={date} />
      )}
    </div>
  );
}
