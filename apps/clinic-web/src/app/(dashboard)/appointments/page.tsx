import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getMYTToday, formatMYTDate } from "@careflow/shared";
import { requireRole } from "@/lib/auth";
import { getDoctorSlotsForDate } from "@/lib/queries/slots";
import { getClinicAppointments } from "@/lib/queries/appointments";
import { ScheduleBoard } from "@/components/scheduling/ScheduleBoard";
import { AppointmentList } from "@/components/scheduling/AppointmentList";
import { Button } from "@/components/ui/button";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/login");

  const { date, view } = await searchParams;
  const selectedDate = date ?? getMYTToday();
  const activeView = view === "list" ? "list" : "slots";
  const dateLabel = formatMYTDate(selectedDate, "EEEE, d MMMM yyyy");

  const [doctors, appointments] = await Promise.all([
    getDoctorSlotsForDate(user.clinicId ?? "", selectedDate),
    getClinicAppointments(user.clinicId ?? "", selectedDate),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {dateLabel} · {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/appointments?date=${selectedDate}&view=slots`}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              activeView === "slots"
                ? "bg-cf-primary-700 text-white border-cf-primary-700"
                : "text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Slot View
          </a>
          <a
            href={`/appointments?date=${selectedDate}&view=list`}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              activeView === "list"
                ? "bg-cf-primary-700 text-white border-cf-primary-700"
                : "text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            List View
          </a>
          <Button size="sm" asChild>
            <Link href="/appointments?view=slots">
              <Plus className="h-4 w-4 mr-1.5" />
              New Appointment
            </Link>
          </Button>
        </div>
      </div>

      {activeView === "slots" ? (
        <ScheduleBoard doctors={doctors} date={selectedDate} />
      ) : (
        <AppointmentList appointments={appointments} />
      )}
    </div>
  );
}
