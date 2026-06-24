"use client";

import { PieChart, Pie, Cell } from "recharts";
import type { QueueStatusBreakdown } from "@/lib/queries/dashboard";

const SEGMENTS: Array<{ key: keyof QueueStatusBreakdown; label: string; color: string }> = [
  { key: "waiting", label: "Waiting", color: "#F59E0B" },
  { key: "called", label: "Called", color: "#2563EB" },
  { key: "inConsultation", label: "With Doctor", color: "#16A34A" },
  { key: "completed", label: "Completed", color: "#94A3B8" },
  { key: "cancelled", label: "Cancelled", color: "#EF4444" },
];

export function QueueOverviewChart({ breakdown }: { breakdown: QueueStatusBreakdown }) {
  const total =
    breakdown.waiting + breakdown.called + breakdown.inConsultation + breakdown.completed + breakdown.cancelled;

  const data = SEGMENTS.map((s) => ({ ...s, value: breakdown[s.key] })).filter((s) => s.value > 0);

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-[140px] w-[140px] shrink-0">
        {total === 0 ? (
          <div className="absolute inset-0 rounded-full border-8 border-slate-100" />
        ) : (
          <PieChart width={140} height={140}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={48}
              outerRadius={68}
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {data.map((seg) => (
                <Cell key={seg.key} fill={seg.color} />
              ))}
            </Pie>
          </PieChart>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-[11px] text-muted-foreground">Patients</span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="font-semibold text-slate-900">{breakdown[s.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
