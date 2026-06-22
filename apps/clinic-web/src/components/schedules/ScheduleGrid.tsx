"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { addScheduleSlot, deleteScheduleSlot, updateScheduleSlot } from "@/lib/actions/schedules";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

const DAYS = [
  { index: 1, label: "Monday" },
  { index: 2, label: "Tuesday" },
  { index: 3, label: "Wednesday" },
  { index: 4, label: "Thursday" },
  { index: 5, label: "Friday" },
  { index: 6, label: "Saturday" },
  { index: 0, label: "Sunday" },
];

export interface ScheduleSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface ScheduleGridProps {
  doctorId: string;
  doctorName: string;
  slots: ScheduleSlot[];
  canManage: boolean;
}

function fmt(t: string) {
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "pm" : "am";
  return `${hour % 12 || 12}:${m}${ampm}`;
}

interface SlotRowProps {
  slot: ScheduleSlot;
  canManage: boolean;
  onDelete: (id: string) => void;
}

function SlotRow({ slot, canManage, onDelete }: SlotRowProps) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(slot.start_time.slice(0, 5));
  const [end, setEnd] = useState(slot.end_time.slice(0, 5));
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    if (start >= end) { setError("End must be after start."); return; }
    setError("");
    startTransition(async () => {
      const res = await updateScheduleSlot(slot.id, { startTime: start, endTime: end });
      if (res.error) { setError(res.error); return; }
      setEditing(false);
    });
  };

  const cancel = () => {
    setStart(slot.start_time.slice(0, 5));
    setEnd(slot.end_time.slice(0, 5));
    setError("");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 w-32 text-sm" />
        <span className="text-muted-foreground text-sm">–</span>
        <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 w-32 text-sm" />
        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={save} disabled={isPending}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancel} disabled={isPending}>
          <X className="h-3.5 w-3.5" />
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <Badge variant="secondary" className="font-mono text-xs font-medium">
        {fmt(slot.start_time)} – {fmt(slot.end_time)}
      </Badge>
      {canManage && (
        <span className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(slot.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </span>
      )}
    </div>
  );
}

interface AddSlotFormProps {
  doctorId: string;
  dayOfWeek: number;
  onDone: () => void;
}

function AddSlotForm({ doctorId, dayOfWeek, onDone }: AddSlotFormProps) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (start >= end) { setError("End must be after start."); return; }
    setError("");
    startTransition(async () => {
      const res = await addScheduleSlot({ doctorId, dayOfWeek, startTime: start, endTime: end });
      if (res.error) { setError(res.error); return; }
      onDone();
    });
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 p-2 rounded-md bg-slate-50 border border-dashed">
      <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 w-32 text-sm" />
      <span className="text-muted-foreground text-sm">–</span>
      <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 w-32 text-sm" />
      <Button size="sm" className="h-8 gap-1" onClick={submit} disabled={isPending}>
        <Check className="h-3.5 w-3.5" /> {isPending ? "Saving…" : "Add"}
      </Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={onDone} disabled={isPending}>
        Cancel
      </Button>
      {error && <p className="text-xs text-destructive w-full">{error}</p>}
    </div>
  );
}

export function ScheduleGrid({ doctorId, doctorName, slots, canManage }: ScheduleGridProps) {
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeSlots = slots.filter((s) => s.is_active);

  const handleDelete = (slotId: string) => {
    startTransition(async () => { await deleteScheduleSlot(slotId); });
  };

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="px-5 py-4 border-b bg-slate-50/60">
        <h2 className="font-semibold text-base">{doctorName}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {activeSlots.length} active time block{activeSlots.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="divide-y">
        {DAYS.map(({ index, label }) => {
          const daySlots = activeSlots.filter((s) => s.day_of_week === index);
          const isAdding = addingDay === index;

          return (
            <div key={index} className="flex gap-4 px-5 py-3">
              <div className="w-28 shrink-0 pt-1.5">
                <span className={`text-sm font-medium ${daySlots.length > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              <div className="flex-1">
                {daySlots.length === 0 && !isAdding && (
                  <span className="text-sm text-muted-foreground italic">No schedule</span>
                )}
                {daySlots.map((slot) => (
                  <SlotRow key={slot.id} slot={slot} canManage={canManage} onDelete={handleDelete} />
                ))}
                {isAdding && (
                  <AddSlotForm
                    doctorId={doctorId}
                    dayOfWeek={index}
                    onDone={() => setAddingDay(null)}
                  />
                )}
                {canManage && !isAdding && (
                  <button
                    onClick={() => setAddingDay(index)}
                    className="mt-1 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add time block
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
