-- Doctor break periods (lunch, prayer, etc.) per day of week
CREATE TABLE IF NOT EXISTS doctor_breaks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  label       TEXT NOT NULL DEFAULT 'Break',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_breaks_doctor_day
  ON doctor_breaks (doctor_id, day_of_week)
  WHERE is_active = TRUE;
