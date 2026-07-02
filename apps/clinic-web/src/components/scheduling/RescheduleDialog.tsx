"use client";

import { useState, useTransition, useEffect } from "react";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchSlotsForDialog } from "@/lib/actions/appointments";
import { rescheduleAppointment } from "@/lib/actions/appointments";
import { getMYTToday } from "@careflow/shared";
import type { ClinicAppointment } from "@/lib/queries/appointments";

interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

function fmt(t: string): string {
  const [h, m] = t.split(":");
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

interface Props {
  appointment: ClinicAppointment;
  clinicId: string;
}

export function RescheduleDialog({ appointment, clinicId }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedStart, setSelectedStart] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    // Default to tomorrow
    const today = getMYTToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().slice(0, 10));
    setSlots([]);
    setSelectedStart("");
    setDone(false);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!date || !open) return;
    setLoadingSlots(true);
    setSelectedStart("");
    fetchSlotsForDialog(clinicId, appointment.doctorId, date)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [date, open, clinicId, appointment.doctorId]);

  function handleConfirm() {
    if (!selectedStart) return;
    setError("");
    startTransition(async () => {
      const result = await rescheduleAppointment(appointment.id, date, selectedStart);
      if (result.error) {
        setError(result.error);
      } else {
        setDone(true);
      }
    });
  }

  const available = slots.filter((s) => s.available);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-xs px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
          Reschedule
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> Reschedule Appointment
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-12 w-12 rounded-full bg-cf-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-cf-green-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900">Appointment rescheduled</p>
              <p className="text-sm text-slate-500 mt-1">
                {appointment.patientName} · {appointment.doctorName}
              </p>
              <p className="text-sm text-slate-500">
                {fmt(selectedStart)}, {date}
              </p>
            </div>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Current appointment summary */}
            <div className="rounded-lg bg-slate-50 border px-3 py-2.5 text-xs text-slate-500 space-y-0.5">
              <p className="font-semibold text-slate-700">{appointment.patientName}</p>
              <p>
                {appointment.doctorName} · Currently {fmt(appointment.startTime)}, {appointment.date}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rdate">New Date</Label>
              <Input
                id="rdate"
                type="date"
                value={date}
                min={getMYTToday()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Available Slots
                {available.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {available.length} open
                  </span>
                )}
              </Label>
              {loadingSlots ? (
                <p className="text-xs text-slate-400 py-4 text-center">Loading slots…</p>
              ) : available.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">
                  No available slots for this date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                  {available.map((s) => (
                    <button
                      key={s.startTime}
                      type="button"
                      onClick={() => setSelectedStart(s.startTime)}
                      className={`flex items-center justify-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        selectedStart === s.startTime
                          ? "border-cf-primary-500 bg-cf-primary-50 text-cf-primary-700"
                          : "border-slate-200 text-slate-600 hover:border-cf-primary-300 hover:bg-cf-primary-50/50"
                      }`}
                    >
                      <Clock className="h-3 w-3 shrink-0" />
                      {fmt(s.startTime)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending || !selectedStart}
                className="flex-1"
              >
                {isPending ? "Rescheduling…" : "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
