"use client";

import React, { useState, useEffect } from 'react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Check, X, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { API_URLS } from '@/api-config';

interface Permission {
  id: string;
  role: string;
  permission_name: string;
}

export default function RolePermissionsPage() {
  const { hasPermission } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [newPermission, setNewPermission] = useState({ role: '', permission_name: '' });

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URLS.allPermissions);
      const data = await response.json();
      setPermissions(data);
      
      // Extract unique roles
      const uniqueRoles = [...new Set(data.map((p: Permission) => p.role))];
      setRoles(uniqueRoles.sort());
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPermission = async () => {
    if (!newPermission.role || !newPermission.permission_name) return;
    
    try {
      const response = await fetch(API_URLS.userPermissions, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPermission)
      });

      if (response.ok) {
        setNewPermission({ role: '', permission_name: '' });
        fetchPermissions();
      }
    } catch (error) {
      console.error('Error adding permission:', error);
    }
  };

  const deletePermission = async (id: string) => {
    if (!confirm('Bu izni silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await fetch(`${API_URLS.userPermissions}/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchPermissions();
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
    }
  };

  const getFilteredPermissions = () => {
    if (selectedRole === 'all') return permissions;
    return permissions.filter(p => p.role === selectedRole);
  };

  const availablePermissions = [
    // Page permissions
    'page:maliyet-hesaplama',
    'page:uretim-hesaplama',
    // Maliyet permissions
    'maliyet:panel-cit',
    'maliyet:celik-hasir',
    'maliyet:galvanizli-tel',
    'maliyet:profil',
    'maliyet:tavli-tel',
    'maliyet:civi',
    'maliyet:zirhli-tel',
    // Access permissions
    'access:panel-cit',
    'access:celik-hasir',
    'access:galvanizli-tel',
    'access:profil',
    'access:tavli-tel',
    'access:civi',
    'access:zirhli-tel',
    'access:admin',
    'access:settings',
    'access:galvanizli-tel-request'
  ];

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
              Rol Bazlı Yetki Yönetimi
            </h1>
            <p className="text-gray-600">Rollere göre yetki tanımlamaları</p>
          </div>

          {/* Add New Permission */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Yeni Yetki Ekle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <select
                  value={newPermission.role}
                  onChange={(e) => setNewPermission({ ...newPermission, role: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Rol Seçin</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <select
                  value={newPermission.permission_name}
                  onChange={(e) => setNewPermission({ ...newPermission, permission_name: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-md"
                >
                  <option value="">Yetki Seçin</option>
                  {availablePermissions.map(perm => (
                    <option key={perm} value={perm}>{perm}</option>
                  ))}
                </select>
                <button
                  onClick={addPermission}
                  disabled={!newPermission.role || !newPermission.permission_name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ekle
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Role Filter */}
          <div className="mb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedRole('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedRole === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Tümü
              </button>
              {roles.map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedRole === role
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Yetkiler</span>
                <button
                  onClick={fetchPermissions}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Yetki
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Açıklama
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredPermissions().map((permission) => (
                      <tr key={permission.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">{permission.role}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{permission.permission_name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {permission.permission_name.startsWith('maliyet:') && 'Maliyet hesaplama yetkisi'}
                            {permission.permission_name.startsWith('access:') && 'Erişim yetkisi'}
                            {permission.permission_name.startsWith('page:') && 'Sayfa erişim yetkisi'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => deletePermission(permission.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Permission Guide */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Yetki Açıklamaları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Sayfa Yetkileri (page:*)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>page:maliyet-hesaplama</strong> - Maliyet Hesaplama sayfasına erişim</li>
                    <li>• <strong>page:uretim-hesaplama</strong> - Üretim Hesaplamaları sayfasına erişim</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Maliyet Yetkileri (maliyet:*)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Maliyet bilgilerini görüntüleme</li>
                    <li>• Fiyat hesaplamaları yapma</li>
                    <li>• Maliyet raporları oluşturma</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Erişim Yetkileri (access:*)</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Üretim hesaplamalarına erişim</li>
                    <li>• Sadece ağırlık hesaplamaları</li>
                    <li>• Maliyet bilgisi gösterilmez</li>
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