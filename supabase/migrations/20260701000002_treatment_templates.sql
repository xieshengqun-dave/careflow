-- Treatment Templates
-- Configurable per-clinic durations for each treatment type.
-- clinic_id IS NULL = global system default (read-only for staff).
-- clinic_id IS NOT NULL = clinic override/custom (writable by clinic_admin).

CREATE TABLE IF NOT EXISTS treatment_templates (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            UUID        REFERENCES clinics(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  duration_minutes     INT         NOT NULL CHECK (duration_minutes > 0),
  display_order        SMALLINT    NOT NULL DEFAULT 0,
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  -- AI hook: future model predictions populate these columns.
  -- getEstimatedDuration() will prefer ai_suggested_minutes when confidence >= 0.7.
  ai_suggested_minutes INT,
  ai_confidence        NUMERIC(4,3) CHECK (ai_confidence BETWEEN 0 AND 1),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One entry per treatment per clinic (NULL clinic = global defaults)
CREATE UNIQUE INDEX IF NOT EXISTS treatment_templates_clinic_name_idx
  ON treatment_templates(clinic_id, name)
  WHERE clinic_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS treatment_templates_global_name_idx
  ON treatment_templates(name)
  WHERE clinic_id IS NULL;

-- RLS
ALTER TABLE treatment_templates ENABLE ROW LEVEL SECURITY;

-- All clinic staff can read: their clinic's rows + global defaults
CREATE POLICY "staff_read_treatment_templates" ON treatment_templates
  FOR SELECT USING (
    clinic_id IS NULL
    OR clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid
  );

-- Only clinic_admin can insert/update/delete their clinic's rows
CREATE POLICY "admin_write_treatment_templates" ON treatment_templates
  FOR ALL USING (
    clinic_id IS NOT NULL
    AND clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid
  )
  WITH CHECK (
    clinic_id IS NOT NULL
    AND clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid
  );

-- Global seed defaults (clinic_id IS NULL — service_role only can modify)
INSERT INTO treatment_templates (name, duration_minutes, display_order) VALUES
  ('Consultation',  15,  0),
  ('Scaling',       30,  1),
  ('Filling',       30,  2),
  ('Extraction',    45,  3),
  ('Crown',         60,  4),
  ('Whitening',     60,  5),
  ('Root Canal',    90,  6),
  ('Implant',      120,  7)
ON CONFLICT DO NOTHING;
