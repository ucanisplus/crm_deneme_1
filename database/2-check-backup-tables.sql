-- Check for backup/yedek tables (can delete to free space)
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND (
    tablename LIKE '%yedek%'
    OR tablename LIKE '%backup%'
    OR tablename LIKE '%_old%'
)
ORDER BY pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) DESC;
