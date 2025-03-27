"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const ClientAuthCheck = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Yuklenmiyorsa ve kullanıcı yoksa logine dön
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Yuklenme durumunu göster
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          <div className="text-gray-600 font-medium">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  // Auth olmadıysa children göstemre
  if (!user) {
    return null;
  }

  // Auth olmadıysa children göster
  return children;
};

export default ClientAuthCheck;
