// direct-timestamp-fix.js
// This file provides a direct, immediate fix for the timestamp issue

// Export this function to use in any component
export function applyDirectFix() {
  if (typeof window === 'undefined') return;
  
  // Log that fix is being applied
  console.log('📅 Installing emergency timestamp fix for database operations');
  
  // Store original fetch and XMLHttpRequest to restore later if needed
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest.prototype.open;
  
  // Override fetch to fix timestamps
  window.fetch = async function(...args) {
    try {
      // Get URL and options from args
      let [url, options] = args;
      
      // If this is a POST or PUT request to panel_cost_cal endpoints
      if (options && 
          options.method && 
          (options.method === 'POST' || options.method === 'PUT') &&
          options.body && 
          (url.includes('panel_cost_cal_profil_degiskenler') || 
           url.includes('panel_cost_cal_panel_list'))) {
        
        try {
          // Parse the body if it's JSON
          const body = JSON.parse(options.body);
          
          // Sanitize all timestamp fields
          const sanitizedBody = fixAllTimestamps(body);
          
          // Create new options with sanitized body
          const newOptions = {
            ...options,
            body: JSON.stringify(sanitizedBody)
          };
          
          console.log('📅 Timestamp fix applied to request: ', url);
          console.log('Original data:', body);
          console.log('Sanitized data:', sanitizedBody);
          
          // Make request with sanitized body
          return originalFetch(url, newOptions);
        } catch (error) {
          console.error('📅 Error applying timestamp fix:', error);
        }
      }
    } catch (error) {
      console.error('📅 Fetch override error:', error);
    }
    
    // Default behavior for other requests
    return originalFetch(...args);
  };
  
  // Override XMLHttpRequest to fix timestamps in axios/jQuery/etc
  window.XMLHttpRequest.prototype.open = function(...args) {
    const xhr = this;
    const originalSend = xhr.send;
    
    // Check if this is a request to panel_cost_cal endpoints
    const [method, url] = args;
    if ((method === 'POST' || method === 'PUT') && 
        (url.includes('panel_cost_cal_profil_degiskenler') || 
         url.includes('panel_cost_cal_panel_list'))) {
      
      // Override the send method
      xhr.send = function(data) {
        try {
          if (data && typeof data === 'string') {
            // Try to parse as JSON
            try {
              const body = JSON.parse(data);
              const sanitizedBody = fixAllTimestamps(body);
              
              console.log('📅 XHR Timestamp fix applied to request:', url);
              
              // Call original send with sanitized data
              return originalSend.call(this, JSON.stringify(sanitizedBody));
            } catch (parseError) {
              // Not JSON data, proceed without modification
            }
          }
        } catch (error) {
          console.error('📅 XHR override error:', error);
        }
        
        // Default behavior for other data
        return originalSend.apply(this, arguments);
      };
    }
    
    // Call original open
    return originalXHR.apply(this, args);
  };
  
  console.log('📅 Emergency timestamp fix installed successfully');
}

// Process any object to fix timestamp fields
export function fixAllTimestamps(data) {
  // Handle null/undefined
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => fixAllTimestamps(item));
  }
  
  // Handle objects
  if (typeof data === 'object' && data !== null) {
    const result = {...data};
    
    for (const [key, value] of Object.entries(data)) {
      // Directly handle the field that's causing the error
      if (key === 'profil_latest_update' && value === '2025') {
        console.log(`📅 Fixed known problematic value '${value}' in field '${key}'`);
        result[key] = '2025-01-01 00:00:00';
        continue;
      }
      
      // Identify potential timestamp fields by naming convention
      if (key.endsWith('_at') || 
          key.includes('_tarihi') || 
          key.includes('_update') || 
          key.includes('Date')) {
        
        if (value === null || value === undefined || value === '') {
          // Keep null values
          result[key] = null;
        } else if (typeof value === 'string' && /^\d{4}$/.test(value)) {
          // Fix year-only values like "2025" by converting to proper timestamp
          const year = parseInt(value);
          if (year >= 1900 && year <= 2100) {
            result[key] = `${year}-01-01 00:00:00`;
            console.log(`📅 Fixed year value '${value}' in field '${key}'`);
          }
        } else if (typeof value === 'string') {
          // Try to fix other timestamp strings
          try {
            // If already in PostgreSQL format, leave it alone
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
              result[key] = value;
            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
              // Convert ISO format to PostgreSQL format
              result[key] = value.replace('T', ' ').split('.')[0];
              console.log(`📅 Converted ISO format in field '${key}'`);
            } else {
              // Try to parse and convert to PostgreSQL format
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                result[key] = date.toISOString().replace('T', ' ').split('.')[0];
                console.log(`📅 Converted date string in field '${key}'`);
              }
            }
          } catch (e) {
            // If parsing fails, leave it alone
            console.log(`📅 Failed to parse date in field '${key}'`, e);
          }
        } else if (value instanceof Date) {
          // Convert Date objects to proper format
          result[key] = value.toISOString().replace('T', ' ').split('.')[0];
          console.log(`📅 Converted Date object in field '${key}'`);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        result[key] = fixAllTimestamps(value);
      }
    }
    
    return result;
  }
  
  // Return primitive values unchanged
  return data;
}

// Special function to directly fix profil_degiskenler data before sending
export function fixProfilDegiskenler(data) {
  if (!data) return null;
  
  // Create a fixed copy
  const fixed = {...data};
  
  // Explicitly fix the problematic field
  if (fixed.profil_latest_update === '2025') {
    fixed.profil_latest_update = '2025-01-01 00:00:00';
    console.log('📅 Fixed profil_latest_update from "2025" to "2025-01-01 00:00:00"');
  } else {
    // Set it to current timestamp in proper format
    fixed.profil_latest_update = new Date().toISOString().replace('T', ' ').split('.')[0];
    console.log('📅 Set profil_latest_update to current timestamp');
  }
  
  return fixed;
}