// Çelik Hasır Netsis Integration Bileşen
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

// Updated filmaşin Map et den database (priority 0=main Reçete, 1-5=alternatives)
const FILMASIN_PRIORITY_MAP = {
  4.20: [{ diameter: 6.0, quality: '1008' }, { diameter: 5.5, quality: '1008' }], // 0,1
  4.25: [{ diameter: 6.0, quality: '1008' }, { diameter: 5.5, quality: '1008' }], // 0,1
  4.45: [{ diameter: 6.0, quality: '1008' }, { diameter: 6.5, quality: '1008' }, { diameter: 5.5, quality: '1008' }], // 0,1,2
  4.50: [{ diameter: 6.0, quality: '1008' }, { diameter: 6.5, quality: '1008' }, { diameter: 5.5, quality: '1008' }], // 0,1,2
  4.75: [{ diameter: 6.0, quality: '1008' }, { diameter: 6.5, quality: '1008' }, { diameter: 6.5, quality: '1010' }], // 0,1,2
  4.80: [{ diameter: 6.0, quality: '1008' }, { diameter: 6.5, quality: '1008' }, { diameter: 6.5, quality: '1010' }], // 0,1,2
  4.85: [{ diameter: 6.0, quality: '1008' }, { diameter: 6.5, quality: '1008' }, { diameter: 6.5, quality: '1010' }], // 0,1,2
  5.00: [{ diameter: 6.0, quality: '1008' }, { diameter: 6.5, quality: '1008' }, { diameter: 6.5, quality: '1010' }], // 0,1,2
  5.50: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }, { diameter: 6.5, quality: '1008' }, { diameter: 6.5, quality: '1010' }, { diameter: 7.5, quality: '1010' }, { diameter: 6.0, quality: '1008' }], // 0,1,2,3,4,5
  6.00: [{ diameter: 7.0, quality: '1010' }, { diameter: 7.0, quality: '1008' }, { diameter: 7.5, quality: '1008' }, { diameter: 7.5, quality: '1010' }, { diameter: 6.5, quality: '1010' }, { diameter: 6.5, quality: '1008' }], // 0,1,2,3,4,5
  6.50: [{ diameter: 8.0, quality: '1008' }, { diameter: 8.0, quality: '1010' }, { diameter: 7.5, quality: '1008' }, { diameter: 7.0, quality: '1010' }, { diameter: 7.5, quality: '1010' }, { diameter: 7.0, quality: '1008' }], // 0,1,2,3,4,5
  7.00: [{ diameter: 8.0, quality: '1010' }, { diameter: 8.0, quality: '1008' }, { diameter: 9.0, quality: '1008' }, { diameter: 9.0, quality: '1010' }], // 0,1,2,3
  7.50: [{ diameter: 9.0, quality: '1008' }, { diameter: 9.0, quality: '1010' }, { diameter: 8.0, quality: '1010' }, { diameter: 8.0, quality: '1008' }], // 0,1,2,3
  7.80: [{ diameter: 9.0, quality: '1008' }, { diameter: 9.0, quality: '1010' }, { diameter: 10.0, quality: '1008' }], // 0,1,2
  8.00: [{ diameter: 9.0, quality: '1010' }, { diameter: 9.0, quality: '1008' }, { diameter: 10.0, quality: '1008' }, { diameter: 10.0, quality: '1010' }], // 0,1,2,3
  8.50: [{ diameter: 10.0, quality: '1008' }, { diameter: 10.0, quality: '1010' }, { diameter: 9.0, quality: '1010' }, { diameter: 9.0, quality: '1008' }], // 0,1,2,3
  8.60: [{ diameter: 10.0, quality: '1008' }, { diameter: 10.0, quality: '1010' }], // 0,1
  9.00: [{ diameter: 10.0, quality: '1010' }, { diameter: 10.0, quality: '1008' }, { diameter: 11.0, quality: '1008' }, { diameter: 11.0, quality: '1010' }], // 0,1,2,3
  9.20: [{ diameter: 11.0, quality: '1008' }, { diameter: 11.0, quality: '1010' }, { diameter: 10.0, quality: '1010' }, { diameter: 10.0, quality: '1008' }], // 0,1,2,3
  9.50: [{ diameter: 11.0, quality: '1008' }, { diameter: 11.0, quality: '1010' }], // 0,1
  9.90: [{ diameter: 11.0, quality: '1010' }, { diameter: 11.0, quality: '1008' }], // 0,1
  10.00: [{ diameter: 11.0, quality: '1010' }, { diameter: 11.0, quality: '1008' }, { diameter: 12.0, quality: '1008' }, { diameter: 12.0, quality: '1010' }], // 0,1,2,3
  10.50: [{ diameter: 12.0, quality: '1010' }, { diameter: 12.0, quality: '1008' }, { diameter: 11.0, quality: '1010' }], // 0,1,2
  10.60: [{ diameter: 12.0, quality: '1010' }, { diameter: 12.0, quality: '1008' }, { diameter: 11.0, quality: '1010' }], // 0,1,2
  11.00: [{ diameter: 12.0, quality: '1010' }, { diameter: 12.0, quality: '1008' }, { diameter: 13.0, quality: '1008' }], // 0,1,2
  11.20: [{ diameter: 13.0, quality: '1008' }, { diameter: 13.0, quality: '1010' }], // 0,1
  11.50: [{ diameter: 13.0, quality: '1008' }, { diameter: 13.0, quality: '1010' }], // 0,1
  12.00: [{ diameter: 13.0, quality: '1010' }, { diameter: 13.0, quality: '1008' }] // 0,1
};

// Helper function a Bul closest bigger Çap in the matrix zaman exact match doesn't exist
const getClosestBiggerDiameter = (targetDiameter) => {
  const availableDiameters = Object.keys(FILMASIN_PRIORITY_MAP).map(d => parseFloat(d)).sort((a, b) => a - b);

  // Bul the smallest Çap that is bigger than or equal a target
  for (const diameter of availableDiameters) {
    if (diameter >= targetDiameter) {
      return diameter;
    }
  }

  // If no bigger Çap found, return the largest Mevcut
  return availableDiameters[availableDiameters.length - 1];
};

// Fast hardcoded filmaşin selection (same logic olarak old working version)
// Şimdi ile fallback a closest bigger Çap için missing values
const getFilmasinByPriority = (targetDiameter, priority) => {
  let priorityList = FILMASIN_PRIORITY_MAP[targetDiameter];

  // If exact Çap not found, use closest bigger Çap
  if (!priorityList) {
    const closestDiameter = getClosestBiggerDiameter(targetDiameter);
    priorityList = FILMASIN_PRIORITY_MAP[closestDiameter];
    console.log(`🔄 Diameter ${targetDiameter}mm not in matrix, using ${closestDiameter}mm priorities`);
  }

  if (!priorityList || priority >= priorityList.length) {
    // Return null a indicate no alternative exists için this priority
    return null;
  }

  const filmasin = priorityList[priority];
  const flmKodu = `FLM.${String(Math.round(filmasin.diameter * 100)).padStart(4, '0')}.${filmasin.quality}`;

  return {
    code: flmKodu,
    diameter: filmasin.diameter,
    quality: filmasin.quality,
    toString: () => flmKodu
  };
};

// Fast filmaşin selection function için main recipes
const getFilmasinKodu = (diameter) => {
  const filmasin = getFilmasinByPriority(diameter, 0);
  return filmasin ? filmasin.code : '';
};

// Helper function a Al Mevcut priorities için a target Çap
const getAvailablePriorities = (targetDiameter) => {
  let priorityList = FILMASIN_PRIORITY_MAP[targetDiameter];

  // If exact Çap not found, use closest bigger Çap
  if (!priorityList) {
    const closestDiameter = getClosestBiggerDiameter(targetDiameter);
    priorityList = FILMASIN_PRIORITY_MAP[closestDiameter];
    console.log(`🔄 getAvailablePriorities: Diameter ${targetDiameter}mm not in matrix, using ${closestDiameter}mm priorities`);
  }

  if (!priorityList) return [];
  return priorityList.map((_, index) => index);
};

// Cache için mesh config lookups a avoid repeated 404 requests
const meshConfigCache = new Map();
const failedMeshConfigCache = new Set();

// Helper function a safely Çevir dimensions a 4-digit codes without NaN
const safeCapToCode = (capValue) => {
  const numValue = parseFloat(capValue || 0) || 0;
  return String(Math.round(numValue * 100)).padStart(4, '0');
};

