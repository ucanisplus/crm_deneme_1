-- ========================================
-- DROP ALL INDEXES ON YEDEK/BACKUP TABLES
-- ========================================
-- Keeps: All production table indexes
-- Deletes: All yedek table indexes (~1.5 MB)
-- Safe: Only removes indexes, not tables or data
-- ========================================

BEGIN;

-- Yedek table indexes
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_mamul_bilesen_1;
DROP INDEX IF EXISTS celik_hasir_netsis_mm_stok_kodu_key_1;
DROP INDEX IF EXISTS celik_hasir_netsis_mm_pkey_1;
DROP INDEX IF EXISTS celik_hasir_netsis_ncbk_recete_pkey_1;
DROP INDEX IF EXISTS idx_celik_hasir_ncbk_recete_mamul_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_mamul_kodu_1;
DROP INDEX IF EXISTS gal_cost_cal_ym_gt_recete_pkey_2;
DROP INDEX IF EXISTS gal_cost_cal_ym_gt_recete_ym_gt_id_sira_no_key_2;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_mm_created_at_1;
DROP INDEX IF EXISTS idx_celik_hasir_mm_created_at_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_mm_hasir_tipi_1;
DROP INDEX IF EXISTS gal_cost_cal_mm_gt_ym_st_pkey_3;
DROP INDEX IF EXISTS gal_cost_cal_mm_gt_ym_st_mm_gt_id_ym_st_id_key_3;
DROP INDEX IF EXISTS gal_cost_cal_ym_st_recete_pkey_2_2;
DROP INDEX IF EXISTS gal_cost_cal_ym_st_recete_ym_st_id_sira_no_key_2_2;
DROP INDEX IF EXISTS idx_celik_hasir_mm_hasir_tipi_1;
DROP INDEX IF EXISTS idx_gal_ym_st_stok_kodu_3;
DROP INDEX IF EXISTS idx_gal_ym_st_stok_kodu_pattern_3;
DROP INDEX IF EXISTS idx_gal_cost_cal_ym_st_stok_kodu_pattern_3;
DROP INDEX IF EXISTS gal_cost_cal_ym_st_stok_kodu_key_3;
DROP INDEX IF EXISTS gal_cost_cal_mm_gt_ym_st_mm_gt_id_ym_st_id_key_1;
DROP INDEX IF EXISTS gal_cost_cal_mm_gt_stok_kodu_key_1;
DROP INDEX IF EXISTS gal_cost_cal_mm_gt_ym_st_pkey_1;
DROP INDEX IF EXISTS panel_cost_cal_panel_list_pkey_2;
DROP INDEX IF EXISTS idx_celik_hasir_mm_user_id_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_mm_user_id_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_bilesen_kodu_1;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_ncbk_id_1;
DROP INDEX IF EXISTS gal_cost_cal_mm_gt_ym_st_pkey_2;
DROP INDEX IF EXISTS gal_cost_cal_mm_gt_ym_st_mm_gt_id_ym_st_id_key_2;
DROP INDEX IF EXISTS gal_cost_cal_ym_st_stok_kodu_key_2;
DROP INDEX IF EXISTS idx_gal_cost_cal_ym_st_stok_kodu_pattern_2;
DROP INDEX IF EXISTS idx_gal_ym_st_stok_kodu_2;
DROP INDEX IF EXISTS idx_gal_ym_st_stok_kodu_pattern_2;
DROP INDEX IF EXISTS idx_gal_ym_st_priority_1;
DROP INDEX IF EXISTS gal_cost_cal_ym_st_pkey_3;
DROP INDEX IF EXISTS gal_cost_cal_mm_gt_pkey_1;
DROP INDEX IF EXISTS panel_cost_cal_panel_list_pkey_1;
DROP INDEX IF EXISTS gal_cost_cal_ym_st_pkey_2;

COMMIT;

-- Show results
SELECT
    'Yedek indexes deleted' AS status,
    COUNT(*) AS remaining_unused_indexes_on_production
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
AND schemaname = 'public'
AND relname NOT LIKE '%yedek%'
AND relname NOT LIKE '%backup%'
AND relname NOT LIKE '%Yedek%';

-- Show space saved
SELECT
    pg_size_pretty(pg_database_size(current_database())) AS database_size_after;
