-- Check slowest queries (after timezone fix)
SELECT
    LEFT(query, 100) AS query_snippet,
    calls,
    ROUND(CAST(total_exec_time AS numeric), 2) AS total_time_ms,
    ROUND(CAST(mean_exec_time AS numeric), 2) AS avg_time_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
AND query NOT LIKE '%pg_catalog%'
AND query NOT LIKE '%pg_timezone_names%'
ORDER BY total_exec_time DESC
LIMIT 10;
