-- ========================================
-- FIX TIMEZONE PERFORMANCE ISSUE (SAFE VERSION)
-- ========================================
-- This script only fixes tables that exist
-- Safe to run - checks for existence before altering
-- ========================================

BEGIN;

-- ========================================
-- STEP 1: Fix trigger function if it exists
-- ========================================

DO $$
BEGIN
    -- Check if the function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        -- Drop and recreate the function
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        RAISE NOTICE '✅ Trigger function updated';

        -- Recreate triggers for tables that exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_notifications') THEN
            DROP TRIGGER IF EXISTS update_crm_notifications_updated_at ON crm_notifications;
            CREATE TRIGGER update_crm_notifications_updated_at
                BEFORE UPDATE ON crm_notifications
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE '✅ crm_notifications trigger recreated';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_user_preferences') THEN
            DROP TRIGGER IF EXISTS update_crm_user_preferences_updated_at ON crm_user_preferences;
            CREATE TRIGGER update_crm_user_preferences_updated_at
                BEFORE UPDATE ON crm_user_preferences
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE '✅ crm_user_preferences trigger recreated';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_user_profiles') THEN
            DROP TRIGGER IF EXISTS update_crm_user_profiles_updated_at ON crm_user_profiles;
            CREATE TRIGGER update_crm_user_profiles_updated_at
                BEFORE UPDATE ON crm_user_profiles
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            RAISE NOTICE '✅ crm_user_profiles trigger recreated';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ Trigger function does not exist, skipping';
    END IF;
END $$;

-- ========================================
-- STEP 2: Fix DEFAULT values on existing tables
-- ========================================

DO $$
DECLARE
    v_fixed_count INTEGER := 0;
BEGIN
    -- Fix crm_notifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_notifications') THEN
        ALTER TABLE crm_notifications
            ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
            ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
        v_fixed_count := v_fixed_count + 1;
        RAISE NOTICE '✅ Fixed crm_notifications';
    END IF;

    -- Fix crm_user_preferences
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_user_preferences') THEN
        ALTER TABLE crm_user_preferences
            ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
            ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
        v_fixed_count := v_fixed_count + 1;
        RAISE NOTICE '✅ Fixed crm_user_preferences';
    END IF;

    -- Fix crm_user_profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_user_profiles') THEN
        ALTER TABLE crm_user_profiles
            ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
            ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
        v_fixed_count := v_fixed_count + 1;
        RAISE NOTICE '✅ Fixed crm_user_profiles';
    END IF;

    -- Fix crm_search_history
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_search_history') THEN
        ALTER TABLE crm_search_history
            ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
        v_fixed_count := v_fixed_count + 1;
        RAISE NOTICE '✅ Fixed crm_search_history';
    END IF;

    -- Fix crm_activity_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_activity_logs') THEN
        ALTER TABLE crm_activity_logs
            ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
        v_fixed_count := v_fixed_count + 1;
        RAISE NOTICE '✅ Fixed crm_activity_logs';
    END IF;

    -- Fix crm_user_favorites
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_user_favorites') THEN
        ALTER TABLE crm_user_favorites
            ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
        v_fixed_count := v_fixed_count + 1;
        RAISE NOTICE '✅ Fixed crm_user_favorites';
    END IF;

    -- Fix crm_permissions (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_permissions') THEN
        ALTER TABLE crm_permissions
            ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
        v_fixed_count := v_fixed_count + 1;
        RAISE NOTICE '✅ Fixed crm_permissions';
    END IF;

    -- Fix crm_user_permissions (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_user_permissions') THEN
        ALTER TABLE crm_user_permissions
            ALTER COLUMN granted_at SET DEFAULT CURRENT_TIMESTAMP;
        v_fixed_count := v_fixed_count + 1;
        RAISE NOTICE '✅ Fixed crm_user_permissions';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRATION COMPLETE!';
    RAISE NOTICE '✅ Fixed % tables', v_fixed_count;
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ========================================
-- VERIFICATION (Run separately after commit)
-- ========================================
-- Uncomment and run to verify the changes:

/*
-- Check default values were updated
SELECT
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_name LIKE 'crm_%'
AND column_name IN ('created_at', 'updated_at', 'granted_at')
ORDER BY table_name, column_name;

-- Check trigger function
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'update_updated_at_column';
*/
