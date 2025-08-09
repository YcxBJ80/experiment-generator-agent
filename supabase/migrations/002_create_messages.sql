-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant')),
  experiment_id UUID,
  html_content TEXT,
  css_content TEXT,
  js_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_experiment_id ON messages(experiment_id) WHERE experiment_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (since we don't have user authentication)
CREATE POLICY "Allow all operations on messages" ON messages
  FOR ALL USING (true);

-- Grant permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON messages TO anon;
GRANT ALL PRIVILEGES ON messages TO authenticated;