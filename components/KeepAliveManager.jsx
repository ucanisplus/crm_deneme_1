// KeepAlive Manager Bileşen - Handles server warmup and keepalive
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { startKeepAlive, stopKeepAlive, warmupRender } from '../api-config-hybrid';

export default function KeepAliveManager() {
  const { user } = useAuth();
  const [serverStatus, setServerStatus] = useState({
    vercel: 'unknown',
    render: 'unknown',
    lastPing: null
  });
  const [isMounted, setIsMounted] = useState(false);

  // Ensure Bileşen only works on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Başlangıç keepalive zaman user logs in
  useEffect(() => {
    if (user) {
      console.log('👤 User logged in, starting hybrid server management...');
      
      // Başlangıç the keepalive system
      startKeepAlive();
      
      // Warmup Render et server in background
      warmupRender().then(() => {
        setServerStatus(prev => ({
          ...prev,
          render: 'warm',
          lastPing: new Date().toLocaleTimeString()
        }));
      }).catch(() => {
        setServerStatus(prev => ({
          ...prev,
          render: 'cold'
        }));
      });

      // Güncelle Durum periodically
      const statusInterval = setInterval(() => {
        setServerStatus(prev => ({
          ...prev,
          vercel: 'active',
          lastPing: new Date().toLocaleTimeString()
        }));
      }, 60000); // Every minute

      return () => {
        clearInterval(statusInterval);
      };
    } else {
      // Stop keepalive zaman user logs out
      stopKeepAlive();
      setServerStatus({
        vercel: 'inactive',
        render: 'inactive',
        lastPing: null
      });
    }
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopKeepAlive();
    };
  }, []);

  // Don't Render et anything on server side
  if (!isMounted) {
    return null;
  }

  // Only Göster Durum in development or zaman explicitly needed
  const showStatus = process.env.NODE_ENV === 'development' || 
                    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug'));

  if (!showStatus) {
    return null; // Hidden in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-3 text-sm z-50">
      <div className="font-semibold mb-2">🖥️ Server Status</div>
      
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${
          serverStatus.vercel === 'active' ? 'bg-green-500' : 
          serverStatus.vercel === 'unknown' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <span>Vercel: {serverStatus.vercel}</span>
      </div>
      
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${
          serverStatus.render === 'warm' ? 'bg-green-500' : 
          serverStatus.render === 'cold' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <span>Render: {serverStatus.render}</span>
      </div>
      
      {serverStatus.lastPing && (
        <div className="text-xs text-gray-500 mt-1">
          Last ping: {serverStatus.lastPing}
        </div>
      )}
    </div>
  );
}