"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import MainLayout3 from '@/components/MainLayout3';
import ProtectedRoute from '@/components/ProtectedRoute';

// Dynamic import to prevent SSR
const HesaplamalarPage = dynamic(
  () => import('@/pages/HesaplamalarPage'),
  { ssr: false }
);

const HesaplamalarFullPage = () => {
  return (
    <ProtectedRoute>
      <MainLayout3>
        <HesaplamalarPage />
      </MainLayout3>
    </ProtectedRoute>
  );
};

// Export with noSSR to disable server-side rendering
export default dynamic(() => Promise.resolve(HesaplamalarFullPage), { ssr: false });
