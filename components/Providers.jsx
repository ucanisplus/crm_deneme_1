"use client";

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';

export function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}