"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addWalkIn } from "@/lib/actions/queue";
import { fetchTreatmentTemplates, type TreatmentTemplate } from "@/lib/actions/treatments";

interface Props {
  clinicId: string;
  queueId?: string;
  doctorOptions?: { queueId: string; doctorName: string; waitingCount?: number }[];
  trigger?: React.ReactNode;
}

export function AddWalkInDialog({ clinicId, queueId, doctorOptions, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [selectedQueueId, setSelectedQueueId] = useState(queueId ?? doctorOptions?.[0]?.queueId ?? "");
  const [templates, setTemplates] = useState<TreatmentTemplate[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchTreatmentTemplates(clinicId).then(setTemplates);
  }, [open, clinicId]);

  const selectedTemplate = templates.find((t) => t.name === treatmentType);

  function reset() {
    setName("");
    setPhone("");
    setTreatmentType("");
    setError(null);
  }

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v) reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addWalkIn({
        queueId: selectedQueueId,
        patientName: name,
        phoneNumber: phone,
        priority: 3,
        treatmentType: treatmentType || undefined,
        estimatedDurationMinutes: selectedTemplate?.durationMinutes,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            + Walk-in
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Add Walk-in Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {doctorOptions && doctorOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select value={selectedQueueId} onValueChange={setSelectedQueueId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {doctorOptions.map((d) => (
                    <SelectItem key={d.queueId} value={d.queueId}>
                      {d.doctorName}
                      {d.waitingCount !== undefined
                        ? d.waitingCount > 0
                          ? ` (${d.waitingCount} waiting)`
                          : " (free)"
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="walkin-name">Patient Name</Label>
            <Input
              id="walkin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="walkin-phone">
              Phone Number{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="walkin-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01X-XXXXXXX"
              type="tel"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Treatment{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
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
              <p className="text-xs text-slate-400 mt-1">
                Estimated duration: <span className="font-medium text-slate-600">~{selectedTemplate.durationMinutes} min</span>
              </p>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !selectedQueueId || !name.trim()}>
              {isPending ? "Adding…" : "Add to Queue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
