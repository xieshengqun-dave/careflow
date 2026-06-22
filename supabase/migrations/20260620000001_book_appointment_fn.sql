-- =============================================================================
-- Atomic appointment booking with double-booking prevention
-- Uses row-level locking + unique constraint to handle concurrent requests
-- =============================================================================

CREATE OR REPLACE FUNCTION public.book_appointment(
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
  -- Patients may only book for themselves
  IF p_patient_id != auth.uid() THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Cannot book an appointment on behalf of another patient';
  END IF;

  -- Step 1: Try to claim an existing AVAILABLE slot (row-level lock prevents races)
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

  -- Step 2: If no existing slot, try to create one (handles on-demand slot generation)
  IF v_slot_id IS NULL THEN
    BEGIN
      INSERT INTO time_slots (doctor_id, slot_date, start_time, end_time, status)
      VALUES (p_doctor_id, p_slot_date, p_start_time, p_end_time, 'BOOKED')
      RETURNING id INTO v_slot_id;
    EXCEPTION WHEN unique_violation THEN
      -- Another transaction just claimed or created this slot
      RAISE EXCEPTION 'SLOT_UNAVAILABLE'
        USING HINT = 'This time slot was just booked by someone else';
    END;
  END IF;

  -- Final guard (slot existed but was BOOKED/BREAK/BLOCKED)
  IF v_slot_id IS NULL THEN
    RAISE EXCEPTION 'SLOT_UNAVAILABLE'
      USING HINT = 'This time slot is no longer available';
  END IF;

  -- Step 3: Create appointment (time_slot_id UNIQUE prevents any duplicate)
  INSERT INTO appointments (
    patient_id, doctor_id, clinic_id, time_slot_id,
    status, appointment_date, notes
  )
  VALUES (
    p_patient_id, p_doctor_id, p_clinic_id, v_slot_id,
    'CONFIRMED', p_slot_date, p_notes
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_appointment TO authenticated;

-- =============================================================================
-- Public read policies needed for patient browsing (clinics, doctors, slots)
-- =============================================================================

ALTER TABLE clinics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Clinics: public read of active clinics
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clinics' AND policyname='clinics: public read') THEN
    CREATE POLICY "clinics: public read"
      ON clinics FOR SELECT USING (is_active = TRUE);
  END IF;

  -- Doctors: public read (patients need to browse doctors)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctors' AND policyname='doctors: public read') THEN
    CREATE POLICY "doctors: public read"
      ON doctors FOR SELECT USING (TRUE);
  END IF;

  -- clinic_staff: public read of active staff (patients need doctor names)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clinic_staff' AND policyname='clinic_staff: public read active') THEN
    CREATE POLICY "clinic_staff: public read active"
      ON clinic_staff FOR SELECT USING (is_active = TRUE);
  END IF;

  -- Doctor schedules: public read of active schedules
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='doctor_schedules' AND policyname='doctor_schedules: public read') THEN
    CREATE POLICY "doctor_schedules: public read"
      ON doctor_schedules FOR SELECT USING (is_active = TRUE);
  END IF;

  -- Time slots: public read (patients see availability)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='time_slots' AND policyname='time_slots: public read') THEN
    CREATE POLICY "time_slots: public read"
      ON time_slots FOR SELECT USING (TRUE);
  END IF;
END $$;
