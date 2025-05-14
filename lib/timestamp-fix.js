// timestamp-fix.js
// Simplified utility that removes timestamp fields (which is what the server does)

/**
 * Removes timestamp fields from an object to avoid PostgreSQL errors
 * @param {Object} data - The data to process
 * @returns {Object} - Processed data without timestamp fields
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
    
    Object.keys(result).forEach(key => {
      // Remove timestamp fields entirely
      if (key.endsWith('_at') || key.includes('_tarihi') || 
          key.includes('_update') || key.includes('Date')) {
        delete result[key];
      } 
      // Recursively process nested objects
      else if (result[key] && typeof result[key] === 'object') {
        result[key] = fixTimestamps(result[key]);
      }
    });
    
    return result;
  }
  
  // Return primitives as is
  return data;
}

/**
 * Special handler for PanelCit component data
 */
export function fixPanelCitData(data) {
  return fixTimestamps(data);
}

/**
 * Special handler for profil data
 */
export function fixProfilData(data) {
  return fixTimestamps(data);
}

/**
 * Applies a global fetch interceptor to remove timestamp fields
 */
export function applyGlobalTimestampFix() {
  if (typeof window === 'undefined') return;
  
  console.log('🔄 Applying global timestamp fix to all fetch requests');
  
  // Store original fetch
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = async function(url, options) {
    if (typeof url === 'string' && options && options.body) {
      try {
        if (typeof options.body === 'string' && (
            options.headers && 
            (options.headers['Content-Type'] === 'application/json' || 
             options.headers['content-type'] === 'application/json'))
        ) {
          const data = JSON.parse(options.body);
          const fixedData = fixTimestamps(data);
          
          // Replace body with fixed data
          options = {
            ...options,
            body: JSON.stringify(fixedData)
          };
        }
      } catch (e) {
        // Silently continue with original request
      }
    }
    
    // Call original fetch with modified options
    return originalFetch(url, options);
  };
  
  console.log('✅ Global timestamp fix applied successfully');
}