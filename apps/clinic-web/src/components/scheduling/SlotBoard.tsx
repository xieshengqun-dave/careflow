"use client";

import { Fragment, useState } from "react";
import type { GeneratedSlot } from "@careflow/shared";
import type { DoctorSlotData } from "@/lib/queries/slots";
import { SlotCell } from "./SlotCell";
import { Button } from "@/components/ui/button";

interface SlotBoardProps {
  doctors: DoctorSlotData[];
  date: string;
}

interface SelectedSlot {
  doctorId: string;
  doctorName: string;
  slot: GeneratedSlot;
}

function formatTime(time: string): string {
  const parts = time.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function SlotBoard({ doctors, date }: SlotBoardProps) {
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  if (doctors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm">No doctors have schedules on this day.</p>
        <p className="text-xs mt-1">Set up working hours in the Schedules page.</p>
      </div>
    );
  }

  // Collect all unique time starts across all doctors, sorted
  const allStartMinutes = Array.from(
    new Set(doctors.flatMap((d) => d.slots.map((s) => s.startMinutes)))
  ).sort((a, b) => a - b);

  function handleSelect(doctor: DoctorSlotData, slot: GeneratedSlot) {
    if (selected?.doctorId === doctor.doctorId && selected?.slot.start === slot.start) {
      setSelected(null);
    } else {
      setSelected({ doctorId: doctor.doctorId, doctorName: doctor.doctorName, slot });
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `80px repeat(${doctors.length}, minmax(130px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="px-3 py-3 border-b border-r bg-muted/50" />
          {doctors.map((doctor) => (
            <div
              key={doctor.doctorId}
              className="px-3 py-3 border-b border-r last:border-r-0 bg-muted/50"
            >
              <div className="text-xs font-semibold text-foreground truncate">
                {doctor.doctorName}
              </div>
              {doctor.specialization && (
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {doctor.specialization}
                </div>
              )}
            </div>
          ))}

          {/* Time rows */}
          {allStartMinutes.map((startMin) => {
            const h = Math.floor(startMin / 60);
            const m = startMin % 60;
            const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

            return (
              <Fragment key={startMin}>
                {/* Time label */}
                <div className="px-2 py-2 border-b border-r text-[11px] text-muted-foreground font-medium flex items-center">
                  {formatTime(timeStr)}
                </div>

                {/* Doctor cells */}
                {doctors.map((doctor) => {
                  const slot = doctor.slots.find((s) => s.startMinutes === startMin);
                  const isSelected =
                    selected?.doctorId === doctor.doctorId &&
                    selected?.slot.start === slot?.start;

                  return (
                    <div
                      key={`${doctor.doctorId}-${startMin}`}
                      className="px-2 py-2 border-b border-r last:border-r-0"
                    >
                      {slot ? (
                        <SlotCell
                          slot={slot}
                          isSelected={isSelected}
                          onSelect={() => handleSelect(doctor, slot)}
                        />
                      ) : (
                        <div className="rounded border border-transparent py-2 px-1 text-[10px] text-muted-foreground/40 text-center">
                          —
                        </div>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Booking panel */}
      {selected && (
        <div className="rounded-lg border bg-cf-primary-50 border-cf-primary-200 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-cf-primary-800">
            <span className="font-semibold">{selected.doctorName}</span>
            {" — "}
            {formatTime(selected.slot.start)}–{formatTime(selected.slot.end)}
            {" on "}
            {(() => { const p = date.split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); })()}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              Clear
            </Button>
            <Button size="sm" disabled title="Patient booking — coming soon">
              Book Appointment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
