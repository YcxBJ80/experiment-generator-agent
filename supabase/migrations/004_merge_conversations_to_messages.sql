-- Migration: Merge conversations table functionality into messages table
-- This migration adds necessary fields to messages table and removes conversations table

-- Step 1: Add new fields to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_conversation_root BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 3: Create trigger for updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Migrate existing conversations data to messages
-- For each conversation, create a root message entry
INSERT INTO messages (conversation_id, content, type, title, is_conversation_root, created_at, updated_at)
SELECT 
    c.id as conversation_id,
    '' as content,  -- Empty content for root messages
    'assistant' as type,
    c.title,
    TRUE as is_conversation_root,
    c.created_at,
    c.updated_at
FROM conversations c
WHERE NOT EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.conversation_id = c.id AND m.is_conversation_root = TRUE
);

-- Step 5: Update existing messages to ensure they have proper conversation structure
-- Set conversation_id as experiment_id for messages that have experiment_id but no conversation_id
UPDATE messages 
SET conversation_id = experiment_id 
WHERE experiment_id IS NOT NULL 
  AND conversation_id IS NULL;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_is_conversation_root ON messages(is_conversation_root) WHERE is_conversation_root = TRUE;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_title ON messages(title) WHERE title IS NOT NULL;

-- Step 7: Update RLS policies for the new structure
DROP POLICY IF EXISTS "Allow all operations on messages" ON messages;
CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL USING (true);

-- Step 8: Drop the conversations table (commented out for safety)
-- Uncomment the following line after verifying the migration works correctly
-- DROP TABLE IF EXISTS conversations CASCADE;

-- Step 9: Grant permissions
GRANT ALL PRIVILEGES ON messages TO anon;
GRANT ALL PRIVILEGES ON messages TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN messages.title IS 'Title of the conversation (only set for root messages)';
COMMENT ON COLUMN messages.is_conversation_root IS 'Indicates if this message is the root of a conversation';
COMMENT ON COLUMN messages.updated_at IS 'Timestamp of last update';