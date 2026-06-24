import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Users, ClipboardCheck, ListChecks, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  getDashboardMetrics,
  getQueueStatusBreakdown,
  getDoctorScheduleToday,
  getRecentActivity,
} from "@/lib/queries/dashboard";
import { getClinicAppointments } from "@/lib/queries/appointments";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QueueOverviewChart } from "@/components/dashboard/QueueOverviewChart";
import { TodaysOverviewChart } from "@/components/dashboard/TodaysOverviewChart";
import { TodaysAppointmentsList } from "@/components/dashboard/TodaysAppointmentsList";
import { DoctorScheduleToday } from "@/components/dashboard/DoctorScheduleToday";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ExportReportButton } from "@/components/dashboard/ExportReportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMYTToday } from "@careflow/shared";

export default async function DashboardPage() {
  const user = await requireRole(["doctor", "receptionist", "clinic_admin", "super_admin"]);
  if (!user) redirect("/login");

  const todayDate = getMYTToday();
  const now = new Date();
  const todayLabel = now.toLocaleDateString("en-MY", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
  const timeLabel = now.toLocaleTimeString("en-MY", {
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur",
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user.fullName.split(" ")[0];

  const clinicId = user.clinicId ?? "";
  let metrics = { todayAppointments: 0, inQueueCount: 0, patientsToday: 0, completedToday: 0, avgWaitMinutes: null as number | null, noShowRate: 0 };
  let queueBreakdown = { waiting: 0, called: 0, inConsultation: 0, completed: 0, cancelled: 0 };
  let todaysAppointments: Awaited<ReturnType<typeof getClinicAppointments>> = [];
  let doctorSchedule: Awaited<ReturnType<typeof getDoctorScheduleToday>> = [];
  let recentActivity: Awaited<ReturnType<typeof getRecentActivity>> = [];

  if (clinicId) {
    try {
      [metrics, queueBreakdown, todaysAppointments, doctorSchedule, recentActivity] = await Promise.all([
        getDashboardMetrics(clinicId),
        getQueueStatusBreakdown(clinicId),
        getClinicAppointments(clinicId, todayDate),
        getDoctorScheduleToday(clinicId),
        getRecentActivity(clinicId),
      ]);
    } catch {
      /* no data yet */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{greeting}, {firstName}</h1>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mt-0.5">
            <span>{todayLabel}</span>
            <span className="text-slate-300">·</span>
            <span>{timeLabel}</span>
            <span className="flex items-center gap-1 text-cf-green-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-cf-green-500" />
              Live
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportReportButton appointments={todaysAppointments} date={todayDate} />
          <Button size="sm" asChild>
            <Link href="/appointments?view=slots">
              <Plus className="h-4 w-4 mr-1.5" />
              New Appointment
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Appointments"
          value={metrics.todayAppointments}
          description="Booked appointments today"
          icon={<Calendar className="h-5 w-5" />}
          tint="primary"
        />
        <MetricCard
          title="In Queue"
          value={metrics.inQueueCount}
          description="Waiting, called, or with doctor"
          icon={<Users className="h-5 w-5" />}
          tint="green"
        />
        <MetricCard
          title="Patients Today"
          value={metrics.patientsToday}
          description="Unique patients seen or scheduled"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tint="purple"
        />
        <MetricCard
          title="Completed Today"
          value={metrics.completedToday}
          description="Consultations finished today"
          icon={<ListChecks className="h-5 w-5" />}
          tint="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Live Queue Overview</CardTitle>
            <Link href="/queue" className="text-sm text-primary hover:underline">Manage Queue</Link>
          </CardHeader>
          <CardContent>
            <QueueOverviewChart breakdown={queueBreakdown} />
            {metrics.avgWaitMinutes !== null && (
              <p className="text-xs text-muted-foreground mt-4">
                Average wait today: <span className="font-medium text-slate-700">{metrics.avgWaitMinutes} min</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today&apos;s Appointments</CardTitle>
            <Link href="/appointments?view=list" className="text-sm text-primary hover:underline">View Calendar</Link>
          </CardHeader>
          <CardContent>
            <TodaysAppointmentsList appointments={todaysAppointments} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Doctor Schedule Today</CardTitle>
            <Link href="/schedules" className="text-sm text-primary hover:underline">View Full Schedule</Link>
          </CardHeader>
          <CardContent>
            <DoctorScheduleToday doctors={doctorSchedule} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <TodaysOverviewChart appointments={todaysAppointments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity items={recentActivity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
