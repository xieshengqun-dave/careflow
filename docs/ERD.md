# CareFlow Entity Relationship Diagram

Smart Appointment & Queue Management Platform for Malaysian Clinics

---

## Table of Contents

1. [ASCII ERD Diagram](#ascii-erd-diagram)
2. [Table Definitions](#table-definitions)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [RLS Policy Summary](#rls-policy-summary)

---

## ASCII ERD Diagram

```
┌─────────────────┐          ┌──────────────────────────────────────────┐
│   auth.users    │          │              clinics                     │
│─────────────────│          │──────────────────────────────────────────│
│ id (PK)  UUID   │          │ id            UUID PK                    │
│ email    TEXT   │          │ name          TEXT NOT NULL              │
│ phone    TEXT   │          │ description   TEXT                       │
│ ...             │          │ address       TEXT NOT NULL              │
└────────┬────────┘          │ city          TEXT                       │
         │                   │ state         TEXT                       │
         │ 1                 │ postal_code   VARCHAR(10)                │
         │                   │ phone_number  VARCHAR(20)                │
    ┌────▼──────────┐        │ email         TEXT                       │
    │   profiles    │        │ operating_hours JSONB                    │
    │───────────────│        │ latitude      DECIMAL(10,8)              │
    │ id     UUID FK│◀───┐   │ longitude     DECIMAL(11,8)              │
    │ full_name TEXT│    │   │ is_active     BOOLEAN DEFAULT true       │
    │ phone  VARCHAR│    │   │ created_at    TIMESTAMPTZ                │
    │ dob    DATE   │    │   │ updated_at    TIMESTAMPTZ                │
    │ gender ENUM   │    │   └──────────────────┬───────────────────────┘
    │ pic_url TEXT  │    │                      │ 1
    │ created_at    │    │                      │
    │ updated_at    │    │              ┌───────┴──────────────┐
    └───────────────┘    │              │    clinic_staff       │
                         │              │──────────────────────│
         ┌───────────────┘              │ id         UUID PK   │
         │ patient_id                   │ clinic_id  UUID FK   │──▶ clinics
         │                             │ user_id    UUID FK   │──▶ auth.users
    ┌────┴────────────────┐            │ role       ENUM      │
    │     appointments    │            │ is_active  BOOLEAN   │
    │─────────────────────│            │ created_at TIMESTAMPTZ│
    │ id         UUID PK  │            │ updated_at TIMESTAMPTZ│
    │ patient_id UUID FK  │──▶profiles └──────────┬───────────┘
    │ doctor_id  UUID FK  │──▶doctors              │ 1
    │ clinic_id  UUID FK  │──▶clinics              │
    │ time_slot_id UUID FK│──▶time_slots  ┌────────▼──────────┐
    │ status     ENUM     │               │      doctors      │
    │ appt_date  DATE     │               │───────────────────│
    │ notes      TEXT     │               │ id       UUID PK  │
    │ created_at          │               │ staff_id UUID FK  │──▶ clinic_staff
    │ updated_at          │               │ specialization    │
    └─────────┬───────────┘               │ qualification     │
              │ 0..1                      │ bio      TEXT     │
              │                           │ consult_duration  │
    ┌─────────▼───────────┐               │ avatar_url TEXT   │
    │    queue_entries    │               │ created_at        │
    │─────────────────────│               │ updated_at        │
    │ id           UUID PK│               └──────┬────────────┘
    │ queue_id     UUID FK│──▶queues             │ 1
    │ patient_id   UUID FK│──▶profiles           │
    │ appointment_id UUID │──▶appointments  ┌────┴─────────────────┐
    │ queue_number SMALLINT│               │  doctor_schedules    │
    │ type         ENUM   │               │──────────────────────│
    │ priority     SMALLINT│              │ id         UUID PK   │
    │ status       ENUM   │               │ doctor_id  UUID FK   │──▶ doctors
    │ joined_at    TIMESTAMPTZ│           │ day_of_week SMALLINT │
    │ called_at    TIMESTAMPTZ│           │ start_time TIME      │
    │ completed_at TIMESTAMPTZ│           │ end_time   TIME      │
    │ created_at            │            │ slot_duration SMALLINT│
    │ updated_at            │            │ is_active  BOOLEAN   │
    └─────────────────────┘             │ created_at           │
              ▲                          └──────────────────────┘
              │ many
              │                     ┌──────────────────────────┐
    ┌─────────┴───────────┐         │       time_slots         │
    │       queues        │         │──────────────────────────│
    │─────────────────────│         │ id         UUID PK       │
    │ id         UUID PK  │         │ doctor_id  UUID FK       │──▶ doctors
    │ clinic_id  UUID FK  │──▶clinics│ slot_date  DATE         │
    │ doctor_id  UUID FK  │──▶doctors│ start_time TIME         │
    │ queue_date DATE     │         │ end_time   TIME          │
    │ is_active  BOOLEAN  │         │ status     ENUM          │
    │ current_number SMALLINT│      │ created_at TIMESTAMPTZ   │
    │ created_at          │         └──────────────────────────┘
    │ updated_at          │
    └─────────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │                     notifications                        │
    │──────────────────────────────────────────────────────────│
    │ id        UUID PK                                        │
    │ user_id   UUID FK ──────────────────────────▶ auth.users│
    │ type      ENUM                                           │
    │ title     TEXT                                           │
    │ body      TEXT                                           │
    │ data      JSONB                                          │
    │ is_read   BOOLEAN DEFAULT false                          │
    │ sent_at   TIMESTAMPTZ                                    │
    │ created_at TIMESTAMPTZ                                   │
    └──────────────────────────────────────────────────────────┘
```

---

## Table Definitions

### 1. profiles

Extends `auth.users` with application-level patient data. One-to-one with `auth.users`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, FK → `auth.users.id` ON DELETE CASCADE | Mirrors the Supabase Auth user ID |
| `full_name` | `TEXT` | NOT NULL | Patient's full name |
| `phone_number` | `VARCHAR(20)` | | Malaysian phone, e.g. +60123456789 |
| `date_of_birth` | `DATE` | | Patient DOB for age verification |
| `gender` | `ENUM('MALE','FEMALE','OTHER')` | | Patient gender |
| `profile_picture_url` | `TEXT` | | Supabase Storage URL for avatar |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Last update timestamp (trigger-maintained) |

```sql
CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER');

CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone_number        VARCHAR(20),
  date_of_birth       DATE,
  gender              gender_enum,
  profile_picture_url TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 2. clinics

Represents a registered clinic on the platform. A clinic is the top-level tenant entity.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | Clinic unique identifier |
| `name` | `TEXT` | NOT NULL | Clinic display name |
| `description` | `TEXT` | | Brief description of the clinic |
| `address` | `TEXT` | NOT NULL | Street address |
| `city` | `TEXT` | | City name |
| `state` | `TEXT` | | Malaysian state (e.g. Selangor, Kuala Lumpur) |
| `postal_code` | `VARCHAR(10)` | | Malaysian postcode, e.g. 50480 |
| `phone_number` | `VARCHAR(20)` | | Clinic contact number |
| `email` | `TEXT` | | Clinic contact email |
| `operating_hours` | `JSONB` | | Schedule object keyed by day (0–6) with open/close times |
| `latitude` | `DECIMAL(10,8)` | | GPS latitude for map display |
| `longitude` | `DECIMAL(11,8)` | | GPS longitude for map display |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT `true` | Soft-delete / deactivation flag |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Last update timestamp |

`operating_hours` JSONB shape example:
```json
{
  "0": null,
  "1": { "open": "09:00", "close": "17:00" },
  "2": { "open": "09:00", "close": "17:00" },
  "3": { "open": "09:00", "close": "13:00" },
  "4": { "open": "09:00", "close": "17:00" },
  "5": { "open": "09:00", "close": "17:00" },
  "6": { "open": "09:00", "close": "13:00" }
}
```

---

### 3. clinic_staff

Join table between a clinic and a user, with a role assignment. A user can be staff at multiple clinics.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | Staff record identifier |
| `clinic_id` | `UUID` | NOT NULL, FK → `clinics.id` ON DELETE CASCADE | Owning clinic |
| `user_id` | `UUID` | NOT NULL, FK → `auth.users.id` ON DELETE CASCADE | Linked auth user |
| `role` | `ENUM('DOCTOR','RECEPTIONIST','ADMIN')` | NOT NULL | Staff role at this clinic |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT `true` | Whether this staff assignment is active |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Last update timestamp |

```sql
CREATE TYPE staff_role_enum AS ENUM ('DOCTOR', 'RECEPTIONIST', 'ADMIN');

CREATE TABLE clinic_staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       staff_role_enum NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);
```

---

### 4. doctors

Extended profile for staff members who have the `DOCTOR` role. One-to-one with a `clinic_staff` row.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | Doctor record identifier |
| `staff_id` | `UUID` | NOT NULL UNIQUE, FK → `clinic_staff.id` ON DELETE CASCADE | Linked staff record |
| `specialization` | `TEXT` | | e.g. General Practitioner, Paediatrics |
| `qualification` | `TEXT` | | e.g. MBBS, MMed |
| `bio` | `TEXT` | | Public-facing biography |
| `consultation_duration_minutes` | `SMALLINT` | NOT NULL DEFAULT `15` | Default slot length in minutes |
| `avatar_url` | `TEXT` | | Supabase Storage URL for doctor photo |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Last update timestamp |

---

### 5. doctor_schedules

Recurring weekly availability template for a doctor. Used to generate `time_slots`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | Schedule rule identifier |
| `doctor_id` | `UUID` | NOT NULL, FK → `doctors.id` ON DELETE CASCADE | Owning doctor |
| `day_of_week` | `SMALLINT` | NOT NULL CHECK (0–6) | 0 = Sunday, 1 = Monday … 6 = Saturday |
| `start_time` | `TIME` | NOT NULL | Session start time |
| `end_time` | `TIME` | NOT NULL | Session end time |
| `slot_duration_minutes` | `SMALLINT` | NOT NULL DEFAULT `15` | Override per-day slot duration |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT `true` | Whether this schedule rule is in use |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |

```sql
CREATE TABLE doctor_schedules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week           SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  slot_duration_minutes SMALLINT NOT NULL DEFAULT 15,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
```

---

### 6. time_slots

Individual bookable slots generated from `doctor_schedules`. Appointments reference specific time slots.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | Slot identifier |
| `doctor_id` | `UUID` | NOT NULL, FK → `doctors.id` ON DELETE CASCADE | Slot owner |
| `slot_date` | `DATE` | NOT NULL | Calendar date of the slot |
| `start_time` | `TIME` | NOT NULL | Slot start time |
| `end_time` | `TIME` | NOT NULL | Slot end time |
| `status` | `ENUM('AVAILABLE','BOOKED','BREAK','BLOCKED')` | NOT NULL DEFAULT `'AVAILABLE'` | Booking state of the slot |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |

```sql
CREATE TYPE slot_status_enum AS ENUM ('AVAILABLE', 'BOOKED', 'BREAK', 'BLOCKED');

CREATE TABLE time_slots (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_date  DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  status     slot_status_enum NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, slot_date, start_time)
);
```

---

### 7. appointments

A confirmed booking by a patient for a specific doctor time slot.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | Appointment identifier |
| `patient_id` | `UUID` | NOT NULL, FK → `profiles.id` ON DELETE RESTRICT | Patient who booked |
| `doctor_id` | `UUID` | NOT NULL, FK → `doctors.id` ON DELETE RESTRICT | Doctor being seen |
| `clinic_id` | `UUID` | NOT NULL, FK → `clinics.id` ON DELETE RESTRICT | Clinic where appointment takes place |
| `time_slot_id` | `UUID` | NOT NULL UNIQUE, FK → `time_slots.id` ON DELETE RESTRICT | The specific slot reserved — UNIQUE enforces one appointment per slot |
| `status` | `ENUM('PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','NO_SHOW')` | NOT NULL DEFAULT `'PENDING'` | Appointment lifecycle state |
| `appointment_date` | `DATE` | NOT NULL | Denormalized date for quick filtering |
| `notes` | `TEXT` | | Patient notes or reason for visit |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Last update timestamp |

```sql
CREATE TYPE appointment_status_enum AS ENUM (
  'PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
);

CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  doctor_id        UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  clinic_id        UUID NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
  time_slot_id     UUID NOT NULL UNIQUE REFERENCES time_slots(id) ON DELETE RESTRICT,
  status           appointment_status_enum NOT NULL DEFAULT 'PENDING',
  appointment_date DATE NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 8. queues

Represents the active daily queue for a specific doctor at a clinic. One queue per doctor per day.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | Queue identifier |
| `clinic_id` | `UUID` | NOT NULL, FK → `clinics.id` ON DELETE RESTRICT | Clinic running the queue |
| `doctor_id` | `UUID` | NOT NULL, FK → `doctors.id` ON DELETE RESTRICT | Doctor this queue belongs to |
| `queue_date` | `DATE` | NOT NULL | The calendar date of this queue |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT `true` | Whether the queue is accepting new entries |
| `current_number` | `SMALLINT` | NOT NULL DEFAULT `0` | The queue number currently being served |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Last update timestamp |

Constraint: `UNIQUE (doctor_id, queue_date)` — prevents duplicate queues.

```sql
CREATE TABLE queues (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
  doctor_id      UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  queue_date     DATE NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  current_number SMALLINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, queue_date)
);
```

---

### 9. queue_entries

An individual patient's position within a queue. This is the most frequently read and written table.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | Entry identifier |
| `queue_id` | `UUID` | NOT NULL, FK → `queues.id` ON DELETE CASCADE | Parent queue |
| `patient_id` | `UUID` | NOT NULL, FK → `profiles.id` ON DELETE RESTRICT | Patient in the queue |
| `appointment_id` | `UUID` | NULLABLE, FK → `appointments.id` ON DELETE SET NULL | Linked appointment if type = APPOINTMENT |
| `queue_number` | `SMALLINT` | NOT NULL | Sequential number assigned at join time |
| `type` | `ENUM('APPOINTMENT','WALK_IN')` | NOT NULL | How the patient joined |
| `priority` | `SMALLINT` | NOT NULL DEFAULT `3` | 1 = Emergency, 2 = Appointment, 3 = Walk-in |
| `status` | `ENUM('WAITING','CALLED','IN_CONSULTATION','COMPLETED','SKIPPED','REMOVED')` | NOT NULL DEFAULT `'WAITING'` | Current status in the queue lifecycle |
| `joined_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | When the patient joined the queue |
| `called_at` | `TIMESTAMPTZ` | NULLABLE | When the patient was called |
| `completed_at` | `TIMESTAMPTZ` | NULLABLE | When the consultation was completed |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Last update timestamp |

```sql
CREATE TYPE queue_entry_type_enum AS ENUM ('APPOINTMENT', 'WALK_IN');
CREATE TYPE queue_entry_status_enum AS ENUM (
  'WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'REMOVED'
);

