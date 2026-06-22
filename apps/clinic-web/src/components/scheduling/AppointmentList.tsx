"use client";

import { useTransition } from "react";
import { checkInAppointment, completeAppointment, markNoShow, cancelAppointmentStaff } from "@/lib/actions/appointments";
import type { ClinicAppointment, AppointmentStatus } from "@/lib/queries/appointments";

const STATUS_STYLE: Record<AppointmentStatus, { bg: string; text: string; border: string; label: string }> = {
  PENDING:    { bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200", label: "Pending" },
  CONFIRMED:  { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",  label: "Confirmed" },
  CHECKED_IN: { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",   label: "Checked In" },
  COMPLETED:  { bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-200",  label: "Completed" },
  CANCELLED:  { bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200",    label: "Cancelled" },
  NO_SHOW:    { bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-200", label: "No Show" },
};

function formatTime(t: string): string {
  const parts = t.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function AppointmentRow({ appt }: { appt: ClinicAppointment }) {
  const [isPending, startTransition] = useTransition();
  const s = STATUS_STYLE[appt.status];

  return (
    <div className={`flex items-center gap-4 px-4 py-3 border-b last:border-0 transition-opacity ${isPending ? "opacity-50" : ""}`}>
      <div className="w-24 text-sm font-semibold text-slate-700 shrink-0">
        {formatTime(appt.startTime)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{appt.patientName}</p>
        {appt.patientPhone && (
          <p className="text-xs text-slate-400">{appt.patientPhone}</p>
        )}
      </div>

      <div className="text-xs text-slate-500 hidden sm:block shrink-0">{appt.doctorName}</div>

      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${s.bg} ${s.text} ${s.border} shrink-0`}>
        {s.label}
      </span>

      <div className="flex gap-1 shrink-0">
        {appt.status === "CONFIRMED" && (
          <button
            onClick={() => startTransition(() => { void checkInAppointment(appt.id); })}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Check In
          </button>
        )}
        {appt.status === "CHECKED_IN" && (
          <button
            onClick={() => startTransition(() => { void completeAppointment(appt.id); })}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            Complete
          </button>
        )}
        {(appt.status === "CONFIRMED" || appt.status === "PENDING") && (
          <button
            onClick={() => startTransition(() => { void markNoShow(appt.id); })}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 disabled:opacity-50"
          >
            No Show
          </button>
        )}
        {(appt.status === "CONFIRMED" || appt.status === "PENDING") && (
          <button
            onClick={() => startTransition(() => { void cancelAppointmentStaff(appt.id); })}
            disabled={isPending}
            className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function AppointmentList({ appointments }: { appointments: ClinicAppointment[] }) {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-slate-400">
        No appointments scheduled for today.
      </div>
    );
  }

  const grouped = appointments.reduce<Record<string, ClinicAppointment[]>>((acc, appt) => {
    const key = appt.doctorId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(appt);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([doctorId, appts]) => {
        const first = appts[0];
        if (!first) return null;
        return (
          <div key={doctorId} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b bg-slate-50">
              <p className="text-sm font-semibold text-slate-700">{first.doctorName}</p>
              {first.specialization && (
                <p className="text-xs text-slate-400">{first.specialization}</p>
              )}
            </div>
            {appts
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((appt) => (
                <AppointmentRow key={appt.id} appt={appt} />
              ))}
          </div>
        );
      })}
    </div>
  );
}
