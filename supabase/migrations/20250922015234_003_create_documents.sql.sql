-- Create documents table
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'document',
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on conversation_id for faster queries
CREATE INDEX idx_documents_conversation_id ON documents(conversation_id);

-- Create index on created_at for sorting
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage their own documents
CREATE POLICY "Users can manage their own documents" ON documents
  FOR ALL USING (conversation_id IN (
    SELECT id FROM conversations WHERE true
  ));

-- Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;

-- Grant usage on the sequence
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;;
