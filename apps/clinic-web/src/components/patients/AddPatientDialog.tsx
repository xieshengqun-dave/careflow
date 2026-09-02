"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPatient } from "@/lib/actions/patients";
import { Plus, CheckCircle2 } from "lucide-react";

export function AddPatientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ name: string; existed: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setPhone("");
    setError("");
    setSuccess(null);
  };

  const submit = () => {
    setError("");
    startTransition(async () => {
      const result = await createPatient({ fullName: name, phone });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.patient) {
        setSuccess({ name: result.patient.fullName, existed: !!result.existed });
        router.refresh();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Patient</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <p className="text-sm font-semibold text-slate-900">
              {success.existed
                ? `${success.name} is already registered`
                : `${success.name} added`}
            </p>
            <p className="text-xs text-slate-500">
              {success.existed
                ? "This phone number belongs to an existing patient — no duplicate was created."
                : "They can log in to the CareFlow app with this phone number."}
            </p>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="patient-name">Full Name</Label>
              <Input
                id="patient-name"
                placeholder="Ali Hassan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patient-phone">Phone Number</Label>
              <Input
                id="patient-phone"
                type="tel"
                placeholder="+60123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
              <p className="text-xs text-slate-400">
                If this number is already registered, the existing patient is used.
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              onClick={submit}
              disabled={isPending || !name.trim() || !phone.trim()}
              className="w-full"
            >
              {isPending ? "Adding…" : "Add Patient"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
