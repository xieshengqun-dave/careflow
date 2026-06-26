-- =============================================================================
-- Phase 3.2 + 3.3 — Queue improvements: paused state + atomic requeue
-- =============================================================================

-- 3.2 — queues can be paused by staff without deactivating them.
-- When paused the receptionist has temporarily stopped calling patients;
-- wait estimates should reflect this.
ALTER TABLE queues ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE;

-- =============================================================================
-- 3.3 — requeue_entry: move a SKIPPED entry to the back of the queue.
--
-- Atomically:
--   1. Verifies caller is active clinic staff for the queue's clinic.
--   2. Verifies the entry is SKIPPED.
--   3. Locks the queues row to avoid a race on current_number.
--   4. Increments current_number and assigns it to the entry.
--   5. Sets status back to WAITING.
--
-- Returns the new queue_number.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.requeue_entry(p_entry_id UUID)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry   RECORD;
  v_next    SMALLINT;
BEGIN
  -- Fetch entry + queue in one shot, no lock yet (just to get clinic_id for auth check)
  SELECT qe.id, qe.queue_id, qe.status, q.clinic_id
  INTO   v_entry
  FROM   queue_entries qe
  JOIN   queues        q  ON q.id = qe.queue_id
  WHERE  qe.id = p_entry_id;

  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND' USING HINT = 'Queue entry does not exist';
  END IF;

  -- Auth: only active clinic staff for this clinic
  IF NOT EXISTS (
    SELECT 1 FROM clinic_staff
    WHERE  user_id    = auth.uid()
      AND  clinic_id  = v_entry.clinic_id
      AND  is_active  = TRUE
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING HINT = 'Only clinic staff can requeue a patient';
  END IF;

  IF v_entry.status <> 'SKIPPED' THEN
    RAISE EXCEPTION 'INVALID_STATUS'
      USING HINT = 'Only SKIPPED entries can be requeued (current: ' || v_entry.status || ')';
  END IF;

  -- Lock the queue row to prevent concurrent current_number bumps
  UPDATE queues
  SET    current_number = current_number + 1
  WHERE  id = v_entry.queue_id
  RETURNING current_number INTO v_next;

  -- Put the entry at the back
  UPDATE queue_entries
  SET    status       = 'WAITING',
         queue_number = v_next
  WHERE  id = p_entry_id;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.requeue_entry TO authenticated;
