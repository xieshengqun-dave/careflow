"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDoctor, updateDoctor } from "@/lib/actions/doctors";

const SPECIALTIES = [
  "General Practice (GP)",
  "Internal Medicine",
  "Paediatrics",
  "Obstetrics & Gynaecology",
  "Surgery",
  "Orthopaedics",
  "ENT",
  "Ophthalmology",
  "Dermatology",
  "Psychiatry",
  "Cardiology",
  "Neurology",
  "Oncology",
  "Urology",
  "Other",
];

const DURATIONS = [10, 15, 20, 30, 45, 60];

export interface DoctorFormData {
  id?: string;
  fullName: string;
  email: string;
  specialization: string;
  consultationDuration: number;
}

interface DoctorDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: DoctorFormData;
}

export function DoctorDialog({ open, onClose, initial }: DoctorDialogProps) {
  const isEdit = !!initial?.id;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<DoctorFormData>(
    initial ?? { fullName: "", email: "", specialization: "", consultationDuration: 15 }
  );

  // Reset form when dialog opens with new initial
  const handleOpenChange = (o: boolean) => {
    if (!o) onClose();
    else setForm(initial ?? { fullName: "", email: "", specialization: "", consultationDuration: 15 });
  };

  const set = <K extends keyof DoctorFormData>(k: K, v: DoctorFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fullName.trim()) return setError("Full name is required.");
    if (!isEdit && !form.email.trim()) return setError("Email is required.");
    if (!form.specialization) return setError("Specialization is required.");

    startTransition(async () => {
      const result = isEdit
        ? await updateDoctor(initial!.id!, {
            fullName: form.fullName,
            specialization: form.specialization,
            consultationDuration: form.consultationDuration,
          })
        : await addDoctor(form);
      if (result.error) { setError(result.error); return; }
      onClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Doctor" : "Add Doctor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={form.fullName} onChange={(e) => set("fullName", e.target.value)}
              placeholder="Dr. Ahmad bin Abdullah" required />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                placeholder="doctor@clinic.com" required />
              <p className="text-xs text-muted-foreground">An invitation email will be sent.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Specialization</Label>
            <Select value={form.specialization} onValueChange={(v) => set("specialization", v)}>
              <SelectTrigger><SelectValue placeholder="Select specialization…" /></SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Consultation Duration</Label>
            <Select value={String(form.consultationDuration)} onValueChange={(v) => set("consultationDuration", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Doctor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
