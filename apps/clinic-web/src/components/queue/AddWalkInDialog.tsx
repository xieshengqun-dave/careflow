"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addWalkIn } from "@/lib/actions/queue";

interface Props {
  queueId?: string;
  doctorOptions?: { queueId: string; doctorName: string }[];
  trigger?: React.ReactNode;
}

export function AddWalkInDialog({ queueId, doctorOptions, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [priority, setPriority] = useState<1 | 2 | 3>(3);
  const [selectedQueueId, setSelectedQueueId] = useState(queueId ?? doctorOptions?.[0]?.queueId ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addWalkIn({ queueId: selectedQueueId, patientName: name, phoneNumber: phone, priority });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setName("");
        setPhone("");
        setPriority(3);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">+ Walk-in</Button>}
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {doctorOptions.map((d) => (
                    <SelectItem key={d.queueId} value={d.queueId}>{d.doctorName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Patient Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01X-XXXXXXX" required />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex gap-2">
              {([
                { value: 1, label: "Emergency", color: "border-red-400 text-red-700" },
                { value: 2, label: "Appointment", color: "border-blue-400 text-blue-700" },
                { value: 3, label: "Walk-in", color: "border-gray-300 text-gray-700" },
              ] as const).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 rounded border py-1.5 text-xs font-medium transition-colors ${
                    priority === p.value ? `${p.color} bg-muted` : "border-input text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending || !selectedQueueId}>
              {isPending ? "Adding…" : "Add to Queue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
