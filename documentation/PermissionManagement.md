# Permission Management Guide for CRM

## Overview

This guide explains how to manage user permissions for the tabs in Maliyet Hesaplama and Üretim Hesaplamaları pages.

## Permission Structure

### 1. Tab Permissions

#### Maliyet Hesaplama (Cost Calculation) Tabs:
- `maliyet:panel-cit` - Access to Panel Çit calculations with costs
- `maliyet:celik-hasir` - Access to Çelik Hasır calculations with costs
- `maliyet:galvanizli-tel` - Access to Galvanizli Tel calculations with costs
- `maliyet:profil` - Access to Profil calculations with costs

#### Üretim Hesaplamaları (Production Calculations) Tabs:
- `access:panel-cit` - Access to Panel Çit calculations without costs
- `access:celik-hasir` - Access to Çelik Hasır calculations without costs
- `access:galvanizli-tel` - Access to Galvanizli Tel calculations without costs
- `access:profil` - Access to Profil calculations without costs

### 2. Page Level Permissions
- `page:maliyet-hesaplama` - Access to entire Maliyet Hesaplama page
- `page:uretim-hesaplama` - Access to entire Üretim Hesaplamaları page

## Database Schema

Add these tables to your database:

```sql
-- Permissions table
CREATE TABLE IF NOT EXISTS crm_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'maliyet', 'access', 'page', 'admin', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User permissions junction table
CREATE TABLE IF NOT EXISTS crm_user_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    permission_id UUID NOT NULL REFERENCES crm_permissions(id) ON DELETE CASCADE,
    granted_by UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, permission_id)
);

-- Insert default permissions
INSERT INTO crm_permissions (permission_name, description, category) VALUES
-- Page permissions
('page:maliyet-hesaplama', 'Access to Maliyet Hesaplama page', 'page'),
('page:uretim-hesaplama', 'Access to Üretim Hesaplamaları page', 'page'),
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

-- Create indexes
CREATE INDEX idx_crm_user_permissions_user_id ON crm_user_permissions(user_id);
CREATE INDEX idx_crm_user_permissions_permission_id ON crm_user_permissions(permission_id);
```

## Implementation Steps

### 1. Update Backend API

Create an endpoint to fetch user permissions:

```javascript
// GET /api/user/permissions/:userId
app.get('/api/user/permissions/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const query = `
      SELECT p.permission_name 
      FROM crm_user_permissions up
      JOIN crm_permissions p ON up.permission_id = p.id
      WHERE up.user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    const permissions = result.rows.map(row => row.permission_name);
    
    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});
```

### 2. Update HesaplamalarPage (Maliyet)

The Maliyet Hesaplama page should check for `maliyet:*` permissions:

```jsx
// In HesaplamalarPage.jsx
const allTabs = [
  { id: 'panel-cit', name: 'Panel Çit', icon: <Grid size={16} />, permission: 'maliyet:panel-cit' },
  { id: 'celik-hasir', name: 'Çelik Hasır', icon: <Grid size={16} />, permission: 'maliyet:celik-hasir' },
  { id: 'galvanizli-tel', name: 'Galvanizli Tel', icon: <Link size={16} />, permission: 'maliyet:galvanizli-tel' },
  { id: 'profil', name: 'Profil', icon: <Grid size={16} />, permission: 'maliyet:profil' },
];

const allowedTabs = allTabs.filter(tab => hasPermission(tab.permission));
```

### 3. Admin Interface

Create an admin interface to manage permissions:

```jsx
// AdminPermissions.jsx component
const AdminPermissions = () => {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  
  // Function to grant permission
  const grantPermission = async (userId, permissionName) => {
    const response = await fetch('/api/user-permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, permissionName })
    });
    // Handle response
  };
  
  // Function to revoke permission
  const revokePermission = async (userId, permissionName) => {
    const response = await fetch('/api/user-permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, permissionName })
    });
    // Handle response
  };
  
  // Render UI for managing permissions
};
```

## Usage Examples

### 1. Check Page Access
```jsx
// In page component
const { hasPermission } = useAuth();

useEffect(() => {
  if (!hasPermission('page:maliyet-hesaplama')) {
    router.push('/unauthorized');
  }
}, [hasPermission]);
```

### 2. Conditional Tab Rendering
```jsx
{hasPermission('maliyet:panel-cit') && (
  <Tab value="panel-cit">Panel Çit</Tab>
)}
```

### 3. Role-Based Permission Groups

You can create role-based groups by assigning multiple permissions:

- **Production Worker**: 
  - `page:uretim-hesaplama`
  - `access:panel-cit`
  - `access:celik-hasir`
  
- **Cost Analyst**:
  - `page:maliyet-hesaplama`
  - All `maliyet:*` permissions
  
- **Manager**:
  - All permissions

## Security Considerations

1. Always check permissions on both frontend and backend
2. Use Row Level Security (RLS) in the database
3. Log permission changes for auditing
4. Implement least privilege principle
5. Regular permission audits

## Testing Permissions

```javascript
// Test user permissions
const testUserPermissions = async (userId) => {
  const response = await fetch(`/api/user/permissions/${userId}`);
  const { permissions } = await response.json();
  
  console.log('User permissions:', permissions);
  
  // Test specific permission
  const canAccessMaliyetPanelCit = permissions.includes('maliyet:panel-cit');
  console.log('Can access Maliyet Panel Çit:', canAccessMaliyetPanelCit);
};
```