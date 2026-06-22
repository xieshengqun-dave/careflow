import type { RecentActivityItem } from "@/lib/queries/dashboard";

const TONE_DOT: Record<RecentActivityItem["tone"], string> = {
  success: "bg-emerald-500",
  info: "bg-sky-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet today.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${TONE_DOT[item.tone]}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">{item.message}</span> {item.detail}
            </p>
            <p className="text-xs text-muted-foreground">{relativeTime(item.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
