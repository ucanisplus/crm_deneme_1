// date-utils.js
// UPDATED: Enhanced date utilities for PostgreSQL timestamptz compatibility

/**
 * Creates a properly formatted ISO timestamp string
 * that is compatible with PostgreSQL's timestamptz type
 * @returns {string} Properly formatted timestamp with timezone (ISO8601)
 */
export function getFormattedTimestamp() {
  // Create a new date 
  const now = new Date();
  
  // For PostgreSQL timestamptz, the format should include timezone
  // Always using ISO8601 format with Z (UTC timezone marker)
  return now.toISOString();
}

/**
 * Validates if a string is a proper ISO-formatted timestamp
 * @param {string} timestamp - The timestamp to validate
 * @returns {boolean} Whether the timestamp is valid
 */
export function isValidTimestamp(timestamp) {
  if (typeof timestamp !== 'string') return false;
  
  // Updated pattern for ISO timestamp with timezone: YYYY-MM-DDTHH:MM:SS.sssZ
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:?\d{2})?$/;
  
  return pattern.test(timestamp);
}

/**
 * Safely creates a timestamp that won't cause database errors with timestamptz
 * @param {string|Date} [date] - Optional date to format (defaults to now)
 * @returns {string} Safe timestamp for database operations
 */
export function getSafeTimestamp(date) {
  try {
    // Use provided date or create new one
    const timestamp = date ? 
      (date instanceof Date ? date : new Date(date)) : 
      new Date();
    
    // Always return full ISO format with 'Z' to ensure PostgreSQL timestamptz compatibility
    return timestamp.toISOString();
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    console.trace('Trace for timestamp error');
    
    // Fallback to a safe default format with timezone marker
    const now = new Date();
    return now.toISOString();
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
    // Handle special case for '2025' which might be causing errors
    if (/^\d{4}$/.test(value)) {
      const year = parseInt(value);
      return year >= 1900 && year <= 2100;
    }
    
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
  
  return false;
}

/**
 * Processes an object to ensure all timestamp fields are properly formatted
 * for PostgreSQL timestamptz compatibility
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
        
        // Handle empty/null values
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
          result[key] = null;
          continue;
        }
        
        // Handle year-only values like "2025"
        if (typeof value === 'string' && /^\d{4}$/.test(value)) {
          const year = parseInt(value);
          if (year >= 1900 && year <= 2100) {
            // Always include Z for timestamptz compatibility
            result[key] = `${year}-01-01T00:00:00.000Z`;
            continue;
          }
        }
        
        // Handle dates and date strings
        if (value instanceof Date || (typeof value === 'string' && isValidDate(value))) {
          try {
            const dateObj = value instanceof Date ? value : new Date(value);
            result[key] = dateObj.toISOString();
          } catch (error) {
            console.error(`Error formatting date field ${key}:`, error);
            result[key] = null;
          }
          continue;
        }
        
        // If we get here and the value doesn't match any pattern, set to null
        if (typeof value !== 'string' || !isValidTimestamp(value)) {
          console.warn(`Invalid timestamp value for field ${key}:`, value);
          result[key] = null;
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