// HYBRID API CONFIGURATION - Vercel + Render Architecture
import { processTimestampFields } from './lib/date-utils';

// SERVER CONFIGURATIONS
const SERVERS = {
  // Fast operations - Vercel (existing)
  VERCEL: 'https://crm-deneme-backend.vercel.app/api',
  
  // Heavy operations - Render (new)
  RENDER: 'https://crm-factory-backend.onrender.com/api', // Your actual Render URL
  
  // Fallback mode
  USE_HYBRID: true // Set to false to use only Vercel (emergency rollback)
};

// SMART API ROUTING - Automatically chooses best server
export const API_URLS = {
  // FAST OPERATIONS (Vercel) - Authentication, CRUD, Basic Data
  // Panel Endpointleri
  currency: `${SERVERS.VERCEL}/panel_cost_cal_currency`,
  geciciHesaplar: `${SERVERS.VERCEL}/panel_cost_cal_gecici_hesaplar`,
  genelDegiskenler: `${SERVERS.VERCEL}/panel_cost_cal_genel_degiskenler`,
  maliyetListesi: `${SERVERS.VERCEL}/panel_cost_cal_maliyet_listesi`,
  panelCitDegiskenler: `${SERVERS.VERCEL}/panel_cost_cal_panel_cit_degiskenler`,
  panelList: `${SERVERS.VERCEL}/panel_cost_cal_panel_list`,
  profilDegiskenler: `${SERVERS.VERCEL}/panel_cost_cal_profil_degiskenler`,
  statikDegiskenler: `${SERVERS.VERCEL}/panel_cost_cal_statik_degiskenler`,

  // Galvanizli Tel (Keep on Vercel - fast enough)
  galMmGt: `${SERVERS.VERCEL}/gal_cost_cal_mm_gt`,
  galMmGtRecete: `${SERVERS.VERCEL}/gal_cost_cal_mm_gt_recete`,
  galMmGtYmSt: `${SERVERS.VERCEL}/gal_cost_cal_mm_gt_ym_st`,
  galSequence: `${SERVERS.VERCEL}/gal_cost_cal_sequence`,
  galYmGt: `${SERVERS.VERCEL}/gal_cost_cal_ym_gt`,
  galYmGtRecete: `${SERVERS.VERCEL}/gal_cost_cal_ym_gt_recete`,
  galYmSt: `${SERVERS.VERCEL}/gal_cost_cal_ym_st`,
  galYmStRecete: `${SERVERS.VERCEL}/gal_cost_cal_ym_st_recete`,
  galSalRequests: `${SERVERS.VERCEL}/gal_cost_cal_sal_requests`,
  galTaleplerEndpoint: `${SERVERS.VERCEL}/gal_cost_cal_sal_requests`,
  galUserInputValues: `${SERVERS.VERCEL}/gal_cost_cal_user_input_values`,
  galTlcHizlar: `${SERVERS.VERCEL}/gal_cost_cal_user_tlc_hizlar`,

  // Çelik Hasır Netsis (MIGRATED TO RENDER for performance!)
  celikHasirMm: `${SERVERS.RENDER}/celik_hasir_netsis_mm`,
  celikHasirNcbk: `${SERVERS.RENDER}/celik_hasir_netsis_ym_ncbk`,
  celikHasirNtel: `${SERVERS.RENDER}/celik_hasir_netsis_ym_ntel`,
  celikHasirMmRecete: `${SERVERS.RENDER}/celik_hasir_netsis_mm_recete`,
  celikHasirNcbkRecete: `${SERVERS.RENDER}/celik_hasir_netsis_ncbk_recete`,
  celikHasirNtelRecete: `${SERVERS.RENDER}/celik_hasir_netsis_ntel_recete`,
  celikHasirSequence: `${SERVERS.RENDER}/celik_hasir_netsis_sequence`,

  // Authentication Routes (Keep on Vercel - must be fast)
  signup: `${SERVERS.VERCEL}/signup`,
  login: `${SERVERS.VERCEL}/login`,  
  
  // User management (Keep on Vercel)
  users: `${SERVERS.VERCEL}/users`,
  changePassword: `${SERVERS.VERCEL}/change-password`,
  permissions: `${SERVERS.VERCEL}/permissions`,
  userRoles: `${SERVERS.VERCEL}/user-roles`,
  
  // HEAVY OPERATIONS (Render) - Production Planning, Optimization
  // Production Planning Endpoints (Legacy)
  productionCalculateTime: `${SERVERS.RENDER}/production/calculate-time`,
  productionCapacity: `${SERVERS.RENDER}/production/capacity`,
  productionOptimizeSchedule: `${SERVERS.RENDER}/production/optimize-schedule`,
  
  // APS (Advanced Planning & Scheduling) Endpoints - NEW
  apsCalculateTime: `${SERVERS.RENDER}/aps/calculate-time`,
  apsFactoryStatus: `${SERVERS.RENDER}/aps/factory-status`,
  apsOptimizeSchedule: `${SERVERS.RENDER}/aps/optimize-schedule`,
  apsCalculateTlc: `${SERVERS.RENDER}/aps/calculate-tlc`,
  apsLineCapacities: `${SERVERS.RENDER}/aps/line-capacities`,
  apsCreateSchedule: `${SERVERS.RENDER}/aps/create-schedule`,
  apsSchedules: `${SERVERS.RENDER}/aps/schedules`,
  
  // System Endpoints
  healthCheck: `${SERVERS.RENDER}/health`,
  ping: `${SERVERS.RENDER}/ping`,
  warmup: `${SERVERS.RENDER}/warmup`,
};

// HYBRID API HELPER FUNCTIONS

/**
 * Smart API caller with automatic fallback
 */
