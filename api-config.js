// api-config.js
export const API_URLS = {
  // Existing table endpoints
  currency: 'https://alb-stackblitz-1.vercel.app/api/panel_cost_cal_currency',
  geciciHesaplar: 'https://alb-stackblitz-1.vercel.app/api/panel_cost_cal_gecici_hesaplar',
  genelDegiskenler: 'https://alb-stackblitz-1.vercel.app/api/panel_cost_cal_genel_degiskenler',
  maliyetListesi: 'https://alb-stackblitz-1.vercel.app/api/panel_cost_cal_maliyet_listesi',
  panelCitDegiskenler: 'https://alb-stackblitz-1.vercel.app/api/panel_cost_cal_panel_cit_degiskenler',
  panelList: 'https://alb-stackblitz-1.vercel.app/api/panel_cost_cal_panel_list',
  profilDegiskenler: 'https://alb-stackblitz-1.vercel.app/api/panel_cost_cal_profil_degiskenler',
  statikDegiskenler: 'https://alb-stackblitz-1.vercel.app/api/panel_cost_cal_statik_degiskenler',

  // Authentication Routes
  signup: 'https://alb-stackblitz-1-b8ppq73qq-sters-projects-62395872.vercel.app/api/signup',
  login: 'https://alb-stackblitz-1-b8ppq73qq-sters-projects-62395872.vercel.app/api/login',  
  // User management
  users: 'https://alb-stackblitz-1.vercel.app/api/users',
  changePassword: 'https://alb-stackblitz-1.vercel.app/api/change-password',
  
  // Permissions management
  userPermissions: 'https://alb-stackblitz-1.vercel.app/api/user-permissions',
  allPermissions: 'https://alb-stackblitz-1.vercel.app/api/user-permissions',

  // Helper functions
  getUrlWithId: (baseUrl, id) => `${baseUrl}/${id}`,
  getUserPermissions: (userId) => `https://alb-stackblitz-1.vercel.app/api/user/permissions/${userId}`,
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