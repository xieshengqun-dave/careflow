"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw, CheckCircle2, ArrowUpToLine, XCircle, BellRing,
  SkipForward, RotateCcw, PauseCircle, PlayCircle, Users, Clock,
  Hash, Layers, Phone,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddWalkInDialog } from "./AddWalkInDialog";
import { QuickCheckIn } from "./QuickCheckIn";
import { EmergencyButton } from "./EmergencyButton";
import { DoctorQueueColumns } from "./DoctorQueueColumns";
import {
  callNext,
  callSpecific,
  skipEntry,
  requeueEntry,
  startConsultation,
  completeConsultation,
  moveToTop,
  removeEntry,
  notifyQueueDelayed,
  pauseQueue,
  resumeQueue,
  reassignEntry,
} from "@/lib/actions/queue";
import type { CombinedQueueSummary, QueuePageData, QueueEntryData } from "@/lib/queries/queue";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  WAITING:          { label: "Waiting",      bg: "bg-slate-100",      text: "text-slate-600",      dot: "bg-slate-400" },
  CALLED:           { label: "Called In",    bg: "bg-cf-primary-50",  text: "text-cf-primary-700", dot: "bg-cf-primary-600" },
  IN_CONSULTATION:  { label: "With Doctor",  bg: "bg-cf-green-50",    text: "text-cf-green-600",   dot: "bg-cf-green-500" },
  COMPLETED:        { label: "Completed",    bg: "bg-slate-100",      text: "text-slate-500",      dot: "bg-slate-400" },
  SKIPPED:          { label: "Skipped",      bg: "bg-cf-amber-50",    text: "text-cf-amber-700",   dot: "bg-cf-amber-500" },
  REMOVED:          { label: "Removed",      bg: "bg-cf-red-50",      text: "text-cf-red-600",     dot: "bg-cf-red-500" },
};

function elapsed(joinedAt: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(joinedAt).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" });
}

interface SelectedInfo {
  entry: QueueEntryData;
  queueId: string;
  doctorName: string;
  isPaused: boolean;
}

function findSelected(boardData: QueuePageData, selectedId: string | null): SelectedInfo | null {
  if (!selectedId) return null;
  for (const q of boardData.activeQueues) {
    const all = [
      ...(q.inConsultation ? [q.inConsultation] : []),
      ...q.called,
      ...q.waiting,
    ];
    const entry = all.find((e) => e.id === selectedId);
    if (entry) return { entry, queueId: q.queueId, doctorName: q.doctorName, isPaused: q.isPaused };
  }
  return null;
}

interface Props {
  summary: CombinedQueueSummary;
  boardData: QueuePageData;
  clinicId: string;
  lastUpdated: string;
}

