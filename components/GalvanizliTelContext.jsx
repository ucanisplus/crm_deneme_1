// GalvanizliTelContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URLS, fetchWithAuth } from '@/api-config';

// Context oluştur
const GalvanizliTelContext = createContext(null);

// Hook tanımla
export const useGalvanizliTel = () => {
  const context = useContext(GalvanizliTelContext);
  if (context === null) {
    throw new Error('useGalvanizliTel hook must be used within a GalvanizliTelProvider');
  }
  return context;
};

// Provider bileşeni
export const GalvanizliTelProvider = ({ children }) => {
  // State değişkenleri
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Ürün verileri
  const [mmGtList, setMmGtList] = useState([]);
  const [ymGtList, setYmGtList] = useState([]);
  const [ymStList, setYmStList] = useState([]);
  const [requests, setRequests] = useState([]);
  
  // API istekleri
  const fetchMMGTList = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(API_URLS.galMmGt);
      if (response && response.ok) {
        const data = await response.json();
        setMmGtList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('MM GT listesi getirilirken hata:', error);
      setError('MM GT listesi getirilemedi');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchYMGTList = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(API_URLS.galYmGt);
      if (response && response.ok) {
        const data = await response.json();
        setYmGtList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('YM GT listesi getirilirken hata:', error);
      setError('YM GT listesi getirilemedi');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchYMSTList = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(API_URLS.galYmSt);
      if (response && response.ok) {
        const data = await response.json();
        setYmStList(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('YM ST listesi getirilirken hata:', error);
      setError('YM ST listesi getirilemedi');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(API_URLS.galSalRequests);
      if (response && response.ok) {
        const data = await response.json();
        setRequests(Array.isArray(data) ? data.filter(req => req.status === 'pending') : []);
      }
    } catch (error) {
      console.error('Talepler getirilirken hata:', error);
      setError('Talepler getirilemedi');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Veri ekleme fonksiyonları
  const addMMGT = useCallback(async (data) => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(API_URLS.galMmGt, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response || !response.ok) {
        const errorText = await response?.text() || 'MM GT eklenemedi';
        throw new Error(errorText);
      }
      
      const result = await response.json();
      setSuccessMessage('MM GT başarıyla eklendi');
      return result;
    } catch (error) {
      console.error('MM GT ekleme hatası:', error);
      setError('MM GT ekleme hatası: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const addYMGT = useCallback(async (data) => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(API_URLS.galYmGt, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response || !response.ok) {
        const errorText = await response?.text() || 'YM GT eklenemedi';
        throw new Error(errorText);
      }
      
      const result = await response.json();
      setSuccessMessage('YM GT başarıyla eklendi');
      return result;
    } catch (error) {
      console.error('YM GT ekleme hatası:', error);
      setError('YM GT ekleme hatası: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const addYMST = useCallback(async (data) => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(API_URLS.galYmSt, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response || !response.ok) {
        const errorText = await response?.text() || 'YM ST eklenemedi';
        throw new Error(errorText);
      }
      
      const result = await response.json();
      setSuccessMessage('YM ST başarıyla eklendi');
      return result;
    } catch (error) {
      console.error('YM ST ekleme hatası:', error);
      setError('YM ST ekleme hatası: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Silme işlemleri
  const deleteMMGT = useCallback(async (id) => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_URLS.galMmGt}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response || !response.ok) {
        const errorText = await response?.text() || 'MM GT silinemedi';
        throw new Error(errorText);
      }
      
      setSuccessMessage('MM GT başarıyla silindi');
      fetchMMGTList();
    } catch (error) {
      console.error('MM GT silme hatası:', error);
      setError('MM GT silme hatası: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchMMGTList]);
  
  // İlk yükleme
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);
  
  // Context değeri
  const value = {
    // State değişkenleri
    isLoading,
    error,
    successMessage,
    mmGtList,
    ymGtList,
    ymStList,
    requests,
    
    // API işlevleri
    fetchMMGTList,
    fetchYMGTList,
    fetchYMSTList,
    fetchRequests,
    addMMGT,
    addYMGT,
    addYMST,
    deleteMMGT,
    
    // Helper fonksiyonlar
    clearError: () => setError(null),
    clearSuccess: () => setSuccessMessage('')
  };
  
  return (
    <GalvanizliTelContext.Provider value={value}>
      {children}
    </GalvanizliTelContext.Provider>
  );
};

export default GalvanizliTelContext;