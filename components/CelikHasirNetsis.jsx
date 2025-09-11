// Çelik Hasır Netsis Integration Component
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { API_URLS, fetchWithAuth } from '@/api-config';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getCombinationQConfig } from '@/mesh-config-service';
import { 
  Database, 
  FileSpreadsheet, 
  AlertTriangle, 
  Check, 
  X, 
  Eye, 
  Trash2, 
  Download,
  Upload,
  FileText,
  Loader,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Filmaşin selection function
const getFilmasinKodu = (diameter) => {
  const FILMASIN_MAPPING = {
    4.45: 6.0, 4.50: 6.0, 4.75: 6.0, 4.85: 6.0, 5.00: 6.0,
    5.50: 6.5,
    6.00: 7.0,
    6.50: 7.5,
    7.00: 8.0,
    7.50: 9.0, 7.80: 9.0, 8.00: 9.0, 8.50: 9.0, 8.60: 9.0,
    9.20: 11.0,
    10.60: 12.0
  };
  
  // Get filmaşin diameter from mapping table
  let flmDiameter = FILMASIN_MAPPING[diameter];
  
  // If not in mapping, use formula
  if (!flmDiameter) {
    if (diameter <= 6.0) {
      flmDiameter = diameter + 1.5;
    } else if (diameter <= 8.0) {
      flmDiameter = diameter + 1.5;
    } else {
      flmDiameter = diameter + 2.0;
    }
    // Round to nearest standard filmaşin size
    const standardSizes = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0];
    flmDiameter = standardSizes.find(s => s >= flmDiameter) || flmDiameter;
  }
  
  const flmQuality = flmDiameter >= 7.0 ? '1010' : '1008';
  const flmKodu = `FLM.${String(Math.round(flmDiameter * 100)).padStart(4, '0')}.${flmQuality}`;
  
  // Return both the code and the properties for backward compatibility
  return {
    code: flmKodu,
    diameter: flmDiameter,
    quality: flmQuality,
    toString: () => flmKodu  // For backward compatibility when used as string
  };
};

// Fallback formula function for missing database values
// Global cache for mesh configurations to avoid repeated API calls
const meshConfigCache = new Map();

// Batch fetch mesh configurations to avoid individual API calls
const batchFetchMeshConfigs = async (hasirTipis) => {
  const uniqueHasirTipis = [...new Set(hasirTipis)];
  const uncachedTypes = uniqueHasirTipis.filter(type => !meshConfigCache.has(type));
  
  if (uncachedTypes.length > 0) {
    console.log(`📥 Batch fetching mesh configs for: ${uncachedTypes.join(', ')}`);
    
    // Fetch all uncached configs in parallel
    const fetchPromises = uncachedTypes.map(async (hasirTipi) => {
      try {
        const response = await fetchWithAuth(`${API_URLS.meshTypeConfigs}/${encodeURIComponent(hasirTipi)}`);
        if (response.ok) {
          const config = await response.json();
          meshConfigCache.set(hasirTipi, config);
          return { hasirTipi, config };
        } else {
          meshConfigCache.set(hasirTipi, null); // Cache failure to avoid repeated calls
          return { hasirTipi, config: null };
        }
      } catch (error) {
        console.warn(`Failed to fetch mesh config for ${hasirTipi}:`, error);
        meshConfigCache.set(hasirTipi, null);
        return { hasirTipi, config: null };
      }
    });
    
    await Promise.all(fetchPromises);
  }
  
  return uniqueHasirTipis.map(type => ({
    hasirTipi: type,
    config: meshConfigCache.get(type)
  }));
};

const calculateFallbackCubukSayisi = async (hasirTipi, uzunlukBoy, uzunlukEn) => {
  try {
    // Use cached mesh configuration to avoid repeated API calls
    let meshConfig = meshConfigCache.get(hasirTipi);
    
    if (meshConfig === undefined) {
      // Not cached yet, fetch it
      await batchFetchMeshConfigs([hasirTipi]);
      meshConfig = meshConfigCache.get(hasirTipi);
    }
    
    // Use database config or fallback to hardcoded values
    const boyAralik = meshConfig?.boy_aralik || getDefaultSpacing(hasirTipi, 'boy');
    const enAralik = meshConfig?.en_aralik || getDefaultSpacing(hasirTipi, 'en');
    
    // Determine hasırTuru based on dimensions
    let hasirTuru = 'Standart';
    if (hasirTipi.startsWith('Q')) {
      if (uzunlukBoy >= 490 && uzunlukBoy <= 510) {
        hasirTuru = 'Döşeme';
      } else if (uzunlukBoy <= 350) {
        hasirTuru = 'Perde';
      } else {
        hasirTuru = 'Döşeme';
      }
    }
    
    // Initialize with base calculation
    let cubukSayisiBoy = Math.floor((uzunlukEn / boyAralik) + 1);
    let cubukSayisiEn = Math.floor((uzunlukBoy / enAralik) + 1);
    
    // Apply type-specific rules
    const isStandardSize = (uzunlukBoy >= 490 && uzunlukBoy <= 510) && 
                          (uzunlukEn >= 210 && uzunlukEn <= 220);
    
    if (hasirTipi.startsWith('R')) {
      if (isStandardSize) {
        cubukSayisiBoy = 15;
        cubukSayisiEn = 20;
      }
    } else if (hasirTipi.startsWith('TR')) {
      if (isStandardSize) {
        cubukSayisiBoy = 8;
        cubukSayisiEn = 33;
      }
    } else if (hasirTipi.startsWith('Q')) {
      if (hasirTuru === 'Perde') {
        cubukSayisiEn = 18;
      } else if (hasirTuru === 'DK Perde') {
        cubukSayisiEn = 21;
      } else if (isStandardSize && hasirTuru === 'Döşeme') {
        cubukSayisiBoy = 15;
        cubukSayisiEn = 32;
      }
    }
    
    console.log(`FALLBACK DEBUG - Input: ${hasirTipi} ${uzunlukBoy}x${uzunlukEn}`);
    console.log(`FALLBACK DEBUG - hasirTuru: ${hasirTuru}, boyAralik: ${boyAralik}, enAralik: ${enAralik}`);
    console.log(`FALLBACK DEBUG - Base calculation: boy=${cubukSayisiBoy}, en=${cubukSayisiEn}`);
    
    // Apply optimization logic (simplified version)
    const optimized = applyFilizOptimization(hasirTipi, uzunlukBoy, uzunlukEn, cubukSayisiBoy, cubukSayisiEn, boyAralik, enAralik, hasirTuru);
    
    console.log(`FALLBACK DEBUG - Final optimized result: boy=${optimized.cubukSayisiBoy}, en=${optimized.cubukSayisiEn}`);
    
    return optimized;
  } catch (error) {
    console.error('Fallback formula calculation error:', error);
    // Return basic calculation if everything fails
    return {
      cubukSayisiBoy: Math.floor((uzunlukEn / 15) + 1),
      cubukSayisiEn: Math.floor((uzunlukBoy / 15) + 1)
    };
  }
};

// Helper function to get default spacing when mesh_type_configs is not available
const getDefaultSpacing = (hasirTipi, direction) => {
  if (hasirTipi.startsWith('R')) {
    return direction === 'boy' ? 15 : 25;
  } else if (hasirTipi.startsWith('TR')) {
    return direction === 'boy' ? 30 : 15;
  } else if (hasirTipi.startsWith('Q')) {
    return 15;
  }
  return 15; // Default fallback
};

// Simplified optimization logic for fallback
const applyFilizOptimization = (hasirTipi, uzunlukBoy, uzunlukEn, initialBoy, initialEn, boyAralik, enAralik, hasirTuru) => {
  // Q Perde: Fixed EN at 18, optimize BOY
  if (hasirTipi.startsWith('Q') && hasirTuru === 'Perde') {
    const targetSolFiliz = 2.5;
    let bestBoy = initialBoy;
    let bestDiff = 999;
    
    for (let boy = Math.max(2, initialBoy - 5); boy <= initialBoy + 5; boy++) {
      const solFiliz = (uzunlukEn - ((boy - 1) * boyAralik)) / 2;
      if (solFiliz >= 2 && solFiliz <= 9) {
        const diff = Math.abs(solFiliz - targetSolFiliz);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestBoy = boy;
        }
      }
    }
    return { cubukSayisiBoy: bestBoy, cubukSayisiEn: 18 };
  }
  
  // For other types, try basic optimization within ±3 range
  let bestCombination = { cubukSayisiBoy: initialBoy, cubukSayisiEn: initialEn };
  let bestScore = -999;
  
  for (let boy = Math.max(2, initialBoy - 3); boy <= initialBoy + 3; boy++) {
    for (let en = Math.max(2, initialEn - 3); en <= initialEn + 3; en++) {
      const solFiliz = (uzunlukEn - ((boy - 1) * boyAralik)) / 2;
      const onFiliz = (uzunlukBoy - ((en - 1) * enAralik)) / 2;
      
      if (solFiliz >= 2 && solFiliz <= 16 && onFiliz >= 10) {
        let score = 0;
        if (Math.abs(solFiliz - 2.5) < 0.5) score += 10;
        if (hasirTipi.startsWith('R') && onFiliz >= 15 && onFiliz <= 27) score += 10;
        else if (hasirTipi.startsWith('TR') && onFiliz >= 10 && onFiliz <= 17) score += 10;
        else if (hasirTipi.startsWith('Q') && onFiliz >= 15 && onFiliz <= 22) score += 10;
        
        if (score > bestScore) {
          bestScore = score;
          bestCombination = { cubukSayisiBoy: boy, cubukSayisiEn: en };
        }
      }
    }
  }
  
  return bestCombination;
};

// Unified function to fetch database data with fallback formula
const fetchDatabaseDataWithFallback = async (productIds = [], stokKodular = []) => {
  try {
    // Small delay to allow database transaction to commit if this is called right after save
    if (stokKodular.length > 0) {
      console.log('⏳ Adding 1 second delay to allow database transaction to commit...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Fetch products from database based on IDs or stok_kodu
    const allProducts = [];
    
    // When searching by productIds, use backend IDs parameter to fetch only specific products
    if (productIds.length > 0) {
      const tableTypes = ['mm', 'ncbk', 'ntel'];
      
      for (const tableType of tableTypes) {
        try {
          let url = `${API_URLS.celikHasirMm}`;
          if (tableType === 'ncbk') url = `${API_URLS.celikHasirNcbk}`;
          else if (tableType === 'ntel') url = `${API_URLS.celikHasirNtel}`;
          
          // Use backend 'ids' parameter to fetch only the specific IDs we need
          const idsParam = productIds.join(',');
          const response = await fetchWithAuth(`${url}?ids=${encodeURIComponent(idsParam)}`);
          if (response.ok) {
            const products = await response.json();
            console.log(`✅ Found ${products.length} products from ${tableType} table using ID search`);
            allProducts.push(...products);
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${tableType} table:`, error);
        }
      }
    }
    // When searching by stok_kodu, get MM product + related NCBK/NTEL records
    else if (stokKodular.length > 0) {
      // CRITICAL FIX: Batch fetch all products at once instead of individual API calls
      try {
        const filteredMmProducts = [];
        
        // OPTIMIZATION: Fetch all products in batches to avoid server overload
        const batchSize = 10; // Process in batches to avoid too long URLs
        for (let i = 0; i < stokKodular.length; i += batchSize) {
          const batch = stokKodular.slice(i, i + batchSize);
          const searchParam = batch.join(',');
          
          // Use batch search parameter if backend supports it, otherwise fallback to individual searches
          let mmResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?stok_kodular=${encodeURIComponent(searchParam)}`);
          
          // If batch search is not supported (404 or 400), fallback to individual searches for this batch
          if (!mmResponse.ok && (mmResponse.status === 404 || mmResponse.status === 400)) {
            console.log('Batch search not supported, falling back to individual searches for this batch');
            for (const stokKodu of batch) {
              let individualResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?search=${encodeURIComponent(stokKodu)}`);
              if (individualResponse.ok) {
                const products = await individualResponse.json();
                const exactMatch = products.filter(p => p.stok_kodu === stokKodu);
                if (exactMatch.length > 0) {
                  console.log(`✅ Found ${exactMatch.length} products via search for ${stokKodu}`);
                  filteredMmProducts.push(...exactMatch);
                }
              }
            }
          } else if (mmResponse.ok) {
            const mmProducts = await mmResponse.json();
            console.log(`✅ Found ${mmProducts.length} products in batch ${Math.floor(i/batchSize) + 1}`);
            filteredMmProducts.push(...mmProducts);
          }
          
          // Second try: If search failed, try fetching recent records (newly saved might not be indexed)
          console.warn(`⚠️ Search for ${stokKodu} returned 0 results, trying recent records fetch...`);
          try {
            mmResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?sort_by=created_at&sort_order=desc&limit=50`);
            if (mmResponse.ok) {
              const recentProducts = await mmResponse.json();
              const exactMatch = recentProducts.filter(p => p.stok_kodu === stokKodu);
              if (exactMatch.length > 0) {
                console.log(`✅ Found ${exactMatch.length} products via recent fetch for ${stokKodu}`);
                filteredMmProducts.push(...exactMatch);
              } else {
                console.error(`❌ Product ${stokKodu} not found even in recent records!`);
              }
            }
          } catch (error) {
            console.error(`❌ Recent fetch failed for ${stokKodu}:`, error);
          }
        }
        
        console.log(`Found ${filteredMmProducts.length} products in MM table matching stok_kodu:`, filteredMmProducts.map(p => p.stok_kodu));
        allProducts.push(...filteredMmProducts);
        
        // For each MM product, find related NCBK and NTEL records via recipe data
        for (const mmProduct of filteredMmProducts) {
          try {
            const recipeResponse = await fetchWithAuth(`${API_URLS.celikHasirMmRecete}?mamul_kodu=${encodeURIComponent(mmProduct.stok_kodu)}`);
            if (recipeResponse.ok) {
              const recipeData = await recipeResponse.json();
              console.log(`Found ${recipeData.length} recipe entries for ${mmProduct.stok_kodu}`);
              
              // Debug: Check what mamul_kodu values we actually have
              const uniqueMamulKodus = [...new Set(recipeData.map(r => r.mamul_kodu))];
              console.log(`DEBUG: Unique mamul_kodu values in recipe data:`, uniqueMamulKodus);
              console.log(`DEBUG: Looking for mamul_kodu === "${mmProduct.stok_kodu}"`);
              console.log(`DEBUG: First few recipe entries:`, recipeData.slice(0, 3).map(r => ({ mamul_kodu: r.mamul_kodu, bilesen_kodu: r.bilesen_kodu })));
              
              // Filter recipe data to only this specific product's recipe
              const thisProductRecipe = recipeData.filter(recipe => recipe.mamul_kodu === mmProduct.stok_kodu);
              console.log(`Filtered to ${thisProductRecipe.length} recipe entries specifically for ${mmProduct.stok_kodu}`);
              
              // Extract NCBK and NTEL codes from this product's recipe only
              const ncbkCodes = new Set();
              const ntelCodes = new Set();
              
              thisProductRecipe.forEach(recipe => {
                if (recipe.bilesen_kodu) {
                  if (recipe.bilesen_kodu.startsWith('YM.NCBK.')) {
                    ncbkCodes.add(recipe.bilesen_kodu);
                  } else if (recipe.bilesen_kodu.startsWith('YM.NTEL.')) {
                    ntelCodes.add(recipe.bilesen_kodu);
                  }
                }
              });
              
              // Fetch NCBK records
              if (ncbkCodes.size > 0) {
                const ncbkResponse = await fetchWithAuth(API_URLS.celikHasirNcbk);
                if (ncbkResponse.ok) {
                  const ncbkProducts = await ncbkResponse.json();
                  const relatedNcbk = ncbkProducts.filter(p => ncbkCodes.has(p.stok_kodu));
                  console.log(`Found ${relatedNcbk.length} related NCBK records:`, relatedNcbk.map(p => p.stok_kodu));
                  allProducts.push(...relatedNcbk);
                }
              }
              
              // Fetch NTEL records
              if (ntelCodes.size > 0) {
                const ntelResponse = await fetchWithAuth(API_URLS.celikHasirNtel);
                if (ntelResponse.ok) {
                  const ntelProducts = await ntelResponse.json();
                  const relatedNtel = ntelProducts.filter(p => ntelCodes.has(p.stok_kodu));
                  console.log(`Found ${relatedNtel.length} related NTEL records:`, relatedNtel.map(p => p.stok_kodu));
                  allProducts.push(...relatedNtel);
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch recipe data for ${mmProduct.stok_kodu}:`, error);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch from MM table:', error);
      }
    }
    
    // Now enhance each product with recipe data and apply fallback when needed
    const enhancedProducts = await Promise.all(
      allProducts.map(async (product) => {
        try {
          // Fetch recipe data
          const recipeData = await fetchProductRecipeData(product.stok_kodu, product.id);
          
          // Extract hasir_tipi from stok_adi if needed
          let actualHasirTipi = product.hasir_tipi || '';
          if (actualHasirTipi === 'MM' || actualHasirTipi === '') {
            const stokAdiMatch = (product.stok_adi || '').match(/^(Q\d+(?:\/\d+)?|R\d+(?:\/\d+)?|TR\d+(?:\/\d+)?)/i);
            if (stokAdiMatch) {
              actualHasirTipi = stokAdiMatch[1].toUpperCase();
            }
          }
          
          // Clean İngilizce İsim
          const cleanIngilizceIsim = (product.ingilizce_isim || '').replace(/^Wire Mesh-\s*/, 'Wire Mesh ');
          
          // Check if we have cubuk sayisi values from recipe data
          let cubukSayisiBoy = recipeData?.boyCount || product.ic_cap_boy_cubuk_ad || 0;
          let cubukSayisiEn = recipeData?.enCount || product.dis_cap_en_cubuk_ad || 0;
          
          console.log(`🔧 FETCH DEBUG - Product ${product.stok_kodu} BEFORE fallback:`, {
            recipeDataBoyCount: recipeData?.boyCount,
            recipeDataEnCount: recipeData?.enCount,
            databaseBoyCubuk: product.ic_cap_boy_cubuk_ad,
            databaseEnCubuk: product.dis_cap_en_cubuk_ad,
            initialCubukSayisiBoy: cubukSayisiBoy,
            initialCubukSayisiEn: cubukSayisiEn
          });
          
          // Apply fallback formula if cubuk sayisi values are missing or invalid
          // OR if recipe data couldn't be fetched (no NCBK/NTEL components found)
          const shouldApplyFallback = !cubukSayisiBoy || !cubukSayisiEn || cubukSayisiBoy <= 0 || cubukSayisiEn <= 0 || !recipeData?.boyCount || !recipeData?.enCount;
          
          if (shouldApplyFallback) {
            console.log(`Applying fallback formula for product ${product.stok_kodu} - missing cubuk sayısı or recipe data`);
            
            const fallbackResult = await calculateFallbackCubukSayisi(
              actualHasirTipi,
              parseFloat(product.ebat_boy || 0),
              parseFloat(product.ebat_en || 0)
            );
            
            cubukSayisiBoy = fallbackResult.cubukSayisiBoy;
            cubukSayisiEn = fallbackResult.cubukSayisiEn;
            console.log(`🔧 FETCH DEBUG - Fallback applied: ${actualHasirTipi} ${product.ebat_boy}x${product.ebat_en} => boy:${cubukSayisiBoy}, en:${cubukSayisiEn}`);
          } else {
            console.log(`🔧 FETCH DEBUG - Using database/recipe values: boy:${cubukSayisiBoy}, en:${cubukSayisiEn}`);
          }
          
          // Calculate duration if missing (you can add duration fallback calculation here)
          let duration = recipeData?.duration || 0;
          if (!duration || duration <= 0) {
            // Apply duration calculation fallback if needed
            // duration = calculateFallbackDuration(...);
          }
          
          // Transform to Excel format
          return {
            // Map database fields to expected Excel generation format
            boyCap: product.cap || 0,
            enCap: product.cap2 || 0,
            hasirTipi: actualHasirTipi,
            uzunlukBoy: product.ebat_boy || 0,
            uzunlukEn: product.ebat_en || 0,
            boyAraligi: product.goz_araligi ? product.goz_araligi.split(/[*x]/)[0] : '15',
            enAraligi: product.goz_araligi ? product.goz_araligi.split(/[*x]/)[1] || product.goz_araligi.split(/[*x]/)[0] : '15',
            gozAraligi: product.goz_araligi ? product.goz_araligi.replace('*', 'x') : '15x15',
            totalKg: product.kg || 0,
            adetKg: product.kg || 0,
            cubukSayisiBoy,
            cubukSayisiEn,
            hasirSayisi: product.hasir_sayisi || 1,
            hasirTuru: product.hasir_turu || 'Standart',
            // Add existing stok kodu for saved products
            existingStokKodu: product.stok_kodu,
            // Store cleaned İngilizce İsim
            existingIngilizceIsim: cleanIngilizceIsim,
            // Store original database ID for reference
            databaseId: product.id,
            // Recipe data
            recipeData
          };
        } catch (error) {
          console.error(`Error processing product ${product.stok_kodu}:`, error);
          // Return basic product data even if enhancement fails
          return {
            hasirTipi: product.hasir_tipi || '',
            uzunlukBoy: product.ebat_boy || 0,
            uzunlukEn: product.ebat_en || 0,
            cubukSayisiBoy: product.ic_cap_boy_cubuk_ad || 0,
            cubukSayisiEn: product.dis_cap_en_cubuk_ad || 0,
            existingStokKodu: product.stok_kodu,
            databaseId: product.id
          };
        }
      })
    );
    
    return enhancedProducts;
  } catch (error) {
    console.error('Error in fetchDatabaseDataWithFallback:', error);
    throw error;
  }
};

// Helper function to fetch recipe data for a product
const fetchProductRecipeData = async (stokKodu, productId) => {
  try {
    // Fetch from recipe table
    const response = await fetchWithAuth(`${API_URLS.celikHasirMmRecete}?mamul_kodu=${encodeURIComponent(stokKodu)}`);
    if (response.ok) {
      const recipeData = await response.json();
      
      // Parse recipe data to extract boy and en cubuk counts
      let boyCount = 0;
      let enCount = 0;
      let duration = 0;
      
      recipeData.forEach(item => {
        if (item.aciklama && item.aciklama.includes('BOY ÇUBUĞU')) {
          boyCount = parseFloat(item.miktar) || 0;
        } else if (item.aciklama && item.aciklama.includes('EN ÇUBUĞU')) {
          enCount = parseFloat(item.miktar) || 0;
        } else if (item.uretim_suresi) {
          duration += parseFloat(item.uretim_suresi) || 0;
        }
      });
      
      return { boyCount, enCount, duration, rawData: recipeData };
    }
  } catch (error) {
    console.warn(`Could not fetch recipe data for ${stokKodu}:`, error);
  }
  
  return null;
};

const CelikHasirNetsis = React.forwardRef(({ optimizedProducts = [], onProductsUpdate }, ref) => {
  // OPTIMIZATION: Add refs for request cancellation and caching
  const fetchControllerRef = useRef(null);
  const cacheRef = useRef(new Map()); // Simple cache for API responses
  const lastFetchTimeRef = useRef(0);
  
  // Add refs for save operation cancellation and rollback
  const saveAbortControllerRef = useRef(null);
  const currentSessionSavedProducts = useRef([]); // Track products saved in current session for rollback
  const isSaveCancelledRef = useRef(false); // Flag to check if save was cancelled
  
  // Check for optimized data from advanced optimization screen
  const [products, setProducts] = useState(optimizedProducts);
  
  useEffect(() => {
    // Check if we're returning from advanced optimization
    const urlParams = new URLSearchParams(window.location.search);
    const optimizedData = urlParams.get('optimizedData');
    
    if (optimizedData) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(optimizedData));
        setProducts(decodedData);
        // Update parent component if callback provided
        if (onProductsUpdate) {
          onProductsUpdate(decodedData);
        }
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error parsing optimized data:', error);
      }
    } else {
      setProducts(optimizedProducts);
    }
  }, [optimizedProducts, onProductsUpdate]);

  // OPTIMIZATION: Cleanup controller on unmount
  useEffect(() => {
    return () => {
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, []);

  // Filter out empty rows - a row is considered empty if hasirTipi, uzunlukBoy, or uzunlukEn is missing
  const validProducts = products.filter(product => 
    product.hasirTipi && 
    product.hasirTipi.trim() !== '' &&
    product.uzunlukBoy && 
    product.uzunlukBoy.toString().trim() !== '' &&
    product.uzunlukEn && 
    product.uzunlukEn.toString().trim() !== ''
  );
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  
  // Ana state değişkenleri
  const [isLoading, setIsLoading] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [activeDbTab, setActiveDbTab] = useState('mm'); // 'mm', 'ncbk', 'ntel'
  const [showOptimizationWarning, setShowOptimizationWarning] = useState(false);
  const [showDatabaseWarning, setShowDatabaseWarning] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteText, setBulkDeleteText] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showDangerZone, setShowDangerZone] = useState(false);
  
  // Bulk delete progress tracking
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0, operation: '', currentItem: '' });
  
  // Database filtering states
  const [dbSearchText, setDbSearchText] = useState('');
  const [dbFilterHasirTipi, setDbFilterHasirTipi] = useState('All');
  const [dbFilterHasirTuru, setDbFilterHasirTuru] = useState('All');
  const [dbSortBy, setDbSortBy] = useState('stok_kodu'); // stok_kodu, stok_adi, cap, length_cm, created_at
  const [dbSortOrder, setDbSortOrder] = useState('asc'); // asc, desc
  
  // Multi-select functionality states
  const [selectedDbItems, setSelectedDbItems] = useState([]);      // Selected product IDs
  
  // Loading states
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isFilteringDb, setIsFilteringDb] = useState(false); // Loading state specifically for filter changes
  const [dbLoadingProgress, setDbLoadingProgress] = useState({ current: 0, total: 3, operation: '' });
  
  // Backend connection states
  const [backendError, setBackendError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [isDeletingBulkDb, setIsDeletingBulkDb] = useState(false); // Bulk delete status
  const [deletingProductId, setDeletingProductId] = useState(null); // Individual product deletion tracking
  
  // Global operation duration calculator
  const calculateOperationDuration = (operationType, product) => {
    switch(operationType) {
      case 'NCBK':
        const ncbkLength = parseFloat(product.length || 500);
        const ncbkDiameter = parseFloat(product.boyCap || product.enCap || 0);
        if (isNaN(ncbkLength) || isNaN(ncbkDiameter) || ncbkDiameter <= 0) {
          console.warn('Invalid NCBK parameters:', { length: product.length, diameter: ncbkDiameter });
          return 0.01; // Return default small duration
        }
        return calculateNCBKDuration(ncbkLength, ncbkDiameter);
        
      case 'NTEL':
        const ntelDiameter = parseFloat(product.boyCap || product.enCap || 0);
        if (isNaN(ntelDiameter) || ntelDiameter <= 0) {
          console.warn('Invalid NTEL diameter:', ntelDiameter);
          return 0.01; // Return default small duration
        }
        return calculateNTELDuration(ntelDiameter);
        
      case 'YOTOCH':
        return calculateYOTOCHDuration(
          parseFloat(product.uzunlukBoy), // 500 (cm) - formula expects cm despite parameter name
          parseFloat(product.uzunlukEn),  // 215 (cm) - formula expects cm despite parameter name
          parseFloat(product.boyCap),
          parseInt(product.cubukSayisiBoy),
          parseInt(product.cubukSayisiEn)
        );
        
      case 'OTOCH':
        return calculateOTOCHDuration(
          parseFloat(product.uzunlukBoy), // 500 (cm) - formula expects cm despite parameter name
          parseFloat(product.uzunlukEn),  // 215 (cm) - formula expects cm despite parameter name
          parseFloat(product.boyCap),
          parseInt(product.cubukSayisiBoy),
          parseInt(product.cubukSayisiEn)
        );
        
      default:
        return 1; // fallback placeholder
    }
  };

  // NCBK duration calculation - New machine speed based formula
  const calculateNCBKDuration = (length_cm, diameter_mm) => {
    const length_m = length_cm / 100; // Convert cm to m
    
    // Determine machine speed based on diameter and length
    let speed_m_per_min;
    
    if (diameter_mm >= 4.20 && diameter_mm <= 4.80) {
      // Category 1: 4.20-4.80mm
      speed_m_per_min = (length_cm >= 180 && length_cm <= 500) ? 200 : 160;
    } else if (diameter_mm >= 5.00 && diameter_mm <= 8.00) {
      // Category 2: 5.00-8.00mm  
      speed_m_per_min = (length_cm >= 180 && length_cm <= 500) ? 200 : 160;
    } else if (diameter_mm >= 8.5 && diameter_mm <= 9.5) {
      // Category 3: 8.5-9.5mm
      speed_m_per_min = (length_cm >= 180 && length_cm <= 500) ? 180 : 150;
    } else if (diameter_mm >= 10.0 && diameter_mm <= 10.6) {
      // Category 4: 10.0-10.6mm
      speed_m_per_min = (length_cm >= 180 && length_cm <= 500) ? 160 : 140;
    } else {
      // For diameters not in the specified ranges, use interpolation or fallback
      if (diameter_mm < 4.20) {
        speed_m_per_min = (length_cm >= 180 && length_cm <= 500) ? 200 : 160;
      } else if (diameter_mm > 10.6) {
        speed_m_per_min = (length_cm >= 180 && length_cm <= 500) ? 140 : 120; // Slower for larger diameters
      } else {
        speed_m_per_min = (length_cm >= 180 && length_cm <= 500) ? 180 : 150; // Default middle range
      }
    }
    
    // Calculate duration in minutes for 1 piece
    // Time per piece = piece_length_m / machine_speed_m_per_min  
    // Example: 2.15m piece at 200m/min speed = 2.15/200 = 0.01075 min per piece
    const duration_minutes = length_m / speed_m_per_min;
    
    // Pure cutting time + 0.05 seconds buffer, return in minutes for proper scale
    const duration_seconds = duration_minutes * 60 + 0.05; // Add 0.05 seconds
    return parseFloat((duration_seconds / 60).toFixed(5)); // Convert to minutes for proper scale
  };

  // NTEL duration calculation with variable speed 8-11m/s based on diameter
  const calculateNTELDuration = (diameter_mm) => {
    // Validate input parameter
    const diameter = parseFloat(diameter_mm);
    if (isNaN(diameter) || diameter <= 0) {
      console.warn('Invalid diameter for NTEL duration calculation:', diameter_mm);
      return 0.01; // Return default small duration instead of 0 or NaN
    }
    
    // Machine speed varies between 8-11 m/s based on diameter and filmasin
    let speed_m_per_s;
    if (diameter <= 5.0) {
      speed_m_per_s = 11; // Smaller diameters = faster speed
    } else if (diameter <= 7.0) {
      speed_m_per_s = 10;
    } else if (diameter <= 9.0) {
      speed_m_per_s = 9;
    } else {
      speed_m_per_s = 8; // Larger diameters = slower speed
    }
    
    // For 1 meter: 1m ÷ speed m/s = time in seconds + 0.05 buffer, return in minutes for proper scale
    const duration_seconds = (1 / speed_m_per_s) + 0.05; // Add 0.05 seconds buffer
    const duration_minutes = duration_seconds / 60; // Convert to minutes for proper scale
    return parseFloat(duration_minutes.toFixed(5));
  };

  // YOTOCH duration calculation (Reliability: 98.7%)
  const calculateYOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
    // Validate inputs
    const boyVal = parseFloat(boy_mm) || 0;
    const enVal = parseFloat(en_mm) || 0;
    const diameterVal = parseFloat(diameter_mm) || 0;
    const cubukBoyVal = parseInt(cubukSayisiBoy) || 0;
    const cubukEnVal = parseInt(cubukSayisiEn) || 0;
    
    if (boyVal <= 0 || enVal <= 0 || diameterVal <= 0) {
      console.warn('Invalid YOTOCH parameters:', { boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn });
      return 0.00001; // Return default small duration
    }
    
    const area = boyVal * enVal;
    const totalRods = cubukBoyVal + cubukEnVal;
    const wireFactor = Math.pow(diameterVal, 1.2);
    const densityFactor = totalRods / (area / 10000); // rods per cm²
    
    const result = 0.08 + 
           (area * 0.0000012) + 
           (wireFactor * 0.015) + 
           (densityFactor * 0.02);
    
    return parseFloat(result.toFixed(5));
  };

  // OTOCH duration calculation (60% of YOTOCH - 40% faster)
  const calculateOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
    // Validate inputs
    const boyVal = parseFloat(boy_mm) || 0;
    const enVal = parseFloat(en_mm) || 0;
    const diameterVal = parseFloat(diameter_mm) || 0;
    const cubukBoyVal = parseInt(cubukSayisiBoy) || 0;
    const cubukEnVal = parseInt(cubukSayisiEn) || 0;
    
    if (boyVal <= 0 || enVal <= 0 || diameterVal <= 0) {
      console.warn('Invalid OTOCH parameters:', { boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn });
      return 0.00001; // Return default small duration
    }
    
    const area = boyVal * enVal;
    const totalRods = cubukBoyVal + cubukEnVal;
    const wireFactor = Math.pow(diameterVal, 1.1);
    const densityFactor = totalRods / (area / 10000);
    
    const result = 0.048 + 
           (area * 0.00000072) + 
           (wireFactor * 0.009) + 
           (densityFactor * 0.012);
    
    return parseFloat(result.toFixed(5));
  };

  // Database verileri
  const [savedProducts, setSavedProducts] = useState({
    mm: [],
    ncbk: [],
    ntel: []
  });
  
  // Store total counts from X-Total-Count header for pagination display
  const [totalCounts, setTotalCounts] = useState({
    mm: 0,
    ncbk: 0,
    ntel: 0
  });
  
  // Excel generation durumu
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [excelProgress, setExcelProgress] = useState({ current: 0, total: 0, operation: '' });
  const [cancelExcelGeneration, setCancelExcelGeneration] = useState(false);
  
  // Database save progress
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [databaseProgress, setDatabaseProgress] = useState({ current: 0, total: 0, operation: '', currentProduct: '' });

  // New popup states for enhanced database checking
  const [showExcelOptionsModal, setShowExcelOptionsModal] = useState(false);
  const [showPreSaveConfirmModal, setShowPreSaveConfirmModal] = useState(false);
  const [preSaveConfirmData, setPreSaveConfirmData] = useState({ newProducts: [], existingProducts: [] });
  
  // Sequence tracking
  const [sequences, setSequences] = useState({});

  // Client-side filtering and sorting since server-side filtering is not working
  const getFilteredAndSortedProducts = useCallback(() => {
    let products = savedProducts[activeDbTab] || [];
    
    // Apply search text filter
    if (dbSearchText && dbSearchText.trim()) {
      const searchTerm = dbSearchText.toLowerCase().trim();
      products = products.filter(product => 
        (product.stok_kodu && product.stok_kodu.toLowerCase().includes(searchTerm)) ||
        (product.stok_adi && product.stok_adi.toLowerCase().includes(searchTerm)) ||
        (product.ingilizce_isim && product.ingilizce_isim.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply hasir tipi filter
    if (dbFilterHasirTipi && dbFilterHasirTipi !== 'All') {
      products = products.filter(product => {
        const stokAdi = product.stok_adi || '';
        switch (dbFilterHasirTipi) {
          case 'Q Tipleri':
            return stokAdi.match(/^Q\d+/i);
          case 'R Tipleri':
            return stokAdi.match(/^R\d+/i);
          case 'TR Tipleri':
            return stokAdi.match(/^TR\d+/i);
          default:
            return product.hasir_tipi === dbFilterHasirTipi;
        }
      });
    }
    
    // Apply hasir turu filter (for MM products)
    if (dbFilterHasirTuru && dbFilterHasirTuru !== 'All' && activeDbTab === 'mm') {
      products = products.filter(product => {
        // Use the hasir_turu field from the database, or calculate it from dimensions if missing
        let hasirTuru = product.hasir_turu;
        
        if (!hasirTuru || hasirTuru === 'MM') {
          // Calculate hasir_turu based on logic from the codebase
          const stokAdi = product.stok_adi || '';
          const uzunlukBoy = parseFloat(product.ebat_boy || 0);
          
          if (stokAdi.match(/^Q\d+/i)) {
            if (uzunlukBoy >= 490 && uzunlukBoy <= 510) {
              hasirTuru = 'Döşeme';
            } else if (uzunlukBoy <= 350) {
              hasirTuru = 'Perde';
            } else {
              hasirTuru = 'Döşeme';
            }
          } else {
            hasirTuru = 'Standart';
          }
        }
        
        return hasirTuru === dbFilterHasirTuru;
      });
    }
    
    // Apply sorting
    products.sort((a, b) => {
      let aValue, bValue;
      
      switch (dbSortBy) {
        case 'stok_kodu':
          aValue = a.stok_kodu || '';
          bValue = b.stok_kodu || '';
          break;
        case 'stok_adi':
          aValue = a.stok_adi || '';
          bValue = b.stok_adi || '';
          break;
        case 'cap':
          aValue = parseFloat(a.cap || 0);
          bValue = parseFloat(b.cap || 0);
          break;
        case 'length_cm':
          aValue = parseFloat(a.ebat_boy || 0);
          bValue = parseFloat(b.ebat_boy || 0);
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        default:
          aValue = a.stok_kodu || '';
          bValue = b.stok_kodu || '';
      }
      
      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return dbSortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aValue - bValue;
        return dbSortOrder === 'asc' ? comparison : -comparison;
      }
    });
    
    return products;
  }, [savedProducts, activeDbTab, dbSearchText, dbFilterHasirTipi, dbFilterHasirTuru, dbSortBy, dbSortOrder]);

  // Database multi-select functions
  const handleToggleDbSelection = (itemId) => {
    setSelectedDbItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAllDb = (items) => {
    const itemIds = items.map(item => item.id);
    setSelectedDbItems(prev => 
      prev.length === itemIds.length 
        ? [] 
        : itemIds
    );
  };

  // Retry helper function for 504/500 errors
  const fetchWithRetry = async (url, options, maxRetries = 3, baseDelay = 2000, progressCallback = null) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchWithAuth(url, options);
        
        // If successful, return response
        if (response.ok) {
          return response;
        }
        
        // If it's a 504 or 500 error, retry with LONGER delays for server recovery
        if ((response.status === 504 || response.status === 500) && attempt < maxRetries) {
          // Much longer delays for 504 errors - give server time to recover
          const delay = response.status === 504 
            ? Math.min(5000 * attempt, 15000)  // 504: 5s, 10s, 15s (max)
            : baseDelay * Math.pow(2, attempt - 1); // 500: normal exponential backoff
          
          console.log(`⏳ Request failed with ${response.status}, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
          
          // Update progress indicator if callback provided
          if (progressCallback) {
            progressCallback(`⏳ Sunucu aşırı yüklü (${response.status}), ${delay/1000} saniye bekleniyor... (${attempt}/${maxRetries})`);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If it's not a retryable error or max retries reached, return the response
        return response;
        
      } catch (error) {
        if (attempt < maxRetries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Network error, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
          
          // Update progress indicator if callback provided
          if (progressCallback) {
            progressCallback(`⏳ Ağ hatası, tekrar denenecek... (${attempt}/${maxRetries})`);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  };

  // Fallback function for recipe deletion if bulk endpoint doesn't exist
  const deleteRecipesFallback = async (recipeApiUrl, encodedStokKodu) => {
    const getRecipeResponse = await fetchWithAuth(`${recipeApiUrl}?mamul_kodu=${encodedStokKodu}`);
    if (getRecipeResponse.ok) {
      const recipes = await getRecipeResponse.json();
      console.log(`🔄 Fallback: Found ${recipes.length} recipes to delete individually`);
      
      // Delete recipes one by one (old method)
      const deletionResults = await Promise.allSettled(
        recipes.filter(recipe => recipe.id).map(async (recipe) => {
          try {
            await fetchWithRetry(`${recipeApiUrl}/${recipe.id}`, { method: 'DELETE' }, 1, 1000);
            return { success: true, id: recipe.id };
          } catch (error) {
            return { success: false, id: recipe.id, error: error.message };
          }
        })
      );
      
      const successful = deletionResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      console.log(`🔄 Fallback: Deleted ${successful}/${recipes.length} recipes individually`);
    }
  };

  // Bulk delete function for selected items - OPTIMIZED VERSION
  const handleBulkDeleteSelected = async () => {
    if (selectedDbItems.length === 0) {
      toast.error('Silinecek ürün seçiniz');
      return;
    }

    if (!window.confirm(`${selectedDbItems.length} ürünü silmek istediğinizden emin misiniz?`)) {
      return;
    }

    setIsDeletingBulkDb(true);
    let deletedCount = 0;
    const failedDeletions = [];

    try {
      // Get the selected products with their stok_kodu
      const selectedProducts = selectedDbItems.map(itemId => {
        const product = savedProducts[activeDbTab].find(p => p.id === itemId);
        return { id: itemId, stok_kodu: product?.stok_kodu, product };
      }).filter(item => item.stok_kodu); // Only process items with valid stok_kodu

      if (selectedProducts.length === 0) {
        toast.error('Seçilen ürünlerde stok kodu bulunamadı');
        return;
      }

      console.log(`🗑️ Starting bulk deletion of ${selectedProducts.length} products for ${activeDbTab}`);

      // Process deletions sequentially to avoid overwhelming the backend
      for (const { id, stok_kodu, product } of selectedProducts) {
        try {
          console.log(`🗑️ Deleting product: ${stok_kodu}`);

          // Step 1: Delete recipes using bulk deletion by mamul_kodu
          let recipeApiUrl = '';
          if (activeDbTab === 'mm') recipeApiUrl = API_URLS.celikHasirMmRecete;
          else if (activeDbTab === 'ncbk') recipeApiUrl = API_URLS.celikHasirNcbkRecete;
          else if (activeDbTab === 'ntel') recipeApiUrl = API_URLS.celikHasirNtelRecete;
          
          if (recipeApiUrl) {
            try {
              const encodedStokKodu = encodeURIComponent(stok_kodu);
              const deleteRecipesResponse = await fetchWithRetry(
                `${recipeApiUrl}/bulk-delete-by-mamul?mamul_kodu=${encodedStokKodu}`, 
                { 
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                  }
                }, 
                2, 1500
              );
              
              if (deleteRecipesResponse.ok) {
                const result = await deleteRecipesResponse.json();
                console.log(`✅ Deleted ${result.deletedCount || 'N/A'} recipes for ${stok_kodu}`);
              } else if (deleteRecipesResponse.status === 404) {
                // Fallback: Use old method if bulk endpoint doesn't exist
                console.log(`ℹ️ Bulk endpoint not found, using fallback for recipes: ${stok_kodu}`);
                await deleteRecipesFallback(recipeApiUrl, encodedStokKodu);
              } else {
                console.warn(`⚠️ Recipe deletion failed for ${stok_kodu}: ${deleteRecipesResponse.status}`);
              }
            } catch (recipeError) {
              console.warn(`⚠️ Recipe deletion error for ${stok_kodu}:`, recipeError.message);
              // Try fallback method
              try {
                const encodedStokKodu = encodeURIComponent(stok_kodu);
                await deleteRecipesFallback(recipeApiUrl, encodedStokKodu);
              } catch (fallbackError) {
                console.warn(`⚠️ Recipe deletion fallback also failed for ${stok_kodu}:`, fallbackError.message);
              }
            }
          }

          // Step 2: Delete the main product record by stok_kodu
          const tabEndpoints = {
            mm: API_URLS.celikHasirMm,
            ncbk: API_URLS.celikHasirNcbk,
            ntel: API_URLS.celikHasirNtel
          };

          const encodedStokKodu = encodeURIComponent(stok_kodu);
          const deleteProductResponse = await fetchWithRetry(
            `${tabEndpoints[activeDbTab]}/bulk-delete-by-stok?stok_kodu=${encodedStokKodu}`, 
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }, 
            3, 2000
          );

          if (deleteProductResponse.ok) {
            const result = await deleteProductResponse.json();
            console.log(`✅ Successfully deleted product ${stok_kodu}`);
            deletedCount++;
            
            // Update UI state immediately
            setSavedProducts(prev => ({
              ...prev,
              [activeDbTab]: prev[activeDbTab].filter(p => p.id !== id)
            }));
          } else if (deleteProductResponse.status === 404) {
            // Fallback: Use old method if bulk endpoint doesn't exist
            console.log(`ℹ️ Bulk product endpoint not found, using fallback for: ${stok_kodu}`);
            const fallbackResponse = await fetchWithRetry(`${tabEndpoints[activeDbTab]}/${id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }, 3, 2000);
            
            if (fallbackResponse.ok) {
              console.log(`✅ Fallback: Successfully deleted product ${stok_kodu}`);
              deletedCount++;
              setSavedProducts(prev => ({
                ...prev,
                [activeDbTab]: prev[activeDbTab].filter(p => p.id !== id)
              }));
            } else {
              throw new Error(`Fallback product deletion failed: ${fallbackResponse.status}`);
            }
          } else {
            throw new Error(`Product deletion failed: ${deleteProductResponse.status} ${deleteProductResponse.statusText}`);
          }

          // Small delay to avoid overwhelming backend
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          console.error(`❌ Failed to delete ${stok_kodu}:`, error);
          failedDeletions.push({ stok_kodu, error: error.message });
        }
      }

      // Show results to user
      if (deletedCount > 0) {
        toast.success(`✅ Başarılı: ${deletedCount} ürün silindi`, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false
        });
        setSelectedDbItems([]);
        
        // Update sequence table if we deleted CH products
        if (activeDbTab === 'mm') {
          try {
            await updateSequenceAfterDeletion(activeDbTab);
          } catch (seqError) {
            console.warn('Sequence update failed:', seqError);
            toast.warning('Ürünler silindi ancak sıra numarası güncellenemedi');
          }
        }
        
        // Force refresh data
        cacheRef.current.clear();
        await fetchSavedProducts(false, true);
      }

      if (failedDeletions.length > 0) {
        failedDeletions.forEach(failure => {
          toast.error(`❌ ${failure.stok_kodu} silinemedi: ${failure.error}`, { autoClose: 8000 });
        });
      }

      if (deletedCount === 0) {
        toast.error('❌ Hiçbir ürün silinemedi', {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false
        });
      }

    } catch (error) {
      console.error('❌ Bulk delete error:', error);
      if (error.message.includes('504') || error.message.includes('timeout')) {
        toast.error('⏱️ İşlem zaman aşımına uğradı. Lütfen daha az ürün seçerek tekrar deneyin.', {
          position: "top-right",
          autoClose: 6000,
          hideProgressBar: false
        });
      } else {
        toast.error(`❌ Toplu silme hatası: ${error.message}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false
        });
      }
    } finally {
      setIsDeletingBulkDb(false);
    }
  };

  // Bulk Excel export for selected items
  const handleBulkExportSelected = async () => {
    if (selectedDbItems.length === 0) {
      toast.error('Dışa aktarılacak ürün seçiniz');
      return;
    }

    try {
      console.log(`Exporting ${selectedDbItems.length} selected products from ${activeDbTab} table`);
      
      // Get selected products from already loaded data
      const selectedProducts = savedProducts[activeDbTab].filter(product => 
        selectedDbItems.includes(product.id)
      );

      if (selectedProducts.length === 0) {
        toast.error('Seçili ürünler bulunamadı');
        return;
      }

      console.log(`Found ${selectedProducts.length} selected products in loaded data`);
      
      // Transform database products for Excel generation (same format as database response)
      const transformedProducts = selectedProducts.map(product => {
        // Extract hasir_tipi from stok_adi when hasir_tipi field is incorrect
        let actualHasirTipi = product.hasir_tipi || '';
        if (actualHasirTipi === 'MM' || actualHasirTipi === '') {
          const stokAdiMatch = (product.stok_adi || '').match(/^(Q\d+(?:\/\d+)?|R\d+(?:\/\d+)?|TR\d+(?:\/\d+)?)/i);
          if (stokAdiMatch) {
            actualHasirTipi = stokAdiMatch[1].toUpperCase();
          }
        }
        
        const cleanIngilizceIsim = (product.ingilizce_isim || '').replace(/^Wire Mesh-\s*/, 'Wire Mesh ');
        
        return {
          ...product,
          hasirTipi: actualHasirTipi,
          uzunlukBoy: product.ebat_boy || product.uzunluk_boy || 0,
          uzunlukEn: product.ebat_en || product.uzunluk_en || 0,
          boyCap: product.cap || product.boy_cap || 0,
          enCap: product.cap2 || product.en_cap || 0,
          totalKg: product.kg || product.total_kg || 0,
          adetKg: product.kg || product.adet_kg || 0,
          boyAraligi: calculateGozAraligi(actualHasirTipi, 'boy'),
          enAraligi: calculateGozAraligi(actualHasirTipi, 'en'),
          gozAraligi: `${calculateGozAraligi(actualHasirTipi, 'boy')}x${calculateGozAraligi(actualHasirTipi, 'en')}`,
          existingStokKodu: product.stok_kodu,
          existingIngilizceIsim: cleanIngilizceIsim,
          isOptimized: true,
          source: 'database',
          skipDatabaseRefresh: true  // Flag to prevent generateExcelFiles from re-fetching
        };
      });

      await generateExcelFiles(transformedProducts, true);
      toast.success(`${transformedProducts.length} ürün için Excel dosyaları oluşturuldu!`);
      
    } catch (error) {
      console.error('Selected Excel export failed:', error);
      toast.error('Excel dosyaları oluşturulurken hata oluştu');
    }
  };

  // Component yüklendiğinde verileri getir
  useEffect(() => {
    const initializeData = async () => {
      try {
        fetchSavedProducts(); // Load all data automatically on component mount
        await fetchSequences(); // Wait for sequences to load
        await ensureBackupSequenceAndSync(); // Then create backup sequence and sync with database
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };
    
    initializeData();
  }, []);
  
  // Refetch data when filters change (server-side filtering)
  useEffect(() => {
    // Only fetch if database modal is open to avoid unnecessary requests
    if (showDatabaseModal) {
      setIsFilteringDb(true); // Show filter loading indicator immediately
      const debounceTimer = setTimeout(async () => {
        try {
          await fetchSavedProducts();
          // Add 5 seconds delay to show "Veriler getiriliyor..." message longer
          await new Promise(resolve => setTimeout(resolve, 5000));
        } finally {
          setIsFilteringDb(false); // Hide filter loading indicator when done
        }
      }, 300); // Keep the 300ms debounce for input responsiveness
      
      return () => {
        clearTimeout(debounceTimer);
        setIsFilteringDb(false); // Clear loading state if component unmounts or effect cleanup
      };
    }
  }, [dbSearchText, dbFilterHasirTipi, dbFilterHasirTuru, dbSortBy, dbSortOrder]);

  // Force update when savedProducts or validProducts change to ensure counts are accurate
  useEffect(() => {
    // Only log and update counts if there are actually products in the form
    if (validProducts.length > 0) {
      console.log('Count update triggered - optimized products:', validProducts.length, 
                  'unoptimized:', validProducts.filter(p => !isProductOptimized(p)).length);
    }
    // Note: Removed getProductsToSave from dependencies to avoid potential infinite loops
  }, [savedProducts, validProducts]);

  // OPTIMIZED: Veritabanından kayıtlı ürünleri getir with caching and request cancellation
  const fetchSavedProducts = async (isRetry = false, resetData = false) => {
    // Cancel previous request if exists
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    
    fetchControllerRef.current = new AbortController();
    const signal = fetchControllerRef.current.signal;
    
    try {
      if (!isRetry) {
        setIsLoadingDb(true);
        setSelectedDbItems([]); // Clear selection when loading new data
        setBackendError(null);
        setDbLoadingProgress({ current: 0, total: 3, operation: 'Başlatılıyor...' });
      }
      
      console.log('🚀 OPTIMIZED: Fetching all saved products from database...', { isRetry, resetData });
      
      // Add timestamp for debugging
      const fetchStartTime = Date.now();
      
      // Build query parameters for filters
      const buildQueryParams = () => {
        const params = new URLSearchParams();
        
        // Add search filter
        if (dbSearchText.trim()) {
          params.append('search', dbSearchText.trim());
        }
        
        // Add hasır tipi filter
        if (dbFilterHasirTipi && dbFilterHasirTipi !== 'All') {
          params.append('hasir_tipi_filter', dbFilterHasirTipi);
        }
        
        // Add hasır türü filter
        if (dbFilterHasirTuru && dbFilterHasirTuru !== 'All') {
          params.append('hasir_turu_filter', dbFilterHasirTuru);
        }
        
        // Add sorting
        if (dbSortBy) {
          params.append('sort_by', dbSortBy);
          params.append('sort_order', dbSortOrder);
        }
        
        // Add pagination params (fetch all for now)
        params.append('limit', '10000'); // Large limit to get all filtered results
        params.append('page', '1');
        
        return params.toString();
      };
      
      const queryString = buildQueryParams();
      
      // Add timestamp to force fresh data when resetData is true
      const timestampParam = resetData ? `&_t=${Date.now()}` : '';
      const urlSuffix = queryString ? `?${queryString}${timestampParam}` : (resetData ? `?_t=${Date.now()}` : '');
      
      // Load data with progress tracking, request cancellation, and timeout
      setDbLoadingProgress({ current: 1, total: 3, operation: 'CH ürünleri getiriliyor...' });
      
      // Use parallel requests with timeout and signal
      const timeoutPromise = (promise, timeout = 60000) => 
        Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      
      const [mmResult, ncbkResult, ntelResult] = await Promise.allSettled([
        timeoutPromise(fetchWithAuth(`${API_URLS.celikHasirMm}${urlSuffix}`, { signal })),
        timeoutPromise(fetchWithAuth(`${API_URLS.celikHasirNcbk}${urlSuffix}`, { signal })),
        timeoutPromise(fetchWithAuth(`${API_URLS.celikHasirNtel}${urlSuffix}`, { signal }))
      ]);
      
      // Check if request was cancelled
      if (signal.aborted) {
        console.log('Request was cancelled');
        return;
      }
      
      setDbLoadingProgress({ current: 3, total: 3, operation: 'Veriler işleniyor...' });

      // Handle results with fallbacks
      const mmResponse = mmResult.status === 'fulfilled' ? mmResult.value : null;
      const ncbkResponse = ncbkResult.status === 'fulfilled' ? ncbkResult.value : null;
      const ntelResponse = ntelResult.status === 'fulfilled' ? ntelResult.value : null;

      // Log API failures but continue with available data
      const failedAPIs = [];
      if (mmResult.status === 'rejected') {
        console.warn('MM API failed:', mmResult.reason);
        failedAPIs.push('MM');
      }
      if (ncbkResult.status === 'rejected') {
        console.warn('NCBK API failed:', ncbkResult.reason);
        failedAPIs.push('NCBK');
      }
      if (ntelResult.status === 'rejected') {
        console.warn('NTEL API failed:', ntelResult.reason);
        failedAPIs.push('NTEL');
      }

      // Only throw error if all APIs fail or MM (critical) fails
      if (mmResult.status === 'rejected') {
        throw new Error(`Critical MM API failed: ${mmResult.reason}`);
      }

      // Extract data and total counts from responses
      const mmData = mmResponse?.ok ? await mmResponse.json() : [];
      const mmTotal = mmResponse?.ok ? parseInt(mmResponse.headers.get('X-Total-Count') || mmData.length) : (savedProducts.mm?.length || 0);
      
      const ncbkData = ncbkResponse?.ok ? await ncbkResponse.json() : savedProducts.ncbk || [];
      const ncbkTotal = ncbkResponse?.ok ? parseInt(ncbkResponse.headers.get('X-Total-Count') || ncbkData.length) : (savedProducts.ncbk?.length || 0);
      
      const ntelData = ntelResponse?.ok ? await ntelResponse.json() : savedProducts.ntel || [];
      const ntelTotal = ntelResponse?.ok ? parseInt(ntelResponse.headers.get('X-Total-Count') || ntelData.length) : (savedProducts.ntel?.length || 0);

      const allData = {
        mm: mmData,
        ncbk: ncbkData,
        ntel: ntelData
      };
      
      // Store total counts for pagination display
      setTotalCounts({
        mm: mmTotal,
        ncbk: ncbkTotal,
        ntel: ntelTotal
      });

      // Warn user about partial failures
      if (failedAPIs.length > 0) {
        console.warn(`⚠️ Partial API failure: ${failedAPIs.join(', ')} endpoints failed`);
        toast.warning(`Bazı veriler güncellenemedi: ${failedAPIs.join(', ')}`);
      }
      
      // Store all data - no pagination
      // Force state update by creating new object reference if resetData is true
      if (resetData) {
        console.log('🔄 Forcing complete data refresh due to resetData=true');
        setSavedProducts({
          mm: [...mmData],
          ncbk: [...ncbkData], 
          ntel: [...ntelData]
        });
      } else {
        setSavedProducts(allData);
      }
      
      // Reset error states on successful fetch
      setBackendError(null);
      setRetryCount(0);
      
      // Display current page vs total for pagination
      const mmDisplay = mmTotal === mmData.length ? `MM(${mmTotal})` : `MM(${mmData.length}/${mmTotal})`;
      const ncbkDisplay = ncbkTotal === ncbkData.length ? `NCBK(${ncbkTotal})` : `NCBK(${ncbkData.length}/${ncbkTotal})`;
      const ntelDisplay = ntelTotal === ntelData.length ? `NTEL(${ntelTotal})` : `NTEL(${ntelData.length}/${ntelTotal})`;
      
      const fetchEndTime = Date.now();
      console.log(`✅ Başarıyla yüklendi - Toplam: ${mmDisplay}, ${ncbkDisplay}, ${ntelDisplay} ürün (${fetchEndTime - fetchStartTime}ms)`);
      
      // Log state update for debugging
      if (resetData) {
        console.log('🔄 State forced to update with resetData=true');
      }
      
    } catch (error) {
      console.error('❌ Veritabanı bağlantı hatası:', error);
      
      const isNetworkError = error.message.includes('fetch') || error.message.includes('NetworkError') || 
                            error.message.includes('Backend responses failed');
      
      if (isNetworkError && retryCount < maxRetries && !isRetry) {
        // Auto retry logic
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);
        console.log(`🔄 Otomatik yeniden deneme ${nextRetryCount}/${maxRetries}...`);
        
        setTimeout(() => {
          fetchSavedProducts(true);
        }, 2000 * nextRetryCount); // Progressive delay: 2s, 4s, 6s
        
        setBackendError({
          type: 'retrying',
          message: `Bağlantı hatası - Yeniden denenyor (${nextRetryCount}/${maxRetries})...`,
          canRetry: false
        });
      } else {
        // Final error state
        setBackendError({
          type: 'connection',
          message: isNetworkError ? 
            'Vercel Backend sunucusu şu anda erişilebilir durumda değil. Lütfen birkaç dakika sonra tekrar deneyin.' :
            'Beklenmeyen bir hata oluştu.',
          canRetry: true
        });
        
        if (resetData) {
          setSavedProducts({ mm: [], ncbk: [], ntel: [] });
        }
      }
      
    } finally {
      if (!backendError || backendError.type !== 'retrying') {
        setIsLoadingDb(false);
        setDbLoadingProgress({ current: 0, total: 3, operation: '' });
      }
    }
  };

  // Sequence verilerini getir
  const fetchSequences = async () => {
    try {
      const response = await fetchWithAuth(API_URLS.celikHasirSequence);
      if (response?.ok) {
        const data = await response.json();
        const sequenceMap = {};
        data.forEach(seq => {
          const key = `${seq.product_type}_${seq.kod_2}_${seq.cap_code}`;
          sequenceMap[key] = seq.last_sequence;
        });
        setSequences(sequenceMap);
      }
    } catch (error) {
      console.error('Sequence verileri getirilemedi:', error);
    }
  };

  // Create backup sequence row and sync sequences with database
  const ensureBackupSequenceAndSync = async () => {
    try {
      console.log('*** Starting backup sequence creation and sync process');
      
      // Get fresh sequences data directly from API instead of relying on state
      let currentSequences = {};
      try {
        const response = await fetchWithAuth(API_URLS.celikHasirSequence);
        if (response?.ok) {
          const data = await response.json();
          data.forEach(seq => {
            const key = `${seq.product_type}_${seq.kod_2}_${seq.cap_code}`;
            currentSequences[key] = seq.last_sequence;
          });
          console.log('*** Fresh sequences loaded:', Object.keys(currentSequences));
        }
      } catch (error) {
        console.error('*** Error fetching fresh sequences:', error);
      }
      
      // Check if backup sequence exists
      const ozlSequenceKey = Object.keys(currentSequences).find(key => key.startsWith('CH_OZL_'));
      const ozlBackupKey = Object.keys(currentSequences).find(key => key.startsWith('CH_OZL_BACKUP'));
      
      let actualSequence = 2443; // Default fallback
      let backupSequence = 2443; // Default fallback
      
      if (ozlSequenceKey && currentSequences[ozlSequenceKey]) {
        actualSequence = currentSequences[ozlSequenceKey];
        console.log('*** Found actual sequence:', ozlSequenceKey, 'value:', actualSequence);
      }
      
      if (ozlBackupKey && currentSequences[ozlBackupKey]) {
        backupSequence = currentSequences[ozlBackupKey];
        console.log('*** Found backup sequence:', ozlBackupKey, 'value:', backupSequence);
      } else {
        // Create backup sequence row if it doesn't exist
        console.log('*** Creating backup sequence row for CHOZL');
        try {
          const backupSequenceData = {
            product_type: 'CH',
            kod_2: 'OZL_BACKUP',
            cap_code: '',
            last_sequence: actualSequence // Start with same value as actual
          };
          
          const backupResponse = await fetchWithAuth(API_URLS.celikHasirSequence, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backupSequenceData)
          });
          
          if (backupResponse?.ok) {
            console.log('*** Backup sequence row created successfully');
            backupSequence = actualSequence;
          }
        } catch (error) {
          console.error('*** Error creating backup sequence row:', error);
        }
      }
      
      // Now check the actual database for highest CHOZL sequence
      console.log('*** Checking database for actual highest CHOZL sequence');
      try {
        const dbCheckResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?search=CHOZL&sort_by=stok_kodu&sort_order=desc&limit=1`);
        if (dbCheckResponse?.ok) {
          const dbData = await dbCheckResponse.json();
          if (dbData.data && dbData.data.length > 0) {
            const highestProduct = dbData.data[0];
            const match = highestProduct.stok_kodu.match(/CHOZL(\d+)/);
            if (match) {
              const dbHighestSequence = parseInt(match[1]);
              console.log('*** Database highest CHOZL sequence:', dbHighestSequence);
              
              const currentMaxSequence = Math.max(actualSequence, backupSequence);
              console.log('*** Current sequence table max:', currentMaxSequence, 'vs DB highest:', dbHighestSequence);
              
              // If database has higher sequence, update both actual and backup
              if (dbHighestSequence > currentMaxSequence) {
                console.log('*** Database sequence is higher! Updating sequence table to:', dbHighestSequence);
                
                // Update actual sequence
                const actualUpdateData = {
                  product_type: 'CH',
                  kod_2: 'OZL',
                  cap_code: '',
                  last_sequence: dbHighestSequence
                };
                
                // NOTE: Using POST for now as backend may handle UPSERT logic
                // This should ideally be PUT/PATCH to avoid creating duplicates
                await fetchWithAuth(API_URLS.celikHasirSequence, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(actualUpdateData)
                });
                
                // Update backup sequence
                const backupUpdateData = {
                  product_type: 'CH',
                  kod_2: 'OZL_BACKUP',
                  cap_code: '',
                  last_sequence: dbHighestSequence
                };
                
                // NOTE: Using POST for now as backend may handle UPSERT logic
                // This should ideally be PUT/PATCH to avoid creating duplicates
                await fetchWithAuth(API_URLS.celikHasirSequence, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(backupUpdateData)
                });
                
                console.log('*** Both sequences updated to match database');
                
                // Refresh sequences state
                await fetchSequences();
              } else {
                console.log('*** Sequence table is up to date');
              }
            }
          }
        }
      } catch (error) {
        console.error('*** Error checking database for sequence sync:', error);
      }
      
      console.log('*** Backup sequence creation and sync completed');
      
      // Final refresh of sequences state to ensure it's up to date
      await fetchSequences();
    } catch (error) {
      console.error('*** Error in backup sequence management:', error);
    }
  };

  // Ürünün optimize edilip edilmediğini kontrol et
  const isProductOptimized = (product) => {
    // Check if optimization has been run by checking if the product has the isOptimized flag
    // This flag should be set by the iyilestir functions
    // For Excel generation from database, also allow products with existingStokKodu
    return product.isOptimized === true || product.existingStokKodu;
  };

  // Optimize edilmemiş ürünleri kontrol et
  const hasUnoptimizedProducts = () => {
    return validProducts.some(product => !isProductOptimized(product));
  };

  // Check for existing products and determine next sequence number - Moved up to avoid hoisting issues
  // Track batch counter for sequential Stok Kodu generation  
  let batchSequenceCounter = null;
  let batchSequenceInitialized = false;
  let productStokKoduCache = new Map(); // Cache to prevent multiple STOK KODU generation for same product
  
  // Reset batch counter for new batch
  const resetBatchSequenceCounter = () => {
    batchSequenceCounter = null;
    batchSequenceInitialized = false;
    productStokKoduCache.clear(); // Clear cache when resetting batch
  };

  // Initialize batch sequence with database sync - MUST be called before any generateStokKodu calls
  const initializeBatchSequence = async (forceRefresh = false) => {
    if (batchSequenceInitialized && !forceRefresh) {
      return batchSequenceCounter; // Already initialized
    }
    
    // Force refresh the saved products data to get the latest state
    if (forceRefresh || !savedProducts?.mm?.length) {
      console.log('*** Force refreshing saved products data before sequence initialization');
      await fetchSavedProducts(false, true); // Force refresh with resetData=true
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // CRITICAL: Always fetch fresh sequences with cache-busting for accurate sequence detection
    console.log('*** Fetching FRESH sequences from database with cache-busting');
    try {
      const freshSequencesResponse = await fetchWithAuth(`${API_URLS.celikHasirSequence}?_cache_bust=${Date.now()}`);
      if (freshSequencesResponse?.ok) {
        const freshSequenceData = await freshSequencesResponse.json();
        const freshSequenceMap = {};
        freshSequenceData.forEach(seq => {
          const key = `${seq.product_type}_${seq.kod_2}_${seq.cap_code}`;
          freshSequenceMap[key] = seq.last_sequence || 0;
        });
        // Update sequences state with fresh data
        setSequences(freshSequenceMap);
        console.log('*** Fresh sequences loaded, updating local sequences state');
      }
    } catch (error) {
      console.warn('*** Failed to fetch fresh sequences, using existing:', error);
    }

    let maxSequence = 2443; // Default fallback
    
    // Use the higher of actual or backup sequence
    const ozlSequenceKey = Object.keys(sequences).find(key => key.startsWith('CH_OZL_'));
    const ozlBackupKey = Object.keys(sequences).find(key => key.startsWith('CH_OZL_BACKUP'));
    
    let actualSequence = 2443;
    let backupSequence = 2443;
    
    if (ozlSequenceKey && sequences[ozlSequenceKey]) {
      actualSequence = sequences[ozlSequenceKey];
      console.log('*** Actual sequence from table:', ozlSequenceKey, 'value:', actualSequence);
    }
    
    if (ozlBackupKey && sequences[ozlBackupKey]) {
      backupSequence = sequences[ozlBackupKey];
      console.log('*** Backup sequence from table:', ozlBackupKey, 'value:', backupSequence);
    }
    
    let preliminaryMaxSequence = Math.max(actualSequence, backupSequence);
    console.log('*** Preliminary max sequence from table:', preliminaryMaxSequence, 'from actual:', actualSequence, 'backup:', backupSequence);
    
    // Use the sequence table value directly - backend maintains this correctly
    maxSequence = preliminaryMaxSequence;
    console.log('*** Using sequence table value:', maxSequence);
    
    batchSequenceCounter = maxSequence;
    batchSequenceInitialized = true;
    
    console.log('*** BATCH STOK KODU INITIALIZED FOR NEW PRODUCTS ***');
    console.log('Max sequence determined:', maxSequence);
    console.log('Batch counter initialized at:', batchSequenceCounter);
    
    return batchSequenceCounter;
  };

  function checkForExistingProducts(product, productType, batchIndex = 0) {
    try {
      if (productType === 'CH') {
        const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                           (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25');
        const diameter = parseFloat(product.boyCap || product.enCap || 0);
        const diameterCode = String(Math.round(diameter * 100)).padStart(4, '0');
        
        if (isStandard) {
          // For standard products: CH.STD.0450.XX
          const baseCode = `CH.STD.${diameterCode}`;
          const existingProducts = savedProducts.mm.filter(p => 
            p.stok_kodu && p.stok_kodu.startsWith(baseCode)
          );
          
          let maxSequence = -1;
          existingProducts.forEach(p => {
            const parts = p.stok_kodu.split('.');
            if (parts.length >= 4) {
              const sequenceNum = parseInt(parts[3]);
              if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
                maxSequence = sequenceNum;
              }
            }
          });
          
          const nextSequence = maxSequence + 1;
          return `CH.STD.${diameterCode}.${String(nextSequence).padStart(2, '0')}`;
        } else {
          // For özel products: CHOZL0001, CHOZL0002, etc.
          
          // This function should only CHECK for existing products, not generate new codes
          // New products should use generateNewStokKodu function instead
          console.warn('WARNING: checkForExistingProducts called for code generation - use generateNewStokKodu instead');
          return 'CH.STD.0700.00'; // Default fallback
        }
      } else if (productType === 'NCBK') {
        const diameter = parseFloat(product.cap || 0);
        const diameterCode = String(Math.round(diameter * 100)).padStart(4, '0');
        const length = product.length || 215;
        return `YM.NCBK.${diameterCode}.${length}`;
      } else if (productType === 'NTEL') {
        const diameter = parseFloat(product.cap || 0);
        const diameterCode = String(Math.round(diameter * 100)).padStart(4, '0');
        return `YM.NTEL.${diameterCode}`;
      }
    } catch (error) {
      console.error('Error checking existing products:', error);
    }
    
    return '';
  }

  // Generate new stok kodu for genuinely new products only
  function generateNewStokKodu(product, productType, batchIndex = 0) {
    if (productType === 'CH') {
      // Create unique cache key for this product
      const productKey = `${product.hasirTipi}-${product.boyCap}-${product.enCap}-${product.uzunlukBoy}-${product.uzunlukEn}-${formatGozAraligi(product)}`;
      
      // Return cached STOK KODU if already generated for this product
      if (productStokKoduCache.has(productKey)) {
        const cachedCode = productStokKoduCache.get(productKey);
        console.log('*** USING CACHED STOK KODU ***');
        console.log('Product:', { hasirTipi: product.hasirTipi, batchIndex });
        console.log('Cached STOK KODU:', cachedCode);
        return cachedCode;
      }
      
      // Batch should already be initialized by initializeBatchSequence()
      if (!batchSequenceInitialized) {
        console.error('*** ERROR: Batch sequence not initialized! Call initializeBatchSequence() first.');
        // Fallback - use basic sequence table lookup without database check
        const ozlSequenceKey = Object.keys(sequences).find(key => key.startsWith('CH_OZL_'));
        const ozlBackupKey = Object.keys(sequences).find(key => key.startsWith('CH_OZL_BACKUP'));
        
        let actualSequence = 2443;
        let backupSequence = 2443;
        
        if (ozlSequenceKey && sequences[ozlSequenceKey]) {
          actualSequence = sequences[ozlSequenceKey];
        }
        
        if (ozlBackupKey && sequences[ozlBackupKey]) {
          backupSequence = sequences[ozlBackupKey];
        }
        
        batchSequenceCounter = Math.max(actualSequence, backupSequence);
        batchSequenceInitialized = true;
        console.log('*** FALLBACK: Batch initialized with sequence table only:', batchSequenceCounter);
      }
      
      // Sequence table contains the HIGHEST EXISTING sequence, so next product should be +1
      batchSequenceCounter++; // Increment to get next available sequence
      const generatedCode = `CHOZL${String(batchSequenceCounter).padStart(4, '0')}`;
      
      // Cache the generated code for this product
      productStokKoduCache.set(productKey, generatedCode);
      
      console.log('*** NEW STOK KODU GENERATION ***');
      console.log('Product:', { hasirTipi: product.hasirTipi, batchIndex });
      console.log('Last existing sequence from table:', batchSequenceCounter - 1, 'Next sequence for NEW product:', batchSequenceCounter, 'Generated:', generatedCode);
      console.log('Cached for future use with key:', productKey);
      
      return generatedCode;
    }
    
    return 'CH.STD.0700.00'; // Default fallback
  }

  // Stok kodu oluştur - Enhanced with database-aware incrementality  
  function generateStokKodu(product, productType, batchIndex = 0) {
    if (productType === 'CH') {
      const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                         (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25');
      const diameter = parseFloat(product.boyCap || product.enCap || 0);
      const diameterCode = String(Math.round(diameter * 100)).padStart(4, '0');
      
      if (isStandard) {
        // For standard products: CH.STD.0450.XX
        const baseCode = `CH.STD.${diameterCode}`;
        const existingProducts = savedProducts.mm.filter(p => 
          p.stok_kodu && p.stok_kodu.startsWith(baseCode)
        );
        
        let maxSequence = -1;
        existingProducts.forEach(p => {
          const parts = p.stok_kodu.split('.');
          if (parts.length >= 4) {
            const sequenceNum = parseInt(parts[3]);
            if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
              maxSequence = sequenceNum;
            }
          }
        });
        
        const nextSequence = maxSequence + 1;
        return `CH.STD.${diameterCode}.${String(nextSequence).padStart(2, '0')}`;
      } else {
        // For özel products: use the new generation function
        return generateNewStokKodu(product, productType, batchIndex);
      }
    }
    return 'CH.STD.0700.00'; // Default fallback
  }

  // Format decimal for display - Turkish format with comma or point
  const formatDecimalForDisplay = (value, useComma = true) => {
    // Handle undefined, null, empty string, and NaN cases
    if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
      return '0';
    }
    
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    // Remove trailing zeros and format
    let formatted = num.toString();
    if (formatted.includes('.')) {
      formatted = formatted.replace(/\.?0+$/, '');
    }
    
    // Replace dot with comma for Turkish format if requested
    if (useComma && formatted.includes('.')) {
      formatted = formatted.replace('.', ',');
    }
    
    return formatted;
  };

  // Stok adı oluştur - Fixed formatting
  const generateStokAdi = (product, productType) => {
    if (productType === 'CH') {
      // Try to get göz aralığı data from multiple sources
      let boyAraligi = product.boyAraligi || product.boyAralik;
      let enAraligi = product.enAraligi || product.enAralik;
      
      // If not available on product, try to get from mesh configs based on hasirTipi
      if (!boyAraligi || !enAraligi) {
        // This is a simplified approach - we should ideally access meshConfigs here
        // For now, let's try some common patterns based on the hasir tipi
        const hasirTipi = product.hasirTipi;
        
        // Common patterns for different mesh types (this is a fallback)
        if (hasirTipi && hasirTipi.includes('Q')) {
          boyAraligi = boyAraligi || '15';
          enAraligi = enAraligi || '15';
        } else if (hasirTipi && hasirTipi.includes('TR')) {
          boyAraligi = boyAraligi || '30';
          enAraligi = enAraligi || '15';
        } else if (hasirTipi && hasirTipi.includes('R')) {
          boyAraligi = boyAraligi || '15';
          enAraligi = enAraligi || '25';
        }
      }
      
      // Format göz aralığı
      let gozAraligi = '';
      if (boyAraligi && enAraligi) {
        gozAraligi = `${boyAraligi}x${enAraligi}`;
      } else if (product.gozAraligi) {
        gozAraligi = product.gozAraligi;
      } else if (product.goz_araligi) {
        gozAraligi = product.goz_araligi;
      }
      
      // Normalize hasır tipi to correct format (Q257/257, R257, TR257)
      const normalizedHasirTipi = normalizeHasirTipi(product.hasirTipi);
      
      // Format decimal values properly - use comma for Turkish format
      const formattedBoyCap = formatDecimalForDisplay(product.boyCap, true);
      const formattedEnCap = formatDecimalForDisplay(product.enCap, true);
      const formattedBoy = parseInt(product.uzunlukBoy || 0);
      const formattedEn = parseInt(product.uzunlukEn || 0);
      
      // Create the standard format used in database saves
      const stokAdi = `${normalizedHasirTipi} Çap(${formattedBoyCap}x${formattedEnCap} mm) Ebat(${formattedBoy}x${formattedEn} cm)${gozAraligi ? ` Göz Ara(${gozAraligi} cm)` : ''}`;
      
      return stokAdi;
    } else if (productType === 'NCBK') {
      const formattedCap = formatDecimalForDisplay(product.cap, true);
      const formattedLength = parseInt(product.length || 0);
      return `YM Nervürlü Çubuk ${formattedCap} mm ${formattedLength} cm`;
    } else if (productType === 'NTEL') {
      const formattedCap = formatDecimalForDisplay(product.cap, true);
      return `YM Nervürlü Tel ${formattedCap} mm`;
    }
    return '';
  };

  // Kaydedilecek ürünleri hesapla - Enhanced with Stok Adı matching
  const getProductsToSave = useCallback(() => {
    if (validProducts.length === 0) return [];
    
    console.log('DEBUG: getProductsToSave - checking', validProducts.length, 'products against', savedProducts?.mm?.length || 0, 'saved products');
    const newProducts = [];
    
    // Helper function to normalize Stok Adı for comparison
    // This handles variations like "5x5" vs "5,0x5,0" vs "5.0x5.0" and "15*25" vs "15x25"
    const normalizeStokAdiForComparison = (stokAdi) => {
      if (!stokAdi) return '';
      
      return stokAdi
        // Replace all decimal variations with a standard format
        .replace(/(\d+)[,.]0(?=\D|$)/g, '$1') // Convert 5,0 or 5.0 to 5
        .replace(/(\d+),(\d+)/g, '$1.$2')     // Convert 5,5 to 5.5
        // Normalize göz aralığı separators
        .replace(/(\d+)\*(\d+)/g, '$1x$2')   // Convert 15*25 to 15x25
        .replace(/\s+/g, ' ')                 // Normalize spaces
        .toLowerCase()
        .trim();
    };
    
    for (const product of validProducts) {
      // Generate the Stok Adı for this product
      const productStokAdi = generateStokAdi(product, 'CH');
      const normalizedProductStokAdi = normalizeStokAdiForComparison(productStokAdi);
      
      // Check if product exists using multiple strategies
      let productExists = false;
      
      // Strategy 1: Match by exact Stok Adı
      productExists = savedProducts.mm.some(p => p.stok_adi === productStokAdi);
      
      // Strategy 2: Match by normalized Stok Adı (handles decimal variations)
      if (!productExists) {
        productExists = savedProducts.mm.some(p => {
          const normalizedDbStokAdi = normalizeStokAdiForComparison(p.stok_adi);
          return normalizedDbStokAdi === normalizedProductStokAdi;
        });
        
        if (productExists) {
          console.log(`Found match via normalized Stok Adı: "${productStokAdi}" matched database entry`);
        }
      }
      
      // Strategy 3: Fallback - Match by product specifications with proper hasir_tipi normalization
      if (!productExists) {
        const normalizeHasirTipiForComparison = (hasirTipi) => {
          if (!hasirTipi) return '';
          return String(hasirTipi)
            .replace(/\/\d+$/, '') // Remove /XXX patterns: Q221/221 → Q221
            .replace(/\s+/g, '')   // Remove spaces
            .toUpperCase()
            .trim();
        };

        productExists = savedProducts.mm.some(p => 
          normalizeHasirTipiForComparison(p.hasir_tipi) === normalizeHasirTipiForComparison(product.hasirTipi) &&
          Math.abs(parseFloat(p.ebat_boy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.01 &&
          Math.abs(parseFloat(p.ebat_en || 0) - parseFloat(product.uzunlukEn || 0)) < 0.01 &&
          Math.abs(parseFloat(p.cap || 0) - parseFloat(product.boyCap || 0)) < 0.01 &&
          Math.abs(parseFloat(p.cap2 || 0) - parseFloat(product.enCap || 0)) < 0.01
        );
        
        if (productExists) {
          console.log(`Found match via specifications for: ${productStokAdi}`);
        }
      }
      
      // Only add if product doesn't exist
      if (!productExists) {
        newProducts.push(product);
      } else {
        console.log(`Product already exists, skipping: ${productStokAdi}`);
      }
    }
    
    console.log('DEBUG: getProductsToSave - found', newProducts.length, 'new products');
    return newProducts;
  }, [validProducts, savedProducts]);

  // Get products that are already saved in database (opposite of getProductsToSave)
  const getSavedProductsList = useCallback(() => {
    if (!validProducts?.length || !savedProducts?.mm?.length) return [];

    const savedProductsList = [];
    console.log('DEBUG: getSavedProductsList - checking', validProducts.length, 'products against', savedProducts.mm.length, 'saved products');
    
    // Helper function to normalize Stok Adı for comparison (same as in getProductsToSave)
    const normalizeStokAdiForComparison = (stokAdi) => {
      if (!stokAdi) return '';
      
      return stokAdi
        // Replace all decimal variations with a standard format
        .replace(/(\d+)[,.]0(?=\D|$)/g, '$1') // Convert 5,0 or 5.0 to 5
        .replace(/(\d+),(\d+)/g, '$1.$2')     // Convert 5,5 to 5.5
        // Normalize göz aralığı separators
        .replace(/(\d+)\*(\d+)/g, '$1x$2')   // Convert 15*25 to 15x25
        .replace(/\s+/g, ' ')                 // Normalize spaces
        .toLowerCase()
        .trim();
    };
    
    for (const product of validProducts) {
      // Generate the Stok Adı for this product
      const productStokAdi = generateStokAdi(product, 'CH');
      
      // Use same logic as analyzeProductsForConfirmation - first try exact Stok Adı
      let existingProduct = savedProducts.mm.find(p => p.stok_adi === productStokAdi);
      
      // Try normalized Stok Adı if exact match not found
      if (!existingProduct) {
        const normalizedProductStokAdi = normalizeStokAdiForComparison(productStokAdi);
        existingProduct = savedProducts.mm.find(p => {
          const normalizedDbStokAdi = normalizeStokAdiForComparison(p.stok_adi);
          return normalizedDbStokAdi === normalizedProductStokAdi;
        });
      }
      
      // Fallback to specifications matching if not found by Stok Adı with proper hasir_tipi normalization
      if (!existingProduct) {
        const normalizeHasirTipiForComparison = (hasirTipi) => {
          if (!hasirTipi) return '';
          return String(hasirTipi)
            .replace(/\/\d+$/, '') // Remove /XXX patterns: Q221/221 → Q221
            .replace(/\s+/g, '')   // Remove spaces
            .toUpperCase()
            .trim();
        };

        existingProduct = savedProducts.mm.find(p => 
          normalizeHasirTipiForComparison(p.hasir_tipi) === normalizeHasirTipiForComparison(product.hasirTipi) &&
          Math.abs(parseFloat(p.ebat_boy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.01 &&
          Math.abs(parseFloat(p.ebat_en || 0) - parseFloat(product.uzunlukEn || 0)) < 0.01 &&
          Math.abs(parseFloat(p.cap || 0) - parseFloat(product.boyCap || 0)) < 0.01 &&
          Math.abs(parseFloat(p.cap2 || 0) - parseFloat(product.enCap || 0)) < 0.01
        );
      }
      
      if (existingProduct) {
        // Product is already saved - use the found existing product
        
        // Product is already saved - add it to saved list
        // Map database fields to expected format for Excel generation
        savedProductsList.push({
          ...product,
          existingStokKodu: existingProduct.stok_kodu,
          stokAdi: productStokAdi,
          // Map database fields to expected Excel generation format
          boyCap: existingProduct.cap || product.boyCap,
          enCap: existingProduct.cap2 || product.enCap,
          hasirTipi: existingProduct.hasir_tipi || product.hasirTipi,
          uzunlukBoy: existingProduct.ebat_boy || product.uzunlukBoy,
          uzunlukEn: existingProduct.ebat_en || product.uzunlukEn,
          totalKg: existingProduct.kg || product.totalKg,
          gozAraligi: existingProduct.goz_araligi || product.gozAraligi,
          cubukSayisiBoy: existingProduct.ic_cap_boy_cubuk_ad || product.cubukSayisiBoy,
          cubukSayisiEn: existingProduct.dis_cap_en_cubuk_ad || product.cubukSayisiEn
        });
      }
    }
    
    console.log('DEBUG: getSavedProductsList - found', savedProductsList.length, 'saved products');
    return savedProductsList;
  }, [validProducts, savedProducts]);

  // Analyze products and categorize them into new vs existing with full details
  const analyzeProductsForConfirmation = async () => {
    if (validProducts.length === 0) return { newProducts: [], existingProducts: [], batchDuplicates: [] };
    
    // Initialize batch sequence before any stok kodu generation
    await initializeBatchSequence();
    
    const newProducts = [];
    const existingProducts = [];
    const batchDuplicates = []; // Track duplicates within current batch
    let modalBatchIndex = 0;
    
    // First pass: identify duplicates within the batch itself
    const batchStokAdiMap = new Map(); // Map Stok Adı to first occurrence index
    const batchUniqueProducts = []; // Products after removing batch duplicates
    
    for (let i = 0; i < validProducts.length; i++) {
      const product = validProducts[i];
      const productStokAdi = generateStokAdi(product, 'CH');
      
      if (batchStokAdiMap.has(productStokAdi)) {
        // This is a duplicate within the batch
        const firstOccurrenceIndex = batchStokAdiMap.get(productStokAdi);
        batchDuplicates.push({
          ...product,
          duplicateOfIndex: firstOccurrenceIndex,
          stokAdi: productStokAdi
        });
      } else {
        // First occurrence of this Stok Adı in the batch
        batchStokAdiMap.set(productStokAdi, i);
        batchUniqueProducts.push(product);
      }
    }
    
    // CRITICAL FIX: Force fresh data fetch before analysis to avoid stale cache
    // This prevents deleted products from appearing as "existing" when trying to re-add them
    console.log('DEBUG: Fetching FRESH data for product analysis to avoid stale cache...');
    await fetchSavedProducts(false, true); // Force fresh data with cache busting - updates savedProducts state
    
    // CRITICAL: Wait a moment for React state to be updated after async fetch
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use the freshly updated savedProducts state after timeout
    const freshSavedProducts = savedProducts;
    
    // Debug: Log the fresh savedProducts structure and check for CHOZL2448 specifically
    console.log('DEBUG: freshSavedProducts in analyzeProductsForConfirmation:', {
      mm: freshSavedProducts.mm?.length || 0,
      ncbk: freshSavedProducts.ncbk?.length || 0,
      ntel: freshSavedProducts.ntel?.length || 0
    });
    
    // CRITICAL DEBUG: Check if CHOZL2448 still exists in fresh data after deletion
    const chozl2448Products = freshSavedProducts.mm.filter(p => p.stok_kodu && p.stok_kodu.includes('CHOZL2448'));
    console.log('🚨 CRITICAL DEBUG: CHOZL2448 products still in freshSavedProducts after deletion:', chozl2448Products.length);
    if (chozl2448Products.length > 0) {
      console.log('🚨 CHOZL2448 PRODUCTS FOUND:', chozl2448Products.map(p => ({
        id: p.id,
        stok_kodu: p.stok_kodu,
        stok_adi: p.stok_adi,
        created_at: p.created_at
      })));
      
      // CRITICAL: If we find CHOZL2448 products, the backend deletion failed!
      console.error('❌ BACKEND DELETION FAILED! CHOZL2448 products still exist in database after "successful" deletion');
      console.error('❌ This indicates the DELETE API is not working properly or there are multiple products with same stok_kodu');
      console.error('❌ Need to investigate backend DELETE endpoint: /api/celik_hasir_netsis_mm/bulk-delete-by-stok');
    }
    
    // Helper function to normalize Stok Adı for comparison (same as in getProductsToSave)
    const normalizeStokAdiForComparison = (stokAdi) => {
      if (!stokAdi) return '';
      
      return stokAdi
        // Replace all decimal variations with a standard format
        .replace(/(\d+)[,.]0(?=\D|$)/g, '$1') // Convert 5,0 or 5.0 to 5
        .replace(/(\d+),(\d+)/g, '$1.$2')     // Convert 5,5 to 5.5
        // Normalize göz aralığı separators
        .replace(/(\d+)\*(\d+)/g, '$1x$2')   // Convert 15*25 to 15x25
        .replace(/\s+/g, ' ')                 // Normalize spaces
        .toLowerCase()
        .trim();
    };
    
    // Second pass: check unique products against database
    for (const product of batchUniqueProducts) {
      // Generate the Stok Adı for this product
      const productStokAdi = generateStokAdi(product, 'CH');
      console.log('DEBUG: Looking for product with stok_adi:', productStokAdi);
      
      // Find existing product by exact Stok Adı using FRESH data
      let existingProduct = freshSavedProducts.mm.find(p => p.stok_adi === productStokAdi);
      
      // Try normalized Stok Adı if exact match not found
      if (!existingProduct) {
        const normalizedProductStokAdi = normalizeStokAdiForComparison(productStokAdi);
        existingProduct = freshSavedProducts.mm.find(p => {
          const normalizedDbStokAdi = normalizeStokAdiForComparison(p.stok_adi);
          return normalizedDbStokAdi === normalizedProductStokAdi;
        });
        
        if (existingProduct) {
          console.log(`DEBUG: Found match via normalized Stok Adı: "${productStokAdi}" matched "${existingProduct.stok_adi}"`);
        } else {
          // If still not found, show some similar products for debugging
          const similarProducts = freshSavedProducts.mm.filter(p => {
            const normalized = normalizeStokAdiForComparison(p.stok_adi);
            return normalized.includes(productStokAdi.toLowerCase().substring(0, 8)); // First 8 chars
          }).slice(0, 2);
          
          if (similarProducts.length > 0) {
            console.log(`DEBUG: No match for "${productStokAdi}". Similar products found:`, 
              similarProducts.map(p => p.stok_adi));
            console.log(`DEBUG: Generated normalized: "${normalizedProductStokAdi}"`);
            console.log(`DEBUG: Similar normalized:`, 
              similarProducts.map(p => normalizeStokAdiForComparison(p.stok_adi)));
          }
        }
      }
      
      // Fallback to specifications matching if not found by Stok Adı with proper hasir_tipi normalization
      if (!existingProduct) {
        const normalizeHasirTipiForComparison = (hasirTipi) => {
          if (!hasirTipi) return '';
          return String(hasirTipi)
            .replace(/\/\d+$/, '') // Remove /XXX patterns: Q221/221 → Q221
            .replace(/\s+/g, '')   // Remove spaces
            .toUpperCase()
            .trim();
        };

        existingProduct = freshSavedProducts.mm.find(p => 
          normalizeHasirTipiForComparison(p.hasir_tipi) === normalizeHasirTipiForComparison(product.hasirTipi) &&
          Math.abs(parseFloat(p.ebat_boy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.01 &&
          Math.abs(parseFloat(p.ebat_en || 0) - parseFloat(product.uzunlukEn || 0)) < 0.01 &&
          Math.abs(parseFloat(p.cap || 0) - parseFloat(product.boyCap || 0)) < 0.01 &&
          Math.abs(parseFloat(p.cap2 || 0) - parseFloat(product.enCap || 0)) < 0.01
        );
      }
      
      if (existingProduct) {
        console.log('DEBUG: Found existing product:', existingProduct.stok_adi, existingProduct.stok_kodu);
        
        // Find ALL products that match ONLY the physical specifications (ignore Stok Adı completely)
        // This will catch products with identical specs but different Stok Adı formatting
        
        // Using the component-level normalizeHasirTipi function for intelligent format handling
        
        const allMatchingProducts = freshSavedProducts.mm.filter(p => {
          const dimensionMatch = Math.abs(parseFloat(p.ebat_boy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.01 &&
                                 Math.abs(parseFloat(p.ebat_en || 0) - parseFloat(product.uzunlukEn || 0)) < 0.01;
          
          // Enhanced decimal normalization based on ACTUAL database patterns
          const normalizeDecimal = (value) => {
            if (!value && value !== 0) return 0;
            
            // Handle all decimal format variations found in database
            let str = String(value)
              .replace(',', '.')           // "6,5" → "6.5" 
              .replace(/\s+/g, '')         // "6 .5" → "6.5"
              .trim();
              
            const num = parseFloat(str);
            if (isNaN(num)) return 0;
            
            // Handle floating point precision issues - database has values like: 6.5, 7.8, 9.2, 7.5
            // Don't round decimals as they are exact values in the database
            return Math.round(num * 100) / 100;
          };
          
          // Tighter tolerance for diameter matching to handle precision differences
          const diameterMatch = Math.abs(normalizeDecimal(p.cap) - normalizeDecimal(product.boyCap)) < 0.001 &&
                               Math.abs(normalizeDecimal(p.cap2) - normalizeDecimal(product.enCap)) < 0.001;
          
          // Enhanced hasır tipi comparison with format variations (Q257/257 vs Q257)
          const enhancedNormalizeHasirTipi = (hasirTipi) => {
            if (!hasirTipi) return '';
            return String(hasirTipi)
              .replace(/\/\d+$/, '') // Remove trailing /XXX patterns (Q257/257 → Q257, Q221/221 → Q221)
              .replace(/\s+/g, '')   // Remove all spaces
              .toUpperCase()
              .trim();
          };
          
          // Check both hasir_tipi field and stok_adi (where Q/R/TR codes are stored)
          const hasirTipiFromField = enhancedNormalizeHasirTipi(p.hasir_tipi);
          const hasirTipiFromStokAdi = enhancedNormalizeHasirTipi(p.stok_adi);
          const productHasirTipi = enhancedNormalizeHasirTipi(product.hasirTipi);
          
          const hasirTipiMatch = hasirTipiFromField === productHasirTipi || 
                                hasirTipiFromStokAdi.includes(productHasirTipi) || 
                                productHasirTipi.includes(hasirTipiFromStokAdi);
          
          // Enhanced göz aralığı normalization based on ACTUAL database patterns
          const enhancedNormalizeGozAraligi = (goz) => {
            if (!goz) return '';
            
            let normalized = String(goz)
              .replace(/\s*cm\s*/gi, '')      // Remove "cm"/"CM" 
              .replace(/\s*ara\s*/gi, '')     // Remove "ara" from "Göz Ara"
              .replace(/\s*göz\s*/gi, '')     // Remove "göz"
              .replace(/[()]/g, '')           // Remove parentheses
              .replace(/\s*x\s*/gi, '*')      // "15x15" → "15*15"
              .replace(/\s*X\s*/gi, '*')      // "15X15" → "15*15" 
              .replace(/\s*×\s*/gi, '*')      // "15×15" → "15*15"
              .replace(/\s+\*\s*/g, '*')      // "15 * 15" → "15*15"
              .replace(/\*\s+/g, '*')         // "15* 15" → "15*15"
              .replace(/,/g, '.')             // "15,15" → "15.15" (then will become 15*15 by duplication logic)
              .replace(/\./g, '*')            // "15.15" → "15*15" 
              .replace(/\s{2,}/g, ' ')        // Multiple spaces → single space
              .replace(/\s+/g, '')            // Remove remaining spaces "15 15" → "1515"  
              .toLowerCase()
              .trim();
              
            // Handle single values that need duplication: "15" → "15*15", "1515" → "15*15"
            if (normalized && !normalized.includes('*')) {
              // Check if it's a double number like "1515" → "15*15"
              if (normalized.length === 4 && /^\d{4}$/.test(normalized)) {
                const first = normalized.substring(0, 2);
                const second = normalized.substring(2, 4);
                if (first === second) {
                  return `${first}x${second}`;
                }
              }
              // Check if it's a double number like "3015" → "30*15" 
              if (normalized.length === 4 && /^\d{4}$/.test(normalized)) {
                const first = normalized.substring(0, 2);
                const second = normalized.substring(2, 4);
                return `${first}x${second}`;
              }
              // Single value: "15" → "15*15"
              if (/^\d{1,2}$/.test(normalized)) {
                return `${normalized}x${normalized}`;
              }
            }
            
            return normalized;
          };
          
          const gozMatch = enhancedNormalizeGozAraligi(p.goz_araligi) === enhancedNormalizeGozAraligi(formatGozAraligi(product));
          
          // Enhanced Stok Adı similarity check (typo tolerance)
          const calculateSimilarity = (str1, str2) => {
            if (!str1 || !str2) return 0;
            
            // Advanced normalization based on ACTUAL database patterns
            const normalize = (s) => s.toLowerCase()
              .replace(/\s+/g, ' ')                    // Multiple spaces → single space
              .replace(/[()]/g, '')                    // Remove parentheses
              .replace(/[*x×]/gi, '*')                 // Normalize separators: x/× → *
              .replace(/-e$/gi, '')                    // Remove "-E" suffix (found in CHOZL0028)
              .replace(/mm|cm/gi, '')                  // Remove units
              .replace(/[,]/g, '.')                    // "6,5" → "6.5" (found in CSV data)
              .replace(/(\d+)\.0+(?=\s|$)/g, '$1')     // Remove trailing zeros: "7.0" → "7"
              .replace(/(\d+\.\d*?)0+(?=\s|$)/g, '$1') // Remove trailing zeros: "7.50" → "7.5"
              .replace(/çaa+p/gi, 'çap')              // Fix typos: çaap → çap
              .replace(/ebaa+t/gi, 'ebat')            // Fix typos: ebaaat → ebat  
              .replace(/göz\s*ara+/gi, 'göz ara')     // Fix typos: göz araaa → göz ara
              .replace(/ara\s*\(/gi, 'ara(')           // "göz ara (" → "göz ara("
              .replace(/\s*\/\s*\d+/g, '')             // Remove "/XXX" patterns: "Q221/221" → "Q221"
              .replace(/\s*tr\s*/gi, 'tr')             // Normalize TR prefix
              .replace(/\s*q\s*/gi, 'q')               // Normalize Q prefix  
              .replace(/\s*r\s*/gi, 'r')               // Normalize R prefix
              .replace(/(\d)(\D)(\d)/g, '$1 $2 $3')   // Add spaces around non-digits
              .trim();
            
            const n1 = normalize(str1);
            const n2 = normalize(str2);
            
            if (n1 === n2) return 1.0;
            
            // Levenshtein distance for fuzzy matching
            const distance = levenshteinDistance(n1, n2);
            const maxLength = Math.max(n1.length, n2.length);
            return maxLength === 0 ? 1.0 : Math.max(0, (maxLength - distance) / maxLength);
          };
          
          // Helper function for edit distance calculation
          const levenshteinDistance = (str1, str2) => {
            const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
            
            for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
            for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
            
            for (let j = 1; j <= str2.length; j++) {
              for (let i = 1; i <= str1.length; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                  matrix[j - 1][i] + 1,      // deletion
                  matrix[j][i - 1] + 1,      // insertion  
                  matrix[j - 1][i - 1] + cost // substitution
                );
              }
            }
            return matrix[str2.length][str1.length];
          };
          
          // Generate expected stok_adi for similarity comparison
          const expectedStokAdi = generateStokAdi(product, 'CH');
          const similarity = calculateSimilarity(p.stok_adi, expectedStokAdi);
          const stokAdiMatch = similarity > 0.80; // 80% similarity threshold for typo tolerance
          
          // Combine all matching criteria
          const overallMatch = hasirTipiMatch && dimensionMatch && diameterMatch && gozMatch && stokAdiMatch;
          
          // Enhanced debug for first product  
          if (p.stok_kodu === existingProduct.stok_kodu) {
            console.log('🔍 ENHANCED DUPLICATE DETECTION for', p.stok_kodu);
            console.log('  📊 HASIR TIPI:', { 
              db: p.hasir_tipi, 
              product: product.hasirTipi, 
              normalized_db: enhancedNormalizeHasirTipi(p.hasir_tipi), 
              normalized_product: enhancedNormalizeHasirTipi(product.hasirTipi), 
              match: hasirTipiMatch 
            });
            console.log('  📏 DIMENSIONS:', { 
              db: [p.ebat_boy, p.ebat_en], 
              product: [product.uzunlukBoy, product.uzunlukEn], 
              match: dimensionMatch 
            });
            console.log('  📐 DIAMETERS:', { 
              db: [normalizeDecimal(p.cap), normalizeDecimal(p.cap2)], 
              product: [normalizeDecimal(product.boyCap), normalizeDecimal(product.enCap)], 
              match: diameterMatch 
            });
            console.log('  🕳️ GOZ ARALIGI:', { 
              db: p.goz_araligi, 
              product: formatGozAraligi(product), 
              normalized_db: enhancedNormalizeGozAraligi(p.goz_araligi), 
              normalized_product: enhancedNormalizeGozAraligi(formatGozAraligi(product)), 
              match: gozMatch 
            });
            console.log('  📝 STOK ADI SIMILARITY:', { 
              db: p.stok_adi, 
              expected: expectedStokAdi, 
              similarity: similarity.toFixed(5), 
              match: stokAdiMatch 
            });
            console.log('  ✅ OVERALL MATCH:', overallMatch);
          }
          
          return overallMatch;
        });
        
        // Debug all hasır tipi variations in the database for this comparison
        const allHasirTipiVariations = new Set(freshSavedProducts.mm.map(p => p.hasir_tipi).filter(Boolean));
        console.log('📋 ALL HASIR TIPI VARIATIONS IN DATABASE:', Array.from(allHasirTipiVariations).sort());
        
        console.log(`DEBUG: Found ${allMatchingProducts.length} products with IDENTICAL specifications:`, 
          allMatchingProducts.map(p => ({ 
            stok_kodu: p.stok_kodu,
            stok_adi: p.stok_adi,
            hasir_tipi_original: p.hasir_tipi,
            hasir_tipi_normalized: normalizeHasirTipi(p.hasir_tipi),
            specs: `${p.hasir_tipi} ${p.ebat_boy}x${p.ebat_en} ${p.cap}x${p.cap2} ${p.goz_araligi}`
          }))
        );
        
        // Fallback: if no matches found with smart filtering, try simpler fallback matching
        if (allMatchingProducts.length === 0) {
          console.log('DEBUG: No smart matches found, trying fallback matching...');
          // Try with just hasir tipi and dimensions (less strict) with proper normalization
          const fallbackMatches = freshSavedProducts.mm.filter(p => {
            const normalizeForFallback = (hasirTipi) => {
              if (!hasirTipi) return '';
              return String(hasirTipi)
                .replace(/\/\d+$/, '') // Remove /XXX patterns
                .replace(/\s+/g, '')   // Remove spaces
                .toUpperCase()
                .trim();
            };

            const hasirTipiBasicMatch = normalizeForFallback(p.hasir_tipi) === normalizeForFallback(product.hasirTipi);
            const dimensionMatch = Math.abs(parseFloat(p.ebat_boy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.01 &&
                                 Math.abs(parseFloat(p.ebat_en || 0) - parseFloat(product.uzunlukEn || 0)) < 0.01;
            return hasirTipiBasicMatch && dimensionMatch;
          });
          
          if (fallbackMatches.length > 0) {
            console.log(`DEBUG: Fallback found ${fallbackMatches.length} matches:`, fallbackMatches.map(p => p.stok_kodu));
            allMatchingProducts.push(...fallbackMatches);
          }
        }
        
        // Safeguard: If we found an existingProduct but allMatchingProducts is empty, include the existingProduct
        if (allMatchingProducts.length === 0 && existingProduct) {
          console.log('DEBUG: ⚠️ SAFEGUARD: No allMatchingProducts found, but existingProduct exists. Adding existingProduct to results.');
          console.log('DEBUG: existingProduct:', existingProduct.stok_kodu, existingProduct.stok_adi);
          allMatchingProducts.push(existingProduct);
        }
        
        if (allMatchingProducts.length > 1) {
          console.log('DEBUG: ⚠️ DUPLICATES FOUND! Multiple products with same specs but different Stok Adı/Kodu');
        }
        
        // Product exists - add to existing list with stok_kodu and variant info
        // Create a map of Stok Adı to all related Stok Kodus (same logic as saveToDatabase)
        const stokAdiToStokKodusMap = new Map();
        
        // Map all existing products by Stok Adı
        [...freshSavedProducts.mm, ...freshSavedProducts.ncbk, ...freshSavedProducts.ntel].forEach(p => {
          if (p.stok_adi) {
            if (!stokAdiToStokKodusMap.has(p.stok_adi)) {
              stokAdiToStokKodusMap.set(p.stok_adi, []);
            }
            stokAdiToStokKodusMap.get(p.stok_adi).push(p.stok_kodu);
          }
        });
        
        // Check for NCBK/NTEL variants
        const ncbkStokAdi500 = `YM Nervürlü Çubuk ${product.boyCap} mm 500 cm`;
        const ncbkStokAdi215 = `YM Nervürlü Çubuk ${product.enCap} mm 215 cm`;
        const ntelStokAdi = `YM Nervürlü Tel ${product.boyCap} mm`;
        
        console.log('DEBUG: Looking for variant Stok Adıs:', {
          ncbkStokAdi500,
          ncbkStokAdi215, 
          ntelStokAdi
        });
        
        const variants = {
          ch: allMatchingProducts.map(p => p.stok_kodu), // Show ALL matching CH products
          ncbk500: stokAdiToStokKodusMap.get(ncbkStokAdi500) || [],
          ncbk215: stokAdiToStokKodusMap.get(ncbkStokAdi215) || [],
          ntel: stokAdiToStokKodusMap.get(ntelStokAdi) || []
        };
        
        console.log('DEBUG: Found variants:', variants);
        
        existingProducts.push({
          ...product,
          existingStokKodus: allMatchingProducts.map(p => p.stok_kodu), // Show ALL matching Stok Kodus
          stokAdi: productStokAdi,
          existingStokAdiVariants: {
            ...variants,
            ch: allMatchingProducts.map(p => p.stok_kodu) // Ensure CH variants are also populated
          }
        });
      } else {
        console.log('DEBUG: Product not found, creating new:', productStokAdi);
        
        // Product is new - generate new stok_kodu with proper batch indexing
        const newStokKodu = generateNewStokKodu(product, 'CH', modalBatchIndex);
        newProducts.push({
          ...product,
          newStokKodu: newStokKodu,
          stokAdi: productStokAdi
        });
        modalBatchIndex++;
      }
    }
    
    console.log('DEBUG: Final analysis result:', { 
      newProducts: newProducts.length,
      existingProducts: existingProducts.length,
      existingProductsData: existingProducts
    });
    
    return { newProducts, existingProducts, batchDuplicates };
  };



  // İngilizce isim oluştur
  const generateIngilizceIsim = (product, productType) => {
    if (productType === 'CH') {
      const hasirTipi = product.hasirTipi || '';
      const boyCap = formatDecimalForDisplay(product.boyCap || 0, true); // No decimals for English
      const enCap = formatDecimalForDisplay(product.enCap || 0, true);
      const uzunlukBoy = Math.round(product.uzunlukBoy || 0);
      const uzunlukEn = Math.round(product.uzunlukEn || 0);
      const gozAraligi = formatGozAraligi(product) || '';
      
      return `Wire Mesh- ${hasirTipi} Dia(${boyCap}x${enCap} mm) Size(${uzunlukBoy}x${uzunlukEn} cm) Mesh(${gozAraligi} cm)`;
    } else if (productType === 'NCBK') {
      const cap = formatDecimalForDisplay(product.cap || 0, false);
      const length = product.length || 0;
      return `Ribbed Rebar ${cap} mm ${length} cm`;
    } else if (productType === 'NTEL') {
      const cap = formatDecimalForDisplay(product.cap || 0, false);
      return `Ribbed Wire ${cap} mm`;
    }
    return '';
  };

  // Göz aralığı formatla
  const formatGozAraligi = (product) => {
    // Check multiple possible field names
    if (product.boyAraligi && product.enAraligi) {
      return `${product.boyAraligi}x${product.enAraligi}`;
    } else if (product.boyAralik && product.enAralik) {
      return `${product.boyAralik}x${product.enAralik}`;
    } else if (product.gozAraligi) {
      const gozValue = product.gozAraligi.toString();
      // Check if already formatted (contains x or *)
      if (gozValue.includes('x') || gozValue.includes('*')) {
        return gozValue.replace('*', 'x'); // Normalize * to x
      } else {
        return `${gozValue}x${gozValue}`;
      }
    } else if (product.goz_araligi) {
      const gozValue = product.goz_araligi.toString();
      // Check if already formatted (contains x or *)
      if (gozValue.includes('x') || gozValue.includes('*')) {
        return gozValue.replace('*', 'x'); // Normalize * to x
      } else {
        return `${gozValue}x${gozValue}`;
      }
    } else {
      return '15x15'; // Use x instead of * for consistency
    }
  };

  // Smart hasır tipi normalizer - handles Q/R/TR format variations intelligently
  const normalizeHasirTipi = (tipi) => {
    if (!tipi) return '';
    
    // Handle various input formats and clean the string
    let cleanTipi = tipi.toString().trim().toUpperCase();
    
    // Remove any extra whitespace between letters and numbers
    cleanTipi = cleanTipi.replace(/\s+/g, '');
    
    // Handle Q-type combinations (Q221/443) - preserve as-is
    const combinationMatch = cleanTipi.match(/^Q(\d+)\/(\d+)$/);
    if (combinationMatch) {
      const first = combinationMatch[1];
      const second = combinationMatch[2];
      // Return combination format as-is if numbers are different
      if (first !== second) {
        return `Q${first}/${second}`;
      }
    }
    
    // Extract the base pattern (Q257, R257, TR257, etc.)
    // Handle both Q257 and Q257/257 formats
    const match = cleanTipi.match(/^(Q|R|TR)(\d+)(?:\/\d+)?/);
    if (!match) return cleanTipi;
    
    const prefix = match[1];  // Q, R, or TR
    const number = match[2];  // 257, 221, etc.
    
    // Normalize based on type rules from CSV analysis:
    // Q types should have double format: Q257/257 (only for single Q-types)
    // R and TR types should have single format: R257, TR257
    if (prefix === 'Q') {
      return `${prefix}${number}/${number}`;
    } else {
      return `${prefix}${number}`;
    }
  };

  // Helper function to convert decimal point to comma for Excel
  const toExcelDecimal = (value) => {
    if (value === null || value === undefined || value === '') return '';
    // Convert to string and replace decimal point with comma
    return String(value).replace('.', ',');
  };

  // Helper function to format numbers without trailing zeros for Excel
  const toExcelNumber = (value) => {
    if (value === null || value === undefined || value === '') return '';
    // Convert to number to remove trailing zeros, then to string, then replace decimal point with comma
    const num = parseFloat(value);
    if (isNaN(num)) return '0,00001'; // Return default 5 decimal format for NaN values
    // Format to 5 decimal places and replace decimal point with comma
    return String(num.toFixed(5)).replace('.', ',');
  };

  // Extract hasir_tipi from stok_adi field
  const extractHasirTipiFromStokAdi = (stokAdi) => {
    if (!stokAdi) return null;
    
    // Common patterns in stok_adi: "Q257/257", "R257", "TR257", "Q317/317", etc.
    const patterns = [
      /^(Q\d+\/\d+)/,     // Q257/257, Q317/317, Q443/443, etc.
      /^(TR\d+)/,         // TR257, TR317, TR335, TR377, etc.
      /^(R\s?\d+)/,       // R257, R 257, R295, R335, etc.
      /^(Q\d+)/           // Q257, Q317, etc. (without slash)
    ];
    
    for (const pattern of patterns) {
      const match = stokAdi.match(pattern);
      if (match) {
        return match[1].replace(/\s+/g, ''); // Remove spaces like "R 257" -> "R257"
      }
    }
    
    return null;
  };

  // Generate Kaynak Programı Excel (optimized version)
  const generateKaynakProgramiExcel = async () => {
    try {
      if (validProducts.length === 0) {
        toast.warn('Kaynak Programı oluşturmak için önce ürün listesini doldurun.');
        return;
      }
      
      // Reset cancellation flag and start progress indicator
      setCancelExcelGeneration(false);
      setIsGeneratingExcel(true);
      setExcelProgress({ current: 0, total: 4, operation: 'Veritabanı analizi yapılıyor...' });
      
      // Get stock codes from save confirmation analysis (reuse existing analysis)
      const analysisResult = await analyzeProductsForConfirmation();
      
      // Check for cancellation
      if (cancelExcelGeneration) {
        console.log('Excel generation cancelled during analysis');
        return;
      }
      
      // Use the returned result directly instead of relying on state
      const existingProductsData = analysisResult?.existingProducts || [];
      const newProductsData = analysisResult?.newProducts || [];
      
      // Update progress
      setExcelProgress({ current: 1, total: 4, operation: 'Mevcut veriler işleniyor...' });
      
      // OPTIMIZATION: Instead of making hundreds of API calls, use existing savedProducts data
      // combined with fallback calculations for missing cubuk sayisi values
      console.log('KAYNAK PROGRAMI: Using optimized approach with existing data...');
      
      // Pre-fetch all mesh configurations to avoid individual API calls during processing
      const uniqueHasirTipis = [...new Set(validProducts.map(p => p.hasirTipi))];
      console.log(`🔧 Pre-fetching mesh configurations for ${uniqueHasirTipis.length} unique hasir tipis...`);
      await batchFetchMeshConfigs(uniqueHasirTipis);
      
      const enhancedProducts = await Promise.all(validProducts.map(async (product) => {
        // Find matching stock code from analysis
        let stokKodu = '';
        
        // Check existing products first
        const existingMatch = existingProductsData.find(existing => {
          const hasirTipiMatch = existing.hasirTipi === product.hasirTipi;
          const boyMatch = Math.abs(parseFloat(existing.uzunlukBoy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.1;
          const enMatch = Math.abs(parseFloat(existing.uzunlukEn || 0) - parseFloat(product.uzunlukEn || 0)) < 0.1;
          return hasirTipiMatch && boyMatch && enMatch;
        });
        
        if (existingMatch && existingMatch.existingStokKodus && existingMatch.existingStokKodus.length > 0) {
          const sortedCodes = existingMatch.existingStokKodus.sort((a, b) => {
            const numA = parseInt(a.match(/CHOZL(\d+)/)?.[1] || '0');
            const numB = parseInt(b.match(/CHOZL(\d+)/)?.[1] || '0');
            return numB - numA;
          });
          stokKodu = sortedCodes[0];
          
          // Try to find saved product data for cubuk sayisi values
          const savedProduct = savedProducts.mm?.find(p => p.stok_kodu === stokKodu);
          if (savedProduct && savedProduct.cubuk_sayisi_boy && savedProduct.cubuk_sayisi_en) {
            return {
              ...product,
              existingStokKodu: stokKodu,
              cubukSayisiBoy: savedProduct.cubuk_sayisi_boy,
              cubukSayisiEn: savedProduct.cubuk_sayisi_en,
              source: 'saved_data'
            };
          }
        } else {
          // Check new products
          const newMatch = newProductsData.find(newProd => {
            const hasirTipiMatch = newProd.hasirTipi === product.hasirTipi;
            const boyMatch = Math.abs(parseFloat(newProd.uzunlukBoy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.1;
            const enMatch = Math.abs(parseFloat(newProd.uzunlukEn || 0) - parseFloat(product.uzunlukEn || 0)) < 0.1;
            return hasirTipiMatch && boyMatch && enMatch;
          });
          
          if (newMatch && newMatch.newStokKodu) {
            stokKodu = newMatch.newStokKodu;
          }
        }
        
        // If no cubuk sayisi found in saved data, calculate using fallback
        const fallbackResult = await calculateFallbackCubukSayisi(
          product.hasirTipi,
          parseFloat(product.uzunlukBoy || 0),
          parseFloat(product.uzunlukEn || 0)
        );
        
        return {
          ...product,
          existingStokKodu: stokKodu,
          cubukSayisiBoy: fallbackResult?.cubukSayisiBoy || product.cubukSayisiBoy || 0,
          cubukSayisiEn: fallbackResult?.cubukSayisiEn || product.cubukSayisiEn || 0,
          source: 'fallback_calculation'
        };
      }));
      
      console.log(`KAYNAK PROGRAMI: Enhanced ${enhancedProducts.length} products with optimized data`);
      
      // Check for cancellation
      if (cancelExcelGeneration) {
        console.log('Excel generation cancelled during data processing');
        return;
      }
      
      // Update progress
      setExcelProgress({ current: 2, total: 4, operation: 'Stok kodları eşleştiriliyor...' });
      
      // CSV structure headers from your template
      const headers = [
        '', 'Stok kodu', 'FİRMA', 'Stok Kartı', 'HASIR', 'BOY', 'EN', 'HASIR', 'BOY', 'EN', 'Açıklama', 'UZUNLUK', '', 'ÇUBUK SAYISI', '', 'ARA', '', 'HASIR', 'SOL', 'SAĞ', 'ÖN', 'ARKA', 'ADET', 'TOPLAM', ''
      ];
      const subHeaders = [
        '', '', 'ADI', '', 'CİNSİ', '', '', 'SAYISI', 'ÇAP', 'ÇAP', '', 'BOY', 'EN', 'BOY', 'EN', 'BOY', 'EN', 'SAYISI', 'FİLİZ', 'FİLİZ', 'FİLİZ', 'FİLİZ', 'KG.', 'KG.', ''
      ];
      
      // Prepare data array
      const data = [headers, subHeaders];
      
      enhancedProducts.forEach((enhancedProduct, index) => {
        // Use the enhanced product data directly
        const stokKodu = enhancedProduct.existingStokKodu || '';
        const finalCubukSayisiBoy = enhancedProduct.cubukSayisiBoy || 0;
        const finalCubukSayisiEn = enhancedProduct.cubukSayisiEn || 0;
        
        console.log(`KAYNAK PROGRAMI: Product ${index + 1} - ${stokKodu} - Boy Cubuk: ${finalCubukSayisiBoy}, En Cubuk: ${finalCubukSayisiEn} (${enhancedProduct.source})`);
        
        // Map enhanced product data to CSV structure
        data.push([
          index + 1, // Row number
          stokKodu, // Stock code from analysis
          '', // FİRMA ADI - empty
          '', // Stok Kartı - empty  
          normalizeHasirTipi(enhancedProduct.hasirTipi || ''), // HASIR CİNSİ
          parseFloat(enhancedProduct.boyCap || 0), // BOY ÇAP
          parseFloat(enhancedProduct.enCap || 0), // EN ÇAP
          parseInt(enhancedProduct.hasirSayisi || 1), // HASIR SAYISI
          parseFloat(enhancedProduct.boyCap || 0), // BOY ÇAP (repeat)
          parseFloat(enhancedProduct.enCap || 0), // EN ÇAP (repeat)
          '', // Açıklama - empty
          parseInt(enhancedProduct.uzunlukBoy || 0), // UZUNLUK BOY
          parseInt(enhancedProduct.uzunlukEn || 0), // UZUNLUK EN
          parseInt(finalCubukSayisiBoy), // ÇUBUK SAYISI BOY - USE ENHANCED/FALLBACK VALUE
          parseInt(finalCubukSayisiEn), // ÇUBUK SAYISI EN - USE ENHANCED/FALLBACK VALUE
          parseFloat(enhancedProduct.boyAraligi || enhancedProduct.gozAraligiBoy || 0), // ARA BOY
          parseFloat(enhancedProduct.enAraligi || enhancedProduct.gozAraligiEn || 0), // ARA EN
          parseInt(enhancedProduct.hasirSayisi || 1), // HASIR SAYISI (repeat)
          parseFloat(enhancedProduct.solFiliz || 0), // SOL FİLİZ
          parseFloat(enhancedProduct.sagFiliz || 0), // SAĞ FİLİZ
          parseFloat(enhancedProduct.onFiliz || 0), // ÖN FİLİZ
          parseFloat(enhancedProduct.arkaFiliz || 0), // ARKA FİLİZ
          parseFloat(enhancedProduct.adetKg || (parseFloat(enhancedProduct.toplamKg || enhancedProduct.toplamAgirlik || 0) / parseInt(enhancedProduct.hasirSayisi || 1)).toFixed(4)), // ADET KG
          parseFloat(enhancedProduct.toplamKg || enhancedProduct.toplamAgirlik || 0), // TOPLAM KG
          '' // Empty last column
        ]);
      });
      
      // Check for cancellation before final Excel generation
      if (cancelExcelGeneration) {
        console.log('Excel generation cancelled before file creation');
        return;
      }
      
      // Update progress
      setExcelProgress({ current: 3, total: 4, operation: 'Excel dosyası oluşturuluyor...' });
      
      // Create workbook using XLSX (same as exportToExcel)
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Column widths
      const colWidths = headers.map(h => ({ wch: Math.max(String(h).length, 15) }));
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Kaynak Programı");
      
      // Update final progress
      setExcelProgress({ current: 4, total: 4, operation: 'Dosya indiriliyor...' });
      
      // Download as Excel (.xlsx) file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      XLSX.writeFile(wb, `Kaynak_Programi_${timestamp}.xlsx`);
      
      console.log('DEBUG: Kaynak Programı Excel created successfully');
      toast.success('Kaynak Programı Excel dosyası oluşturuldu!');
      
    } catch (error) {
      console.error('Error generating Kaynak Programı Excel:', error);
      toast.error('Kaynak Programı Excel oluşturulurken hata oluştu');
    } finally {
      // Always reset loading state
      setIsGeneratingExcel(false);
      setExcelProgress({ current: 0, total: 0, operation: '' });
    }
  };

  // Excel dosyalarını oluştur
  const generateExcelFiles = useCallback(async (inputProducts, includeAllProducts = false) => {
    try {
      setIsGeneratingExcel(true);
      setExcelProgress({ current: 0, total: 4, operation: 'Excel verisi hazırlanıyor...' });

      // CRITICAL FIX: Always ensure we have the correct database-first + fallback values
      let products = inputProducts;
      
      // If we have existing stok codes, fetch fresh data from database with fallback
      const existingStokKodes = inputProducts
        .filter(p => p.existingStokKodu)
        .map(p => p.existingStokKodu);
      
      if (existingStokKodes.length > 0 && !inputProducts.some(p => p.skipDatabaseRefresh)) {
        console.log('Excel generation: Fetching fresh database data with fallback for', existingStokKodes.length, 'products');
        const freshDatabaseProducts = await fetchDatabaseDataWithFallback([], existingStokKodes);
        
        if (freshDatabaseProducts && freshDatabaseProducts.length > 0) {
          // Use fresh database data
          products = freshDatabaseProducts;
          console.log('Excel generation: Using fresh database data');
          console.log('🔧 EXCEL INPUT DEBUG - Products received from database fetch:', products.map(p => ({
            stokKodu: p.existingStokKodu,
            cubukSayisiBoy: p.cubukSayisiBoy,
            cubukSayisiEn: p.cubukSayisiEn,
            hasirTipi: p.hasirTipi,
            source: p.source || 'unknown'
          })));
        } else {
          // Fallback: Apply fallback formula to input products
          console.log('Excel generation: Database fetch failed, applying fallback formula');
          products = await Promise.all(
            inputProducts.map(async (product) => {
              const fallbackResult = await calculateFallbackCubukSayisi(
                product.hasirTipi,
                parseFloat(product.uzunlukBoy || 0),
                parseFloat(product.uzunlukEn || 0)
              );
              return {
                ...product,
                cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                cubukSayisiEn: fallbackResult.cubukSayisiEn,
                source: 'fallback'
              };
            })
          );
        }
      } else if (inputProducts.some(p => p.skipDatabaseRefresh)) {
        // Skip database refresh - use input products as-is
        console.log('Excel generation: Skip database refresh flag detected, using input products directly');
        products = inputProducts;
        console.log('🔧 EXCEL INPUT DEBUG - Products received from skip refresh:', products.map(p => ({
          stokKodu: p.existingStokKodu,
          cubukSayisiBoy: p.cubukSayisiBoy,
          cubukSayisiEn: p.cubukSayisiEn,
          hasirTipi: p.hasirTipi,
          source: p.source || 'loaded-data'
        })));
      } else {
        // No existing products - apply fallback formula to all
        console.log('Excel generation: No existing products, applying fallback formula to all');
        products = await Promise.all(
          inputProducts.map(async (product) => {
            const fallbackResult = await calculateFallbackCubukSayisi(
              product.hasirTipi,
              parseFloat(product.uzunlukBoy || 0),
              parseFloat(product.uzunlukEn || 0)
            );
            return {
              ...product,
              cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
              cubukSayisiEn: fallbackResult.cubukSayisiEn,
              source: 'fallback'
            };
          })
        );
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      
      // 1. Stok Kartı Excel
      console.log('DEBUG: Starting Stok Kartı Excel generation with corrected data...');
      setExcelProgress({ current: 1, total: 3, operation: 'Stok Kartı Excel oluşturuluyor...' });
      await generateStokKartiExcel(products, timestamp, includeAllProducts);
      console.log('DEBUG: Stok Kartı Excel completed');
      
      // 2. Reçete Excel  
      console.log('DEBUG: Starting Reçete Excel generation...');
      setExcelProgress({ current: 2, total: 3, operation: 'Reçete Excel oluşturuluyor...' });
      await generateReceteExcel(products, timestamp, includeAllProducts);
      console.log('DEBUG: Reçete Excel completed');
      
      // 3. Alternatif Reçete Excel
      console.log('DEBUG: Starting Alternatif Reçete Excel generation...');
      setExcelProgress({ current: 3, total: 3, operation: 'Alternatif Reçete Excel oluşturuluyor...' });
      await generateAlternatifReceteExcel(products, timestamp, includeAllProducts);
      console.log('DEBUG: Alternatif Reçete Excel completed');
      
      toast.success('Excel dosyaları başarıyla oluşturuldu!');
      
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast.error('Excel dosyaları oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingExcel(false);
      setExcelProgress({ current: 0, total: 0, operation: '' });
    }
  }, []);

  // Bulk Excel generation - download entire database and process locally
  const generateBulkExcelFromDatabase = useCallback(async () => {
    try {
      setIsGeneratingExcel(true);
      setExcelProgress({ current: 0, total: 6, operation: 'Toplu veritabanı indirme başlıyor...' });

      console.log('🚀 BULK EXCEL: Starting bulk database download using unified fetch approach...');

      // 1. Get all product stock codes first
      setExcelProgress({ current: 1, total: 6, operation: 'Ürün kodları alınıyor...' });
      
      const [mmResponse, ncbkResponse, ntelResponse] = await Promise.all([
        fetch(`${API_URLS.getAllMM}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllNCBK}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllNTEL}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [allMMProducts, allNCBKProducts, allNTELProducts] = await Promise.all([
        mmResponse.json(),
        ncbkResponse.json(),
        ntelResponse.json()
      ]);

      console.log(`🚀 BULK EXCEL: Found MM(${allMMProducts.length}), NCBK(${allNCBKProducts.length}), NTEL(${allNTELProducts.length}) products`);

      // 2. Fetch all recipe data
      setExcelProgress({ current: 2, total: 8, operation: 'Reçete verileri alınıyor...' });
      
      const [mmReceteResponse, ncbkReceteResponse, ntelReceteResponse] = await Promise.all([
        fetch(`${API_URLS.getAllMMRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllNCBKRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllNTELRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [allMMRecetes, allNCBKRecetes, allNTELRecetes] = await Promise.all([
        mmReceteResponse.json(),
        ncbkReceteResponse.json(),
        ntelReceteResponse.json()
      ]);

      console.log(`🚀 BULK EXCEL: Found MM Recipes(${allMMRecetes.length}), NCBK Recipes(${allNCBKRecetes.length}), NTEL Recipes(${allNTELRecetes.length})`);

      // 3. Process MM products with recipe data
      setExcelProgress({ current: 3, total: 8, operation: 'MM ürünleri formatlanıyor...' });
      
      // Process MM products and enhance with recipe data
      const processedProducts = allMMProducts.map(product => {
        // Find recipe data for this product
        const productRecipes = allMMRecetes.filter(r => r.mamul_kodu === product.stok_kodu);
        
        // Extract YOTOCH duration from recipes
        let yotochDuration = 0;
        let boyCubukSayisi = 0;
        let enCubukSayisi = 0;
        
        productRecipes.forEach(recipe => {
          if (recipe.aciklama && recipe.aciklama.includes('BOY ÇUBUĞU')) {
            boyCubukSayisi = parseFloat(recipe.miktar) || 0;
          } else if (recipe.aciklama && recipe.aciklama.includes('EN ÇUBUĞU')) {
            enCubukSayisi = parseFloat(recipe.miktar) || 0;
          } else if (recipe.bilesen_kodu === 'YOTOCH' && recipe.uretim_suresi) {
            yotochDuration = parseFloat(recipe.uretim_suresi) || 0;
          }
        });
        
        // Extract actual hasir_tipi from stok_adi if hasir_tipi is missing or 'MM'
        const extractedHasirTipi = extractHasirTipiFromStokAdi(product.stok_adi) || product.hasir_tipi || 'MM';
        
        return {
          ...product,
          existingStokKodu: product.stok_kodu,
          existingIngilizceIsim: product.ingilizce_isim,
          hasirTipi: extractedHasirTipi,
          uzunlukBoy: product.ebat_boy?.toString() || '0',
          uzunlukEn: product.ebat_en?.toString() || '0',
          boyCap: product.cap?.toString() || '0',
          enCap: product.cap2?.toString() || '0',
          totalKg: product.kg?.toString() || '0',
          adetKg: product.kg?.toString() || '0',
          // Use recipe data if available, otherwise use database values
          cubukSayisiBoy: boyCubukSayisi || product.ic_cap_boy_cubuk_ad,
          cubukSayisiEn: enCubukSayisi || product.dis_cap_en_cubuk_ad,
          ic_cap_boy_cubuk_ad: boyCubukSayisi || product.ic_cap_boy_cubuk_ad,
          dis_cap_en_cubuk_ad: enCubukSayisi || product.dis_cap_en_cubuk_ad,
          gozAraligiEn: calculateGozAraligi(extractedHasirTipi, 'en'),
          gozAraligiBoy: calculateGozAraligi(extractedHasirTipi, 'boy'),
          yotochDuration: yotochDuration,
          recipeData: productRecipes,
          source: 'database',
          productType: 'MM',
          // Preserve stok_adi from database
          stok_adi: product.stok_adi
        };
      });

      setExcelProgress({ current: 4, total: 8, operation: 'NCBK ürünleri formatlanıyor...' });
      
      const processedNCBKProducts = allNCBKProducts.map(dbProduct => ({
        existingStokKodu: dbProduct.stok_kodu,
        existingIngilizceIsim: dbProduct.ingilizce_isim,
        hasirTipi: dbProduct.hasir_tipi || 'NCBK',
        uzunlukBoy: dbProduct.ebat_boy?.toString() || '0',
        uzunlukEn: dbProduct.ebat_en?.toString() || '0',
        boyCap: dbProduct.cap?.toString() || '0',
        enCap: dbProduct.cap2?.toString() || '0',
        totalKg: dbProduct.kg?.toString() || '0',
        adetKg: dbProduct.kg?.toString() || '0',
        cubukSayisiBoy: dbProduct.ic_cap_boy_cubuk_ad,
        cubukSayisiEn: dbProduct.dis_cap_en_cubuk_ad,
        ic_cap_boy_cubuk_ad: dbProduct.ic_cap_boy_cubuk_ad,
        dis_cap_en_cubuk_ad: dbProduct.dis_cap_en_cubuk_ad,
        gozAraligiEn: calculateGozAraligi(dbProduct.hasir_tipi || 'NCBK', 'en'),
        gozAraligiBoy: calculateGozAraligi(dbProduct.hasir_tipi || 'NCBK', 'boy'),
        source: 'database',
        productType: 'NCBK',
        ...dbProduct
      }));

      setExcelProgress({ current: 5, total: 8, operation: 'NTEL ürünleri formatlanıyor...' });
      
      const processedNTELProducts = allNTELProducts.map(dbProduct => ({
        existingStokKodu: dbProduct.stok_kodu,
        existingIngilizceIsim: dbProduct.ingilizce_isim,
        hasirTipi: dbProduct.hasir_tipi || 'NTEL',
        uzunlukBoy: dbProduct.ebat_boy?.toString() || '0',
        uzunlukEn: dbProduct.ebat_en?.toString() || '0',
        boyCap: dbProduct.cap?.toString() || '0',
        enCap: dbProduct.cap2?.toString() || '0',
        totalKg: dbProduct.kg?.toString() || '0',
        adetKg: dbProduct.kg?.toString() || '0',
        cubukSayisiBoy: dbProduct.ic_cap_boy_cubuk_ad,
        cubukSayisiEn: dbProduct.dis_cap_en_cubuk_ad,
        ic_cap_boy_cubuk_ad: dbProduct.ic_cap_boy_cubuk_ad,
        dis_cap_en_cubuk_ad: dbProduct.dis_cap_en_cubuk_ad,
        gozAraligiEn: calculateGozAraligi(dbProduct.hasir_tipi || 'NTEL', 'en'),
        gozAraligiBoy: calculateGozAraligi(dbProduct.hasir_tipi || 'NTEL', 'boy'),
        source: 'database',
        productType: 'NTEL',
        ...dbProduct
      }));

      // Combine all products for Excel generation
      const allProcessedProducts = [...processedProducts, ...processedNCBKProducts, ...processedNTELProducts];
      console.log(`🚀 BULK EXCEL: Total processed products: ${allProcessedProducts.length}`);
      console.log('🚀 BULK EXCEL: Sample MM product:', processedProducts[0]);
      console.log('🚀 BULK EXCEL: Sample NCBK product:', processedNCBKProducts[0]);

      // 4. Create recipe lookup maps for fast access
      setExcelProgress({ current: 6, total: 8, operation: 'Reçete verileri indeksleniyor...' });
      
      const receteLookup = {
        MM: new Map(),
        NCBK: new Map(),
        NTEL: new Map()
      };

      // Index all recipes by mamul_kodu for fast lookup
      allMMRecetes.forEach(recipe => {
        const key = recipe.mamul_kodu;
        if (!receteLookup.MM.has(key)) {
          receteLookup.MM.set(key, []);
        }
        receteLookup.MM.get(key).push(recipe);
      });

      allNCBKRecetes.forEach(recipe => {
        const key = recipe.mamul_kodu;
        if (!receteLookup.NCBK.has(key)) {
          receteLookup.NCBK.set(key, []);
        }
        receteLookup.NCBK.get(key).push(recipe);
      });

      allNTELRecetes.forEach(recipe => {
        const key = recipe.mamul_kodu;
        if (!receteLookup.NTEL.has(key)) {
          receteLookup.NTEL.set(key, []);
        }
        receteLookup.NTEL.get(key).push(recipe);
      });

      console.log(`🚀 BULK EXCEL: Indexed recipes - MM(${receteLookup.MM.size}), NCBK(${receteLookup.NCBK.size}), NTEL(${receteLookup.NTEL.size}) unique products`);

      // 5. Generate Excel files with the bulk data and recipes
      setExcelProgress({ current: 7, total: 8, operation: 'Excel dosyaları oluşturuluyor...' });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      
      // Initialize batch sequence
      await initializeBatchSequence();
      
      // Generate Excel files with recipe data
      await generateBulkStokKartiExcel(allProcessedProducts, timestamp);
      await generateBulkReceteExcel(allProcessedProducts, receteLookup, timestamp);
      await generateBulkAlternatifReceteExcel(allProcessedProducts, receteLookup, timestamp);
      
      setExcelProgress({ current: 8, total: 8, operation: 'Tamamlandı!' });
      
      toast.success(`Toplu Excel oluşturma tamamlandı! ${allProcessedProducts.length} ürün işlendi.`);
      console.log(`🚀 BULK EXCEL: Successfully generated Excel files for ${allProcessedProducts.length} products`);
      
    } catch (error) {
      console.error('🚀 BULK EXCEL ERROR:', error);
      toast.error('Toplu Excel oluşturma sırasında hata oluştu: ' + error.message);
    } finally {
      setIsGeneratingExcel(false);
      setExcelProgress({ current: 0, total: 0, operation: '' });
    }
  }, []);

  // Helper function to calculate göz aralığı from mesh type
  const calculateGozAraligi = (hasirTipi, direction) => {
    // Use the same mesh configurations from the correct_iyilestir_with_configs.js
    const MESH_CONFIGS = {
      'R257': { boyAralik: 15, enAralik: 25 },
      'TR257': { boyAralik: 30, enAralik: 15 },
      'Q257': { boyAralik: 15, enAralik: 15 },
      'Q221': { boyAralik: 15, enAralik: 15 },
    };
    
    // Handle Q combinations like Q257/257
    let configKey = hasirTipi;
    if (hasirTipi.includes('/')) {
      configKey = hasirTipi.split('/')[0];
    }
    
    const config = MESH_CONFIGS[configKey] || { boyAralik: 15, enAralik: 15 };
    return direction === 'boy' ? config.boyAralik : config.enAralik;
  };

  // Stok Kartı Excel oluştur
  const generateStokKartiExcel = async (products, timestamp, includeAllProducts) => {
    // Initialize batch sequence before any stok kodu generation
    await initializeBatchSequence();
    
    const workbook = new ExcelJS.Workbook();
    
    // CH STOK sheet oluştur
    const chSheet = workbook.addWorksheet('CH STOK');
    const chHeaders = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Grup İsmi', 'Kod-1', 'Kod-2', 'İngilizce İsim',
      'Alış KDV Oranı', 'Satış KDV Oranı', 'Muh. Detay ', 'Depo Kodu',
      'Br-1', 'Br-2', 'Pay-1', 'Payda-1', 'Çevrim Değeri-1',
      'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2', 'Çevrim Değeri-2',
      'Hasır Tipi', 'Çap', 'Çap2', 'Ebat(Boy)', 'Ebat(En)', 'Göz Aralığı', 'KG',
      'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Özel Saha 2 (Say.)',
      'Özel Saha 3 (Say.)', 'Özel Saha 4 (Say.)', 'Özel Saha 1 (Alf.)',
      'Özel Saha 2 (Alf.)', 'Özel Saha 3 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi',
      'Satış Fiyatı-1', 'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4',
      'Döviz Tip', 'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı',
      'Azami Stok', 'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Alış Döviz Tipi',
      'Bekleme Süresi', 'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar',
      'Stok Türü', 'Mali Grup Kodu', 'Özel Saha 8 (Alf.)', 'Kod-3', 'Kod-4',
      'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 'Bağlı Stok Kodu',
      'Yapılandırma Kodu', 'Yap. Açıklama',
      // Extra columns from our app format (not in CSV template)
      'Türü', 'Mamul Grup', 'Girişlerde Seri Numarası Takibi Yapılsın',
      'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    chSheet.addRow(chHeaders);

    // CH ürünlerini ekle - SADECE CH ürünleri işle
    let excelBatchIndex = 0;
    const chProducts = products.filter(product => {
      return product.existingStokKodu?.startsWith('CH') || !product.existingStokKodu?.startsWith('YM.');
    });
    
    console.log(`🔧 FILTERING DEBUG - Total products: ${products.length}, CH products: ${chProducts.length}`);
    console.log('🔧 Product types:', products.map(p => ({ stokKodu: p.existingStokKodu, hasirTipi: p.hasirTipi })));
    
    for (const product of chProducts) {
      // For Excel generation, process all products regardless of optimization status
        // For saved products, use existing Stok Kodu; for new products, generate new one
        const stokKodu = product.existingStokKodu || generateStokKodu(product, 'CH', excelBatchIndex);
        const stokAdi = generateStokAdi(product, 'CH');
        // Use existing İngilizce İsim from database if available (already cleaned), otherwise generate
        const ingilizceIsim = product.existingIngilizceIsim || generateIngilizceIsim(product, 'CH');
        const gozAraligi = formatGozAraligi(product);
        excelBatchIndex++;
        
        const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                           (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25');
        
        // 🔧 CRITICAL FIX: Ensure we use database columns OR fallback values correctly
        const finalCubukSayisiBoy = product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0;
        const finalCubukSayisiEn = product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0;
        
        console.log(`🔧 EXCEL GENERATION DEBUG - Product ${stokKodu}:`);
        console.log('  originalCubukSayisiBoy:', product.cubukSayisiBoy);
        console.log('  originalCubukSayisiEn:', product.cubukSayisiEn);
        console.log('  databaseBoyCubuk:', product.ic_cap_boy_cubuk_ad);
        console.log('  databaseEnCubuk:', product.dis_cap_en_cubuk_ad);
        console.log('  finalCubukSayisiBoy:', finalCubukSayisiBoy);
        console.log('  finalCubukSayisiEn:', finalCubukSayisiEn);
        console.log('  hasirTipi:', product.hasirTipi);
        console.log('  uzunlukBoy:', product.uzunlukBoy);
        console.log('  uzunlukEn:', product.uzunlukEn);
        console.log('  isFromDatabase:', !!product.existingStokKodu);
        console.log('  source:', product.source || 'unknown');
        
        // 🔧 MASSIVE DEBUG - Log the EXACT values going into Excel row
        const excelCubukBoy = parseInt(finalCubukSayisiBoy);
        const excelCubukEn = parseInt(finalCubukSayisiEn);
        console.log(`🔧 EXCEL ROW VALUES - Product ${stokKodu}:`);
        console.log('  Excel Boy Cubuk (position 28):', excelCubukBoy);
        console.log('  Excel En Cubuk (position 29):', excelCubukEn);
        console.log('  These are the EXACT values being written to Excel!');
        
        chSheet.addRow([
          // 1-7: Basic info (Stok Kodu, Stok Adı, Grup Kodu, Grup İsmi, Kod-1, Kod-2, İngilizce İsim)
          stokKodu, stokAdi, 'MM', '', 'HSR', isStandard ? 'STD' : 'OZL', ingilizceIsim,
          // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
          '20', '20', '31', '36',
          // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
          'KG', 'AD', '1', toExcelDecimal(parseFloat(product.totalKg || product.adetKg || 0).toFixed(5)), '',
          // 17-20: More conversions (Ölçü Br-3, Çevrim Pay-2, Çevrim Payda-2, Çevrim Değeri-2)
          '', '1', '1', '1',
          // 21-27: Product specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
          product.hasirTipi, toExcelDecimal(parseFloat(product.boyCap || 0).toFixed(1)), toExcelDecimal(parseFloat(product.enCap || 0).toFixed(1)), 
          parseInt(product.uzunlukBoy || 0), parseInt(product.uzunlukEn || 0), gozAraligi, toExcelDecimal(parseFloat(product.totalKg || product.adetKg || 0).toFixed(5)),
          // 🔧 CRITICAL FIX: Use the final calculated values (database OR fallback)
          excelCubukBoy, excelCubukEn, '0', '0', '0', '', '', '',
          // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
          '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
          // 46-55: Stock and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
          '0', '0', '', '0', '0', '0', '0', '0', '0', 'D',
          // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
          '', '', '', '', '', 'H', 'H', '', '', '',
          // 66-69: Extra columns from our app format (not in CSV template)
          stokKodu, 'MM', 'E', 'E'
        ]);
    }

    // YM NCBK STOK sheet oluştur
    const ncbkSheet = workbook.addWorksheet('YM NCBK STOK');
    const ncbkHeaders = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Grup İsmi', 'Kod-1', 'Kod-2', 'İngilizce İsim',
      'Alış KDV Oranı', 'Satış KDV Oranı', 'Muh. Detay ', 'Depo Kodu',
      'Br-1', 'Br-2', 'Pay-1', 'Payda-1', 'Çevrim Değeri-1',
      'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2', 'Çevrim Değeri-2',
      'Hasır Tipi', 'Çap', 'Çap2', 'Ebat(Boy)', 'Ebat(En)', 'Göz Aralığı', 'KG',
      'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Özel Saha 2 (Say.)',
      'Özel Saha 3 (Say.)', 'Özel Saha 4 (Say.)', 'Özel Saha 1 (Alf.)',
      'Özel Saha 2 (Alf.)', 'Özel Saha 3 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi',
      'Satış Fiyatı-1', 'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4',
      'Döviz Tip', 'Döviz Alış', 'Döviz Maliyeti',
      'Döviz Satış Fiyatı', 'Azami Stok', 'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi',
      'Alış Döviz Tipi', 'Bekleme Süresi', 'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar',
      'Stok Türü', 'Mali Grup Kodu', 'Özel Saha 8 (Alf.)', 'Kod-3', 'Kod-4',
      'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 'Bağlı Stok Kodu',
      'Yapılandırma Kodu', 'Yap. Açıklama',
      // Extra columns from our app format (not in CSV template)
      'Türü', 'Mamul Grup', 'Girişlerde Seri Numarası Takibi Yapılsın',
      'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    ncbkSheet.addRow(ncbkHeaders);

    // YM NTEL STOK sheet oluştur
    const ntelSheet = workbook.addWorksheet('YM NTEL STOK');
    const ntelHeaders = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Grup İsmi', 'Kod-1', 'Kod-2', 'İngilizce İsim',
      'Alış KDV Oranı', 'Satış KDV Oranı', 'Muh. Detay ', 'Depo Kodu',
      'Br-1', 'Br-2', 'Pay-1', 'Payda-1', 'Çevrim Değeri-1',
      'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2', 'Çevrim Değeri-2',
      'Hasır Tipi', 'Çap', 'Çap2', 'Ebat(Boy)', 'Ebat(En)', 'Göz Aralığı', 'KG',
      'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Özel Saha 2 (Say.)',
      'Özel Saha 3 (Say.)', 'Özel Saha 4 (Say.)', 'Özel Saha 1 (Alf.)',
      'Özel Saha 2 (Alf.)', 'Özel Saha 3 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi',
      'Satış Fiyatı-1', 'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4',
      'Döviz Tip', 'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı',
      'Azami Stok', 'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Alış Döviz Tipi',
      'Bekleme Süresi', 'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar',
      'Stok Türü', 'Mali Grup Kodu', 'Özel Saha 8 (Alf.)', 'Kod-3', 'Kod-4',
      'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 'Bağlı Stok Kodu',
      'Yapılandırma Kodu', 'Yap. Açıklama',
      // Extra columns from our app format (not in CSV template)
      'Türü', 'Mamul Grup', 'Girişlerde Seri Numarası Takibi Yapılsın',
      'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    ntelSheet.addRow(ntelHeaders);

    // Create correct NCBK ve NTEL ürünleri based on CH product requirements
    const uniqueNCBKProducts = new Set();
    const uniqueNTELProducts = new Set();
    
    products.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      
      // CORRECT MAPPING: For each CH product, create NCBK based on direction-specific requirements
      // Boy direction uses boyCap with actual uzunlukBoy length
      if (boyCap > 0) {
        const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        if (!uniqueNCBKProducts.has(boyKey)) {
          uniqueNCBKProducts.add(boyKey);
          
          const stokKodu = `YM.NCBK.${String(Math.round(boyCap * 100)).padStart(4, '0')}.${uzunlukBoy}`;
          const stokAdi = `YM Nervürlü Çubuk ${boyCap} mm ${uzunlukBoy} cm`;
          const ingilizceIsim = generateIngilizceIsim({cap: boyCap, length: uzunlukBoy}, 'NCBK');
          const ncbkWeight = (Math.PI * (boyCap/20) * (boyCap/20) * uzunlukBoy * 7.85 / 1000).toFixed(5);
          
          ncbkSheet.addRow([
            // 1-7: Basic info (Stok Kodu, Stok Adı, Grup Kodu, Grup İsmi, Kod-1, Kod-2, İngilizce İsim)
            stokKodu, stokAdi, 'YM', 'YARI MAMÜL', 'NCBK', '', ingilizceIsim,
            // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
            '20', '20', '20', '35',
            // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
            'AD', 'KG', '1', toExcelDecimal(parseFloat(ncbkWeight).toFixed(5)), '',
            // 17-20: More conversions (Ölçü Br-3, Çevrim Pay-2, Çevrim Payda-2, Çevrim Değeri-2)
            '', '1', '1', '1',
            // 21-27: Product specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
            '', toExcelDecimal(parseFloat(boyCap).toFixed(1)), '', uzunlukBoy, '', '', toExcelDecimal(parseFloat(ncbkWeight).toFixed(5)),
            // 28-35: Counts and custom fields (İç Çap/Boy Çubuk AD, Dış Çap/En Çubuk AD, Özel Saha 2-4 Say, Özel Saha 1-3 Alf)
            '0', '0', '0', '0', '0', '', '', '',
            // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
            '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
            // 46-55: Stock and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
            '0', '0', '', '0', '0', '0', '0', '0', '0', 'D',
            // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
            '', '', '', '', '', 'H', 'H', '', '', '',
            // 66-69: Extra columns from our app format (not in CSV template)
            stokKodu, 'YM', 'E', 'E'
          ]);
        }
        
        // Create NTEL for boyCap
        const boyNtelKey = boyCap.toString();
        if (!uniqueNTELProducts.has(boyNtelKey)) {
          uniqueNTELProducts.add(boyNtelKey);
          
          const ntelStokKodu = `YM.NTEL.${String(Math.round(boyCap * 100)).padStart(4, '0')}`;
          const ntelStokAdi = `YM Nervürlü Tel ${boyCap} mm`;
          const ntelIngilizceIsim = generateIngilizceIsim({cap: boyCap}, 'NTEL');
          const ntelWeight = (Math.PI * (boyCap/20) * (boyCap/20) * 100 * 7.85 / 1000).toFixed(5);
          
          ntelSheet.addRow([
            ntelStokKodu, ntelStokAdi, 'YM', 'YARI MAMÜL', 'NTEL', '', ntelIngilizceIsim, '20', '20', '20', '35',
            'MT', 'KG', '1', toExcelDecimal(ntelWeight), '', '', '1', '1', 'Y', '',
            toExcelDecimal(parseFloat(boyCap).toFixed(1)), '', '', '', '', toExcelDecimal(ntelWeight), '', '', '0', '0',
            '0', '', '', '', '0', '2', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
            '', '0', '0', '0', '0', '0', '0', 'D', '', '', '', '', '', 'H', 'H',
            ntelStokKodu, 'YM', '', 'E', 'E'
          ]);
        }
      }
      
      // En direction uses enCap with actual uzunlukEn length
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;
        if (!uniqueNCBKProducts.has(enKey)) {
          uniqueNCBKProducts.add(enKey);
          
          const stokKodu = `YM.NCBK.${String(Math.round(enCap * 100)).padStart(4, '0')}.${uzunlukEn}`;
          const stokAdi = `YM Nervürlü Çubuk ${enCap} mm ${uzunlukEn} cm`;
          const ingilizceIsim = generateIngilizceIsim({cap: enCap, length: uzunlukEn}, 'NCBK');
          const ncbkWeight = (Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000).toFixed(5);
          
          ncbkSheet.addRow([
            // 1-7: Basic info (Stok Kodu, Stok Adı, Grup Kodu, Grup İsmi, Kod-1, Kod-2, İngilizce İsim)
            stokKodu, stokAdi, 'YM', 'YARI MAMÜL', 'NCBK', '', ingilizceIsim,
            // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
            '20', '20', '20', '35',
            // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
            'AD', 'KG', '1', toExcelDecimal(parseFloat(ncbkWeight).toFixed(5)), '',
            // 17-20: More conversions (Ölçü Br-3, Çevrim Pay-2, Çevrim Payda-2, Çevrim Değeri-2)
            '', '1', '1', '1',
            // 21-27: Product specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
            '', toExcelDecimal(parseFloat(enCap).toFixed(1)), '', uzunlukEn, '', '', toExcelDecimal(parseFloat(ncbkWeight).toFixed(5)),
            // 28-35: Counts and custom fields (İç Çap/Boy Çubuk AD, Dış Çap/En Çubuk AD, Özel Saha 2-4 Say, Özel Saha 1-3 Alf)
            '0', '0', '0', '0', '0', '', '', '',
            // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
            '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
            // 46-55: Stock and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
            '0', '0', '', '0', '0', '0', '0', '0', '0', 'D',
            // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
            '', '', '', '', '', 'H', 'H', '', '', '',
            // 66-69: Extra columns from our app format (not in CSV template)
            stokKodu, 'YM', 'E', 'E'
          ]);
        }
        
        // Create NTEL for enCap if different from boyCap
        if (enCap !== boyCap) {
          const enNtelKey = enCap.toString();
          if (!uniqueNTELProducts.has(enNtelKey)) {
            uniqueNTELProducts.add(enNtelKey);
            
            const ntelStokKodu = `YM.NTEL.${String(Math.round(enCap * 100)).padStart(4, '0')}`;
            const ntelStokAdi = `YM Nervürlü Tel ${enCap} mm`;
            const ntelIngilizceIsim = generateIngilizceIsim({cap: enCap}, 'NTEL');
            const ntelWeight = (Math.PI * (enCap/20) * (enCap/20) * 100 * 7.85 / 1000).toFixed(5);
            
            ntelSheet.addRow([
              // 1-7: Basic info (Stok Kodu, Stok Adı, Grup Kodu, Grup İsmi, Kod-1, Kod-2, İngilizce İsim)
              ntelStokKodu, ntelStokAdi, 'YM', 'YARI MAMÜL', 'NTEL', '', ntelIngilizceIsim,
              // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
              '20', '20', '20', '35',
              // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
              'MT', 'KG', '1', toExcelDecimal(parseFloat(ntelWeight).toFixed(5)), '',
              // 17-20: More conversions (Ölçü Br-3, Çevrim Pay-2, Çevrim Payda-2, Çevrim Değeri-2)
              '', '1', '1', 'Y',
              // 21-27: Product specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
              '', toExcelDecimal(parseFloat(enCap).toFixed(1)), '', '', '', '', toExcelDecimal(parseFloat(ntelWeight).toFixed(5)),
              // 28-35: Counts and custom fields (İç Çap/Boy Çubuk AD, Dış Çap/En Çubuk AD, Özel Saha 2-4 Say, Özel Saha 1-3 Alf)
              '', '', '0', '0', '0', '', '', '',
              // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
              '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
              // 46-55: Stock and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
              '0', '0', '', '0', '0', '0', '0', '0', '0', 'D',
              // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
              '', '', '', '', '', 'H', 'H', ntelStokKodu, 'YM', '',
              // 66-69: Extra columns from our app format (not in CSV template)  
              'E', 'E'
            ]);
          }
        }
      }
    });

    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Stok_${timestamp}.xlsx`);
  };

  // Reçete Excel oluştur
  const generateReceteExcel = async (products, timestamp, includeAllProducts) => {
    // Initialize batch sequence before any stok kodu generation
    await initializeBatchSequence();
    
    const workbook = new ExcelJS.Workbook();
    
    const receteHeaders = [
      'Mamul Kodu(*)', 'Reçete Top.', 'Fire Oranı (%)', 'Oto.Reç.', 'Ölçü Br.', 
      'Sıra No(*)', 'Operasyon Bileşen', 'Bileşen Kodu(*)', 'Ölçü Br. - Bileşen',
      'Miktar(*)', 'Açıklama', 'Miktar Sabitle', 'Stok/Maliyet', 'Fire Mik.',
      'Sabit Fire Mik.', 'İstasyon Kodu', 'Hazırlık Süresi', 'Üretim Süresi',
      'Ü.A.Dahil Edilsin', 'Son Operasyon', 'Planlama Oranı',
      'Alternatif Politika - D.A.Transfer Fişi', 'Alternatif Politika - Ambar Ç. Fişi',
      'Alternatif Politika - Üretim S.Kaydı', 'Alternatif Politika - MRP', 'İÇ/DIŞ',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];

    // CH REÇETE sheet
    const chReceteSheet = workbook.addWorksheet('CH REÇETE');
    chReceteSheet.addRow(receteHeaders);

    // YM NCBK REÇETE sheet
    const ncbkReceteSheet = workbook.addWorksheet('YM NCBK REÇETE');
    ncbkReceteSheet.addRow(receteHeaders);

    // YM NTEL REÇETE sheet
    const ntelReceteSheet = workbook.addWorksheet('YM NTEL REÇETE');
    ntelReceteSheet.addRow(receteHeaders);

    // Reçete verilerini ekle - SADECE CH ürünleri için
    let receteBatchIndex = 0;
    const chProducts = products.filter(product => {
      return product.existingStokKodu?.startsWith('CH') || !product.existingStokKodu?.startsWith('YM.');
    });
    
    console.log(`🔧 RECIPE FILTERING DEBUG - Total products: ${products.length}, CH products: ${chProducts.length}`);
    
    for (const product of chProducts) {
      // For Excel generation, process all products regardless of optimization status
        const chStokKodu = product.existingStokKodu || generateStokKodu(product, 'CH', receteBatchIndex);
        receteBatchIndex++;
        
        // CH Reçete - Boy ve En çubuk tüketimleri
        // Determine mesh type pattern for quantities
        const isQType = product.hasirTipi && product.hasirTipi.includes('Q');
        const isRType = product.hasirTipi && product.hasirTipi.includes('R');
        
        // 🔧 CRITICAL FIX: Use already-calculated fallback/database cubuk values instead of recalculating
        // These values have already been processed through fallback formula and database fetch
        const enCubukMiktar = parseInt(product.cubukSayisiEn) || parseInt(product.dis_cap_en_cubuk_ad) || 0;
        const boyCubukMiktar = parseInt(product.cubukSayisiBoy) || parseInt(product.ic_cap_boy_cubuk_ad) || 0;
        
        console.log(`🔧 RECIPE GENERATION - Product ${chStokKodu}:`);
        console.log('  Using cubuk values - enCubukMiktar:', enCubukMiktar, 'boyCubukMiktar:', boyCubukMiktar);
        console.log('  Source: cubukSayisiEn:', product.cubukSayisiEn, 'cubukSayisiBoy:', product.cubukSayisiBoy);
        // Calculate YOTOCH operation time using our formula
        const operationTime = toExcelNumber(calculateOperationDuration('YOTOCH', product));
        
        // EN ÇUBUĞU (actual en length)
        chReceteSheet.addRow([
          chStokKodu, '1', '', '', '', '1', 'Bileşen',
          `YM.NCBK.${String(Math.round(parseFloat(product.enCap) * 100)).padStart(4, '0')}.${Math.round(parseFloat(product.uzunlukEn) || 0)}`, 
          'AD', enCubukMiktar, 'EN ÇUBUĞU ', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        
        // BOY ÇUBUĞU (actual boy length)  
        chReceteSheet.addRow([
          chStokKodu, '1', '', '', '', '2', 'Bileşen',
          `YM.NCBK.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}.${Math.round(parseFloat(product.uzunlukBoy) || 0)}`,
          'AD', boyCubukMiktar, 'BOY ÇUBUĞU', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        
        // YOTOCH Operasyon
        chReceteSheet.addRow([
          chStokKodu, '1', '', '', '', '3', 'Operasyon', 'YOTOCH',
          'DK', '1', '', '', '', '', '', '', '', operationTime,
          'E', 'E', '', '', '', '', '', '', ''
        ]);

    }
    
    // Create correct NCBK and NTEL recipes based on CH product requirements - avoid duplicates
    const processedNCBKRecipes = new Set();
    const processedNTELRecipes = new Set();
    
    products.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      
      // Boy direction uses boyCap with actual uzunlukBoy length
      if (boyCap > 0) {
        const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        if (!processedNCBKRecipes.has(boyKey)) {
          processedNCBKRecipes.add(boyKey);
            
            const ncbkStokKodu = `YM.NCBK.${String(Math.round(boyCap * 100)).padStart(4, '0')}.${uzunlukBoy}`;
            const FILMASIN_MAPPING = {
              4.45: 6.0, 4.50: 6.0, 4.75: 6.0, 4.85: 6.0, 5.00: 6.0,
              5.50: 6.5,
              6.00: 7.0,
              6.50: 7.5,
              7.00: 8.0,
              7.50: 9.0, 7.80: 9.0, 8.00: 9.0, 8.50: 9.0, 8.60: 9.0,
              9.20: 11.0,
              10.60: 12.0
            };
            
            const flmKodu = getFilmasinKodu(boyCap).code;
            const flmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * uzunlukBoy * 7.85 / 1000).toFixed(5);
            
            // Olcu Birimi: Originally was 'AD' for NCBK, now left empty per user request
            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', '', '1', 'Bileşen', flmKodu,
              'KG', toExcelDecimal(parseFloat(flmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
            
            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', '', '2', 'Operasyon', 'NDK01',
              'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { length: uzunlukBoy, boyCap: boyCap, enCap: boyCap })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        
        // NTEL recipe for boyCap
        const ntelKey = boyCap.toString();
        if (!processedNTELRecipes.has(ntelKey)) {
          processedNTELRecipes.add(ntelKey);
          
          const ntelStokKodu = `YM.NTEL.${String(Math.round(boyCap * 100)).padStart(4, '0')}`;
          const NTEL_FILMASIN_MAPPING = {
            4.45: 6.0, 4.50: 6.0, 4.75: 6.0, 4.85: 6.0, 5.00: 6.0,
            5.50: 6.5,
            6.00: 7.0,
            6.50: 7.5,
            7.00: 8.0,
            7.50: 9.0, 7.80: 9.0, 8.00: 9.0, 8.50: 9.0, 8.60: 9.0,
            9.20: 11.0,
            10.60: 12.0
          };
          let ntelFlmDiameter = NTEL_FILMASIN_MAPPING[boyCap];
          
          if (!ntelFlmDiameter) {
            if (boyCap <= 6.0) {
              ntelFlmDiameter = boyCap + 1.5;
            } else if (boyCap <= 8.0) {
              ntelFlmDiameter = boyCap + 1.5;
            } else {
              ntelFlmDiameter = boyCap + 2.0;
            }
            const ntelStandardSizes = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0];
            ntelFlmDiameter = ntelStandardSizes.find(s => s >= ntelFlmDiameter) || ntelFlmDiameter;
          }
          
          const ntelFlmQuality = ntelFlmDiameter >= 7.0 ? '1010' : '1008';
          const ntelFlmKodu = `FLM.${String(Math.round(ntelFlmDiameter * 100)).padStart(4, '0')}.${ntelFlmQuality}`;
          const ntelFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * 100 * 7.85 / 1000).toFixed(5);
          
          // Olcu Birimi: Originally was 'MT' for NTEL, now left empty per user request  
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', '', '1', 'Bileşen', ntelFlmKodu,
            'KG', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          // Olcu Birimi: Originally was 'DK' for NTEL operations, now left empty per user request
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', '', '2', 'Operasyon', 'NTLC01',
            'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', {boyCap: boyCap, enCap: boyCap})),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        }
      }
      
      // En direction uses enCap with actual uzunlukEn length
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;
        if (!processedNCBKRecipes.has(enKey)) {
          processedNCBKRecipes.add(enKey);
            
            const ncbkStokKodu = `YM.NCBK.${String(Math.round(enCap * 100)).padStart(4, '0')}.${uzunlukEn}`;
            const FILMASIN_MAPPING = {
              4.45: 6.0, 4.50: 6.0, 4.75: 6.0, 4.85: 6.0, 5.00: 6.0,
              5.50: 6.5,
              6.00: 7.0,
              6.50: 7.5,
              7.00: 8.0,
              7.50: 9.0, 7.80: 9.0, 8.00: 9.0, 8.50: 9.0, 8.60: 9.0,
              9.20: 11.0,
              10.60: 12.0
            };
            
            const flmKodu = getFilmasinKodu(enCap).code;
            const flmTuketimi = Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000;
            
            // Olcu Birimi: Originally was 'AD' for NCBK, now left empty per user request
            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', '', '1', 'Bileşen', flmKodu,
              'KG', toExcelDecimal(parseFloat(flmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
            
            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', '', '2', 'Operasyon', 'NDK01',
              'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { length: uzunlukEn, boyCap: enCap, enCap: enCap })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        
        // NTEL recipe for enCap if different from boyCap
        if (enCap !== boyCap) {
          const ntelKey = enCap.toString();
          if (!processedNTELRecipes.has(ntelKey)) {
            processedNTELRecipes.add(ntelKey);
            
            const ntelStokKodu = `YM.NTEL.${String(Math.round(enCap * 100)).padStart(4, '0')}`;
            const NTEL_FILMASIN_MAPPING = {
            4.45: 6.0, 4.50: 6.0, 4.75: 6.0, 4.85: 6.0, 5.00: 6.0,
            5.50: 6.5,
            6.00: 7.0,
            6.50: 7.5,
            7.00: 8.0,
            7.50: 9.0, 7.80: 9.0, 8.00: 9.0, 8.50: 9.0, 8.60: 9.0,
            9.20: 11.0,
            10.60: 12.0
          };
          let ntelFlmDiameter = NTEL_FILMASIN_MAPPING[enCap];
          
          if (!ntelFlmDiameter) {
            if (enCap <= 6.0) {
              ntelFlmDiameter = enCap + 1.5;
            } else if (enCap <= 8.0) {
              ntelFlmDiameter = enCap + 1.5;
            } else {
              ntelFlmDiameter = enCap + 2.0;
            }
            const ntelStandardSizes = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0];
            ntelFlmDiameter = ntelStandardSizes.find(s => s >= ntelFlmDiameter) || ntelFlmDiameter;
          }
          
          const ntelFlmQuality = ntelFlmDiameter >= 7.0 ? '1010' : '1008';
          const ntelFlmKodu = `FLM.${String(Math.round(ntelFlmDiameter * 100)).padStart(4, '0')}.${ntelFlmQuality}`;
          const ntelFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * 100 * 7.85 / 1000).toFixed(5);
          
          // Olcu Birimi: Originally was 'MT' for NTEL, now left empty per user request  
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', '', '1', 'Bileşen', ntelFlmKodu,
            'KG', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', '', '2', 'Operasyon', 'NTLC01',
            'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', {boyCap: enCap, enCap: enCap})),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          }
        }
      }
    });

    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Recete_${timestamp}.xlsx`);
  };

  // Alternatif Reçete Excel oluştur
  const generateAlternatifReceteExcel = async (products, timestamp, includeAllProducts) => {
    console.log('DEBUG: generateAlternatifReceteExcel started with', products.length, 'products');
    // Initialize batch sequence before any stok kodu generation
    await initializeBatchSequence();
    
    const workbook = new ExcelJS.Workbook();
    
    const receteHeaders = [
      'Mamul Kodu(*)', 'Reçete Top.', 'Fire Oranı (%)', 'Oto.Reç.', 'Ölçü Br.', 
      'Sıra No(*)', 'Operasyon Bileşen', 'Bileşen Kodu(*)', 'Ölçü Br. - Bileşen',
      'Miktar(*)', 'Açıklama', 'Miktar Sabitle', 'Stok/Maliyet', 'Fire Mik.',
      'Sabit Fire Mik.', 'İstasyon Kodu', 'Hazırlık Süresi', 'Üretim Süresi',
      'Ü.A.Dahil Edilsin', 'Son Operasyon', 'Planlama Oranı',
      'Alternatif Politika - D.A.Transfer Fişi', 'Alternatif Politika - Ambar Ç. Fişi',
      'Alternatif Politika - Üretim S.Kaydı', 'Alternatif Politika - MRP', 'İÇ/DIŞ',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];

    // CH REÇETE sheet (NTEL bazlı)
    const chReceteSheet = workbook.addWorksheet('CH REÇETE');
    chReceteSheet.addRow(receteHeaders);

    // YM NCBK REÇETE sheet
    const ncbkReceteSheet = workbook.addWorksheet('YM NCBK REÇETE');
    ncbkReceteSheet.addRow(receteHeaders);

    // YM NTEL REÇETE sheet
    const ntelReceteSheet = workbook.addWorksheet('YM NTEL REÇETE');
    ntelReceteSheet.addRow(receteHeaders);

    // Alternatif reçete verilerini ekle (NTEL bazlı) - SADECE CH ürünleri için
    let altReceteBatchIndex = 0;
    const chProducts = products.filter(product => {
      return product.existingStokKodu?.startsWith('CH') || !product.existingStokKodu?.startsWith('YM.');
    });
    
    console.log(`🔧 ALT RECIPE FILTERING DEBUG - Total products: ${products.length}, CH products: ${chProducts.length}`);
    console.log('DEBUG: Starting CH reçete generation for', chProducts.length, 'products');
    let chRowCount = 0;
    for (const product of chProducts) {
      // For Excel generation, process all products regardless of optimization status
        const chStokKodu = product.existingStokKodu || generateStokKodu(product, 'CH', altReceteBatchIndex);
        console.log('DEBUG: Processing product with stok kodu:', chStokKodu, 'boyCap:', product.boyCap, 'enCap:', product.enCap, 'cubukSayisiBoy:', product.cubukSayisiBoy, 'cubukSayisiEn:', product.cubukSayisiEn);
        altReceteBatchIndex++;
        const boyLength = parseFloat(product.cubukSayisiBoy || 0) * 500;
        const enLength = parseFloat(product.cubukSayisiEn || 0) * 215;
        const totalLength = boyLength + enLength; // cm cinsinden
        
        // CORRECT: Use NTEL components for CH Alternatif Recipe instead of Filmaşin
        const boyCap = parseFloat(product.boyCap || 0);
        const enCap = parseFloat(product.enCap || 0);
        const cubukSayisiBoyValue = parseFloat(product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0);
        const cubukSayisiEnValue = parseFloat(product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0);

        // Validate all numeric values are valid
        if (isNaN(boyCap) || isNaN(enCap) || isNaN(cubukSayisiBoyValue) || isNaN(cubukSayisiEnValue)) {
          console.warn('Invalid numeric values detected in NTEL calculation for product:', product.existingStokKodu || 'unknown');
          console.warn('Values:', { boyCap: product.boyCap, enCap: product.enCap, cubukSayisiBoy: product.cubukSayisiBoy, cubukSayisiEn: product.cubukSayisiEn });
          // Continue with 0 values instead of NaN
        }
        
        // Boy direction NTEL consumption
        if (boyCap > 0 && cubukSayisiBoyValue > 0) {
          const boyNtelKodu = `YM.NTEL.${String(Math.round(boyCap * 100)).padStart(4, '0')}`;
          const boyNtelMiktar = (cubukSayisiBoyValue * 5).toFixed(5); // 5 meters per cubuk
          
          // Olcu Birimi: Originally was 'MT' for CH alternatif recipe, now left empty per user request
          chReceteSheet.addRow([
            chStokKodu, '1', '0', '', '', '1', 'Bileşen',
            boyNtelKodu,
            'MT', toExcelDecimal(boyNtelMiktar), 'Boy NTEL Tüketimi', '', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', ''
          ]);
          chRowCount++;
          console.log('DEBUG: Added CH row for boy NTEL:', boyNtelKodu, 'miktar:', boyNtelMiktar);
        }
        
        // En direction NTEL consumption (if different from boy)
        if (enCap > 0 && enCap !== boyCap && cubukSayisiEnValue > 0) {
          const enNtelKodu = `YM.NTEL.${String(Math.round(enCap * 100)).padStart(4, '0')}`;
          const enNtelMiktar = (cubukSayisiEnValue * 2.15).toFixed(5); // 2.15 meters per cubuk
          
          // Olcu Birimi: Originally was 'MT' for CH alternatif recipe, now left empty per user request
          chReceteSheet.addRow([
            chStokKodu, '1', '0', '', '', '2', 'Bileşen',
            enNtelKodu,
            'MT', toExcelDecimal(enNtelMiktar), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', ''
          ]);
        } else if (enCap > 0 && enCap === boyCap && cubukSayisiEnValue > 0) {
          // Same diameter for both directions
          const enNtelKodu = `YM.NTEL.${String(Math.round(enCap * 100)).padStart(4, '0')}`;
          const enNtelMiktar = Math.round(cubukSayisiEnValue * 2.15);
          
          // Olcu Birimi: Originally was 'MT' for CH alternatif recipe, now left empty per user request
          chReceteSheet.addRow([
            chStokKodu, '1', '0', '', '', '2', 'Bileşen',
            enNtelKodu,
            'MT', toExcelDecimal(parseFloat(enNtelMiktar).toFixed(5)), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', ''
          ]);
        }
        
        // Olcu Birimi: Originally was 'DK' for CH alternatif recipe operations, now left empty per user request
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', '', '3', 'Operasyon', 'OTOCH',
          'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('OTOCH', product)),
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        
    }
    
    // Create unique NCBK and NTEL recipes for alternative recipe sheet - avoid duplicates
    const processedAltNCBKRecipes = new Set();
    const processedAltNTELRecipes = new Set();
    
    products.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      
      // Boy direction uses boyCap with actual uzunlukBoy length
      if (boyCap > 0) {
        const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        if (!processedAltNCBKRecipes.has(boyKey)) {
          processedAltNCBKRecipes.add(boyKey);
            
          const ncbkStokKodu = `YM.NCBK.${String(Math.round(boyCap * 100)).padStart(4, '0')}.${uzunlukBoy}`;
          const flmInfo = getFilmasinKodu(boyCap);
          const flmDiameter = flmInfo.diameter;
          const flmQuality = flmInfo.quality;
          const ncbkFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * uzunlukBoy * 7.85 / 1000).toFixed(5); // kg
          
          // Olcu Birimi: Originally was 'AD' for NCBK alternatif recipe, now left empty per user request
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', '', '1', 'Bileşen',
            flmInfo.code,
            'KG', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          // Olcu Birimi: Originally was 'DK' for NCBK alternatif recipe operations, now left empty per user request
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', '', '2', 'Operasyon', 'NDK01',
            'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukBoy, boyCap: boyCap, enCap: boyCap })),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        }
      }
      
      // En direction uses enCap with actual uzunlukEn length
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;
        if (!processedAltNCBKRecipes.has(enKey)) {
          processedAltNCBKRecipes.add(enKey);
            
          const ncbkStokKodu = `YM.NCBK.${String(Math.round(enCap * 100)).padStart(4, '0')}.${uzunlukEn}`;
          const flmInfo = getFilmasinKodu(enCap);
          const flmDiameter = flmInfo.diameter;
          const flmQuality = flmInfo.quality;
          const ncbkFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000).toFixed(5); // kg
          
          // Olcu Birimi: Originally was 'AD' for NCBK alternatif recipe, now left empty per user request
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', '', '1', 'Bileşen',
            flmInfo.code,
            'KG', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', '', '2', 'Operasyon', 'NDK01',
            'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: 215, boyCap: enCap, enCap: enCap })),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        }
      }
        
      // NTEL REÇETE entries (unique diameters only)
      if (boyCap > 0) {
        const boyNtelKey = boyCap.toString();
        if (!processedAltNTELRecipes.has(boyNtelKey)) {
          processedAltNTELRecipes.add(boyNtelKey);
          
          const ntelStokKodu = `YM.NTEL.${String(Math.round(boyCap * 100)).padStart(4, '0')}`;
          const flmInfo = getFilmasinKodu(boyCap);
          const flmDiameter = flmInfo.diameter;
          const flmQuality = flmInfo.quality;
          const ntelFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * 100 * 7.85 / 1000).toFixed(5); // kg per meter
          
          // Olcu Birimi: Originally was 'MT' for NTEL alternatif recipe, now left empty per user request
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', '', '1', 'Bileşen',
            flmInfo.code,
            'KG', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          // Olcu Birimi: Originally was 'DK' for NTEL alternatif recipe operations, now left empty per user request
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', '', '2', 'Operasyon', 'NTLC01',
            'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { ...product, boyCap: boyCap })),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        }
      }
      
      if (enCap > 0 && enCap !== boyCap) {
        const enNtelKey = enCap.toString();
        if (!processedAltNTELRecipes.has(enNtelKey)) {
          processedAltNTELRecipes.add(enNtelKey);
          
          const ntelStokKodu = `YM.NTEL.${String(Math.round(enCap * 100)).padStart(4, '0')}`;
          const flmInfo = getFilmasinKodu(enCap);
          const flmDiameter = flmInfo.diameter;
          const flmQuality = flmInfo.quality;
          const ntelFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * 100 * 7.85 / 1000).toFixed(5); // kg per meter
          
          // Olcu Birimi: Originally was 'MT' for NTEL alternatif recipe, now left empty per user request
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', '', '1', 'Bileşen',
            flmInfo.code,
            'KG', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', '', '2', 'Operasyon', 'NTLC01',
            'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { ...product, boyCap: enCap })),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        }
      }
    });

    // Excel dosyasını kaydet
    console.log('DEBUG: generateAlternatifReceteExcel - saving file with', products.length, 'products processed, CH rows added:', chRowCount);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Alternatif_Recete_${timestamp}.xlsx`);
    console.log('DEBUG: generateAlternatifReceteExcel completed successfully');
  };

  // BULK Excel generation functions that use pre-downloaded database data
  const generateBulkStokKartiExcel = async (allProducts, timestamp) => {
    console.log('🚀 BULK STOK KARTI: Processing', allProducts.length, 'products');
    
    const workbook = new ExcelJS.Workbook();
    
    // Create all three sheets
    const chSheet = workbook.addWorksheet('CH STOK');
    const ncbkSheet = workbook.addWorksheet('YM NCBK STOK');
    const ntelSheet = workbook.addWorksheet('YM NTEL STOK');
    
    // Define headers (same as existing)
    const headers = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Grup İsmi', 'Kod-1', 'Kod-2', 'İngilizce İsim',
      'Alış KDV Oranı', 'Satış KDV Oranı', 'Muh. Detay ', 'Depo Kodu',
      'Br-1', 'Br-2', 'Pay-1', 'Payda-1', 'Çevrim Değeri-1',
      'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2', 'Çevrim Değeri-2',
      'Hasır Tipi', 'Çap', 'Çap2', 'Ebat(Boy)', 'Ebat(En)', 'Göz Aralığı', 'KG',
      'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Özel Saha 2 (Say.)',
      'Özel Saha 3 (Say.)', 'Özel Saha 4 (Say.)', 'Özel Saha 1 (Alf.)',
      'Özel Saha 2 (Alf.)', 'Özel Saha 3 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi',
      'Satış Fiyatı-1', 'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4',
      'Döviz Tip', 'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı',
      'Azami Stok', 'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Alış Döviz Tipi',
      'Bekleme Süresi', 'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar',
      'Stok Türü', 'Mali Grup Kodu', 'Özel Saha 8 (Alf.)', 'Kod-3', 'Kod-4',
      'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 'Bağlı Stok Kodu',
      'Yapılandırma Kodu', 'Yap. Açıklama',
      'Türü', 'Mamul Grup', 'Girişlerde Seri Numarası Takibi Yapılsın',
      'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    
    chSheet.addRow(headers);
    ncbkSheet.addRow(headers);
    ntelSheet.addRow(headers);

    // Process products by type
    allProducts.forEach(product => {
      const gozAraligi = formatGozAraligi(product);
      const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                         (gozAraligi === '15x15' || gozAraligi === '15x25');

      if (product.productType === 'MM') {
        // Generate CH STOK row - USE EXACT SAME LOGIC AS WORKING SINGLE PRODUCT EXCEL
        const finalCubukSayisiBoy = product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0;
        const finalCubukSayisiEn = product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0;
        
        // Use the exact same variable names and logic as working Excel
        const excelCubukBoy = parseInt(finalCubukSayisiBoy);
        const excelCubukEn = parseInt(finalCubukSayisiEn);
        
        chSheet.addRow([
          // 1-7: Basic info (Stok Kodu, Stok Adı, Grup Kodu, Grup İsmi, Kod-1, Kod-2, İngilizce İsim)
          product.existingStokKodu, product.stok_adi || generateStokAdi(product, 'CH'), 'MM', '', 'HSR', isStandard ? 'STD' : 'OZL', product.existingIngilizceIsim,
          // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
          '20', '20', '31', '36',
          // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
          'KG', 'AD', '1', toExcelDecimal(parseFloat(product.totalKg || product.adetKg || 0).toFixed(5)), '',
          // 17-20: More conversions (Ölçü Br-3, Çevrim Pay-2, Çevrim Payda-2, Çevrim Değeri-2)
          '', '1', '1', '1',
          // 21-27: Product specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
          product.hasirTipi, toExcelDecimal(parseFloat(product.boyCap || 0).toFixed(1)), toExcelDecimal(parseFloat(product.enCap || 0).toFixed(1)), 
          parseInt(product.uzunlukBoy || 0), parseInt(product.uzunlukEn || 0), gozAraligi, toExcelDecimal(parseFloat(product.totalKg || product.adetKg || 0).toFixed(5)),
          // 🔧 CRITICAL FIX: Use the same variables as working Excel
          excelCubukBoy, excelCubukEn, '0', '0', '0', '', '', '',
          // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
          '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
          // 46-55: Stock and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
          '0', '0', '', '0', '0', '0', '0', '0', '0', 'D',
          // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
          '', '', '', '', '', 'H', 'H', '', '', '',
          // 66-69: Extra columns from our app format (not in CSV template)
          product.existingStokKodu, 'MM', 'E', 'E'
        ]);
      } else if (product.productType === 'NCBK') {
        // Generate YM NCBK STOK row
        ncbkSheet.addRow([
          product.existingStokKodu, product.stok_adi || generateStokAdi(product, 'NCBK'), 'YM', 'YARI MAMÜL', 'NCBK', '', product.existingIngilizceIsim,
          '20', '20', '31', '36',
          'AD', 'KG', '1', toExcelDecimal(parseFloat(product.totalKg || product.adetKg || 0).toFixed(5)), '',
          '', '1', '1', '1',
          product.hasirTipi, toExcelDecimal(parseFloat(product.boyCap || 0).toFixed(1)), toExcelDecimal(parseFloat(product.enCap || 0).toFixed(1)), 
          parseInt(product.uzunlukBoy || 0), parseInt(product.uzunlukEn || 0), '', toExcelDecimal(parseFloat(product.totalKg || product.adetKg || 0).toFixed(5)),
          '0', '0', '0', '0', '0', '', '', '',
          '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
          '0', '0', '', '0', '0', '0', '0', '0', '0', 'H',
          '', '', '', '', '', 'H', 'H', '', '', '',
          product.existingStokKodu, 'NCBK', 'H', 'H'
        ]);
      } else if (product.productType === 'NTEL') {
        // Generate YM NTEL STOK row
        ntelSheet.addRow([
          product.existingStokKodu, product.stok_adi || generateStokAdi(product, 'NTEL'), 'YM', 'YARI MAMÜL', 'NTEL', '', product.existingIngilizceIsim,
          '20', '20', '31', '36',
          'MT', 'KG', '1', toExcelDecimal(parseFloat(product.totalKg || product.adetKg || 0).toFixed(5)), '',
          '', '1', '1', '1',
          product.hasirTipi, toExcelDecimal(parseFloat(product.boyCap || 0).toFixed(1)), toExcelDecimal(parseFloat(product.enCap || 0).toFixed(1)), 
          '0', '0', '', toExcelDecimal(parseFloat(product.totalKg || product.adetKg || 0).toFixed(5)),
          '0', '0', '0', '0', '0', '', '', '',
          '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
          '0', '0', '', '0', '0', '0', '0', '0', '0', 'H',
          '', '', '', '', '', 'H', 'H', '', '', '',
          product.existingStokKodu, 'NTEL', 'H', 'H'
        ]);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Bulk_Celik_Hasir_Stok_Karti_${timestamp}.xlsx`);
    console.log('🚀 BULK STOK KARTI: Excel generation completed');
  };

  const generateBulkReceteExcel = async (allProducts, receteLookup, timestamp) => {
    console.log('🚀 BULK RECIPE: Processing', allProducts.length, 'products');
    
    const workbook = new ExcelJS.Workbook();
    
    const receteHeaders = [
      'Mamul Kodu(*)', 'Reçete Top.', 'Fire Oranı (%)', 'Oto.Reç.', 'Ölçü Br.', 
      'Sıra No(*)', 'Operasyon Bileşen', 'Bileşen Kodu(*)', 'Ölçü Br. - Bileşen',
      'Miktar(*)', 'Açıklama', 'Miktar Sabitle', 'Stok/Maliyet', 'Fire Mik.',
      'Sabit Fire Mik.', 'İstasyon Kodu', 'Hazırlık Süresi', 'Üretim Süresi',
      'Ü.A.Dahil Edilsin', 'Son Operasyon', 'Planlama Oranı',
      'Alternatif Politika - D.A.Transfer Fişi', 'Alternatif Politika - Ambar Ç. Fişi',
      'Alternatif Politika - Üretim S.Kaydı', 'Alternatif Politika - MRP', 'İÇ/DIŞ',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];

    // Create separate sheets for each product type
    const chReceteSheet = workbook.addWorksheet('CH REÇETE');
    const ncbkReceteSheet = workbook.addWorksheet('YM NCBK REÇETE');
    const ntelReceteSheet = workbook.addWorksheet('YM NTEL REÇETE');
    
    chReceteSheet.addRow(receteHeaders);
    ncbkReceteSheet.addRow(receteHeaders);
    ntelReceteSheet.addRow(receteHeaders);

    // Process recipes from database data
    allProducts.forEach(product => {
      const productType = product.productType;
      const stokKodu = product.existingStokKodu;
      
      // Get recipes for this product from the lookup
      const recipes = receteLookup[productType]?.get(stokKodu) || [];
      
      if (recipes.length > 0) {
        console.log(`🚀 BULK RECIPE: Found ${recipes.length} recipes for ${stokKodu}`);
        
        // Add recipes to appropriate sheet
        recipes.forEach(recipe => {
          const recipeRow = [
            recipe.mamul_kodu || stokKodu,
            recipe.recete_top || 1,
            toExcelNumber(recipe.fire_orani || 0),
            recipe.oto_rec || '',
            recipe.olcu_br || '',
            recipe.sira_no || 1,
            recipe.operasyon_bilesen || '',
            recipe.bilesen_kodu || '',
            recipe.olcu_br_bilesen || '',
            recipe.miktar ? toExcelNumber(recipe.miktar) : '0',
            recipe.aciklama || '',
            recipe.miktar_sabitle || '',
            recipe.stok_maliyet || '',
            recipe.fire_mik || '',
            recipe.sabit_fire_mik || '',
            recipe.istasyon_kodu || '',
            recipe.hazirlik_suresi || '',
            recipe.uretim_suresi ? toExcelDecimal(parseFloat(recipe.uretim_suresi).toFixed(5)) : '',
            recipe.ua_dahil_edilsin || 'E',
            recipe.son_operasyon || 'E',
            recipe.planlama_orani || '',
            '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ];

          if (productType === 'MM') {
            chReceteSheet.addRow(recipeRow);
          } else if (productType === 'NCBK') {
            ncbkReceteSheet.addRow(recipeRow);
          } else if (productType === 'NTEL') {
            ntelReceteSheet.addRow(recipeRow);
          }
        });
      } else {
        console.log(`🚀 BULK RECIPE: No recipes found for ${stokKodu} (${productType})`);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Bulk_Celik_Hasir_Recete_${timestamp}.xlsx`);
    console.log('🚀 BULK RECIPE: Excel generation completed');
  };

  const generateBulkAlternatifReceteExcel = async (allProducts, receteLookup, timestamp) => {
    console.log('🚀 BULK ALT RECIPE: Processing', allProducts.length, 'products');
    
    const workbook = new ExcelJS.Workbook();
    
    const receteHeaders = [
      'Mamul Kodu(*)', 'Reçete Top.', 'Fire Oranı (%)', 'Oto.Reç.', 'Ölçü Br.', 
      'Sıra No(*)', 'Operasyon Bileşen', 'Bileşen Kodu(*)', 'Ölçü Br. - Bileşen',
      'Miktar(*)', 'Açıklama', 'Miktar Sabitle', 'Stok/Maliyet', 'Fire Mik.',
      'Sabit Fire Mik.', 'İstasyon Kodu', 'Hazırlık Süresi', 'Üretim Süresi',
      'Ü.A.Dahil Edilsin', 'Son Operasyon', 'Planlama Oranı',
      'Alternatif Politika - D.A.Transfer Fişi', 'Alternatif Politika - Ambar Ç. Fişi',
      'Alternatif Politika - Üretim S.Kaydı', 'Alternatif Politika - MRP', 'İÇ/DIŞ',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];

    const chReceteSheet = workbook.addWorksheet('CH REÇETE');
    const ncbkReceteSheet = workbook.addWorksheet('YM NCBK REÇETE');
    const ntelReceteSheet = workbook.addWorksheet('YM NTEL REÇETE');
    
    chReceteSheet.addRow(receteHeaders);
    ncbkReceteSheet.addRow(receteHeaders);
    ntelReceteSheet.addRow(receteHeaders);

    // Generate alternative recipes based on the current logic
    const processedAltNCBKRecipes = new Set();
    const processedAltNTELRecipes = new Set();
    
    // Process MM products for CH alternative recipes (NTEL-based)
    const mmProducts = allProducts.filter(p => p.productType === 'MM');
    
    mmProducts.forEach(product => {
      const chStokKodu = product.existingStokKodu;
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      const cubukSayisiBoyValue = parseFloat(product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0);
      const cubukSayisiEnValue = parseFloat(product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0);

      // Validate all numeric values are valid
      if (isNaN(boyCap) || isNaN(enCap) || isNaN(cubukSayisiBoyValue) || isNaN(cubukSayisiEnValue)) {
        console.warn('Bulk Excel - Invalid numeric values detected in NTEL calculation for product:', product.existingStokKodu || 'unknown');
        console.warn('Values:', { boyCap: product.boyCap, enCap: product.enCap, cubukSayisiBoy: product.cubukSayisiBoy, cubukSayisiEn: product.cubukSayisiEn });
        return; // Skip this product
      }
      
      // Boy direction NTEL consumption
      if (boyCap > 0 && cubukSayisiBoyValue > 0) {
        const boyNtelKodu = `YM.NTEL.${String(Math.round(boyCap * 100)).padStart(4, '0')}`;
        const boyNtelMiktar = Math.round(cubukSayisiBoyValue * 5);
        
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', '', '1', 'Bileşen',
          boyNtelKodu, 'MT', toExcelNumber(boyNtelMiktar), 'Boy NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
      }
      
      // En direction NTEL consumption
      if (enCap > 0 && cubukSayisiEnValue > 0) {
        const enNtelKodu = `YM.NTEL.${String(Math.round(enCap * 100)).padStart(4, '0')}`;
        const enNtelMiktar = Math.round(cubukSayisiEnValue * 2.15);
        
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', '', '2', 'Bileşen',
          enNtelKodu, 'MT', toExcelNumber(enNtelMiktar), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
      }
      
      // Operation
      chReceteSheet.addRow([
        chStokKodu, '1', '0', '', '', '3', 'Operasyon', 'OTOCH',
        'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('OTOCH', product)),
        'E', 'E', '', '', '', '', '', '', ''
      ]);
    });

    // Process unique NCBK recipes
    allProducts.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      
      // Generate NCBK recipes for unique cap-length combinations
      if (boyCap > 0) {
        const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        if (!processedAltNCBKRecipes.has(boyKey)) {
          processedAltNCBKRecipes.add(boyKey);
          
          const ncbkStokKodu = `YM.NCBK.${String(Math.round(boyCap * 100)).padStart(4, '0')}.${uzunlukBoy}`;
          const flmInfo = getFilmasinKodu(boyCap);
          const ncbkFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * uzunlukBoy * 7.85 / 1000).toFixed(5);
          
          // Filmaşin component
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', '', '1', 'Bileşen',
            flmInfo.code, 'KG', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          // Operation
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', '', '2', 'Operasyon', 'NDK01',
            'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukBoy, boyCap: boyCap, enCap: boyCap })),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        }
      }
      
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;
        if (!processedAltNCBKRecipes.has(enKey)) {
          processedAltNCBKRecipes.add(enKey);
          
          const ncbkStokKodu = `YM.NCBK.${String(Math.round(enCap * 100)).padStart(4, '0')}.${uzunlukEn}`;
          const flmInfo = getFilmasinKodu(enCap);
          const ncbkFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000).toFixed(5);
          
          // Filmaşin component
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', '', '1', 'Bileşen',
            flmInfo.code, 'KG', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          // Operation
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', '', '2', 'Operasyon', 'NDK01',
            'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukEn, boyCap: enCap, enCap: enCap })),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        }
      }
    });

    // Process unique NTEL recipes
    allProducts.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      
      [boyCap, enCap].forEach(cap => {
        if (cap > 0) {
          const ntelKey = cap.toString();
          if (!processedAltNTELRecipes.has(ntelKey)) {
            processedAltNTELRecipes.add(ntelKey);
            
            const ntelStokKodu = `YM.NTEL.${String(Math.round(cap * 100)).padStart(4, '0')}`;
            const flmInfo = getFilmasinKodu(cap);
            const ntelFlmTuketimi = (Math.PI * (cap/20) * (cap/20) * 100 * 7.85 / 1000).toFixed(5);
            
            // Filmaşin component
            ntelReceteSheet.addRow([
              ntelStokKodu, '1', '', '', '', '1', 'Bileşen',
              flmInfo.code, 'KG', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
            
            // Operation
            ntelReceteSheet.addRow([
              ntelStokKodu, '1', '', '', '', '2', 'Operasyon', 'NTLC01',
              'DK', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { ...product, boyCap: cap })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Bulk_Celik_Hasir_Alternatif_Recete_${timestamp}.xlsx`);
    console.log('🚀 BULK ALT RECIPE: Excel generation completed');
  };

  // Recipe kayıtlarını veritabanına kaydet
  const saveRecipeData = async (product, chResult, ncbkResults, ntelResult) => {
    try {
      console.log('*** saveRecipeData - ncbkResults keys:', Object.keys(ncbkResults));
      console.log('*** Product details - boyCap:', product.boyCap, 'enCap:', product.enCap, 'uzunlukBoy:', product.uzunlukBoy, 'uzunlukEn:', product.uzunlukEn);
      console.log('🚨 CRITICAL DEBUG - RECEIVED CUBUK VALUES:', {
        cubukSayisiBoy: product.cubukSayisiBoy,
        cubukSayisiEn: product.cubukSayisiEn,
        productType: typeof product.cubukSayisiEn,
        isNumber: !isNaN(product.cubukSayisiEn)
      });
      
      // DEFENSIVE CHECK: Ensure we have valid numbers
      const boyCubukValue = parseInt(product.cubukSayisiBoy) || 0;
      const enCubukValue = parseInt(product.cubukSayisiEn) || 0;
      
      console.log('🔒 FINAL VALUES BEING SAVED TO DATABASE:', {
        boyCubukValue,
        enCubukValue,
        hasirTipi: product.hasirTipi,
        uzunlukBoy: product.uzunlukBoy,
        uzunlukEn: product.uzunlukEn
      });
      
      // GENERATE NCBK codes directly from product dimensions - don't lookup in ncbkResults
      // MM recipe should always reference the required NCBKs regardless of whether they exist
      const boyBilesenKodu = `YM.NCBK.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}.${parseInt(product.uzunlukBoy || 0)}`;
      const enBilesenKodu = `YM.NCBK.${String(Math.round(parseFloat(product.enCap) * 100)).padStart(4, '0')}.${parseInt(product.uzunlukEn || 0)}`;
      
      console.log('*** Generated BOY ÇUBUĞU:', boyBilesenKodu);
      console.log('*** Generated EN ÇUBUĞU:', enBilesenKodu);
      
      // CH Recipe kayıtları
      const chRecipes = [
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'AD',
          sira_no: 1,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: boyBilesenKodu,
          olcu_br_bilesen: 'AD',
          miktar: boyCubukValue,  // USE VALIDATED VALUE
          aciklama: 'BOY ÇUBUĞU',
        },
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'AD',
          sira_no: 2,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: enBilesenKodu,
          olcu_br_bilesen: 'AD',
          miktar: enCubukValue,  // USE VALIDATED VALUE
          aciklama: 'EN ÇUBUĞU',
        },
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'DK',
          sira_no: 3,
          operasyon_bilesen: 'Operasyon',
          bilesen_kodu: 'YOTOCH',
          olcu_br_bilesen: 'DK',
          miktar: 1,
          aciklama: null,
          uretim_suresi: calculateOperationDuration('YOTOCH', product)
        }
      ];

      // CH recipes kaydet - paralel işlem
      await Promise.all(chRecipes.map(recipe =>
        fetchWithAuth(API_URLS.celikHasirMmRecete, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipe)
        })
      ));

      // NCBK Recipe kayıtları - Only create recipes for NEWLY created NCBK products
      console.log('🔍 NCBK Recipe Creation - ncbkResults:', ncbkResults);
      
      // Deduplicate NCBKs by stok_kodu to prevent creating duplicate recipes
      const processedNcbkStokKodus = new Set();
      
      for (const [key, ncbkResult] of Object.entries(ncbkResults)) {
        console.log(`📋 Processing NCBK recipe for key "${key}":`, {
          stok_kodu: ncbkResult?.stok_kodu,
          message: ncbkResult?.message,
          status: ncbkResult?.status
        });
        
        // Skip if not a valid result
        if (!ncbkResult || !ncbkResult.stok_kodu) {
          console.log(`⏭️ Skipping NCBK recipe - invalid result for key "${key}"`);
          continue;
        }
        
        // Skip if we've already processed this stok_kodu to prevent duplicate recipes
        if (processedNcbkStokKodus.has(ncbkResult.stok_kodu)) {
          console.log(`⏭️ Skipping NCBK recipe - already processed: ${ncbkResult.stok_kodu} (key: ${key})`);
          continue;
        }
        
        // Only create recipes for NCBKs that were NEWLY created in this save operation
        if (!ncbkResult.isNewlyCreated) {
          console.log(`⏭️ Skipping NCBK recipe - not newly created: ${ncbkResult.stok_kodu} (status: ${ncbkResult.status}, message: ${ncbkResult.message})`);
          continue;
        }
        
        // Mark this stok_kodu as processed
        processedNcbkStokKodus.add(ncbkResult.stok_kodu);
        
        console.log(`✅ Creating recipes for NEWLY created NCBK: ${ncbkResult.stok_kodu} (isNewlyCreated: true)`);
        
        // Extract cap and length from stok_kodu (e.g., YM.NCBK.0500.465 -> cap=5.0, length=465)
        const stokParts = ncbkResult.stok_kodu.match(/YM\.NCBK\.(\d{4})\.(\d+)/);
        if (!stokParts) {
          console.warn('Invalid NCBK stok kodu format:', ncbkResult.stok_kodu);
          continue;
        }
        
        const ncbkCap = parseInt(stokParts[1]) / 100; // Convert from 0500 to 5.0
        const ncbkLength = parseInt(stokParts[2]);
        
        const ncbkRecipes = [
          // Bileşen - FLM tüketimi
          {
            mamul_kodu: ncbkResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'AD',
            sira_no: 1,
            operasyon_bilesen: 'Bileşen',
            bilesen_kodu: getFilmasinKodu(ncbkCap).code,
            olcu_br_bilesen: 'KG',
            miktar: parseFloat((Math.PI * (ncbkCap/20) * (ncbkCap/20) * ncbkLength * 7.85 / 1000).toFixed(5)),
            aciklama: 'Filmaşin Tüketim Miktarı',
          },
          // Operasyon - Yarı Otomatik İşlem
          {
            mamul_kodu: ncbkResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'DK',
            sira_no: 2,
            operasyon_bilesen: 'Operasyon',
            bilesen_kodu: 'NDK01',
            olcu_br_bilesen: 'DK',
            miktar: 1,
            aciklama: '',
            uretim_suresi: calculateOperationDuration('NCBK', { ...product, length: ncbkLength, boyCap: ncbkCap, enCap: ncbkCap })
          }
        ];

        // NCBK recipes kaydet - paralel işlem with error handling
        const ncbkRecipeResults = await Promise.allSettled(ncbkRecipes.map(async (recipe) => {
          try {
            const response = await fetchWithAuth(API_URLS.celikHasirNcbkRecete, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(recipe)
            });
            if (response.status === 409) {
              console.log(`*** NCBK recipe already exists for ${recipe.mamul_kodu} - ${recipe.operasyon_bilesen}`);
              return { success: true, status: 'existing' };
            } else if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return { success: true, status: 'created' };
          } catch (error) {
            console.warn(`NCBK recipe creation failed for ${recipe.mamul_kodu}:`, error);
            return { success: false, error: error.message };
          }
        }));
        
        const successfulNcbkRecipes = ncbkRecipeResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failedNcbkRecipes = ncbkRecipeResults.filter(r => r.status === 'rejected' || !r.value?.success).length;
        console.log(`*** NCBK recipes: ${successfulNcbkRecipes} successful, ${failedNcbkRecipes} failed`);
      }

      // NTEL Recipe kayıtları - Only create recipes for NEWLY created NTEL products
      if (ntelResult && ntelResult.stok_kodu && ntelResult.isNewlyCreated) {
        console.log(`✅ Creating recipes for NEWLY created NTEL: ${ntelResult.stok_kodu} (isNewlyCreated: true)`);
        // Extract cap from stok_kodu (e.g., YM.NTEL.0650 -> cap=6.5)
        const ntelStokParts = ntelResult.stok_kodu.match(/YM\.NTEL\.(\d{4})/);
        const ntelCap = ntelStokParts ? parseInt(ntelStokParts[1]) / 100 : parseFloat(product.boyCap || 0);
        
        const ntelRecipes = [
          // Bileşen - FLM tüketimi
          {
            mamul_kodu: ntelResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'MT',
            sira_no: 1,
            operasyon_bilesen: 'Bileşen',
            bilesen_kodu: getFilmasinKodu(ntelCap).code,
            olcu_br_bilesen: 'KG',
            miktar: parseFloat((Math.PI * (ntelCap/20) * (ntelCap/20) * 100 * 7.85 / 1000).toFixed(5)),
            aciklama: 'Filmaşin Tüketim Miktarı',
          },
          // Operasyon - NTEL uses NTLC01 not OTOCH
          {
            mamul_kodu: ntelResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'DK',
            sira_no: 2,
            operasyon_bilesen: 'Operasyon',
            bilesen_kodu: 'NTLC01',
            olcu_br_bilesen: 'DK',
            miktar: 1,
            aciklama: null,
            uretim_suresi: calculateOperationDuration('NTEL', { ...product, boyCap: ntelCap })
          }
        ];

        // NTEL recipes kaydet - paralel işlem with error handling
        const ntelRecipeResults = await Promise.allSettled(ntelRecipes.map(async (recipe) => {
          try {
            const response = await fetchWithAuth(API_URLS.celikHasirNtelRecete, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(recipe)
            });
            if (response.status === 409) {
              console.log(`*** NTEL recipe already exists for ${recipe.mamul_kodu} - ${recipe.operasyon_bilesen}`);
              return { success: true, status: 'existing' };
            } else if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            return { success: true, status: 'created' };
          } catch (error) {
            console.warn(`NTEL recipe creation failed for ${recipe.mamul_kodu}:`, error);
            return { success: false, error: error.message };
          }
        }));
        
        const successfulNtelRecipes = ntelRecipeResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failedNtelRecipes = ntelRecipeResults.filter(r => r.status === 'rejected' || !r.value?.success).length;
        console.log(`*** NTEL recipes: ${successfulNtelRecipes} successful, ${failedNtelRecipes} failed`);
      } else if (ntelResult && ntelResult.stok_kodu) {
        console.log(`⏭️ Skipping NTEL recipe - not newly created: ${ntelResult.stok_kodu} (isNewlyCreated: ${ntelResult.isNewlyCreated})`);
      }

    } catch (error) {
      console.error('Recipe kaydetme hatası:', error);
      throw error;
    }
  };

  // Sequence güncelleme with dual backup system
  const updateSequences = async (product, actualSequenceNumber = null) => {
    try {
      console.log('*** Updating sequences with dual backup system');
      
      // CH sequence güncelle with UPSERT operation
      // CRITICAL FIX: Check stok_kodu first to determine if it's OZL or STD
      let isStandard = false;
      let kod2 = 'OZL'; // Default to OZL
      
      // If product has a stok_kodu, use that to determine type
      if (product.stok_kodu || product.existingStokKodu) {
        const stokKodu = product.stok_kodu || product.existingStokKodu;
        if (stokKodu.includes('CHOZL')) {
          kod2 = 'OZL';
          isStandard = false;
          console.log('*** Product classified as OZL based on stok_kodu:', stokKodu);
        } else if (stokKodu.includes('CHSTD')) {
          kod2 = 'STD';
          isStandard = true;
          console.log('*** Product classified as STD based on stok_kodu:', stokKodu);
        }
      } else {
        // Fallback to dimension-based classification only if no stok_kodu
        isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                     (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25');
        kod2 = isStandard ? 'STD' : 'OZL';
        console.log('*** Product classified based on dimensions - isStandard:', isStandard, 'kod2:', kod2);
      }
      
      console.log('*** Final classification - kod2:', kod2, 'isStandard:', isStandard);
      const capCode = isStandard ? String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0') : '';
      
      // For OZL products, implement dual sequence check and update
      if (kod2 === 'OZL' && actualSequenceNumber) {
        console.log('*** OZL product - checking both backup and actual sequences');
        
        // Get current sequences from state
        const ozlSequenceKey = Object.keys(sequences).find(key => key.startsWith('CH_OZL_')) || 'CH_OZL_';
        const ozlBackupKey = Object.keys(sequences).find(key => key.startsWith('CH_OZL_BACKUP')) || 'CH_OZL_BACKUP_';
        
        let currentActual = sequences[ozlSequenceKey] || 2443;
        let currentBackup = sequences[ozlBackupKey] || 2443;
        
        console.log('*** Current sequences - Actual:', currentActual, 'Backup:', currentBackup, 'New:', actualSequenceNumber);
        
        // Take the bigger sequence number and update both if needed
        const maxSequence = Math.max(currentActual, currentBackup, actualSequenceNumber);
        
        // Update actual sequence if it's stale
        if (maxSequence > currentActual) {
          console.log('*** Updating stale actual sequence from', currentActual, 'to', maxSequence);
          
          // First, find the existing sequence ID
          const existingSequenceResponse = await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=OZL`);
          if (existingSequenceResponse.ok) {
            const allSequences = await existingSequenceResponse.json();
            console.log('🔍 CRITICAL DEBUG - Backend returned:', allSequences.length, 'rows');
            
            // FRONTEND FILTERING - Backend query is buggy, filter here
            const existingSequences = allSequences.filter(seq => 
              seq.product_type === 'CH' && seq.kod_2 === 'OZL'
            );
            
            console.log('🔍 After frontend filtering - OZL sequences:', existingSequences.length);
            if (existingSequences.length > 0) {
              existingSequences.forEach((seq, index) => {
                console.log(`🔍 OZL Row ${index}:`, {
                  id: seq.id,
                  product_type: seq.product_type, 
                  kod_2: seq.kod_2,
                  cap_code: seq.cap_code,
                  last_sequence: seq.last_sequence
                });
              });
              
              // Update existing sequence using PUT - FIRST OZL ROW [0]
              const sequenceId = existingSequences[0].id;
              console.log('🚨 UPDATING OZL ROW ID:', sequenceId, 'with sequence:', maxSequence);
              await fetchWithAuth(`${API_URLS.celikHasirSequence}/${sequenceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ last_sequence: maxSequence })
              });
              console.log('*** Successfully updated existing OZL sequence');
            } else {
              console.log('*** No existing OZL sequence found, creating new one');
              const actualSequenceData = {
                product_type: 'CH',
                kod_2: 'OZL',
                cap_code: '',
                last_sequence: maxSequence
              };
              await fetchWithAuth(API_URLS.celikHasirSequence, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actualSequenceData)
              });
            }
          }
        }
        
        // Update backup sequence if it's stale
        if (maxSequence > currentBackup) {
          console.log('*** Updating stale backup sequence from', currentBackup, 'to', maxSequence);
          
          // First, find the existing backup sequence ID
          const existingBackupResponse = await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=OZL_BACKUP`);
          if (existingBackupResponse.ok) {
            const allBackups = await existingBackupResponse.json();
            console.log('🔍 CRITICAL DEBUG - Backend returned:', allBackups.length, 'backup rows');
            
            // FRONTEND FILTERING - Backend query is buggy, filter here
            const existingBackups = allBackups.filter(seq => 
              seq.product_type === 'CH' && seq.kod_2 === 'OZL_BACKUP'
            );
            
            console.log('🔍 After frontend filtering - OZL_BACKUP sequences:', existingBackups.length);
            if (existingBackups.length > 0) {
              existingBackups.forEach((seq, index) => {
                console.log(`🔍 OZL_BACKUP Row ${index}:`, {
                  id: seq.id,
                  product_type: seq.product_type, 
                  kod_2: seq.kod_2,
                  cap_code: seq.cap_code,
                  last_sequence: seq.last_sequence
                });
              });
              
              // Update existing backup sequence using PUT - FIRST OZL_BACKUP ROW [0]
              const backupId = existingBackups[0].id;
              console.log('🚨 UPDATING OZL_BACKUP ROW ID:', backupId, 'with sequence:', maxSequence);
              await fetchWithAuth(`${API_URLS.celikHasirSequence}/${backupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ last_sequence: maxSequence })
              });
              console.log('*** Successfully updated existing OZL_BACKUP sequence');
            } else {
              console.log('*** No existing OZL_BACKUP sequence found, creating new one');
              const backupSequenceData = {
                product_type: 'CH',
                kod_2: 'OZL_BACKUP',
                cap_code: '',
                last_sequence: maxSequence
              };
              await fetchWithAuth(API_URLS.celikHasirSequence, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backupSequenceData)
              });
            }
          }
        }
        
        // Update local sequences state to reflect the changes
        const updatedSequences = { ...sequences };
        updatedSequences[ozlSequenceKey] = maxSequence;
        updatedSequences[ozlBackupKey] = maxSequence;
        setSequences(updatedSequences);
        
        console.log('*** Dual sequence update completed. Both sequences now at:', maxSequence);
      } else if (kod2 === 'STD') {
        // For STD products only - UPDATE existing sequence, don't create new ones!
        console.log('*** STD product - updating specific cap code sequence for capCode:', capCode);
        
        // First, find the existing STD sequence for this cap_code
        const existingStdResponse = await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=STD&cap_code=${capCode}`);
        if (existingStdResponse.ok) {
          const existingStdSequences = await existingStdResponse.json();
          console.log('*** Found existing STD sequences for cap_code', capCode, ':', existingStdSequences);
          
          if (existingStdSequences.length > 0) {
            // Update existing STD sequence using PUT
            const stdSequenceId = existingStdSequences[0].id;
            console.log('*** Updating existing STD sequence ID:', stdSequenceId, 'with new sequence:', actualSequenceNumber);
            
            await fetchWithAuth(`${API_URLS.celikHasirSequence}/${stdSequenceId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ last_sequence: actualSequenceNumber || 0 })
            });
            console.log('*** Successfully updated STD sequence for cap_code:', capCode);
          } else {
            console.log('*** No existing STD sequence found for cap_code:', capCode, '- creating new one');
            const sequenceData = {
              product_type: 'CH',
              kod_2: kod2,
              cap_code: capCode,
              last_sequence: actualSequenceNumber || 0
            };
            
            await fetchWithAuth(API_URLS.celikHasirSequence, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sequenceData)
            });
          }
        } else {
          console.error('*** Failed to fetch existing STD sequences for cap_code:', capCode);
        }
      } else if (kod2 === 'OZL') {
        // OZL product without actualSequenceNumber - do nothing, don't update any sequences
        console.log('*** OZL product without sequence number - skipping sequence update');
      }
      
    } catch (error) {
      console.error('Sequence güncelleme hatası:', error);
    }
  };

  // Veritabanına kaydet
  const saveToDatabase = async (products) => {
    try {
      // Reset cancellation flag and saved products tracker for new session
      isSaveCancelledRef.current = false;
      currentSessionSavedProducts.current = [];
      
      // Create new AbortController for this save session
      saveAbortControllerRef.current = new AbortController();
      
      // IMMEDIATE UI FEEDBACK - Show progress modal immediately
      setIsLoading(true);
      setIsSavingToDatabase(true);
      setDatabaseProgress({ current: 0, total: 0, operation: 'Kaydetme işlemi başlatılıyor...', currentProduct: 'Sistem hazırlanıyor...' });
      
      // Reset batch sequence counter for new batch
      resetBatchSequenceCounter();
      
      // Update progress during initialization
      setDatabaseProgress({ current: 0, total: 0, operation: 'Sıra numaraları hazırlanıyor...', currentProduct: 'Batch sequence başlatılıyor...' });
      
      // Initialize batch sequence before any stok kodu generation
      await initializeBatchSequence();
      
      // Update progress for product analysis
      setDatabaseProgress({ current: 0, total: 0, operation: 'Ürünler analiz ediliyor...', currentProduct: 'Kaydedilecek ürünler belirleniyor...' });
      
      // Sadece kaydedilmesi gereken ürünleri kaydet
      const productsToSave = getProductsToSave();
      
      if (productsToSave.length === 0) {
        toast.warning('Kaydedilecek ürün bulunamadı.');
        return;
      }

      // Skip database refresh during save to avoid timeout - use existing data  
      setDatabaseProgress({ current: 0, total: 0, operation: 'Mevcut veriler kullanılıyor...', currentProduct: '' });
      
      console.log('Using existing database state for save operation (avoiding timeout)');
      
      // Use existing savedProducts instead of fetching fresh data to avoid timeout
      const freshSavedProducts = savedProducts;
      
      console.log('Fresh database state:', {
        mm: freshSavedProducts.mm.length,
        ncbk: freshSavedProducts.ncbk.length,
        ntel: freshSavedProducts.ntel.length,
        mmCodes: freshSavedProducts.mm.map(p => p.stok_kodu)
      });
      
      setSavedProducts(freshSavedProducts);
      
      // Create a map of Stok Adı to all related Stok Kodus
      const stokAdiToStokKodusMap = new Map();
      
      // Map all existing products by Stok Adı
      [...freshSavedProducts.mm, ...freshSavedProducts.ncbk, ...freshSavedProducts.ntel].forEach(p => {
        if (p.stok_adi) {
          if (!stokAdiToStokKodusMap.has(p.stok_adi)) {
            stokAdiToStokKodusMap.set(p.stok_adi, []);
          }
          stokAdiToStokKodusMap.get(p.stok_adi).push(p.stok_kodu);
        }
      });
      
      console.log('Stok Adı to Stok Kodus mapping:', Array.from(stokAdiToStokKodusMap.entries()));
      console.log('Sample database Stok Adı formats:', Array.from(stokAdiToStokKodusMap.keys()).slice(0, 3));
      
      // Duplicates'leri ÖNCE filtrele - sadece yeni ürünleri kaydet
      const newProducts = [];
      const skippedProducts = [];
      const batchDuplicates = []; // Track duplicates within current batch
      
      // First pass: identify duplicates within the batch itself
      setDatabaseProgress({ current: 0, total: productsToSave.length, operation: 'Batch içi duplikatlar kontrol ediliyor...', currentProduct: `${productsToSave.length} ürün analiz ediliyor...` });
      
      const batchStokAdiMap = new Map(); // Map Stok Adı to first occurrence index
      const batchUniqueProducts = []; // Products after removing batch duplicates
      
      for (let i = 0; i < productsToSave.length; i++) {
        const product = productsToSave[i];
        const productStokAdi = generateStokAdi(product, 'CH');
        
        // Update progress every 5 items to show progress during analysis
        if (i % 5 === 0 || i === productsToSave.length - 1) {
          setDatabaseProgress({ 
            current: i + 1, 
            total: productsToSave.length, 
            operation: 'Batch içi duplikatlar kontrol ediliyor...', 
            currentProduct: `${product.hasirTipi} (${product.uzunlukBoy}x${product.uzunlukEn}cm)` 
          });
        }
        
        if (batchStokAdiMap.has(productStokAdi)) {
          // This is a duplicate within the batch
          const firstOccurrenceIndex = batchStokAdiMap.get(productStokAdi);
          batchDuplicates.push({
            ...product,
            duplicateOfIndex: firstOccurrenceIndex,
            stokAdi: productStokAdi
          });
        } else {
          // First occurrence of this Stok Adı in the batch
          batchStokAdiMap.set(productStokAdi, i);
          batchUniqueProducts.push(product);
        }
      }
      
      // Second pass: check unique products against database
      setDatabaseProgress({ current: 0, total: batchUniqueProducts.length, operation: 'Veritabanı ile karşılaştırılıyor...', currentProduct: `${batchUniqueProducts.length} benzersiz ürün kontrol ediliyor...` });
      
      let dbCheckIndex = 0;
      for (const product of batchUniqueProducts) {
        dbCheckIndex++;
        
        // Update progress every 3 items to show progress during database comparison
        if (dbCheckIndex % 3 === 0 || dbCheckIndex === batchUniqueProducts.length) {
          setDatabaseProgress({ 
            current: dbCheckIndex, 
            total: batchUniqueProducts.length, 
            operation: 'Veritabanı ile karşılaştırılıyor...', 
            currentProduct: `${product.hasirTipi} (${product.uzunlukBoy}x${product.uzunlukEn}cm)` 
          });
        }
        
        // Generate Stok Adı for identification
        const productStokAdi = generateStokAdi(product, 'CH');
        
        // Debug: Log what we're comparing
        console.log('*** STOK ADI COMPARISON DEBUG ***');
        console.log('Generated Stok Adı:', JSON.stringify(productStokAdi));
        console.log('Product data:', {
          hasirTipi: product.hasirTipi,
          boyCap: product.boyCap,
          enCap: product.enCap,
          uzunlukBoy: product.uzunlukBoy,
          uzunlukEn: product.uzunlukEn,
          boyAraligi: product.boyAraligi,
          enAraligi: product.enAraligi,
          gozAraligi: product.gozAraligi
        });
        console.log('Exists in map?', stokAdiToStokKodusMap.has(productStokAdi));
        
        // Show a few database samples for comparison
        const dbSamples = Array.from(stokAdiToStokKodusMap.entries()).slice(0, 2);
        console.log('Database samples:', dbSamples.map(([key, codes]) => ({ stokAdi: key, codes })));
        
        // Check if product with same Stok Adı already exists
        const existingStokKodus = stokAdiToStokKodusMap.get(productStokAdi) || [];
        const chExists = existingStokKodus.length > 0;
        
        // Also check for NCBK/NTEL variants
        const ncbkStokAdi500 = `YM Nervürlü Çubuk ${product.boyCap} mm 500 cm`;
        const ncbkStokAdi215 = `YM Nervürlü Çubuk ${product.enCap} mm 215 cm`;
        const ntelStokAdi = `YM Nervürlü Tel ${product.boyCap} mm`;
        
        const ncbkExists500 = stokAdiToStokKodusMap.has(ncbkStokAdi500);
        const ncbkExists215 = stokAdiToStokKodusMap.has(ncbkStokAdi215);
        const ntelExists = stokAdiToStokKodusMap.has(ntelStokAdi);
        
        if (chExists && ncbkExists500 && ncbkExists215 && ntelExists) {
          console.log(`Ürün atlandı - zaten var: ${product.hasirTipi}`, {
            stokAdi: productStokAdi,
            existingStokKodus: existingStokKodus,
            chExists,
            ncbkExists500,
            ncbkExists215,
            ntelExists
          });
          skippedProducts.push({
            ...product,
            existingStokKodus: existingStokKodus,
            existingStokAdiVariants: {
              ch: existingStokKodus,
              ncbk500: stokAdiToStokKodusMap.get(ncbkStokAdi500) || [],
              ncbk215: stokAdiToStokKodusMap.get(ncbkStokAdi215) || [],
              ntel: stokAdiToStokKodusMap.get(ntelStokAdi) || []
            }
          });
        } else {
          console.log(`Yeni ürün eklenecek: ${product.hasirTipi}`, {
            stokAdi: productStokAdi,
            chExists,
            ncbkExists500,
            ncbkExists215,
            ntelExists,
            reason: !chExists ? 'CH missing' : !ncbkExists500 ? 'NCBK 500 missing' : !ncbkExists215 ? 'NCBK 215 missing' : 'NTEL missing'
          });
          // Generate stok_kodu for this new product
          const plannedStokKodu = generateStokKodu(product, 'CH', newProducts.length);
          
          // Store the generated stok_kodu for Excel generation later
          newProducts.push({
            ...product,
            existingStokKodu: plannedStokKodu
          });
        }
      }
      
      console.log('Filtreleme sonuçları:', {
        totalProducts: productsToSave.length,
        newProducts: newProducts.length,
        skippedProducts: skippedProducts.length
      });
      
      if (newProducts.length === 0) {
        // Show detailed info about skipped products with their existing Stok Kodus
        const allSkippedStokKodus = new Set();
        skippedProducts.forEach(p => {
          // Collect all Stok Kodus from all variants (CH, NCBK, NTEL)
          if (p.existingStokKodus) p.existingStokKodus.forEach(kod => allSkippedStokKodus.add(kod));
          if (p.existingStokAdiVariants?.ch) p.existingStokAdiVariants.ch.forEach(kod => allSkippedStokKodus.add(kod));
          if (p.existingStokAdiVariants?.ncbk500) p.existingStokAdiVariants.ncbk500.forEach(kod => allSkippedStokKodus.add(kod));
          if (p.existingStokAdiVariants?.ncbk215) p.existingStokAdiVariants.ncbk215.forEach(kod => allSkippedStokKodus.add(kod));
          if (p.existingStokAdiVariants?.ntel) p.existingStokAdiVariants.ntel.forEach(kod => allSkippedStokKodus.add(kod));
        });
        
        const skippedStokKodusList = Array.from(allSkippedStokKodus).sort();
        const skippedInfo = skippedProducts.slice(0, 3).map(p => p.hasirTipi).join(', ');
        
        const stokKodusDisplay = skippedStokKodusList.length > 10 
          ? `${skippedStokKodusList.slice(0, 10).join(', ')}... (+${skippedStokKodusList.length - 10} daha)`
          : skippedStokKodusList.join(', ');
          
        const message = skippedProducts.length > 3 
          ? `Tüm ürünler zaten veritabanında kayıtlı. ${skippedProducts.length} ürün atlandı. Örnekler: ${skippedInfo}...`
          : `Tüm ürünler zaten veritabanında kayıtlı. ${skippedProducts.length} ürün atlandı: ${skippedInfo}`;
        
        // Show a more detailed modal with all Stok Kodus
        console.log('*** SETTING MODAL DATA FOR SKIPPED PRODUCTS ***');
        console.log('skippedProducts:', skippedProducts);
        console.log('batchDuplicates:', batchDuplicates);
        console.log('allSkippedStokKodusList:', skippedStokKodusList);
        setPreSaveConfirmData({
          newProducts: [],
          skippedProducts: skippedProducts,
          batchDuplicates: batchDuplicates,
          allSkippedStokKodus: skippedStokKodusList
        });
        setShowPreSaveConfirmModal(true);
        
        toast.info(`${skippedProducts.length} mevcut ürün atlandı. Mevcut Stok Kodus: ${stokKodusDisplay}`);
        console.log('Hiçbir yeni ürün yok, Excel oluşturulmayacak. Atlanan ürünler:', skippedProducts);
        setIsSavingToDatabase(false);
        return [];
      }
      
      // Optimize edilmemiş ürün sayısını kontrol et
      const unoptimizedCount = newProducts.filter(p => !isProductOptimized(p)).length;
      
      // İlerleme tracking
      let processedCount = 0;
      const totalCount = newProducts.length;
      const duplicateMessage = batchDuplicates.length > 0 ? `, ${batchDuplicates.length} duplike ürün` : '';
      setDatabaseProgress({ 
        current: 0, 
        total: totalCount, 
        operation: `${newProducts.length} yeni ürün kaydediliyor, ${skippedProducts.length} mevcut ürün atlanıyor${duplicateMessage}...`,
        currentProduct: unoptimizedCount > 0 ? `(${unoptimizedCount} optimize edilmemiş)` : ''
      });
      
      // Track successfully saved products and errors
      const successfulProducts = [];
      const failedProducts = [];
      
      // Add longer initial delay for large batches to prepare server
      if (newProducts.length > 0) {
        // Longer delay for more products to avoid server overload
        const initialDelay = newProducts.length > 10 ? 3000 : 1000; // 3s for large batches, 1s for small
        console.log(`⏳ Preparing to save ${newProducts.length} products, waiting ${initialDelay}ms for server...`);
        setDatabaseProgress({ 
          current: 0, 
          total: newProducts.length, 
          operation: `${newProducts.length} ürün için sunucu hazırlanıyor...`,
          currentProduct: `${initialDelay/1000} saniye bekleniyor...`
        });
        
        await new Promise(resolve => setTimeout(resolve, initialDelay));
      }
      
      // BATCH COLLECTION: Collect all CH, NCBK, NTEL data first, then save in bulk
      console.log(`📦 Collecting data for ${newProducts.length} products for batch save...`);
      setDatabaseProgress({ 
        current: 0, 
        total: newProducts.length * 4, 
        operation: 'Ürün verileri hazırlanıyor...',
        currentProduct: 'Batch save için veriler toplanıyor...'
      });

      const allChData = [];
      const allNcbkData = [];
      const allNtelData = [];
      
      for (let i = 0; i < newProducts.length; i++) {
        // Check if collection was cancelled
        if (isSaveCancelledRef.current || saveAbortControllerRef.current?.signal.aborted) {
          console.log('🛑 Data collection cancelled by user');
          break;
        }
        
        const product = newProducts[i];
        
        setDatabaseProgress({ 
          current: i + 1, 
          total: newProducts.length, 
          operation: 'Ürün verileri toplanıyor...',
          currentProduct: `${product.hasirTipi} (${product.uzunlukBoy}x${product.uzunlukEn}cm)`
        });
        // CH kaydı
        const kgValue = parseFloat(product.adetKg || product.totalKg || 0);
        
        
        // Generate stok_kodu and capture it for sequence tracking
        let generatedStokKodu = generateStokKodu(product, 'CH', i);
        const chData = {
          stok_kodu: generatedStokKodu,
          stok_adi: generateStokAdi(product, 'CH'),
          grup_kodu: 'MM',
          kod_1: 'HSR',
          kod_2: (product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                  (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25')) ? 'STD' : 'OZL',
          ingilizce_isim: generateIngilizceIsim(product, 'CH'),
          // Standard columns from SQL
          alis_kdv_orani: 20,
          satis_kdv_orani: 20,
          muh_detay: 31,
          depo_kodu: 36,
          br_1: 'KG',
          br_2: 'AD',
          pay_1: 1,
          payda_1: parseFloat(kgValue.toFixed(5)),
          cevrim_degeri_1: 0,
          olcu_br_3: null,
          cevrim_pay_2: 1,
          cevrim_payda_2: 1,
          cevrim_degeri_2: 1,
          // Product specific columns
          hasir_tipi: normalizeHasirTipi(product.hasirTipi),
          cap: parseFloat(parseFloat(product.boyCap || 0).toFixed(1)),
          cap2: parseFloat(parseFloat(product.enCap || 0).toFixed(1)),
          ebat_boy: parseFloat(product.uzunlukBoy || 0),
          ebat_en: parseFloat(product.uzunlukEn || 0),
          goz_araligi: formatGozAraligi(product),
          kg: parseFloat(kgValue.toFixed(5)),
          ic_cap_boy_cubuk_ad: parseInt(product.cubukSayisiBoy || 0),
          dis_cap_en_cubuk_ad: parseInt(product.cubukSayisiEn || 0),
          hasir_sayisi: 1,
          cubuk_sayisi_boy: parseInt(product.cubukSayisiBoy || 0),
          cubuk_sayisi_en: parseInt(product.cubukSayisiEn || 0),
          adet_kg: parseFloat(kgValue.toFixed(5)),
          toplam_kg: parseFloat(kgValue.toFixed(5)),
          hasir_turu: 'MM',
          // Default values from SQL
          ozel_saha_2_say: 0,
          ozel_saha_3_say: 0,
          ozel_saha_4_say: 0,
          alis_fiyati: 0,
          fiyat_birimi: 2,
          satis_fiyati_1: 0,
          satis_fiyati_2: 0,
          satis_fiyati_3: 0,
          satis_fiyati_4: 0,
          doviz_tip: 0,
          doviz_alis: 0,
          doviz_maliyeti: 0,
          doviz_satis_fiyati: 0,
          azami_stok: 0,
          asgari_stok: 0,
          bekleme_suresi: 0,
          temin_suresi: 0,
          birim_agirlik: 0,
          nakliye_tutar: 0,
          stok_turu: 'D',
          esnek_yapilandir: 'H',
          super_recete_kullanilsin: 'H',
          user_id: user.id
        };

        let chResult, ncbkResults = {}, ntelResult, chResponse;
        const newlyCreatedNcbks = new Set(); // Track which NCBKs were actually created NEW in this save operation
        
        try {
          
          // CH kaydı - Önce var mı kontrol et, yoksa oluştur
          console.log('🔍 DEBUG - CH Data being saved:', {
            stok_kodu: chData.stok_kodu,
            stok_adi: chData.stok_adi,
            hasir_tipi: chData.hasir_tipi,
            fiyat_birimi: chData.fiyat_birimi,
            cap: chData.cap,
            cap2: chData.cap2,
            ebat_boy: chData.ebat_boy,
            ebat_en: chData.ebat_en,
            kg: chData.kg
          });

          // BATCH COLLECTION: Collect CH data instead of saving individually
          console.log('📦 Collecting CH data for batch save:', chData.stok_kodu);
          allChData.push({
            data: chData,
            originalProduct: product,
            generatedStokKodu: generatedStokKodu,
            productIndex: i
          });
          
          // Simulate successful response for now - actual save will happen in batch
          chResponse = { status: 201, json: () => Promise.resolve({ stok_kodu: chData.stok_kodu }) };
          
          if (chResponse.status === 409) {
            // Duplicate detected - try with next sequence number
            console.log(`*** DUPLICATE DETECTED: ${chData.stok_kodu} already exists, retrying with next sequence`);
            
            // Increment sequence counter and try again (max 3 attempts)
            let retryAttempts = 0;
            let retrySuccess = false;
            
            while (retryAttempts < 3 && !retrySuccess) {
              retryAttempts++;
              batchSequenceCounter++; // Increment to get next sequence number
              const newStokKodu = `CHOZL${String(batchSequenceCounter).padStart(4, '0')}`;
              console.log(`*** Retry attempt ${retryAttempts}: trying with ${newStokKodu}`);
              
              // Update the chData with new stok_kodu
              chData.stok_kodu = newStokKodu;
              
              // Try saving again
              const retryResponse = await fetchWithRetry(`${API_URLS.celikHasirMm}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chData)
              }, 3, 500, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: `${msg} (retry ${retryAttempts})` })));
              
              if (retryResponse.ok) {
                console.log(`*** Retry successful with ${newStokKodu}`);
                chResult = await retryResponse.json();
                generatedStokKodu = newStokKodu; // Update the generated code for sequence tracking
                retrySuccess = true;
              } else if (retryResponse.status === 409) {
                console.log(`*** ${newStokKodu} also exists, trying next sequence`);
                // Continue loop to try next number
              } else {
                throw new Error(`CH kaydı başarısız: ${retryResponse.status} (retry ${retryAttempts})`);
              }
            }
            
            if (!retrySuccess) {
              console.error(`*** Failed to save CH after 3 retry attempts`);
              toast.error(`Kayıt başarısız: 3 deneme sonucu duplicate hatası`);
              continue; // Skip this product
            }
          } else if (!chResponse.ok) {
            throw new Error(`CH kaydı başarısız: ${chResponse.status}`);
          } else {
            chResult = await chResponse.json();
            // Track saved CH product for potential rollback
            currentSessionSavedProducts.current.push({
              type: 'CH',
              id: chResult.id,
              stok_kodu: chData.stok_kodu,
              api_url: API_URLS.celikHasirMm
            });
          }

          // NCBK kayıtları (Boy ve En için ayrı ayrı - gerçek boyutları kullan)
          // Database should create ALL NCBKs including duplicates for recipe accuracy
          const allNcbkSpecs = [
            { cap: product.boyCap, length: parseInt(product.uzunlukBoy || 0), type: 'boy' },
            { cap: product.enCap, length: parseInt(product.uzunlukEn || 0), type: 'en' }
          ];
          
          // Deduplicate NCBK specs to prevent creating same product twice (and thus duplicate recipes)
          const seenStokKodus = new Set();
          const ncbkSpecs = allNcbkSpecs.filter(spec => {
            const stokKodu = `YM.NCBK.${String(Math.round(parseFloat(spec.cap) * 100)).padStart(4, '0')}.${spec.length}`;
            if (seenStokKodus.has(stokKodu)) {
              console.log(`⚠️ Skipping duplicate NCBK spec: ${stokKodu} (${spec.type})`);
              return false;
            }
            seenStokKodus.add(stokKodu);
            return true;
          });
          
          for (const spec of ncbkSpecs) {
            const cap = spec.cap;
            const length = spec.length;
            const ncbkWeight = (Math.PI * (cap/20) * (cap/20) * length * 7.85 / 1000);
            const ncbkData = {
              stok_kodu: `YM.NCBK.${String(Math.round(parseFloat(cap) * 100)).padStart(4, '0')}.${length}`,
              stok_adi: `YM Nervürlü Çubuk ${formatDecimalForDisplay(cap, true)} mm ${length} cm`,
              grup_kodu: 'YM',
              kod_1: 'NCBK',
              kod_2: '',
              ingilizce_isim: `Ribbed Rebar ${formatDecimalForDisplay(cap, false)} mm ${length} cm`,
              // Standard columns
              alis_kdv_orani: 20,
              satis_kdv_orani: 20,
              muh_detay: 20,
              depo_kodu: 36,
              br_1: 'AD',
              br_2: 'KG',
              pay_1: parseFloat(ncbkWeight.toFixed(5)),
              payda_1: 2,
              cevrim_degeri_1: 0,
              olcu_br_3: null,
              cevrim_pay_2: 1,
              cevrim_payda_2: 1,
              cevrim_degeri_2: 1,
              // Product specific
              cap: parseFloat(parseFloat(cap || 0).toFixed(1)),
              cap2: 0,
              ebat_boy: length,
              ebat_en: 0,
              goz_araligi: '',
              kg: parseFloat(ncbkWeight.toFixed(5)),
              length_cm: length,
              // Defaults
              hasir_tipi: 'YM',
              ic_cap_boy_cubuk_ad: 0,
              dis_cap_en_cubuk_ad: 0,
              ozel_saha_2_say: 0,
              ozel_saha_3_say: 0,
              ozel_saha_4_say: 0,
              alis_fiyati: 0,
              fiyat_birimi: 2,
              satis_fiyati_1: 0,
              satis_fiyati_2: 0,
              satis_fiyati_3: 0,
              satis_fiyati_4: 0,
              doviz_tip: 0,
              doviz_alis: 0,
              doviz_maliyeti: 0,
              doviz_satis_fiyati: 0,
              azami_stok: 0,
              asgari_stok: 0,
              bekleme_suresi: 0,
              temin_suresi: 0,
              birim_agirlik: 0,
              nakliye_tutar: 0,
              stok_turu: 'D',
              esnek_yapilandir: 'H',
              super_recete_kullanilsin: 'H',
              user_id: user.id
            };

            console.log('🔍 DEBUG - NCBK Data being saved:', {
              stok_kodu: ncbkData.stok_kodu,
              stok_adi: ncbkData.stok_adi,
              fiyat_birimi: ncbkData.fiyat_birimi,
              cap: ncbkData.cap,
              length_cm: length,
              kg: ncbkData.payda_1
            });

            console.log(`📤 NCBK POST Request for ${spec.type}:`, {
              stok_kodu: ncbkData.stok_kodu,
              cap: cap,
              length: length,
              type: spec.type
            });
            
            // REMOVED: Micro delay - was causing extreme slowness
            
            // BATCH COLLECTION: Collect NCBK data instead of saving individually
            console.log('📦 Collecting NCBK data for batch save:', ncbkData.stok_kodu);
            allNcbkData.push({
              data: ncbkData,
              originalProduct: product,
              specType: spec.type,
              productIndex: i
            });
            
            // Simulate successful response for now - actual save will happen in batch
            const ncbkResponse = { status: 201, json: () => Promise.resolve({ stok_kodu: ncbkData.stok_kodu, isNewlyCreated: true }) };
            
            console.log(`📥 NCBK Response for ${ncbkData.stok_kodu}:`, {
              status: ncbkResponse.status,
              statusText: ncbkResponse.statusText
            });
            
            if (ncbkResponse.status === 409) {
              // NCBK already exists - this is normal, just use existing
              console.log(`⚠️ NCBK already exists (409), will NOT create recipe: ${ncbkData.stok_kodu}`);
              // Store a placeholder result to continue the process
              const specKey = `${spec.type}-${cap}-${length}`;
              ncbkResults[specKey] = { stok_kodu: ncbkData.stok_kodu, message: 'existing', status: 409, isNewlyCreated: false };
              ncbkResults[length] = { stok_kodu: ncbkData.stok_kodu, message: 'existing', status: 409, isNewlyCreated: false };
              continue; // Continue to next NCBK
            } else if (!ncbkResponse.ok) {
              throw new Error(`NCBK kaydı başarısız: ${ncbkResponse.status}`);
            } else {
              const ncbkResult = await ncbkResponse.json();
              console.log(`✅ NCBK created successfully (${ncbkResponse.status}), WILL create recipe: ${ncbkData.stok_kodu}`);
              
              // Track saved NCBK product for potential rollback
              currentSessionSavedProducts.current.push({
                type: 'NCBK',
                id: ncbkResult.id,
                stok_kodu: ncbkData.stok_kodu,
                api_url: API_URLS.celikHasirNcbk
              });
              
              // Mark this NCBK as newly created in this session
              newlyCreatedNcbks.add(ncbkData.stok_kodu);
              
              // Store with spec type to handle boy/en separately even if same dimensions
              const specKey = `${spec.type}-${cap}-${length}`;
              ncbkResults[specKey] = { ...ncbkResult, status: ncbkResponse.status, message: 'created', isNewlyCreated: true };
              // Also store with just length for recipe lookup compatibility
              ncbkResults[length] = { ...ncbkResult, status: ncbkResponse.status, message: 'created', isNewlyCreated: true };
            }
          }

          // NTEL kaydı
          const ntelCap = parseFloat(product.boyCap || 0);
          const ntelWeight = (Math.PI * (ntelCap/20) * (ntelCap/20) * 100 * 7.85 / 1000); // per meter
          const ntelData = {
            stok_kodu: `YM.NTEL.${String(Math.round(ntelCap * 100)).padStart(4, '0')}`,
            stok_adi: `YM Nervürlü Tel ${formatDecimalForDisplay(ntelCap, true)} mm`,
            grup_kodu: 'YM',
            kod_1: 'NTEL',
            kod_2: '',
            ingilizce_isim: `Ribbed Wire ${formatDecimalForDisplay(ntelCap, false)} mm`,
            // Standard columns
            alis_kdv_orani: 20,
            satis_kdv_orani: 20,
            muh_detay: 35,
            depo_kodu: 36,
            br_1: 'MT',
            br_2: 'KG',
            pay_1: parseFloat(ntelWeight.toFixed(5)),
            payda_1: 1,
            cevrim_degeri_1: 0,
            olcu_br_3: null,
            cevrim_pay_2: 1,
            cevrim_payda_2: 1,
            cevrim_degeri_2: 1,
            // Product specific
            cap: parseFloat(ntelCap.toFixed(1)),
            cap2: parseFloat(ntelCap.toFixed(1)),
            ebat_boy: 0,
            ebat_en: 0,
            goz_araligi: '',
            kg: parseFloat(ntelWeight.toFixed(5)),
            // Defaults
            hasir_tipi: 'YM',
            ic_cap_boy_cubuk_ad: 0,
            dis_cap_en_cubuk_ad: 0,
            ozel_saha_2_say: 0,
            ozel_saha_3_say: 0,
            ozel_saha_4_say: 0,
            alis_fiyati: 0,
            fiyat_birimi: 2,
            satis_fiyati_1: 0,
            satis_fiyati_2: 0,
            satis_fiyati_3: 0,
            satis_fiyati_4: 0,
            doviz_tip: 0,
            doviz_alis: 0,
            doviz_maliyeti: 0,
            doviz_satis_fiyati: 0,
            azami_stok: 0,
            asgari_stok: 0,
            bekleme_suresi: 0,
            temin_suresi: 0,
            birim_agirlik: 0,
            nakliye_tutar: 0,
            stok_turu: 'D',
            esnek_yapilandir: 'H',
            super_recete_kullanilsin: 'H',
            user_id: user.id
          };

          console.log('🔍 DEBUG - NTEL Data being saved:', {
            stok_kodu: ntelData.stok_kodu,
            stok_adi: ntelData.stok_adi,
            fiyat_birimi: ntelData.fiyat_birimi,
            cap: ntelData.cap,
            kg_per_meter: ntelData.payda_1
          });

          // REMOVED: Micro delay - was causing extreme slowness

          // BATCH COLLECTION: Collect NTEL data instead of saving individually
          console.log('📦 Collecting NTEL data for batch save:', ntelData.stok_kodu);
          allNtelData.push({
            data: ntelData,
            originalProduct: product,
            productIndex: i
          });
          
          // Simulate successful response for now - actual save will happen in batch
          const ntelResponse = { status: 201, json: () => Promise.resolve({ stok_kodu: ntelData.stok_kodu, isNewlyCreated: true }) };
          
          if (ntelResponse.status === 409) {
            // NTEL already exists - this is normal, just use existing
            console.log(`ℹ️ NTEL already exists, using existing: ${ntelData.stok_kodu}`);
            ntelResult = { stok_kodu: ntelData.stok_kodu, message: 'existing', status: 409, isNewlyCreated: false };
            // Continue with existing NTEL
          } else if (!ntelResponse.ok) {
            throw new Error(`NTEL kaydı başarısız: ${ntelResponse.status}`);
          } else {
            ntelResult = await ntelResponse.json();
            ntelResult.isNewlyCreated = true; // Mark as newly created in this session
            
            // Track saved NTEL product for potential rollback
            currentSessionSavedProducts.current.push({
              type: 'NTEL',
              id: ntelResult.id,
              stok_kodu: ntelData.stok_kodu,
              api_url: API_URLS.celikHasirNtel
            });
            
            console.log(`✅ NTEL created successfully, WILL create recipe: ${ntelData.stok_kodu}`);
          }
          // Mark as successfully saved
          successfulProducts.push({
            ...product,
            existingStokKodu: generatedStokKodu
          });
        } catch (error) {
          console.error(`Ürün kaydı hatası (${product.hasirTipi}):`, error);
          failedProducts.push({
            product,
            error: error.message
          });
          // Continue with next product but show warning at the end
          continue;
        }

        // Recipe kayıtları oluştur (sadece yeni ürünler için)
        if (chResult && chResult.stok_kodu && Object.keys(ncbkResults).length > 0) {
          try {
            // Only create recipes for NEWLY created NCBK/NTEL (not existing ones)
            const newNcbkResults = {};
            Object.entries(ncbkResults).forEach(([key, result]) => {
              if (result && result.stok_kodu && result.isNewlyCreated === true) {
                newNcbkResults[key] = result;
                console.log(`🆕 Found newly created NCBK for recipe: ${result.stok_kodu} (key: ${key})`);
              } else if (result && result.stok_kodu) {
                console.log(`🚫 Skipping existing NCBK for recipe: ${result.stok_kodu} (key: ${key}, isNewlyCreated: ${result.isNewlyCreated})`);
              }
            });
            
            // Check if NTEL is newly created (not existing)
            const newNtelResult = (ntelResult && ntelResult.isNewlyCreated === true) ? ntelResult : null;
            if (ntelResult && ntelResult.stok_kodu && !ntelResult.isNewlyCreated) {
              console.log(`🚫 Skipping existing NTEL for recipe: ${ntelResult.stok_kodu} (isNewlyCreated: ${ntelResult.isNewlyCreated})`);
            } else if (newNtelResult) {
              console.log(`🆕 Found newly created NTEL for recipe: ${newNtelResult.stok_kodu}`);
            }
            
            console.log('🔍 DEBUG - Recipe Creation Decision:', {
              productType: product.hasirTipi,
              chResult: !!chResult,
              totalNcbkResults: Object.keys(ncbkResults).length,
              newNcbkResults: Object.keys(newNcbkResults).length,
              ntelResult: !!ntelResult,
              newNtelResult: !!newNtelResult,
              willCreateRecipes: Object.keys(newNcbkResults).length > 0 || newNtelResult
            });
            
            // DEBUG: Log detailed NCBK results for troubleshooting
            console.log('🔍 DEBUG - All NCBK Results:', ncbkResults);
            console.log('🔍 DEBUG - Filtered New NCBK Results:', newNcbkResults);
            Object.entries(ncbkResults).forEach(([key, result]) => {
              console.log(`🔍 DEBUG - NCBK ${key}:`, {
                hasStokKodu: !!result?.stok_kodu,
                message: result?.message,
                messageNotExisting: result?.message !== 'existing',
                willBeIncluded: result && result.stok_kodu && result.message !== 'existing'
              });
            });

            // Always create CH recipes when CH is new, even if NCBK/NTEL exist
            // Use existing NCBK/NTEL if no new ones were created
            const ncbkForRecipe = Object.keys(newNcbkResults).length > 0 ? newNcbkResults : ncbkResults;
            const ntelForRecipe = newNtelResult || ntelResult;
            
            console.log('📤 Calling saveRecipeData with:', {
              chResult: chResult?.stok_kodu,
              ncbkResults: Object.keys(ncbkForRecipe).map(k => ({ key: k, stok_kodu: ncbkForRecipe[k]?.stok_kodu, isNewlyCreated: ncbkForRecipe[k]?.isNewlyCreated })),
              ntelResult: ntelForRecipe?.stok_kodu,
              ntelIsNewlyCreated: ntelForRecipe?.isNewlyCreated
            });
            
            // Apply fallback formula to get correct cubuk sayısı values for recipe
            console.log('🔍 ORIGINAL PRODUCT VALUES BEFORE FALLBACK:', {
              cubukSayisiBoy: product.cubukSayisiBoy,
              cubukSayisiEn: product.cubukSayisiEn,
              hasirTipi: product.hasirTipi
            });
            
            const fallbackResult = await calculateFallbackCubukSayisi(
              product.hasirTipi,
              parseFloat(product.uzunlukBoy || 0),
              parseFloat(product.uzunlukEn || 0)
            );
            
            console.log('🔍 FALLBACK CALCULATION RESULT:', {
              cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
              cubukSayisiEn: fallbackResult.cubukSayisiEn
            });
            
            // Update product with correct optimized values for recipe generation
            // CRITICAL FIX: Force override any existing values that might be wrong
            const enhancedProduct = {
              ...product,
              cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
              cubukSayisiEn: fallbackResult.cubukSayisiEn
            };
            
            // ADDITIONAL SAFETY: Ensure the values are actually set correctly
            enhancedProduct.cubukSayisiBoy = fallbackResult.cubukSayisiBoy;
            enhancedProduct.cubukSayisiEn = fallbackResult.cubukSayisiEn;
            
            console.log('🔍 ENHANCED PRODUCT VALUES AFTER MERGE:', {
              cubukSayisiBoy: enhancedProduct.cubukSayisiBoy,
              cubukSayisiEn: enhancedProduct.cubukSayisiEn
            });
            
            console.log(`Applied fallback for recipe: ${product.hasirTipi} ${product.uzunlukBoy}x${product.uzunlukEn} => boy:${fallbackResult.cubukSayisiBoy}, en:${fallbackResult.cubukSayisiEn}`);
            
            await saveRecipeData(enhancedProduct, chResult, ncbkForRecipe, ntelForRecipe);
            console.log(`✅ Recipe kayıtları başarıyla oluşturuldu: ${product.hasirTipi}`);
            
            // Sequence güncelle - always update for new products, including when CH exists but we generated new NCBK/NTEL
            // Extract sequence number from generated stok_kodu for OZL products
            let actualSequenceNumber = null;
            if (generatedStokKodu && generatedStokKodu.startsWith('CHOZL')) {
              const match = generatedStokKodu.match(/CHOZL(\d+)/);
              if (match) {
                actualSequenceNumber = parseInt(match[1]);
                await updateSequences(product, actualSequenceNumber);
              }
            }
          } catch (error) {
            console.error(`Recipe kaydı hatası (${product.hasirTipi}):`, error);
            // Recipe hatası durumunda warning ver ama devam et
            toast.warning(`Recipe kaydı hatası: ${product.hasirTipi}`);
          }
        }
      }

      // BATCH SAVE IMPLEMENTATION: Send all collected data in parallel batches
      console.log('🚀 Starting batch save operations...');
      console.log(`📦 Batch Summary: ${allChData.length} CH, ${allNcbkData.length} NCBK, ${allNtelData.length} NTEL`);
      
      setDatabaseProgress({ 
        current: 0, 
        total: allChData.length + allNcbkData.length + allNtelData.length, 
        operation: 'Batch save işlemi başlatılıyor...',
        currentProduct: 'Veriler paralel olarak kaydediliyor...'
      });

      // Send all requests in parallel for maximum performance
      const batchPromises = [];
      
      // Add CH batch requests
      allChData.forEach((chItem, index) => {
        batchPromises.push(
          fetchWithRetry(API_URLS.celikHasirMm, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chItem.data)
          }, 3, 1000).then(response => ({
            type: 'CH',
            index,
            stok_kodu: chItem.data.stok_kodu,
            originalProduct: chItem.originalProduct,
            response,
            success: response.status === 200 || response.status === 201
          })).catch(error => ({
            type: 'CH',
            index,
            stok_kodu: chItem.data.stok_kodu,
            originalProduct: chItem.originalProduct,
            success: false,
            error: error.message
          }))
        );
      });

      // Add NCBK batch requests  
      allNcbkData.forEach((ncbkItem, index) => {
        batchPromises.push(
          fetchWithRetry(API_URLS.celikHasirNcbk, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ncbkItem.data)
          }, 3, 1000).then(response => ({
            type: 'NCBK',
            index,
            stok_kodu: ncbkItem.data.stok_kodu,
            originalProduct: ncbkItem.originalProduct,
            response,
            success: response.status === 200 || response.status === 201
          })).catch(error => ({
            type: 'NCBK',
            index,
            stok_kodu: ncbkItem.data.stok_kodu,
            originalProduct: ncbkItem.originalProduct,
            success: false,
            error: error.message
          }))
        );
      });

      // Add NTEL batch requests
      allNtelData.forEach((ntelItem, index) => {
        batchPromises.push(
          fetchWithRetry(API_URLS.celikHasirNtel, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ntelItem.data)
          }, 3, 1000).then(response => ({
            type: 'NTEL',
            index,
            stok_kodu: ntelItem.data.stok_kodu,
            originalProduct: ntelItem.originalProduct,
            response,
            success: response.status === 200 || response.status === 201
          })).catch(error => ({
            type: 'NTEL',
            index,
            stok_kodu: ntelItem.data.stok_kodu,
            originalProduct: ntelItem.originalProduct,
            success: false,
            error: error.message
          }))
        );
      });

      // Execute all batch requests in parallel
      console.log(`🚀 Sending ${batchPromises.length} requests in parallel...`);
      const batchStartTime = Date.now();
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      const batchEndTime = Date.now();
      const batchDuration = ((batchEndTime - batchStartTime) / 1000).toFixed(2);
      console.log(`⚡ Batch save completed in ${batchDuration} seconds (was taking ${newProducts.length * 3} seconds before)`);

      // Process batch results
      const batchSuccesses = [];
      const batchFailures = [];
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          batchSuccesses.push(result.value);
          // Track successfully saved products for session management
          currentSessionSavedProducts.current.push({
            stok_kodu: result.value.stok_kodu,
            type: result.value.type
          });
          // Add to successful products for Excel generation
          if (result.value.type === 'CH') {
            successfulProducts.push({
              ...result.value.originalProduct,
              stok_kodu: result.value.stok_kodu,
              hasirTipi: result.value.originalProduct.hasirTipi,
              uzunlukBoy: result.value.originalProduct.uzunlukBoy,
              uzunlukEn: result.value.originalProduct.uzunlukEn
            });
          }
        } else {
          const errorInfo = result.status === 'fulfilled' ? result.value : { error: result.reason?.message || 'Unknown error' };
          batchFailures.push(errorInfo);
          if (errorInfo.originalProduct) {
            failedProducts.push({
              product: errorInfo.originalProduct,
              error: errorInfo.error || 'Batch save failed'
            });
          }
        }
      });

      console.log(`📊 Batch Results: ${batchSuccesses.length} successful, ${batchFailures.length} failed`);
      
      setDatabaseProgress({ 
        current: batchSuccesses.length + batchFailures.length, 
        total: batchPromises.length, 
        operation: `Batch save tamamlandı! ${batchDuration}s`,
        currentProduct: `${batchSuccesses.length}/${batchPromises.length} başarılı`
      });

      // Show appropriate message based on results
      if (failedProducts.length === 0) {
        toast.success(`${successfulProducts.length} yeni ürün ve reçeteleri başarıyla kaydedildi!`);
      } else if (successfulProducts.length > 0) {
        toast.warning(`${successfulProducts.length} ürün kaydedildi, ${failedProducts.length} ürün başarısız oldu`);
        console.error('Failed products:', failedProducts);
      } else {
        toast.error(`Hiçbir ürün kaydedilemedi! ${failedProducts.length} ürün başarısız oldu`);
        console.error('All products failed:', failedProducts);
      }
      
      setDatabaseProgress({ 
        current: processedCount, 
        total: totalCount, 
        operation: 'Veritabanı kaydı tamamlandı!',
        currentProduct: ''
      });
      
      console.log('Veritabanı kaydetme tamamlandı. Excel için döndürülen ürünler:', {
        successful: successfulProducts.length,
        failed: failedProducts.length,
        products: successfulProducts.map(p => p.hasirTipi)
      });
      
      // Listeyi güncelle (don't await to avoid timeout)
      if (successfulProducts.length > 0) {
        fetchSavedProducts().catch(error => {
          console.warn('Database refresh failed after save:', error);
          toast.warning('Veritabanı yenileme başarısız - sayfa yenileyebilirsiniz');
        });
      }
      
      // DON'T close database modal yet - transition to Excel generation phase
      setDatabaseProgress({ current: totalCount, total: totalCount, operation: 'Excel dosyaları hazırlanıyor...', currentProduct: '' });
      setIsLoading(false);
      
      // Sadece başarıyla kaydedilen ürünleri döndür
      return successfulProducts;
      
    } catch (error) {
      console.error('Veritabanına kaydetme hatası:', error);
      
      // Provide specific error messages based on error type
      if (error.message?.includes('504') || error.message?.includes('timeout')) {
        toast.error('Sunucu zaman aşımına uğradı! Lütfen daha az ürünle tekrar deneyin.');
      } else if (error.message?.includes('500')) {
        toast.error('Sunucu hatası! Lütfen bir süre bekleyip tekrar deneyin.');
      } else if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
        toast.error('Ağ bağlantısı hatası - Lütfen internet bağlantınızı kontrol edin');
      } else if (error.message?.includes('Backend responses failed')) {
        toast.error('Veritabanı sunucusuna erişilemiyor - Lütfen daha sonra tekrar deneyin');
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        toast.error('Yetki hatası - Lütfen tekrar giriş yapın');
      } else {
        toast.error(`Veritabanına kaydetme sırasında hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
      }
      
      return [];
    } finally {
      setIsLoading(false);
      setIsSavingToDatabase(false);
      setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
    }
  };

  // Ürün sil - OPTIMIZED VERSION
  const deleteProduct = async (productId, productType) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setIsLoading(true);
      setDeletingProductId(productId);
      
      const product = savedProducts[productType].find(p => p.id === productId);
      if (!product || !product.stok_kodu) {
        toast.error('Ürün bilgisi bulunamadı');
        return;
      }

      console.log(`🗑️ Deleting single product: ${product.stok_kodu}`);

      // Step 1: Delete recipes using bulk deletion by mamul_kodu
      let recipeApiUrl = '';
      if (productType === 'mm') recipeApiUrl = API_URLS.celikHasirMmRecete;
      else if (productType === 'ncbk') recipeApiUrl = API_URLS.celikHasirNcbkRecete;
      else if (productType === 'ntel') recipeApiUrl = API_URLS.celikHasirNtelRecete;
      
      if (recipeApiUrl) {
        try {
          const encodedStokKodu = encodeURIComponent(product.stok_kodu);
          const deleteRecipesResponse = await fetchWithRetry(
            `${recipeApiUrl}/bulk-delete-by-mamul?mamul_kodu=${encodedStokKodu}`, 
            { 
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            }, 
            2, 1500
          );
          
          if (deleteRecipesResponse.ok) {
            const result = await deleteRecipesResponse.json();
            console.log(`✅ Deleted ${result.deletedCount || 'N/A'} recipes for ${product.stok_kodu}`);
          } else if (deleteRecipesResponse.status === 404) {
            // Fallback: Use old method if bulk endpoint doesn't exist
            console.log(`ℹ️ Bulk endpoint not found, using fallback for recipes: ${product.stok_kodu}`);
            await deleteRecipesFallback(recipeApiUrl, encodedStokKodu);
          } else {
            console.warn(`⚠️ Recipe deletion failed for ${product.stok_kodu}: ${deleteRecipesResponse.status}`);
          }
        } catch (recipeError) {
          console.warn(`⚠️ Recipe deletion error for ${product.stok_kodu}:`, recipeError.message);
          // Try fallback method
          try {
            const encodedStokKodu = encodeURIComponent(product.stok_kodu);
            await deleteRecipesFallback(recipeApiUrl, encodedStokKodu);
          } catch (fallbackError) {
            console.warn(`⚠️ Recipe deletion fallback also failed for ${product.stok_kodu}:`, fallbackError.message);
          }
        }
      }

      // Step 2: Delete the main product record by stok_kodu
      const tabEndpoints = {
        mm: API_URLS.celikHasirMm,
        ncbk: API_URLS.celikHasirNcbk,
        ntel: API_URLS.celikHasirNtel
      };

      const encodedStokKodu = encodeURIComponent(product.stok_kodu);
      const deleteProductResponse = await fetchWithRetry(
        `${tabEndpoints[productType]}/bulk-delete-by-stok?stok_kodu=${encodedStokKodu}`, 
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }, 
        3, 2000
      );

      if (deleteProductResponse.ok) {
        const result = await deleteProductResponse.json();
        console.log(`✅ Successfully deleted product ${product.stok_kodu}`);
        
        // Update UI state immediately
        setSavedProducts(prev => ({
          ...prev,
          [productType]: prev[productType].filter(p => p.id !== productId)
        }));
        
        // Update sequence table if we deleted CH product
        if (productType === 'mm') {
          try {
            await updateSequenceAfterDeletion(productType);
          } catch (seqError) {
            console.warn('Sequence update failed:', seqError);
            toast.warning('Ürün silindi ancak sıra numarası güncellenemedi');
          }
        }
        
        // Aggressive cache clearing to prevent false "exists" detection
        cacheRef.current.clear();
        
        // Clear any existing product lookup cache that might contain deleted product
        if (window.productLookupCache) {
          window.productLookupCache.clear();
        }
        
        // Force refresh data with cache-busting
        await fetchSavedProducts(false, true);
        
        // Show success toast AFTER cache is cleared
        toast.success(`✅ Ürün başarıyla silindi: ${product.stok_kodu}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false
        });
      } else if (deleteProductResponse.status === 404) {
        // Fallback: Use old method if bulk endpoint doesn't exist
        console.log(`ℹ️ Bulk product endpoint not found, using fallback for: ${product.stok_kodu}`);
        const fallbackResponse = await fetchWithRetry(`${tabEndpoints[productType]}/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }, 3, 2000);
        
        if (fallbackResponse.ok) {
          console.log(`✅ Fallback: Successfully deleted product ${product.stok_kodu}`);
          
          setSavedProducts(prev => ({
            ...prev,
            [productType]: prev[productType].filter(p => p.id !== productId)
          }));
          
          if (productType === 'mm') {
            try {
              await updateSequenceAfterDeletion(productType);
            } catch (seqError) {
              console.warn('Sequence update failed:', seqError);
              toast.warning('Ürün silindi ancak sıra numarası güncellenemedi');
            }
          }
          
          // Aggressive cache clearing to prevent false "exists" detection
          cacheRef.current.clear();
          
          // Clear any existing product lookup cache that might contain deleted product
          if (window.productLookupCache) {
            window.productLookupCache.clear();
          }
          
          // Force refresh data with cache-busting
          await fetchSavedProducts(false, true);
          
          // Show success toast AFTER cache is cleared
          toast.success(`✅ Ürün başarıyla silindi: ${product.stok_kodu}`, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false
          });
        } else {
          throw new Error(`Fallback product deletion failed: ${fallbackResponse.status}`);
        }
      } else {
        throw new Error(`Product deletion failed: ${deleteProductResponse.status} ${deleteProductResponse.statusText}`);
      }

    } catch (error) {
      console.error('❌ Delete error:', error);
      if (error.message.includes('504') || error.message.includes('timeout')) {
        toast.error('⏱️ İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false
        });
      } else {
        toast.error(`❌ Ürün silinirken hata: ${error.message}`, {
          position: "top-right", 
          autoClose: 5000,
          hideProgressBar: false
        });
      }
    } finally {
      setIsLoading(false);
      setDeletingProductId(null);
    }
  };

  // Update sequence table after product deletion
  const updateSequenceAfterDeletion = async (productType) => {
    try {
      // Only update sequence for CH (mm) products since they use sequence numbers
      if (productType !== 'mm') return;
      
      console.log('*** Updating sequence table after product deletion');
      
      // Get the highest sequence number from remaining CH products
      // Add timestamp to bypass any caching
      const chResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?search=CHOZL&sort_by=stok_kodu&sort_order=desc&limit=1&_t=${Date.now()}`);
      if (chResponse.ok) {
        const chProducts = await chResponse.json();
        console.log('*** updateSequenceAfterDeletion - API response structure:', chProducts);
        
        let newMaxSequence = null;
        // Check both possible response structures (direct array or data property)
        const productList = chProducts.data || chProducts;
        if (Array.isArray(productList) && productList.length > 0) {
          const highestProduct = productList[0];
          const match = highestProduct.stok_kodu.match(/CHOZL(\d+)/);
          if (match) {
            newMaxSequence = parseInt(match[1]);
            console.log('*** Found new max sequence from remaining products:', newMaxSequence);
          }
        } else {
          console.log('*** No remaining CHOZL products found after deletion');
          console.log('*** Last resort: Checking all CH products to determine proper sequence...');
          
          // Last resort: Check all CH products (both STD and OZL) to find the highest sequence
          try {
            const allChResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?search=CH&sort_by=stok_kodu&sort_order=desc&limit=100&_t=${Date.now()}`);
            if (allChResponse.ok) {
              const allChProducts = await allChResponse.json();
              const allProductList = allChProducts.data || allChProducts;
              
              let highestStdSequence = 0;
              let highestOzlSequence = 0;
              
              if (Array.isArray(allProductList)) {
                allProductList.forEach(product => {
                  // Check for STD products (CH.STD.XXXX.XX)
                  const stdMatch = product.stok_kodu.match(/CH\.STD\.(\d{4})\./);
                  if (stdMatch) {
                    const seqNum = parseInt(stdMatch[1]);
                    if (seqNum > highestStdSequence) {
                      highestStdSequence = seqNum;
                    }
                  }
                  
                  // Check for any remaining OZL products (shouldn't be any, but double-check)
                  const ozlMatch = product.stok_kodu.match(/CHOZL(\d+)/);
                  if (ozlMatch) {
                    const seqNum = parseInt(ozlMatch[1]);
                    if (seqNum > highestOzlSequence) {
                      highestOzlSequence = seqNum;
                    }
                  }
                });
              }
              
              console.log(`*** Found highest STD sequence: ${highestStdSequence}, highest OZL sequence: ${highestOzlSequence}`);
              
              // Use the higher of the two, or a reasonable default if no products exist
              if (highestOzlSequence > 0) {
                newMaxSequence = highestOzlSequence;
                console.log('*** Using remaining OZL sequence:', newMaxSequence);
              } else if (highestStdSequence > 1200) {
                // If STD sequences are above 1200, continue from there for OZL
                newMaxSequence = highestStdSequence;
                console.log('*** Using STD sequence as base for OZL:', newMaxSequence);
              } else {
                // No OZL products and STD is in normal range, start OZL from a safe number
                newMaxSequence = 2443; // Starting point for OZL when no reference exists
                console.log('*** No suitable reference found, using safe starting point:', newMaxSequence);
              }
            }
          } catch (error) {
            console.error('*** Error checking all CH products:', error);
            // If all else fails, keep the current sequence value (don't update)
            console.log('*** Error occurred, sequence will not be updated');
            return;
          }
        }
        
        // Only proceed with update if we have a valid sequence
        if (newMaxSequence === null) {
          console.log('*** No valid sequence determined, skipping update');
          return;
        }
        
        // Update both OZL and OZL_BACKUP sequences
        const updateTasks = ['OZL', 'OZL_BACKUP'].map(async (kod2) => {
          try {
            console.log(`*** Searching for sequence with product_type=CH and kod_2=${kod2}`);
            const existingSequenceResponse = await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=${kod2}`);
            if (existingSequenceResponse.ok) {
              const existingSequences = await existingSequenceResponse.json();
              console.log(`*** Found ${existingSequences.length} sequences for kod_2=${kod2}:`, existingSequences);
              
              // Filter to ensure we get the exact match (in case API filtering is not working)
              const exactMatches = existingSequences.filter(seq => 
                seq.product_type === 'CH' && seq.kod_2 === kod2
              );
              console.log(`*** Exact matches for kod_2=${kod2}:`, exactMatches);
              
              if (exactMatches.length > 0) {
                const sequenceRecord = exactMatches[0];
                const sequenceId = sequenceRecord.id;
                const currentSequence = sequenceRecord.last_sequence;
                
                console.log(`*** Processing sequence update for ${kod2}: ID=${sequenceId}, current=${currentSequence}, newMax=${newMaxSequence}`);
                
                // Only update if current sequence is higher than the new max (meaning we deleted the highest)
                if (currentSequence > newMaxSequence) {
                  await fetchWithAuth(`${API_URLS.celikHasirSequence}/${sequenceId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ last_sequence: newMaxSequence })
                  });
                  console.log(`*** Updated ${kod2} sequence from ${currentSequence} to ${newMaxSequence}`);
                } else {
                  console.log(`*** ${kod2} sequence (${currentSequence}) is already <= new max (${newMaxSequence}), no update needed`);
                }
              } else {
                console.warn(`*** No exact matches found for kod_2=${kod2}. Available sequences:`, existingSequences.map(s => ({ id: s.id, product_type: s.product_type, kod_2: s.kod_2 })));
              }
            } else {
              console.warn(`*** Failed to fetch sequences for kod_2=${kod2}: ${existingSequenceResponse.status}`);
            }
          } catch (error) {
            console.warn(`Error updating ${kod2} sequence:`, error);
          }
        });
        
        await Promise.all(updateTasks);
        
        // Update local sequence state
        const updatedSequences = { ...sequences };
        const ozlKey = Object.keys(sequences).find(key => key.startsWith('CH_OZL_')) || 'CH_OZL_';
        const backupKey = Object.keys(sequences).find(key => key.startsWith('CH_OZL_BACKUP')) || 'CH_OZL_BACKUP_';
        
        if (sequences[ozlKey] > newMaxSequence) updatedSequences[ozlKey] = newMaxSequence;
        if (sequences[backupKey] > newMaxSequence) updatedSequences[backupKey] = newMaxSequence;
        
        setSequences(updatedSequences);
        
        console.log('*** Sequence update after deletion completed');
      }
    } catch (error) {
      console.warn('Error updating sequence after deletion:', error);
    }
  };

  // Tümünü sil - OPTIMIZED VERSION  
  const bulkDeleteAll = async () => {
    try {
      setIsLoading(true);
      setIsBulkDeleting(true);
      setShowBulkDeleteModal(false);
      setBulkDeleteText('');
      
      const tabName = activeDbTab === 'mm' ? 'CH' : activeDbTab === 'ncbk' ? 'NCBK' : 'NTEL';
      const totalProducts = savedProducts[activeDbTab].length;
      
      if (totalProducts === 0) {
        toast.info('Silinecek ürün bulunamadı');
        return;
      }

      console.log(`🗑️ Starting bulk delete all ${totalProducts} ${tabName} products`);
      
      setBulkDeleteProgress({ 
        current: 0, 
        total: 3, 
        operation: 'Tüm reçeteler siliniyor...', 
        currentItem: `${tabName} reçeteleri` 
      });
      
      // Step 1: Delete ALL recipes for this product type using bulk endpoint
      const recipeApiUrl = activeDbTab === 'mm' ? API_URLS.celikHasirMmRecete :
                          activeDbTab === 'ncbk' ? API_URLS.celikHasirNcbkRecete :
                          API_URLS.celikHasirNtelRecete;
      
      try {
        const deleteAllRecipesResponse = await fetchWithRetry(
          `${recipeApiUrl}/bulk-delete-all-by-type?product_type=${activeDbTab.toUpperCase()}`, 
          { 
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }, 
          3, 3000
        );
        
        if (deleteAllRecipesResponse.ok) {
          const recipeResult = await deleteAllRecipesResponse.json();
          console.log(`✅ Deleted ${recipeResult.deletedCount || 'all'} recipes for ${tabName}`);
        } else {
          console.warn(`⚠️ Bulk recipe deletion failed: ${deleteAllRecipesResponse.status}`);
        }
      } catch (recipeError) {
        console.warn(`⚠️ Bulk recipe deletion error:`, recipeError.message);
        // Continue with product deletion even if recipe deletion fails
      }
      
      // Step 2: Delete ALL products for this type using bulk endpoint
      setBulkDeleteProgress({ 
        current: 1, 
        total: 3, 
        operation: 'Tüm ürünler siliniyor...', 
        currentItem: `${tabName} ürünleri` 
      });
      
      const apiUrl = activeDbTab === 'mm' ? API_URLS.celikHasirMm :
                     activeDbTab === 'ncbk' ? API_URLS.celikHasirNcbk :
                     API_URLS.celikHasirNtel;
      
      try {
        const deleteAllProductsResponse = await fetchWithRetry(
          `${apiUrl}/bulk-delete-all`, 
          { 
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }, 
          3, 3000
        );
        
        if (deleteAllProductsResponse.ok) {
          const productResult = await deleteAllProductsResponse.json();
          console.log(`✅ Deleted ${productResult.deletedCount || totalProducts} ${tabName} products`);
        } else {
          throw new Error(`Bulk product deletion failed: ${deleteAllProductsResponse.status}`);
        }
      } catch (productError) {
        console.error(`❌ Bulk product deletion error:`, productError.message);
        throw productError; // Re-throw to trigger error handling below
      }
      
      // Step 3: Clear sequence table if CH products were deleted
      setBulkDeleteProgress({ 
        current: 2, 
        total: 3, 
        operation: 'Sequence kayıtları temizleniyor...', 
        currentItem: 'CH Sequence' 
      });
      
      if (activeDbTab === 'mm') {
        try {
          // Reset OZL and OZL_BACKUP sequences to 0
          await fetchWithRetry(`${API_URLS.celikHasirSequence}/reset-ch-sequences`, { 
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }, 2, 2000);
          console.log('✅ CH sequences reset successfully');
        } catch (seqError) {
          console.warn('⚠️ Sequence reset failed:', seqError.message);
          // Continue anyway - this is not critical
        }
      }
      
      setBulkDeleteProgress({ 
        current: 3, 
        total: 3, 
        operation: 'Tamamlandı!', 
        currentItem: `${totalProducts} ${tabName} ürün silindi` 
      });
      
      toast.success(`✅ Tüm ${totalProducts} ${tabName} kayıtları ve reçeteleri başarıyla silindi`);
      
      // Update UI state immediately
      setSavedProducts(prev => ({
        ...prev,
        [activeDbTab]: []
      }));
      
      // Force refresh data
      cacheRef.current.clear();
      await fetchSavedProducts(false, true);
      
    } catch (error) {
      console.error('❌ Bulk delete all error:', error);
      if (error.message.includes('504') || error.message.includes('timeout')) {
        toast.error('⏱️ İşlem zaman aşımına uğradı. Backend yoğun olabilir, lütfen birkaç dakika sonra tekrar deneyin.');
      } else {
        toast.error(`❌ Toplu silme hatası: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
      setIsBulkDeleting(false);
    }
  };


  // Optimize edilmemiş ürünlerle devam et
  const proceedWithUnoptimized = () => {
    setShowOptimizationWarning(false);
    setShowDatabaseWarning(true);
  };


  // Render content function
  const renderContent = () => {
    // İzin kontrolü - Çelik Hasır modülü için
    if (!hasPermission('access:celik-hasir')) {
      return (
        <div className="p-4 text-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">Bu modüle erişim izniniz bulunmamaktadır.</p>
          </div>
        </div>
      );
    }

    return (
    <div className="p-4">
      {/* Netsis İşlemleri */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-gray-700">Netsis:</span>
        <button
          onClick={async () => {
            setIsLoading(true); // Show immediate feedback
            try {
              // Refresh saved products state to ensure accurate counts
              await fetchSavedProducts();
              
              // Show analysis count
              const newProductsCount = getProductsToSave().length;
              const existingProductsCount = validProducts.length - newProductsCount;
              toast.info(`Analiz: ${validProducts.length} toplam ürün | ${existingProductsCount} veritabanında mevcut | ${newProductsCount} kaydedilecek`);
              
              if (validProducts.length === 0) {
                setShowDatabaseModal(true);
              } else {
                // Check for unoptimized products and show warning for Netsis operations only
                const hasUnoptimized = hasUnoptimizedProducts();
                
                if (hasUnoptimized) {
                  const shouldContinue = window.confirm(
                    `UYARI: Bazı ürünler henüz optimize edilmedi!\n\n` +
                    `Netsis operasyonlarında daha iyi sonuçlar için ürünleri optimize etmeniz önerilir.\n\n` +
                    `DEVAM: Optimize edilmemiş tablo ile devam et\n` +
                    `IPTAL: İşlemi iptal et`
                  );
                  
                  if (!shouldContinue) {
                    setIsLoading(false);
                    return;
                  }
                }
                
                // Analyze products and show pre-save confirmation
                const analysisData = await analyzeProductsForConfirmation();
                setPreSaveConfirmData(analysisData);
                setShowPreSaveConfirmModal(true);
              }
            } finally {
              setIsLoading(false); // Hide loading when modal appears
            }
          }}
          disabled={isLoading || isGeneratingExcel || isSavingToDatabase}
          className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          {(isLoading || isSavingToDatabase || isGeneratingExcel) && <Loader className="w-4 h-4 animate-spin" />}
          Kaydet ve Excel Oluştur
        </button>
        
        <button
          onClick={async () => {
            if (validProducts.length === 0) {
              toast.warn('Excel oluşturmak için önce ürün listesini doldurun.');
              return;
            }
            
            setIsLoading(true); // Show immediate feedback
            try {
              // Show analysis count for Excel operations
              const newProductsCount = getProductsToSave().length;
              const existingProductsCount = validProducts.length - newProductsCount;
              toast.info(`Analiz: ${validProducts.length} toplam ürün | ${existingProductsCount} veritabanında mevcut | ${newProductsCount} kaydedilmemiş`);
              
              setShowExcelOptionsModal(true);
            } finally {
              setIsLoading(false); // Hide loading when modal appears
            }
          }}
          disabled={isLoading || isGeneratingExcel || isSavingToDatabase || validProducts.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          {(isLoading || isGeneratingExcel) && <Loader className="w-4 h-4 animate-spin" />}
          Sadece Excel Oluştur
        </button>
        
        <button
          onClick={() => {
            setShowDatabaseModal(true);
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          Veritabanı İşlemleri
        </button>
        
      </div>

      {/* Optimizasyon Uyarı Modal */}
      {showOptimizationWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold">Optimizasyon Uyarısı</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Listede optimize edilmemiş ürünler bulunmaktadır. 
              Bu ürünler uyarı ile birlikte kaydedilecektir. Devam etmek istiyor musunuz?
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowOptimizationWarning(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={proceedWithUnoptimized}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
              >
                Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Uyarı Modal */}
      {showDatabaseWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold">Veritabanı Kayıt Onayı</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {getProductsToSave().length} adet yeni ürün veritabanına kaydedilecek ve Excel dosyaları oluşturulacak. Bu işlem birkaç dakika sürebilir.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDatabaseWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={async () => {
                  setShowDatabaseWarning(false);
                  const newProducts = await saveToDatabase(validProducts);
                  if (newProducts && newProducts.length > 0) {
                    console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için - database fetch mode`);
                    
                    // SEAMLESS TRANSITION: Close database modal, start Excel generation immediately
                    setIsSavingToDatabase(false);
                    setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                    
                    // Unified approach: Fetch saved products from database with fallback
                    try {
                      // Direct unified fetch approach - use the stok_kodu from saved products
                      const stokKodular = newProducts.map(p => p.existingStokKodu || generateStokKodu(p, 'CH', 0)).filter(Boolean);
                      console.log('Looking for these stok_kodu values:', stokKodular);
                      console.log('newProducts structure:', newProducts.map(p => ({
                        hasirTipi: p.hasirTipi,
                        uzunlukBoy: p.uzunlukBoy,
                        uzunlukEn: p.uzunlukEn,
                        existingStokKodu: p.existingStokKodu,
                        cubukSayisiBoy: p.cubukSayisiBoy,
                        cubukSayisiEn: p.cubukSayisiEn
                      })));
                      
                      // Add small delay to ensure database consistency
                      await new Promise(resolve => setTimeout(resolve, 800));
                      
                      // Update UI to show data fetching phase
                      setDatabaseProgress({ 
                        current: 0, 
                        total: stokKodular.length, 
                        operation: 'Kaydedilen ürünlerin detayları alınıyor...',
                        currentProduct: 'Veritabanından çubuk sayıları ve reçete bilgileri getiriliyor'
                      });
                      
                      // Use unified fetch directly with stok_kodu (bypassing the problematic fetchSavedProducts)
                      const databaseProducts = await fetchDatabaseDataWithFallback([], stokKodular);
                      console.log('fetchDatabaseDataWithFallback returned:', databaseProducts?.length || 0, 'products');
                      console.log('Database products breakdown:', {
                        total: databaseProducts?.length || 0,
                        mm: databaseProducts?.filter(p => p.existingStokKodu && p.existingStokKodu.startsWith('CH')).length || 0,
                        ncbk: databaseProducts?.filter(p => p.existingStokKodu && p.existingStokKodu.startsWith('YM.NCBK')).length || 0,
                        ntel: databaseProducts?.filter(p => p.existingStokKodu && p.existingStokKodu.startsWith('YM.NTEL')).length || 0
                      });
                      console.log('First MM product data:', databaseProducts?.find(p => p.existingStokKodu && p.existingStokKodu.startsWith('CH')) ? {
                        stok_kodu: databaseProducts.find(p => p.existingStokKodu && p.existingStokKodu.startsWith('CH')).existingStokKodu,
                        cubukSayisiBoy: databaseProducts.find(p => p.existingStokKodu && p.existingStokKodu.startsWith('CH')).cubukSayisiBoy,
                        cubukSayisiEn: databaseProducts.find(p => p.existingStokKodu && p.existingStokKodu.startsWith('CH')).cubukSayisiEn,
                        hasRecipeData: !!databaseProducts.find(p => p.existingStokKodu && p.existingStokKodu.startsWith('CH')).recipeData
                      } : 'none');
                      
                      if (databaseProducts && databaseProducts.length > 0) {
                        // Update UI before starting Excel generation
                        setDatabaseProgress({ 
                          current: databaseProducts.length, 
                          total: databaseProducts.length, 
                          operation: 'Veriler alındı, Excel dosyaları oluşturuluyor...',
                          currentProduct: ''
                        });
                        await generateExcelFiles(databaseProducts, false);
                        toast.success(`${databaseProducts.length} yeni ürün için Excel dosyaları oluşturuldu!`);
                      } else {
                        // Database fetch failed - apply fallback formula to newProducts
                        console.warn('Unified fetch returned no data, applying fallback formula to original data');
                        const fallbackProducts = await Promise.all(
                          newProducts.map(async (product) => {
                            const fallbackResult = await calculateFallbackCubukSayisi(
                              product.hasirTipi,
                              parseFloat(product.uzunlukBoy || 0),
                              parseFloat(product.uzunlukEn || 0)
                            );
                            return {
                              ...product,
                              cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                              cubukSayisiEn: fallbackResult.cubukSayisiEn
                            };
                          })
                        );
                        console.log('Applied fallback formula to', fallbackProducts.length, 'products');
                        console.log('First fallback product çubuk sayısı:', fallbackProducts[0] ? {
                          stok_kodu: fallbackProducts[0].existingStokKodu,
                          cubukSayisiBoy: fallbackProducts[0].cubukSayisiBoy,
                          cubukSayisiEn: fallbackProducts[0].cubukSayisiEn
                        } : 'none');
                        await generateExcelFiles(fallbackProducts, false);
                        toast.success(`${fallbackProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Fallback Formula)`);
                      }
                    } catch (error) {
                      console.error('Unified fetch failed, applying fallback formula:', error);
                      // Apply fallback formula even when fetch fails
                      const fallbackProducts = await Promise.all(
                        newProducts.map(async (product) => {
                          const fallbackResult = await calculateFallbackCubukSayisi(
                            product.hasirTipi,
                            parseFloat(product.uzunlukBoy || 0),
                            parseFloat(product.uzunlukEn || 0)
                          );
                          return {
                            ...product,
                            cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                            cubukSayisiEn: fallbackResult.cubukSayisiEn
                          };
                        })
                      );
                      console.log('Applied fallback formula after error to', fallbackProducts.length, 'products');
                      await generateExcelFiles(fallbackProducts, false);
                      toast.success(`${fallbackProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Fallback Formula - After Error)`);
                    }
                  } else {
                    toast.info('Hiç yeni ürün eklenmedi, Excel oluşturulmadı.');
                  }
                }}
                disabled={isSavingToDatabase || isGeneratingExcel}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-2 justify-center"
              >
                {(isSavingToDatabase || isGeneratingExcel) && <Loader className="w-4 h-4 animate-spin" />}
                Kaydet ve Excel Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Veritabanı Kayıt Progress Modal */}
            
            
            <div className="space-y-4">
              <button
                onClick={() => {
      {/* Veritabanı Uyarı Modal */}
      {showDatabaseWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold">Veritabanı Kaydı</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              {getProductsToSave().length > 0 ? (
                <>
                  <span className="font-semibold">{getProductsToSave().length} yeni ürün</span> veritabanına kaydedilecek ve Excel dosyaları oluşturulacak. Devam etmek istiyor musunuz?
                </>
              ) : (
                'Tüm ürünler zaten veritabanında mevcut. Kaydedilecek yeni ürün bulunmamaktadır.'
              )}
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDatabaseWarning(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={async () => {
                  setShowDatabaseWarning(false);
                  
                  try {
                    const newProducts = await saveToDatabase(validProducts);
                    if (newProducts && newProducts.length > 0) {
                      console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için - database fetch mode`);
                      console.log('newProducts returned from saveToDatabase:', newProducts.map(p => ({ 
                        existingStokKodu: p.existingStokKodu, 
                        hasirTipi: p.hasirTipi, 
                        uzunlukBoy: p.uzunlukBoy, 
                        uzunlukEn: p.uzunlukEn 
                      })));
                      
                      // Unified approach: Fetch saved products from database with fallback
                      try {
                        // Direct unified fetch approach - use the stok_kodu from saved products
                        const stokKodular = newProducts.map(p => p.existingStokKodu || generateStokKodu(p, 'CH', 0)).filter(Boolean);
                        console.log('Looking for these stok_kodu values:', stokKodular);
                        
                        // Update UI to show data fetching phase
                        setDatabaseProgress({ 
                          current: 0, 
                          total: stokKodular.length, 
                          operation: 'Kaydedilen ürünlerin detayları alınıyor...',
                          currentProduct: 'Veritabanından çubuk sayıları ve reçete bilgileri getiriliyor'
                        });
                        
                        // Use unified fetch directly with stok_kodu (bypassing the problematic fetchSavedProducts)
                        const databaseProducts = await fetchDatabaseDataWithFallback([], stokKodular);
                        console.log('fetchDatabaseDataWithFallback returned:', databaseProducts?.length || 0, 'products');
                        console.log('First database product data:', databaseProducts?.[0] ? {
                          stok_kodu: databaseProducts[0].existingStokKodu,
                          cubukSayisiBoy: databaseProducts[0].cubukSayisiBoy,
                          cubukSayisiEn: databaseProducts[0].cubukSayisiEn,
                          hasRecipeData: !!databaseProducts[0].recipeData
                        } : 'none');
                        
                        if (databaseProducts && databaseProducts.length > 0) {
                          // Update UI before starting Excel generation
                          setDatabaseProgress({ 
                            current: databaseProducts.length, 
                            total: databaseProducts.length, 
                            operation: 'Veriler alındı, Excel dosyaları oluşturuluyor...',
                            currentProduct: ''
                          });
                          await generateExcelFiles(databaseProducts);
                          toast.success(`${databaseProducts.length} yeni ürün için Excel dosyaları oluşturuldu!`);
                        } else {
                          // Database fetch failed - apply fallback formula to newProducts
                          console.warn('Unified fetch returned no data, applying fallback formula to original data');
                          const fallbackProducts = await Promise.all(
                            newProducts.map(async (product) => {
                              const fallbackResult = await calculateFallbackCubukSayisi(
                                product.hasirTipi,
                                parseFloat(product.uzunlukBoy || 0),
                                parseFloat(product.uzunlukEn || 0)
                              );
                              return {
                                ...product,
                                cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                                cubukSayisiEn: fallbackResult.cubukSayisiEn
                              };
                            })
                          );
                          console.log('Applied fallback formula to', fallbackProducts.length, 'products');
                          await generateExcelFiles(fallbackProducts);
                          toast.success(`${fallbackProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Fallback Formula)`);
                        }
                      } catch (innerError) {
                        console.error('Unified fetch failed, falling back to original method:', innerError);
                        await generateExcelFiles(newProducts);
                        toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Fallback to original)`);
                      }
                    } else {
                      toast.info('Hiç yeni ürün eklenmedi, Excel oluşturulmadı.');
                    }
                  } catch (error) {
                    console.error('Database save error:', error);
                    toast.error('Veritabanı kaydı sırasında hata oluştu');
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Evet, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}
                  const unoptimizedProducts = validProducts.filter(p => !isProductOptimized(p));
                  console.log('Save button clicked. Product check:', {
                    totalProducts: validProducts.length,
                    hasUnoptimized: hasUnoptimizedProducts(),
                    unoptimizedCount: unoptimizedProducts.length,
                    unoptimizedList: unoptimizedProducts.map(p => ({ 
                      hasirTipi: p.hasirTipi, 
                      optimized: isProductOptimized(p),
                      boyCap: p.boyCap,
                      enCap: p.enCap,
                      cubukSayisiBoy: p.cubukSayisiBoy,
                      cubukSayisiEn: p.cubukSayisiEn,
                      missingFields: [
                        !p.boyCap && 'boyCap',
                        !p.enCap && 'enCap', 
                        !p.cubukSayisiBoy && 'cubukSayisiBoy',
                        !p.cubukSayisiEn && 'cubukSayisiEn'
                      ].filter(Boolean)
                    })),
                    allProductsDebug: validProducts.map(p => ({
                      hasirTipi: p.hasirTipi,
                      isOptimized: isProductOptimized(p)
                    }))
                  });
                  
                  if (validProducts.length === 0) {
                    // Ürün yoksa direkt veritabanı ekranına git
                    console.log('No products, opening database modal');
                                  setShowDatabaseModal(true);
                  } else if (hasUnoptimizedProducts()) {
                    console.log('Unoptimized products found, showing warning');
                    setShowOptimizationWarning(true);
                  } else {
                    console.log('All products optimized, showing database warning');
                    setShowDatabaseWarning(true);
                  }
                }}
                disabled={isLoading || isGeneratingExcel}
                className="hidden"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <div className="text-left">
                  <div className="font-medium">
                    {isLoading ? 'Veritabanı işlemi devam ediyor...' : 'Sadece Yeni Ürünleri Kaydet ve Excel Oluştur'}
                  </div>
                  <div className="text-sm opacity-90">
                    {isLoading ? 'Lütfen bekleyiniz, işlem tamamlanıyor...' : 'Veritabanında olmayan ürünleri ekler (Silinen ürünler dahil)'}
                  </div>
                </div>
              </button>
              
              <button
                onClick={async () => {
                  if (validProducts.length === 0) {
                    toast.warn('Excel oluşturmak için önce ürün listesini doldurun.');
                    return;
                  }
                  
                  // Tüm listeden Excel oluştur (veritabanı kayıt yapmadan)
                  await generateExcelFiles(validProducts, true);
                }}
                disabled={isLoading || isGeneratingExcel || validProducts.length === 0}
                className="hidden"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Mevcut Listenin Tümünün Excellerini Oluştur</div>
                  <div className="text-sm opacity-90">Sadece Excel dosyalarını oluştur (veritabanı değişikliği yapmaz)</div>
                </div>
              </button>
              
              <button
                onClick={() => { 
                  ; 
                  setShowDatabaseModal(true);
                  fetchSavedProducts(); // Auto-refresh when opening
                }}
                disabled={isLoading}
                className="hidden"
              >
                <Database className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Veritabanı Yönetimi</div>
                  <div className="text-sm opacity-90">Kayıtlı ürünleri görüntüle, sil ve yönet</div>
                </div>
              </button>
              
              {/* Debugging Info */}
              <div className="hidden">
                <div className="text-xs text-yellow-700">
                  <strong>Not:</strong> Eğer bir ürünü silip tekrar eklemeye çalışıyorsanız:
                  <ul className="mt-1 ml-4 list-disc">
                    <li>"Sadece Yeni Ürünleri Kaydet" butonu silinen ürünü yeniden ekler</li>
                    <li>"Mevcut Listenin Tümünün Excellerini Oluştur" tüm listeden Excel yapar</li>
                    <li>Konsol'u (F12) açıp debug mesajlarını kontrol edebilirsiniz</li>
                  </ul>
                </div>
              </div>
            </div>

      {/* Veritabanı Kayıt Progress Modal */}
      {isSavingToDatabase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-semibold mb-2">Veritabanı İşlemi Devam Ediyor</h3>
              <p className="text-gray-600 mb-4">{databaseProgress.operation}</p>
              
              {databaseProgress.currentProduct && (
                <p className="text-sm text-gray-500 mb-4">
                  <span className="font-medium">Mevcut Ürün:</span> {databaseProgress.currentProduct}
                </p>
              )}
              
              {databaseProgress.total > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(databaseProgress.current / databaseProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    {databaseProgress.current} / {databaseProgress.total} ürün işlendi
                  </p>
                </>
              )}
              
              <p className="text-xs text-gray-400 mt-4 mb-4">
                Lütfen bekleyiniz, işlem tamamlanıyor...
              </p>
              
              <button
                onClick={async () => {
                  if (window.confirm('Veritabanı işlemini iptal etmek istediğinizden emin misiniz?\n\nBu işlem şu ana kadar kaydedilen ürünleri geri alacaktır.')) {
                    // Set cancellation flag
                    isSaveCancelledRef.current = true;
                    
                    // Abort ongoing operations
                    if (saveAbortControllerRef.current) {
                      saveAbortControllerRef.current.abort();
                    }
                    
                    // Check if there are products to rollback
                    const savedCount = currentSessionSavedProducts.current.length;
                    if (savedCount > 0) {
                      const rollbackConfirm = window.confirm(`${savedCount} adet ürün bu oturumda kaydedildi.\n\nBu ürünleri silmek ister misiniz?`);
                      
                      if (rollbackConfirm) {
                        setDatabaseProgress({ 
                          current: 0, 
                          total: savedCount, 
                          operation: 'Kaydedilen ürünler geri alınıyor...', 
                          currentProduct: 'Rollback işlemi başlatılıyor...' 
                        });
                        
                        // Rollback saved products
                        let rollbackCount = 0;
                        for (const savedProduct of currentSessionSavedProducts.current) {
                          try {
                            // Use stok_kodu for deletion as API expects this
                            const deleteUrl = `${savedProduct.api_url}?stok_kodu=${encodeURIComponent(savedProduct.stok_kodu)}`;
                            console.log(`🔄 Attempting to rollback ${savedProduct.type}: ${savedProduct.stok_kodu}`);
                            
                            const response = await fetchWithAuth(deleteUrl, {
                              method: 'DELETE'
                            });
                            
                            if (response.ok) {
                              rollbackCount++;
                              console.log(`✅ Rolled back ${savedProduct.type} product: ${savedProduct.stok_kodu}`);
                            } else {
                              console.error(`❌ Failed to rollback ${savedProduct.type} product: ${savedProduct.stok_kodu}`);
                            }
                            
                            setDatabaseProgress({ 
                              current: rollbackCount, 
                              total: savedCount, 
                              operation: 'Kaydedilen ürünler geri alınıyor...', 
                              currentProduct: `${savedProduct.stok_kodu} siliniyor...` 
                            });
                          } catch (error) {
                            console.error(`Error rolling back ${savedProduct.stok_kodu}:`, error);
                          }
                        }
                        
                        toast.success(`${rollbackCount} ürün başarıyla geri alındı`);
                        
                        // Refresh database to show changes
                        await fetchSavedProducts(false, true);
                      }
                    }
                    
                    // Clear session saved products
                    currentSessionSavedProducts.current = [];
                    
                    // Close modal and reset states
                    setIsSavingToDatabase(false);
                    setIsLoading(false);
                    toast.warning('İşlem kullanıcı tarafından iptal edildi');
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Üretim Progress Modal */}
      {isGeneratingExcel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-semibold mb-2">Excel Dosyaları Oluşturuluyor</h3>
              <p className="text-gray-600 mb-4">{excelProgress.operation}</p>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(excelProgress.current / excelProgress.total) * 100}%` }}
                />
              </div>
              
              <p className="text-sm text-gray-500">
                {excelProgress.current} / {excelProgress.total} dosya
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Progress Modal */}
      {isBulkDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-red-600" />
              <h3 className="text-lg font-semibold mb-2">Toplu Silme İşlemi</h3>
              <p className="text-gray-600 mb-4">{bulkDeleteProgress.operation}</p>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkDeleteProgress.current / bulkDeleteProgress.total) * 100}%` }}
                />
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                {bulkDeleteProgress.current} / {bulkDeleteProgress.total} ürün silindi
              </p>
              
              {bulkDeleteProgress.currentItem && (
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium text-gray-800">İşlenen Ürün:</p>
                  <p className="text-sm text-gray-600">{bulkDeleteProgress.currentItem}</p>
                </div>
              )}
              
              <button
                onClick={() => {
                  setIsBulkDeleting(false);
                  setBulkDeleteProgress({ current: 0, total: 0, operation: '', currentItem: '' });
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Veritabanı Modal */}
      {showDatabaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Çelik Hasır Veritabanı</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      // Force cache invalidation and full refresh
                      console.log('🔄 Manual refresh clicked - invalidating all caches');
                      cacheRef.current.clear();
                      
                      // Reset batch sequence initialization to force fresh sequence check
                      batchSequenceInitialized = false;
                      console.log('🔄 Reset batch sequence initialization flag');
                      
                      // Refresh saved products
                      await fetchSavedProducts(false, true); // isRetry=false, resetData=true
                      
                      // Also refresh sequences data to get latest from sequence table
                      try {
                        const sequencesResponse = await fetchWithAuth(API_URLS.celikHasirSequence);
                        if (sequencesResponse.ok) {
                          const sequenceData = await sequencesResponse.json();
                          const sequenceMap = {};
                          sequenceData.forEach(seq => {
                            const key = `${seq.product_type}_${seq.kod_2}_${seq.cap_code}`;
                            sequenceMap[key] = seq.last_sequence || 0;
                          });
                          setSequences(sequenceMap);
                          console.log('🔄 Sequences refreshed from table');
                        }
                      } catch (seqError) {
                        console.warn('Failed to refresh sequences:', seqError);
                      }
                    }}
                    disabled={isLoadingDb}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-400"
                    title="Veriyi yenile ve sıra numaralarını güncelle"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingDb ? 'animate-spin' : ''}`} />
                    Yenile
                  </button>

                  <button
                    onClick={() => generateBulkExcelFromDatabase()}
                    disabled={isGeneratingExcel}
                    className="px-3 py-1 bg-teal-600 text-white rounded-md flex items-center gap-2 hover:bg-teal-700 transition-colors text-sm disabled:bg-gray-400"
                  >
                    <FileSpreadsheet className={`w-4 h-4 ${isGeneratingExcel ? 'animate-spin' : ''}`} />
                    Tüm Ürünler Excel
                  </button>
                  
                  {/* Selection-based action buttons */}
                  {selectedDbItems.length > 0 && (
                    <>
                      <button
                        onClick={handleBulkDeleteSelected}
                        disabled={isDeletingBulkDb}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-gray-400 text-sm flex items-center gap-1"
                      >
                        {isDeletingBulkDb ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        {isDeletingBulkDb ? `Siliniyor... (${selectedDbItems.length})` : `Seçilileri Sil (${selectedDbItems.length})`}
                      </button>
                      {activeDbTab === 'mm' && (
                        <button
                          onClick={handleBulkExportSelected}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Excel Oluştur ({selectedDbItems.length})
                        </button>
                      )}
                    </>
                  )}
                  
                  <button
                    onClick={() => setShowDatabaseModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex gap-1 mt-4">
                {[
                  { key: 'mm', label: 'CH Ürünler', count: savedProducts.mm.length },
                  { key: 'ncbk', label: 'YM NCBK', count: savedProducts.ncbk.length },
                  { key: 'ntel', label: 'YM NTEL', count: savedProducts.ntel.length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveDbTab(tab.key);
                      setSelectedDbItems([]);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeDbTab === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              
              {/* Danger Zone - Hidden behind dropdown to prevent accidental clicks */}
              <div className="mt-6 pt-4 border-t border-red-200 bg-red-50 rounded-lg mx-4">
                {/* Dropdown toggle */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-700 font-medium text-sm">TEHLİKELİ İŞLEMLER</span>
                  </div>
                  <button
                    onClick={() => setShowDangerZone(!showDangerZone)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-md flex items-center gap-2 hover:bg-red-200 transition-colors text-sm border border-red-300"
                  >
                    <span>Göster</span>
                    {showDangerZone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Collapsible danger zone content */}
                {showDangerZone && (
                  <div className="px-3 pb-3 border-t border-red-300 mt-2 pt-3">
                    <button
                      onClick={() => setShowBulkDeleteModal(true)}
                      disabled={isLoading}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-md flex items-center justify-center gap-2 hover:bg-red-700 transition-colors text-sm disabled:bg-gray-400 border-2 border-red-700 mb-2"
                    >
                      {isLoading ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      {isLoading ? 'Siliniyor...' : (activeDbTab === 'mm' ? 'Tüm CH\'leri Sil' : activeDbTab === 'ncbk' ? 'Tüm NCBK\'leri Sil' : 'Tüm NTEL\'leri Sil')}
                    </button>
                    <p className="text-xs text-red-600 text-center">
                      ⚠️ Bu işlem seçili sekmedeki tüm kayıtları kalıcı olarak siler. Bu işlem geri alınamaz!
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Filter Controls */}
              <div className="mb-4 space-y-3">
                {/* Search and main filters row */}
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Ara (Stok Kodu, Stok Adı, Grup Kodu...)"
                    value={dbSearchText}
                    onChange={(e) => setDbSearchText(e.target.value)}
                    className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={dbFilterHasirTipi}
                    onChange={(e) => setDbFilterHasirTipi(e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">Hasır Tipi</option>
                    <option value="Q Tipleri">Q Tipleri</option>
                    <option value="R Tipleri">R Tipleri</option>
                    <option value="TR Tipleri">TR Tipleri</option>
                  </select>
                  <select
                    value={dbFilterHasirTuru}
                    onChange={(e) => setDbFilterHasirTuru(e.target.value)}
                    className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">Hasır Türü</option>
                    <option value="Standart">Standart</option>
                    <option value="Perde">Perde</option>
                    <option value="DK Perde">DK Perde</option>
                    <option value="Döşeme">Döşeme</option>
                  </select>
                </div>
                
                {/* Sorting controls */}
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="flex items-center gap-2 ml-auto">
                    <label className="text-sm text-gray-600">Sırala:</label>
                    <select
                      value={dbSortBy}
                      onChange={(e) => setDbSortBy(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="stok_kodu">Stok Kodu</option>
                      <option value="stok_adi">Stok Adı</option>
                      <option value="cap">Çap</option>
                      <option value="length_cm">Uzunluk</option>
                      <option value="created_at">Eklenme Tarihi</option>
                    </select>
                    <select
                      value={dbSortOrder}
                      onChange={(e) => setDbSortOrder(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="asc">Artan</option>
                      <option value="desc">Azalan</option>
                    </select>
                  </div>
                </div>
                
                {/* Clear filters button */}
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => {
                      setDbSearchText('');
                      setDbFilterHasirTipi('All');
                      setDbFilterHasirTuru('All');
                      setDbSortBy('stok_kodu');
                      setDbSortOrder('asc');
                      setSelectedDbItems([]);
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                  <span className="text-sm text-gray-600">
                    {isLoadingDb ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-1 bg-blue-600 transition-all duration-300"
                            style={{ width: `${(dbLoadingProgress.current / dbLoadingProgress.total) * 100}%` }}
                          ></div>
                        </div>
                        {backendError?.type === 'retrying' ? backendError.message : (dbLoadingProgress.operation || 'Veriler yükleniyor...')}
                      </span>
                    ) : isFilteringDb ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        Filtreler uygulanıyor...
                      </span>
                    ) : backendError ? (
                      <span className="flex items-center gap-2 text-red-600">
                        <div className="w-4 h-4 text-red-500">⚠️</div>
                        Bağlantı hatası
                      </span>
                    ) : (
                      <>Toplam: {getFilteredAndSortedProducts().length} / {savedProducts[activeDbTab].length} ürün</>
                    )}
                  </span>
                </div>

                {/* Select All Checkbox */}
                <div className="flex items-center gap-3 py-2 px-3 bg-gray-50 border border-gray-200 rounded-md">
                  <input
                    type="checkbox"
                    checked={
                      getFilteredAndSortedProducts().length > 0 && 
                      getFilteredAndSortedProducts().every(product => selectedDbItems.includes(product.id))
                    }
                    onChange={() => handleSelectAllDb(getFilteredAndSortedProducts())}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Tümünü Seç ({getFilteredAndSortedProducts().length} ürün)
                  </label>
                </div>


              </div>
              
              {/* Ürün Listesi */}
              <div className="space-y-3">
                {!isFilteringDb && getFilteredAndSortedProducts().map(product => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedDbItems.includes(product.id)}
                          onChange={() => handleToggleDbSelection(product.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{product.stok_kodu}</h4>
                          <p className="text-sm text-gray-600 mb-2">{product.stok_adi}</p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>Grup: {product.grup_kodu}</span>
                            <span>Kod-1: {product.kod_1}</span>
                            {product.cap && <span>Çap: {product.cap}mm</span>}
                            {product.length_cm && <span>Uzunluk: {product.length_cm}cm</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setViewingProduct({ ...product, type: activeDbTab });
                            setShowViewModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id, activeDbTab)}
                          disabled={deletingProductId === product.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Sil"
                        >
                          {deletingProductId === product.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Backend Error Panel */}
                {backendError && backendError.type === 'connection' && (
                  <div className="text-center py-12 px-6">
                    <div className="max-w-md mx-auto">
                      <div className="w-16 h-16 mx-auto mb-4 text-red-500">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Veritabanı Bağlantısı Kurulamadı</h3>
                      <p className="text-gray-600 mb-4 text-sm">{backendError.message}</p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-800">
                        <strong>Olası Nedenler:</strong>
                        <ul className="mt-1 list-disc list-inside text-left">
                          <li>Vercel Backend deployment hatası</li>
                          <li>Supabase veritabanı bağlantı sorunu</li>
                          <li>Geçici sunucu bakımı</li>
                        </ul>
                      </div>
                      {backendError.canRetry && (
                        <button
                          onClick={() => {
                            setRetryCount(0);
                            fetchSavedProducts();
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-2 mx-auto"
                        >
                          <RefreshCw className="w-4 h-4" />
                          🔄 Tekrar Dene
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Filter Loading Overlay */}
                {isFilteringDb && (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4 text-gray-500">
                      <div className="w-8 h-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                      <div className="text-sm">Veriler getiriliyor...</div>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!backendError && getFilteredAndSortedProducts().length === 0 && !isLoadingDb && !isFilteringDb && (
                  <div className="text-center py-8 text-gray-500">
                    {savedProducts[activeDbTab].length === 0 
                      ? "Bu kategoride kayıtlı ürün bulunmamaktadır."
                      : "Filtrelere uygun ürün bulunmamaktadır."
                    }
                  </div>
                )}
                
                
                {/* Loading indicator for initial load */}
                {isLoadingDb && savedProducts[activeDbTab].length === 0 && !backendError && (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4 text-gray-500 max-w-md mx-auto">
                      <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300 relative"
                          style={{ width: `${(dbLoadingProgress.current / dbLoadingProgress.total) * 100}%` }}
                        >
                          <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{dbLoadingProgress.operation || 'Veriler yükleniyor...'}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {dbLoadingProgress.current} / {dbLoadingProgress.total} adım tamamlandı
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Retry Loading State */}
                {isLoadingDb && backendError?.type === 'retrying' && (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-blue-600">
                      <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
                      <p className="text-sm font-medium">{backendError.message}</p>
                      <p className="text-xs text-gray-400">Otomatik yeniden deneme</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Veritabanı İşlemi Uyarı Modalı */}
      {showDatabaseWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-xl font-semibold text-gray-900">Veritabanı İşlemi Uyarısı</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                <strong>Dikkat:</strong> Bu işlem veritabanında değişiklik yapacaktır.
              </p>
              <p className="text-gray-600 text-sm">
                Yeni ürünler veritabanına kaydedilecek ve tüm Excel dosyaları oluşturulacaktır. 
                Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDatabaseWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={async () => {
                  setShowDatabaseWarning(false);
                  
                  try {
                    const newProducts = await saveToDatabase(validProducts);
                    if (newProducts && newProducts.length > 0) {
                      console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için - database fetch mode`);
                      console.log('newProducts returned from saveToDatabase:', newProducts.map(p => ({ 
                        existingStokKodu: p.existingStokKodu, 
                        hasirTipi: p.hasirTipi, 
                        uzunlukBoy: p.uzunlukBoy, 
                        uzunlukEn: p.uzunlukEn 
                      })));
                      
                      // Unified approach: Fetch saved products from database with fallback
                      try {
                        // Direct unified fetch approach - use the stok_kodu from saved products
                        const stokKodular = newProducts.map(p => p.existingStokKodu || generateStokKodu(p, 'CH', 0)).filter(Boolean);
                        console.log('Looking for these stok_kodu values:', stokKodular);
                        
                        // Update UI to show data fetching phase
                        setDatabaseProgress({ 
                          current: 0, 
                          total: stokKodular.length, 
                          operation: 'Kaydedilen ürünlerin detayları alınıyor...',
                          currentProduct: 'Veritabanından çubuk sayıları ve reçete bilgileri getiriliyor'
                        });
                        
                        // Use unified fetch directly with stok_kodu (bypassing the problematic fetchSavedProducts)
                        const databaseProducts = await fetchDatabaseDataWithFallback([], stokKodular);
                        console.log('fetchDatabaseDataWithFallback returned:', databaseProducts?.length || 0, 'products');
                        console.log('First database product data:', databaseProducts?.[0] ? {
                          stok_kodu: databaseProducts[0].existingStokKodu,
                          cubukSayisiBoy: databaseProducts[0].cubukSayisiBoy,
                          cubukSayisiEn: databaseProducts[0].cubukSayisiEn,
                          hasRecipeData: !!databaseProducts[0].recipeData
                        } : 'none');
                        
                        if (databaseProducts && databaseProducts.length > 0) {
                          // Update UI before starting Excel generation
                          setDatabaseProgress({ 
                            current: databaseProducts.length, 
                            total: databaseProducts.length, 
                            operation: 'Veriler alındı, Excel dosyaları oluşturuluyor...',
                            currentProduct: ''
                          });
                          await generateExcelFiles(databaseProducts);
                          toast.success(`${databaseProducts.length} yeni ürün için Excel dosyaları oluşturuldu!`);
                        } else {
                          // Database fetch failed - apply fallback formula to newProducts
                          console.warn('Unified fetch returned no data, applying fallback formula to original data');
                          const fallbackProducts = await Promise.all(
                            newProducts.map(async (product) => {
                              const fallbackResult = await calculateFallbackCubukSayisi(
                                product.hasirTipi,
                                parseFloat(product.uzunlukBoy || 0),
                                parseFloat(product.uzunlukEn || 0)
                              );
                              return {
                                ...product,
                                cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                                cubukSayisiEn: fallbackResult.cubukSayisiEn
                              };
                            })
                          );
                          console.log('Applied fallback formula to', fallbackProducts.length, 'products');
                          await generateExcelFiles(fallbackProducts);
                          toast.success(`${fallbackProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Fallback Formula)`);
                        }
                      } catch (innerError) {
                        console.error('Unified fetch failed, falling back to original method:', innerError);
                        await generateExcelFiles(newProducts);
                        toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Fallback to original)`);
                      }
                    } else {
                      toast.info('Hiç yeni ürün eklenmedi, Excel oluşturulmadı.');
                    }
                  } catch (error) {
                    console.error('Database save error:', error);
                    toast.error('Veritabanı kaydı sırasında hata oluştu');
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Evet, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Silme Onay Modalı */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-semibold text-gray-900">Tümünü Sil Onayı</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                <strong>Dikkat:</strong> Bu işlem tüm {activeDbTab === 'mm' ? 'CH' : activeDbTab === 'ncbk' ? 'NCBK' : 'NTEL'} kayıtlarını kalıcı olarak silecektir.
              </p>
              <p className="text-gray-600 text-sm mb-4">
                Bu işlemi onaylamak için aşağıya <strong>"Hepsini Sil"</strong> yazın:
              </p>
              <input
                type="text"
                value={bulkDeleteText}
                onChange={(e) => setBulkDeleteText(e.target.value)}
                placeholder="Hepsini Sil"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setBulkDeleteText('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={bulkDeleteAll}
                disabled={bulkDeleteText !== 'Hepsini Sil' || isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ürün Görüntüleme Modalı */}
      {showViewModal && viewingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  {viewingProduct.type === 'mm' ? 'CH Mamül' : 
                   viewingProduct.type === 'ncbk' ? 'YM NCBK Yarı Mamül' : 
                   'YM NTEL Yarı Mamül'} Detayları
                </h3>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingProduct(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stok Kodu</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.stok_kodu}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stok Adı</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.stok_adi}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Grup</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.grup_kodu}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Kod-1</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.kod_1}</p>
                  </div>
                  {viewingProduct.kod_2 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Kod-2</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.kod_2}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {viewingProduct.cap && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Çap (mm)</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.cap}</p>
                    </div>
                  )}
                  {viewingProduct.length_cm && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Uzunluk (cm)</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.length_cm}</p>
                    </div>
                  )}
                  {viewingProduct.ebat_boy && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ebat (Boy)</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.ebat_boy}</p>
                    </div>
                  )}
                  {viewingProduct.ebat_en && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ebat (En)</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.ebat_en}</p>
                    </div>
                  )}
                  {viewingProduct.goz_araligi && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Göz Aralığı</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.goz_araligi}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Birim-1</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.br_1}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Oluşturulma</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(viewingProduct.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingProduct(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Options Modal */}
      {showExcelOptionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold">Excel Oluşturma Seçenekleri</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Hangi ürünler için Excel dosyalarını oluşturmak istiyorsunuz?
            </p>
            <div className="space-y-3">
              <button
                onClick={async () => {
                  setShowExcelOptionsModal(false);
                  
                  // Initialize batch sequence before any stok kodu generation
                  await initializeBatchSequence();
                  
                  // Combine both approaches: planned codes for new, highest codes for existing
                  const allProductsWithCodes = [];
                  
                  // Create stokAdi mapping for existing products
                  const stokAdiToStokKodusMap = new Map();
                  savedProducts.mm.forEach(product => {
                    const productStokAdi = product.stok_adi;
                    if (productStokAdi) {
                      if (!stokAdiToStokKodusMap.has(productStokAdi)) {
                        stokAdiToStokKodusMap.set(productStokAdi, []);
                      }
                      stokAdiToStokKodusMap.get(productStokAdi).push(product.stok_kodu);
                    }
                  });
                  
                  // Reset batch counter for planned stok_kodu generation
                  resetBatchSequenceCounter();
                  let plannedIndex = 0;
                  
                  for (const product of validProducts) {
                    const productStokAdi = generateStokAdi(product, 'CH');
                    const existingStokKodus = stokAdiToStokKodusMap.get(productStokAdi) || [];
                    
                    if (existingStokKodus.length > 0) {
                      // Existing product - use highest stok_kodu
                      const sortedCodes = existingStokKodus.sort((a, b) => {
                        const numA = parseInt(a.match(/CHOZL(\d+)/)?.[1] || '0');
                        const numB = parseInt(b.match(/CHOZL(\d+)/)?.[1] || '0');
                        return numB - numA; // Descending order 
                      });
                      const highestStokKodu = sortedCodes[0];
                      
                      allProductsWithCodes.push({
                        ...product,
                        existingStokKodu: highestStokKodu
                      });
                    } else {
                      // New product - use planned stok_kodu
                      allProductsWithCodes.push({
                        ...product,
                        existingStokKodu: generateStokKodu(product, 'CH', plannedIndex)
                      });
                      plannedIndex++;
                    }
                  }
                  
                  await generateExcelFiles(allProductsWithCodes, true);
                }}
                disabled={isGeneratingExcel}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-left flex items-center gap-2"
              >
                {isGeneratingExcel && <Loader className="w-5 h-5 animate-spin" />}
                <div>
                  <div className="font-medium">Tüm Ürünler ({validProducts.length} adet)</div>
                  <div className="text-sm opacity-90 mt-1">Yeniler için planlanan, mevcutlar için en yüksek stok kodu</div>
                </div>
              </button>
              
              <button
                onClick={async () => {
                  setShowExcelOptionsModal(false);
                  const newProducts = getProductsToSave();
                  if (newProducts.length === 0) {
                    toast.info('Kaydedilmemiş ürün bulunamadı.');
                    return;
                  }
                  
                  // Reset batch counter for new planned stok_kodu generation
                  resetBatchSequenceCounter();
                  
                  // Initialize batch sequence before any stok kodu generation
                  await initializeBatchSequence();
                  
                  // Add planned stok_kodu to new products for Excel generation 
                  const newProductsWithPlannedCodes = [];
                  for (let index = 0; index < newProducts.length; index++) {
                    const product = newProducts[index];
                    const stokKodu = generateStokKodu(product, 'CH', index);
                    newProductsWithPlannedCodes.push({
                      ...product,
                      existingStokKodu: stokKodu
                    });
                  }
                  
                  await generateExcelFiles(newProductsWithPlannedCodes, false);
                }}
                disabled={isGeneratingExcel}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-left flex items-center gap-2"
              >
                {isGeneratingExcel && <Loader className="w-5 h-5 animate-spin" />}
                <div>
                  <div className="font-medium">Sadece Yeni Ürünler ({getProductsToSave().length} adet)</div>
                  <div className="text-sm opacity-90 mt-1">Planlanan stok kodları ile Excel oluştur (Kaydetmez)</div>
                </div>
              </button>
              
              <button
                onClick={async () => {
                  setShowExcelOptionsModal(false);
                  
                  // Find existing products using the same duplicate finder logic
                  const existingProductsWithHighestCodes = [];
                  
                  // Use the same stokAdi mapping logic from saveToDatabase
                  const stokAdiToStokKodusMap = new Map();
                  savedProducts.mm.forEach(product => {
                    const productStokAdi = product.stok_adi;
                    if (productStokAdi) {
                      if (!stokAdiToStokKodusMap.has(productStokAdi)) {
                        stokAdiToStokKodusMap.set(productStokAdi, []);
                      }
                      stokAdiToStokKodusMap.get(productStokAdi).push(product.stok_kodu);
                    }
                  });
                  
                  validProducts.forEach(product => {
                    const productStokAdi = generateStokAdi(product, 'CH');
                    const existingStokKodus = stokAdiToStokKodusMap.get(productStokAdi) || [];
                    
                    if (existingStokKodus.length > 0) {
                      // Find the highest stok_kodu (CHOZL1500 > CHOZL1000)
                      const sortedCodes = existingStokKodus.sort((a, b) => {
                        const numA = parseInt(a.match(/CHOZL(\d+)/)?.[1] || '0');
                        const numB = parseInt(b.match(/CHOZL(\d+)/)?.[1] || '0');
                        return numB - numA; // Descending order 
                      });
                      const highestStokKodu = sortedCodes[0];
                      
                      existingProductsWithHighestCodes.push({
                        ...product,
                        existingStokKodu: highestStokKodu
                      });
                    }
                  });
                  
                  if (existingProductsWithHighestCodes.length === 0) {
                    toast.info('Kaydedilmiş ürün bulunamadı.');
                    return;
                  }
                  
                  await generateExcelFiles(existingProductsWithHighestCodes, false);
                }}
                disabled={isGeneratingExcel}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-left flex items-center gap-2"
              >
                {isGeneratingExcel && <Loader className="w-5 h-5 animate-spin" />}
                <div>
                  <div className="font-medium">Sadece Mevcut Ürünler</div>
                  <div className="text-sm opacity-90 mt-1">En yüksek stok kodlu kayıtlı ürünler için Excel oluştur</div>
                </div>
              </button>
              
              <button
                onClick={async () => {
                  setShowExcelOptionsModal(false);
                  await generateKaynakProgramiExcel();
                }}
                disabled={isGeneratingExcel}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors text-left flex items-center gap-2"
              >
                {isGeneratingExcel && <Loader className="w-5 h-5 animate-spin" />}
                <div>
                  <div className="font-medium">📊 Kaynak Programı Oluştur</div>
                  <div className="text-sm opacity-90 mt-1">Mevcut ürünler için kaynak programı Excel dosyası oluştur</div>
                </div>
              </button>

            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => {
                  // Cancel any ongoing Excel generation
                  if (isGeneratingExcel) {
                    setCancelExcelGeneration(true);
                    setIsGeneratingExcel(false);
                    setExcelProgress({ current: 0, total: 0, operation: '' });
                    toast.info('Excel oluşturma işlemi iptal edildi');
                  }
                  setShowExcelOptionsModal(false);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {isGeneratingExcel ? 'İşlemi İptal Et' : 'İptal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Save Confirmation Modal */}
      {showPreSaveConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold">Veritabanı Kayıt Onayı</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-6">
              <div className="flex gap-4 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
                  <div className="font-medium text-green-800">Yeni Ürünler</div>
                  <div className="text-2xl font-bold text-green-600">{preSaveConfirmData.newProducts.length}</div>
                  <div className="text-sm text-green-600">Veritabanına eklenecek</div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
                  <div className="font-medium text-blue-800">Mevcut Ürünler</div>
                  <div className="text-2xl font-bold text-blue-600">{preSaveConfirmData.existingProducts?.length || preSaveConfirmData.skippedProducts?.length || 0}</div>
                  <div className="text-sm text-blue-600">Zaten kayıtlı</div>
                </div>
                
                {preSaveConfirmData.batchDuplicates && preSaveConfirmData.batchDuplicates.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex-1">
                    <div className="font-medium text-orange-800">Duplike Ürünler</div>
                    <div className="text-2xl font-bold text-orange-600">{preSaveConfirmData.batchDuplicates.length}</div>
                    <div className="text-sm text-orange-600">Listede tekrarlanan</div>
                  </div>
                )}
              </div>
              
              {preSaveConfirmData.newProducts.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Eklenecek Yeni Ürünler:</h4>
                  <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                    {preSaveConfirmData.newProducts.map((product, index) => (
                      <div key={index} className="text-sm mb-1">
                        <span className="font-mono text-green-600">{product.newStokKodu}</span> - {product.stokAdi}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(preSaveConfirmData.existingProducts?.length > 0 || preSaveConfirmData.skippedProducts?.length > 0) && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Zaten Kayıtlı Ürünler:</h4>
                  <div className="max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium text-gray-700 border-r border-gray-200">Ürün</th>
                          <th className="text-left p-2 font-medium text-gray-700 border-r border-gray-200">CH Stok Kodları</th>
                          <th className="text-left p-2 font-medium text-gray-700 border-r border-gray-200">NCBK</th>
                          <th className="text-left p-2 font-medium text-gray-700">NTEL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(preSaveConfirmData.existingProducts || preSaveConfirmData.skippedProducts || []).map((product, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-2 border-r border-gray-200">
                              <div className="font-medium text-gray-800 max-w-xs break-words">
                                {product.stokAdi}
                              </div>
                            </td>
                            <td className="p-2 border-r border-gray-200">
                              <div className="font-mono text-xs text-blue-600">
                                {product.existingStokKodus && product.existingStokKodus.length > 0 
                                  ? product.existingStokKodus.map((kod, i) => (
                                      <div key={i} className="bg-blue-50 px-1 py-0.5 rounded mb-1 last:mb-0">{kod}</div>
                                    ))
                                  : <span className="text-gray-400 italic">Kayıtsız</span>}
                              </div>
                            </td>
                            <td className="p-2 border-r border-gray-200">
                              <div className="font-mono text-xs">
                                {(() => {
                                  // Generate specific NCBK products needed for this CH product
                                  const boyCap = parseFloat(product.boyCap || 0);
                                  const enCap = parseFloat(product.enCap || 0);
                                  const neededNCBK = [];
                                  
                                  // Boy direction NCBK (actual uzunlukBoy)
                                  if (boyCap > 0) {
                                    const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
                                    const boyNCBKStokKodu = `YM.NCBK.${String(Math.round(boyCap * 100)).padStart(4, '0')}.${uzunlukBoy}`;
                                    const boyNCBKStokAdi = `YM Nervürlü Çubuk ${boyCap} mm ${uzunlukBoy} cm`;
                                    const boyExists = savedProducts.ncbk?.some(p => p.stok_kodu === boyNCBKStokKodu || p.stok_adi === boyNCBKStokAdi);
                                    
                                    neededNCBK.push({
                                      stokKodu: boyNCBKStokKodu,
                                      exists: boyExists,
                                      label: `${boyCap}mm-${uzunlukBoy}cm`
                                    });
                                  }
                                  
                                  // En direction NCBK (actual uzunlukEn) 
                                  if (enCap > 0) {
                                    const uzunlukEn = parseInt(product.uzunlukEn || 0);
                                    const enNCBKStokKodu = `YM.NCBK.${String(Math.round(enCap * 100)).padStart(4, '0')}.${uzunlukEn}`;
                                    const enNCBKStokAdi = `YM Nervürlü Çubuk ${enCap} mm ${uzunlukEn} cm`;
                                    const enExists = savedProducts.ncbk?.some(p => p.stok_kodu === enNCBKStokKodu || p.stok_adi === enNCBKStokAdi);
                                    
                                    neededNCBK.push({
                                      stokKodu: enNCBKStokKodu,
                                      exists: enExists,
                                      label: `${enCap}mm-${uzunlukEn}cm`
                                    });
                                  }
                                  
                                  return neededNCBK.map((ncbk, i) => (
                                    <div key={i} className={`px-1 py-0.5 rounded mb-1 last:mb-0 ${
                                      ncbk.exists ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                      <div className="font-semibold">{ncbk.label}</div>
                                      <div className="text-xs opacity-75">{ncbk.exists ? '✓ Kayıtlı' : '✗ Kayıtsız'}</div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="font-mono text-xs">
                                {(() => {
                                  // Generate specific NTEL products needed for this CH product
                                  const boyCap = parseFloat(product.boyCap || 0);
                                  const enCap = parseFloat(product.enCap || 0);
                                  const neededNTEL = [];
                                  
                                  // Boy direction NTEL
                                  if (boyCap > 0) {
                                    const boyNTELStokKodu = `YM.NTEL.${String(Math.round(boyCap * 100)).padStart(4, '0')}`;
                                    const boyNTELStokAdi = `YM Nervürlü Tel ${boyCap} mm`;
                                    const boyExists = savedProducts.ntel?.some(p => p.stok_kodu === boyNTELStokKodu || p.stok_adi === boyNTELStokAdi);
                                    
                                    neededNTEL.push({
                                      stokKodu: boyNTELStokKodu,
                                      exists: boyExists,
                                      label: `${boyCap}mm Tel`,
                                      diameter: boyCap
                                    });
                                  }
                                  
                                  // En direction NTEL (if different from boy)
                                  if (enCap > 0 && enCap !== boyCap) {
                                    const enNTELStokKodu = `YM.NTEL.${String(Math.round(enCap * 100)).padStart(4, '0')}`;
                                    const enNTELStokAdi = `YM Nervürlü Tel ${enCap} mm`;
                                    const enExists = savedProducts.ntel?.some(p => p.stok_kodu === enNTELStokKodu || p.stok_adi === enNTELStokAdi);
                                    
                                    neededNTEL.push({
                                      stokKodu: enNTELStokKodu,
                                      exists: enExists,
                                      label: `${enCap}mm Tel`,
                                      diameter: enCap
                                    });
                                  }
                                  
                                  return neededNTEL.map((ntel, i) => (
                                    <div key={i} className={`px-1 py-0.5 rounded mb-1 last:mb-0 ${
                                      ntel.exists ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                      <div className="font-semibold">{ntel.label}</div>
                                      <div className="text-xs opacity-75">{ntel.exists ? '✓ Kayıtlı' : '✗ Kayıtsız'}</div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {preSaveConfirmData.batchDuplicates && preSaveConfirmData.batchDuplicates.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <span className="text-orange-600">⚠️</span> 
                    Duplike Ürünler:
                  </h4>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                    <div className="mb-2 text-orange-800">
                      <strong>{preSaveConfirmData.batchDuplicates.length} duplike ürün</strong> tespit edildi. 
                      Bu ürünler listede birden fazla kez bulunuyor ve sadece bir kez kaydedilecek:
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {preSaveConfirmData.batchDuplicates.map((duplicate, index) => {
                        // Extract Göz Aralığı from stok adı
                        const gozMatch = duplicate.stokAdi.match(/Göz Ara\(([^)]+)\)/);
                        const gozAraligi = gozMatch ? gozMatch[1] : 'N/A';
                        
                        // Use the main analysis results instead of re-analyzing
                        // Check if this duplicate's stokAdi is in the newProducts list
                        const isInNewProducts = preSaveConfirmData.newProducts.some(p => 
                          p.stokAdi === duplicate.stokAdi
                        );
                        
                        // Check if this duplicate's stokAdi is in the existingProducts list
                        const existingProduct = preSaveConfirmData.existingProducts?.find(p => 
                          p.stokAdi === duplicate.stokAdi
                        ) || preSaveConfirmData.skippedProducts?.find(p => 
                          p.stok_adi === duplicate.stokAdi || 
                          (p.existingStokKodus && p.existingStokKodus.length > 0)
                        );
                        
                        const isExisting = !!existingProduct && !isInNewProducts;
                        const assignedStokKodu = isExisting 
                          ? (existingProduct.stok_kodu || existingProduct.existingStokKodus?.[0] || 'Unknown')
                          : (preSaveConfirmData.newProducts.find(p => p.stokAdi === duplicate.stokAdi)?.newStokKodu || `CHOZL${sequences.CHOZL || '2400'}+ (yeni)`);
                        
                        return (
                          <div key={index} className="mb-2 p-2 bg-white rounded border border-orange-200">
                            <div className="flex justify-between items-start mb-1">
                              <div className="font-medium text-orange-800 flex-1">
                                {duplicate.stokAdi}
                              </div>
                              <div className={`text-xs px-2 py-1 rounded ml-2 ${
                                isExisting 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {isExisting ? 'Mevcut' : 'Yeni'}
                              </div>
                            </div>
                            <div className="text-xs text-orange-600 mb-1">
                              Specs: {duplicate.hasirTipi} - {duplicate.uzunlukBoy}x{duplicate.uzunlukEn}cm - Göz: {gozAraligi}
                            </div>
                            <div className="text-xs font-mono text-gray-600">
                              Stok Kodu: <span className={isExisting ? 'text-blue-600' : 'text-green-600'}>
                                {assignedStokKodu}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-xs text-orange-700 bg-orange-100 p-2 rounded">
                      💡 Bu duplike ürünler otomatik olarak filtrelenecek ve sadece bir kez veritabanına kaydedilecek.
                    </div>
                  </div>
                </div>
              )}
              
              {preSaveConfirmData.allSkippedStokKodus && preSaveConfirmData.allSkippedStokKodus.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Mevcut Stok Kodus ({preSaveConfirmData.allSkippedStokKodus.length}):</h4>
                  <div className="max-h-40 overflow-y-auto bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {preSaveConfirmData.allSkippedStokKodus.map((stokKodu, index) => (
                        <div key={index} className="font-mono text-yellow-800 bg-yellow-100 px-2 py-1 rounded">
                          {stokKodu}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowPreSaveConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await generateKaynakProgramiExcel();
                  }}
                  disabled={isSavingToDatabase || isGeneratingExcel}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2 justify-center"
                >
                  📊 Kaynak Programı Oluştur
                </button>
                
                {preSaveConfirmData.newProducts.length > 0 && (
                  <button
                    onClick={async () => {
                      setShowPreSaveConfirmModal(false);
                      const newProducts = await saveToDatabase(validProducts);
                      if (newProducts && newProducts.length > 0) {
                        console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için - database fetch mode`);
                        
                        // SEAMLESS TRANSITION: Close database modal, start Excel generation immediately
                        setIsSavingToDatabase(false);
                        setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                        
                        // Unified approach: Fetch saved products from database with fallback
                        try {
                          // Direct unified fetch approach - use the stok_kodu from saved products
                          const stokKodular = newProducts.map(p => p.existingStokKodu || generateStokKodu(p, 'CH', 0)).filter(Boolean);
                          console.log('Looking for these stok_kodu values:', stokKodular);
                          
                          // Add small delay to ensure database consistency
                          await new Promise(resolve => setTimeout(resolve, 800));
                          
                          // Use unified fetch directly with stok_kodu (bypassing the problematic fetchSavedProducts)
                          const databaseProducts = await fetchDatabaseDataWithFallback([], stokKodular);
                          
                          if (databaseProducts && databaseProducts.length > 0) {
                            await generateExcelFiles(databaseProducts, false);
                            toast.success(`${databaseProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Database + Fallback)`);
                          } else {
                            // Fallback to original method if unified fetch fails
                            console.warn('Unified fetch returned no data, using original data');
                            await generateExcelFiles(newProducts, false);
                            toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Original method)`);
                          }
                        } catch (innerError) {
                          console.error('Unified fetch failed, falling back to original method:', innerError);
                          await generateExcelFiles(newProducts, false);
                          toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Fallback to original)`);
                        }
                      } else {
                        toast.info('Hiç yeni ürün eklenmedi, Excel oluşturulmadı.');
                      }
                    }}
                    disabled={isSavingToDatabase || isGeneratingExcel}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center gap-2 justify-center"
                  >
                    {(isSavingToDatabase || isGeneratingExcel) && <Loader className="w-4 h-4 animate-spin" />}
                    {preSaveConfirmData.newProducts.length} Yeni Ürün Kaydet ve Excel Oluştur
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  // Expose fetchSavedProducts to parent component
  React.useImperativeHandle(ref, () => ({
    fetchSavedProducts
  }));

  return (
    <>
      {renderContent()}
    </>
  );
});

CelikHasirNetsis.displayName = 'CelikHasirNetsis';

// OPTIMIZATION: Memoize the component to prevent unnecessary re-renders
export default memo(CelikHasirNetsis, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.optimizedProducts?.length === nextProps.optimizedProducts?.length &&
    prevProps.optimizedProducts?.every((prev, index) => {
      const next = nextProps.optimizedProducts[index];
      return prev.hasirTipi === next?.hasirTipi && 
             prev.uzunlukBoy === next?.uzunlukBoy && 
             prev.uzunlukEn === next?.uzunlukEn;
    })
  );
});