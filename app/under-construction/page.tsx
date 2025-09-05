"use client";

import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';

export default function UnderConstruction() {
  const router = useRouter();

  const handleGoBack = () => {
    router.push('/');
  };

  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="bg-yellow-100 p-6 rounded-lg shadow-md border-2 border-yellow-300 max-w-2xl w-full">
            <div className="flex justify-center mb-4">
              <Construction size={80} className="text-yellow-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Bu Sayfa Yapım Aşamasında
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Bu modül şu anda geliştirme aşamasındadır. Kısa süre içinde hizmetinize sunulacaktır.
            </p>
            <div className="bg-white p-4 rounded-md border border-gray-200 mb-6">
              <p className="text-sm text-gray-500">
                Modül geliştirme talepleri ve önerileriniz için lütfen sistem yöneticisi ile iletişime geçiniz.
              </p>
            </div>
            <button
              onClick={handleGoBack}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <ArrowLeft size={20} />
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}