// cors-proxy.js - A simple CORS proxy for handling API requests
// Used for situations where backend CORS configuration isn't properly set

import { API_URLS } from '../api-config';

// Base URLs for the backend
const BACKEND_URL = 'https://crm-deneme-backend.vercel.app/api';

// Create a cors proxy URL from an original API URL
export function createCorsProxyUrl(originalUrl) {
  if (!originalUrl) return null;
  
  // For production domains, try to use CORS-anywhere as a backup option
  try {
    // Only use this for production URLs, not for localhost
    if (originalUrl.includes('vercel.app') || originalUrl.includes('crm-deneme-backend')) {
      return `https://cors-anywhere.herokuapp.com/${originalUrl}`;
    }
  } catch(e) {
    console.error('Error creating CORS proxy URL:', e);
  }
  
  // Return the original URL if we can't create a proxy URL
  return originalUrl;
}

// Fetch with CORS proxy as a fallback for CORS errors
export async function fetchWithCorsProxy(url, options = {}) {
  // First try direct fetch
  try {
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (response.ok) {
      return response;
    }
  } catch (error) {
    console.warn(`Direct fetch to ${url} failed, trying CORS proxy:`, error);
  }
  
  // If direct fetch fails, try with CORS proxy
  try {
    const proxyUrl = createCorsProxyUrl(url);
    if (proxyUrl !== url) {
      console.log(`Using CORS proxy: ${proxyUrl}`);
      
      // Add additional headers for CORS proxy
      const proxyOptions = {
        ...options,
        headers: {
          ...options.headers,
          'X-Requested-With': 'XMLHttpRequest'
        },
        mode: 'cors',
        credentials: 'omit'
      };
      
      return await fetch(proxyUrl, proxyOptions);
    }
  } catch (error) {
    console.error(`CORS proxy fetch to ${url} failed:`, error);
  }
  
  // If all else fails, throw an error
  throw new Error(`Failed to fetch ${url} with and without CORS proxy`);
}

// Create alternative API endpoints using the CORS proxy
export const CORS_PROXY_API_URLS = {
  // Generate proxied endpoints for all API URLs
  ...Object.entries(API_URLS).reduce((acc, [key, value]) => {
    // Skip function entries and non-string values
    if (typeof value === 'string') {
      acc[key] = createCorsProxyUrl(value);
    }
    return acc;
  }, {})
};