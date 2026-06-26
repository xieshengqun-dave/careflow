-- =============================================================================
-- CareFlow RLS Helper Functions & Policies
-- Migration: 20260618000001_rls_policies
-- Note: Helper functions live in public schema — auth schema is read-only on
--       Supabase cloud for migration scripts.
--
-- Idempotency: This migration re-creates RLS policies that were first defined
-- in 000000 (using auth.* helpers) to use public.* helpers instead. It uses
-- DROP POLICY IF EXISTS before each CREATE POLICY so a clean `supabase db reset`
-- doesn't fail with "policy already exists". Functions use CREATE OR REPLACE.
-- =============================================================================

-- =============================================================================
-- Helper Functions (public schema, SECURITY DEFINER)
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
-- RLS Policies
-- =============================================================================

-- ── profiles ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles: owner read"       ON profiles;
DROP POLICY IF EXISTS "profiles: owner insert"     ON profiles;
DROP POLICY IF EXISTS "profiles: owner update"     ON profiles;
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
DROP POLICY IF EXISTS "doctors: public read"   ON doctors;
DROP POLICY IF EXISTS "doctors: admin manage"  ON doctors;

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