CREATE TABLE queue_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id       UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
  patient_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  queue_number   SMALLINT NOT NULL,
  type           queue_entry_type_enum NOT NULL,
  priority       SMALLINT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 3),
  status         queue_entry_status_enum NOT NULL DEFAULT 'WAITING',
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_at      TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (queue_id, queue_number)
);
```

---

### 10. notifications

Audit log and in-app notification inbox for all messages sent to users.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK DEFAULT `gen_random_uuid()` | Notification identifier |
| `user_id` | `UUID` | NOT NULL, FK → `auth.users.id` ON DELETE CASCADE | Recipient user |
| `type` | `ENUM(...)` | NOT NULL | Notification category (see below) |
| `title` | `TEXT` | NOT NULL | Push notification title |
| `body` | `TEXT` | NOT NULL | Push notification body text |
| `data` | `JSONB` | | Structured payload (e.g. `{ appointment_id, queue_id }`) |
| `is_read` | `BOOLEAN` | NOT NULL DEFAULT `false` | In-app read status |
| `sent_at` | `TIMESTAMPTZ` | | When FCM delivery was attempted |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT `now()` | Row creation timestamp |

Notification type enum values:

| Value | Trigger |
|---|---|
| `APPOINTMENT_CONFIRMED` | Appointment status changes to CONFIRMED |
| `APPOINTMENT_REMINDER` | Scheduled job, 24h before appointment |
| `QUEUE_JOINED` | Patient successfully joins a queue |
| `QUEUE_POSITION_UPDATE` | Patient's position drops to a configurable threshold (e.g. 3 ahead) |
| `CALLED_TO_CONSULTATION` | Queue entry status changes to CALLED |
| `DOCTOR_DELAYED` | Receptionist broadcasts a delay to the queue |
| `APPOINTMENT_CANCELLED` | Appointment status changes to CANCELLED |

```sql
CREATE TYPE notification_type_enum AS ENUM (
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_REMINDER',
  'QUEUE_JOINED',
  'QUEUE_POSITION_UPDATE',
  'CALLED_TO_CONSULTATION',
  'DOCTOR_DELAYED',
  'APPOINTMENT_CANCELLED'
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       notification_type_enum NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Relationships

| Relationship | Type | From | To | FK Column | Notes |
|---|---|---|---|---|---|
| Profile extends user | 1:1 | `profiles` | `auth.users` | `profiles.id` | Cascade delete removes profile when auth user is deleted |
| Staff belongs to clinic | N:1 | `clinic_staff` | `clinics` | `clinic_staff.clinic_id` | A clinic has many staff |
| Staff is a user | N:1 | `clinic_staff` | `auth.users` | `clinic_staff.user_id` | A user can be staff at multiple clinics |
| Doctor is staff | 1:1 | `doctors` | `clinic_staff` | `doctors.staff_id` | Only staff with role=DOCTOR have a doctors row |
| Doctor has schedules | 1:N | `doctor_schedules` | `doctors` | `doctor_schedules.doctor_id` | Multiple days/sessions per doctor |
| Doctor has time slots | 1:N | `time_slots` | `doctors` | `time_slots.doctor_id` | Generated from schedules |
| Appointment booked by patient | N:1 | `appointments` | `profiles` | `appointments.patient_id` | Patient has many appointments |
| Appointment for doctor | N:1 | `appointments` | `doctors` | `appointments.doctor_id` | |
| Appointment at clinic | N:1 | `appointments` | `clinics` | `appointments.clinic_id` | Denormalized for quick clinic-level queries |
| Appointment occupies slot | 1:1 | `appointments` | `time_slots` | `appointments.time_slot_id` | UNIQUE enforces one booking per slot |
| Queue at clinic | N:1 | `queues` | `clinics` | `queues.clinic_id` | |
| Queue for doctor | N:1 | `queues` | `doctors` | `queues.doctor_id` | |
| Queue entry in queue | N:1 | `queue_entries` | `queues` | `queue_entries.queue_id` | |
| Queue entry for patient | N:1 | `queue_entries` | `profiles` | `queue_entries.patient_id` | |
| Queue entry from appointment | 0..1:1 | `queue_entries` | `appointments` | `queue_entries.appointment_id` | NULL for walk-in entries |
| Notification for user | N:1 | `notifications` | `auth.users` | `notifications.user_id` | |

---

## Indexes

Performance indexes beyond primary and unique keys.

```sql
-- profiles
CREATE INDEX idx_profiles_phone ON profiles(phone_number);

-- clinics
CREATE INDEX idx_clinics_is_active ON clinics(is_active) WHERE is_active = true;
CREATE INDEX idx_clinics_state ON clinics(state);
-- Geospatial (if PostGIS extension is enabled)
-- CREATE INDEX idx_clinics_location ON clinics USING GIST(ST_MakePoint(longitude, latitude));

-- clinic_staff
CREATE INDEX idx_clinic_staff_user_id ON clinic_staff(user_id);
CREATE INDEX idx_clinic_staff_clinic_id ON clinic_staff(clinic_id);
CREATE INDEX idx_clinic_staff_active ON clinic_staff(clinic_id, is_active) WHERE is_active = true;

-- doctors
CREATE INDEX idx_doctors_staff_id ON doctors(staff_id);

-- doctor_schedules
CREATE INDEX idx_doctor_schedules_doctor_day ON doctor_schedules(doctor_id, day_of_week);

-- time_slots
CREATE INDEX idx_time_slots_doctor_date ON time_slots(doctor_id, slot_date);
CREATE INDEX idx_time_slots_available ON time_slots(doctor_id, slot_date, status)
  WHERE status = 'AVAILABLE';

-- appointments
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_clinic_date ON appointments(clinic_id, appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- queues
CREATE INDEX idx_queues_clinic_date ON queues(clinic_id, queue_date);
CREATE INDEX idx_queues_active ON queues(clinic_id, queue_date, is_active)
  WHERE is_active = true;

-- queue_entries  (most frequently queried table)
CREATE INDEX idx_queue_entries_queue_id ON queue_entries(queue_id);
CREATE INDEX idx_queue_entries_patient ON queue_entries(patient_id);
CREATE INDEX idx_queue_entries_queue_status ON queue_entries(queue_id, status);
CREATE INDEX idx_queue_entries_waiting ON queue_entries(queue_id, priority, joined_at)
  WHERE status = 'WAITING';

-- notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
  WHERE is_read = false;
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
```

---

## RLS Policy Summary

All tables have RLS enabled (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`). The policies below are described in plain language; see `supabase/migrations/` for the full SQL.

### Helper Functions

```sql
-- Returns the clinic_id for the currently authenticated staff user
CREATE OR REPLACE FUNCTION auth.clinic_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid;
$$ LANGUAGE sql STABLE;

-- Returns the staff role for the currently authenticated user
CREATE OR REPLACE FUNCTION auth.staff_role() RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'staff_role';
$$ LANGUAGE sql STABLE;
```

### Per-Table RLS Policies

| Table | Policy | Role | Condition |
|---|---|---|---|
| `profiles` | SELECT own | `authenticated` | `id = auth.uid()` |
| `profiles` | UPDATE own | `authenticated` | `id = auth.uid()` |
| `profiles` | SELECT for clinic staff | `authenticated` | Patient has an appointment or queue entry at `auth.clinic_id()` |
| `clinics` | SELECT active | `anon`, `authenticated` | `is_active = true` |
| `clinics` | ALL own clinic | `authenticated` | `id = auth.clinic_id()` AND `auth.staff_role() = 'ADMIN'` |
| `clinic_staff` | SELECT own clinic | `authenticated` | `clinic_id = auth.clinic_id()` |
| `clinic_staff` | ALL | `authenticated` | `clinic_id = auth.clinic_id()` AND `auth.staff_role() = 'ADMIN'` |
| `doctors` | SELECT (active) | `anon`, `authenticated` | Via `clinic_staff` join — public read |
| `doctors` | UPDATE own | `authenticated` | `staff_id` references the user's `clinic_staff.id` |
| `doctors` | ALL | `authenticated` | `auth.staff_role() = 'ADMIN'` AND same clinic |
| `doctor_schedules` | SELECT | `authenticated` | Doctor belongs to `auth.clinic_id()` or patient (public read) |
| `doctor_schedules` | ALL | `authenticated` | Doctor in same clinic AND `auth.staff_role() IN ('ADMIN','DOCTOR')` |
| `time_slots` | SELECT AVAILABLE | `authenticated` | `status = 'AVAILABLE'` |
| `time_slots` | ALL | `authenticated` | Doctor in `auth.clinic_id()` AND `auth.staff_role() IN ('ADMIN','RECEPTIONIST')` |
| `appointments` | SELECT own | `authenticated` | `patient_id = auth.uid()` |
| `appointments` | INSERT own | `authenticated` | `patient_id = auth.uid()` |
| `appointments` | UPDATE own (cancel only) | `authenticated` | `patient_id = auth.uid()` AND status transition to CANCELLED |
| `appointments` | ALL clinic | `authenticated` | `clinic_id = auth.clinic_id()` AND staff role |
| `queues` | SELECT | `authenticated` | `clinic_id = auth.clinic_id()` OR patient with active entry |
| `queues` | ALL | `authenticated` | `clinic_id = auth.clinic_id()` AND `auth.staff_role() IN ('ADMIN','RECEPTIONIST')` |
| `queue_entries` | SELECT own | `authenticated` | `patient_id = auth.uid()` |
| `queue_entries` | INSERT own | `authenticated` | `patient_id = auth.uid()` |
| `queue_entries` | ALL clinic | `authenticated` | Queue's `clinic_id = auth.clinic_id()` AND staff role |
| `notifications` | SELECT own | `authenticated` | `user_id = auth.uid()` |
| `notifications` | UPDATE own (mark read) | `authenticated` | `user_id = auth.uid()` |
| `notifications` | INSERT | `service_role` | Only Edge Functions can create notifications |
