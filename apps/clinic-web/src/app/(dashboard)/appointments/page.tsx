import { redirect } from "next/navigation";
import { getMYTToday } from "@careflow/shared";
import { requireRole } from "@/lib/auth";
import { getDoctorSlotsForDate } from "@/lib/queries/slots";
import { getClinicAppointments } from "@/lib/queries/appointments";
import { ScheduleBoard } from "@/components/scheduling/ScheduleBoard";
import { AppointmentList } from "@/components/scheduling/AppointmentList";

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

  const [doctors, appointments] = await Promise.all([
    getDoctorSlotsForDate(user.clinicId ?? "", selectedDate),
    getClinicAppointments(user.clinicId ?? "", selectedDate),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {selectedDate} · {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/appointments?date=${selectedDate}&view=slots`}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              activeView === "slots"
                ? "bg-sky-600 text-white border-sky-600"
                : "text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Slot View
          </a>
          <a
            href={`/appointments?date=${selectedDate}&view=list`}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              activeView === "list"
                ? "bg-sky-600 text-white border-sky-600"
                : "text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            List View
          </a>
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
