"use client";

import { Clock, Users } from "lucide-react";
import type { QueuePageData, QueueEntryData, DoctorQueueData } from "@/lib/queries/queue";

function elapsedMins(from: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 60000));
}

function fmtMins(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const ARRIVAL_BADGE: Record<string, { label: string; cls: string }> = {
  LATE:  { label: "Late",  cls: "bg-red-100 text-red-700" },
  EARLY: { label: "Early", cls: "bg-cf-primary-100 text-cf-primary-700" },
};

function priorityStyle(priority: number): { label: string; bg: string; text: string } {
  if (priority === 1) return { label: "Emergency", bg: "bg-red-50", text: "text-red-700" };
  if (priority === 2) return { label: "Booked", bg: "bg-cf-primary-50", text: "text-cf-primary-700" };
  return { label: "Walk-in", bg: "bg-slate-100", text: "text-slate-600" };
}

const STATUS_ROW: Record<
  string,
  { row: string; badge: string | null; label: string | null }
> = {
  IN_CONSULTATION: { row: "bg-cf-green-50/50", badge: "bg-cf-green-100 text-cf-green-700", label: "In Chair" },
  CALLED:          { row: "bg-cf-primary-50/40", badge: "bg-cf-primary-100 text-cf-primary-700", label: "Called" },
  WAITING:         { row: "", badge: null, label: null },
  SKIPPED:         { row: "bg-cf-amber-50/40", badge: "bg-cf-amber-100 text-cf-amber-700", label: "Skipped" },
};

interface EntryRowProps {
  entry: QueueEntryData;
  position: number;
  isSelected: boolean;
  onClick: () => void;
}

const FALLBACK_ROW = { row: "", badge: null, label: null };

function EntryRow({ entry, position, isSelected, onClick }: EntryRowProps) {
  const sc = STATUS_ROW[entry.status] ?? FALLBACK_ROW;
  const ps = priorityStyle(entry.priority);
  const isEmergency = entry.priority === 1;

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2.5 border-b last:border-0 cursor-pointer transition-colors ${
        isSelected
          ? "bg-cf-primary-50/80 border-l-2 border-l-cf-primary-500"
          : `hover:bg-slate-50 ${sc.row}`
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
            isEmergency
              ? "bg-red-500 text-white"
              : entry.status === "IN_CONSULTATION"
              ? "bg-cf-green-500 text-white"
              : entry.status === "CALLED"
              ? "bg-cf-primary-600 text-white"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {isEmergency ? "!" : position}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <p className="text-xs font-semibold text-slate-900 truncate">{entry.patientName}</p>
            {sc.badge && sc.label && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.badge}`}>
                {sc.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ps.bg} ${ps.text}`}>
              {ps.label}
            </span>
            {entry.treatmentType && (
              <span className="text-[10px] text-slate-500 truncate max-w-[72px]">
                {entry.treatmentType}
              </span>
            )}
            {(() => {
              const ab = entry.arrivalStatus ? ARRIVAL_BADGE[entry.arrivalStatus] : undefined;
              return ab ? (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ab.cls}`}>
                  {ab.label}
                </span>
              ) : null;
            })()}
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5 ml-auto">
              <Clock className="h-2.5 w-2.5" />
              {entry.status === "WAITING" && entry.estimatedWaitMinutes != null
                ? <span className={entry.estimatedWaitMinutes > 30 ? "text-cf-amber-600" : ""}>
                    ~{fmtMins(entry.estimatedWaitMinutes)}
                  </span>
                : entry.status === "IN_CONSULTATION" && entry.calledAt
                ? fmtMins(elapsedMins(entry.calledAt))
                : fmtMins(elapsedMins(entry.joinedAt))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DoctorColumnProps {
  queue: DoctorQueueData;
  selectedId: string | null;
  onSelect: (entryId: string) => void;
  onCallNext: () => void;
  isPending: boolean;
}

function DoctorColumn({ queue, selectedId, onSelect, onCallNext, isPending }: DoctorColumnProps) {
  const allActive = [
    ...(queue.inConsultation ? [queue.inConsultation] : []),
    ...queue.called,
    ...queue.waiting,
  ];

  const waitingCount = queue.waiting.length + queue.called.length;
  const hasEmergency = queue.waiting.some((e) => e.priority === 1);

  const statusLabel = queue.isPaused
    ? "Paused"
    : queue.inConsultation
    ? "With Patient"
    : queue.called.length > 0
    ? "Called"
    : waitingCount > 0
    ? "Active"
    : "Free";

  const statusColor = queue.isPaused
    ? "bg-cf-amber-100 text-cf-amber-700"
    : queue.inConsultation || queue.called.length > 0
    ? "bg-cf-green-100 text-cf-green-700"
    : "bg-slate-100 text-slate-500";

  return (
    <div className="flex flex-col bg-white rounded-[18px] border shadow-sm overflow-hidden flex-1 min-w-0">
      {/* Header */}
      <div className={`px-4 py-3 border-b ${hasEmergency ? "bg-red-50/60" : "bg-slate-50/60"}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-900 truncate">{queue.doctorName}</p>
            {queue.specialization && (
              <p className="text-[11px] text-slate-400 truncate">{queue.specialization}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {waitingCount > 0 && (
              <span
                className={`h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  hasEmergency ? "bg-red-500 text-white" : "bg-cf-primary-700 text-white"
                }`}
              >
                {waitingCount}
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <button
          onClick={onCallNext}
          disabled={isPending || queue.waiting.length === 0 || queue.isPaused}
          className="w-full h-7 text-xs font-semibold rounded-lg bg-cf-primary-700 text-white hover:bg-cf-primary-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Call Next {queue.waiting.length > 0 ? `(${queue.waiting.length} waiting)` : ""}
        </button>
      </div>

      {/* Patient list */}
      <div className="overflow-y-auto flex-1 min-h-0">
        {allActive.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10">
            <Users className="h-7 w-7 text-slate-200" />
            <p className="text-xs text-slate-400">No patients</p>
          </div>
        ) : (
          allActive.map((entry, idx) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              position={idx + 1}
              isSelected={entry.id === selectedId}
              onClick={() => onSelect(entry.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface Props {
  boardData: QueuePageData;
  selectedId: string | null;
  onSelect: (entryId: string) => void;
  onCallNext: (queueId: string) => void;
  isPending: boolean;
}

export function DoctorQueueColumns({ boardData, selectedId, onSelect, onCallNext, isPending }: Props) {
  if (boardData.activeQueues.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center bg-white rounded-[18px] border shadow-sm">
        <Users className="h-10 w-10 text-slate-200" />
        <div>
          <p className="text-slate-500 font-medium">No queues open today</p>
          <p className="text-xs text-slate-400 mt-1">
            Go to Schedules and open a queue for each doctor on duty.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 flex-1 min-h-0">
      {boardData.activeQueues.map((queue) => (
        <DoctorColumn
          key={queue.queueId}
          queue={queue}
          selectedId={selectedId}
          onSelect={onSelect}
          onCallNext={() => onCallNext(queue.queueId)}
          isPending={isPending}
        />
      ))}
    </div>
  );
}
