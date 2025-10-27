-- Create surveys table for experiment feedback
CREATE TABLE surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL,
  reflects_real_world BOOLEAN NOT NULL,
  visualization_rating INTEGER NOT NULL CHECK (visualization_rating >= 1 AND visualization_rating <= 10),
  concept_understanding INTEGER NOT NULL CHECK (concept_understanding >= 1 AND concept_understanding <= 10),
  suggestions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_surveys_experiment_id ON surveys(experiment_id);
CREATE INDEX idx_surveys_created_at ON surveys(created_at DESC);

-- Enable Row Level Security
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (since we don't have user authentication)
CREATE POLICY "Allow all operations on surveys" ON surveys
  FOR ALL USING (true);

-- Grant permissions to anon and authenticated roles
GRANT ALL PRIVILEGES ON surveys TO anon;
GRANT ALL PRIVILEGES ON surveys TO authenticated;

-- Note: experiment_id references the experiment stored in messages table
-- We don't create a foreign key constraint to maintain flexibility
-- as experiments are identified by UUIDs in the messages table;
