-- =============================================================================
-- Reschedule an existing appointment: atomically frees the old slot and
-- claims a new one. Safer than separate cancel + book calls.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reschedule_appointment(
  p_appointment_id UUID,
  p_new_slot_date  DATE,
  p_new_start_time TIME,
  p_new_end_time   TIME
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt          RECORD;
  v_old_slot_id   UUID;
  v_new_slot_id   UUID;
  v_new_appt_id   UUID;
BEGIN
  SELECT id, patient_id, doctor_id, clinic_id, time_slot_id, status
  INTO v_appt
  FROM appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF v_appt.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND'
      USING HINT = 'Appointment does not exist';
  END IF;

  -- Only the owning patient may reschedule
  IF v_appt.patient_id != auth.uid() THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Only the patient who made this appointment can reschedule it';
  END IF;

  IF v_appt.status NOT IN ('PENDING', 'CONFIRMED') THEN
    RAISE EXCEPTION 'INVALID_STATUS'
      USING HINT = 'Only pending or confirmed appointments can be rescheduled';
  END IF;

  v_old_slot_id := v_appt.time_slot_id;

  -- Claim the new slot first (fail fast if unavailable)
  WITH claim AS (
    UPDATE time_slots
    SET status = 'BOOKED'
    WHERE doctor_id  = v_appt.doctor_id
      AND slot_date  = p_new_slot_date
      AND start_time = p_new_start_time
      AND status     = 'AVAILABLE'
    RETURNING id
  )
  SELECT id INTO v_new_slot_id FROM claim;

  IF v_new_slot_id IS NULL THEN
    BEGIN
      INSERT INTO time_slots (doctor_id, slot_date, start_time, end_time, status)
      VALUES (v_appt.doctor_id, p_new_slot_date, p_new_start_time, p_new_end_time, 'BOOKED')
      RETURNING id INTO v_new_slot_id;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'SLOT_UNAVAILABLE'
        USING HINT = 'This time slot was just taken. Please choose another.';
    END;
  END IF;

  IF v_new_slot_id IS NULL THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE'
      USING HINT = 'This time slot is no longer available';
  END IF;

  -- Cancel the old appointment
  UPDATE appointments SET status = 'CANCELLED' WHERE id = p_appointment_id;

  -- Free the old slot
  IF v_old_slot_id IS NOT NULL THEN
    UPDATE time_slots SET status = 'AVAILABLE' WHERE id = v_old_slot_id;
  END IF;

  -- Create the new appointment
  INSERT INTO appointments (
    patient_id, doctor_id, clinic_id, time_slot_id, appointment_date, status
  )
  VALUES (
    v_appt.patient_id, v_appt.doctor_id, v_appt.clinic_id,
    v_new_slot_id, p_new_slot_date, 'CONFIRMED'
  )
  RETURNING id INTO v_new_appt_id;

  RETURN v_new_appt_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reschedule_appointment TO authenticated;
