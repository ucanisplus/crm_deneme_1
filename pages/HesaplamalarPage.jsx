import React, { useState, useEffect } from 'react';
import { Grid, Link, Link2, Hammer } from 'lucide-react';
import PanelCitHesaplama from '@/components/PanelCitHesaplama';
import CelikHasirHesaplama from '@/components/CelikHasirHesaplama';
import { useAuth } from '@/context/AuthContext';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import dynamic from 'next/dynamic';

const HesaplamalarPage = () => {
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
    { id: 'tavli-tel', name: 'Tavlı Tel', icon: <Link2 size={16} />, permission: 'access:tavli-tel' },
    { id: 'civi', name: 'Çivi', icon: <Hammer size={16} />, permission: 'access:civi' },
    { id: 'zirhli-tel', name: 'Zırhlı Tel', icon: <Link size={16} />, permission: 'access:zirhli-tel' },
  ];

  // Kullanıcının erişebileceği sekmeler
  const tabs = allTabs.filter(tab => hasPermission(tab.permission));
  const [activeTab, setActiveTab] = useState(null);

  // Eğer kullanıcı erişimi olmayan bir sekmeye giderse sıfırla
  useEffect(() => {
    if (activeTab && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab(null);
    }
  }, [tabs, activeTab]);

  if (!isMounted) return null;

  // Kullanıcının hiçbir izni yoksa
  if (tabs.length === 0) {
    return (
      <ClientAuthCheck>
        <div className="flex flex-col items-center justify-center h-64 bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Erişim İzniniz Yok</h3>
          <p className="text-gray-600">Bu sayfaya erişim için gerekli izinlere sahip değilsiniz.</p>
        </div>
      </ClientAuthCheck>
    );
  }

  return (
    <ClientAuthCheck>
      <div className="space-y-6">
        {/* Kullanıcı bilgisi */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            Kullanıcı: <span className="font-medium">{user?.username}</span> | 
            Rol: <span className="font-medium">{user?.role}</span>
          </p>
        </div>

        {/* Sekme navigasyonu */}
        <div className="bg-white border-b">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
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
              {activeTab === 'panel-cit' && <PanelCitHesaplama />}
              {activeTab === 'celik-hasir' && <CelikHasirHesaplama />}

              {activeTab === 'galvanizli-tel' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Galvanizli Tel Maliyet Hesaplama</h3>
                  <p className="text-gray-600">Galvanizli Tel için maliyet hesaplama ve analiz verileri burada görüntülenecektir.</p>
                </div>
              )}

              {activeTab === 'tavli-tel' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Tavlı Tel Maliyet Hesaplama</h3>
                  <p className="text-gray-600">Tavlı Tel için maliyet hesaplama ve analiz verileri burada görüntülenecektir.</p>
                </div>
              )}

              {activeTab === 'civi' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Çivi Maliyet Hesaplama</h3>
                  <p className="text-gray-600">Çivi için maliyet hesaplama ve analiz verileri burada görüntülenecektir.</p>
                </div>
              )}

              {activeTab === 'zirhli-tel' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Zırhlı Tel Maliyet Hesaplama</h3>
                  <p className="text-gray-600">Zırhlı Tel için maliyet hesaplama ve analiz verileri burada görüntülenecektir.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ClientAuthCheck>
  );
};

// Sunucu tarafı render'ı kapat
export default dynamic(() => Promise.resolve(HesaplamalarPage), { ssr: false });
