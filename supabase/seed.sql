-- =============================================================================
-- CareFlow Seed Data
-- Run in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING
-- =============================================================================

DO $$
DECLARE
  -- Fixed UUIDs so script is idempotent
  v_clinic_id           UUID := 'a1000000-0000-0000-0000-000000000001';

  v_user_ahmad          UUID := 'b1000000-0000-0000-0000-000000000001';
  v_user_sarah          UUID := 'b1000000-0000-0000-0000-000000000002';
  v_user_rajan          UUID := 'b1000000-0000-0000-0000-000000000003';
  v_user_reception      UUID := 'b1000000-0000-0000-0000-000000000004';

  v_staff_ahmad         UUID := 'c1000000-0000-0000-0000-000000000001';
  v_staff_sarah         UUID := 'c1000000-0000-0000-0000-000000000002';
  v_staff_rajan         UUID := 'c1000000-0000-0000-0000-000000000003';
  v_staff_reception     UUID := 'c1000000-0000-0000-0000-000000000004';

  v_doctor_ahmad        UUID := 'd1000000-0000-0000-0000-000000000001';
  v_doctor_sarah        UUID := 'd1000000-0000-0000-0000-000000000002';
  v_doctor_rajan        UUID := 'd1000000-0000-0000-0000-000000000003';

  v_date                DATE;
  v_day_of_week         SMALLINT;
