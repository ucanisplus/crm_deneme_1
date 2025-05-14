// timestamp-middleware.js
// This middleware can be added to your backend Express.js application
// to sanitize timestamp fields in incoming requests before they reach PostgreSQL

/**
 * Formats a proper PostgreSQL timestamp from various inputs
 * @param {any} value - Input timestamp value 
 * @returns {string|null} - Properly formatted timestamp or null
 */
function formatTimestamp(value) {
  // Handle null/undefined/empty values
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    // Handle year-only values like "2025"
    if (typeof value === 'string' && /^\d{4}$/.test(value)) {
      const year = parseInt(value);
      if (year >= 1900 && year <= 2100) {
        return `${year}-01-01 00:00:00`;
      }
    }

    // Handle ISO string format
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return value.replace('T', ' ').split('.')[0];
    }

    // Handle PostgreSQL format (already correct)
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      return value;
    }

    // Try to parse as date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Create properly formatted timestamp: YYYY-MM-DD HH:MM:SS
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error);
  }

  // Return null if all parsing attempts fail
  return null;
}

/**
 * Recursively processes an object to fix all timestamp fields
 * @param {Object} data - Object to process
 * @returns {Object} - Processed object with fixed timestamps
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
    const result = {...data};
    
    for (const [key, value] of Object.entries(data)) {
      // Specific direct fixes for known problematic fields
      if ((key === 'profil_latest_update' || key === 'kayit_tarihi') && value === '2025') {
        console.log(`[Timestamp Middleware] Fixed known problematic value '${value}' in field '${key}'`);
        result[key] = '2025-01-01 00:00:00';
        continue;
      }
      
      // Identify potential timestamp fields by naming convention
      if (key.endsWith('_at') || 
          key.includes('_tarihi') || 
          key.includes('_update') || 
          key.includes('Date')) {
        
        const formattedValue = formatTimestamp(value);
        if (formattedValue !== value) {
          console.log(`[Timestamp Middleware] Fixed ${key} from '${value}' to '${formattedValue}'`);
          result[key] = formattedValue;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        result[key] = fixTimestamps(value);
      }
    }
    
    return result;
  }
  
  // Return primitive values unchanged
  return data;
}

/**
 * Express middleware to sanitize timestamp values in request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function timestampSanitizer(req, res, next) {
  // Only process POST and PUT requests with a body
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    console.log('[Timestamp Middleware] Sanitizing request body');
    
    // Specific checks for problematic tables/endpoints
    const isProfilDegiskenler = req.path.includes('panel_cost_cal_profil_degiskenler');
    const isPanelList = req.path.includes('panel_cost_cal_panel_list');
    
    if (isProfilDegiskenlers || isPanelList) {
      console.log(`[Timestamp Middleware] Extra sanitizing for ${req.path}`);
      
      // Direct fix for known problematic values
      if (isProfilDegiskenler && req.body.profil_latest_update === '2025') {
        req.body.profil_latest_update = '2025-01-01 00:00:00';
        console.log('[Timestamp Middleware] Fixed profil_latest_update directly');
      }
      
      if (isPanelList && req.body.kayit_tarihi === '2025') {
        req.body.kayit_tarihi = '2025-01-01 00:00:00';
        console.log('[Timestamp Middleware] Fixed kayit_tarihi directly');
      }
    }
    
    // Process all fields in the request body
    req.body = fixTimestamps(req.body);
  }
  
  next();
}

module.exports = timestampSanitizer;