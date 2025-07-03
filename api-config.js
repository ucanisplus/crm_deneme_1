// api-config.js
import { processTimestampFields } from './lib/date-utils';

export const API_URLS = {
  // Panel Endpointleri
  currency: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_currency',
  geciciHesaplar: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_gecici_hesaplar',
  genelDegiskenler: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_genel_degiskenler',
  maliyetListesi: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_maliyet_listesi',
  panelCitDegiskenler: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_panel_cit_degiskenler',
  panelList: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_panel_list',
  profilDegiskenler: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_profil_degiskenler',
  statikDegiskenler: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_statik_degiskenler',

  // Galvanizli Tel
  galMmGt: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_mm_gt',
  galMmGtRecete: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_mm_gt_recete',
  galMmGtYmSt: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_mm_gt_ym_st',
  galSequence: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_sequence',
  galYmGt: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_ym_gt',
  galYmGtRecete: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_ym_gt_recete',
  galYmSt: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_ym_st',
  galYmStRecete: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_ym_st_recete',
  galSalRequests: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_sal_requests',
  // Endpoint alias for talepler
  galTaleplerEndpoint: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_sal_requests',
  // User input values for calculations
  galUserInputValues: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_user_input_values',
  // TLC Hizlar data
  galTlcHizlar: 'https://crm-deneme-backend.vercel.app/api/gal_cost_cal_user_tlc_hizlar',

  // Çelik Hasır Netsis
  celikHasirMm: 'https://crm-deneme-backend.vercel.app/api/celik_hasir_netsis_mm',
  celikHasirNcbk: 'https://crm-deneme-backend.vercel.app/api/celik_hasir_netsis_ym_ncbk',
  celikHasirNtel: 'https://crm-deneme-backend.vercel.app/api/celik_hasir_netsis_ym_ntel',
  celikHasirMmRecete: 'https://crm-deneme-backend.vercel.app/api/celik_hasir_netsis_mm_recete',
  celikHasirNcbkRecete: 'https://crm-deneme-backend.vercel.app/api/celik_hasir_netsis_ncbk_recete',
  celikHasirNtelRecete: 'https://crm-deneme-backend.vercel.app/api/celik_hasir_netsis_ntel_recete',
  celikHasirSequence: 'https://crm-deneme-backend.vercel.app/api/celik_hasir_netsis_sequence',

  // Authentication Routes
  signup: 'https://crm-deneme-backend.vercel.app/api/signup',
  login: 'https://crm-deneme-backend.vercel.app/api/login',  
  
  // User management
  users: 'https://crm-deneme-backend.vercel.app/api/users',
  // crmUsers: 'https://crm-deneme-backend.vercel.app/api/crm_users', // Removed - causing 404 errors
  changePassword: 'https://crm-deneme-backend.vercel.app/api/change-password',
  
  // Permissions management
  userPermissions: 'https://crm-deneme-backend.vercel.app/api/user-permissions',
  allPermissions: 'https://crm-deneme-backend.vercel.app/api/user-permissions',

  // Helper functions
  getUrlWithId: (baseUrl, id) => `${baseUrl}/${id}`,
  getUserPermissions: (userId) => `https://crm-deneme-backend.vercel.app/api/user/permissions/${userId}`,

  // New URLs for profile pictures
  getProfilePicture: `https://crm-deneme-backend.vercel.app/api/user/profile-picture`,
  updateProfilePicture: `https://crm-deneme-backend.vercel.app/api/user/profile-picture`,
};

/**
 * Ondalık sayıları düzgün biçimlendiren yardımcı fonksiyon
 * Virgülleri noktalara çevirir ve uygun sayısal değere dönüştürür
 * @param {Object} data - İşlenecek veri objesi
 * @returns {Object} - Dönüştürülmüş veri objesi
 */
export const normalizeDecimalValues = (data) => {
  if (!data) return data;
  
  // Dizi ise her öğeyi işle
  if (Array.isArray(data)) {
    return data.map(item => normalizeDecimalValues(item));
  }
  
  // Nesne ise her değeri işle
  if (typeof data === 'object' && data !== null) {
    const normalizedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        // Handle null/undefined values explicitly to avoid database errors
        normalizedData[key] = null;
      } else if (typeof value === 'string' && value.includes(',')) {
        // Virgül içeren string değerlerini kontrol et
        // Global flag ile TÜM virgülleri değiştir - önemli düzeltme
        const numericValue = value.replace(/,/g, '.');
        if (!isNaN(parseFloat(numericValue))) {
          // Geçerli sayısal değer ise, sayıya dönüştür
          normalizedData[key] = parseFloat(numericValue);
        } else {
          normalizedData[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        // İç içe nesneleri işle
        normalizedData[key] = normalizeDecimalValues(value);
      } else if (typeof value === 'string' && value.trim() === '') {
        // Empty strings should be treated as null for database compatibility
        normalizedData[key] = null;
      } else {
        normalizedData[key] = value;
      }
    }
    return normalizedData;
  }
  
  // String değer ise ve virgül içeriyorsa sayıya dönüştür
  if (typeof data === 'string') {
    if (data.trim() === '') {
      // Return null for empty strings (database compatibility)
      return null;
    } else if (data.includes(',')) {
      // Global flag ile TÜM virgülleri değiştir
      const numericValue = data.replace(/,/g, '.');
      if (!isNaN(parseFloat(numericValue))) {
        return parseFloat(numericValue);
      }
    }
  }
  
  return data;
};

