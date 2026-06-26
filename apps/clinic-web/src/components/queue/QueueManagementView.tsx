"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Phone, CheckCircle2, ArrowUpToLine, XCircle, BellRing, SkipForward, RotateCcw, PauseCircle, PlayCircle, Users, Clock, Hash, Layers } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AddWalkInDialog } from "./AddWalkInDialog";
import {
  callNext,
  skipEntry,
  requeueEntry,
  startConsultation,
  moveToTop,
  removeEntry,
  notifyQueueDelayed,
  pauseQueue,
  resumeQueue,
} from "@/lib/actions/queue";
import type { CombinedQueueEntry, CombinedQueueSummary } from "@/lib/queries/queue";

const STATUS_CONFIG: Record<CombinedQueueEntry["status"], { label: string; bg: string; text: string; dot: string }> = {
  WAITING:        { label: "Waiting",      bg: "bg-slate-100",     text: "text-slate-600",     dot: "bg-slate-400" },
  CALLED:         { label: "Called In",    bg: "bg-cf-primary-50", text: "text-cf-primary-700", dot: "bg-cf-primary-600" },
  IN_CONSULTATION: { label: "With Doctor", bg: "bg-cf-green-50",   text: "text-cf-green-600",  dot: "bg-cf-green-500" },
  COMPLETED:      { label: "Completed",    bg: "bg-slate-100",     text: "text-slate-500",     dot: "bg-slate-400" },
  SKIPPED:        { label: "Skipped",      bg: "bg-cf-amber-50",   text: "text-cf-amber-700",  dot: "bg-cf-amber-500" },
  REMOVED:        { label: "Removed",      bg: "bg-cf-red-50",     text: "text-cf-red-600",    dot: "bg-cf-red-500" },
};

function elapsed(joinedAt: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(joinedAt).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" });
}

interface Props {
  summary: CombinedQueueSummary;
  clinicId: string;
  doctorOptions: { queueId: string; doctorName: string }[];
  lastUpdated: string;
}

