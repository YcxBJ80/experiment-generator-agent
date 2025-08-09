-- Create conversations table
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (since we don't have user authentication)
CREATE POLICY "Allow all operations on conversations" ON conversations
  FOR ALL USING (true);

-- Grant permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON conversations TO anon;
GRANT ALL PRIVILEGES ON conversations TO authenticated;