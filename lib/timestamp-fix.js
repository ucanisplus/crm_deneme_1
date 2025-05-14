// timestamp-fix.js
// Special utility for handling timestamp values in PostgreSQL timestamptz format

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
        // Handle timestamp fields
        if (value === null || value === undefined) {
          result[key] = null;
        } else if (value === "2025" || value === 2025) {
          // Handle the problematic "2025" value specially
          result[key] = "2025-01-01T00:00:00.000Z";
          console.log(`Fixed problematic field ${key} with value "${value}" to ISO timestamp`);
        } else if (typeof value === 'string' && /^\d{4}$/.test(value)) {
          // Handle other year-only values
          const year = parseInt(value);
          if (year >= 1900 && year <= 2100) {
            result[key] = `${year}-01-01T00:00:00.000Z`;
          } else {
            result[key] = null;
          }
        } else if (value) {
          // Try to convert to a proper ISO timestamp
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              result[key] = date.toISOString();
            } else {
              // Invalid date
              result[key] = null;
              console.warn(`Invalid date value in field ${key}: "${value}"`);
            }
          } catch (e) {
            // Couldn't parse as date
            result[key] = null;
            console.warn(`Failed to parse date for field ${key}: "${value}"`);
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
  }
  
  return fixed;
}

/**
 * Intercept fetch and XMLHttpRequest API calls to fix timestamp-related issues
 * For use with specific components
 */
export function applyGlobalTimestampFix() {
  if (typeof window === 'undefined') return;
  
  // Store original fetch
  const originalFetch = window.fetch;
  
  // Override fetch
  window.fetch = async function(url, options) {
    if (typeof url === 'string' && options?.method?.toUpperCase() === 'POST') {
      // Check if the request is to a known problematic endpoint
      if (url.includes('panel_cost_cal_') && options.body) {
        try {
          // Parse body and fix timestamps
          const data = JSON.parse(options.body);
          const fixedData = fixTimestamps(data);
          
          // Replace body with fixed data
          options = {
            ...options,
            body: JSON.stringify(fixedData)
          };
          
          console.log('Timestamp-fixed request to', url);
        } catch (e) {
          console.error('Error fixing timestamps in fetch:', e);
        }
      }
    }
    
    // Call original fetch with potentially modified options
    return originalFetch(url, options);
  };
}