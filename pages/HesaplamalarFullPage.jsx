"use client";

import React from 'react';
import MainLayout3 from '@/components/MainLayout3';
import HesaplamalarPage from '@/pages/HesaplamalarPage';
import ProtectedRoute from '@/components/ProtectedRoute';

const HesaplamalarFullPage = () => {
  return (
    <ProtectedRoute>
      <MainLayout3>
        <HesaplamalarPage />
      </MainLayout3>
    </ProtectedRoute>
  );
};

export default HesaplamalarFullPage;