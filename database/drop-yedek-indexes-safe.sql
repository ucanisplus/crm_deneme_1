-- ========================================
-- DROP SAFE INDEXES ON YEDEK/BACKUP TABLES
-- ========================================
-- Only drops regular indexes, not constraint-backed ones
-- Skips: _pkey, _key (primary keys, unique constraints)
-- ========================================

BEGIN;

-- Safe indexes to drop (not backing constraints)
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_mamul_bilesen_1;
DROP INDEX IF EXISTS idx_celik_hasir_ncbk_recete_mamul_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_mamul_kodu_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_mm_created_at_1;
DROP INDEX IF EXISTS idx_celik_hasir_mm_created_at_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_mm_hasir_tipi_1;
DROP INDEX IF EXISTS idx_celik_hasir_mm_hasir_tipi_1;
DROP INDEX IF EXISTS idx_gal_ym_st_stok_kodu_3;
DROP INDEX IF EXISTS idx_gal_ym_st_stok_kodu_pattern_3;
DROP INDEX IF EXISTS idx_gal_cost_cal_ym_st_stok_kodu_pattern_3;
DROP INDEX IF EXISTS idx_celik_hasir_mm_user_id_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_mm_user_id_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_bilesen_kodu_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_ncbk_id_1;
DROP INDEX IF EXISTS idx_gal_cost_cal_ym_st_stok_kodu_pattern_2;
DROP INDEX IF EXISTS idx_gal_ym_st_stok_kodu_2;
DROP INDEX IF EXISTS idx_gal_ym_st_stok_kodu_pattern_2;
DROP INDEX IF EXISTS idx_gal_ym_st_priority_1;

COMMIT;

-- Show results
SELECT
    'Regular yedek indexes deleted (kept constraint-backed ones)' AS status,
    pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- Show what's left
SELECT
    COUNT(*) AS remaining_yedek_indexes
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND (relname LIKE '%yedek%' OR relname LIKE '%Yedek%' OR relname LIKE '%backup%');
