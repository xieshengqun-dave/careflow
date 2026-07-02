import type { QueuePriority, QueueEntryStatus } from "../types/queue";

export const QUEUE_PRIORITY: Record<string, QueuePriority> = {
  EMERGENCY: 1,
  APPOINTMENT: 2,
  WALK_IN: 3,
} as const;

export const QUEUE_STATUS_LABEL: Record<QueueEntryStatus, string> = {
  WAITING: "Waiting",
  CALLED: "Called",
  IN_CONSULTATION: "In Consultation",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  REMOVED: "Removed",
} as const;

export const DEFAULT_CONSULTATION_MINUTES = 15;
export const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur";

/** Treatment type display labels — must stay in sync with AddWalkInDialog quick-select pills. */
export const TREATMENT_TYPE_LABELS = [
  "Checkup",
  "Cleaning",
  "Filling",
  "Extraction",
  "Root Canal",
  "Crown",
  "Other",
] as const;
