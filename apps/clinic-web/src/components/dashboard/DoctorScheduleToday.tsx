import type { DoctorScheduleTodayEntry } from "@/lib/queries/dashboard";

function initials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = ["bg-sky-600", "bg-emerald-600", "bg-violet-600", "bg-rose-600", "bg-amber-600"];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]!;
}

function formatTime(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${mStr} ${period}`;
}

export function DoctorScheduleToday({ doctors }: { doctors: DoctorScheduleTodayEntry[] }) {
  if (doctors.length === 0) {
    return <p className="text-sm text-muted-foreground">No doctors found for this clinic.</p>;
  }

  return (
    <div className="space-y-3">
      {doctors.map((doc) => (
        <div key={doc.doctorId} className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-full ${avatarColor(doc.doctorName)} flex items-center justify-center text-xs font-semibold text-white shrink-0`}
          >
            {initials(doc.doctorName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{doc.doctorName}</p>
            <p className="text-xs text-muted-foreground truncate">{doc.specialization ?? "General Practitioner"}</p>
          </div>
          {doc.isOpenToday && doc.startTime && doc.endTime ? (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 shrink-0">
              {formatTime(doc.startTime)} – {formatTime(doc.endTime)}
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 shrink-0">
              Off today
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
