-- ========================================
-- DIAGNOSE TIMEZONE PERFORMANCE ISSUE
-- ========================================
-- Run this to identify which tables/queries are causing
-- the pg_timezone_names lookups
-- ========================================

-- 1. Check which tables have TIMEZONE() in their defaults
SELECT
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE column_default LIKE '%timezone%'
   OR column_default LIKE '%TIMEZONE%'
ORDER BY table_name, column_name;

-- 2. Check for triggers that might use TIMEZONE()
SELECT
    t.tgname AS trigger_name,
    c.relname AS table_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE pg_get_functiondef(p.oid) LIKE '%timezone%'
   OR pg_get_functiondef(p.oid) LIKE '%TIMEZONE%';

-- 3. List all CRM tables and their timestamp columns
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name LIKE 'crm_%'
AND column_name IN ('created_at', 'updated_at', 'granted_at', 'last_login')
ORDER BY table_name, column_name;

-- 4. Check if pg_stat_statements is enabled (to find slow queries)
SELECT EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_stat_statements'
) AS pg_stat_statements_enabled;

-- 5. If pg_stat_statements is enabled, find queries with high execution time
-- (Uncomment if the above returns true)
/*
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%timezone%'
   OR query LIKE '%TIMEZONE%'
ORDER BY total_exec_time DESC
LIMIT 10;
*/

-- 6. Check for any views that might use TIMEZONE()
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND (definition LIKE '%timezone%' OR definition LIKE '%TIMEZONE%');

-- 7. Count rows in CRM tables (to see which are heavily used)
DO $$
DECLARE
    table_record RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRM TABLE ROW COUNTS:';
    RAISE NOTICE '========================================';

    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'crm_%'
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO row_count;
        RAISE NOTICE '%: % rows', table_record.table_name, row_count;
    END LOOP;

    RAISE NOTICE '========================================';
END $$;
