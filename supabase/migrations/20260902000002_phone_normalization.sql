-- =============================================================================
-- Phase 5.1 support: normalize patient phone formats
--
-- Supabase stores auth.users.phone WITHOUT the leading '+' (e.g.
-- "60123456789"), so handle_new_user() was writing that bare format into
-- profiles.phone_number. Every staff-side lookup (walk-in, New Appointment,
-- quick check-in) searches with a '+'-prefixed number, so patients who
-- registered through the app via phone OTP could never be found by phone.
--
-- Three fixes:
--   1. handle_new_user() now stores '+'-prefixed E.164.
--   2. One-time backfill of existing bare-digit rows (skipping any that would
--      collide with an already-normalized duplicate).
--   3. staff_lookup_patient_by_phone() compares digits-only, so any residual
--      format drift (spaces, dashes, missing '+') still matches.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create a minimal profile for phone (OTP) signups
  IF NEW.phone IS NOT NULL AND NEW.email IS NULL THEN
    INSERT INTO public.profiles (id, full_name, phone_number)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      CASE WHEN NEW.phone LIKE '+%' THEN NEW.phone ELSE '+' || NEW.phone END
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE profiles p
SET phone_number = '+' || p.phone_number
WHERE p.phone_number ~ '^[0-9]+$'
  AND NOT EXISTS (
    SELECT 1 FROM profiles q WHERE q.phone_number = '+' || p.phone_number
  );

-- Re-declared from 20260902000001 with a digits-only comparison; behaviour
-- (staff-only, minimal fields, activity_log audit) is unchanged.
CREATE OR REPLACE FUNCTION public.staff_lookup_patient_by_phone(p_phone TEXT)
RETURNS TABLE (id UUID, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id UUID;
  v_patient   profiles%ROWTYPE;
  v_digits    TEXT;
BEGIN
  v_clinic_id := public.get_user_clinic_id();
  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'NOT_CLINIC_STAFF';
  END IF;

  v_digits := regexp_replace(p_phone, '\D', '', 'g');
  IF v_digits = '' THEN
    RETURN;
  END IF;

  SELECT p.* INTO v_patient
  FROM profiles p
  WHERE regexp_replace(p.phone_number, '\D', '', 'g') = v_digits
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