BEGIN

  -- ===========================================================================
  -- 1. Auth users (doctors + receptionist)
  --    Supabase SQL Editor runs as superuser and can write to auth.users
  -- ===========================================================================
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, phone,
    encrypted_password, email_confirmed_at, phone_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES
    ('00000000-0000-0000-0000-000000000000', v_user_ahmad,     'authenticated', 'authenticated', 'ahmad.rizal@careflow.my',    '+60111234001', '', NOW(), NOW(), NOW(), NOW(), '{"provider":"phone","providers":["phone"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_user_sarah,     'authenticated', 'authenticated', 'sarah.lim@careflow.my',      '+60111234002', '', NOW(), NOW(), NOW(), NOW(), '{"provider":"phone","providers":["phone"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_user_rajan,     'authenticated', 'authenticated', 'rajan.krishnan@careflow.my', '+60111234003', '', NOW(), NOW(), NOW(), NOW(), '{"provider":"phone","providers":["phone"]}', '{}', false, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_user_reception, 'authenticated', 'authenticated', 'reception@careflowclinic.my','+60111234004', '', NOW(), NOW(), NOW(), NOW(), '{"provider":"phone","providers":["phone"]}', '{}', false, '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================================
  -- 2. Profiles
  -- ===========================================================================
  INSERT INTO profiles (id, full_name, phone_number, gender) VALUES
    (v_user_ahmad,     'Dr. Ahmad Rizal',     '+60111234001', 'MALE'),
    (v_user_sarah,     'Dr. Sarah Lim',       '+60111234002', 'FEMALE'),
    (v_user_rajan,     'Dr. Rajan Krishnan',  '+60111234003', 'MALE'),
    (v_user_reception, 'Nurul Ain',           '+60111234004', 'FEMALE')
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================================
  -- 3. Clinic
  -- ===========================================================================
  INSERT INTO clinics (
    id, name, description, address, city, state, postal_code,
    phone_number, email, operating_hours, is_active
  ) VALUES (
    v_clinic_id,
    'CareFlow Family Clinic',
    'A modern multi-specialty clinic providing quality healthcare for the whole family. Walk-ins welcome.',
    '12, Jalan Ampang, Ampang Hilir',
    'Kuala Lumpur',
    'Wilayah Persekutuan',
    '55000',
    '+60312345678',
    'hello@careflowclinic.my',
    '{
      "0": null,
      "1": {"open": "09:00", "close": "17:00"},
      "2": {"open": "09:00", "close": "17:00"},
      "3": {"open": "09:00", "close": "17:00"},
      "4": {"open": "09:00", "close": "17:00"},
      "5": {"open": "09:00", "close": "17:00"},
      "6": {"open": "09:00", "close": "13:00"}
    }',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- ===========================================================================
  -- 4. Clinic staff
  -- ===========================================================================
  INSERT INTO clinic_staff (id, clinic_id, user_id, role, full_name, is_active) VALUES
    (v_staff_ahmad,     v_clinic_id, v_user_ahmad,     'DOCTOR',       'Dr. Ahmad Rizal',    true),
    (v_staff_sarah,     v_clinic_id, v_user_sarah,     'DOCTOR',       'Dr. Sarah Lim',      true),
    (v_staff_rajan,     v_clinic_id, v_user_rajan,     'DOCTOR',       'Dr. Rajan Krishnan', true),
    (v_staff_reception, v_clinic_id, v_user_reception, 'RECEPTIONIST', 'Nurul Ain',          true)
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================================
  -- 5. Doctors
  -- ===========================================================================
  INSERT INTO doctors (id, staff_id, specialization, qualification, bio, consultation_duration_minutes) VALUES
    (
      v_doctor_ahmad, v_staff_ahmad,
      'General Practitioner',
      'MBBS (UM), MMed (Family Medicine)',
      'Dr. Ahmad Rizal has over 10 years of experience in family medicine, specialising in preventive care and chronic disease management.',
      15
    ),
    (
      v_doctor_sarah, v_staff_sarah,
      'Paediatrics',
      'MBBS (UKM), MMed (Paediatrics)',
      'Dr. Sarah Lim specialises in child healthcare from newborns to adolescents. She is known for her gentle approach with young patients.',
      20
    ),
    (
      v_doctor_rajan, v_staff_rajan,
      'Cardiology',
      'MBBS (IMU), MRCP (UK), Fellowship in Cardiology',
      'Dr. Rajan Krishnan is a consultant cardiologist with expertise in interventional cardiology and heart failure management.',
      30
    )
  ON CONFLICT (id) DO NOTHING;

  -- ===========================================================================
  -- 6. Doctor schedules
  --    Ahmad:  Mon–Fri, 09:00–13:00 + 14:00–17:00, 15-min slots
  --    Sarah:  Mon/Wed/Fri 09:00–13:00, Tue/Thu 14:00–17:00, 20-min slots
  --    Rajan:  Tue/Thu 09:00–13:00, Sat 09:00–12:00, 30-min slots
  -- ===========================================================================

  -- Dr. Ahmad — Mon to Fri
  INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
  SELECT v_doctor_ahmad, d, '09:00'::time, '13:00'::time, 15, true FROM generate_series(1,5) AS d
  UNION ALL
  SELECT v_doctor_ahmad, d, '14:00'::time, '17:00'::time, 15, true FROM generate_series(1,5) AS d
  ON CONFLICT DO NOTHING;

  -- Dr. Sarah
  INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
  VALUES
    (v_doctor_sarah, 1, '09:00', '13:00', 20, true),
    (v_doctor_sarah, 3, '09:00', '13:00', 20, true),
    (v_doctor_sarah, 5, '09:00', '13:00', 20, true),
    (v_doctor_sarah, 2, '14:00', '17:00', 20, true),
    (v_doctor_sarah, 4, '14:00', '17:00', 20, true)
  ON CONFLICT DO NOTHING;

  -- Dr. Rajan
  INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
  VALUES
    (v_doctor_rajan, 2, '09:00', '13:00', 30, true),
    (v_doctor_rajan, 4, '09:00', '13:00', 30, true),
    (v_doctor_rajan, 6, '09:00', '12:00', 30, true)
  ON CONFLICT DO NOTHING;

  -- ===========================================================================
  -- 7. Time slots — generate for today + next 13 days
  -- ===========================================================================
  FOR v_date IN
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + 13, '1 day'::interval)::date
  LOOP
    v_day_of_week := EXTRACT(DOW FROM v_date)::SMALLINT;

    INSERT INTO time_slots (doctor_id, slot_date, start_time, end_time, status)
    SELECT
      ds.doctor_id,
      v_date,
      (ds.start_time + (n * ds.slot_duration_minutes * interval '1 minute'))::time,
      (ds.start_time + ((n + 1) * ds.slot_duration_minutes * interval '1 minute'))::time,
      'AVAILABLE'::slot_status
    FROM doctor_schedules ds
    CROSS JOIN generate_series(
      0,
      (EXTRACT(EPOCH FROM (ds.end_time - ds.start_time)) / (ds.slot_duration_minutes * 60))::int - 1
    ) AS n
    WHERE ds.day_of_week = v_day_of_week
      AND ds.is_active = true
      AND ds.doctor_id IN (v_doctor_ahmad, v_doctor_sarah, v_doctor_rajan)
    ON CONFLICT (doctor_id, slot_date, start_time) DO NOTHING;
  END LOOP;

  -- ===========================================================================
  -- 8. Active queues for today (walk-in queue per doctor if today is a workday)
  -- ===========================================================================
  INSERT INTO queues (clinic_id, doctor_id, queue_date, is_active, current_number)
  SELECT
    v_clinic_id,
    doctor_id,
    CURRENT_DATE,
    true,
    0
  FROM (VALUES (v_doctor_ahmad), (v_doctor_sarah), (v_doctor_rajan)) AS d(doctor_id)
  WHERE EXTRACT(DOW FROM CURRENT_DATE) BETWEEN 1 AND 6  -- Mon–Sat only
  ON CONFLICT (doctor_id, queue_date) DO NOTHING;

  RAISE NOTICE '✓ Seed complete.';
  RAISE NOTICE '  Clinic ID  : %', v_clinic_id;
  RAISE NOTICE '  Dr. Ahmad  : %', v_doctor_ahmad;
  RAISE NOTICE '  Dr. Sarah  : %', v_doctor_sarah;
  RAISE NOTICE '  Dr. Rajan  : %', v_doctor_rajan;

END $$;
