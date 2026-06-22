import type { ClinicAppointment } from "@/lib/queries/appointments";

const STATUS_STYLE: Record<ClinicAppointment["status"], { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  CONFIRMED: { bg: "bg-green-50", text: "text-green-700", label: "Confirmed" },
  CHECKED_IN: { bg: "bg-blue-50", text: "text-blue-700", label: "Checked In" },
  COMPLETED: { bg: "bg-slate-50", text: "text-slate-500", label: "Completed" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-600", label: "Cancelled" },
  NO_SHOW: { bg: "bg-orange-50", text: "text-orange-600", label: "No Show" },
};

function initials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("").toUpperCase();
}

function formatTime(t: string): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${mStr} ${period}`;
}

export function TodaysAppointmentsList({ appointments }: { appointments: ClinicAppointment[] }) {
  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">No appointments scheduled today.</p>;
  }

  return (
    <div className="space-y-1">
      {appointments.slice(0, 5).map((appt) => {
        const s = STATUS_STYLE[appt.status];
        return (
          <div key={appt.id} className="flex items-center gap-3 py-2">
            <div className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {initials(appt.patientName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{appt.patientName}</p>
              <p className="text-xs text-muted-foreground truncate">Dr. {appt.doctorName}</p>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{formatTime(appt.startTime)}</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${s.bg} ${s.text}`}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
