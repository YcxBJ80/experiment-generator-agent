-- Migration: Create user system tables and relationships
-- This migration introduces a dedicated user_profiles table and links existing
-- messages and surveys tables to user records.

-- Ensure required extension is available for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 1: Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 2: Use shared trigger to keep updated_at fresh
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 3: Index frequently queried columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Step 4: Add user references to messages and surveys
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE;

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Step 5: Index new foreign keys
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);

-- Step 6: Ensure basic access for anon/authenticated roles (RLS enabled elsewhere)
GRANT SELECT, INSERT, UPDATE ON user_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- Step 7: Add documentation comments
COMMENT ON TABLE user_profiles IS 'Application-managed users with credential hashes';
COMMENT ON COLUMN messages.user_id IS 'Owner of the conversation/message';
COMMENT ON COLUMN surveys.user_id IS 'User who submitted the survey response';
