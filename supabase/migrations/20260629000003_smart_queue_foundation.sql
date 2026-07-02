-- Smart Queue Foundation
-- Adds estimated/actual duration tracking, arrival status, and doctor treatment stats
-- Required by queueEngine.ts for wait time estimates and AI-ready data collection

-- 1. Extend queue_entries with smart queue fields
ALTER TABLE public.queue_entries
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes    SMALLINT,
  ADD COLUMN IF NOT EXISTS scheduled_start_time       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrival_status             TEXT
    CHECK (arrival_status IN ('EARLY', 'ON_TIME', 'LATE', 'NO_SHOW'));

-- 2. Extend appointments so booking can carry a duration estimate
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes SMALLINT;

-- 3. Doctor treatment duration stats
--    Seeded automatically when consultations complete via record_consultation_complete().
--    Powers the queue engine's per-doctor duration profiles and future AI training.
CREATE TABLE IF NOT EXISTS public.doctor_treatment_stats (
  doctor_id              UUID         NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  treatment_type         TEXT         NOT NULL,
  sample_count           INTEGER      NOT NULL DEFAULT 0,
  total_duration_minutes INTEGER      NOT NULL DEFAULT 0,
  avg_duration_minutes   NUMERIC(5,1)
    GENERATED ALWAYS AS (
      CASE WHEN sample_count > 0
      THEN ROUND(total_duration_minutes::NUMERIC / sample_count, 1)
      ELSE NULL END
    ) STORED,
  min_duration_minutes   SMALLINT,
  max_duration_minutes   SMALLINT,
  updated_at             TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (doctor_id, treatment_type)
);

ALTER TABLE public.doctor_treatment_stats ENABLE ROW LEVEL SECURITY;

-- Any authenticated clinic staff member can read treatment stats
CREATE POLICY "staff_read_doctor_stats"
  ON public.doctor_treatment_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clinic_staff
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- 4. Atomic completion RPC: marks entry COMPLETED, records actual duration, updates stats
CREATE OR REPLACE FUNCTION public.record_consultation_complete(
  p_entry_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_duration SMALLINT;
BEGIN
  SELECT qe.id, qe.called_at, qe.treatment_type, q.doctor_id
  INTO v_entry
  FROM queue_entries qe
  JOIN queues q ON q.id = qe.queue_id
  WHERE qe.id = p_entry_id;

  IF v_entry.id IS NULL THEN RETURN; END IF;

  IF v_entry.called_at IS NOT NULL THEN
    v_duration := GREATEST(1,
      ROUND(EXTRACT(EPOCH FROM (NOW() - v_entry.called_at)) / 60)::SMALLINT
    );

    UPDATE queue_entries
    SET status                 = 'COMPLETED',
        completed_at           = NOW(),
        actual_duration_minutes = v_duration
    WHERE id = p_entry_id;

    -- Accumulate into doctor stats when treatment type is known (AI training data)
    IF v_entry.treatment_type IS NOT NULL THEN
      INSERT INTO doctor_treatment_stats
        (doctor_id, treatment_type, sample_count, total_duration_minutes,
         min_duration_minutes, max_duration_minutes, updated_at)
      VALUES
        (v_entry.doctor_id, v_entry.treatment_type, 1, v_duration, v_duration, v_duration, NOW())
      ON CONFLICT (doctor_id, treatment_type) DO UPDATE SET
        sample_count           = doctor_treatment_stats.sample_count + 1,
        total_duration_minutes = doctor_treatment_stats.total_duration_minutes + v_duration,
        min_duration_minutes   = LEAST(doctor_treatment_stats.min_duration_minutes, v_duration),
        max_duration_minutes   = GREATEST(doctor_treatment_stats.max_duration_minutes, v_duration),
        updated_at             = NOW();
    END IF;
  ELSE
    -- No call time recorded (edge case) — mark complete without duration
    UPDATE queue_entries
    SET status = 'COMPLETED', completed_at = NOW()
    WHERE id = p_entry_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_consultation_complete(UUID) TO authenticated;
