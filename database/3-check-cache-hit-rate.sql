-- Check cache hit rate (should be >99%)
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
