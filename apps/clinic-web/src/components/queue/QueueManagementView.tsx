"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Phone, CheckCircle2, ArrowUpToLine, XCircle, BellRing, SkipForward, RotateCcw, PauseCircle, PlayCircle } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total in Queue</p>
          <p className="text-2xl font-bold mt-1">{summary.totalInQueue} <span className="text-sm font-normal text-muted-foreground">patients</span></p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Avg. Waiting Time</p>
          <p className="text-2xl font-bold mt-1">{summary.avgWaitMinutes !== null ? `${summary.avgWaitMinutes} mins` : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Next to be Seen</p>
          <p className="text-2xl font-bold mt-1">{summary.nextQueueNumber !== null ? `#${summary.nextQueueNumber}` : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Queues Open</p>
          <p className="text-2xl font-bold mt-1">{summary.queuesOpen}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Current queue table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Queue ({summary.entries.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {summary.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6">No patients in queue right now.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-y">
                    <th className="px-4 py-2 font-medium w-10">#</th>
                    <th className="px-4 py-2 font-medium">Patient</th>
                    <th className="px-4 py-2 font-medium">Queue Time</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Status</th>
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
                        className={`cursor-pointer border-b last:border-0 transition-colors ${active ? "bg-cf-primary-50/60" : "hover:bg-muted/50"}`}
                      >
                        <td className="px-4 py-3">
                          <span className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold text-white ${idx === 0 ? "bg-cf-green-500" : "bg-slate-300"}`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{e.patientName}</p>
                          <p className="text-xs text-muted-foreground">{e.doctorName}{e.specialization ? ` · ${e.specialization}` : ""}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {timeLabel(e.joinedAt)}
                          <span className="text-xs text-muted-foreground block">{elapsed(e.joinedAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{e.type === "WALK_IN" ? "Walk-in" : "Appointment"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
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
            <p className="text-xs text-muted-foreground px-4 py-3 border-t">
              Queue status updates automatically in real-time.
            </p>
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Select a patient to see details.</p>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">#{summary.entries.findIndex((e) => e.id === selected.id) + 1}</p>
                    <p className="font-semibold text-slate-900">{selected.patientName}</p>
                    {selected.patientPhone && (
                      <p className="text-xs text-muted-foreground">{selected.patientPhone}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[selected.status].bg} ${STATUS_CONFIG[selected.status].text}`}>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
