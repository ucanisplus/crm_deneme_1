// emergency-fix.js
// Direct override for the problematic request to fix the 2025 timestamp issue

// Import this in your component and call installFix() at the component start

export function installFix() {
  if (typeof window === 'undefined') return;
  
  console.log('🔧 Installing emergency timestamp fix for panel_cost_cal_profil_degiskenler');
  
  // Store original fetch
  const originalFetch = window.fetch;
  
  // Override fetch to intercept problematic requests
  window.fetch = async function(url, options) {
    // Only intercept requests to the problematic endpoint
    if (url.includes('panel_cost_cal_profil_degiskenler') && 
        options && options.method && 
        (options.method === 'POST' || options.method === 'PUT') && 
        options.body) {
      
      try {
        // Parse the request body
        const bodyData = JSON.parse(options.body);
        
        // Look for any "2025" values and fix them
        const fixedData = fixTimestamps(bodyData);
        
        // Create new options with fixed body
        const newOptions = {
          ...options,
          body: JSON.stringify(fixedData)
        };
        
        console.log('🔧 Fixed request data:', fixedData);
        
        // Make the request with fixed data
        return originalFetch(url, newOptions);
      } catch (e) {
        console.error('🔧 Fix failed:', e);
        // Continue with original request if fix fails
      }
    }
    
    // All other requests proceed normally
    return originalFetch(url, options);
  };
  
  // Also patch axios if available
  if (typeof axios !== 'undefined') {
    const originalPost = axios.post;
    
    axios.post = function(url, data, config) {
      if (url.includes('panel_cost_cal_profil_degiskenler') && data) {
        try {
          // Fix timestamps in the data
          const fixedData = fixTimestamps(data);
          console.log('🔧 Fixed axios data:', fixedData);
          
          // Make request with fixed data
          return originalPost(url, fixedData, config);
        } catch (e) {
          console.error('🔧 Axios fix failed:', e);
          // Continue with original data if fix fails
        }
      }
      
      // All other requests proceed normally
      return originalPost(url, data, config);
    };
  }
  
  console.log('🔧 Emergency timestamp fix installed');
}

/**
 * Fix all timestamp fields in an object
 */
function fixTimestamps(data) {
  // Handle null/undefined
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => fixTimestamps(item));
  }
  
  // Handle objects
  if (typeof data === 'object' && data !== null) {
    const result = {};
    
    for (const [key, value] of Object.entries(data)) {
      // Direct fix for the specific problematic value
      if (value === "2025") {
        console.log(`🔧 Found problematic value "2025" in field ${key}`);
        // Replace with current date in PostgreSQL format
        result[key] = formatDate(new Date());
        continue;
      }
      
      // Identify timestamp fields by naming convention
      if (key.endsWith('_at') || key.includes('_tarihi') || key.includes('_update') || key.includes('Date')) {
        if (value === null || value === undefined || value === '') {
          // Null values stay null
          result[key] = null;
        } else if (typeof value === 'string' && /^\d{4}$/.test(value)) {
          // Fix year-only values like "2025" by converting to proper timestamp
          const year = parseInt(value);
          if (year >= 1900 && year <= 2100) {
            result[key] = `${year}-01-01 00:00:00`;
          } else {
            result[key] = null;
          }
        } else if (typeof value === 'string') {
          // Try to fix other timestamp strings
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              result[key] = formatDate(date);
            } else {
              result[key] = null;
            }
          } catch (e) {
            result[key] = null;
          }
        } else if (value instanceof Date) {
          // Convert Date objects to proper format
          result[key] = formatDate(value);
        } else {
          // Any other type becomes null
          result[key] = null;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Process nested objects
        result[key] = fixTimestamps(value);
      } else {
        // Keep other values as is
        result[key] = value;
      }
    }
    
    return result;
  }
  
  // Return primitive values unchanged
  return data;
}

/**
 * Format a date in PostgreSQL compatible format
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// To use this fix, add these lines to the beginning of your component:
// import { installFix } from '../emergency-fix';
// if (typeof window !== 'undefined') { installFix(); }