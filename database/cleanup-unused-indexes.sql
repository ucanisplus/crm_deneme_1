-- ========================================
-- DROP UNUSED INDEXES ON PRODUCTION TABLES
-- ========================================
-- These indexes are never used and slow down writes
-- Only dropping safe ones (not on backup tables)
-- ========================================

BEGIN;

-- CRM indexes (never used)
DROP INDEX IF EXISTS idx_crm_notifications_created_at;
DROP INDEX IF EXISTS idx_crm_activity_logs_created_at;
DROP INDEX IF EXISTS idx_crm_search_history_created_at;
DROP INDEX IF EXISTS idx_crm_user_favorites_user_id;

-- Celik hasir indexes (never used)
DROP INDEX IF EXISTS idx_celik_mm_recete_operasyon_bilesen;
DROP INDEX IF EXISTS idx_celik_hasir_ncbk_cap_stok;
DROP INDEX IF EXISTS idx_celik_hasir_ncbk_length;
DROP INDEX IF EXISTS idx_celik_hasir_ntel_cap_stok;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_ncbk_id;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ncbk_recete_bilesen_kodu;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ntel_recete_bilesen_kodu;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ntel_recete_mamul_bilesen;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ntel_recete_ntel_id;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ym_ncbk_user_id;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_ym_ntel_user_id;

-- Gal cost cal indexes (never used)
DROP INDEX IF EXISTS idx_gal_cost_cal_ym_st_stok_kodu_pattern;
DROP INDEX IF EXISTS idx_gal_cost_cal_mm_gt_stok_kodu_pattern;
DROP INDEX IF EXISTS idx_gal_cost_cal_mm_gt_kod_2_cap;
DROP INDEX IF EXISTS gal_cost_cal_ym_gt_stok_kodu_key;
DROP INDEX IF EXISTS idx_gal_cost_cal_ym_gt_stok_kodu_pattern;
DROP INDEX IF EXISTS gal_cost_cal_mm_gt_stok_kodu_key;
DROP INDEX IF EXISTS idx_mm_gt_recete_bilesen_kodu;
DROP INDEX IF EXISTS idx_mm_gt_recete_mamul_kodu;
DROP INDEX IF EXISTS idx_ym_gt_recete_mamul_kodu;
DROP INDEX IF EXISTS idx_ym_gt_recete_bilesen_kodu;
DROP INDEX IF EXISTS idx_gal_cost_cal_sal_requests_stok_kodu_1;

-- Planlama indexes (never used)
DROP INDEX IF EXISTS idx_production_speeds_lookup;
DROP INDEX IF EXISTS celik_hasir_planlama_production_speed_machine_id_en_ara_cap_key;

-- Mesh type indexes (never used)
DROP INDEX IF EXISTS idx_mesh_type_hasir_tipi;
DROP INDEX IF EXISTS idx_mesh_type_type;

-- Sequence indexes (never used)
DROP INDEX IF EXISTS idx_celik_hasir_netsis_sequence_lookup;
DROP INDEX IF EXISTS celik_hasir_netsis_sequence_product_type_kod_2_cap_code_key;

-- Filmasin map indexes (never used)
DROP INDEX IF EXISTS idx_celik_hasir_netsis_filmasin_target;
DROP INDEX IF EXISTS idx_celik_hasir_netsis_filmasin_target_priority;

COMMIT;

-- Show results
SELECT
    COUNT(*) AS remaining_unused_indexes
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
AND schemaname = 'public';
