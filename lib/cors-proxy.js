// cors-proxy.js - Simplified version (no CORS proxy functionality)
// This is a stub file to maintain compatibility after removing backend files

// This function now just passes through to the normal fetch API
// with a message that CORS proxy is deprecated
export const fetchWithCorsProxy = async (url, options = {}) => {
  console.warn('CORS Proxy is deprecated - using direct fetch instead');
  return fetch(url, options);
};

// Empty placeholders for API URLs
export const CORS_PROXY_API_URLS = {
  // These are now identical to the normal API URLs since we're not using the proxy
};