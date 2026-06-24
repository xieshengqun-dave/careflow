"use client";

import { useMemo, useState, useTransition } from "react";
import { checkInAppointment, completeAppointment, markNoShow, cancelAppointmentStaff } from "@/lib/actions/appointments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ClinicAppointment, AppointmentStatus } from "@/lib/queries/appointments";

const STATUS_STYLE: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  PENDING:    { bg: "bg-cf-amber-50",  text: "text-cf-amber-700",  label: "Pending" },
  CONFIRMED:  { bg: "bg-cf-green-50",  text: "text-cf-green-600",  label: "Confirmed" },
  CHECKED_IN: { bg: "bg-cf-primary-50", text: "text-cf-primary-700", label: "Checked In" },
  COMPLETED:  { bg: "bg-slate-100",    text: "text-slate-500",     label: "Completed" },
  CANCELLED:  { bg: "bg-cf-red-50",    text: "text-cf-red-600",     label: "Cancelled" },
  NO_SHOW:    { bg: "bg-cf-red-50",    text: "text-cf-red-600",     label: "No Show" },
};

function initials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

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
    <tr className={`border-b last:border-0 transition-opacity ${isPending ? "opacity-50" : ""}`}>
      <td className="px-4 py-3 text-sm font-medium text-slate-700 whitespace-nowrap">{formatTime(appt.startTime)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-cf-primary-50 text-cf-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {initials(appt.patientName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{appt.patientName}</p>
            {appt.patientPhone && <p className="text-xs text-slate-400">{appt.patientPhone}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{appt.doctorName}</td>
      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">Appointment</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
          {s.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 justify-end">
          {appt.status === "CONFIRMED" && (
            <button
              onClick={() => startTransition(() => { void checkInAppointment(appt.id); })}
              disabled={isPending}
              className="text-xs px-2.5 py-1 rounded-md bg-cf-primary-700 text-white hover:bg-cf-primary-800 disabled:opacity-50"
            >
              Check In
            </button>
          )}
          {appt.status === "CHECKED_IN" && (
            <button
              onClick={() => startTransition(() => { void completeAppointment(appt.id); })}
              disabled={isPending}
              className="text-xs px-2.5 py-1 rounded-md bg-cf-green-600 text-white hover:bg-cf-green-600/90 disabled:opacity-50"
            >
              Complete
            </button>
          )}
          {(appt.status === "CONFIRMED" || appt.status === "PENDING") && (
            <button
              onClick={() => startTransition(() => { void markNoShow(appt.id); })}
              disabled={isPending}
              className="text-xs px-2.5 py-1 rounded-md bg-cf-amber-50 text-cf-amber-700 hover:bg-cf-amber-100 disabled:opacity-50"
            >
              No Show
            </button>
          )}
          {(appt.status === "CONFIRMED" || appt.status === "PENDING") && (
            <button
              onClick={() => startTransition(() => { void cancelAppointmentStaff(appt.id); })}
              disabled={isPending}
              className="text-xs px-2.5 py-1 rounded-md bg-cf-red-50 text-cf-red-600 hover:bg-cf-red-50/70 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function AppointmentList({ appointments }: { appointments: ClinicAppointment[] }) {
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const doctors = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of appointments) map.set(a.doctorId, a.doctorName);
    return Array.from(map.entries());
  }, [appointments]);

  const filtered = appointments
    .filter((a) => doctorFilter === "all" || a.doctorId === doctorFilter)
    .filter((a) => statusFilter === "all" || a.status === statusFilter)
    .filter((a) => !search || a.patientName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-slate-50/50">
        <Select value={doctorFilter} onValueChange={setDoctorFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="All Doctors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Doctors</SelectItem>
            {doctors.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_STYLE).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient…"
          className="h-8 text-xs w-[200px] ml-auto"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-sm text-slate-400">
          No appointments match this filter.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="px-4 py-2 font-medium">Time</th>
              <th className="px-4 py-2 font-medium">Patient</th>
              <th className="px-4 py-2 font-medium">Doctor</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((appt) => <AppointmentRow key={appt.id} appt={appt} />)}
          </tbody>
        </table>
      )}
    </div>
  );
}