export function QueueManagementView({ summary, clinicId, doctorOptions, lastUpdated }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(summary.entries[0]?.id ?? null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selected = useMemo(
    () => summary.entries.find((e) => e.id === selectedId) ?? summary.entries[0] ?? null,
    [summary.entries, selectedId],
  );

  // Realtime: refresh server data whenever queue state changes
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`clinic-queue-mgmt-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "queues" }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinicId, router]);

  function runAction(fn: () => Promise<{ error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setActionError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time queue overview and patient management</p>
        </div>
        <div className="flex items-center gap-2">
          <AddWalkInDialog doctorOptions={doctorOptions} />
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <span className="text-xs text-muted-foreground">Last updated: {lastUpdated}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,  label: "Total in Queue",    value: `${summary.totalInQueue}`, unit: "patients", color: "text-cf-primary-700", bg: "bg-cf-primary-50" },
          { icon: Clock,  label: "Avg. Waiting Time", value: summary.avgWaitMinutes !== null ? `${summary.avgWaitMinutes}` : "—", unit: summary.avgWaitMinutes !== null ? "mins" : "", color: "text-cf-amber-700", bg: "bg-cf-amber-50" },
          { icon: Hash,   label: "Next to Be Seen",   value: summary.nextQueueNumber !== null ? `#${summary.nextQueueNumber}` : "—", unit: "up next", color: "text-cf-green-600", bg: "bg-cf-green-50" },
          { icon: Layers, label: "Queues Open",        value: `${summary.queuesOpen}`, unit: "active", color: "text-slate-600", bg: "bg-slate-100" },
        ].map(({ icon: Icon, label, value, unit, color, bg }) => (
          <div key={label} className="bg-white rounded-[18px] border p-5 flex items-start gap-4 shadow-sm">
            <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
              <p className="text-2xl font-bold text-slate-900 leading-none">
                {value}
                {unit && <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        {/* Current queue table */}
        <div className="bg-white rounded-[18px] border overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b bg-slate-50/60 flex items-center justify-between">
            <h2 className="font-semibold text-base text-slate-900">Current Queue</h2>
            <span className="text-xs text-slate-400 font-medium">{summary.entries.length} patient{summary.entries.length !== 1 ? "s" : ""}</span>
          </div>
          {summary.entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">No patients in queue right now.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b bg-[#F8FAFC]">
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wide w-10">#</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wide">Patient</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wide">Type</th>
                  <th className="px-4 py-2.5 font-bold uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.entries.map((e, idx) => {
                  const cfg = STATUS_CONFIG[e.status];
                  const active = e.id === selected?.id;
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className={`cursor-pointer border-b last:border-0 transition-colors ${active ? "bg-cf-primary-50/60" : "hover:bg-slate-50/60"}`}
                    >
                      <td className="px-4 py-3">
                        <span className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold text-white ${idx === 0 ? "bg-cf-green-500" : "bg-slate-200 !text-slate-500"}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{e.patientName}</p>
                        <p className="text-xs text-slate-400">{e.doctorName}{e.specialization ? ` · ${e.specialization}` : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{timeLabel(e.joinedAt)}</p>
                        <p className="text-xs text-slate-400">{elapsed(e.joinedAt)} waiting</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{e.type === "WALK_IN" ? "Walk-in" : "Appointment"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-[11px] py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="text-xs text-slate-400 px-5 py-3 border-t bg-slate-50/40">
            Updates automatically in real-time.
          </p>
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-[18px] border shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b bg-slate-50/60">
            <h2 className="font-semibold text-sm text-slate-900">Patient Details</h2>
          </div>
          <div className="p-4 space-y-4">
            {!selected ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Users className="h-7 w-7 text-slate-200" />
                <p className="text-xs text-slate-400">Select a patient from the queue</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium mb-0.5">Queue #{summary.entries.findIndex((e) => e.id === selected.id) + 1}</p>
                    <p className="font-semibold text-slate-900 text-sm">{selected.patientName}</p>
                    {selected.patientPhone && (
                      <p className="text-xs text-slate-400">{selected.patientPhone}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${STATUS_CONFIG[selected.status].bg} ${STATUS_CONFIG[selected.status].text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selected.status].dot}`} />
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                </div>

                <div className="text-sm space-y-1.5 border-t pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Queue Time</span><span>{timeLabel(selected.joinedAt)} ({elapsed(selected.joinedAt)})</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{selected.type === "WALK_IN" ? "Walk-in" : "Appointment"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span>Dr. {selected.doctorName}</span></div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
                  {actionError && <p className="text-xs text-cf-red-600">{actionError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm" variant="outline" disabled={isPending}
                      onClick={() => runAction(() => callNext(selected.queueId))}
                      className="text-cf-primary-700 border-cf-primary-200"
                    >
                      <Phone className="h-3.5 w-3.5 mr-1.5" /> Call Next
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={isPending || selected.status !== "CALLED"}
                      onClick={() => runAction(() => startConsultation(selected.id))}
                      className="text-cf-green-600 border-cf-green-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark Arrived
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={isPending || selected.priority === 1}
                      onClick={() => runAction(() => moveToTop(selected.id))}
                      className="text-cf-amber-700 border-cf-amber-200"
                    >
                      <ArrowUpToLine className="h-3.5 w-3.5 mr-1.5" /> Move to Top
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={isPending}
                      onClick={() => runAction(() => removeEntry(selected.id))}
                      className="text-cf-red-600 border-cf-red-200"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" /> Remove
                    </Button>
                    {selected.status === "SKIPPED" ? (
                      <Button
                        size="sm" variant="outline" disabled={isPending}
                        onClick={() => runAction(() => requeueEntry(selected.id))}
                        className="col-span-2 text-cf-primary-700 border-cf-primary-200"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Requeue (move to back)
                      </Button>
                    ) : selected.status === "WAITING" ? (
                      <Button
                        size="sm" variant="outline" disabled={isPending}
                        onClick={() => runAction(() => skipEntry(selected.id))}
                        className="col-span-2 text-cf-amber-700 border-cf-amber-200"
                      >
                        <SkipForward className="h-3.5 w-3.5 mr-1.5" /> Skip Patient
                      </Button>
                    ) : null}
                  </div>
                  <Button
                    size="sm" variant="outline" disabled={isPending}
                    onClick={() => runAction(() => notifyQueueDelayed(selected.queueId, selected.doctorName))}
                    className="w-full text-slate-600 border-slate-200"
                  >
                    <BellRing className="h-3.5 w-3.5 mr-1.5" /> Notify Everyone Waiting: Doctor Delayed
                  </Button>
                  {selected.isQueuePaused ? (
                    <Button
                      size="sm" variant="outline" disabled={isPending}
                      onClick={() => runAction(() => resumeQueue(selected.queueId))}
                      className="w-full text-cf-green-600 border-cf-green-200"
                    >
                      <PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Resume Queue
                    </Button>
                  ) : (
                    <Button
                      size="sm" variant="outline" disabled={isPending}
                      onClick={() => runAction(() => pauseQueue(selected.queueId))}
                      className="w-full text-cf-amber-700 border-cf-amber-200"
                    >
                      <PauseCircle className="h-3.5 w-3.5 mr-1.5" /> Pause Queue
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
