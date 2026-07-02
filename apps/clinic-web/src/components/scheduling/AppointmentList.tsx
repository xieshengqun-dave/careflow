"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { checkInAppointment, completeAppointment, markNoShow, cancelAppointmentStaff } from "@/lib/actions/appointments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RescheduleDialog } from "./RescheduleDialog";
import type { ClinicAppointment, AppointmentStatus } from "@/lib/queries/appointments";

const STATUS_STYLE: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  PENDING:    { bg: "bg-cf-amber-50",   text: "text-cf-amber-700",   label: "Pending" },
  CONFIRMED:  { bg: "bg-cf-green-50",   text: "text-cf-green-600",   label: "Confirmed" },
  CHECKED_IN: { bg: "bg-cf-primary-50", text: "text-cf-primary-700", label: "Checked In" },
  COMPLETED:  { bg: "bg-slate-100",     text: "text-slate-500",      label: "Completed" },
  CANCELLED:  { bg: "bg-cf-red-50",     text: "text-cf-red-600",     label: "Cancelled" },
  NO_SHOW:    { bg: "bg-cf-red-50",     text: "text-cf-red-600",     label: "No Show" },
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTime(t: string): string {
  const parts = t.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
}

function isOverdue(appt: ClinicAppointment): boolean {
  if (appt.status !== "CONFIRMED" || !appt.startTime || !appt.date) return false;
  const slotStart = new Date(`${appt.date}T${appt.startTime}:00+08:00`);
  return Date.now() - slotStart.getTime() > 15 * 60 * 1000;
}

interface AppointmentRowProps {
  appt: ClinicAppointment;
  clinicId: string;
  overdue: boolean;
}

function AppointmentRow({ appt, clinicId, overdue }: AppointmentRowProps) {
  const [isPending, startTransition] = useTransition();
  const s = STATUS_STYLE[appt.status];

  return (
    <tr
      className={`border-b last:border-0 transition-opacity ${isPending ? "opacity-50" : ""} ${
        overdue ? "bg-cf-amber-50/40" : ""
      }`}
    >
      <td className="px-4 py-3 text-sm font-bold text-slate-700 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          {formatTime(appt.startTime)}
          {overdue && (
            <span title="Overdue — no check-in">
              <AlertCircle className="h-3.5 w-3.5 text-cf-amber-600" />
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold shrink-0">
            {initials(appt.patientName)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{appt.patientName}</p>
            {appt.patientPhone && <p className="text-xs text-slate-400">{appt.patientPhone}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-slate-600 whitespace-nowrap">
        {appt.doctorName}
      </td>
      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">Appointment</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold px-[11px] py-1 rounded-md ${s.bg} ${s.text}`}>
          {s.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5 justify-end flex-wrap">
          {appt.status === "CONFIRMED" && (
            <button
              onClick={() => startTransition(() => { void checkInAppointment(appt.id); })}
              disabled={isPending}
              className="text-xs px-2.5 py-1 rounded-md bg-cf-primary-700 text-white hover:bg-cf-primary-800 disabled:opacity-50 transition-colors"
            >
              Check In
            </button>
          )}
          {appt.status === "CHECKED_IN" && (
            <button
              onClick={() => startTransition(() => { void completeAppointment(appt.id); })}
              disabled={isPending}
              className="text-xs px-2.5 py-1 rounded-md bg-cf-green-600 text-white hover:bg-cf-green-600/90 disabled:opacity-50 transition-colors"
            >
              Complete
            </button>
          )}
          {(appt.status === "CONFIRMED" || appt.status === "PENDING") && (
            <RescheduleDialog appointment={appt} clinicId={clinicId} />
          )}
          {(appt.status === "CONFIRMED" || appt.status === "PENDING") && (
            <button
              onClick={() => startTransition(() => { void markNoShow(appt.id); })}
              disabled={isPending}
              className="text-xs px-2.5 py-1 rounded-md bg-cf-amber-50 text-cf-amber-700 hover:bg-cf-amber-100 border border-cf-amber-200 disabled:opacity-50 transition-colors"
            >
              No Show
            </button>
          )}
          {(appt.status === "CONFIRMED" || appt.status === "PENDING") && (
            <button
              onClick={() => startTransition(() => { void cancelAppointmentStaff(appt.id); })}
              disabled={isPending}
              className="text-xs px-2.5 py-1 rounded-md bg-cf-red-50 text-cf-red-600 hover:bg-cf-red-50/70 border border-red-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

interface Props {
  appointments: ClinicAppointment[];
  clinicId?: string;
}

export function AppointmentList({ appointments, clinicId = "" }: Props) {
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

  const overdueCount = filtered.filter(isOverdue).length;

  function sweepNoShows() {
    filtered.filter(isOverdue).forEach((a) => { void markNoShow(a.id); });
  }

  return (
    <div className="bg-white rounded-[18px] border overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b bg-slate-50/50">
        <Select value={doctorFilter} onValueChange={setDoctorFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Doctors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Doctors</SelectItem>
            {doctors.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_STYLE).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative ml-auto">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient…"
            className="h-8 text-xs w-[180px] pl-7"
          />
        </div>
        {overdueCount > 0 && (
          <button
            onClick={sweepNoShows}
            className="h-8 px-3 text-xs font-semibold rounded-lg bg-cf-amber-50 text-cf-amber-700 border border-cf-amber-200 hover:bg-cf-amber-100 transition-colors flex items-center gap-1.5"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {overdueCount} Overdue — Mark No Show
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-sm text-slate-400">
          No appointments match this filter.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b bg-[#F8FAFC]">
              <th className="px-4 py-2.5 font-bold uppercase tracking-wide">Time</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wide">Patient</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wide">Doctor</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wide">Type</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((appt) => (
              <AppointmentRow
                key={appt.id}
                appt={appt}
                clinicId={clinicId}
                overdue={isOverdue(appt)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
