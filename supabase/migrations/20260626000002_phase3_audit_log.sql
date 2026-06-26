-- =============================================================================
-- Phase 3.4 — Audit log
--
-- activity_log captures every sensitive queue/appointment action with its
-- actor, target, old/new state, and timestamp. No UI surfaces this yet —
-- it's write-only from the application, read-only for clinic staff via RLS.
--
-- Actions captured:
--   check_in         — appointment moves to CHECKED_IN (via check_in_appointment fn)
--   cancel           — appointment moves to CANCELLED (via cancel_appointment fn)
--   no_show          — appointment moves to NO_SHOW (direct UPDATE from web app)
--   complete         — appointment moves to COMPLETED (direct UPDATE from web app)
--   skip             — queue entry moves to SKIPPED (direct UPDATE from web app)
--   requeue          — SKIPPED entry moves to WAITING (via requeue_entry fn)
--   remove           — queue entry moves to REMOVED (direct UPDATE from web app)
--   emergency_escalate — queue entry priority set to 1 (direct UPDATE from web app)
--
-- Triggers handle the direct-UPDATE cases; functions handle the RPC cases via
-- log_activity() calls. Audit failures are swallowed (EXCEPTION WHEN OTHERS →
-- NULL) so they never block the primary action.
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID        REFERENCES clinics(id) ON DELETE SET NULL,
  actor_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  target_type TEXT        NOT NULL,  -- 'appointment' | 'queue_entry'
  target_id   UUID        NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_clinic ON activity_log (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor  ON activity_log (actor_id,  created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Clinic staff can read their own clinic's audit trail
CREATE POLICY "activity_log: clinic staff read own clinic"
  ON activity_log FOR SELECT
  USING (
    clinic_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM clinic_staff
      WHERE user_id   = auth.uid()
        AND clinic_id = activity_log.clinic_id
        AND is_active = TRUE
    )
  );

-- No INSERT/UPDATE/DELETE policies — only log_activity() (SECURITY DEFINER) may write.
-- This makes the audit trail append-only for all client roles.

-- =============================================================================
-- log_activity: internal helper. SECURITY DEFINER so it can write to
-- activity_log even though no client INSERT policy exists. Swallows all
-- errors — audit failures must never block the primary action.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_activity(
  p_clinic_id   UUID,
  p_action      TEXT,
  p_target_type TEXT,
  p_target_id   UUID,
  p_metadata    JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_log (clinic_id, actor_id, action, target_type, target_id, metadata)
  VALUES (p_clinic_id, auth.uid(), p_action, p_target_type, p_target_id, p_metadata);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- =============================================================================
-- Trigger: queue_entries — catches skip, requeue, remove, and emergency
-- escalations that flow through direct UPDATE statements from the web app.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_queue_entry_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id UUID;
  v_action    TEXT;
BEGIN
  SELECT clinic_id INTO v_clinic_id FROM queues WHERE id = NEW.queue_id;

  IF NEW.status = 'SKIPPED'  AND (OLD.status IS DISTINCT FROM 'SKIPPED')  THEN
    v_action := 'skip';
  ELSIF NEW.status = 'REMOVED' AND (OLD.status IS DISTINCT FROM 'REMOVED') THEN
    v_action := 'remove';
  ELSIF NEW.status = 'WAITING' AND OLD.status = 'SKIPPED' THEN
    v_action := 'requeue';
  ELSIF NEW.priority = 1 AND (OLD.priority IS DISTINCT FROM 1) THEN
    v_action := 'emergency_escalate';
  END IF;

  IF v_action IS NOT NULL THEN
    PERFORM public.log_activity(
      v_clinic_id,
      v_action,
      'queue_entry',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_priority', OLD.priority,
        'new_priority', NEW.priority,
        'queue_id', NEW.queue_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_entry_audit ON queue_entries;
CREATE TRIGGER trg_queue_entry_audit
  AFTER UPDATE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_queue_entry_fn();

-- =============================================================================
-- Trigger: appointments — catches no_show and complete (direct UPDATE from
-- web app). check_in and cancel go through RPCs that will call log_activity
-- directly (see updated functions below).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_appointment_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF NEW.status = 'NO_SHOW'   AND (OLD.status IS DISTINCT FROM 'NO_SHOW')   THEN
    v_action := 'no_show';
  ELSIF NEW.status = 'COMPLETED' AND (OLD.status IS DISTINCT FROM 'COMPLETED') THEN
    v_action := 'complete';
  ELSIF NEW.status = 'CHECKED_IN' AND (OLD.status IS DISTINCT FROM 'CHECKED_IN') THEN
    v_action := 'check_in';
  ELSIF NEW.status = 'CANCELLED' AND (OLD.status IS DISTINCT FROM 'CANCELLED') THEN
    v_action := 'cancel';
  END IF;

  IF v_action IS NOT NULL THEN
    PERFORM public.log_activity(
      NEW.clinic_id,
      v_action,
      'appointment',
      NEW.id,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_audit ON appointments;
CREATE TRIGGER trg_appointment_audit
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_appointment_fn();
