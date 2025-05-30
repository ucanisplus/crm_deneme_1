"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { hasPermission } = useAuth();
  const router = useRouter();

  const handleMaliyetClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (hasPermission('page:maliyet-hesaplama')) {
      router.push('/uretim/hesaplamalar/maliyet');
    } else {
      router.push('/unauthorized');
    }
  };

  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Hoşgeldiniz</h1>
          <p className="text-gray-600">
            Albayrak Demir Çelik yönetim paneline hoş geldiniz. 
            Sol taraftaki menüden erişmek istediğiniz bölümü seçebilirsiniz.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <a href="/uretim" className="bg-white p-5 border border-gray-200 rounded-xl shadow hover:shadow-md transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Üretim Yönetimi</h3>
              <p className="text-gray-600 text-sm">Üretim verileri, hesaplamalar ve analizler</p>
            </a>
            
            <a href="/satis" className="bg-white p-5 border border-gray-200 rounded-xl shadow hover:shadow-md transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">CRM</h3>
              <p className="text-gray-600 text-sm">Müşteri ilişkileri ve satış yönetimi</p>
            </a>
            
            <a href="/under-construction" className="bg-white p-5 border border-gray-200 rounded-xl shadow hover:shadow-md transition-shadow cursor-pointer">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Raporlar</h3>
              <p className="text-gray-600 text-sm">Maliyet ve performans raporları</p>
            </a>
            
            {hasPermission('page:maliyet-hesaplama') && (
              <a onClick={handleMaliyetClick} className="bg-white p-5 border border-gray-200 rounded-xl shadow hover:shadow-md transition-shadow cursor-pointer">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">Maliyet Hesaplama</h3>
                <p className="text-gray-600 text-sm">Üretim maliyet analizleri ve hesaplamaları</p>
              </a>
            )}
          </div>
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}