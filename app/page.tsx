"use client";

import React from 'react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';

export default function Home() {
  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-800">Hoşgeldiniz</h1>
          <p className="text-gray-600">
            Albayrak Demir Çelik yönetim paneline hoş geldiniz. 
            Sol taraftaki menüden erişmek istediğiniz bölümü seçebilirsiniz.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Üretim Yönetimi</h3>
              <p className="text-gray-600 text-sm">Üretim verileri, hesaplamalar ve analizler</p>
            </div>
            
            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">CRM</h3>
              <p className="text-gray-600 text-sm">Müşteri ilişkileri ve satış yönetimi</p>
            </div>
            
            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Raporlar</h3>
              <p className="text-gray-600 text-sm">Maliyet ve performans raporları</p>
            </div>
          </div>
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}