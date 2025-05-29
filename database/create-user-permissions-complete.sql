-- Complete creation and setup of user_permissions table
-- Run this AFTER manually dropping the existing user_permissions table

-- 1. Create the user_permissions table
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(100) NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_name)
);

-- 2. Create index for better performance
CREATE INDEX idx_user_permissions_role ON user_permissions(role);
CREATE INDEX idx_user_permissions_permission ON user_permissions(permission_name);

-- 3. Insert all permissions

-- Admin permissions (full access to everything)
INSERT INTO user_permissions (role, permission_name) VALUES
-- Page access
('admin', 'page:maliyet-hesaplama'),
('admin', 'page:uretim-hesaplama'),
-- Maliyet permissions (with costs)
('admin', 'maliyet:panel-cit'),
('admin', 'maliyet:celik-hasir'),
('admin', 'maliyet:galvanizli-tel'),
('admin', 'maliyet:profil'),
('admin', 'maliyet:tavli-tel'),
('admin', 'maliyet:civi'),
('admin', 'maliyet:zirhli-tel'),
-- Access permissions (without costs)
('admin', 'access:panel-cit'),
('admin', 'access:celik-hasir'),
('admin', 'access:galvanizli-tel'),
('admin', 'access:profil'),
('admin', 'access:tavli-tel'),
('admin', 'access:civi'),
('admin', 'access:zirhli-tel'),
('admin', 'access:admin'),
('admin', 'access:settings'),
('admin', 'access:galvanizli-tel-request'),
('admin', 'admin:manage-permissions');

-- Admin2 permissions (same as admin)
INSERT INTO user_permissions (role, permission_name) VALUES
-- Page access
('admin2', 'page:maliyet-hesaplama'),
('admin2', 'page:uretim-hesaplama'),
-- Maliyet permissions
('admin2', 'maliyet:panel-cit'),
('admin2', 'maliyet:celik-hasir'),
('admin2', 'maliyet:galvanizli-tel'),
('admin2', 'maliyet:profil'),
('admin2', 'maliyet:tavli-tel'),
('admin2', 'maliyet:civi'),
('admin2', 'maliyet:zirhli-tel'),
-- Access permissions
('admin2', 'access:panel-cit'),
('admin2', 'access:celik-hasir'),
('admin2', 'access:galvanizli-tel'),
('admin2', 'access:profil'),
('admin2', 'access:tavli-tel'),
('admin2', 'access:civi'),
('admin2', 'access:zirhli-tel'),
('admin2', 'access:galvanizli-tel-request'),
('admin2', 'access:settings');

-- Üretim Mühendisi 1 (production only, no costs)
INSERT INTO user_permissions (role, permission_name) VALUES
('Üretim Mühendisi 1', 'page:uretim-hesaplama'),
('Üretim Mühendisi 1', 'access:panel-cit'),
('Üretim Mühendisi 1', 'access:celik-hasir'),
('Üretim Mühendisi 1', 'access:galvanizli-tel'),
('Üretim Mühendisi 1', 'access:profil');

-- Kalite Mühendisi 1 (production only, no costs)
INSERT INTO user_permissions (role, permission_name) VALUES
('Kalite Mühendisi 1', 'page:uretim-hesaplama'),
('Kalite Mühendisi 1', 'access:panel-cit'),
('Kalite Mühendisi 1', 'access:celik-hasir'),
('Kalite Mühendisi 1', 'access:galvanizli-tel'),
('Kalite Mühendisi 1', 'access:profil');

-- Fabrika Müdürü (production + limited maliyet access)
INSERT INTO user_permissions (role, permission_name) VALUES
('Fabrika Müdürü', 'page:uretim-hesaplama'),
('Fabrika Müdürü', 'page:maliyet-hesaplama'),
('Fabrika Müdürü', 'access:panel-cit'),
('Fabrika Müdürü', 'access:celik-hasir'),
('Fabrika Müdürü', 'access:galvanizli-tel'),
('Fabrika Müdürü', 'access:profil'),
('Fabrika Müdürü', 'maliyet:panel-cit'),
('Fabrika Müdürü', 'maliyet:celik-hasir'),
('Fabrika Müdürü', 'maliyet:galvanizli-tel'),
('Fabrika Müdürü', 'maliyet:profil');

-- Vardiya Mühendisi (limited production access)
INSERT INTO user_permissions (role, permission_name) VALUES
('Vardiya Mühendisi', 'page:uretim-hesaplama'),
('Vardiya Mühendisi', 'access:panel-cit'),
('Vardiya Mühendisi', 'access:celik-hasir');

-- muhendis_2 (from your screenshot - production access)
INSERT INTO user_permissions (role, permission_name) VALUES
('muhendis_2', 'page:uretim-hesaplama'),
('muhendis_2', 'access:panel-cit'),
('muhendis_2', 'access:celik-hasir'),
('muhendis_2', 'access:galvanizli-tel'),
('muhendis_2', 'access:tavli-tel'),
('muhendis_2', 'access:civi'),
('muhendis_2', 'access:zirhli-tel');

-- 4. Verify the setup
SELECT 
    role, 
    COUNT(*) as permission_count,
    string_agg(permission_name, ', ' ORDER BY permission_name) as permissions
FROM user_permissions
GROUP BY role
ORDER BY role;

-- 5. Quick summary
SELECT 
    COUNT(DISTINCT role) as total_roles,
    COUNT(*) as total_permissions
FROM user_permissions;