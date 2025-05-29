-- Add Maliyet Permissions to Existing Role-Based System
-- This works with your current user_permissions table structure

-- 1. Add maliyet permissions for admin role (full access to costs)
INSERT INTO user_permissions (id, role, permission_name) VALUES
(uuid_generate_v4(), 'admin', 'maliyet:panel-cit'),
(uuid_generate_v4(), 'admin', 'maliyet:celik-hasir'),
(uuid_generate_v4(), 'admin', 'maliyet:galvanizli-tel'),
(uuid_generate_v4(), 'admin', 'maliyet:profil'),
(uuid_generate_v4(), 'admin', 'maliyet:tavli-tel'),
(uuid_generate_v4(), 'admin', 'maliyet:civi'),
(uuid_generate_v4(), 'admin', 'maliyet:zirhli-tel'),
(uuid_generate_v4(), 'admin', 'page:maliyet-hesaplama'),
(uuid_generate_v4(), 'admin', 'page:uretim-hesaplama');

-- 2. Add maliyet permissions for admin2 role
INSERT INTO user_permissions (id, role, permission_name) VALUES
(uuid_generate_v4(), 'admin2', 'maliyet:panel-cit'),
(uuid_generate_v4(), 'admin2', 'maliyet:celik-hasir'),
(uuid_generate_v4(), 'admin2', 'maliyet:galvanizli-tel'),
(uuid_generate_v4(), 'admin2', 'maliyet:profil'),
(uuid_generate_v4(), 'admin2', 'maliyet:tavli-tel'),
(uuid_generate_v4(), 'admin2', 'maliyet:civi'),
(uuid_generate_v4(), 'admin2', 'maliyet:zirhli-tel'),
(uuid_generate_v4(), 'admin2', 'page:maliyet-hesaplama'),
(uuid_generate_v4(), 'admin2', 'page:uretim-hesaplama');

-- 3. Add page permission for Üretim Mühendisi roles (they only get production access, no costs)
INSERT INTO user_permissions (id, role, permission_name) VALUES
(uuid_generate_v4(), 'Üretim Mühendisi 1', 'page:uretim-hesaplama'),
(uuid_generate_v4(), 'Fabrika Müdürü', 'page:uretim-hesaplama'),
(uuid_generate_v4(), 'Kalite Mühendisi 1', 'page:uretim-hesaplama');

-- 4. For Kalite Mühendisi 1 and Fabrika Müdürü, you might want to give limited maliyet access
-- Uncomment if needed:
/*
INSERT INTO user_permissions (id, role, permission_name) VALUES
(uuid_generate_v4(), 'Fabrika Müdürü', 'maliyet:panel-cit'),
(uuid_generate_v4(), 'Fabrika Müdürü', 'maliyet:celik-hasir'),
(uuid_generate_v4(), 'Fabrika Müdürü', 'page:maliyet-hesaplama');
*/

-- 5. Vardiya Mühendisi gets only production access
INSERT INTO user_permissions (id, role, permission_name) VALUES
(uuid_generate_v4(), 'Vardiya Mühendisi', 'page:uretim-hesaplama');

-- 6. Add profil access permission for all roles that have access:celik-hasir
-- Since I see many roles have access:celik-hasir, let's add access:profil for them
INSERT INTO user_permissions (id, role, permission_name)
SELECT DISTINCT uuid_generate_v4(), role, 'access:profil'
FROM user_permissions
WHERE permission_name = 'access:celik-hasir'
AND role NOT IN (SELECT role FROM user_permissions WHERE permission_name = 'access:profil');

-- 7. Verify what permissions each role has
SELECT role, array_agg(permission_name ORDER BY permission_name) as permissions
FROM user_permissions
GROUP BY role
ORDER BY role;