// Fallback formula function için missing database values
const calculateFallbackCubukSayisi = async (hasirTipi, uzunlukBoy, uzunlukEn) => {
  try {
    // Kontrol et cache first a avoid repeated requests
    let meshConfig = null;
    if (meshConfigCache.has(hasirTipi)) {
      meshConfig = meshConfigCache.get(hasirTipi);
    } else if (failedMeshConfigCache.has(hasirTipi)) {
      // Skip İstek - we know it fails
      console.log(`Using cached fallback for ${hasirTipi} (known 404)`);
    } else {
      // First Zaman - Dene a Getir mesh configuration
      try {
        const response = await fetchWithAuth(`${API_URLS.meshTypeConfigs}/${encodeURIComponent(hasirTipi)}`);
        if (response.ok) {
          meshConfig = await response.json();
          meshConfigCache.set(hasirTipi, meshConfig);
        } else if (response.status === 404) {
          // Cache the Başarısız lookup a avoid future requests
          failedMeshConfigCache.add(hasirTipi);
          console.log(`No mesh config found for ${hasirTipi}, cached for future (using defaults)`);
        } else {
          console.warn(`Unexpected response ${response.status} for mesh config ${hasirTipi}`);
        }
      } catch (error) {
        console.warn('Could not fetch mesh config from database:', error);
        failedMeshConfigCache.add(hasirTipi); // Cache the failure
      }
    }
    
    // Use database config or fallback a hardcoded values
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
    
    // Başlat ile base calculation
    let cubukSayisiBoy = Math.floor((uzunlukEn / boyAralik) + 1);
    let cubukSayisiEn = Math.floor((uzunlukBoy / enAralik) + 1);
    
    // Apply Tip-specific rules
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
    
    // Apply optimization logic (simplified version)
    const optimized = applyFilizOptimization(hasirTipi, uzunlukBoy, uzunlukEn, cubukSayisiBoy, cubukSayisiEn, boyAralik, enAralik, hasirTuru);
    
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

// Helper function a Al default spacing zaman mesh_type_configs is not Mevcut
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

// Simple helper a avoid repeated parseFloat operations - PERFORMANCE OPTIMIZATION
const safeFloat = (value) => parseFloat(value) || 0;
const safeInt = (value) => parseInt(value) || 0;

// Helper a Al clean kg Değer den Ürün ile fallback calculation
const getCleanKgValue = (product) => {
  // Dene multiple sources için kg Değer
  const sources = [product.adetKg, product.totalKg, product.kg, product.toplamKg, product.toplamAgirlik];
  for (const source of sources) {
    const parsed = parseFloat(source);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  
  // If still Geçersiz, Hesapla basic kg using wire Çap and Uzunluk
  const boyCap = safeFloat(product.boyCap);
  const enCap = safeFloat(product.enCap);
  const uzunlukBoy = safeFloat(product.uzunlukBoy);
  const uzunlukEn = safeFloat(product.uzunlukEn);
  const cubukSayisiBoy = safeInt(product.cubukSayisiBoy);
  const cubukSayisiEn = safeInt(product.cubukSayisiEn);
  
  if (boyCap > 0 && enCap > 0 && uzunlukBoy > 0 && uzunlukEn > 0 && cubukSayisiBoy > 0 && cubukSayisiEn > 0) {
    // Basic wire Ağırlık calculation
    const boyWireLength = cubukSayisiBoy * uzunlukEn / 100;
    const enWireLength = cubukSayisiEn * uzunlukBoy / 100;
    const totalWireLength = boyWireLength + enWireLength;
    
    const boyWireArea = Math.PI * Math.pow((boyCap / 2 / 10), 2);
    const enWireArea = Math.PI * Math.pow((enCap / 2 / 10), 2);
    const avgWireArea = (boyWireArea + enWireArea) / 2;
    
    const kgValue = (totalWireLength * avgWireArea * 7.85) / 1000; // Steel density 7.85 g/cm³
    
    if (!isNaN(kgValue) && kgValue > 0) {
      return kgValue;
    }
  }
  
  // Final fallback
  return 0.1; // Minimum meaningful weight
};

// Simplified optimization logic için fallback
const applyFilizOptimization = (hasirTipi, uzunlukBoy, uzunlukEn, initialBoy, initialEn, boyAralik, enAralik, hasirTuru) => {
  // Q Perde: Fixed EN at 18, optimize BOY
  if (hasirTipi.startsWith('Q') && hasirTuru === 'Perde') {
    const targetSolFiliz = 2.5;
    let bestBoy = initialBoy;
    let bestDiff = 999;
    
    for (let boy = Math.max(2, initialBoy - 5); boy <= initialBoy + 5; boy++) {
      const solFiliz = (uzunlukEn - ((boy - 1) * boyAralik)) / 2;
      if (solFiliz >= 1.5 && solFiliz <= 9) {
        const diff = Math.abs(solFiliz - targetSolFiliz);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestBoy = boy;
        }
      }
    }
    return { cubukSayisiBoy: bestBoy, cubukSayisiEn: 18 };
  }
  
  // için other types, Dene basic optimization within ±3 range
  let bestCombination = { cubukSayisiBoy: initialBoy, cubukSayisiEn: initialEn };
  let bestScore = -999;
  
  for (let boy = Math.max(2, initialBoy - 3); boy <= initialBoy + 3; boy++) {
    for (let en = Math.max(2, initialEn - 3); en <= initialEn + 3; en++) {
      const solFiliz = (uzunlukEn - ((boy - 1) * boyAralik)) / 2;
      const onFiliz = (uzunlukBoy - ((en - 1) * enAralik)) / 2;

      // Tip-specific sol/sag filiz limits
      let maxSolFiliz = 9; // Default for Q, R types
      if (hasirTipi.startsWith('TR')) {
        maxSolFiliz = 16; // TR type allows up to 16
      }

      if (solFiliz >= 1.5 && solFiliz <= maxSolFiliz && onFiliz >= 10) {
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

// Unified function a Getir database Veri ile fallback formula
const fetchDatabaseDataWithFallback = async (productIds = [], stokKodular = []) => {
  
  try {
    // Small delay a allow database transaction a commit if this is called right after Kaydet
    if (stokKodular.length > 0) {
      console.log('⏳ Adding 1 second delay to allow database transaction to commit...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Getir products den database based on IDs or stok_kodu
    const allProducts = [];
    
    // zaman searching ile productIds, use backend IDs parameter a Getir only specific products
    if (productIds.length > 0) {
      const tableTypes = ['mm', 'ncbk', 'ntel'];
      
      for (const tableType of tableTypes) {
        try {
          let url = `${API_URLS.celikHasirMm}`;
          if (tableType === 'ncbk') url = `${API_URLS.celikHasirNcbk}`;
          else if (tableType === 'ntel') url = `${API_URLS.celikHasirNtel}`;
          
          // Use backend 'ids' parameter a Getir only the specific IDs we need
          const idsParam = productIds.join(',');
          const response = await fetchWithAuth(`${url}?ids=${encodeURIComponent(idsParam)}`);
          if (response.ok) {
            const products = await response.json();
            allProducts.push(...products);
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${tableType} table:`, error);
        }
      }
    }
    // zaman searching ile stok_kodu, Al MM Ürün + related NCBK/NTEL records
    else if (stokKodular.length > 0) {
      // First Al MM products - Ara directly ile stok_kodu a avoid large API calls
      try {
        const filteredMmProducts = [];
        
        // Getir each Ürün individually a avoid large API responses
        for (const stokKodu of stokKodular) {
          // First Dene: Direct Ara ile stok_kodu
          let mmResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?search=${encodeURIComponent(stokKodu)}`);
          let mmProducts = [];
          
          if (mmResponse.ok) {
            mmProducts = await mmResponse.json();
            const exactMatch = mmProducts.filter(p => p.stok_kodu === stokKodu);
            if (exactMatch.length > 0) {
              filteredMmProducts.push(...exactMatch);
              return; // Found it, move to next
            }
          }
          
          // Second try: If search failed, try fetching recent records (newly saved might not be indexed)
          console.warn(`⚠️ Search for ${stokKodu} returned 0 results, trying recent records fetch...`);
          try {
            mmResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?sort_by=created_at&sort_order=desc&limit=50`);
            if (mmResponse.ok) {
              const recentProducts = await mmResponse.json();
              const exactMatch = recentProducts.filter(p => p.stok_kodu === stokKodu);
              if (exactMatch.length > 0) {
                filteredMmProducts.push(...exactMatch);
              } else {
              }
            }
          } catch (error) {
            console.error(`❌ Recent fetch failed for ${stokKodu}:`, error);
          }
        }
        
        console.log(`Found ${filteredMmProducts.length} products in MM table matching stok_kodu:`, filteredMmProducts.map(p => p.stok_kodu));
        allProducts.push(...filteredMmProducts);
        
        // için each MM Ürün, Bul related NCBK and NTEL records via Reçete Veri
        for (const mmProduct of filteredMmProducts) {
          try {
            const recipeResponse = await fetchWithAuth(`${API_URLS.celikHasirMmRecete}?mamul_kodu=${encodeURIComponent(mmProduct.stok_kodu)}`);
            if (recipeResponse.ok) {
              const recipeData = await recipeResponse.json();
              console.log(`Found ${recipeData.length} recipe entries for ${mmProduct.stok_kodu}`);
              
              // Debug: Kontrol et what mamul_kodu values we actually have
              const uniqueMamulKodus = [...new Set(recipeData.map(r => r.mamul_kodu))];
              console.log(`DEBUG: Unique mamul_kodu values in recipe data:`, uniqueMamulKodus);
              console.log(`DEBUG: Looking for mamul_kodu === "${mmProduct.stok_kodu}"`);
              console.log(`DEBUG: First few recipe entries:`, recipeData.slice(0, 3).map(r => ({ mamul_kodu: r.mamul_kodu, bilesen_kodu: r.bilesen_kodu })));
              
              // Filtrele Reçete Veri a only this specific Ürün's Reçete
              const thisProductRecipe = recipeData.filter(recipe => recipe.mamul_kodu === mmProduct.stok_kodu);
              console.log(`Filtered to ${thisProductRecipe.length} recipe entries specifically for ${mmProduct.stok_kodu}`);
              
              // Extract NCBK and NTEL codes den this Ürün's Reçete only
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
              
              // Getir NCBK records
              if (ncbkCodes.size > 0) {
                const ncbkResponse = await fetchWithAuth(API_URLS.celikHasirNcbk);
                if (ncbkResponse.ok) {
                  const ncbkProducts = await ncbkResponse.json();
                  const relatedNcbk = ncbkProducts.filter(p => ncbkCodes.has(p.stok_kodu));
                  console.log(`Found ${relatedNcbk.length} related NCBK records:`, relatedNcbk.map(p => p.stok_kodu));
                  allProducts.push(...relatedNcbk);
                }
              }
              
              // Getir NTEL records
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
    
    // Şimdi enhance each Ürün ile Reçete Veri and apply fallback zaman needed
    const enhancedProducts = await Promise.all(
      allProducts.map(async (product) => {
        try {
          // Getir Reçete Veri
          const recipeData = await fetchProductRecipeData(product.stok_kodu, product.id);
          
          // Extract hasir_tipi den stok_adi if needed
          let actualHasirTipi = product.hasir_tipi || '';
          if (actualHasirTipi === 'MM' || actualHasirTipi === '') {
            const stokAdiMatch = (product.stok_adi || '').match(/^(Q\d+(?:\/\d+)?|R\d+(?:\/\d+)?|TR\d+(?:\/\d+)?)/i);
            if (stokAdiMatch) {
              actualHasirTipi = stokAdiMatch[1].toUpperCase();
            }
          }
          
          // Clean İngilizce İsim
          const cleanIngilizceIsim = (product.ingilizce_isim || '').replace(/^Wire Mesh-\s*/, 'Wire Mesh ');
          
          // Kontrol et if we have cubuk sayisi values den Reçete Veri
          let cubukSayisiBoy = recipeData?.boyCount || product.ic_cap_boy_cubuk_ad || 0;
          let cubukSayisiEn = recipeData?.enCount || product.dis_cap_en_cubuk_ad || 0;
          
          console.log(`🔧 FETCH DEBUG - Product ${product.stok_kodu} BEFORE fallback:`, {
            recipeDataBoyCount: recipeData?.boyCount,
            recipeDataEnCount: recipeData?.enCount,
            databaseBoyCubuk: product.ic_cap_boy_cubuk_ad,
            databaseEnCubuk: product.dis_cap_en_cubuk_ad,
            initialCubukSayisiBoy: cubukSayisiBoy,
            initialCubukSayisiEn: cubukSayisiEn,
            recipeDataExists: !!recipeData,
            recipeDataIsNull: recipeData === null
          });
          
          // Apply fallback formula if cubuk sayisi values are missing or Geçersiz
          // OR if Reçete Veri couldn't be fetched (null means API Başarısız or no Reçete found)
          const shouldApplyFallback = !cubukSayisiBoy || !cubukSayisiEn || cubukSayisiBoy <= 0 || cubukSayisiEn <= 0 || recipeData === null;
          
          if (shouldApplyFallback) {
            console.log(`Applying fallback formula for product ${product.stok_kodu} - missing cubuk sayısı or recipe data`);
            
            const fallbackResult = await calculateFallbackCubukSayisi(
              actualHasirTipi,
              product.ebat_boy || 0,
              product.ebat_en || 0
            );
            
            cubukSayisiBoy = fallbackResult.cubukSayisiBoy;
            cubukSayisiEn = fallbackResult.cubukSayisiEn;
            console.log(`🔧 FETCH DEBUG - Fallback applied: ${actualHasirTipi} ${product.ebat_boy}x${product.ebat_en} => boy:${cubukSayisiBoy}, en:${cubukSayisiEn}`);
          } else {
            console.log(`🔧 FETCH DEBUG - Using database/recipe values: boy:${cubukSayisiBoy}, en:${cubukSayisiEn}`);
          }
          
          // Hesapla Süre if missing (you can Ekle Süre fallback calculation here)
          let duration = recipeData?.duration || 0;
          if (!duration || duration <= 0) {
            // Apply Süre calculation fallback if needed
            // Süre = calculateFallbackDuration(...);
          }
          
          // Dönüştür a Excel Formatla
          return {
            // Map et database fields a expected Excel generation Formatla
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
            // Ekle existing stok kodu için saved products
            existingStokKodu: product.stok_kodu,
            // Store cleaned İngilizce İsim
            existingIngilizceIsim: cleanIngilizceIsim,
            // Store original database ID için reference
            databaseId: product.id,
            // Reçete Veri
            recipeData
          };
        } catch (error) {
          console.error(`Error processing product ${product.stok_kodu}:`, error);
          // Return basic Ürün Veri even if enhancement fails
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

// Helper function a Getir Reçete Veri için a Ürün
const fetchProductRecipeData = async (stokKodu, productId) => {
  try {
    console.log(`🔍 RECIPE DEBUG - Fetching recipe data for ${stokKodu} from ${API_URLS.celikHasirMmRecete}`);
    // Getir den Reçete table
    const response = await fetchWithAuth(`${API_URLS.celikHasirMmRecete}?mamul_kodu=${encodeURIComponent(stokKodu)}`);
    console.log(`🔍 RECIPE DEBUG - Response status for ${stokKodu}:`, response.status);
    
    if (response.ok) {
      const recipeData = await response.json();
      console.log(`🔍 RECIPE DEBUG - Raw recipe data for ${stokKodu}:`, {
        length: recipeData.length,
        firstEntry: recipeData[0],
        allEntries: recipeData.map(r => ({ mamul_kodu: r.mamul_kodu, bilesen_kodu: r.bilesen_kodu, aciklama: r.aciklama, miktar: r.miktar }))
      });
      
      // Parse et Reçete Veri a extract boy and en cubuk counts
      let boyCount = 0;
      let enCount = 0;
      let duration = 0;
      
      recipeData.forEach(item => {
        if (item.aciklama && item.aciklama.includes('BOY ÇUBUĞU')) {
          boyCount = parseFloat(item.miktar) || 0;
          console.log(`🔍 RECIPE DEBUG - Found BOY ÇUBUĞU: ${boyCount} for ${stokKodu}`);
        } else if (item.aciklama && item.aciklama.includes('EN ÇUBUĞU')) {
          enCount = parseFloat(item.miktar) || 0;
          console.log(`🔍 RECIPE DEBUG - Found EN ÇUBUĞU: ${enCount} for ${stokKodu}`);
        } else if (item.uretim_suresi) {
          duration += parseFloat(item.uretim_suresi) || 0;
        }
      });
      
      const result = { boyCount, enCount, duration, rawData: recipeData };
      console.log(`🔍 RECIPE DEBUG - Final result for ${stokKodu}:`, result);
      return result;
    } else {
      console.error(`🔍 RECIPE DEBUG - Failed to fetch recipe data for ${stokKodu}, status: ${response.status}`);
    }
  } catch (error) {
    console.error(`🔍 RECIPE DEBUG - Error fetching recipe data for ${stokKodu}:`, error);
  }
  
  console.log(`🔍 RECIPE DEBUG - Returning null for ${stokKodu}`);
  return null;
};

const CelikHasirNetsis = React.forwardRef(({ optimizedProducts = [], onProductsUpdate }, ref) => {
  // OPTIMIZATION: Ekle refs için İstek cancellation and caching
  const fetchControllerRef = useRef(null);
  const cacheRef = useRef(new Map()); // Simple cache for API responses
  const lastFetchTimeRef = useRef(0);
  
  // Kontrol et için optimized Veri den advanced optimization screen
  const [products, setProducts] = useState(optimizedProducts);
  
  useEffect(() => {
    // Kontrol et if we're returning den advanced optimization
    const urlParams = new URLSearchParams(window.location.search);
    const optimizedData = urlParams.get('optimizedData');
    
    if (optimizedData) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(optimizedData));
        setProducts(decodedData);
        // Güncelle parent Bileşen if Callback provided
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

  // Filtrele out empty rows - a row is considered empty if hasirTipi, uzunlukBoy, or uzunlukEn is missing
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
  
  // Ana State değişkenleri
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
  
  // Bulk Sil progress tracking
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState({ current: 0, total: 0, operation: '', currentItem: '' });
  
  // Database filtering states
  const [dbSearchText, setDbSearchText] = useState('');
  const [dbFilterHasirTipi, setDbFilterHasirTipi] = useState('All');
  const [dbFilterHasirTuru, setDbFilterHasirTuru] = useState('All');
  const [dbSortBy, setDbSortBy] = useState('stok_kodu'); // stok_kodu, stok_adi, cap, length_cm, created_at
  const [dbSortOrder, setDbSortOrder] = useState('asc'); // asc, desc
  
  // Multi-Seç functionality states
  const [selectedDbItems, setSelectedDbItems] = useState([]);      // Selected product IDs
  
  // Yükleniyor states
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isFilteringDb, setIsFilteringDb] = useState(false); // Loading state specifically for filter changes
  const [dbLoadingProgress, setDbLoadingProgress] = useState({ current: 0, total: 3, operation: '' });
  
  // Backend connection states
  const [backendError, setBackendError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [isDeletingBulkDb, setIsDeletingBulkDb] = useState(false); // Bulk delete status
  const [deletingProductId, setDeletingProductId] = useState(null); // Individual product deletion tracking
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0, operation: '', currentProduct: '' }); // Delete progress tracking

  // Global operation Süre calculator
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

  // NCBK Süre calculation - Formula calibrated a match exact Makine speeds
  const calculateNCBKDuration = (length_cm, diameter_mm) => {
    const length_m = length_cm / 100; // Convert cm to m

    // Calibrated formula: Speed = 205 - (Çap - 5.0) × 10.0
    // Matches exact calibrated speeds için 5.5-10mm range
    // için >10mm: reduction factor decreases (non-linear behavior için thick wire)

    const isOptimalLength = (length_cm >= 180 && length_cm <= 500);

    let speed_m_per_min;
    if (isOptimalLength) {
      // Optimal Uzunluk (180-500cm): Calibrated a match exact Makine speeds
      if (diameter_mm <= 10.0) {
        // Linear formula matches perfectly için 5.5-10mm
        speed_m_per_min = 205 - (diameter_mm - 5.0) * 10.0;
      } else {
        // için >10mm: use calibrated discrete values ile interpolation
        // 10mm=155, 11mm=150, 12mm=145, 13mm=140
        const baseSpeed = 155; // Speed at 10mm
        const reduction = 5.0;  // Slower reduction for thick wire
        speed_m_per_min = baseSpeed - (diameter_mm - 10.0) * reduction;
      }
    } else {
      // Non-optimal Uzunluk: proportionally slower (80% of optimal speed)
      const optimalSpeed = diameter_mm <= 10.0
        ? 205 - (diameter_mm - 5.0) * 10.0
        : 155 - (diameter_mm - 10.0) * 5.0;
      speed_m_per_min = optimalSpeed * 0.80;
    }

    // Clamp a reasonable bounds
    speed_m_per_min = Math.max(100, Math.min(250, speed_m_per_min));

    // Hesapla Süre in minutes için 1 piece
    const duration_minutes = length_m / speed_m_per_min;

    // Pure cutting Zaman + 0.05 seconds buffer
    const duration_seconds = duration_minutes * 60 + 0.05;
    return parseFloat((duration_seconds / 60).toFixed(5));
  };

  // NTEL Süre calculation - Formula calibrated a match exact wire drawing speeds
  const calculateNTELDuration = (diameter_mm) => {
    // Doğrula Girdi parameter
    const diameter = parseFloat(diameter_mm);
    if (isNaN(diameter) || diameter <= 0) {
      console.warn('Invalid diameter for NTEL duration calculation:', diameter_mm);
      return 0.01; // Return default small duration instead of 0 or NaN
    }

    // Calibrated formula: Speed = 11.0 - (Çap - 5.0) × 0.4
    // Matches exact calibrated speeds için 5.5-8.0mm range
    // için >8mm: reduction factor decreases (non-linear behavior için thick wire)

    let speed_m_per_s;
    if (diameter <= 8.0) {
      // Linear formula matches perfectly için 5.5-8.0mm
      speed_m_per_s = 11.0 - (diameter - 5.0) * 0.4;
    } else {
      // için >8mm: use calibrated discrete values ile interpolation
      // 8mm=9.8, 9mm=9.6, 10mm=9.2, 11mm=9.0, 12mm=8.7, 13mm=8.5
      const baseSpeed = 9.8; // Speed at 8mm
      // Non-linear reduction: slower decrease için thick wire
      if (diameter <= 9.0) {
        speed_m_per_s = baseSpeed - (diameter - 8.0) * 0.2;  // 9mm: 9.8 - 0.2 = 9.6 ✓
      } else if (diameter <= 11.0) {
        speed_m_per_s = 9.6 - (diameter - 9.0) * 0.3;  // 10mm: 9.6 - 0.3 = 9.3 ≈ 9.2, 11mm: 9.6 - 0.6 = 9.0 ✓
      } else {
        speed_m_per_s = 9.0 - (diameter - 11.0) * 0.2; // 12mm: 9.0 - 0.2 = 8.8 ≈ 8.7, 13mm: 9.0 - 0.4 = 8.6 ≈ 8.5
      }
    }

    // Clamp a reasonable wire drawing speeds
    speed_m_per_s = Math.max(7.0, Math.min(12.0, speed_m_per_s));

    // için 1 meter: 1m ÷ speed m/s = Zaman in seconds + 0.05 buffer
    const duration_seconds = (1 / speed_m_per_s) + 0.05;
    const duration_minutes = duration_seconds / 60;
    return parseFloat(duration_minutes.toFixed(5));
  };

  // YOTOCH Süre calculation (Reliability: 98.7%)
  const calculateYOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
    // Doğrula inputs
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

  // OTOCH Süre calculation (60% of YOTOCH - 40% faster)
  const calculateOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
    // Doğrula inputs
    const boyVal = parseFloat(boy_mm) || 0;
    const enVal = parseFloat(en_mm) || 0;
    const diameterVal = parseFloat(diameter_mm) || 0;
    const cubukBoyVal = parseInt(cubukSayisiBoy) || 0;
    const cubukEnVal = parseInt(cubukSayisiEn) || 0;
    
    // CRITICAL FIX: için NCBK/NTEL products (wire/rod), en_mm can be 0 - this is normal
    // Only Doğrula that boy_mm and diameter_mm are Geçerli
    if (boyVal <= 0 || diameterVal <= 0) {
      console.warn('Invalid OTOCH parameters (boy or diameter invalid):', { boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn });
      return 0.00001; // Return default small duration
    }
    
    // için wire/rod products ile en_mm = 0, use simplified calculation
    if (enVal === 0) {
      const wireLength = boyVal; // Length of the wire/rod
      const wireFactor = Math.pow(diameterVal, 1.1);
      const result = 0.048 + (wireLength * 0.0001) + (wireFactor * 0.01);
      return parseFloat(result.toFixed(5));
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
  
  // Store total counts den X-Total-Count header için pagination display
  const [totalCounts, setTotalCounts] = useState({
    mm: 0,
    ncbk: 0,
    ntel: 0
  });
  
  // Excel generation durumu
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [excelProgress, setExcelProgress] = useState({ current: 0, total: 0, operation: '' });
  const [cancelExcelGeneration, setCancelExcelGeneration] = useState(false);
  
  // Database Kaydet progress
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [databaseProgress, setDatabaseProgress] = useState({ current: 0, total: 0, operation: '', currentProduct: '' });

  // New Popup states için enhanced database checking
  const [showExcelOptionsModal, setShowExcelOptionsModal] = useState(false);
  const [showPreSaveConfirmModal, setShowPreSaveConfirmModal] = useState(false);
  const [preSaveConfirmData, setPreSaveConfirmData] = useState({ newProducts: [], existingProducts: [] });
  
  // Sequence tracking
  const [sequences, setSequences] = useState({});

  // Client-side filtering and sorting since server-side filtering is not working
  const getFilteredAndSortedProducts = useCallback(() => {
    let products = savedProducts[activeDbTab] || [];
    
    // Apply Ara text Filtrele
    if (dbSearchText && dbSearchText.trim()) {
      const searchTerm = dbSearchText.toLowerCase().trim();
      products = products.filter(product => 
        (product.stok_kodu && product.stok_kodu.toLowerCase().includes(searchTerm)) ||
        (product.stok_adi && product.stok_adi.toLowerCase().includes(searchTerm)) ||
        (product.ingilizce_isim && product.ingilizce_isim.toLowerCase().includes(searchTerm))
      );
    }
    
    // Apply hasir tipi Filtrele
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
    
    // Apply hasir turu Filtrele (için MM products)
    if (dbFilterHasirTuru && dbFilterHasirTuru !== 'All' && activeDbTab === 'mm') {
      products = products.filter(product => {
        // Use the hasir_turu Alan den the database, or Hesapla it den dimensions if missing
        let hasirTuru = product.hasir_turu;
        
        if (!hasirTuru || hasirTuru === 'MM') {
          // Hesapla hasir_turu based on logic den the codebase
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

  // Database multi-Seç functions
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

  // Retry helper function için 504/500 errors
  const fetchWithRetry = async (url, options, maxRetries = 3, baseDelay = 2000, progressCallback = null) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetchWithAuth(url, options);
        
        // If successful, return Yanıt
        if (response.ok) {
          return response;
        }
        
        // If it's a 504 or 500 Hata, retry
        if ((response.status === 504 || response.status === 500) && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Request failed with ${response.status}, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
          
          // Güncelle progress indicator if Callback provided
          if (progressCallback) {
            progressCallback(`⏳ Sunucu zaman aşımı, tekrar denenecek... (${attempt}/${maxRetries})`);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return;
        }
        
        // If it's not a retryable Hata or max retries reached, return the Yanıt
        return response;
        
      } catch (error) {
        if (attempt < maxRetries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Network error, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
          
          // Güncelle progress indicator if Callback provided
          if (progressCallback) {
            progressCallback(`⏳ Ağ hatası, tekrar denenecek... (${attempt}/${maxRetries})`);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return;
        }
        throw error;
      }
    }
  };

  // Fallback function için Reçete deletion if bulk Endpoint doesn't exist
  const deleteRecipesFallback = async (recipeApiUrl, encodedStokKodu) => {
    const getRecipeResponse = await fetchWithAuth(`${recipeApiUrl}?mamul_kodu=${encodedStokKodu}`);
    if (getRecipeResponse.ok) {
      const recipes = await getRecipeResponse.json();
      console.log(`🔄 Fallback: Found ${recipes.length} recipes to delete individually`);
      
      // Sil recipes one ile one (old method)
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

  // Bulk Sil function için selected Öğeler - OPTIMIZED VERSION
  const handleBulkDeleteSelected = async () => {
    if (selectedDbItems.length === 0) {
      toast.error('Silinecek ürün seçiniz');
      return;
    }

    if (!window.confirm(`${selectedDbItems.length} ürünü silmek istediğinizden emin misiniz?`)) {
      return;
    }

    setIsDeletingBulkDb(true);
    setDeleteProgress({ current: 0, total: selectedDbItems.length, operation: 'Silme işlemi başlatılıyor...', currentProduct: '' });
    let deletedCount = 0;
    const failedDeletions = [];

    try {
      // Al the selected products ile their stok_kodu
      const selectedProducts = selectedDbItems.map(itemId => {
        const product = savedProducts[activeDbTab].find(p => p.id === itemId);
        return { id: itemId, stok_kodu: product?.stok_kodu, product };
      }).filter(item => item.stok_kodu); // Only process items with valid stok_kodu

      if (selectedProducts.length === 0) {
        toast.error('Seçilen ürünlerde stok kodu bulunamadı');
        return;
      }

      console.log(`🗑️ Starting bulk deletion of ${selectedProducts.length} products for ${activeDbTab}`);
      setDeleteProgress({ current: 0, total: selectedProducts.length, operation: `${selectedProducts.length} ürün siliniyor...`, currentProduct: activeDbTab.toUpperCase() });

      // İşlem deletions sequentially a avoid overwhelming the backend
      for (const { id, stok_kodu, product } of selectedProducts) {
        try {
          console.log(`🗑️ Deleting product: ${stok_kodu}`);
          setDeleteProgress({ 
            current: deletedCount + 1, 
            total: selectedProducts.length, 
            operation: 'Ürün ve reçeteler siliniyor...', 
            currentProduct: stok_kodu 
          });

          // Step 1: Sil recipes using bulk deletion ile mamul_kodu
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
                // Fallback: Use old method if bulk Endpoint doesn't exist
                console.log(`ℹ️ Bulk endpoint not found, using fallback for recipes: ${stok_kodu}`);
                await deleteRecipesFallback(recipeApiUrl, encodedStokKodu);
              } else {
                console.warn(`⚠️ Recipe deletion failed for ${stok_kodu}: ${deleteRecipesResponse.status}`);
              }
            } catch (recipeError) {
              console.warn(`⚠️ Recipe deletion error for ${stok_kodu}:`, recipeError.message);
              // Dene fallback method
              try {
                const encodedStokKodu = encodeURIComponent(stok_kodu);
                await deleteRecipesFallback(recipeApiUrl, encodedStokKodu);
              } catch (fallbackError) {
                console.warn(`⚠️ Recipe deletion fallback also failed for ${stok_kodu}:`, fallbackError.message);
              }
            }
          }

          // Step 2: Sil the main Ürün record ile stok_kodu
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
            
            // Güncelle UI State immediately
            setSavedProducts(prev => ({
              ...prev,
              [activeDbTab]: prev[activeDbTab].filter(p => p.id !== id)
            }));
          } else if (deleteProductResponse.status === 404) {
            // Fallback: Use old method if bulk Endpoint doesn't exist
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

          // Small delay a avoid overwhelming backend
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          console.error(`❌ Failed to delete ${stok_kodu}:`, error);
          failedDeletions.push({ stok_kodu, error: error.message });
        }
      }

      // Göster results a user
      if (deletedCount > 0) {
        toast.success(`✅ Başarılı: ${deletedCount} ürün silindi`, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false
        });
        setSelectedDbItems([]);
        
        // Güncelle sequence table if we Silindi CH products
        if (activeDbTab === 'mm') {
          try {
            await updateSequenceAfterDeletion(activeDbTab);
          } catch (seqError) {
            console.warn('Sequence update failed:', seqError);
            toast.warning('Ürünler silindi ancak sıra numarası güncellenemedi');
          }
        }
        
        // Force refresh Veri
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
      setDeleteProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
      
      // CRITICAL: Sıfırla batch sequence counters after deletions
      console.log('🔄 CRITICAL: Resetting batch sequence counters after deletions');
      resetBatchSequenceCounter(); // Clear any cached sequence numbers
      
      // CRITICAL: Force refresh database cache after deletions a Güncelle sequence tracking
      console.log('🔄 CRITICAL: Refreshing database cache after deletions to update sequences');
      await fetchSavedProducts(false, true); // Force fresh data with cache busting - resetData=true
      
      // CRITICAL: Refresh sequence Veri a Al updated sequence numbers after deletion
      console.log('🔄 CRITICAL: Refreshing sequence data after deletions');
      await fetchSequences(); // Refresh sequence state with fresh data
      
      // CRITICAL: Re-Başlat batch sequence ile fresh database State
      console.log('🔄 CRITICAL: Re-initializing batch sequence after deletion cache refresh');
      await initializeBatchSequence();
    }
  };

  // Bulk Excel export için selected Öğeler
  const handleBulkExportSelected = async () => {
    if (selectedDbItems.length === 0) {
      toast.error('Dışa aktarılacak ürün seçiniz');
      return;
    }

    try {
      console.log(`Exporting ${selectedDbItems.length} selected products from ${activeDbTab} table`);
      
      // Al selected products den already loaded Veri
      const selectedProducts = savedProducts[activeDbTab].filter(product => 
        selectedDbItems.includes(product.id)
      );

      if (selectedProducts.length === 0) {
        toast.error('Seçili ürünler bulunamadı');
        return;
      }

      console.log(`Found ${selectedProducts.length} selected products in loaded data`);
      
      // Dönüştür database products için Excel generation (same Formatla olarak database Yanıt)
      const transformedProducts = selectedProducts.map(product => {
        // Extract hasir_tipi den stok_adi zaman hasir_tipi Alan is incorrect
        let actualHasirTipi = product.hasir_tipi || '';
        if (actualHasirTipi === 'MM' || actualHasirTipi === '') {
          const stokAdiMatch = (product.stok_adi || '').match(/^(Q\d+(?:\/\d+)?|R\d+(?:\/\d+)?|TR\d+(?:\/\d+)?)/i);
          if (stokAdiMatch) {
            actualHasirTipi = stokAdiMatch[1].toUpperCase();
          }
        }
        
        // Parse et göz aralığı den database if Mevcut, otherwise Hesapla
        const dbGozAraligi = product.goz_araligi || '';
        let boyAraligi, enAraligi, gozAraligi;

        if (dbGozAraligi && dbGozAraligi.includes('x')) {
          // Use database Değer (e.g., "7.5x15", "15x25", "15x7,5")
          const parts = dbGozAraligi.split('x');
          // Replace Turkish comma ile Periyot before parsing
          boyAraligi = parseFloat(parts[0].replace(',', '.')) || calculateGozAraligi(actualHasirTipi, 'boy');
          enAraligi = parseFloat(parts[1].replace(',', '.')) || calculateGozAraligi(actualHasirTipi, 'en');
          // Normalize a Periyot Formatla için Excel
          gozAraligi = `${boyAraligi}x${enAraligi}`;
        } else {
          // Fallback a calculation if database Değer missing
          boyAraligi = calculateGozAraligi(actualHasirTipi, 'boy');
          enAraligi = calculateGozAraligi(actualHasirTipi, 'en');
          gozAraligi = `${boyAraligi}x${enAraligi}`;
        }

        return {
          ...product,
          hasirTipi: actualHasirTipi,
          uzunlukBoy: product.ebat_boy || product.uzunluk_boy || 0,
          uzunlukEn: product.ebat_en || product.uzunluk_en || 0,
          boyCap: product.cap || product.boy_cap || 0,
          enCap: product.cap2 || product.en_cap || 0,
          totalKg: product.kg || product.total_kg || 0,
          adetKg: product.kg || product.adet_kg || 0,
          cubukSayisiBoy: product.cubuk_sayisi_boy || product.ic_cap_boy_cubuk_ad || 0,
          cubukSayisiEn: product.cubuk_sayisi_en || product.dis_cap_en_cubuk_ad || 0,
          boyAraligi: boyAraligi,
          enAraligi: enAraligi,
          gozAraligi: gozAraligi,
          existingStokKodu: product.stok_kodu,
          // Don't use existingIngilizceIsim - let generateIngilizceIsim Oluştur it fresh
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
  
  // Refetch Veri zaman filters Değiştir (server-side filtering)
  useEffect(() => {
    // Only Getir if database Modal is Aç a avoid unnecessary requests
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

  // Force Güncelle zaman savedProducts or validProducts Değiştir a ensure counts are accurate
  useEffect(() => {
    // Only log and Güncelle counts if there are actually products in the Form
    if (validProducts.length > 0) {
      console.log('Count update triggered - optimized products:', validProducts.length, 
                  'unoptimized:', validProducts.filter(p => !isProductOptimized(p)).length);
    }
    // Note: Removed getProductsToSave from dependencies to avoid potential infinite loops
  }, [savedProducts, validProducts]);

  // OPTIMIZED: Veritabanından kayıtlı ürünleri getir with caching and request cancellation
  const fetchSavedProducts = async (isRetry = false, resetData = false, isCritical = false) => {
    console.log(`🔄 FETCH SAVED PRODUCTS - Called with isRetry: ${isRetry}, resetData: ${resetData}, isCritical: ${isCritical}`);
    
    // İptal previous İstek varsa
    if (fetchControllerRef.current) {
      console.log(`🔄 FETCH SAVED PRODUCTS - Aborting previous request`);
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
      
      // Ekle timestamp için debugging
      const fetchStartTime = Date.now();
      
      // Build Sorgu parameters için filters
      const buildQueryParams = () => {
        const params = new URLSearchParams();
        
        // Ekle Ara Filtrele
        if (dbSearchText.trim()) {
          params.append('search', dbSearchText.trim());
        }
        
        // Ekle hasır tipi Filtrele
        if (dbFilterHasirTipi && dbFilterHasirTipi !== 'All') {
          params.append('hasir_tipi_filter', dbFilterHasirTipi);
        }
        
        // Ekle hasır türü Filtrele
        if (dbFilterHasirTuru && dbFilterHasirTuru !== 'All') {
          params.append('hasir_turu_filter', dbFilterHasirTuru);
        }
        
        // Ekle sorting
        if (dbSortBy) {
          params.append('sort_by', dbSortBy);
          params.append('sort_order', dbSortOrder);
        }
        
        // Ekle pagination Parametreler (Getir all için Şimdi)
        params.append('limit', '10000'); // Large limit to get all filtered results
        params.append('page', '1');
        
        return params.toString();
      };
      
      const queryString = buildQueryParams();
      
      // Ekle timestamp a force fresh Veri zaman resetData is true
      const timestampParam = resetData ? `&_t=${Date.now()}` : '';
      const urlSuffix = queryString ? `?${queryString}${timestampParam}` : (resetData ? `?_t=${Date.now()}` : '');
      
      // Yükle Veri ile progress tracking, İstek cancellation, and timeout
      setDbLoadingProgress({ current: 1, total: 3, operation: 'CH ürünleri getiriliyor...' });
      
      // Use parallel requests ile timeout and signal
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
      
      // Kontrol et if İstek was İptal edildi
      if (signal.aborted) {
        console.log('Request was cancelled');
        return;
      }
      
      setDbLoadingProgress({ current: 3, total: 3, operation: 'Veriler işleniyor...' });

      // İşle results ile fallbacks
      const mmResponse = mmResult.status === 'fulfilled' ? mmResult.value : null;
      const ncbkResponse = ncbkResult.status === 'fulfilled' ? ncbkResult.value : null;
      const ntelResponse = ntelResult.status === 'fulfilled' ? ntelResult.value : null;

      // Log API failures but continue ile Mevcut Veri
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

      // CRITICAL FIX: During critical operations (Kaydet/analysis), ALL APIs must succeed
      // During normal browsing, we can tolerate partial failures
      if (isCritical) {
        // için critical operations, any API failure is unacceptable
        if (failedAPIs.length > 0) {
          const errorMsg = `Veritabanı bağlantı hatası: ${failedAPIs.join(', ')} verileri yüklenemedi. Lütfen tekrar deneyin.`;
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        // için non-critical operations, only Fırlat if MM (most important) fails
        if (mmResult.status === 'rejected') {
          throw new Error(`Critical MM API failed: ${mmResult.reason}`);
        }
      }

      // Extract Veri and total counts den responses
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
      
      // Store total counts için pagination display
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
      
      // Store all Veri - no pagination
      // Force State Güncelle ile creating new Nesne reference if resetData is true
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
      
      // Sıfırla Hata states on successful Getir
      setBackendError(null);
      setRetryCount(0);
      
      // Display current page vs total için pagination
      const mmDisplay = mmTotal === mmData.length ? `MM(${mmTotal})` : `MM(${mmData.length}/${mmTotal})`;
      const ncbkDisplay = ncbkTotal === ncbkData.length ? `NCBK(${ncbkTotal})` : `NCBK(${ncbkData.length}/${ncbkTotal})`;
      const ntelDisplay = ntelTotal === ntelData.length ? `NTEL(${ntelTotal})` : `NTEL(${ntelData.length}/${ntelTotal})`;
      
      const fetchEndTime = Date.now();
      console.log(`✅ Başarıyla yüklendi - Toplam: ${mmDisplay}, ${ncbkDisplay}, ${ntelDisplay} ürün (${fetchEndTime - fetchStartTime}ms)`);
      
      // Log State Güncelle için debugging
      if (resetData) {
        console.log('🔄 State forced to update with resetData=true');
      }

      // CRITICAL FIX: Return the fetched Veri directly a avoid stale State reads
      return allData;

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
        // Final Hata State
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
          // BULLETPROOF cap_code normalization - İşle NULL, undefined, "null", whitespace, etc.
          let normalizedCapCode = '';
          if (seq.cap_code !== null && seq.cap_code !== undefined && seq.cap_code !== 'null' && seq.cap_code !== 'NULL') {
            normalizedCapCode = String(seq.cap_code).trim();
          }
          const key = `${seq.product_type}_${seq.kod_2}_${normalizedCapCode}`;
          sequenceMap[key] = seq.last_sequence;
        });
        setSequences(sequenceMap);
      }
    } catch (error) {
      console.error('Sequence verileri getirilemedi:', error);
    }
  };

  // Oluştur backup sequence row and sync sequences ile database
  const ensureBackupSequenceAndSync = async () => {
    try {
      console.log('*** Starting backup sequence creation and sync process');
      
      // Al fresh sequences Veri directly den API instead of relying on State
      let currentSequences = {};
      try {
        const response = await fetchWithAuth(API_URLS.celikHasirSequence);
        if (response?.ok) {
          const data = await response.json();
          console.log('*** RAW SEQUENCE DATA:', JSON.stringify(data.filter(s => s.kod_2 && s.kod_2.includes('OZL')), null, 2));
          data.forEach(seq => {
            // BULLETPROOF cap_code normalization - İşle NULL, undefined, "null", whitespace, etc.
            let normalizedCapCode = '';
            if (seq.cap_code !== null && seq.cap_code !== undefined && seq.cap_code !== 'null' && seq.cap_code !== 'NULL') {
              normalizedCapCode = String(seq.cap_code).trim();
            }
            const key = `${seq.product_type}_${seq.kod_2}_${normalizedCapCode}`;
            currentSequences[key] = seq.last_sequence;
            if (seq.kod_2 && seq.kod_2.includes('OZL')) {
              console.log(`*** OZL SEQUENCE: key="${key}", cap_code type=${typeof seq.cap_code}, value="${seq.cap_code}", normalized="${normalizedCapCode}", last_sequence=${seq.last_sequence}`);
            }
          });
          console.log('*** Fresh sequences loaded:', Object.keys(currentSequences));
        }
      } catch (error) {
        console.error('*** Error fetching fresh sequences:', error);
      }

      // Kontrol et if backup sequence exists - use exact key match a avoid picking up wrong rows
      const ozlSequenceKey = 'CH_OZL_';
      const ozlBackupKey = 'CH_OZL_BACKUP_';
      
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
        // Oluştur backup sequence row if it doesn't exist
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
      
      // Şimdi Kontrol et the actual database için highest CHOZL sequence
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
              
              // If database has higher sequence, Güncelle both actual and backup
              if (dbHighestSequence > currentMaxSequence) {
                console.log('*** Database sequence is higher! Updating sequence table to:', dbHighestSequence);
                
                // Güncelle actual sequence
                const actualUpdateData = {
                  product_type: 'CH',
                  kod_2: 'OZL',
                  cap_code: '',
                  last_sequence: dbHighestSequence
                };
                
                // NOTE: Using POST için Şimdi olarak backend may İşle UPSERT logic
                // This should ideally be PUT/PATCH a avoid creating duplicates
                await fetchWithAuth(API_URLS.celikHasirSequence, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(actualUpdateData)
                });
                
                // Güncelle backup sequence
                const backupUpdateData = {
                  product_type: 'CH',
                  kod_2: 'OZL_BACKUP',
                  cap_code: '',
                  last_sequence: dbHighestSequence
                };
                
                // NOTE: Using POST için Şimdi olarak backend may İşle UPSERT logic
                // This should ideally be PUT/PATCH a avoid creating duplicates
                await fetchWithAuth(API_URLS.celikHasirSequence, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(backupUpdateData)
                });
                
                console.log('*** Both sequences updated to match database');
                
                // Refresh sequences State
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
      
      // Final refresh of sequences State a ensure it's up a Tarih
      await fetchSequences();
    } catch (error) {
      console.error('*** Error in backup sequence management:', error);
    }
  };

  // Ürünün optimize edilip edilmediğini kontrol et
  const isProductOptimized = (product) => {
    // Kontrol et if optimization has been run ile checking if the Ürün has the isOptimized flag
    // This flag should be Ayarla ile the iyilestir functions
    // için Excel generation den database, also allow products ile existingStokKodu
    return product.isOptimized === true || product.existingStokKodu;
  };

  // Optimize edilmemiş ürünleri kontrol et
  const hasUnoptimizedProducts = () => {
    const unoptimized = validProducts.filter(product => !isProductOptimized(product));
    console.log(`🔍 OPTIMIZATION CHECK - Found ${unoptimized.length} unoptimized products out of ${validProducts.length}:`, 
      unoptimized.map(p => ({
        hasirTipi: p.hasirTipi,
        boyCap: p.boyCap,
        enCap: p.enCap,
        cubukSayisiBoy: p.cubukSayisiBoy,
        cubukSayisiEn: p.cubukSayisiEn
      }))
    );
    return unoptimized.length > 0;
  };

  // Kontrol et için existing products and determine İleri sequence Sayı - Moved up a avoid hoisting issues
  // Track batch counter için sequential Stok Kodu generation
  let batchSequenceCounter = null;
  let batchSequenceInitialized = false;
  let productStokKoduCache = new Map(); // Cache to prevent multiple STOK KODU generation for same product
  
  // Sıfırla batch counter için new batch
  const resetBatchSequenceCounter = () => {
    batchSequenceCounter = null;
    batchSequenceInitialized = false;
    productStokKoduCache.clear(); // Clear cache when resetting batch
  };

  // Başlat batch sequence ile database sync - MUST be called before any generateStokKodu calls
  const initializeBatchSequence = async () => {
    console.log(`🔢 SEQUENCE DEBUG - initializeBatchSequence called, initialized: ${batchSequenceInitialized}, counter: ${batchSequenceCounter}`);
    
    if (batchSequenceInitialized) {
      console.log(`🔢 SEQUENCE DEBUG - Already initialized with counter: ${batchSequenceCounter}`);
      return batchSequenceCounter; // Already initialized
    }

    let maxSequence = 2443; // Default fallback

    // Use exact key match a avoid picking up rows ile NULL cap_code
    const ozlSequenceKey = 'CH_OZL_';
    const ozlBackupKey = 'CH_OZL_BACKUP_';

    let actualSequence = 2443;
    let backupSequence = 2443;

    if (sequences[ozlSequenceKey]) {
      actualSequence = sequences[ozlSequenceKey];
      console.log('*** Actual sequence from table:', ozlSequenceKey, 'value:', actualSequence);
    }

    if (sequences[ozlBackupKey]) {
      backupSequence = sequences[ozlBackupKey];
      console.log('*** Backup sequence from table:', ozlBackupKey, 'value:', backupSequence);
    }
    
    let preliminaryMaxSequence = Math.max(actualSequence, backupSequence);
    console.log('*** Preliminary max sequence from table:', preliminaryMaxSequence, 'from actual:', actualSequence, 'backup:', backupSequence);
    
    // Kontrol et actual database için highest existing CHOZL a make sure we don't generate duplicates
    try {
      console.log('*** Checking database for highest existing CHOZL sequence to avoid duplicates');
      // Ekle timestamp a bypass any caching
      const dbCheckResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?search=CHOZL&sort_by=stok_kodu&sort_order=desc&limit=5&_t=${Date.now()}`);
      if (dbCheckResponse?.ok) {
        const dbData = await dbCheckResponse.json();
        console.log('*** initializeBatchSequence - DB check response structure:', dbData);
        // İşle both possible Yanıt structures
        const productList = dbData.data || dbData;
        if (Array.isArray(productList) && productList.length > 0) {
          // Debug: Kontrol et actual Alan names in Yanıt
          console.log('*** First product fields:', Object.keys(productList[0]));
          console.log('*** First product stok_kodu variants:', {
            stok_kodu: productList[0].stok_kodu,
            stokKodu: productList[0].stokKodu,
            STOK_KODU: productList[0].STOK_KODU
          });

          let highestDbSequence = 0;
          productList.forEach((product, idx) => {
            // Dene multiple Alan name variants
            const stokKodu = product.stok_kodu || product.stokKodu || product.STOK_KODU;
            if (!stokKodu) {
              console.warn(`*** Product ${idx} has no stok_kodu field:`, product);
              return;
            }
            const match = stokKodu.match(/CHOZL(\d+)/);
            if (match) {
              const seqNum = parseInt(match[1]);
              console.log(`*** Found sequence ${seqNum} from ${stokKodu}`);
              if (seqNum > highestDbSequence) {
                highestDbSequence = seqNum;
              }
            }
          });
          console.log('*** Database highest CHOZL sequence found:', highestDbSequence);
          
          // Use the higher of sequence table or actual database
          maxSequence = Math.max(preliminaryMaxSequence, highestDbSequence);
          console.log('*** Final max sequence after DB check:', maxSequence, 'table:', preliminaryMaxSequence, 'db:', highestDbSequence);
          
          // If database has higher, we should Güncelle the sequence table
          if (highestDbSequence > preliminaryMaxSequence) {
            console.log('*** Database is ahead! Need to update sequence table to:', highestDbSequence);
            console.log('*** SKIPPING POST operation to prevent duplicate sequence rows');
            console.log('*** The existing PUT operations in updateSequences() will handle the sync');
            // REMOVED: The POST operation here was creating duplicate rows
            // The actual sequence updates are properly handled ile updateSequences()
            // using PUT operations ile specific row IDs
          }
        } else {
          maxSequence = preliminaryMaxSequence;
          console.log('*** No CHOZL products found in database, using sequence table value:', maxSequence);
        }
      } else {
        maxSequence = preliminaryMaxSequence;
        console.log('*** Could not check database, using sequence table value:', maxSequence);
      }
    } catch (dbCheckError) {
      console.error('*** Error checking database for duplicates:', dbCheckError);
      maxSequence = preliminaryMaxSequence;
    }
    
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
          // için standard products: CH.STD.0450.XX
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
          // için özel products: CHOZL0001, CHOZL0002, etc.
          
          // This function should only Kontrol et için existing products, not generate new codes
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

  // Generate new stok kodu için genuinely new products only
  function generateNewStokKodu(product, productType, batchIndex = 0) {
    if (productType === 'CH') {
      // Oluştur unique cache key için this Ürün
      const productKey = `${product.hasirTipi}-${product.boyCap}-${product.enCap}-${product.uzunlukBoy}-${product.uzunlukEn}-${formatGozAraligi(product)}`;
      
      // Return cached STOK KODU if already generated için this Ürün
      if (productStokKoduCache.has(productKey)) {
        const cachedCode = productStokKoduCache.get(productKey);
        console.log('*** USING CACHED STOK KODU ***');
        console.log('Product:', { hasirTipi: product.hasirTipi, batchIndex });
        console.log('Cached STOK KODU:', cachedCode);
        return cachedCode;
      }
      
      // Batch should already be initialized ile initializeBatchSequence()
      if (!batchSequenceInitialized) {
        console.error('*** ERROR: Batch sequence not initialized! Call initializeBatchSequence() first.');
        // Fallback - use basic sequence table lookup without database Kontrol et - use exact key match
        const ozlSequenceKey = 'CH_OZL_';
        const ozlBackupKey = 'CH_OZL_BACKUP_';

        let actualSequence = 2443;
        let backupSequence = 2443;

        if (sequences[ozlSequenceKey]) {
          actualSequence = sequences[ozlSequenceKey];
        }

        if (sequences[ozlBackupKey]) {
          backupSequence = sequences[ozlBackupKey];
        }

        batchSequenceCounter = Math.max(actualSequence, backupSequence);
        batchSequenceInitialized = true;
        console.log('*** FALLBACK: Batch initialized with sequence table only:', batchSequenceCounter);
      }
      
      // Increment counter ONLY zaman creating NEW Ürün (not cached)
      batchSequenceCounter++;
      const generatedCode = `CHOZL${String(batchSequenceCounter).padStart(4, '0')}`;
      
      // Cache the generated code için this Ürün
      productStokKoduCache.set(productKey, generatedCode);
      
      console.log('*** NEW STOK KODU GENERATION ***');
      console.log('Product:', { hasirTipi: product.hasirTipi, batchIndex });
      console.log('Sequence for this NEW product:', batchSequenceCounter, 'Generated:', generatedCode);
      console.log('Cached for future use with key:', productKey);
      
      return generatedCode;
    }
    
    return 'CH.STD.0700.00'; // Default fallback
  }

  // Stok kodu oluştur - Enhanced ile database-aware incrementality
  function generateStokKodu(product, productType, batchIndex = 0) {
    console.log(`🔢 STOK KODU DEBUG - Generating for:`, {
      productType,
      hasirTipi: product.hasirTipi,
      uzunlukBoy: product.uzunlukBoy,
      uzunlukEn: product.uzunlukEn,
      batchIndex,
      batchSequenceCounter
    });
    
    if (productType === 'CH') {
      const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                         (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25');
      const diameter = parseFloat(product.boyCap || product.enCap || 0);
      const diameterCode = String(Math.round(diameter * 100)).padStart(4, '0');
      
      if (isStandard) {
        // için standard products: CH.STD.0450.XX
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
        // için özel products: use the new generation function
        return generateNewStokKodu(product, productType, batchIndex);
      }
    }
    return 'CH.STD.0700.00'; // Default fallback
  }

  // Formatla decimal için display - Turkish Formatla ile comma or point
  const formatDecimalForDisplay = (value, useComma = true) => {
    // İşle undefined, null, empty String, and NaN cases
    if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
      return '0';
    }
    
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    // Kaldır trailing zeros and Formatla
    let formatted = num.toString();
    if (formatted.includes('.')) {
      formatted = formatted.replace(/\.?0+$/, '');
    }
    
    // Replace dot ile comma için Turkish Formatla if requested
    if (useComma && formatted.includes('.')) {
      formatted = formatted.replace('.', ',');
    }
    
    return formatted;
  };

  // Stok adı oluştur - Fixed formatting
  const generateStokAdi = (product, productType) => {
    if (productType === 'CH') {
      // Dene a Al göz aralığı Veri den multiple sources
      let boyAraligi = product.boyAraligi || product.boyAralik;
      let enAraligi = product.enAraligi || product.enAralik;
      
      // değilse Mevcut on Ürün, use calculateGozAraligi function olarak fallback
      if (!boyAraligi || !enAraligi) {
        const hasirTipi = product.hasirTipi;
        const isFromDatabase = product.source === 'database' || product.skipDatabaseRefresh;
        
        if (hasirTipi) {
          if (isFromDatabase) {
            console.log(`⚠️ Database product ${hasirTipi} missing mesh size in generateStokAdi, using calculateGozAraligi fallback`);
          } else {
            console.log(`⚠️ UI product ${hasirTipi} missing mesh size in generateStokAdi, using calculateGozAraligi fallback`);
          }
          boyAraligi = boyAraligi || calculateGozAraligi(hasirTipi, 'boy').toString();
          enAraligi = enAraligi || calculateGozAraligi(hasirTipi, 'en').toString();
        }
      }
      
      // Formatla göz aralığı
      let gozAraligi = '';
      if (boyAraligi && enAraligi) {
        gozAraligi = `${boyAraligi}x${enAraligi}`;
      } else if (product.gozAraligi) {
        gozAraligi = product.gozAraligi;
      } else if (product.goz_araligi) {
        gozAraligi = product.goz_araligi;
      }
      
      // Normalize hasır tipi a correct Formatla (Q257/257, R257, TR257)
      const normalizedHasirTipi = normalizeHasirTipi(product.hasirTipi);
      
      // CRITICAL FIX: İşle undefined boyCap/enCap properly a prevent NaN in stok_adi
      const boyCapValue = parseFloat(product.boyCap) || 0;
      const enCapValue = parseFloat(product.enCap) || 0;
      const formattedBoyCap = formatDecimalForDisplay(boyCapValue, true);
      const formattedEnCap = formatDecimalForDisplay(enCapValue, true);
      const formattedBoy = parseInt(product.uzunlukBoy || 0) || 0;
      const formattedEn = parseInt(product.uzunlukEn || 0) || 0;
      
      
      // Oluştur the standard Formatla used in database saves
      const stokAdi = `${normalizedHasirTipi} Çap(${formattedBoyCap}x${formattedEnCap} mm) Ebat(${formattedBoy}x${formattedEn} cm)${gozAraligi ? ` Göz Ara(${gozAraligi} cm)` : ''}`;
      
      return stokAdi;
    } else if (productType === 'NCBK') {
      const formattedCap = formatDecimalForDisplay(product.cap, true);
      const formattedLength = parseInt(product.length || 0) || 0;
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
    
    console.log('📊 GET PRODUCTS TO SAVE - Starting analysis:', {
      totalProducts: validProducts.length,
      savedProductsCount: savedProducts?.mm?.length || 0,
      firstProduct: validProducts[0] ? {
        hasirTipi: validProducts[0].hasirTipi,
        uzunlukBoy: validProducts[0].uzunlukBoy,
        uzunlukEn: validProducts[0].uzunlukEn,
        existingStokKodu: validProducts[0].existingStokKodu
      } : null
    });
    const newProducts = [];
    
    // Helper function a normalize Stok Adı için comparison
    // This handles variations like "5x5" vs "5,0x5,0" vs "5.0x5.0" and "15*25" vs "15x25"
    const normalizeStokAdiForComparison = (stokAdi) => {
      if (!stokAdi) return '';
      
      return stokAdi
        // Replace all decimal variations ile a standard Formatla
        .replace(/(\d+)[,.]0(?=\D|$)/g, '$1') // Convert 5,0 or 5.0 to 5
        .replace(/(\d+),(\d+)/g, '$1.$2')     // Convert 5,5 to 5.5
        // Normalize göz aralığı separators
        .replace(/(\d+)\*(\d+)/g, '$1x$2')   // Convert 15*25 to 15x25
        .replace(/\s+/g, ' ')                 // Normalize spaces
        .toLowerCase()
        .trim();
    };
    
    for (const product of validProducts) {
      // Generate the Stok Adı için this Ürün
      const productStokAdi = generateStokAdi(product, 'CH');
      const normalizedProductStokAdi = normalizeStokAdiForComparison(productStokAdi);
      
      // Kontrol et if Ürün exists using multiple strategies
      let productExists = false;
      
      // Strategy 1: Match ile exact Stok Adı AND wire counts
      productExists = savedProducts.mm.some(p =>
        p.stok_adi === productStokAdi &&
        parseInt(p.ic_cap_boy_cubuk_ad || 0) === parseInt(product.cubukSayisiBoy || 0) &&
        parseInt(p.dis_cap_en_cubuk_ad || 0) === parseInt(product.cubukSayisiEn || 0)
      );

      // Strategy 2: Match ile normalized Stok Adı AND wire counts (handles decimal variations)
      if (!productExists) {
        productExists = savedProducts.mm.some(p => {
          const normalizedDbStokAdi = normalizeStokAdiForComparison(p.stok_adi);
          return normalizedDbStokAdi === normalizedProductStokAdi &&
                 parseInt(p.ic_cap_boy_cubuk_ad || 0) === parseInt(product.cubukSayisiBoy || 0) &&
                 parseInt(p.dis_cap_en_cubuk_ad || 0) === parseInt(product.cubukSayisiEn || 0);
        });
        
        if (productExists) {
          console.log(`Found match via normalized Stok Adı: "${productStokAdi}" matched database entry`);
        }
      }
      
      // Strategy 3: Fallback - Match ile Ürün specifications ile proper hasir_tipi normalization
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
          Math.abs(parseFloat(p.cap2 || 0) - parseFloat(product.enCap || 0)) < 0.01 &&
          (p.goz_araligi || '') === (product.gozAraligi || '') && // FIXED: Check göz aralığı to prevent wrong matches
          parseInt(p.ic_cap_boy_cubuk_ad || 0) === parseInt(product.cubukSayisiBoy || 0) &&
          parseInt(p.dis_cap_en_cubuk_ad || 0) === parseInt(product.cubukSayisiEn || 0)
        );
        
        if (productExists) {
          console.log(`Found match via specifications for: ${productStokAdi}`);
        }
      }
      
      // Only Ekle if Ürün doesn't exist
      if (!productExists) {
        newProducts.push(product);
      } else {
        console.log(`Product already exists, skipping: ${productStokAdi}`);
      }
    }
    
    console.log('DEBUG: getProductsToSave - found', newProducts.length, 'new products');
    return newProducts;
  }, [validProducts, savedProducts]);

  // Al products that are already saved in database (opposite of getProductsToSave)
  const getSavedProductsList = useCallback(() => {
    if (!validProducts?.length || !savedProducts?.mm?.length) return [];

    const savedProductsList = [];
    console.log('DEBUG: getSavedProductsList - checking', validProducts.length, 'products against', savedProducts.mm.length, 'saved products');
    
    // Helper function a normalize Stok Adı için comparison (same olarak in getProductsToSave)
    const normalizeStokAdiForComparison = (stokAdi) => {
      if (!stokAdi) return '';
      
      return stokAdi
        // Replace all decimal variations ile a standard Formatla
        .replace(/(\d+)[,.]0(?=\D|$)/g, '$1') // Convert 5,0 or 5.0 to 5
        .replace(/(\d+),(\d+)/g, '$1.$2')     // Convert 5,5 to 5.5
        // Normalize göz aralığı separators
        .replace(/(\d+)\*(\d+)/g, '$1x$2')   // Convert 15*25 to 15x25
        .replace(/\s+/g, ' ')                 // Normalize spaces
        .toLowerCase()
        .trim();
    };
    
    for (const product of validProducts) {
      // Generate the Stok Adı için this Ürün
      const productStokAdi = generateStokAdi(product, 'CH');
      
      // Use same logic olarak analyzeProductsForConfirmation - first Dene exact Stok Adı
      let existingProduct = savedProducts.mm.find(p => p.stok_adi === productStokAdi);
      
      // Dene normalized Stok Adı if exact match not found
      if (!existingProduct) {
        const normalizedProductStokAdi = normalizeStokAdiForComparison(productStokAdi);
        existingProduct = savedProducts.mm.find(p => {
          const normalizedDbStokAdi = normalizeStokAdiForComparison(p.stok_adi);
          return normalizedDbStokAdi === normalizedProductStokAdi;
        });
      }
      
      // Fallback a specifications matching değilse found ile Stok Adı ile proper hasir_tipi normalization
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
          Math.abs(parseFloat(p.cap2 || 0) - parseFloat(product.enCap || 0)) < 0.01 &&
          (p.goz_araligi || '') === (product.gozAraligi || '') // FIXED: Check göz aralığı to prevent wrong matches
        );
      }
      
      if (existingProduct) {
        // Ürün is already saved - use the found existing Ürün
        
        // Ürün is already saved - Ekle it a saved Liste
        // Map et database fields a expected Formatla için Excel generation
        savedProductsList.push({
          ...product,
          existingStokKodu: existingProduct.stok_kodu,
          stokAdi: productStokAdi,
          // Map et database fields a expected Excel generation Formatla
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

  // Analyze products and categorize them into new vs existing ile full details
  const analyzeProductsForConfirmation = async () => {
    if (validProducts.length === 0) return { newProducts: [], existingProducts: [], batchDuplicates: [] };
    
    // Başlat batch sequence before any stok kodu generation
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
    
    // CRITICAL FIX: Force fresh Veri Getir before analysis a avoid stale cache
    // This prevents Silindi products den appearing olarak "existing" zaman trying a re-Ekle them
    console.log('DEBUG: Fetching FRESH data for product analysis to avoid stale cache...');
    const freshSavedProducts = await fetchSavedProducts(false, true, true); // Force fresh data with cache busting AND mark as critical - returns data directly to avoid stale state
    
    // Debug: Log the fresh savedProducts structure and Kontrol et için CHOZL2448 specifically
    console.log('DEBUG: freshSavedProducts in analyzeProductsForConfirmation:', {
      mm: freshSavedProducts.mm?.length || 0,
      ncbk: freshSavedProducts.ncbk?.length || 0,
      ntel: freshSavedProducts.ntel?.length || 0
    });
    
    // CRITICAL DEBUG: Kontrol et if CHOZL2448 still exists in fresh Veri after deletion
    const chozl2448Products = freshSavedProducts.mm.filter(p => p.stok_kodu && p.stok_kodu.includes('CHOZL2448'));
    console.log('🚨 CRITICAL DEBUG: CHOZL2448 products still in freshSavedProducts after deletion:', chozl2448Products.length);
    if (chozl2448Products.length > 0) {
      console.log('🚨 CHOZL2448 PRODUCTS FOUND:', chozl2448Products.map(p => ({
        id: p.id,
        stok_kodu: p.stok_kodu,
        stok_adi: p.stok_adi,
        created_at: p.created_at
      })));
      
    }
    
    // Helper function a normalize Stok Adı için comparison (same olarak in getProductsToSave)
    const normalizeStokAdiForComparison = (stokAdi) => {
      if (!stokAdi) return '';
      
      return stokAdi
        // Replace all decimal variations ile a standard Formatla
        .replace(/(\d+)[,.]0(?=\D|$)/g, '$1') // Convert 5,0 or 5.0 to 5
        .replace(/(\d+),(\d+)/g, '$1.$2')     // Convert 5,5 to 5.5
        // Normalize göz aralığı separators
        .replace(/(\d+)\*(\d+)/g, '$1x$2')   // Convert 15*25 to 15x25
        .replace(/\s+/g, ' ')                 // Normalize spaces
        .toLowerCase()
        .trim();
    };
    
    // Second pass: Kontrol et unique products against database
    for (const product of batchUniqueProducts) {
      // Generate the Stok Adı için this Ürün
      const productStokAdi = generateStokAdi(product, 'CH');
      console.log('DEBUG: Looking for product with stok_adi:', productStokAdi);
      
      // Bul ALL existing products ile exact Stok Adı AND wire counts using FRESH Veri
      let allMatchingProducts = freshSavedProducts.mm.filter(p =>
        p.stok_adi === productStokAdi &&
        parseInt(p.ic_cap_boy_cubuk_ad || 0) === parseInt(product.cubukSayisiBoy || 0) &&
        parseInt(p.dis_cap_en_cubuk_ad || 0) === parseInt(product.cubukSayisiEn || 0)
      );
      let existingProduct = allMatchingProducts[0]; // Take first one for backward compatibility

      // Debug: Göster all exact matches
      if (allMatchingProducts.length > 0) {
        console.log(`DEBUG: Found ${allMatchingProducts.length} exact match(es) for: "${productStokAdi}"`);
        allMatchingProducts.forEach((p, index) => {
          console.log(`  Exact Match ${index + 1}: ${p.stok_kodu} - "${p.stok_adi}"`);
        });
      }
      
      // Dene normalized Stok Adı AND wire counts if exact match not found
      if (!existingProduct) {
        const normalizedProductStokAdi = normalizeStokAdiForComparison(productStokAdi);
        allMatchingProducts = freshSavedProducts.mm.filter(p => {
          const normalizedDbStokAdi = normalizeStokAdiForComparison(p.stok_adi);
          return normalizedDbStokAdi === normalizedProductStokAdi &&
                 parseInt(p.ic_cap_boy_cubuk_ad || 0) === parseInt(product.cubukSayisiBoy || 0) &&
                 parseInt(p.dis_cap_en_cubuk_ad || 0) === parseInt(product.cubukSayisiEn || 0);
        });
        existingProduct = allMatchingProducts[0]; // Take first one for backward compatibility
        
        if (existingProduct) {
          console.log(`DEBUG: Found ${allMatchingProducts.length} match(es) via normalized Stok Adı for: "${productStokAdi}"`);
          allMatchingProducts.forEach((p, index) => {
            console.log(`  Match ${index + 1}: ${p.stok_kodu} - "${p.stok_adi}"`);
          });
        } else {
          // If still not found, Göster some similar products için debugging
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
      
      // Fallback a specifications matching değilse found ile Stok Adı ile proper hasir_tipi normalization
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
          Math.abs(parseFloat(p.cap2 || 0) - parseFloat(product.enCap || 0)) < 0.01 &&
          (p.goz_araligi || '') === (product.gozAraligi || '') && // FIXED: Check göz aralığı to prevent wrong matches
          parseInt(p.ic_cap_boy_cubuk_ad || 0) === parseInt(product.cubukSayisiBoy || 0) &&
          parseInt(p.dis_cap_en_cubuk_ad || 0) === parseInt(product.cubukSayisiEn || 0)
        );
      }
      
      if (existingProduct) {
        console.log('DEBUG: Found existing product:', existingProduct.stok_adi, existingProduct.stok_kodu);
        
        // Bul ALL products that match ONLY the physical specifications (ignore Stok Adı completely)
        // This will Yakala products ile identical specs but different Stok Adı formatting

        // Başlangıç ile products already found ile exact/normalized stok_adi match, then Ekle spec-based matches
        const specBasedMatches = freshSavedProducts.mm.filter(p => {
          const dimensionMatch = Math.abs(parseFloat(p.ebat_boy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.01 &&
                                 Math.abs(parseFloat(p.ebat_en || 0) - parseFloat(product.uzunlukEn || 0)) < 0.01;
          
          // Enhanced decimal normalization based on ACTUAL database patterns
          const normalizeDecimal = (value) => {
            if (!value && value !== 0) return 0;
            
            // İşle all decimal Formatla variations found in database
            let str = String(value)
              .replace(',', '.')           // "6,5" → "6.5" 
              .replace(/\s+/g, '')         // "6 .5" → "6.5"
              .trim();
              
            const num = parseFloat(str);
            if (isNaN(num)) return 0;
            
            // İşle floating point precision issues - database has values like: 6.5, 7.8, 9.2, 7.5
            // Don't round decimals olarak they are exact values in the database
            return Math.round(num * 100) / 100;
          };
          
          // Tighter tolerance için Çap matching a İşle precision differences
          const diameterMatch = Math.abs(normalizeDecimal(p.cap) - normalizeDecimal(product.boyCap)) < 0.001 &&
                               Math.abs(normalizeDecimal(p.cap2) - normalizeDecimal(product.enCap)) < 0.001;
          
          // Enhanced hasır tipi comparison ile Formatla variations (Q257/257 vs Q257)
          const enhancedNormalizeHasirTipi = (hasirTipi) => {
            if (!hasirTipi) return '';
            return String(hasirTipi)
              .replace(/\/\d+$/, '') // Remove trailing /XXX patterns (Q257/257 → Q257, Q221/221 → Q221)
              .replace(/\s+/g, '')   // Remove all spaces
              .toUpperCase()
              .trim();
          };
          
          // Kontrol et both hasir_tipi Alan and stok_adi (where Q/R/TR codes are stored)
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
              
            // İşle single values that need duplication: "15" → "15*15", "1515" → "15*15"
            if (normalized && !normalized.includes('*')) {
              // Kontrol et if it's a double Sayı like "1515" → "15*15"
              if (normalized.length === 4 && /^\d{4}$/.test(normalized)) {
                const first = normalized.substring(0, 2);
                const second = normalized.substring(2, 4);
                if (first === second) {
                  return `${first}x${second}`;
                }
              }
              // Kontrol et if it's a double Sayı like "3015" → "30*15"
              if (normalized.length === 4 && /^\d{4}$/.test(normalized)) {
                const first = normalized.substring(0, 2);
                const second = normalized.substring(2, 4);
                return `${first}x${second}`;
              }
              // Single Değer: "15" → "15*15"
              if (/^\d{1,2}$/.test(normalized)) {
                return `${normalized}x${normalized}`;
              }
            }
            
            return normalized;
          };
          
          const gozMatch = enhancedNormalizeGozAraligi(p.goz_araligi) === enhancedNormalizeGozAraligi(formatGozAraligi(product));

          // Wire count matching - critical için distinguishing products ile same specs but different wire counts
          const wireCountsMatch = (
            parseInt(p.ic_cap_boy_cubuk_ad || 0) === parseInt(product.cubukSayisiBoy || 0) &&
            parseInt(p.dis_cap_en_cubuk_ad || 0) === parseInt(product.cubukSayisiEn || 0)
          );

          // Enhanced Stok Adı similarity Kontrol et (typo tolerance)
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
            
            // Levenshtein distance için fuzzy matching
            const distance = levenshteinDistance(n1, n2);
            const maxLength = Math.max(n1.length, n2.length);
            return maxLength === 0 ? 1.0 : Math.max(0, (maxLength - distance) / maxLength);
          };
          
          // Helper function için edit distance calculation
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
          
          // Generate expected stok_adi için similarity comparison
          const expectedStokAdi = generateStokAdi(product, 'CH');
          const similarity = calculateSimilarity(p.stok_adi, expectedStokAdi);
          // More flexible similarity for standard vs OZL products - they can have very different stok_adi formats but identical specs
          const isStandardProduct = p.stok_kodu && p.stok_kodu.includes('.STD.');
          const similarityThreshold = isStandardProduct ? 0.60 : 0.80; // Lower threshold for standard products
          const stokAdiMatch = similarity > similarityThreshold;
          
          // Combine all matching criteria - including wire counts a distinguish products
          const overallMatch = hasirTipiMatch && dimensionMatch && diameterMatch && gozMatch && wireCountsMatch && stokAdiMatch;
          
          // Enhanced debug için first Ürün
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
            console.log('  🔢 WIRE COUNTS:', {
              db_boy: parseInt(p.ic_cap_boy_cubuk_ad || 0),
              product_boy: parseInt(product.cubukSayisiBoy || 0),
              db_en: parseInt(p.dis_cap_en_cubuk_ad || 0),
              product_en: parseInt(product.cubukSayisiEn || 0),
              match: wireCountsMatch
            });
            console.log('  📝 STOK ADI SIMILARITY:', {
              db: p.stok_adi,
              expected: expectedStokAdi,
              similarity: similarity.toFixed(5),
              threshold: similarityThreshold,
              isStandard: isStandardProduct,
              match: stokAdiMatch
            });
            console.log('  🔍 INDIVIDUAL CRITERIA:');
            console.log('    hasirTipiMatch:', hasirTipiMatch);
            console.log('    dimensionMatch:', dimensionMatch);
            console.log('    diameterMatch:', diameterMatch);
            console.log('    gozMatch:', gozMatch);
            console.log('    wireCountsMatch:', wireCountsMatch);
            console.log('    stokAdiMatch:', stokAdiMatch);
            console.log('  ✅ OVERALL MATCH:', overallMatch);
          }

          // Debug matching products beyond the first one
          if (overallMatch && p.stok_kodu !== existingProduct.stok_kodu) {
            console.log(`🔍 ADDITIONAL MATCH FOUND: ${p.stok_kodu} - ${p.stok_adi}`);
          }

          return overallMatch;
        });
        
        // Debug all hasır tipi variations in the database için this comparison
        const allHasirTipiVariations = new Set(freshSavedProducts.mm.map(p => p.hasir_tipi).filter(Boolean));
        console.log('📋 ALL HASIR TIPI VARIATIONS IN DATABASE:', Array.from(allHasirTipiVariations).sort());
        
        // Combine exact/normalized stok_adi matches ile spec-based matches
        const combinedMatches = new Map();
        // Ekle exact/normalized matches first
        allMatchingProducts.forEach(p => combinedMatches.set(p.stok_kodu, p));
        // Ekle spec-based matches
        specBasedMatches.forEach(p => combinedMatches.set(p.stok_kodu, p));
        const finalMatchingProducts = Array.from(combinedMatches.values());

        console.log(`DEBUG: Found ${finalMatchingProducts.length} products with IDENTICAL specifications:`,
          finalMatchingProducts.map(p => ({ 
            stok_kodu: p.stok_kodu,
            stok_adi: p.stok_adi,
            hasir_tipi_original: p.hasir_tipi,
            hasir_tipi_normalized: normalizeHasirTipi(p.hasir_tipi),
            specs: `${p.hasir_tipi} ${p.ebat_boy}x${p.ebat_en} ${p.cap}x${p.cap2} ${p.goz_araligi}`
          }))
        );
        
        // Fallback: if no matches found ile smart filtering, Dene simpler fallback matching
        if (allMatchingProducts.length === 0) {
          console.log('DEBUG: No smart matches found, trying fallback matching...');
          // Dene ile just hasir tipi and dimensions (less strict) ile proper normalization
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
        
        // Ürün exists - Ekle a existing Liste ile stok_kodu and variant info
        // Oluştur a Map et of Stok Adı a all related Stok Kodus (same logic olarak saveToDatabase)
        const stokAdiToStokKodusMap = new Map();
        
        // Map et all existing products ile Stok Adı
        [...freshSavedProducts.mm, ...freshSavedProducts.ncbk, ...freshSavedProducts.ntel].forEach(p => {
          if (p.stok_adi) {
            if (!stokAdiToStokKodusMap.has(p.stok_adi)) {
              stokAdiToStokKodusMap.set(p.stok_adi, []);
            }
            stokAdiToStokKodusMap.get(p.stok_adi).push(p.stok_kodu);
          }
        });
        
        // Kontrol et için NCBK/NTEL variants - CRITICAL FIX: İşle undefined boyCap/enCap
        const boyCapFormatted = formatDecimalForDisplay(parseFloat(product.boyCap) || 0, true);
        const enCapFormatted = formatDecimalForDisplay(parseFloat(product.enCap) || 0, true);
        const ncbkStokAdi500 = `YM Nervürlü Çubuk ${boyCapFormatted} mm 500 cm`;
        const ncbkStokAdi215 = `YM Nervürlü Çubuk ${enCapFormatted} mm 215 cm`;
        const ntelStokAdi = `YM Nervürlü Tel ${boyCapFormatted} mm`;
        
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
        
        // Ürün is new - generate new stok_kodu ile proper batch indexing
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
      // İngilizce İsim should be a direct translation of Stok Adı
      // Al the Turkish Stok Adı first
      const stokAdi = generateStokAdi(product, 'CH');
      
      // Translate Turkish terms a English and Formatla correctly
      let ingilizceIsim = stokAdi
        .replace(/Çap\(/g, 'Dia(')           // Çap -> Dia  
        .replace(/Ebat\(/g, 'Size(')         // Ebat -> Size
        .replace(/Göz Ara\(/g, 'Mesh(')      // Göz Ara -> Mesh
        .replace(/,/g, '.');                 // Turkish decimal comma -> English decimal point
      
      // Formatla: "Wire Mesh Q317/317 Dia(7.8x7.8 mm) Size(123x150 cm) Mesh(15x15 cm)"
      return `Wire Mesh ${ingilizceIsim}`;
    } else if (productType === 'NCBK') {
      const cap = formatDecimalForDisplay(product.cap || 0, false);
      const length = product.length || product.uzunlukBoy || product.uzunlukEn || 0;
      console.log(`🔍 NCBK İngilizce İsim DEBUG:`, {
        product,
        cap,
        length,
        originalLength: product.length,
        uzunlukBoy: product.uzunlukBoy,
        uzunlukEn: product.uzunlukEn
      });
      return `Ribbed Rebar ${cap} mm ${length} cm`;
    } else if (productType === 'NTEL') {
      const cap = formatDecimalForDisplay(product.cap || 0, false);
      return `Ribbed Wire ${cap} mm`;
    }
    return '';
  };

  // Göz aralığı formatla
  const formatGozAraligi = (product) => {
    // için database/bulk flows: prioritize stored database values
    // için new Ürün flows: prioritize UI values
    
    const isFromDatabase = product.source === 'database' || product.skipDatabaseRefresh;
    
    // Kontrol et multiple possible Alan names in priority Sipariş
    if (product.boyAraligi && product.enAraligi) {
      return `${product.boyAraligi}x${product.enAraligi}`;
    } else if (product.boyAralik && product.enAralik) {
      return `${product.boyAralik}x${product.enAralik}`;
    } else if (product.gozAraligi) {
      const gozValue = product.gozAraligi.toString();
      // Kontrol et if already formatted (contains x or *)
      if (gozValue.includes('x') || gozValue.includes('*')) {
        return gozValue.replace('*', 'x'); // Normalize * to x
      } else {
        return `${gozValue}x${gozValue}`;
      }
    } else if (product.goz_araligi) {
      const gozValue = product.goz_araligi.toString();
      // Kontrol et if already formatted (contains x or *)
      if (gozValue.includes('x') || gozValue.includes('*')) {
        return gozValue.replace('*', 'x'); // Normalize * to x
      } else {
        return `${gozValue}x${gozValue}`;
      }
    } else {
      // Fallback behavior depends on source
      const hasirTipi = product.hasirTipi || '';
      if (hasirTipi) {
        if (isFromDatabase) {
          console.log(`⚠️ Database product ${hasirTipi} missing mesh data, using calculateGozAraligi fallback`);
        } else {
          console.log(`⚠️ UI product ${hasirTipi} missing mesh data, using calculateGozAraligi fallback`);
        }
        const boyAralik = calculateGozAraligi(hasirTipi, 'boy');
        const enAralik = calculateGozAraligi(hasirTipi, 'en');
        return `${boyAralik}x${enAralik}`;
      }
      return '15x15'; // Final fallback
    }
  };

  // Smart hasır tipi normalizer - handles Q/R/TR Formatla variations intelligently
  // FIXED: Q products should be stored olarak single Qxxx Formatla in mesh_type_configs table
  const normalizeHasirTipi = (tipi) => {
    if (!tipi) return '';

    // İşle various Girdi formats and clean the String
    let cleanTipi = tipi.toString().trim().toUpperCase();

    // Kaldır any extra whitespace between letters and numbers
    cleanTipi = cleanTipi.replace(/\s+/g, '');

    // İşle Q-Tip combinations (Q221/443) - preserve olarak-is için different numbers
    const combinationMatch = cleanTipi.match(/^Q(\d+)\/(\d+)$/);
    if (combinationMatch) {
      const first = combinationMatch[1];
      const second = combinationMatch[2];
      // Return combination Formatla olarak-is if numbers are different
      if (first !== second) {
        return `Q${first}/${second}`;
      }
    }

    // Extract the base pattern (Q257, R257, TR257, etc.)
    // İşle both Q257 and Q257/257 formats
    const match = cleanTipi.match(/^(Q|R|TR)(\d+)(?:\/\d+)?/);
    if (!match) return cleanTipi;

    const prefix = match[1];  // Q, R, or TR
    const number = match[2];  // 257, 221, etc.

    // Normalize based on Tip rules den CSV analysis:
    // Q types should have double Formatla: Q257/257 (only için single Q-types)
    // R and TR types should have single Formatla: R257, TR257
    if (prefix === 'Q') {
      return `${prefix}${number}/${number}`;
    } else {
      return `${prefix}${number}`;
    }
  };

  // Helper function a normalize hasir tipi specifically için mesh config storage
  // This should store Q products olarak single Formatla (Q692) not double (Q692/692)
  const normalizeHasirTipiForMeshConfig = (tipi) => {
    if (!tipi) return '';

    let cleanTipi = tipi.toString().trim().toUpperCase();
    cleanTipi = cleanTipi.replace(/\s+/g, '');

    // Extract base Formatla: Q692/692 -> Q692, Q257/443 -> Q257/443 (preserve if different)
    const combinationMatch = cleanTipi.match(/^Q(\d+)\/(\d+)$/);
    if (combinationMatch) {
      const first = combinationMatch[1];
      const second = combinationMatch[2];
      // If same numbers (Q692/692), Çevir a single Formatla (Q692)
      if (first === second) {
        return `Q${first}`;
      }
      // If different numbers (Q257/443), keep olarak-is
      return `Q${first}/${second}`;
    }

    // İşle R and TR types normally
    const match = cleanTipi.match(/^(Q|R|TR)(\d+)(?:\/\d+)?/);
    if (!match) return cleanTipi;

    const prefix = match[1];
    const number = match[2];

    return `${prefix}${number}`;
  };

  // Helper function a prompt user için mesh config Veri and Kaydet a database
  const promptAndSaveMeshConfig = async (hasirTipi) => {
    const boyCap = prompt('Boy çapı (mm):');
    const enCap = prompt('En çapı (mm):');
    const boyAralik = prompt('Boy aralığı (cm):', '15');
    const enAralik = prompt('En aralığı (cm):', hasirTipi.startsWith('Q') ? '15' : hasirTipi.startsWith('TR') ? '15' : '25');

    if (boyCap && enCap && boyAralik && enAralik) {
      // Determine Tip
      let type = 'Q';
      if (hasirTipi.startsWith('R')) type = 'R';
      else if (hasirTipi.startsWith('TR')) type = 'TR';

      // Generate description
      const description = `${type} type ${type === 'Q' ? 'mesh' : type === 'TR' ? 'truss reinforcement mesh' : 'reinforcement mesh'} - ${hasirTipi.replace(/[A-Z]+/, '')}${type === 'Q' ? ` (used for ${hasirTipi}/${hasirTipi.replace(/[A-Z]+/, '')} combinations)` : ''}`;

      // Kaydet a database
      try {
        const createResponse = await fetchWithAuth(API_URLS.meshTypeConfigs, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hasirTipi: hasirTipi,
            boyCap: parseFloat(boyCap),
            enCap: parseFloat(enCap),
            boyAralik: parseFloat(boyAralik),
            enAralik: parseFloat(enAralik),
            type: type,
            description: description
          })
        });

        if (createResponse.ok) {
          toast.success(`${hasirTipi} mesh konfigürasyonu başarıyla eklendi!`);
          return true;
        } else {
          toast.error(`${hasirTipi} mesh konfigürasyonu eklenirken hata oluştu.`);
          return false;
        }
      } catch (error) {
        console.error('Error saving mesh config:', error);
        toast.error('Mesh konfigürasyonu kaydedilirken hata oluştu.');
        return false;
      }
    } else {
      return false; // User cancelled or incomplete data
    }
  };

  // Helper function a Kontrol et if hasir tipi exists in mesh_type_configs and prompt için Veri değilse
  const checkAndPromptForMeshConfig = async (hasirTipi) => {
    if (!hasirTipi) return true;

    // Clean the Girdi
    let cleanTipi = hasirTipi.toString().trim().toUpperCase().replace(/\s+/g, '');

    // CRITICAL FIX: İşle Q combinations (Q257/131) ile checking individual base types
    const combinationMatch = cleanTipi.match(/^Q(\d+)\/(\d+)$/);
    if (combinationMatch) {
      const first = combinationMatch[1];
      const second = combinationMatch[2];

      // If same numbers (Q257/257), Kontrol et için single Q257
      if (first === second) {
        const singleType = `Q${first}`;
        try {
          const response = await fetchWithAuth(`${API_URLS.meshTypeConfigs}/${encodeURIComponent(singleType)}`);
          if (response.ok) {
            return true; // Q257 exists, so Q257/257 is valid
          } else {
            // Q257 doesn't exist, prompt için it
            const confirmed = window.confirm(`Hasır tipi "${singleType}" veritabanında bulunamadı. Bu ürünün teknik verilerini girmek ister misiniz?`);
            if (confirmed) {
              return await promptAndSaveMeshConfig(singleType);
            } else {
              return false;
            }
          }
        } catch (error) {
          console.error('Error checking mesh config:', error);
          return false;
        }
      } else {
        // Different numbers (Q257/131), Kontrol et if both Q257 AND Q131 exist
        try {
          const [response1, response2] = await Promise.all([
            fetchWithAuth(`${API_URLS.meshTypeConfigs}/${encodeURIComponent(`Q${first}`)}`),
            fetchWithAuth(`${API_URLS.meshTypeConfigs}/${encodeURIComponent(`Q${second}`)}`)
          ]);

          if (response1.ok && response2.ok) {
            return true; // Both Q257 and Q131 exist, combination is valid
          }

          // Determine which base types are missing and prompt only için those
          const missing = [];
          if (!response1.ok) missing.push(`Q${first}`);
          if (!response2.ok) missing.push(`Q${second}`);

          // Only prompt için the missing base types, not the combination
          for (const missingType of missing) {
            const normalizedMissingType = missingType;
            const confirmed = window.confirm(`Hasır tipi "${normalizedMissingType}" veritabanında bulunamadı. Bu ürünün teknik verilerini girmek ister misiniz?`);
            if (confirmed) {
              const result = await promptAndSaveMeshConfig(normalizedMissingType);
              if (!result) return false;
            } else {
              return false;
            }
          }
          return true;
        } catch (error) {
          console.error('Error checking combination mesh configs:', error);
          return false;
        }
      }
    }

    // için single types (Q257, R257, TR257, etc.), use the existing logic
    const normalizedHasirTipi = normalizeHasirTipiForMeshConfig(hasirTipi);

    try {
      const response = await fetchWithAuth(`${API_URLS.meshTypeConfigs}/${encodeURIComponent(normalizedHasirTipi)}`);

      if (response.ok) {
        // Config exists, return true a continue
        return true;
      } else if (response.status === 404) {
        // Config doesn't exist, Göster Popup a Al Veri
        const confirmed = window.confirm(`Hasır tipi "${normalizedHasirTipi}" veritabanında bulunamadı. Bu ürünün teknik verilerini girmek ister misiniz?`);

        if (confirmed) {
          return await promptAndSaveMeshConfig(normalizedHasirTipi);
        } else {
          return false;
        }
      } else {
        console.warn(`Unexpected response ${response.status} for mesh config ${normalizedHasirTipi}`);
        return true; // Continue even if there's an error
      }
    } catch (error) {
      console.warn('Could not check mesh config from database:', error);
      return true; // Continue even if there's an error
    }
  };

  // Helper function a Çevir decimal point a comma için Excel
  const toExcelDecimal = (value) => {
    if (value === null || value === undefined || value === '') {
      console.warn(`📊 EXCEL DECIMAL - Empty value detected, returning empty string`);
      return '';
    }
    // CRITICAL: Kontrol et için NaN values before converting
    const num = parseFloat(value);
    if (isNaN(num)) {
      console.error(`❌ EXCEL DECIMAL - NaN detected! Input value: "${value}", type: ${typeof value}`);
      return '0,00001'; // Default safe value
    }
    // Çevir a String and replace decimal point ile comma
    const result = String(num).replace('.', ',');
    
    // Log if the Değer seems suspicious (excluding legitimate 0 values)
    if (num < 0 || num > 1000000) {
      console.warn(`⚠️ EXCEL DECIMAL - Suspicious value: ${num} -> "${result}"`);
    }
    
    return result;
  };

  // Helper function a Formatla numbers without trailing zeros için Excel
  const toExcelNumber = (value) => {
    if (value === null || value === undefined || value === '') return '';
    // Çevir a Sayı a Kaldır trailing zeros, then a String, then replace decimal point ile comma
    const num = parseFloat(value);
    if (isNaN(num)) return '0,00001'; // Return default 5 decimal format for NaN values
    // Formatla a 5 decimal places and replace decimal point ile comma
    return String(num.toFixed(5)).replace('.', ',');
  };

  // Extract hasir_tipi den stok_adi Alan
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

      // Sıfırla cancellation flag and Başlangıç progress indicator
      setCancelExcelGeneration(false);
      setIsGeneratingExcel(true);
      setExcelProgress({ current: 0, total: 4, operation: 'Veritabanı analizi yapılıyor...' });

      // CRITICAL FIX: Reuse cached analysis den preSaveConfirmData a avoid inconsistent results
      // If preSaveConfirmData is empty or stale, then perform fresh analysis
      let analysisResult;
      if (preSaveConfirmData && (preSaveConfirmData.newProducts?.length > 0 || preSaveConfirmData.existingProducts?.length > 0)) {
        console.log('KAYNAK PROGRAMI: Reusing cached analysis from preSaveConfirmData');
        analysisResult = {
          existingProducts: preSaveConfirmData.existingProducts || [],
          newProducts: preSaveConfirmData.newProducts || []
        };
      } else {
        console.log('KAYNAK PROGRAMI: No cached analysis found, performing fresh analysis');
        analysisResult = await analyzeProductsForConfirmation();
      }

      // Kontrol et için cancellation
      if (cancelExcelGeneration) {
        console.log('Excel generation cancelled during analysis');
        return;
      }

      // Use the returned result directly instead of relying on State
      const existingProductsData = analysisResult?.existingProducts || [];
      const newProductsData = analysisResult?.newProducts || [];

      console.log('KAYNAK PROGRAMI: Using analysis data:', {
        existingProducts: existingProductsData.length,
        newProducts: newProductsData.length,
        firstExisting: existingProductsData[0] ? {
          hasirTipi: existingProductsData[0].hasirTipi,
          existingStokKodus: existingProductsData[0].existingStokKodus,
          cubukSayisiBoy: existingProductsData[0].cubukSayisiBoy,
          cubukSayisiEn: existingProductsData[0].cubukSayisiEn
        } : null
      });
      
      // Güncelle progress
      setExcelProgress({ current: 1, total: 4, operation: 'Mevcut veriler işleniyor...' });
      
      // OPTIMIZATION: Instead of making hundreds of API calls, use existing savedProducts Veri
      // combined ile fallback calculations için missing cubuk sayisi values
      console.log('KAYNAK PROGRAMI: Using optimized approach with existing data...');
      
      const enhancedProducts = await Promise.all(validProducts.map(async (product) => {
        // Bul matching Stok code den analysis
        let stokKodu = '';

        // Kontrol et existing products first - MUST include wire count matching
        const existingMatch = existingProductsData.find(existing => {
          const hasirTipiMatch = existing.hasirTipi === product.hasirTipi;
          const boyMatch = Math.abs(parseFloat(existing.uzunlukBoy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.1;
          const enMatch = Math.abs(parseFloat(existing.uzunlukEn || 0) - parseFloat(product.uzunlukEn || 0)) < 0.1;
          // CRITICAL FIX: Ekle wire count matching a prevent wrong Ürün selection
          const wireCountBoyMatch = parseInt(existing.cubukSayisiBoy || 0) === parseInt(product.cubukSayisiBoy || 0);
          const wireCountEnMatch = parseInt(existing.cubukSayisiEn || 0) === parseInt(product.cubukSayisiEn || 0);
          return hasirTipiMatch && boyMatch && enMatch && wireCountBoyMatch && wireCountEnMatch;
        });

        if (existingMatch && existingMatch.existingStokKodus && existingMatch.existingStokKodus.length > 0) {
          // Use the first matched Stok code (already filtered ile wire counts in analyzeProductsForConfirmation)
          const sortedCodes = existingMatch.existingStokKodus.sort((a, b) => {
            const numA = parseInt(a.match(/CHOZL(\d+)/)?.[1] || '0');
            const numB = parseInt(b.match(/CHOZL(\d+)/)?.[1] || '0');
            return numB - numA;
          });
          stokKodu = sortedCodes[0];

          console.log(`✅ KAYNAK PROGRAMI MATCH: Found existing product ${stokKodu} for ${product.hasirTipi} with wire counts Boy:${product.cubukSayisiBoy}, En:${product.cubukSayisiEn}`);

          // Dene a Bul saved Ürün Veri için cubuk sayisi values
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
          // Kontrol et new products - also include wire count matching
          const newMatch = newProductsData.find(newProd => {
            const hasirTipiMatch = newProd.hasirTipi === product.hasirTipi;
            const boyMatch = Math.abs(parseFloat(newProd.uzunlukBoy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.1;
            const enMatch = Math.abs(parseFloat(newProd.uzunlukEn || 0) - parseFloat(product.uzunlukEn || 0)) < 0.1;
            // CRITICAL FIX: Ekle wire count matching için new products too
            const wireCountBoyMatch = parseInt(newProd.cubukSayisiBoy || 0) === parseInt(product.cubukSayisiBoy || 0);
            const wireCountEnMatch = parseInt(newProd.cubukSayisiEn || 0) === parseInt(product.cubukSayisiEn || 0);
            return hasirTipiMatch && boyMatch && enMatch && wireCountBoyMatch && wireCountEnMatch;
          });

          if (newMatch && newMatch.newStokKodu) {
            stokKodu = newMatch.newStokKodu;
            console.log(`✅ KAYNAK PROGRAMI MATCH: Using new product code ${stokKodu} for ${product.hasirTipi} with wire counts Boy:${product.cubukSayisiBoy}, En:${product.cubukSayisiEn}`);
          }
        }
        
        // Kontrol et if Excel-mapped cubuk values exist - only use fallback if missing
        const hasExcelCubukValues = (product.cubukSayisiBoy > 0 && product.cubukSayisiEn > 0);
        
        let finalCubukSayisiBoy, finalCubukSayisiEn;
        
        if (hasExcelCubukValues) {
          // Use Excel-mapped values - DO NOT Hesapla fallback
          console.log(`✅ KAYNAK PROGRAMI: Using Excel-mapped cubuk values for ${product.hasirTipi} - Boy:${product.cubukSayisiBoy}, En:${product.cubukSayisiEn}`);
          finalCubukSayisiBoy = product.cubukSayisiBoy;
          finalCubukSayisiEn = product.cubukSayisiEn;
        } else {
          // Only Hesapla fallback if Excel values are missing or Geçersiz
          console.log(`⚠️ KAYNAK PROGRAMI: Missing Excel cubuk values, calculating fallback for ${product.hasirTipi}`);
          const fallbackResult = await calculateFallbackCubukSayisi(
            product.hasirTipi,
            product.uzunlukBoy || 0,
            product.uzunlukEn || 0
          );
          finalCubukSayisiBoy = fallbackResult?.cubukSayisiBoy || 0;
          finalCubukSayisiEn = fallbackResult?.cubukSayisiEn || 0;
        }
        
        return {
          ...product,
          existingStokKodu: stokKodu,
          cubukSayisiBoy: finalCubukSayisiBoy,
          cubukSayisiEn: finalCubukSayisiEn,
          source: hasExcelCubukValues ? 'excel_mapping' : 'fallback_calculation'
        };
      }));
      
      console.log(`KAYNAK PROGRAMI: Enhanced ${enhancedProducts.length} products with optimized data`);
      
      // Kontrol et için cancellation
      if (cancelExcelGeneration) {
        console.log('Excel generation cancelled during data processing');
        return;
      }
      
      // Güncelle progress
      setExcelProgress({ current: 2, total: 4, operation: 'Stok kodları eşleştiriliyor...' });
      
      // CSV structure Başlıklar den your template
      const headers = [
        '', 'Stok kodu', 'FİRMA', 'Stok Kartı', 'HASIR', 'BOY', 'EN', 'HASIR', 'BOY', 'EN', 'Açıklama', 'UZUNLUK', '', 'ÇUBUK SAYISI', '', 'ARA', '', 'HASIR', 'SOL', 'SAĞ', 'ÖN', 'ARKA', 'ADET', 'TOPLAM', ''
      ];
      const subHeaders = [
        '', '', 'ADI', '', 'CİNSİ', '', '', 'SAYISI', 'ÇAP', 'ÇAP', '', 'BOY', 'EN', 'BOY', 'EN', 'BOY', 'EN', 'SAYISI', 'FİLİZ', 'FİLİZ', 'FİLİZ', 'FİLİZ', 'KG.', 'KG.', ''
      ];
      
      // Prepare Veri Dizi
      const data = [headers, subHeaders];
      
      enhancedProducts.forEach((enhancedProduct, index) => {
        // Use the enhanced Ürün Veri directly
        const stokKodu = enhancedProduct.existingStokKodu || '';
        const finalCubukSayisiBoy = enhancedProduct.cubukSayisiBoy || 0;
        const finalCubukSayisiEn = enhancedProduct.cubukSayisiEn || 0;
        
        // Reduced logging: Only log için first few products or zaman there are issues
        if (index < 3 || finalCubukSayisiBoy <= 0 || finalCubukSayisiEn <= 0) {
          console.log(`KAYNAK PROGRAMI: Product ${index + 1} - ${stokKodu} - Boy Cubuk: ${finalCubukSayisiBoy}, En Cubuk: ${finalCubukSayisiEn} (${enhancedProduct.source})`);
        }
        
        // Map et enhanced Ürün Veri a CSV structure
        data.push([
          index + 1, // Row number
          stokKodu, // Stock code from analysis
          '', // FİRMA ADI - empty
          '', // Stok Kartı - empty  
          normalizeHasirTipi(enhancedProduct.hasirTipi || ''), // HASIR CİNSİ
          parseFloat(enhancedProduct.boyCap || 0), // BOY ÇAP
          parseFloat(enhancedProduct.enCap || 0), // EN ÇAP
          parseInt(enhancedProduct.hasirSayisi || 1) || 1, // HASIR SAYISI
          parseFloat(enhancedProduct.boyCap || 0), // BOY ÇAP (repeat)
          parseFloat(enhancedProduct.enCap || 0), // EN ÇAP (repeat)
          '', // Açıklama - empty
          parseInt(enhancedProduct.uzunlukBoy || 0) || 0, // UZUNLUK BOY
          parseInt(enhancedProduct.uzunlukEn || 0) || 0, // UZUNLUK EN
          parseInt(finalCubukSayisiBoy) || 0, // ÇUBUK SAYISI BOY - USE ENHANCED/FALLBACK VALUE
          parseInt(finalCubukSayisiEn) || 0, // ÇUBUK SAYISI EN - USE ENHANCED/FALLBACK VALUE
          parseFloat(enhancedProduct.boyAraligi || enhancedProduct.gozAraligiBoy || 0), // ARA BOY
          parseFloat(enhancedProduct.enAraligi || enhancedProduct.gozAraligiEn || 0), // ARA EN
          parseInt(enhancedProduct.hasirSayisi || 1) || 1, // HASIR SAYISI (repeat)
          parseFloat(enhancedProduct.solFiliz || 0), // SOL FİLİZ
          parseFloat(enhancedProduct.sagFiliz || 0), // SAĞ FİLİZ
          parseFloat(enhancedProduct.onFiliz || 0), // ÖN FİLİZ
          parseFloat(enhancedProduct.arkaFiliz || 0), // ARKA FİLİZ
          parseFloat((enhancedProduct.adetKg || (getCleanKgValue(enhancedProduct) / (parseInt(enhancedProduct.hasirSayisi || 1) || 1)).toFixed(4))) || 0, // ADET KG
          parseFloat(enhancedProduct.toplamKg || enhancedProduct.toplamAgirlik || 0) || 0, // TOPLAM KG
          '' // Empty last column
        ]);
      });
      
      // Kontrol et için cancellation before final Excel generation
      if (cancelExcelGeneration) {
        console.log('Excel generation cancelled before file creation');
        return;
      }
      
      // Güncelle progress
      setExcelProgress({ current: 3, total: 4, operation: 'Excel dosyası oluşturuluyor...' });
      
      // Oluştur workbook using XLSX (same olarak exportToExcel)
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Column widths
      const colWidths = headers.map(h => ({ wch: Math.max(String(h).length, 15) }));
      ws['!cols'] = colWidths;
      
      // Ekle worksheet a workbook
      XLSX.utils.book_append_sheet(wb, ws, "Kaynak Programı");
      
      // Güncelle final progress
      setExcelProgress({ current: 4, total: 4, operation: 'Dosya indiriliyor...' });
      
      // Download olarak Excel (.xlsx) file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      XLSX.writeFile(wb, `Kaynak_Programi_${timestamp}.xlsx`);
      
      console.log('DEBUG: Kaynak Programı Excel created successfully');
      toast.success('Kaynak Programı Excel dosyası oluşturuldu!');
      
    } catch (error) {
      console.error('Error generating Kaynak Programı Excel:', error);
      toast.error('Kaynak Programı Excel oluşturulurken hata oluştu');
    } finally {
      // UNIFIED Modal: Sıfırla all Yükleniyor states a Kapat unified Modal
      setIsGeneratingExcel(false);
      setIsSavingToDatabase(false); // Close unified modal
      setExcelProgress({ current: 0, total: 0, operation: '' });
      setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
    }
  };

  // Excel dosyalarını oluştur
  const generateExcelFiles = useCallback(async (inputProducts, includeAllProducts = false) => {
    try {
      // Continue den database Kaydet progress - don't Sıfırla
      setIsGeneratingExcel(true);
      setDatabaseProgress(prev => ({ ...prev, operation: '📊 Excel dosyaları oluşturuluyor...', currentProduct: 'Veriler hazırlanıyor' }));
      setExcelProgress({ current: 0, total: 4, operation: 'Excel verisi hazırlanıyor...' });

      // CRITICAL FIX: Always ensure we have the correct database-first + fallback values
      let products = inputProducts;
      
      // If we have existing stok codes, Getir fresh Veri den database ile fallback
      const existingStokKodes = inputProducts
        .filter(p => p.existingStokKodu)
        .map(p => p.existingStokKodu);
      
      if (existingStokKodes.length > 0 && !inputProducts.some(p => p.skipDatabaseRefresh)) {
          console.log('Excel generation: Fetching fresh database data with fallback for', existingStokKodes.length, 'products');
          
          try {
          // SIMPLE APPROACH: Direct Getir like working Vercel version
          console.log('Using simple Vercel-style fetch for stok codes:', existingStokKodes);
          const [mmResponse, ncbkResponse, ntelResponse] = await Promise.all([
            fetchWithAuth(`${API_URLS.celikHasirMm}`),
            fetchWithAuth(`${API_URLS.celikHasirNcbk}`),
            fetchWithAuth(`${API_URLS.celikHasirNtel}`)
          ]);

          const [allMM, allNCBK, allNTEL] = await Promise.all([
            mmResponse.ok ? mmResponse.json() : [],
            ncbkResponse.ok ? ncbkResponse.json() : [],
            ntelResponse.ok ? ntelResponse.json() : []
          ]);

          // Filtrele için our products
          const ourMM = allMM.filter(p => existingStokKodes.includes(p.stok_kodu));
          console.log(`Simple fetch found ${ourMM.length} MM products for Excel`);

          // Dönüştür a Excel Formatla EXACTLY like multiselection (lines 1308-1324)
          const freshDatabaseProducts = ourMM.map(product => {
            // Extract hasir_tipi den stok_adi zaman hasir_tipi Alan is incorrect
            let actualHasirTipi = product.hasir_tipi || '';
            if (actualHasirTipi === 'MM' || actualHasirTipi === '') {
              const stokAdiMatch = (product.stok_adi || '').match(/^(Q\d+(?:\/\d+)?|R\d+(?:\/\d+)?|TR\d+(?:\/\d+)?)/i);
              if (stokAdiMatch) {
                actualHasirTipi = stokAdiMatch[1].toUpperCase();
              }
            }
            
            const cleanIngilizceIsim = (product.ingilizce_isim || '').replace(/^Wire Mesh-\s*/, 'Wire Mesh ');

            // Parse et göz aralığı den database if Mevcut, otherwise Hesapla
            const dbGozAraligi = product.goz_araligi || '';
            let boyAraligi, enAraligi, gozAraligi;

            if (dbGozAraligi && dbGozAraligi.includes('x')) {
              // Use database Değer (e.g., "7.5x15", "15x25", "15x7,5")
              const parts = dbGozAraligi.split('x');
              // Replace Turkish comma ile Periyot before parsing
              boyAraligi = parseFloat(parts[0].replace(',', '.')) || calculateGozAraligi(actualHasirTipi, 'boy');
              enAraligi = parseFloat(parts[1].replace(',', '.')) || calculateGozAraligi(actualHasirTipi, 'en');
              // Normalize a Periyot Formatla için Excel
              gozAraligi = `${boyAraligi}x${enAraligi}`;
            } else {
              // Fallback a calculation if database Değer missing
              boyAraligi = calculateGozAraligi(actualHasirTipi, 'boy');
              enAraligi = calculateGozAraligi(actualHasirTipi, 'en');
              gozAraligi = `${boyAraligi}x${enAraligi}`;
            }

            return {
              ...product,
              hasirTipi: actualHasirTipi,
              uzunlukBoy: product.ebat_boy || product.uzunluk_boy || 0,
              uzunlukEn: product.ebat_en || product.uzunluk_en || 0,
              boyCap: product.cap || product.boy_cap || 0,
              enCap: product.cap2 || product.en_cap || 0,
              totalKg: product.kg || product.total_kg || 0,
              adetKg: product.kg || product.adet_kg || 0,
              cubukSayisiBoy: product.cubuk_sayisi_boy || product.ic_cap_boy_cubuk_ad || 0,
              cubukSayisiEn: product.cubuk_sayisi_en || product.dis_cap_en_cubuk_ad || 0,
              boyAraligi: boyAraligi,
              enAraligi: enAraligi,
              gozAraligi: gozAraligi,
              existingStokKodu: product.stok_kodu,
              existingIngilizceIsim: cleanIngilizceIsim,
              isOptimized: true,
              source: 'database',
              skipDatabaseRefresh: true
            };
          });
          
          if (freshDatabaseProducts && freshDatabaseProducts.length > 0) {
            // Use fresh database Veri
            products = freshDatabaseProducts;
            console.log('Excel generation: Using fresh database data');
            console.log('🔧 EXCEL INPUT DEBUG - Products received from database fetch:', products.map(p => ({
              stokKodu: p.existingStokKodu,
              cubukSayisiBoy: p.cubukSayisiBoy,
              cubukSayisiEn: p.cubukSayisiEn,
              hasirTipi: p.hasirTipi,
              source: p.source || 'database'
            })));
          } else {
            throw new Error('No database products returned');
          }
        } catch (error) {
          // Fallback: Only apply fallback formula if Excel values are missing
          console.log('Excel generation: Database fetch failed/timeout, preserving Excel values or calculating fallback:', error.message);
          products = await Promise.all(
            inputProducts.map(async (product) => {
              const hasExcelValues = (product.cubukSayisiBoy > 0 && product.cubukSayisiEn > 0);
              
              if (hasExcelValues) {
                console.log(`✅ Preserving Excel values for ${product.hasirTipi}: Boy:${product.cubukSayisiBoy}, En:${product.cubukSayisiEn}`);
                return {
                  ...product,
                  source: 'excel-preserved'
                };
              } else {
                console.log(`⚠️ Missing Excel values, calculating fallback for ${product.hasirTipi}`);
                const fallbackResult = await calculateFallbackCubukSayisi(
                  product.hasirTipi,
                  parseFloat(product.uzunlukBoy || 0),
                  parseFloat(product.uzunlukEn || 0)
                );
                return {
                  ...product,
                  cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                  cubukSayisiEn: fallbackResult.cubukSayisiEn,
                  source: 'fallback-timeout'
                };
              }
            })
          );
        }
      } else if (inputProducts.some(p => p.skipDatabaseRefresh)) {
        // Skip database refresh - use Girdi products olarak-is
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
        // No existing products - preserve Excel values or apply fallback formula
        console.log('Excel generation: No existing products, preserving Excel values or calculating fallback');
        products = await Promise.all(
          inputProducts.map(async (product) => {
            const hasExcelValues = (product.cubukSayisiBoy > 0 && product.cubukSayisiEn > 0);
            
            if (hasExcelValues) {
              console.log(`✅ Preserving Excel values for ${product.hasirTipi}: Boy:${product.cubukSayisiBoy}, En:${product.cubukSayisiEn}`);
              return {
                ...product,
                source: 'excel-preserved'
              };
            } else {
              console.log(`⚠️ Missing Excel values, calculating fallback for ${product.hasirTipi}`);
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
            }
          })
        );
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      
      // 1. Stok Kartı Excel
      console.log('DEBUG: Starting Stok Kartı Excel generation with corrected data...');
      setExcelProgress({ current: 1, total: 2, operation: 'Stok Kartı Excel oluşturuluyor...' });
      await generateStokKartiExcel(products, timestamp, includeAllProducts);
      console.log('DEBUG: Stok Kartı Excel completed');
      
      // 2. Merged Reçete Excel (combines main recete + alternatif recete into 12 sheets)
      console.log('DEBUG: Starting Merged Reçete Excel generation...');
      setExcelProgress({ current: 2, total: 2, operation: 'Reçete Excel oluşturuluyor...' });
      await generateMergedReceteExcel(products, timestamp, includeAllProducts);
      console.log('DEBUG: Merged Reçete Excel completed');

      // Göster Başarılı Mesaj için Excel generation only (saving messages handled ile caller)
      const productCount = products ? products.length : 0;
      toast.success(`✅ ${productCount} ürün için Excel dosyaları oluşturuldu!`);
      
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast.error('Excel dosyaları oluşturulurken hata oluştu');
    } finally {
      // UNIFIED Modal: Tamamlandı cleanup of all Yükleniyor states
      setIsGeneratingExcel(false);
      setIsSavingToDatabase(false); // Close unified modal
      setIsLoading(false);
      setExcelProgress({ current: 0, total: 0, operation: '' });
      setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });

      console.log('✅ UNIFIED MODAL: Excel generation process finished - modal closed');
    }
  }, []);

  // Bulk Excel generation - download entire database and İşlem locally
  const generateBulkExcelFromDatabase = useCallback(async () => {
    try {
      setIsGeneratingExcel(true);
      setExcelProgress({ current: 0, total: 7, operation: 'Toplu veritabanı indirme başlıyor...' });

      console.log('🚀 BULK EXCEL: Starting bulk database download using unified fetch approach...');

      // 1. Al all Ürün Stok codes first - ile explicit high limit a ensure we Al all records
      setExcelProgress({ current: 1, total: 7, operation: 'Ürün kodları alınıyor...' });

      const [mmResponse, ncbkResponse, ntelResponse] = await Promise.all([
        fetch(`${API_URLS.getAllMM}?limit=50000`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllNCBK}?limit=50000`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllNTEL}?limit=50000`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [allMMProducts, allNCBKProducts, allNTELProducts] = await Promise.all([
        mmResponse.json(),
        ncbkResponse.json(),
        ntelResponse.json()
      ]);

      console.log(`🚀 BULK EXCEL: Found MM(${allMMProducts.length}), NCBK(${allNCBKProducts?.length || 0}), NTEL(${allNTELProducts?.length || 0}) products`);

      // 2. Getir all Reçete Veri - ile explicit high limit a ensure we Al all records
      setExcelProgress({ current: 2, total: 7, operation: 'Reçete verileri alınıyor...' });

      const [mmReceteResponse, ncbkReceteResponse, ntelReceteResponse] = await Promise.all([
        fetch(`${API_URLS.getAllMMRecetes}?limit=50000`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllNCBKRecetes}?limit=50000`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllNTELRecetes}?limit=50000`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [allMMRecetes, allNCBKRecetes, allNTELRecetes] = await Promise.all([
        mmReceteResponse.json(),
        ncbkReceteResponse.json(),
        ntelReceteResponse.json()
      ]);

      console.log(`🚀 BULK EXCEL: Found MM Recipes(${allMMRecetes?.length || 0}), NCBK Recipes(${allNCBKRecetes?.length || 0}), NTEL Recipes(${allNTELRecetes?.length || 0})`);

      // 3. İşlem MM products ile Reçete Veri
      setExcelProgress({ current: 3, total: 8, operation: 'MM ürünleri formatlanıyor...' });
      
      // İşlem MM products and enhance ile Reçete Veri
      const processedProducts = allMMProducts.map(product => {
        // Bul Reçete Veri için this Ürün
        const productRecipes = (allMMRecetes || []).filter(r => r.mamul_kodu === product.stok_kodu);
        
        // Extract YOTOCH Süre den recipes
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
        
        // Extract actual hasir_tipi den stok_adi if hasir_tipi is missing or 'MM'
        const extractedHasirTipi = extractHasirTipiFromStokAdi(product.stok_adi) || product.hasir_tipi || 'MM';
        
        // Parse et göz aralığı den database if Mevcut, otherwise Hesapla
        const dbGozAraligi = product.goz_araligi || '';
        let boyAraligi, enAraligi, gozAraligi;

        if (dbGozAraligi && dbGozAraligi.includes('x')) {
          // Use database Değer (e.g., "7.5x15", "15x25", "15x7,5")
          const parts = dbGozAraligi.split('x');
          // Replace Turkish comma ile Periyot before parsing
          boyAraligi = parseFloat(parts[0].replace(',', '.')) || calculateGozAraligi(extractedHasirTipi, 'boy');
          enAraligi = parseFloat(parts[1].replace(',', '.')) || calculateGozAraligi(extractedHasirTipi, 'en');
          // Normalize a Periyot Formatla için Excel
          gozAraligi = `${boyAraligi}x${enAraligi}`;
        } else {
          // Fallback a calculation if database Değer missing
          boyAraligi = calculateGozAraligi(extractedHasirTipi, 'boy');
          enAraligi = calculateGozAraligi(extractedHasirTipi, 'en');
          gozAraligi = `${boyAraligi}x${enAraligi}`;
        }

        return {
          ...product,
          existingStokKodu: product.stok_kodu,
          // Don't use existingIngilizceIsim - let generateIngilizceIsim Oluştur it fresh
          hasirTipi: extractedHasirTipi,
          uzunlukBoy: product.ebat_boy?.toString() || '0',
          uzunlukEn: product.ebat_en?.toString() || '0',
          // FIXED: Normalize comma separators a periods için decimal values
          boyCap: (product.cap?.toString() || '0').replace(',', '.'),
          enCap: (product.cap2?.toString() || '0').replace(',', '.'),
          totalKg: product.kg?.toString() || '0',
          adetKg: product.kg?.toString() || '0',
          // Use Reçete Veri if Mevcut, otherwise use database values (Kontrol et both old and new columns)
          cubukSayisiBoy: boyCubukSayisi || product.cubuk_sayisi_boy || product.ic_cap_boy_cubuk_ad,
          cubukSayisiEn: enCubukSayisi || product.cubuk_sayisi_en || product.dis_cap_en_cubuk_ad,
          ic_cap_boy_cubuk_ad: boyCubukSayisi || product.cubuk_sayisi_boy || product.ic_cap_boy_cubuk_ad,
          dis_cap_en_cubuk_ad: enCubukSayisi || product.cubuk_sayisi_en || product.dis_cap_en_cubuk_ad,
          boyAraligi: boyAraligi,
          enAraligi: enAraligi,
          gozAraligi: gozAraligi,
          yotochDuration: yotochDuration,
          recipeData: productRecipes,
          source: 'database',
          productType: 'MM',
          // Preserve stok_adi den database
          stok_adi: product.stok_adi
        };
      });

      setExcelProgress({ current: 4, total: 8, operation: 'NCBK ürünleri formatlanıyor...' });
      
      const processedNCBKProducts = (allNCBKProducts || []).map(dbProduct => {
        // Parse et göz aralığı den database if Mevcut, otherwise Hesapla
        const dbGozAraligi = dbProduct.goz_araligi || '';
        let boyAraligi, enAraligi, gozAraligi;

        if (dbGozAraligi && dbGozAraligi.includes('x')) {
          // Use database Değer (e.g., "7.5x15", "15x25", "15x7,5")
          const parts = dbGozAraligi.split('x');
          // Replace Turkish comma ile Periyot before parsing
          boyAraligi = parseFloat(parts[0].replace(',', '.')) || calculateGozAraligi(dbProduct.hasir_tipi || 'NCBK', 'boy');
          enAraligi = parseFloat(parts[1].replace(',', '.')) || calculateGozAraligi(dbProduct.hasir_tipi || 'NCBK', 'en');
          // Normalize a Periyot Formatla için Excel
          gozAraligi = `${boyAraligi}x${enAraligi}`;
        } else {
          // Fallback a calculation if database Değer missing
          boyAraligi = calculateGozAraligi(dbProduct.hasir_tipi || 'NCBK', 'boy');
          enAraligi = calculateGozAraligi(dbProduct.hasir_tipi || 'NCBK', 'en');
          gozAraligi = `${boyAraligi}x${enAraligi}`;
        }

        return {
          existingStokKodu: dbProduct.stok_kodu,
          // Don't use existingIngilizceIsim - let generateIngilizceIsim Oluştur it fresh
          hasirTipi: dbProduct.hasir_tipi || 'NCBK',
          uzunlukBoy: dbProduct.ebat_boy?.toString() || '0',
          uzunlukEn: dbProduct.ebat_en?.toString() || '0',
          // FIXED: Normalize comma separators a periods için decimal values
          boyCap: (dbProduct.cap?.toString() || '0').replace(',', '.'),
          enCap: (dbProduct.cap2?.toString() || '0').replace(',', '.'),
          totalKg: dbProduct.kg?.toString() || '0',
          adetKg: dbProduct.kg?.toString() || '0',
          cubukSayisiBoy: dbProduct.cubuk_sayisi_boy || dbProduct.ic_cap_boy_cubuk_ad,
          cubukSayisiEn: dbProduct.cubuk_sayisi_en || dbProduct.dis_cap_en_cubuk_ad,
          ic_cap_boy_cubuk_ad: dbProduct.cubuk_sayisi_boy || dbProduct.ic_cap_boy_cubuk_ad,
          dis_cap_en_cubuk_ad: dbProduct.cubuk_sayisi_en || dbProduct.dis_cap_en_cubuk_ad,
          boyAraligi: boyAraligi,
          enAraligi: enAraligi,
          gozAraligi: gozAraligi,
          source: 'database',
          productType: 'NCBK',
          ...dbProduct
        };
      });

      setExcelProgress({ current: 5, total: 8, operation: 'NTEL ürünleri formatlanıyor...' });
      
      const processedNTELProducts = (allNTELProducts || []).map(dbProduct => {
        // Parse et göz aralığı den database if Mevcut, otherwise Hesapla
        const dbGozAraligi = dbProduct.goz_araligi || '';
        let boyAraligi, enAraligi, gozAraligi;

        if (dbGozAraligi && dbGozAraligi.includes('x')) {
          // Use database Değer (e.g., "7.5x15", "15x25", "15x7,5")
          const parts = dbGozAraligi.split('x');
          // Replace Turkish comma ile Periyot before parsing
          boyAraligi = parseFloat(parts[0].replace(',', '.')) || calculateGozAraligi(dbProduct.hasir_tipi || 'NTEL', 'boy');
          enAraligi = parseFloat(parts[1].replace(',', '.')) || calculateGozAraligi(dbProduct.hasir_tipi || 'NTEL', 'en');
          // Normalize a Periyot Formatla için Excel
          gozAraligi = `${boyAraligi}x${enAraligi}`;
        } else {
          // Fallback a calculation if database Değer missing
          boyAraligi = calculateGozAraligi(dbProduct.hasir_tipi || 'NTEL', 'boy');
          enAraligi = calculateGozAraligi(dbProduct.hasir_tipi || 'NTEL', 'en');
          gozAraligi = `${boyAraligi}x${enAraligi}`;
        }

        return {
          existingStokKodu: dbProduct.stok_kodu,
          // Don't use existingIngilizceIsim - let generateIngilizceIsim Oluştur it fresh
          hasirTipi: dbProduct.hasir_tipi || 'NTEL',
          uzunlukBoy: dbProduct.ebat_boy?.toString() || '0',
          uzunlukEn: dbProduct.ebat_en?.toString() || '0',
          // FIXED: Normalize comma separators a periods için decimal values
          boyCap: (dbProduct.cap?.toString() || '0').replace(',', '.'),
          enCap: (dbProduct.cap2?.toString() || '0').replace(',', '.'),
          totalKg: dbProduct.kg?.toString() || '0',
          adetKg: dbProduct.kg?.toString() || '0',
          cubukSayisiBoy: dbProduct.cubuk_sayisi_boy || dbProduct.ic_cap_boy_cubuk_ad,
          cubukSayisiEn: dbProduct.cubuk_sayisi_en || dbProduct.dis_cap_en_cubuk_ad,
          ic_cap_boy_cubuk_ad: dbProduct.cubuk_sayisi_boy || dbProduct.ic_cap_boy_cubuk_ad,
          dis_cap_en_cubuk_ad: dbProduct.cubuk_sayisi_en || dbProduct.dis_cap_en_cubuk_ad,
          boyAraligi: boyAraligi,
          enAraligi: enAraligi,
          gozAraligi: gozAraligi,
          source: 'database',
          productType: 'NTEL',
          ...dbProduct
        };
      });

      // Combine all products için Excel generation
      const allProcessedProducts = [...processedProducts, ...processedNCBKProducts, ...processedNTELProducts];
      console.log(`🚀 BULK EXCEL: Total processed products: ${allProcessedProducts.length}`);
      console.log('🚀 BULK EXCEL: Sample MM product:', processedProducts[0]);
      console.log('🚀 BULK EXCEL: Sample NCBK product:', processedNCBKProducts[0]);

      // 4. Oluştur Reçete lookup maps için fast access
      setExcelProgress({ current: 6, total: 8, operation: 'Reçete verileri indeksleniyor...' });
      
      const receteLookup = {
        MM: new Map(),
        NCBK: new Map(),
        NTEL: new Map()
      };

      // Index all recipes ile mamul_kodu için fast lookup
      (allMMRecetes || []).forEach(recipe => {
        const key = recipe.mamul_kodu;
        if (!receteLookup.MM.has(key)) {
          receteLookup.MM.set(key, []);
        }
        receteLookup.MM.get(key).push(recipe);
      });

      (allNCBKRecetes || []).forEach(recipe => {
        const key = recipe.mamul_kodu;
        if (!receteLookup.NCBK.has(key)) {
          receteLookup.NCBK.set(key, []);
        }
        receteLookup.NCBK.get(key).push(recipe);
      });

      (allNTELRecetes || []).forEach(recipe => {
        const key = recipe.mamul_kodu;
        if (!receteLookup.NTEL.has(key)) {
          receteLookup.NTEL.set(key, []);
        }
        receteLookup.NTEL.get(key).push(recipe);
      });

      console.log(`🚀 BULK EXCEL: Indexed recipes - MM(${receteLookup.MM.size}), NCBK(${receteLookup.NCBK.size}), NTEL(${receteLookup.NTEL.size}) unique products`);

      // 5. Generate Excel files ile the bulk Veri and recipes
      setExcelProgress({ current: 7, total: 8, operation: 'Excel dosyaları oluşturuluyor...' });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      
      // Başlat batch sequence
      await initializeBatchSequence();
      
      // Generate Excel files ile Reçete Veri
      await generateBulkStokKartiExcel(allProcessedProducts, timestamp);
      await generateBulkMergedReceteExcel(allProcessedProducts, receteLookup, timestamp, allNCBKProducts, allNTELProducts);
      
      setExcelProgress({ current: 7, total: 7, operation: 'Tamamlandı!' });
      
      toast.success(`Toplu Excel oluşturma tamamlandı! ${allProcessedProducts.length} ürün işlendi.`);
      console.log(`🚀 BULK EXCEL: Successfully generated Excel files for ${allProcessedProducts.length} products`);
      
    } catch (error) {
      console.error('🚀 BULK EXCEL ERROR:', error);
      toast.error('Toplu Excel oluşturma sırasında hata oluştu: ' + error.message);
    } finally {
      // UNIFIED Modal: Sıfırla all states a Kapat unified Modal
      setIsGeneratingExcel(false);
      setIsSavingToDatabase(false); // Close unified modal
      setExcelProgress({ current: 0, total: 0, operation: '' });
      setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
    }
  }, []);

  // Helper function a Hesapla göz aralığı den mesh Tip
  const calculateGozAraligi = (hasirTipi, direction) => {
    // Use the same mesh configurations den the correct_iyilestir_with_configs.js
    const MESH_CONFIGS = {
      // R types - den database: boy_aralik: 15.00, en_aralik: 25.00
      'R106': { boyAralik: 15, enAralik: 25 },
      'R131': { boyAralik: 15, enAralik: 25 },
      'R158': { boyAralik: 15, enAralik: 25 },
      'R188': { boyAralik: 15, enAralik: 25 },
      'R221': { boyAralik: 15, enAralik: 25 },
      'R257': { boyAralik: 15, enAralik: 25 },
      'R295': { boyAralik: 15, enAralik: 25 },
      'R317': { boyAralik: 15, enAralik: 25 },
      'R335': { boyAralik: 15, enAralik: 25 },
      'R377': { boyAralik: 15, enAralik: 25 },
      'R378': { boyAralik: 15, enAralik: 25 },
      'R389': { boyAralik: 15, enAralik: 25 },
      'R423': { boyAralik: 15, enAralik: 25 },
      'R424': { boyAralik: 15, enAralik: 25 },
      'R442': { boyAralik: 15, enAralik: 25 },
      'R443': { boyAralik: 15, enAralik: 25 },
      'R473': { boyAralik: 15, enAralik: 25 },
      'R513': { boyAralik: 15, enAralik: 25 },
      'R524': { boyAralik: 15, enAralik: 25 },
      'R577': { boyAralik: 15, enAralik: 25 },
      'R588': { boyAralik: 15, enAralik: 25 },
      'R589': { boyAralik: 15, enAralik: 25 },
      'R634': { boyAralik: 15, enAralik: 25 },
      'R754': { boyAralik: 15, enAralik: 25 },
      
      // TR types - den database: boy_aralik: 30.00, en_aralik: 15.00
      'TR106': { boyAralik: 30, enAralik: 15 },
      'TR131': { boyAralik: 30, enAralik: 15 },
      'TR158': { boyAralik: 30, enAralik: 15 },
      'TR188': { boyAralik: 30, enAralik: 15 },
      'TR221': { boyAralik: 30, enAralik: 15 },
      'TR257': { boyAralik: 30, enAralik: 15 },
      'TR295': { boyAralik: 30, enAralik: 15 },
      'TR317': { boyAralik: 30, enAralik: 15 },
      'TR335': { boyAralik: 30, enAralik: 15 },
      'TR377': { boyAralik: 30, enAralik: 15 },
      'TR378': { boyAralik: 30, enAralik: 15 },
      'TR389': { boyAralik: 30, enAralik: 15 },
      'TR423': { boyAralik: 30, enAralik: 15 },
      'TR424': { boyAralik: 30, enAralik: 15 },
      'TR442': { boyAralik: 30, enAralik: 15 },
      'TR443': { boyAralik: 30, enAralik: 15 },
      'TR473': { boyAralik: 30, enAralik: 15 },
      'TR513': { boyAralik: 30, enAralik: 15 },
      'TR524': { boyAralik: 30, enAralik: 15 },
      'TR577': { boyAralik: 30, enAralik: 15 },
      'TR588': { boyAralik: 30, enAralik: 15 },
      'TR589': { boyAralik: 30, enAralik: 15 },
      'TR634': { boyAralik: 30, enAralik: 15 },
      'TR754': { boyAralik: 30, enAralik: 15 },
      
      // Q types - den database: boy_aralik: 15.00, en_aralik: 15.00
      'Q106': { boyAralik: 15, enAralik: 15 },
      'Q131': { boyAralik: 15, enAralik: 15 },
      'Q158': { boyAralik: 15, enAralik: 15 },
      'Q188': { boyAralik: 15, enAralik: 15 },
      'Q221': { boyAralik: 15, enAralik: 15 },
      'Q257': { boyAralik: 15, enAralik: 15 },
      'Q295': { boyAralik: 15, enAralik: 15 },
      'Q317': { boyAralik: 15, enAralik: 15 },
      'Q335': { boyAralik: 15, enAralik: 15 },
      'Q377': { boyAralik: 15, enAralik: 15 },
      'Q378': { boyAralik: 15, enAralik: 15 },
      'Q389': { boyAralik: 15, enAralik: 15 },
      'Q423': { boyAralik: 15, enAralik: 15 },
      'Q424': { boyAralik: 15, enAralik: 15 },
      'Q442': { boyAralik: 15, enAralik: 15 },
      'Q443': { boyAralik: 15, enAralik: 15 },
      'Q473': { boyAralik: 15, enAralik: 15 },
      'Q513': { boyAralik: 15, enAralik: 15 },
      'Q524': { boyAralik: 15, enAralik: 15 },
      'Q577': { boyAralik: 15, enAralik: 15 },
      'Q588': { boyAralik: 15, enAralik: 15 },
      'Q589': { boyAralik: 15, enAralik: 15 },
      'Q634': { boyAralik: 15, enAralik: 15 },
      'Q754': { boyAralik: 15, enAralik: 15 },
    };
    
    // İşle Q combinations like Q257/257
    let configKey = hasirTipi;
    if (hasirTipi.includes('/')) {
      configKey = hasirTipi.split('/')[0];
    }
    
    const config = MESH_CONFIGS[configKey] || { boyAralik: 15, enAralik: 15 };
    return direction === 'boy' ? config.boyAralik : config.enAralik;
  };

  // Stok Kartı Excel oluştur
  const generateStokKartiExcel = async (products, timestamp, includeAllProducts) => {
    // Başlat batch sequence before any stok kodu generation
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
      // Extra columns den our app Formatla (not in CSV template)
      'Türü', 'Mamul Grup', 'Girişlerde Seri Numarası Takibi Yapılsın',
      'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    chSheet.addRow(chHeaders);

    // CH ürünlerini ekle
    let excelBatchIndex = 0;
    products.forEach(product => {
      // için Excel generation, İşlem all products regardless of optimization Durum
        // için saved products, use existing Stok Kodu; için new products, generate new one
        console.log('📊 EXCEL STOK KODU DEBUG - Product:', product.hasirTipi, 'existingStokKodu:', product.existingStokKodu);
        // STRICT: Only use saved Stok codes, no fallback a generation
        const stokKodu = product.existingStokKodu;
        if (!stokKodu) {
          console.error('❌ CRITICAL: Missing existingStokKodu for product:', product.hasirTipi);
          throw new Error(`Missing existingStokKodu for product ${product.hasirTipi}`);
        }
        console.log('📊 EXCEL STOK KODU - Using saved stock code:', stokKodu);
        const stokAdi = generateStokAdi(product, 'CH');
        // Always generate fresh İngilizce İsim a ensure correct Formatla
        const ingilizceIsim = generateIngilizceIsim(product, 'CH');
        const gozAraligi = formatGozAraligi(product);
        excelBatchIndex++;
        
        const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                           (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25');
        
        // 🔧 CRITICAL FIX: Ensure we use database columns OR fallback values correctly
        const finalCubukSayisiBoy = product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0;
        const finalCubukSayisiEn = product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0;
        
        // Reduced logging için performance - only log first 3 products or problematic ones
        if (excelBatchIndex < 3 || finalCubukSayisiBoy <= 0 || finalCubukSayisiEn <= 0) {
          console.log(`📊 EXCEL DEBUG [${excelBatchIndex+1}] - Product ${stokKodu}:`, {
            finalCubukSayisiBoy, finalCubukSayisiEn, hasirTipi: product.hasirTipi
          });
        }
        
        // Define Excel cubuk values ile NaN protection
        const excelCubukBoy = parseInt(finalCubukSayisiBoy) || 0;
        const excelCubukEn = parseInt(finalCubukSayisiEn) || 0;
        
        // Kontrol et için zero values that might indicate issues (reduced logging)
        if (excelCubukBoy <= 0 || excelCubukEn <= 0) {
          console.warn(`⚠️ Zero cubuk values for ${stokKodu}: Boy=${excelCubukBoy}, En=${excelCubukEn}`);
        }
        
        chSheet.addRow([
          // 1-7: Basic info (Stok Kodu, Stok Adı, Grup Kodu, Grup İsmi, Kod-1, Kod-2, İngilizce İsim)
          stokKodu, stokAdi, 'MM', '', 'HSR', isStandard ? 'STD' : 'OZL', ingilizceIsim,
          // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
          '20', '20', '31', '36',
          // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
          'KG', 'AD', '1', toExcelDecimal(getCleanKgValue(product).toFixed(5)), '',
          // 17-20: More conversions (Ölçü Br-3, Çevrim Pay-2, Çevrim Payda-2, Çevrim Değeri-2)
          '', '1', '1', '1',
          // 21-27: Ürün specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
          product.hasirTipi, toExcelDecimal(parseFloat(product.boyCap || 0)), toExcelDecimal(parseFloat(product.enCap || 0)), 
          parseInt(product.uzunlukBoy || 0), parseInt(product.uzunlukEn || 0), gozAraligi, toExcelDecimal(getCleanKgValue(product).toFixed(5)),
          // 🔧 CRITICAL FIX: Use the final calculated values (database OR fallback)
          excelCubukBoy, excelCubukEn, '0', '0', '0', '', '', '',
          // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
          '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
          // 46-55: Stok and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
          '0', '0', '', '0', '0', '0', '0', '0', '0', 'D',
          // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
          '', '', '', '', '', 'H', 'H', '', '', '',
          // 66-69: Extra columns den our app Formatla (not in CSV template)
          stokKodu, 'MM', 'E', 'E'
        ]);
    });

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
      // Extra columns den our app Formatla (not in CSV template)
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
      // Extra columns den our app Formatla (not in CSV template)
      'Türü', 'Mamul Grup', 'Girişlerde Seri Numarası Takibi Yapılsın',
      'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    ntelSheet.addRow(ntelHeaders);

    // Oluştur correct NCBK ve NTEL ürünleri based on CH Ürün requirements
    const uniqueNCBKProducts = new Set();
    const uniqueNTELProducts = new Set();
    
    products.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      
      // CORRECT MAPPING: için each CH Ürün, Oluştur NCBK based on direction-specific requirements
      // Boy direction uses boyCap ile actual uzunlukBoy Uzunluk
      if (boyCap > 0) {
        const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        if (!uniqueNCBKProducts.has(boyKey)) {
          uniqueNCBKProducts.add(boyKey);
          
          const stokKodu = `YM.NCBK.${safeCapToCode(boyCap)}.${uzunlukBoy}`;
          const stokAdi = `YM Nervürlü Çubuk ${formatDecimalForDisplay(boyCap, true)} mm ${uzunlukBoy} cm`;
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
            // 21-27: Ürün specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
            '', toExcelDecimal(parseFloat(boyCap)), '', uzunlukBoy, '', '', toExcelDecimal(parseFloat(ncbkWeight).toFixed(5)),
            // 28-35: Counts and custom fields (İç Çap/Boy Çubuk AD, Dış Çap/En Çubuk AD, Özel Saha 2-4 Say, Özel Saha 1-3 Alf)
            '0', '0', '0', '0', '0', '', '', '',
            // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
            '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
            // 46-55: Stok and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
            '0', '0', '', '0', '0', '0', '0', '0', '0', 'H',
            // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
            '', '', '', '', '', 'H', 'E', '', '', '',
            // 66-69: Extra columns den our app Formatla (not in CSV template)
            stokKodu, 'NCBK', 'E', 'E'
          ]);
        }
        
        // Oluştur NTEL için boyCap
        const boyNtelKey = boyCap.toString();
        if (!uniqueNTELProducts.has(boyNtelKey)) {
          uniqueNTELProducts.add(boyNtelKey);
          
          const ntelStokKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
          const ntelStokAdi = `YM Nervürlü Tel ${boyCap} mm`;
          const ntelIngilizceIsim = generateIngilizceIsim({cap: boyCap}, 'NTEL');
          const ntelWeight = (Math.PI * (boyCap/20) * (boyCap/20) * 100 * 7.85 / 1000).toFixed(5);
          
          ntelSheet.addRow([
            ntelStokKodu, ntelStokAdi, 'YM', 'YARI MAMÜL', 'NTEL', '', ntelIngilizceIsim,
            '20', '20', '20', '35',
            'MT', 'KG', '1', toExcelDecimal(ntelWeight), '',
            '', '1', '1', '1',
            '', toExcelDecimal(parseFloat(boyCap)), '',
            '0', '0', '', toExcelDecimal(ntelWeight),
            '0', '0', '0', '0', '0', '', '', '',
            '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
            '0', '0', '', '0', '0', '0', '0', '0', '0', 'H',
            '', '', '', '', '', 'H', 'E', '', '', '',
            ntelStokKodu, 'NTEL', 'E', 'E'
          ]);
        }
      }
      
      // En direction uses enCap ile actual uzunlukEn Uzunluk
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;
        if (!uniqueNCBKProducts.has(enKey)) {
          uniqueNCBKProducts.add(enKey);
          
          const stokKodu = `YM.NCBK.${safeCapToCode(enCap)}.${uzunlukEn}`;
          const stokAdi = `YM Nervürlü Çubuk ${formatDecimalForDisplay(enCap, true)} mm ${uzunlukEn} cm`;
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
            // 21-27: Ürün specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
            '', toExcelDecimal(parseFloat(enCap)), '', uzunlukEn, '', '', toExcelDecimal(parseFloat(ncbkWeight).toFixed(5)),
            // 28-35: Counts and custom fields (İç Çap/Boy Çubuk AD, Dış Çap/En Çubuk AD, Özel Saha 2-4 Say, Özel Saha 1-3 Alf)
            '0', '0', '0', '0', '0', '', '', '',
            // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
            '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
            // 46-55: Stok and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
            '0', '0', '', '0', '0', '0', '0', '0', '0', 'H',
            // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
            '', '', '', '', '', 'H', 'E', '', '', '',
            // 66-69: Extra columns den our app Formatla (not in CSV template)
            stokKodu, 'NCBK', 'E', 'E'
          ]);
        }
        
        // Oluştur NTEL için enCap if different den boyCap
        if (enCap !== boyCap) {
          const enNtelKey = enCap.toString();
          if (!uniqueNTELProducts.has(enNtelKey)) {
            uniqueNTELProducts.add(enNtelKey);
            
            const ntelStokKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
            const ntelStokAdi = `YM Nervürlü Tel ${enCap} mm`;
            const ntelIngilizceIsim = generateIngilizceIsim({cap: enCap}, 'NTEL');
            const ntelWeight = (Math.PI * (enCap/20) * (enCap/20) * 100 * 7.85 / 1000).toFixed(5);
            
            ntelSheet.addRow([
              ntelStokKodu, ntelStokAdi, 'YM', 'YARI MAMÜL', 'NTEL', '', ntelIngilizceIsim,
              '20', '20', '20', '35',
              'MT', 'KG', '1', toExcelDecimal(parseFloat(ntelWeight).toFixed(5)), '',
              '', '1', '1', '1',
              '', toExcelDecimal(parseFloat(enCap)), '',
              '0', '0', '', toExcelDecimal(parseFloat(ntelWeight).toFixed(5)),
              '0', '0', '0', '0', '0', '', '', '',
              '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
              '0', '0', '', '0', '0', '0', '0', '0', '0', 'H',
              '', '', '', '', '', 'H', 'E', '', '', '',
              ntelStokKodu, 'NTEL', 'E', 'E'
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
    // Başlat batch sequence before any stok kodu generation
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

    // Reçete verilerini ekle
    let receteBatchIndex = 0;
    products.forEach(product => {
      // için Excel generation, İşlem all products regardless of optimization Durum
        console.log('🔧 RECIPE STOK KODU DEBUG - Product:', product.hasirTipi, 'existingStokKodu:', product.existingStokKodu);
        // STRICT: Only use saved Stok codes, no fallback a generation
        const chStokKodu = product.existingStokKodu;
        if (!chStokKodu) {
          console.error('❌ CRITICAL: Missing existingStokKodu for recipe product:', product.hasirTipi);
          throw new Error(`Missing existingStokKodu for recipe product ${product.hasirTipi}`);
        }
        console.log('🔧 RECIPE STOK KODU - Using saved stock code:', chStokKodu);
        receteBatchIndex++;
        
        // CH Reçete - Boy ve En çubuk tüketimleri
        // Determine mesh Tip pattern için quantities
        const isQType = product.hasirTipi && product.hasirTipi.includes('Q');
        const isRType = product.hasirTipi && product.hasirTipi.includes('R');
        
        // 🔧 CRITICAL FIX: Use already-calculated fallback/database cubuk values instead of recalculating
        // These values have already been processed through fallback formula and database Getir
        const enCubukMiktar = parseInt(product.cubukSayisiEn) || parseInt(product.dis_cap_en_cubuk_ad) || 0;
        const boyCubukMiktar = parseInt(product.cubukSayisiBoy) || parseInt(product.ic_cap_boy_cubuk_ad) || 0;
        
        console.log(`🔧 RECIPE GENERATION - Product ${chStokKodu}:`);
        console.log('  Using cubuk values - enCubukMiktar:', enCubukMiktar, 'boyCubukMiktar:', boyCubukMiktar);
        console.log('  Source: cubukSayisiEn:', product.cubukSayisiEn, 'cubukSayisiBoy:', product.cubukSayisiBoy);
        // Hesapla YOTOCH operation Zaman using our formula
        const operationTime = toExcelNumber(calculateOperationDuration('YOTOCH', product));
        
        // EN ÇUBUĞU (actual en Uzunluk)
        chReceteSheet.addRow([
          chStokKodu, '1', '', '', '2', '1', 'Bileşen',
          `YM.NCBK.${safeCapToCode(product.enCap)}.${Math.round(parseFloat(product.uzunlukEn || 0) || 0)}`,
          '', enCubukMiktar, 'EN ÇUBUĞU ', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        
        // BOY ÇUBUĞU (actual boy Uzunluk)
        chReceteSheet.addRow([
          chStokKodu, '1', '', '', '2', '2', 'Bileşen',
          `YM.NCBK.${safeCapToCode(product.boyCap)}.${Math.round(parseFloat(product.uzunlukBoy || 0) || 0)}`,
          '', boyCubukMiktar, 'BOY ÇUBUĞU', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        
        // YOTOCH Operasyon
        chReceteSheet.addRow([
          chStokKodu, '1', '', '', '2', '3', 'Operasyon', 'YOTOCH',
          '', '1', '', '', '', '', '', '', '', operationTime,
          'E', 'E', '', '', '', '', '', '', ''
        ]);

    });

    // Oluştur correct NCBK and NTEL recipes based on CH Ürün requirements - avoid duplicates
    const processedNCBKRecipes = new Set();
    const processedNTELRecipes = new Set();

    products.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      
      // Boy direction uses boyCap ile actual uzunlukBoy Uzunluk
      if (boyCap > 0) {
        const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        if (!processedNCBKRecipes.has(boyKey)) {
          processedNCBKRecipes.add(boyKey);
            
            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(boyCap)}.${uzunlukBoy}`;
            const FILMASIN_MAPPING = {
              4.45: 6.0, 4.50: 6.0, 4.75: 6.0, 4.85: 6.0, 5.00: 6.0,
              5.50: 6.5,
              6.00: 7.0,
              6.50: 7.5,
              7.00: 8.0,
              7.50: 9.0, 7.80: 9.0, 8.00: 9.0, 8.50: 9.0, 8.60: 9.0,
              9.19: 10.0,
              9.20: 10.0,
              10.60: 12.0
            };
            
            const flmInfo = getFilmasinByPriority(boyCap, 0);
            const flmKodu = flmInfo ? flmInfo.code : getFilmasinKodu(boyCap);
            // Miktar: Ağırlık based on target Çap (conservation of mass)
            const flmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * uzunlukBoy * 7.85 / 1000).toFixed(5);
            // Süre uses actual filmaşin Çap için Makine speed calculation
            const filmasinDiameter = flmInfo ? flmInfo.diameter : boyCap;
            
            // Olcu Birimi: Originally was 'AD' için NCBK, Şimdi left empty per user İstek
            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen', flmKodu,
              '', toExcelDecimal(parseFloat(flmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
            
            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { length: uzunlukBoy, boyCap: filmasinDiameter, enCap: filmasinDiameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        
        // NTEL Reçete için boyCap
        const ntelKey = boyCap.toString();
        if (!processedNTELRecipes.has(ntelKey)) {
          processedNTELRecipes.add(ntelKey);
          
          const ntelStokKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
          // NTEL_FILMASIN_MAPPING removed - Şimdi using database-driven priority system
          // Use priority-based filmaşin selection (priority 0 = main Reçete)
          const flmInfo = getFilmasinByPriority(boyCap, 0);
          const ntelFlmKodu = flmInfo ? flmInfo.code : 'FLM.0600.1008'; // fallback
          // Miktar: Ağırlık based on target Çap (conservation of mass)
          const ntelFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * 100 * 7.85 / 1000).toFixed(5);
          // Süre uses actual filmaşin Çap için Makine speed calculation
          const filmasinDiameter = flmInfo ? flmInfo.diameter : boyCap;
          
          // Olcu Birimi: Originally was 'MT' için NTEL, Şimdi left empty per user İstek
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen', ntelFlmKodu,
            '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          // Olcu Birimi: Originally was 'DK' için NTEL operations, Şimdi left empty per user İstek
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
            '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', {boyCap: filmasinDiameter, enCap: filmasinDiameter})),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        }
      }
      
      // En direction uses enCap ile actual uzunlukEn Uzunluk
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;
        if (!processedNCBKRecipes.has(enKey)) {
          processedNCBKRecipes.add(enKey);
            
            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(enCap)}.${uzunlukEn}`;
            const FILMASIN_MAPPING = {
              4.45: 6.0, 4.50: 6.0, 4.75: 6.0, 4.85: 6.0, 5.00: 6.0,
              5.50: 6.5,
              6.00: 7.0,
              6.50: 7.5,
              7.00: 8.0,
              7.50: 9.0, 7.80: 9.0, 8.00: 9.0, 8.50: 9.0, 8.60: 9.0,
              9.19: 10.0,
              9.20: 10.0,
              10.60: 12.0
            };

            const flmKodu = getFilmasinKodu(enCap);
            const sourceDiameter = FILMASIN_MAPPING[enCap] || enCap; // Get source filmasin diameter for duration
            const flmTuketimi = Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000;

            // Olcu Birimi: Originally was 'AD' için NCBK, Şimdi left empty per user İstek
            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen', flmKodu,
              '', toExcelDecimal(parseFloat(flmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { length: uzunlukEn, boyCap: sourceDiameter, enCap: sourceDiameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        
        // NTEL Reçete için enCap if different den boyCap
        if (enCap !== boyCap) {
          const ntelKey = enCap.toString();
          if (!processedNTELRecipes.has(ntelKey)) {
            processedNTELRecipes.add(ntelKey);
            
            const ntelStokKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
            // NTEL_FILMASIN_MAPPING removed - Şimdi using database-driven priority system
          // Use priority-based filmaşin selection (priority 0 = main Reçete)
          const flmInfo = getFilmasinByPriority(enCap, 0);
          const ntelFlmKodu = flmInfo ? flmInfo.code : 'FLM.0600.1008'; // fallback
          const ntelFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * 100 * 7.85 / 1000).toFixed(5);
          
          // Olcu Birimi: Originally was 'MT' için NTEL, Şimdi left empty per user İstek
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen', ntelFlmKodu,
            '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          ntelReceteSheet.addRow([
            ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
            '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', {boyCap: filmasinDiameter, enCap: filmasinDiameter})),
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
    // Başlat batch sequence before any stok kodu generation
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

    // CH REÇETE ALT1 sheet (NTEL bazlı)
    const chReceteSheet = workbook.addWorksheet('CH REÇETE ALT1');
    chReceteSheet.addRow(receteHeaders);

    // 5 NCBK Alternatif sheets (Priority 1-5)
    const ncbkSheets = [];
    for (let i = 0; i < 5; i++) {
      const sheet = workbook.addWorksheet(`YM NCBK ALT${i + 1}`);
      sheet.addRow(receteHeaders);
      ncbkSheets.push(sheet);
    }

    // 5 NTEL Alternatif sheets (Priority 1-5)
    const ntelSheets = [];
    for (let i = 0; i < 5; i++) {
      const sheet = workbook.addWorksheet(`YM NTEL ALT${i + 1}`);
      sheet.addRow(receteHeaders);
      ntelSheets.push(sheet);
    }

    // Alternatif reçete verilerini ekle (NTEL bazlı)
    let altReceteBatchIndex = 0;
    console.log('DEBUG: Starting CH reçete generation for', products.length, 'products');
    let chRowCount = 0;
    products.forEach(product => {
      // için Excel generation, İşlem all products regardless of optimization Durum
        console.log('🔧 ALT RECIPE STOK KODU DEBUG - Product:', product.hasirTipi, 'existingStokKodu:', product.existingStokKodu);
        // STRICT: Only use saved Stok codes, no fallback a generation
        const chStokKodu = product.existingStokKodu;
        if (!chStokKodu) {
          console.error('❌ CRITICAL: Missing existingStokKodu for alt recipe product:', product.hasirTipi);
          throw new Error(`Missing existingStokKodu for alt recipe product ${product.hasirTipi}`);
        }
        console.log('🔧 ALT RECIPE STOK KODU - Using saved stock code:', chStokKodu);
        console.log('DEBUG: Processing product with stok kodu:', chStokKodu, 'boyCap:', product.boyCap, 'enCap:', product.enCap, 'cubukSayisiBoy:', product.cubukSayisiBoy, 'cubukSayisiEn:', product.cubukSayisiEn);
        altReceteBatchIndex++;
        const boyLength = parseFloat(product.cubukSayisiBoy || 0) * 500;
        const enLength = parseFloat(product.cubukSayisiEn || 0) * 215;
        const totalLength = boyLength + enLength; // cm cinsinden
        
        // CORRECT: Use NTEL components için CH Alternatif Reçete instead of Filmaşin
        const boyCap = parseFloat(product.boyCap || 0);
        const enCap = parseFloat(product.enCap || 0);
        const cubukSayisiBoyValue = parseFloat(product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0);
        const cubukSayisiEnValue = parseFloat(product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0);

        // Doğrula all numeric values are Geçerli
        if (isNaN(boyCap) || isNaN(enCap) || isNaN(cubukSayisiBoyValue) || isNaN(cubukSayisiEnValue)) {
          console.warn('Invalid numeric values detected in NTEL calculation for product:', product.existingStokKodu || 'unknown');
          console.warn('Values:', { boyCap: product.boyCap, enCap: product.enCap, cubukSayisiBoy: product.cubukSayisiBoy, cubukSayisiEn: product.cubukSayisiEn });
          // Continue ile 0 values instead of NaN
        }
        
        // Boy direction NTEL consumption
        if (boyCap > 0 && cubukSayisiBoyValue > 0) {
          const boyNtelKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
          const boyNtelMiktar = (cubukSayisiBoyValue * 5).toFixed(5); // 5 meters per cubuk
          
          // Olcu Birimi: Originally was 'MT' için CH alternatif Reçete, Şimdi left empty per user İstek
          chReceteSheet.addRow([
            chStokKodu, '1', '0', '', '2', '1', 'Bileşen',
            boyNtelKodu,
            '', toExcelDecimal(boyNtelMiktar), 'Boy NTEL Tüketimi', '', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', ''
          ]);
          chRowCount++;
          console.log('DEBUG: Added CH row for boy NTEL:', boyNtelKodu, 'miktar:', boyNtelMiktar);
        }
        
        // En direction NTEL consumption (if different den boy)
        if (enCap > 0 && enCap !== boyCap && cubukSayisiEnValue > 0) {
          const enNtelKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
          const enNtelMiktar = (cubukSayisiEnValue * 2.15).toFixed(5); // 2.15 meters per cubuk
          
          // Olcu Birimi: Originally was 'MT' için CH alternatif Reçete, Şimdi left empty per user İstek
          chReceteSheet.addRow([
            chStokKodu, '1', '0', '', '2', '2', 'Bileşen',
            enNtelKodu,
            '', toExcelDecimal(enNtelMiktar), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', ''
          ]);
        } else if (enCap > 0 && enCap === boyCap && cubukSayisiEnValue > 0) {
          // Same Çap için both directions
          const enNtelKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
          const enNtelMiktar = Math.round(cubukSayisiEnValue * 2.15);
          
          // Olcu Birimi: Originally was 'MT' için CH alternatif Reçete, Şimdi left empty per user İstek
          chReceteSheet.addRow([
            chStokKodu, '1', '0', '', '2', '2', 'Bileşen',
            enNtelKodu,
            '', toExcelDecimal(parseFloat(enNtelMiktar).toFixed(5)), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', ''
          ]);
        }
        
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', '2', '3', 'Operasyon', 'OTOCH',
          '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('OTOCH', product)),
          'E', 'E', '', '', '', '', '', '', ''
        ]);

    });

    // Generate NCBK and NTEL recipes için 5 alternatif sheets using priority-based filmaşin
    const processedNCBKRecipes = Array(6).fill().map(() => new Set());
    const processedNTELRecipes = Array(6).fill().map(() => new Set());

    products.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);

      // Boy direction NCBK recipes - only generate için Mevcut priorities
      if (boyCap > 0) {
        const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        const availablePriorities = getAvailablePriorities(boyCap);

        // Only İşlem priorities that actually exist için this Çap
        for (const priority of availablePriorities) {
          if (!processedNCBKRecipes[priority].has(boyKey)) {
            processedNCBKRecipes[priority].add(boyKey);

            const flmInfo = getFilmasinByPriority(boyCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(boyCap)}.${uzunlukBoy}`;
            // Miktar: Ağırlık based on target Çap (conservation of mass - same Ağırlık regardless of source)
            const ncbkFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * uzunlukBoy * 7.85 / 1000).toFixed(5); // kg

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukBoy, boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // En direction NCBK recipes - generate için all 5 alternatif sheets
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;

        const availablePriorities = getAvailablePriorities(enCap);
        for (const priority of availablePriorities) {
          if (!processedNCBKRecipes[priority].has(enKey)) {
            processedNCBKRecipes[priority].add(enKey);

            const flmInfo = getFilmasinByPriority(enCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(enCap)}.${uzunlukEn}`;
            // Miktar: Ağırlık based on target Çap (conservation of mass - same Ağırlık regardless of source)
            const ncbkFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000).toFixed(5); // kg

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukEn, boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // Boy direction NTEL recipes - generate için all 5 alternatif sheets
      if (boyCap > 0) {
        const boyNtelKey = boyCap.toString();

        const availablePriorities = getAvailablePriorities(boyCap);
        for (const priority of availablePriorities) {
          if (!processedNTELRecipes[priority].has(boyNtelKey)) {
            processedNTELRecipes[priority].add(boyNtelKey);

            const flmInfo = getFilmasinByPriority(boyCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ntelStokKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
            const ntelFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * 100 * 7.85 / 1000).toFixed(5); // kg per meter

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { ...product, boyCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // En direction NTEL recipes - generate için all 5 alternatif sheets (if different den boy)
      if (enCap > 0 && enCap !== boyCap) {
        const enNtelKey = enCap.toString();

        const availablePriorities = getAvailablePriorities(enCap);
        for (const priority of availablePriorities) {
          if (!processedNTELRecipes[priority].has(enNtelKey)) {
            processedNTELRecipes[priority].add(enNtelKey);

            const flmInfo = getFilmasinByPriority(enCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ntelStokKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
            const ntelFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * 100 * 7.85 / 1000).toFixed(5); // kg per meter

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { ...product, boyCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }
    });

    // Excel dosyasını kaydet
    console.log('DEBUG: generateAlternatifReceteExcel - saving file with', products.length, 'products processed, CH rows added:', chRowCount);
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Alternatif_Recete_${timestamp}.xlsx`);
    console.log('DEBUG: generateAlternatifReceteExcel completed successfully');
  };

  // MERGED Recete Excel generation function (combines main recete + alternatif recete into 12 sheets)
  const generateMergedReceteExcel = async (products, timestamp, includeAllProducts) => {
    console.log('DEBUG: generateMergedReceteExcel started with', products.length, 'products');

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

    // Sheet 1: CH REÇETE (den main recete)
    const chReceteSheet = workbook.addWorksheet('CH REÇETE');
    chReceteSheet.addRow(receteHeaders);

    // Sheet 2: CH REÇETE ALT1 (den alternatif recete)
    const chReceteAlt1Sheet = workbook.addWorksheet('CH REÇETE ALT1');
    chReceteAlt1Sheet.addRow(receteHeaders);

    // Sheets 3-8: YM NCBK REÇETE (main) + ALT 1-5 = 6 sheets total
    const ncbkSheets = [];
    // Main NCBK sheet (priority 0)
    const ncbkMainSheet = workbook.addWorksheet('YM NCBK REÇETE');
    ncbkMainSheet.addRow(receteHeaders);
    ncbkSheets.push(ncbkMainSheet);
    // Alternative NCBK sheets (priority 1-5)
    for (let i = 1; i <= 5; i++) {
      const sheet = workbook.addWorksheet(`YM NCBK ALT${i}`);
      sheet.addRow(receteHeaders);
      ncbkSheets.push(sheet);
    }

    // Sheets 9-14: YM NTEL REÇETE (main) + ALT 1-5 = 6 sheets total
    const ntelSheets = [];
    // Main NTEL sheet (priority 0)
    const ntelMainSheet = workbook.addWorksheet('YM NTEL REÇETE');
    ntelMainSheet.addRow(receteHeaders);
    ntelSheets.push(ntelMainSheet);
    // Alternative NTEL sheets (priority 1-5)
    for (let i = 1; i <= 5; i++) {
      const sheet = workbook.addWorksheet(`YM NTEL ALT${i}`);
      sheet.addRow(receteHeaders);
      ntelSheets.push(sheet);
    }

    // ===== SHEET 1: CH REÇETE (EXACT COPY den ORIGINAL generateReceteExcel) =====
    let receteBatchIndex = 0;
    products.forEach(product => {
      const chStokKodu = product.existingStokKodu;
      if (!chStokKodu) {
        console.error('❌ CRITICAL: Missing existingStokKodu for recipe product:', product.hasirTipi);
        throw new Error(`Missing existingStokKodu for recipe product ${product.hasirTipi}`);
      }
      console.log('🔧 RECIPE STOK KODU - Using saved stock code:', chStokKodu);
      receteBatchIndex++;

      // CH Reçete - Boy ve En çubuk tüketimleri
      const enCubukMiktar = parseInt(product.cubukSayisiEn) || parseInt(product.dis_cap_en_cubuk_ad) || 0;
      const boyCubukMiktar = parseInt(product.cubukSayisiBoy) || parseInt(product.ic_cap_boy_cubuk_ad) || 0;

      // Hesapla YOTOCH operation Zaman using our formula
      const operationTime = toExcelNumber(calculateOperationDuration('YOTOCH', product));

      // EN ÇUBUĞU (actual en Uzunluk)
      chReceteSheet.addRow([
        chStokKodu, '1', '', '', '2', '1', 'Bileşen',
        `YM.NCBK.${safeCapToCode(product.enCap)}.${Math.round(parseFloat(product.uzunlukEn || 0) || 0)}`,
        '', enCubukMiktar, 'EN ÇUBUĞU ', '', '', '', '', '', '', '',
        'E', 'E', '', '', '', '', '', '', ''
      ]);

      // BOY ÇUBUĞU (actual boy Uzunluk)
      chReceteSheet.addRow([
        chStokKodu, '1', '', '', '2', '2', 'Bileşen',
        `YM.NCBK.${safeCapToCode(product.boyCap)}.${Math.round(parseFloat(product.uzunlukBoy || 0) || 0)}`,
        '', boyCubukMiktar, 'BOY ÇUBUĞU', '', '', '', '', '', '', '',
        'E', 'E', '', '', '', '', '', '', ''
      ]);

      // YOTOCH Operasyon
      chReceteSheet.addRow([
        chStokKodu, '1', '', '', '2', '3', 'Operasyon', 'YOTOCH',
        '', '1', '', '', '', '', '', '', '', operationTime,
        'E', 'E', '', '', '', '', '', '', ''
      ]);
    });

    // ===== SHEET 2: CH REÇETE ALT1 (EXACT COPY den ORIGINAL generateAlternatifReceteExcel) =====
    let altReceteBatchIndex = 0;
    let chRowCount = 0;
    products.forEach(product => {
      const chStokKodu = product.existingStokKodu;
      if (!chStokKodu) {
        console.error('❌ CRITICAL: Missing existingStokKodu for alt recipe product:', product.hasirTipi);
        throw new Error(`Missing existingStokKodu for alt recipe product ${product.hasirTipi}`);
      }
      console.log('🔧 ALT RECIPE STOK KODU - Using saved stock code:', chStokKodu);
      altReceteBatchIndex++;

      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      const cubukSayisiBoyValue = parseFloat(product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0);
      const cubukSayisiEnValue = parseFloat(product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0);

      // Doğrula all numeric values are Geçerli
      if (isNaN(boyCap) || isNaN(enCap) || isNaN(cubukSayisiBoyValue) || isNaN(cubukSayisiEnValue)) {
        console.warn('Invalid numeric values detected in NTEL calculation for product:', product.existingStokKodu || 'unknown');
        console.warn('Values:', { boyCap: product.boyCap, enCap: product.enCap, cubukSayisiBoy: product.cubukSayisiBoy, cubukSayisiEn: product.cubukSayisiEn });
        // Continue ile 0 values instead of NaN
      }

      // Boy direction NTEL consumption
      if (boyCap > 0 && cubukSayisiBoyValue > 0) {
        const boyNtelKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
        const boyNtelMiktar = (cubukSayisiBoyValue * 5).toFixed(5); // 5 meters per cubuk

        chReceteAlt1Sheet.addRow([
          chStokKodu, '1', '0', '', '2', '1', 'Bileşen',
          boyNtelKodu,
          '', toExcelDecimal(boyNtelMiktar), 'Boy NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        chRowCount++;
      }

      // En direction NTEL consumption (if different den boy)
      if (enCap > 0 && enCap !== boyCap && cubukSayisiEnValue > 0) {
        const enNtelKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
        const enNtelMiktar = (cubukSayisiEnValue * 2.15).toFixed(5); // 2.15 meters per cubuk

        chReceteAlt1Sheet.addRow([
          chStokKodu, '1', '0', '', '2', '2', 'Bileşen',
          enNtelKodu,
          '', toExcelDecimal(enNtelMiktar), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
      } else if (enCap > 0 && enCap === boyCap && cubukSayisiEnValue > 0) {
        // Same Çap için both directions
        const enNtelKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
        const enNtelMiktar = Math.round(cubukSayisiEnValue * 2.15);

        chReceteAlt1Sheet.addRow([
          chStokKodu, '1', '0', '', '2', '2', 'Bileşen',
          enNtelKodu,
          '', toExcelDecimal(parseFloat(enNtelMiktar).toFixed(5)), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
      }

      // CRITICAL FIX: Use OTOCH not KAYNAK (den original)
      chReceteAlt1Sheet.addRow([
        chStokKodu, '1', '0', '', '2', '3', 'Operasyon', 'OTOCH',
        '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('OTOCH', product)),
        'E', 'E', '', '', '', '', '', '', ''
      ]);
    });

    // ===== SHEETS 3-12: NCBK & NTEL RECIPES (EXACT COPY den ORIGINAL generateAlternatifReceteExcel) =====
    const processedNCBKRecipes = Array(6).fill().map(() => new Set());
    const processedNTELRecipes = Array(6).fill().map(() => new Set());

    products.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);

      // Boy direction NCBK recipes - only generate için Mevcut priorities
      if (boyCap > 0) {
        const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        const availablePriorities = getAvailablePriorities(boyCap);

        // Only İşlem priorities that actually exist için this Çap
        for (const priority of availablePriorities) {
          if (!processedNCBKRecipes[priority].has(boyKey)) {
            processedNCBKRecipes[priority].add(boyKey);

            const flmInfo = getFilmasinByPriority(boyCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(boyCap)}.${uzunlukBoy}`;
            // Miktar: Ağırlık based on target Çap (conservation of mass - same Ağırlık regardless of source)
            const ncbkFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * uzunlukBoy * 7.85 / 1000).toFixed(5); // kg

            // CRITICAL FIX: Use 'AD' not 'MT' için NCBK
            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukBoy, boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // En direction NCBK recipes - generate için all 5 alternatif sheets
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;

        const availablePriorities = getAvailablePriorities(enCap);
        for (const priority of availablePriorities) {
          if (!processedNCBKRecipes[priority].has(enKey)) {
            processedNCBKRecipes[priority].add(enKey);

            const flmInfo = getFilmasinByPriority(enCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(enCap)}.${uzunlukEn}`;
            // Miktar: Ağırlık based on target Çap (conservation of mass - same Ağırlık regardless of source)
            const ncbkFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000).toFixed(5); // kg

            // CRITICAL FIX: Use 'AD' not 'MT' için NCBK
            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukEn, boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // Boy direction NTEL recipes - generate için all 5 alternatif sheets
      if (boyCap > 0) {
        const boyNtelKey = boyCap.toString();

        const availablePriorities = getAvailablePriorities(boyCap);
        for (const priority of availablePriorities) {
          if (!processedNTELRecipes[priority].has(boyNtelKey)) {
            processedNTELRecipes[priority].add(boyNtelKey);

            const flmInfo = getFilmasinByPriority(boyCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ntelStokKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
            // Miktar: Ağırlık based on target Çap (conservation of mass)
            const ntelFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * 100 * 7.85 / 1000).toFixed(5); // kg per meter

            // CRITICAL FIX: Use 'AD' not 'MT' için NTEL
            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // En direction NTEL recipes - generate için all 5 alternatif sheets
      if (enCap > 0 && enCap !== boyCap) {
        const enNtelKey = enCap.toString();

        const availablePriorities = getAvailablePriorities(enCap);
        for (const priority of availablePriorities) {
          if (!processedNTELRecipes[priority].has(enNtelKey)) {
            processedNTELRecipes[priority].add(enNtelKey);

            const flmInfo = getFilmasinByPriority(enCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ntelStokKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
            const ntelFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * 100 * 7.85 / 1000).toFixed(5); // kg for 100m

            // CRITICAL FIX: Use 'AD' not 'MT' için NTEL
            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }
    });

    // Save the merged Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Recete_${timestamp}.xlsx`);

    console.log('DEBUG: generateMergedReceteExcel - saving file with', products.length, 'products processed, CH rows added:', chRowCount);
    console.log('DEBUG: generateMergedReceteExcel completed successfully');
  };

  // BULK Excel generation functions that use pre-downloaded database Veri
  const generateBulkStokKartiExcel = async (allProducts, timestamp) => {
    console.log('🚀 BULK STOK KARTI: Processing', allProducts.length, 'products');
    
    const workbook = new ExcelJS.Workbook();
    
    // Oluştur all three sheets
    const chSheet = workbook.addWorksheet('CH STOK');
    const ncbkSheet = workbook.addWorksheet('YM NCBK STOK');
    const ntelSheet = workbook.addWorksheet('YM NTEL STOK');
    
    // Define Başlıklar (same olarak existing)
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

    // İşlem products ile Tip
    allProducts.forEach(product => {
      const gozAraligi = formatGozAraligi(product);
      const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                         (gozAraligi === '15x15' || gozAraligi === '15x25');

      if (product.productType === 'MM') {
        // Generate CH STOK row - USE EXACT SAME LOGIC olarak WORKING SINGLE Ürün EXCEL
        const finalCubukSayisiBoy = product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0;
        const finalCubukSayisiEn = product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0;
        
        // Use the exact same variable names and logic olarak working Excel
        const excelCubukBoy = parseInt(finalCubukSayisiBoy);
        const excelCubukEn = parseInt(finalCubukSayisiEn);
        
        chSheet.addRow([
          // 1-7: Basic info (Stok Kodu, Stok Adı, Grup Kodu, Grup İsmi, Kod-1, Kod-2, İngilizce İsim)
          product.existingStokKodu, product.stok_adi || generateStokAdi(product, 'CH'), 'MM', '', 'HSR', isStandard ? 'STD' : 'OZL', generateIngilizceIsim(product, 'CH'),
          // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
          '20', '20', '31', '36',
          // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
          'KG', 'AD', '1', toExcelDecimal(getCleanKgValue(product).toFixed(5)), '',
          // 17-20: More conversions (Ölçü Br-3, Çevrim Pay-2, Çevrim Payda-2, Çevrim Değeri-2)
          '', '1', '1', '1',
          // 21-27: Ürün specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
          product.hasirTipi, toExcelDecimal(parseFloat(product.boyCap || 0)), toExcelDecimal(parseFloat(product.enCap || 0)), 
          parseInt(product.uzunlukBoy || 0), parseInt(product.uzunlukEn || 0), gozAraligi, toExcelDecimal(getCleanKgValue(product).toFixed(5)),
          // 🔧 CRITICAL FIX: Use the same variables olarak working Excel
          excelCubukBoy, excelCubukEn, '0', '0', '0', '', '', '',
          // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
          '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
          // 46-55: Stok and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
          '0', '0', '', '0', '0', '0', '0', '0', '0', 'D',
          // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
          '', '', '', '', '', 'H', 'H', '', '', '',
          // 66-69: Extra columns den our app Formatla (not in CSV template)
          product.existingStokKodu, 'MM', 'E', 'E'
        ]);
      } else if (product.productType === 'NCBK') {
        // Generate YM NCBK STOK row
        // ✅ CRITICAL FIX: Extract Uzunluk den stok_kodu için proper English name generation
        const stokKoduMatch = product.existingStokKodu?.match(/YM\.NCBK\.\d+\.(\d+)/);
        const extractedLength = stokKoduMatch ? parseInt(stokKoduMatch[1]) : (parseInt(product.uzunlukBoy) || parseInt(product.uzunlukEn) || 0);
        const extractedCap = parseFloat(product.boyCap || product.enCap || product.cap || 0);

        console.log(`🔍 NCBK EXCEL DEBUG:`, {
          stokKodu: product.existingStokKodu,
          extractedLength,
          extractedCap,
          uzunlukBoy: product.uzunlukBoy,
          uzunlukEn: product.uzunlukEn
        });

        ncbkSheet.addRow([
          product.existingStokKodu, product.stok_adi || generateStokAdi(product, 'NCBK'), 'YM', 'YARI MAMÜL', 'NCBK', '',
          generateIngilizceIsim({cap: extractedCap, length: extractedLength}, 'NCBK'),
          '20', '20', '20', '35',
          'AD', 'KG', '1', toExcelDecimal(getCleanKgValue(product).toFixed(5)), '',
          '', '1', '1', '1',
          product.hasirTipi, toExcelDecimal(parseFloat(product.boyCap || 0)), toExcelDecimal(parseFloat(product.enCap || 0)), 
          parseInt(product.uzunlukBoy || 0), parseInt(product.uzunlukEn || 0), '', toExcelDecimal(getCleanKgValue(product).toFixed(5)),
          '0', '0', '0', '0', '0', '', '', '',
          '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
          '0', '0', '', '0', '0', '0', '0', '0', '0', 'H',
          '', '', '', '', '', 'H', 'E', '', '', '',
          product.existingStokKodu, 'NCBK', 'E', 'E'
        ]);
      } else if (product.productType === 'NTEL') {
        // Generate YM NTEL STOK row
        ntelSheet.addRow([
          product.existingStokKodu, product.stok_adi || generateStokAdi(product, 'NTEL'), 'YM', 'YARI MAMÜL', 'NTEL', '', generateIngilizceIsim(product, 'NTEL'),
          '20', '20', '20', '35',
          'MT', 'KG', '1', toExcelDecimal(getCleanKgValue(product).toFixed(5)), '',
          '', '1', '1', '1',
          product.hasirTipi, toExcelDecimal(parseFloat(product.boyCap || 0)), toExcelDecimal(parseFloat(product.enCap || 0)), 
          '0', '0', '', toExcelDecimal(getCleanKgValue(product).toFixed(5)),
          '0', '0', '0', '0', '0', '', '', '',
          '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
          '0', '0', '', '0', '0', '0', '0', '0', '0', 'H',
          '', '', '', '', '', 'H', 'E', '', '', '',
          product.existingStokKodu, 'NTEL', 'E', 'E'
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

    // Oluştur separate sheets için each Ürün Tip
    const chReceteSheet = workbook.addWorksheet('CH REÇETE');
    const ncbkReceteSheet = workbook.addWorksheet('YM NCBK REÇETE');
    const ntelReceteSheet = workbook.addWorksheet('YM NTEL REÇETE');
    
    chReceteSheet.addRow(receteHeaders);
    ncbkReceteSheet.addRow(receteHeaders);
    ntelReceteSheet.addRow(receteHeaders);

    // İşlem recipes den database Veri
    allProducts.forEach(product => {
      const productType = product.productType;
      const stokKodu = product.existingStokKodu;

      // Al recipes için this Ürün den the lookup
      const recipes = receteLookup[productType]?.get(stokKodu) || [];

      if (recipes.length > 0) {
        console.log(`🚀 BULK RECIPE: Found ${recipes.length} recipes for ${stokKodu}`);

        // Ekle recipes a appropriate sheet
        recipes.forEach(recipe => {
          if (productType === 'MM') {
            // için CH REÇETE sheet: Ayarla Ölçü Br. a '2' and Ölçü Br. - Bileşen a empty
            const chRecipeRow = [
              recipe.mamul_kodu || stokKodu,
              recipe.recete_top || 1,
              toExcelNumber(recipe.fire_orani || 0),
              recipe.oto_rec || '',
              '2', // Ölçü Br. set to '2'
              recipe.sira_no || 1,
              recipe.operasyon_bilesen || '',
              recipe.bilesen_kodu || '',
              '', // Ölçü Br. - Bileşen set to empty
              recipe.miktar ? toExcelNumber(recipe.miktar) : '0',
              recipe.aciklama || '',
              recipe.miktar_sabitle || '',
              recipe.stok_maliyet || '',
              recipe.fire_mik || '',
              recipe.sabit_fire_mik || '',
              recipe.istasyon_kodu || '',
              recipe.hazirlik_suresi || '',
              recipe.uretim_suresi ? toExcelNumber(recipe.uretim_suresi) : '',
              recipe.ua_dahil_edilsin || 'E',
              recipe.son_operasyon || 'E',
              recipe.planlama_orani || '',
              '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ];
            chReceteSheet.addRow(chRecipeRow);
          } else if (productType === 'NCBK') {
            // için NCBK and NTEL sheets: Keep original values
            const recipeRow = [
              recipe.mamul_kodu || stokKodu,
              recipe.recete_top || 1,
              toExcelNumber(recipe.fire_orani || 0),
              recipe.oto_rec || '',
              recipe.olcu_br || '',
              recipe.sira_no || 1,
              recipe.operasyon_bilesen || '',
              recipe.bilesen_kodu || '',
              '', // Force Ölçü Br. - Bileşen to be empty as requested
              recipe.miktar ? toExcelNumber(recipe.miktar) : '0',
              recipe.aciklama || '',
              recipe.miktar_sabitle || '',
              recipe.stok_maliyet || '',
              recipe.fire_mik || '',
              recipe.sabit_fire_mik || '',
              recipe.istasyon_kodu || '',
              recipe.hazirlik_suresi || '',
              recipe.uretim_suresi ? toExcelNumber(recipe.uretim_suresi) : '',
              recipe.ua_dahil_edilsin || 'E',
              recipe.son_operasyon || 'E',
              recipe.planlama_orani || '',
              '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ];
            ncbkReceteSheet.addRow(recipeRow);
          } else if (productType === 'NTEL') {
            // için NCBK and NTEL sheets: Keep original values
            const recipeRow = [
              recipe.mamul_kodu || stokKodu,
              recipe.recete_top || 1,
              toExcelNumber(recipe.fire_orani || 0),
              recipe.oto_rec || '',
              recipe.olcu_br || '',
              recipe.sira_no || 1,
              recipe.operasyon_bilesen || '',
              recipe.bilesen_kodu || '',
              '', // Force Ölçü Br. - Bileşen to be empty as requested
              recipe.miktar ? toExcelNumber(recipe.miktar) : '0',
              recipe.aciklama || '',
              recipe.miktar_sabitle || '',
              recipe.stok_maliyet || '',
              recipe.fire_mik || '',
              recipe.sabit_fire_mik || '',
              recipe.istasyon_kodu || '',
              recipe.hazirlik_suresi || '',
              recipe.uretim_suresi ? toExcelNumber(recipe.uretim_suresi) : '',
              recipe.ua_dahil_edilsin || 'E',
              recipe.son_operasyon || 'E',
              recipe.planlama_orani || '',
              '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ];
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

    const chReceteSheet = workbook.addWorksheet('CH REÇETE ALT1');
    chReceteSheet.addRow(receteHeaders);

    // 5 NCBK Alternatif sheets (Priority 1-5)
    const ncbkSheets = [];
    for (let i = 0; i < 5; i++) {
      const sheet = workbook.addWorksheet(`YM NCBK ALT${i + 1}`);
      sheet.addRow(receteHeaders);
      ncbkSheets.push(sheet);
    }

    // 5 NTEL Alternatif sheets (Priority 1-5)
    const ntelSheets = [];
    for (let i = 0; i < 5; i++) {
      const sheet = workbook.addWorksheet(`YM NTEL ALT${i + 1}`);
      sheet.addRow(receteHeaders);
      ntelSheets.push(sheet);
    }

    // Generate NCBK and NTEL recipes için 5 alternatif sheets using priority-based filmaşin (BULK version)
    const processedNCBKRecipes = Array(6).fill().map(() => new Set());
    const processedNTELRecipes = Array(6).fill().map(() => new Set());
    
    // İşlem only MM products için CH alternative recipes (NTEL-based)
    const mmProducts = allProducts.filter(product =>
      product.productType === 'MM' ||
      !product.productType ||
      product.existingStokKodu?.startsWith('YM.CH.')
    );

    console.log(`🚀 BULK ALT RECIPE: Processing ${mmProducts.length} MM products for CH recipes out of ${allProducts.length} total products`);

    mmProducts.forEach(product => {
      const chStokKodu = product.existingStokKodu;
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      const cubukSayisiBoyValue = parseFloat(product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0);
      const cubukSayisiEnValue = parseFloat(product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0);

      // Doğrula all numeric values are Geçerli
      if (isNaN(boyCap) || isNaN(enCap) || isNaN(cubukSayisiBoyValue) || isNaN(cubukSayisiEnValue)) {
        console.warn('Bulk Excel - Invalid numeric values detected in NTEL calculation for product:', product.existingStokKodu || 'unknown');
        console.warn('Values:', { boyCap: product.boyCap, enCap: product.enCap, cubukSayisiBoy: product.cubukSayisiBoy, cubukSayisiEn: product.cubukSayisiEn });
        return; // Skip this product
      }

      // Boy direction NTEL consumption
      if (boyCap > 0 && cubukSayisiBoyValue > 0) {
        const boyNtelKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
        const boyNtelMiktar = Math.round(cubukSayisiBoyValue * 5);

        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', '2', '1', 'Bileşen',
          boyNtelKodu, '', toExcelNumber(boyNtelMiktar), 'Boy NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
      }

      // En direction NTEL consumption
      if (enCap > 0 && cubukSayisiEnValue > 0) {
        const enNtelKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
        const enNtelMiktar = Math.round(cubukSayisiEnValue * 2.15);

        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', '2', '2', 'Bileşen',
          enNtelKodu, '', toExcelNumber(enNtelMiktar), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
      }

      // Operation
      chReceteSheet.addRow([
        chStokKodu, '1', '0', '', '2', '3', 'Operasyon', 'OTOCH',
        '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('OTOCH', product)),
        'E', 'E', '', '', '', '', '', '', ''
      ]);
    });

    // Use the same updated logic den generateAlternatifReceteExcel - only İşlem MM products
    mmProducts.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);

      // Skip products ile Geçersiz uzunluk values a avoid Geçersiz Stok codes
      const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
      const uzunlukEn = parseInt(product.uzunlukEn || 0);

      if (uzunlukBoy <= 0 || uzunlukEn <= 0) {
        console.warn('Skipping product with invalid uzunluk values:', {
          stokKodu: product.existingStokKodu,
          uzunlukBoy: product.uzunlukBoy,
          uzunlukEn: product.uzunlukEn
        });
        return;
      }

      // Boy direction NCBK recipes - only generate için Mevcut priorities
      if (boyCap > 0) {
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        const availablePriorities = getAvailablePriorities(boyCap);

        for (const priority of availablePriorities) {
          if (!processedNCBKRecipes[priority].has(boyKey)) {
            processedNCBKRecipes[priority].add(boyKey);

            const flmInfo = getFilmasinByPriority(boyCap, priority);

            // Should always exist since we got it den availablePriorities
            if (!flmInfo) {
              continue;
            }

            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(boyCap)}.${uzunlukBoy}`;
            const ncbkFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * uzunlukBoy * 7.85 / 1000).toFixed(5);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukBoy, boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // En direction NCBK recipes - generate için all 5 alternatif sheets
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;

        const availablePriorities = getAvailablePriorities(enCap);
        for (const priority of availablePriorities) {
          if (!processedNCBKRecipes[priority].has(enKey)) {
            processedNCBKRecipes[priority].add(enKey);

            const flmInfo = getFilmasinByPriority(enCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(enCap)}.${uzunlukEn}`;
            const ncbkFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000).toFixed(5);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukEn, boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // Boy direction NTEL recipes - generate için all 5 alternatif sheets
      if (boyCap > 0) {
        const boyNtelKey = boyCap.toString();

        const availablePriorities = getAvailablePriorities(boyCap);
        for (const priority of availablePriorities) {
          if (!processedNTELRecipes[priority].has(boyNtelKey)) {
            processedNTELRecipes[priority].add(boyNtelKey);

            const flmInfo = getFilmasinByPriority(boyCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ntelStokKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
            const ntelFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * 100 * 7.85 / 1000).toFixed(5);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { ...product, boyCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // En direction NTEL recipes - generate için all 5 alternatif sheets (if different den boy)
      if (enCap > 0 && enCap !== boyCap) {
        const enNtelKey = enCap.toString();

        const availablePriorities = getAvailablePriorities(enCap);
        for (const priority of availablePriorities) {
          if (!processedNTELRecipes[priority].has(enNtelKey)) {
            processedNTELRecipes[priority].add(enNtelKey);

            const flmInfo = getFilmasinByPriority(enCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ntelStokKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
            const ntelFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * 100 * 7.85 / 1000).toFixed(5);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { ...product, boyCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Bulk_Celik_Hasir_Alternatif_Recete_${timestamp}.xlsx`);
    console.log('🚀 BULK ALT RECIPE: Excel generation completed');
  };

  // BULK Merged Recete Excel generation function (combines main recete + alternatif recete into 14 sheets)
  const generateBulkMergedReceteExcel = async (allProducts, receteLookup, timestamp, allNCBKProducts = [], allNTELProducts = []) => {
    console.log('🚀 BULK MERGED RECETE: Starting with', allProducts.length, 'MM products,', allNCBKProducts.length, 'NCBK products,', allNTELProducts.length, 'NTEL products');

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

    // Sheet 1: CH REÇETE (den main recete)
    const chReceteSheet = workbook.addWorksheet('CH REÇETE');
    chReceteSheet.addRow(receteHeaders);

    // Sheet 2: CH REÇETE ALT1 (den alternatif recete)
    const chReceteAlt1Sheet = workbook.addWorksheet('CH REÇETE ALT1');
    chReceteAlt1Sheet.addRow(receteHeaders);

    // Sheets 3-8: YM NCBK REÇETE (main) + ALT 1-5 = 6 sheets total
    const ncbkSheets = [];
    // Main NCBK sheet (priority 0)
    const ncbkMainSheet = workbook.addWorksheet('YM NCBK REÇETE');
    ncbkMainSheet.addRow(receteHeaders);
    ncbkSheets.push(ncbkMainSheet);
    // Alternative NCBK sheets (priority 1-5)
    for (let i = 1; i <= 5; i++) {
      const sheet = workbook.addWorksheet(`YM NCBK ALT${i}`);
      sheet.addRow(receteHeaders);
      ncbkSheets.push(sheet);
    }

    // Sheets 9-14: YM NTEL REÇETE (main) + ALT 1-5 = 6 sheets total
    const ntelSheets = [];
    // Main NTEL sheet (priority 0)
    const ntelMainSheet = workbook.addWorksheet('YM NTEL REÇETE');
    ntelMainSheet.addRow(receteHeaders);
    ntelSheets.push(ntelMainSheet);
    // Alternative NTEL sheets (priority 1-5)
    for (let i = 1; i <= 5; i++) {
      const sheet = workbook.addWorksheet(`YM NTEL ALT${i}`);
      sheet.addRow(receteHeaders);
      ntelSheets.push(sheet);
    }

    // Filtrele için MM products only (olarak bulk functions work ile all Ürün types)
    const mmProducts = allProducts.filter(p => p.productType === 'MM');
    console.log('🚀 BULK MERGED RECETE: Filtered to', mmProducts.length, 'MM products');

    // ===== SHEET 1: CH REÇETE (EXACT COPY den ORIGINAL generateReceteExcel) =====
    mmProducts.forEach(product => {
      const chStokKodu = product.existingStokKodu || product.stok_kodu;
      if (!chStokKodu) {
        console.error('❌ BULK MERGED RECETE: Missing stok kodu for product:', product.hasirTipi);
        return;
      }

      // CH Reçete - Boy ve En çubuk tüketimleri
      const enCubukMiktar = parseInt(product.cubukSayisiEn) || parseInt(product.dis_cap_en_cubuk_ad) || 0;
      const boyCubukMiktar = parseInt(product.cubukSayisiBoy) || parseInt(product.ic_cap_boy_cubuk_ad) || 0;

      // Hesapla YOTOCH operation Zaman using our formula
      const operationTime = toExcelNumber(calculateOperationDuration('YOTOCH', product));

      // EN ÇUBUĞU (actual en Uzunluk)
      chReceteSheet.addRow([
        chStokKodu, '1', '', '', '2', '1', 'Bileşen',
        `YM.NCBK.${safeCapToCode(product.enCap)}.${Math.round(parseFloat(product.uzunlukEn || 0) || 0)}`,
        '', enCubukMiktar, 'EN ÇUBUĞU ', '', '', '', '', '', '', '',
        'E', 'E', '', '', '', '', '', '', ''
      ]);

      // BOY ÇUBUĞU (actual boy Uzunluk)
      chReceteSheet.addRow([
        chStokKodu, '1', '', '', '2', '2', 'Bileşen',
        `YM.NCBK.${safeCapToCode(product.boyCap)}.${Math.round(parseFloat(product.uzunlukBoy || 0) || 0)}`,
        '', boyCubukMiktar, 'BOY ÇUBUĞU', '', '', '', '', '', '', '',
        'E', 'E', '', '', '', '', '', '', ''
      ]);

      // YOTOCH Operasyon
      chReceteSheet.addRow([
        chStokKodu, '1', '', '', '2', '3', 'Operasyon', 'YOTOCH',
        '', '1', '', '', '', '', '', '', '', operationTime,
        'E', 'E', '', '', '', '', '', '', ''
      ]);
    });

    // ===== SHEET 2: CH REÇETE ALT1 (EXACT COPY den ORIGINAL generateAlternatifReceteExcel) =====
    mmProducts.forEach(product => {
      const chStokKodu = product.existingStokKodu || product.stok_kodu;
      if (!chStokKodu) {
        console.error('❌ BULK MERGED RECETE: Missing stok kodu for alt recipe product:', product.hasirTipi);
        return;
      }

      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);
      const cubukSayisiBoyValue = parseFloat(product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0);
      const cubukSayisiEnValue = parseFloat(product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0);

      // Doğrula all numeric values are Geçerli
      if (isNaN(boyCap) || isNaN(enCap) || isNaN(cubukSayisiBoyValue) || isNaN(cubukSayisiEnValue)) {
        console.warn('Invalid numeric values detected in NTEL calculation for product:', product.existingStokKodu || 'unknown');
        console.warn('Values:', { boyCap: product.boyCap, enCap: product.enCap, cubukSayisiBoy: product.cubukSayisiBoy, cubukSayisiEn: product.cubukSayisiEn });
        // Continue ile 0 values instead of NaN
      }

      // Boy direction NTEL consumption
      if (boyCap > 0 && cubukSayisiBoyValue > 0) {
        const boyNtelKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
        const boyNtelMiktar = (cubukSayisiBoyValue * 5).toFixed(5); // 5 meters per cubuk

        chReceteAlt1Sheet.addRow([
          chStokKodu, '1', '0', '', '2', '1', 'Bileşen',
          boyNtelKodu,
          '', toExcelDecimal(boyNtelMiktar), 'Boy NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
      }

      // En direction NTEL consumption (if different den boy)
      if (enCap > 0 && enCap !== boyCap && cubukSayisiEnValue > 0) {
        const enNtelKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
        const enNtelMiktar = (cubukSayisiEnValue * 2.15).toFixed(5); // 2.15 meters per cubuk

        chReceteAlt1Sheet.addRow([
          chStokKodu, '1', '0', '', '2', '2', 'Bileşen',
          enNtelKodu,
          '', toExcelDecimal(enNtelMiktar), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
      } else if (enCap > 0 && enCap === boyCap && cubukSayisiEnValue > 0) {
        // Same Çap için both directions
        const enNtelKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
        const enNtelMiktar = Math.round(cubukSayisiEnValue * 2.15);

        chReceteAlt1Sheet.addRow([
          chStokKodu, '1', '0', '', '2', '2', 'Bileşen',
          enNtelKodu,
          '', toExcelDecimal(parseFloat(enNtelMiktar).toFixed(5)), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
      }

      // CRITICAL FIX: Use OTOCH not KAYNAK (den original)
      chReceteAlt1Sheet.addRow([
        chStokKodu, '1', '0', '', '2', '3', 'Operasyon', 'OTOCH',
        '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('OTOCH', product)),
        'E', 'E', '', '', '', '', '', '', ''
      ]);
    });

    // ===== SHEETS 3-12: NCBK & NTEL RECIPES (FIXED: only İşlem Mevcut priorities) =====
    const processedNCBKRecipes = Array(6).fill().map(() => new Set());
    const processedNTELRecipes = Array(6).fill().map(() => new Set());

    mmProducts.forEach(product => {
      const boyCap = parseFloat(product.boyCap || 0);
      const enCap = parseFloat(product.enCap || 0);

      // Boy direction NCBK recipes - only generate için Mevcut priorities
      if (boyCap > 0) {
        const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
        const boyKey = `${boyCap}-${uzunlukBoy}`;
        const availablePriorities = getAvailablePriorities(boyCap);

        // Only İşlem priorities that actually exist için this Çap
        for (const priority of availablePriorities) {
          if (!processedNCBKRecipes[priority].has(boyKey)) {
            processedNCBKRecipes[priority].add(boyKey);

            const flmInfo = getFilmasinByPriority(boyCap, priority);

            // Skip if no alternative exists için this priority
            if (!flmInfo) {
              continue;
            }

            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(boyCap)}.${uzunlukBoy}`;
            // Miktar: Ağırlık based on target Çap (conservation of mass - same Ağırlık regardless of source)
            const ncbkFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * uzunlukBoy * 7.85 / 1000).toFixed(5); // kg

            // CRITICAL FIX: Use 'AD' not 'MT' için NCBK
            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukBoy, boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // En direction NCBK recipes - generate için all 5 alternatif sheets
      if (enCap > 0) {
        const uzunlukEn = parseInt(product.uzunlukEn || 0);
        const enKey = `${enCap}-${uzunlukEn}`;

        const availablePriorities = getAvailablePriorities(enCap);
        for (const priority of availablePriorities) {
          if (!processedNCBKRecipes[priority].has(enKey)) {
            processedNCBKRecipes[priority].add(enKey);

            const flmInfo = getFilmasinByPriority(enCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(enCap)}.${uzunlukEn}`;
            // Miktar: Ağırlık based on target Çap (conservation of mass - same Ağırlık regardless of source)
            const ncbkFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000).toFixed(5); // kg

            // CRITICAL FIX: Use 'AD' not 'MT' için NCBK
            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkSheets[priority].addRow([
              ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { ...product, length: uzunlukEn, boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // Boy direction NTEL recipes - generate için all 5 alternatif sheets
      if (boyCap > 0) {
        const boyNtelKey = boyCap.toString();

        const availablePriorities = getAvailablePriorities(boyCap);
        for (const priority of availablePriorities) {
          if (!processedNTELRecipes[priority].has(boyNtelKey)) {
            processedNTELRecipes[priority].add(boyNtelKey);

            const flmInfo = getFilmasinByPriority(boyCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ntelStokKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
            // Miktar: Ağırlık based on target Çap (conservation of mass)
            const ntelFlmTuketimi = (Math.PI * (boyCap/20) * (boyCap/20) * 100 * 7.85 / 1000).toFixed(5); // kg per meter

            // CRITICAL FIX: Use 'AD' not 'MT' için NTEL
            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }

      // En direction NTEL recipes - generate için all 5 alternatif sheets
      if (enCap > 0 && enCap !== boyCap) {
        const enNtelKey = enCap.toString();

        const availablePriorities = getAvailablePriorities(enCap);
        for (const priority of availablePriorities) {
          if (!processedNTELRecipes[priority].has(enNtelKey)) {
            processedNTELRecipes[priority].add(enNtelKey);

            const flmInfo = getFilmasinByPriority(enCap, priority);
            if (!flmInfo) continue; // Should not happen but safety check

            const ntelStokKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
            const ntelFlmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * 100 * 7.85 / 1000).toFixed(5); // kg for 100m

            // CRITICAL FIX: Use 'AD' not 'MT' için NTEL
            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ntelSheets[priority].addRow([
              ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
          }
        }
      }
    });

    // ===== STANDALONE: Generate recipes için NCBK products without MM equivalents =====
    console.log('🚀 STANDALONE NCBK: Processing', allNCBKProducts.length, 'NCBK products for recipes');
    allNCBKProducts.forEach(ncbkProduct => {
      // Extract Çap and Uzunluk den stok_kodu (e.g., YM.NCBK.0650.202 -> cap=6.50, Uzunluk=202)
      const stokKodu = ncbkProduct.stok_kodu;
      if (!stokKodu) return; // Skip if no stok_kodu

      // FIXED: Normalize comma separator a Periyot before parsing
      const capStr = (ncbkProduct.cap || '0').toString().replace(',', '.');
      const cap = parseFloat(capStr);
      // FIXED: Extract Uzunluk den stok_kodu instead of length_cm Alan
      const length = parseInt(stokKodu.split('.').pop() || 0);

      // DEBUG: Log products ile diameters 4.70, 7.20, 9.40, 11.30
      if ([4.7, 7.2, 9.4, 11.3].includes(cap)) {
        console.log(`🔍 STANDALONE NCBK DEBUG: Found ${stokKodu} with cap=${cap}, length=${length}, capStr="${capStr}", original="${ncbkProduct.cap}"`);
      }

      if (cap > 0 && length > 0) {
        const availablePriorities = getAvailablePriorities(cap);

        // DEBUG: Log için special diameters
        if ([4.7, 7.2, 9.4, 11.3].includes(cap)) {
          console.log(`🔍 STANDALONE NCBK: ${stokKodu} passed validation, availablePriorities=${JSON.stringify(availablePriorities)}`);
        }

        // Generate recipes için all priorities
        for (const priority of availablePriorities) {
          const ncbkKey = `${cap}-${length}`;

          // Kontrol et if already processed den MM products
          if (!processedNCBKRecipes[priority].has(ncbkKey)) {
            processedNCBKRecipes[priority].add(ncbkKey);

            const flmInfo = getFilmasinByPriority(cap, priority);

            // DEBUG: Log için special diameters
            if ([4.7, 7.2, 9.4, 11.3].includes(cap)) {
              console.log(`🔍 STANDALONE NCBK: ${stokKodu} priority ${priority}, flmInfo=${flmInfo ? flmInfo.code : 'NULL'}`);
            }

            if (!flmInfo) continue;

            const ncbkFlmTuketimi = (Math.PI * (cap/20) * (cap/20) * length * 7.85 / 1000).toFixed(5);

            ncbkSheets[priority].addRow([
              stokKodu, '1', '', '', 'AD', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ncbkFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ncbkSheets[priority].addRow([
              stokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NCBK', { length: length, boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            console.log(`✅ STANDALONE NCBK: Generated recipe for ${stokKodu} (${cap}mm x ${length}cm) with priority ${priority}`);
          }
        }
      }
    });

    // ===== STANDALONE: Generate recipes için NTEL products without MM equivalents =====
    console.log('🚀 STANDALONE NTEL: Processing', allNTELProducts.length, 'NTEL products for recipes');
    allNTELProducts.forEach(ntelProduct => {
      // Extract Çap den stok_kodu (e.g., YM.NTEL.0650 -> cap=6.50)
      const stokKodu = ntelProduct.stok_kodu;
      if (!stokKodu) return; // Skip if no stok_kodu

      // FIXED: Normalize comma separator a Periyot before parsing
      const capStr = (ntelProduct.cap || '0').toString().replace(',', '.');
      const cap = parseFloat(capStr);

      // DEBUG: Log products ile diameters 4.70, 7.20, 9.19, 9.40, 11.30
      if ([4.7, 7.2, 9.19, 9.4, 11.3].includes(cap)) {
        console.log(`🔍 STANDALONE NTEL DEBUG: Found ${stokKodu} with cap=${cap}, capStr="${capStr}", original="${ntelProduct.cap}"`);
      }

      if (cap > 0) {
        const availablePriorities = getAvailablePriorities(cap);

        // DEBUG: Log için special diameters
        if ([4.7, 7.2, 9.19, 9.4, 11.3].includes(cap)) {
          console.log(`🔍 STANDALONE NTEL: ${stokKodu} passed validation, availablePriorities=${JSON.stringify(availablePriorities)}`);
        }

        // Generate recipes için all priorities
        for (const priority of availablePriorities) {
          const ntelKey = cap.toString();

          // Kontrol et if already processed den MM products
          if (!processedNTELRecipes[priority].has(ntelKey)) {
            processedNTELRecipes[priority].add(ntelKey);

            const flmInfo = getFilmasinByPriority(cap, priority);

            // DEBUG: Log için special diameters
            if ([4.7, 7.2, 9.19, 9.4, 11.3].includes(cap)) {
              console.log(`🔍 STANDALONE NTEL: ${stokKodu} priority ${priority}, flmInfo=${flmInfo ? flmInfo.code : 'NULL'}`);
            }

            if (!flmInfo) continue;

            const ntelFlmTuketimi = (Math.PI * (cap/20) * (cap/20) * 100 * 7.85 / 1000).toFixed(5);

            ntelSheets[priority].addRow([
              stokKodu, '1', '', '', 'MT', '1', 'Bileşen',
              flmInfo.code,
              '', toExcelDecimal(parseFloat(ntelFlmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            ntelSheets[priority].addRow([
              stokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
              '', '1', '', '', '', '', '', '', '', toExcelNumber(calculateOperationDuration('NTEL', { boyCap: flmInfo.diameter, enCap: flmInfo.diameter })),
              'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);

            console.log(`✅ STANDALONE NTEL: Generated recipe for ${stokKodu} (${cap}mm) with priority ${priority}`);
          }
        }
      }
    });

    // Save the merged Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Bulk_Celik_Hasir_Recete_${timestamp}.xlsx`);

    console.log('🚀 BULK MERGED RECETE: Excel generation completed');
  };

  // Recipe kayıtlarını veritabanına kaydet
  const saveRecipeData = async (product, chResult, ncbkResults, ntelResult) => {
    console.log(`🍳 RECIPE DEBUG - Starting recipe save for:`, {
      chStokKodu: chResult?.stok_kodu,
      ncbkCount: Object.keys(ncbkResults || {}).length,
      ntelStokKodu: ntelResult?.stok_kodu,
      hasirTipi: product.hasirTipi,
      cubukSayisiBoy: product.cubukSayisiBoy,
      cubukSayisiEn: product.cubukSayisiEn
    });
    
    try {
      console.log('*** saveRecipeData - ncbkResults keys:', Object.keys(ncbkResults));
      console.log('*** Product details - boyCap:', product.boyCap, 'enCap:', product.enCap, 'uzunlukBoy:', product.uzunlukBoy, 'uzunlukEn:', product.uzunlukEn);
      console.log('🚨 CRITICAL DEBUG - RECEIVED CUBUK VALUES:', {
        cubukSayisiBoy: product.cubukSayisiBoy,
        cubukSayisiEn: product.cubukSayisiEn,
        productType: typeof product.cubukSayisiEn,
        isNumber: !isNaN(product.cubukSayisiEn)
      });
      
      // DEFENSIVE Kontrol et: Ensure we have Geçerli numbers
      const boyCubukValue = parseInt(product.cubukSayisiBoy) || 0;
      const enCubukValue = parseInt(product.cubukSayisiEn) || 0;
      
      console.log('🔒 FINAL VALUES BEING SAVED TO DATABASE:', {
        boyCubukValue,
        enCubukValue,
        hasirTipi: product.hasirTipi,
        uzunlukBoy: product.uzunlukBoy,
        uzunlukEn: product.uzunlukEn
      });
      
      // GENERATE NCBK codes ile NaN protection - ensure no NaN in bilesen_kodu
      const boyCap = parseFloat(product.boyCap || 0) || 0;
      const enCap = parseFloat(product.enCap || 0) || 0;
      const uzunlukBoy = parseInt(product.uzunlukBoy || 0) || 0;
      const uzunlukEn = parseInt(product.uzunlukEn || 0) || 0;
      
      const boyBilesenKodu = `YM.NCBK.${safeCapToCode(boyCap)}.${uzunlukBoy}`;
      const enBilesenKodu = `YM.NCBK.${safeCapToCode(enCap)}.${uzunlukEn}`;
      
      console.log('*** Generated BOY ÇUBUĞU:', boyBilesenKodu);
      console.log('*** Generated EN ÇUBUĞU:', enBilesenKodu);
      
      // CH Reçete kayıtları
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

      // NCBK Reçete kayıtları - Only Oluştur recipes için NEWLY created NCBK products
      console.log('🔍 NCBK Recipe Creation - ncbkResults:', ncbkResults);
      
      // Deduplicate NCBKs ile stok_kodu a prevent creating duplicate recipes
      const processedNcbkStokKodus = new Set();
      
      for (const [key, ncbkResult] of Object.entries(ncbkResults)) {
        console.log(`📋 Processing NCBK recipe for key "${key}":`, {
          stok_kodu: ncbkResult?.stok_kodu,
          message: ncbkResult?.message,
          status: ncbkResult?.status
        });
        
        // Skip değilse a Geçerli result
        if (!ncbkResult || !ncbkResult.stok_kodu) {
          console.log(`⏭️ Skipping NCBK recipe - invalid result for key "${key}"`);
          return;
        }
        
        // Skip if we've already processed this stok_kodu a prevent duplicate recipes
        if (processedNcbkStokKodus.has(ncbkResult.stok_kodu)) {
          console.log(`⏭️ Skipping NCBK recipe - already processed: ${ncbkResult.stok_kodu} (key: ${key})`);
          return;
        }
        
        // Only Oluştur recipes için NCBKs that were NEWLY created in this Kaydet operation
        if (!ncbkResult.isNewlyCreated) {
          console.log(`⏭️ Skipping NCBK recipe - not newly created: ${ncbkResult.stok_kodu} (status: ${ncbkResult.status}, message: ${ncbkResult.message})`);
          return;
        }
        
        // Mark this stok_kodu olarak processed
        processedNcbkStokKodus.add(ncbkResult.stok_kodu);
        
        console.log(`✅ Creating recipes for NEWLY created NCBK: ${ncbkResult.stok_kodu} (isNewlyCreated: true)`);
        
        // Extract cap and Uzunluk den stok_kodu (e.g., YM.NCBK.0500.465 -> cap=5.0, Uzunluk=465)
        const stokParts = ncbkResult.stok_kodu.match(/YM\.NCBK\.(\d{4})\.(\d+)/);
        if (!stokParts) {
          console.warn('Invalid NCBK stok kodu format:', ncbkResult.stok_kodu);
          return;
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
            bilesen_kodu: getFilmasinKodu(ncbkCap),
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

      // NTEL Reçete kayıtları - Only Oluştur recipes için NEWLY created NTEL products
      if (ntelResult && ntelResult.stok_kodu && ntelResult.isNewlyCreated) {
        console.log(`✅ Creating recipes for NEWLY created NTEL: ${ntelResult.stok_kodu} (isNewlyCreated: true)`);
        // Extract cap den stok_kodu (e.g., YM.NTEL.0650 -> cap=6.5)
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
            bilesen_kodu: getFilmasinKodu(ntelCap),
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
            uretim_suresi: calculateOperationDuration('NTEL', { ...product, boyCap: getFilmasinByPriority(ntelCap, 0)?.diameter || ntelCap })
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

  // Sequence güncelleme ile dual backup system
  const updateSequences = async (product, actualSequenceNumber = null) => {
    try {
      console.log('*** Updating sequences with dual backup system');
      
      // CH sequence güncelle ile UPSERT operation
      // CRITICAL FIX: Kontrol et stok_kodu first a determine if it's OZL or STD
      let isStandard = false;
      let kod2 = 'OZL'; // Default to OZL
      
      // If Ürün has a stok_kodu, use that a determine Tip
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
        // Fallback a dimension-based classification only if no stok_kodu
        isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                     (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25');
        kod2 = isStandard ? 'STD' : 'OZL';
        console.log('*** Product classified based on dimensions - isStandard:', isStandard, 'kod2:', kod2);
      }
      
      console.log('*** Final classification - kod2:', kod2, 'isStandard:', isStandard);
      const capCode = isStandard ? safeCapToCode(product.boyCap) : '';
      
      // için OZL products, implement dual sequence Kontrol et and Güncelle
      if (kod2 === 'OZL' && actualSequenceNumber) {
        console.log('*** OZL product - checking both backup and actual sequences');

        // Use exact key match a avoid picking up rows ile NULL cap_code
        const ozlSequenceKey = 'CH_OZL_';
        const ozlBackupKey = 'CH_OZL_BACKUP_';

        let currentActual = sequences[ozlSequenceKey] || 2443;
        let currentBackup = sequences[ozlBackupKey] || 2443;
        
        console.log('*** Current sequences - Actual:', currentActual, 'Backup:', currentBackup, 'New:', actualSequenceNumber);
        
        // Take the bigger sequence Sayı and Güncelle both if needed
        const maxSequence = Math.max(currentActual, currentBackup, actualSequenceNumber);
        
        // Güncelle actual sequence if it's stale
        if (maxSequence > currentActual) {
          console.log('*** Updating stale actual sequence from', currentActual, 'to', maxSequence);
          
          // First, Bul the existing sequence ID
          const existingSequenceResponse = await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=OZL`);
          if (existingSequenceResponse.ok) {
            const allSequences = await existingSequenceResponse.json();
            console.log('🔍 CRITICAL DEBUG - Backend returned:', allSequences.length, 'rows');
            
            // FRONTEND FILTERING - Backend Sorgu is buggy, Filtrele here
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
              
              // Güncelle existing sequence using PUT - FIRST OZL ROW [0]
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
        
        // Güncelle backup sequence if it's stale
        if (maxSequence > currentBackup) {
          console.log('*** Updating stale backup sequence from', currentBackup, 'to', maxSequence);
          
          // First, Bul the existing backup sequence ID
          const existingBackupResponse = await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=OZL_BACKUP`);
          if (existingBackupResponse.ok) {
            const allBackups = await existingBackupResponse.json();
            console.log('🔍 CRITICAL DEBUG - Backend returned:', allBackups.length, 'backup rows');
            
            // FRONTEND FILTERING - Backend Sorgu is buggy, Filtrele here
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
              
              // Güncelle existing backup sequence using PUT - FIRST OZL_BACKUP ROW [0]
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
        
        // Güncelle local sequences State a reflect the changes
        const updatedSequences = { ...sequences };
        updatedSequences[ozlSequenceKey] = maxSequence;
        updatedSequences[ozlBackupKey] = maxSequence;
        setSequences(updatedSequences);
        
        console.log('*** Dual sequence update completed. Both sequences now at:', maxSequence);
      } else if (kod2 === 'STD') {
        // için STD products only - Güncelle existing sequence, don't Oluştur new ones!
        console.log('*** STD product - updating specific cap code sequence for capCode:', capCode);
        
        // First, Bul the existing STD sequence için this cap_code
        const existingStdResponse = await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=STD&cap_code=${capCode}`);
        if (existingStdResponse.ok) {
          const existingStdSequences = await existingStdResponse.json();
          console.log('*** Found existing STD sequences for cap_code', capCode, ':', existingStdSequences);
          
          if (existingStdSequences.length > 0) {
            // Güncelle existing STD sequence using PUT
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
        // OZL Ürün without actualSequenceNumber - do nothing, don't Güncelle any sequences
        console.log('*** OZL product without sequence number - skipping sequence update');
      }
      
    } catch (error) {
      console.error('Sequence güncelleme hatası:', error);
    }
  };

  // Veritabanına kaydet
  const saveToDatabase = async (products, keepProgressForExcel = false) => {
    console.log(`🚨🚨🚨 saveToDatabase CALLED with ${products?.length || 0} products, keepProgress: ${keepProgressForExcel} 🚨🚨🚨`);
    try {
      // Sıfırla batch sequence counter için new batch
      resetBatchSequenceCounter();
      
      // Başlat batch sequence before any stok kodu generation
      await initializeBatchSequence();
      
      setIsLoading(true);
      setIsSavingToDatabase(true);
      setDatabaseProgress({ current: 0, total: 0, operation: 'Veritabanı kontrol ediliyor...', currentProduct: '' });
      
      // Optimization Kontrol et removed - Kaydet products ile or without optimization
      
      // Sadece kaydedilmesi gereken ürünleri kaydet
      const productsToSave = getProductsToSave();
      
      if (productsToSave.length === 0) {
        toast.warning('Kaydedilecek ürün bulunamadı.');
        return;
      }

      // Skip database refresh during Kaydet a avoid timeout - use existing Veri
      setDatabaseProgress({ current: 0, total: 0, operation: 'Mevcut veriler kullanılıyor...', currentProduct: '' });
      
      console.log('Using existing database state for save operation (avoiding timeout)');
      
      // Use existing savedProducts instead of fetching fresh Veri a avoid timeout
      const freshSavedProducts = savedProducts;
      
      console.log('Fresh database state:', {
        mm: freshSavedProducts.mm.length,
        ncbk: freshSavedProducts.ncbk.length,
        ntel: freshSavedProducts.ntel.length,
        mmCodes: freshSavedProducts.mm.map(p => p.stok_kodu)
      });
      
      setSavedProducts(freshSavedProducts);
      
      // Oluştur a Map et of Stok Adı a all related Stok Kodus
      const stokAdiToStokKodusMap = new Map();
      
      // Map et all existing products ile Stok Adı
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
      
      // OPTIMIZATION: Skip redundant duplicate detection - getProductsToSave() already filtered
      console.log('⚡ PERFORMANCE OPTIMIZATION: Skipping redundant duplicate detection, using pre-filtered products');
      const newProducts = productsToSave; // Already filtered by getProductsToSave()
      const skippedProducts = []; // No skipped products since getProductsToSave() already handled filtering
      const batchDuplicates = []; // No batch duplicates since we're using pre-filtered data
      
      // OPTIMIZATION COMPLETE: Removed redundant duplicate checking loop entirely
      
      console.log('Filtreleme sonuçları:', {
        totalProducts: productsToSave.length,
        newProducts: newProducts.length,
        skippedProducts: skippedProducts.length
      });
      
      if (newProducts.length === 0) {
        // Göster detailed info about skipped products ile their existing Stok Kodus
        const allSkippedStokKodus = new Set();
        skippedProducts.forEach(p => {
          // Collect all Stok Kodus den all variants (CH, NCBK, NTEL)
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
        
        // Göster a more detailed Modal ile all Stok Kodus
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
      
      // OPTIMIZATION: Create batch-level cache to avoid redundant NCBK/NTEL operations
      const batchNcbkCache = new Map(); // stok_kodu -> result
      const batchNtelCache = new Map(); // stok_kodu -> result
      let ncbkCacheHits = 0;
      let ntelCacheHits = 0;
      let ncbkApiCalls = 0;
      let ntelApiCalls = 0;
      console.log('⚡ OPTIMIZATION: Using batch-level NCBK/NTEL cache to eliminate redundant operations');

      // Ekle comprehensive logging a track Kaydet İşlem
      let successfulSaves = 0;
      let failedSaves = 0;
      let skippedSaves = 0;
      const saveResults = [];
      
      console.log('🔥 DATABASE SAVE PROCESS STARTING:', {
        totalNewProducts: newProducts.length,
        firstProduct: newProducts[0] ? {
          hasirTipi: newProducts[0].hasirTipi,
          boyCap: newProducts[0].boyCap,
          enCap: newProducts[0].enCap,
          cap: newProducts[0].cap,
          cap2: newProducts[0].cap2,
          allFieldNames: Object.keys(newProducts[0])
        } : 'none'
      });
      
      // Log all Alan names için first few products a understand Excel structure
      if (newProducts.length > 0) {
        console.log('🔍 EXCEL FIELD ANALYSIS - First 3 products field names:');
        for (let idx = 0; idx < Math.min(3, newProducts.length); idx++) {
          const productFields = Object.keys(newProducts[idx]);
          console.log(`  Product ${idx + 1} fields:`, productFields.join(', '));
          
          // Look için Çap-related fields
          const diameterFields = productFields.filter(field => 
            field.toLowerCase().includes('cap') || 
            field.toLowerCase().includes('diameter') || 
            field.toLowerCase().includes('çap') ||
            field.toLowerCase().includes('boy') ||
            field.toLowerCase().includes('en')
          );
          console.log(`  Product ${idx + 1} diameter-related fields:`, diameterFields);
        }
      }

      // Sadece YENİ ürünler için CH, NCBK ve NTEL kayıtları oluştur
      for (let i = 0; i < newProducts.length; i++) {
        const product = newProducts[i];
        processedCount++;
        setDatabaseProgress({ 
          current: processedCount, 
          total: totalCount, 
          operation: 'Veritabanına kaydediliyor...',
          currentProduct: `${product.hasirTipi} (${product.uzunlukBoy}x${product.uzunlukEn}cm)`
        });
        
        console.log(`🔍 PROCESSING PRODUCT ${i + 1}/${newProducts.length}: ${product.hasirTipi} ${product.uzunlukBoy}x${product.uzunlukEn} - boyCap=${product.boyCap}, enCap=${product.enCap}, cap=${product.cap}, cap2=${product.cap2}`);
        // CH kaydı - CRITICAL: Ensure kgValue is never NaN
        console.log(`📊 SAVE DEBUG [${i+1}/${newProducts.length}] - Product:`, {
          hasirTipi: product.hasirTipi,
          boyCap: product.boyCap,
          enCap: product.enCap,
          uzunlukBoy: product.uzunlukBoy,
          uzunlukEn: product.uzunlukEn,
          cubukSayisiBoy: product.cubukSayisiBoy,
          cubukSayisiEn: product.cubukSayisiEn,
          adetKg: product.adetKg,
          totalKg: product.totalKg
        });
        
        // Use helper function a Al clean kg Değer
        const kgValue = getCleanKgValue(product) || 0.1; // Minimum weight to prevent NaN/0
        console.log(`📊 SAVE DEBUG - kgValue after validation: ${kgValue}`);
        
        
        // Generate stok_kodu and capture it için sequence tracking
        let generatedStokKodu = generateStokKodu(product, 'CH', i);
        
        
        // CRITICAL FIX: Dynamic Alan detection and mapping
        // İşle Alan mapping between Excel import flow and Form flow
        // Excel import may use completely different Alan names
        
        // Dynamic Alan detection based on Alan names
        const productFields = Object.keys(product);
        
        // Bul Çap fields - EXACT match first
        let boyCapField = 'boyCap';  // Default to expected field name
        let enCapField = 'enCap';    // Default to expected field name
        
        // Kontrol et if these fields actually exist
        if (!product.hasOwnProperty('boyCap')) {
          console.log(`  ⚠️ boyCap field not found, searching alternatives...`);
          boyCapField = productFields.find(f => 
            f === 'cap' || 
            f === 'Boy Çap' ||
            f === 'Boy Cap' ||
            f === 'Çap (Boy)' ||
            f === 'Boy Çapı' ||
            f.toLowerCase() === 'boycap' ||
            f.toLowerCase() === 'boy_cap'
          ) || null;
        }
        
        if (!product.hasOwnProperty('enCap')) {
          console.log(`  ⚠️ enCap field not found, searching alternatives...`);
          enCapField = productFields.find(f => 
            f === 'cap2' || 
            f === 'En Çap' ||
            f === 'En Cap' ||
            f === 'Çap (En)' ||
            f === 'En Çapı' ||
            f.toLowerCase() === 'encap' ||
            f.toLowerCase() === 'en_cap'
          ) || null;
        }
        
        // If still not found, look için any Alan containing Çap/çap values
        if (!boyCapField || !enCapField) {
          console.log(`  ⚠️ Standard cap fields not found, searching for alternative fields...`);
          
          // Look için fields that might contain Çap Veri
          const capFields = productFields.filter(f => 
            f.toLowerCase().includes('çap') || 
            f.toLowerCase().includes('cap') ||
            f.toLowerCase().includes('diameter')
          );
          
          console.log(`  Found ${capFields.length} cap-related fields:`, capFields);
          
          // Dene a intelligently assign them
          if (capFields.length >= 2) {
            boyCapField = capFields[0];
            enCapField = capFields[1];
          } else if (capFields.length === 1) {
            // If only one cap Alan, use it için both
            boyCapField = capFields[0];
            enCapField = capFields[0];
          }
        }
        
        // Bul dimension fields dynamically
        const uzunlukBoyField = productFields.find(f =>
          f.toLowerCase().includes('uzunlukboy') ||
          f.toLowerCase().includes('uzunluk_boy') ||
          f.toLowerCase().includes('ebat_boy') ||
          f.toLowerCase().includes('boy') ||
          f === 'uzunlukBoy'
        );
        
        const uzunlukEnField = productFields.find(f =>
          f.toLowerCase().includes('uzunluken') ||
          f.toLowerCase().includes('uzunluk_en') ||
          f.toLowerCase().includes('ebat_en') ||
          f.toLowerCase().includes('en') ||
          f === 'uzunlukEn'
        );
        
        console.log(`  DYNAMIC FIELD DETECTION for product ${i + 1}:`, {
          boyCapField: boyCapField || 'NOT FOUND',
          enCapField: enCapField || 'NOT FOUND', 
          uzunlukBoyField: uzunlukBoyField || 'NOT FOUND',
          uzunlukEnField: uzunlukEnField || 'NOT FOUND'
        });
        
        // Extract actual values den detected fields
        const extractedBoyCap = boyCapField ? product[boyCapField] : null;
        const extractedEnCap = enCapField ? product[enCapField] : null;
        const extractedUzunlukBoy = uzunlukBoyField ? product[uzunlukBoyField] : null;
        const extractedUzunlukEn = uzunlukEnField ? product[uzunlukEnField] : null;
        
        console.log(`  EXTRACTED RAW VALUES:`);
        console.log(`    boyCap: field="${boyCapField}" value="${extractedBoyCap}"`);
        console.log(`    enCap: field="${enCapField}" value="${extractedEnCap}"`);
        console.log(`    uzunlukBoy: field="${uzunlukBoyField}" value="${extractedUzunlukBoy}"`);
        console.log(`    uzunlukEn: field="${uzunlukEnField}" value="${extractedUzunlukEn}"`);
        
        // Parse et and Doğrula extracted values
        let parsedBoyCap = parseFloat(extractedBoyCap);
        let parsedEnCap = parseFloat(extractedEnCap);

        // 🔧 COMPREHENSIVE FIX: Prevent systematic 2-decimal a 1-decimal rounding
        // This preserves exact Çap values and prevents systematic rounding issues
        const preserveExactDiameter = (value) => {
          // Primary fixes için known problematic values
          if (Math.abs(value - 4.8) < 0.01) return 4.75; // Fix 4.8 back to 4.75
          if (Math.abs(value - 4.5) < 0.01) return 4.45; // Fix 4.5 back to 4.45

          // Comprehensive fix: Kontrol et if Değer appears a be rounded a 1 decimal
          // ile comparing ile known 2-decimal values den FILMASIN_MAPPING
          const knownPreciseValues = [4.45, 4.50, 4.75, 4.85, 5.00, 5.50, 6.00, 6.50, 7.00, 7.50, 7.80, 8.00, 8.50, 8.60, 9.19, 9.20, 10.60];

          // için each precise Değer, Kontrol et if current Değer is its 1-decimal rounded version
          for (const precise of knownPreciseValues) {
            const rounded = Math.round(precise * 10) / 10; // Round to 1 decimal
            if (Math.abs(value - rounded) < 0.01 && precise !== rounded) {
              console.log(`🔧 DIAMETER FIX: Correcting ${value} back to ${precise}`);
              return precise; // Return the precise 2-decimal value
            }
          }

          return value;
        };

        // Apply surgical fix a prevent rounding
        if (!isNaN(parsedBoyCap)) {
          parsedBoyCap = preserveExactDiameter(parsedBoyCap);
        }
        if (!isNaN(parsedEnCap)) {
          parsedEnCap = preserveExactDiameter(parsedEnCap);
        }
        
        // If parsing fails, Göster detailed Hata
        if (isNaN(parsedBoyCap) || parsedBoyCap === 0) {
          console.error(`  ❌ Failed to parse boyCap: raw="${extractedBoyCap}", parsed=${parsedBoyCap}`);
          // Dene alternative fields
          const altBoyCap = parseFloat(product.boyCap) || parseFloat(product.cap) || parseFloat(product['Boy Çap']) || parseFloat(product['Çap']);
          if (!isNaN(altBoyCap) && altBoyCap > 0) {
            console.log(`  ✅ Found alternative boyCap value: ${altBoyCap}`);
            parsedBoyCap = altBoyCap;
          }
        }
        
        if (isNaN(parsedEnCap) || parsedEnCap === 0) {
          console.error(`  ❌ Failed to parse enCap: raw="${extractedEnCap}", parsed=${parsedEnCap}`);
          // Dene alternative fields
          const altEnCap = parseFloat(product.enCap) || parseFloat(product.cap2) || parseFloat(product['En Çap']) || parseFloat(product['Çap2']);
          if (!isNaN(altEnCap) && altEnCap > 0) {
            console.log(`  ✅ Found alternative enCap value: ${altEnCap}`);
            parsedEnCap = altEnCap;
          }
        }
        
        const productWithValidCaps = {
          ...product,
          // Use parsed values ile validation
          boyCap: !isNaN(parsedBoyCap) ? parsedBoyCap : 0,
          enCap: !isNaN(parsedEnCap) ? parsedEnCap : 0,
          uzunlukBoy: extractedUzunlukBoy || product.uzunlukBoy || product.ebat_boy || 0,
          uzunlukEn: extractedUzunlukEn || product.uzunlukEn || product.ebat_en || 0,
          hasirTipi: product.hasirTipi || product.hasir_tipi || '',
          cubukSayisiBoy: product.cubukSayisiBoy || product.ic_cap_boy_cubuk_ad || 0,
          cubukSayisiEn: product.cubukSayisiEn || product.dis_cap_en_cubuk_ad || 0
        };
        
        // Ekle extensive logging a debug Alan mapping issues
        console.log(`🔍 FIELD MAPPING DEBUG for product ${i + 1}:`);
        console.log('  RAW PRODUCT DATA:', JSON.stringify(product, null, 2));
        console.log('  MAPPED VALUES:', JSON.stringify({
          boyCap: productWithValidCaps.boyCap,
          enCap: productWithValidCaps.enCap,
          hasirTipi: productWithValidCaps.hasirTipi,
          uzunlukBoy: productWithValidCaps.uzunlukBoy,
          uzunlukEn: productWithValidCaps.uzunlukEn
        }, null, 2));
        
        // Generate and Doğrula the problematic fields ile ensured Geçerli caps
        let generatedStokAdi = generateStokAdi(productWithValidCaps, 'CH');
        let generatedIngilizceIsim = generateIngilizceIsim(productWithValidCaps, 'CH');
        
        console.log(`  GENERATED STRINGS:`);
        console.log(`    stokAdi: "${generatedStokAdi}"`);
        console.log(`    ingilizceIsim: "${generatedIngilizceIsim}"`);
        console.log(`    stokAdi contains NaN: ${generatedStokAdi.includes('NaN')}`);
        console.log(`    ingilizceIsim contains NaN: ${generatedIngilizceIsim.includes('NaN')}`);
        
        // Character-ile-character inspection if NaN detected
        if (generatedStokAdi.includes('NaN') || generatedIngilizceIsim.includes('NaN')) {
          console.log(`🚨 NaN DETECTED! Breaking down strings:`);
          console.log(`    stokAdi chars: ${generatedStokAdi.split('').map((c,i) => `${i}:'${c}'`).join(' ')}`);
          console.log(`    ingilizceIsim chars: ${generatedIngilizceIsim.split('').map((c,i) => `${i}:'${c}'`).join(' ')}`);
        }
        
        // CRITICAL: Doğrula that no NaN values made it through
        if (generatedStokAdi.includes('NaN') || generatedIngilizceIsim.includes('NaN')) {
          console.error('🚨 CRITICAL ERROR: NaN detected in generated strings for product', i + 1, '!', {
            productIndex: i,
            stokAdi: generatedStokAdi,
            ingilizceIsim: generatedIngilizceIsim,
            originalProduct: product,
            mappedValues: productWithValidCaps
          });
          
          // Instead of skipping, Dene a fix the values ile fallback defaults
          const fallbackStokAdi = `${normalizeHasirTipi(productWithValidCaps.hasirTipi || '')} Çap(0x0 mm) Ebat(${productWithValidCaps.uzunlukBoy || 0}x${productWithValidCaps.uzunlukEn || 0} cm)`;
          const fallbackIngilizceIsim = `Wire Mesh- ${productWithValidCaps.hasirTipi || ''} Dia(0x0 mm) Size(${productWithValidCaps.uzunlukBoy || 0}x${productWithValidCaps.uzunlukEn || 0} cm)`;
          
          console.warn('🔧 Using fallback values for product', i + 1, ':', {
            fallbackStokAdi,
            fallbackIngilizceIsim
          });
          
          // Use fallback values instead of skipping the Ürün
          generatedStokAdi = fallbackStokAdi;
          generatedIngilizceIsim = fallbackIngilizceIsim;
        }
        
        
        const chData = {
          stok_kodu: generatedStokKodu,
          stok_adi: generatedStokAdi,
          grup_kodu: 'MM',
          kod_1: 'HSR',
          kod_2: (product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                  (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25')) ? 'STD' : 'OZL',
          ingilizce_isim: generatedIngilizceIsim,
          // Standard columns den SQL
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
          // Ürün specific columns - CRITICAL: Database expects DECIMAL types
          // Use the mapped values den productWithValidCaps a ensure consistency
          hasir_tipi: normalizeHasirTipi(productWithValidCaps.hasirTipi),
          cap: (() => {
            const val = parseFloat(productWithValidCaps.boyCap) || 0;
            // 🔧 COMPREHENSIVE FIX: Prevent systematic Çap rounding
            const knownPrecise = [4.45, 4.50, 4.75, 4.85, 5.00, 5.50, 6.00, 6.50, 7.00, 7.50, 7.80, 8.00, 8.50, 8.60, 9.19, 9.20, 10.60];
            for (const precise of knownPrecise) {
              if (Math.abs(val - Math.round(precise * 10) / 10) < 0.01 && precise !== Math.round(precise * 10) / 10) {
                return precise;
              }
            }
            return val;
          })(),
          cap2: (() => {
            const val = parseFloat(productWithValidCaps.enCap) || 0;
            // 🔧 COMPREHENSIVE FIX: Prevent systematic Çap rounding
            const knownPrecise = [4.45, 4.50, 4.75, 4.85, 5.00, 5.50, 6.00, 6.50, 7.00, 7.50, 7.80, 8.00, 8.50, 8.60, 9.19, 9.20, 10.60];
            for (const precise of knownPrecise) {
              if (Math.abs(val - Math.round(precise * 10) / 10) < 0.01 && precise !== Math.round(precise * 10) / 10) {
                return precise;
              }
            }
            return val;
          })(),
          ebat_boy: parseFloat(productWithValidCaps.uzunlukBoy) || 0,  // Database: DECIMAL
          ebat_en: parseFloat(productWithValidCaps.uzunlukEn) || 0,    // Database: DECIMAL
          goz_araligi: formatGozAraligi(productWithValidCaps) || '',
          kg: parseFloat(kgValue) || 0,
          ic_cap_boy_cubuk_ad: parseInt(productWithValidCaps.cubukSayisiBoy) || 0,
          dis_cap_en_cubuk_ad: parseInt(productWithValidCaps.cubukSayisiEn) || 0,
          hasir_sayisi: 1,
          cubuk_sayisi_boy: parseInt(productWithValidCaps.cubukSayisiBoy || 0) || 0,
          cubuk_sayisi_en: parseInt(productWithValidCaps.cubukSayisiEn || 0) || 0,
          adet_kg: parseFloat(kgValue.toFixed(5)) || 0,
          toplam_kg: parseFloat(kgValue.toFixed(5)) || 0,
          hasir_turu: 'MM',
          // Default values den SQL
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
          
          // CRITICAL VALIDATION: Kontrol et için NaN before saving a database
          if (chData.stok_adi && chData.stok_adi.includes('NaN')) {
            console.error('🔥 NaN DETECTED in stok_adi:', chData.stok_adi);
          }
          if (chData.ingilizce_isim && chData.ingilizce_isim.includes('NaN')) {
            console.error('🔥 NaN DETECTED in ingilizce_isim:', chData.ingilizce_isim);
          }
          
          console.log(`🔍 DEBUG - CH Data being saved:`);
          console.log(`  stok_kodu: ${chData.stok_kodu}, stok_adi: "${chData.stok_adi}"`);
          console.log(`  cap: ${chData.cap}, cap2: ${chData.cap2}, ebat: ${chData.ebat_boy}x${chData.ebat_en}`);
          console.log(`  hasir_tipi: ${chData.hasir_tipi}, goz_araligi: ${chData.goz_araligi}`);
          console.log(`  kg: ${chData.kg}, cubuk: ${chData.cubuk_sayisi_boy}x${chData.cubuk_sayisi_en}`);
          
          // Kontrol et için any NaN or Geçersiz values
          const invalidFields = [];
          if (isNaN(chData.cap) || chData.cap <= 0) invalidFields.push(`cap: ${chData.cap}`);
          if (isNaN(chData.cap2) || chData.cap2 <= 0) invalidFields.push(`cap2: ${chData.cap2}`);
          if (isNaN(chData.ebat_boy) || chData.ebat_boy <= 0) invalidFields.push(`ebat_boy: ${chData.ebat_boy}`);
          if (isNaN(chData.ebat_en) || chData.ebat_en <= 0) invalidFields.push(`ebat_en: ${chData.ebat_en}`);
          if (isNaN(chData.kg) || chData.kg <= 0) invalidFields.push(`kg: ${chData.kg}`);
          if (isNaN(chData.cubuk_sayisi_boy) || chData.cubuk_sayisi_boy <= 0) invalidFields.push(`cubuk_sayisi_boy: ${chData.cubuk_sayisi_boy}`);
          if (isNaN(chData.cubuk_sayisi_en) || chData.cubuk_sayisi_en <= 0) invalidFields.push(`cubuk_sayisi_en: ${chData.cubuk_sayisi_en}`);
          
          if (invalidFields.length > 0) {
            console.error(`❌ INVALID FIELDS DETECTED in CH Data:`, invalidFields);
          }

          chResponse = await fetchWithRetry(API_URLS.celikHasirMm, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chData)
          }, 3, 500, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: msg })));
          
          console.log(`📊 SAVE DEBUG - CH Response status: ${chResponse.status}`);
          
          if (chResponse.status === 409) {
            // Duplicate detected - Dene ile İleri sequence Sayı
            console.log(`*** DUPLICATE DETECTED: ${chData.stok_kodu} already exists, retrying with next sequence`);
            
            // Increment sequence counter and Dene again (max 3 attempts)
            let retryAttempts = 0;
            let retrySuccess = false;
            
            while (retryAttempts < 3 && !retrySuccess) {
              retryAttempts++;
              batchSequenceCounter++; // Increment to get next sequence number
              const newStokKodu = `CHOZL${String(batchSequenceCounter).padStart(4, '0')}`;
              console.log(`*** Retry attempt ${retryAttempts}: trying with ${newStokKodu}`);
              
              // Güncelle the chData ile new stok_kodu
              chData.stok_kodu = newStokKodu;
              
              // Dene saving again
              const retryResponse = await fetchWithRetry(`${API_URLS.celikHasirMm}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chData)
              }, 2, 500, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: `${msg} (retry ${retryAttempts})` })));
              
              if (retryResponse.ok) {
                console.log(`*** Retry successful with ${newStokKodu}`);
                chResult = await retryResponse.json();
                generatedStokKodu = newStokKodu; // Update the generated code for sequence tracking
                retrySuccess = true;
                
                // CRITICAL FIX: Güncelle the Ürün in newProducts ile the retry Stok code
                newProducts[i] = {
                  ...newProducts[i],
                  existingStokKodu: newStokKodu,
                  stokAdi: chData.stok_adi,
                  ingilizceIsim: chData.ingilizce_isim
                };
                console.log(`🔧 RETRY FIXED: Updated newProducts[${i}] with retry existingStokKodu:`, newStokKodu);
              } else if (retryResponse.status === 409) {
                console.log(`*** ${newStokKodu} also exists, trying next sequence`);
                // Continue loop a Dene İleri Sayı
              } else {
                throw new Error(`CH kaydı başarısız: ${retryResponse.status} (retry ${retryAttempts})`);
              }
            }
            
            if (!retrySuccess) {
              console.error(`*** Failed to save CH after 3 retry attempts`);
              toast.error(`Kayıt başarısız: 3 deneme sonucu duplicate hatası`);
              return; // Skip this product
            }
          } else if (!chResponse.ok) {
            throw new Error(`CH kaydı başarısız: ${chResponse.status}`);
          } else {
            chResult = await chResponse.json();
            successfulSaves++;
            console.log(`✅ SUCCESSFUL SAVE ${successfulSaves}/${newProducts.length}:`, {
              product: i + 1,
              stokKodu: chData.stok_kodu,
              stokAdi: chData.stok_adi,
              saved: true
            });
            
            // CRITICAL FIX: Güncelle the Ürün in newProducts ile the saved stok_kodu
            newProducts[i] = {
              ...newProducts[i],
              existingStokKodu: chData.stok_kodu,
              stokAdi: chData.stok_adi,
              ingilizceIsim: chData.ingilizce_isim
            };
            console.log(`🔧 FIXED: Updated newProducts[${i}] with existingStokKodu:`, chData.stok_kodu);
          }
          
          // Track the Kaydet result
          saveResults.push({
            productIndex: i + 1,
            stokKodu: chData.stok_kodu,
            success: chResult ? true : false,
            error: chResult ? null : 'Save failed'
          });

          // NCBK kayıtları (Boy ve En için ayrı ayrı - gerçek boyutları kullan)
          // Database should Oluştur ALL NCBKs including duplicates için Reçete accuracy
          const boyLength = parseInt(product.uzunlukBoy) || 0;
          const enLength = parseInt(product.uzunlukEn) || 0;

          console.log(`🔍 NCBK LENGTH DEBUG:`, {
            uzunlukBoy: product.uzunlukBoy,
            uzunlukEn: product.uzunlukEn,
            boyLength,
            enLength
          });

          const allNcbkSpecs = [
            { cap: product.boyCap, length: boyLength, type: 'boy' },
            { cap: product.enCap, length: enLength, type: 'en' }
          ].filter(spec => spec.cap > 0 && spec.length > 0); // ✅ Only create NCBK if both cap and length are valid
          
          // Deduplicate NCBK specs a prevent creating same Ürün twice (and thus duplicate recipes)
          const seenStokKodus = new Set();
          const ncbkSpecs = allNcbkSpecs.filter(spec => {
            const stokKodu = `YM.NCBK.${safeCapToCode(spec.cap)}.${spec.length}`;
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
            const ncbkStokKodu = `YM.NCBK.${safeCapToCode(cap)}.${length}`;
            
            // OPTIMIZATION: Kontrol et batch cache first
            if (batchNcbkCache.has(ncbkStokKodu)) {
              const cachedResult = batchNcbkCache.get(ncbkStokKodu);
              ncbkCacheHits++;
              console.log(`⚡ CACHE HIT: Using cached NCBK result for ${ncbkStokKodu} (hit #${ncbkCacheHits})`);
              const specKey = `${spec.type}-${cap}-${length}`;
              ncbkResults[specKey] = cachedResult;
              ncbkResults[length] = cachedResult;
              continue; // Skip API call, use cached result
            }
            
            ncbkApiCalls++;
            console.log(`📊 NCBK DEBUG - Creating NCBK for ${spec.type}: cap=${cap}, length=${length}`);

            const ncbkWeight = (Math.PI * (cap/20) * (cap/20) * length * 7.85 / 1000);
            console.log(`📊 NCBK DEBUG - Calculated weight: ${ncbkWeight}`);
            
            // Generate NCBK strings ile validation
            const ncbkStokAdi = `YM Nervürlü Çubuk ${formatDecimalForDisplay(cap, true)} mm ${length} cm`;
            const ncbkIngilizceIsim = `Ribbed Rebar ${formatDecimalForDisplay(cap, false)} mm ${length} cm`;
            
            // Critical debug için NCBK
            console.log(`🚨 CRITICAL NCBK CHECK - ${ncbkStokKodu}:`, {
              stok_adi: ncbkStokAdi,
              ingilizce_isim: ncbkIngilizceIsim,
              cap: cap,
              hasNaN_stokAdi: ncbkStokAdi.includes('NaN'),
              hasNaN_ingilizceIsim: ncbkIngilizceIsim.includes('NaN')
            });
            
            const ncbkData = {
              stok_kodu: ncbkStokKodu,
              stok_adi: ncbkStokAdi,
              grup_kodu: 'YM',
              kod_1: 'NCBK',
              kod_2: '',
              ingilizce_isim: ncbkIngilizceIsim,
              // Standard columns
              alis_kdv_orani: 20,
              satis_kdv_orani: 20,
              muh_detay: 20,
              depo_kodu: 35,
              br_1: 'AD',
              br_2: 'KG',
              pay_1: parseFloat(ncbkWeight.toFixed(5)),
              payda_1: 2,
              cevrim_degeri_1: 0,
              olcu_br_3: null,
              cevrim_pay_2: 1,
              cevrim_payda_2: 1,
              cevrim_degeri_2: 1,
              // Ürün specific - 🔧 COMPREHENSIVE FIX: Prevent systematic Çap rounding
              cap: (() => {
                const val = parseFloat(cap || 0);
                const knownPrecise = [4.45, 4.50, 4.75, 4.85, 5.00, 5.50, 6.00, 6.50, 7.00, 7.50, 7.80, 8.00, 8.50, 8.60, 9.19, 9.20, 10.60];
                for (const precise of knownPrecise) {
                  if (Math.abs(val - Math.round(precise * 10) / 10) < 0.01 && precise !== Math.round(precise * 10) / 10) {
                    return precise;
                  }
                }
                return val;
              })(),
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
            
            console.log(`📊 NCBK DEBUG - Sending NCBK data:`, {
              stok_kodu: ncbkData.stok_kodu,
              stok_adi: ncbkData.stok_adi,
              kg: ncbkData.kg
            });
            
            const ncbkResponse = await fetchWithRetry(API_URLS.celikHasirNcbk, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ncbkData)
            }, 5, 1000, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: `${msg} - NCBK ${spec.type}` })));
            
            console.log(`📥 NCBK Response for ${ncbkData.stok_kodu}:`, {
              status: ncbkResponse.status,
              statusText: ncbkResponse.statusText
            });
            
            if (ncbkResponse.status === 409) {
              // NCBK already exists - this is normal, just use existing
              console.log(`⚠️ NCBK already exists (409), will NOT create recipe: ${ncbkData.stok_kodu}`);
              const existingResult = { stok_kodu: ncbkData.stok_kodu, message: 'existing', status: 409, isNewlyCreated: false };

              // OPTIMIZATION: Cache result için future products
              batchNcbkCache.set(ncbkStokKodu, existingResult);

              // Store result için current Ürün
              const specKey = `${spec.type}-${cap}-${length}`;
              ncbkResults[specKey] = existingResult;
              ncbkResults[length] = existingResult;
              continue; // FIXED: Continue to next NCBK spec, not exit entire function
            } else if (!ncbkResponse.ok) {
              throw new Error(`NCBK kaydı başarısız: ${ncbkResponse.status}`);
            } else {
              const ncbkResult = await ncbkResponse.json();
              console.log(`✅ NCBK created successfully (${ncbkResponse.status}), WILL create recipe: ${ncbkData.stok_kodu}`);
              
              const createdResult = { ...ncbkResult, status: ncbkResponse.status, message: 'created', isNewlyCreated: true };
              
              // OPTIMIZATION: Cache successful creation için future products
              batchNcbkCache.set(ncbkStokKodu, createdResult);
              
              // Mark this NCBK olarak newly created in this session
              newlyCreatedNcbks.add(ncbkData.stok_kodu);
              
              // Store ile spec Tip a İşle boy/en separately even if same dimensions
              const specKey = `${spec.type}-${cap}-${length}`;
              ncbkResults[specKey] = createdResult;
              // Also store ile just Uzunluk için Reçete lookup compatibility
              ncbkResults[length] = createdResult;
            }
          }

          // NTEL kaydı
          const ntelCap = parseFloat(product.boyCap || 0);
          const ntelStokKodu = `YM.NTEL.${safeCapToCode(ntelCap)}`;
          
          // OPTIMIZATION: Kontrol et batch cache first için NTEL
          if (batchNtelCache.has(ntelStokKodu)) {
            const cachedNtelResult = batchNtelCache.get(ntelStokKodu);
            ntelCacheHits++;
            console.log(`⚡ CACHE HIT: Using cached NTEL result for ${ntelStokKodu} (hit #${ntelCacheHits})`);
            ntelResult = cachedNtelResult;
            // Skip API call, continue a Reçete creation
          } else {
            ntelApiCalls++;
            console.log(`📊 NTEL DEBUG - Creating NTEL for cap=${ntelCap}`);
            
            const ntelWeight = (Math.PI * (ntelCap/20) * (ntelCap/20) * 100 * 7.85 / 1000); // per meter
            console.log(`📊 NTEL DEBUG - Calculated weight per meter: ${ntelWeight}`);
            
            const ntelData = {
              stok_kodu: ntelStokKodu,
            stok_adi: `YM Nervürlü Tel ${formatDecimalForDisplay(ntelCap, true)} mm`,
            grup_kodu: 'YM',
            kod_1: 'NTEL',
            kod_2: '',
            ingilizce_isim: `Ribbed Wire ${formatDecimalForDisplay(ntelCap, false)} mm`,
            // Standard columns
            alis_kdv_orani: 20,
            satis_kdv_orani: 20,
            muh_detay: 20,
            depo_kodu: 35,
            br_1: 'MT',
            br_2: 'KG',
            pay_1: parseFloat(ntelWeight.toFixed(5)),
            payda_1: 1,
            cevrim_degeri_1: 0,
            olcu_br_3: null,
            cevrim_pay_2: 1,
            cevrim_payda_2: 1,
            cevrim_degeri_2: 1,
            // Ürün specific - 🔧 COMPREHENSIVE FIX: Prevent systematic Çap rounding
            cap: (() => {
              const val = parseFloat(ntelCap);
              const knownPrecise = [4.45, 4.50, 4.75, 4.85, 5.00, 5.50, 6.00, 6.50, 7.00, 7.50, 7.80, 8.00, 8.50, 8.60, 9.19, 9.20, 10.60];
              for (const precise of knownPrecise) {
                if (Math.abs(val - Math.round(precise * 10) / 10) < 0.01 && precise !== Math.round(precise * 10) / 10) {
                  return precise;
                }
              }
              return val;
            })(),
            cap2: 0,
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

          const ntelResponse = await fetchWithRetry(API_URLS.celikHasirNtel, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ntelData)
          }, 5, 1000, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: `${msg} - NTEL` })));
          
          if (ntelResponse.status === 409) {
            // NTEL already exists - this is normal, just use existing
            console.log(`ℹ️ NTEL already exists, using existing: ${ntelData.stok_kodu}`);
            ntelResult = { stok_kodu: ntelData.stok_kodu, message: 'existing', status: 409, isNewlyCreated: false };
            
            // OPTIMIZATION: Cache existing result için future products
            batchNtelCache.set(ntelStokKodu, ntelResult);
          } else if (!ntelResponse.ok) {
            throw new Error(`NTEL kaydı başarısız: ${ntelResponse.status}`);
          } else {
            ntelResult = await ntelResponse.json();
            ntelResult.isNewlyCreated = true; // Mark as newly created in this session
            console.log(`✅ NTEL created successfully, WILL create recipe: ${ntelData.stok_kodu}`);
            
            // OPTIMIZATION: Cache successful creation için future products
            batchNtelCache.set(ntelStokKodu, ntelResult);
          }
          } // Close the else block for cache miss
        } catch (error) {
          failedSaves++;
          console.error(`❌ FAILED SAVE ${failedSaves}:`, {
            product: i + 1,
            hasirTipi: product.hasirTipi,
            error: error.message
          });
          
          saveResults.push({
            productIndex: i + 1,
            stokKodu: 'Failed to generate',
            success: false,
            error: error.message
          });
          
          toast.error(`Ürün kaydı hatası: ${product.hasirTipi}`);
          return; // Bu ürünü atla, diğerlerine devam et
        }

        // Reçete kayıtları oluştur (sadece yeni ürünler için)
        if (chResult && chResult.stok_kodu && Object.keys(ncbkResults).length > 0) {
          try {
            // Only Oluştur recipes için NEWLY created NCBK/NTEL (not existing ones)
            const newNcbkResults = {};
            Object.entries(ncbkResults).forEach(([key, result]) => {
              if (result && result.stok_kodu && result.isNewlyCreated === true) {
                newNcbkResults[key] = result;
                console.log(`🆕 Found newly created NCBK for recipe: ${result.stok_kodu} (key: ${key})`);
              } else if (result && result.stok_kodu) {
                console.log(`🚫 Skipping existing NCBK for recipe: ${result.stok_kodu} (key: ${key}, isNewlyCreated: ${result.isNewlyCreated})`);
              }
            });
            
            // Kontrol et if NTEL is newly created (not existing)
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
            
            // DEBUG: Log detailed NCBK results için troubleshooting
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

            // Always Oluştur CH recipes zaman CH is new, even if NCBK/NTEL exist
            // Use existing NCBK/NTEL if no new ones were created
            const ncbkForRecipe = Object.keys(newNcbkResults).length > 0 ? newNcbkResults : ncbkResults;
            const ntelForRecipe = newNtelResult || ntelResult;
            
            console.log('📤 Calling saveRecipeData with:', {
              chResult: chResult?.stok_kodu,
              ncbkResults: Object.keys(ncbkForRecipe).map(k => ({ key: k, stok_kodu: ncbkForRecipe[k]?.stok_kodu, isNewlyCreated: ncbkForRecipe[k]?.isNewlyCreated })),
              ntelResult: ntelForRecipe?.stok_kodu,
              ntelIsNewlyCreated: ntelForRecipe?.isNewlyCreated
            });
            
            // Kontrol et if cubuk values are present den Excel mapping or database - only apply fallback if truly missing
            const hasValidCubukValues = product.cubukSayisiBoy > 0 && product.cubukSayisiEn > 0;
            
            console.log('🔍 ORIGINAL PRODUCT VALUES FROM EXCEL MAPPING:', {
              cubukSayisiBoy: product.cubukSayisiBoy,
              cubukSayisiEn: product.cubukSayisiEn,
              hasirTipi: product.hasirTipi,
              hasValidCubukValues
            });
            
            let enhancedProduct;
            
            if (hasValidCubukValues) {
              // Use Excel-mapped or database values - DO NOT override ile calculations
              console.log(`✅ Using Excel-mapped cubuk values for recipe: ${product.hasirTipi} - Boy:${product.cubukSayisiBoy}, En:${product.cubukSayisiEn}`);
              enhancedProduct = { ...product };
            } else {
              // Only Hesapla fallback values if cubuk values are missing or Geçersiz
              console.log(`⚠️ Missing cubuk values, applying fallback calculation for: ${product.hasirTipi}`);
              
              const fallbackResult = await calculateFallbackCubukSayisi(
                product.hasirTipi,
                parseFloat(product.uzunlukBoy || 0),
                parseFloat(product.uzunlukEn || 0)
              );
              
              console.log('🔍 FALLBACK CALCULATION RESULT:', {
                cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                cubukSayisiEn: fallbackResult.cubukSayisiEn
              });
              
              enhancedProduct = {
                ...product,
                cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                cubukSayisiEn: fallbackResult.cubukSayisiEn
              };
              
              console.log(`Applied fallback for recipe: ${product.hasirTipi} ${product.uzunlukBoy}x${product.uzunlukEn} => boy:${fallbackResult.cubukSayisiBoy}, en:${fallbackResult.cubukSayisiEn}`);
            }
            
            console.log('🔍 FINAL ENHANCED PRODUCT VALUES FOR RECIPE:', {
              cubukSayisiBoy: enhancedProduct.cubukSayisiBoy,
              cubukSayisiEn: enhancedProduct.cubukSayisiEn
            });
            
            await saveRecipeData(enhancedProduct, chResult, ncbkForRecipe, ntelForRecipe);
            console.log(`✅ Recipe kayıtları başarıyla oluşturuldu: ${product.hasirTipi}`);
            
            // Sequence güncelle - always Güncelle için new products, including zaman CH exists but we generated new NCBK/NTEL
            // Extract sequence Sayı den generated stok_kodu için OZL products
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

      // Don't Göster Başarılı Toast yet - wait için Excel generation a Tamamlandı
      setDatabaseProgress({ 
        current: processedCount, 
        total: totalCount, 
        operation: '✅ Veritabanı kaydı tamamlandı - Excel oluşturuluyor...',
        currentProduct: 'Excel hazırlanıyor'
      });
      
      // COMPREHENSIVE Kaydet SUMMARY
      console.log('🔥 DATABASE SAVE PROCESS COMPLETED:', {
        totalProductsToSave: newProducts.length,
        successfulSaves,
        failedSaves,
        skippedSaves,
        saveResults: saveResults.slice(0, 5), // Show first 5 results
        allResults: saveResults.length
      });
      
      // If we have fewer successful saves than expected, investigate
      if (successfulSaves < newProducts.length) {
        console.warn('⚠️ INCOMPLETE SAVE DETECTED:', {
          expected: newProducts.length,
          actual: successfulSaves,
          missing: newProducts.length - successfulSaves,
          failedCount: failedSaves,
          skippedCount: skippedSaves
        });
        
        // Göster detailed results için Başarısız/skipped products
        const problemProducts = saveResults.filter(r => !r.success);
        console.error('❌ PROBLEM PRODUCTS:', problemProducts);
      } else {
        console.log('✅ ALL PRODUCTS SAVED SUCCESSFULLY');
      }

      // OPTIMIZATION METRICS: Göster cache effectiveness
      const totalNcbkOperations = ncbkCacheHits + ncbkApiCalls;
      const totalNtelOperations = ntelCacheHits + ntelApiCalls;
      const ncbkCacheEfficiency = totalNcbkOperations > 0 ? ((ncbkCacheHits / totalNcbkOperations) * 100).toFixed(1) : 0;
      const ntelCacheEfficiency = totalNtelOperations > 0 ? ((ntelCacheHits / totalNtelOperations) * 100).toFixed(1) : 0;
      
      console.log(`⚡ BATCH CACHING METRICS:`);
      console.log(`   NCBK: ${ncbkCacheHits} cache hits / ${ncbkApiCalls} API calls = ${ncbkCacheEfficiency}% efficiency`);
      console.log(`   NTEL: ${ntelCacheHits} cache hits / ${ntelApiCalls} API calls = ${ntelCacheEfficiency}% efficiency`);
      console.log(`   Total operations saved: ${ncbkCacheHits + ntelCacheHits}`);
      
      console.log('Veritabanı kaydetme tamamlandı. Excel için döndürülen ürünler:', {
        count: newProducts.length,
        products: newProducts.map(p => p.hasirTipi)
      });
      console.log('📊 SAVE RETURN DEBUG - First 3 products structure:', newProducts.slice(0, 3).map(p => ({
        hasirTipi: p.hasirTipi,
        existingStokKodu: p.existingStokKodu,
        stokAdi: p.stokAdi,
        boyCap: p.boyCap,
        enCap: p.enCap,
        cubukSayisiBoy: p.cubukSayisiBoy,
        cubukSayisiEn: p.cubukSayisiEn
      })));
      
      // Listeyi güncelle (don't await a avoid timeout)
      fetchSavedProducts().catch(error => {
        console.warn('Database refresh failed after save:', error);
        toast.warning('Veritabanı yenileme başarısız - sayfa yenileyebilirsiniz');
      });
      
      // Keep Yükleniyor states Aktif - Excel generation will İşle final cleanup
      console.log('⚡ CONTINUITY FIX: Keeping loading states active for Excel generation');
      
      // Sadece yeni kaydedilen ürünleri döndür
      return newProducts;
      
    } catch (error) {
      console.error('Veritabanına kaydetme hatası:', error);
      
      // Provide specific Hata messages based on Hata Tip
      if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
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
      // Only Sıfırla states if Excel generation is not following
      if (!keepProgressForExcel) {
        setIsLoading(false);
        setIsSavingToDatabase(false);
        setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
      }
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

      // Step 1: Sil recipes using bulk deletion ile mamul_kodu
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
            // Fallback: Use old method if bulk Endpoint doesn't exist
            console.log(`ℹ️ Bulk endpoint not found, using fallback for recipes: ${product.stok_kodu}`);
            await deleteRecipesFallback(recipeApiUrl, encodedStokKodu);
          } else {
            console.warn(`⚠️ Recipe deletion failed for ${product.stok_kodu}: ${deleteRecipesResponse.status}`);
          }
        } catch (recipeError) {
          console.warn(`⚠️ Recipe deletion error for ${product.stok_kodu}:`, recipeError.message);
          // Dene fallback method
          try {
            const encodedStokKodu = encodeURIComponent(product.stok_kodu);
            await deleteRecipesFallback(recipeApiUrl, encodedStokKodu);
          } catch (fallbackError) {
            console.warn(`⚠️ Recipe deletion fallback also failed for ${product.stok_kodu}:`, fallbackError.message);
          }
        }
      }

      // Step 2: Sil the main Ürün record ile stok_kodu
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
        
        // Güncelle UI State immediately
        setSavedProducts(prev => ({
          ...prev,
          [productType]: prev[productType].filter(p => p.id !== productId)
        }));
        
        // Güncelle sequence table if we Silindi CH Ürün
        if (productType === 'mm') {
          try {
            await updateSequenceAfterDeletion(productType);
          } catch (seqError) {
            console.warn('Sequence update failed:', seqError);
            toast.warning('Ürün silindi ancak sıra numarası güncellenemedi');
          }
        }
        
        // Aggressive cache clearing a prevent false "exists" detection
        cacheRef.current.clear();
        
        // Temizle any existing Ürün lookup cache that might contain Silindi Ürün
        if (window.productLookupCache) {
          window.productLookupCache.clear();
        }
        
        // CRITICAL: Sıfırla batch sequence counters after individual deletion
        console.log('🔄 CRITICAL: Resetting batch sequence counters after individual deletion');
        resetBatchSequenceCounter();
        
        // Force refresh Veri ile cache-busting
        await fetchSavedProducts(false, true);
        
        // CRITICAL: Refresh sequence Veri a Al updated sequence numbers after deletion
        console.log('🔄 CRITICAL: Refreshing sequence data after individual deletion');
        await fetchSequences(); // Refresh sequence state with fresh data
        
        // CRITICAL: Re-Başlat batch sequence ile fresh database State
        console.log('🔄 CRITICAL: Re-initializing batch sequence after individual deletion');
        await initializeBatchSequence();
        
        // Göster Başarılı Toast AFTER cache is cleared
        toast.success(`✅ Ürün başarıyla silindi: ${product.stok_kodu}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false
        });
      } else if (deleteProductResponse.status === 404) {
        // Fallback: Use old method if bulk Endpoint doesn't exist
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
          
          // Aggressive cache clearing a prevent false "exists" detection
          cacheRef.current.clear();
          
          // Temizle any existing Ürün lookup cache that might contain Silindi Ürün
          if (window.productLookupCache) {
            window.productLookupCache.clear();
          }
          
          // CRITICAL: Sıfırla batch sequence counters after fallback deletion
          console.log('🔄 CRITICAL: Resetting batch sequence counters after fallback deletion');
          resetBatchSequenceCounter();
          
          // Force refresh Veri ile cache-busting
          await fetchSavedProducts(false, true);
          
          // CRITICAL: Refresh sequence Veri a Al updated sequence numbers after deletion
          console.log('🔄 CRITICAL: Refreshing sequence data after fallback deletion');
          await fetchSequences(); // Refresh sequence state with fresh data
          
          // CRITICAL: Re-Başlat batch sequence ile fresh database State
          console.log('🔄 CRITICAL: Re-initializing batch sequence after fallback deletion');
          await initializeBatchSequence();
          
          // Göster Başarılı Toast AFTER cache is cleared
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

  // Güncelle sequence table after Ürün deletion
  const updateSequenceAfterDeletion = async (productType) => {
    try {
      // Only Güncelle sequence için CH (mm) products since they use sequence numbers
      if (productType !== 'mm') return;
      
      console.log('*** Updating sequence table after product deletion');
      
      // Al the highest sequence Sayı den remaining CH products
      // Ekle timestamp a bypass any caching
      const chResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?search=CHOZL&sort_by=stok_kodu&sort_order=desc&limit=1&_t=${Date.now()}`);
      if (chResponse.ok) {
        const chProducts = await chResponse.json();
        console.log('*** updateSequenceAfterDeletion - API response structure:', chProducts);
        
        let newMaxSequence = null;
        // Kontrol et both possible Yanıt structures (direct Dizi or Veri property)
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
          
          // Last resort: Kontrol et all CH products (both STD and OZL) a Bul the highest sequence
          try {
            const allChResponse = await fetchWithAuth(`${API_URLS.celikHasirMm}?search=CH&sort_by=stok_kodu&sort_order=desc&limit=100&_t=${Date.now()}`);
            if (allChResponse.ok) {
              const allChProducts = await allChResponse.json();
              const allProductList = allChProducts.data || allChProducts;
              
              let highestStdSequence = 0;
              let highestOzlSequence = 0;
              
              if (Array.isArray(allProductList)) {
                allProductList.forEach(product => {
                  // Kontrol et için STD products (CH.STD.XXXX.XX)
                  const stdMatch = product.stok_kodu.match(/CH\.STD\.(\d{4})\./);
                  if (stdMatch) {
                    const seqNum = parseInt(stdMatch[1]);
                    if (seqNum > highestStdSequence) {
                      highestStdSequence = seqNum;
                    }
                  }
                  
                  // Kontrol et için any remaining OZL products (shouldn't be any, but double-Kontrol et)
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
                // If STD sequences are above 1200, continue den there için OZL
                newMaxSequence = highestStdSequence;
                console.log('*** Using STD sequence as base for OZL:', newMaxSequence);
              } else {
                // No OZL products and STD is in normal range, Başlangıç OZL den a safe Sayı
                newMaxSequence = 2443; // Starting point for OZL when no reference exists
                console.log('*** No suitable reference found, using safe starting point:', newMaxSequence);
              }
            }
          } catch (error) {
            console.error('*** Error checking all CH products:', error);
            // If all else fails, keep the current sequence Değer (don't Güncelle)
            console.log('*** Error occurred, sequence will not be updated');
            return;
          }
        }
        
        // Only proceed ile Güncelle if we have a Geçerli sequence
        if (newMaxSequence === null) {
          console.log('*** No valid sequence determined, skipping update');
          return;
        }
        
        // Güncelle both OZL and OZL_BACKUP sequences
        const updateTasks = ['OZL', 'OZL_BACKUP'].map(async (kod2) => {
          try {
            console.log(`*** Searching for sequence with product_type=CH and kod_2=${kod2}`);
            const existingSequenceResponse = await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=${kod2}`);
            if (existingSequenceResponse.ok) {
              const existingSequences = await existingSequenceResponse.json();
              console.log(`*** Found ${existingSequences.length} sequences for kod_2=${kod2}:`, existingSequences);
              
              // Filtrele a ensure we Al the exact match (in case API filtering is not working)
              const exactMatches = existingSequences.filter(seq => 
                seq.product_type === 'CH' && seq.kod_2 === kod2
              );
              console.log(`*** Exact matches for kod_2=${kod2}:`, exactMatches);
              
              if (exactMatches.length > 0) {
                const sequenceRecord = exactMatches[0];
                const sequenceId = sequenceRecord.id;
                const currentSequence = sequenceRecord.last_sequence;
                
                console.log(`*** Processing sequence update for ${kod2}: ID=${sequenceId}, current=${currentSequence}, newMax=${newMaxSequence}`);
                
                // Only Güncelle if current sequence is higher than the new max (meaning we Silindi the highest)
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

        // Güncelle local sequence State - use exact key match
        const updatedSequences = { ...sequences };
        const ozlKey = 'CH_OZL_';
        const backupKey = 'CH_OZL_BACKUP_';

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
      
      // Step 1: Sil ALL recipes için this Ürün Tip using bulk Endpoint
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
        // Continue ile Ürün deletion even if Reçete deletion fails
      }
      
      // Step 2: Sil ALL products için this Tip using bulk Endpoint
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
      
      // Step 3: Temizle sequence table if CH products were Silindi
      setBulkDeleteProgress({ 
        current: 2, 
        total: 3, 
        operation: 'Sequence kayıtları temizleniyor...', 
        currentItem: 'CH Sequence' 
      });
      
      if (activeDbTab === 'mm') {
        try {
          // Sıfırla OZL and OZL_BACKUP sequences a 0
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
      
      // Güncelle UI State immediately
      setSavedProducts(prev => ({
        ...prev,
        [activeDbTab]: []
      }));
      
      // CRITICAL: Sıfırla batch sequence counters after bulk Sil all
      console.log('🔄 CRITICAL: Resetting batch sequence counters after bulk delete all');
      resetBatchSequenceCounter();
      
      // Force refresh Veri
      cacheRef.current.clear();
      await fetchSavedProducts(false, true);
      
      // CRITICAL: Refresh sequence Veri a Al updated sequence numbers after deletion
      console.log('🔄 CRITICAL: Refreshing sequence data after bulk delete all');
      await fetchSequences(); // Refresh sequence state with fresh data
      
      // CRITICAL: Re-Başlat batch sequence ile fresh database State
      console.log('🔄 CRITICAL: Re-initializing batch sequence after bulk delete all');
      await initializeBatchSequence();
      
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


  // Render et İçerik function
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
              // Refresh saved products State a ensure accurate counts
              await fetchSavedProducts();

              // Göster analysis count
              const newProductsCount = getProductsToSave().length;
              const existingProductsCount = validProducts.length - newProductsCount;
              toast.info(`Analiz: ${validProducts.length} toplam ürün | ${existingProductsCount} veritabanında mevcut | ${newProductsCount} kaydedilecek`);

              if (validProducts.length === 0) {
                setShowDatabaseModal(true);
              } else {
                // Kontrol et için unoptimized products and Göster warning için Netsis operations only
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

                // Analyze products and Göster pre-Kaydet confirmation
                const analysisData = await analyzeProductsForConfirmation();
                setPreSaveConfirmData(analysisData);
                setShowPreSaveConfirmModal(true);
              }
            } catch (error) {
              // CRITICAL FIX: Yakala database connection errors and Göster user-friendly Mesaj
              console.error('❌ Veritabanı analizi hatası:', error);
              toast.error(error.message || 'Veritabanı bağlantı hatası oluştu. Lütfen tekrar deneyin.');
              setIsLoading(false);
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
                  
                  try {
                    // SEAMLESS UI: Continue database progress directly into Excel generation
                    setDatabaseProgress(prev => ({ 
                      ...prev, 
                      operation: 'Veritabanı işlemi tamamlanıyor ve Excel hazırlanıyor...',
                      currentProduct: 'İşlemler devam ediyor' 
                    }));
                    
                    const newProducts = await saveToDatabase(validProducts, true); // Keep progress for Excel
                    
                    if (newProducts && newProducts.length > 0) {
                      console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için - database fetch mode`);
                      
                      // SEAMLESS UI: Transition den database a Excel generation without closing Modal
                      setDatabaseProgress({ 
                        current: 0, 
                        total: 4, 
                        operation: '📊 Excel dosyaları hazırlanıyor...', 
                        currentProduct: 'Veritabanı verileri getiriliyor' 
                      });
                      setIsGeneratingExcel(true); // Start Excel generation state
                      
                      // Unified approach: Getir saved products den database ile fallback
                      try {
                        // Direct unified Getir approach - use the stok_kodu den saved products
                        const stokKodular = newProducts.map(p => p.existingStokKodu || generateStokKodu(p, 'CH', 0)).filter(Boolean);
                        console.log('Looking for these stok_kodu values:', stokKodular);
                        
                        setDatabaseProgress({ 
                          current: 1, 
                          total: 4, 
                          operation: '📊 Veritabanından veriler alınıyor...', 
                          currentProduct: `${stokKodular.length} ürün için veri hazırlanıyor` 
                        });
                        
                        console.log('newProducts structure:', newProducts.map(p => ({
                          hasirTipi: p.hasirTipi,
                          uzunlukBoy: p.uzunlukBoy,
                          uzunlukEn: p.uzunlukEn,
                          existingStokKodu: p.existingStokKodu,
                          cubukSayisiBoy: p.cubukSayisiBoy,
                          cubukSayisiEn: p.cubukSayisiEn
                        })));
                        
                        // Ekle small delay a ensure database consistency
                        await new Promise(resolve => setTimeout(resolve, 800));
                        
                        setDatabaseProgress({ 
                          current: 2, 
                          total: 4, 
                          operation: '📊 Çubuk sayısı ve reçete verileri hesaplanıyor...', 
                          currentProduct: 'Veritabanı sorgusu işleniyor' 
                        });
                        
                        // DIRECT APPROACH: Use the saved products Veri directly instead of fetching den database
                        console.log('🚀 Using saved products data directly - bypassing database fetch');
                        console.log('🔍 Raw saved products sample:', newProducts.slice(0, 2).map(p => ({
                          hasirTipi: p.hasirTipi,
                          existingStokKodu: p.existingStokKodu,
                          stokAdi: p.stokAdi,
                          cubukSayisiBoy: p.cubukSayisiBoy,
                          cubukSayisiEn: p.cubukSayisiEn,
                          boyCap: p.boyCap,
                          enCap: p.enCap
                        })));
                        
                        const databaseProducts = newProducts.map(product => ({
                          ...product, // Preserve ALL original fields
                          productType: product.existingStokKodu?.startsWith('CHOZL') ? 'MM' : 
                                     product.existingStokKodu?.startsWith('YM.NCBK') ? 'NCBK' : 
                                     product.existingStokKodu?.startsWith('YM.NTEL') ? 'NTEL' : 'MM',
                          isOptimized: true,
                          // Ensure critical fields are Mevcut
                          stok_adi: product.stokAdi || generateStokAdi(product, 'CH'),
                          ingilizce_isim: product.ingilizceIsim || generateIngilizceIsim(product),
                          hasirTuru: product.hasirTuru || 'Standart',
                          boyAraligi: calculateGozAraligi(product.hasirTipi || '', 'boy'),
                          enAraligi: calculateGozAraligi(product.hasirTipi || '', 'en'),
                          gozAraligi: `${calculateGozAraligi(product.hasirTipi || '', 'boy')}x${calculateGozAraligi(product.hasirTipi || '', 'en')}`
                        }));
                        console.log('Direct saved products converted for Excel:', databaseProducts?.length || 0, 'products');
                        console.log('Excel products breakdown:', {
                          total: databaseProducts?.length || 0,
                          mm: databaseProducts?.filter(p => p.productType === 'MM').length || 0,
                          ncbk: databaseProducts?.filter(p => p.productType === 'NCBK').length || 0,
                          ntel: databaseProducts?.filter(p => p.productType === 'NTEL').length || 0
                        });
                        
                        setDatabaseProgress({ 
                          current: 3, 
                          total: 4, 
                          operation: '📊 Excel dosyaları oluşturuluyor...', 
                          currentProduct: 'Son aşama başlıyor' 
                        });
                        
                        if (databaseProducts && databaseProducts.length > 0) {
                          await generateExcelFiles(databaseProducts, false);
                          toast.success(`${databaseProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Database + Fallback)`);
                        } else {
                          // Database fetch failed - preserve Excel values or apply fallback formula
                          console.warn('Unified fetch returned no data, preserving Excel values or applying fallback');
                          const fallbackProducts = await Promise.all(
                            newProducts.map(async (product) => {
                              const hasExcelValues = (product.cubukSayisiBoy > 0 && product.cubukSayisiEn > 0);
                              
                              if (hasExcelValues) {
                                console.log(`✅ Preserving Excel values for ${product.hasirTipi}: Boy:${product.cubukSayisiBoy}, En:${product.cubukSayisiEn}`);
                                return { ...product };
                              } else {
                                console.log(`⚠️ Missing Excel values, calculating fallback for ${product.hasirTipi}`);
                                const fallbackResult = await calculateFallbackCubukSayisi(
                                  product.hasirTipi,
                                  product.uzunlukBoy || 0,
                                  product.uzunlukEn || 0
                                );
                                return {
                                  ...product,
                                  cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                                  cubukSayisiEn: fallbackResult.cubukSayisiEn
                                };
                              }
                            })
                          );
                          console.log('Applied fallback formula to', fallbackProducts.length, 'products');
                          await generateExcelFiles(fallbackProducts, false);
                          toast.success(`${fallbackProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Fallback Formula)`);
                        }
                      } catch (error) {
                        console.error('Unified fetch failed, applying fallback formula:', error);
                        setDatabaseProgress({ 
                          current: 3, 
                          total: 4, 
                          operation: '📊 Yedek formül ile Excel oluşturuluyor...', 
                          currentProduct: 'Alternatif yöntem kullanılıyor' 
                        });
                        
                        // Apply fallback formula even zaman Getir fails
                        const fallbackProducts = await Promise.all(
                          newProducts.map(async (product) => {
                            const fallbackResult = await calculateFallbackCubukSayisi(
                              product.hasirTipi,
                              product.uzunlukBoy || 0,
                              product.uzunlukEn || 0
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
                  } catch (error) {
                    console.error('Save and Excel generation failed:', error);
                    toast.error('İşlem sırasında hata oluştu');
                  } finally {
                    // UNIFIED Modal: Only Temizle Excel states here, database states cleared ile Excel generation completion
                    setIsGeneratingExcel(false);
                    // DON'T Ayarla isSavingToDatabase(false) here - let Excel generation İşle the unified Modal Kapat
                    setExcelProgress({ current: 0, total: 0, operation: '' });
                    // Keep database progress until Excel completely finishes
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
                      
                      // Unified approach: Getir saved products den database ile fallback
                      try {
                        // DIRECT APPROACH: Use saved products Veri directly instead of database Getir
                        console.log('🚀 Using saved products data directly - bypassing database fetch (instance 2)');
                        const databaseProducts = newProducts.map(product => ({
                          ...product, // Preserve ALL original fields
                          productType: product.existingStokKodu?.startsWith('CHOZL') ? 'MM' : 
                                     product.existingStokKodu?.startsWith('YM.NCBK') ? 'NCBK' : 
                                     product.existingStokKodu?.startsWith('YM.NTEL') ? 'NTEL' : 'MM',
                          isOptimized: true,
                          stok_adi: product.stokAdi || generateStokAdi(product, 'CH'),
                          ingilizce_isim: product.ingilizceIsim || generateIngilizceIsim(product),
                          hasirTuru: product.hasirTuru || 'Standart',
                          boyAraligi: calculateGozAraligi(product.hasirTipi || '', 'boy'),
                          enAraligi: calculateGozAraligi(product.hasirTipi || '', 'en'),
                          gozAraligi: `${calculateGozAraligi(product.hasirTipi || '', 'boy')}x${calculateGozAraligi(product.hasirTipi || '', 'en')}`
                        }));
                        console.log('fetchDatabaseDataWithFallback returned:', databaseProducts?.length || 0, 'products');
                        console.log('First database product data:', databaseProducts?.[0] ? {
                          stok_kodu: databaseProducts[0].existingStokKodu,
                          cubukSayisiBoy: databaseProducts[0].cubukSayisiBoy,
                          cubukSayisiEn: databaseProducts[0].cubukSayisiEn,
                          hasRecipeData: !!databaseProducts[0].recipeData
                        } : 'none');
                        
                        if (databaseProducts && databaseProducts.length > 0) {
                          // DIRECT EXCEL: Call Excel functions directly ile saved Veri
                          console.log('🎯 DIRECT EXCEL: Starting Excel generation with saved data');
                          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
                          
                          setExcelProgress({ current: 1, total: 2, operation: 'Stok Kartı Excel oluşturuluyor...' });
                          await generateStokKartiExcel(databaseProducts, timestamp, false);

                          setExcelProgress({ current: 2, total: 2, operation: 'Reçete Excel oluşturuluyor...' });
                          await generateMergedReceteExcel(databaseProducts, timestamp, false);
                          
                          // CLEANUP: Kapat Modal and Sıfırla states after successful Excel generation
                          setIsGeneratingExcel(false);
                          setIsSavingToDatabase(false);
                          setIsLoading(false);
                          setExcelProgress({ current: 0, total: 0, operation: '' });
                          setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                          
                          toast.success(`${databaseProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Direct Data)`);
                        } else {
                          // Database fetch failed - preserve Excel values or apply fallback formula
                          console.warn('Unified fetch returned no data, preserving Excel values or applying fallback');
                          const fallbackProducts = await Promise.all(
                            newProducts.map(async (product) => {
                              const hasExcelValues = (product.cubukSayisiBoy > 0 && product.cubukSayisiEn > 0);
                              
                              if (hasExcelValues) {
                                console.log(`✅ Preserving Excel values for ${product.hasirTipi}: Boy:${product.cubukSayisiBoy}, En:${product.cubukSayisiEn}`);
                                return { ...product };
                              } else {
                                console.log(`⚠️ Missing Excel values, calculating fallback for ${product.hasirTipi}`);
                                const fallbackResult = await calculateFallbackCubukSayisi(
                                  product.hasirTipi,
                                  product.uzunlukBoy || 0,
                                  product.uzunlukEn || 0
                                );
                                return {
                                  ...product,
                                  cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                                  cubukSayisiEn: fallbackResult.cubukSayisiEn
                                };
                              }
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
                      } finally {
                        // CLEANUP: Always Kapat Modal and Sıfırla states after Excel generation (Başarılı or failure)
                        setIsGeneratingExcel(false);
                        setIsSavingToDatabase(false);
                        setIsLoading(false);
                        setExcelProgress({ current: 0, total: 0, operation: '' });
                        setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                      }
                    } else {
                      toast.info('Hiç yeni ürün eklenmedi, Excel oluşturulmadı.');
                      // CLEANUP: Also needed zaman no products are saved
                      setIsGeneratingExcel(false);
                      setIsSavingToDatabase(false);
                      setIsLoading(false);
                      setExcelProgress({ current: 0, total: 0, operation: '' });
                      setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                    }
                  } catch (error) {
                    console.error('Database save error:', error);
                    toast.error('Veritabanı kaydı sırasında hata oluştu');
                    // CLEANUP: Also needed zaman errors occur
                    setIsGeneratingExcel(false);
                    setIsSavingToDatabase(false);
                    setIsLoading(false);
                    setExcelProgress({ current: 0, total: 0, operation: '' });
                    setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
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

      {/* UNIFIED Save+Excel Progress Modal - Never closes until both operations complete */}
      {(isSavingToDatabase || isGeneratingExcel) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              {/* Dynamic icon and colors based on current operation */}
              {isSavingToDatabase ? (
                <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
              ) : (
                <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              )}
              
              {/* Dynamic title based on current operation */}
              <h3 className="text-lg font-semibold mb-2">
                {isSavingToDatabase ? 'Veritabanı İşlemi Devam Ediyor' : 'Excel Dosyaları Oluşturuluyor'}
              </h3>
              
              {/* Dynamic operation description */}
              <p className="text-gray-600 mb-4">
                {isSavingToDatabase ? databaseProgress.operation : excelProgress.operation}
              </p>
              
              {/* Show current product only for database operations */}
              {isSavingToDatabase && databaseProgress.currentProduct && (
                <p className="text-sm text-gray-500 mb-4">
                  <span className="font-medium">Mevcut Ürün:</span> {databaseProgress.currentProduct}
                </p>
              )}
              
              {/* Dynamic progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isSavingToDatabase ? 'bg-green-600' : 'bg-blue-600'
                  }`}
                  style={{ 
                    width: `${isSavingToDatabase 
                      ? (databaseProgress.total > 0 ? (databaseProgress.current / databaseProgress.total * 100) : 0)
                      : (excelProgress.total > 0 ? (excelProgress.current / excelProgress.total * 100) : 0)
                    }%` 
                  }}
                />
              </div>
              
              {/* Dynamic progress counters */}
              <div className="text-sm text-gray-500 mb-4">
                {isSavingToDatabase ? (
                  databaseProgress.total > 0 ? (
                    `${databaseProgress.current} / ${databaseProgress.total} ürün işlendi`
                  ) : (
                    'İşlem başlatılıyor...'
                  )
                ) : (
                  excelProgress.total > 0 ? (
                    `${excelProgress.current} / ${excelProgress.total} dosya`
                  ) : (
                    'Excel üretimi başlatılıyor...'
                  )
                )}
              </div>
              
              {/* Status message */}
              <p className="text-xs text-gray-400 mt-4 mb-4">
                {isSavingToDatabase ? (
                  'Veritabanı kaydetme tamamlandıktan sonra Excel üretimi başlayacak...'
                ) : (
                  'Excel dosyaları oluşturuluyor...'
                )}
              </p>
              
              {/* Cancel buttons */}
              {isSavingToDatabase ? (
                <button
                  onClick={() => {
                    if (window.confirm('Veritabanı işlemini iptal etmek istediğinizden emin misiniz?')) {
                      setIsSavingToDatabase(false);
                      setIsLoading(false);
                      toast.warning('İşlem kullanıcı tarafından iptal edildi');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                >
                  İptal
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCancelExcelGeneration(true);
                    setIsGeneratingExcel(false);
                    setIsSavingToDatabase(false); // Close unified modal
                    setExcelProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                    setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                    toast.info('Excel oluşturma işlemi iptal edildi');
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                >
                  İptal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Progress Modal - z-[60] to appear above database modal (z-50) */}
      {isDeletingBulkDb && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-red-600" />
              <h3 className="text-lg font-semibold mb-2">Ürünler Siliniyor</h3>
              <p className="text-gray-600 mb-4">{deleteProgress.operation}</p>
              
              {deleteProgress.currentProduct && (
                <p className="text-sm text-gray-500 mb-4">
                  <span className="font-medium">Mevcut Ürün:</span> {deleteProgress.currentProduct}
                </p>
              )}
              
              {deleteProgress.total > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    {deleteProgress.current} / {deleteProgress.total} ürün silindi
                  </p>
                </>
              )}
              
              <p className="text-xs text-gray-400 mt-4">
                Lütfen bekleyiniz, ürünler ve reçeteler siliniyor...
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Bulk Delete Progress Modal - z-[60] to appear above database modal (z-50) */}
      {isBulkDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
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
                    onClick={() => {
                      // Force cache invalidation and full refresh
                      cacheRef.current.clear();
                      fetchSavedProducts(false, true); // isRetry=false, resetData=true
                    }}
                    disabled={isLoadingDb}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-400"
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
                        <Trash2 className="w-4 h-4" />
                        Seçilileri Sil ({selectedDbItems.length})
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
                      <Trash2 className="w-4 h-4" />
                      {activeDbTab === 'mm' ? 'Tüm CH\'leri Sil' : activeDbTab === 'ncbk' ? 'Tüm NCBK\'leri Sil' : 'Tüm NTEL\'leri Sil'}
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
                      
                      // Unified approach: Getir saved products den database ile fallback
                      try {
                        // DIRECT APPROACH: Use saved products Veri directly instead of database Getir
                        console.log('🚀 Using saved products data directly - bypassing database fetch (instance 2)');
                        const databaseProducts = newProducts.map(product => ({
                          ...product, // Preserve ALL original fields
                          productType: product.existingStokKodu?.startsWith('CHOZL') ? 'MM' : 
                                     product.existingStokKodu?.startsWith('YM.NCBK') ? 'NCBK' : 
                                     product.existingStokKodu?.startsWith('YM.NTEL') ? 'NTEL' : 'MM',
                          isOptimized: true,
                          stok_adi: product.stokAdi || generateStokAdi(product, 'CH'),
                          ingilizce_isim: product.ingilizceIsim || generateIngilizceIsim(product),
                          hasirTuru: product.hasirTuru || 'Standart',
                          boyAraligi: calculateGozAraligi(product.hasirTipi || '', 'boy'),
                          enAraligi: calculateGozAraligi(product.hasirTipi || '', 'en'),
                          gozAraligi: `${calculateGozAraligi(product.hasirTipi || '', 'boy')}x${calculateGozAraligi(product.hasirTipi || '', 'en')}`
                        }));
                        console.log('fetchDatabaseDataWithFallback returned:', databaseProducts?.length || 0, 'products');
                        console.log('First database product data:', databaseProducts?.[0] ? {
                          stok_kodu: databaseProducts[0].existingStokKodu,
                          cubukSayisiBoy: databaseProducts[0].cubukSayisiBoy,
                          cubukSayisiEn: databaseProducts[0].cubukSayisiEn,
                          hasRecipeData: !!databaseProducts[0].recipeData
                        } : 'none');
                        
                        if (databaseProducts && databaseProducts.length > 0) {
                          // DIRECT EXCEL: Call Excel functions directly ile saved Veri
                          console.log('🎯 DIRECT EXCEL: Starting Excel generation with saved data');
                          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
                          
                          setExcelProgress({ current: 1, total: 2, operation: 'Stok Kartı Excel oluşturuluyor...' });
                          await generateStokKartiExcel(databaseProducts, timestamp, false);

                          setExcelProgress({ current: 2, total: 2, operation: 'Reçete Excel oluşturuluyor...' });
                          await generateMergedReceteExcel(databaseProducts, timestamp, false);
                          
                          // CLEANUP: Kapat Modal and Sıfırla states after successful Excel generation
                          setIsGeneratingExcel(false);
                          setIsSavingToDatabase(false);
                          setIsLoading(false);
                          setExcelProgress({ current: 0, total: 0, operation: '' });
                          setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                          
                          toast.success(`${databaseProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Direct Data)`);
                        } else {
                          // Database fetch failed - preserve Excel values or apply fallback formula
                          console.warn('Unified fetch returned no data, preserving Excel values or applying fallback');
                          const fallbackProducts = await Promise.all(
                            newProducts.map(async (product) => {
                              const hasExcelValues = (product.cubukSayisiBoy > 0 && product.cubukSayisiEn > 0);
                              
                              if (hasExcelValues) {
                                console.log(`✅ Preserving Excel values for ${product.hasirTipi}: Boy:${product.cubukSayisiBoy}, En:${product.cubukSayisiEn}`);
                                return { ...product };
                              } else {
                                console.log(`⚠️ Missing Excel values, calculating fallback for ${product.hasirTipi}`);
                                const fallbackResult = await calculateFallbackCubukSayisi(
                                  product.hasirTipi,
                                  product.uzunlukBoy || 0,
                                  product.uzunlukEn || 0
                                );
                                return {
                                  ...product,
                                  cubukSayisiBoy: fallbackResult.cubukSayisiBoy,
                                  cubukSayisiEn: fallbackResult.cubukSayisiEn
                                };
                              }
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
                      } finally {
                        // CLEANUP: Always Kapat Modal and Sıfırla states after Excel generation (Başarılı or failure)
                        setIsGeneratingExcel(false);
                        setIsSavingToDatabase(false);
                        setIsLoading(false);
                        setExcelProgress({ current: 0, total: 0, operation: '' });
                        setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                      }
                    } else {
                      toast.info('Hiç yeni ürün eklenmedi, Excel oluşturulmadı.');
                      // CLEANUP: Also needed zaman no products are saved
                      setIsGeneratingExcel(false);
                      setIsSavingToDatabase(false);
                      setIsLoading(false);
                      setExcelProgress({ current: 0, total: 0, operation: '' });
                      setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                    }
                  } catch (error) {
                    console.error('Database save error:', error);
                    toast.error('Veritabanı kaydı sırasında hata oluştu');
                    // CLEANUP: Also needed zaman errors occur
                    setIsGeneratingExcel(false);
                    setIsSavingToDatabase(false);
                    setIsLoading(false);
                    setExcelProgress({ current: 0, total: 0, operation: '' });
                    setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
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
                  
                  // Başlat batch sequence before any stok kodu generation
                  await initializeBatchSequence();
                  
                  // Combine both approaches: planned codes için new, highest codes için existing
                  const allProductsWithCodes = [];
                  
                  // Oluştur stokAdi mapping için existing products
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
                  
                  // Sıfırla batch counter için planned stok_kodu generation
                  resetBatchSequenceCounter();
                  let plannedIndex = 0;
                  
                  for (const product of validProducts) {
                    const productStokAdi = generateStokAdi(product, 'CH');
                    const existingStokKodus = stokAdiToStokKodusMap.get(productStokAdi) || [];
                    
                    if (existingStokKodus.length > 0) {
                      // Existing Ürün - use highest stok_kodu
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
                      // New Ürün - use planned stok_kodu
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
                  
                  // Sıfırla batch counter için new planned stok_kodu generation
                  resetBatchSequenceCounter();
                  
                  // Başlat batch sequence before any stok kodu generation
                  await initializeBatchSequence();
                  
                  // Ekle planned stok_kodu a new products için Excel generation
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
                  
                  // Bul existing products using the same duplicate finder logic
                  const existingProductsWithHighestCodes = [];
                  
                  // Use the same stokAdi mapping logic den saveToDatabase
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
                      // Bul the highest stok_kodu (CHOZL1500 > CHOZL1000)
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
                  // İptal any ongoing Excel generation
                  if (isGeneratingExcel) {
                    setCancelExcelGeneration(true);
                    setIsGeneratingExcel(false);
                    setIsSavingToDatabase(false); // Close unified modal
                    setExcelProgress({ current: 0, total: 0, operation: '' });
                    setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
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
                      <div key={index} className="text-sm mb-1 flex items-center gap-2">
                        <span className="font-mono text-green-600">{product.newStokKodu}</span> -
                        <span className="flex-1">{product.stokAdi}</span>
                        <span className="text-xs text-gray-600">
                          (Boy: {product.cubukSayisiBoy || 0}, En: {product.cubukSayisiEn || 0})
                        </span>
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
                          <th className="text-left p-2 font-medium text-gray-700 border-r border-gray-200">Çubuk Sayısı</th>
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
                              <div className="text-xs text-gray-700">
                                <div className="font-medium">Boy: {product.cubukSayisiBoy || 0}</div>
                                <div className="font-medium">En: {product.cubukSayisiEn || 0}</div>
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
                                  // Generate specific NCBK products needed için this CH Ürün
                                  const boyCap = parseFloat(product.boyCap || 0);
                                  const enCap = parseFloat(product.enCap || 0);
                                  const neededNCBK = [];
                                  
                                  // Boy direction NCBK (actual uzunlukBoy)
                                  if (boyCap > 0) {
                                    const uzunlukBoy = parseInt(product.uzunlukBoy || 0);
                                    const boyNCBKStokKodu = `YM.NCBK.${safeCapToCode(boyCap)}.${uzunlukBoy}`;
                                    const boyNCBKStokAdi = `YM Nervürlü Çubuk ${formatDecimalForDisplay(boyCap, true)} mm ${uzunlukBoy} cm`;
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
                                    const enNCBKStokKodu = `YM.NCBK.${safeCapToCode(enCap)}.${uzunlukEn}`;
                                    const enNCBKStokAdi = `YM Nervürlü Çubuk ${formatDecimalForDisplay(enCap, true)} mm ${uzunlukEn} cm`;
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
                                  // Generate specific NTEL products needed için this CH Ürün
                                  const boyCap = parseFloat(product.boyCap || 0);
                                  const enCap = parseFloat(product.enCap || 0);
                                  const neededNTEL = [];
                                  
                                  // Boy direction NTEL
                                  if (boyCap > 0) {
                                    const boyNTELStokKodu = `YM.NTEL.${safeCapToCode(boyCap)}`;
                                    const boyNTELStokAdi = `YM Nervürlü Tel ${boyCap} mm`;
                                    const boyExists = savedProducts.ntel?.some(p => p.stok_kodu === boyNTELStokKodu || p.stok_adi === boyNTELStokAdi);
                                    
                                    neededNTEL.push({
                                      stokKodu: boyNTELStokKodu,
                                      exists: boyExists,
                                      label: `${boyCap}mm Tel`,
                                      diameter: boyCap
                                    });
                                  }
                                  
                                  // En direction NTEL (if different den boy)
                                  if (enCap > 0 && enCap !== boyCap) {
                                    const enNTELStokKodu = `YM.NTEL.${safeCapToCode(enCap)}`;
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
                        // Extract Göz Aralığı den stok adı
                        const gozMatch = duplicate.stokAdi.match(/Göz Ara\(([^)]+)\)/);
                        const gozAraligi = gozMatch ? gozMatch[1] : 'N/A';
                        
                        // Use the main analysis results instead of re-analyzing
                        // Kontrol et if this duplicate's stokAdi is in the newProducts Liste
                        const isInNewProducts = preSaveConfirmData.newProducts.some(p => 
                          p.stokAdi === duplicate.stokAdi
                        );
                        
                        // Kontrol et if this duplicate's stokAdi is in the existingProducts Liste
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
                      const newProducts = await saveToDatabase(validProducts, true); // Keep progress for Excel
                      if (newProducts && newProducts.length > 0) {
                        console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için - database fetch mode`);
                        
                        // Unified approach: Getir saved products den database ile fallback
                        try {
                          // Direct unified Getir approach - use the stok_kodu den saved products
                          const stokKodular = newProducts.map(p => p.existingStokKodu || generateStokKodu(p, 'CH', 0)).filter(Boolean);
                          console.log('Looking for these stok_kodu values:', stokKodular);
                          
                          // Ekle small delay a ensure database consistency
                          await new Promise(resolve => setTimeout(resolve, 800));
                          
                          // DIRECT APPROACH: Use saved products Veri directly instead of database Getir
                          console.log('🚀 Using saved products data directly - bypassing database fetch (instance 4)');
                          const databaseProducts = newProducts.map(product => ({
                            ...product,
                            productType: product.existingStokKodu?.startsWith('CHOZL') ? 'MM' : 
                                       product.existingStokKodu?.startsWith('YM.NCBK') ? 'NCBK' : 
                                       product.existingStokKodu?.startsWith('YM.NTEL') ? 'NTEL' : 'MM',
                            isOptimized: true,
                            stok_adi: product.stokAdi || generateStokAdi(product, 'CH'),
                            ingilizce_isim: product.ingilizceIsim || generateIngilizceIsim(product),
                            hasirTuru: product.hasirTuru || 'Standart',
                            boyAraligi: calculateGozAraligi(product.hasirTipi || '', 'boy'),
                            enAraligi: calculateGozAraligi(product.hasirTipi || '', 'en'),
                            gozAraligi: `${calculateGozAraligi(product.hasirTipi || '', 'boy')}x${calculateGozAraligi(product.hasirTipi || '', 'en')}`
                          }));
                          
                          if (databaseProducts && databaseProducts.length > 0) {
                            // DIRECT EXCEL: Call Excel functions directly ile saved Veri
                            console.log('🎯 DIRECT EXCEL: Starting Excel generation with saved data');
                            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
                            
                            setExcelProgress({ current: 1, total: 2, operation: 'Stok Kartı Excel oluşturuluyor...' });
                            await generateStokKartiExcel(databaseProducts, timestamp, false);

                            setExcelProgress({ current: 2, total: 2, operation: 'Reçete Excel oluşturuluyor...' });
                            await generateMergedReceteExcel(databaseProducts, timestamp, false);
                            
                            // CLEANUP: Kapat Modal and Sıfırla states after successful Excel generation
                            setIsGeneratingExcel(false);
                            setIsSavingToDatabase(false);
                            setIsLoading(false);
                            setExcelProgress({ current: 0, total: 0, operation: '' });
                            setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
                            
                            toast.success(`${databaseProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Direct Data)`);
                          } else {
                            // Fallback a original method if unified Getir fails
                            console.warn('Unified fetch returned no data, using original data');
                            await generateExcelFiles(newProducts, false);
                            toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Original method)`);
                          }
                        } catch (innerError) {
                          console.error('Unified fetch failed, falling back to original method:', innerError);
                          await generateExcelFiles(newProducts, false);
                          toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu! (Fallback to original)`);
                        } finally {
                          // CLEANUP: Always Kapat Modal and Sıfırla states after Excel generation (Başarılı or failure)
                          setIsGeneratingExcel(false);
                          setIsSavingToDatabase(false);
                          setIsLoading(false);
                          setExcelProgress({ current: 0, total: 0, operation: '' });
                          setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
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

  // Expose fetchSavedProducts a parent Bileşen
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

// OPTIMIZATION: Memoize the Bileşen a prevent unnecessary re-renders
export default memo(CelikHasirNetsis, (prevProps, nextProps) => {
  // Custom comparison function için better performance
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