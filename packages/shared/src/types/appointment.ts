export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  time_slot_id: string;
  status: AppointmentStatus;
  appointment_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
