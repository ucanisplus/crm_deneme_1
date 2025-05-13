// panelApi.js - Panel API operations utility
import { API_URLS, normalizeDecimalValues } from '../api-config';

/**
 * Safe parse for panel list data - ensures proper data types
 * @param {Object} data - Raw panel data
 * @returns {Object} - Sanitized panel data
 */
export const sanitizePanelData = (data) => {
  if (!data) return {};
  
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    
    // Handle both comma and period decimal separators
    if (typeof value === 'string') {
      value = value.replace(/\s/g, '').replace(',', '.');
    }
    
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };
  
  // Define fields and their expected types
  const numericFields = [
    'panel_yuksekligi', 'panel_genisligi', 'dikey_tel_capi', 'yatay_tel_capi',
    'dikey_goz_araligi', 'yatay_goz_araligi', 'adet_m2', 'agirlik'
  ];
  
  const integerFields = [
    'dikey_cubuk_adet', 'yatay_cubuk_adet', 'bukum_sayisi', 'bukumdeki_cubuk_sayisi'
  ];
  
  const result = { ...data };
  
  // Convert numeric fields to proper float values
  numericFields.forEach(field => {
    if (field in result) {
      result[field] = safeParseFloat(result[field]);
    }
  });
  
  // Convert integer fields to proper integer values
  integerFields.forEach(field => {
    if (field in result) {
      const value = safeParseFloat(result[field]);
      result[field] = Math.round(value);
    }
  });
  
  return result;
};

/**
 * Creates or updates a panel in the database
 * @param {Object} panelData - The panel data to save
 * @param {boolean} isUpdate - Whether this is an update or new record
 * @returns {Promise<Object>} Result of the operation
 */
export const savePanelToDatabase = async (panelData, isUpdate = false) => {
  try {
    // Create a clean copy of the data
    const cleanedData = { ...panelData };
    
    // Remove frontend-only properties that shouldn't be sent to the database
    const frontendProps = ['isNew', 'editMode', 'tempId'];
    frontendProps.forEach(prop => {
      if (prop in cleanedData) delete cleanedData[prop];
    });
    
    // Sanitize numeric values
    const sanitizedData = sanitizePanelData(cleanedData);
    
    // If kayit_tarihi isn't set, set it now
    if (!sanitizedData.kayit_tarihi) {
      sanitizedData.kayit_tarihi = new Date().toISOString();
    }
    
    // Try multiple approaches for maximum compatibility
    const methods = [
      // Method 1: Direct fetch with controlled headers
      async () => {
        const url = isUpdate ? 
          `${API_URLS.panelList}/${sanitizedData.id}` : 
          API_URLS.panelList;
        
        const method = isUpdate ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(sanitizedData)
        });
        
        // Check if response is successful
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
        }
        
        return await response.json();
      },
      
      // Method 2: Axios with normalized values
      async () => {
        const normalizedData = normalizeDecimalValues(sanitizedData);
        
        if (isUpdate) {
          const url = `${API_URLS.panelList}/${normalizedData.id}`;
          const response = await axios.put(url, normalizedData);
          return response.data;
        } else {
          const response = await axios.post(API_URLS.panelList, normalizedData);
          return response.data;
        }
      }
    ];
    
    // Try each method in sequence until one succeeds
    let lastError = null;
    for (const method of methods) {
      try {
        console.log(`Trying ${method.name || 'method'} to ${isUpdate ? 'update' : 'create'} panel`);
        const result = await method();
        console.log(`Success with ${method.name || 'method'}:`, result);
        return {
          success: true,
          data: result,
          message: `Panel ${isUpdate ? 'updated' : 'created'} successfully`
        };
      } catch (error) {
        console.warn(`Method failed:`, error);
        lastError = error;
        // Continue to next method
      }
    }
    
    // If we get here, all methods failed
    throw new Error(`All panel save methods failed. Last error: ${lastError?.message || 'Unknown error'}`);
    
  } catch (error) {
    console.error('Panel save error:', error);
    return {
      success: false,
      error: error.message,
      details: error
    };
  }
};

/**
 * Retrieves panel list from the database
 * @returns {Promise<Array>} Array of panel objects
 */
export const getPanelList = async () => {
  try {
    const response = await fetch(API_URLS.panelList);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch panel list: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching panel list:', error);
    throw error;
  }
};

/**
 * Deletes a panel from the database
 * @param {string|number} panelId - The ID of the panel to delete
 * @returns {Promise<Object>} Result of the operation
 */
export const deletePanel = async (panelId) => {
  try {
    const url = `${API_URLS.panelList}/${panelId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete panel: ${response.status}`);
    }
    
    return {
      success: true,
      message: 'Panel deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting panel:', error);
    return {
      success: false,
      error: error.message
    };
  }
};