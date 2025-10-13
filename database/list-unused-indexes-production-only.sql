-- List all unused indexes on PRODUCTION tables only
-- Excludes: backup tables, yedek tables, auth/storage/realtime system tables
SELECT
    ROW_NUMBER() OVER (ORDER BY pg_relation_size(indexrelid) DESC) AS index_number,
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
AND schemaname = 'public'
AND relname NOT LIKE '%yedek%'
AND relname NOT LIKE '%backup%'
AND relname NOT LIKE '%_old%'
AND relname NOT LIKE '%Yedek%'
ORDER BY pg_relation_size(indexrelid) DESC;
