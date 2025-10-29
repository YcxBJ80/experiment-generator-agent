-- Migration: Enable RLS for user_profiles
-- Ensures the publicly exposed user_profiles table has row level security enabled
-- while preserving current access expectations for anon/authenticated roles.

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Maintain existing open access for anon and authenticated roles while RLS is on.
DROP POLICY IF EXISTS "Allow anon access to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated access to user_profiles" ON public.user_profiles;

CREATE POLICY "Allow anon access to user_profiles"
  ON public.user_profiles
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated access to user_profiles"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
