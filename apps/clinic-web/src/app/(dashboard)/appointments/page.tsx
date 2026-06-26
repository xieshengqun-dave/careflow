import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getMYTToday } from "@careflow/shared";
import { requireRole } from "@/lib/auth";
import { getDoctorSlotsForDate } from "@/lib/queries/slots";
import { getClinicAppointments } from "@/lib/queries/appointments";
import { ScheduleBoard } from "@/components/scheduling/ScheduleBoard";
import { AppointmentList } from "@/components/scheduling/AppointmentList";
import { DateNav } from "@/components/scheduling/DateNav";
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
  const activeView = view === "slots" ? "slots" : "list";

  const [doctors, appointments] = await Promise.all([
    getDoctorSlotsForDate(user.clinicId ?? "", selectedDate),
    getClinicAppointments(user.clinicId ?? "", selectedDate),
  ]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track all clinic appointments
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* List / Slots toggle */}
          <div className="flex gap-0.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <a
              href={`/appointments?date=${selectedDate}&view=list`}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeView === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              List
            </a>
            <a
              href={`/appointments?date=${selectedDate}&view=slots`}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeView === "slots"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Slots
            </a>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Date navigation — list view only; ScheduleBoard has its own DateNav */}
      {activeView === "list" && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <DateNav selectedDate={selectedDate} />
          <span className="text-sm text-slate-500">
            {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {activeView === "slots" ? (
        <ScheduleBoard doctors={doctors} date={selectedDate} />
      ) : (
        <AppointmentList appointments={appointments} />
      )}
    </div>
  );
}
