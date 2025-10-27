-- Remove documents table as requested
-- This table is no longer needed after implementing surveys

-- Drop the foreign key constraint first
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_conversation_id_fkey;

-- Drop the documents table
DROP TABLE IF EXISTS documents;

-- Note: This migration removes the documents table completely
-- All document-related functionality has been replaced with surveys;
