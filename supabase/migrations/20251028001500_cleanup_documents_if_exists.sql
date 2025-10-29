-- Migration: Ensure documents table is removed when present
-- Handles environments where 004_remove_documents.sql failed before dropping the table.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'documents'
  ) THEN
    ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_conversation_id_fkey;
    DROP TABLE public.documents;
  END IF;
END;
$$;
