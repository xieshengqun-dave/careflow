-- Platform admins table — users with cross-clinic super admin access.
-- These users bypass clinic-scoped RLS via the service_role key in server queries.
CREATE TABLE IF NOT EXISTS platform_admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Platform admins can read their own row (used by middleware + getServerUser)
CREATE POLICY "platform_admins_self_read" ON platform_admins
  FOR SELECT USING (auth.uid() = user_id);

-- Seed admin@careflow.asia as the initial platform admin
INSERT INTO platform_admins (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'admin@careflow.asia'
ON CONFLICT (user_id) DO NOTHING;
