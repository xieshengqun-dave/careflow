-- =============================================================================
-- Appointment reminders: a pg_cron job runs every 15 minutes, finds confirmed
-- appointments starting in roughly the next hour that haven't been reminded
-- yet, and enqueues a reminder notification for each.
--
-- Requires the pg_cron extension to be enabled on this project (Supabase:
-- Database -> Extensions -> pg_cron). If it can't be enabled here, run
-- `CREATE EXTENSION IF NOT EXISTS pg_cron;` once from the dashboard, then
-- re-run this file.
-- =============================================================================

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.send_appointment_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_appt IN
    SELECT a.id, a.patient_id, a.appointment_date, t.start_time
    FROM appointments a
    JOIN time_slots t ON t.id = a.time_slot_id
    WHERE a.status = 'CONFIRMED'
      AND a.reminder_sent_at IS NULL
      AND (a.appointment_date + t.start_time) BETWEEN NOW() + INTERVAL '50 minutes' AND NOW() + INTERVAL '70 minutes'
  LOOP
    PERFORM public.enqueue_notification(
      v_appt.patient_id, 'APPOINTMENT_REMINDER',
      'Appointment reminder',
      'Your appointment is at ' || to_char(v_appt.start_time, 'HH12:MI AM') || ' today.',
      jsonb_build_object('appointment_id', v_appt.id)
    );
    UPDATE appointments SET reminder_sent_at = NOW() WHERE id = v_appt.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('send-appointment-reminders');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'send-appointment-reminders',
      '*/15 * * * *',
      'SELECT public.send_appointment_reminders();'
    );
  END IF;
END $$;
