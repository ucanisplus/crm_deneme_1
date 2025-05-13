// date-utils.js

/**
 * Creates a properly formatted ISO timestamp string
 * that is compatible with PostgreSQL's timestamp type
 * @returns {string} Properly formatted timestamp
 */
export function getFormattedTimestamp() {
  // Create a new date - make sure it's in local time to avoid timezone issues
  const now = new Date();
  
  // Format as ISO string but remove the 'Z' which indicates UTC
  // PostgreSQL expects format: YYYY-MM-DDTHH:MM:SS.sss
  let isoString = now.toISOString();
  
  // Remove the 'Z' that indicates UTC if present
  if (isoString.endsWith('Z')) {
    isoString = isoString.slice(0, -1);
  }
  
  return isoString;
}

/**
 * Validates if a string is a proper ISO-formatted timestamp
 * @param {string} timestamp - The timestamp to validate
 * @returns {boolean} Whether the timestamp is valid
 */
export function isValidTimestamp(timestamp) {
  if (typeof timestamp !== 'string') return false;
  
  // Basic pattern for ISO timestamp: YYYY-MM-DDTHH:MM:SS.sss
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/;
  
  return pattern.test(timestamp);
}

/**
 * Safely creates a timestamp that won't cause database errors
 * @param {string|Date} [date] - Optional date to format (defaults to now)
 * @returns {string} Safe timestamp for database operations
 */
export function getSafeTimestamp(date) {
  try {
    // Use provided date or create new one
    const timestamp = date ? 
      (date instanceof Date ? date : new Date(date)) : 
      new Date();
    
    // Format: YYYY-MM-DD HH:MM:SS (PostgreSQL compatible format)
    return timestamp.toISOString().replace('T', ' ').split('.')[0];
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    
    // Fallback to a safe default format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * Checks if a value is a valid date string or object
 * 
 * @param {any} value - Value to check
 * @returns {boolean} - True if value is a valid date
 */
export function isValidDate(value) {
  if (!value) return false;
  
  if (value instanceof Date) return !isNaN(value.getTime());
  
  if (typeof value === 'string') {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  
  return false;
}

/**
 * Processes an object to ensure all timestamp fields are properly formatted
 * 
 * @param {Object} data - The data object to process
 * @returns {Object} - Object with properly formatted timestamps
 */
export function processTimestampFields(data) {
  if (!data || typeof data !== 'object') return data;
  
  const result = Array.isArray(data) ? [...data] : {...data};
  
  // Process object properties
  if (!Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      // Identify timestamp fields by naming convention
      if (key.endsWith('_at') || 
          key.includes('_tarihi') || 
          key.includes('_update') || 
          key.includes('Date')) {
        
        // Format the timestamp if it's a date or valid date string
        if (value && (value instanceof Date || isValidDate(value))) {
          result[key] = getSafeTimestamp(value);
        } else if (value === null || value === undefined) {
          // Preserve null values
          result[key] = null;
        } else if (typeof value === 'string' && value.trim() === '') {
          // Empty strings become null for database compatibility
          result[key] = null;
        } else if (typeof value === 'string' && !isNaN(parseInt(value))) {
          // Handle year-only values like "2025" that might be causing problems
          const year = parseInt(value);
          if (year >= 1900 && year <= 2100) {
            // Convert to safe timestamp format with Jan 1st of that year
            result[key] = `${year}-01-01 00:00:00`;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        result[key] = processTimestampFields(value);
      }
    }
  } else {
    // Process array items
    for (let i = 0; i < data.length; i++) {
      if (typeof data[i] === 'object' && data[i] !== null) {
        result[i] = processTimestampFields(data[i]);
      }
    }
  }
  
  return result;
}