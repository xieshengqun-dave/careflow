-- =============================================================================
-- Atomic queue join: allocates the next queue_number under a row lock on the
-- queues counter, then inserts the entry — closes the read-then-insert race
-- between concurrent self-joins / walk-ins.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.join_queue(
  p_queue_id   UUID,
  p_type       queue_entry_type,
  p_priority   SMALLINT,
  p_patient_id UUID DEFAULT NULL
) RETURNS TABLE (id UUID, queue_number SMALLINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id  UUID;
  v_current     SMALLINT;
  v_next_number SMALLINT;
BEGIN
  -- Patients self-joining omit p_patient_id and rely on auth.uid().
  v_patient_id := COALESCE(p_patient_id, auth.uid());

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED'
      USING HINT = 'No patient to join the queue with';
  END IF;

  -- Caller must be the patient themselves, or active staff of the queue's clinic
  -- (covers staff-driven walk-ins and check-ins on behalf of a patient).
  IF NOT (
    auth.uid() = v_patient_id
    OR EXISTS (
      SELECT 1 FROM queues q
      JOIN clinic_staff cs ON cs.clinic_id = q.clinic_id
      WHERE q.id = p_queue_id AND cs.user_id = auth.uid() AND cs.is_active = TRUE
    )
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Cannot join a queue on behalf of another patient';
  END IF;

  IF EXISTS (
    SELECT 1 FROM queue_entries
    WHERE queue_id = p_queue_id AND patient_id = v_patient_id
      AND status IN ('WAITING', 'CALLED', 'IN_CONSULTATION')
  ) THEN
    RAISE EXCEPTION 'ALREADY_IN_QUEUE'
      USING HINT = 'This patient is already in this queue';
  END IF;

  -- Lock the queue row so concurrent joins serialize on the counter.
  SELECT current_number INTO v_current
  FROM queues
  WHERE id = p_queue_id AND is_active = TRUE
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'QUEUE_NOT_FOUND'
      USING HINT = 'Queue is not open';
  END IF;

  v_next_number := v_current + 1;
  UPDATE queues SET current_number = v_next_number WHERE id = p_queue_id;

  RETURN QUERY
  INSERT INTO queue_entries (queue_id, patient_id, queue_number, type, priority, status, joined_at)
  VALUES (p_queue_id, v_patient_id, v_next_number, p_type, p_priority, 'WAITING', NOW())
  RETURNING queue_entries.id, queue_entries.queue_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_queue TO authenticated;
