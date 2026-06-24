-- =============================================================================
-- Notification dispatch: a single helper that (1) writes the in-app audit row
-- to `notifications` synchronously, and (2) best-effort triggers the
-- `send-notification` Edge Function (via pg_net) to push it to the user's
-- devices. Push failures must never roll back the in-app row.
--
-- ONE-TIME MANUAL STEP (cannot ship secrets in a committed migration):
-- run this once in the SQL Editor, filling in your project's values:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service_role_key>', 'service_role_key');
-- Until these secrets exist, enqueue_notification() still writes the
-- `notifications` row correctly; only the push-send step no-ops.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_user_id UUID,
  p_type    notification_type,
  p_title   TEXT,
  p_body    TEXT,
  p_data    JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_project_url TEXT;
  v_service_key TEXT;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_id;

  BEGIN
    SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

    IF v_project_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url     := v_project_url || '/functions/v1/send-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body    := jsonb_build_object('notification_id', v_id)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Push is best-effort. The in-app notification row above already committed.
    NULL;
  END;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_notification TO authenticated;

-- =============================================================================
-- Trigger: appointment confirmed / cancelled
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_notify_appointment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'CONFIRMED' THEN
    PERFORM public.enqueue_notification(
      NEW.patient_id, 'APPOINTMENT_CONFIRMED',
      'Appointment confirmed',
      'Your appointment on ' || to_char(NEW.appointment_date, 'DD Mon YYYY') || ' is confirmed.',
      jsonb_build_object('appointment_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
    PERFORM public.enqueue_notification(
      NEW.patient_id, 'APPOINTMENT_CANCELLED',
      'Appointment cancelled',
      'Your appointment on ' || to_char(NEW.appointment_date, 'DD Mon YYYY') || ' has been cancelled.',
      jsonb_build_object('appointment_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_notify ON appointments;
CREATE TRIGGER trg_appointments_notify
  AFTER INSERT OR UPDATE OF status ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_appointment_status();

-- =============================================================================
-- Trigger: called to consultation, and "you're next" when the front of the
-- queue changes. (Granular "N ahead" tracking is intentionally out of scope —
-- see CAREFLOW_FIX_PROMPT.md Phase 2 — this covers the two highest-value cases.)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_notify_queue_entry_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_entry RECORD;
BEGIN
  IF NEW.status = 'CALLED' AND OLD.status != 'CALLED' THEN
    PERFORM public.enqueue_notification(
      NEW.patient_id, 'CALLED_TO_CONSULTATION',
      'You are being called!',
      'Queue #' || NEW.queue_number || ' — please head to the consultation room.',
      jsonb_build_object('queue_entry_id', NEW.id, 'queue_id', NEW.queue_id)
    );
  END IF;

  IF OLD.status = 'WAITING' AND NEW.status != 'WAITING' THEN
    SELECT * INTO v_next_entry
    FROM queue_entries
    WHERE queue_id = NEW.queue_id AND status = 'WAITING'
    ORDER BY priority ASC, queue_number ASC
    LIMIT 1;

    IF v_next_entry.id IS NOT NULL THEN
      PERFORM public.enqueue_notification(
        v_next_entry.patient_id, 'QUEUE_POSITION_UPDATE',
        'You''re next!',
        'Queue #' || v_next_entry.queue_number || ' — you''re next in line.',
        jsonb_build_object('queue_entry_id', v_next_entry.id, 'queue_id', v_next_entry.queue_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_entries_notify ON queue_entries;
CREATE TRIGGER trg_queue_entries_notify
  AFTER UPDATE OF status ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_queue_entry_status();

-- =============================================================================
-- Staff action: doctor delayed (no automatic signal exists for this — it's an
-- explicit staff-initiated notice to everyone currently waiting on that queue).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_queue_delayed(p_queue_id UUID, p_message TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_entry RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM queues q
    JOIN clinic_staff cs ON cs.clinic_id = q.clinic_id
    WHERE q.id = p_queue_id AND cs.user_id = auth.uid() AND cs.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED'
      USING HINT = 'Only clinic staff can send a delay notice for this queue';
  END IF;

  FOR v_entry IN
    SELECT DISTINCT patient_id FROM queue_entries
    WHERE queue_id = p_queue_id AND status IN ('WAITING', 'CALLED')
  LOOP
    PERFORM public.enqueue_notification(
      v_entry.patient_id, 'DOCTOR_DELAYED', 'Doctor delayed', p_message,
      jsonb_build_object('queue_id', p_queue_id)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_queue_delayed TO authenticated;
