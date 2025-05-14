// date-utils.js
// Simplified date utilities - removing timestamp fields to avoid database errors

/**
 * Creates a formatted timestamp string - function maintained for compatibility
 * @returns {string} Formatted timestamp
 */
export function getFormattedTimestamp() {
  return new Date().toISOString();
}

/**
 * Validates if a string is a timestamp - function maintained for compatibility
 * @param {string} timestamp - The timestamp to validate
 * @returns {boolean} Whether the timestamp is valid
 */
export function isValidTimestamp(timestamp) {
  if (typeof timestamp !== 'string') return false;
  
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  } catch (e) {
    return false;
  }
}

/**
 * Creates a timestamp - function maintained for compatibility
 * @param {string|Date} [date] - Optional date to format
 * @returns {string} Formatted timestamp
 */
export function getSafeTimestamp(date) {
  try {
    const timestamp = date ? 
      (date instanceof Date ? date : new Date(date)) : 
      new Date();
    
    return timestamp.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

/**
 * Checks if a value is a valid date - function maintained for compatibility
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
 * Processes an object by removing all timestamp fields
 * @param {Object} data - The data object to process
 * @returns {Object} - Object with timestamp fields removed
 */
export function processTimestampFields(data) {
  if (!data || typeof data !== 'object') return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => processTimestampFields(item));
  }
  
  // Handle objects
  const result = {...data};
  
  // Remove timestamp fields
  Object.keys(result).forEach(key => {
    if (key.endsWith('_at') || key.includes('_tarihi') || 
        key.includes('_update') || key.includes('Date')) {
      delete result[key];
    } else if (result[key] && typeof result[key] === 'object') {
      result[key] = processTimestampFields(result[key]);
    }
  });
  
  return result;
}