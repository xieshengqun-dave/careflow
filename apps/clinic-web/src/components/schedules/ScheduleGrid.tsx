"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addScheduleSlot, deleteScheduleSlot, updateScheduleSlot } from "@/lib/actions/schedules";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

const DAYS = [
  { index: 1, label: "Mon", full: "Monday" },
  { index: 2, label: "Tue", full: "Tuesday" },
  { index: 3, label: "Wed", full: "Wednesday" },
  { index: 4, label: "Thu", full: "Thursday" },
  { index: 5, label: "Fri", full: "Friday" },
  { index: 6, label: "Sat", full: "Saturday" },
  { index: 0, label: "Sun", full: "Sunday" },
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

interface SlotPillProps {
  slot: ScheduleSlot;
  canManage: boolean;
  onDelete: (id: string) => void;
}

function SlotPill({ slot, canManage, onDelete }: SlotPillProps) {
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
      <div className="rounded-lg border border-cf-primary-200 bg-cf-primary-50 p-2 space-y-1.5">
        <div className="flex items-center gap-1">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-7 text-xs flex-1 min-w-0" />
          <span className="text-slate-400 text-xs shrink-0">–</span>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-7 text-xs flex-1 min-w-0" />
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600 shrink-0" onClick={save} disabled={isPending}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancel} disabled={isPending}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="group relative rounded-lg bg-cf-primary-50 border border-cf-primary-100 px-2.5 py-2">
      <div className="flex items-start gap-1.5">
        <div className="w-0.5 self-stretch rounded-full bg-cf-primary-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-cf-primary-700 leading-tight">{fmt(slot.start_time)}</p>
          <p className="text-xs text-cf-primary-500 leading-tight">{fmt(slot.end_time)}</p>
        </div>
        {canManage && (
          <span className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-cf-primary-100 text-cf-primary-600"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={() => onDelete(slot.id)}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-100 text-red-500"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </span>
        )}
      </div>
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
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2 space-y-1.5">
      <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-7 text-xs" />
      <span className="block text-center text-slate-400 text-xs leading-none">to</span>
      <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-7 text-xs" />
      <div className="flex gap-1 pt-0.5">
        <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={submit} disabled={isPending}>
          <Check className="h-3 w-3" />{isPending ? "…" : "Add"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDone} disabled={isPending}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ScheduleGrid({ doctorId, doctorName, slots, canManage }: ScheduleGridProps) {
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const activeSlots = slots.filter((s) => s.is_active);
  const totalBlocks = activeSlots.length;

  const handleDelete = (slotId: string) => {
    startTransition(async () => { await deleteScheduleSlot(slotId); });
  };

  return (
    <div className="rounded-[18px] border bg-white overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 border-b bg-slate-50/60 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base text-slate-900">Dr. {doctorName}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalBlocks} active time block{totalBlocks !== 1 ? "s" : ""} across the week
          </p>
        </div>
      </div>

      {/* 7-column week grid */}
      <div className="grid grid-cols-7 divide-x divide-slate-100">
        {DAYS.map(({ index, label, full }) => {
          const daySlots = activeSlots.filter((s) => s.day_of_week === index);
          const isAdding = addingDay === index;
          const hasSlots = daySlots.length > 0;

          return (
            <div key={index} className="flex flex-col min-h-[160px]">
              {/* Day header */}
              <div className={`px-2 py-2.5 text-center border-b ${hasSlots ? "bg-cf-primary-50/60" : "bg-slate-50/40"}`}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                {hasSlots && (
                  <p className="text-[10px] text-cf-primary-600 mt-0.5 font-medium">
                    {daySlots.length} block{daySlots.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Slots */}
              <div className="flex-1 p-2 space-y-1.5">
                {!hasSlots && !isAdding && (
                  <p className="text-[10px] text-slate-300 text-center italic pt-2" title={full}>Off</p>
                )}
                {daySlots.map((slot) => (
                  <SlotPill key={slot.id} slot={slot} canManage={canManage} onDelete={handleDelete} />
                ))}
                {isAdding && (
                  <AddSlotForm doctorId={doctorId} dayOfWeek={index} onDone={() => setAddingDay(null)} />
                )}
              </div>

              {/* Add button */}
              {canManage && !isAdding && (
                <div className="px-2 pb-2">
                  <button
                    onClick={() => setAddingDay(index)}
                    className="w-full flex items-center justify-center gap-0.5 text-[10px] text-slate-400 hover:text-cf-primary-600 py-1.5 rounded border border-dashed border-slate-200 hover:border-cf-primary-200 hover:bg-cf-primary-50/50 transition-colors"
                  >
                    <Plus className="h-2.5 w-2.5" /> Add
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
