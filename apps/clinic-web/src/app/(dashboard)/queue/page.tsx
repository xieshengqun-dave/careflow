import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getTodayQueueData } from "@/lib/queries/queue";
import { QueueBoard } from "@/components/queue/QueueBoard";
import { getMYTToday, formatMYTDate } from "@careflow/shared";

export default async function QueuePage() {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/login");

  const data = await getTodayQueueData(user.clinicId ?? "");
  const today = formatMYTDate(getMYTToday(), "EEEE, d MMMM yyyy");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Queue Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{today}</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>{data.activeQueues.length} queue{data.activeQueues.length !== 1 ? "s" : ""} open</p>
          <p>
            {data.activeQueues.reduce((sum, q) => sum + q.waiting.length, 0)} patients waiting
          </p>
        </div>
      </div>

      <QueueBoard data={data} clinicId={user.clinicId ?? ""} />
    </div>
  );
}