export function QueueManagementView({ summary, boardData, clinicId, lastUpdated }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedInfo = useMemo(() => findSelected(boardData, selectedId), [boardData, selectedId]);

  // Realtime refresh
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
      if (result?.error) setActionError(result.error);
    });
  }

  const doctorOptions = boardData.activeQueues.map((q) => ({
    queueId: q.queueId,
    doctorName: q.doctorName,
    waitingCount: q.waiting.length,
  }));

  const otherDoctorOptions = selectedInfo
    ? doctorOptions.filter((d) => d.queueId !== selectedInfo.queueId)
    : [];

  return (
    <div className="space-y-5">
      {/* Quick Check-in + actions bar */}
      <div className="bg-white rounded-[18px] border shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
        <QuickCheckIn />
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <EmergencyButton doctorOptions={doctorOptions} />
          <AddWalkInDialog clinicId={clinicId} doctorOptions={doctorOptions} />
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Updated: {lastUpdated}
          </span>
        </div>
      </div>

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold">Queue Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time queue · type a code or phone to check in instantly
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,  label: "Total in Queue",    value: `${summary.totalInQueue}`, unit: "patients", color: "text-cf-primary-700", bg: "bg-cf-primary-50" },
          { icon: Clock,  label: "Avg. Wait Today",   value: summary.avgWaitMinutes !== null ? `${summary.avgWaitMinutes}` : "—", unit: summary.avgWaitMinutes !== null ? "mins" : "", color: "text-cf-amber-700", bg: "bg-cf-amber-50" },
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

      {/* Per-doctor columns + detail panel */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0 min-h-[480px] flex flex-col">
          <DoctorQueueColumns
            boardData={boardData}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCallNext={(queueId) => runAction(() => callNext(queueId))}
            isPending={isPending}
          />
        </div>

        {/* Detail panel — always visible, shows empty state when nothing selected */}
        <div className="w-[280px] shrink-0 bg-white rounded-[18px] border shadow-sm overflow-hidden self-start">
          <div className="px-4 py-3.5 border-b bg-slate-50/60">
            <h2 className="font-semibold text-sm text-slate-900">Patient Details</h2>
          </div>
          <div className="p-4 space-y-4">
            {!selectedInfo ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Users className="h-7 w-7 text-slate-200" />
                <p className="text-xs text-slate-400">Click a patient to see actions</p>
              </div>
            ) : (
              <>
                {/* Patient info */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium mb-0.5">
                      Queue #{selectedInfo.entry.queueNumber}
                    </p>
                    <p className="font-semibold text-slate-900 text-sm">{selectedInfo.entry.patientName}</p>
                    {selectedInfo.entry.patientPhone && (
                      <p className="text-xs text-slate-400">{selectedInfo.entry.patientPhone}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                      STATUS_CONFIG[selectedInfo.entry.status]?.bg
                    } ${STATUS_CONFIG[selectedInfo.entry.status]?.text}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[selectedInfo.entry.status]?.dot}`} />
                    {STATUS_CONFIG[selectedInfo.entry.status]?.label}
                  </span>
                </div>

                <div className="text-sm space-y-1.5 border-t pt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Waited</span>
                    <span>{elapsed(selectedInfo.entry.joinedAt)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Joined at</span>
                    <span>{timeLabel(selectedInfo.entry.joinedAt)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Type</span>
                    <span>
                      {selectedInfo.entry.priority === 1
                        ? "Emergency"
                        : selectedInfo.entry.type === "WALK_IN"
                        ? "Walk-in"
                        : "Appointment"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Doctor</span>
                    <span>{selectedInfo.doctorName}</span>
                  </div>
                  {selectedInfo.entry.treatmentType && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Treatment</span>
                      <span>{selectedInfo.entry.treatmentType}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Actions</p>
                  {actionError && <p className="text-xs text-cf-red-600">{actionError}</p>}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm" variant="outline" disabled={isPending || selectedInfo.entry.status !== "WAITING"}
                      onClick={() => runAction(() => callSpecific(selectedInfo.entry.id))}
                      className="text-cf-primary-700 border-cf-primary-200"
                    >
                      <Phone className="h-3.5 w-3.5 mr-1.5" /> Call
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={isPending || selectedInfo.entry.status !== "CALLED"}
                      onClick={() => runAction(() => startConsultation(selectedInfo.entry.id))}
                      className="text-cf-green-600 border-cf-green-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Arrived
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={isPending || selectedInfo.entry.status !== "IN_CONSULTATION"}
                      onClick={() => runAction(() => completeConsultation(selectedInfo.entry.id))}
                      className="col-span-2 text-cf-green-600 border-cf-green-200"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Complete Consultation
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={isPending || selectedInfo.entry.priority === 1}
                      onClick={() => runAction(() => moveToTop(selectedInfo.entry.id))}
                      className="text-cf-amber-700 border-cf-amber-200"
                    >
                      <ArrowUpToLine className="h-3.5 w-3.5 mr-1.5" /> Top
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={isPending}
                      onClick={() => runAction(() => removeEntry(selectedInfo.entry.id))}
                      className="text-cf-red-600 border-cf-red-200"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" /> Remove
                    </Button>

                    {selectedInfo.entry.status === "SKIPPED" ? (
                      <Button
                        size="sm" variant="outline" disabled={isPending}
                        onClick={() => runAction(() => requeueEntry(selectedInfo.entry.id))}
                        className="col-span-2 text-cf-primary-700 border-cf-primary-200"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Requeue
                      </Button>
                    ) : selectedInfo.entry.status === "WAITING" ? (
                      <Button
                        size="sm" variant="outline" disabled={isPending}
                        onClick={() => runAction(() => skipEntry(selectedInfo.entry.id))}
                        className="col-span-2 text-cf-amber-700 border-cf-amber-200"
                      >
                        <SkipForward className="h-3.5 w-3.5 mr-1.5" /> Skip
                      </Button>
                    ) : null}
                  </div>

                  {/* Reassign to another doctor */}
                  {otherDoctorOptions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs text-muted-foreground">Reassign to doctor</p>
                      <Select
                        onValueChange={(targetQueueId) =>
                          runAction(() => reassignEntry(selectedInfo.entry.id, targetQueueId))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Move to…" />
                        </SelectTrigger>
                        <SelectContent>
                          {otherDoctorOptions.map((d) => (
                            <SelectItem key={d.queueId} value={d.queueId}>
                              {d.doctorName}
                              {d.waitingCount > 0 ? ` (${d.waitingCount})` : " (free)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2 pt-1 border-t">
                    <Button
                      size="sm" variant="outline" disabled={isPending}
                      onClick={() => runAction(() => notifyQueueDelayed(selectedInfo.queueId, selectedInfo.doctorName))}
                      className="w-full text-slate-600 border-slate-200"
                    >
                      <BellRing className="h-3.5 w-3.5 mr-1.5" /> Notify: Doctor Delayed
                    </Button>
                    {selectedInfo.isPaused ? (
                      <Button
                        size="sm" variant="outline" disabled={isPending}
                        onClick={() => runAction(() => resumeQueue(selectedInfo.queueId))}
                        className="w-full text-cf-green-600 border-cf-green-200"
                      >
                        <PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Resume Queue
                      </Button>
                    ) : (
                      <Button
                        size="sm" variant="outline" disabled={isPending}
                        onClick={() => runAction(() => pauseQueue(selectedInfo.queueId))}
                        className="w-full text-cf-amber-700 border-cf-amber-200"
                      >
                        <PauseCircle className="h-3.5 w-3.5 mr-1.5" /> Pause Queue
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
