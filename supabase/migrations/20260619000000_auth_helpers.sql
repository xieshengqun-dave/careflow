-- =============================================================================
-- CareFlow Auth Helpers
-- Migration: 20260619000000_auth_helpers
-- Creates a trigger to auto-create a profile row when a new auth user signs up
-- via phone OTP (patient flow).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create a minimal profile for phone (OTP) signups
  IF NEW.phone IS NOT NULL AND NEW.email IS NULL THEN
    INSERT INTO public.profiles (id, full_name, phone_number)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.phone
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
