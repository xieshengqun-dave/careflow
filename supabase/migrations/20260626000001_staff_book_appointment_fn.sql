-- =============================================================================
-- Staff-side appointment booking: clinic staff books on behalf of a patient.
-- Same atomic slot-claim logic as book_appointment(), but the auth check
-- verifies the caller is active clinic staff rather than the patient.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.staff_book_appointment(
  p_patient_id UUID,
  p_doctor_id  UUID,
  p_clinic_id  UUID,
  p_slot_date  DATE,
  p_start_time TIME,
  p_end_time   TIME,
  p_notes      TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id        UUID;
  v_appointment_id UUID;
BEGIN
  -- Only active clinic staff of this clinic may book on behalf of patients
  IF NOT EXISTS (
    SELECT 1 FROM clinic_staff
    WHERE user_id = auth.uid()
      AND clinic_id = p_clinic_id
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Only active clinic staff can book appointments for patients';
  END IF;

  -- Verify patient exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_patient_id) THEN
    RAISE EXCEPTION 'PATIENT_NOT_FOUND'
      USING HINT = 'No patient found with this ID';
  END IF;

  -- Claim an existing AVAILABLE slot (row-level lock prevents races)
  WITH claim AS (
    UPDATE time_slots
    SET status = 'BOOKED'
    WHERE doctor_id  = p_doctor_id
      AND slot_date  = p_slot_date
      AND start_time = p_start_time
      AND status     = 'AVAILABLE'
    RETURNING id
  )
  SELECT id INTO v_slot_id FROM claim;

  -- If no existing slot, create one on demand
  IF v_slot_id IS NULL THEN
    BEGIN
      INSERT INTO time_slots (doctor_id, slot_date, start_time, end_time, status)
      VALUES (p_doctor_id, p_slot_date, p_start_time, p_end_time, 'BOOKED')
      RETURNING id INTO v_slot_id;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'SLOT_UNAVAILABLE'
        USING HINT = 'This time slot was just booked by someone else';
    END;
  END IF;

  IF v_slot_id IS NULL THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE'
      USING HINT = 'This time slot is no longer available';
  END IF;

  INSERT INTO appointments (
    patient_id, doctor_id, clinic_id, time_slot_id, appointment_date,
    status, notes
  )
  VALUES (
    p_patient_id, p_doctor_id, p_clinic_id, v_slot_id, p_slot_date,
    'CONFIRMED', p_notes
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_book_appointment TO authenticated;
