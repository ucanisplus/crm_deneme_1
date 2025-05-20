"use client";

import React from 'react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import SatisGalvanizRequest from '@/components/SatisGalvanizRequest';

export default function GalvanizRequestPage() {
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