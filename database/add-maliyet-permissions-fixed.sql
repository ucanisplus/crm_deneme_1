-- Add Maliyet Permissions to Existing Role-Based System
-- Fixed version for integer ID column

-- 1. Add maliyet permissions for admin role (full access to costs)
INSERT INTO user_permissions (role, permission_name) VALUES
('admin', 'maliyet:panel-cit'),
('admin', 'maliyet:celik-hasir'),
('admin', 'maliyet:galvanizli-tel'),
('admin', 'maliyet:profil'),
('admin', 'maliyet:tavli-tel'),
('admin', 'maliyet:civi'),
('admin', 'maliyet:zirhli-tel'),
('admin', 'page:maliyet-hesaplama'),
('admin', 'page:uretim-hesaplama');

-- 2. Add maliyet permissions for admin2 role
INSERT INTO user_permissions (role, permission_name) VALUES
('admin2', 'maliyet:panel-cit'),
('admin2', 'maliyet:celik-hasir'),
('admin2', 'maliyet:galvanizli-tel'),
('admin2', 'maliyet:profil'),
('admin2', 'maliyet:tavli-tel'),
('admin2', 'maliyet:civi'),
('admin2', 'maliyet:zirhli-tel'),
('admin2', 'page:maliyet-hesaplama'),
('admin2', 'page:uretim-hesaplama');

-- 3. Add page permission for Üretim Mühendisi roles (they only get production access, no costs)
INSERT INTO user_permissions (role, permission_name) VALUES
('Üretim Mühendisi 1', 'page:uretim-hesaplama'),
('Fabrika Müdürü', 'page:uretim-hesaplama'),
('Kalite Mühendisi 1', 'page:uretim-hesaplama');

-- 4. For Kalite Mühendisi 1 and Fabrika Müdürü, you might want to give limited maliyet access
-- Uncomment if needed:
/*
INSERT INTO user_permissions (role, permission_name) VALUES
('Fabrika Müdürü', 'maliyet:panel-cit'),
('Fabrika Müdürü', 'maliyet:celik-hasir'),
('Fabrika Müdürü', 'page:maliyet-hesaplama');
*/

-- 5. Vardiya Mühendisi gets only production access
INSERT INTO user_permissions (role, permission_name) VALUES
('Vardiya Mühendisi', 'page:uretim-hesaplama');

-- 6. Add profil access permission for all roles that have access:celik-hasir
-- Since I see many roles have access:celik-hasir, let's add access:profil for them
INSERT INTO user_permissions (role, permission_name)
SELECT DISTINCT role, 'access:profil'
FROM user_permissions
WHERE permission_name = 'access:celik-hasir'
AND role NOT IN (SELECT role FROM user_permissions WHERE permission_name = 'access:profil');

-- 7. Verify what permissions each role has
SELECT role, array_agg(permission_name ORDER BY permission_name) as permissions
FROM user_permissions
GROUP BY role
ORDER BY role;