-- ========================================
-- COMPLETE DATABASE HEALTH CHECK
-- ========================================
-- Run this to identify performance issues
-- ========================================

-- 1. UNUSED INDEXES (wasting space and slowing writes)
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelid::regclass::text NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 2. MISSING INDEXES (tables with sequential scans)
SELECT
    schemaname,
    tablename,
    seq_scan AS sequential_scans,
    seq_tup_read AS rows_read_sequentially,
    idx_scan AS index_scans,
    CASE
        WHEN seq_scan > 0 THEN ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
        ELSE 0
    END AS index_usage_pct
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_scan DESC
LIMIT 20;

-- 3. TABLE SIZES (identify large tables)
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- 4. DUPLICATE/REDUNDANT INDEXES
SELECT
    i1.tablename,
    i1.indexname AS index1,
    i2.indexname AS index2,
    pg_get_indexdef(i1.indexrelid::regclass::oid) AS index1_def
FROM pg_indexes i1
JOIN pg_indexes i2 ON i1.tablename = i2.tablename
    AND i1.schemaname = i2.schemaname
    AND i1.indexname < i2.indexname
    AND pg_get_indexdef(i1.indexrelid::regclass::oid) = pg_get_indexdef(i2.indexrelid::regclass::oid)
WHERE i1.schemaname = 'public';

-- 5. BACKUP TABLES (can be deleted?)
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND (
    tablename LIKE '%yedek%'
    OR tablename LIKE '%backup%'
    OR tablename LIKE '%_old%'
    OR tablename LIKE '%_bak%'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 6. CACHE HIT RATIO (should be >99%)
SELECT
    'index hit rate' AS metric,
    ROUND(
        CASE WHEN sum(idx_blks_hit + idx_blks_read) = 0 THEN 0
        ELSE (sum(idx_blks_hit)::float / sum(idx_blks_hit + idx_blks_read)) * 100
        END, 2
    ) AS percentage
FROM pg_statio_user_indexes
UNION ALL
SELECT
    'table hit rate' AS metric,
    ROUND(
        CASE WHEN sum(heap_blks_hit + heap_blks_read) = 0 THEN 0
        ELSE (sum(heap_blks_hit)::float / sum(heap_blks_hit + heap_blks_read)) * 100
        END, 2
    ) AS percentage
FROM pg_statio_user_tables;

-- 7. SLOW QUERIES (from pg_stat_statements)
SELECT
    LEFT(query, 100) AS query_snippet,
    calls,
    ROUND(CAST(total_exec_time AS numeric), 2) AS total_time_ms,
    ROUND(CAST(mean_exec_time AS numeric), 2) AS avg_time_ms,
    ROUND(CAST(max_exec_time AS numeric), 2) AS max_time_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
AND query NOT LIKE '%pg_timezone_names%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 8. TABLES WITHOUT PRIMARY KEYS (bad for performance)
SELECT
    t.tablename
FROM pg_tables t
LEFT JOIN pg_constraint c ON t.tablename::text = c.conrelid::regclass::text AND c.contype = 'p'
WHERE t.schemaname = 'public'
AND c.conname IS NULL
ORDER BY t.tablename;

-- 9. BLOATED TABLES (need VACUUM)
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_dead_tup AS dead_tuples,
    CASE
        WHEN n_live_tup > 0 THEN ROUND(100.0 * n_dead_tup / n_live_tup, 2)
        ELSE 0
    END AS dead_tuple_pct,
    last_autovacuum,
    last_vacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;

-- 10. CONNECTION COUNT
SELECT
    count(*) AS total_connections,
    count(*) FILTER (WHERE state = 'active') AS active_connections,
    count(*) FILTER (WHERE state = 'idle') AS idle_connections
FROM pg_stat_activity
WHERE datname = current_database();

-- ========================================
-- SUMMARY
-- ========================================
DO $$
DECLARE
    v_db_size TEXT;
    v_unused_indexes INT;
    v_backup_tables INT;
BEGIN
    -- Get database size
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO v_db_size;

    -- Count unused indexes
    SELECT COUNT(*) INTO v_unused_indexes
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0
    AND indexrelid::regclass::text NOT LIKE '%_pkey';

    -- Count backup tables
    SELECT COUNT(*) INTO v_backup_tables
    FROM pg_tables
    WHERE schemaname = 'public'
    AND (tablename LIKE '%yedek%' OR tablename LIKE '%backup%');

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE HEALTH SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total database size: %', v_db_size;
    RAISE NOTICE 'Unused indexes: %', v_unused_indexes;
    RAISE NOTICE 'Backup tables: %', v_backup_tables;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Review the query results above for details';
    RAISE NOTICE '========================================';
END $$;
