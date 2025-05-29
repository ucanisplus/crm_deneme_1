-- Add Maliyet Permissions to Existing Role-Based System
-- Safe version that checks for existing permissions

-- First, let's see what permissions already exist
SELECT role, array_agg(permission_name ORDER BY permission_name) as existing_permissions
FROM user_permissions
GROUP BY role
ORDER BY role;

-- Add permissions only if they don't exist
-- 1. Admin role permissions
INSERT INTO user_permissions (role, permission_name) 
SELECT 'admin', permission FROM (VALUES
    ('maliyet:panel-cit'),
    ('maliyet:celik-hasir'),
    ('maliyet:galvanizli-tel'),
    ('maliyet:profil'),
    ('maliyet:tavli-tel'),
    ('maliyet:civi'),
    ('maliyet:zirhli-tel'),
    ('page:maliyet-hesaplama'),
    ('page:uretim-hesaplama')
) AS t(permission)
WHERE NOT EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE role = 'admin' AND permission_name = t.permission
);

-- 2. Admin2 role permissions
INSERT INTO user_permissions (role, permission_name) 
SELECT 'admin2', permission FROM (VALUES
    ('maliyet:panel-cit'),
    ('maliyet:celik-hasir'),
    ('maliyet:galvanizli-tel'),
    ('maliyet:profil'),
    ('maliyet:tavli-tel'),
    ('maliyet:civi'),
    ('maliyet:zirhli-tel'),
    ('page:maliyet-hesaplama'),
    ('page:uretim-hesaplama')
) AS t(permission)
WHERE NOT EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE role = 'admin2' AND permission_name = t.permission
);

-- 3. Production roles - only page access
INSERT INTO user_permissions (role, permission_name) 
SELECT role, 'page:uretim-hesaplama' FROM (VALUES
    ('Üretim Mühendisi 1'),
    ('Fabrika Müdürü'),
    ('Kalite Mühendisi 1'),
    ('Vardiya Mühendisi')
) AS t(role)
WHERE NOT EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE user_permissions.role = t.role 
    AND permission_name = 'page:uretim-hesaplama'
);

-- 4. Add access:profil for all roles that have access:celik-hasir
INSERT INTO user_permissions (role, permission_name)
SELECT DISTINCT role, 'access:profil'
FROM user_permissions
WHERE permission_name = 'access:celik-hasir'
AND NOT EXISTS (
    SELECT 1 FROM user_permissions p2
    WHERE p2.role = user_permissions.role 
    AND p2.permission_name = 'access:profil'
);

-- 5. Optional: Give Fabrika Müdürü some maliyet permissions
-- Uncomment if needed:
/*
INSERT INTO user_permissions (role, permission_name) 
SELECT 'Fabrika Müdürü', permission FROM (VALUES
    ('maliyet:panel-cit'),
    ('maliyet:celik-hasir'),
    ('page:maliyet-hesaplama')
) AS t(permission)
WHERE NOT EXISTS (
    SELECT 1 FROM user_permissions 
    WHERE role = 'Fabrika Müdürü' AND permission_name = t.permission
);
*/

-- Final check: Show all permissions by role
SELECT role, array_agg(permission_name ORDER BY permission_name) as permissions
FROM user_permissions
GROUP BY role
ORDER BY role;