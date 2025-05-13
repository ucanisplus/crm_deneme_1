// debug-network.js
// This file contains debugging utilities for network requests

// Add this right after your React import in any component experiencing issues
// In this case we should add it to PanelCitHesaplama.jsx and other components with issues

/**
 * Debug API calls for specific endpoints
 * This helps identify exactly what's causing 500 errors
 */
export function debugApiCalls() {
  // Store original fetch function
  const originalFetch = window.fetch;
  
  // Override fetch to add debugging
  window.fetch = async function(url, options) {
    if (url.includes('panel_cost_cal_panel_list') || 
        url.includes('panel_cost_cal_profil_degiskenler') ||
        url.includes('panel_cost_cal_genel_degiskenler') ||
        url.includes('panel_cost_cal_panel_cit_degiskenler')) {
      
      console.log(`🔍 FETCH Debug - Request to: ${url}`);
      console.log('🔍 FETCH Debug - Request options:', options);
      
      if (options && options.body) {
        try {
          // Log the request body
          const bodyObj = JSON.parse(options.body);
          console.log('🔍 FETCH Debug - Request body:', bodyObj);
          
          // Check for potential issues
          checkForDataIssues(bodyObj);
        } catch (e) {
          console.log('🔍 FETCH Debug - Failed to parse request body:', options.body);
        }
      }
      
      try {
        // Make the actual request
        const response = await originalFetch(url, options);
        
        // Clone the response for logging
        const responseClone = response.clone();
        console.log(`🔍 FETCH Debug - Response status: ${responseClone.status} ${responseClone.statusText}`);
        
        // Log detailed response for errors
        if (!responseClone.ok) {
          try {
            const errorText = await responseClone.text();
            console.error(`❌ FETCH Debug - Error response body:`, errorText);
          } catch (e) {
            console.error('❌ FETCH Debug - Failed to get error response:', e);
          }
        }
        
        return response;
      } catch (error) {
        console.error('❌ FETCH Debug - Network error:', error);
        throw error;
      }
    }
    
    // For non-debug URLs, just use original fetch
    return originalFetch(url, options);
  };
  
  // Store original axios
  if (typeof axios !== 'undefined') {
    const originalAxiosPost = axios.post;
    const originalAxiosPut = axios.put;
    
    // Override axios post
    axios.post = async function(url, data, config) {
      if (url.includes('panel_cost_cal_panel_list') || 
          url.includes('panel_cost_cal_profil_degiskenler') ||
          url.includes('panel_cost_cal_genel_degiskenler') ||
          url.includes('panel_cost_cal_panel_cit_degiskenler')) {
        
        console.log(`🔍 AXIOS Debug - POST to: ${url}`);
        console.log('🔍 AXIOS Debug - POST data:', data);
        console.log('🔍 AXIOS Debug - POST config:', config);
        
        // Check for potential issues
        checkForDataIssues(data);
        
        try {
          // Try a direct browser fetch instead of axios
          console.log('🔍 AXIOS Debug - Trying direct fetch instead of axios');
          
          const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(data)
          });
          
          if (fetchResponse.ok) {
            console.log('✅ FETCH Debug - Direct fetch succeeded!');
            
            // Convert fetch response to axios-like response
            const responseData = await fetchResponse.json();
            return {
              data: responseData,
              status: fetchResponse.status,
              statusText: fetchResponse.statusText,
              headers: fetchResponse.headers,
              config: config
            };
          } else {
            console.error(`❌ FETCH Debug - Direct fetch failed: ${fetchResponse.status}`);
            try {
              const errorText = await fetchResponse.text();
              console.error('❌ FETCH Debug - Error response:', errorText);
            } catch (e) {
              console.error('❌ FETCH Debug - Failed to get error response:', e);
            }
          }
        } catch (fetchError) {
          console.error('❌ FETCH Debug - Direct fetch error:', fetchError);
        }
      }
      
      // Fall back to original axios or continue with normal post for non-debug URLs
      return originalAxiosPost(url, data, config);
    };
    
    // Override axios put
    axios.put = async function(url, data, config) {
      if (url.includes('panel_cost_cal_panel_list') || 
          url.includes('panel_cost_cal_profil_degiskenler') ||
          url.includes('panel_cost_cal_genel_degiskenler') ||
          url.includes('panel_cost_cal_panel_cit_degiskenler')) {
        
        console.log(`🔍 AXIOS Debug - PUT to: ${url}`);
        console.log('🔍 AXIOS Debug - PUT data:', data);
        console.log('🔍 AXIOS Debug - PUT config:', config);
        
        // Check for potential issues
        checkForDataIssues(data);
        
        try {
          // Try a direct browser fetch instead of axios
          console.log('🔍 AXIOS Debug - Trying direct fetch instead of axios');
          
          const fetchResponse = await fetch(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(data)
          });
          
          if (fetchResponse.ok) {
            console.log('✅ FETCH Debug - Direct fetch succeeded!');
            
            // Convert fetch response to axios-like response
            const responseData = await fetchResponse.json();
            return {
              data: responseData,
              status: fetchResponse.status,
              statusText: fetchResponse.statusText,
              headers: fetchResponse.headers,
              config: config
            };
          } else {
            console.error(`❌ FETCH Debug - Direct fetch failed: ${fetchResponse.status}`);
            try {
              const errorText = await fetchResponse.text();
              console.error('❌ FETCH Debug - Error response:', errorText);
            } catch (e) {
              console.error('❌ FETCH Debug - Failed to get error response:', e);
            }
          }
        } catch (fetchError) {
          console.error('❌ FETCH Debug - Direct fetch error:', fetchError);
        }
      }
      
      // Fall back to original axios or continue with normal put for non-debug URLs
      return originalAxiosPut(url, data, config);
    };
  }
  
  console.log('🔍 Network debugging installed for panel_cost_cal endpoints');
}

