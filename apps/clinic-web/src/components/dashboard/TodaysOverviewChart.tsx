"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import type { ClinicAppointment } from "@/lib/queries/appointments";

const STATUS_COLOR: Record<string, string> = {
  Pending: "#F59E0B",
  Confirmed: "#16A34A",
  "Checked In": "#2563EB",
  Completed: "#94A3B8",
  "No Show": "#B45309",
};

const STATUS_LABEL: Record<ClinicAppointment["status"], string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export function TodaysOverviewChart({ appointments }: { appointments: ClinicAppointment[] }) {
  const counts: Record<string, number> = {};
  for (const a of appointments) {
    const label = STATUS_LABEL[a.status];
    if (label === "Cancelled") continue;
    counts[label] = (counts[label] ?? 0) + 1;
  }

  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No appointment data for today yet.</p>;
  }

  return (
    <BarChart width={260} height={180} data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
        {data.map((d) => (
          <Cell key={d.name} fill={STATUS_COLOR[d.name] ?? "#2563EB"} />
        ))}
      </Bar>
    </BarChart>
  );
}
