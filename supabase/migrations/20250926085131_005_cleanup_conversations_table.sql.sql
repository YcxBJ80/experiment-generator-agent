-- Step 1: Drop the foreign key constraint from messages to conversations
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- Step 2: Drop the conversations table as it's no longer needed
DROP TABLE IF EXISTS conversations;

-- Step 3: Update RLS policies to ensure messages table access is properly configured
-- (The policies should already be updated from the previous migration)

-- Verify that all necessary indexes exist on messages table
CREATE INDEX IF NOT EXISTS idx_messages_conversation_root ON messages(conversation_id, is_conversation_root) WHERE is_conversation_root = true;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_experiment_id ON messages(experiment_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);;
