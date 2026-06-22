-- =============================================================================
-- CareFlow RLS Helper Functions & Policies
-- Migration: 20260618000001_rls_policies
-- Note: Helper functions live in public schema — auth schema is read-only on
--       Supabase cloud for migration scripts.
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
CREATE POLICY "profiles: owner read"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: owner insert"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles: clinic staff read"
  ON profiles FOR SELECT USING (public.get_user_clinic_id() IS NOT NULL);

-- ── clinics ───────────────────────────────────────────────────────────────────
CREATE POLICY "clinics: public read active"
  ON clinics FOR SELECT USING (is_active = TRUE);

CREATE POLICY "clinics: admin update"
  ON clinics FOR UPDATE USING (
    public.get_user_clinic_id() = id AND public.get_user_staff_role() = 'ADMIN'
  );

-- ── clinic_staff ──────────────────────────────────────────────────────────────
CREATE POLICY "clinic_staff: same-clinic read"
  ON clinic_staff FOR SELECT USING (public.is_clinic_staff(clinic_id));

CREATE POLICY "clinic_staff: admin manage"
  ON clinic_staff FOR ALL USING (
    public.get_user_clinic_id() = clinic_id AND public.get_user_staff_role() = 'ADMIN'
  );

-- ── doctors ───────────────────────────────────────────────────────────────────
CREATE POLICY "doctors: public read"
  ON doctors FOR SELECT USING (TRUE);

CREATE POLICY "doctors: admin manage"
  ON doctors FOR ALL USING (public.get_user_staff_role() = 'ADMIN');

-- ── doctor_schedules ──────────────────────────────────────────────────────────
CREATE POLICY "doctor_schedules: public read active"
  ON doctor_schedules FOR SELECT USING (is_active = TRUE);

CREATE POLICY "doctor_schedules: admin manage"
  ON doctor_schedules FOR ALL USING (public.get_user_staff_role() = 'ADMIN');

-- ── time_slots ────────────────────────────────────────────────────────────────
CREATE POLICY "time_slots: public read"
  ON time_slots FOR SELECT USING (TRUE);

CREATE POLICY "time_slots: staff manage"
  ON time_slots FOR ALL USING (public.get_user_clinic_id() IS NOT NULL);

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
  ON appointments FOR SELECT USING (public.is_clinic_staff(clinic_id));

CREATE POLICY "appointments: staff update"
  ON appointments FOR UPDATE USING (public.is_clinic_staff(clinic_id));

-- ── queues ────────────────────────────────────────────────────────────────────
CREATE POLICY "queues: public read active"
  ON queues FOR SELECT USING (is_active = TRUE);

CREATE POLICY "queues: staff manage"
  ON queues FOR ALL USING (public.is_clinic_staff(clinic_id));

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
