// api-helpers.js
// Enhanced API utility functions to work around 500 errors

import { getSafeTimestamp, isValidDate } from './date-utils';

/**
 * Enhanced API request that works around 500 errors on POST/PUT
 * @param {string} url - API endpoint URL
 * @param {object} data - Data to send
 * @param {string} method - HTTP method (POST, PUT, etc)
 * @returns {Promise<object>} - API response
 */
export async function enhancedApiRequest(url, data, method = 'POST') {
  console.log(`Attempting ${method} to ${url} with:`, data);
  
  // First, validate and sanitize the data
  const sanitizedData = sanitizeDataForApi(data);
  if (!sanitizedData) {
    throw new Error('Invalid data - cannot be null or empty');
  }
  
  // Try multiple approaches to maximize success chances
  const approaches = [
    // Approach 1: Direct fetch with simplified data
    async () => {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(sanitizedData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    },
    
    // Approach 2: Axios with prepared data
    async () => {
      // Make sure axios is available
      if (typeof axios === 'undefined') {
        throw new Error('Axios not available');
      }
      
      const response = await axios({
        method: method,
        url: url,
        data: sanitizedData,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      return response.data;
    },
    
    // Approach 3: Alternative fetch without complex properties
    async () => {
      // Further simplify data by removing any complex properties
      const simpleData = {};
      Object.entries(sanitizedData).forEach(([key, value]) => {
        // Only include simple data types
        if (value === null || 
            typeof value === 'string' || 
            typeof value === 'number' || 
            typeof value === 'boolean') {
          simpleData[key] = value;
        }
      });
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(simpleData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    }
  ];
  
  // Try each approach in sequence until one succeeds
  for (let i = 0; i < approaches.length; i++) {
    try {
      console.log(`Trying approach #${i+1}...`);
      const result = await approaches[i]();
      console.log(`Approach #${i+1} successful!`);
      return result;
    } catch (error) {
      console.error(`Approach #${i+1} failed:`, error);
      
      // If we've tried all approaches, rethrow the last error
      if (i === approaches.length - 1) {
        throw error;
      }
      
      // Otherwise, continue to the next approach
    }
  }
}

/**
 * Sanitize data for API requests - fixing common issues
 * @param {object} data - Data to sanitize
 * @returns {object} - Sanitized data
 */
function sanitizeDataForApi(data) {
  // Handle null/undefined
  if (!data) return null;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeDataForApi(item)).filter(item => item !== null);
  }
  
  // Handle objects
  if (typeof data === 'object') {
    // Skip empty objects
    if (Object.keys(data).length === 0) return null;
    
    const result = {};
    
    // Process each property
    for (const [key, value] of Object.entries(data)) {
      // Skip internal/temporary fields
      if (key.startsWith('_') || key === 'editMode' || key === 'isNew' || key === 'tempId') {
        continue;
      }
      
      // Handle empty strings
      if (value === '') {
        result[key] = null;
        continue;
      }
      
      // Skip timestamp fields entirely - let the database handle them
      if ((key.includes('_update') || key.includes('_tarihi') || key.endsWith('_at') || key.includes('Date'))) {
        // Simply skip this field - don't include it in the result
        continue;
      }
      
      // Handle strings with commas in numeric values
      if (typeof value === 'string' && /^-?\d+(\,\d+)?$/.test(value)) {
        result[key] = parseFloat(value.replace(',', '.'));
        continue;
      }
      
      // Handle nested objects/arrays
      if (value !== null && typeof value === 'object') {
        const sanitized = sanitizeDataForApi(value);
        if (sanitized !== null) {
          result[key] = sanitized;
        }
        continue;
      }
      
      // Keep other values as-is
      result[key] = value;
    }
    
    return result;
  }
  
  // Handle primitive values
  return data;
}

/**
 * Post data to the API with enhanced error handling
 * @param {string} url - API endpoint URL
 * @param {object} data - Data to send
 * @returns {Promise<object>} - API response
 */
export function postData(url, data) {
  return enhancedApiRequest(url, data, 'POST');
}

/**
 * Update data via the API with enhanced error handling
 * @param {string} url - API endpoint URL
 * @param {object} data - Data to send
 * @returns {Promise<object>} - API response
 */
export function putData(url, data) {
  return enhancedApiRequest(url, data, 'PUT');
}

/**
 * Direct data submission without axios - for fallback
 * @param {string} url - API endpoint URL
 * @param {object} data - Data to send
 * @param {string} method - HTTP method
 * @returns {Promise<object>} - API response or error
 */
export async function directSubmit(url, data, method = 'POST') {
  try {
    // Sanitize the data
    const sanitizedData = sanitizeDataForApi(data);
    
    // Send the request using plain fetch
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sanitizedData)
    });
    
    // Check if request was successful
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage += ` - ${errorData.error || errorData.message || 'Unknown error'}`;
      } catch (e) {
        // Couldn't parse JSON error
        try {
          errorMessage += ` - ${await response.text()}`;
        } catch (e2) {
          // Couldn't get text either
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Parse and return response data
    return await response.json();
  } catch (error) {
    console.error('Direct submit error:', error);
    throw error;
  }
}