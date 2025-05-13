// profil-fix.js
// This is a direct fix for the profil_degiskenler timestamp issue

/**
 * This function directly removes or fixes the problematic "2025" timestamp 
 * in profil_degiskenler before sending to the database
 */
export function fixProfilDegiskenler(data) {
  if (!data) return null;
  
  // Create a clean copy
  const fixedData = { ...data };
  
  // Look for any field containing problematic year values
  Object.keys(fixedData).forEach(key => {
    // Check if the value is exactly "2025" (the problematic value)
    if (fixedData[key] === "2025") {
      console.log(`Found problematic value "2025" in field ${key}`);
      // Set it to the current date in proper format
      const now = new Date();
      fixedData[key] = now.toISOString().replace('T', ' ').split('.')[0];
    }
    
    // Also check for any date field with year-only format
    if ((key.includes('_tarihi') || key.includes('_update') || key.endsWith('_at')) && 
        typeof fixedData[key] === 'string' && /^\d{4}$/.test(fixedData[key])) {
      console.log(`Found year-only value "${fixedData[key]}" in date field ${key}`);
      
      // Replace with properly formatted date
      const year = parseInt(fixedData[key]);
      fixedData[key] = `${year}-01-01 00:00:00`;
    }
  });
  
  // Always set the latest_update field to current time
  fixedData.profil_latest_update = new Date().toISOString().replace('T', ' ').split('.')[0];
  
  return fixedData;
}

// Usage example for PanelCitHesaplama component:
/*
  // Find the part of your code where you save profil_degiskenler
  // and add this before sending to the API:
  
  import { fixProfilDegiskenler } from '../profil-fix';
  
  // When saving profil_degiskenler:
  const dataToSave = {
    // your data here
  };
  
  // Fix the data before sending
  const fixedData = fixProfilDegiskenler(dataToSave);
  
  // Now use the fixed data with API
  await postData(API_URLS.profilDegiskenler, fixedData);
*/