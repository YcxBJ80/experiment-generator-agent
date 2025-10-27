-- Grant permissions for documents table
GRANT ALL PRIVILEGES ON documents TO authenticated;
GRANT SELECT, INSERT ON documents TO anon;

-- Check current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'documents'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;;
