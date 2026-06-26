-- =============================================================================
-- CareFlow Complete Schema
-- Migration: 20260618000002_complete_schema
--
-- Idempotency note (Phase 4.3):
-- This migration duplicates content from 000000 + 000001 so that a developer
-- starting from just this file can still set up the database. On a full
-- `supabase db reset` (which applies all migrations in order), 000000 runs
-- first and creates everything; this migration must therefore be idempotent.
--
-- Strategy:
--   • Enums: DO / EXCEPTION WHEN duplicate_object THEN NULL blocks
--   • Functions: CREATE OR REPLACE (already idempotent)
--   • Tables: CREATE TABLE IF NOT EXISTS
--   • Triggers: DROP TRIGGER IF EXISTS before CREATE TRIGGER
--   • Indexes: CREATE INDEX IF NOT EXISTS
--   • ALTER TABLE ENABLE RLS: idempotent, no guard needed
--   • Policies: DROP POLICY IF EXISTS before CREATE POLICY
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- Enums (wrapped in exception blocks to survive a prior 000000 run)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('DOCTOR', 'RECEPTIONIST', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE slot_status AS ENUM ('AVAILABLE', 'BOOKED', 'BREAK', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE queue_entry_type AS ENUM ('APPOINTMENT', 'WALK_IN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE queue_entry_status AS ENUM (
    'WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'REMOVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'APPOINTMENT_CONFIRMED',
    'APPOINTMENT_REMINDER',
    'QUEUE_JOINED',
    'QUEUE_POSITION_UPDATE',
    'CALLED_TO_CONSULTATION',
    'DOCTOR_DELAYED',
    'APPOINTMENT_CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Utility trigger: auto-update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Tables (IF NOT EXISTS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone_number        VARCHAR(20) NOT NULL UNIQUE,
  date_of_birth       DATE,
  gender              gender_type,
  profile_picture_url TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS clinics (
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

DROP TRIGGER IF EXISTS trg_clinics_updated_at ON clinics;
CREATE TRIGGER trg_clinics_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS clinic_staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       staff_role NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, user_id)
);

DROP TRIGGER IF EXISTS trg_clinic_staff_updated_at ON clinic_staff;
CREATE TRIGGER trg_clinic_staff_updated_at
  BEFORE UPDATE ON clinic_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS doctors (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id                      UUID NOT NULL UNIQUE REFERENCES clinic_staff(id) ON DELETE CASCADE,
  specialization                TEXT,
  qualification                 TEXT,
  bio                           TEXT,
  consultation_duration_minutes SMALLINT NOT NULL DEFAULT 15 CHECK (consultation_duration_minutes > 0),
  avatar_url                    TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_doctors_updated_at ON doctors;
CREATE TRIGGER trg_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS doctor_schedules (
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

CREATE TABLE IF NOT EXISTS time_slots (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_date  DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  status     slot_status NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, slot_date, start_time)
);

CREATE TABLE IF NOT EXISTS appointments (
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

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS queues (
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

DROP TRIGGER IF EXISTS trg_queues_updated_at ON queues;
CREATE TRIGGER trg_queues_updated_at
  BEFORE UPDATE ON queues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS queue_entries (
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

DROP TRIGGER IF EXISTS trg_queue_entries_updated_at ON queue_entries;
CREATE TRIGGER trg_queue_entries_updated_at
  BEFORE UPDATE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS notifications (
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
-- Indexes (IF NOT EXISTS)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_clinic_staff_clinic_id   ON clinic_staff(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_user_id     ON clinic_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_staff_id         ON doctors(staff_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor  ON doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_doctor_date   ON time_slots(doctor_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_available     ON time_slots(doctor_id, slot_date) WHERE status = 'AVAILABLE';
CREATE INDEX IF NOT EXISTS idx_appointments_patient     ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic      ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status      ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_queues_doctor_date       ON queues(doctor_id, queue_date);
CREATE INDEX IF NOT EXISTS idx_queues_active            ON queues(clinic_id, queue_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_queue_entries_queue      ON queue_entries(queue_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_patient    ON queue_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_waiting    ON queue_entries(queue_id, priority, queue_number) WHERE status = 'WAITING';
CREATE INDEX IF NOT EXISTS idx_notifications_user       ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread     ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_clinics_active           ON clinics(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_clinics_name_trgm        ON clinics USING gin(name gin_trgm_ops);

-- =============================================================================
-- Row Level Security (enabling RLS is idempotent)
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

-- =============================================================================
-- Helper Functions (CREATE OR REPLACE — idempotent)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM clinic_staff
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_staff_role()
RETURNS staff_role AS $$
  SELECT role FROM clinic_staff
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_clinic_staff(p_clinic_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinic_staff
    WHERE user_id = auth.uid()
      AND clinic_id = p_clinic_id
      AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================================================
-- RLS Policies (DROP IF EXISTS before each CREATE to survive prior runs)
-- =============================================================================

-- ── profiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: owner read"        ON profiles;
DROP POLICY IF EXISTS "profiles: owner insert"      ON profiles;
DROP POLICY IF EXISTS "profiles: owner update"      ON profiles;
DROP POLICY IF EXISTS "profiles: clinic staff read" ON profiles;

CREATE POLICY "profiles: owner read"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: owner insert"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles: clinic staff read"
  ON profiles FOR SELECT USING (public.get_user_clinic_id() IS NOT NULL);

-- ── clinics ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clinics: public read active" ON clinics;
DROP POLICY IF EXISTS "clinics: admin update"       ON clinics;

CREATE POLICY "clinics: public read active"
  ON clinics FOR SELECT USING (is_active = TRUE);

CREATE POLICY "clinics: admin update"
  ON clinics FOR UPDATE USING (
    public.get_user_clinic_id() = id AND public.get_user_staff_role() = 'ADMIN'
  );

-- ── clinic_staff ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clinic_staff: same-clinic read" ON clinic_staff;
DROP POLICY IF EXISTS "clinic_staff: admin manage"     ON clinic_staff;

CREATE POLICY "clinic_staff: same-clinic read"
  ON clinic_staff FOR SELECT USING (public.is_clinic_staff(clinic_id));

CREATE POLICY "clinic_staff: admin manage"
  ON clinic_staff FOR ALL USING (
    public.get_user_clinic_id() = clinic_id AND public.get_user_staff_role() = 'ADMIN'
  );

-- ── doctors ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "doctors: public read"  ON doctors;
DROP POLICY IF EXISTS "doctors: admin manage" ON doctors;

CREATE POLICY "doctors: public read"
  ON doctors FOR SELECT USING (TRUE);

CREATE POLICY "doctors: admin manage"
  ON doctors FOR ALL USING (public.get_user_staff_role() = 'ADMIN');

-- ── doctor_schedules ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "doctor_schedules: public read active" ON doctor_schedules;
DROP POLICY IF EXISTS "doctor_schedules: admin manage"       ON doctor_schedules;

CREATE POLICY "doctor_schedules: public read active"
  ON doctor_schedules FOR SELECT USING (is_active = TRUE);

CREATE POLICY "doctor_schedules: admin manage"
  ON doctor_schedules FOR ALL USING (public.get_user_staff_role() = 'ADMIN');

-- ── time_slots ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "time_slots: public read"  ON time_slots;
DROP POLICY IF EXISTS "time_slots: staff manage" ON time_slots;

CREATE POLICY "time_slots: public read"
  ON time_slots FOR SELECT USING (TRUE);

CREATE POLICY "time_slots: staff manage"
  ON time_slots FOR ALL USING (public.get_user_clinic_id() IS NOT NULL);

-- ── appointments ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "appointments: patient read own"  ON appointments;
DROP POLICY IF EXISTS "appointments: patient create"    ON appointments;
DROP POLICY IF EXISTS "appointments: patient cancel"    ON appointments;
DROP POLICY IF EXISTS "appointments: staff read clinic" ON appointments;
DROP POLICY IF EXISTS "appointments: staff update"      ON appointments;

CREATE POLICY "appointments: patient read own"
  ON appointments FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "appointments: patient create"
  ON appointments FOR INSERT WITH CHECK (patient_id = auth.uid());

CREATE POLICY "appointments: patient cancel"
  ON appointments FOR UPDATE USING (
    patient_id = auth.uid() AND status IN ('PENDING', 'CONFIRMED')
  );

CREATE POLICY "appointments: staff read clinic"
  ON appointments FOR SELECT USING (public.is_clinic_staff(clinic_id));

CREATE POLICY "appointments: staff update"
  ON appointments FOR UPDATE USING (public.is_clinic_staff(clinic_id));

-- ── queues ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "queues: public read active" ON queues;
DROP POLICY IF EXISTS "queues: staff manage"       ON queues;

CREATE POLICY "queues: public read active"
  ON queues FOR SELECT USING (is_active = TRUE);

CREATE POLICY "queues: staff manage"
  ON queues FOR ALL USING (public.is_clinic_staff(clinic_id));

-- ── queue_entries ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "queue_entries: patient read own" ON queue_entries;
DROP POLICY IF EXISTS "queue_entries: patient join"     ON queue_entries;
DROP POLICY IF EXISTS "queue_entries: staff manage"     ON queue_entries;

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
DROP POLICY IF EXISTS "notifications: owner read"      ON notifications;
DROP POLICY IF EXISTS "notifications: owner mark read" ON notifications;

CREATE POLICY "notifications: owner read"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications: owner mark read"
  ON notifications FOR UPDATE USING (user_id = auth.uid());
