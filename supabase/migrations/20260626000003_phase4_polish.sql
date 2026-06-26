-- =============================================================================
-- Phase 4 — Polish / data quality
-- =============================================================================

-- 4.2 — PENDING enum documentation
-- PENDING was added to appointment_status for a future payment/pre-auth flow
-- (e.g. "booking pending payment confirmation before it's confirmed").
-- No code currently creates PENDING appointments; bookings land in CONFIRMED
-- directly. The value is retained so the enum type stays stable until a payment
-- integration is designed. Do NOT remove it without:
--   1. Auditing every client (mobile app, web app, RLS policies) that filters
--      on appointment_status to confirm none reference PENDING.
--   2. Running a migration to ALTER TYPE ... RENAME VALUE or DROP VALUE (PG 14+
--      supports DROP VALUE only if no existing rows use it).
COMMENT ON TYPE public.appointment_status IS
  'PENDING is reserved for a future payment-gated booking flow. '
  'Bookings are created CONFIRMED directly. '
  'Do not remove PENDING without auditing all clients that filter on this type.';

-- =============================================================================
-- 4.3b — Corrected generate_rolling_slots
--
-- The Phase 3 version had a wrong JOIN: `clinic_staff cs ON cs.id = d.id`.
-- In the schema, doctors.id is its OWN UUID (gen_random_uuid()), not the
-- clinic_staff row id. The link is doctors.staff_id -> clinic_staff.id.
-- This replacement uses the correct join.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_rolling_slots(p_days INTEGER DEFAULT 14)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc    RECORD;
  v_offset INTEGER;
  v_total  INTEGER := 0;
BEGIN
  FOR v_doc IN
    SELECT d.id AS doctor_id
    FROM   doctors      d
    JOIN   clinic_staff cs ON cs.id      = d.staff_id  -- doctors.staff_id -> clinic_staff.id
    JOIN   clinics      c  ON c.id       = cs.clinic_id
    WHERE  cs.is_active = TRUE
      AND  c.is_active  = TRUE
  LOOP
    FOR v_offset IN 0 .. (p_days - 1) LOOP
      v_total := v_total + public.generate_slots_for_doctor_date(
        v_doc.doctor_id,
        CURRENT_DATE + v_offset
      );
    END LOOP;
  END LOOP;

  RETURN v_total;
END;
$$;
