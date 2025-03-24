"use client";
import React from 'react';
import MainLayout3 from '@/components/MainLayout3';
import { AlertTriangle, Construction, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const UnderConstructionPage = () => {
  return (
    <MainLayout3>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="mb-8 flex justify-center">
          <Construction size={80} className="text-red-600 animate-pulse" />
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Yapım Aşamasında
          </h1>
          
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="text-amber-500 mr-2" size={24} />
            <p className="text-lg text-gray-700">
              Bu sayfa şu anda geliştirme aşamasındadır
            </p>
          </div>
          
          <p className="text-gray-600 mb-6">
            Bu bölüm aktif olarak geliştiriliyor. Yakında burada yeni özellikler ve içerikler göreceksiniz. 
            Lütfen daha sonra tekrar ziyaret edin.
          </p>
          
          <div className="flex justify-center gap-4">
            <Link href="/" className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
              <Home className="mr-2" size={20} />
              Ana Sayfaya Dön
            </Link>
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft className="mr-2" size={20} />
              Geri Dön
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-gray-500">
          <p>© 2025 Albayrak. Tüm Hakları Saklıdır.</p>
        </div>
      </div>
    </MainLayout3>
  );
};

export default UnderConstructionPage;