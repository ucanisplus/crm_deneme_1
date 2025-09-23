"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, user } = useAuth();
  
  // If user is already logged in, redirect to home page
  useEffect(() => {
    if (user) {
      router.push('/');
    }

    // Progressive warmup of Render backend - start immediately on login page load
    const warmupSequence = async () => {
      console.log('🔥 Starting progressive Render server warmup...');

      const endpoints = [
        // Primary warmup endpoint
        'https://crm-factory-backend.onrender.com/api/warmup',
        // Critical database endpoints for çelik hasır
        'https://crm-factory-backend.onrender.com/api/celik_hasir_netsis_mm?limit=1',
        'https://crm-factory-backend.onrender.com/api/celik_hasir_netsis_sequence',
        // Ping endpoint for keepalive
        'https://crm-factory-backend.onrender.com/api/ping'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: endpoint.includes('warmup') ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Warmed up: ${endpoint.split('/').pop()}`, data?.status || 'OK');
          }
        } catch (err) {
          console.log(`🔄 Warming ${endpoint.split('/').pop()}:`, err.message);
        }

        // Small delay between calls to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('🎯 Progressive warmup completed - server should be ready!');
    };

    // Start warmup immediately
    warmupSequence();
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96 border-t-4 border-red-600">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image 
            src="/logo_sade.png" 
            alt="Company Logo" 
            width={180} 
            height={60} 
            className="object-contain"
          />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Yönetim Paneli</h1>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-600 text-red-700 p-4 mb-5 rounded">
            <p className="font-medium">Hata</p>
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="username">
              Kullanıcı Adı
            </label>
            <input
              id="username"
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="password">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors shadow-md disabled:opacity-75"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Giriş yapılıyor...
                </span>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025 Tüm Hakları Saklıdır</p>
        </div>
      </div>
    </div>
  );
}