/**
 * Check data for common issues that might cause 500 errors
 */
function checkForDataIssues(data) {
  if (!data) {
    console.error('❌ Data Issue - Data is null or undefined');
    return;
  }
  
  if (Array.isArray(data) && data.length === 0) {
    console.error('❌ Data Issue - Empty array');
    return;
  }
  
  if (typeof data === 'object' && Object.keys(data).length === 0) {
    console.error('❌ Data Issue - Empty object');
    return;
  }
  
  // Check for invalid/NaN number values
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'number' && isNaN(value)) {
      console.error(`❌ Data Issue - NaN value for field "${key}"`);
    }
    
    if (typeof value === 'string' && value.includes(',')) {
      console.warn(`⚠️ Data Issue - Field "${key}" contains commas: "${value}"`);
    }
    
    if (value === null) {
      console.warn(`⚠️ Data Issue - Field "${key}" is null`);
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      console.warn(`⚠️ Data Issue - Field "${key}" is empty string`);
    }
  });
  
  // Check for missing required fields
  const requiredFields = ['panel_tipi', 'panel_kodu', 'stok_kodu', 'galvanizli_tel_ton_usd'];
  for (const field of requiredFields) {
    if (field in data && (data[field] === null || data[field] === undefined || data[field] === '')) {
      console.error(`❌ Data Issue - Required field "${field}" is empty`);
    }
  }
}

/**
 * Safely normalize a panel object to fix common issues
 */
export function normalizePanelObject(panel) {
  if (!panel) return null;
  
  const result = {};
  
  // Handle each field with appropriate type conversion
  Object.entries(panel).forEach(([key, value]) => {
    // Skip empty strings
    if (value === '') {
      result[key] = null;
      return;
    }
    
    // Handle numeric fields
    if (typeof value === 'string' && !isNaN(parseFloat(value.replace(',', '.')))) {
      result[key] = parseFloat(value.replace(',', '.'));
      return;
    }
    
    // Pass other values as-is
    result[key] = value;
  });
  
  // Ensure critical fields exist
  if (!result.panel_kodu && result.panel_tipi) {
    // Generate a panel code if missing
    result.panel_kodu = `${result.panel_tipi}_${Date.now()}`;
  }
  
  return result;
}

export async function directlySubmitPanel(panel, endpoint) {
  try {
    // Normalize the panel data
    const normalizedPanel = normalizePanelObject(panel);
    
    if (!normalizedPanel) {
      throw new Error('Invalid panel data');
    }
    
    console.log('Attempting direct submission of panel data:', normalizedPanel);
    
    // Try fetch with explicit headers
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(normalizedPanel)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Direct submission failed:', error);
    return { success: false, error: error.message };
  }
}