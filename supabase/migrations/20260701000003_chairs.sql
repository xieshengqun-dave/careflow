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

-- Clinic staff can read their clinic's chairs
CREATE POLICY IF NOT EXISTS "chairs_read_own_clinic"
  ON chairs FOR SELECT
  USING (clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid);

-- Clinic staff can update chair status (receptionist marks clean, etc.)
CREATE POLICY IF NOT EXISTS "chairs_update_own_clinic"
  ON chairs FOR UPDATE
  USING (clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid);

-- Clinic admin can insert / manage chairs
CREATE POLICY IF NOT EXISTS "chairs_insert_own_clinic"
  ON chairs FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid);

-- Seed 3 chairs for CareFlow Family Clinic
INSERT INTO chairs (clinic_id, name, display_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Chair 1', 1),
  ('a1000000-0000-0000-0000-000000000001', 'Chair 2', 2),
  ('a1000000-0000-0000-0000-000000000001', 'Chair 3', 3)
ON CONFLICT DO NOTHING;
