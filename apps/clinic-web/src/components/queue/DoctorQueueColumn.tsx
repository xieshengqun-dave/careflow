"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { DoctorQueueData, DoctorWithoutQueue } from "@/lib/queries/queue";
import { openQueue, callNext } from "@/lib/actions/queue";
import { QueueEntryCard } from "./QueueEntryCard";
import { AddWalkInDialog } from "./AddWalkInDialog";

export function ClosedQueueColumn({ doctor }: { doctor: DoctorWithoutQueue }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-muted/30 p-4 min-w-[240px]">
      <div>
        <p className="font-semibold text-sm">{doctor.doctorName}</p>
        {doctor.specialization && (
          <p className="text-xs text-muted-foreground">{doctor.specialization}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">No queue open today.</p>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(() => { void openQueue(doctor.doctorId); })}
      >
        {isPending ? "Opening…" : "Open Queue"}
      </Button>
    </div>
  );
}

export function DoctorQueueColumn({ queue }: { queue: DoctorQueueData }) {
  const [isPending, startTransition] = useTransition();
  const totalActive = queue.waiting.length + queue.called.length + (queue.inConsultation ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 min-w-[260px] max-w-[300px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{queue.doctorName}</p>
          {queue.specialization && (
            <p className="text-xs text-muted-foreground">{queue.specialization}</p>
          )}
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {queue.waiting.length} waiting
        </Badge>
      </div>

      <Separator />

      {/* In consultation */}
      {queue.inConsultation ? (
        <div>
          <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-1.5">
            In Consultation
          </p>
          <QueueEntryCard entry={queue.inConsultation} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No one in consultation</p>
      )}

      {/* Called */}
      {queue.called.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
            Called — Next Up
          </p>
          <div className="flex flex-col gap-2">
            {queue.called.map((e) => (
              <QueueEntryCard key={e.id} entry={e} />
            ))}
          </div>
        </div>
      )}

      {/* Waiting list */}
      {queue.waiting.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Waiting ({queue.waiting.length})
          </p>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-0.5">
            {queue.waiting.map((e) => (
              <QueueEntryCard key={e.id} entry={e} compact />
            ))}
          </div>
        </div>
      )}

      {totalActive === 0 && (
        <p className="text-xs text-muted-foreground italic text-center py-2">Queue is empty</p>
      )}

      {/* Footer actions */}
      <Separator />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          disabled={isPending || queue.waiting.length === 0}
          onClick={() => startTransition(() => { void callNext(queue.queueId); })}
        >
          {isPending ? "Calling…" : "Call Next"}
        </Button>
        <AddWalkInDialog queueId={queue.queueId} />
      </div>
    </div>
  );
}
