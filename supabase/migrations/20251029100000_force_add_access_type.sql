-- Migration: Force add access_type field and refresh schema cache
-- This migration ensures the access_type column exists and notifies PostgREST to reload

-- Drop the column if it exists (to start fresh)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS access_type;

-- Add access_type column
ALTER TABLE user_profiles
  ADD COLUMN access_type VARCHAR(20) 
  CHECK (access_type IN ('software', 'api'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_access_type 
  ON user_profiles(access_type);

-- Add comment
COMMENT ON COLUMN user_profiles.access_type IS 'User access type: software (use software client) or api (direct API access)';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

