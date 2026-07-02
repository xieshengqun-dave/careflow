import { Building2, Stethoscope, Users, CalendarDays, ListOrdered } from "lucide-react";
import { getPlatformOverview, getAllClinics } from "@/lib/queries/platform";
import { getMYTToday } from "@careflow/shared";

export default async function PlatformOverviewPage() {
  const [metrics, clinics] = await Promise.all([getPlatformOverview(), getAllClinics()]);

  const todayLabel = new Date().toLocaleDateString("en-MY", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });

  const METRIC_CARDS = [
    { icon: Building2,    label: "Total Clinics",        value: metrics.totalClinics,     color: "text-cf-primary-700", bg: "bg-cf-primary-50" },
    { icon: Stethoscope,  label: "Total Doctors",        value: metrics.totalDoctors,     color: "text-cf-green-600",   bg: "bg-cf-green-50" },
    { icon: Users,        label: "Registered Patients",  value: metrics.totalPatients,    color: "text-cf-amber-700",   bg: "bg-cf-amber-50" },
    { icon: CalendarDays, label: "Appointments Today",   value: metrics.appointmentsToday, color: "text-slate-600",     bg: "bg-slate-100" },
    { icon: ListOrdered,  label: "Active Queues",        value: metrics.activeQueues,     color: "text-cf-primary-700", bg: "bg-cf-primary-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">{todayLabel}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {METRIC_CARDS.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-[18px] border p-5 flex items-start gap-3 shadow-sm">
            <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-4.5 w-4.5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
              <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* All clinics table */}
      <div className="bg-white rounded-[18px] border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50/60 flex items-center justify-between">
          <h2 className="font-semibold text-base text-slate-900">All Clinics</h2>
          <span className="text-xs text-slate-400">{clinics.length} clinic{clinics.length !== 1 ? "s" : ""}</span>
        </div>

        {clinics.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Building2 className="h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-400">No clinics found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b bg-[#F8FAFC]">
                <th className="px-5 py-2.5 font-bold uppercase tracking-wide">Clinic</th>
                <th className="px-5 py-2.5 font-bold uppercase tracking-wide">Location</th>
                <th className="px-5 py-2.5 font-bold uppercase tracking-wide text-center">Doctors</th>
                <th className="px-5 py-2.5 font-bold uppercase tracking-wide text-center">Appts Today</th>
                <th className="px-5 py-2.5 font-bold uppercase tracking-wide text-center">In Queue</th>
                <th className="px-5 py-2.5 font-bold uppercase tracking-wide text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic) => (
                <tr key={clinic.id} className="border-b last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-900">{clinic.name}</p>
                    {clinic.email && <p className="text-xs text-slate-400">{clinic.email}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {clinic.city}{clinic.state ? `, ${clinic.state}` : ""}
                  </td>
                  <td className="px-5 py-3.5 text-center font-semibold text-slate-700">{clinic.doctorCount}</td>
                  <td className="px-5 py-3.5 text-center font-semibold text-slate-700">{clinic.appointmentsToday}</td>
                  <td className="px-5 py-3.5 text-center">
                    {clinic.inQueueNow > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cf-primary-50 text-cf-primary-700 text-xs font-semibold">
                        {clinic.inQueueNow}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                      clinic.isActive
                        ? "bg-cf-green-50 text-cf-green-600"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${clinic.isActive ? "bg-cf-green-500" : "bg-slate-400"}`} />
                      {clinic.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
