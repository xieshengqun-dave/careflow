-- =============================================================================
-- Atomic appointment cancellation: frees the time slot and drops any active
-- queue entry tied to the appointment, all in one transaction.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cancel_appointment(p_appointment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt RECORD;
BEGIN
  SELECT id, patient_id, clinic_id, time_slot_id, status
  INTO v_appt
  FROM appointments
  WHERE id = p_appointment_id
  FOR UPDATE;

  IF v_appt.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND'
      USING HINT = 'Appointment does not exist';
  END IF;

  -- Caller must be the owning patient or an active staff member of the clinic.
  IF NOT (
    auth.uid() = v_appt.patient_id
    OR EXISTS (
      SELECT 1 FROM clinic_staff
      WHERE user_id = auth.uid() AND clinic_id = v_appt.clinic_id AND is_active = TRUE
    )
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Not allowed to cancel this appointment';
  END IF;

  IF v_appt.status NOT IN ('PENDING', 'CONFIRMED', 'CHECKED_IN') THEN
    RAISE EXCEPTION 'INVALID_STATUS'
      USING HINT = 'Only pending, confirmed, or checked-in appointments can be cancelled';
  END IF;

  UPDATE appointments SET status = 'CANCELLED' WHERE id = p_appointment_id;

  -- Free the slot so it can be rebooked. NO_SHOW deliberately does NOT go through
  -- this function: the appointment time has already passed, so the slot stays
  -- BOOKED (it's no longer reasonable to rebook it) while the appointment still
  -- reports as NO_SHOW for analytics. See markNoShow() in actions/appointments.ts.
  UPDATE time_slots SET status = 'AVAILABLE' WHERE id = v_appt.time_slot_id;

  -- If the patient had already checked in, drop them from today's queue too.
  UPDATE queue_entries
  SET status = 'REMOVED'
  WHERE appointment_id = p_appointment_id
    AND status IN ('WAITING', 'CALLED', 'IN_CONSULTATION');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_appointment TO authenticated;
