import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCombinedQueue, getTodayQueueData } from "@/lib/queries/queue";
import { getClinicChairs } from "@/lib/queries/chairs";
import { QueueManagementView } from "@/components/queue/QueueManagementView";

export default async function QueuePage() {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/unauthorized");

  const clinicId = user.clinicId ?? "";
  const [summary, boardData, chairs] = await Promise.all([
    getCombinedQueue(clinicId),
    getTodayQueueData(clinicId),
    getClinicChairs(clinicId),
  ]);

  const lastUpdated = new Date().toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" });

  return (
    <QueueManagementView
      summary={summary}
      boardData={boardData}
      clinicId={clinicId}
      lastUpdated={lastUpdated}
      chairs={chairs}
    />
  );
}