/**
 * Authenticated API istekleri için yardımcı fonksiyon
 * @param {string} url - İstek yapılacak URL
 * @param {Object} options - Fetch seçenekleri
 * @returns {Promise<Response>} - API yanıtı
 */
export const fetchWithAuth = async (url, options = {}) => {
  // For debugging
  console.log(`API Request: ${options.method || 'GET'} ${url}`);
  
  // Client tarafında ise kullanıcı bilgilerini localStorage'dan al
  let user = null;
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  }
  
  // Content-Type header'ı ekle (PUT/POST için gerekli)
  const hasContentType = options.headers && Object.keys(options.headers)
    .some(h => h.toLowerCase() === 'content-type');
  
  const headers = {
    ...(hasContentType ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  // ALWAYS ensure Content-Type is set for PUT/POST requests
  if ((options.method === 'PUT' || options.method === 'POST')) {
    headers['Content-Type'] = 'application/json';
    // Add Accept header for better error handling
    headers['Accept'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  // POST veya PUT isteklerinde verileri normalleştir
  if ((options.method === 'POST' || options.method === 'PUT') && options.body) {
    try {
      // JSON string ise parse et
      const data = typeof options.body === 'string' 
        ? JSON.parse(options.body) 
        : options.body;
      
      // Check for empty objects
      if (Object.keys(data).length === 0) {
        console.error('Empty data object detected in API request');
        throw new Error('Cannot send empty data object to API');
      }
      
      // Log the data before normalization for debugging
      console.log(`Original data:`, data);
      
      // Verileri normalleştir ve tekrar JSON'a dönüştür
      const normalizedData = normalizeDecimalValues(data);
      
      // Log the normalized data for debugging
      console.log(`Normalized data:`, normalizedData);
      
      config.body = JSON.stringify(normalizedData);
    } catch (error) {
      console.error('Veri normalleştirme hatası:', error);
      // Hata durumunda orijinal verileri kullan
      if (typeof options.body === 'string') {
        config.body = options.body;
      } else {
        config.body = JSON.stringify(options.body);
      }
    }
  }

  try {
    const response = await fetch(url, config);
    
    // Log the response status for debugging
    console.log(`API Response: ${response.status} ${response.statusText}`);
    
    // API yanıtlarının tutarlı formatta olmasını sağla
    if (response.status === 401) {
      // Yetkisiz - kullanıcı verilerini temizle ve giriş sayfasına yönlendir
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
        window.location.href = '/login';
      }
      return null;
    }
    
    // For server errors, try to get detailed error message
    if (response.status >= 500) {
      try {
        const errorDetails = await response.clone().text();
        console.error(`Server error (${response.status}):`, errorDetails);
      } catch (e) {
        // Ignore if we can't parse the error
      }
    }
    
    return response;
  } catch (error) {
    console.error('API isteği başarısız:', error);
    throw error;
  }
};

/**
 * Form giriş değerlerini anında normalleştiren yardımcı fonksiyon
 * @param {string|number} value - Normalleştirilecek değer
 * @returns {string} - Normalleştirilmiş değer (daima string olarak döndürülür)
 */
export const normalizeInputValue = (value) => {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return '';
  }
  
  // String'e çevir (text input'lar için)
  const strValue = String(value).trim();
  
  // Eğer boş string ise boş dön
  if (strValue === '') {
    return '';
  }
  
  // Virgül içeriyorsa tüm virgülleri noktaya çevir
  if (strValue.includes(',')) {
    // Sayısal değerler için
    if (/^-?\d+(?:,\d+)?$/.test(strValue)) {
      // Sadece bir tane virgül içeren sayısal değerler için virgülü noktaya çevir
      return strValue.replace(',', '.');
    }
  }
  
  // Sayı ise string'e çevir, EN-US locale ile nokta kullanarak
  if (typeof value === 'number') {
    // Force point decimal separator with en-US locale
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 5,
      useGrouping: false // No thousand separators
    });
  }
  
  // Diğer durumlarda değeri olduğu gibi döndür
  return strValue;
};

