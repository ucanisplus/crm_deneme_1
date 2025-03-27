// api-config.js
export const API_URLS = {
  // Existing table endpoints
  currency: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_currency',
  geciciHesaplar: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_gecici_hesaplar',
  genelDegiskenler: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_genel_degiskenler',
  maliyetListesi: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_maliyet_listesi',
  panelCitDegiskenler: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_panel_cit_degiskenler',
  panelList: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_panel_list',
  profilDegiskenler: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_profil_degiskenler',
  statikDegiskenler: 'https://crm-deneme-backend.vercel.app/api/panel_cost_cal_statik_degiskenler',

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

// Helper function for authenticated fetch requests
export const fetchWithAuth = async (url, options = {}) => {
  // Get user from localStorage if we're on the client
  let user = null;
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      // Unauthorized - clear user data and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        localStorage.removeItem('permissions');
        window.location.href = '/login';
      }
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};