export const smartApiCall = async (endpoint, options = {}) => {
  const isHeavyOperation = endpoint.includes('production') || 
                          endpoint.includes('optimize') || 
                          endpoint.includes('calculate-time') ||
                          endpoint.includes('aps/') ||
                          endpoint.includes('factory-status');
  
  if (!SERVERS.USE_HYBRID || !isHeavyOperation) {
    // Use Vercel for fast operations or when hybrid disabled
    return fetch(endpoint, options);
  }
  
  try {
    // Try Render for heavy operations
    const response = await fetch(endpoint, {
      ...options,
      timeout: 30000 // 30 second timeout for heavy operations
    });
    
    if (!response.ok && response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.warn('Render request failed, falling back to Vercel:', error.message);
    
    // Fallback to Vercel (basic calculation)
    const vercelEndpoint = endpoint.replace(SERVERS.RENDER, SERVERS.VERCEL);
    return fetch(vercelEndpoint, options);
  }
};

/**
 * Production time calculator with smart routing
 */
export const calculateProductionTime = async (productData) => {
  try {
    const response = await smartApiCall(API_URLS.productionCalculateTime, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Production calculation failed:', error);
    throw error;
  }
};

/**
 * Get machine capacity data
 */
export const getMachineCapacity = async () => {
  try {
    const response = await smartApiCall(API_URLS.productionCapacity);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Capacity check failed:', error);
    throw error;
  }
};

/**
 * Optimize production schedule
 */
export const optimizeSchedule = async (orders, constraints = {}) => {
  try {
    const response = await smartApiCall(API_URLS.productionOptimizeSchedule, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orders, constraints })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Schedule optimization failed:', error);
    throw error;
  }
};

// KEEPALIVE SYSTEM

let keepAliveInterval = null;

/**
 * Start keepalive system to prevent server sleep
 */
export const startKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  console.log('🔄 Starting keepalive system...');

  // Ping Render server every 3 minutes (Render goes cold after ~5 minutes)
  // Note: Vercel doesn't need pinging - it handles its own warming
  keepAliveInterval = setInterval(async () => {
    try {
      // Only ping Render with multiple endpoints to keep database connections alive
      if (SERVERS.USE_HYBRID) {
        await Promise.all([
          fetch(API_URLS.ping, { method: 'GET' }),
          fetch(`${SERVERS.RENDER}/health`, { method: 'GET' }),
          // Keep critical database connections warm
          fetch(`${SERVERS.RENDER}/celik_hasir_netsis_sequence?limit=1`, { method: 'GET' })
        ]);
      }

      console.log('📡 Render keepalive ping sent (3min interval)');
    } catch (error) {
      console.warn('Keepalive ping failed:', error.message);
    }
  }, 3 * 60 * 1000); // Every 3 minutes
};

/**
 * Stop keepalive system
 */
export const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log('⏹️ Keepalive system stopped');
  }
};

/**
 * Warmup Render server (call on login) - Enhanced version
 */
export const warmupRender = async () => {
  if (!SERVERS.USE_HYBRID) return;

  try {
    console.log('🔥 Warming up Render server...');

    // Primary warmup call
    const response = await fetch(API_URLS.warmup, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Render server warmed up:', data.timestamp);

      // Secondary warmup - wake up critical database connections
      setTimeout(async () => {
        try {
          await Promise.all([
            fetch(API_URLS.celikHasirMm + '?limit=1', { method: 'GET' }),
            fetch(API_URLS.celikHasirSequence, { method: 'GET' }),
            fetch(API_URLS.ping, { method: 'GET' })
          ]);
          console.log('🔄 Database connections warmed up');
        } catch (err) {
          console.warn('Database warmup partial failure:', err.message);
        }
      }, 1000); // Wait 1 second after initial warmup
    }
  } catch (error) {
    console.warn('Render warmup failed (will work on first use):', error.message);
  }
};

/**
 * Emergency warmup for specific component - can be called from çelik hasır
 */
export const emergencyWarmup = async () => {
  if (!SERVERS.USE_HYBRID) return;

  console.log('🚨 Emergency warmup triggered...');

  try {
    // Quick concurrent warmup of essential endpoints
    await Promise.all([
      fetch(API_URLS.warmup, { method: 'POST', headers: { 'Content-Type': 'application/json' } }),
      fetch(API_URLS.ping, { method: 'GET' }),
      fetch(API_URLS.celikHasirSequence + '?limit=1', { method: 'GET' })
    ]);
    console.log('⚡ Emergency warmup completed');
    return true;
  } catch (error) {
    console.warn('Emergency warmup failed:', error.message);
    return false;
  }
};

// LEGACY FUNCTIONS (keep for compatibility)

// Your existing functions...
export const normalizeDecimalValues = (data) => {
  if (!data) return data;
  
  const normalizeValue = (value) => {
    if (typeof value === 'string' && value.includes(',')) {
      return value.replace(',', '.');
    }
    return value;
  };

  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'object' && item !== null) {
        const normalizedItem = {};
        for (const [key, value] of Object.entries(item)) {
          normalizedItem[key] = normalizeValue(value);
        }
        return normalizedItem;
      }
      return normalizeValue(item);
    });
  }

  if (typeof data === 'object' && data !== null) {
    const normalizedData = {};
    for (const [key, value] of Object.entries(data)) {
      normalizedData[key] = normalizeValue(value);
    }
    return normalizedData;
  }

  return normalizeValue(data);
};

// Export server config for emergency override
export const EMERGENCY_CONFIG = {
  // Set USE_HYBRID to false to disable Render and use only Vercel
  disableHybrid: () => { SERVERS.USE_HYBRID = false; },
  enableHybrid: () => { SERVERS.USE_HYBRID = true; },
  setRenderUrl: (url) => { SERVERS.RENDER = url; }
};

export default API_URLS;