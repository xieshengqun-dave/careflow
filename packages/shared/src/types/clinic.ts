export interface OperatingHours {
  [day: string]: {
    open: string;
    close: string;
    is_closed: boolean;
  };
}

export interface Clinic {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone_number: string | null;
  email: string | null;
  operating_hours: OperatingHours | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  staff_id: string;
  specialization: string | null;
  qualification: string | null;
  bio: string | null;
  consultation_duration_minutes: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type SlotStatus = "AVAILABLE" | "BOOKED" | "BREAK" | "BLOCKED";

export interface TimeSlot {
  id: string;
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: SlotStatus;
  created_at: string;
}
