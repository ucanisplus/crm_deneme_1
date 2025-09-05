"use client";

import React from 'react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import SatisGalvanizRequest from '@/components/SatisGalvanizRequest';
import { useAuth } from '@/context/AuthContext';

export default function GalvanizRequestPage() {
  const { hasPermission } = useAuth();

  // Check if user has permission to access galvanizli tel request page
  if (!hasPermission('access:galvanizli-tel-request')) {
    return (
      <ClientAuthCheck>
        <MainLayout3>
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Erişim Reddedildi</h1>
              <p className="text-gray-700 mb-2">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
              <p className="text-sm text-gray-600">Gerekli yetki: Galvanizli Tel Talep Yönetimi erişimi</p>
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
            <h1 className="text-2xl font-bold text-gray-800">Galvanizli Tel Talep Yönetimi</h1>
            <p className="text-gray-600">Satış ekibi tarafından galvanizli tel ürün talepleri oluşturma ve takibi</p>
          </div>
          
          <div className="bg-white rounded-lg shadow">
            <SatisGalvanizRequest />
          </div>
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}