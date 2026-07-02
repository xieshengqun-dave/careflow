"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addEmergency } from "@/lib/actions/queue";

interface Props {
  doctorOptions: { queueId: string; doctorName: string; waitingCount: number }[];
}

export function EmergencyButton({ doctorOptions }: Props) {
  const sorted = [...doctorOptions].sort((a, b) => a.waitingCount - b.waitingCount);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [queueId, setQueueId] = useState(sorted[0]?.queueId ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v) {
      setName("");
      setError(null);
      setQueueId(sorted[0]?.queueId ?? "");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !queueId) return;
    setError(null);
    startTransition(async () => {
      const result = await addEmergency({ name: name.trim(), queueId });
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  if (doctorOptions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50 shrink-0"
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          Emergency
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px]">
        <DialogHeader>
          <DialogTitle className="text-red-700 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Emergency Patient
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="ename">Patient Name</Label>
            <Input
              id="ename"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name only required"
              required
              autoFocus
            />
          </div>
          {doctorOptions.length > 1 && (
            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select value={queueId} onValueChange={setQueueId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sorted.map((d) => (
                    <SelectItem key={d.queueId} value={d.queueId}>
                      {d.doctorName}
                      {d.waitingCount > 0 ? ` (${d.waitingCount} waiting)` : " (free)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-xs text-slate-500">
            Patient placed at the front of the queue immediately. No phone needed.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !name.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? "Adding…" : "Add Emergency"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
