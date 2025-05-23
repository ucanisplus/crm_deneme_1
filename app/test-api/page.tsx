"use client";

import React, { useState } from 'react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';

export default function TestApiPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testEndpoints = async () => {
    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://crm-deneme-backend.vercel.app/api';
    
    // Test 1: Check if notifications table exists
    try {
      const testResponse = await fetch(`${apiUrl}/test-notifications`);
      const testData = await testResponse.json();
      setResults((prev: any) => ({ ...prev, tableTest: testData }));
    } catch (error: any) {
      setResults((prev: any) => ({ ...prev, tableTest: { error: error.message } }));
    }

    // Test 2: Try to fetch notifications for different user formats
    const testUsers = ['1', 'selman1', 'admin'];
    for (const userId of testUsers) {
      try {
        const response = await fetch(`${apiUrl}/notifications/${userId}`);
        const data = await response.json();
        setResults((prev: any) => ({ 
          ...prev, 
          [`user_${userId}`]: { 
            status: response.status, 
            data: data,
            isArray: Array.isArray(data)
          } 
        }));
      } catch (error: any) {
        setResults((prev: any) => ({ 
          ...prev, 
          [`user_${userId}`]: { error: error.message } 
        }));
      }
    }

    setLoading(false);
  };

  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">API Test Page</h1>
          
          <button
            onClick={testEndpoints}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Notification APIs'}
          </button>

          {Object.keys(results).length > 0 && (
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-bold mb-2">Test Results:</h2>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}