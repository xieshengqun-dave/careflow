-- Extend staff_role enum with CLINIC_ADMIN and SUPER_ADMIN.
-- ADMIN is kept for backward compatibility.
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'CLINIC_ADMIN';
ALTER TYPE staff_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
