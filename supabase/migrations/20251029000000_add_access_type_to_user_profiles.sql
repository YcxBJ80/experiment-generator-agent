-- Migration: Add access_type field to user_profiles table
-- This field is used by the admin panel to manage user access permissions

-- Add access_type column to user_profiles table
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS access_type VARCHAR(20) CHECK (access_type IN ('software', 'api'));

-- Create index for better performance when filtering by access_type
CREATE INDEX IF NOT EXISTS idx_user_profiles_access_type ON user_profiles(access_type);

-- Add documentation comment
COMMENT ON COLUMN user_profiles.access_type IS 'User access type: software (use software client) or api (direct API access)';

