-- =============================================================================
-- Check-in now actually puts the appointment into today's queue at priority 2
-- (emergency=1, appointment=2, walk-in=3), instead of just flipping status.
-- Opens the doctor's queue for the day if one isn't open yet.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_in_appointment(p_appointment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt RECORD;
  v_queue_id UUID;
  v_current SMALLINT;
  v_next_number SMALLINT;
  v_existing_entry UUID;
  v_entry_id UUID;
BEGIN
  SELECT id, patient_id, doctor_id, clinic_id, appointment_date, status
  INTO v_appt
  FROM appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF v_appt.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND'
      USING HINT = 'Appointment does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM clinic_staff
    WHERE user_id = auth.uid() AND clinic_id = v_appt.clinic_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Only clinic staff can check in appointments';
  END IF;

  -- Idempotent: a double-click after a successful check-in just returns the
  -- existing active entry instead of erroring or creating a duplicate.
  IF v_appt.status = 'CHECKED_IN' THEN
    SELECT id INTO v_existing_entry
    FROM queue_entries
    WHERE appointment_id = p_appointment_id
      AND status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')
    LIMIT 1;

    IF v_existing_entry IS NOT NULL THEN
      RETURN v_existing_entry;
    END IF;
    -- Status says CHECKED_IN but there's no active entry (e.g. it was removed) —
    -- fall through and create one.
  ELSIF v_appt.status != 'CONFIRMED' THEN
    RAISE EXCEPTION 'INVALID_STATUS'
      USING HINT = 'Only confirmed appointments can be checked in';
  END IF;

  -- Find (and lock) or open today's queue for this doctor.
  SELECT id, current_number INTO v_queue_id, v_current
  FROM queues
  WHERE doctor_id = v_appt.doctor_id AND queue_date = v_appt.appointment_date
  FOR UPDATE;

  IF v_queue_id IS NULL THEN
    INSERT INTO queues (clinic_id, doctor_id, queue_date, is_active, current_number)
    VALUES (v_appt.clinic_id, v_appt.doctor_id, v_appt.appointment_date, TRUE, 0)
    RETURNING id, current_number INTO v_queue_id, v_current;
  END IF;

  v_next_number := v_current + 1;
  UPDATE queues SET current_number = v_next_number, is_active = TRUE WHERE id = v_queue_id;

  INSERT INTO queue_entries (
    queue_id, patient_id, appointment_id, queue_number, type, priority, status, joined_at
  )
  VALUES (
    v_queue_id, v_appt.patient_id, p_appointment_id, v_next_number, 'APPOINTMENT', 2, 'WAITING', NOW()
  )
  RETURNING id INTO v_entry_id;

  UPDATE appointments SET status = 'CHECKED_IN' WHERE id = p_appointment_id;

  RETURN v_entry_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_appointment TO authenticated;

-- Backstop against double check-in races even if the idempotency check above
-- somehow gets bypassed (e.g. two near-simultaneous clicks).
CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_entries_active_appointment
  ON queue_entries(appointment_id)
  WHERE appointment_id IS NOT NULL AND status IN ('WAITING', 'CALLED', 'IN_CONSULTATION');
