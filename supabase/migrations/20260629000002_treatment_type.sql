-- Add treatment_type to appointments and queue_entries for receptionist workflow
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS treatment_type TEXT;
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS treatment_type TEXT;
