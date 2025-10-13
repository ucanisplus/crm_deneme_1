-- ========================================
-- FIND ACTUAL SLOW TIMEZONE QUERIES
-- ========================================
-- This queries pg_stat_statements to find the real culprit
-- ========================================

-- 1. Find all queries that mention timezone
SELECT
    query,
    calls,
    ROUND(CAST(total_exec_time AS numeric), 2) AS total_time_ms,
    ROUND(CAST(mean_exec_time AS numeric), 2) AS avg_time_ms,
    ROUND(CAST(max_exec_time AS numeric), 2) AS max_time_ms,
    ROUND(CAST((total_exec_time / SUM(total_exec_time) OVER ()) * 100 AS numeric), 2) AS pct_total_time
FROM pg_stat_statements
WHERE query ILIKE '%timezone%'
ORDER BY total_exec_time DESC
LIMIT 20;

-- 2. Find queries with high call counts (repeated queries)
SELECT
    query,
    calls,
    ROUND(CAST(total_exec_time AS numeric), 2) AS total_time_ms,
    ROUND(CAST(mean_exec_time AS numeric), 2) AS avg_time_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY calls DESC
LIMIT 20;

-- 3. Find slowest queries overall
SELECT
    query,
    calls,
    ROUND(CAST(total_exec_time AS numeric), 2) AS total_time_ms,
    ROUND(CAST(mean_exec_time AS numeric), 2) AS avg_time_ms,
    ROUND(CAST(max_exec_time AS numeric), 2) AS max_time_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- 4. Find queries that access pg_timezone_names specifically
SELECT
    query,
    calls,
    ROUND(CAST(total_exec_time AS numeric), 2) AS total_time_ms,
    ROUND(CAST(mean_exec_time AS numeric), 2) AS avg_time_ms
FROM pg_stat_statements
WHERE query ILIKE '%pg_timezone_names%'
ORDER BY total_exec_time DESC;

-- 5. Summary of query performance
SELECT
    ROUND(CAST(SUM(total_exec_time) AS numeric), 2) AS total_query_time_ms,
    SUM(calls) AS total_calls,
    COUNT(*) AS unique_queries
FROM pg_stat_statements;
