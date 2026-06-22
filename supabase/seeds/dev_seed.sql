-- =============================================================================
-- CareFlow Dev Seed Data
-- FOR LOCAL DEVELOPMENT ONLY — NEVER RUN IN PRODUCTION
-- =============================================================================
-- Populates the local Supabase instance with sample clinics, doctors, and
-- schedules for development and testing purposes.
--
-- Run via: supabase db seed
-- Or manually: psql $DATABASE_URL -f supabase/seeds/dev_seed.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Clinics
-- ---------------------------------------------------------------------------

INSERT INTO clinics (id, name, address, city, state, postcode, phone, email, is_active)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'CareFlow Clinic Kuala Lumpur',
    'Lot 12, Jalan Ampang, Kompleks Medik Ampang',
    'Kuala Lumpur',
    'Wilayah Persekutuan Kuala Lumpur',
    '50450',
    '+60321234567',
    'kl@careflow.my',
    true
  ),
  (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'CareFlow Clinic Petaling Jaya',
    '88, Jalan SS 21/1, Damansara Utama',
    'Petaling Jaya',
    'Selangor',
    '47400',
    '+60378901234',
    'pj@careflow.my',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Doctors (user profiles — assumes auth.users rows are pre-created in local dev)
-- ---------------------------------------------------------------------------

INSERT INTO profiles (id, full_name, phone, role)
VALUES
  (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'Dr. Amirul Hakim bin Zulkifli',
    '+60123456789',
    'DOCTOR'
  ),
  (
    'd4e5f6a7-b8c9-0123-defa-234567890123',
    'Dr. Priya Devi a/p Krishnan',
    '+60134567890',
    'DOCTOR'
  ),
  (
    'e5f6a7b8-c9d0-1234-efab-345678901234',
    'Dr. Tan Wei Liang',
    '+60145678901',
    'DOCTOR'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Doctors table (specialization etc.)
-- ---------------------------------------------------------------------------

INSERT INTO doctors (id, profile_id, specialization, registration_number, bio, is_active)
VALUES
  (
    'f6a7b8c9-d0e1-2345-fabc-456789012345',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'General Practice',
    'MMC/GP/2018/001234',
    'Dr. Amirul is a general practitioner with over 8 years of experience in primary care, chronic disease management, and preventive health.',
    true
  ),
  (
    'a7b8c9d0-e1f2-3456-abcd-567890123456',
    'd4e5f6a7-b8c9-0123-defa-234567890123',
    'Paediatrics',
    'MMC/PAED/2015/005678',
    'Dr. Priya is a paediatrician specialising in child development, vaccination programmes, and paediatric infectious diseases.',
    true
  ),
  (
    'b8c9d0e1-f2a3-4567-bcde-678901234567',
    'e5f6a7b8-c9d0-1234-efab-345678901234',
    'Orthopaedics',
    'MMC/ORTH/2012/009012',
    'Dr. Tan is an orthopaedic surgeon with expertise in sports injuries, joint replacement, and musculoskeletal disorders.',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Clinic Staff — link all three doctors to the KL clinic
-- ---------------------------------------------------------------------------

INSERT INTO clinic_staff (id, clinic_id, profile_id, doctor_id, role, is_active)
VALUES
  (
    gen_random_uuid(),
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'f6a7b8c9-d0e1-2345-fabc-456789012345',
    'DOCTOR',
    true
  ),
  (
    gen_random_uuid(),
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'd4e5f6a7-b8c9-0123-defa-234567890123',
    'a7b8c9d0-e1f2-3456-abcd-567890123456',
    'DOCTOR',
    true
  ),
  (
    gen_random_uuid(),
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'e5f6a7b8-c9d0-1234-efab-345678901234',
    'b8c9d0e1-f2a3-4567-bcde-678901234567',
    'DOCTOR',
    true
  )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Doctor Schedules — Mon–Fri, 09:00–17:00 for each doctor
-- day_of_week: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
-- ---------------------------------------------------------------------------

INSERT INTO doctor_schedules (id, doctor_id, clinic_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
SELECT
  gen_random_uuid(),
  d.doctor_id,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  days.day_of_week,
  '09:00:00',
  '17:00:00',
  30,
  true
FROM
  (VALUES
    ('f6a7b8c9-d0e1-2345-fabc-456789012345'),
    ('a7b8c9d0-e1f2-3456-abcd-567890123456'),
    ('b8c9d0e1-f2a3-4567-bcde-678901234567')
  ) AS d(doctor_id)
CROSS JOIN
  (VALUES (1), (2), (3), (4), (5)) AS days(day_of_week)
ON CONFLICT DO NOTHING;

COMMIT;
