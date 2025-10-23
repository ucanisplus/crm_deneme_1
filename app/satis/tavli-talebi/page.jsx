"use client";

import React from 'react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import SatisTavliBalyaRequest from '@/components/SatisTavliBalyaRequest';
import { useAuth } from '@/context/AuthContext';

export default function TavliBalyaRequestPage() {
  const { hasPermission } = useAuth();

  // Check if user has permission to access tavli/balya tel request page
  if (!hasPermission('access:tavli-balya-tel-request')) {
    return (
      <ClientAuthCheck>
        <MainLayout3>
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Erişim Reddedildi</h1>
              <p className="text-gray-700 mb-2">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
              <p className="text-sm text-gray-600">Gerekli yetki: Balya/Tavlı Tel Talep Yönetimi erişimi</p>
              <div className="mt-4">
                <button
                  onClick={() => window.history.back()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
                >
                  Geri Dön
                </button>
              </div>
            </div>
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
            <h1 className="text-2xl font-bold text-gray-800">Balya/Tavlı Tel Talep Yönetimi</h1>
            <p className="text-gray-600">Satış ekibi tarafından tavlı tel ve yağlı balya teli ürün talepleri oluşturma ve takibi</p>
          </div>

          <div className="bg-white rounded-lg shadow">
            <SatisTavliBalyaRequest />
          </div>
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}