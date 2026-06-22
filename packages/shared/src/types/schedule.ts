import type { SlotStatus } from "./clinic";

export type { SlotStatus };

export interface TimeRange {
  start: string; // "HH:MM" 24h
  end: string;
}

export interface BreakPeriod extends TimeRange {
  label?: string;
}

export interface GeneratedSlot {
  start: string;        // "09:00"
  end: string;          // "09:30"
  startMinutes: number; // minutes since midnight
  endMinutes: number;
  status: SlotStatus;
  appointmentId?: string;
}

export interface SlotEngineInput {
  workingPeriods: TimeRange[];
  breaks: BreakPeriod[];
  slotDuration: number; // minutes
  bookedSlots: Array<{ startTime: string; appointmentId?: string }>;
  blockedSlots?: string[]; // start time strings
}
