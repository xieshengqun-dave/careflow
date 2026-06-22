"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClinicAppointment } from "@/lib/queries/appointments";

function toCsv(appointments: ClinicAppointment[]): string {
  const header = ["Time", "Patient", "Phone", "Doctor", "Specialization", "Status", "Notes"];
  const rows = appointments.map((a) => [
    a.startTime,
    a.patientName,
    a.patientPhone ?? "",
    a.doctorName,
    a.specialization ?? "",
    a.status,
    (a.notes ?? "").replace(/[\r\n,]/g, " "),
  ]);
  return [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
}

export function ExportReportButton({
  appointments,
  date,
}: {
  appointments: ClinicAppointment[];
  date: string;
}) {
  function handleExport() {
    const csv = toCsv(appointments);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `careflow-appointments-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-1.5" />
      Export Report
    </Button>
  );
}
