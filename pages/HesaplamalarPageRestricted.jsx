'use client';

import React, { useState, useEffect } from 'react';
import { Grid, Link, Link2, Hammer } from 'lucide-react';
import dynamic from 'next/dynamic';
import PanelCitHesaplamaRestricted from '@/components/PanelCitHesaplamaRestricted';
// import CelikHasirHesaplama from '@/components/CelikHasirHesaplama';
import { useAuth } from '@/context/AuthContext';
import ClientAuthCheck from '@/components/ClientAuthCheck';

// Dynamic import ile GalvanizliTelNetsis componentını yükle
const GalvanizliTelNetsis = dynamic(
  () => import('@/components/GalvanizliTelNetsis'),
  { ssr: false }
);

const HesaplamalarPageRestricted = () => {
  const { hasPermission, user } = useAuth();

  // Sadece client tarafında render edildiğinden emin olmak için
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Tüm sekmeler (izin bilgileri dahil)
  const allTabs = [
    { id: 'panel-cit', name: 'Panel Çit', icon: <Grid size={16} />, permission: 'access:panel-cit' },
    { id: 'celik-hasir', name: 'Çelik Hasır', icon: <Grid size={16} />, permission: 'access:celik-hasir' },
    { id: 'galvanizli-tel', name: 'Galvanizli Tel', icon: <Link size={16} />, permission: 'access:galvanizli-tel' },
  ];

  const [activeTab, setActiveTab] = useState(null);
  const allowedTabs = allTabs.filter(tab => hasPermission(tab.permission));

  // Eğer seçilen sekmeye erişim yoksa sıfırla
  useEffect(() => {
    if (activeTab && !allowedTabs.find(tab => tab.id === activeTab)) {
      setActiveTab(null);
    }
  }, [allowedTabs, activeTab]);

  if (!isMounted) return null;

  return (
    <ClientAuthCheck>
      <div className="space-y-6">
        {/* Sekme navigasyonu */}
        <div className="bg-white border-b">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {allTabs.map((tab) => {
              const isAllowed = hasPermission(tab.permission);
              return (
                <button
                  key={tab.id}
                  onClick={() => isAllowed && setActiveTab(tab.id)}
                  disabled={!isAllowed}
                  className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } ${!isAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sekme içeriği */}
        <div className="bg-white p-6 rounded-lg shadow-sm min-h-[300px]">
          {!activeTab ? (
            <div className="text-gray-600">Lütfen bir hesaplama modülü seçiniz.</div>
          ) : !hasPermission(allTabs.find(t => t.id === activeTab)?.permission) ? (
            <div>
              <h3 className="text-lg font-semibold text-red-600">Erişim İzniniz Yok</h3>
              <p className="text-gray-600">Bu sekmeye erişim izniniz bulunmamaktadır.</p>
            </div>
          ) : (
            <>
              {activeTab === 'panel-cit' && <PanelCitHesaplamaRestricted />}
              {activeTab === 'celik-hasir' && <div>Çelik Hasır component temporarily disabled</div>}
              {activeTab === 'galvanizli-tel' && <GalvanizliTelNetsis />}
            </>
          )}
        </div>
      </div>
    </ClientAuthCheck>
  );
};

// Sunucu tarafı render'ı kapat
export default dynamic(() => Promise.resolve(HesaplamalarPageRestricted), { ssr: false });