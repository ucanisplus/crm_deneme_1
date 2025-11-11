-- ========================================
-- DROP ALL CONSTRAINTS ON YEDEK/BACKUP TABLES
-- ========================================
-- Removes PRIMARY KEY and UNIQUE constraints
-- This automatically drops their backing indexes
-- Frees up ~1 MB additional space
-- Safe: These are backup tables, don't need constraints
-- ========================================

BEGIN;

-- celik_hasir_netsis_mm_Yedek29.09
ALTER TABLE "celik_hasir_netsis_mm_Yedek29.09" DROP CONSTRAINT IF EXISTS celik_hasir_netsis_mm_stok_kodu_key_1 CASCADE;
ALTER TABLE "celik_hasir_netsis_mm_Yedek29.09" DROP CONSTRAINT IF EXISTS celik_hasir_netsis_mm_pkey_1 CASCADE;

-- celik_hasir_netsis_ncbk_recete_yedek_1
ALTER TABLE celik_hasir_netsis_ncbk_recete_yedek_1 DROP CONSTRAINT IF EXISTS celik_hasir_netsis_ncbk_recete_pkey_1 CASCADE;

-- gal_cost_cal_ym_gt_recete_13.10_yedek
ALTER TABLE "gal_cost_cal_ym_gt_recete_13.10_yedek" DROP CONSTRAINT IF EXISTS gal_cost_cal_ym_gt_recete_pkey_2 CASCADE;
ALTER TABLE "gal_cost_cal_ym_gt_recete_13.10_yedek" DROP CONSTRAINT IF EXISTS gal_cost_cal_ym_gt_recete_ym_gt_id_sira_no_key_2 CASCADE;

-- gal_cost_cal_mm_gt_ym_st_yedek_beforetoleranslogic
ALTER TABLE gal_cost_cal_mm_gt_ym_st_yedek_beforetoleranslogic DROP CONSTRAINT IF EXISTS gal_cost_cal_mm_gt_ym_st_pkey_3 CASCADE;
ALTER TABLE gal_cost_cal_mm_gt_ym_st_yedek_beforetoleranslogic DROP CONSTRAINT IF EXISTS gal_cost_cal_mm_gt_ym_st_mm_gt_id_ym_st_id_key_3 CASCADE;

-- gal_cost_cal_ym_st_recete_yedekbeforetoleranslogic
ALTER TABLE gal_cost_cal_ym_st_recete_yedekbeforetoleranslogic DROP CONSTRAINT IF EXISTS gal_cost_cal_ym_st_recete_pkey_2_2 CASCADE;
ALTER TABLE gal_cost_cal_ym_st_recete_yedekbeforetoleranslogic DROP CONSTRAINT IF EXISTS gal_cost_cal_ym_st_recete_ym_st_id_sira_no_key_2_2 CASCADE;

-- gal_cost_cal_ym_st_yedek_11_10
ALTER TABLE gal_cost_cal_ym_st_yedek_11_10 DROP CONSTRAINT IF EXISTS gal_cost_cal_ym_st_stok_kodu_key_3 CASCADE;
ALTER TABLE gal_cost_cal_ym_st_yedek_11_10 DROP CONSTRAINT IF EXISTS gal_cost_cal_ym_st_pkey_3 CASCADE;

-- gal_cost_cal_mm_gt_ym_st_yedek_03.10
ALTER TABLE "gal_cost_cal_mm_gt_ym_st_yedek_03.10" DROP CONSTRAINT IF EXISTS gal_cost_cal_mm_gt_ym_st_mm_gt_id_ym_st_id_key_1 CASCADE;
ALTER TABLE "gal_cost_cal_mm_gt_ym_st_yedek_03.10" DROP CONSTRAINT IF EXISTS gal_cost_cal_mm_gt_ym_st_pkey_1 CASCADE;

-- gal_cost_cal_mm_gt_yedek
ALTER TABLE gal_cost_cal_mm_gt_yedek DROP CONSTRAINT IF EXISTS gal_cost_cal_mm_gt_stok_kodu_key_1 CASCADE;
ALTER TABLE gal_cost_cal_mm_gt_yedek DROP CONSTRAINT IF EXISTS gal_cost_cal_mm_gt_pkey_1 CASCADE;

-- panel_cost_cal_panel_list_1_yedek_2
ALTER TABLE panel_cost_cal_panel_list_1_yedek_2 DROP CONSTRAINT IF EXISTS panel_cost_cal_panel_list_pkey_2 CASCADE;

-- gal_cost_cal_mm_gt_ym_st_yedek_08.10
ALTER TABLE "gal_cost_cal_mm_gt_ym_st_yedek_08.10" DROP CONSTRAINT IF EXISTS gal_cost_cal_mm_gt_ym_st_pkey_2 CASCADE;
ALTER TABLE "gal_cost_cal_mm_gt_ym_st_yedek_08.10" DROP CONSTRAINT IF EXISTS gal_cost_cal_mm_gt_ym_st_mm_gt_id_ym_st_id_key_2 CASCADE;

-- panel_cost_cal_panel_list_1_yedek
ALTER TABLE panel_cost_cal_panel_list_1_yedek DROP CONSTRAINT IF EXISTS panel_cost_cal_panel_list_pkey_1 CASCADE;

-- gal_cost_cal_ym_st_yedekbeforetoleranslogic
ALTER TABLE gal_cost_cal_ym_st_yedekbeforetoleranslogic DROP CONSTRAINT IF EXISTS gal_cost_cal_ym_st_stok_kodu_key_2 CASCADE;
ALTER TABLE gal_cost_cal_ym_st_yedekbeforetoleranslogic DROP CONSTRAINT IF EXISTS gal_cost_cal_ym_st_pkey_2 CASCADE;

COMMIT;

-- Show results
SELECT
    'All yedek constraints and indexes dropped!' AS status,
    pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- Verify no indexes remain on yedek tables
SELECT
    COUNT(*) AS remaining_yedek_indexes
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND (relname LIKE '%yedek%' OR relname LIKE '%Yedek%' OR relname LIKE '%backup%');
