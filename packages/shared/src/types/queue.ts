export type QueueEntryType = "APPOINTMENT" | "WALK_IN";
export type ArrivalStatusValue = "EARLY" | "ON_TIME" | "LATE" | "NO_SHOW";

export type QueuePriority = 1 | 2 | 3;

export type QueueEntryStatus =
  | "WAITING"
  | "CALLED"
  | "IN_CONSULTATION"
  | "COMPLETED"
  | "SKIPPED"
  | "REMOVED";

export interface Queue {
  id: string;
  clinic_id: string;
  doctor_id: string;
  queue_date: string;
  is_active: boolean;
  current_number: number;
  created_at: string;
  updated_at: string;
}

export interface QueueEntry {
  id: string;
  queue_id: string;
  patient_id: string;
  appointment_id: string | null;
  queue_number: number;
  type: QueueEntryType;
  priority: QueuePriority;
  status: QueueEntryStatus;
  joined_at: string;
  called_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_REMINDER"
  | "QUEUE_JOINED"
  | "QUEUE_POSITION_UPDATE"
  | "CALLED_TO_CONSULTATION"
  | "DOCTOR_DELAYED"
  | "APPOINTMENT_CANCELLED";
