"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { AddPatientDialog } from "./AddPatientDialog";
import {
  fetchPatientHistory,
  type PatientHistoryEntry,
} from "@/lib/actions/patients";
import type { ClinicPatient } from "@/lib/queries/patients";
import { Search, Users, Phone, CalendarDays } from "lucide-react";

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:    { bg: "bg-cf-amber-50",   text: "text-cf-amber-700",   label: "Pending" },
  CONFIRMED:  { bg: "bg-cf-green-50",   text: "text-cf-green-600",   label: "Confirmed" },
  CHECKED_IN: { bg: "bg-cf-primary-50", text: "text-cf-primary-700", label: "Checked In" },
  COMPLETED:  { bg: "bg-slate-100",     text: "text-slate-500",      label: "Completed" },
  CANCELLED:  { bg: "bg-cf-red-50",     text: "text-cf-red-600",     label: "Cancelled" },
  NO_SHOW:    { bg: "bg-cf-red-50",     text: "text-cf-red-600",     label: "No Show" },
};

const FALLBACK_STATUS = { bg: "bg-slate-100", text: "text-slate-500", label: "—" };

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function DetailPanel({ patient }: { patient: ClinicPatient | null }) {
  const [history, setHistory] = useState<PatientHistoryEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!patient) return;
    startTransition(async () => {
      setHistory(await fetchPatientHistory(patient.id));
    });
  }, [patient]);

  return (
    <div className="w-80 shrink-0 bg-white rounded-[18px] border shadow-sm overflow-hidden self-start">
      <div className="px-4 py-3 border-b bg-[#F8FAFC]">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Patient Details
        </p>
      </div>

      {!patient ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
          <Users className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Select a patient to see their details</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-cf-primary-100 text-cf-primary-700 flex items-center justify-center text-sm font-bold shrink-0">
              {initials(patient.fullName)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{patient.fullName}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {patient.phoneNumber ?? "Guest — no phone"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Appts", value: patient.appointmentCount },
              { label: "Queue", value: patient.queueVisitCount },
              { label: "Last Visit", value: patient.lastVisit ?? "—" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 rounded-lg py-2 px-1">
                <p className="text-sm font-bold text-slate-900 truncate">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Appointment History
            </p>
            {isPending ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                No appointments at this clinic yet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {history.map((h) => {
                  const s = STATUS_STYLE[h.status] ?? FALLBACK_STATUS;
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900">
                          {h.date}
                          {h.startTime && <span className="text-slate-400 font-normal"> · {h.startTime}</span>}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {h.doctorName}
                          {h.treatmentType && ` · ${h.treatmentType}`}
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${s.bg} ${s.text}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PatientsView({ patients }: { patients: ClinicPatient[] }) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.phoneNumber ?? "").replace(/[\s-]/g, "").includes(q.replace(/[\s-]/g, "")),
    );
  }, [patients, search]);

  const selected = patients.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
          <p className="text-sm text-slate-500">
            {patients.length} patient{patients.length === 1 ? "" : "s"} with visits at this clinic
          </p>
        </div>
        <AddPatientDialog />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0 bg-white rounded-[18px] border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b">
                {["Patient", "Phone", "Last Visit", "Appts", "Queue"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    {search
                      ? "No patients match your search."
                      : "No patients yet — they appear here after their first appointment or queue visit."}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`border-b last:border-0 cursor-pointer transition-colors ${
                      p.id === selectedId ? "bg-cf-primary-50/60" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-cf-primary-100 text-cf-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(p.fullName)}
                        </div>
                        <span className="font-semibold text-slate-900">{p.fullName}</span>
                        {p.isGuest && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                            Guest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{p.phoneNumber ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.lastVisit ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.appointmentCount}</td>
                    <td className="px-4 py-2.5 text-slate-600">{p.queueVisitCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DetailPanel patient={selected} />
      </div>
    </div>
  );
}
