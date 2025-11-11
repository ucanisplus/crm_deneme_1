-- ========================================
-- QUICK DATABASE HEALTH CHECK
-- ========================================

-- 1. UNUSED INDEXES
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 2. TABLES WITH MANY SEQUENTIAL SCANS (need indexes?)
SELECT
    schemaname,
    relname AS table_name,
    seq_scan AS sequential_scans,
    idx_scan AS index_scans,
    CASE
        WHEN (seq_scan + idx_scan) > 0
        THEN ROUND(CAST(100.0 * idx_scan / (seq_scan + idx_scan) AS numeric), 2)
        ELSE 0
    END AS index_usage_pct
FROM pg_stat_user_tables
WHERE seq_scan > 100
ORDER BY seq_scan DESC
LIMIT 15;

-- 3. LARGEST TABLES
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) DESC
LIMIT 15;

-- 4. BACKUP/YEDEK TABLES (can delete?)
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

-- 5. CACHE HIT RATIO (should be >99%)
SELECT
    'Index Cache Hit Rate' AS metric,
    ROUND(CAST(
        CASE
            WHEN sum(idx_blks_hit + idx_blks_read) = 0 THEN 0
            ELSE (sum(idx_blks_hit)::float / sum(idx_blks_hit + idx_blks_read)) * 100
        END AS numeric), 2
    ) AS percentage
FROM pg_statio_user_indexes
UNION ALL
SELECT
    'Table Cache Hit Rate' AS metric,
    ROUND(CAST(
        CASE
            WHEN sum(heap_blks_hit + heap_blks_read) = 0 THEN 0
            ELSE (sum(heap_blks_hit)::float / sum(heap_blks_hit + heap_blks_read)) * 100
        END AS numeric), 2
    ) AS percentage
FROM pg_statio_user_tables;

-- 6. SLOWEST QUERIES NOW (after timezone fix)
SELECT
    LEFT(query, 80) AS query_snippet,
    calls,
    ROUND(CAST(total_exec_time AS numeric), 2) AS total_time_ms,
    ROUND(CAST(mean_exec_time AS numeric), 2) AS avg_time_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
AND query NOT LIKE '%pg_catalog%'
ORDER BY total_exec_time DESC
LIMIT 15;

-- 7. TABLES WITH DEAD TUPLES (need VACUUM)
SELECT
    schemaname,
    relname AS table_name,
    n_dead_tup AS dead_tuples,
    CASE
        WHEN n_live_tup > 0 THEN ROUND(CAST(100.0 * n_dead_tup / n_live_tup AS numeric), 2)
        ELSE 0
    END AS dead_tuple_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 500
ORDER BY n_dead_tup DESC;

-- 8. DATABASE SIZE
SELECT
    pg_size_pretty(pg_database_size(current_database())) AS database_size;
