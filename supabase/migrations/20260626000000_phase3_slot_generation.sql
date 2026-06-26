-- =============================================================================
-- Phase 3.1 — Scheduled slot generation
--
-- generate_slots_for_doctor_date: idempotent, generates time_slots for one
-- doctor on one calendar date from their doctor_schedules template.
-- ON CONFLICT DO NOTHING means re-running is always safe.
--
-- generate_rolling_slots: walks every active doctor in every active clinic
-- and calls the above for today + (p_days - 1) days.
--
-- pg_cron setup — REQUIRES pg_cron extension (Dashboard → Extensions → pg_cron).
-- Once enabled, run this ONE TIME in the SQL Editor to register the daily job:
--
--   SELECT cron.schedule(
--     'generate-slots-daily',
--     '0 17 * * *',   -- 01:00 MYT (UTC+8) = 17:00 UTC previous day
--     $$SELECT generate_rolling_slots(14)$$
--   );
--
-- To inspect jobs: SELECT * FROM cron.job;
-- To unschedule:   SELECT cron.unschedule('generate-slots-daily');
-- To change N:     SELECT cron.schedule('generate-slots-daily', '0 17 * * *',
--                    $$SELECT generate_rolling_slots(30)$$);
--
-- This migration does NOT call cron.schedule() because the extension may not
-- be enabled yet. It only creates the functions.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_slots_for_doctor_date(
  p_doctor_id UUID,
  p_date      DATE
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sched  RECORD;
  v_start  TIME;
  v_end    TIME;
  v_count  INTEGER := 0;
BEGIN
  FOR v_sched IN
    SELECT start_time, end_time, slot_duration_minutes
    FROM   doctor_schedules
    WHERE  doctor_id  = p_doctor_id
      AND  day_of_week = EXTRACT(DOW FROM p_date)::SMALLINT
      AND  is_active   = TRUE
  LOOP
    v_start := v_sched.start_time;
    LOOP
      v_end := v_start + (v_sched.slot_duration_minutes || ' minutes')::INTERVAL;
      EXIT WHEN v_end > v_sched.end_time;

      INSERT INTO time_slots (doctor_id, slot_date, start_time, end_time, status)
      VALUES (p_doctor_id, p_date, v_start, v_end, 'AVAILABLE')
      ON CONFLICT (doctor_id, slot_date, start_time) DO NOTHING;

      v_count := v_count + 1;
      v_start := v_end;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_rolling_slots(p_days INTEGER DEFAULT 14)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc    RECORD;
  v_offset INTEGER;
  v_total  INTEGER := 0;
BEGIN
  FOR v_doc IN
    SELECT d.id AS doctor_id
    FROM   doctors      d
    JOIN   clinic_staff cs ON cs.id       = d.id
    JOIN   clinics      c  ON c.id        = cs.clinic_id
    WHERE  cs.is_active = TRUE
      AND  c.is_active  = TRUE
  LOOP
    FOR v_offset IN 0 .. (p_days - 1) LOOP
      v_total := v_total + public.generate_slots_for_doctor_date(
        v_doc.doctor_id,
        CURRENT_DATE + v_offset
      );
    END LOOP;
  END LOOP;

  RETURN v_total;
END;
$$;

-- generate_rolling_slots is called by the cron job (postgres role) and by
-- service_role tooling. No patient/staff access needed.
GRANT EXECUTE ON FUNCTION public.generate_slots_for_doctor_date TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_rolling_slots          TO service_role;
