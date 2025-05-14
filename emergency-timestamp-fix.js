/**
 * CRITICAL FIX FOR TIMESTAMP ISSUES
 * 
 * This file contains a global fix for timestamp format issues with PostgreSQL.
 * It overrides the native fetch API to intercept any requests with problematic 
 * timestamp values and fix them before they reach the server.
 */

// Install the fix automatically when imported
installGlobalFix();

function installGlobalFix() {
  if (typeof window === 'undefined') return;
  
  console.log('🛠️ Installing global timestamp fix');
  
  // Store the original fetch
  const originalFetch = window.fetch;
  
  // Override fetch to intercept and fix problematic timestamp values
  window.fetch = async function(...args) {
    try {
      const [url, options] = args;
      
      // Only process POST/PUT requests with a body
      if (options && options.method && 
          (options.method === 'POST' || options.method === 'PUT') && 
          options.body && typeof options.body === 'string') {
        
        // Check if this is a request to one of the problematic endpoints
        if (url.includes('panel_cost_cal_profil_degiskenler') || 
            url.includes('panel_cost_cal_panel_list')) {
          
          console.log('🛠️ Fixing request to:', url);
          
          try {
            // Parse the request body
            const data = JSON.parse(options.body);
            let fixed = false;
            
            // Fix specific problematic fields
            if (data.profil_latest_update === '2025') {
              data.profil_latest_update = '2025-01-01 00:00:00';
              fixed = true;
              console.log('🛠️ Fixed profil_latest_update');
            }
            
            if (data.kayit_tarihi === '2025') {
              data.kayit_tarihi = '2025-01-01 00:00:00';
              fixed = true;
              console.log('🛠️ Fixed kayit_tarihi');
            }
            
            // Apply the fix to all timestamp fields using naming conventions
            Object.keys(data).forEach(key => {
              // Check if key name suggests it's a timestamp field
              if ((key.includes('_update') || key.includes('_tarihi') || key.endsWith('_at')) &&
                  typeof data[key] === 'string' && /^\d{4}$/.test(data[key])) {
                
                // Fix year-only values
                const year = parseInt(data[key]);
                if (year >= 1900 && year <= 2100) {
                  data[key] = `${year}-01-01 00:00:00`;
                  fixed = true;
                  console.log(`🛠️ Fixed ${key} from "${year}" to "${data[key]}"`);
                }
              }
            });
            
            // Create new options with fixed body
            if (fixed) {
              const newOptions = {
                ...options,
                body: JSON.stringify(data)
              };
              
              console.log('🛠️ Making request with fixed data');
              return originalFetch(url, newOptions);
            }
          } catch (error) {
            console.error('🛠️ Error fixing timestamps:', error);
          }
        }
      }
    } catch (error) {
      console.error('🛠️ Error in fetch override:', error);
    }
    
    // Fall back to original fetch for unmodified requests
    return originalFetch(...args);
  };
  
  console.log('🛠️ Global timestamp fix installed successfully');
}

export default { installGlobalFix };