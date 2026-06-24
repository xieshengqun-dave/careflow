-- Fix: cancelling an appointment fails with
-- "new row violates row-level security policy for table appointments".
--
-- The original "appointments: patient cancel" UPDATE policy only specified
-- USING (...). Postgres defaults WITH CHECK to the same expression as USING
-- when none is given, so the *post-update* row was also required to have
-- status IN ('PENDING', 'CONFIRMED') -- which is never true once the patient
-- cancels (status becomes 'CANCELLED'). USING should gate which rows can be
-- targeted; WITH CHECK should only confirm the row still belongs to the
-- patient after the update.

DROP POLICY IF EXISTS "appointments: patient cancel" ON appointments;

CREATE POLICY "appointments: patient cancel"
  ON appointments FOR UPDATE
  USING (patient_id = auth.uid() AND status IN ('PENDING', 'CONFIRMED'))
  WITH CHECK (patient_id = auth.uid());
