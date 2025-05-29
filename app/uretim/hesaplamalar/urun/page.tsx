"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';

// Dynamic import to prevent SSR
const HesaplamalarPageRestricted = dynamic(
  () => import('@/pages/HesaplamalarPageRestricted'),
  { ssr: false }
);

export default function UrunHesaplamalariPage() {
  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Üretim Hesaplamaları</h1>
            <p className="text-gray-600">Panel çit, çelik hasır, galvanizli tel ve profil hesaplamaları</p>
          </div>
          
          <div className="bg-white rounded-lg shadow">
            <HesaplamalarPageRestricted />
          </div>
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}