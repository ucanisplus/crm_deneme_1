import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return children;
};

export default ProtectedRoute;