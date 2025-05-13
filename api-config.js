// api-config.js
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

  // Authentication Routes
  signup: 'https://crm-deneme-backend.vercel.app/api/signup',
  login: 'https://crm-deneme-backend.vercel.app/api/login',  
  
  // User management
  users: 'https://crm-deneme-backend.vercel.app/api/users',
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
      if (typeof value === 'string' && value.includes(',')) {
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
      } else {
        normalizedData[key] = value;
      }
    }
    return normalizedData;
  }
  
  // String değer ise ve virgül içeriyorsa sayıya dönüştür
  if (typeof data === 'string' && data.includes(',')) {
    // Global flag ile TÜM virgülleri değiştir
    const numericValue = data.replace(/,/g, '.');
    if (!isNaN(parseFloat(numericValue))) {
      return parseFloat(numericValue);
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

  // If method is PUT or POST, ensure Content-Type is set
  if ((options.method === 'PUT' || options.method === 'POST') && !hasContentType) {
    headers['Content-Type'] = 'application/json';
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
      
      // Verileri normalleştir ve tekrar JSON'a dönüştür
      const normalizedData = normalizeDecimalValues(data);
      config.body = JSON.stringify(normalizedData);
      
      // Eğer bu bir PUT isteği ise, headers'a content-type eklendiğinden emin ol
      if (options.method === 'PUT') {
        config.headers = {
          ...config.headers,
          'Content-Type': 'application/json',
        };
      }
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
    
    return response;
  } catch (error) {
    console.error('API isteği başarısız:', error);
    throw error;
  }
};

/**
 * Form giriş değerlerini anında normalleştiren yardımcı fonksiyon
 * @param {string|number} value - Normalleştirilecek değer
 * @returns {number|string} - Normalleştirilmiş değer
 */
export const normalizeInputValue = (value) => {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return '';
  }
  
  // String ise ve virgül içeriyorsa noktaya çevir
  if (typeof value === 'string' && value.includes(',')) {
    return value.replace(/,/g, '.');
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
  return value;
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
    
    // Veri dizisi mi?
    if (Array.isArray(data)) {
      // Her öğeyi ayrı ayrı gönder
      const results = [];
      for (const item of data) {
        const response = await fetchWithAuth(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item),
        });
        
        if (!response) {
          throw new Error(`API yanıt vermedi`);
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
      }
      return results;
    } else {
      // Tek öğeyi gönder
      const response = await fetchWithAuth(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response) {
        throw new Error(`API yanıt vermedi`);
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