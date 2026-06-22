import { cn } from "../lib/utils";
import type { QueueEntryStatus } from "@careflow/shared";

interface QueueBadgeProps {
  status: QueueEntryStatus;
  className?: string;
}

const statusConfig: Record<QueueEntryStatus, { label: string; className: string }> = {
  WAITING: { label: "Waiting", className: "bg-yellow-100 text-yellow-800" },
  CALLED: { label: "Called", className: "bg-blue-100 text-blue-800" },
  IN_CONSULTATION: { label: "In Consultation", className: "bg-green-100 text-green-800" },
  COMPLETED: { label: "Completed", className: "bg-gray-100 text-gray-600" },
  SKIPPED: { label: "Skipped", className: "bg-orange-100 text-orange-800" },
  REMOVED: { label: "Removed", className: "bg-red-100 text-red-800" },
};

export function QueueBadge({ status, className }: QueueBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
