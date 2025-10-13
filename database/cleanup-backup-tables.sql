-- ========================================
-- DELETE OLD BACKUP/YEDEK TABLES
-- ========================================
-- This will free up ~3.6 MB of space
-- These are old backups no longer needed
-- ========================================

BEGIN;

-- Drop backup tables
DROP TABLE IF EXISTS celik_hasir_netsis_ncbk_recete_yedek_1 CASCADE;
DROP TABLE IF EXISTS "gal_cost_cal_ym_gt_recete_13.10_yedek" CASCADE;
DROP TABLE IF EXISTS gal_cost_cal_ym_st_yedek_11_10 CASCADE;
DROP TABLE IF EXISTS gal_cost_cal_ym_st_recete_yedekbeforetoleranslogic CASCADE;
DROP TABLE IF EXISTS gal_cost_cal_mm_gt_yedek CASCADE;
DROP TABLE IF EXISTS gal_cost_cal_ym_st_yedekbeforetoleranslogic CASCADE;
DROP TABLE IF EXISTS gal_cost_cal_mm_gt_ym_st_yedek_beforetoleranslogic CASCADE;
DROP TABLE IF EXISTS panel_cost_cal_panel_list_1_yedek_2 CASCADE;
DROP TABLE IF EXISTS "gal_cost_cal_mm_gt_ym_st_yedek_08.10" CASCADE;
DROP TABLE IF EXISTS "gal_cost_cal_mm_gt_ym_st_yedek_03.10" CASCADE;
DROP TABLE IF EXISTS panel_cost_cal_panel_list_1_yedek CASCADE;
DROP TABLE IF EXISTS "celik_hasir_netsis_mm_Yedek29.09" CASCADE;

COMMIT;

-- Show remaining space
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size_after_cleanup;