/**
 * Tek bir öğe veya birden fazla öğe için POST isteği gönderen yardımcı fonksiyon
 * @param {string} url - İstek yapılacak URL
 * @param {Object|Array} data - Gönderilecek veri (tek öğe veya dizi)
 * @returns {Promise<Object>} - API yanıtı (JSON)
 */
/**
 * Veri göndermek için yardımcı fonksiyon - POST veya PUT
 * @param {string} url - İstek yapılacak URL
 * @param {Object|Array} data - Gönderilecek veri
 * @param {string} method - HTTP metodu (POST veya PUT)
 * @returns {Promise<Object>} - API yanıtı
 */
export const sendData = async (url, data, method = 'POST') => {
  try {
    console.log(`${method} isteği gönderiliyor:`, url);
    console.log('Veri:', data);
    
    // Validation - reject empty data
    if (!data) {
      throw new Error('Boş veri gönderilemez');
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      if (data.length === 0) {
        throw new Error('Boş dizi gönderilemez');
      }
      
      // Prepare data - normalize decimal values and ensure no empty strings
      const normalizedItems = data.map(item => {
        // Check if item is empty
        if (!item || typeof item !== 'object' || Object.keys(item).length === 0) {
          console.warn('Boş öğe atlanıyor:', item);
          return null;
        }
        
        // First normalize decimal values
        let normalized = normalizeDecimalValues(item);
        // Then fix timestamp fields
        normalized = processTimestampFields(normalized);
        
        return normalized;
      }).filter(item => item !== null);
      
      if (normalizedItems.length === 0) {
        throw new Error('Normalizasyondan sonra geçerli veri kalmadı');
      }
      
      // Send each item one by one
      const results = [];
      for (const item of normalizedItems) {
        try {
          // Direct fetch with proper headers
          const response = await fetch(url, {
            method: method,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(item)
          });
          
          if (!response) {
            console.error('Boş API yanıtı:', item);
            throw new Error('API yanıt vermedi');
          }
          
          if (!response.ok) {
            let errorText;
            try {
              const errorData = await response.json();
              errorText = errorData.error || errorData.message || 'Bilinmeyen hata';
            } catch {
              errorText = await response.text() || 'Bilinmeyen hata';
            }
            throw new Error(`API hatası: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          results.push(result);
        } catch (itemError) {
          console.error(`Öğe gönderim hatası:`, itemError, item);
          // Continue with next item instead of completely failing
          results.push({ error: itemError.message, item });
        }
      }
      return results;
    } else {
      // Single item - ensure it's not empty
      if (typeof data !== 'object' || Object.keys(data).length === 0) {
        throw new Error('Boş nesne gönderilemez');
      }
      
      // Normalize the data
      let normalizedData = normalizeDecimalValues(data);
      // Fix timestamp fields
      normalizedData = processTimestampFields(normalizedData);
      console.log('Normalized data:', normalizedData);
      
      // Try direct fetch first for best compatibility
      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(normalizedData)
        });
        
        if (!response) {
          throw new Error('API yanıt vermedi');
        }
        
        if (!response.ok) {
          let errorText;
          try {
            const errorData = await response.json();
            errorText = errorData.error || errorData.message || 'Bilinmeyen hata';
          } catch (e) {
            try {
              errorText = await response.text() || 'Bilinmeyen hata';
            } catch (e2) {
              errorText = 'Yanıt alınamadı';
            }
          }
          throw new Error(`API hatası: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
      } catch (fetchError) {
        console.warn('Direct fetch failed, trying fetchWithAuth:', fetchError);
        
        // Fallback to fetchWithAuth
        const response = await fetchWithAuth(url, {
          method: method,
          body: JSON.stringify(normalizedData)
        });
        
        if (!response) {
          throw new Error('API yanıt vermedi (fetchWithAuth)');
        }
        
        if (!response.ok) {
          let errorText;
          try {
            const errorData = await response.json();
            errorText = errorData.error || errorData.message || 'Bilinmeyen hata';
          } catch {
            errorText = await response.text() || 'Bilinmeyen hata';
          }
          throw new Error(`API hatası: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
      }
    }
  } catch (error) {
    console.error(`${method} veri gönderim hatası:`, error);
    throw error;
  }
};

/**
 * Tek bir öğe veya birden fazla öğe için POST isteği gönderen yardımcı fonksiyon
 * @param {string} url - İstek yapılacak URL
 * @param {Object|Array} data - Gönderilecek veri (tek öğe veya dizi)
 * @returns {Promise<Object>} - API yanıtı (JSON)
 */
export const postData = async (url, data) => {
  return sendData(url, data, 'POST');
};

/**
 * Veri güncellemek için PUT isteği gönderen yardımcı fonksiyon
 * @param {string} url - İstek yapılacak URL (id dahil)
 * @param {Object} data - Güncellenecek veri
 * @returns {Promise<Object>} - API yanıtı (JSON)
 */
export const putData = async (url, data) => {
  return sendData(url, data, 'PUT');
};