// timestamp-fix.js
// ENHANCED utility for handling timestamp values in PostgreSQL timestamptz format

/**
 * Fixes all timestamp fields in an object to be compatible with PostgreSQL timestamptz
 * @param {Object} data - The data to process
 * @returns {Object} - Processed data with fixed timestamps
 */
export function fixTimestamps(data) {
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => fixTimestamps(item));
  }
  
  // Handle objects
  if (typeof data === 'object' && data !== null) {
    const result = {...data};
    
    Object.entries(data).forEach(([key, value]) => {
      if (key.endsWith('_at') || key.includes('_tarihi') || key.includes('_update') || key.includes('Date')) {
        // Handle empty values
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
          result[key] = null;
          return;
        }
        
        // Handle the problematic "2025" value and other year-only values
        if ((value === "2025" || value === 2025) || (typeof value === 'string' && /^\d{4}$/.test(value))) {
          const year = typeof value === 'string' ? parseInt(value) : value;
          if (year >= 1900 && year <= 2100) {
            // Full ISO8601 format with Z suffix for timezone
            result[key] = `${year}-01-01T00:00:00.000Z`;
            console.log(`Fixed year-only field ${key} with value "${value}" to ISO timestamp ${result[key]}`);
            return;
          }
        }
        
        // Handle existing date values and strings
        if (value) {
          try {
            const date = value instanceof Date ? value : new Date(value);
            if (!isNaN(date.getTime())) {
              // Always use full ISO8601 format with Z timezone marker
              result[key] = date.toISOString();
              return;
            } else {
              // Invalid date format
              console.warn(`Invalid date value in field ${key}: "${value}"`);
              result[key] = null;
            }
          } catch (e) {
            // Couldn't parse as date
            console.warn(`Failed to parse date for field ${key}: "${value}"`, e);
            result[key] = null;
          }
        } else {
          // Any other value becomes null
          result[key] = null;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively fix nested objects
        result[key] = fixTimestamps(value);
      }
    });
    
    return result;
  }
  
  // Return primitives as is
  return data;
}

/**
 * Special handler for PanelCit component data
 * Ensures all timestamp fields are properly formatted for PostgreSQL timestamptz
 */
export function fixPanelCitData(data) {
  return fixTimestamps(data);
}

/**
 * Fix specific data issues with panelCit profil data
 */
export function fixProfilData(data) {
  const fixed = fixTimestamps(data);
  
  // Set a safe default for profil_latest_update if it's missing
  if (!fixed.profil_latest_update) {
    fixed.profil_latest_update = new Date().toISOString();
    console.log('Added missing profil_latest_update:', fixed.profil_latest_update);
  }
  
  return fixed;
}

/**
 * Intercept fetch and XMLHttpRequest API calls to fix timestamp-related issues
 * For use with specific components
 */
export function applyGlobalTimestampFix() {
  if (typeof window === 'undefined') return;
  
  console.log('🔄 Applying global timestamp fix to all fetch requests');
  
  // Store original fetch
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = async function(url, options) {
    if (typeof url === 'string' && options && options.body) {
      // Fix timestamp in any request with a body - not just POST
      try {
        if (typeof options.body === 'string' && (
            options.headers && 
            options.headers['Content-Type'] === 'application/json' || 
            options.headers && options.headers['content-type'] === 'application/json')
        ) {
          const data = JSON.parse(options.body);
          const fixedData = fixTimestamps(data);
          
          // Replace body with fixed data
          options = {
            ...options,
            body: JSON.stringify(fixedData)
          };
          
          console.log('🔄 Applied timestamp fixes to fetch request:', url);
        }
      } catch (e) {
        console.error('❌ Error fixing timestamps in fetch:', e);
        // Continue with original request if we hit an error
      }
    }
    
    // Call original fetch with potentially modified options
    return originalFetch(url, options);
  };
  
  // Also intercept axios if it's available globally
  if (typeof window.axios !== 'undefined') {
    console.log('🔄 Adding timestamp fix interceptor to axios');
    
    const originalAxiosRequest = window.axios.request;
    
    // Add a request interceptor
    window.axios.interceptors.request.use(function (config) {
      try {
        if (config.data) {
          config.data = fixTimestamps(config.data);
          console.log('🔄 Applied timestamp fixes to axios request:', config.url);
        }
      } catch (e) {
        console.error('❌ Error in axios timestamp interceptor:', e);
      }
      return config;
    }, function (error) {
      return Promise.reject(error);
    });
  }
  
  console.log('✅ Global timestamp fix applied successfully');
}