"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScheduleGrid, type ScheduleSlot } from "./ScheduleGrid";

interface DoctorWithSchedule {
  id: string;
  name: string;
  specialization: string | null;
  slots: ScheduleSlot[];
}

interface ScheduleViewProps {
  doctors: DoctorWithSchedule[];
  canManage: boolean;
}

export function ScheduleView({ doctors, canManage }: ScheduleViewProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id ?? "");
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) ?? doctors[0];

  return (
    <div className="space-y-4">
      <Select value={selectedDoctorId || doctors[0]?.id} onValueChange={setSelectedDoctorId}>
        <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select doctor" /></SelectTrigger>
        <SelectContent>
          {doctors.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              Dr. {d.name}{d.specialization ? ` · ${d.specialization}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedDoctor && (
        <ScheduleGrid
          doctorId={selectedDoctor.id}
          doctorName={selectedDoctor.name}
          slots={selectedDoctor.slots}
          canManage={canManage}
        />
      )}
    </div>
  );
}
