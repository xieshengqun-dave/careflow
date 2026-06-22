-- =============================================================================
-- CareFlow Initial Schema
-- Migration: 20260618000000_initial_schema
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- Enums
-- =============================================================================

CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE staff_role AS ENUM ('DOCTOR', 'RECEPTIONIST', 'ADMIN');
CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'BOOKED', 'BREAK', 'BLOCKED');
CREATE TYPE appointment_status AS ENUM (
  'PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
);
CREATE TYPE queue_entry_type AS ENUM ('APPOINTMENT', 'WALK_IN');
CREATE TYPE queue_entry_status AS ENUM (
  'WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'REMOVED'
);
CREATE TYPE notification_type AS ENUM (
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_REMINDER',
  'QUEUE_JOINED',
  'QUEUE_POSITION_UPDATE',
  'CALLED_TO_CONSULTATION',
  'DOCTOR_DELAYED',
  'APPOINTMENT_CANCELLED'
);

-- =============================================================================
-- Utility: auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tables
-- =============================================================================

-- profiles (extends auth.users — one row per registered user)
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone_number        VARCHAR(20) NOT NULL UNIQUE,
  date_of_birth       DATE,
  gender              gender_type,
  profile_picture_url TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- clinics
CREATE TABLE clinics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  address         TEXT NOT NULL,
  city            TEXT,
  state           TEXT,
  postal_code     VARCHAR(10),
  phone_number    VARCHAR(20),
  email           TEXT,
  operating_hours JSONB,
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_clinics_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- clinic_staff (links auth.users to a clinic with a role)
CREATE TABLE clinic_staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       staff_role NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, user_id)
);

CREATE TRIGGER trg_clinic_staff_updated_at
  BEFORE UPDATE ON clinic_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- doctors (one-to-one with clinic_staff where role = DOCTOR)
CREATE TABLE doctors (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id                     UUID NOT NULL UNIQUE REFERENCES clinic_staff(id) ON DELETE CASCADE,
  specialization               TEXT,
  qualification                TEXT,
  bio                          TEXT,
  consultation_duration_minutes SMALLINT NOT NULL DEFAULT 15 CHECK (consultation_duration_minutes > 0),
  avatar_url                   TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- doctor_schedules (weekly recurring schedule template)
CREATE TABLE doctor_schedules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week           SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  slot_duration_minutes SMALLINT NOT NULL DEFAULT 15,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, day_of_week),
  CHECK (end_time > start_time)
);

-- time_slots (generated concrete slots per doctor per date)
CREATE TABLE time_slots (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_date  DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  status     slot_status NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, slot_date, start_time)
);

-- appointments
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  doctor_id        UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  clinic_id        UUID NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
  time_slot_id     UUID NOT NULL UNIQUE REFERENCES time_slots(id) ON DELETE RESTRICT,
  status           appointment_status NOT NULL DEFAULT 'CONFIRMED',
  appointment_date DATE NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- queues (one active queue per doctor per day)
CREATE TABLE queues (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id      UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  queue_date     DATE NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  current_number SMALLINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, queue_date)
);

CREATE TRIGGER trg_queues_updated_at
  BEFORE UPDATE ON queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- queue_entries
CREATE TABLE queue_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id       UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  patient_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  queue_number   SMALLINT NOT NULL,
  type           queue_entry_type NOT NULL,
  priority       SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 3),
  status         queue_entry_status NOT NULL DEFAULT 'WAITING',
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at      TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (queue_id, queue_number)
);

