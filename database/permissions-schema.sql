-- Permissions System Schema for CRM
-- This creates the tables and data needed for tab-level permissions

-- 1. Permissions table
CREATE TABLE IF NOT EXISTS crm_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'maliyet', 'access', 'page', 'admin', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. User permissions junction table
CREATE TABLE IF NOT EXISTS crm_user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    permission_id UUID NOT NULL REFERENCES crm_permissions(id) ON DELETE CASCADE,
    granted_by UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission_id)
);

-- 3. Create indexes for performance
CREATE INDEX idx_crm_user_permissions_user_id ON crm_user_permissions(user_id);
CREATE INDEX idx_crm_user_permissions_permission_id ON crm_user_permissions(permission_id);
CREATE INDEX idx_crm_permissions_category ON crm_permissions(category);

-- 4. Insert default permissions
INSERT INTO crm_permissions (permission_name, description, category) VALUES
-- Page level permissions
('page:maliyet-hesaplama', 'Access to Maliyet Hesaplama (Cost Calculation) page', 'page'),
('page:uretim-hesaplama', 'Access to Üretim Hesaplamaları (Production Calculations) page', 'page'),
('page:satis', 'Access to Satış (Sales) pages', 'page'),
('page:admin', 'Access to Admin pages', 'page'),

-- Maliyet permissions (with costs)
('maliyet:panel-cit', 'Access to Panel Çit cost calculations', 'maliyet'),
('maliyet:celik-hasir', 'Access to Çelik Hasır cost calculations', 'maliyet'),
('maliyet:galvanizli-tel', 'Access to Galvanizli Tel cost calculations', 'maliyet'),
('maliyet:profil', 'Access to Profil cost calculations', 'maliyet'),
('maliyet:view-costs', 'View cost information in calculations', 'maliyet'),
('maliyet:export', 'Export cost calculation results', 'maliyet'),

-- Access permissions (without costs)
('access:panel-cit', 'Access to Panel Çit production calculations', 'access'),
('access:celik-hasir', 'Access to Çelik Hasır production calculations', 'access'),
('access:galvanizli-tel', 'Access to Galvanizli Tel production calculations', 'access'),
('access:profil', 'Access to Profil production calculations', 'access'),
('access:view-weights', 'View weight calculations only', 'access'),
('access:export', 'Export production calculation results', 'access'),

-- Admin permissions
('admin:manage-users', 'Manage user accounts', 'admin'),
('admin:manage-permissions', 'Manage user permissions', 'admin'),
('admin:view-logs', 'View system logs', 'admin'),
('admin:system-settings', 'Manage system settings', 'admin')
ON CONFLICT (permission_name) DO NOTHING;

-- 5. Enable Row Level Security
ALTER TABLE crm_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_user_permissions ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Admins can view all permissions
CREATE POLICY "Admins can view all permissions"
    ON crm_permissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM crm_user_permissions up
            JOIN crm_permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid() 
            AND p.permission_name = 'admin:manage-permissions'
        )
    );

-- Users can view their own permissions
CREATE POLICY "Users can view their own user permissions"
    ON crm_user_permissions FOR SELECT
    USING (user_id = auth.uid());

-- Only admins can manage permissions
CREATE POLICY "Only admins can insert permissions"
    ON crm_user_permissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM crm_user_permissions up
            JOIN crm_permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid() 
            AND p.permission_name = 'admin:manage-permissions'
        )
    );

CREATE POLICY "Only admins can update permissions"
    ON crm_user_permissions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM crm_user_permissions up
            JOIN crm_permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid() 
            AND p.permission_name = 'admin:manage-permissions'
        )
    );

CREATE POLICY "Only admins can delete permissions"
    ON crm_user_permissions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM crm_user_permissions up
            JOIN crm_permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid() 
            AND p.permission_name = 'admin:manage-permissions'
        )
    );

-- 7. Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE(permission_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.permission_name::TEXT
    FROM crm_user_permissions up
    JOIN crm_permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to grant permission
CREATE OR REPLACE FUNCTION grant_permission(p_user_id UUID, p_permission_name VARCHAR, p_granted_by UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_permission_id UUID;
BEGIN
    -- Get permission ID
    SELECT id INTO v_permission_id
    FROM crm_permissions
    WHERE permission_name = p_permission_name;
    
    IF v_permission_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Insert permission
    INSERT INTO crm_user_permissions (user_id, permission_id, granted_by)
    VALUES (p_user_id, v_permission_id, p_granted_by)
    ON CONFLICT (user_id, permission_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to revoke permission
CREATE OR REPLACE FUNCTION revoke_permission(p_user_id UUID, p_permission_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_permission_id UUID;
BEGIN
    -- Get permission ID
    SELECT id INTO v_permission_id
    FROM crm_permissions
    WHERE permission_name = p_permission_name;
    
    IF v_permission_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Delete permission
    DELETE FROM crm_user_permissions
    WHERE user_id = p_user_id AND permission_id = v_permission_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 10. Sample permission assignments for testing
-- Uncomment and modify the user IDs to assign permissions
/*
-- Example: Grant all maliyet permissions to a cost analyst
DO $$
DECLARE
    v_user_id UUID := 'your-user-id-here';
    v_admin_id UUID := 'admin-user-id-here';
BEGIN
    PERFORM grant_permission(v_user_id, 'page:maliyet-hesaplama', v_admin_id);
    PERFORM grant_permission(v_user_id, 'maliyet:panel-cit', v_admin_id);
    PERFORM grant_permission(v_user_id, 'maliyet:celik-hasir', v_admin_id);
    PERFORM grant_permission(v_user_id, 'maliyet:galvanizli-tel', v_admin_id);
    PERFORM grant_permission(v_user_id, 'maliyet:profil', v_admin_id);
    PERFORM grant_permission(v_user_id, 'maliyet:view-costs', v_admin_id);
    PERFORM grant_permission(v_user_id, 'maliyet:export', v_admin_id);
END $$;

-- Example: Grant limited access to production worker
DO $$
DECLARE
    v_user_id UUID := 'production-user-id-here';
    v_admin_id UUID := 'admin-user-id-here';
BEGIN
    PERFORM grant_permission(v_user_id, 'page:uretim-hesaplama', v_admin_id);
    PERFORM grant_permission(v_user_id, 'access:panel-cit', v_admin_id);
    PERFORM grant_permission(v_user_id, 'access:celik-hasir', v_admin_id);
    PERFORM grant_permission(v_user_id, 'access:view-weights', v_admin_id);
END $$;
*/