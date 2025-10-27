-- Rollback migration: Remove user system components
-- This migration removes all user-related tables and columns to revert to a version without user authentication

-- Step 1: Drop all existing RLS policies first (to avoid dependency issues)
-- For messages table
DROP POLICY IF EXISTS "Users can only see their own messages" ON messages;
DROP POLICY IF EXISTS "Users can only insert their own messages" ON messages;
DROP POLICY IF EXISTS "Users can only update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can only delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;

-- For surveys table
DROP POLICY IF EXISTS "Users can only see their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can only insert their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can only update their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can only delete their own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can view own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can insert own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can update own surveys" ON surveys;
DROP POLICY IF EXISTS "Users can delete own surveys" ON surveys;
DROP POLICY IF EXISTS "Allow all operations on surveys" ON surveys;

-- Step 2: Drop foreign key constraints related to user_id
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE surveys DROP CONSTRAINT IF EXISTS surveys_user_id_fkey;

-- Step 3: Remove user_id columns from existing tables
ALTER TABLE messages DROP COLUMN IF EXISTS user_id;
ALTER TABLE surveys DROP COLUMN IF EXISTS user_id;

-- Step 4: Drop the user_profiles table
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Step 5: Create new policies to allow anonymous access

-- Create policy to allow all operations for anonymous users
CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL USING (true);

-- Create policy to allow all operations for anonymous users
CREATE POLICY "Allow all operations on surveys" ON surveys
  FOR ALL USING (true);

-- Step 6: Ensure proper permissions for anon and authenticated roles
GRANT ALL PRIVILEGES ON messages TO anon;
GRANT ALL PRIVILEGES ON messages TO authenticated;
GRANT ALL PRIVILEGES ON surveys TO anon;
GRANT ALL PRIVILEGES ON surveys TO authenticated;

-- Step 7: Drop any user-related indexes that might exist
DROP INDEX IF EXISTS idx_messages_user_id;
DROP INDEX IF EXISTS idx_surveys_user_id;
DROP INDEX IF EXISTS idx_user_profiles_email;

-- Add comments for documentation
COMMENT ON TABLE messages IS 'Messages table without user authentication - allows anonymous access';
COMMENT ON TABLE surveys IS 'Surveys table without user authentication - allows anonymous access';;