CREATE TRIGGER trg_queue_entries_updated_at
  BEFORE UPDATE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- notifications
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_clinic_staff_clinic_id    ON clinic_staff(clinic_id);
CREATE INDEX idx_clinic_staff_user_id      ON clinic_staff(user_id);
CREATE INDEX idx_doctors_staff_id          ON doctors(staff_id);
CREATE INDEX idx_doctor_schedules_doctor   ON doctor_schedules(doctor_id);
CREATE INDEX idx_time_slots_doctor_date    ON time_slots(doctor_id, slot_date);
CREATE INDEX idx_time_slots_available      ON time_slots(doctor_id, slot_date) WHERE status = 'AVAILABLE';
CREATE INDEX idx_appointments_patient      ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_date  ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_clinic       ON appointments(clinic_id);
CREATE INDEX idx_appointments_status       ON appointments(status);
CREATE INDEX idx_queues_doctor_date        ON queues(doctor_id, queue_date);
CREATE INDEX idx_queues_active             ON queues(clinic_id, queue_date) WHERE is_active = TRUE;
CREATE INDEX idx_queue_entries_queue       ON queue_entries(queue_id);
CREATE INDEX idx_queue_entries_patient     ON queue_entries(patient_id);
CREATE INDEX idx_queue_entries_waiting     ON queue_entries(queue_id, priority, queue_number) WHERE status = 'WAITING';
CREATE INDEX idx_notifications_user        ON notifications(user_id);
CREATE INDEX idx_notifications_unread      ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_clinics_active            ON clinics(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_clinics_name_trgm         ON clinics USING gin(name gin_trgm_ops);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_staff     ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications    ENABLE ROW LEVEL SECURITY;

-- Helper functions (SECURITY DEFINER so they bypass RLS internally)
CREATE OR REPLACE FUNCTION auth.user_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM clinic_staff
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.user_staff_role()
RETURNS staff_role AS $$
  SELECT role FROM clinic_staff
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.is_clinic_staff(p_clinic_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinic_staff
    WHERE user_id = auth.uid()
      AND clinic_id = p_clinic_id
      AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── profiles ──────────────────────────────────────────────────────────────────
CREATE POLICY "profiles: owner read"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: owner insert"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles: clinic staff read"
  ON profiles FOR SELECT USING (auth.user_clinic_id() IS NOT NULL);

-- ── clinics ───────────────────────────────────────────────────────────────────
CREATE POLICY "clinics: public read active"
  ON clinics FOR SELECT USING (is_active = TRUE);

CREATE POLICY "clinics: admin update"
  ON clinics FOR UPDATE USING (
    auth.user_clinic_id() = id AND auth.user_staff_role() = 'ADMIN'
  );

-- ── clinic_staff ──────────────────────────────────────────────────────────────
CREATE POLICY "clinic_staff: same-clinic read"
  ON clinic_staff FOR SELECT USING (auth.is_clinic_staff(clinic_id));

CREATE POLICY "clinic_staff: admin manage"
  ON clinic_staff FOR ALL USING (
    auth.user_clinic_id() = clinic_id AND auth.user_staff_role() = 'ADMIN'
  );

-- ── doctors ───────────────────────────────────────────────────────────────────
CREATE POLICY "doctors: public read"
  ON doctors FOR SELECT USING (TRUE);

CREATE POLICY "doctors: admin manage"
  ON doctors FOR ALL USING (auth.user_staff_role() = 'ADMIN');

-- ── doctor_schedules ──────────────────────────────────────────────────────────
CREATE POLICY "doctor_schedules: public read active"
  ON doctor_schedules FOR SELECT USING (is_active = TRUE);

CREATE POLICY "doctor_schedules: admin manage"
  ON doctor_schedules FOR ALL USING (auth.user_staff_role() = 'ADMIN');

-- ── time_slots ────────────────────────────────────────────────────────────────
CREATE POLICY "time_slots: public read"
  ON time_slots FOR SELECT USING (TRUE);

CREATE POLICY "time_slots: staff manage"
  ON time_slots FOR ALL USING (auth.user_clinic_id() IS NOT NULL);

-- ── appointments ──────────────────────────────────────────────────────────────
CREATE POLICY "appointments: patient read own"
  ON appointments FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "appointments: patient create"
  ON appointments FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "appointments: patient cancel"
  ON appointments FOR UPDATE USING (
    patient_id = auth.uid() AND status IN ('PENDING', 'CONFIRMED')
  );

CREATE POLICY "appointments: staff read clinic"
  ON appointments FOR SELECT USING (auth.is_clinic_staff(clinic_id));

CREATE POLICY "appointments: staff update"
  ON appointments FOR UPDATE USING (auth.is_clinic_staff(clinic_id));

-- ── queues ────────────────────────────────────────────────────────────────────
CREATE POLICY "queues: public read active"
  ON queues FOR SELECT USING (is_active = TRUE);

CREATE POLICY "queues: staff manage"
  ON queues FOR ALL USING (auth.is_clinic_staff(clinic_id));

-- ── queue_entries ─────────────────────────────────────────────────────────────
CREATE POLICY "queue_entries: patient read own"
  ON queue_entries FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "queue_entries: patient join"
  ON queue_entries FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "queue_entries: staff manage"
  ON queue_entries FOR ALL USING (
    EXISTS (
      SELECT 1 FROM queues q
      JOIN clinic_staff cs ON cs.clinic_id = q.clinic_id
      WHERE q.id = queue_entries.queue_id
        AND cs.user_id = auth.uid()
        AND cs.is_active = TRUE
    )
  );

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE POLICY "notifications: owner read"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications: owner mark read"
  ON notifications FOR UPDATE USING (user_id = auth.uid());
