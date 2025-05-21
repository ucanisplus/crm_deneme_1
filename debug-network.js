// debug-network.js - Simplified version (no debugging functionality)
// This is a stub file to maintain compatibility after removing backend files

export const debugApiCalls = () => {
  console.log('API call debugging is disabled');
  // No-op function - debugging disabled
};

export const directlySubmitPanel = async (data) => {
  console.warn('Direct panel submission is deprecated - use standard API calls instead');
  throw new Error('Direct panel submission is no longer supported');
};