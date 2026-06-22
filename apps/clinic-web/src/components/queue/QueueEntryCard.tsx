"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QueueEntryData } from "@/lib/queries/queue";
import {
  callSpecific,
  startConsultation,
  completeConsultation,
  skipEntry,
  removeEntry,
} from "@/lib/actions/queue";

const PRIORITY_BADGE: Record<number, { label: string; className: string }> = {
  1: { label: "Emergency", className: "bg-red-100 text-red-800 border-red-300" },
  2: { label: "Appointment", className: "bg-blue-100 text-blue-800 border-blue-300" },
  3: { label: "Walk-in", className: "bg-gray-100 text-gray-700 border-gray-300" },
};

const STATUS_BORDER: Record<string, string> = {
  IN_CONSULTATION: "border-l-4 border-l-green-500 bg-green-50",
  CALLED: "border-l-4 border-l-amber-400 bg-amber-50",
  WAITING: "bg-white",
};

function waitMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

interface Props {
  entry: QueueEntryData;
  compact?: boolean;
}

export function QueueEntryCard({ entry, compact = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const priority = PRIORITY_BADGE[entry.priority as 1 | 2 | 3] ?? PRIORITY_BADGE[3]!;
  const borderClass = STATUS_BORDER[entry.status] ?? "bg-white";
  const wait = waitMinutes(entry.status === "IN_CONSULTATION" && entry.calledAt ? entry.calledAt : entry.joinedAt);

  function act(fn: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className={`rounded-lg border p-3 ${borderClass} ${isPending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-base font-bold text-foreground">#{entry.queueNumber}</span>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priority.className}`}>
          {priority.label}
        </Badge>
      </div>

      {!compact && (
        <p className="text-[11px] text-muted-foreground mb-2">
          ⏱ {wait} min {entry.status === "IN_CONSULTATION" ? "in consultation" : "waiting"}
        </p>
      )}

      {error && <p className="text-[10px] text-red-600 mb-2">{error}</p>}

      <div className="flex flex-wrap gap-1">
        {entry.status === "WAITING" && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => act(() => callSpecific(entry.id))}>
              Call
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-red-600 hover:text-red-700" onClick={() => act(() => removeEntry(entry.id))}>
              Remove
            </Button>
          </>
        )}
        {entry.status === "CALLED" && (
          <>
            <Button size="sm" className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700" onClick={() => act(() => startConsultation(entry.id))}>
              Start
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => act(() => skipEntry(entry.id))}>
              Skip
            </Button>
          </>
        )}
        {entry.status === "IN_CONSULTATION" && (
          <>
            <Button size="sm" className="h-7 text-xs px-2" onClick={() => act(() => completeConsultation(entry.id))}>
              ✓ Complete
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-red-600 hover:text-red-700" onClick={() => act(() => skipEntry(entry.id))}>
              No-show
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
