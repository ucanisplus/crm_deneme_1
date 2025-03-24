"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URLS } from '@/api-config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user from localStorage on initial render
  useEffect(() => {
    // Need to handle that localStorage is not available during server-side rendering
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      const storedPermissions = localStorage.getItem('permissions');
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setPermissions(storedPermissions ? JSON.parse(storedPermissions) : []);
      }
      
      setLoading(false);
    }
  }, []);

  // Login function
  const login = async (username, password) => {
    const response = await fetch(API_URLS.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Giriş başarısız');
    }
    
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Fetch user permissions
    await fetchPermissions(data.user.id);
    
    return data;
  };

  // Fetch permissions
  const fetchPermissions = async (userId) => {
    try {
      const response = await fetch(API_URLS.getUserPermissions(userId));
      const data = await response.json();
      
      if (response.ok) {
        setPermissions(data.permissions || []);
        localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setPermissions([]);
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    router.push('/login');
  };

  // Check if user has a specific permission
  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
  };

  const value = {
    user,
    permissions,
    loading,
    login,
    logout,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}