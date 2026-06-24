import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCombinedQueue, getTodayQueueData } from "@/lib/queries/queue";
import { QueueManagementView } from "@/components/queue/QueueManagementView";

export default async function QueuePage() {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/login");

  const clinicId = user.clinicId ?? "";
  const [summary, boardData] = await Promise.all([
    getCombinedQueue(clinicId),
    getTodayQueueData(clinicId),
  ]);

  const doctorOptions = boardData.activeQueues.map((q) => ({ queueId: q.queueId, doctorName: q.doctorName }));
  const lastUpdated = new Date().toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" });

  return (
    <QueueManagementView
      summary={summary}
      clinicId={clinicId}
      doctorOptions={doctorOptions}
      lastUpdated={lastUpdated}
    />
  );
}
