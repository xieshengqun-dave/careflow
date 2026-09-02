-- =============================================================================
-- Phase 5.2 (part 1): Tighten profiles RLS — close the cross-clinic PII leak
--
-- Before: "profiles: clinic staff read" granted SELECT on EVERY profile to any
-- active staff member at ANY clinic (USING get_user_clinic_id() IS NOT NULL),
-- so one receptionist could read every patient on the platform.
--
-- After: staff can only read profiles of patients with a relationship to their
-- own clinic — an appointment there, or a queue entry in one of its queues.
-- Guest/walk-in profiles are covered the moment join_queue inserts their entry.
--
-- The walk-in / New Appointment "find patient by phone" flow must still find
-- patients who have never visited this clinic. That is preserved via
-- staff_lookup_patient_by_phone(): exact-match lookup only (no browsing),
-- staff-only, returns just (id, full_name), and writes an activity_log row so
-- every cross-clinic lookup is audited (Phase 5.3 requirement).
--
-- Platform console is unaffected: it uses the service_role admin client.
-- Patients still read/update their own row via the untouched owner policies.
-- =============================================================================

-- Does the calling staff member's clinic have a relationship with this
-- patient? SECURITY DEFINER so the check bypasses RLS on appointments/queues
-- (their policies reference other tables — evaluating them from inside a
-- profiles policy would recurse).
CREATE OR REPLACE FUNCTION public.staff_can_view_patient(p_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.patient_id = p_patient_id
      AND a.clinic_id = public.get_user_clinic_id()
  ) OR EXISTS (
    SELECT 1
    FROM queue_entries qe
    JOIN queues q ON q.id = qe.queue_id
    WHERE qe.patient_id = p_patient_id
      AND q.clinic_id = public.get_user_clinic_id()
  );
$$;

-- Same policy name as 20260618000002 so exactly one policy governs staff
-- reads. (Re-running that old migration would recreate the permissive
-- version — run this file again afterwards if you ever do that.)
DROP POLICY IF EXISTS "profiles: clinic staff read" ON profiles;
CREATE POLICY "profiles: clinic staff read"
  ON profiles FOR SELECT
  USING (public.staff_can_view_patient(id));

-- =============================================================================
-- staff_lookup_patient_by_phone: the one sanctioned path to a profile with no
-- prior relationship to the caller's clinic. Exact phone match, minimal
-- fields, audited. Empty result = not found (caller shows "ask them to
-- register" / proceeds to create a walk-in profile).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.staff_lookup_patient_by_phone(p_phone TEXT)
RETURNS TABLE (id UUID, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id UUID;
  v_patient   profiles%ROWTYPE;
BEGIN
  v_clinic_id := public.get_user_clinic_id();
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'NOT_CLINIC_STAFF';
  END IF;

  SELECT p.* INTO v_patient
  FROM profiles p
  WHERE p.phone_number = p_phone
  ORDER BY p.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM public.log_activity(
    v_clinic_id,
    'PATIENT_PHONE_LOOKUP',
    'profile',
    v_patient.id,
    jsonb_build_object('phone', p_phone)
  );

  RETURN QUERY SELECT v_patient.id, v_patient.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_lookup_patient_by_phone(TEXT) TO authenticated;
