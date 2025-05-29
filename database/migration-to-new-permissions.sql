-- Migration Guide: From Role-Based to User-Based Permissions
-- DO NOT RUN THIS IF YOU ALREADY HAVE THE NEW TABLES!

-- First, check if you have the new tables
-- Run this query to check:
/*
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('crm_permissions', 'crm_user_permissions', 'user_permissions');
*/

-- OPTION 1: If you DON'T have the new tables (crm_permissions, crm_user_permissions)
-- Run the permissions-schema.sql file to create them

-- OPTION 2: If you ALREADY have the new tables
-- Just insert the new permissions if they don't exist:

INSERT INTO crm_permissions (permission_name, description, category) VALUES
-- Page level permissions
('page:maliyet-hesaplama', 'Access to Maliyet Hesaplama (Cost Calculation) page', 'page'),
('page:uretim-hesaplama', 'Access to Üretim Hesaplamaları (Production Calculations) page', 'page'),

-- Maliyet permissions (with costs)
('maliyet:panel-cit', 'Access to Panel Çit cost calculations', 'maliyet'),
('maliyet:celik-hasir', 'Access to Çelik Hasır cost calculations', 'maliyet'),
('maliyet:galvanizli-tel', 'Access to Galvanizli Tel cost calculations', 'maliyet'),
('maliyet:profil', 'Access to Profil cost calculations', 'maliyet'),

-- Access permissions (without costs)
('access:panel-cit', 'Access to Panel Çit production calculations', 'access'),
('access:celik-hasir', 'Access to Çelik Hasır production calculations', 'access'),
('access:galvanizli-tel', 'Access to Galvanizli Tel production calculations', 'access'),
('access:profil', 'Access to Profil production calculations', 'access')
ON CONFLICT (permission_name) DO NOTHING;

-- OPTION 3: Migrate from role-based to user-based permissions
-- This will copy permissions from the old system to the new one

-- Step 1: Get permission IDs for the new permissions
WITH permission_mapping AS (
    SELECT 
        p.id as permission_id,
        p.permission_name
    FROM crm_permissions p
    WHERE p.permission_name IN (
        'page:maliyet-hesaplama', 'page:uretim-hesaplama',
        'maliyet:panel-cit', 'maliyet:celik-hasir', 'maliyet:galvanizli-tel', 'maliyet:profil',
        'access:panel-cit', 'access:celik-hasir', 'access:galvanizli-tel', 'access:profil'
    )
)
-- Step 2: Grant permissions based on roles
INSERT INTO crm_user_permissions (user_id, permission_id, granted_by, granted_at)
SELECT DISTINCT
    u.id as user_id,
    pm.permission_id,
    u.id as granted_by, -- Self-granted during migration
    NOW() as granted_at
FROM crm_users u
CROSS JOIN permission_mapping pm
WHERE 
    -- Admin gets all permissions
    (u.role = 'admin') OR
    -- Engineer roles get specific permissions based on their level
    (u.role = 'engineer_1' AND pm.permission_name LIKE 'access:%') OR
    (u.role = 'engineer_2' AND pm.permission_name IN ('page:maliyet-hesaplama', 'maliyet:panel-cit', 'maliyet:celik-hasir')) OR
    (u.role = 'engineer_3' AND pm.permission_name LIKE 'maliyet:%')
ON CONFLICT (user_id, permission_id) DO NOTHING;

-- Step 3: Update the backend API endpoint
-- The backend needs to be updated to use the new permission system
-- Current endpoint at /api/user/permissions/:userId should query:
/*
SELECT p.permission_name 
FROM crm_user_permissions up
JOIN crm_permissions p ON up.permission_id = p.id
WHERE up.user_id = $1
*/

-- Instead of the current role-based query:
/*
SELECT array_agg(p.permission_name) as permissions
FROM user_permissions p 
WHERE p.role = (SELECT role FROM crm_users WHERE id = $1)
*/