-- Grant permissions for conversations table
GRANT ALL PRIVILEGES ON conversations TO authenticated;
GRANT SELECT, INSERT ON conversations TO anon;

-- Check current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'documents')
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;;
