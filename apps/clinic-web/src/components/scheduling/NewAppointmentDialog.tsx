"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createStaffAppointment,
  lookupPatientByPhone,
  fetchSlotsForDialog,
  fetchClinicDoctors,
} from "@/lib/actions/appointments";
import { fetchTreatmentTemplates, type TreatmentTemplate } from "@/lib/actions/treatments";
import { createPatient } from "@/lib/actions/patients";
import { getMYTToday } from "@careflow/shared";
import { Plus, Search, CheckCircle2, Clock, User, UserPlus } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  specialization: string | null;
}

interface Slot {
  startTime: string;
  endTime: string;
  available: boolean;
}

// ─── Step components ────────────────────────────────────────────────────────────

function PatientStep({
  onFound,
}: {
  onFound: (id: string, name: string, phone: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  const lookup = () => {
    if (!phone.trim()) { setError("Enter a phone number."); return; }
    setError("");
    setNotFound(false);
    startTransition(async () => {
      const result = await lookupPatientByPhone(phone.trim());
      if (!result) {
        setNotFound(true);
      } else {
        onFound(result.id, result.fullName, phone.trim());
      }
    });
  };

  const register = () => {
    if (!newName.trim()) { setError("Enter the patient's name."); return; }
    setError("");
    startTransition(async () => {
      const result = await createPatient({ fullName: newName.trim(), phone: phone.trim() });
      if (result.error || !result.patient) {
        setError(result.error ?? "Failed to register patient.");
      } else {
        onFound(result.patient.id, result.patient.fullName, phone.trim());
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="phone">Patient Phone Number</Label>
        <div className="flex gap-2">
          <Input
            id="phone"
            type="tel"
            placeholder="+60123456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") lookup(); }}
            className="flex-1"
          />
          <Button type="button" onClick={lookup} disabled={isPending} className="shrink-0">
            <Search className="h-4 w-4 mr-1.5" />
            {isPending ? "Looking up…" : "Find"}
          </Button>
        </div>
      </div>
      {notFound && (
        <div className="rounded-lg border border-cf-primary-100 bg-cf-primary-50/50 p-3 space-y-2.5">
          <p className="text-xs text-slate-600">
            No patient with this number yet — register them now:
          </p>
          <Input
            placeholder="Patient full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") register(); }}
          />
          <Button
            type="button"
            onClick={register}
            disabled={isPending || !newName.trim()}
            className="w-full"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            {isPending ? "Registering…" : "Register & Continue"}
          </Button>
        </div>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-slate-400">
        Existing patients are found by phone number; new ones can be registered on the spot.
      </p>
    </div>
  );
}

function DoctorStep({
  doctors,
  onSelect,
}: {
  doctors: Doctor[];
  onSelect: (doc: Doctor) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Select Doctor</Label>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {doctors.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => onSelect(doc)}
            className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-cf-primary-300 hover:bg-cf-primary-50/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-cf-primary-100 text-cf-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
              {doc.name.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("")}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{doc.name}</p>
              {doc.specialization && (
                <p className="text-xs text-slate-500 truncate">{doc.specialization}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SlotStep({
  slots,
  date,
  onSelectDate,
  onSelectSlot,
}: {
  slots: Slot[];
  date: string;
  onSelectDate: (d: string) => void;
  onSelectSlot: (start: string, end: string) => void;
}) {
  function fmt(t: string) {
    const [h, m] = t.split(":");
    const hour = Number(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  }

  const available = slots.filter((s) => s.available);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          min={getMYTToday()}
          onChange={(e) => onSelectDate(e.target.value)}
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
        {available.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            No available slots for this date.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
            {available.map((s) => (
              <button
                key={s.startTime}
                type="button"
                onClick={() => onSelectSlot(s.startTime, s.endTime)}
                className="flex items-center justify-center gap-1 py-2.5 rounded-lg border border-slate-200 hover:border-cf-primary-400 hover:bg-cf-primary-50 text-sm font-medium text-slate-700 hover:text-cf-primary-700 transition-colors"
              >
                <Clock className="h-3 w-3 shrink-0" />
                {fmt(s.startTime)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main dialog ────────────────────────────────────────────────────────────────

interface NewAppointmentDialogProps {
  clinicId: string;
}

export function NewAppointmentDialog({ clinicId }: NewAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"patient" | "doctor" | "slot" | "notes" | "done">("patient");

  const [, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState(getMYTToday());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [templates, setTemplates] = useState<TreatmentTemplate[]>([]);
  const [treatmentType, setTreatmentType] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Load doctors + templates when dialog opens
  useEffect(() => {
    if (!open) return;
    fetchClinicDoctors(clinicId).then(setDoctors);
    fetchTreatmentTemplates(clinicId).then(setTemplates);
  }, [open, clinicId]);

  // Load slots when doctor + date changes
  useEffect(() => {
    if (!doctor || !date) return;
    fetchSlotsForDialog(clinicId, doctor.id, date).then(setSlots);
  }, [doctor, date, clinicId]);

  const selectedTemplate = templates.find((t) => t.name === treatmentType);

  function reset() {
    setStep("patient");
    setPatientId(""); setPatientName(""); setPatientPhone("");
    setDoctor(null); setDate(getMYTToday()); setStartTime(""); setEndTime("");
    setNotes(""); setTreatmentType(""); setError("");
  }

  function handleClose(v: boolean) {
    setOpen(v);
    if (!v) reset();
  }

  function handlePatientFound(id: string, name: string, phone: string) {
    setPatientId(id); setPatientName(name); setPatientPhone(phone);
    setStep("doctor");
  }

  function handleDoctorSelect(doc: Doctor) {
    setDoctor(doc);
    setStep("slot");
  }

  function handleSlotSelect(start: string, end: string) {
    setStartTime(start); setEndTime(end);
    setStep("notes");
  }

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      const result = await createStaffAppointment({
        patientPhone,
        doctorId: doctor!.id,
        clinicId,
        date,
        startTime,
        endTime,
        notes: notes.trim() || undefined,
        treatmentType: treatmentType || undefined,
      });
      if (result.error) { setError(result.error); return; }
      setStep("done");
    });
  }

  function fmt(t: string) {
    const [h, m] = t.split(":");
    const hour = Number(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
  }

  const STEP_TITLES: Record<string, string> = {
    patient: "Find Patient",
    doctor:  "Select Doctor",
    slot:    "Pick Time Slot",
    notes:   "Confirm & Notes",
    done:    "Appointment Booked",
  };

  const stepList = ["patient", "doctor", "slot", "notes"] as const;
  const currentIdx = stepList.indexOf(step as typeof stepList[number]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Appointment
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{STEP_TITLES[step]}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        {step !== "done" && (
          <div className="flex gap-1.5 mb-2">
            {stepList.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentIdx ? "bg-cf-primary-600" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        )}

        {/* Summary bar (when past patient step) */}
        {step !== "patient" && step !== "done" && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {patientName || patientPhone}
            </span>
            {doctor && (
              <span>· {doctor.name}</span>
            )}
            {startTime && (
              <span>· {fmt(startTime)}, {date}</span>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {step === "patient" && <PatientStep onFound={handlePatientFound} />}

        {step === "doctor" && (
          <DoctorStep doctors={doctors} onSelect={handleDoctorSelect} />
        )}

        {step === "slot" && (
          <SlotStep
            slots={slots}
            date={date}
            onSelectDate={(d) => { setDate(d); setSlots([]); }}
            onSelectSlot={handleSlotSelect}
          />
        )}

        {step === "notes" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-3 space-y-1 text-sm">
              <p className="font-semibold text-slate-900">{patientName || patientPhone}</p>
              <p className="text-slate-500">{doctor?.name} · {doctor?.specialization ?? "GP"}</p>
              <p className="text-slate-500">{fmt(startTime)} – {fmt(endTime)} · {date}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Treatment Type <span className="text-slate-400 font-normal">(optional)</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setTreatmentType(treatmentType === t.name ? "" : t.name)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      treatmentType === t.name
                        ? "bg-cf-primary-700 text-white border-cf-primary-700"
                        : "border-slate-200 text-slate-600 hover:border-cf-primary-300 hover:text-cf-primary-700"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <p className="text-xs text-slate-400">
                  Estimated duration: <span className="font-medium text-slate-600">~{selectedTemplate.durationMinutes} min</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Reason for visit, special requirements…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("slot")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
                {isPending ? "Booking…" : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-14 w-14 rounded-full bg-cf-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-cf-green-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900">Appointment confirmed</p>
              <p className="text-sm text-slate-500 mt-1">
                {patientName || patientPhone} · {doctor?.name}
              </p>
              <p className="text-sm text-slate-500">{fmt(startTime)}, {date}</p>
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
