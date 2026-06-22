"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { QueuePageData } from "@/lib/queries/queue";
import { DoctorQueueColumn, ClosedQueueColumn } from "./DoctorQueueColumn";

interface Props {
  data: QueuePageData;
  clinicId: string;
}

export function QueueBoard({ data, clinicId }: Props) {
  const router = useRouter();

  // Supabase Realtime — refresh server data on any queue change
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`clinic-queue-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue_entries" }, () => {
        router.refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "queues" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, router]);

  const isEmpty = data.activeQueues.length === 0 && data.doctorsWithoutQueue.length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm">No doctors found for this clinic.</p>
        <p className="text-xs mt-1">Add doctors on the Doctors page first.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {data.activeQueues.map((queue) => (
        <DoctorQueueColumn key={queue.queueId} queue={queue} />
      ))}
      {data.doctorsWithoutQueue.map((doctor) => (
        <ClosedQueueColumn key={doctor.doctorId} doctor={doctor} />
      ))}
    </div>
  );
}
