"use client";

import { useTransition } from "react";
import { updateChairStatus } from "@/lib/actions/chairs";
import type { ChairData } from "@/lib/queries/chairs";
import type { QueuePageData } from "@/lib/queries/queue";

const FALLBACK_CFG = { label: "Unknown", bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" };

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  AVAILABLE:      { label: "Available",      bg: "bg-cf-green-50",    text: "text-cf-green-700",   dot: "bg-cf-green-400" },
  OCCUPIED:       { label: "Occupied",       bg: "bg-cf-primary-50",  text: "text-cf-primary-700", dot: "bg-cf-primary-500" },
  CLEANING:       { label: "Cleaning",       bg: "bg-cf-amber-50",    text: "text-cf-amber-700",   dot: "bg-cf-amber-400" },
  RESERVED:       { label: "Reserved",       bg: "bg-purple-50",      text: "text-purple-700",     dot: "bg-purple-400" },
  OUT_OF_SERVICE: { label: "Out of Service", bg: "bg-slate-100",      text: "text-slate-500",      dot: "bg-slate-400" },
};

interface Props {
  chairs: ChairData[];
  boardData: QueuePageData;
}

export function ChairStatusGrid({ chairs, boardData }: Props) {
  const [isPending, startTransition] = useTransition();

  // Map chair_id → patient name from active IN_CONSULTATION entries
  const occupiedBy = new Map<string, string>();
  for (const q of boardData.activeQueues) {
    if (q.inConsultation?.chairId) {
      occupiedBy.set(q.inConsultation.chairId, q.inConsultation.patientName);
    }
    for (const e of q.called) {
      if (e.chairId) occupiedBy.set(e.chairId, e.patientName);
    }
  }

  function markClean(chairId: string) {
    startTransition(async () => {
      await updateChairStatus(chairId, "AVAILABLE");
    });
  }

  if (chairs.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Chairs
      </p>
      <div className="flex flex-wrap gap-2">
        {chairs.map((chair) => {
          const cfg = STATUS_CONFIG[chair.status] ?? FALLBACK_CFG;
          const patient = occupiedBy.get(chair.id);

          return (
            <div
              key={chair.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium min-w-0 ${cfg.bg} ${cfg.text}`}
              style={{ borderColor: "transparent" }}
            >
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className="font-semibold">{chair.name}</span>
              <span className="opacity-60">·</span>
              <span className="opacity-80">{cfg.label}</span>
              {patient && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="opacity-70 max-w-[100px] truncate">{patient}</span>
                </>
              )}
              {chair.status === "CLEANING" && (
                <button
                  onClick={() => markClean(chair.id)}
                  disabled={isPending}
                  className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cf-amber-100 text-cf-amber-800 hover:bg-cf-amber-200 transition-colors disabled:opacity-50"
                >
                  Mark Clean
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
