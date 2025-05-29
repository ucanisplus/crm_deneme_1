"use client";

import React, { useState, useEffect } from 'react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User, Check, X, RefreshCw } from 'lucide-react';
import { API_URLS } from '@/api-config';

interface Permission {
  id: string;
  permission_name: string;
  description: string;
  category: string;
}

interface User {
  id: string;
  username: string;
  email: string;
}

interface UserPermission {
  user_id: string;
  permissions: string[];
}

export default function PermissionsManagementPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Check if user has admin permissions
  useEffect(() => {
    if (!hasPermission('admin:manage-permissions')) {
      window.location.href = '/unauthorized';
    }
  }, [hasPermission]);

  // Fetch users and permissions
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const usersResponse = await fetch(API_URLS.users);
      const usersData = await usersResponse.json();
      setUsers(usersData);

      // Fetch all available permissions
      const permissionsResponse = await fetch(API_URLS.allPermissions);
      const permissionsData = await permissionsResponse.json();
      setPermissions(permissionsData);

      // Fetch user permissions for each user
      const userPermMap = new Map<string, string[]>();
      for (const user of usersData) {
        const response = await fetch(API_URLS.getUserPermissions(user.id));
        const data = await response.json();
        userPermMap.set(user.id, data.permissions || []);
      }
      setUserPermissions(userPermMap);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (userId: string, permissionName: string) => {
    try {
      const currentPermissions = userPermissions.get(userId) || [];
      const hasPermission = currentPermissions.includes(permissionName);

      const response = await fetch(API_URLS.userPermissions, {
        method: hasPermission ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, permissionName })
      });

      if (response.ok) {
        // Update local state
        const newPermissions = hasPermission 
          ? currentPermissions.filter(p => p !== permissionName)
          : [...currentPermissions, permissionName];
        
        const newMap = new Map(userPermissions);
        newMap.set(userId, newPermissions);
        setUserPermissions(newMap);
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
    }
  };

  const getPermissionsByCategory = () => {
    if (selectedCategory === 'all') return permissions;
    return permissions.filter(p => p.category === selectedCategory);
  };

  const categories = ['all', 'page', 'maliyet', 'access', 'admin'];

  if (loading) {
    return (
      <ClientAuthCheck>
        <MainLayout3>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-600" />
          </div>
        </MainLayout3>
      </ClientAuthCheck>
    );
  }

  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <Shield className="mr-2" />
              Yetki Yönetimi
            </h1>
            <p className="text-gray-600">Kullanıcı yetkilerini yönetin</p>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <div className="flex space-x-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category === 'all' ? 'Tümü' : category.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Grid */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    {getPermissionsByCategory().map(permission => (
                      <th
                        key={permission.id}
                        className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                        title={permission.description}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs">{permission.permission_name.split(':')[1]}</span>
                          <span className="text-xs text-gray-400">({permission.category})</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      {getPermissionsByCategory().map(permission => {
                        const hasPermission = (userPermissions.get(user.id) || []).includes(permission.permission_name);
                        return (
                          <td key={permission.id} className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => togglePermission(user.id, permission.permission_name)}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                                hasPermission
                                  ? 'bg-green-100 hover:bg-green-200 text-green-600'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                              }`}
                            >
                              {hasPermission ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Permission Legend */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Yetki Açıklamaları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Maliyet Yetkileri</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>maliyet:*</strong> - Maliyet bilgilerini görüntüleme</li>
                    <li>• <strong>maliyet:export</strong> - Maliyet verilerini dışa aktarma</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Erişim Yetkileri</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>access:*</strong> - Üretim hesaplamalarına erişim (maliyet yok)</li>
                    <li>• <strong>access:export</strong> - Üretim verilerini dışa aktarma</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Sayfa Yetkileri</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>page:*</strong> - İlgili sayfaya erişim</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Admin Yetkileri</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>admin:*</strong> - Yönetici işlevleri</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}