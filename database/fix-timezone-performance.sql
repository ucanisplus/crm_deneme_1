-- ========================================
-- FIX TIMEZONE PERFORMANCE ISSUE
-- ========================================
-- This script removes TIMEZONE('utc', NOW()) calls that cause
-- pg_timezone_names lookups on every INSERT/UPDATE
--
-- Impact: Reduces 130+ database calls taking 55+ seconds
-- Safety: This only changes DEFAULT values and trigger logic
--         No data is modified or lost
-- ========================================

-- Start transaction for safety
BEGIN;

-- ========================================
-- PART 1: Fix the trigger function (CRITICAL)
-- ========================================
-- This function is called on EVERY UPDATE to multiple tables
-- Replacing TIMEZONE('utc', NOW()) with CURRENT_TIMESTAMP
-- eliminates pg_timezone_names lookups

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers for tables that use this function
CREATE TRIGGER update_crm_notifications_updated_at
    BEFORE UPDATE ON crm_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_user_preferences_updated_at
    BEFORE UPDATE ON crm_user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_user_profiles_updated_at
    BEFORE UPDATE ON crm_user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- PART 2: Fix DEFAULT values on existing tables
-- ========================================
-- These changes only affect NEW rows inserted after this migration
-- Existing data remains unchanged

-- Fix crm_notifications table
ALTER TABLE crm_notifications
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Fix crm_user_preferences table
ALTER TABLE crm_user_preferences
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Fix crm_user_profiles table
ALTER TABLE crm_user_profiles
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Fix crm_search_history table (high write volume)
ALTER TABLE crm_search_history
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- Fix crm_activity_logs table (high write volume)
ALTER TABLE crm_activity_logs
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- Fix crm_user_favorites table
ALTER TABLE crm_user_favorites
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- Fix crm_permissions table
ALTER TABLE crm_permissions
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;

-- Fix crm_user_permissions table
ALTER TABLE crm_user_permissions
    ALTER COLUMN granted_at SET DEFAULT CURRENT_TIMESTAMP;

-- ========================================
-- PART 3: Verification
-- ========================================
-- Check that all changes were applied successfully

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verify trigger function exists
    SELECT COUNT(*) INTO v_count
    FROM pg_proc
    WHERE proname = 'update_updated_at_column';

    IF v_count = 0 THEN
        RAISE EXCEPTION 'Trigger function was not created successfully';
    END IF;

    -- Verify triggers exist
    SELECT COUNT(*) INTO v_count
    FROM pg_trigger
    WHERE tgname IN (
        'update_crm_notifications_updated_at',
        'update_crm_user_preferences_updated_at',
        'update_crm_user_profiles_updated_at'
    );

    IF v_count != 3 THEN
        RAISE EXCEPTION 'Not all triggers were created successfully';
    END IF;

    RAISE NOTICE '✅ All timezone performance fixes applied successfully!';
    RAISE NOTICE '✅ Trigger function updated';
    RAISE NOTICE '✅ % triggers recreated', v_count;
    RAISE NOTICE '✅ 8 table defaults updated';
END $$;

-- Commit if everything succeeded
COMMIT;

-- ========================================
-- VERIFICATION QUERIES (Optional - run after COMMIT)
-- ========================================
-- Uncomment to verify the changes:

/*
-- Check the trigger function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'update_updated_at_column';

-- Check default values on tables
SELECT
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_name IN (
    'crm_notifications',
    'crm_user_preferences',
    'crm_user_profiles',
    'crm_search_history',
    'crm_activity_logs',
    'crm_user_favorites',
    'crm_permissions',
    'crm_user_permissions'
)
AND column_name IN ('created_at', 'updated_at', 'granted_at')
ORDER BY table_name, column_name;
*/

-- ========================================
-- ROLLBACK SCRIPT (If needed)
-- ========================================
-- Save this for emergency rollback:

/*
BEGIN;

-- Restore old trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers
CREATE TRIGGER update_crm_notifications_updated_at
    BEFORE UPDATE ON crm_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_user_preferences_updated_at
    BEFORE UPDATE ON crm_user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_user_profiles_updated_at
    BEFORE UPDATE ON crm_user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Restore old defaults
ALTER TABLE crm_notifications
    ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc', NOW()),
    ALTER COLUMN updated_at SET DEFAULT TIMEZONE('utc', NOW());

ALTER TABLE crm_user_preferences
    ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc', NOW()),
    ALTER COLUMN updated_at SET DEFAULT TIMEZONE('utc', NOW());

ALTER TABLE crm_user_profiles
    ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc', NOW()),
    ALTER COLUMN updated_at SET DEFAULT TIMEZONE('utc', NOW());

ALTER TABLE crm_search_history
    ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc', NOW());

ALTER TABLE crm_activity_logs
    ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc', NOW());

ALTER TABLE crm_user_favorites
    ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc', NOW());

ALTER TABLE crm_permissions
    ALTER COLUMN created_at SET DEFAULT TIMEZONE('utc', NOW());

ALTER TABLE crm_user_permissions
    ALTER COLUMN granted_at SET DEFAULT TIMEZONE('utc', NOW());

COMMIT;
*/
