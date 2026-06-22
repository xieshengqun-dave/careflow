import { redirect } from "next/navigation";
import { Calendar, Users, Clock, TrendingDown } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/queries/dashboard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/login");

  const today = new Date().toLocaleDateString("en-MY", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.fullName.split(" ")[0];

  let metrics = { todayAppointments: 0, walkInPatients: 0, avgWaitMinutes: null as number | null, noShowRate: 0 };
  if (user.clinicId) {
    try { metrics = await getDashboardMetrics(user.clinicId); } catch { /* no data yet */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{greeting}, {firstName}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{today}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Appointments"
          value={metrics.todayAppointments}
          description="Booked appointments today"
          icon={<Calendar className="h-5 w-5" />}
        />
        <MetricCard
          title="Walk-in Patients"
          value={metrics.walkInPatients}
          description="Queue walk-ins today"
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg. Wait Time"
          value={metrics.avgWaitMinutes !== null ? `${metrics.avgWaitMinutes} min` : "—"}
          description="Join to called, today"
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="No-Show Rate"
          value={`${metrics.noShowRate}%`}
          description="Missed appointments today"
          icon={<TrendingDown className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Navigation</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Use the sidebar to manage your clinic.</p>
            <ul className="space-y-1.5 mt-2">
              {[
                ["Doctors", "Add and manage doctor profiles"],
                ["Schedules", "Set weekly availability per doctor"],
                ["Settings",  "Update clinic information"],
              ].map(([label, desc]) => (
                <li key={label} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <span><strong className="text-foreground">{label}</strong> — {desc}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Session</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Signed in as", user.fullName],
              ["Role", user.role.replace("_", " ")],
              ["Clinic ID", user.clinicId ? user.clinicId.slice(0, 8) + "…" : "—"],
              ["Date (MYT)", new Date().toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium capitalize">{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
