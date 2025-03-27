"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URLS } from '@/api-config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState(null);
  const router = useRouter();

  // Load user from localStorage on initial render
  useEffect(() => {
    // Need to handle that localStorage is not available during server-side rendering
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      const storedPermissions = localStorage.getItem('permissions');
      const storedProfilePicture = localStorage.getItem('profilePicture');
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setPermissions(storedPermissions ? JSON.parse(storedPermissions) : []);
        setProfilePicture(storedProfilePicture || null);
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
    
    // Fetch profile picture
    await fetchProfilePicture(data.user.username);
    
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

  // Fetch profile picture
  const fetchProfilePicture = async (username) => {
    try {
      const response = await fetch(`${API_URLS.getProfilePicture}?username=${username}`);
      const data = await response.json();
      
      if (response.ok && data.pp_url) {
        setProfilePicture(data.pp_url);
        localStorage.setItem('profilePicture', data.pp_url);
      } else {
        // Set default profile picture if none found
        setProfilePicture(null);
        localStorage.removeItem('profilePicture');
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      setProfilePicture(null);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setPermissions([]);
    setProfilePicture(null);
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
    localStorage.removeItem('profilePicture');
    router.push('/login');
  };

  // Check if user has a specific permission
  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
  };

  const value = {
    user,
    permissions,
    profilePicture,
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
