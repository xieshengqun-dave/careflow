-- =============================================================================
-- Chair Management
-- Each clinic has physical chairs. Queue entries are assigned to a chair when
-- the patient is called. Chairs move: AVAILABLE → OCCUPIED → CLEANING → AVAILABLE.
-- =============================================================================

-- Status enum
DO $$ BEGIN
  CREATE TYPE chair_status AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'CLEANING',
    'RESERVED',
    'OUT_OF_SERVICE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Chairs table
CREATE TABLE IF NOT EXISTS chairs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          chair_status NOT NULL DEFAULT 'AVAILABLE',
  display_order   SMALLINT NOT NULL DEFAULT 0,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS chairs_clinic_name_idx ON chairs(clinic_id, name) WHERE is_active = true;

-- Add chair assignment to queue_entries (nullable — no regression on existing rows)
ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS chair_id UUID REFERENCES chairs(id) ON DELETE SET NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_chairs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS chairs_updated_at ON chairs;
CREATE TRIGGER chairs_updated_at
  BEFORE UPDATE ON chairs
  FOR EACH ROW EXECUTE FUNCTION set_chairs_updated_at();

-- RLS
ALTER TABLE chairs ENABLE ROW LEVEL SECURITY;

-- NOTE: CREATE POLICY has no IF NOT EXISTS in Postgres — the original version
-- of this file used it and aborted with a syntax error (rolling back the whole
-- migration). DROP + CREATE is the idempotent pattern used repo-wide.
-- Policies use is_clinic_staff() like every other clinic-scoped table; staff
-- JWTs cannot be relied on to carry app_metadata.clinic_id (see Session 7).

DROP POLICY IF EXISTS "chairs_read_own_clinic" ON chairs;
CREATE POLICY "chairs_read_own_clinic"
  ON chairs FOR SELECT
  USING (public.is_clinic_staff(clinic_id));

DROP POLICY IF EXISTS "chairs_update_own_clinic" ON chairs;
CREATE POLICY "chairs_update_own_clinic"
  ON chairs FOR UPDATE
  USING (public.is_clinic_staff(clinic_id));

DROP POLICY IF EXISTS "chairs_insert_own_clinic" ON chairs;
CREATE POLICY "chairs_insert_own_clinic"
  ON chairs FOR INSERT
  WITH CHECK (public.is_clinic_staff(clinic_id));

-- Seed 3 chairs for every clinic that has none yet
INSERT INTO chairs (clinic_id, name, display_order)
SELECT c.id, 'Chair ' || n, n
FROM clinics c
CROSS JOIN generate_series(1, 3) AS n
WHERE NOT EXISTS (SELECT 1 FROM chairs ch WHERE ch.clinic_id = c.id);
