-- Allow multiple time blocks per day per doctor
-- Replaces UNIQUE(doctor_id, day_of_week) with an overlap-prevention constraint

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE doctor_schedules
  DROP CONSTRAINT IF EXISTS doctor_schedules_doctor_id_day_of_week_key;

ALTER TABLE doctor_schedules
  ADD CONSTRAINT doctor_schedules_no_overlap
  EXCLUDE USING gist (
    doctor_id   WITH =,
    day_of_week WITH =,
    int4range(
      (EXTRACT(HOUR FROM start_time)::int * 60 + EXTRACT(MINUTE FROM start_time)::int),
      (EXTRACT(HOUR FROM end_time)::int   * 60 + EXTRACT(MINUTE FROM end_time)::int)
    ) WITH &&
  ) WHERE (is_active = TRUE);

ALTER TABLE clinic_staff ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
ALTER TABLE clinic_staff ADD COLUMN IF NOT EXISTS email     TEXT;
