// Debug helper to check for problematic timestamp values
// Add to PanelCitHesaplama.jsx to use

export function debugProfilValues(profilData) {
  console.log("=== DEBUGGING PROFIL VALUES ===");
  
  // Check for any values that are exactly "2025"
  const yearOnlyValues = {};
  
  Object.entries(profilData).forEach(([key, value]) => {
    if (value === "2025" || value === 2025) {
      yearOnlyValues[key] = value;
    }
    
    // Also check for any timestamp fields
    if ((key.includes('_update') || key.includes('_tarihi') || key.endsWith('_at'))) {
      console.log(`Timestamp field ${key}: ${value} (type: ${typeof value})`);
    }
  });
  
  if (Object.keys(yearOnlyValues).length > 0) {
    console.log("Found year-only values that may cause issues:", yearOnlyValues);
  } else {
    console.log("No year-only values found");
  }
  
  console.log("=== END DEBUGGING PROFIL VALUES ===");
  
  return profilData;
}