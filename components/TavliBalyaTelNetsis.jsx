// Tavlı Tel / Balya Teli Maliyet Hesaplama Componenti
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth, normalizeInputValue } from '@/api-config';
import { fetchWithCorsProxy, CORS_PROXY_API_URLS } from '@/lib/cors-proxy';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// YM ST Wire Drawing Matrix (from GalvanizliTel - REUSED for YM.ST product creation)
// Products >= 1.50mm use TLC01 direct drawing, < 1.50mm use COTLC01 two-step method
// Priority: 0 = Ana (Main), 1 = ALT_1, 2 = ALT_2, etc.
// NOTE: Each key represents a RANGE (e.g., 1.50 covers 1.50-1.59mm, 7.20 covers 7.20-7.29mm)
// NOTE: Matrix only includes >= 1.50mm targets (< 1.50mm products use YM.ST sources, not Filmaşin)
const YM_ST_FILMASIN_PRIORITY_MAP = {
  // 1.50-1.59mm range: Ana=6.0/1006, ALT_1=5.5/1006, ALT_2=6.0/1008
  1.50: [{ diameter: 6.0, quality: '1006' }, { diameter: 5.5, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 1.60-1.69mm range: Ana=6.0/1006, ALT_1=5.5/1006, ALT_2=6.0/1008
  1.60: [{ diameter: 6.0, quality: '1006' }, { diameter: 5.5, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 1.70-1.79mm range: Ana=6.0/1006, ALT_1=6.0/1008
  1.70: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 1.80-1.89mm range: Ana=6.0/1006, ALT_1=6.0/1008
  1.80: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 1.90-1.99mm range: Ana=6.0/1006, ALT_1=6.0/1008
  1.90: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 2.00-2.09mm range: Ana=6.0/1006, ALT_1=6.0/1008
  2.00: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 2.10-2.19mm range: Ana=6.0/1006, ALT_1=6.0/1008
  2.10: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 2.20-2.29mm range: Ana=6.0/1006, ALT_1=6.0/1008, ALT_2=5.5/1006
  2.20: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }, { diameter: 5.5, quality: '1006' }],
  // 2.30-2.39mm range: Ana=6.0/1006, ALT_1=6.0/1008, ALT_2=5.5/1006
  2.30: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }, { diameter: 5.5, quality: '1006' }],
  // 2.40-2.49mm range: Ana=6.0/1006, ALT_1=6.0/1008
  2.40: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 2.50-2.59mm range: Ana=6.0/1006, ALT_1=6.0/1008
  2.50: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 2.60-2.69mm range: Ana=6.0/1006, ALT_1=6.0/1008
  2.60: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 2.70-2.79mm range: Ana=6.0/1006, ALT_1=6.0/1008
  2.70: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 2.80-2.89mm range: Ana=6.0/1006, ALT_1=6.0/1008
  2.80: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 2.90-2.99mm range: Ana=6.0/1006, ALT_1=6.0/1008
  2.90: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 3.00-3.09mm range: Ana=6.0/1006, ALT_1=6.0/1008
  3.00: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 3.10-3.19mm range: Ana=6.0/1006, ALT_1=6.0/1008
  3.10: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 3.20-3.29mm range: Ana=6.0/1006, ALT_1=6.0/1008
  3.20: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 3.30-3.39mm range: Ana=6.0/1006, ALT_1=6.0/1008
  3.30: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 3.40-3.49mm range: Ana=6.0/1006, ALT_1=6.0/1008
  3.40: [{ diameter: 6.0, quality: '1006' }, { diameter: 6.0, quality: '1008' }],
  // 3.50-3.59mm range: Ana=6.0/1008, ALT_1=7.0/1008, ALT_2=7.0/1010
  3.50: [{ diameter: 6.0, quality: '1008' }, { diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 3.60-3.69mm range: Ana=6.0/1008, ALT_1=7.0/1008, ALT_2=7.0/1010
  3.60: [{ diameter: 6.0, quality: '1008' }, { diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 3.70-3.79mm range: Ana=6.0/1008, ALT_1=7.0/1008, ALT_2=7.0/1010
  3.70: [{ diameter: 6.0, quality: '1008' }, { diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 3.80-3.89mm range: Ana=6.0/1008, ALT_1=7.0/1008, ALT_2=7.0/1010
  3.80: [{ diameter: 6.0, quality: '1008' }, { diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 3.90-3.99mm range: Ana=6.0/1008, ALT_1=7.0/1008, ALT_2=7.0/1010
  3.90: [{ diameter: 6.0, quality: '1008' }, { diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.00-4.09mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.00: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.10-4.19mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.10: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.20-4.29mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.20: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.30-4.39mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.30: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.40-4.49mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.40: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.50-4.59mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.50: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.60-4.69mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.60: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.70-4.79mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.70: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.80-4.89mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.80: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 4.90-4.99mm range: Ana=7.0/1008, ALT_1=7.0/1010
  4.90: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.00-5.09mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.00: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.10-5.19mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.10: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.20-5.29mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.20: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.30-5.39mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.30: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.40-5.49mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.40: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.50-5.59mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.50: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.60-5.69mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.60: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.70-5.79mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.70: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.80-5.89mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.80: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 5.90-5.99mm range: Ana=7.0/1008, ALT_1=7.0/1010
  5.90: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 6.00-6.09mm range: Ana=7.0/1008, ALT_1=7.0/1010
  6.00: [{ diameter: 7.0, quality: '1008' }, { diameter: 7.0, quality: '1010' }],
  // 6.10-6.19mm range: Ana=8.0/1010
  6.10: [{ diameter: 8.0, quality: '1010' }],
  // 6.20-6.29mm range: Ana=8.0/1010
  6.20: [{ diameter: 8.0, quality: '1010' }],
  // 6.30-6.39mm range: Ana=8.0/1010
  6.30: [{ diameter: 8.0, quality: '1010' }],
  // 6.40-6.49mm range: Ana=8.0/1010
  6.40: [{ diameter: 8.0, quality: '1010' }],
  // 6.50-6.59mm range: Ana=8.0/1010
  6.50: [{ diameter: 8.0, quality: '1010' }],
  // 6.60-6.69mm range: Ana=8.0/1010
  6.60: [{ diameter: 8.0, quality: '1010' }],
  // 6.70-6.79mm range: Ana=8.0/1010
  6.70: [{ diameter: 8.0, quality: '1010' }],
  // 6.80-6.89mm range: Ana=8.0/1010
  6.80: [{ diameter: 8.0, quality: '1010' }],
  // 6.90-6.99mm range: Ana=8.0/1010
  6.90: [{ diameter: 8.0, quality: '1010' }],
  // 7.00-7.09mm range: Ana=9.0/1010, ALT_1=9.0/1008
  7.00: [{ diameter: 9.0, quality: '1010' }, { diameter: 9.0, quality: '1008' }],
  // 7.10-7.19mm range: Ana=9.0/1010, ALT_1=9.0/1008
  7.10: [{ diameter: 9.0, quality: '1010' }, { diameter: 9.0, quality: '1008' }],
  // 7.20-7.29mm range: Ana=9.0/1010, ALT_1=9.0/1008
  7.20: [{ diameter: 9.0, quality: '1010' }, { diameter: 9.0, quality: '1008' }],
  // 7.30-7.39mm range: Ana=9.0/1010, ALT_1=9.0/1008
  7.30: [{ diameter: 9.0, quality: '1010' }, { diameter: 9.0, quality: '1008' }],
  // 7.40-7.49mm range: Ana=9.0/1010, ALT_1=9.0/1008
  7.40: [{ diameter: 9.0, quality: '1010' }, { diameter: 9.0, quality: '1008' }],
  // 7.50-7.59mm range: Ana=9.0/1010, ALT_1=9.0/1008
  7.50: [{ diameter: 9.0, quality: '1010' }, { diameter: 9.0, quality: '1008' }],
  // 8.00-8.09mm range: Ana=10.0/1010
  8.00: [{ diameter: 10.0, quality: '1010' }],
  // 8.10-8.19mm range: Ana=10.0/1010
  8.10: [{ diameter: 10.0, quality: '1010' }]
};

// Helper: Floor diameter to matrix range (e.g., 7.29 → 7.20, 4.18 → 4.10)
const floorToMatrixRange = (diameter) => {
  const d = parseFloat(diameter);
  if (d < 1.50) return null; // Below matrix range
  if (d >= 8.10) return 8.10; // Max range

  // Floor to nearest 0.10mm, except for ranges that jump (6.00→6.10, 7.50→8.00)
  const floored = Math.floor(d * 10) / 10;
  if (floored >= 6.00 && floored < 6.10) return 6.00;
  if (floored >= 7.50 && floored < 8.00) return 7.50;
  return floored;
};

/**
 * Get YM ST alternatives for YM TT/YM STP recipe generation
 * Returns array of YM.ST stock codes with priorities for a given YM TT/YM STP diameter
 * @param {number} ymTtDiameter - Target YM TT/YM STP diameter (e.g., 1.96, 3.00)
 * @param {boolean} needsPressing - Whether the product requires pressing (cap > 1.8mm)
 * @returns {Array} Array of {stokKodu, priority} objects
 */
const getYmStAlternativesForYmTt = (ymTtDiameter, needsPressing = false) => {
  const diameter = parseFloat(ymTtDiameter);

  // Get matrix range key
  const rangeKey = floorToMatrixRange(diameter);
  if (!rangeKey) {
    console.warn(`No priority matrix entry for diameter: ${diameter}`);
    return [];
  }

  // Get priority list from matrix
  const priorityList = YM_ST_FILMASIN_PRIORITY_MAP[rangeKey];
  if (!priorityList || priorityList.length === 0) {
    console.warn(`No alternatives found for range key: ${rangeKey}`);
    return [];
  }

  // Generate YM.ST stock codes for each priority
  const alternatives = priorityList.map((filmasin, priority) => {
    const ymStDiameter = filmasin.diameter;
    const quality = filmasin.quality;

    // Format: YM.ST.{cap}.{filmasin}.{quality}[.P]
    const capCode = Math.round(diameter * 100).toString().padStart(4, '0');
    const filmasinCode = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
    let stokKodu = `YM.ST.${capCode}.${filmasinCode}.${quality}`;

    // Add .P suffix if pressing is needed
    if (needsPressing) {
      stokKodu += '.P';
    }

    return {
      stokKodu,
      priority,
      ymStDiameter,
      quality
    };
  });

  return alternatives;
};

// YM ST COILER (.ST) Products Alternative Matrix
// For .ST products (COTLC01 method) that use classical YM.ST products as sources
// Main (0) uses xxx.0600.1006, ALT 1 uses xxx.0600.1008, ALT 2 uses xxx.0550.1006
// NOTE: Only for diameters 2.00-2.30mm (.ST product final diameters)
// ============================================================================
// COILER ALTERNATIVE MATRIX - For YM ST RECETE ALT Sheets
// Based on: COİL ALTERNATİF.csv
// ============================================================================
const COILER_ALTERNATIVE_MATRIX = {
  // Category 1: 0.84mm ONLY (YM.ST.084.ST)
  '0.84': [
    { priority: 0, cap: 2.16, filmasin: 6.0, quality: '1006' },
    { priority: 1, cap: 2.16, filmasin: 5.5, quality: '1006' },
    { priority: 2, cap: 2.26, filmasin: 5.5, quality: '1006' },
    { priority: 3, cap: 2.26, filmasin: 6.0, quality: '1006' },
    { priority: 4, cap: 2.36, filmasin: 5.5, quality: '1006' },
    { priority: 5, cap: 2.36, filmasin: 6.0, quality: '1006' }
  ],

  // Category 1.5: 1.16mm ONLY (Special ZIRH TELİ product)
  '1.16': [
    { priority: 0, cap: 2.26, filmasin: 5.5, quality: '1005' },  // Main: YM.ST.0226.0550.1005
    { priority: 1, cap: 2.16, filmasin: 5.5, quality: '1005' }   // Alt 1: YM.ST.0216.0550.1005
  ],

  // Category 2: 1.49mm and below (excluding 0.84mm and 1.16mm)
  // Per COİL ALTERNATİF matrix: Only 6 alternatives (0-5), all 1006 grade
  '≤1.49': [
    { priority: 0, cap: 2.26, filmasin: 6.0, quality: '1006' },
    { priority: 1, cap: 2.26, filmasin: 5.5, quality: '1006' },
    { priority: 2, cap: 2.16, filmasin: 5.5, quality: '1006' },
    { priority: 3, cap: 2.16, filmasin: 6.0, quality: '1006' },
    { priority: 4, cap: 2.36, filmasin: 5.5, quality: '1006' },
    { priority: 5, cap: 2.36, filmasin: 6.0, quality: '1006' }
  ],

  // Category 3: 1.50mm to 1.79mm
  '1.50-1.79': [
    { priority: 0, cap: 2.26, filmasin: 6.0, quality: '1006' },
    { priority: 1, cap: 2.26, filmasin: 5.5, quality: '1006' },
    { priority: 2, cap: 2.16, filmasin: 5.5, quality: '1006' },
    { priority: 3, cap: 2.16, filmasin: 6.0, quality: '1006' },
    { priority: 4, cap: 2.36, filmasin: 5.5, quality: '1006' },
    { priority: 5, cap: 2.36, filmasin: 6.0, quality: '1006' },
    { priority: 6, cap: 2.16, filmasin: 6.0, quality: '1008' },
    { priority: 7, cap: 2.26, filmasin: 6.0, quality: '1008' },
    { priority: 8, cap: 2.36, filmasin: 6.0, quality: '1008' }
  ],

  // ✅ ADDED: Category 4: 1.80mm-3.49mm - Standard filmaşin range
  // Ana=6.0/1006, ALT_1=6.0/1008, ALT_2=5.5/1006 (3 alternatives like in FILMAŞIN matrix)
  '1.80-3.49': [
    { priority: 0, cap: 2.26, filmasin: 6.0, quality: '1006' },
    { priority: 1, cap: 2.26, filmasin: 6.0, quality: '1008' },
    { priority: 2, cap: 2.26, filmasin: 5.5, quality: '1006' }
  ],

  // ✅ ADDED: Category 5: 3.50mm-3.99mm - Thicker filmaşin
  // Ana=6.0/1008, ALT_1=7.0/1008, ALT_2=7.0/1010 (3 alternatives)
  '3.50-3.99': [
    { priority: 0, cap: 2.26, filmasin: 6.0, quality: '1008' },
    { priority: 1, cap: 2.26, filmasin: 7.0, quality: '1008' },
    { priority: 2, cap: 2.26, filmasin: 7.0, quality: '1010' }
  ],

  // ✅ ADDED: Category 6: 4.00mm-6.99mm - Thick filmaşin
  // Ana=7.0/1008, ALT_1=7.0/1010 (2 alternatives)
  '4.00-6.99': [
    { priority: 0, cap: 2.26, filmasin: 7.0, quality: '1008' },
    { priority: 1, cap: 2.26, filmasin: 7.0, quality: '1010' }
  ],

  // ✅ ADDED: Category 7: 7.00mm-7.99mm - Very thick filmaşin
  // Ana=9.0/1010, ALT_1=9.0/1008 (2 alternatives)
  '7.00-7.99': [
    { priority: 0, cap: 2.26, filmasin: 9.0, quality: '1010' },
    { priority: 1, cap: 2.26, filmasin: 9.0, quality: '1008' }
  ],

  // ✅ ADDED: Category 8: 8.00mm and above - Maximum thickness
  // Ana=10.0/1010 (1 alternative - main only)
  '≥8.00': [
    { priority: 0, cap: 2.26, filmasin: 10.0, quality: '1010' }
  ]
};

// Helper: Determine which COILER category a .ST product belongs to
const getCoilerCategory = (stokKodu) => {
  // Extract diameter from YM.ST.084.ST -> 0.84mm
  const match = stokKodu.match(/YM\.ST\.(\d{4})\.ST/);
  if (!match) return null;

  const diameter = parseInt(match[1], 10) / 100; // 084 -> 0.84

  if (diameter === 0.84) return '0.84';
  if (diameter === 1.16) return '1.16'; // Special ZIRH TELİ product
  if (diameter <= 1.49) return '≤1.49';
  if (diameter >= 1.50 && diameter <= 1.79) return '1.50-1.79';

  return null; // Outside COILER range
};

// Helper: Generate alternative recipes for .ST COILER products
// Uses COILER_ALTERNATIVE_MATRIX to generate up to 8 alternatives
const generateCoilerAlternatives = (mainRecipes, ymStProducts) => {
  console.log(`🔄 TÜM ÜRÜNLER: Generating COILER alternatives (up to 8) for .ST products using new matrix...`);
  console.log(`📊 Input: ${mainRecipes.length} recipes, ${ymStProducts.length} products`);

  // Structure: { 1: [...], 2: [...], ..., 8: [...] }
  const alternativesByPriority = {};

  // Group recipes by product - support both mamul_kodu and ym_st_stok_kodu
  const recipesByProduct = {};
  mainRecipes.forEach(recipe => {
    // Support both database field names (mamul_kodu) and runtime field names (ym_st_stok_kodu)
    const productCode = recipe.mamul_kodu || recipe.ym_st_stok_kodu;
    if (!productCode) {
      console.warn('⚠️ Recipe missing both mamul_kodu and ym_st_stok_kodu:', recipe);
      return;
    }

    if (!recipesByProduct[productCode]) {
      recipesByProduct[productCode] = [];
    }
    recipesByProduct[productCode].push(recipe);
  });

  console.log(`📋 TÜM ÜRÜNLER: Processing ${Object.keys(recipesByProduct).length} unique YM ST products`);
  console.log(`🔍 Product codes found:`, Object.keys(recipesByProduct).slice(0, 5));

  let stProductCount = 0;

  // For each .ST product, generate alternatives
  Object.keys(recipesByProduct).forEach(stokKodu => {
    // Check if it's a .ST product (COTLC01 method)
    if (!stokKodu.endsWith('.ST')) {
      return; // Skip non-.ST products silently
    }

    stProductCount++;
    const productRecipes = recipesByProduct[stokKodu];

    // Determine which COILER category this product belongs to
    const category = getCoilerCategory(stokKodu);
    if (!category) {
      console.log(`⚠️ ${stokKodu}: Not in COILER matrix range, skipping`);
      return;
    }

    const alternatives = COILER_ALTERNATIVE_MATRIX[category];
    console.log(`🔄 ${stokKodu}: Category ${category}, ${alternatives.length} alternatives available`);

    // For each alternative priority (1-8)
    for (let priority = 1; priority <= 8; priority++) {
      // Find the alternative definition for this priority
      const altDef = alternatives.find(a => a.priority === priority);
      if (!altDef) {
        // This priority doesn't exist for this category (e.g., priority 6-8 for ≤1.49mm products)
        continue;
      }

      // Get the main bilesen (priority 0) definition
      const mainDef = alternatives.find(a => a.priority === 0);

      // Calculate duration adjustment ratio
      // Logic: Less reduction needed = Less time
      // Thinner starting bilesen (smaller cap) → LESS reduction needed → SHORTER duration
      // Thicker starting bilesen (larger cap) → MORE reduction needed → LONGER duration
      // Example: To produce 0.73mm, starting from 2.16mm is faster than starting from 2.26mm
      // Formula: (altCap/mainCap)² where altCap < mainCap gives ratio < 1 (shorter duration)
      const durationRatio = Math.pow(altDef.cap / mainDef.cap, 2);

      // Initialize priority array if needed
      if (!alternativesByPriority[priority]) {
        alternativesByPriority[priority] = [];
      }

      // Generate alternative recipes for this product at this priority
      productRecipes.forEach(recipe => {
        if (recipe.operasyon_bilesen === 'B') {
          // BILESEN ROW: Replace bilesen_kodu with alternative
          const oldBilesenKodu = recipe.bilesen_kodu;

          // Build new bilesen code: YM.ST.{cap}.{filmasin}.{quality}
          const capCode = String(Math.round(altDef.cap * 100)).padStart(4, '0');
          const filmasinCode = String(Math.round(altDef.filmasin * 100)).padStart(4, '0');
          const newBilesenKodu = `YM.ST.${capCode}.${filmasinCode}.${altDef.quality}`;

          alternativesByPriority[priority].push({
            ...recipe,
            bilesen_kodu: newBilesenKodu,
            miktar: 1  // ALWAYS 1 kg: 1 kg source material → 1 kg final product
          });

          console.log(`  ✅ ALT ${priority}: ${oldBilesenKodu} → ${newBilesenKodu} (1 kg, duration ratio: ${durationRatio.toFixed(4)})`);
        } else {
          // OPERATION ROW: Adjust duration based on cap (wire diameter) change
          if (recipe.miktar && durationRatio !== 1.0) {
            const oldDuration = parseFloat(recipe.miktar);
            const newDuration = oldDuration * durationRatio;
            alternativesByPriority[priority].push({
              ...recipe,
              miktar: parseFloat(newDuration.toFixed(5))
            });
          } else {
            alternativesByPriority[priority].push({ ...recipe });
          }
        }
      });
    }
  });

  console.log(`📋 TÜM ÜRÜNLER: Processed ${stProductCount} .ST products`);
  Object.keys(alternativesByPriority).forEach(priority => {
    console.log(`  ALT ${priority}: ${alternativesByPriority[priority].length} recipes`);
  });

  return alternativesByPriority;
};

// Tavlı Tel / Balya Teli Recipe Structure - 4 Production Flows with Intermediates
// ============================================================================
// CORRECTED FLOWS (YM YB does not exist - both use YM TT):
// FLOW 1 - TAVLI Simple (cap ≤ 1.8): YM.ST → TAV01 → YM.TT → TVPKT01 → TT.BAG
// FLOW 2 - TAVLI Pressed (cap > 1.8): YM.ST → STPRS01 → YM.STP → TAV01 → YM.TT → TVPKT01 → TT.BAG
// FLOW 3 - BALYA Simple (cap ≤ 1.8): YM.ST → TAV01 → YM.TT → BAL01 → TT.BALYA
// FLOW 4 - BALYA Pressed (cap > 1.8): YM.ST → STPRS01 → YM.STP → TAV01 → YM.TT → BAL01 → TT.BALYA
// Both product types share the same YM TT intermediate after annealing
// ============================================================================

// OPERATION DURATIONS (Unit: DK) - UPDATED from gene3l.csv
// TAV01: 5 ton için 15 saat → 900 dk / 5000 kg = 0.18 dk per kg
// STPRS01: 650 kg için 4.5 dk → (4.5 / 650) * kg
// TVPKT01: 1 Kangal İçin (per coil) → shrinkli 5 dk / shrinksiz 2.5 dk
//   SPECIAL: "1.2 mm tavlı paketleme" → 2.5 saat / 5 ton = 150 dk / 5000 kg = 0.03 dk per kg
// BAL01: 8 saat 2 ton → 480 dk / 2000 kg = 0.24 dk per kg
const OPERATION_DURATIONS = {
  // TAV01 - PER BATCH (5 ton = 15 hours)
  // Example: 500kg kangal → 0.18 * 500 = 90 dk (900/10)
  TAV01: (kg) => parseFloat((0.18 * kg).toFixed(6)),

  // STPRS01 - Per 650 kg (unchanged)
  STPRS01: (kg) => parseFloat(((4.5 / 650) * kg).toFixed(6)),

  // TVPKT01 - VARIABLE: Per coil for normal, per kg for ≤1.2mm
  // ✅ FIX: Special case for 1.2mm products (per 3.csv line 5-6)
  TVPKT01: (hasShrink, diameter, kg) => {
    // Special case: For diameters ≤ 1.2mm, use per-kg formula
    if (diameter && diameter <= 1.2) {
      return parseFloat((0.03 * kg).toFixed(6));  // 150 dk / 5000 kg = 0.03 dk/kg
    }
    // Normal case: Per coil formula
    return hasShrink ? 5 : 2.5;
  },

  // BAL01 - PER BATCH (8 hours = 480 dk per 2 ton)
  // Example: 1000kg → 0.24 * 1000 = 240 dk
  BAL01: (kg) => parseFloat((0.24 * kg).toFixed(6))
};

// Helper function to get operation duration
const getOperationDuration = (operation, kg, hasShrink = false, diameter = null) => {
  if (operation === 'TAV01') return OPERATION_DURATIONS.TAV01(kg);
  if (operation === 'STPRS01') return OPERATION_DURATIONS.STPRS01(kg);
  if (operation === 'TVPKT01') return OPERATION_DURATIONS.TVPKT01(hasShrink, diameter, kg);
  if (operation === 'BAL01') return OPERATION_DURATIONS.BAL01(kg);
  return 0;
};

// AUXILIARY COMPONENT MAPPINGS (Display code → Database code)
// ✅ UPDATED from gene2l.csv: Removed Streç (not listed in new constraints)
const AUXILIARY_COMPONENTS = {
  // Reused from Galvanizli (UPDATED: Removed SM.DESİ.PAK - not in tavlı/balya CSV)
  'AMB.APEX CEMBER 38X080': 'SM-AMB-000017', // Çelik Çember (for YM TT and YM STP)
  'AMB.PLASTİK.ÇEMBER': 'SM-AMB-000024', // Plastik Çember (for MM TAVLI/BALYA - OILED ONLY)
  'AMB.TOKA.SIGNODE.114P. DKP': 'SM-AMB-000018', // Çember Tokası
  'SM.7MMHALKA': 'SM-AMB-000023', // Kaldırma Kancası
  'AMB.ÇEM.KARTON.GAL': 'SM-AMB-000019', // Karton (OILED ONLY per gene2l.csv)
  'AMB.SHRİNK.200*140CM': 'SM-AMB-000027', // Shrink - from Galvanizli logic
  'AMB.SHRİNK.200*160CM': 'SM-AMB-000028',
  'AMB.SHRİNK.200*190CM': 'SM-AMB-000030',
  // ❌ REMOVED: 'AMB.STREÇ' - not in gene2l.csv constraints
  'AMB.PALET': 'SM-AMB-000026', // Palet (SM-AMB-000164 per gene2l.csv)
  // YM STP and YM TT helper components (same codes as above, just for clarity)
  'AMB.ÇELIK.ÇEMBER': 'SM-AMB-000017', // Çelik Çember (same as APEX CEMBER)
  'AMB.ÇEMBER.TOKASI': 'SM-AMB-000018', // Çember Tokası (same as TOKA)
  'AMB.KALDIRMA.KANCASI': 'SM-AMB-000023' // Kaldırma Kancası (same as HALKA)
};

// STOCK CODE GENERATION HELPERS
// ============================================================================
/**
 * Generates the product prefix based on product type
 * @param {string} productType - 'TAVLI' or 'BALYA'
 * @returns {string} - 'TT.BAG' or 'TT.BALYA'
 */
const getProductPrefix = (productType) => {
  return productType === 'TAVLI' ? 'TT.BAG' : 'TT.BALYA';
};

/**
 * Formats diameter to 4-digit code (e.g., 1.20 → "0120")
 * @param {number|string} diameter - Diameter in mm
 * @returns {string} - Formatted 4-digit code
 */
const formatDiameterCode = (diameter) => {
  return Math.round(parseFloat(diameter) * 100).toString().padStart(4, '0');
};

/**
 * Generates finished product stock code (MM)
 * @param {string} productType - 'TAVLI' or 'BALYA'
 * @param {number|string} diameter - Diameter in mm
 * @param {string} sequence - Sequence number (e.g., '00', '01')
 * @returns {string} - Stock code (e.g., 'TT.BAG.0120.00')
 */
const generateMmStokKodu = (productType, diameter, sequence = '00') => {
  const prefix = getProductPrefix(productType);
  const capCode = formatDiameterCode(diameter);
  return `${prefix}.${capCode}.${sequence}`;
};

/**
 * Generates intermediate product stock code (YM)
 * @param {string} intermediateType - 'TT' (annealed) or 'YB' (oiled bale) or 'STP' (pressed)
 * @param {number|string} diameter - Diameter in mm
 * @param {string} sequence - Sequence number
 * @returns {string} - Stock code (e.g., 'YM.TT.0120.00')
 */
const generateYmStokKodu = (intermediateType, diameter, sequence = '00') => {
  const capCode = formatDiameterCode(diameter);
  return `YM.${intermediateType}.${capCode}.${sequence}`;
};

const TavliBalyaTelNetsis = () => {
  const { user, hasPermission } = useAuth();
  
  // Coklu onay islemini engellemek icin ref
  const isProcessingApproval = useRef(false);
  
  // Onay surecinde cakisan modal engellemek icin
  const [isInApprovalProcess, setIsInApprovalProcess] = useState(false);
  
  // Ana state degiskenleri
  const [currentStep, setCurrentStep] = useState('input'); // input, summary, processing
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false); // New state for recipe loading
  
  // Islem sirasi - DB kaydi sirasinda belirlenir
  const [processSequence, setProcessSequence] = useState('00');
  
  // Hesaplamalar icin kullanici girdileri
  const [userInputValues, setUserInputValues] = useState({
    ash: 5.54, // Kul miktari
    lapa: 2.73, // Lapa miktari
    uretim_kapasitesi_aylik: 2800,
    toplam_tuketilen_asit: 30000,
    ortalama_uretim_capi: 3.08,
    paketlemeDkAdet: 10
  });
  
  // Talep yonetimi stateler
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [isRequestUsed, setIsRequestUsed] = useState(false); // Talep kullanilma durumu
  const [isEditingRequest, setIsEditingRequest] = useState(false); // Talep duzenleme durumu
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [pendingApprovalAction, setPendingApprovalAction] = useState(null); // 'approve' or 'edit'
  
  // Filtreleme ve siralama durumu
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // ID yerine kullanici adlarini gostermek icin kullanici haritalama
  const [users, setUsers] = useState({}); // id -> kullanici_adi haritalamasi
  
  // Mevcut TT (Tavlı Tel / Balya Teli) ürün seçimi için state'ler
  const [existingMms, setExistingMms] = useState([]); // Renamed from existingMms
  const [selectedExistingMm, setSelectedExistingMm] = useState(null);
  const [showExistingMmModal, setShowExistingMmModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('mm'); // Only 'mm' (no intermediate products)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [activeDbTab, setActiveDbTab] = useState('mm'); // Database tab: 'mm' for finished products

  // REMOVED: Coiler Recete and YM ST Recete modals (not needed for Tavli/Balya)
  // Tavli/Balya uses YM.ST directly without Filmaşin intermediates

  // Change preview modal for edit mode
  const [showChangePreviewModal, setShowChangePreviewModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(null);
  
  // Database detail modal for showing product details
  const [showDatabaseDetailModal, setShowDatabaseDetailModal] = useState(false);
  const [selectedDatabaseProduct, setSelectedDatabaseProduct] = useState(null);

  // YM ST veritabani secim modali
  const [showYmStSelectionModal, setShowYmStSelectionModal] = useState(false);
  const [allYmStsForSelection, setAllYmStsForSelection] = useState([]);
  const [ymStSearchQuery, setYmStSearchQuery] = useState('');
  const [selectedYmStsForAdd, setSelectedYmStsForAdd] = useState([]);

  // Coiler modal states (unused in Tavlı Tel but needed for legacy modal code)
  const [showCoilerReceteModal, setShowCoilerReceteModal] = useState(false);
  const [showYmStReceteModal, setShowYmStReceteModal] = useState(false);
  const [coilerTargetDiameter, setCoilerTargetDiameter] = useState('');
  const [coilerSourceYmSts, setCoilerSourceYmSts] = useState([]);
  const [coilerSourceYmStSearch, setCoilerSourceYmStSearch] = useState('');
  const [isGeneratingCoilerExcel, setIsGeneratingCoilerExcel] = useState(false);

  // Intermediate product modal states
  const [showYmTtModal, setShowYmTtModal] = useState(false);

  // Stub functions for Coiler modal (unused in Tavlı Tel)
  const toggleSourceYmStSelection = () => {};
  const generateCoilerExcel = () => {};

  // ========== STUB FUNCTIONS - TODO: Implement properly for Tavlı Tel ==========
  // These functions need proper Tavlı/Balya Tel implementation

  const generateYmGtData = () => {
    // TODO: For Tavlı/Balya, this should generate YM.TT (Tavlı Tel) data from MM data
    // For now, this is a stub to prevent crashes
    console.log('generateYmGtData called - STUB - needs Tavlı/Balya implementation');
    return [];
  };

  const generateYmGtDatabaseData = (sequence) => {
    // TODO: For Tavlı/Balya, format YM.TT data for database
    // For now, return empty object
    console.log('generateYmGtDatabaseData called - STUB - needs Tavlı/Balya implementation');
    return {};
  };

  // ========== END STUB FUNCTIONS ==========

  // YMST listesi için stateler
  const [existingYmSts, setExistingYmSts] = useState([]);
  // REMOVED: activeDbTab (only one tab for TT products, no intermediate products)
  // REMOVED: mainYmStIndex (no 1:1:n relationship for Tavli/Balya)
  
  // Veritabanı filtreleme ve seçim durumları
  const [dbSearchQuery, setDbSearchQuery] = useState(''); // Arama sorgusu
  const [dbCapFilter, setDbCapFilter] = useState(''); // Çap filtresi
  const [dbProductTypeFilter, setDbProductTypeFilter] = useState('all'); // Product type filter: TAVLI/BALYA/all
  const [selectedDbItems, setSelectedDbItems] = useState([]); // Seçili ürün ID'leri
  const [isDeletingBulkDb, setIsDeletingBulkDb] = useState(false); // Toplu silme durumu

  // Veritabanı sıralama durumları
  const [dbSortField, setDbSortField] = useState('cap'); // Sıralama alanı (cap, product_type, created_at)
  
  // Task Queue System için state'ler
  const [taskQueue, setTaskQueue] = useState([]); // {id, name, status: 'pending'|'processing'|'completed'|'failed', timestamp}
  const [showTaskQueuePopup, setShowTaskQueuePopup] = useState(false);
  const [showQueueCompletionPopup, setShowQueueCompletionPopup] = useState(false);
  const [completedQueueTasks, setCompletedQueueTasks] = useState([]);
  const [excelGenerationProgress, setExcelGenerationProgress] = useState({}); // {taskId: {loading: bool, progress: number}}
  const taskQueueRef = useRef([]);
  const processingTaskRef = useRef(false);
  
  // Session tracking for approvals
  const sessionStartTime = useRef(new Date());
  const [sessionApprovals, setSessionApprovals] = useState([]);
  
  // Bulk Excel Export için state'ler
  const [showBulkExcelMenu, setShowBulkExcelMenu] = useState(false);
  const [dbSortDirection, setDbSortDirection] = useState('asc'); // Sıralama yönü (asc, desc)
  
  // Kopya onay diyalog durumlari
  const [showDuplicateConfirmModal, setShowDuplicateConfirmModal] = useState(false);
  const [duplicateProducts, setDuplicateProducts] = useState([]);
  const [pendingSaveData, setPendingSaveData] = useState(null);
  
  // Veritabanindan mevcut urun goruntuleme takibi
  const [isViewingExistingProduct, setIsViewingExistingProduct] = useState(false);
  const [isEditingExistingProduct, setIsEditingExistingProduct] = useState(false);
  
  // Urun cakisma uyari modali
  const [showProductConflictModal, setShowProductConflictModal] = useState(false);
  const [conflictProduct, setConflictProduct] = useState(null);
  const [conflictType, setConflictType] = useState(''); // 'exact' veya 'nonkey'
  
  // YMST mevcut uyari modali
  const [showYmStExistsModal, setShowYmStExistsModal] = useState(false);
  const [existingYmStsForModal, setExistingYmStsForModal] = useState([]);
  
  // Oturum takibi - ayni oturumda kaydedilen urunler
  const [sessionSavedProducts, setSessionSavedProducts] = useState({
    mmIds: [], // TT.BAG / TT.BALYA product IDs (no intermediate products)
    ymStIds: [] // YM.ST raw material IDs (shared with Galvanizli)
  });
  
  // Ondalik sayilar icin nokta kullanan fonksiyon
  const normalizeDecimalDisplay = (value) => {
    // Bos degerler icin kontrol
    if (value === null || value === undefined) {
      return '';
    }
    
    // Sayilar icin nokta formatinda
    if (typeof value === 'number') {
      // String cevirme ile nokta ayracini zorla
      return value.toString();
    }
    
    // Virgullu stringler icin nokta cevirimi
    if (typeof value === 'string' && value.includes(',')) {
      return value.replace(/,/g, '.');
    }
    
    // Zaten dogru formatta olanlar icin
    if (typeof value === 'string') {
      return value;
    }
    
    // Varsayilan
    return value ? value.toString() : '';
  };

  // Excel icin ondalik formatla - Stok kartları için 2 ondalik basamak ile
  // IMPORTANT: Preserves sign for tolerance values (e.g., -0.06 stays as -0,06, +0.05 stays as +0,05)
  const formatDecimalForExcel = (value) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    // Sayiya cevir
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return String(value);
    }

    // Preserve sign and format with 2 decimal places
    const formatted = numValue.toFixed(2).replace('.', ',');

    // Add + prefix for positive numbers (negative sign is automatic from toFixed)
    return numValue >= 0 ? '+' + formatted : formatted;
  };

  // Reçete Excel icin ondalik formatla - 5 ondalik basamak ile
  const formatDecimalForReceteExcel = (value) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    
    // Sayiya cevir
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return String(value);
    }

    // 5 ondalik basamak ile formatla ve noktalari virgul yap (sıfırları KALDIR!!!)
    return parseFloat(numValue.toFixed(5)).toString().replace('.', ',');
  };
  
  // Consistent database formatting function
  const formatForDatabase = (value) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Convert to number first, handling both comma and dot decimals
    const strValue = String(value);
    const normalizedValue = strValue.replace(/,/g, '.');
    const numValue = parseFloat(normalizedValue);
    
    if (isNaN(numValue)) {
      return null;
    }
    
    // Round to reasonable precision to avoid floating point issues and trailing zeros
    // Use parseFloat to remove trailing zeros from the string representation
    return parseFloat(numValue.toFixed(10));
  };
  
  // Form verileri - NOKTA kullan decimal için
  const [mmData, setMmData] = useState({
    cap: '2.50', // Nokta ondalik ayracini garantile
    product_type: 'TAVLI', // TAVLI (TT.BAG) or BALYA (TT.BALYA)
    yaglama_tipi: '', // Püskürtme/Normal for BALYA only
    min_mukavemet: '350', // Tam sayi degeri
    max_mukavemet: '550', // Tam sayi degeri
    kg: '500', // Tam sayi degeri
    ic_cap: 45,
    dis_cap: 75,
    tolerans_plus: '0.05', // Nokta ondalik ayracini garantile
    tolerans_minus: '0.06', // Nokta ondalik ayracini garantile
    shrink: 'evet',
    unwinding: '',
    cast_kont: '',
    helix_kont: '',
    elongation: ''
  });
  
  // Paketleme seçenekleri için state
  const [paketlemeSecenekleri, setPaketlemeSecenekleri] = useState({
    shrink: true, // Default olarak seçili
    paletli: false,
    karton: false // Changed from karton to karton for Tavlı Tel
  });
  
  // Tolerans işaret durumları
  const [toleransMaxSign, setToleransMaxSign] = useState('+'); // Max Tolerans için işaret
  const [toleransMinSign, setToleransMinSign] = useState('-'); // Min Tolerans için işaret

  // Calculated YM ST diameter for conditional UI rendering
  const [calculatedYmStDiameter, setCalculatedYmStDiameter] = useState(null);

  // User-editable YM ST diameter (initialized from calculated value)
  const [userYmStDiameter, setUserYmStDiameter] = useState('');

  // Hesaplanan/oluşturulan veriler
  const [suitableYmSts, setSuitableYmSts] = useState([]);
  const [selectedYmSts, setSelectedYmSts] = useState([]);
  const [autoGeneratedYmSts, setAutoGeneratedYmSts] = useState([]);
  const [mainYmStIndex, setMainYmStIndex] = useState(0); // ✅ ADDED: Track which YM ST is the main one

  // Intermediate products state - YM TT, YM STP (YM YB removed - doesn't exist in production flow)
  const [ymTtData, setYmTtData] = useState(null); // YM TT (Tavli Tel Intermediate) - Shared by both TAVLI and BALYA
  const [ymStpData, setYmStpData] = useState(null); // YM STP (Pressed Siyah Tel) - Only when cap > 1.8mm
  const [needsPressing, setNeedsPressing] = useState(false); // Pressing check (cap > 1.8mm)

  // Recete verileri - Her YM ST icin MM TT, YM TT ve YM ST receteleri
  const [allRecipes, setAllRecipes] = useState({
    mmRecipes: {}, // { ymStIndex: { recete } }
    ymGtRecipe: {}, // Tek YM TT recetesi (siralama eslestirme) - NOTE: Variable name kept as ymGt for compatibility
    ymStRecipes: {} // { ymStIndex: { recete } }
  });
  
  // Recete durumu takibi - hangi alan nereden geldi
  const [recipeStatus, setRecipeStatus] = useState({
    mmRecipes: {}, // { ymStIndex: { bilesen_kodu: 'veritabani' | 'otomatik' | 'manuel' } }
    ymGtRecipe: {}, // { bilesen_kodu: 'veritabani' | 'otomatik' | 'manuel' }
    ymStRecipes: {} // { ymStIndex: { bilesen_kodu: 'veritabani' | 'otomatik' | 'manuel' } }
  });
  
  // Aktif recete sekmesi
  const [activeRecipeTab, setActiveRecipeTab] = useState(0); // Hangi YM ST'nin recetesi gosteriliyor
  
  // Aktif sekme icin dropdown degerleri - dogru senkronizasyon icin state ile yonetiliyor
  const [activeTabDropdownValues, setActiveTabDropdownValues] = useState({
    filmasinCode: 'FLM.0600.1006',
    shrinkType: ''
  });
  
  // Veritabanı state'leri
  const [savedToDatabase, setSavedToDatabase] = useState(false);
  const [databaseIds, setDatabaseIds] = useState({
    mmIds: [], // Çoklu MM TT ID'ler
    ymGtId: null,
    ymStIds: []
  });
  
  // Not duzenleme modali icin state
  const [showEditNotesModal, setShowEditNotesModal] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  
  // Edit confirmation modal state
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [originalProductData, setOriginalProductData] = useState(null);
  const [changedFields, setChangedFields] = useState([]);
  const [editReason, setEditReason] = useState('');
  const [showEditReasonModal, setShowEditReasonModal] = useState(false);
  
  // TLC_Hizlar onbellek - veriyi veritabanindan cekelim
  const [tlcHizlarCache, setTlcHizlarCache] = useState({});
  const [tlcHizlarLoading, setTlcHizlarLoading] = useState(false);
  
  // Excel export icin talep secim durumu
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  // Excel generation progress tracking
  const [excelProgress, setExcelProgress] = useState({ current: 0, total: 0, operation: '', currentProduct: '' });

  // Dostça alan adları - Tavli/Balya Tel specific
  const friendlyNames = {
    // Operations
    'TAV01': 'Tavlama Operasyonu (TAV01)',
    'STPRS01': 'Siyah Tel Presleme Operasyonu (STPRS01)',
    'TVPKT01': 'Tavlı Tel Paketleme Operasyonu (TVPKT01)',
    'BAL01': 'Balyalama-Paketleme Operasyonu (BAL01)',

    // Database codes (Excel output format - UPDATED: Removed silkajel, not in tavlı/balya CSV)
    'SM-AMB-000017': 'Çelik çember (SM-AMB-000017)',
    'SM-AMB-000024': 'Plastik çember (SM-AMB-000024)',
    'SM-AMB-000018': 'Çember tokası (SM-AMB-000018)',
    'SM-AMB-000023': 'Kaldırma kancası (SM-AMB-000023)',
    'SM-AMB-000027': 'Shrink Tüketimi (KG)',
    'SM-AMB-000028': 'Shrink Tüketimi (KG)',
    'SM-AMB-000030': 'Shrink Tüketimi (KG)',
    'SM-AMB-000019': 'Karton (SM-AMB-000019)',
    'SM-AMB-000025': 'Streç (SM-AMB-000025)',
    'SM-AMB-000026': 'Palet (SM-AMB-000026)',

    // Legacy display codes (kept for backward compatibility with internal calculations)
    'AMB.APEX CEMBER 38X080': 'Çelik çember (SM-AMB-000017)',
    'AMB.PLASTİK.ÇEMBER': 'Plastik çember (SM-AMB-000024)',
    'AMB.TOKA.SIGNODE.114P. DKP': 'Çember tokası (SM-AMB-000018)',
    'SM.7MMHALKA': 'Kaldırma kancası (SM-AMB-000023)',
    'AMB.SHRİNK.200*140CM': 'Shrink Tüketimi (KG)',
    'AMB.SHRİNK.200*160CM': 'Shrink Tüketimi (KG)',
    'AMB.SHRİNK.200*190CM': 'Shrink Tüketimi (KG)',
    'AMB.ÇEM.KARTON.GAL': 'Karton (SM-AMB-000019)',
    'AMB.STREÇ': 'Streç (SM-AMB-000025)',
    'AMB.PALET': 'Palet (SM-AMB-000026)'
  };

  // Tum useEffect hooklar - Hook Kurallarina uymak icin izin kontrolunden once tasindi
  
  // Sayfa yüklendiğinde talepleri getir
  useEffect(() => {
    fetchRequests();
    fetchExistingMmGts();
    fetchExistingYmSts();
    // REMOVED: fetchUserInputValues() - Not used in Tavlı/Balya Tel
    fetchUsers(); // Kullanici adi arama icin kullanicilari getir
  }, []);
  
  // Cap değeri değiştiğinde Dış Çap'ı otomatik hesapla
  useEffect(() => {
    if (mmData.cap && mmData.ic_cap) {
      const cap = parseFloat(mmData.cap) || 0;
      const icCap = parseInt(mmData.ic_cap) || 45;
      let disCap;

      // Çap ve iç çapa göre dış çap hesaplama
      if (icCap === 45) disCap = 75;
      else if (icCap === 50) disCap = 90;
      else if (icCap === 55) disCap = 105;
      else disCap = icCap + (cap * 10); // Genel hesaplama

      setMmData(prev => ({ ...prev, dis_cap: disCap }));
    }
  }, [mmData.cap, mmData.ic_cap]);

  // Check if pressing is needed based on cap value (cap >= 1.8mm per gene2l.csv)
  useEffect(() => {
    if (mmData.cap) {
      // ✅ UPDATED: Threshold changed from 2.0mm to 1.8mm per gene2l.csv
      const cap = parseFloat(mmData.cap) || 0;
      const needsPress = cap >= 1.8;
      setNeedsPressing(needsPress);
    }
  }, [mmData.cap]);

  // Calculate suggested YM.ST diameter (final diameter - 0.04mm)
  useEffect(() => {
    if (mmData.cap && parseFloat(mmData.cap) > 0) {
      const finalDiameter = parseFloat(mmData.cap);
      const suggestedYmStDiameter = finalDiameter - 0.04;
      setCalculatedYmStDiameter(suggestedYmStDiameter);
      console.log(`💡 Suggested YM.ST diameter for ${finalDiameter}mm Tavli/Balya: ${suggestedYmStDiameter.toFixed(2)}mm`);
    } else {
      setCalculatedYmStDiameter(null);
    }
  }, [mmData.cap]);

  // Task Queue Functions
  const addToTaskQueue = (taskName, saveFunction, taskId = null) => {
    const newTask = {
      id: taskId || Date.now().toString(),
      name: taskName,
      status: 'pending',
      timestamp: new Date(),
      saveFunction: saveFunction
    };
    setTaskQueue(prev => [...prev, newTask]);
    taskQueueRef.current = [...taskQueueRef.current, newTask];
    return newTask.id;
  };

  const updateTaskStatus = (taskId, status, excelData = null) => {
    const updateData = { status };
    if (excelData) {
      updateData.excelData = excelData;
    }
    
    setTaskQueue(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updateData } : task
    ));
    taskQueueRef.current = taskQueueRef.current.map(task => 
      task.id === taskId ? { ...task, ...updateData } : task
    );
  };

  const processTaskQueue = async () => {
    if (processingTaskRef.current) return;
    
    const pendingTasks = taskQueueRef.current.filter(t => t.status === 'pending');
    if (pendingTasks.length === 0) {
      // Check if we just finished all tasks and should show completion popup
      const completedTasks = taskQueueRef.current.filter(t => t.status === 'completed');
      const failedTasks = taskQueueRef.current.filter(t => t.status === 'failed');
      const processingTasks = taskQueueRef.current.filter(t => t.status === 'processing');
      const totalTasks = taskQueueRef.current.length;
      
      // Only show popup if:
      // 1. There are tasks in the queue
      // 2. No tasks are still processing (safety check)
      // 3. All tasks are either completed or failed
      // 4. There are some completed tasks
      // 5. Popup is not already showing (prevent duplicates)
      if (totalTasks > 0 && 
          processingTasks.length === 0 && 
          (completedTasks.length + failedTasks.length) === totalTasks && 
          completedTasks.length > 0 &&
          !showQueueCompletionPopup) {
        console.log('🎉 Queue completed! Showing completion popup for', completedTasks.length, 'completed tasks');
        // Create a copy of completed tasks to avoid reference issues
        setCompletedQueueTasks([...completedTasks]);
        setShowQueueCompletionPopup(true);
      }
      return;
    }
    
    processingTaskRef.current = true;
    const currentTask = pendingTasks[0];
    
    try {
      updateTaskStatus(currentTask.id, 'processing');
      
      // Execute the actual save operation with the task's context
      if (currentTask.saveFunction) {
        const saveResult = await currentTask.saveFunction();
        if (saveResult && saveResult.success) {
          // Store Excel data if available
          const excelData = saveResult.excelData || null;
          updateTaskStatus(currentTask.id, 'completed', excelData);
          toast.success(`${currentTask.name} başarıyla tamamlandı!`);
        } else {
          updateTaskStatus(currentTask.id, 'failed');
          toast.error(`${currentTask.name} başarısız oldu!`);
        }
      }
    } catch (error) {
      updateTaskStatus(currentTask.id, 'failed');
      toast.error(`${currentTask.name} hatası: ${error.message}`);
    } finally {
      processingTaskRef.current = false;
      // Process next task if any
      setTimeout(() => processTaskQueue(), 500);
    }
  };

  // Browser close prevention
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const pendingCount = taskQueue.filter(t => t.status === 'pending').length;
      const processingCount = taskQueue.filter(t => t.status === 'processing').length;
      const totalActive = pendingCount + processingCount;
      
      if (totalActive > 0 || showQueueCompletionPopup) {
        e.preventDefault();
        let message;
        if (showQueueCompletionPopup) {
          message = 'Kuyruk tamamlanma penceresi açık. Sayfayı kapatırsanız Excel indirme seçeneklerini kaybedeceksiniz. Devam etmek istiyor musunuz?';
        } else {
          message = `${processingCount} işlem devam ediyor ve ${pendingCount} işlem bekliyor. Sayfayı kapatırsanız bu işlemler iptal olacak. Devam etmek istiyor musunuz?`;
        }
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [taskQueue, showQueueCompletionPopup]);

  // REMOVED: Galvanizli-specific kod_2/kaplama logic - not applicable to Tavlı/Balya Tel
  // Tavlı/Balya uses product_type (TAVLI/BALYA) and yaglama_tipi instead

  // REMOVED: fetchTlcHizlarData() - Not used in Tavlı/Balya Tel (specific to Galvanizli)
  // useEffect(() => {
  //   fetchTlcHizlarData();
  // }, []);
  
  // Component kaldirildiginda sessionStorage temizligi
  useEffect(() => {
    return () => {
      // Component kaldirildiginda sessionStorage temizle
      sessionStorage.removeItem('lastEditedRequestId');
    };
  }, []);

  // Sekmeler arasi geciste dropdown degerlerini guncelle
  useEffect(() => {
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    const activeYmSt = allYmSts[activeRecipeTab];
    
    if (activeYmSt) {
      // Aktif YM ST icin filmasin kodunu hesapla
      const filmasinCode = getFilmasinKodu(activeYmSt);
      
      // Aktif sekme icin shrink tipini hesapla
      const shrinkKeys = ['AMB.SHRİNK.200*140CM', 'AMB.SHRİNK.200*160CM', 'AMB.SHRİNK.200*190CM'];
      const currentShrinkKey = shrinkKeys.find(sk => allRecipes.mmRecipes[activeRecipeTab]?.[sk] > 0);
      const shrinkType = currentShrinkKey || '';
      
      // State'te dropdown degerlerini guncelle
      setActiveTabDropdownValues({
        filmasinCode: filmasinCode,
        shrinkType: shrinkType
      });
      
    } else {
      // Aktif YM ST yoksa varsayilanlara sifirla
      setActiveTabDropdownValues({
        filmasinCode: 'FLM.0600.1006',
        shrinkType: ''
      });
    }
  }, [activeRecipeTab, selectedYmSts, autoGeneratedYmSts, allRecipes.mmRecipes]);


  // İzin kontrolü
  if (!hasPermission('access:tavli-tel')) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Bu modüle erişim izniniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  // Veritabanindan kullanici girdi degerlerini getir
  // Stub function - Not used in Tavlı/Balya Tel (specific to Galvanizli)
  const fetchUserInputValues = async () => {
    console.log('fetchUserInputValues called - STUB - Not used in Tavlı/Balya Tel');
  };
  
  // Stub function - Not used in Tavlı/Balya Tel (specific to Galvanizli)
  const saveUserInputValues = async () => {
    console.log('saveUserInputValues called - STUB - Not used in Tavlı/Balya Tel');
  };


  // Talepleri getir
  // Kullanıcı listesi getir
  const fetchUsers = async () => {
    try {
      // Use API_URLS.users instead of crmUsers (which was removed)
      const response = await fetchWithAuth(API_URLS.users);
      if (response && response.ok) {
        const data = await response.json();
        const userMap = {};
        data.forEach(user => {
          // Tutarli gosterim icin hem ID hem de kullanici adini kullanici adina eslestir
          userMap[user.id] = user.username;
          userMap[user.username] = user.username; // Ayrica kullanici adini kendisine eslestir
        });
        setUsers(userMap);
      }
    } catch (error) {
      console.error('Kullanıcılar yükleme hatası:', error);
    }
  };

  // Kullanıcı ID'sini username'e çevir
  const getUsernameById = (userId) => {
    if (!userId) return '-';
    return users[userId] || userId;
  };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      // UI'da filtreleme icin durumuna bakmaksizin tum talepleri getir
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}`);
      if (response && response.ok) {
        const data = await response.json();
        const requestsData = Array.isArray(data) ? data : [];
        setRequests(requestsData);
        
        // Update selectedRequest if it's currently open to refresh the modal with latest data
        if (selectedRequest && showRequestDetailModal) {
          const updatedRequest = requestsData.find(req => req.id === selectedRequest.id);
          if (updatedRequest) {
            setSelectedRequest(updatedRequest);
          }
        }
      }
    } catch (error) {
      console.error('Talepler getirilirken hata:', error);
      toast.error('Talepler getirilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if products associated with requests still exist
  const checkForDeletedProducts = async (requestsData) => {
    try {
      // Get MM TT products to check against (limit to recent products for performance)
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?limit=2000&sort_by=created_at&sort_order=desc`);
      if (!response || !response.ok) {
        console.warn('Could not fetch products to check for deleted items');
        return;
      }
      
      const allProducts = await response.json();
      const requestsToUpdate = [];
      
      // Check each request to see if its associated product still exists  
      for (const request of requestsData) {
        // Skip requests that are already marked as "Silinmiş"
        if (request.status === 'silinmis') {
          continue;
        }
        
        // Find matching product using different matching strategies
        let productExists = false;
        
        // Strategy 1: Try to match by final_product_key if available
        if (request.final_product_key) {
          productExists = allProducts.some(product => {
            const productKey = generateProductKeyFromProduct(product);
            return productKey === request.final_product_key;
          });
        }
        
        // Strategy 2: Try to match by original stok_kodu
        if (!productExists && request.stok_kodu) {
          productExists = allProducts.some(product => product.stok_kodu === request.stok_kodu);
        }
        
        // Strategy 3: Try to match by final_stok_adi if available  
        if (!productExists && request.final_stok_adi) {
          productExists = allProducts.some(product => product.stok_adi === request.final_stok_adi);
        }
        
        // Strategy 4: Match by product specifications (fallback)
        if (!productExists) {
          productExists = allProducts.some(product => {
            return (
              Math.abs(parseFloat(product.cap || 0) - parseFloat(request.cap || 0)) < 0.01 &&
              product.product_type === request.product_type &&
              (product.yaglama_tipi || '') === (request.yaglama_tipi || '') &&
              Math.abs(parseFloat(product.min_mukavemet || 0) - parseFloat(request.min_mukavemet || 0)) < 1 &&
              Math.abs(parseFloat(product.max_mukavemet || 0) - parseFloat(request.max_mukavemet || 0)) < 1 &&
              Math.abs(parseFloat(product.kg || 0) - parseFloat(request.kg || 0)) < 1 &&
              Math.abs(parseFloat(product.ic_cap || 0) - parseFloat(request.ic_cap || 0)) < 0.1 &&
              Math.abs(parseFloat(product.dis_cap || 0) - parseFloat(request.dis_cap || 0)) < 0.1
            );
          });
        }
        
        // If product doesn't exist, mark request as "Silinmiş"
        if (!productExists) {
          requestsToUpdate.push(request.id);
        }
      }
      
      // Update requests that have deleted products
      if (requestsToUpdate.length > 0) {
        console.log(`Found ${requestsToUpdate.length} requests with deleted products, updating status...`);
        
        for (const requestId of requestsToUpdate) {
          try {
            await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${requestId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'silinmis' })
            });
          } catch (error) {
            console.error(`Failed to update request ${requestId} status:`, error);
          }
        }
        
        // Refresh requests to show updated statuses
        setTimeout(() => {
          fetchRequests();
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking for deleted products:', error);
    }
  };

  // Generate product key from product data for comparison
  const generateProductKeyFromProduct = (product) => {
    if (!product) return '';

    return `${product.cap || ''}_${product.product_type || ''}_${product.yaglama_tipi || ''}_${product.min_mukavemet || ''}_${product.max_mukavemet || ''}_${product.kg || ''}_${product.ic_cap || ''}_${product.dis_cap || ''}_${product.tolerans_plus || ''}_${product.tolerans_minus || ''}_${product.shrink || ''}_${product.unwinding || ''}`;
  };

  // Permanently delete "Silinmiş" request from database
  const permanentlyDeleteRequest = async (request) => {
    if (request.status !== 'silinmis') {
      toast.error('Sadece "Silinmiş" durumundaki talepler kalıcı olarak silinebilir');
      return;
    }

    if (!window.confirm(`Bu "Silinmiş" talebi kalıcı olarak veritabanından silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${request.id}`, {
        method: 'DELETE'
      });
      
      if (response && response.ok) {
        toast.success('Silinmiş talep kalıcı olarak veritabanından silindi');
        fetchRequests(); // Refresh the list
      } else {
        toast.error('Talep kalıcı olarak silinemedi');
      }
    } catch (error) {
      console.error('Talep kalıcı olarak silinirken hata:', error);
      toast.error('Talep kalıcı olarak silinemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Mevcut MM TT'leri getir
  const fetchExistingMmGts = async () => {
    try {
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?limit=2000&sort_by=created_at&sort_order=desc`);
      if (response && response.ok) {
        const data = await response.json();
        const products = Array.isArray(data) ? data : [];
        setExistingMms(products);
        console.log(`✅ ${products.length} adet Tavlı/Balya Tel ürün yüklendi`);
      } else {
        console.warn('⚠️ MM ürün listesi yanıtı başarısız:', response?.status, response?.statusText);
        setExistingMms([]);
        // Don't show error toast for empty results - it's normal for new system
        if (response && !response.ok && response.status !== 404) {
          toast.warn('Ürün listesi yüklenemedi, lütfen sayfayı yenileyin');
        }
      }
    } catch (error) {
      console.error('❌ Mevcut MM listesi getirilirken hata:', error);
      setExistingMms([]);
      // Only show error toast for actual errors, not for empty results
      toast.error('Veritabanı bağlantı hatası. Lütfen sayfayı yenileyin.');
    }
  };

  // Mevcut YM ST'leri getir
  const fetchExistingYmSts = async () => {
    try {
      const response = await fetchWithAuth(`${API_URLS.galYmSt}?limit=2000&sort_by=created_at&sort_order=desc`);
      if (response && response.ok) {
        const data = await response.json();
        const products = Array.isArray(data) ? data : [];
        setExistingYmSts(products);
        console.log(`✅ ${products.length} adet YM ST (Filmaşin) yüklendi`);
      } else {
        console.warn('⚠️ YM ST listesi yanıtı başarısız:', response?.status, response?.statusText);
        setExistingYmSts([]);
        if (response && !response.ok && response.status !== 404) {
          toast.warn('Filmaşin listesi yüklenemedi, lütfen sayfayı yenileyin');
        }
      }
    } catch (error) {
      console.error('❌ Mevcut YM ST listesi getirilirken hata:', error);
      setExistingYmSts([]);
      toast.error('Veritabanı bağlantı hatası. Lütfen sayfayı yenileyin.');
    }
  };

  // Veritabanı filtreleme fonksiyonları
  const filterDbProducts = (products, type) => {
    if (!Array.isArray(products)) return [];
    
    // İlk olarak filtreleme yap
    let filteredProducts = products.filter(product => {
      // Arama sorgusu filtresi
      if (dbSearchQuery) {
        const searchLower = dbSearchQuery.toLowerCase();
        const matchesSearch =
          (product.stok_kodu && product.stok_kodu.toLowerCase().includes(searchLower)) ||
          (product.cap && product.cap.toString().toLowerCase().includes(searchLower)) ||
          (type === 'mm' && product.product_type && product.product_type.toLowerCase().includes(searchLower)) ||
          (type === 'mm' && product.yaglama_tipi && product.yaglama_tipi.toLowerCase().includes(searchLower)) ||
          (type === 'ymst' && product.filmasin && product.filmasin.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }
      
      // Çap filtresi
      if (dbCapFilter && product.cap) {
        if (!product.cap.toString().includes(dbCapFilter)) return false;
      }
      
      // Product type filtresi (sadece MM için)
      if (type === 'mm' && dbProductTypeFilter !== 'all' && product.product_type) {
        if (product.product_type !== dbProductTypeFilter) return false;
      }
      
      return true;
    });
    
    // Sonra sıralama yap
    return filteredProducts.sort((a, b) => {
      let aValue, bValue;
      
      switch (dbSortField) {
        case 'cap':
          aValue = parseFloat(a.cap) || 0;
          bValue = parseFloat(b.cap) || 0;
          break;
        case 'product_type':
          if (type === 'mm') {
            aValue = (a.product_type || '').toString();
            bValue = (b.product_type || '').toString();
          } else {
            // YM ST için kod_2 (kalite)
            aValue = (a.kod_2 || '').toString();
            bValue = (b.kod_2 || '').toString();
          }
          break;
        case 'yaglama_tipi':
          if (type === 'mm') {
            aValue = (a.yaglama_tipi || '').toString();
            bValue = (b.yaglama_tipi || '').toString();
          } else {
            // YM ST için filmasin
            aValue = parseFloat(a.filmasin) || 0;
            bValue = parseFloat(b.filmasin) || 0;
          }
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        default:
          aValue = parseFloat(a.cap) || 0;
          bValue = parseFloat(b.cap) || 0;
      }
      
      if (dbSortDirection === 'asc') {
        if (typeof aValue === 'number') return aValue - bValue;
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        if (typeof aValue === 'number') return bValue - aValue;
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }
    });
  };

  // Veritabanı sıralama fonksiyonu
  const handleDbSort = (field) => {
    if (dbSortField === field) {
      // Aynı alan tekrar tıklanırsa yönü değiştir
      setDbSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Farklı alan seçilirse o alanı seç ve artan olarak ayarla
      setDbSortField(field);
      setDbSortDirection('asc');
    }
  };

  // Veritabanı seçim fonksiyonları
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

  // Seçili ürünleri temizle
  const clearDbSelection = () => {
    setSelectedDbItems([]);
  };

  // Toplu silme fonksiyonu
  const handleBulkDelete = async () => {
    if (selectedDbItems.length === 0) {
      toast.error('Silinecek ürün seçiniz');
      return;
    }

    const warningMessage = `UYARI: Bu işlem geri alınamaz!\n\n${selectedDbItems.length} ürün ve bunlara ait tüm reçete bilgileri kalıcı olarak silinecek.\n\nBu işlemi gerçekleştirmek istediğinizden emin misiniz?`;
    if (!window.confirm(warningMessage)) {
      return;
    }

    setIsDeletingBulkDb(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      console.log('Bulk delete starting for tab:', activeDbTab, 'Items:', selectedDbItems);
      
      if (activeDbTab === 'mm') {
        // For MM TT, we need cascade deletion including YM TT
        for (let i = 0; i < selectedDbItems.length; i++) {
          const itemId = selectedDbItems[i];
          try {
            console.log(`Deleting MM TT ${i + 1}/${selectedDbItems.length} with cascade:`, itemId);

            // Get MM TT data before deletion
            const mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}/${itemId}`);
            let mm = null;
            if (mmResponse && mmResponse.ok) {
              mm = await mmResponse.json();
            }


            // Step 3: Delete the MM TT itself
            const deleteResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}/${itemId}`, {
              method: 'DELETE'
            });

            if (deleteResponse && deleteResponse.ok) {
              successCount++;
              console.log('Bulk: Successfully deleted MM TT:', itemId);
            } else {
              errorCount++;
              console.error('Bulk: Failed to delete MM TT:', itemId, 'Status:', deleteResponse?.status);
            }

          } catch (error) {
            console.error('Bulk: Error deleting MM TT ' + itemId + ':', error);
            errorCount++;
          }

          // ✅ CRITICAL: Add delay between deletions to prevent database overload
          if (i < selectedDbItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
      } else {
        // For YM ST, simple deletion (no cascade needed)
        for (let i = 0; i < selectedDbItems.length; i++) {
          const itemId = selectedDbItems[i];
          try {
            const deleteUrl = `${API_URLS.galYmSt}/${itemId}`;

            console.log(`Deleting YM ST ${i + 1}/${selectedDbItems.length}:`, itemId, 'URL:', deleteUrl);

            const response = await fetchWithAuth(deleteUrl, {
              method: 'DELETE'
            });

            if (response && response.ok) {
              successCount++;
              console.log('Successfully deleted YM ST:', itemId);
            } else {
              errorCount++;
              console.error('Failed to delete YM ST:', itemId, 'Status:', response?.status);
            }
          } catch (error) {
            console.error('Error deleting YM ST ' + itemId + ':', error);
            errorCount++;
          }

          // ✅ CRITICAL: Add delay between deletions to prevent database overload
          if (i < selectedDbItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }
      }

      // Başarı mesajı
      if (successCount > 0) {
        toast.success(`${successCount} ürün başarıyla silindi`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} ürün silinemedi`);
      }

      // Mark related requests as "silinmiş" for deleted MM TT products
      if (activeDbTab === 'mm' && successCount > 0) {
        try {
          // Get requests to check for related ones (limit for performance)
          const allRequestsResponse = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}?limit=200&sort_by=created_at&sort_order=desc`);
          if (allRequestsResponse && allRequestsResponse.ok) {
            const allRequests = await allRequestsResponse.json();
            const requestsToUpdate = [];
            
            // Get current MM TT products to see which ones are missing (deleted)
            const currentProductsResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?limit=2000`);
            let currentProducts = [];
            if (currentProductsResponse && currentProductsResponse.ok) {
              currentProducts = await currentProductsResponse.json();
            }
            
            // Find requests that no longer have matching products
            for (const request of allRequests) {
              if (request.status === 'silinmis') continue; // Skip already marked
              
              let hasMatchingProduct = false;
              
              // Check if any current product matches this request
              for (const product of currentProducts) {
                // Strategy 1: Match by final_stok_adi
                if (request.final_stok_adi === product.stok_adi) {
                  hasMatchingProduct = true;
                  break;
                }
                
                // Strategy 2: Match by stok_kodu
                if (request.stok_kodu === product.stok_kodu) {
                  hasMatchingProduct = true;
                  break;
                }
                
                // Strategy 3: Match by specifications
                const specsMatch = (
                  Math.abs(parseFloat(product.cap || 0) - parseFloat(request.cap || 0)) < 0.01 &&
                  product.product_type === request.product_type &&
                  (product.yaglama_tipi || '') === (request.yaglama_tipi || '') &&
                  Math.abs(parseFloat(product.min_mukavemet || 0) - parseFloat(request.min_mukavemet || 0)) < 1 &&
                  Math.abs(parseFloat(product.max_mukavemet || 0) - parseFloat(request.max_mukavemet || 0)) < 1 &&
                  Math.abs(parseFloat(product.kg || 0) - parseFloat(request.kg || 0)) < 1 &&
                  Math.abs(parseFloat(product.ic_cap || 0) - parseFloat(request.ic_cap || 0)) < 0.1 &&
                  Math.abs(parseFloat(product.dis_cap || 0) - parseFloat(request.dis_cap || 0)) < 0.1
                );
                
                if (specsMatch) {
                  hasMatchingProduct = true;
                  break;
                }
              }
              
              // If no matching product found, mark request as silinmiş
              if (!hasMatchingProduct) {
                requestsToUpdate.push(request.id);
              }
            }
            
            // Update related requests to "silinmiş" status SEQUENTIALLY
            if (requestsToUpdate.length > 0) {
              console.log(`Bulk delete: Marking ${requestsToUpdate.length} related requests as silinmiş`);

              let updateSuccessCount = 0;
              let updateFailureCount = 0;

              for (let i = 0; i < requestsToUpdate.length; i++) {
                const requestId = requestsToUpdate[i];
                try {
                  console.log(`Updating request status ${i + 1}/${requestsToUpdate.length}: ${requestId}`);

                  const updateResponse = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${requestId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'silinmis' })
                  });

                  if (updateResponse && updateResponse.ok) {
                    updateSuccessCount++;
                  } else {
                    updateFailureCount++;
                    console.error(`Failed to update request ${requestId}, status: ${updateResponse?.status}`);
                  }
                } catch (updateError) {
                  updateFailureCount++;
                  console.error(`Error updating request ${requestId} status:`, updateError);
                }

                // ✅ CRITICAL: Add delay between updates to prevent database overload
                if (i < requestsToUpdate.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }

              console.log(`✅ Updated ${updateSuccessCount} requests, ${updateFailureCount} failed`);

              // Refresh requests to show updated statuses
              await fetchRequests();
            }
          }
        } catch (error) {
          console.error('Error updating related request statuses in bulk delete:', error);
          // Continue without failing the deletion
        }
      }

      // Listeyi yenile ve seçimi temizle
      if (activeDbTab === 'mm') {
        fetchExistingMmGts();
      } else {
        fetchExistingYmSts();
      }
      clearDbSelection();

    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Silme işlemi sırasında hata oluştu');
    } finally {
      setIsDeletingBulkDb(false);
    }
  };

  // Mevcut recete verilerini getir (daha guclu)
  const fetchExistingRecipes = async (mmId, ymGtId, ymStIds) => {
    try {
      setIsLoading(true);
      let statusUpdates = {
        mmRecipes: {},
        ymGtRecipe: {},
        ymStRecipes: {}
      };
      
      // MM TT recetelerini getir
      if (mmId) {
        const mmRecipeResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}?mm_gt_id=${mmId}`);
        if (mmRecipeResponse && mmRecipeResponse.ok) {
          const mmRecipeData = await mmRecipeResponse.json();
          // Recete verisini isle
          const parsedMmGtRecipe = {};
          mmRecipeData.forEach(item => {
            parsedMmGtRecipe[item.bilesen_kodu] = item.miktar;
            if (!statusUpdates.mmRecipes[0]) statusUpdates.mmRecipes[0] = {};
            statusUpdates.mmRecipes[0][item.bilesen_kodu] = 'database';
          });
          setAllRecipes(prev => ({
            ...prev,
            mmRecipes: { ...prev.mmRecipes, 0: parsedMmGtRecipe }
          }));
        }
      }
      
      
      // YM ST recetelerini getir
      if (ymStIds.length > 0) {
        for (let i = 0; i < ymStIds.length; i++) {
          const ymStId = ymStIds[i];
          console.log(`📖 Fetching all YM ST recipes and filtering for ym_st_id=${ymStId}...`);
          const allYmStRecipesResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?limit=2000`);
          let ymStRecipeResponse = null;
          
          if (allYmStRecipesResponse && allYmStRecipesResponse.ok) {
            const allYmStRecipes = await allYmStRecipesResponse.json();
            const filteredYmStRecipes = allYmStRecipes.filter(r => r.ym_st_id == ymStId); // Use == for type coercion
            console.log(`📖 Found ${filteredYmStRecipes.length} YM ST recipes for ym_st_id=${ymStId}`);
            
            // Create mock response
            ymStRecipeResponse = {
              ok: true,
              json: async () => filteredYmStRecipes
            };
          }
          
          if (ymStRecipeResponse && ymStRecipeResponse.ok) {
            const ymStRecipeData = await ymStRecipeResponse.json();
            const parsedYmStRecipe = {};
            ymStRecipeData.forEach(item => {
              parsedYmStRecipe[item.bilesen_kodu] = item.miktar;
              if (!statusUpdates.ymStRecipes[i]) statusUpdates.ymStRecipes[i] = {};
              statusUpdates.ymStRecipes[i][item.bilesen_kodu] = 'database';
            });
            setAllRecipes(prev => ({
              ...prev,
              ymStRecipes: { ...prev.ymStRecipes, [i]: parsedYmStRecipe }
            }));
          }
        }
      }
      
      // Reçete durumlarını güncelle
      setRecipeStatus(statusUpdates);
      
    } catch (error) {
      console.error('Mevcut reçeteler getirilirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Veritabanindan recete getir fonksiyonu - Iliski tablosu ile gelistirildi
  const fetchRecipesFromDatabase = async () => {
    try {
      setIsLoading(true);
      setIsLoadingRecipes(true); // Start recipe loading
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      let foundAny = false;
      let statusUpdates = {
        mmRecipes: {},
        ymGtRecipe: {},
        ymStRecipes: {}
      };
      
      
      if (allYmSts.length === 0) {
        toast.warning('Henüz YM ST seçilmemiş. Önce YM ST sedin veya oluşturun.');
        setIsLoading(false);
        return;
      }
      
      // Mevcut form verilerine gore MM bulmaya calis
      const sequence = processSequence || '00';
      const mmStokKodu = generateMmStokKodu(mmData.product_type, mmData.cap, sequence);
      
      
      // Find MM TT
      const mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_kodu=${encodeURIComponent(mmStokKodu)}`);
      if (mmResponse && mmResponse.ok) {
        const mmData = await mmResponse.json();
        if (mmData.length > 0) {
          const mm = mmData[0];
          
          // 🆕 YENI: YM TT ve YM ST bulmak icin gelistirilmis iliski tablosunu kullan
          const relationResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmYmSt}?mm_gt_id=${mm.id}`);
          if (relationResponse && relationResponse.ok) {
            const relations = await relationResponse.json();
            
            if (relations.length > 0) {
              const ymGtId = relations[0].ym_gt_id; // All relations should have same ym_gt_id
              
              // Load MM TT recipes
              const mmRecipeResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}?mm_gt_id=${mm.id}`);
              if (mmRecipeResponse && mmRecipeResponse.ok) {
                const mmRecipeData = await mmRecipeResponse.json();
                if (mmRecipeData.length > 0) {
                  
                  // MM TT recetelerini tum YM ST indekslerine uygula
                  for (let i = 0; i < allYmSts.length; i++) {
                    const parsedMmGtRecipe = {};
                    mmRecipeData.forEach(item => {
                      // Cinko icin ozel islem: veritabani '150' saklar ama biz '150 03' gosteririz
                      let displayCode = item.bilesen_kodu;
                      if (item.bilesen_kodu === '150' && item.aciklama === 'Çinko Tüketim Miktarı') {
                        displayCode = '150 03';
                      }
                      
                      parsedMmGtRecipe[displayCode] = parseFloat(item.miktar || 0); // Temiz sayi, gereksiz sifir yok
                      if (!statusUpdates.mmRecipes[i]) statusUpdates.mmRecipes[i] = {};
                      statusUpdates.mmRecipes[i][displayCode] = 'database';
                    });
                    setAllRecipes(prev => ({
                      ...prev,
                      mmRecipes: { ...prev.mmRecipes, [i]: parsedMmGtRecipe }
                    }));
                  }
                  foundAny = true;
                }
              }
              
              
              // 🆕 YENI: Gelistirilmis iliski tablosunu kullanarak YM ST ve recetelerini yukle
              
              // Siralamayi korumak icin iliskileri sequence_index gore sirala
              const sortedRelations = relations.sort((a, b) => (a.sequence_index || 0) - (b.sequence_index || 0));
              
              // Ilk once gercek YM ST urunlerini yukle
              const loadedYmSts = [];
              let mainIndex = 0;
              
              // YM ST urunleri ve recetelerini yukle
              for (let i = 0; i < sortedRelations.length; i++) {
                const relation = sortedRelations[i];
                const ymStId = relation.ym_st_id;
                
                
                // Ilk once YM ST urunun kendisini yukle
                try {
                  console.log(`📖 Fetching all YM ST products and filtering for id=${ymStId}...`);
                  const allYmStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?limit=1000`);
                  let ymStResponse = null;
                  
                  if (allYmStResponse && allYmStResponse.ok) {
                    const allYmSt = await allYmStResponse.json();
                    const filteredYmSt = allYmSt.filter(r => r.id == ymStId); // Use == for type coercion
                    console.log(`📖 Found ${filteredYmSt.length} YM ST products for id=${ymStId}`);
                    
                    // Create mock response - return first match or empty array
                    ymStResponse = {
                      ok: true,
                      json: async () => filteredYmSt.length > 0 ? filteredYmSt[0] : []
                    };
                  }
                  
                  if (ymStResponse && ymStResponse.ok) {
                    const ymStData = await ymStResponse.json();
                    const ymSt = Array.isArray(ymStData) ? ymStData[0] : ymStData;
                    if (ymSt) {
                      loadedYmSts.push({ ...ymSt, source: 'database' });

                      // Determine main index: use sequence_index if available, fallback to is_main
                      if (relation.sequence_index === 0 || relation.is_main) {
                        mainIndex = i;
                      }

                    }
                  }
                } catch (error) {
                  console.error('Error loading YM ST ' + ymStId + ':', error);
                }
                
                // Sonra YM ST recetesini getir
                console.log(`📖 Fetching all YM ST recipes and filtering for ym_st_id=${ymStId}...`);
                const allYmStRecipesResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?limit=2000`);
                let ymStRecipeResponse = null;
                
                if (allYmStRecipesResponse && allYmStRecipesResponse.ok) {
                  const allYmStRecipes = await allYmStRecipesResponse.json();
                  const filteredYmStRecipes = allYmStRecipes.filter(r => r.ym_st_id == ymStId); // Use == for type coercion
                  console.log(`📖 Found ${filteredYmStRecipes.length} YM ST recipes for ym_st_id=${ymStId}`);
                  
                  // Create mock response
                  ymStRecipeResponse = {
                    ok: true,
                    json: async () => filteredYmStRecipes
                  };
                }
                
                if (ymStRecipeResponse && ymStRecipeResponse.ok) {
                  const ymStRecipeData = await ymStRecipeResponse.json();
                  if (ymStRecipeData.length > 0) {
                    
                    const parsedYmStRecipe = {};
                    ymStRecipeData.forEach(item => {
                      // Cinko icin ozel islem: veritabani '150' saklar ama biz '150 03' gosteririz
                      let displayCode = item.bilesen_kodu;
                      if (item.bilesen_kodu === '150' && item.aciklama === 'Çinko Tüketim Miktarı') {
                        displayCode = '150 03';
                      }
                      
                      parsedYmStRecipe[displayCode] = parseFloat(item.miktar || 0); // Temiz sayi, gereksiz sifir yok
                      if (!statusUpdates.ymStRecipes[i]) statusUpdates.ymStRecipes[i] = {};
                      statusUpdates.ymStRecipes[i][displayCode] = 'database';
                    });
                    setAllRecipes(prev => ({
                      ...prev,
                      ymStRecipes: { ...prev.ymStRecipes, [i]: parsedYmStRecipe }
                    }));
                    foundAny = true;
                  }
                }
              }
              
              // Bulunanlari varsa yuklenen YM ST ayarla
              if (loadedYmSts.length > 0) {
                setSelectedYmSts(loadedYmSts);
                setMainYmStIndex(mainIndex);
                
                // Veritabani olanlarini kullandigimizdan otomatik olusturulan YM ST temizle
                setAutoGeneratedYmSts([]);
              }
            }
          }
        }
      }
      
      // MM TT bulunamazsa, bireysel YM ST arama icin yedek yontemi dene (manuel recete yukleme icin)
      if (!foundAny) {
        
        // Yedek: YM ST recetelerini tek tek getir
        for (let i = 0; i < allYmSts.length; i++) {
          const ymSt = allYmSts[i];
          
          // YM ST bul
          let ymStResponse;
          if (ymSt.id) {
            // Veritabanindan secilmis YM ST
            ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}/${ymSt.id}`);
          } else {
            // Otomatik olusturulmus YM ST icin stok koduna gore ara
            ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?stok_kodu=${encodeURIComponent(ymSt.stok_kodu)}`);
          }
          
          if (ymStResponse && ymStResponse.ok) {
            let ymStData = await ymStResponse.json();
            if (Array.isArray(ymStData)) ymStData = ymStData[0];
            
            if (ymStData && ymStData.id) {
              // YM ST recetesini getir
              console.log(`📖 Fetching all YM ST recipes and filtering for ym_st_id=${ymStData.id}...`);
              const allYmStRecipesResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?limit=2000`);
              let ymStRecipeResponse = null;
              
              if (allYmStRecipesResponse && allYmStRecipesResponse.ok) {
                const allYmStRecipes = await allYmStRecipesResponse.json();
                const filteredYmStRecipes = allYmStRecipes.filter(r => r.ym_st_id == ymStData.id); // Use == for type coercion
                console.log(`📖 Found ${filteredYmStRecipes.length} YM ST recipes for ym_st_id=${ymStData.id}`);
                
                // Create mock response
                ymStRecipeResponse = {
                  ok: true,
                  json: async () => filteredYmStRecipes
                };
              }
              
              if (ymStRecipeResponse && ymStRecipeResponse.ok) {
                const ymStRecipeData = await ymStRecipeResponse.json();
                if (ymStRecipeData.length > 0) {
                  const parsedYmStRecipe = {};
                  ymStRecipeData.forEach(item => {
                    // Cinko icin ozel islem: veritabani '150' saklar ama biz '150 03' gosteririz
                    let displayCode = item.bilesen_kodu;
                    if (item.bilesen_kodu === '150' && item.aciklama === 'Çinko Tüketim Miktarı') {
                      displayCode = '150 03';
                    }
                    
                    parsedYmStRecipe[displayCode] = item.miktar;
                    if (!statusUpdates.ymStRecipes[i]) statusUpdates.ymStRecipes[i] = {};
                    statusUpdates.ymStRecipes[i][displayCode] = 'database';
                  });
                  setAllRecipes(prev => ({
                    ...prev,
                    ymStRecipes: { ...prev.ymStRecipes, [i]: parsedYmStRecipe }
                  }));
                  foundAny = true;
                }
              }
            }
          }
        }
      }
      
      // Reçete durumlarını güncelle
      setRecipeStatus(statusUpdates);
      
      if (!foundAny) {
        toast.info('Veritabanında eşleşen reçete bulunamadı');
        // Alanlari temizle
        setAllRecipes({
          mmRecipes: {},
          ymGtRecipe: {},
          ymStRecipes: {}
        });
        setRecipeStatus({
          mmRecipes: {},
          ymGtRecipe: {},
          ymStRecipes: {}
        });
      } else {
        toast.success('Veritabanından reçeteler başarıyla getirildi');
      }
    } catch (error) {
      console.error('Veritabanından reçete getirme hatası:', error);
      toast.error('Veritabanından reçete getirme hatası: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsLoadingRecipes(false);
    }
  };

  // Talep sil fonksiyonu
  const deleteRequest = async (requestId) => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${requestId}`, {
        method: 'DELETE'
      });
      
      if (response && response.ok) {
        toast.success('Talep başarıyla silindi');
        fetchRequests(); // Listeyi yenile
      } else {
        toast.error('Talep silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Talep silme hatası:', error);
      toast.error('Talep silme hatası: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // TT MM silme fonksiyonu - Simplified (no intermediate products for Tavli/Balya)
  const deleteMmGt = async (mm) => {
    try {
      setIsLoading(true);

      const mmId = mm.id;
      const mmStokKodu = mm.stok_kodu;
      console.log(`Deleting TT MM: ${mmStokKodu} (ID: ${mmId})`);

      // Step 1: Delete relationships
      try {
        const relationResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmYmSt}?mm_id=${mmId}`);
        if (relationResponse && relationResponse.ok) {
          const relations = await relationResponse.json();
          console.log(`Found ${relations.length} relationships for MM ${mmId}`);

          for (const relation of relations) {
            try {
              await fetchWithAuth(`${API_URLS.tavliBalyaMmYmSt}/${relation.id}`, { method: 'DELETE' });
              console.log(`Deleted relationship ${relation.id}`);
            } catch (error) {
              console.error('Error deleting relationship:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error deleting relationships:', error);
      }

      // Step 2: Delete MM recipes
      try {
        const recipeResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}?mamul_kodu=${encodeURIComponent(mmStokKodu)}`);
        if (recipeResponse && recipeResponse.ok) {
          const recipes = await recipeResponse.json();
          for (const recipe of recipes) {
            await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}/${recipe.id}`, { method: 'DELETE' });
          }
          console.log(`Deleted ${recipes.length} recipes for ${mmStokKodu}`);
        }
      } catch (error) {
        console.error('Error deleting recipes:', error);
      }

      // Step 3: Delete MM product
      const deleteResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}/${mmId}`, { method: 'DELETE' });

      if (deleteResponse.ok) {
        toast.success(`${mmStokKodu} başarıyla silindi`);
        await fetchRequests();
      } else {
        throw new Error('MM silme başarısız');
      }

    } catch (error) {
      console.error('MM deletion error:', error);
      toast.error('MM silme hatası: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // YMST silme fonksiyonu
  const deleteYmSt = async (ymSt) => {
    try {
      setIsLoading(true);
      
      
      // Backend cascade kullanarak YM ST sil (backend ilgili verileri otomatik isler)
      try {
        const deleteResponse = await fetchWithAuth(`${API_URLS.galYmSt}/${ymSt.id}`, { 
          method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete YM ST: ${deleteResponse.status}`);
        }
        
      } catch (error) {
        console.error('YM ST deletion error:', error);
        throw error;
      }
      
      // Listeyi yenile
      await fetchExistingYmSts();
      
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      toast.success(`YM ST ${ymSt.stok_kodu} başarıyla silindi`);
    } catch (error) {
      console.error('YM ST silme hatası:', error);
      toast.error('YM ST silme hatası: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Silme onayı aç
  const handleDeleteClick = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteConfirm(true);
  };

  // Silme onayı kapat
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    setDeleteType('mm');
  };

  // Tumunu sil fonksiyonu - Optimize edilmis toplu silme
  const handleDeleteAll = async () => {
    if (deleteAllConfirmText !== 'Hepsini Sil') {
      toast.error('Lütfen "Hepsini Sil" yazın');
      return;
    }

    try {
      setIsLoading(true);
      
      // Sunucuyu asirilamamak icin sinirli eszamanliligi olan batch islemleri kullan
      const batchSize = 5; // Sunucu asirini onlemek icin ayni anda 5 ogeyi isle
      
      if (activeDbTab === 'mm') {
        // Bireysel silme ile ayni mantigi kullanarak MM TT tek tek sil
        
        for (const mm of existingMms) {
          try {
            console.log('Processing MM TT: ' + mm.stok_kodu + ' (ID: ' + mm.id + ')');
            
            // Delete relationships only (no intermediate products for Tavli/Balya)
            const relationResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmYmSt}?mm_id=${mm.id}`);
            if (relationResponse && relationResponse.ok) {
              const relations = await relationResponse.json();
              for (const relation of relations) {
                try {
                  await fetchWithAuth(`${API_URLS.tavliBalyaMmYmSt}/${relation.id}`, { method: 'DELETE' });
                  console.log(`Bulk: Deleted relationship ${relation.id}`);
                } catch (error) {
                  console.error('Error deleting relationship:', error);
                }
              }
            }

            // Delete TT MM product
            // Step 3: Delete the MM TT
            const deleteResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}/${mm.id}`, { 
              method: 'DELETE'
            });
            
            if (deleteResponse.ok) {
              console.log('MM TT ' + mm.stok_kodu + ' deleted successfully');
            } else {
              console.error('Failed to delete MM TT ' + mm.stok_kodu + ': ' + deleteResponse.status);
            }
            
          } catch (error) {
            console.error('Error processing MM TT ' + mm.stok_kodu + ':', error);
          }
        }
      } else if (activeDbTab === 'ymst') {
        // Sadece YM ST ve recetelerini sil
        const ymStIds = existingYmSts.map(ymSt => ymSt.id);
        
        if (ymStIds.length > 0) {
          for (let i = 0; i < ymStIds.length; i += batchSize) {
            const batch = ymStIds.slice(i, i + batchSize);
            const batchPromises = batch.map(id => 
              fetchWithAuth(`${API_URLS.galYmSt}/${id}`, { 
                method: 'DELETE'
              }).catch(error => {
                console.error('Failed to delete YM ST ' + id + ':', error);
                return null; // Continue with other deletions
              })
            );
            await Promise.all(batchPromises);
          }
        }
      }
      
      // Verileri yenile
      await Promise.all([
        fetchExistingMmGts(),
        fetchExistingYmSts()
      ]);
      
      setShowDeleteAllConfirm(false);
      setDeleteAllConfirmText('');
      
      // Aktif sekmeye gore basari mesaji goster
      if (activeDbTab === 'mm') {
        const deletedCount = existingMms.length;
        toast.success(`${deletedCount} MM TT ve ilişkili YM TT'ler ile tüm reçeteler başarıyla silindi`);
      } else {
        const deletedCount = existingYmSts.length;
        toast.success(`${deletedCount} YM ST ve reçeteleri başarıyla silindi`);
      }
      
      
    } catch (error) {
      console.error('Toplu silme hatası:', error);
      toast.error('Toplu silme hatası: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Talep seçimi için detay modalı açma
  const handleSelectRequest = (request) => {
    // KRITIK: HERHANGI bir talep secerken (yeni veya farkli) uygulama durumunu sifirla
    // Bu, her talep secimi icin temiz durum saglar
    resetApplicationState();
    
    setSelectedRequest(request);
    setShowRequestsModal(false);
    setShowRequestDetailModal(true);
  };
  
  // Tarihi goruntulemek icin bicimlendir yardimci fonksiyon
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR');
  };
  
  // Durum rozeti rengini almak icin yardimci fonksiyon
  const getStatusBadgeColor = (status, requestId = null) => {
    // Check if request is currently in queue
    if (requestId && isRequestInQueue(requestId)) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'silinmis':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Check if request is being processed in queue
  const isRequestInQueue = (requestId) => {
    return taskQueue.some(task => 
      task.status === 'processing' && 
      (task.name.includes(requestId) || task.name.includes('Düzenle'))
    );
  };

  // Durum metnini almak icin yardimci fonksiyon
  const getStatusText = (status, requestId = null) => {
    // Check if request is currently in queue
    if (requestId && isRequestInQueue(requestId)) {
      return 'İşleniyor';
    }
    
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      case 'in_progress':
        return 'İşleniyor';
      case 'completed':
        return 'Tamamlandı';
      case 'silinmis':
        return 'Silinmiş';
      default:
        return status;
    }
  };
  
  // Talepleri filtrele ve sirala
  const getFilteredAndSortedRequests = () => {
    let filteredRequests = [...requests];
    
    // Durum filtresini uygula
    if (statusFilter !== 'all') {
      filteredRequests = filteredRequests.filter(request => request.status === statusFilter);
    }
    
    // Arama sorgusunu uygula
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filteredRequests = filteredRequests.filter(request => 
        (request.cap && request.cap.toString().includes(query)) ||
        (request.product_type && request.product_type.toLowerCase().includes(query)) ||
        (request.yaglama_tipi && request.yaglama_tipi.toLowerCase().includes(query)) ||
        (request.id && request.id.toLowerCase().includes(query)) ||
        (request.cast_kont && request.cast_kont.toString().includes(query)) ||
        (request.unwinding && request.unwinding.toLowerCase().includes(query)) ||
        (request.helix_kont && request.helix_kont.toString().includes(query)) ||
        (request.elongation && request.elongation.toString().includes(query))
      );
    }
    
    // Siralamayi uygula
    filteredRequests.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Null degerleri isle
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      // Tarih alanlarini isle
      if (sortField === 'created_at' || sortField === 'processed_at' || sortField === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Sayisal alanlari isle
      if (sortField === 'cap' || sortField === 'kg' || sortField === 'cast_kont') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }
      
      // Siralama yonunu uygula
      const modifier = sortDirection === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return -1 * modifier;
      if (aValue > bValue) return 1 * modifier;
      return 0;
    });
    
    return filteredRequests;
  };
  
  // Talebi duzenleme - Edit reason modal aç
  const handleEditRequest = async () => {
    setShowEditReasonModal(true);
  };
  
  // Continue with edit after reason is provided
  const handleEditReasonConfirm = async () => {
    if (!editReason.trim()) {
      toast.error('Lütfen düzenleme nedenini girin');
      return;
    }
    
    try {
      setIsLoading(true);
      setShowEditReasonModal(false);
      
      // Update request with edit reason
      const updateResponse = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'in_progress',  // Duzenlenirken isleme alindi olarak isaretle
          edit_notes: editReason,
          processed_by: user?.username || user?.id || 'system',
          processed_at: new Date().toISOString(),
          // Store original product data when editing starts
          original_stok_adi: selectedRequest.stok_adi || '',
          original_product_key: JSON.stringify({
            stok_adi: selectedRequest.stok_adi || '',
            cap: selectedRequest.cap || '',
            product_type: selectedRequest.product_type || '',
            yaglama_tipi: selectedRequest.yaglama_tipi || ''
          })
        })
      });
      
      if (!updateResponse || !updateResponse.ok) {
        throw new Error('Talep durumu güncellenemedi');
      }
      
      toast.success('Talep düzenlemeye açıldı');
      
      // Durum sifirlamalari boyunca korumak icin talep ID'sini sessionStorage'da sakla
      sessionStorage.setItem('lastEditedRequestId', selectedRequest.id);
      
      // Set data for editing
      setMmData({
        cap: selectedRequest.cap ? normalizeDecimalDisplay(selectedRequest.cap) : '',
        product_type: selectedRequest.product_type || 'TAVLI',
        yaglama_tipi: selectedRequest.yaglama_tipi || '',
        min_mukavemet: selectedRequest.min_mukavemet ? normalizeDecimalDisplay(selectedRequest.min_mukavemet) : '',
        max_mukavemet: selectedRequest.max_mukavemet ? normalizeDecimalDisplay(selectedRequest.max_mukavemet) : '',
        kg: selectedRequest.kg ? normalizeDecimalDisplay(selectedRequest.kg) : '',
        ic_cap: selectedRequest.ic_cap || 45,
        dis_cap: selectedRequest.dis_cap || 75,
        tolerans_plus: selectedRequest.tolerans_plus ? normalizeDecimalDisplay(selectedRequest.tolerans_plus) : '',
        tolerans_minus: selectedRequest.tolerans_minus ? normalizeDecimalDisplay(selectedRequest.tolerans_minus) : '',
        shrink: selectedRequest.shrink || 'evet',
        unwinding: selectedRequest.unwinding || 'Anti-Clockwise',
        cast_kont: selectedRequest.cast_kont || '',
        helix_kont: selectedRequest.helix_kont || '',
        elongation: selectedRequest.elongation || ''
      });
      
      // Set tolerance signs from request
      setToleransMaxSign(selectedRequest.tolerans_max_sign || '+');
      setToleransMinSign(selectedRequest.tolerans_min_sign || '-');
      
      // Parse packaging options from stok_adi
      if (selectedRequest.stok_adi) {
        const packaging = {
          shrink: selectedRequest.stok_adi.includes('-Shrink'),
          paletli: selectedRequest.stok_adi.includes('-Plt'),
          karton: selectedRequest.stok_adi.includes('-Krt')
        };
        
        // If no packaging suffixes found, fallback to legacy shrink field
        if (!packaging.shrink && !packaging.paletli && !packaging.karton && selectedRequest.shrink) {
          packaging.shrink = selectedRequest.shrink === 'evet' || selectedRequest.shrink === 'Yes';
        }
        
        setPaketlemeSecenekleri(packaging);
      }
      
      // Bir talep duzenlendigini isaretle ve talebi kullanilmis olarak ayarla
      setIsEditingRequest(true);
      setIsRequestUsed(true);
      setPendingApprovalAction('edit');
      
      // Clear edit reason  
      setEditReason('');
      
      // Modali temizle ve girdi ekranına git (kullanıcı key values'ları editleyebilsin)
      setShowRequestDetailModal(false);
      setCurrentStep('input');
      
      // Trigger YM TT generation for the loaded data
      generateYmGtData();
      
      // Populate suitable YM STs if needed  
      await findSuitableYmSts();
      
    } catch (error) {
      console.error('Talep düzenleme hatası:', error);
      toast.error('Talep düzenlenemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Talebi onaylama
  const handleDetailApproveRequest = async () => {
    try {
      setIsLoading(true);
      
      // Don't change status immediately - just prepare for approval
      // The status will be changed after successful database save
      
      // Set the request as used and mark for approval
      setIsRequestUsed(true);
      setPendingApprovalAction('approve');
      setIsEditingRequest(false);
      
      // Virgul degil nokta saglamak icin tum sayisal degerler icin normallestirilmis ondalik gosterim kullan
      setMmData({
        cap: selectedRequest.cap ? normalizeDecimalDisplay(selectedRequest.cap) : '',
        product_type: selectedRequest.product_type || 'TAVLI',
        yaglama_tipi: selectedRequest.yaglama_tipi || '',
        min_mukavemet: selectedRequest.min_mukavemet ? normalizeDecimalDisplay(selectedRequest.min_mukavemet) : '',
        max_mukavemet: selectedRequest.max_mukavemet ? normalizeDecimalDisplay(selectedRequest.max_mukavemet) : '',
        kg: selectedRequest.kg ? normalizeDecimalDisplay(selectedRequest.kg) : '',
        ic_cap: selectedRequest.ic_cap || 45,
        dis_cap: selectedRequest.dis_cap || 75,
        tolerans_plus: selectedRequest.tolerans_plus ? normalizeDecimalDisplay(selectedRequest.tolerans_plus) : '',
        tolerans_minus: selectedRequest.tolerans_minus ? normalizeDecimalDisplay(selectedRequest.tolerans_minus) : '',
        shrink: selectedRequest.shrink || 'evet',
        unwinding: selectedRequest.unwinding || 'Anti-Clockwise',
        cast_kont: selectedRequest.cast_kont || '',
        helix_kont: selectedRequest.helix_kont || '',
        elongation: selectedRequest.elongation || ''
      });
      
      // Set tolerance signs from request
      setToleransMaxSign(selectedRequest.tolerans_max_sign || '+');
      setToleransMinSign(selectedRequest.tolerans_min_sign || '-');
      
      // Parse packaging options from stok_adi
      if (selectedRequest.stok_adi) {
        const packaging = {
          shrink: selectedRequest.stok_adi.includes('-Shrink'),
          paletli: selectedRequest.stok_adi.includes('-Plt'),
          karton: selectedRequest.stok_adi.includes('-Krt')
        };
        
        // If no packaging suffixes found, fallback to legacy shrink field
        if (!packaging.shrink && !packaging.paletli && !packaging.karton && selectedRequest.shrink) {
          packaging.shrink = selectedRequest.shrink === 'evet' || selectedRequest.shrink === 'Yes';
        }
        
        setPaketlemeSecenekleri(packaging);
      }
      
      setShowRequestDetailModal(false);
      setCurrentStep('summary');
      generateYmGtData();
      findSuitableYmSts();
      
      toast.info('Talep onay için hazırlandı. Lütfen ürünü kaydedin.');
      
    } catch (error) {
      console.error('Talep onaylama hazırlığı hatası:', error);
      toast.error('Talep onaylanamadı: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Talebi reddetme modalını açma
  const handleOpenRejectModal = () => {
    setShowRejectionModal(true);
  };
  
  // Talebi reddetme işlemini gerçekleştirme
  const handleDetailRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Lütfen bir ret nedeni girin');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Update request status to rejected with reason
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason,
          processed_by: user?.username || user?.id || 'system',
          processed_at: new Date().toISOString()
          // Do not include updated_at as it doesn't exist in the database yet
        })
      });
      
      if (!response || !response.ok) {
        throw new Error('Talep durumu güncellenemedi');
      }
      
      toast.success('Talep reddedildi');
      setRejectionReason('');
      setShowRejectionModal(false);
      setShowRequestDetailModal(false);
      
      // Refresh the requests list
      fetchRequests();
      
    } catch (error) {
      console.error('Talep reddetme hatası:', error);
      toast.error('Talep reddedilemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Mevcut MM TT seçimi
  const handleSelectExistingMmGt = async (mm) => {
    try {
      setIsLoading(true);
      setSelectedExistingMmGt(mm);
      setIsViewingExistingProduct(true); // Mark as viewing existing product
      
      // Store original product data for change detection (will be updated after YM STs are loaded)
      setOriginalProductData({
        mm: { ...mm },
        ymGts: [],
        ymSts: [] // Will be updated after loading
      });
      
      // Extract sequence from existing product's stok_kodu
      const existingSequence = mm.stok_kodu ? mm.stok_kodu.split('.').pop() : '00';
      console.log('Loading existing MM TT: ' + mm.stok_kodu + ' (ID: ' + mm.id + ', Sequence: ' + existingSequence + ')');
      setProcessSequence(existingSequence);
      
      // Use normalized decimal display for numeric values to ensure points not commas
      setMmData({
        cap: mm.cap ? normalizeDecimalDisplay(mm.cap) : '',
        product_type: mm.product_type || 'TAVLI',
        yaglama_tipi: mm.yaglama_tipi || '',
        min_mukavemet: mm.min_mukavemet ? normalizeDecimalDisplay(mm.min_mukavemet) : '',
        max_mukavemet: mm.max_mukavemet ? normalizeDecimalDisplay(mm.max_mukavemet) : '',
        kg: mm.kg ? normalizeDecimalDisplay(mm.kg) : '',
        ic_cap: mm.ic_cap || 45,
        dis_cap: mm.dis_cap || 75,
        tolerans_plus: mm.tolerans_plus !== undefined && mm.tolerans_plus !== null ? normalizeDecimalDisplay(Math.abs(mm.tolerans_plus)) : '',
        tolerans_minus: mm.tolerans_minus !== undefined && mm.tolerans_minus !== null ? normalizeDecimalDisplay(Math.abs(mm.tolerans_minus)) : '',
        shrink: mm.shrink || 'evet',
        unwinding: mm.unwinding || '',
        cast_kont: mm.cast_kont || '',
        helix_kont: mm.helix_kont || '',
        elongation: mm.elongation || ''
      });
      
      // Set tolerance signs based on original values
      if (mm.tolerans_plus !== undefined && mm.tolerans_plus !== null && mm.tolerans_plus !== '') {
        setToleransMaxSign(mm.tolerans_plus >= 0 ? '+' : '-');
      }
      if (mm.tolerans_minus !== undefined && mm.tolerans_minus !== null && mm.tolerans_minus !== '') {
        setToleransMinSign(mm.tolerans_minus >= 0 ? '+' : '-');
      }
      
      // Clear existing selections first to avoid conflicts
      setSelectedYmSts([]);
      setAutoGeneratedYmSts([]);
      setAllRecipes({ mmRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
      setRecipeStatus({ mmRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
      
      // 🔄 STEP 1: Find all related data through the enhanced relationship table
      const mmYmStResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmYmSt}?mm_gt_id=${mm.id}`);
      
      let loadedYmSts = [];
      let relatedYmGtId = null;
      let mainYmStIndex = 0;
      
      if (mmYmStResponse && mmYmStResponse.ok) {
        const mmYmStRelations = await mmYmStResponse.json();
        
        if (mmYmStRelations.length > 0) {
          // 🆕 NEW: Get YM TT ID from the relationship (all relations should have the same ym_gt_id)
          relatedYmGtId = mmYmStRelations[0].ym_gt_id;
          
          // 🆕 NEW: Sort relations by sequence_index to maintain order
          const sortedRelations = mmYmStRelations.sort((a, b) => (a.sequence_index || 0) - (b.sequence_index || 0));
          
          // Load each related YM ST in the correct order
          for (let i = 0; i < sortedRelations.length; i++) {
            const relation = sortedRelations[i];
            try {
              console.log(`📖 Fetching all YM ST products and filtering for id=${relation.ym_st_id}...`);
              const allYmStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?limit=1000`);
              let ymStResponse = null;
              
              if (allYmStResponse && allYmStResponse.ok) {
                const allYmSt = await allYmStResponse.json();
                const filteredYmSt = allYmSt.filter(r => r.id == relation.ym_st_id); // Use == for type coercion
                console.log(`📖 Found ${filteredYmSt.length} YM ST products for id=${relation.ym_st_id}`);
                
                // Create mock response - return first match or empty array
                ymStResponse = {
                  ok: true,
                  json: async () => filteredYmSt.length > 0 ? filteredYmSt[0] : []
                };
              }
              
              if (ymStResponse && ymStResponse.ok) {
                const ymStData = await ymStResponse.json();
                const ymSt = Array.isArray(ymStData) ? ymStData[0] : ymStData;
                if (ymSt) {
                  loadedYmSts.push({ ...ymSt, source: 'database' });

                  // 🆕 NEW: Track which YM ST is the main one (use sequence_index if available, fallback to is_main)
                  if (relation.sequence_index === 0 || relation.is_main) {
                    mainYmStIndex = i;
                  }

                        }
              } else {
                console.warn('Failed to load YM ST with ID: ' + relation.ym_st_id);
              }
            } catch (ymStError) {
              console.error('Error loading YM ST ' + relation.ym_st_id + ':', ymStError);
            }
          }
        }
      } else {
        console.log('No YM ST relations found or error occurred');
      }
      
      // If no YM STs were loaded from relationships, continue without them
      // User can still add new ones manually
      if (loadedYmSts.length === 0) {
        console.log('ℹ️ No existing YM STs found. User can add new ones.');
      }
      
      // Set the loaded YM STs and main index
      setSelectedYmSts(loadedYmSts);
      if (loadedYmSts.length > 0) {
        setMainYmStIndex(mainYmStIndex); // 🆕 NEW: Use the actual main index from database
      }
      
      // Update original product data with loaded YM STs for change detection
      setOriginalProductData(prev => ({
        ...prev,
        ymSts: [...loadedYmSts]
      }));
      
      // 🔄 STEP 2: Load all recipes
      console.log('🔍 Step 2: Loading all recipes...');
      const updatedAllRecipes = { 
        mmRecipes: {}, 
        ymGtRecipe: {}, 
        ymStRecipes: {} 
      };
      const updatedRecipeStatus = { 
        mmRecipes: {}, 
        ymGtRecipe: {}, 
        ymStRecipes: {} 
      };
      
      // 2A. Load MM TT recipes
      try {
        console.log('🍳 Loading MM TT recipes...');
        const mmRecipeResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}?mm_gt_id=${mm.id}`);
        if (mmRecipeResponse && mmRecipeResponse.ok) {
          const mmRecipes = await mmRecipeResponse.json();
          
          // Initialize MM TT recipes for each YM ST index (including if no YM STs yet)
          const ymStCount = Math.max(loadedYmSts.length, 1); // At least 1 for the case where no YM STs are loaded yet
          for (let index = 0; index < ymStCount; index++) {
            updatedAllRecipes.mmRecipes[index] = {};
            updatedRecipeStatus.mmRecipes[index] = {};
            
            // Add each recipe
            mmRecipes.forEach(recipe => {
              if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                // Special handling for Çinko: database stores as '150' but we display as '150 03'
                let displayCode = recipe.bilesen_kodu;
                if (recipe.bilesen_kodu === '150' && recipe.aciklama === 'Çinko Tüketim Miktarı') {
                  displayCode = '150 03';
                }
                
                updatedAllRecipes.mmRecipes[index][displayCode] = parseFloat(recipe.miktar);
                updatedRecipeStatus.mmRecipes[index][displayCode] = 'database';
              }
            });
          }
        } else {
          console.log('No MM TT recipes found');
        }
      } catch (mmError) {
        console.error('Error loading MM TT recipes:', mmError);
      }
      
      
      // 2C. Load YM ST recipes for each loaded YM ST
      for (let i = 0; i < loadedYmSts.length; i++) {
        const ymSt = loadedYmSts[i];
        try {
          console.log(`📖 Fetching all YM ST recipes and filtering for ym_st_id=${ymSt.id}...`);
          const allYmStRecipesResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?limit=2000`);
          let ymStRecipeResponse = null;
          
          if (allYmStRecipesResponse && allYmStRecipesResponse.ok) {
            const allYmStRecipes = await allYmStRecipesResponse.json();
            const filteredYmStRecipes = allYmStRecipes.filter(r => r.ym_st_id == ymSt.id); // Use == for type coercion
            console.log(`📖 Found ${filteredYmStRecipes.length} YM ST recipes for ym_st_id=${ymSt.id}`);
            
            // Create mock response
            ymStRecipeResponse = {
              ok: true,
              json: async () => filteredYmStRecipes
            };
          }
          
          if (ymStRecipeResponse && ymStRecipeResponse.ok) {
            const ymStRecipes = await ymStRecipeResponse.json();
            
            // Initialize recipe object for this YM ST
            updatedAllRecipes.ymStRecipes[i] = {};
            updatedRecipeStatus.ymStRecipes[i] = {};
            
            // Store each recipe
            ymStRecipes.forEach(recipe => {
              if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                // Special handling for Çinko: database stores as '150' but we display as '150 03'
                let displayCode = recipe.bilesen_kodu;
                if (recipe.bilesen_kodu === '150' && recipe.aciklama === 'Çinko Tüketim Miktarı') {
                  displayCode = '150 03';
                }
                
                updatedAllRecipes.ymStRecipes[i][displayCode] = parseFloat(recipe.miktar);
                updatedRecipeStatus.ymStRecipes[i][displayCode] = 'database';
              }
            });
          } else {
            console.log('No recipes found for YM ST: ' + ymSt.stok_kodu);
          }
        } catch (ymStRecipeError) {
          console.error('Error loading recipes for YM ST ' + ymSt.stok_kodu + ':', ymStRecipeError);
        }
      }
      
      // 🔄 STEP 3: Update all states
      setAllRecipes(updatedAllRecipes);
      setRecipeStatus(updatedRecipeStatus);
      
      
      // Stay on input step for editing, or move to summary for viewing
      setShowExistingMmModal(false);
      // Keep on input step when editing so user can modify basic product details
      setCurrentStep('input');
      
      console.log('📊 Recipe data summary:', {
        mmRecipes: Object.keys(updatedAllRecipes.mmRecipes).length,
        ymGtRecipe: Object.keys(updatedAllRecipes.ymGtRecipe).length,
        ymStRecipes: Object.keys(updatedAllRecipes.ymStRecipes).length
      });
      console.log('📊 Loaded YM STs:', loadedYmSts.map(ym => ym.stok_kodu));
      
      // Show success message
      toast.success(`Mevcut ürün yüklendi: ${loadedYmSts.length} YM ST ve tüm reçeteler getirildi`);
      
    } catch (error) {
      console.error('Error in handleSelectExistingMmGt:', error);
      toast.error('Mevcut ürün verileri yüklenirken hata oluştu: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to generate product key for tracking
  const generateProductKey = (data) => {
    return JSON.stringify({
      stok_adi: data.stok_adi || '',
      cap: data.cap || '',
      kalinlik: data.kalinlik || '',
      product_type: data.product_type || '', // ✅ FIXED: TAVLI or BALYA (not kod_2)
      kalite: data.kalite || '',
      yaglama_tipi: data.yaglama_tipi || '', // ✅ FIXED: Püskürtme/Daldırma (not kaplama)
      tensile_min: data.tensile_min || '',
      tensile_max: data.tensile_max || ''
    });
  };

  // Helper function to generate change summary for display
  const generateChangeSummary = (changes) => {
    if (changes.length === 0) return 'Değişiklik yok';
    
    return changes.map(change => 
      `${change.field}: "${change.oldValue}" → "${change.newValue}"`
    ).join('; ');
  };

  // Alias for compatibility with existing code (references the existing generateStokAdi function defined later)
  const generateMmTtStokAdi = () => generateStokAdi();

  // Detect changes between original and current data
  const detectChanges = () => {
    if (!originalProductData || !originalProductData.mm) return [];
    
    const changes = [];
    const original = originalProductData.mm;
    
    // Check each field for changes
    const fieldsToCheck = [
      { key: 'cap', label: 'Çap' },
      { key: 'product_type', label: 'Ürün Tipi' }, // ✅ FIXED: TAVLI or BALYA (not kod_2)
      { key: 'yaglama_tipi', label: 'Yağlama Tipi' }, // ✅ FIXED: Püskürtme/Daldırma (not kaplama)
      { key: 'min_mukavemet', label: 'Min Mukavemet' },
      { key: 'max_mukavemet', label: 'Max Mukavemet' },
      { key: 'kg', label: 'Ağırlık (kg)' },
      { key: 'ic_cap', label: 'İç Çap' },
      { key: 'dis_cap', label: 'Dış Çap' },
      { key: 'tolerans_plus', label: 'Tolerans (+)' },
      { key: 'tolerans_minus', label: 'Tolerans (-)' },
      { key: 'shrink', label: 'Shrink' },
      { key: 'unwinding', label: 'Unwinding' },
      { key: 'cast_kont', label: 'Bağ Miktarı' },
      { key: 'helix_kont', label: 'Helix Kontrol' },
      { key: 'elongation', label: 'Elongation' }
    ];
    
    fieldsToCheck.forEach(field => {
      const originalValue = original[field.key];
      const currentValue = mmData[field.key];
      
      // Special handling for tolerance fields - compare with signs
      if (field.key === 'tolerans_plus') {
        const originalTolerance = originalValue ? parseFloat(originalValue) : 0;
        const currentTolerance = currentValue ? parseFloat(currentValue) : 0;
        const currentWithSign = toleransMaxSign === '+' ? currentTolerance : -currentTolerance;
        
        if (Math.abs(originalTolerance - currentWithSign) > 0.0001) {
          changes.push({
            field: field.label,
            oldValue: originalTolerance.toString(),
            newValue: currentWithSign.toString()
          });
        }
      } else if (field.key === 'tolerans_minus') {
        const originalTolerance = originalValue ? parseFloat(originalValue) : 0;
        const currentTolerance = currentValue ? parseFloat(currentValue) : 0;
        const currentWithSign = toleransMinSign === '+' ? currentTolerance : -currentTolerance;
        
        if (Math.abs(originalTolerance - currentWithSign) > 0.0001) {
          changes.push({
            field: field.label,
            oldValue: originalTolerance.toString(),
            newValue: currentWithSign.toString()
          });
        }
      } else {
        // Normal field comparison
        const normalizedOriginal = originalValue ? String(originalValue).trim() : '';
        const normalizedCurrent = currentValue ? String(currentValue).trim() : '';
        
        if (normalizedOriginal !== normalizedCurrent) {
          changes.push({
            field: field.label,
            oldValue: normalizedOriginal || 'Boş',
            newValue: normalizedCurrent || 'Boş'
          });
        }
      }
    });
    
    // Check packaging options
    const originalPackaging = {
      shrink: original.stok_adi?.includes('-Shrink') || original.shrink === 'evet',
      paletli: original.stok_adi?.includes('-Plt'),
      karton: original.stok_adi?.includes('-Krt')
    };
    
    if (originalPackaging.shrink !== paketlemeSecenekleri.shrink ||
        originalPackaging.paletli !== paketlemeSecenekleri.paletli ||
        originalPackaging.karton !== paketlemeSecenekleri.karton) {
      changes.push({
        field: 'Paketleme Seçenekleri',
        oldValue: `Shrink: ${originalPackaging.shrink ? 'Evet' : 'Hayır'}, Paletli: ${originalPackaging.paletli ? 'Evet' : 'Hayır'}, Karton: ${originalPackaging.karton ? 'Evet' : 'Hayır'}`,
        newValue: `Shrink: ${paketlemeSecenekleri.shrink ? 'Evet' : 'Hayır'}, Paletli: ${paketlemeSecenekleri.paletli ? 'Evet' : 'Hayır'}, Karton: ${paketlemeSecenekleri.karton ? 'Evet' : 'Hayır'}`
      });
    }
    
    // Check YM ST changes
    const originalYmSts = originalProductData.ymSts || [];
    const currentYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    // Compare YM ST counts
    if (originalYmSts.length !== currentYmSts.length) {
      changes.push({
        field: 'YM ST Sayısı',
        oldValue: originalYmSts.length.toString(),
        newValue: currentYmSts.length.toString()
      });
    } else {
      // Compare YM ST stok_kodu lists
      const originalCodes = originalYmSts.map(ym => ym.stok_kodu).sort();
      const currentCodes = currentYmSts.map(ym => ym.stok_kodu).sort();
      
      if (JSON.stringify(originalCodes) !== JSON.stringify(currentCodes)) {
        changes.push({
          field: 'YM ST Listesi',
          oldValue: originalCodes.join(', '),
          newValue: currentCodes.join(', ')
        });
      }
    }
    
    return changes;
  };


  // Uygun YM ST'leri bul - yeniden arama yapma fonksiyonu
  const findSuitableYmSts = async () => {
    try {
      setIsLoading(true);
      // ✅ CORRECT: Use galYmSt (shared YM.ST product table used by all product types)
      // tavliBalyaMmYmSt is only for MM↔YM.ST relationships, NOT for YM.ST products themselves
      const response = await fetchWithAuth(`${API_URLS.galYmSt}?limit=1000&sort_by=cap&sort_order=asc`);
      if (response && response.ok) {
        const allYmSts = await response.json();
        const cap = parseFloat(mmData.cap) || 0;
        let filtered = [];

        if (Array.isArray(allYmSts)) {
          // Önce tam eşleşme olup olmadığını kontrol et
          const exactMatch = allYmSts.find(ymSt => {
            const ymStCap = parseFloat(ymSt.cap) || 0;
            return Math.abs(ymStCap - cap) < 0.01; // Tam eşleşme için tolerance
          });

          if (exactMatch) {
            filtered.push(exactMatch);
          }

          // ✅ FIXED: Removed PAD/NIT galvanizli-specific filtering logic
          // For Tavlı/Balya Tel, use simple tolerance-based filtering (±10% range)
          const tolerance = 0.10; // 10% tolerance
          const minCap = cap * (1 - tolerance);
          const maxCap = cap * (1 + tolerance);

          const rangeFilter = allYmSts.filter(ymSt => {
            const ymStCap = parseFloat(ymSt.cap) || 0;
            return ymStCap >= minCap && ymStCap <= maxCap && !filtered.includes(ymSt);
          });

          filtered = [...filtered, ...rangeFilter];

          // En yakın 10 ürünle sınırla (artırıldı: 5 → 10)
          filtered = filtered.slice(0, 10);
        }

        setSuitableYmSts(filtered);
      }
    } catch (error) {
      console.error('YM ST listesi getirilirken hata:', error);
      toast.error('YM ST listesi getirilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Otomatik YM ST oluştur - kaplama değerine göre çap azaltması yaparak
  const generateAutoYmSts = async () => {
    const cap = parseFloat(mmData.cap) || 0;
    const kaplama = parseInt(mmData.kaplama) || 0;
    const kodType = mmData.kod_2; // 'PAD' or 'NIT'

    // ========== STEP 1: Calculate YM ST diameter with CORRECT formula ==========
    // Formula: YM_ST_diameter = YM_GT_nominal - abs(min_tolerance) - coating_reduction + 0.02
    const toleransMinus = parseFloat(mmData.tolerans_minus) || 0;
    const toleransMinSign = mmData.tolerans_min_sign || '-';

    const actualToleranceMinus = Math.abs(toleransMinus);
    const coatingReduction = (kaplama / 35) * 0.01;

    const baseAdjustedCap = cap - actualToleranceMinus - coatingReduction + 0.02;
    const ymStDiameter = Math.max(Math.round(baseAdjustedCap * 100) / 100, 0.1); // Minimum 0.1mm, round to 2 decimals

    console.log(`🔧 YM ST Diameter Calculation:`, {
      mmCap: cap,
      tolerance: actualToleranceMinus,
      coating: coatingReduction,
      result: ymStDiameter
    });

    // ========== STEP 2: Determine product type based on diameter ==========
    const autoYmSts = [];

    if (ymStDiameter < 1.5) {
      // ========== CASE 1: < 1.5mm → Only .ST products (COTLC01-based) ==========
      console.log('📍 YM ST < 1.5mm: Creating .ST product only');

      const capStr = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
      const stokKodu = `YM.ST.${capStr}.ST`;

      // Check if this .ST product already exists
      try {
        const existing = await checkExistingProduct(API_URLS.galYmSt, stokKodu);
        if (existing) {
          setExistingYmStsForModal([existing]);
          setShowYmStExistsModal(true);
          return;
        }
      } catch (error) {
        console.error('Error checking existing .ST product:', error);
      }

      // Create .ST product
      autoYmSts.push({
        stok_kodu: stokKodu,
        stok_adi: `YM Siyah Tel ${ymStDiameter.toFixed(2)} mm (Coiler)`,
        cap: ymStDiameter,
        filmasin: 0, // .ST products have no filmasin
        quality: 'ST',
        payda_1: 1000, // .ST products use 1000 (not 1.000)
        kaplama: kaplama,
        source: 'auto-generated',
        isStProduct: true, // Mark as .ST product
        isExisting: false
      });

    } else if (ymStDiameter >= 1.5 && ymStDiameter < 1.8) {
      // ========== CASE 2: 1.5-1.8mm → BOTH filmaşin (Ana) + .ST (ALT_1) ==========
      console.log('📍 YM ST 1.5-1.8mm: Creating filmaşin (Ana) + .ST (ALT_1)');

      // Ana: Filmaşin-based from matrix priority 0
      const matrixAlts = getMatrixAlternatives(ymStDiameter);
      const anaAlt = matrixAlts && matrixAlts.length > 0 && matrixAlts[0].priority === 0
        ? matrixAlts[0]
        : null;

      if (anaAlt) {
        const capStr = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
        const filmasinStr = (anaAlt.diameter * 100).toString().padStart(4, '0');
        const stokKodu = `YM.ST.${capStr}.${filmasinStr}.${anaAlt.quality}`;

        // Check if Ana product already exists
        try {
          const existing = await checkExistingProduct(API_URLS.galYmSt, stokKodu);
          if (!existing) {
            autoYmSts.push({
              stok_kodu: stokKodu,
              stok_adi: `YM Siyah Tel ${ymStDiameter.toFixed(2)} mm HM:${filmasinStr}.${anaAlt.quality}`,
              cap: ymStDiameter,
              filmasin: Math.round(anaAlt.diameter * 100),
              quality: anaAlt.quality,
              payda_1: 1, // Filmaşin products use 1.000
              kaplama: kaplama,
              source: 'auto-generated',
              priority: 0,
              isMain: true,
              isExisting: false
            });
          }
        } catch (error) {
          console.error('Error checking Ana product:', error);
        }
      } else {
        // Fallback to FILMASIN_MAPPING if matrix not available
        console.warn('⚠️ Matrix not found, using FILMASIN_MAPPING fallback');
        const filmasinCap = getFilmasinForCap(ymStDiameter);
        const quality = getQualityForCap(ymStDiameter);
        const capStr = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
        const stokKodu = `YM.ST.${capStr}.${filmasinCap}.${quality}`;

        autoYmSts.push({
          stok_kodu: stokKodu,
          stok_adi: `YM Siyah Tel ${ymStDiameter.toFixed(2)} mm HM:${filmasinCap}.${quality}`,
          cap: ymStDiameter,
          filmasin: parseInt(filmasinCap),
          quality: quality,
          payda_1: 1,
          kaplama: kaplama,
          source: 'auto-generated',
          priority: 0,
          isMain: true,
          isExisting: false
        });
      }

      // ALT_1: .ST product
      const capStrAlt = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
      const stokKoduAlt = `YM.ST.${capStrAlt}.ST`;

      try {
        const existing = await checkExistingProduct(API_URLS.galYmSt, stokKoduAlt);
        if (!existing) {
          autoYmSts.push({
            stok_kodu: stokKoduAlt,
            stok_adi: `YM Siyah Tel ${ymStDiameter.toFixed(2)} mm (Coiler ALT)`,
            cap: ymStDiameter,
            filmasin: 0,
            quality: 'ST',
            payda_1: 1000,
            kaplama: kaplama,
            source: 'auto-generated',
            priority: 1,
            isStProduct: true,
            isMain: false,
            isExisting: false
          });
        }
      } catch (error) {
        console.error('Error checking .ST alternative:', error);
      }

    } else {
      // ========== CASE 3: > 1.8mm → Matrix-based filmaşin alternatives ==========
      console.log('📍 YM ST > 1.8mm: Creating matrix-based alternatives');

      const matrixAlts = getMatrixAlternatives(ymStDiameter);

      if (matrixAlts && matrixAlts.length > 0) {
        // Create products for each priority (0=Ana, 1=ALT_1, 2=ALT_2)
        for (const alt of matrixAlts) {
          const capStr = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
          const filmasinStr = (alt.diameter * 100).toString().padStart(4, '0');
          const stokKodu = `YM.ST.${capStr}.${filmasinStr}.${alt.quality}`;

          try {
            const existing = await checkExistingProduct(API_URLS.galYmSt, stokKodu);
            if (!existing) {
              autoYmSts.push({
                stok_kodu: stokKodu,
                stok_adi: `YM Siyah Tel ${ymStDiameter.toFixed(2)} mm HM:${filmasinStr}.${alt.quality}`,
                cap: ymStDiameter,
                filmasin: Math.round(alt.diameter * 100),
                quality: alt.quality,
                payda_1: 1,
                kaplama: kaplama,
                source: 'auto-generated',
                priority: alt.priority,
                isMain: alt.priority === 0,
                isExisting: false
              });
            }
          } catch (error) {
            console.error(`Error checking alternative priority ${alt.priority}:`, error);
          }
        }
      } else {
        // Fallback to FILMASIN_MAPPING if matrix not available
        console.warn('⚠️ Matrix not found, using FILMASIN_MAPPING fallback');
        const filmasinCap = getFilmasinForCap(ymStDiameter);
        const quality = getQualityForCap(ymStDiameter);
        const capStr = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
        const stokKodu = `YM.ST.${capStr}.${filmasinCap}.${quality}`;

        autoYmSts.push({
          stok_kodu: stokKodu,
          stok_adi: `YM Siyah Tel ${ymStDiameter.toFixed(2)} mm HM:${filmasinCap}.${quality}`,
          cap: ymStDiameter,
          filmasin: parseInt(filmasinCap),
          quality: quality,
          payda_1: 1,
          kaplama: kaplama,
          source: 'auto-generated',
          priority: 0,
          isMain: true,
          isExisting: false
        });
      }
    }

    // ========== STEP 3: Set state and calculate recipes ==========
    if (autoYmSts.length === 0) {
      toast.warning('Otomatik YM ST oluşturulamadı - tüm ürünler zaten mevcut');
      return;
    }

    console.log(`✅ Generated ${autoYmSts.length} YM ST products:`, autoYmSts.map(y => y.stok_kodu));

    setAutoGeneratedYmSts(autoYmSts);

    // Set main YM ST index if this is the first selection
    const totalYmSts = selectedYmSts.length + autoYmSts.length;
    if (totalYmSts > 0 && selectedYmSts.length === 0 && autoYmSts.length > 0) {
      setMainYmStIndex(0);
    }

    // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
    // setTimeout(() => {
    //   calculateAutoRecipeValues();
    // }, 100);
  };

  // Simplified YM ST creation for Tavli/Balya - Always creates ONE siyah tel product
  // Tavli/Balya NEVER uses filmaşin - only siyah tel (YM.ST) which goes to TAV01 (annealing)
  const handleCreateYmStFromDiameter = async () => {
    const ymStDiameter = parseFloat(userYmStDiameter);

    if (!ymStDiameter || ymStDiameter <= 0) {
      toast.error('Geçerli bir YM ST çapı giriniz');
      return;
    }

    console.log(`🔧 Creating YM ST product for Tavli/Balya - diameter: ${ymStDiameter}mm`);
    console.log(`📍 YM.ST products are intermediate products made FROM filmaşin`);
    console.log(`📍 Will create ONLY the MAIN (priority 0) YM.ST product`);

    // Get kaplama from mmData (needed for YM.ST products)
    const kaplama = parseInt(mmData.kaplama) || 0;

    const autoYmSts = [];
    const existingProducts = [];

    // IMPORTANT: Create ONLY ONE YM.ST product - the MAIN (priority 0) from the matrix
    // Alternatives will be generated in Excel recipes, not as separate products upfront
    // Format: YM.ST.XXXX.YYYY.ZZZZ where:
    // XXXX = cap (diameter)
    // YYYY = filmaşin diameter (source material)
    // ZZZZ = quality code

    if (ymStDiameter < 1.5) {
      console.log('📍 YM ST < 1.5mm: Creating simple .ST product');

      const capStr = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
      const stokKodu = `YM.ST.${capStr}.ST`;

      try {
        const existing = await checkExistingProduct(API_URLS.galYmSt, stokKodu);
        if (existing) {
          existingProducts.push(existing);
        } else {
          autoYmSts.push({
            stok_kodu: stokKodu,
            stok_adi: `YM Siyah Tel ${ymStDiameter.toFixed(2)} mm (Coiler)`,
            cap: ymStDiameter,
            filmasin: 0,
            quality: 'ST',
            payda_1: 1000,
            kaplama: kaplama,
            source: 'auto-generated',
            isStProduct: true,
            isExisting: false
          });
        }
      } catch (error) {
        console.error('Error checking existing .ST product:', error);
      }

    } else {
      // ========== CASE 2: >= 1.5mm → Create ONLY the MAIN filmaşin product (priority 0) ==========
      console.log(`📍 YM ST >= 1.5mm: Creating ONLY main filmaşin product (priority 0)`);

      const matrixAlts = getMatrixAlternatives(ymStDiameter);
      const mainAlt = matrixAlts && matrixAlts.length > 0 && matrixAlts[0].priority === 0
        ? matrixAlts[0]
        : null;

      if (mainAlt) {
        const capStr = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
        const filmasinStr = (mainAlt.diameter * 100).toString().padStart(4, '0');
        const stokKodu = `YM.ST.${capStr}.${filmasinStr}.${mainAlt.quality}`;

        try {
          const existing = await checkExistingProduct(API_URLS.galYmSt, stokKodu);
          if (existing) {
            existingProducts.push(existing);
          } else {
            autoYmSts.push({
              stok_kodu: stokKodu,
              stok_adi: `YM Siyah Tel ${ymStDiameter.toFixed(2)} mm HM:${filmasinStr}.${mainAlt.quality}`,
              cap: ymStDiameter,
              filmasin: Math.round(mainAlt.diameter * 100),
              quality: mainAlt.quality,
              payda_1: 1,
              kaplama: kaplama,
              source: 'auto-generated',
              priority: 0,
              isMain: true,
              isExisting: false
            });
          }
        } catch (error) {
          console.error('Error checking main product:', error);
        }
      } else {
        console.warn('⚠️ Matrix not found, using FILMASIN_MAPPING fallback');
        const filmasinCap = getFilmasinForCap(ymStDiameter);
        const quality = getQualityForCap(ymStDiameter);
        const capStr = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
        const stokKodu = `YM.ST.${capStr}.${filmasinCap}.${quality}`;

        try {
          const existing = await checkExistingProduct(API_URLS.galYmSt, stokKodu);
          if (existing) {
            existingProducts.push(existing);
          } else {
            autoYmSts.push({
              stok_kodu: stokKodu,
              stok_adi: `YM Siyah Tel ${ymStDiameter.toFixed(2)} mm HM:${filmasinCap}.${quality}`,
              cap: ymStDiameter,
              filmasin: parseInt(filmasinCap),
              quality: quality,
              payda_1: 1,
              kaplama: kaplama,
              source: 'auto-generated',
              priority: 0,
              isMain: true,
              isExisting: false
            });
          }
        } catch (error) {
          console.error('Error checking fallback filmasin product:', error);
        }
      }
    }

    // Check if any products already exist - AUTO-ADD them instead of showing modal
    if (existingProducts.length > 0) {
      console.log(`✅ Found ${existingProducts.length} existing products - auto-adding:`, existingProducts.map(p => p.stok_kodu));

      // Check if not already in selectedYmSts
      const existingStokKodus = selectedYmSts.map(y => y.stok_kodu);
      const productsToAdd = existingProducts.filter(p => !existingStokKodus.includes(p.stok_kodu)).map(p => ({
        ...p,
        isExisting: true // Flag to indicate this is an existing product
      }));

      if (productsToAdd.length > 0) {
        setSelectedYmSts(prev => [...prev, ...productsToAdd]);

        if (selectedYmSts.length === 0) {
          setMainYmStIndex(0);
        }

        // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
        // setTimeout(() => {
        //   calculateAutoRecipeValues();
        // }, 100);

        toast.success(`${productsToAdd.length} mevcut YM ST eklendi`);
      } else {
        toast.info('YM ST zaten eklenmiş');
      }
      return;
    }

    // Check if we have any new products to create
    if (autoYmSts.length === 0) {
      toast.warning('YM ST oluşturulamadı');
      return;
    }

    console.log(`✅ Generated ${autoYmSts.length} NEW YM ST products:`, autoYmSts.map(y => y.stok_kodu));

    setAutoGeneratedYmSts(autoYmSts);

    if (selectedYmSts.length === 0 && autoYmSts.length > 0) {
      setMainYmStIndex(0);
    }

    // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
    // setTimeout(() => {
    //   calculateAutoRecipeValues();
    // }, 100);

    toast.success(`${autoYmSts.length} YM ST ürün oluşturuldu`);
  };

  // Filmaşin mapping from Excel data (Hammadde_tuketimleri.xlsx)
  const FILMASIN_MAPPING = {
    4.45: [{filmasin: 5.5, quality: '1006'}, {filmasin: 5.5, quality: '1008'}, {filmasin: 6.0, quality: '1008'}],
    4.5: [{filmasin: 5.5, quality: '1006'}, {filmasin: 5.5, quality: '1008'}, {filmasin: 6.0, quality: '1008'}],
    4.75: [{filmasin: 6.0, quality: '1008'}, {filmasin: 6.5, quality: '1008'}, {filmasin: 6.5, quality: '1010'}],
    4.85: [{filmasin: 6.0, quality: '1008'}, {filmasin: 6.5, quality: '1008'}, {filmasin: 6.5, quality: '1010'}],
    5: [{filmasin: 6.0, quality: '1008'}, {filmasin: 6.5, quality: '1008'}, {filmasin: 6.5, quality: '1010'}],
    5.5: [{filmasin: 6.5, quality: '1008'}, {filmasin: 6.5, quality: '1010'}, {filmasin: 7.0, quality: '1008'}, {filmasin: 7.0, quality: '1010'}],
    6: [{filmasin: 7.0, quality: '1008'}, {filmasin: 7.0, quality: '1010'}, {filmasin: 7.5, quality: '1008'}],
    6.5: [{filmasin: 7.5, quality: '1008'}, {filmasin: 8.0, quality: '1008'}, {filmasin: 8.0, quality: '1010'}],
    7: [{filmasin: 8.0, quality: '1008'}, {filmasin: 8.0, quality: '1010'}],
    7.5: [{filmasin: 9.0, quality: '1008'}, {filmasin: 9.0, quality: '1010'}],
    7.8: [{filmasin: 9.0, quality: '1008'}, {filmasin: 9.0, quality: '1010'}],
    8: [{filmasin: 9.0, quality: '1010'}, {filmasin: 9.0, quality: '1008'}], // Prefer 1010 for 8mm
    // Note: 8.5mm, 8.6mm, 9.0mm theoretically need 10mm filmaşin but we only have up to 9mm
    // These diameters are not produced in practice (max actual diameter is ~8.09mm)
    8.5: [{filmasin: 9.0, quality: '1010'}, {filmasin: 9.0, quality: '1008'}], // Fallback to 9mm
    8.6: [{filmasin: 9.0, quality: '1010'}, {filmasin: 9.0, quality: '1008'}], // Fallback to 9mm
    9: [{filmasin: 9.0, quality: '1010'}, {filmasin: 9.0, quality: '1008'}], // Fallback to 9mm
    9.2: [{filmasin: 11.0, quality: '1010'}, {filmasin: 11.0, quality: '1008'}],
    9.5: [{filmasin: 11.0, quality: '1010'}, {filmasin: 11.0, quality: '1008'}],
    9.9: [{filmasin: 11.0, quality: '1010'}, {filmasin: 11.0, quality: '1008'}],
    10: [{filmasin: 11.0, quality: '1010'}, {filmasin: 11.0, quality: '1008'}],
    10.5: [{filmasin: 12.0, quality: '1010'}, {filmasin: 12.0, quality: '1008'}],
    10.6: [{filmasin: 12.0, quality: '1010'}, {filmasin: 12.0, quality: '1008'}],
    11: [{filmasin: 12.0, quality: '1010'}, {filmasin: 12.0, quality: '1008'}],
    11.2: [{filmasin: 13.0, quality: '1010'}, {filmasin: 13.0, quality: '1008'}],
    11.5: [{filmasin: 13.0, quality: '1010'}, {filmasin: 13.0, quality: '1008'}],
    12: [{filmasin: 13.0, quality: '1010'}, {filmasin: 13.0, quality: '1008'}]
  };

  // Find closest diameter in mapping and get appropriate filmaşin
  const getFilmasinForCapFromMapping = (cap) => {
    const availableDiameters = Object.keys(FILMASIN_MAPPING).map(d => parseFloat(d)).sort((a, b) => a - b);
    
    // Find exact match first
    const exactMatch = availableDiameters.find(d => Math.abs(d - cap) < 0.01);
    if (exactMatch) {
      const options = FILMASIN_MAPPING[exactMatch];
      return options[0]; // Return first (preferred) option
    }
    
    // Find closest diameter that can handle this cap (find smallest diameter >= cap)
    const suitableDiameter = availableDiameters.find(d => d >= cap);
    if (suitableDiameter) {
      const options = FILMASIN_MAPPING[suitableDiameter];
      return options[0]; // Return first (preferred) option
    }
    
    // Fallback to largest available if cap is larger than all mapped diameters
    const largestDiameter = availableDiameters[availableDiameters.length - 1];
    const options = FILMASIN_MAPPING[largestDiameter];
    return options[0];
  };

  // Çap değerine göre filmaşin seç - Updated to use Excel data
  const getFilmasinForCap = (cap) => {
    const result = getFilmasinForCapFromMapping(cap);
    const filmasinMm = result.filmasin;
    return (filmasinMm * 100).toString().padStart(4, '0'); // Convert to XXXX format (e.g., 9.0 -> "0900")
  };

  // Çap değerine göre kalite seç - Updated to use Excel data
  const getQualityForCap = (cap) => {
    const result = getFilmasinForCapFromMapping(cap);
    return result.quality;
  };

  // ==================== MATRIX-BASED ALTERNATIVE SYSTEM ====================

  // Hardcoded matrix data from Guncellenmis_Matris_Tel_1.csv
  // Priority: 0=Ana, 1=ALT_1, 2=ALT_2
  const FILMASIN_MATRIX = {
    // Each key is target diameter, value is array of {diameter, quality, priority}
    // NOTE: 1.20-1.40mm removed - these are COILER range, handled by COILER_ALTERNATIVE_MATRIX
    1.50: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 5.5, quality: '1006', priority: 1 },
      { diameter: 6.0, quality: '1008', priority: 2 }
    ],
    1.60: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 5.5, quality: '1006', priority: 1 },
      { diameter: 6.0, quality: '1008', priority: 2 }
    ],
    1.70: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    1.80: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    // Special diameter for ZIRH TELİ (Armored wire) - YM.GT.NIT.0193.00
    // ONLY 5.5mm 1005 filmaşin, no alternatives
    1.88: [
      { diameter: 5.5, quality: '1005', priority: 0 }
    ],
    1.90: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    2.00: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    2.10: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    2.20: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 },
      { diameter: 5.5, quality: '1006', priority: 2 }
    ],
    2.30: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 },
      { diameter: 5.5, quality: '1006', priority: 2 }
    ],
    // Special diameter for ZIRH TELİ (Armored wire) - YM.GT.NIT.0241.00
    // ONLY 5.5mm 1005 filmaşin, no alternatives
    2.37: [
      { diameter: 5.5, quality: '1005', priority: 0 }
    ],
    2.40: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    2.50: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    2.60: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    2.70: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    2.80: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    2.90: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    3.00: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    3.10: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    3.20: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    3.30: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    3.40: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    3.50: [
      { diameter: 6.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1008', priority: 1 },
      { diameter: 7.0, quality: '1010', priority: 2 }
    ],
    3.60: [
      { diameter: 6.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1008', priority: 1 },
      { diameter: 7.0, quality: '1010', priority: 2 }
    ],
    3.70: [
      { diameter: 6.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1008', priority: 1 },
      { diameter: 7.0, quality: '1010', priority: 2 }
    ],
    3.80: [
      { diameter: 6.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1008', priority: 1 },
      { diameter: 7.0, quality: '1010', priority: 2 }
    ],
    3.90: [
      { diameter: 6.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1008', priority: 1 },
      { diameter: 7.0, quality: '1010', priority: 2 }
    ],
    4.00: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    4.10: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    4.20: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    4.30: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    4.40: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    4.50: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    4.60: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    4.70: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    4.80: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    4.90: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.00: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.10: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.20: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.30: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.40: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.50: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.60: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.70: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.80: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    5.90: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    6.00: [
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
    ],
    6.10: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    6.20: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    6.30: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    6.40: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    6.50: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    6.60: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    6.70: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    6.80: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    6.90: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    7.00: [
      { diameter: 9.0, quality: '1010', priority: 0 },
      { diameter: 9.0, quality: '1008', priority: 1 }
    ],
    7.10: [
      { diameter: 9.0, quality: '1010', priority: 0 },
      { diameter: 9.0, quality: '1008', priority: 1 }
    ],
    7.20: [
      { diameter: 9.0, quality: '1010', priority: 0 },
      { diameter: 9.0, quality: '1008', priority: 1 }
    ],
    7.30: [
      { diameter: 9.0, quality: '1010', priority: 0 },
      { diameter: 9.0, quality: '1008', priority: 1 }
    ],
    7.40: [
      { diameter: 9.0, quality: '1010', priority: 0 },
      { diameter: 9.0, quality: '1008', priority: 1 }
    ],
    7.50: [
      { diameter: 9.0, quality: '1010', priority: 0 },
      { diameter: 9.0, quality: '1008', priority: 1 }
    ],
    8.00: [
      { diameter: 10.0, quality: '1010', priority: 0 }
    ],
    8.10: [
      { diameter: 10.0, quality: '1010', priority: 0 }
    ]
  };

  /**
   * Round diameter to nearest 0.10mm for matrix column lookup
   * Example: 3.39 → 3.40, 1.53 → 1.50
   */
  const roundToMatrixColumn = (diameter) => {
    // Preserve special ZIRH TELİ (Armored wire) diameters - must be exact matches
    // These special products: YM.GT.NIT.0193.00 (1.88mm) and YM.GT.NIT.0241.00 (2.37mm)
    if (diameter === 1.88 || diameter === 2.37) {
      return diameter;
    }
    return Math.round(diameter * 10) / 10;
  };

  /**
   * Get filmaşin alternatives for a target diameter based on matrix priorities
   * Returns array sorted by priority: [{diameter, quality, priority}, ...]
   * priority: 0=Ana, 1=ALT_1, 2=ALT_2
   */
  const getMatrixAlternatives = (targetDiameter) => {
    try {
      // Round target diameter to nearest matrix column
      const columnDiameter = roundToMatrixColumn(targetDiameter);

      // Get alternatives for this diameter
      const alternatives = FILMASIN_MATRIX[columnDiameter];

      if (!alternatives || alternatives.length === 0) {
        console.warn(`No matrix alternatives found for ${columnDiameter}mm, using FILMASIN_MAPPING fallback`);
        return null;
      }

      // Return sorted by priority (already sorted in the constant)
      return alternatives;
    } catch (error) {
      console.warn('Error reading matrix data:', error);
      return null;
    }
  };

  // Handle YMST exists modal actions
  const handleUseExistingYmSts = async () => {
    try {
      // Use existing YM STs with their saved values
      const selectedExisting = existingYmStsForModal.map(ym => ({
        ...ym,
        source: 'database'
      }));
      
      // Clear auto-generated since we're using existing
      setAutoGeneratedYmSts([]);
      
      // Store the previous length to calculate correct indices later
      const prevSelectedLength = selectedYmSts.length;
      const currentAllRecipes = allRecipes;
      const currentRecipeStatus = recipeStatus;
      
      // Add to selected YM STs
      setSelectedYmSts(prev => {
        const newSelection = [...prev, ...selectedExisting];
        
        // Set main YM ST index if this is the first selection
        if (prev.length === 0 && selectedExisting.length > 0) {
          setMainYmStIndex(0);
        }
        
        return newSelection;
      });
      
      // Close modal immediately
      setShowYmStExistsModal(false);
      setExistingYmStsForModal([]);
      
      // Wait for state to update then load recipe data properly
      setTimeout(async () => {
        // Now the selectedYmSts state has been updated, so we can load recipes correctly
        // Create a modified version of loadExistingRecipeData logic that uses correct indices
        const updatedAllRecipes = { ...currentAllRecipes };
        const updatedRecipeStatus = { ...currentRecipeStatus };
        
        for (let i = 0; i < selectedExisting.length; i++) {
          const ymSt = selectedExisting[i];
          const correctIndex = prevSelectedLength + i; // Calculate the correct index
          
          if (ymSt.id) {
            try {
              // Fetch existing recipes for this YM ST
              console.log(`📖 Fetching all YM ST recipes and filtering for ym_st_id=${ymSt.id}...`);
              const allYmStRecipesResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?limit=2000`);
              let recipeResponse = null;
              
              if (allYmStRecipesResponse && allYmStRecipesResponse.ok) {
                const allYmStRecipes = await allYmStRecipesResponse.json();
                const filteredYmStRecipes = allYmStRecipes.filter(r => r.ym_st_id == ymSt.id); // Use == for type coercion
                console.log(`📖 Found ${filteredYmStRecipes.length} YM ST recipes for ym_st_id=${ymSt.id}`);
                
                // Create mock response
                recipeResponse = {
                  ok: true,
                  json: async () => filteredYmStRecipes
                };
              }
              
              if (recipeResponse && recipeResponse.ok) {
                const recipes = await recipeResponse.json();
                
                if (recipes && recipes.length > 0) {
                  // Initialize recipe object for this YM ST at the correct index
                  if (!updatedAllRecipes.ymStRecipes[correctIndex]) {
                    updatedAllRecipes.ymStRecipes[correctIndex] = {};
                  }
                  if (!updatedRecipeStatus.ymStRecipes[correctIndex]) {
                    updatedRecipeStatus.ymStRecipes[correctIndex] = {};
                  }
                  
                  recipes.forEach(recipe => {
                    if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                      // Store the recipe value
                      updatedAllRecipes.ymStRecipes[correctIndex][recipe.bilesen_kodu] = parseFloat(recipe.miktar);
                      updatedRecipeStatus.ymStRecipes[correctIndex][recipe.bilesen_kodu] = 'database';
                    }
                  });
                  
                  console.log(`Loaded existing recipe data for YM ST ${ymSt.stok_kodu} at correct index ${correctIndex}:`, recipes.length, 'recipes');
                }
              }
            } catch (error) {
              console.error(`Error loading recipe for YM ST ${ymSt.stok_kodu}:`, error);
            }
          }
        }
        
        // Now check if these YM STs have relationships with MM TT and YM TT
        // and load their recipes as well
        for (let i = 0; i < selectedExisting.length; i++) {
          const ymSt = selectedExisting[i];
          if (ymSt.id) {
            try {
              // Find relationships for this YM ST
              const relationResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmYmSt}?ym_st_id=${ymSt.id}`);
              if (relationResponse && relationResponse.ok) {
                const relations = await relationResponse.json();
                
                if (relations && relations.length > 0) {
                  // Found relationships - load MM TT and YM TT recipes
                  for (const relation of relations) {
                    const ymStIndex = prevSelectedLength + i;
                    
                    // Load MM TT recipes if relation has mm_gt_id
                    if (relation.mm_gt_id) {
                      const mmRecipeResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}?mm_gt_id=${relation.mm_gt_id}`);
                      if (mmRecipeResponse && mmRecipeResponse.ok) {
                        const mmRecipes = await mmRecipeResponse.json();
                        
                        if (!updatedAllRecipes.mmRecipes[ymStIndex]) {
                          updatedAllRecipes.mmRecipes[ymStIndex] = {};
                        }
                        if (!updatedRecipeStatus.mmRecipes[ymStIndex]) {
                          updatedRecipeStatus.mmRecipes[ymStIndex] = {};
                        }
                        
                        mmRecipes.forEach(recipe => {
                          if (recipe.bilesen_kodu && recipe.miktar !== null) {
                            updatedAllRecipes.mmRecipes[ymStIndex][recipe.bilesen_kodu] = parseFloat(recipe.miktar);
                            updatedRecipeStatus.mmRecipes[ymStIndex][recipe.bilesen_kodu] = 'database';
                          }
                        });
                        
                      }
                    }
                    
                    // Load YM TT recipes if relation has ym_gt_id
                    if (relation.ym_gt_id) {
                      const allYmGtRecipesResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmTtRecete}?limit=2000`);
                      let ymGtRecipeResponse = null;
                      
                      if (allYmGtRecipesResponse && allYmGtRecipesResponse.ok) {
                        const allYmGtRecipes = await allYmGtRecipesResponse.json();
                        const filteredYmGtRecipes = allYmGtRecipes.filter(r => r.ym_gt_id == relation.ym_gt_id); // Use == for type coercion
                        
                        // Create mock response
                        ymGtRecipeResponse = {
                          ok: true,
                          json: async () => filteredYmGtRecipes
                        };
                      }
                      
                      if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
                        const ymGtRecipes = await ymGtRecipeResponse.json();
                        
                        if (!updatedAllRecipes.ymGtRecipe) {
                          updatedAllRecipes.ymGtRecipe = {};
                        }
                        if (!updatedRecipeStatus.ymGtRecipe) {
                          updatedRecipeStatus.ymGtRecipe = {};
                        }
                        
                        ymGtRecipes.forEach(recipe => {
                          if (recipe.bilesen_kodu && recipe.miktar !== null) {
                            updatedAllRecipes.ymGtRecipe[recipe.bilesen_kodu] = parseFloat(recipe.miktar);
                            updatedRecipeStatus.ymGtRecipe[recipe.bilesen_kodu] = 'database';
                          }
                        });
                        
                      }
                    }
                    
                    // Only process the first relationship (main relationship)
                    break;
                  }
                }
              }
            } catch (error) {
              console.error(`Error loading relationships for YM ST ${ymSt.stok_kodu}:`, error);
            }
          }
        }
        
        // Update the state with loaded recipes
        setAllRecipes(updatedAllRecipes);
        setRecipeStatus(updatedRecipeStatus);
        
        // Switch to the first newly added YM ST tab
        if (selectedExisting.length > 0) {
          setActiveRecipeTab(prevSelectedLength);
        }
        
        // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
        // setTimeout(() => {
        //   calculateAutoRecipeValues();
        // }, 100);

        toast.success(`${selectedExisting.length} mevcut YM ST seçildi ve tüm reçete verileri yüklendi`);
      }, 100);
      
    } catch (error) {
      console.error('Error using existing YM STs:', error);
      toast.error('Mevcut YM ST\'ler seçilirken hata oluştu');
    }
  };
  
  const handleGoToYmStSelection = () => {
    setShowYmStExistsModal(false);
    setExistingYmStsForModal([]);
    setShowYmStSelectionModal(true);
  };
  
  // Load existing recipe data for selected YM STs
  const loadExistingRecipeData = async (ymSts) => {
    try {
      setIsLoadingRecipes(true); // Start loading
      const updatedAllRecipes = { ...allRecipes };
      const updatedRecipeStatus = { ...recipeStatus };
      
      // Get the current total YM STs to find the correct indices
      const currentTotalYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      
      for (let i = 0; i < ymSts.length; i++) {
        const ymSt = ymSts[i];
        
        // Find the index of this YM ST in the combined array
        const ymStIndex = currentTotalYmSts.findIndex(st => st.stok_kodu === ymSt.stok_kodu);
        
        if (ymSt.id && ymStIndex !== -1) {
          // Fetch existing recipes for this YM ST
          console.log(`📖 Fetching all YM ST recipes and filtering for ym_st_id=${ymSt.id}...`);
          const allYmStRecipesResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?limit=2000`);
          let recipeResponse = null;
          
          if (allYmStRecipesResponse && allYmStRecipesResponse.ok) {
            const allYmStRecipes = await allYmStRecipesResponse.json();
            const filteredYmStRecipes = allYmStRecipes.filter(r => r.ym_st_id == ymSt.id); // Use == for type coercion
            console.log(`📖 Found ${filteredYmStRecipes.length} YM ST recipes for ym_st_id=${ymSt.id}`);
            
            // Create mock response
            recipeResponse = {
              ok: true,
              json: async () => filteredYmStRecipes
            };
          }
          
          if (recipeResponse && recipeResponse.ok) {
            const recipes = await recipeResponse.json();
            
            if (recipes && recipes.length > 0) {
              // Initialize recipe object for this YM ST at the correct index
              if (!updatedAllRecipes.ymStRecipes[ymStIndex]) {
                updatedAllRecipes.ymStRecipes[ymStIndex] = {};
              }
              if (!updatedRecipeStatus.ymStRecipes[ymStIndex]) {
                updatedRecipeStatus.ymStRecipes[ymStIndex] = {};
              }
              
              recipes.forEach(recipe => {
                if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                  // Store the recipe value
                  updatedAllRecipes.ymStRecipes[ymStIndex][recipe.bilesen_kodu] = parseFloat(recipe.miktar);
                  updatedRecipeStatus.ymStRecipes[ymStIndex][recipe.bilesen_kodu] = 'database';
                }
              });
              
              console.log(`Loaded existing recipe data for YM ST ${ymSt.stok_kodu} at index ${ymStIndex}:`, recipes.length, 'recipes');
            }
          }
        }
      }
      
      // Update the state with loaded recipes
      setAllRecipes(updatedAllRecipes);
      setRecipeStatus(updatedRecipeStatus);
      
      // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
      // setTimeout(() => {
      //   calculateAutoRecipeValues();
      // }, 100);

    } catch (error) {
      console.error('Error loading existing recipe data:', error);
      toast.error('Reçete verileri yüklenirken hata oluştu');
    } finally {
      setIsLoadingRecipes(false); // Stop loading
    }
  };

  // Formül doğrulama fonksiyonu - Giriş değerlerini kontrol et
  const validateCalculationInputs = () => {
    const errors = [];
    if (!userInputValues.ash || userInputValues.ash <= 0) errors.push('Kül (Ash) değeri geçersiz');
    if (!userInputValues.lapa || userInputValues.lapa <= 0) errors.push('Lapa değeri geçersiz');
    if (!userInputValues.paketlemeDkAdet || userInputValues.paketlemeDkAdet <= 0) errors.push('Paketleme Dk. Adet değeri geçersiz');
    if (!mmData.kg || parseFloat(mmData.kg) <= 0) errors.push('Ağırlık değeri geçersiz');
    if (!mmData.cap || parseFloat(mmData.cap) <= 0) errors.push('Çap değeri geçersiz');
    return errors;
  };

  // Güvenli hesaplama fonksiyonu - Hata durumunda boş değer döndür
  const safeCalculate = (formula, fallbackValue, inputs, formulaName) => {
    try {
      const result = formula(inputs);
      if (isNaN(result) || !isFinite(result)) {
        console.warn(`${formulaName} formülü geçersiz sonuç verdi, boş bırakılıyor`);
        return '';
      }
      return result;
    } catch (error) {
      console.error(`${formulaName} formül hatası: ${error.message}, boş bırakılıyor`);
      return '';
    }
  };

  // Formül hesaplama debug fonksiyonu
  const debugFormula = (name, inputs, result, steps = []) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`${name} Hesaplaması`);
      console.groupEnd();
    }
  };

  // ======================= REMOVED: COILER & YM ST RECETE FUNCTIONS =======================
  // These functions are specific to Galvanizli Tel (Filmaşin-based recipes) and not needed for Tavli/Balya
  // Tavli/Balya uses YM.ST directly with TAV01 (annealing) operation
  // Removed 370+ lines of Coiler/YM ST Recete specific code
  // ========================================================================================

  // Otomatik reçete değerlerini hesapla - Tavli/Balya Tel için
  const calculateAutoRecipeValues = () => {
    // When viewing existing product, we still need to calculate values for newly added YM STs
    // Remove the early return to allow calculations for new items

    // Giriş değerlerini doğrula
    const validationErrors = validateCalculationInputs();
    if (validationErrors.length > 0) {
      console.error('Hesaplama giriş değerleri hatası:', validationErrors);
      toast.error(`Hesaplama hatası: ${validationErrors[0]}`);
      return;
    }

    const cap = parseFloat(mmData.cap) || 0;
    const kg = parseFloat(mmData.kg) || 0;

    // Create copies of arrays to avoid direct state mutation
    const updatedSelectedYmSts = [...selectedYmSts];
    const updatedAutoGeneratedYmSts = [...autoGeneratedYmSts];
    const allYmSts = [...updatedSelectedYmSts, ...updatedAutoGeneratedYmSts];

    // Tüm YM ST'ler için reçeteler hesapla
    const newMmGtRecipes = {};

    // Reçete durumlarını güncelle
    const newRecipeStatus = {
      mmRecipes: {},
      ymStRecipes: {}  // ✅ FIXED: Initialize ymStRecipes to prevent "Cannot set properties of undefined" error
    };

    // Otomatik Doldur: Shrink tipi ve miktarını otomatik belirle (İç Çap'a göre)
    const shrinkCode = getShrinkCode(mmData.ic_cap);
    const shrinkAmount = calculateShrinkAmount(kg);

    // Her YM ST için MM TT reçete hesapla
    allYmSts.forEach((ymSt, index) => {
      // Determine source stok_kodu based on product type and cap
      let sourceStokKodu;

      // ✅ FIXED: YM TT uses MM cap (NOT YM ST cap) and is SHARED (no BAG/BALYA prefix)
      const mmCapValue = parseFloat(mmData.cap) || 0;
      const capFormatted = Math.round(mmCapValue * 100).toString().padStart(4, '0');
      const sequence = index.toString().padStart(2, '0');
      sourceStokKodu = `YM.TT.${capFormatted}.${sequence}`;

      // ==========================================
      // MM TT/MM BL Packaging Recipe Components
      // Using Galvanizli codes where applicable
      // ==========================================

      // Shrink - from Galvanizli (exact copy)
      const shrinkCode = getShrinkCode(mmData.ic_cap);
      const shrinkAmount = calculateShrinkAmount(kg);

      // ✅ FIXED: Çember Tokası - "paketleme 4 + presleme 4" per 2.csv
      // "1.2 tonda" specification → proportional to weight (Interpretation 2)
      const tokaValue = parseFloat((4 / 1200).toFixed(5));

      // ✅ FIXED: Kaldırma Kancası - "4 adet paketleme + 2 adet presleme" per 2.csv
      // "1.2 tonda" specification → proportional to weight (Interpretation 2)
      const halkaValue = parseFloat((4 / 1200).toFixed(5));

      // ✅ FIXED: Çelik Çember - "Galvaniz componentinden al + presleme varsa x2"
      // Use Galvaniz formula as specified in 2.csv
      const celikCemberValue = parseFloat(((1.2 * (1000 / kg)) / 1000).toFixed(5));

      // ✅ FIXED: Karton - CONDITIONAL (ONLY for oiled products per 2.csv)
      // "Yağlı ürünlerde ekle 1.2 tonda 7 adet" → proportional to weight (Interpretation 2)
      // Formula: 7 / 1200 = constant per-kg coefficient
      let kartonValue = 0;
      if (mmData.yaglama_tipi && mmData.yaglama_tipi !== '') {
        // Oiled product - REQUIRED
        kartonValue = parseFloat((7 / 1200).toFixed(5));
      }
      // Note: Annealed products (yaglama_tipi empty) do NOT get Karton

      // ✅ FIXED: Plastik Çember - CONDITIONAL (ONLY for oiled products per 2.csv)
      // "Yağlı ürünlerde ekle 1.2 tonda 10 m" → proportional to weight (Interpretation 2)
      // Formula: 10 / 1200 = constant per-kg coefficient
      let plastikCemberValue = 0;
      if (mmData.yaglama_tipi && mmData.yaglama_tipi !== '') {
        plastikCemberValue = parseFloat((10 / 1200).toFixed(5));
      }
      // Note: Annealed products do NOT get Plastik Çember

      // ❌ REMOVED: Streç - NOT in gene2l.csv constraints
      // Was: const strecValue = parseFloat(((0.5 * (1000 / kg)) / 1000).toFixed(5));

      // ✅ FIXED: Palet - "1.2 tonda 1 palet" per 2.csv
      // "1.2 tonda" specification → proportional to weight (Interpretation 2)
      // Formula: 1 / 1200 = constant per-kg coefficient
      const paletValue = parseFloat((1 / 1200).toFixed(5));

      // ✅ UPDATED: Packaging operation duration - USE NEW getOperationDuration()
      // TVPKT01 for TAVLI (with shrink check), BAL01 for BALYA
      const packagingOperation = mmData.product_type === 'TAVLI' ? 'TVPKT01' : 'BAL01';
      const hasShrink = mmData.shrink === 'evet';
      const packagingDuration = mmData.product_type === 'TAVLI'
        ? getOperationDuration('TVPKT01', kg, hasShrink, cap)  // ✅ FIX: Pass diameter for 1.2mm check
        : getOperationDuration('BAL01', kg);

      // ✅ REMOVED: SM.DESİ.PAK (Silkajel) - NOT in tavlı/balya CSV specification
      // This is galvanizli-specific only per "Caner Beyle Toplanti 22.10 -TT v3.csv"

      // ==========================================
      // Build MM Recipe - DIFFERENTIATE MM TT (TAVLI) vs MM BL (BALYA)
      // Per user table: MM TT has MORE components than MM BL
      // ==========================================

      console.log(`\n🔨 === BUILDING MM RECIPE for index ${index} ===`);
      console.log(`📦 Product Type: ${mmData.product_type}`);
      console.log(`🛢️ Yaglama Tipi: ${mmData.yaglama_tipi}`);
      console.log(`📏 Weight (kg): ${kg}`);

      // Base components (shared by both MM TT and MM BL)
      // ✅ FIXED: Base components - always source + operation
      newMmGtRecipes[index] = {
        [sourceStokKodu]: 1, // Source: YM.TT (shared by both TAVLI and BALYA)
        [packagingOperation]: parseFloat(packagingDuration.toFixed(5))
      };

      console.log(`✅ Base components added (all products):`);
      console.log(`   - ${sourceStokKodu}: 1`);
      console.log(`   - ${packagingOperation}: ${parseFloat(packagingDuration.toFixed(5))}`);

      // ✅ FIXED: Conditional Shrink (based on paketlemeSecenekleri)
      if (paketlemeSecenekleri.shrink) {
        newMmGtRecipes[index][shrinkCode] = parseFloat(shrinkAmount.toFixed(5));
        console.log(`   - ${shrinkCode}: ${parseFloat(shrinkAmount.toFixed(5))} (SELECTED)`);
      } else {
        console.log(`   - NO Shrink (not selected)`);
      }

      // ✅ FIXED: Conditional Palet (based on paketlemeSecenekleri)
      if (paketlemeSecenekleri.paletli) {
        newMmGtRecipes[index]['AMB.PALET'] = parseFloat(paletValue.toFixed(5));
        console.log(`   - AMB.PALET: ${parseFloat(paletValue.toFixed(5))} (SELECTED)`);
      } else {
        console.log(`   - NO Palet (not selected)`);
      }

      // ✅ MM TT (TAVLI) ONLY components - per user table
      if (mmData.product_type === 'TAVLI') {
        console.log(`\n🎯 Adding TAVLI-ONLY components:`);

        // ✅ FIX: Check if product needed pressing (based on YM ST cap >= 1.8mm)
        const ymStCapValue = parseFloat(ymSt.cap) || 0;
        const productNeedsPressing = ymStCapValue >= 1.8;
        console.log(`   🔨 YM ST cap: ${ymStCapValue}mm, Pressing needed: ${productNeedsPressing}`);

        // Halka (Kaldırma Kancası) - 4 base + 2 if pressing needed
        const halkaTotalValue = productNeedsPressing ? parseFloat((6 / 1200).toFixed(5)) : halkaValue;
        newMmGtRecipes[index]['SM.7MMHALKA'] = parseFloat(halkaTotalValue.toFixed(5));
        console.log(`   ✅ SM.7MMHALKA (Kaldırma Kancası): ${parseFloat(halkaTotalValue.toFixed(5))} ${productNeedsPressing ? '(6 pieces - with pressing)' : '(4 pieces - no pressing)'}`);

        // Çember Tokası - 4 base + 4 if pressing needed
        const tokaTotalValue = productNeedsPressing ? parseFloat((8 / 1200).toFixed(5)) : tokaValue;
        newMmGtRecipes[index]['AMB.TOKA.SIGNODE.114P. DKP'] = parseFloat(tokaTotalValue.toFixed(5));
        console.log(`   ✅ AMB.TOKA.SIGNODE.114P. DKP (Çember Tokası): ${parseFloat(tokaTotalValue.toFixed(5))} ${productNeedsPressing ? '(8 pieces - with pressing)' : '(4 pieces - no pressing)'}`);

        // Çelik Çember - from Galvaniz, x2 if pressing needed
        const celikCemberTotalValue = productNeedsPressing ? parseFloat(((2.4 * (1000 / kg)) / 1000).toFixed(5)) : celikCemberValue;
        newMmGtRecipes[index]['AMB.APEX CEMBER 38X080'] = parseFloat(celikCemberTotalValue.toFixed(5));
        console.log(`   ✅ AMB.APEX CEMBER 38X080 (Çelik Çember): ${parseFloat(celikCemberTotalValue.toFixed(5))} ${productNeedsPressing ? '(x2 - with pressing)' : '(x1 - no pressing)'}`);
      } else {
        console.log(`\n❌ BALYA product - EXCLUDING TAVLI-ONLY components (Halka, Toka, Çelik Çember)`);
      }

      // ✅ CRITICAL FIX: Karton AND Plastik Çember - BOTH for oiled products only (per 2.csv)
      // "Yağlı ürünlerde ekle" - Both MUST be added together, NOT controlled by checkbox
      if (kartonValue > 0) {
        newMmGtRecipes[index]['AMB.ÇEM.KARTON.GAL'] = parseFloat(kartonValue.toFixed(5));
        console.log(`\n✅ Karton (OILED ONLY): ${parseFloat(kartonValue.toFixed(5))}`);
      } else {
        console.log(`\n❌ No Karton (yaglama_tipi not set or Yağsız)`);
      }

      if (plastikCemberValue > 0) {
        newMmGtRecipes[index]['AMB.PLASTİK.ÇEMBER'] = parseFloat(plastikCemberValue.toFixed(5));
        console.log(`✅ Plastik Çember (OILED ONLY): ${parseFloat(plastikCemberValue.toFixed(5))}`);
      } else {
        console.log(`❌ No Plastik Çember (yaglama_tipi not set or Yağsız)`);
      }

      console.log(`\n🔍 FINAL MM RECIPE KEYS for index ${index}:`, Object.keys(newMmGtRecipes[index]));
      console.log(`📊 Total components: ${Object.keys(newMmGtRecipes[index]).length}`);

      // ❌ REMOVED DUPLICATES: 'AMB.ÇEMBER.TOKASI', 'AMB.KALDIRMA.KANCASI' (use Galvanizli codes)
      // ❌ REMOVED: 'AMB.STREÇ' - not in gene2l.csv
      // ✅ REMOVED: 'SM.DESİ.PAK' - not in tavlı/balya specification

      const productLabel = mmData.product_type === 'TAVLI' ? 'MM TT (TAVLI)' : 'MM BL (BALYA)';
      console.log(`🔧 ${productLabel} RECIPE GENERATED for index ${index}:`);
      console.log(`   Source: ${sourceStokKodu} = 1`);
      console.log(`   Operation: ${packagingOperation} = ${parseFloat(packagingDuration.toFixed(5))} dk`);
      console.log(`   Shrink: ${shrinkCode} = ${parseFloat(shrinkAmount.toFixed(5))}`);
      console.log(`   Palet: AMB.PALET = ${parseFloat(paletValue.toFixed(5))}`);

      if (mmData.product_type === 'TAVLI') {
        console.log(`   ✅ Kaldırma Kancası: SM.7MMHALKA = ${parseFloat(halkaValue.toFixed(5))} (TAVLI ONLY)`);
        console.log(`   ✅ Çember Tokası: AMB.TOKA.SIGNODE.114P. DKP = ${parseFloat(tokaValue.toFixed(5))} (TAVLI ONLY)`);
        console.log(`   ✅ Çelik Çember: AMB.APEX CEMBER 38X080 = ${parseFloat(celikCemberValue.toFixed(5))} (TAVLI ONLY)`);
      } else {
        console.log(`   ❌ NO Kaldırma Kancası (BALYA excludes this)`);
        console.log(`   ❌ NO Çember Tokası (BALYA excludes this)`);
        console.log(`   ❌ NO Çelik Çember (BALYA excludes this)`);
      }

      if (kartonValue > 0) {
        console.log(`   Karton: AMB.ÇEM.KARTON.GAL = ${parseFloat(kartonValue.toFixed(5))} (OILED ONLY)`);
      }
      if (plastikCemberValue > 0) {
        console.log(`   Plastik Çember: AMB.PLASTİK.ÇEMBER = ${parseFloat(plastikCemberValue.toFixed(5))} m (OILED ONLY)`);
      }

      console.log(`   📊 Total ${productLabel} components: ${Object.keys(newMmGtRecipes[index]).length}`);

      // Reçete durumlarını 'auto' olarak işaretle
      newRecipeStatus.mmRecipes[index] = {};
      Object.keys(newMmGtRecipes[index]).forEach(key => {
        newRecipeStatus.mmRecipes[index][key] = 'auto';
      });
    });

    // ==========================================
    // YM ST RECIPE CALCULATION (Re-added for Tavli/Balya)
    // ==========================================
    console.log('\n🔨 === CALCULATING YM ST RECIPES ===');
    const newYmStRecipes = {};

    allYmSts.forEach((ymSt, index) => {
      const ymStCap = parseFloat(ymSt.cap) || 0;
      console.log(`\n📝 YM ST ${index}: ${ymSt.stok_kodu} (${ymStCap}mm)`);

      // Determine if this is a Coiler product (< 1.5mm uses coiler, >= 1.5mm uses FLM)
      if (ymStCap < 1.5) {
        // Coiler product - uses thicker YM.ST as source with COTLC01 operation
        // Find source: should be a thicker YM.ST from the list
        // For now, skip Coiler calculation (handled separately)
        console.log(`   ⚠️ Coiler product (< 1.5mm) - skipping FLM/TLC01 calculation`);
        newYmStRecipes[index] = {};
        newRecipeStatus.ymStRecipes[index] = {};
      } else {
        // Standard product - uses FLM (wire rod) with TLC01 operation
        // Generate FLM code: FLM.XXXX.YYYY format
        // The FLM code depends on the YM ST's HM code
        let flmCode = '';

        // Try to extract HM code from stok_kodu first (format: YM.ST.XXXX.YYYY.ZZZZ → FLM.YYYY.ZZZZ)
        const stokKoduMatch = ymSt.stok_kodu?.match(/YM\.ST\.\d{4}\.(\d{4}\.\d{4})/);
        if (stokKoduMatch) {
          flmCode = `FLM.${stokKoduMatch[1]}`;
          console.log(`   ✅ Extracted HM from stok_kodu: ${stokKoduMatch[1]}`);
        }
        // Fallback: Check if ymSt has hm_kodu field
        else if (ymSt.hm_kodu) {
          // HM format: e.g., "0600.1006" or "HM:0600.1006"
          const hmMatch = ymSt.hm_kodu.match(/(\d{4})\.(\d{4})/);
          if (hmMatch) {
            flmCode = `FLM.${hmMatch[1]}.${hmMatch[2]}`;
          } else {
            console.warn(`   ⚠️ Invalid HM code format: ${ymSt.hm_kodu}`);
            flmCode = 'FLM.0550.1005'; // Default fallback
          }
        } else {
          console.warn(`   ⚠️ No HM code found for YM ST, using default FLM`);
          flmCode = 'FLM.0550.1005'; // Default fallback
        }

        console.log(`   ✅ FLM Code: ${flmCode}`);

        // Material: 1:1 ratio (1 kg FLM → 1 kg YM.ST)
        const flmQuantity = 1.0;

        // Operation: TLC01 (drawing operation)
        // Duration formula: based on diameter and weight
        // For now, use a simple formula: duration proportional to cap and weight
        const tlc01Duration = parseFloat((ymStCap * kg / 10).toFixed(5)); // Simple formula

        newYmStRecipes[index] = {
          [flmCode]: flmQuantity,
          'TLC01': tlc01Duration
        };

        console.log(`   ✅ Recipe: ${flmCode} = ${flmQuantity} KG`);
        console.log(`   ✅ Operation: TLC01 = ${tlc01Duration} DK`);

        // Mark as auto-calculated
        newRecipeStatus.ymStRecipes[index] = {
          [flmCode]: 'auto',
          'TLC01': 'auto'
        };
      }
    });

    console.log(`\n✅ YM ST recipes calculated for ${Object.keys(newYmStRecipes).length} products`);

    // Update allRecipes state - update BOTH MM and YM ST recipes
    setAllRecipes(prev => {
      const mergedMmGtRecipes = { ...prev.mmRecipes };
      const mergedYmStRecipes = { ...prev.ymStRecipes };

      // Merge MM TT recipes - preserve database values
      Object.keys(newMmGtRecipes).forEach(index => {
        if (!mergedMmGtRecipes[index]) {
          mergedMmGtRecipes[index] = {};
        }
        Object.keys(newMmGtRecipes[index]).forEach(key => {
          // Only update if not from database
          if (!recipeStatus.mmRecipes[index]?.[key] || recipeStatus.mmRecipes[index][key] !== 'database') {
            mergedMmGtRecipes[index][key] = newMmGtRecipes[index][key];
          }
        });
      });

      // Merge YM ST recipes - preserve database values
      Object.keys(newYmStRecipes).forEach(index => {
        if (!mergedYmStRecipes[index]) {
          mergedYmStRecipes[index] = {};
        }
        Object.keys(newYmStRecipes[index]).forEach(key => {
          // Only update if not from database
          if (!recipeStatus.ymStRecipes[index]?.[key] || recipeStatus.ymStRecipes[index][key] !== 'database') {
            mergedYmStRecipes[index][key] = newYmStRecipes[index][key];
          }
        });
      });

      return {
        ...prev,
        mmRecipes: mergedMmGtRecipes,
        ymStRecipes: mergedYmStRecipes
      };
    });

    // Update recipe status state
    setRecipeStatus(prev => {
      const mergedStatus = { ...prev };

      // Update MM TT recipe status
      Object.keys(newRecipeStatus.mmRecipes).forEach(index => {
        if (!mergedStatus.mmRecipes[index]) {
          mergedStatus.mmRecipes[index] = {};
        }
        Object.keys(newRecipeStatus.mmRecipes[index]).forEach(key => {
          // Only update if not from database
          if (!prev.mmRecipes[index]?.[key] || prev.mmRecipes[index][key] !== 'database') {
            mergedStatus.mmRecipes[index][key] = newRecipeStatus.mmRecipes[index][key];
          }
        });
      });

      // Update YM ST recipe status
      Object.keys(newRecipeStatus.ymStRecipes || {}).forEach(index => {
        if (!mergedStatus.ymStRecipes[index]) {
          mergedStatus.ymStRecipes[index] = {};
        }
        Object.keys(newRecipeStatus.ymStRecipes[index]).forEach(key => {
          // Only update if not from database
          if (!prev.ymStRecipes[index]?.[key] || prev.ymStRecipes[index][key] !== 'database') {
            mergedStatus.ymStRecipes[index][key] = newRecipeStatus.ymStRecipes[index][key];
          }
        });
      });

      return mergedStatus;
    });

    // Başarılı hesaplama mesajı
    const mmCount = Object.keys(newMmGtRecipes).length;
    const ymStCount = Object.keys(newYmStRecipes).length;
    if (mmCount > 0 || ymStCount > 0) {
      toast.success(`${mmCount} MM reçete ve ${ymStCount} YM ST reçete başarıyla hesaplandı!`);
    } else {
      console.warn('Hiçbir reçete hesaplanamadı - giriş değerlerini kontrol edin');
      toast.warning('Reçete hesaplaması yapılamadı. Lütfen giriş değerlerini kontrol edin.');
    }
  };

  // Fill empty fields with auto-fill indicators for all recipe types
  const fillEmptyFieldsWithAutoFill = () => {
    
    // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
    // calculateAutoRecipeValues(); // Calculate proper recipe values based on formulas

    // Mark all filled fields as 'auto' in recipe status
    setRecipeStatus(prev => {
      const updated = { ...prev };
      
      // Mark MM TT recipe fields as auto
      [...selectedYmSts, ...autoGeneratedYmSts].forEach((ymSt, index) => {
        if (!updated.mmRecipes[index]) {
          updated.mmRecipes[index] = {};
        }

        // Tavlı/Balya specific packaging components (no NAYLON, GTPKT01, SM.DESİ.PAK per CSV)
        const packagingOperation = mmData.product_type === 'TAVLI' ? 'TVPKT01' : 'BAL01';
        const mmFields = ['AMB.PLASTİK.ÇEMBER', 'AMB.TOKA.SIGNODE.114P. DKP',
                           'SM.7MMHALKA', 'AMB.ÇEM.KARTON.GAL', packagingOperation,
                           'AMB.APEX CEMBER 38X080', // ✅ ADDED: Çelik Çember (TAVLI only)
                           'AMB.PALET']; // ✅ FIXED: Removed AMB.STREÇ per gene2l.csv
        // ✅ REMOVED: 'SM.DESİ.PAK' - not in tavlı/balya MM products
        // ❌ REMOVED: 'AMB.STREÇ' - not in gene2l.csv constraints

        const shrinkCode = getShrinkCode(mmData.ic_cap);
        if (shrinkCode) {
          mmFields.push(shrinkCode);
        }

        mmFields.forEach(key => {
          if (!prev.mmRecipes[index]?.[key] || prev.mmRecipes[index][key] !== 'database') {
            updated.mmRecipes[index][key] = 'auto';
          }
        });
      });

      // REMOVED: YM GT recipe fields (galvanizli-specific, not applicable to Tavlı/Balya)
      
      // Mark YM ST recipe fields as auto
      [...selectedYmSts, ...autoGeneratedYmSts].forEach((ymSt, index) => {
        if (!updated.ymStRecipes[index]) {
          updated.ymStRecipes[index] = {};
        }
        
        const filmasinCode = getFilmasinKodu(ymSt);
        [filmasinCode, 'TLC01'].forEach(key => {
          if (!prev.ymStRecipes[index]?.[key] || prev.ymStRecipes[index][key] !== 'database') {
            updated.ymStRecipes[index][key] = 'auto';
          }
        });
      });
      
      return updated;
    });
    
    toast.success('Boş alanlar otomatik değerlerle dolduruldu!');
  };

  // Shrink miktarı hesapla - NOKTA değer döndür with 5 decimals - Excel ile tam uyumlu
  const calculateShrinkAmount = (kg) => {
    // Original NAYLON formula: (1*(1000/COIL WEIGHT))/1000
    // This gives kg/kg units (amount per kg of product)
    const result = (1 * (1000 / kg)) / 1000;
    return parseFloat(result.toFixed(5));
  };

  // Asit tüketimi hesaplama (Excel formülü) - NOKTA değer döndür with 5 decimals - Excel ile tam uyumlu
  const calculateAcidConsumption = (cap, kg, kaplama) => {
    const yuzeyAlani = 1000 * 4000 / Math.PI / cap / cap / 7.85 * cap * Math.PI / 1000;
    const tuketilenAsit = 0.0647625; // kg/m2 - match Excel formula exactly
    
    // Calculate with full precision, then format to 5 decimal places to match Excel
    const result = (yuzeyAlani * tuketilenAsit) / 1000;
    return parseFloat(result.toFixed(5));
  };

  // Desi tüketimi hesapla (formüle göre) - NOKTA değer döndür with 5 decimals - Excel ile tam uyumlu
  const calculateDesiConsumption = (kg, cap) => {
    // Return values with 5 decimal places for consistency with Excel
    // Önce kg kategorisine göre
    if (kg >= 500 && kg < 600) return 0.00200;
    if (kg >= 600 && kg < 650) return 0.00170;
    if (kg >= 650 && kg < 750) return 0.00150;
    if (kg >= 750 && kg <= 800) return 0.00130;
    if (kg > 800 && kg < 850) return 0.00120;
    if (kg >= 850 && kg < 900) return 0.00110;
    if (kg >= 900) return 0.00090;
    
    // Çapa göre fallback
    if (cap < 1.8) return 0.00200;
    if (cap >= 1.8 && cap <= 4.0) return 0.00130;
    return 0.00110;
  };

  // Shrink kodu belirle (tam kod ile)
  const getShrinkCode = (icCap) => {
    switch (parseInt(icCap)) {
      case 45: return 'AMB.SHRİNK.200*140CM';
      case 50: return 'AMB.SHRİNK.200*160CM';
      case 55: return 'AMB.SHRİNK.200*190CM';
      default: return 'AMB.SHRİNK.200*140CM';
    }
  };

  // ✅ FIXED: Gümrük Tarife Kodu - use 722990900011 for both TAVLI and BALYA
  const getGumrukTarifeKodu = () => {
    return '722990900011';
  };

  const getGumrukTarifeKoduForCap = (capValue) => {
    return '722990900011';
  };

  // Form değişikliklerini işle - her zaman nokta formatı kullan
  // Comma to point conversion handler for onKeyDown
  const handleCommaToPoint = (e, field) => {
    // Prevent +/- characters from being entered in tolerance fields
    if ((field === 'tolerans_plus' || field === 'tolerans_minus') && (e.key === '+' || e.key === '-')) {
      e.preventDefault();
      return;
    }
    
    // Allow decimal comma input but convert to point
    if (e.key === ',') {
      e.preventDefault();
      // Get current value and caret position
      const input = e.target;
      const currentValue = input.value;
      const caretPos = input.selectionStart;
      
      // Insert decimal point where the comma would have gone
      const newValue = currentValue.substring(0, caretPos) + '.' + currentValue.substring(input.selectionEnd);
      
      // Update input value and reset caret position
      handleInputChange(field, newValue);
      // Need to use setTimeout to let React update the DOM
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = caretPos + 1;
      }, 0);
    }
    
    // Ensure periods can be entered anywhere in the input
    if (e.key === '.') {
      // Allow periods even if the field already has one
      // Do nothing special, let the default behavior proceed
    }
  };
  
  // Comma to point conversion handler for recipe inputs
  const handleRecipeCommaToPoint = (e, recipeType, ymStIndex, key) => {
    // Allow decimal comma input but convert to point
    if (e.key === ',') {
      e.preventDefault();
      // Get current value and caret position
      const input = e.target;
      const currentValue = input.value;
      const caretPos = input.selectionStart;
      
      // Insert decimal point where the comma would have gone
      const newValue = currentValue.substring(0, caretPos) + '.' + currentValue.substring(input.selectionEnd);
      
      // Update recipe value and reset caret position
      updateRecipeValue(recipeType, ymStIndex, key, newValue);
      // Need to use setTimeout to let React update the DOM
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = caretPos + 1;
      }, 0);
    }
    
    // Ensure periods can be entered anywhere in the input
    if (e.key === '.') {
      // Check if the input already contains a period
      const input = e.target;
      const currentValue = input.value;
      
      // Allow periods even if the field already has one
      // This will let users enter periods anywhere, and validation will happen elsewhere
      // Do nothing special, let the default behavior proceed
    }
  };

  const handleInputChange = (field, value) => {
    // Key fields that affect stock code generation
    const keyFields = ['cap', 'product_type', 'yaglama_tipi', 'min_mukavemet', 'max_mukavemet', 'kg']; // ✅ FIXED: Use product_type and yaglama_tipi
    
    // If a key field is being changed and we haven't saved to database yet, reset sequence
    if (keyFields.includes(field) && !savedToDatabase) {
      setProcessSequence('00');
    }
    
    // Enforce point as decimal separator for any input value
    let normalizedValue;
    
    // First ensure the value is trimmed
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    
    // Special case for decimal inputs - maintain exact format
    if (typeof trimmedValue === 'string' && trimmedValue.includes('.')) {
      // If the string contains a decimal point, preserve its format exactly
      setMmData(prev => ({
        ...prev,
        [field]: trimmedValue
      }));
      return;
    }
    
    if (typeof trimmedValue === 'string' && trimmedValue.includes(',')) {
      // If input contains comma, replace with point
      normalizedValue = trimmedValue.replace(/,/g, '.');
    } else {
      // Otherwise use the trimmed value or normalize if not a string
      normalizedValue = typeof trimmedValue === 'string' ? trimmedValue : normalizeInputValue(trimmedValue);
    }
    
    // For numeric fields, ensure we store with point decimal separator but keep as strings
    // ✅ FIXED: Removed 'kaplama' (not used for Tavlı/Balya), yaglama_tipi is string not numeric
    if (['cap', 'min_mukavemet', 'max_mukavemet', 'kg', 'tolerans_plus', 'tolerans_minus'].includes(field)) {
      if (typeof normalizedValue === 'string' && normalizedValue !== '') {
        // Remove any commas first and replace with points to be sure
        const valueWithPoints = normalizedValue.replace(/,/g, '.');
        
        // If it's a valid number, ensure it uses point as decimal separator
        const num = parseFloat(valueWithPoints);
        if (!isNaN(num)) {
          // For decimal input, keep the decimal part as-is to preserve user input exactly as entered
          if (valueWithPoints.includes('.')) {
            // If user is typing a decimal number, keep their input exactly as is (with points)
            normalizedValue = valueWithPoints;
          } else {
            // For whole numbers, no decimal formatting needed
            normalizedValue = valueWithPoints;
          }
        }
      }
    }
    
    setMmData(prev => {
      const newData = {
        ...prev,
        [field]: normalizedValue
      };

      // ✅ DYNAMIC CONSTRAINT: Auto-clear "Daldırma" if diameter moves outside valid range
      if (field === 'cap' && prev.yaglama_tipi === 'Daldırma') {
        const capValue = parseFloat(normalizedValue);
        if (capValue && (capValue < 1.80 || capValue > 3.80)) {
          console.warn(`Diameter ${capValue}mm is outside Daldırma range (1.80-3.80mm), clearing oil type`);
          newData.yaglama_tipi = ''; // Auto-clear to allow user to re-select
          toast.info('Daldırma yağlama sadece 1.80-3.80mm çap aralığında kullanılabilir. Yağlama tipi sıfırlandı.');
        }
      }

      return newData;
    });
  };


  // Comprehensive state reset function - used when switching between requests
  const resetApplicationState = () => {

    setYmTtData(null); // ✅ FIXED: Use ymTtData for Tavlı/Balya (not ymGtData for galvanizli)
    setYmStpData(null); // Also reset YM STP data
    setSuitableYmSts([]);
    setSelectedYmSts([]);
    setAutoGeneratedYmSts([]);
    setSavedToDatabase(false);
    setDatabaseIds({ mmIds: [], ymGtId: null, ymStIds: [] });
    setAllRecipes({ mmRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
    setRecipeStatus({ mmRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
    setActiveRecipeTab(0);
    setError(null);
    setSuccessMessage('');
    
    // Session tracking temizle
    setSessionSavedProducts({ mmIds: [], ymGtId: null, ymStIds: [] });
    
    // Additional state resets
    setMainYmStIndex(0);
    setShowDuplicateConfirmModal(false);
    setDuplicateProducts([]);
    setPendingSaveData(null);
    setShowProductConflictModal(false);
    setConflictProduct(null);
    setConflictType('');
    setShowYmStExistsModal(false);
    setExistingYmStsForModal([]);
    setProcessSequence('00');
    setIsInApprovalProcess(false);
    setIsViewingExistingProduct(false);
    setIsEditingExistingProduct(false);
    
  };

  // Manuel girişe geri dön - tüm state'i temizle
  const handleBackToManual = () => {
    toast.dismiss(); // Clear all toast messages when switching to manual input
    setCurrentStep('input');
    setSelectedRequest(null);
    setSelectedExistingMmGt(null);
    setIsRequestUsed(false); // Talep kullanım durumunu sıfırla
    setIsEditingRequest(false);
    
    // Use the comprehensive reset function
    resetApplicationState();
    
    // Clear MM TT form data - reset to DEFAULT VALUES (same as initial page load)
    setMmData({
      cap: '2.50',           // Default cap value
      product_type: 'TAVLI', // ✅ FIXED: Default to TAVLI (not kod_2: 'NIT')
      yaglama_tipi: '',      // ✅ FIXED: Empty yaglama (not kaplama: '50')
      min_mukavemet: '350',  // Default min strength
      max_mukavemet: '550',  // Default max strength
      kg: '500',             // Default weight
      ic_cap: 45,            // Default inner diameter (number, not string)
      dis_cap: 75,           // Default outer diameter (number, not string)
      tolerans_plus: '0.05', // Default plus tolerance
      tolerans_minus: '0.06', // Default minus tolerance
      shrink: 'evet',        // Default shrink setting
      unwinding: '',         // Empty unwinding
      cast_kont: '',         // Empty cast control
      helix_kont: '',        // Empty helix control
      elongation: ''         // Empty elongation
    });
  };

  // İleri butonu
  // Validation function for MM TT data with detailed error messages
  const validateMmGtData = () => {
    const errors = [];
    
    // Check required fields
    const requiredFields = {
      'cap': 'Çap',
      'product_type': 'Ürün Tipi', // ✅ FIXED: TAVLI or BALYA (not kaplama)
      // yaglama_tipi is optional (can be empty for Yagsiz/no oil)
      'min_mukavemet': 'Min Mukavemet',
      'max_mukavemet': 'Max Mukavemet',
      'kg': 'Ağırlık'
    };
    
    Object.entries(requiredFields).forEach(([field, label]) => {
      if (!mmData[field]) {
        errors.push(`${label} alanı zorunludur`);
      }
    });
    
    // If any required fields are missing, return early
    if (errors.length > 0) {
      return errors;
    }
    
    // Çap validation: 0.90 - 4.00 arasında olmalı
    const capValue = parseFloat(mmData.cap);
    if (isNaN(capValue)) {
      errors.push('Çap için geçerli bir sayısal değer giriniz (0.90 ile 4.00 arasında).');
    } else if (capValue < 0.90 || capValue > 4.00) {
      errors.push(`Çap değeri 0.90 ile 4.00 arasında olmalıdır. Girilen değer: ${mmData.cap}`);
    }

    // Yağlama Tipi validation: BALYA products MUST have yaglama_tipi
    if (mmData.product_type === 'BALYA' && !mmData.yaglama_tipi) {
      errors.push('Yağlı Balya Teli için yağlama tipini seçmelisiniz (Püskürtme veya Normal).');
    }

    // Tolerans validation and mathematical correction
    let toleransPlusValue = null;
    let toleransMinusValue = null;
    
    if (mmData.tolerans_plus) {
      toleransPlusValue = parseFloat(mmData.tolerans_plus);
      if (isNaN(toleransPlusValue)) {
        errors.push('Tolerans+ için geçerli bir sayısal değer giriniz.');
      } else if (toleransPlusValue < 0) {
        errors.push(`Tolerans+ değeri negatif olamaz. Girilen değer: ${mmData.tolerans_plus}`);
      }
    }
    
    if (mmData.tolerans_minus) {
      toleransMinusValue = parseFloat(mmData.tolerans_minus);
      if (isNaN(toleransMinusValue)) {
        errors.push('Tolerans- için geçerli bir sayısal değer giriniz.');
      } else if (toleransMinusValue < 0) {
        errors.push(`Tolerans- değeri negatif olamaz. Girilen değer: ${mmData.tolerans_minus}`);
      }
    }
    
    // Mathematical tolerance validation and auto-correction
    if (toleransPlusValue !== null && toleransMinusValue !== null && !isNaN(toleransPlusValue) && !isNaN(toleransMinusValue)) {
      // Get the actual signed values based on the sign selectors
      const actualPlusValue = toleransMaxSign === '-' ? -toleransPlusValue : toleransPlusValue;
      const actualMinusValue = toleransMinSign === '-' ? -toleransMinusValue : toleransMinusValue;
      
      // Check mathematical correctness: max tolerance should be >= min tolerance
      if (actualPlusValue < actualMinusValue) {
        // Auto-correct by swapping values and signs
        console.log('🔧 Auto-correcting tolerance values:', {
          original: { plus: actualPlusValue, minus: actualMinusValue },
          corrected: { plus: actualMinusValue, minus: actualPlusValue }
        });
        
        // Update the form data with corrected values
        setMmData(prev => ({
          ...prev,
          tolerans_plus: Math.abs(actualMinusValue).toString(),
          tolerans_minus: Math.abs(actualPlusValue).toString()
        }));
        
        // Update the sign selectors
        setToleransMaxSign(actualMinusValue >= 0 ? '+' : '-');
        setToleransMinSign(actualPlusValue >= 0 ? '+' : '-');
        
        // Inform user about the correction
        toast.info('Tolerans değerleri matematiksel olarak düzeltildi (Max ≥ Min)');
      }
    }
    
    // Ağırlık validation: 250 ile 20000 arasında
    const kgValue = parseFloat(mmData.kg);
    if (isNaN(kgValue)) {
      errors.push('Ağırlık için geçerli bir sayısal değer giriniz (250 ile 20000 arasında).');
    } else if (kgValue < 250 || kgValue > 20000) {
      errors.push(`Ağırlık değeri 250 ile 20000 arasında olmalıdır. Girilen değer: ${mmData.kg}`);
    }

    // ✅ NEW: ID-OD validation by oil type (from constraints.csv)
    // This is a WARNING only (informative), not blocking
    if (mmData.ic_cap && mmData.dis_cap && mmData.yaglama_tipi) {
      const ic = parseFloat(mmData.ic_cap);
      const dis = parseFloat(mmData.dis_cap);

      if (!isNaN(ic) && !isNaN(dis)) {
        let validRanges = [];
        let isValid = false;

        if (mmData.yaglama_tipi === 'Püskürtme') {
          // Püskürtme: 23-35 / 45-75 / 50-90
          validRanges = ['23-35 cm', '45-75 cm', '50-90 cm'];
          isValid = (ic >= 23 && dis <= 35) ||
                   (ic >= 45 && dis <= 75) ||
                   (ic >= 50 && dis <= 90);
        } else if (mmData.yaglama_tipi === 'Daldırma') {
          // ✅ UPDATED: Daldırma: 15-30 / 21-34 (was 14.5-30 per gene2l.csv)
          validRanges = ['15-30 cm', '21-34 cm'];
          isValid = (ic >= 15 && dis <= 30) ||
                   (ic >= 21 && dis <= 34);
        } else if (mmData.yaglama_tipi === '' || mmData.yaglama_tipi === 'Yagsiz') {
          // ✅ UPDATED: Yağsız Balya: 15-30 / 21-34 (was 14.5-30 per gene2l.csv)
          validRanges = ['15-30 cm', '21-34 cm'];
          isValid = (ic >= 15 && dis <= 30) ||
                   (ic >= 21 && dis <= 34);
        }

        if (!isValid && validRanges.length > 0) {
          // Show warning toast (not blocking error)
          const rangeText = validRanges.join(' veya ');
          console.warn(`⚠️ ID-OD Uyarı: ${mmData.yaglama_tipi} için önerilen aralıklar: ${rangeText}`);
          toast.warning(`⚠️ Dikkat: ${mmData.yaglama_tipi} yağlama tipi için önerilen IC-OD aralıkları: ${rangeText}. Mevcut: IC ${ic} - OD ${dis} cm`, {
            duration: 8000
          });
        }
      }
    }

    return errors;
  };
  
  const handleNext = async () => {
    // Validate all fields before proceeding
    const validationErrors = validateMmGtData();
    
    if (validationErrors.length > 0) {
      // Display validation errors
      setError(`Lütfen aşağıdaki hataları düzeltiniz:\n\n${validationErrors.map(err => `• ${err}`).join('\n')}`);
      
      // Show toast notification
      toast.error('Formdaki hataları düzeltiniz', { autoClose: 5000 });
      return;
    }
    
    // Clear any existing errors
    setError(null);
    
    // Check for duplicate product by stok_adi (functional duplicates regardless of sequence)
    try {
      setIsLoading(true);
      
      // Generate the stok_adi that would be created for comparison - use the same function
      const mmStokAdi = generateStokAdi();
      
      
      // Search ALL MM TT products to find functional duplicates by stok_adi
      const allProductsResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?limit=1000`);
      
      if (allProductsResponse && allProductsResponse.ok) {
        const allProducts = await allProductsResponse.json();
        
        if (allProducts.length > 0 && !isViewingExistingProduct) {
          // Find products with the same stok_adi (functional duplicates)
          
          const functionalDuplicates = allProducts.filter(product => {
            const isMatch = product.stok_adi === mmStokAdi;
            if (isMatch) {
            }
            return isMatch;
          });
          
          if (functionalDuplicates.length > 0) {
            // Found functional duplicate(s) with same specifications - show warning
            console.log(`⚠️ Found ${functionalDuplicates.length} functional duplicate(s):`, functionalDuplicates.map(p => p.stok_kodu));
            setDuplicateProducts(functionalDuplicates);
            setShowDuplicateConfirmModal(true);
            setIsLoading(false);
            return; // Don't proceed, wait for user decision
          } else {
            // Same stok_kodu but different stok_adi - this is allowed, continue with incremented sequence
          }
        }
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // Continue anyway if duplicate check fails
    } finally {
      setIsLoading(false);
    }
    
    // Continue to next step
    setCurrentStep('summary');
    generateYmGtData();
    findSuitableYmSts();
    // ✅ REMOVED: calculateAutoRecipeValues() - findSuitableYmSts() already calls it after YM STs are in state
  };

  // YM ST seçimi
  const handleYmStSelection = async (ymSt) => {
    const isSelected = selectedYmSts.find(item => item.stok_kodu === ymSt.stok_kodu);
    if (isSelected) {
      // If removing a YM ST, check if it's the main one
      const removedIndex = selectedYmSts.findIndex(item => item.stok_kodu === ymSt.stok_kodu);
      if (removedIndex === mainYmStIndex) {
        // If we're removing the main YMST, set a new main index
        const totalLength = selectedYmSts.length + autoGeneratedYmSts.length;
        if (totalLength > 1) {
          // If there are still YMSTs left, select a new main YMST
          // Prefer to keep the main YMST among selected YMSTs
          if (selectedYmSts.length > 1) {
            // If there are other selected YMSTs, choose one of them
            setMainYmStIndex(removedIndex === selectedYmSts.length - 1 ? removedIndex - 1 : 0);
          } else if (autoGeneratedYmSts.length > 0) {
            // Fall back to the first auto-generated YMST
            setMainYmStIndex(0);
          }
        }
      } else if (removedIndex < mainYmStIndex) {
        // If removing an YMST with index less than main, adjust main index
        setMainYmStIndex(mainYmStIndex - 1);
      }
      
      setSelectedYmSts(prev => prev.filter(item => item.stok_kodu !== ymSt.stok_kodu));
    } else {
      // Adding a new YMST
      const newYmSt = { ...ymSt, source: 'database' };
      
      setSelectedYmSts(prev => {
        const newYmSts = [...prev, newYmSt];
        
        // If this is the first YMST (either selected or auto), make it the main one
        const totalYmSts = newYmSts.length + autoGeneratedYmSts.length;
        if (totalYmSts === 1) {
          setMainYmStIndex(0);
        }
        
        return newYmSts;
      });
      
      // Load recipe data for this YMST if it exists in database and not viewing existing product
      if (ymSt.id && !isViewingExistingProduct) {
        // Wait for state update before loading recipes
        setTimeout(async () => {
          await loadExistingRecipeData([newYmSt]);
        }, 100);
      }
    }
    
    // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
    // if (!isViewingExistingProduct) {
    //   // Seçim değiştiğinde reçeteleri yeniden hesapla
    //   setTimeout(() => {
    //     calculateAutoRecipeValues();
    //   }, 200);
    // }
  };

  // Otomatik oluşturulan YM ST'yi sil
  const removeAutoGeneratedYmSt = (index) => {
    // The auto index in the overall selection
    const autoIndex = selectedYmSts.length + index;
    
    // If removing the main YMST, set a new main YMST
    if (autoIndex === mainYmStIndex) {
      const totalLength = selectedYmSts.length + autoGeneratedYmSts.length;
      if (totalLength > 1) {
        // Prefer to keep the main among auto YMSTs if possible
        if (autoGeneratedYmSts.length > 1) {
          const newMainIndex = index === autoGeneratedYmSts.length - 1 
            ? autoIndex - 1 
            : autoIndex + 1 < totalLength ? autoIndex + 1 : 0;
          setMainYmStIndex(newMainIndex);
        } else if (selectedYmSts.length > 0) {
          // Fall back to selected YMSTs
          setMainYmStIndex(0);
        }
      }
    } else if (autoIndex < mainYmStIndex) {
      // If removing an YMST with index less than main, adjust main index
      setMainYmStIndex(mainYmStIndex - 1);
    }
    
    setAutoGeneratedYmSts(prev => prev.filter((_, i) => i !== index));
    // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
    // setTimeout(() => {
    //   calculateAutoRecipeValues();
    // }, 100);
  };

  // Seçili YM ST'yi sil
  const removeSelectedYmSt = (index) => {
    // If removing the main YMST, set a new main YMST
    if (index === mainYmStIndex) {
      const totalLength = selectedYmSts.length + autoGeneratedYmSts.length;
      if (totalLength > 1) {
        // Prefer to keep the main among selected YMSTs if possible
        if (selectedYmSts.length > 1) {
          const newMainIndex = index === selectedYmSts.length - 1 ? index - 1 : index + 1 < selectedYmSts.length ? index + 1 : 0;
          setMainYmStIndex(newMainIndex);
        } else if (autoGeneratedYmSts.length > 0) {
          // Fall back to auto YMSTs, which start at index selectedYmSts.length
          setMainYmStIndex(selectedYmSts.length - 1); // Will be correct after removal
        }
      }
    } else if (index < mainYmStIndex) {
      // If removing an YMST with index less than main, adjust main index
      setMainYmStIndex(mainYmStIndex - 1);
    }
    
    setSelectedYmSts(prev => prev.filter((_, i) => i !== index));
    // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
    // setTimeout(() => {
    //   calculateAutoRecipeValues();
    // }, 100);
  };

  // Reçete güncelleme fonksiyonu - NOKTA kullan
  const updateRecipeValue = (recipeType, ymStIndex, key, value) => {
    // Handle comma to point conversion first (direct replacement)
    let inputValue = value;
    if (typeof inputValue === 'string' && inputValue.includes(',')) {
      inputValue = inputValue.replace(/,/g, '.');
    }
    
    // Mark as unsaved when recipe values change
    // This triggers the save process which will check if same stok_kodu/stok_adi exists
    // and ask user if they want to update it
    if (savedToDatabase) {
      setSavedToDatabase(false);
      // Clear database IDs so the system treats this as a new save attempt
      // and goes through the normal duplicate checking process
      setDatabaseIds({ mmIds: [], ymGtId: null, ymStIds: [] });
      setSessionSavedProducts({ mmIds: [], ymGtId: null, ymStIds: [] });
    }
    
    // Special case handling for direct decimal input
    // This allows decimal points to be properly entered and maintained in the field
    if (typeof inputValue === 'string') {
      // If we have a string with a decimal point (.5 or 3.1), preserve its exact format
      // This handles decimal points that were just added by the user
      if (inputValue.includes('.')) {
        // Store it as is to maintain positions of digits and decimal points
        setRecipeStatus(prev => ({
          ...prev,
          [recipeType === 'mm' 
            ? 'mmRecipes' 
            : recipeType === 'ymgt' 
              ? 'ymGtRecipe' 
              : 'ymStRecipes']: recipeType === 'ymgt' 
                ? { ...prev.ymGtRecipe, [key]: 'manual' }
                : {
                    ...prev[recipeType === 'mm' ? 'mmRecipes' : 'ymStRecipes'],
                    [ymStIndex]: {
                      ...prev[recipeType === 'mm' ? 'mmRecipes' : 'ymStRecipes'][ymStIndex],
                      [key]: 'manual'
                    }
                  }
        }));
        
        // Update the appropriate recipe with the exact string value
        if (recipeType === 'mm') {
          setAllRecipes(prev => ({
            ...prev,
            mmRecipes: {
              ...prev.mmRecipes,
              [ymStIndex]: {
                ...prev.mmRecipes[ymStIndex],
                [key]: inputValue // Keep as string with decimal point
              }
            }
          }));
          return; // Exit early to avoid overwriting with number parsing
        } else if (recipeType === 'ymgt') {
          setAllRecipes(prev => ({
            ...prev,
            ymGtRecipe: {
              ...prev.ymGtRecipe,
              [key]: inputValue // Keep as string with decimal point
            }
          }));
          return; // Exit early
        } else {
          setAllRecipes(prev => ({
            ...prev,
            ymStRecipes: {
              ...prev.ymStRecipes,
              [ymStIndex]: {
                ...prev.ymStRecipes[ymStIndex],
                [key]: inputValue // Keep as string with decimal point
              }
            }
          }));
          return; // Exit early
        }
      }
    }
    
    // For other cases (non-decimal string, empty string, number, etc.)
    // Continue with standard handling
    const normalizedValue = typeof inputValue === 'string' ? inputValue : normalizeInputValue(inputValue);
    
    // Ensure we have a proper numeric value with point decimal separator
    // Store the formatted string to maintain proper decimal display
    const numValue = parseFloat(normalizedValue) || 0;
    const formattedValue = numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 5,
      useGrouping: false // No thousand separators
    });

    if (recipeType === 'mm') {
      setAllRecipes(prev => ({
        ...prev,
        mmRecipes: {
          ...prev.mmRecipes,
          [ymStIndex]: {
            ...prev.mmRecipes[ymStIndex],
            [key]: formattedValue // Store as formatted string with point decimal
          }
        }
      }));
      // Manuel değişiklik olarak işaretle
      setRecipeStatus(prev => ({
        ...prev,
        mmRecipes: {
          ...prev.mmRecipes,
          [ymStIndex]: {
            ...prev.mmRecipes[ymStIndex],
            [key]: 'manual'
          }
        }
      }));
    } else if (recipeType === 'ymgt') {
      setAllRecipes(prev => ({
        ...prev,
        ymGtRecipe: {
          ...prev.ymGtRecipe,
          [key]: formattedValue // Store as formatted string with point decimal
        }
      }));
      // Manuel değişiklik olarak işaretle
      setRecipeStatus(prev => ({
        ...prev,
        ymGtRecipe: {
          ...prev.ymGtRecipe,
          [key]: 'manual'
        }
      }));
    } else if (recipeType === 'ymst') {
      setAllRecipes(prev => ({
        ...prev,
        ymStRecipes: {
          ...prev.ymStRecipes,
          [ymStIndex]: {
            ...prev.ymStRecipes[ymStIndex],
            [key]: formattedValue // Store as formatted string with point decimal
          }
        }
      }));
      // Manuel değişiklik olarak işaretle
      setRecipeStatus(prev => ({
        ...prev,
        ymStRecipes: {
          ...prev.ymStRecipes,
          [ymStIndex]: {
            ...prev.ymStRecipes[ymStIndex],
            [key]: 'manual'
          }
        }
      }));
      // ❌ DISABLED: Auto-calculation removed - user must click "Otomatik Doldur" button
      // if (key.includes('FLM.')) {
      //   setTimeout(() => {
      //     calculateAutoRecipeValues();
      //   }, 100);
      // }
    }
  };

  // Reçete durumunu gösterir
  const getRecipeStatusText = (recipeType, ymStIndex, key) => {
    let status = '';
    if (recipeType === 'mm') {
      status = recipeStatus.mmRecipes[ymStIndex]?.[key];
    } else if (recipeType === 'ymgt') {
      status = recipeStatus.ymGtRecipe[key];
    } else if (recipeType === 'ymst') {
      status = recipeStatus.ymStRecipes[ymStIndex]?.[key];
    }
    
    switch (status) {
      case 'database': return 'Veritabanında seçildi';
      case 'auto': return 'Otomatik dolduruldu';
      case 'manual': return 'Elle dolduruldu';
      default: return '';
    }
  };

  // İnkremental ürün oluşturma kontrolü - Tavlı/Balya Tel için
  const checkForExistingProducts = async (cap, product_type, yaglama_tipi, minMukavemet, maxMukavemet, kg) => {
    console.log('🚨 checkForExistingProducts CALLED with params:', { cap, product_type, yaglama_tipi, minMukavemet, maxMukavemet, kg });
    try {
      const capFormatted = Math.round(parseFloat(cap) * 100).toString().padStart(4, '0');
      const productPrefix = product_type === 'TAVLI' ? 'TT.BAG' : 'TT.BALYA';
      const mmBaseCode = `${productPrefix}.${capFormatted}`;
      
      // Search tavli/balya products to find the highest sequence
      const mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_kodu_like=${encodeURIComponent(mmBaseCode)}`);

      const allProducts = [];

      if (mmResponse && mmResponse.ok) {
        const mmProducts = await mmResponse.json();
        allProducts.push(...mmProducts);
      }

      // Filter products to only include those with the exact base code pattern
      const filteredProducts = allProducts.filter(product => {
        const productBaseCode = product.stok_kodu.substring(0, product.stok_kodu.lastIndexOf('.'));
        return productBaseCode === mmBaseCode;
      });
      
      console.log('🔍 checkForExistingProducts search:');
      console.log('Found total products from API:', allProducts.length);
      if (allProducts.length > 0) {
        console.log('All products found:', allProducts.map(p => ({ stok_kodu: p.stok_kodu, stok_adi: p.stok_adi })));
      }
      console.log('Filtered products with exact base code:', filteredProducts.length);
      if (filteredProducts.length > 0) {
        console.log('Filtered products:', filteredProducts.map(p => ({ stok_kodu: p.stok_kodu, stok_adi: p.stok_adi })));
      }
      
      if (filteredProducts.length > 0) {
        const existingProducts = filteredProducts;
        
        // Tamamen aynı ürün var mı kontrol et (stok_kodu və stok_adi etkileyen tüm değerler)
        // Use the same generateStokAdi function to ensure consistent formatting
        const stokAdi = generateStokAdi();
        
        // Tamamen eşleşen bir ürün var mı?
        const exactMatch = existingProducts.find(product => {
          // Stok adı ile karşılaştırma için normalizasyon (boşluklar ve case-sensitive olmayan karşılaştırma)
          const normalizedProductAdi = product.stok_adi.replace(/\s+/g, ' ').trim().toLowerCase();
          const normalizedStokAdi = stokAdi.replace(/\s+/g, ' ').trim().toLowerCase();
          
          // Stok kodu base'i ve stok adı eşleşiyorsa
          return normalizedProductAdi === normalizedStokAdi;
        });
        
        if (exactMatch) {
          // Use the new duplicate confirmation system instead of window.confirm
          // This will be handled by checkForDuplicatesAndConfirm function
          const sequencePart = exactMatch.stok_kodu.split('.').pop();
          const sequenceNum = parseInt(sequencePart);
          console.log('Found exact match, returning existing sequence:', sequenceNum);
          return sequenceNum; // Use existing sequence for now, duplicate dialog will handle the confirmation
        }
        
        // Eğer tamamen eşleşen yoksa veya kullanıcı güncellemeyi reddettiyse, yeni bir ürün oluştur
        let maxSequence = -1;
        existingProducts.forEach(product => {
          const sequencePart = product.stok_kodu.split('.').pop();
          const sequenceNum = parseInt(sequencePart);
          if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
            maxSequence = sequenceNum;
          }
        });
        
        // Always increment from the highest sequence found, or start with 0 if none exist
        const nextSeq = maxSequence + 1;
        console.log('🔍 checkForExistingProducts result:');
        console.log('Found existing products with same base code:', existingProducts.length);
        console.log('maxSequence found:', maxSequence);
        console.log('returning nextSequence:', nextSeq);
        console.log('🚨 ABOUT TO RETURN:', nextSeq);
        return nextSeq;
      }
    } catch (error) {
      console.error('Mevcut ürün kontrolü hatası:', error);
    }
    console.log('🔍 checkForExistingProducts: No existing products found, returning 0');
    console.log('🚨 ABOUT TO RETURN: 0');
    return 0; // Hata durumunda veya ürün yoksa 0'dan başla
  };

  // Session'daki ürünleri güncelle - Yeni 1:1:n ilişki modeli ile
  const updateSessionProducts = async () => {
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    if (sessionSavedProducts.mmIds.length > 0) {
      // Ana YM ST'yi belirle
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      
      // MMGT için doğru sequence'i belirle - özellikle key değerleri değiştiyse önemli
      let sequence = '00';
      let oldSequence = '00';
      
      // MMGT'nin stok_kodu'ndan mevcut sequence'i al
      const mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}/${sessionSavedProducts.mmIds[0]}`);
      if (mmResponse && mmResponse.ok) {
        const mm = await mmResponse.json();
        if (mm && mm.stok_kodu) {
          oldSequence = mm.stok_kodu.split('.').pop();
          
          // Key değerlerinde değişim var mı çok dikkatli kontrol et
          const currentKey = `${mmData.cap}|${mmData.product_type}|${mmData.yaglama_tipi}|${mmData.min_mukavemet}|${mmData.max_mukavemet}|${mmData.kg}`;
          const oldKey = `${mm.cap}|${mm.product_type}|${mm.yaglama_tipi}|${mm.min_mukavemet}|${mm.max_mukavemet}|${mm.kg}`;
          
          if (currentKey !== oldKey) {
            // Key değişmişse yeni sequence hesapla using the unified checkForExistingProducts function
            const nextSequence = await checkForExistingProducts(
              mmData.cap,
              mmData.product_type,
              mmData.yaglama_tipi,
              mmData.min_mukavemet,
              mmData.max_mukavemet,
              mmData.kg
            );
            sequence = nextSequence.toString().padStart(2, '0');
          } else {
            // Key değişmemişse mevcut sequence'i kullan
            sequence = oldSequence;
          }
        }
      }
      
      // Eski ve yeni sequence farklı ise kullanıcıyı uyar
      if (oldSequence !== '00' && sequence !== oldSequence) {
        console.warn(`Sequence değişiyor: ${oldSequence} -> ${sequence}`);
      }
      
      // Sadece 1 MM TT'yi güncelle
      if (sessionSavedProducts.mmIds[0]) {
        await fetchWithAuth(`${API_URLS.tavliBalyaMm}/${sessionSavedProducts.mmIds[0]}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmTtDatabaseData(sequence))
        });
      }
      
      // Sadece 1 YM TT'yi güncelle
      if (sessionSavedProducts.ymGtId) {
        await fetchWithAuth(`${API_URLS.tavliNetsisYmTt}/${sessionSavedProducts.ymGtId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateYmGtDatabaseData(sequence))
        });
      }
      
      // Tüm YM ST'leri güncelle
      for (let i = 0; i < allYmSts.length && i < sessionSavedProducts.ymStIds.length; i++) {
        // YM ST'yi güncelle (eğer otomatik oluşturulmuşsa)
        if (sessionSavedProducts.ymStIds[i] && 
            (allYmSts[i].source === 'auto-generated' || allYmSts[i].source === 'manual-added')) {
          await fetchWithAuth(`${API_URLS.galYmSt}/${sessionSavedProducts.ymStIds[i]}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generateYmStDatabaseData(allYmSts[i]))
          });
        }
      }
      
      // MM TT - Ana YM ST ilişkisini güncelle - ilişkileri sil ve yeniden oluştur
      try {
        // Önce ilişkileri sil
        if (sessionSavedProducts.mmIds[0]) {
          await fetchWithAuth(`${API_URLS.tavliBalyaMmYmSt}/mm_gt/${sessionSavedProducts.mmIds[0]}`, {
            method: 'DELETE'
          });
        }
        
        // Yeni ilişkiyi oluştur
        if (sessionSavedProducts.mmIds[0] && sessionSavedProducts.ymStIds[mainYmStIndex]) {
          await fetchWithAuth(API_URLS.tavliBalyaMmYmSt, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mm_gt_id: sessionSavedProducts.mmIds[0],
              ym_gt_id: sessionSavedProducts.ymGtId, // Include YM TT ID
              ym_st_id: sessionSavedProducts.ymStIds[mainYmStIndex]
              // is_main: Removed - not in database schema
            })
          });
        }
      } catch (error) {
        console.error('İlişki güncelleme hatası:', error);
      }
      
      return {
        mmIds: [sessionSavedProducts.mmIds[0]], // Artık sadece 1 MM TT var
        ymGtId: sessionSavedProducts.ymGtId,
        ymStIds: sessionSavedProducts.ymStIds
      };
    }
    
    return null;
  };

  // Check for duplicate products and show confirmation dialog
  // Queue-safe version that doesn't show popups but uses existing sequence logic
  const checkForDuplicatesNoPopup = async () => {
    try {
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      
      if (allYmSts.length === 0) {
        toast.error('En az bir YM ST seçmelisiniz veya oluşturmalısınız');
        return false;
      }
      
      // Use the existing sequence logic without popups
      const nextSequence = await checkForExistingProducts(
        mmData.cap,
        mmData.product_type,
        mmData.yaglama_tipi,
        mmData.min_mukavemet,
        mmData.max_mukavemet,
        mmData.kg
      );
      
      const sequence = nextSequence.toString().padStart(2, '0');
      
      // Store the sequence for Excel generation
      setProcessSequence(sequence);
      
      // Proceed with save directly using the working sequence logic
      return await proceedWithSave(allYmSts, nextSequence);
    } catch (error) {
      console.error('No-popup save error:', error);
      toast.error('Kayıt hatası: ' + error.message);
      return false;
    }
  };

  const checkForDuplicatesAndConfirm = async () => {
    try {
      setIsLoading(true);
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      
      if (allYmSts.length === 0) {
        toast.error('En az bir YM ST seçmelisiniz veya oluşturmalısınız');
        setIsLoading(false);
        return false;
      }
      
      // First check if an exact duplicate exists (all fields match)
      const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
      // ✅ FIXED: Use TT.BAG/TT.BALYA format based on product_type
      const productPrefix = mmData.product_type === 'TAVLI' ? 'TT.BAG' : 'TT.BALYA';
      const baseCode = `${productPrefix}.${capFormatted}`;

      // Get all existing products with same base code
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
      if (response && response.ok) {
        const existingProducts = await response.json();

        if (existingProducts.length > 0) {
          // Check each existing product for matches
          for (const existingProduct of existingProducts) {
            // Check if ALL fields match (exact duplicate)
            // ✅ FIXED: Use product_type and yaglama_tipi instead of kod_2 and kaplama
            const allFieldsMatch =
              Math.abs(parseFloat(existingProduct.cap) - parseFloat(mmData.cap)) < 0.001 &&
              existingProduct.product_type === mmData.product_type &&
              Math.abs(parseFloat(existingProduct.tolerans_plus) - parseFloat(mmData.tolerans_plus)) < 0.001 &&
              Math.abs(parseFloat(existingProduct.tolerans_minus) - parseFloat(mmData.tolerans_minus)) < 0.001 &&
              (existingProduct.yaglama_tipi || '') === (mmData.yaglama_tipi || '') &&
              parseInt(existingProduct.min_mukavemet) === parseInt(mmData.min_mukavemet) &&
              parseInt(existingProduct.max_mukavemet) === parseInt(mmData.max_mukavemet) &&
              parseInt(existingProduct.kg) === parseInt(mmData.kg) &&
              parseInt(existingProduct.ic_cap) === parseInt(mmData.ic_cap) &&
              parseInt(existingProduct.dis_cap) === parseInt(mmData.dis_cap) &&
              (existingProduct.cast_kont || 'hayır') === (mmData.cast_kont || 'hayır') &&
              (existingProduct.shrink || 'hayır') === (mmData.shrink || 'hayır') &&
              (existingProduct.unwinding || '') === (mmData.unwinding || '') &&
              (existingProduct.helix_kont || 'hayır') === (mmData.helix_kont || 'hayır') &&
              (existingProduct.elongation || '') === (mmData.elongation || '');

            if (allFieldsMatch) {
              // Exact duplicate found
              setConflictProduct(existingProduct);
              setConflictType('exact');
              setShowProductConflictModal(true);
              setIsLoading(false);
              return false;
            }

            // Check if only key fields match (key fields that affect stok_adi and stok_kodu)
            // ✅ FIXED: Key fields for Tavlı/Balya: cap, product_type, tolerans, yaglama_tipi, mukavemet, kg, caps, cast_kont
            const keyFieldsMatch =
              Math.abs(parseFloat(existingProduct.cap) - parseFloat(mmData.cap)) < 0.001 &&
              existingProduct.product_type === mmData.product_type &&
              Math.abs(parseFloat(existingProduct.tolerans_plus) - parseFloat(mmData.tolerans_plus)) < 0.001 &&
              Math.abs(parseFloat(existingProduct.tolerans_minus) - parseFloat(mmData.tolerans_minus)) < 0.001 &&
              (existingProduct.yaglama_tipi || '') === (mmData.yaglama_tipi || '') &&
              parseInt(existingProduct.min_mukavemet) === parseInt(mmData.min_mukavemet) &&
              parseInt(existingProduct.max_mukavemet) === parseInt(mmData.max_mukavemet) &&
              parseInt(existingProduct.kg) === parseInt(mmData.kg) &&
              parseInt(existingProduct.ic_cap) === parseInt(mmData.ic_cap) &&
              parseInt(existingProduct.dis_cap) === parseInt(mmData.dis_cap) &&
              (existingProduct.cast_kont || 'hayır') === (mmData.cast_kont || 'hayır');

            if (keyFieldsMatch) {
              // Key fields match but non-key fields are different
              setConflictProduct(existingProduct);
              setConflictType('nonkey');
              setShowProductConflictModal(true);
              setIsLoading(false);
              return false;
            }
          }

          // If we get here, key fields are different, so create new product with incremented sequence
          const nextSequence = await checkForExistingProducts(
            mmData.cap,
            mmData.product_type,
            mmData.yaglama_tipi,
            mmData.min_mukavemet,
            mmData.max_mukavemet,
            mmData.kg
          );
          const sequence = nextSequence.toString().padStart(2, '0');

          // Store the sequence for Excel generation
          setProcessSequence(sequence);

          // Proceed with save as new product
          return await proceedWithSave(allYmSts, nextSequence);
        } else {
          // No existing products with same base code, but still need to check for proper sequence
          // This should never happen now since checkForExistingProducts handles this
          const nextSequence = await checkForExistingProducts(
            mmData.cap,
            mmData.product_type,
            mmData.yaglama_tipi,
            mmData.min_mukavemet,
            mmData.max_mukavemet,
            mmData.kg
          );
          const sequence = nextSequence.toString().padStart(2, '0');
          setProcessSequence(sequence);
          return await proceedWithSave(allYmSts, nextSequence);
        }
      }
      
    } catch (error) {
      console.error('Duplicate check error:', error);
      toast.error(`Duplicate check hatası: ${error.message}`);
      setIsLoading(false);
      return false;
    }
  };

  // Check for duplicate stok_kodu when editing existing products
  const checkForDuplicatesWhenEditing = async () => {
    try {
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      
      if (allYmSts.length === 0) {
        toast.error('En az bir YM ST seçmelisiniz veya oluşturmalısınız');
        return false;
      }
      
      // Generate the potential new stok_kodu based on current form data
      const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
      // ✅ FIXED: Use TT.BAG/TT.BALYA format based on product_type
      const productPrefix = mmData.product_type === 'TAVLI' ? 'TT.BAG' : 'TT.BALYA';
      const baseCode = `${productPrefix}.${capFormatted}`;

      // Get all existing products with same base code
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
      if (response && response.ok) {
        const existingProducts = await response.json();

        if (existingProducts.length > 0) {
          // Check each existing product for matches, excluding the current product being edited
          for (const existingProduct of existingProducts) {
            // Skip the product we're currently editing (same ID)
            if (selectedExistingMm && existingProduct.id === selectedExistingMm.id) {
              continue;
            }

            // Check if ALL fields match (exact duplicate with a different product)
            // ✅ FIXED: Use product_type and yaglama_tipi instead of kod_2 and kaplama
            const allFieldsMatch =
              Math.abs(parseFloat(existingProduct.cap) - parseFloat(mmData.cap)) < 0.001 &&
              existingProduct.product_type === mmData.product_type &&
              Math.abs(parseFloat(existingProduct.tolerans_plus) - parseFloat(mmData.tolerans_plus)) < 0.001 &&
              Math.abs(parseFloat(existingProduct.tolerans_minus) - parseFloat(mmData.tolerans_minus)) < 0.001 &&
              (existingProduct.yaglama_tipi || '') === (mmData.yaglama_tipi || '') &&
              parseInt(existingProduct.min_mukavemet) === parseInt(mmData.min_mukavemet) &&
              parseInt(existingProduct.max_mukavemet) === parseInt(mmData.max_mukavemet) &&
              parseInt(existingProduct.kg) === parseInt(mmData.kg) &&
              parseInt(existingProduct.ic_cap) === parseInt(mmData.ic_cap) &&
              parseInt(existingProduct.dis_cap) === parseInt(mmData.dis_cap) &&
              (existingProduct.cast_kont || 'hayır') === (mmData.cast_kont || 'hayır') &&
              (existingProduct.shrink || 'hayır') === (mmData.shrink || 'hayır') &&
              (existingProduct.unwinding || '') === (mmData.unwinding || '') &&
              (existingProduct.helix_kont || 'hayır') === (mmData.helix_kont || 'hayır') &&
              (existingProduct.elongation || '') === (mmData.elongation || '');

            if (allFieldsMatch) {
              // Exact duplicate found with a different product
              toast.error(`Bu ürün özellikleri zaten mevcut! Çakışan ürün: ${existingProduct.stok_kodu}. Lütfen değerleri gözden geçirin.`);
              return false;
            }
          }
        }
      }
      
      return true; // No duplicates found
    } catch (error) {
      console.error('Edit duplicate check error:', error);
      toast.error(`Duplicate check hatası: ${error.message}`);
      return false;
    }
  };

  // Proceed with actual save (called either directly or after confirmation)
  const proceedWithSave = async (allYmSts, nextSequence, requestIdOverride = null) => {
    try {
      console.log('🔍 PROCEEDING WITH SAVE:');
      console.log('nextSequence parameter received:', nextSequence);
      console.log('typeof nextSequence:', typeof nextSequence);
      
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      const mmIds = [];
      const ymStIds = [];
      let ymGtId = null;
      
      const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
      const sequence = nextSequence.toString().padStart(2, '0');
      
      console.log('🔢 SEQUENCE DEBUG: nextSequence =', nextSequence, 'formatted sequence =', sequence);
      
      // IMPORTANT: Set the processSequence state so Excel generation uses correct sequence
      setProcessSequence(sequence);
      
      // Also store sequence in sessionStorage for debugging
      sessionStorage.setItem('lastProcessSequence', sequence);
      
      
      // Save MM TT - Update existing if editing, create new if creating
      let mmResponse;
      if (isViewingExistingProduct && selectedExistingMm) {
        // Update existing MM TT
        console.log('🔄 Updating existing MM TT with ID:', selectedExistingMm.id);
        mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}/${selectedExistingMm.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmTtDatabaseData(sequence))
        });
        
        if (mmResponse && mmResponse.ok) {
          mmIds.push(selectedExistingMm.id); // Use existing ID
          console.log('✅ MM TT updated successfully');
        }
      } else {
        // Create new MM TT
        console.log('🆕 Creating new MM TT');
        const mmDataToSave = generateMmTtDatabaseData(sequence);
        console.log('📤 MM TT data being sent to backend:', {
          stok_kodu: mmDataToSave.stok_kodu,
          stok_adi: mmDataToSave.stok_adi,
          product_type: mmDataToSave.product_type,
          cap: mmDataToSave.cap,
          kaplama: mmDataToSave.kaplama,
          hasZincCoating: 'zinc_coating' in mmDataToSave,
          allKeys: Object.keys(mmDataToSave)
        });
        mmResponse = await fetchWithAuth(API_URLS.tavliBalyaMm, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mmDataToSave)
        });
        
        if (mmResponse && mmResponse.ok) {
          const mmResult = await mmResponse.json();
          mmIds.push(mmResult.id);
          console.log('✅ MM TT created successfully with ID:', mmResult.id);
        }
      }
      
      // Save all YM STs
      for (let i = 0; i < allYmSts.length; i++) {
        const ymSt = allYmSts[i];
        
        if (ymSt.source === 'auto-generated' || ymSt.source === 'manual-added') {
          const existingYmSt = await checkExistingProduct(API_URLS.galYmSt, ymSt.stok_kodu);
          
          if (existingYmSt) {
            ymStIds.push(existingYmSt.id);
          } else {
            const ymStResponse = await fetchWithAuth(API_URLS.galYmSt, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(generateYmStDatabaseData(ymSt))
            });
            
            if (ymStResponse && ymStResponse.ok) {
              const ymStResult = await ymStResponse.json();
              ymStIds.push(ymStResult.id);
            }
          }
        } else {
          ymStIds.push(ymSt.id);
        }
      }
      
      // Create relationships between ALL YM STs and MM (TT MM)

      for (let i = 0; i < ymStIds.length; i++) {
        try {
          const relationshipData = {
            mm_gt_id: mmIds[0], // TT MM ID
            ym_st_id: ymStIds[i]
            // NOTE: is_main and sequence_index not in database schema - order determined by mainYmStIndex state
          };

          console.log(`🔗 Creating relationship ${i + 1}/${ymStIds.length}:`, relationshipData);
          
          await fetchWithAuth(API_URLS.tavliBalyaMmYmSt, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(relationshipData)
          });
          
        } catch (relationError) {
          console.error('Error creating relationship for YM ST ' + (i + 1) + ':', relationError);
          // Continue with other relationships even if one fails
        }
      }

      // ===============================================================================
      // CREATE INTERMEDIATE PRODUCTS (YM STP, YM TT) based on 4 production flows
      // YM YB removed - Both TAVLI and BALYA share the same YM TT intermediate
      // ===============================================================================
      let ymStpStokKodu = null;
      let ymTtStokKodu = null;

      // ✅ CRITICAL FIX: Determine if pressing is needed based on YM ST cap (NOT MM cap)
      // This matches the logic: pressing affects YM ST → YM STP transformation
      const capValue = parseFloat(mmData.cap);
      const ymStCapValue = parseFloat(mainYmSt.cap);
      const needsPressing = ymStCapValue >= 1.8;
      console.log(`\n🔍 === PRESSING CHECK DEBUG ===`);
      console.log(`📏 MM cap: ${capValue}mm`);
      console.log(`📏 YM ST cap: ${ymStCapValue}mm`);
      console.log(`🔨 Pressing needed: ${needsPressing} (threshold: 1.8mm)`);
      console.log(`📊 Logic: ${ymStCapValue}mm ${needsPressing ? '>=' : '<'} 1.8mm → ${needsPressing ? 'CREATE YM STP' : 'SKIP YM STP'}\n`);

      // Get MM stok_kodu for updating intermediate products
      const productPrefix = mmData.product_type === 'TAVLI' ? 'BAG' : 'BALYA';
      const capFormatted2 = Math.round(capValue * 100).toString().padStart(4, '0');
      const mmStokKodu = `TT.${productPrefix}.${capFormatted2}.${sequence}`;

      // STEP 1: Create YM STP if pressing is needed (cap >= 1.8mm per gene2l.csv)
      if (needsPressing) {
        const ymStpData = generateYmStpDatabaseData(mainYmSt, sequence);

        try {
          const ymStpResponse = await fetchWithAuth(API_URLS.tavliNetsisYmStp, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ymStpData)
          });

          if (ymStpResponse && ymStpResponse.ok) {
            const ymStpResult = await ymStpResponse.json();
            ymStpStokKodu = ymStpResult.stok_kodu;
            console.log('✅ YM STP created:', ymStpResult.stok_kodu);
          } else if (ymStpResponse && ymStpResponse.status === 409) {
            // 409 Conflict - product already exists, fetch it
            console.log('⚠️ YM STP already exists (409), fetching existing product...');
            const existingStokKodu = ymStpData.stok_kodu;
            console.log(`🔍 Searching for existing YM STP: ${existingStokKodu}`);

            const existingResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmStp}?stok_kodu=${encodeURIComponent(existingStokKodu)}`);
            if (existingResponse && existingResponse.ok) {
              const existingProducts = await existingResponse.json();
              if (existingProducts && existingProducts.length > 0) {
                ymStpStokKodu = existingProducts[0].stok_kodu;
                console.log(`✅ Found existing YM STP: ${ymStpStokKodu}`);
              } else {
                console.warn(`⚠️ YM STP search returned empty, using generated stok_kodu: ${existingStokKodu}`);
                ymStpStokKodu = existingStokKodu;
              }
            } else {
              console.warn(`⚠️ Failed to fetch existing YM STP, using generated stok_kodu: ${existingStokKodu}`);
              ymStpStokKodu = existingStokKodu;
            }
          } else {
            console.error(`❌ YM STP creation failed with status: ${ymStpResponse?.status}`);
          }
        } catch (error) {
          console.error('YM STP creation error:', error);
          toast.error('YM STP oluşturma hatası: ' + error.message);
        }
      }

      // STEP 2: Create YM TT (always) - source is either YM STP (if pressed) or YM ST
      const ymTtData = generateYmTtDatabaseData(mainYmSt, sequence, ymStpStokKodu);
      ymTtData.source_mm_stok_kodu = mmStokKodu; // Update with MM stok_kodu

      try {
        const ymTtResponse = await fetchWithAuth(API_URLS.tavliNetsisYmTt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ymTtData)
        });

        if (ymTtResponse && ymTtResponse.ok) {
          const ymTtResult = await ymTtResponse.json();
          ymTtStokKodu = ymTtResult.stok_kodu;
          console.log('✅ YM TT created:', ymTtResult.stok_kodu);
        } else if (ymTtResponse && ymTtResponse.status === 409) {
          // 409 Conflict - product already exists, fetch it
          console.log('⚠️ YM TT already exists (409), fetching existing product...');
          const existingStokKodu = ymTtData.stok_kodu;
          console.log(`🔍 Searching for existing YM TT: ${existingStokKodu}`);

          const existingResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmTt}?stok_kodu=${encodeURIComponent(existingStokKodu)}`);
          if (existingResponse && existingResponse.ok) {
            const existingProducts = await existingResponse.json();
            if (existingProducts && existingProducts.length > 0) {
              ymTtStokKodu = existingProducts[0].stok_kodu;
              console.log(`✅ Found existing YM TT: ${ymTtStokKodu}`);
            } else {
              console.warn(`⚠️ YM TT search returned empty, using generated stok_kodu: ${existingStokKodu}`);
              ymTtStokKodu = existingStokKodu;
            }
          } else {
            console.warn(`⚠️ Failed to fetch existing YM TT, using generated stok_kodu: ${existingStokKodu}`);
            ymTtStokKodu = existingStokKodu;
          }
        } else {
          console.error(`❌ YM TT creation failed with status: ${ymTtResponse?.status}`);
        }
      } catch (error) {
        console.error('YM TT creation error:', error);
        toast.error('YM TT oluşturma hatası: ' + error.message);
      }

      console.log('🔧 Intermediate products created:', { ymStpStokKodu, ymTtStokKodu });

      const newDatabaseIds = {
        mmIds: mmIds,
        ymStIds: ymStIds
      };

      await saveRecipesToDatabase(mmIds, null, ymStIds, ymStpStokKodu, ymTtStokKodu);
      
      setDatabaseIds(newDatabaseIds);
      setSavedToDatabase(true);
      setSuccessMessage('Veriler başarıyla kaydedildi');
      toast.success('Veriler başarıyla kaydedildi');
      
      setSessionSavedProducts(newDatabaseIds);
      
      // Update request table with correct stok_kodu if this was from a request
      const requestIdFromSession = sessionStorage.getItem('lastEditedRequestId');
      
      if (requestIdOverride || requestIdFromSession || (selectedRequest && selectedRequest.id)) {
        const requestId = requestIdOverride || requestIdFromSession || selectedRequest.id;
        console.log(`🎯 [proceedWithSave] Request ID resolution: override=${requestIdOverride}, session=${requestIdFromSession}, selected=${selectedRequest?.id}, final=${requestId}`);
        try {
          const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
          const productPrefix = mmData.product_type === 'TAVLI' ? 'BAG' : 'BALYA';
          const actualStokKodu = `TT.${productPrefix}.${capFormatted}.${sequence}`;
          
          console.log('[proceedWithSave] Updating request ' + requestId + ' with correct stok_kodu: ' + actualStokKodu + ' (sequence: ' + sequence + ')');
          
          const updateResponse = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stok_kodu: actualStokKodu
            })
          });
          
          if (updateResponse && updateResponse.ok) {
            const updateResult = await updateResponse.json();
            toast.success('Talep stok kodu güncellendi');
            
            // Refresh request data to show updated stok_kodu
            console.log('Refreshing request data after stok_kodu update...');
            await fetchRequests(); // Refresh the full requests list
            
            // Add a small delay to ensure state updates are propagated
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // If the request detail modal is open, update the selected request data
            if (selectedRequest && selectedRequest.id === requestId) {
              try {
                const refreshResponse = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${requestId}`);
                if (refreshResponse && refreshResponse.ok) {
                  const refreshedRequest = await refreshResponse.json();
                  setSelectedRequest(refreshedRequest);
                  console.log('Request data refreshed with new stok_kodu:', refreshedRequest.stok_kodu);
                }
              } catch (refreshError) {
                console.warn('Failed to refresh individual request data after stok_kodu update:', refreshError);
              }
            }
            
            // Clean up sessionStorage after successful update
            sessionStorage.removeItem('lastEditedRequestId');
          } else {
            console.error('[proceedWithSave] Failed to update request stok_kodu: ' + (updateResponse?.status || 'undefined'));
          }
        } catch (error) {
          console.error('[proceedWithSave] Request stok_kodu update error:', error);
        }
      }
      
      setIsLoading(false);
      
      return true;
      
    } catch (error) {
      console.error('Save error:', error);
      setError(`Kaydetme hatası: ${error.message}`);
      toast.error(`Kaydetme hatası: ${error.message}`);
      setIsLoading(false);
      return false;
    }
  };

  // Veritabanına kaydet - Yeni 1:1:n ilişki modeli ile
  const saveToDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Session'da mevcut ürünler varsa güncelle
      const updatedIds = await updateSessionProducts();
      if (updatedIds) {
        // Reçeteleri güncelle
        await saveRecipesToDatabase(updatedIds.mmIds, updatedIds.ymGtId, updatedIds.ymStIds);
        
        setDatabaseIds(updatedIds);
        setSavedToDatabase(true);
        setSuccessMessage('Veriler başarıyla güncellendi');
        toast.success('Veriler başarıyla güncellendi');
        
        // Session'daki ürünleri güncelle
        setSessionSavedProducts(updatedIds);
        
        setIsLoading(false);
        return;
      }
      
      // Talep kullanıldıysa, onaylama penceresi göstermeden işleme devam et
      if (isRequestUsed) {
        // İşleme devam edecek, popup ile onaylama daha sonra gösterilecek
      }
      
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      
      if (allYmSts.length === 0) {
        toast.error('En az bir YM ST seçmelisiniz veya oluşturmalısınız');
        setIsLoading(false);
        return;
      }
      
      // Ana YM ST'yi belirle
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      
      // Use the passed nextSequence parameter instead of recalculating
      // This ensures consistency with the sequence determined in checkForDuplicatesAndConfirm
      const sequence = nextSequence.toString().padStart(2, '0');
      setProcessSequence(sequence);
      // Process sequence set for both database and Excel operations
      
      const mmIds = [];
      const ymStIds = [];
      let ymGtId = null;


      // Create MM TT (Final product) with same sequence
      const productPrefix = mmData.product_type === 'TAVLI' ? 'BAG' : 'BALYA';
      const mmStokKodu = `TT.${productPrefix}.${capFormatted}.${sequence}`;
      const existingMmGt = await checkExistingProduct(API_URLS.tavliBalyaMm, mmStokKodu);
      
      if (existingMmGt) {
        // MM TT mevcut - güncelle
        const mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}/${existingMmGt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmTtDatabaseData(sequence))
        });
        if (mmResponse && mmResponse.ok) {
          mmIds.push(existingMmGt.id);
        }
      } else {
        // MM TT yeni - oluştur
        const mmResponse = await fetchWithAuth(API_URLS.tavliBalyaMm, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmTtDatabaseData(sequence))
        });
        
        if (mmResponse && mmResponse.ok) {
          const mmResult = await mmResponse.json();
          mmIds.push(mmResult.id);
        }
      }
      
      // Tüm YM ST'leri kaydet
      for (let i = 0; i < allYmSts.length; i++) {
        const ymSt = allYmSts[i];
        
        // YM ST kontrolü ve kaydetme
        if (ymSt.source === 'auto-generated' || ymSt.source === 'manual-added') {
          const existingYmSt = await checkExistingProduct(API_URLS.galYmSt, ymSt.stok_kodu);
          
          if (existingYmSt) {
            ymStIds.push(existingYmSt.id);
          } else {
            const ymStResponse = await fetchWithAuth(API_URLS.galYmSt, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(generateYmStDatabaseData(ymSt))
            });
            
            if (ymStResponse && ymStResponse.ok) {
              const ymStResult = await ymStResponse.json();
              ymStIds.push(ymStResult.id);
            }
          }
        } else {
          // Mevcut YM ST'nin ID'sini al
          ymStIds.push(ymSt.id);
        }
      }

      // ===============================================================================
      // CREATE INTERMEDIATE PRODUCTS (YM STP, YM TT) based on 4 production flows
      // YM YB removed - Both TAVLI and BALYA share the same YM TT intermediate
      // ===============================================================================
      let ymStpStokKodu = null;
      let ymTtStokKodu = null;

      // STEP 1: Create YM STP if pressing is needed (cap > 1.8mm)
      if (needsPressing) {
        const ymStpData = generateYmStpDatabaseData(mainYmSt, sequence);

        try {
          const ymStpResponse = await fetchWithAuth(API_URLS.tavliNetsisYmStp, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ymStpData)
          });

          if (ymStpResponse && ymStpResponse.ok) {
            const ymStpResult = await ymStpResponse.json();
            ymStpStokKodu = ymStpResult.stok_kodu;
            setYmStpData(ymStpResult);
            console.log('✅ YM STP created:', ymStpResult.stok_kodu);
          } else if (ymStpResponse && ymStpResponse.status === 409) {
            // 409 Conflict - product already exists, fetch it
            console.log('⚠️ YM STP already exists (409), fetching existing product...');
            const existingStokKodu = ymStpData.stok_kodu;
            console.log(`🔍 Searching for existing YM STP: ${existingStokKodu}`);

            const existingResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmStp}?stok_kodu=${encodeURIComponent(existingStokKodu)}`);
            if (existingResponse && existingResponse.ok) {
              const existingProducts = await existingResponse.json();
              if (existingProducts && existingProducts.length > 0) {
                ymStpStokKodu = existingProducts[0].stok_kodu;
                setYmStpData(existingProducts[0]);
                console.log(`✅ Found existing YM STP: ${ymStpStokKodu}`);
              } else {
                console.warn(`⚠️ YM STP search returned empty, using generated stok_kodu: ${existingStokKodu}`);
                ymStpStokKodu = existingStokKodu;
              }
            } else {
              console.warn(`⚠️ Failed to fetch existing YM STP, using generated stok_kodu: ${existingStokKodu}`);
              ymStpStokKodu = existingStokKodu;
            }
          } else {
            console.error(`❌ YM STP creation failed with status: ${ymStpResponse?.status}`);
          }
        } catch (error) {
          console.error('YM STP creation error:', error);
          toast.error('YM STP oluşturma hatası: ' + error.message);
        }
      }

      // STEP 2: Create YM TT (always) - source is either YM STP (if pressed) or YM ST
      const ymTtData = generateYmTtDatabaseData(mainYmSt, sequence, ymStpStokKodu);
      ymTtData.source_mm_stok_kodu = mmStokKodu; // Update with MM stok_kodu

      try {
        const ymTtResponse = await fetchWithAuth(API_URLS.tavliNetsisYmTt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ymTtData)
        });

        if (ymTtResponse && ymTtResponse.ok) {
          const ymTtResult = await ymTtResponse.json();
          ymTtStokKodu = ymTtResult.stok_kodu;
          setYmTtData(ymTtResult);
          console.log('✅ YM TT created:', ymTtResult.stok_kodu);
        } else if (ymTtResponse && ymTtResponse.status === 409) {
          // 409 Conflict - product already exists, fetch it
          console.log('⚠️ YM TT already exists (409), fetching existing product...');
          const existingStokKodu = ymTtData.stok_kodu;
          console.log(`🔍 Searching for existing YM TT: ${existingStokKodu}`);

          const existingResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmTt}?stok_kodu=${encodeURIComponent(existingStokKodu)}`);
          if (existingResponse && existingResponse.ok) {
            const existingProducts = await existingResponse.json();
            if (existingProducts && existingProducts.length > 0) {
              ymTtStokKodu = existingProducts[0].stok_kodu;
              setYmTtData(existingProducts[0]);
              console.log(`✅ Found existing YM TT: ${ymTtStokKodu}`);
            } else {
              console.warn(`⚠️ YM TT search returned empty, using generated stok_kodu: ${existingStokKodu}`);
              ymTtStokKodu = existingStokKodu;
            }
          } else {
            console.warn(`⚠️ Failed to fetch existing YM TT, using generated stok_kodu: ${existingStokKodu}`);
            ymTtStokKodu = existingStokKodu;
          }
        } else {
          console.error(`❌ YM TT creation failed with status: ${ymTtResponse?.status}`);
        }
      } catch (error) {
        console.error('YM TT creation error:', error);
        toast.error('YM TT oluşturma hatası: ' + error.message);
      }

      // Relationships are tracked via stok_kodu fields in intermediate tables:
      // - YM TT has: source_mm_stok_kodu, source_ym_st_stok_kodu
      // - YM STP has: source_ym_st_stok_kodu
      // No separate relationship table needed!

      // OLD RELATIONSHIP CODE - Keep for backward compatibility (may be removed later)
      try {
        await fetchWithAuth(API_URLS.tavliBalyaMmYmSt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mm_gt_id: mmIds[0],
            ym_st_id: ymStIds[mainYmStIndex]
            // is_main: Removed - not in database schema
          })
        });
      } catch (relationError) {
        console.log('İlişki zaten mevcut veya hata oluştu:', relationError);
      }

      // Reçeteleri kaydet - TT MM ve tüm YM ST'ler için (plus intermediate products)
      await saveRecipesToDatabase(mmIds, null, ymStIds, ymStpStokKodu, ymTtStokKodu);

      setDatabaseIds({
        mmIds: mmIds,
        ymStIds: ymStIds
      });

      // Session'da kaydedilen ürünleri takip et
      setSessionSavedProducts({
        mmIds: mmIds,
        ymStIds: ymStIds
      });
      
      setSavedToDatabase(true);
      setSuccessMessage('Veriler başarıyla veritabanına kaydedildi');
      toast.success('Veriler başarıyla veritabanına kaydedildi');
      
      // Update request table with correct stok_kodu if this was from a request
      // Check if we're working with a request by looking for recent PUT API calls in the session
      const requestIdFromSession = sessionStorage.getItem('lastEditedRequestId');
      
      if (requestIdOverride || requestIdFromSession || (selectedRequest && selectedRequest.id)) {
        const requestId = requestIdOverride || requestIdFromSession || selectedRequest.id;
        console.log(`🎯 [proceedWithSave] Request ID resolution: override=${requestIdOverride}, session=${requestIdFromSession}, selected=${selectedRequest?.id}, final=${requestId}`);
        try {
          const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
          const productPrefix = mmData.product_type === 'TAVLI' ? 'BAG' : 'BALYA';
          const actualStokKodu = `TT.${productPrefix}.${capFormatted}.${sequence}`;
          
          console.log('[proceedWithSave] Updating request ' + requestId + ' with correct stok_kodu: ' + actualStokKodu + ' (sequence: ' + sequence + ')');
          
          const updateResponse = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stok_kodu: actualStokKodu
            })
          });
          
          if (updateResponse && updateResponse.ok) {
            const updateResult = await updateResponse.json();
            toast.success('Talep stok kodu güncellendi');
            
            // Refresh request data to show updated stok_kodu
            console.log('Refreshing request data after stok_kodu update...');
            await fetchRequests(); // Refresh the full requests list
            
            // Add a small delay to ensure state updates are propagated
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Clean up sessionStorage after successful update
            sessionStorage.removeItem('lastEditedRequestId');
          } else {
            console.error('Failed to update request stok_kodu: ' + (updateResponse?.status || 'undefined'));
          }
        } catch (error) {
          console.error('Request stok_kodu update error:', error);
        }
      }
      
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (error) {
      console.error('Veritabanına kaydetme hatası:', error);
      setError('Veritabanına kaydetme hatası: ' + error.message);
      toast.error('Veritabanına kaydetme hatası: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Var olan ürün kontrolü
  const checkExistingProduct = async (apiUrl, stokKodu) => {
    try {
      if (!stokKodu) {
        console.error('Geçersiz stok_kodu ile ürün kontrolü yapılamaz:', stokKodu);
        return null;
      }
      
      const response = await fetchWithAuth(`${apiUrl}?stok_kodu=${encodeURIComponent(stokKodu)}`);
      if (response && response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data[0];
        } else {
          return null;
        }
      } else if (response && response.status === 404) {
      } else {
        console.error(`"${stokKodu}" stok kodu ile ürün kontrolü sırasında API hatası: ${response?.status || 'Bilinmiyor'}`);
      }
    } catch (error) {
      console.error(`"${stokKodu}" stok kodu ile ürün kontrol hatası:`, error.message);
    }
    return null;
  };

  // Veritabanı için MM TT verisi oluştur - Excel formatıyla tam uyuşum için güncellendi
  /**
   * Verilen bir sequence değerini kontrol eder ve geçerli olduğunu doğrular
   * @param {string} sequence - Kontrol edilecek sequence
   * @returns {string} - Doğrulanmış sequence değeri
   */
  const validateSequence = (sequence) => {
    if (!sequence) return '00';
    
    // Sequence değeri bir sayı ve 0-99 arasında olmalı
    if (!/^\d{1,2}$/.test(sequence)) {
      console.error(`Geçersiz sequence formatı: ${sequence}, varsayılan 00 kullanılıyor`);
      return '00';
    }
    
    // 1-9 arası değerleri 01-09 formatına dönüştür
    return sequence.padStart(2, '0');
  };

  /**
   * Bir sequence değerini bir arttırır ve doğru formatı sağlar
   * @param {string} sequence - Arttırılacak sequence
   * @returns {string} - Arttırılmış sequence değeri
   */
  const incrementSequence = (sequence) => {
    // Sequence null/undefined ise veya geçersiz ise 00 kullan
    if (!sequence || !/^\d{1,2}$/.test(sequence)) {
      console.warn(`Geçersiz sequence: ${sequence}, 00 ile başlanıyor`);
      return '00';
    }
    
    // İlk ürün için 00'dan başla, ikinci ürün için 01
    if (sequence === '00') {
      return '00'; // First product should be 00, not 01
    }
    
    // Mevcut sequence'i arttır
    const nextVal = parseInt(sequence, 10) + 1;
    
    // 99'dan büyükse 00'a geri dön (döngüsel)
    if (nextVal > 99) {
      console.warn('Sequence 99\'u aştı, 00\'a sıfırlanıyor');
      return '00';
    }
    
    // Padded 2-digit format ile dön
    return nextVal.toString().padStart(2, '0');
  };

  const generateMmTtDatabaseData = (sequence = '00') => {
    console.log('🏗️ === generateMmTtDatabaseData CALLED ===');
    console.log('🏗️ Input sequence:', sequence);
    console.log('🏗️ mmData state:', {
      cap: mmData.cap,
      product_type: mmData.product_type,
      yaglama_tipi: mmData.yaglama_tipi,
      min_mukavemet: mmData.min_mukavemet,
      max_mukavemet: mmData.max_mukavemet,
      kg: mmData.kg,
      ic_cap: mmData.ic_cap,
      dis_cap: mmData.dis_cap,
      tolerans_plus: mmData.tolerans_plus,
      tolerans_minus: mmData.tolerans_minus,
      shrink: mmData.shrink
    });

    // Sequence değerini doğrula
    const validSequence = validateSequence(sequence);
    const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
    const capValue = parseFloat(mmData.cap);

    console.log('🏗️ Formatted values:', {
      validSequence,
      capFormatted,
      capValue
    });

    // Preserve the exact format in existing Excel files
    const capForExcel = capValue.toFixed(2);
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    console.log('🏗️ Adjusted tolerances:', { adjustedPlus, adjustedMinus });

    // Determine product prefix based on product type
    const productPrefix = mmData.product_type === 'TAVLI' ? 'BAG' : 'BALYA';
    const stokKodu = `TT.${productPrefix}.${capFormatted}.${validSequence}`;

    console.log('🏗️ Generated stok_kodu:', stokKodu);

    // Generate stok_adi and log it
    const generatedStokAdi = generateStokAdi();
    console.log('🏗️ Generated stok_adi:', generatedStokAdi);
    console.log('🏗️ stok_adi length:', generatedStokAdi?.length || 0);
    console.log('🏗️ stok_adi is undefined?', generatedStokAdi === undefined);
    console.log('🏗️ stok_adi is null?', generatedStokAdi === null);

    // Hem stok_kodu'nda hem de içeride kullanılan sequence değerini güncel tut
    return {
      stok_kodu: stokKodu,
      stok_adi: generatedStokAdi,
      product_type: mmData.product_type, // TAVLI or BALYA
      // ✅ FIX: Database constraint chk_product_type_yaglama only allows yaglama_tipi for BALYA products
      // TAVLI products must have NULL yaglama_tipi (yaglama info is already in stok_adi)
      yaglama_tipi: mmData.product_type === 'BALYA' ? (mmData.yaglama_tipi || '') : null,
      grup_kodu: 'MM',
      kod_1: 'TT', // Changed from GT to TT
      turu: 'M',
      mamul_grup: stokKodu,
      muh_detay: '26',
      depo_kodu: '36',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1.000, // KG to TN conversion - matches database format
      cevrim_degeri_1: 0.00, // Conversion rate - matches database format
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      cap: capValue, // Store as number for calculations
      min_mukavemet: parseInt(mmData.min_mukavemet),
      max_mukavemet: parseInt(mmData.max_mukavemet),
      kg: parseInt(mmData.kg),
      ic_cap: parseInt(mmData.ic_cap),
      dis_cap: parseInt(mmData.dis_cap),
      cap2: capForExcel, // Use formatted string value
      tolerans_plus: adjustedPlus,
      tolerans_minus: adjustedMinus,
      shrink: mmData.shrink,
      unwinding: mmData.unwinding || '',
      cast_kont: mmData.cast_kont || '',
      helix_kont: mmData.helix_kont || '',
      elongation: mmData.elongation || '',
      amb_shrink: getShrinkCode(mmData.ic_cap),
      satis_kdv_orani: '20', // Match Excel format as string
      alis_kdv_orani: '20', // Match Excel format as string
      stok_turu: 'D',
      fiyat_birimi: 1,
      satis_tipi: 1,
      birim_agirlik: parseInt(mmData.kg),
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H',
      alis_doviz_tipi: 2,
      gumruk_tarife_kodu: getGumrukTarifeKodu(),
      ingilizce_isim: generateEnglishName(),
      // Technical spec columns - match Excel format exactly
      metarial: 'Low Carbon Steel Wire',
      dia_mm: capForExcel, // Use formatted string value
      dia_tol_mm_plus: adjustedPlus,
      dia_tol_mm_minus: adjustedMinus,
      // ✅ REMOVED: Database table doesn't have kaplama/zinc_coating column at all
      tensile_st_min: `${mmData.min_mukavemet} MPa`,
      tensile_st_max: `${mmData.max_mukavemet} MPa`,
      wax: mmData.product_type === 'BALYA' ? '+' : 'NONE', // '+' for BALYA, 'NONE' for TAVLI
      lifting_lugs: mmData.shrink === 'evet' ? 'YES' : 'NO',
      coil_dimensions_id: mmData.ic_cap.toString(),
      coil_dimensions_od: mmData.dis_cap.toString(),
      coil_weight: mmData.kg.toString(),
      coil_weight_min: (parseInt(mmData.kg) * 0.95).toFixed(0),
      coil_weight_max: (parseInt(mmData.kg) * 1.05).toFixed(0),
      tolerans_aciklama: getToleransAciklama()
    };
  };


  // Veritabanı için YM ST verisi oluştur - Excel formatına tam uyumlu
  const generateYmStDatabaseData = (ymSt) => {
    const capValue = parseFloat(ymSt.cap);
    const capForExcel = capValue.toFixed(2);
    
    return {
      stok_kodu: ymSt.stok_kodu,
      stok_adi: ymSt.stok_adi,
      grup_kodu: 'YM',
      kod_1: 'ST',
      kod_2: ymSt.filmasin.toString().padStart(4, '0'), // ✅ FIXED - Ensure 4-digit format (600 → "0600")
      kod_3: ymSt.quality, // Store quality value in kod_3 to match Excel
      muh_detay: '28',
      depo_kodu: '35',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1000.000, // KG to TN conversion - CORRECT for YM ST (differs from MM TT/YM TT)
      cevrim_degeri_1: 0.00, // Conversion rate - matches database format
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      satis_kdv_orani: '20', // Match Excel format as string
      cap: ymSt.cap,
      filmasin: parseFloat(ymSt.filmasin).toFixed(4), // Database uses decimal with 4 decimal places (e.g., 6.0000)
      quality: ymSt.quality,
      ozel_saha_1_say: 1, // ✅ FIXED - Must ALWAYS be 1 for all YM ST products (NOT filmasin value!)
      birim_agirlik: ymSt.kg || 0,
      fiyat_birimi: 1,
      doviz_tip: 1,
      stok_turu: 'D',
      ingilizce_isim: `YM Black Wire ${capForExcel} mm Quality: ${ymSt.quality}`,
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H',
      priority: ymSt.priority !== undefined ? ymSt.priority : 0 // Default to 0 for main products
    };
  };

  // Generate YM STP (Pressed Siyah Tel) - Only for cap > 1.8mm
  const generateYmStpDatabaseData = (ymSt, sequence) => {
    const capValue = parseFloat(ymSt.cap);
    const stokKodu = `${ymSt.stok_kodu}.P`; // Add .P suffix for pressed

    return {
      stok_kodu: stokKodu,
      stok_adi: `YM Presleme Siyah Tel ${capValue.toFixed(2)} mm Quality: ${ymSt.quality}`,
      grup_kodu: 'YM',
      kod_1: 'STP',
      kod_2: ymSt.filmasin.toString().padStart(4, '0'),
      kod_3: ymSt.quality,
      turu: 'Y', // Yarı mamul (Semi-finished)
      muh_detay: '28',
      depo_kodu: '35',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1000.000, // Same as YM ST
      cevrim_degeri_1: 0.00,
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      cap: capValue,
      filmasin: parseFloat(ymSt.filmasin).toFixed(4),
      quality: ymSt.quality, // Database field name is 'quality' not 'kalite'
      min_mukavemet: mmData.min_mukavemet ? parseInt(mmData.min_mukavemet) : null,
      max_mukavemet: mmData.max_mukavemet ? parseInt(mmData.max_mukavemet) : null,
      ic_cap: mmData.ic_cap ? parseInt(mmData.ic_cap) : null,
      dis_cap: mmData.dis_cap ? parseInt(mmData.dis_cap) : null,
      kg: mmData.kg ? parseInt(mmData.kg) : null,
      tolerans_plus: mmData.tolerans_plus,
      tolerans_minus: mmData.tolerans_minus,
      satis_kdv_orani: '20',
      stok_turu: 'D',
      fiyat_birimi: 1,
      doviz_tip: 1,
      birim_agirlik: mmData.kg || 0,
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H',
      ingilizce_isim: `YM Pressed Black Wire ${capValue.toFixed(2)} mm Quality: ${ymSt.quality}`,
      ozel_saha_1_say: 1,
      priority: 0,
      source_ym_st_stok_kodu: ymSt.stok_kodu || null,
      sequence: sequence,
      created_by: user?.name || 'system',
      notes: `Presleme için oluşturuldu - Cap > 1.8mm`
    };
  };

  // Generate YM TT (Tavli Tel Intermediate) - Always created
  const generateYmTtDatabaseData = (ymSt, sequence, sourceYmStpStokKodu = null) => {
    // ✅ CRITICAL FIX: YM TT uses MM cap (like YM GT uses MM GT cap in GalvanizliTelNetsis)
    // NOT YM ST cap! This matches the GalvanizliTelNetsis logic.
    const capValue = parseFloat(mmData.cap);
    const capFormatted = Math.round(capValue * 100).toString().padStart(4, '0');
    // ✅ FIXED: YM TT is SHARED by both TAVLI and BALYA - NO BAG/BALYA prefix
    // Format: YM.TT.XXXX.XX (e.g., YM.TT.0190.00)
    const stokKodu = `YM.TT.${capFormatted}.${sequence}`;

    console.log(`\n🔍 === YM TT GENERATION DEBUG ===`);
    console.log(`📏 YM ST cap (input): ${ymSt.cap}mm`);
    console.log(`📏 MM cap (USED): ${capValue}mm`);
    console.log(`📦 Generated YM TT: ${stokKodu}`);
    console.log(`✅ Correct: Uses MM cap, NOT YM ST cap\n`);

    // ✅ FIXED: Generate stock name like genel4.csv - NO yaglama, full specs
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();
    const bagAmount = mmData.cast_kont && mmData.cast_kont.trim() !== '' ? `/${mmData.cast_kont}` : '';
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2);
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2);
    const toleranceText = `${formattedMinus}/${formattedPlus}`;
    const productName = mmData.product_type === 'TAVLI' ? 'YM Tavlı Tel' : 'YM Balya Tel';
    const stokAdi = `${productName} ${capValue.toFixed(2)} mm ${toleranceText} ${mmData.min_mukavemet || 0}-${mmData.max_mukavemet || 0} MPa ID:${mmData.ic_cap || 45} cm OD:${mmData.dis_cap || 75} cm ${mmData.kg || 0}${bagAmount} kg`;

    return {
      stok_kodu: stokKodu,
      stok_adi: stokAdi,
      product_type: mmData.product_type,
      grup_kodu: 'YM',
      kod_1: 'TT',
      kod_2: ymSt.filmasin.toString().padStart(4, '0'),
      turu: 'Y', // Yarı mamul (Semi-finished)
      mamul_grup: stokKodu,
      muh_detay: '28',
      depo_kodu: '35',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1.000, // Different from YM ST! (YM TT/YM YB use 1.000, not 1000.000)
      cevrim_degeri_1: 0.00,
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      cap: capValue,
      cap2: capValue.toFixed(2),
      kalite: ymSt.quality || '', // YM TT uses 'kalite' field (from source YM ST's quality)
      min_mukavemet: mmData.min_mukavemet ? parseInt(mmData.min_mukavemet) : null,
      max_mukavemet: mmData.max_mukavemet ? parseInt(mmData.max_mukavemet) : null,
      ic_cap: mmData.ic_cap ? parseInt(mmData.ic_cap) : null,
      dis_cap: mmData.dis_cap ? parseInt(mmData.dis_cap) : null,
      kg: mmData.kg ? parseInt(mmData.kg) : null,
      tolerans_plus: mmData.tolerans_plus,
      tolerans_minus: mmData.tolerans_minus,
      shrink: mmData.shrink,
      unwinding: mmData.unwinding || '',
      cast_kont: mmData.cast_kont || '',
      helix_kont: mmData.helix_kont || '',
      elongation: mmData.elongation || '',
      satis_kdv_orani: '20',
      alis_kdv_orani: '20',
      stok_turu: 'D',
      fiyat_birimi: 1,
      satis_tipi: 1,
      birim_agirlik: mmData.kg || 0,
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H',
      alis_doviz_tipi: 2,
      ingilizce_isim: `YM Annealed Wire ${mmData.product_type === 'TAVLI' ? '(Bag)' : '(Balya)'} ${capValue.toFixed(2)} mm`,
      source_mm_stok_kodu: null, // Will be set later after MM is created
      source_ym_st_stok_kodu: sourceYmStpStokKodu || ymSt.stok_kodu,
      sequence: sequence,
      created_by: user?.name || 'system',
      notes: `Tavlama sonrası ara ürün - ${mmData.product_type}`
    };
  };

  // Reçeteleri kaydet - Yeni 1:1:n ilişki modeli ile
  /**
   * Aynı cap, kod_2, vb. özelliklere sahip ürünler için en yüksek sequence değerini bulur
   * @returns {Promise<string>} - Bulunan en yüksek sequence değeri veya '00'
   */
  const findHighestSequence = async () => {
    try {
      // Çap ve kod_2 değerleri için arama kriterleri oluştur
      const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
      const productPrefix = getProductPrefix(mmData.product_type);
      const searchPattern = `${productPrefix}.${capFormatted}.`;
      
      // Tüm MM TT ürünlerini getir
      const mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?limit=1000`);
      if (!mmResponse || !mmResponse.ok) {
        console.warn('MM TT ürünleri alınamadı, sequence "00" kullanılacak');
        return '00';
      }
      
      const allMmGt = await mmResponse.json();
      if (!Array.isArray(allMmGt) || allMmGt.length === 0) {
        console.warn('MM TT ürünü bulunamadı, sequence "00" kullanılacak');
        return '00';
      }
      
      // Benzer ürünleri filtrele
      const similarProducts = allMmGt.filter(product => 
        product.stok_kodu && product.stok_kodu.startsWith(searchPattern)
      );
      
      if (similarProducts.length === 0) {
        console.log('Benzer ürün bulunamadı, sequence "00" kullanılacak');
        return '00';
      }
      
      // En yüksek sequence değerini bul
      let highestSequence = '00';
      
      for (const product of similarProducts) {
        const parts = product.stok_kodu.split('.');
        if (parts.length === 4) {
          const currentSequence = parts[3];
          
          // Mevcut sequence numerik değer kontrolü
          if (/^\d{2}$/.test(currentSequence)) {
            // Sayısal olarak karşılaştır (00 < 01 < 02 < ... < 99)
            if (parseInt(currentSequence, 10) > parseInt(highestSequence, 10)) {
              highestSequence = currentSequence;
            }
          }
        }
      }
      
      // Bir sonraki sequence değerini hesapla
      const nextSequenceNum = parseInt(highestSequence, 10) + 1;
      const nextSequence = nextSequenceNum.toString().padStart(2, '0');
      return nextSequence;
    } catch (error) {
      console.error('Sequence arama hatası:', error);
      return '00';
    }
  };
  
  // Function to proceed directly with queue logic (no confirmation modal)
  const showApprovalConfirmation = () => {
    if (isEditingRequest && selectedRequest) {
      // Skip modal, go directly to queue processing
      approveRequestAndContinue();
    } else {
      // If not editing a request, proceed normally
      continueSaveToDatabase(databaseIds.mmIds, databaseIds.ymGtId, databaseIds.ymStIds);
    }
  };
  
  // Function to approve the request and update its status through queue
  const approveRequestAndContinue = async () => {
    if (!selectedRequest) {
      toast.error('Seçili talep bulunamadı');
      return;
    }
    
    // KRİTİK: Sonsuz döngüyü önlemek için pendingApprovalAction'ı hemen temizle
    setPendingApprovalAction(null);
    
    // Kuyruğa task ekle ve gerçek işlemi kuyruk üzerinden yap
    const taskId = Date.now().toString();
    const newTask = {
      id: taskId,
      name: `Talep Düzenleniyor - ${selectedRequest.id}`,
      status: 'processing',
      startTime: Date.now()
    };
    
    // Kuyruğa ekle
    setTaskQueue(prev => [...prev, newTask]);
    taskQueueRef.current = [...taskQueueRef.current, newTask];
    
    try {
      // Gerçek veritabanı kaydetme işlemi - bu normal sürede çalışacak
      console.log('Veritabanına kayıt işlemi başlatılıyor...');
      await continueSaveToDatabase(databaseIds.mmIds, databaseIds.ymGtId, databaseIds.ymStIds);
      console.log('Veritabanına kayıt işlemi tamamlandı');
      
      // Talep onaylama işlemini kuyruk üzerinden yap
      console.log('Database save başarılı, request onaylama işlemi başlatılıyor...');
      
      // Generate the actual stok_kodu that was used during database save
      const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
      const productPrefix = mmData.product_type === 'TAVLI' ? 'BAG' : 'BALYA';
      const actualStokKodu = `TT.${productPrefix}.${capFormatted}.${processSequence}`;
      
      console.log('Updating request ' + selectedRequest.id + ' with new stok_kodu: ' + actualStokKodu + ' (sequence: ' + processSequence + ')');
      console.log('Original request stok_kodu: ' + selectedRequest.stok_kodu);
      
      // Prepare tracking data for the request update
      const currentProductKey = generateProductKey({
        stok_adi: generateMmTtStokAdi(),
        cap: mmData.cap,
        kalinlik: mmData.kalinlik,
        product_type: mmData.product_type,
        kalite: mmData.kalite,
        yaglama_tipi: mmData.yaglama_tipi,
        tensile_min: mmData.tensile_min,
        tensile_max: mmData.tensile_max
      });
      
      const changes = detectChanges();
      const changedFieldNames = changes.map(c => c.field);
      const changeSummary = generateChangeSummary(changes);
      
      const updateRequestData = {
        status: 'approved',
        processed_by: user?.username || user?.id || 'system',
        processed_at: new Date().toISOString(),
        stok_kodu: actualStokKodu, // Update with the actual stok_kodu used in database
        // Add tracking fields
        original_stok_adi: originalProductData?.mm?.stok_adi || selectedRequest.stok_adi || '',
        final_stok_adi: generateMmTtStokAdi(),
        original_product_key: originalProductData ? generateProductKey(originalProductData.mm) : '',
        final_product_key: currentProductKey,
        changed_fields: JSON.stringify(changedFieldNames),
        change_summary: changeSummary
      };
      
      console.log(`📤 Sending update request with data:`, updateRequestData);
      
      const updateResponse = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateRequestData)
      });
      
      if (!updateResponse || !updateResponse.ok) {
        // Kuyruk task'ını failed olarak işaretle
        setTaskQueue(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: 'failed', name: 'Talep Onaylama Hatası' }
            : t
        ));
        taskQueueRef.current = taskQueueRef.current.map(t => 
          t.id === taskId 
            ? { ...t, status: 'failed', name: 'Talep Onaylama Hatası' }
            : t
        );
        const errorText = await updateResponse?.text() || 'Unknown error';
        console.error('Failed to update request: ' + (updateResponse?.status || 'undefined') + ' - ' + errorText);
        throw new Error('Talep durumu güncellenemedi');
      }
      
      const updateResult = await updateResponse.json();
      
      // Excel dosyaları oluşturma işlemi
      console.log('Excel dosyalarını oluşturma işlemi başlatılıyor...');
      await generateExcelFiles();
      console.log('Excel dosyaları başarıyla oluşturuldu');
      
      // Refresh the request data and requests list
      console.log('Refreshing request data after approval update...');
      await fetchRequests();
      
      if (selectedRequest) {
        try {
          const refreshResponse = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${selectedRequest.id}`);
          if (refreshResponse && refreshResponse.ok) {
            const refreshedRequest = await refreshResponse.json();
            setSelectedRequest(refreshedRequest);
            console.log('Request data refreshed with new stok_kodu:', refreshedRequest.stok_kodu);
          }
        } catch (refreshError) {
          console.warn('Failed to refresh individual request data:', refreshError);
        }
      }
      
      // Kuyruk task'ını tamamlandı olarak işaretle
      setTaskQueue(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'completed', name: 'Talep Başarıyla Düzenlendi' }
          : t
      ));
      taskQueueRef.current = taskQueueRef.current.map(t => 
        t.id === taskId 
          ? { ...t, status: 'completed', name: 'Talep Başarıyla Düzenlendi' }
          : t
      );
      
      // Reset states
      setIsEditingRequest(false);
      setIsInApprovalProcess(false);
      setIsRequestUsed(false);
      
      toast.success('Talep başarıyla düzenlendi ve onaylandı!');
      console.log('İşlem tamamlandı: approveRequestAndContinue');
      
    } catch (error) {
      console.error('Talep onaylama hatası:', error);
      toast.error('Talep onaylanamadı: ' + error.message);
      
      // Kuyruk task'ını failed olarak işaretle
      setTaskQueue(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'failed', name: 'İşlem Hatası' }
          : t
      ));
      taskQueueRef.current = taskQueueRef.current.map(t => 
        t.id === taskId 
          ? { ...t, status: 'failed', name: 'İşlem Hatası' }
          : t
      );
    }
  };

  // ===================================================================
  // RECIPE GENERATION HELPER FUNCTIONS FOR 4 PRODUCTION FLOWS
  // ===================================================================

  /**
   * Save YM STP Recipes (Pressing) - Only for cap > 1.8mm
   * Recipe: YM.ST (Bileşen) + STPRS01 (Operasyon) + Auxiliary Components
   */
  /**
   * Save YM STP Recipes (Pressing) - WITH ALTERNATIVES using priority matrix
   * Recipe: Source (YM.ST) + STPRS01 (Operasyon) + Auxiliary Components
   * Generates multiple recipes for different priorities (0 = Main, 1 = ALT_1, 2 = ALT_2)
   * NOTE: YM STP is only created when cap > 1.8mm (pressing required)
   */
  const saveYmStpRecipes = async (ymStpStokKodu, ymStStokKodu, sequence, kg, allYmSts = []) => {
    try {
      console.log(`📝 Saving YM STP recipes WITH ALTERNATIVES for: ${ymStpStokKodu}`);

      // ✅ FIXED: Extract diameter from YM STP stock code
      // Format: YM.ST.XXXX.YYYY.ZZZZ.P (e.g., YM.ST.0186.0600.1006.P → 1.86mm)
      const diameterMatch = ymStpStokKodu.match(/YM\.ST\.(\d{4})\./);
      if (!diameterMatch) {
        console.error(`Cannot extract diameter from YM STP code: ${ymStpStokKodu}`);
        return;
      }
      const ymStpDiameter = parseInt(diameterMatch[1]) / 100;

      console.log(`YM STP diameter: ${ymStpDiameter}mm (pressing required for cap > 1.8mm)`);

      let ymStAlternatives = [];

      // ✅ FIXED: ALWAYS use COILER matrix for YM STP (up to 8 alternatives)
      if (allYmSts.length > 0) {
        console.log(`🔄 Generating YM STP alternatives using COILER matrix`);

        // Find actual YM ST products used
        const actualYmSts = allYmSts.filter(ym => ym && ym.stok_kodu && ym.stok_kodu.startsWith('YM.ST.'));

        // Get the main YM ST
        const mainYmSt = actualYmSts[0];
        if (!mainYmSt) {
          console.warn(`No YM ST products found for YM STP ${ymStpStokKodu}`);
          return;
        }

        // Priority 0 (main)
        ymStAlternatives = [
          { stokKodu: mainYmSt.stok_kodu, priority: 0, ymStDiameter: parseFloat(mainYmSt.cap) }
        ];

        // Determine COILER category based on YM STP diameter
        let category = null;
        if (ymStpDiameter === 0.84) category = '0.84';
        else if (ymStpDiameter === 1.16) category = '1.16';
        else if (ymStpDiameter <= 1.49) category = '≤1.49';
        else if (ymStpDiameter >= 1.50 && ymStpDiameter <= 1.79) category = '1.50-1.79';
        else if (ymStpDiameter >= 1.80 && ymStpDiameter <= 3.49) category = '1.80-3.49';
        else if (ymStpDiameter >= 3.50 && ymStpDiameter <= 3.99) category = '3.50-3.99';
        else if (ymStpDiameter >= 4.00 && ymStpDiameter <= 6.99) category = '4.00-6.99';
        else if (ymStpDiameter >= 7.00 && ymStpDiameter <= 7.99) category = '7.00-7.99';
        else if (ymStpDiameter >= 8.00) category = '≥8.00';

        if (category) {
          const alternatives = COILER_ALTERNATIVE_MATRIX[category];
          console.log(`📋 YM STP ${ymStpDiameter}mm → Category ${category}: ${alternatives.length} alternatives available`);

          alternatives.forEach(altDef => {
            // ✅ FIX: Include priority 0 (Alt 0) - changed from > 0 to >= 0
            if (altDef.priority >= 0) {
              const capCode = String(Math.round(altDef.cap * 100)).padStart(4, '0');
              const filmasinCode = String(Math.round(altDef.filmasin * 100)).padStart(4, '0');
              const stokKodu = `YM.ST.${capCode}.${filmasinCode}.${altDef.quality}`;

              ymStAlternatives.push({
                stokKodu: stokKodu,
                priority: altDef.priority,
                ymStDiameter: altDef.cap
              });
            }
          });
        }

        console.log(`✅ Generated ${ymStAlternatives.length} YM ST alternatives using COILER matrix (up to 8)`);
      } else {
        console.warn(`⚠️ No YM ST products provided for YM STP, cannot generate alternatives`);
        return;
      }

      if (ymStAlternatives.length === 0) {
        console.warn(`No YM ST alternatives found for diameter ${ymStpDiameter}mm`);
        return;
      }

      console.log(`Found ${ymStAlternatives.length} YM ST alternatives:`, ymStAlternatives.map(alt => `${alt.stokKodu} (priority ${alt.priority})`));

      // Delete existing recipes first
      const existingResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmStpRecete}?mamul_kodu=${encodeURIComponent(ymStpStokKodu)}`);
      if (existingResponse && existingResponse.ok) {
        const existing = await existingResponse.json();
        for (const recipe of existing) {
          await fetchWithAuth(`${API_URLS.tavliNetsisYmStpRecete}/${recipe.id}`, { method: 'DELETE' });
        }
      }

      // Generate recipes for each priority (Main + Alternatives)
      for (const alternative of ymStAlternatives) {
        let siraNo = 1;
        const recipes = [
          // 1. YM.ST (Bileşen - source black wire)
          {
            bilesen_kodu: alternative.stokKodu,
            operasyon_bilesen: 'B',
            miktar: 1.0, // 1:1 ratio
            olcu_br: 'KG',
            aciklama: 'Siyah Tel (Presleme Öncesi)',
            priority: alternative.priority
          },
          // 2. STPRS01 (Operasyon - pressing operation)
          {
            bilesen_kodu: 'STPRS01',
            operasyon_bilesen: 'O',
            miktar: getOperationDuration('STPRS01', kg), // ✅ UPDATED: Formula-based (4.5dk/650kg)
            olcu_br: 'DK',
            aciklama: 'Siyah Tel Presleme Operasyonu',
            priority: alternative.priority
          },
          // 3. Çelik Çember (Auxiliary) - Use Galvanizli code, x2 formula for pressing
          {
            bilesen_kodu: AUXILIARY_COMPONENTS['AMB.APEX CEMBER 38X080'],
            operasyon_bilesen: 'B',
            miktar: parseFloat((((1.2 * (1000 / kg)) / 1000) * 2).toFixed(5)), // Galvanizli formula x2 (pressing)
            olcu_br: 'AD',
            aciklama: 'Çelik Çember',
            priority: alternative.priority
          },
          // 4. Çember Tokası (Auxiliary) - Use Galvanizli code: AMB.TOKA.SIGNODE.114P. DKP
          {
            bilesen_kodu: AUXILIARY_COMPONENTS['AMB.TOKA.SIGNODE.114P. DKP'],
            operasyon_bilesen: 'B',
            miktar: parseFloat(((8.0 * (1000 / kg)) / 1000).toFixed(5)), // 8 pieces: 4 pressing + 4 packaging
            olcu_br: 'AD',
            aciklama: 'Çember Tokası',
            priority: alternative.priority
          },
          // 5. Kaldırma Kancası (Auxiliary) - Use Galvanizli code: SM.7MMHALKA
          {
            bilesen_kodu: AUXILIARY_COMPONENTS['SM.7MMHALKA'],
            operasyon_bilesen: 'B',
            miktar: parseFloat(((6.0 * (1000 / kg)) / 1000).toFixed(5)), // 6 pieces: 2 pressing + 4 packaging
            olcu_br: 'AD',
            aciklama: 'Kaldırma Kancası',
            priority: alternative.priority
          }
        ];

        // Save all recipes for this priority
        for (const recipe of recipes) {
          await fetchWithAuth(API_URLS.tavliNetsisYmStpRecete, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ym_stp_stok_kodu: ymStpStokKodu,
              mamul_kodu: ymStpStokKodu,
              bilesen_kodu: recipe.bilesen_kodu,
              operasyon_bilesen: recipe.operasyon_bilesen,
              miktar: recipe.miktar,
              olcu_br: recipe.olcu_br,
              aciklama: recipe.aciklama,
              priority: recipe.priority,
              sira_no: siraNo++,
              recete_toplama: '1',
              fire_orani: 0,
              olcu_br_bilesen: '1',
              ua_dahil_edilsin: recipe.operasyon_bilesen === 'O' ? 'E' : '',
              son_operasyon: recipe.operasyon_bilesen === 'O' ? 'E' : ''
            })
          });
        }

        console.log(`  ✅ Priority ${alternative.priority} recipes saved (${siraNo - 1} items) - Source: ${alternative.stokKodu}`);
      }

      console.log(`✅ YM STP recipes saved: ${ymStAlternatives.length} priorities with alternatives`);
    } catch (error) {
      console.error('YM STP recipe save error:', error);
      throw error;
    }
  };

  /**
   * Save YM TT Recipes (Annealing) - WITH ALTERNATIVES using FILMAŞIN matrix (like YM GT)
   * Recipe: Source (YM.ST or YM.STP) + TAV01 (Operasyon) + Auxiliary Components
   * Generates multiple recipes for different priorities (0 = Main, 1 = ALT_1, 2 = ALT_2)
   *
   * LOGIC (mirroring GalvanizliTel):
   * - < 1.5mm: MAIN only (no alternatives)
   * - 1.5-1.8mm: MAIN + ALT 1 (.ST coiler, yellow) + ALT 2 (FILMAŞIN priority 2)
   * - >= 1.8mm: MAIN + ALT 1 (FILMAŞIN priority 1 + .P) + ALT 2 (FILMAŞIN priority 2 + .P)
   */
  const saveYmTtRecipes = async (ymTtStokKodu, sourceStokKodu, sequence, kg, allYmSts = []) => {
    try {
      console.log(`📝 Saving YM TT recipes WITH ALTERNATIVES (FILMAŞIN matrix) for: ${ymTtStokKodu}`);

      // Extract diameter from YM TT stock code (e.g., YM.TT.0196.00 → 1.96mm)
      const diameterMatch = ymTtStokKodu.match(/YM\.TT\.(\d{4})\./);
      if (!diameterMatch) {
        console.error(`Cannot extract diameter from YM TT code: ${ymTtStokKodu}`);
        return;
      }
      const ymTtDiameter = parseInt(diameterMatch[1]) / 100;
      const needsPressing = ymTtDiameter >= 1.8;

      console.log(`YM TT diameter: ${ymTtDiameter}mm, Needs pressing: ${needsPressing}`);

      // Find actual YM ST products used
      const actualYmSts = allYmSts.filter(ym => ym && ym.stok_kodu && ym.stok_kodu.startsWith('YM.ST.'));
      console.log(`📦 Found ${actualYmSts.length} YM ST products:`, actualYmSts.map(y => y.stok_kodu));

      // Get the main YM ST
      const mainYmSt = actualYmSts[0];
      if (!mainYmSt) {
        console.warn(`No YM ST products found for YM TT ${ymTtStokKodu}`);
        return;
      }

      const ymStDiameter = parseFloat(mainYmSt.cap);
      let ymStAlternatives = [];

      // ========== Alternative Generation Logic (mirroring GalvanizliTel) ==========

      if (ymStDiameter < 1.5) {
        // CASE 1: < 1.5mm → MAIN only (no alternatives)
        console.log(`📍 YM ST < 1.5mm: MAIN only, NO alternatives`);

        // Determine source: .P suffix if pressing needed
        const sourceKodu = needsPressing ? `${mainYmSt.stok_kodu}.P` : mainYmSt.stok_kodu;

        ymStAlternatives = [
          { stokKodu: sourceKodu, priority: 0, ymStDiameter: ymStDiameter }
        ];

      } else {
        // CASE 2 & 3: >= 1.5mm → Use FILMAŞIN matrix (like YM GT)
        console.log(`📍 YM ST >= 1.5mm: Using FILMAŞIN matrix for alternatives`);

        // Get FILMAŞIN alternatives for this diameter
        const matrixAlts = getMatrixAlternatives(ymStDiameter);

        if (!matrixAlts || matrixAlts.length === 0) {
          console.warn(`⚠️ No FILMAŞIN alternatives found for ${ymStDiameter}mm, using MAIN only`);
          const sourceKodu = needsPressing ? `${mainYmSt.stok_kodu}.P` : mainYmSt.stok_kodu;
          ymStAlternatives = [
            { stokKodu: sourceKodu, priority: 0, ymStDiameter: ymStDiameter }
          ];
        } else {
          // Priority 0 (MAIN): Use main YM.ST (with .P if pressing)
          const sourceKodu = needsPressing ? `${mainYmSt.stok_kodu}.P` : mainYmSt.stok_kodu;
          ymStAlternatives.push({
            stokKodu: sourceKodu,
            priority: 0,
            ymStDiameter: ymStDiameter
          });

          // Special case: 1.5-1.8mm range
          if (ymStDiameter >= 1.5 && ymStDiameter < 1.8) {
            console.log(`   📌 Special 1.5-1.8mm range: Add .ST coiler (yellow) as ALT 1`);

            // ALT 1: .ST coiler product (yellow row - NO .P suffix!)
            const capStr = Math.round(ymStDiameter * 100).toString().padStart(4, '0');
            const stCoilerKodu = `YM.ST.${capStr}.ST`;

            ymStAlternatives.push({
              stokKodu: stCoilerKodu,
              priority: 1,
              ymStDiameter: ymStDiameter,
              isCoilerYellow: true // Flag for Excel yellow coloring
            });

            // ALT 2: FILMAŞIN priority 2 (if exists)
            const alt2 = matrixAlts.find(alt => alt.priority === 2);
            if (alt2) {
              const capCode = String(Math.round(ymStDiameter * 100)).padStart(4, '0');
              const filmasinCode = String(Math.round(alt2.diameter * 100)).padStart(4, '0');
              let stokKodu = `YM.ST.${capCode}.${filmasinCode}.${alt2.quality}`;

              // NO .P for 1.5-1.8mm range (< 1.8mm means no pressing)

              ymStAlternatives.push({
                stokKodu: stokKodu,
                priority: 2,
                ymStDiameter: alt2.cap
              });
            }

          } else {
            // >= 1.8mm range: Use FILMAŞIN alternatives with .P suffix
            console.log(`   📌 >= 1.8mm range: Use FILMAŞIN ALT 1 & 2 with .P suffix`);

            // ALT 1: FILMAŞIN priority 1 + .P
            const alt1 = matrixAlts.find(alt => alt.priority === 1);
            if (alt1) {
              const capCode = String(Math.round(ymStDiameter * 100)).padStart(4, '0');
              const filmasinCode = String(Math.round(alt1.diameter * 100)).padStart(4, '0');
              let stokKodu = `YM.ST.${capCode}.${filmasinCode}.${alt1.quality}`;

              // Add .P suffix since pressing needed
              if (needsPressing) {
                stokKodu += '.P';
              }

              ymStAlternatives.push({
                stokKodu: stokKodu,
                priority: 1,
                ymStDiameter: alt1.cap
              });
            }

            // ALT 2: FILMAŞIN priority 2 + .P
            const alt2 = matrixAlts.find(alt => alt.priority === 2);
            if (alt2) {
              const capCode = String(Math.round(ymStDiameter * 100)).padStart(4, '0');
              const filmasinCode = String(Math.round(alt2.diameter * 100)).padStart(4, '0');
              let stokKodu = `YM.ST.${capCode}.${filmasinCode}.${alt2.quality}`;

              // Add .P suffix since pressing needed
              if (needsPressing) {
                stokKodu += '.P';
              }

              ymStAlternatives.push({
                stokKodu: stokKodu,
                priority: 2,
                ymStDiameter: alt2.cap
              });
            }
          }
        }
      }

      if (ymStAlternatives.length === 0) {
        console.warn(`No YM ST alternatives generated for diameter ${ymTtDiameter}mm`);
        return;
      }

      console.log(`✅ Generated ${ymStAlternatives.length} YM TT alternatives using FILMAŞIN matrix:`);
      ymStAlternatives.forEach(alt => {
        const yellowFlag = alt.isCoilerYellow ? ' (YELLOW ROW - COILER)' : '';
        console.log(`   Priority ${alt.priority}: ${alt.stokKodu}${yellowFlag}`);
      });

      // ========== CRITICAL FIX: Create missing alternative YM ST and YM STP products ==========
      // Before creating YM TT recipes that reference alternatives, ensure all products exist
      console.log(`\n🔧 CRITICAL FIX: Ensuring all alternative products exist before creating recipes...`);

      for (const alternative of ymStAlternatives) {
        // Skip priority 0 (main) - it already exists
        if (alternative.priority === 0) continue;

        const altStokKodu = alternative.stokKodu;

        // Extract base YM ST code (remove .P suffix if present)
        const baseYmStKodu = altStokKodu.replace(/\.P$/, '');
        const hasPSuffix = altStokKodu.endsWith('.P');

        console.log(`\n   📌 Checking alternative (priority ${alternative.priority}): ${altStokKodu}`);

        // Parse the YM ST code to get details (format: YM.ST.CCCC.FFFF.QQQQ)
        const ymStMatch = baseYmStKodu.match(/YM\.ST\.(\d{4})\.(\d{4})\.(\d{4})/);
        if (!ymStMatch) {
          console.warn(`   ⚠️ Cannot parse YM ST code: ${baseYmStKodu}, skipping...`);
          continue;
        }

        const [_, capCode, filmasinCode, qualityCode] = ymStMatch;
        const cap = parseInt(capCode) / 100;
        const filmasin = parseInt(filmasinCode) / 100;
        const quality = qualityCode;

        // STEP 1: Check if base YM ST exists, if not create it + recipe
        console.log(`   🔍 Checking if YM ST exists: ${baseYmStKodu}`);
        const ymStCheckResponse = await fetchWithAuth(`${API_URLS.galYmSt}?stok_kodu=${encodeURIComponent(baseYmStKodu)}`);

        if (ymStCheckResponse && ymStCheckResponse.ok) {
          const existingYmSt = await ymStCheckResponse.json();

          if (!existingYmSt || existingYmSt.length === 0) {
            console.log(`   ❌ YM ST not found, creating: ${baseYmStKodu}`);

            // Create YM ST product
            const ymStData = {
              stok_kodu: baseYmStKodu,
              stok_adi: `YM Siyah Tel ${cap.toFixed(2)} mm HM:${filmasinCode}.${quality}`,
              grup_kodu: 'YM',
              kod_1: 'ST',
              cap: cap,
              filmasin: filmasin,
              quality: quality,
              kdv_orani: 20,
              muh_detay: '28',
              depo_kodu: '35',
              stok_turu: 'D'
            };

            const ymStCreateResponse = await fetchWithAuth(API_URLS.galYmSt, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ymStData)
            });

            if (ymStCreateResponse && ymStCreateResponse.ok) {
              console.log(`   ✅ YM ST created: ${baseYmStKodu}`);

              // Create YM ST recipe (FLM → YM ST)
              const flmCode = `FLM.${filmasinCode}.${quality}`;
              console.log(`   📝 Creating YM ST recipe: ${flmCode} → ${baseYmStKodu}`);

              // Delete existing recipes first
              const existingRecipeResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_stok_kodu=${encodeURIComponent(baseYmStKodu)}`);
              if (existingRecipeResponse && existingRecipeResponse.ok) {
                const existingRecipes = await existingRecipeResponse.json();
                for (const recipe of existingRecipes) {
                  await fetchWithAuth(`${API_URLS.galYmStRecete}/${recipe.id}`, { method: 'DELETE' });
                }
              }

              // Create FLM component
              await fetchWithAuth(API_URLS.galYmStRecete, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ym_st_stok_kodu: baseYmStKodu,
                  mamul_kodu: baseYmStKodu,
                  bilesen_kodu: flmCode,
                  operasyon_bilesen: 'B',
                  miktar: 1.0,
                  olcu_br: 'KG',
                  aciklama: 'Filmaşin Tüketimi',
                  sira_no: 1,
                  recete_toplama: '1',
                  olcu_br_bilesen: '1'
                })
              });

              // Create TLC01 operation
              await fetchWithAuth(API_URLS.galYmStRecete, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ym_st_stok_kodu: baseYmStKodu,
                  mamul_kodu: baseYmStKodu,
                  bilesen_kodu: 'TLC01',
                  operasyon_bilesen: 'O',
                  miktar: 0.002,
                  olcu_br: 'DK',
                  aciklama: 'Tel Çekme Operasyonu',
                  sira_no: 2,
                  recete_toplama: '1',
                  olcu_br_bilesen: '1',
                  uretim_suresi: 0.002,
                  ua_dahil_edilsin: 'E',
                  son_operasyon: 'E'
                })
              });

              console.log(`   ✅ YM ST recipe created`);
            } else {
              console.error(`   ❌ Failed to create YM ST: ${baseYmStKodu}`);
            }
          } else {
            console.log(`   ✅ YM ST already exists: ${baseYmStKodu}`);
          }
        }

        // STEP 2: If .P suffix, check if YM STP exists, if not create it + recipe
        if (hasPSuffix) {
          const ymStpKodu = altStokKodu; // Full code with .P
          console.log(`   🔍 Checking if YM STP exists: ${ymStpKodu}`);

          const ymStpCheckResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmStp}?stok_kodu=${encodeURIComponent(ymStpKodu)}`);

          if (ymStpCheckResponse && ymStpCheckResponse.ok) {
            const existingYmStp = await ymStpCheckResponse.json();

            if (!existingYmStp || existingYmStp.length === 0) {
              console.log(`   ❌ YM STP not found, creating: ${ymStpKodu}`);

              // Create YM STP product
              const ymStpData = {
                stok_kodu: ymStpKodu,
                stok_adi: `YM Preslenmiş Tel ${cap.toFixed(2)} mm`,
                grup_kodu: 'YM',
                kod_1: 'STP',
                kod_2: filmasinCode,
                kod_3: quality,
                cap: cap,
                kdv_orani: 20,
                muh_detay: '28',
                depo_kodu: '35',
                stok_turu: 'D'
              };

              const ymStpCreateResponse = await fetchWithAuth(API_URLS.tavliNetsisYmStp, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ymStpData)
              });

              if (ymStpCreateResponse && ymStpCreateResponse.ok) {
                console.log(`   ✅ YM STP created: ${ymStpKodu}`);

                // Create YM STP recipe (YM ST → YM STP with pressing)
                console.log(`   📝 Creating YM STP recipe: ${baseYmStKodu} → ${ymStpKodu}`);

                // Delete existing recipes first
                const existingRecipeResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmStpRecete}?mamul_kodu=${encodeURIComponent(ymStpKodu)}`);
                if (existingRecipeResponse && existingRecipeResponse.ok) {
                  const existingRecipes = await existingRecipeResponse.json();
                  for (const recipe of existingRecipes) {
                    await fetchWithAuth(`${API_URLS.tavliNetsisYmStpRecete}/${recipe.id}`, { method: 'DELETE' });
                  }
                }

                let siraNo = 1;

                // Create YM ST source component
                await fetchWithAuth(API_URLS.tavliNetsisYmStpRecete, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ym_stp_stok_kodu: ymStpKodu,
                    mamul_kodu: ymStpKodu,
                    bilesen_kodu: baseYmStKodu,
                    operasyon_bilesen: 'B',
                    miktar: 1.0,
                    olcu_br: 'KG',
                    aciklama: 'Siyah Tel (Presleme Öncesi)',
                    priority: 0,
                    sira_no: siraNo++,
                    recete_toplama: '1',
                    olcu_br_bilesen: '1'
                  })
                });

                // Create STPRS01 operation
                const pressingDuration = (4.5 / 650) * kg;
                await fetchWithAuth(API_URLS.tavliNetsisYmStpRecete, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ym_stp_stok_kodu: ymStpKodu,
                    mamul_kodu: ymStpKodu,
                    bilesen_kodu: 'STPRS01',
                    operasyon_bilesen: 'O',
                    miktar: parseFloat(pressingDuration.toFixed(6)),
                    olcu_br: 'DK',
                    aciklama: 'Siyah Tel Presleme Operasyonu',
                    priority: 0,
                    sira_no: siraNo++,
                    recete_toplama: '1',
                    olcu_br_bilesen: '1',
                    uretim_suresi: parseFloat(pressingDuration.toFixed(6)),
                    ua_dahil_edilsin: 'E',
                    son_operasyon: 'E'
                  })
                });

                // Create auxiliary components (Çelik Çember, Toka, Halka)
                await fetchWithAuth(API_URLS.tavliNetsisYmStpRecete, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ym_stp_stok_kodu: ymStpKodu,
                    mamul_kodu: ymStpKodu,
                    bilesen_kodu: 'SM-AMB-000017', // Çelik Çember
                    operasyon_bilesen: 'B',
                    miktar: parseFloat((2.4 * (1000 / kg) / 1000).toFixed(5)),
                    olcu_br: 'AD',
                    aciklama: 'Çelik Çember',
                    priority: 0,
                    sira_no: siraNo++,
                    recete_toplama: '1',
                    olcu_br_bilesen: '1'
                  })
                });

                await fetchWithAuth(API_URLS.tavliNetsisYmStpRecete, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ym_stp_stok_kodu: ymStpKodu,
                    mamul_kodu: ymStpKodu,
                    bilesen_kodu: 'SM-AMB-000018', // Çember Tokası
                    operasyon_bilesen: 'B',
                    miktar: parseFloat((8.0 * (1000 / kg) / 1000).toFixed(5)),
                    olcu_br: 'AD',
                    aciklama: 'Çember Tokası',
                    priority: 0,
                    sira_no: siraNo++,
                    recete_toplama: '1',
                    olcu_br_bilesen: '1'
                  })
                });

                await fetchWithAuth(API_URLS.tavliNetsisYmStpRecete, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ym_stp_stok_kodu: ymStpKodu,
                    mamul_kodu: ymStpKodu,
                    bilesen_kodu: 'SM-AMB-000023', // Kaldırma Kancası
                    operasyon_bilesen: 'B',
                    miktar: parseFloat((6.0 * (1000 / kg) / 1000).toFixed(5)),
                    olcu_br: 'AD',
                    aciklama: 'Kaldırma Kancası',
                    priority: 0,
                    sira_no: siraNo++,
                    recete_toplama: '1',
                    olcu_br_bilesen: '1'
                  })
                });

                console.log(`   ✅ YM STP recipe created with ${siraNo - 1} components`);
              } else {
                console.error(`   ❌ Failed to create YM STP: ${ymStpKodu}`);
              }
            } else {
              console.log(`   ✅ YM STP already exists: ${ymStpKodu}`);
            }
          }
        }
      }

      console.log(`\n✅ All alternative products ensured to exist. Proceeding with YM TT recipe creation...`);

      // Delete existing recipes first
      const existingResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmTtRecete}?mamul_kodu=${encodeURIComponent(ymTtStokKodu)}`);
      if (existingResponse && existingResponse.ok) {
        const existing = await existingResponse.json();
        for (const recipe of existing) {
          await fetchWithAuth(`${API_URLS.tavliNetsisYmTtRecete}/${recipe.id}`, { method: 'DELETE' });
        }
      }

      // Generate recipes for each priority (Main + Alternatives)
      for (const alternative of ymStAlternatives) {
        let siraNo = 1;
        const recipes = [
          // 1. Source (YM.ST with .P suffix if pressed)
          {
            bilesen_kodu: alternative.stokKodu,
            operasyon_bilesen: 'B',
            miktar: 1.0, // 1:1 ratio
            olcu_br: 'KG',
            aciklama: needsPressing ? 'Preslenmiş Siyah Tel' : 'Siyah Tel',
            priority: alternative.priority
          },
          // 2. TAV01 (Operasyon - annealing operation)
          {
            bilesen_kodu: 'TAV01',
            operasyon_bilesen: 'O',
            miktar: getOperationDuration('TAV01', kg), // ✅ UPDATED: 900 dk (15 hours)
            olcu_br: 'DK',
            aciklama: 'Tavlama Operasyonu',
            priority: alternative.priority
          },
          // 3. Çelik Çember (Auxiliary) - Use Galvanizli code
          {
            bilesen_kodu: AUXILIARY_COMPONENTS['AMB.APEX CEMBER 38X080'],
            operasyon_bilesen: 'B',
            miktar: parseFloat(((1.2 * (1000 / kg)) / 1000).toFixed(5)), // Galvanizli formula
            olcu_br: 'AD',
            aciklama: 'Çelik Çember',
            priority: alternative.priority
          },
          // 4. Çember Tokası (Auxiliary) - Use Galvanizli code: AMB.TOKA.SIGNODE.114P. DKP
          {
            bilesen_kodu: AUXILIARY_COMPONENTS['AMB.TOKA.SIGNODE.114P. DKP'],
            operasyon_bilesen: 'B',
            miktar: parseFloat(((4.0 * (1000 / kg)) / 1000).toFixed(5)), // Galvanizli formula
            olcu_br: 'AD',
            aciklama: 'Çember Tokası',
            priority: alternative.priority
          },
          // 5. Kaldırma Kancası (Auxiliary) - Use Galvanizli code: SM.7MMHALKA
          {
            bilesen_kodu: AUXILIARY_COMPONENTS['SM.7MMHALKA'],
            operasyon_bilesen: 'B',
            miktar: parseFloat(((4.0 * (1000 / kg)) / 1000).toFixed(5)), // Galvanizli formula
            olcu_br: 'AD',
            aciklama: 'Kaldırma Kancası',
            priority: alternative.priority
          }
        ];

        // Save all recipes for this priority
        for (const recipe of recipes) {
          await fetchWithAuth(API_URLS.tavliNetsisYmTtRecete, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ym_tt_stok_kodu: ymTtStokKodu,
              mamul_kodu: ymTtStokKodu,
              bilesen_kodu: recipe.bilesen_kodu,
              operasyon_bilesen: recipe.operasyon_bilesen,
              miktar: recipe.miktar,
              olcu_br: recipe.olcu_br,
              aciklama: recipe.aciklama,
              priority: recipe.priority,
              sira_no: siraNo++,
              recete_toplama: '1',
              fire_orani: 0,
              olcu_br_bilesen: '1',
              ua_dahil_edilsin: recipe.operasyon_bilesen === 'O' ? 'E' : '',
              son_operasyon: recipe.operasyon_bilesen === 'O' ? 'E' : ''
            })
          });
        }

        console.log(`  ✅ Priority ${alternative.priority} recipes saved (${siraNo - 1} items) - Source: ${alternative.stokKodu}`);
      }

      console.log(`✅ YM TT recipes saved: ${ymStAlternatives.length} priorities with alternatives`);
    } catch (error) {
      console.error('YM TT recipe save error:', error);
      throw error;
    }
  };

  /**
   * Save MM TT Recipes (Final Product Packaging)
   * Recipe: Source (YM.TT) + TVPKT01/BAL01 + Auxiliary Components
   */
  const saveMmTtRecipes = async (mmTtId, mmTtStokKodu, sourceStokKodu, mmRecipe, sequence) => {
    try {
      console.log(`📝 Saving MM TT recipes for: ${mmTtStokKodu}`);

      // Delete existing recipes first
      const existingResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}?mm_id=${mmTtId}`);
      if (existingResponse && existingResponse.ok) {
        const existing = await existingResponse.json();
        for (const recipe of existing) {
          await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}/${recipe.id}`, { method: 'DELETE' });
        }
      }

      let siraNo = 1;

      // Get shrink size from mmData
      const shrinkCode = getShrinkCode(mmData.ic_cap);

      // ✅ UPDATED: Recipe order (Streç removed, Çelik Çember added per user table)
      // Order: Source → Packaging Operation → KARTON (oiled) → SHRINK → HALKA (TAVLI) → PLASTIK ÇEMBER (oiled) → TOKA (TAVLI) → ÇELİK ÇEMBER (TAVLI) → PALET
      const recipeEntries = Object.entries(mmRecipe);

      console.log(`\n🔍 === SAVE MM TT RECIPE DEBUG for ${mmTtStokKodu} ===`);
      console.log(`📦 ALL mmRecipe keys:`, Object.keys(mmRecipe));
      console.log(`📝 sourceStokKodu parameter: ${sourceStokKodu}`);

      // ✅ FIXED: Match YM TT source by diameter pattern, ignoring sequence differences
      // Otomatik Doldur uses YM.TT.xxxx.00, but actual product has YM.TT.xxxx.01/02/etc
      const sourcePattern = sourceStokKodu.substring(0, sourceStokKodu.lastIndexOf('.')); // Get "YM.TT.0236" from "YM.TT.0236.01"
      const sourceEntry = recipeEntries.find(([key]) =>
        key === sourceStokKodu || key.startsWith(sourcePattern + '.')
      );
      const packagingEntry = recipeEntries.find(([key]) => key === 'TVPKT01' || key === 'BAL01');
      const kartonEntry = recipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL'); // Optional (oiled only)
      const shrinkEntry = recipeEntries.find(([key]) => key === shrinkCode);
      const halkaEntry = recipeEntries.find(([key]) => key === 'SM.7MMHALKA'); // TAVLI only
      const plastikCemberEntry = recipeEntries.find(([key]) => key === 'AMB.PLASTİK.ÇEMBER'); // Optional (oiled only)
      const tokaEntry = recipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP'); // TAVLI only
      const celikCemberEntry = recipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080'); // ✅ ADDED: Çelik Çember (TAVLI only)
      const paletEntry = recipeEntries.find(([key]) => key === 'AMB.PALET');
      // ❌ NO strecEntry - removed per gene2l.csv

      console.log(`\n🔎 Entry lookup results:`);
      console.log(`   sourceEntry (${sourceStokKodu}): ${sourceEntry ? `FOUND (${sourceEntry[1]})` : '❌ NOT FOUND'}`);
      console.log(`   packagingEntry (TVPKT01/BAL01): ${packagingEntry ? `FOUND (${packagingEntry[0]} = ${packagingEntry[1]})` : '❌ NOT FOUND'}`);
      console.log(`   kartonEntry: ${kartonEntry ? `FOUND (${kartonEntry[1]})` : '❌ NOT FOUND (oiled only)'}`);
      console.log(`   shrinkEntry (${shrinkCode}): ${shrinkEntry ? `FOUND (${shrinkEntry[1]})` : '❌ NOT FOUND'}`);
      console.log(`   halkaEntry (SM.7MMHALKA): ${halkaEntry ? `FOUND (${halkaEntry[1]})` : '❌ NOT FOUND (TAVLI only)'}`);
      console.log(`   plastikCemberEntry: ${plastikCemberEntry ? `FOUND (${plastikCemberEntry[1]})` : '❌ NOT FOUND (oiled only)'}`);
      console.log(`   tokaEntry: ${tokaEntry ? `FOUND (${tokaEntry[1]})` : '❌ NOT FOUND (TAVLI only)'}`);
      console.log(`   celikCemberEntry: ${celikCemberEntry ? `✅ FOUND (${celikCemberEntry[1]})` : '❌ NOT FOUND (TAVLI only)'}`);
      console.log(`   paletEntry: ${paletEntry ? `FOUND (${paletEntry[1]})` : '❌ NOT FOUND'}`);

      const orderedEntries = [
        sourceEntry,
        packagingEntry,
        kartonEntry,
        shrinkEntry,
        halkaEntry,
        plastikCemberEntry,
        tokaEntry,
        celikCemberEntry, // ✅ ADDED: Çelik Çember (TAVLI only)
        paletEntry
      ].filter(Boolean);

      console.log(`\n📊 ORDERED ENTRIES TO SAVE: ${orderedEntries.length} components`);
      orderedEntries.forEach(([key, value], idx) => {
        console.log(`   ${idx + 1}. ${key} = ${value}`);
      });

      for (const [key, value] of orderedEntries) {
        if (value > 0) {
          const operasyonBilesen = (key === 'TVPKT01' || key === 'BAL01') ? 'O' : 'B';
          let bilesenKodu = AUXILIARY_COMPONENTS[key] || key;

          console.log(`   💾 Saving recipe component #${siraNo}: ${key} → ${bilesenKodu} (${value})`);

          await fetchWithAuth(API_URLS.tavliBalyaMmRecete, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mm_id: mmTtId,
              mamul_kodu: mmTtStokKodu,
              bilesen_kodu: bilesenKodu,
              miktar: value,
              sira_no: siraNo++,
              operasyon_bilesen: operasyonBilesen,
              olcu_br: getOlcuBr(key),
              olcu_br_bilesen: '1',
              aciklama: getReceteAciklama(key),
              recete_top: 1,
              fire_orani: 0.0004,
              ua_dahil_edilsin: operasyonBilesen === 'O' ? 'E' : '',
              son_operasyon: operasyonBilesen === 'O' ? 'E' : '',
              uretim_suresi: operasyonBilesen === 'O' ? value : null
            })
          });
        }
      }

      console.log(`✅ MM TT recipes saved: ${siraNo - 1} items`);
    } catch (error) {
      console.error('MM TT recipe save error:', error);
      throw error;
    }
  };

  // The actual database save logic is defined below after saveRecipesToDatabase

  // This is the main function that gets called from UI
  const saveRecipesToDatabase = async (mmIds, ymGtId, ymStIds, ymStpStokKodu = null, ymTtStokKodu = null) => {
    console.log('saveRecipesToDatabase called - isEditingRequest:', isEditingRequest);
    console.log('Intermediate products:', { ymStpStokKodu, ymTtStokKodu });

    // Save the parameters to database IDs state for later use
    setDatabaseIds({
      mmIds: mmIds || [],
      ymGtId: ymGtId || '',
      ymStIds: ymStIds || []
    });

    // Always proceed with normal save
    // Request approval will be handled by the calling context (either approveRequestAndContinue or Sadece Kaydet button)
    console.log('Proceeding with database save only...');
    await continueSaveToDatabase(mmIds, ymGtId, ymStIds, ymStpStokKodu, ymTtStokKodu);
  };

  // The actual database save logic that was in the original saveRecipesToDatabase function
  const continueSaveToDatabase = async (mmIds, ymGtId, ymStIds, ymStpStokKodu = null, ymTtStokKodu = null) => {
    try {
      // If we're coming from the approval process, reset the editing state
      if (isEditingRequest) {
        setIsEditingRequest(false);
      }
      
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      
      // Sequence değeri MMGT ID'sinden değil, stok_kodu'ndan alınacak
      let sequence = processSequence || '00'; // Use processSequence state instead of hardcoded '00'
      
      let mmSequence = sequence; // Öncelikle sequence parametresini kullan
      let mmStokKodu = '';
      let ymGtSequence = sequence; // YMGT için de aynı sequence kullan
      let ymGtStokKodu = '';
      
      // 1. MMGT stok_kodu'nu direkt olarak veritabanından al
      if (mmIds.length > 0) {
        const mmId = mmIds[0];
        
        try {
          // MMGT'yi tüm liste içinden bulma yaklaşımı - 404 hatasını önlemek için
          const allMmGtResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?limit=1000`);
          if (allMmGtResponse && allMmGtResponse.ok) {
            const allMmGt = await allMmGtResponse.json();
            // ID'ye göre ilgili ürünü bul
            const mm = Array.isArray(allMmGt) ? allMmGt.find(item => item.id === mmId) : null;
            
            if (mm && mm.stok_kodu) {
              mmStokKodu = mm.stok_kodu;
              mmSequence = mm.stok_kodu.split('.').pop();
              
              if (mmSequence === '00') {
                console.warn(`UYARI: MMGT ürünü veritabanında "00" sequence ile kaydedilmiş`);
              } else {
              }
            } else {
              console.error(`MM TT veritabanında bulunamadı veya stok_kodu eksik! ID: ${mmId}`);
              // Ürün bulunamadı durumunda otomatik kod oluştur
              mmStokKodu = generateMmStokKodu(mmData.product_type, mmData.cap, '00');
              mmSequence = '00';
            }
          } else {
            console.error(`MM TT veritabanından alınamadı! ID: ${mmId}`);
            // API hatası durumunda otomatik kod oluştur
            mmStokKodu = generateMmStokKodu(mmData.product_type, mmData.cap, '00');
            mmSequence = '00';
          }
        } catch (error) {
          console.error(`MM TT bilgileri alınırken hata: ${error.message}`);
          // Hata durumunda otomatik kod oluştur
          mmStokKodu = generateMmStokKodu(mmData.product_type, mmData.cap, '00');
          mmSequence = '00';
        }
      }
      
      
      
      
      // ÖNEMLİ: Reçeteleri kaydetmeden önce, tüm mevcut reçeteleri sil
      // Bu şekilde yeni sequence'li reçeteler eklenecek
      
      // ===============================================================================
      // RECIPE GENERATION FOR 4 PRODUCTION FLOWS (Bottom-Up Order)
      // ===============================================================================
      // Flow 1 (TAVLI Simple): YM.ST → TAV01 → YM.TT → TVPKT01 → TT.BAG
      // Flow 2 (TAVLI Pressed): YM.ST → STPRS01 → YM.STP → TAV01 → YM.TT → TVPKT01 → TT.BAG
      // Flow 3 (BALYA Simple): YM.ST → TAV01 → YM.TT → BAL01 → TT.BALYA
      // Flow 4 (BALYA Pressed): YM.ST → STPRS01 → YM.STP → TAV01 → YM.TT → BAL01 → TT.BALYA
      // Both TAVLI and BALYA share the same YM.TT intermediate (no YM.YB)
      // ===============================================================================

      if (!mmStokKodu || !mainYmSt || !mainYmSt.stok_kodu) {
        console.error('Missing required data for recipe generation');
        toast.error('Reçete oluşturma için gerekli veriler eksik');
        return;
      }

      console.log(`🔧 Starting recipe generation for sequence: ${sequence}`);
      console.log('Product type:', mmData.product_type);
      console.log('Needs pressing:', !!ymStpStokKodu);

      try {
        // STEP 1: YM STP Recipes (if pressing needed - cap > 1.8mm)
        if (ymStpStokKodu) {
          console.log('⚙️ Generating YM STP recipes (pressing flow)...');
          await saveYmStpRecipes(ymStpStokKodu, mainYmSt.stok_kodu, sequence, mmData.kg, allYmSts); // ✅ FIXED: Pass allYmSts for COILER alternatives
        }

        // STEP 2: YM TT Recipes (always created - annealing)
        if (ymTtStokKodu) {
          console.log('⚙️ Generating YM TT recipes (annealing flow)...');
          const sourceForTt = ymStpStokKodu || mainYmSt.stok_kodu;
          await saveYmTtRecipes(ymTtStokKodu, sourceForTt, sequence, mmData.kg, allYmSts); // ✅ FIXED: Pass allYmSts for COILER alternatives
        }

        // STEP 3: MM TT Recipes (final product - packaging)
        // Both TAVLI and BALYA use YM.TT as source (no YM.YB intermediate)
        console.log('⚙️ Generating MM TT recipes (packaging flow)...');
        const sourceForMm = ymTtStokKodu;
        const mmRecipe = allRecipes.mmRecipes[mainYmStIndex] || {};
        await saveMmTtRecipes(mmIds[0], mmStokKodu, sourceForMm, mmRecipe, sequence);

        console.log('✅ All recipes generated successfully!');
      } catch (recipeError) {
        console.error('Recipe generation error:', recipeError);
        toast.error('Reçete oluşturma hatası: ' + recipeError.message);
        throw recipeError;
      }
      
      // Tüm YM ST reçetelerini kaydet - Excel formatıyla tam uyumlu
      for (let i = 0; i < ymStIds.length; i++) {
        const ymStId = ymStIds[i];
        const ymSt = [...selectedYmSts, ...autoGeneratedYmSts][i];
        const ymStRecipe = allRecipes.ymStRecipes[i] || {};
        
        // YM ST verisini kontrol et
        if (!ymSt || !ymSt.stok_kodu) {
          console.error(`YMST ${ymStId} için geçerli stok_kodu bulunamadı!`);
          continue; // Bir sonraki YMST'ye geç
        }

        // Kritik düzeltme - stok_kodu kullanarak direkt arama yap, ID kullanma
        // Bu yaklaşım hem 404 hem de 409 hatalarını ortadan kaldırır
        try {
          // Önce stok_kodu ile doğrudan ara - bu en güvenilir yaklaşım
          const searchResponse = await fetchWithAuth(`${API_URLS.galYmSt}?stok_kodu=${encodeURIComponent(ymSt.stok_kodu)}`);
          
          let actualYmStId = null;
          
          if (searchResponse && searchResponse.ok) {
            const searchResults = await searchResponse.json();
            
            if (Array.isArray(searchResults) && searchResults.length > 0) {
              // Mevcut kaydın ID'sini kullan
              actualYmStId = searchResults[0].id;
              
              // YmStIds dizisini güncelle
              ymStIds[i] = actualYmStId;
            } else {
              // Kayıt bulunamadı - yeni oluştur
              
              try {
                const createResponse = await fetchWithAuth(API_URLS.galYmSt, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(generateYmStDatabaseData(ymSt))
                });
                
                if (createResponse && createResponse.ok) {
                  const result = await createResponse.json();
                  actualYmStId = result.id;
                  
                  // YmStIds dizisini güncelle
                  ymStIds[i] = actualYmStId;
                } 
                // 409 Conflict - kaydın zaten var olması durumu
                else if (createResponse && createResponse.status === 409) {
                  
                  // Alternatif yaklaşım: stok_kodu_like ile ara
                  try {
                    const baseCode = ymSt.stok_kodu.split('.').slice(0, 3).join('.');
                    const likeResponse = await fetchWithAuth(`${API_URLS.galYmSt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
                    
                    if (likeResponse && likeResponse.ok) {
                      const likeResults = await likeResponse.json();
                      
                      // Tam eşleşme ara
                      const exactMatch = likeResults.find(item => item.stok_kodu === ymSt.stok_kodu);
                      
                      if (exactMatch) {
                        actualYmStId = exactMatch.id;
                      } else if (likeResults.length > 0) {
                        // En yakın eşleşmeyi kullan
                        actualYmStId = likeResults[0].id;
                      } else {
                        console.error(`YMST için uygun kayıt bulunamadı! İşlem atlanıyor: ${ymSt.stok_kodu}`);
                        continue; // Bu YMST için işlemi atla
                      }
                      
                      // YmStIds dizisini güncelle
                      ymStIds[i] = actualYmStId;
                    } else {
                      console.error(`YMST aramada hata: HTTP ${likeResponse ? likeResponse.status : 'unknown'}`);
                      continue; // Bu YMST için işlemi atla
                    }
                  } catch (likeError) {
                    console.error(`YMST stok_kodu_like araması sırasında hata: ${likeError.message}`);
                    continue; // Bu YMST için işlemi atla  
                  }
                } else {
                  console.error(`YMST oluşturulamadı: HTTP ${createResponse ? createResponse.status : 'unknown'}`);
                  continue; // Bu YMST için işlemi atla
                }
              } catch (createError) {
                console.error(`YMST oluşturma hatası: ${createError.message}`);
                continue; // Bu YMST için işlemi atla
              }
            }
          } else {
            console.error(`YMST arama hatası: HTTP ${searchResponse ? searchResponse.status : 'unknown'}`);
            continue; // Bu YMST için işlemi atla
          }
          
          // Bu noktada artık doğru ID'ye sahip olmalıyız
          if (!actualYmStId) {
            console.error(`YMST için geçerli ID bulunamadı: ${ymSt.stok_kodu}`);
            continue; // Bu YMST için işlemi atla
          }
          
          // ID'yi güncelle - çok önemli
          ymStIds[i] = actualYmStId;
          
          // Doğru ID ile reçeteleri sil
          await deleteExistingRecipes('ymst', actualYmStId);
          
          let siraNo = 1;
          
          // YMST reçete sıralaması - Excel formatına uygun kesin sıralama 
          // Sıralama: 1. FLM, 2. TLC01 (tam bu sıra)
          const recipeEntries = Object.entries(ymStRecipe);
          
          // Filmaşin kodu doğru formatta olmalı
          const flmEntry = recipeEntries.find(([key]) => key.includes('FLM.'));
          if (flmEntry) {
            // Filmaşin formatını kontrol et: FLM.XXXX.XXXX (örn. FLM.0550.1006)
            const flmKey = flmEntry[0];
            // Doğru format: FLM.XXXX.XXXX şeklinde olmalı, nokta ile ayrılmalı
            if (!flmKey.match(/^FLM\.\d{4}\.\d{4}$/)) {
              console.warn(`FLM kodu hatalı formatta: ${flmKey}, düzeltilmeli`);
            }
          }
          
          const tlc01Entry = recipeEntries.find(([key]) => key === 'TLC01');
          const cotlc01Entry = recipeEntries.find(([key]) => key === 'COTLC01');
          const ymStSourceEntry = recipeEntries.find(([key]) => key.includes('YM.ST.') && key !== ymSt.stok_kodu);

          // Diğer bileşenler - normalde yoktur ama güvenlik için
          const otherEntries = recipeEntries.filter(([key]) =>
            !key.includes('FLM.') &&
            key !== 'TLC01' &&
            key !== 'COTLC01' &&
            !(key.includes('YM.ST.') && key !== ymSt.stok_kodu)
          );

          // ✅ FIXED: Correct order - Material first (sira_no 1), Operation second (sira_no 2)
          // Material: FLM or YM.ST source
          // Operation: TLC01 or COTLC01
          const materialEntry = flmEntry || ymStSourceEntry;
          const operationEntry = tlc01Entry || cotlc01Entry;
          const orderedEntries = [materialEntry, operationEntry, ...otherEntries].filter(Boolean);

          // Eğer orderedEntries içinde sadece bir tane FLM ve bir tane TLC01 yoksa uyarı ver
          // ANCAK: < 1.5mm çaplı ürünler için FLM/TLC01 yerine Coiler/COTLC01 kullanılır
          const ymStDiameter = parseFloat(ymSt?.cap || 0);

          if (ymStDiameter >= 1.5) {
            // Only check for FLM/TLC01 for products >= 1.5mm
            if (!flmEntry) {
              console.error(`HATA: YMST reçetesinde FLM bileşeni bulunamadı! (çap: ${ymStDiameter}mm)`);
            }

            if (!tlc01Entry) {
              console.error(`HATA: YMST reçetesinde TLC01 operasyonu bulunamadı! (çap: ${ymStDiameter}mm)`);
            }
          } else {
            // For < 1.5mm products, check for Coiler source and COTLC01
            const hasCoilerSource = recipeEntries.some(([key]) => key.includes('YM.ST.') && key.includes('.0600.') || key.includes('.0550.') || key.includes('.ST'));
            const hasCotlc01 = recipeEntries.some(([key]) => key === 'COTLC01');

            if (!hasCoilerSource) {
              console.warn(`UYARI: YMST reçetesinde Coiler kaynak (YM.ST) bulunamadı! (çap: ${ymStDiameter}mm)`);
            }

            if (!hasCotlc01) {
              console.warn(`UYARI: YMST reçetesinde COTLC01 operasyonu bulunamadı! (çap: ${ymStDiameter}mm)`);
            }
          }
          
          // Reçete girdisi yoksa uyarı ver ve devam et
          if (orderedEntries.length === 0) {
            console.warn(`YMST ${ymStId} için eklenecek reçete bulunmadı!`);
            continue; // Bir sonraki YMST'ye geç
          }
          
          for (const [key, value] of orderedEntries) {
            if (value > 0) {
              // Format the value exactly as it would appear in Excel, using points as decimal separators
              let formattedValue = value;
              if (typeof value === 'number') {
                formattedValue = value.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 5,
                  useGrouping: false // No thousand separators
                });
              }
              
              // Reçete parametrelerini hazırla
              // DÜZELTME: YM.ST.xxxx formatındaki kodlar yanlışlıkla Operasyon olarak işaretlenmesin
              // DÜZELTME: YM.ST ve FLM kodları her zaman Bileşen olmalı, sadece TLC01/COTLC01 ve GLV01 Operasyon olmalı
              const isOperation = key === 'TLC01' || key === 'COTLC01' || key === 'GLV01';

              // YM.ST içeren kodları kesinlikle Bileşen olarak işaretle
              if (key.includes('YM.ST.')) {
              }


              const operasyonBilesen = (key === 'TLC01' || key === 'COTLC01') ? 'O' : 'B'; // ✅ FIXED: TLC01 and COTLC01 are Operasyon (O) in YMST recipes
              const receteParams = {
                ym_st_id: ymStId,
                mamul_kodu: ymSt.stok_kodu,
                bilesen_kodu: key,
                miktar: formattedValue, // Use formatted value to match Excel
                sira_no: siraNo++,
                operasyon_bilesen: operasyonBilesen,
                olcu_br: getOlcuBr(key),
                olcu_br_bilesen: '1',
                aciklama: getReceteAciklama(key),
                recete_top: 1,
                fire_orani: 0.0004, // Match Excel format
                ua_dahil_edilsin: operasyonBilesen === 'O' ? 'E' : '',
                son_operasyon: operasyonBilesen === 'O' ? 'E' : '',
                // Match Excel format EXACTLY - VARCHAR=empty string, NUMERIC/INT=null
                miktar_sabitle: '',
                stok_maliyet: '',
                fire_mik: null, // NUMERIC
                sabit_fire_mik: null, // NUMERIC
                istasyon_kodu: '',
                hazirlik_suresi: null, // NUMERIC
                uretim_suresi: operasyonBilesen === 'O' ? formattedValue : null, // NUMERIC
                oncelik: null, // INT
                planlama_orani: null, // NUMERIC
                alt_pol_da_transfer: '',
                alt_pol_ambar_cikis: '',
                alt_pol_uretim_kaydi: '',
                alt_pol_mrp: '',
                ic_dis: ''
              };
              
              // Parametre kontrolü
              console.log("YMST REÇETE PARAMETRE KONTROLÜ:", JSON.stringify(receteParams));
              
              // Çakışabilecek mevcut reçeteleri kontrol et
              try {
                const checkResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymStId}`);
                if (checkResponse && checkResponse.ok) {
                  const existingRecipes = await checkResponse.json();
                  const conflictRecipe = existingRecipes.find(r => r.bilesen_kodu === key && r.mamul_kodu !== ymSt.stok_kodu);
                  if (conflictRecipe) {
                    console.error(`ÇAKIŞMA! Farklı mamul_kodu ile YMST reçete mevcut: ${conflictRecipe.mamul_kodu} (silinecek)`);
                    try {
                      await fetchWithAuth(`${API_URLS.galYmStRecete}/${conflictRecipe.id}`, { method: 'DELETE' });
                    } catch (deleteError) {
                      console.error(`Çakışan YMST reçetesi silinemedi: ${deleteError.message}`);
                    }
                  }
                }
              } catch (checkError) {
                console.error(`YMST reçeteleri kontrol edilirken hata: ${checkError.message}`);
                // Hataya rağmen devam et
              }
              
              try {
                const receteResponse = await fetchWithAuth(API_URLS.galYmStRecete, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(receteParams)
                });
                
                if (receteResponse && receteResponse.ok) {
                } else {
                  const statusCode = receteResponse ? receteResponse.status : 'unknown';
                  console.error(`YMST reçetesi kaydedilemedi: ${key}, hata kodu: ${statusCode}`);
                  
                  if (statusCode === 409) {
                    console.warn(`Muhtemelen reçete zaten mevcut. Devam ediliyor.`);
                  }
                }
              } catch (saveError) {
                console.error(`YMST reçetesi kaydedilirken hata: ${saveError.message}`);
                // Hataya rağmen devam et
              }
            }
          }
        } catch (mainError) {
          console.error(`YMST ${ymStId} reçete işlemleri sırasında genel hata:`, mainError.message);
          // Hata ile karşılaşılsa bile diğer YMST'ler için devam et
          continue;
        }
      }
    } catch (error) {
      console.error('Reçete kaydetme hatası:', error);
      throw error;
    }
  };

  /**
   * MMGT ve YMGT reçeteleri için stok kodu kontrolü ve düzeltme
   * Bu fonksiyon, mamul_kodu ile eşleşmeyen reçeteleri siler
   */
  const checkAndFixStokKodu = async (productType, productId, expectedStokKodu) => {
    if (!productId || !expectedStokKodu) {
      console.error(`${productType} ID veya stok_kodu eksik!`);
      return;
    }
    
    let apiUrl = '';
    let paramName = '';
    
    if (productType === 'mm') {
      apiUrl = API_URLS.tavliBalyaMmRecete;
      paramName = 'mm_gt_id';
    } else if (productType === 'ymgt') {
      apiUrl = API_URLS.tavliNetsisYmTtRecete;
      paramName = 'ym_gt_id';
    } else {
      console.error(`Geçersiz ürün tipi: ${productType}`);
      return;
    }
    
    try {
      // URL'yi doğru oluştur - sorgu parametre adını ve ürün ID'sini kontrol et
      const queryUrl = `${apiUrl}?${paramName}=${encodeURIComponent(productId)}`;
      
      // Tüm mevcut reçeteleri getir
      const allRecipesResponse = await fetchWithAuth(queryUrl);
      
      if (allRecipesResponse && allRecipesResponse.ok) {
        const allRecipesData = await allRecipesResponse.json();
        
        // Her reçeteyi kontrol et, yanlış mamul_kodu içerenleri sil
        for (const recipe of allRecipesData) {
          if (recipe.mamul_kodu !== expectedStokKodu) {
            try {
              await fetchWithAuth(`${apiUrl}/${recipe.id}`, { method: 'DELETE' });
            } catch (deleteError) {
              console.error(`${productType.toUpperCase()} reçetesi silinemedi: ${deleteError.message}`);
            }
          }
        }
      } else {
        if (allRecipesResponse && allRecipesResponse.status === 404) {
        } else {
          console.warn(`${productType.toUpperCase()} reçeteleri alınamadı: HTTP ${allRecipesResponse ? allRecipesResponse.status : 'unknown'}`);
          
          // Alternatif yaklaşım: tüm reçeteleri getir ve filtrele
          try {
            const alternativeResponse = await fetchWithAuth(apiUrl);
            
            if (alternativeResponse && alternativeResponse.ok) {
              const allRecipes = await alternativeResponse.json();
              const filteredRecipes = allRecipes.filter(recipe => recipe[paramName] === productId);
              
              
              // Yanlış mamul_kodu içeren reçeteleri sil
              for (const recipe of filteredRecipes) {
                if (recipe.mamul_kodu !== expectedStokKodu) {
                  try {
                    await fetchWithAuth(`${apiUrl}/${recipe.id}`, { method: 'DELETE' });
                  } catch (deleteError) {
                    console.error(`${productType.toUpperCase()} reçetesi silinemedi: ${deleteError.message}`);
                  }
                }
              }
            } else {
              console.warn(`Alternatif yöntemle de ${productType.toUpperCase()} reçeteleri alınamadı`);
            }
          } catch (alternativeError) {
            console.error(`Alternatif yöntem hatası:`, alternativeError.message);
          }
        }
      }
    } catch (error) {
      console.error(`${productType.toUpperCase()} reçeteleri kontrol edilirken hata:`, error);
      // Hata durumunda işleme devam et
    }
  };

  // Mevcut reçeteleri sil - 404 hata yönetimi ile geliştirilmiş versiyon
  const deleteExistingRecipes = async (type, productId) => {
    try {
      if (!productId) {
        return;
      }
      
      let apiUrl = '';
      let paramName = '';
      let typeLabel = '';
      
      if (type === 'mm') {
        apiUrl = API_URLS.tavliBalyaMmRecete;
        paramName = 'mm_gt_id';
        typeLabel = 'MMGT';
      } else if (type === 'ymgt') {
        apiUrl = API_URLS.tavliNetsisYmTtRecete;
        paramName = 'ym_gt_id';
        typeLabel = 'YMGT';
      } else if (type === 'ymst') {
        apiUrl = API_URLS.galYmStRecete;
        paramName = 'ym_st_id';
        typeLabel = 'YMST';
      }
      
      
      // URL'yi doğru oluştur - sorgu parametre adını ve ürün ID'sini kontrol et
      const queryUrl = `${apiUrl}?${paramName}=${encodeURIComponent(productId)}`;
      
      // 404 hata durumunda alternatif yöntem kullan
      let recipes = [];
      try {
        const response = await fetchWithAuth(queryUrl);
        
        // Yanıt varsa ve başarılıysa
        if (response && response.ok) {
          recipes = await response.json();
        } 
        // 404 hatası veya başka bir hata durumunda
        else {
          const status = response ? response.status : 'unknown';
          
          // 404 hatası durumunda boş dizi döndür ve işleme devam et
          if (status === 404) {
            return; // Hiç reçete yoksa silmeye gerek yok
          }
        }
      } catch (fetchError) {
        console.error(`${typeLabel} reçeteleri aranırken hata:`, fetchError.message);
        
        // HATA DURUMUNDA ALTERNATIF YÖNTEM: Tüm reçete listesini getir ve filtrele
        try {
          const allRecipesResponse = await fetchWithAuth(`${apiUrl}`);
          
          if (allRecipesResponse && allRecipesResponse.ok) {
            const allRecipes = await allRecipesResponse.json();
            if (Array.isArray(allRecipes) && allRecipes.length > 0) {
              // İlgili ürüne ait reçeteleri filtrele
              recipes = allRecipes.filter(recipe => recipe[paramName] === productId);
            } else {
              return;
            }
          } else {
            return;
          }
        } catch (alternativeError) {
          console.error(`Alternatif yöntem hatası:`, alternativeError.message);
          // Hata durumunda işleme devam et - reçeteler boş dizi olarak kalsın
          return;
        }
      }
      
      // Eğer hiç reçete bulunmazsa mesaj göster ve çık
      if (!recipes || recipes.length === 0) {
        return;
      }
      
      // Reçeteleri tek tek silmeyi dene
      let successCount = 0;
      let errorCount = 0;
      
      for (const recipe of recipes) {
        try {
          const deleteResponse = await fetchWithAuth(`${apiUrl}/${recipe.id}`, { method: 'DELETE' });
          
          if (deleteResponse && deleteResponse.ok) {
            successCount++;
          } else {
            console.error(`${typeLabel} reçetesi silinemedi: ID=${recipe.id}, HTTP ${deleteResponse ? deleteResponse.status : 'unknown'}`);
            errorCount++;
          }
        } catch (deleteError) {
          console.error(`${typeLabel} reçetesi silinirken hata: ${deleteError.message}`);
          errorCount++;
          // Silme hatası oluşsa bile diğer reçeteleri silmeye devam et
        }
      }
      
      // Özet bilgisi göster
      if (successCount > 0) {
      } else if (errorCount > 0) {
        console.warn(`${typeLabel} reçetelerinden hiçbiri silinemedi! (${errorCount} hata)`);
      } else {
      }
    } catch (error) {
      console.error(`${type.toUpperCase()} reçeteleri silinirken genel hata:`, error);
      // Genel hata durumunda bile işleme devam etmesine izin ver
    }
  };

  // Ölçü birimi alma fonksiyonu
  const getOlcuBr = (bilesen) => {
    // For YM TT readonly component always show KG
    if (bilesen === 'readonly') return 'KG';

    // For process codes with 01 suffix, typically times (in minutes - DK)
    if (bilesen === 'TLC01' || bilesen === 'COTLC01' || bilesen === 'TAV01' || bilesen === 'STPRS01' || bilesen === 'TVPKT01' || bilesen === 'BAL01') return 'DK';

    // All other cases return KG for material weight
    if (bilesen.includes('03') || bilesen.includes('ASİT')) return 'KG';
    if (bilesen.includes('KARTON') || bilesen.includes('HALKA') || bilesen.includes('TOKA') || bilesen.includes('DESİ')) return 'AD';
    if (bilesen.includes('CEMBER') || bilesen.includes('SHRİNK')) return 'KG';
    if (bilesen.includes('YM.GT.')) return 'KG'; // Note: YM.GT codes exist for special products (armored wire)
    if (bilesen.includes('FLM.')) return 'KG';
    return 'KG';
  };

  // Tolerans açıklama alma
  const getToleransAciklama = () => {
    const { mathematicallySwapped } = getAdjustedToleranceValues();
    let explanation = '';
    
    // Standart + ve - dışında bir değer seçilmişse açıklama ekle
    if (toleransMaxSign !== '+' || toleransMinSign !== '-') {
      explanation = 'Tolerans değerleri müşterinin talebi doğrultusunda standart -/+\'nın dışında girilmiştir.';
    }
    
    // Matematik olarak düzeltilmişse açıklama ekle
    if (mathematicallySwapped) {
      if (explanation) {
        explanation += ' Tolerans değerleri matematik olarak düzeltilmiştir.';
      } else {
        explanation = 'Tolerans değerleri matematik olarak düzeltilmiştir.';
      }
    }
    
    return explanation;
  };

  // YM TT için tolerans açıklama (matematiksel düzeltme tespiti için)
  const getYmTtToleransAciklama = (ymTtData) => {
    if (!ymTtData) return '';

    const toleransPlus = parseFloat(ymTtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(ymTtData.tolerans_minus) || 0;
    // Values are already signed in database
    const actualPlusValue = toleransPlus;
    const actualMinusValue = toleransMinus;

    let explanation = '';

    // Check if values are non-standard (not +0.05/-0.06 format)
    if ((actualPlusValue < 0 && actualMinusValue < 0) ||
        (actualPlusValue > 0 && actualMinusValue > 0) ||
        (Math.abs(actualPlusValue) !== 0.05 || Math.abs(actualMinusValue) !== 0.06)) {
      explanation = 'Tolerans değerleri müşterinin talebi doğrultusunda standart -/+\'nın dışında girilmiştir.';
    }

    // Matematik olarak düzeltilmişse açıklama ekle
    if (actualPlusValue < actualMinusValue) {
      if (explanation) {
        explanation += ' Tolerans değerleri matematik olarak düzeltilmiştir.';
      } else {
        explanation = 'Tolerans değerleri matematik olarak düzeltilmiştir.';
      }
    }
    
    return explanation;
  };

  // Tolerans değerlerini işaretlere göre düzenle
  const getAdjustedToleranceValues = () => {
    const plusValue = parseFloat(mmData.tolerans_plus) || 0;
    const minusValue = parseFloat(mmData.tolerans_minus) || 0;

    // Apply signs to get the actual values
    const actualPlusValue = toleransMaxSign === '-' ? -Math.abs(plusValue) : Math.abs(plusValue);
    const actualMinusValue = toleransMinSign === '-' ? -Math.abs(minusValue) : Math.abs(minusValue);
    
    // Check if mathematical correction is needed
    let adjustedPlusValue = actualPlusValue;
    let adjustedMinusValue = actualMinusValue;
    let mathematicallySwapped = false;

    // If plus value is smaller than minus value (mathematically incorrect), swap them
    if (actualPlusValue < actualMinusValue) {
      adjustedPlusValue = actualMinusValue;
      adjustedMinusValue = actualPlusValue;
      mathematicallySwapped = true;
    }

    // Return with proper formatting
    return {
      adjustedPlus: adjustedPlusValue,
      adjustedMinus: adjustedMinusValue,
      plusSign: adjustedPlusValue >= 0 ? '+' : '-',
      minusSign: adjustedMinusValue >= 0 ? '+' : '-',
      mathematicallySwapped: mathematicallySwapped,
      // Excel için formatlanmış değerler (işaretli)
      adjustedPlusFormatted: adjustedPlusValue.toString(),
      adjustedMinusFormatted: adjustedMinusValue.toString()
    };
  };

  // Batch işlemleri için tolerans açıklama
  const generateToleransAciklamaForBatch = (toleransPlus, toleransMinus) => {
    const plus = parseFloat(toleransPlus) || 0;
    const minus = parseFloat(toleransMinus) || 0;

    // Values are already signed in database
    let explanation = '';

    // Check if values are non-standard (not standard +0.05/-0.06 format)
    if ((plus < 0 && minus < 0) ||
        (plus > 0 && minus > 0) ||
        (Math.abs(plus) !== 0.05 || Math.abs(minus) !== 0.06)) {
      explanation = 'Tolerans değerleri müşterinin talebi doğrultusunda standart -/+\'nın dışında girilmiştir.';
    }
    
    return explanation;
  };

  // Reçete açıklama alma
  const getReceteAciklama = (bilesen) => {
    if (bilesen === 'GTPKT01') return 'Paketleme Operasyonu';
    if (bilesen === 'GLV01') return 'Galvanizleme Operasyonu';
    if (bilesen === 'TLC01') return 'Tel Çekme Operasyonu';
    if (bilesen === 'COTLC01') return 'Coil Tel Çekme Operasyonu'; // ✅ FIXED: Added missing COTLC01 case
    if (bilesen === 'TAV01') return 'Tavlama Operasyonu';
    if (bilesen === 'STPRS01') return 'Siyah Tel Presleme Operasyonu';
    if (bilesen === 'TVPKT01') return 'Tavlı Tel Paketleme Operasyonu';
    if (bilesen === 'BAL01') return 'Balyalama-Paketleme Operasyonu';
    if (bilesen === '150 03' || bilesen === 'HM-000001') return 'Çinko Tüketim Miktarı';
    if (bilesen === 'SM.HİDROLİK.ASİT' || bilesen === 'SM-KMY-000096') return 'Asit Tüketim Miktarı';
    if (bilesen.includes('FLM.')) return 'Filmaşin Tüketimi';
    if (bilesen.includes('YM.GT.')) return 'Galvanizli Tel Tüketim Miktarı';
    if (bilesen.includes('YM.TT.')) return 'Tavlı Tel Tüketim Miktarı';
    if (bilesen.includes('YM.STP.')) return 'Preslenmiş Siyah Tel Tüketim Miktarı';
    if (bilesen.includes('YM.ST.')) return 'Siyah Tel Tüketim Miktarı';
    if (bilesen.includes('KARTON') || bilesen === 'SM-AMB-000019') return 'Karton Tüketim Miktarı';
    if (bilesen.includes('SHRİNK') || bilesen === 'SM-AMB-000027' || bilesen === 'SM-AMB-000028' || bilesen === 'SM-AMB-000030') return 'Naylon Tüketim Miktarı';
    if (bilesen.includes('HALKA') || bilesen === 'SM-AMB-000023') return 'Kaldırma Kancası Tüketim Miktarı';
    // ✅ FIXED: Check Plastik Çember BEFORE general CEMBER check
    if (bilesen.includes('PLASTİK') || bilesen === 'SM-AMB-000024') return 'Plastik çember Tüketim Miktarı';
    if (bilesen.includes('STREÇ') || bilesen === 'SM-AMB-000025') return 'Streç Tüketim Miktarı';
    if (bilesen.includes('PALET') || bilesen === 'SM-AMB-000026') return 'Palet Tüketim Miktarı';
    if (bilesen.includes('CEMBER') || bilesen === 'SM-AMB-000017') return 'Çelik çember Tüketim Miktarı';
    if (bilesen.includes('TOKA') || bilesen === 'SM-AMB-000018') return 'Çember Tokası Tüketim Miktarı';
    // ✅ REMOVED: Silkajel (SM.DESİ.PAK / SM-KMY-000102) - not in tavlı/balya specification
    return 'Tüketim Miktarı';
  };

  // Filmaşin kodu oluştur - Excel formatına tam uyumlu
  const getFilmasinKodu = (ymSt) => {
    if (!ymSt) return 'FLM.0600.1006';
    
    // Get cap and determine appropriate filmasin type - each YM ST must use its own cap
    const cap = parseFloat(ymSt.cap) || 0;
    
    // If ymSt has filmasin and quality defined, use those values
    // If not, determine appropriate values based on cap
    let filmasin, quality;
    
    // For diameters ≤ 1.8mm, use YM ST's own filmasin/quality if available, otherwise use defaults
    if (cap <= 1.80) {
      if (ymSt.filmasin && ymSt.quality) {
        // Use YM ST's own filmasin and quality values
        filmasin = ymSt.filmasin.toString();
        quality = ymSt.quality;
      } else {
        // Only use default rules if YM ST doesn't have its own values
        filmasin = getFilmasinForCap(cap);
        quality = getQualityForCap(cap) || '1006';
        
        // Update the YM ST object with the calculated values
        ymSt.filmasin = parseInt(filmasin);
        ymSt.quality = quality;
      }
    } else if (ymSt.filmasin && ymSt.quality) {
      // For diameters > 2mm, use existing values from ymSt if available
      filmasin = ymSt.filmasin.toString();
      quality = ymSt.quality;
    } else {
      // Otherwise, determine appropriate values based on cap
      filmasin = getFilmasinForCap(cap);
      quality = getQualityForCap(cap) || '1006';
      
      // IMPORTANT: Also update the ymSt object with the selected values
      // This ensures dropdowns will be set to the correct values
      if (ymSt.source === 'auto-generated' || ymSt.source === 'manual-added') {
        // Only modify if it's our controlled object, not from the database
        ymSt.filmasin = parseInt(filmasin);
        ymSt.quality = quality;
      }
    }
    
    // 4 haneli format ile leading sifirlar
    // Format: XXXX
    const filmasinNumber = parseInt(filmasin, 10);
    filmasin = filmasinNumber.toString().padStart(4, '0');
    
    // DÜZELTME: Format kontrolü - Excel formatıyla tam uyumlu olmalı
    const filmasinCode = `FLM.${filmasin}.${quality}`;
    
    // Doğru format kontrolü: FLM.XXXX.XXXX (örn. FLM.0550.1006)
    const validFormat = /^FLM\.\d{4}\.\d{4}$/.test(filmasinCode);
    
    if (!validFormat) {
      console.warn(`UYARI: Oluşturulan FLM kodu hatalı formatta: ${filmasinCode}, format düzeltilmeli`);
    }
    
    // Return formatted code in the correct format: FLM.0800.1010
    return filmasinCode;
  };

  
  // Function to fetch TLC_Hizlar data from the database
  // STUB: Not used in Tavlı/Balya Tel (specific to Galvanizli wire drawing speeds)
  const fetchTlcHizlarData = async () => {
    // Early return - TLC Hızlar data is not used in Tavlı/Balya Tel
    console.log('fetchTlcHizlarData called - STUB - Not used in Tavlı/Balya Tel');
    return;

    try {
      setTlcHizlarLoading(true);
      console.log('Fetching TLC Hızlar data from database...');
      
      // Check if API endpoint exists - should point to gal_cost_cal_user_tlc_hizlar
      if (!API_URLS.galTlcHizlar) {
        console.warn('galTlcHizlar API endpoint is not defined, using fallback data');
        setTlcHizlarLoading(false);
        return;
      }
      
      // Try first with CORS proxy (works better with vercel deployments)
      try {
        console.log('Trying to fetch TLC_Hizlar data using CORS proxy...');
        const proxyResponse = await fetchWithCorsProxy(API_URLS.galTlcHizlar, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (proxyResponse && proxyResponse.ok) {
          const data = await proxyResponse.json();
          
          // Create a lookup table for DÜŞEYARA function
          const lookupMap = {};
          if (Array.isArray(data)) {
            data.forEach(item => {
              // Ensure consistent formatting for lookup keys
              const giris = parseFloat(item.giris_capi).toFixed(2);
              const cikis = parseFloat(item.cikis_capi).toFixed(2);
              const kod = `${giris}x${cikis}`;
              
              // Make sure we have a valid numeric value
              const hiz = parseFloat(item.calisma_hizi);
              if (!isNaN(hiz) && hiz > 0) {
                lookupMap[kod] = hiz;
                // Also add a version without trailing zeros for more flexible matching
                const cleanGiris = parseFloat(giris);
                const cleanCikis = parseFloat(cikis);
                const cleanKod = `${cleanGiris}x${cleanCikis}`;
                if (cleanKod !== kod) {
                  lookupMap[cleanKod] = hiz;
                }
              }
            });
            
            // Add debug output for a few sample values
            const sampleKeys = Object.keys(lookupMap).slice(0, 5);
            console.log(`Sample TLC_Hizlar values:`, sampleKeys.map(k => `${k}: ${lookupMap[k]}`));
            
            setTlcHizlarCache(lookupMap);
            setTlcHizlarLoading(false);
            return;
          }
        }
      } catch (proxyError) {
        console.warn('CORS proxy fetch failed, trying direct methods:', proxyError);
      }
      
      // Try with standard fetch as second option
      try {
        console.log('Trying to fetch TLC_Hizlar data using standard fetch...');
        const directResponse = await fetch(API_URLS.galTlcHizlar, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors'
        });
        
        if (directResponse && directResponse.ok) {
          const data = await directResponse.json();
          
          // Create a lookup table for DÜŞEYARA function
          const lookupMap = {};
          if (Array.isArray(data)) {
            data.forEach(item => {
              const kod = `${item.giris_capi}x${item.cikis_capi}`;
              lookupMap[kod] = item.calisma_hizi;
            });
            
            setTlcHizlarCache(lookupMap);
            setTlcHizlarLoading(false);
            return;
          }
        }
      } catch (directFetchError) {
        console.warn('Direct fetch failed, trying fetchWithAuth:', directFetchError);
      }
      
      // If all previous attempts failed, try with fetchWithAuth
      try {
        console.log('Trying to fetch TLC_Hizlar data using fetchWithAuth...');
        const response = await fetchWithAuth(API_URLS.galTlcHizlar);
        if (response && response.ok) {
          const data = await response.json();
          
          // Create a lookup table for DÜŞEYARA function
          const lookupMap = {};
          if (Array.isArray(data)) {
            data.forEach(item => {
              const kod = `${item.giris_capi}x${item.cikis_capi}`;
              lookupMap[kod] = item.calisma_hizi;
            });
          }
          
          setTlcHizlarCache(lookupMap);
        } else {
          console.warn('Failed to fetch TLC_Hizlar data, using default fallback values');
          initializeFallbackData();
        }
      } catch (authFetchError) {
        console.warn('Auth fetch failed, using fallback data:', authFetchError);
        initializeFallbackData();
      }
    } catch (error) {
      console.error('Error fetching TLC_Hizlar data:', error);
      initializeFallbackData();
    } finally {
      setTlcHizlarLoading(false);
    }
  };
  
  // Initialize fallback data in case API fails
  const initializeFallbackData = () => {
    // Static fallback data for most common sizes
    const fallbackData = {
      "7x5": 10.5,
      "7x5.5": 11,
      "7x6": 11,
      "8x6": 11,
      "8x6.5": 11,
      "8x7": 11.5,
      "9x7": 10.5,
      "9x7.5": 10.5,
      "9x8": 10,
      "10x7.92": 10,
      "10x8": 10
    };
    
    console.log("Using static fallback data for TLC_Hizlar");
    setTlcHizlarCache(fallbackData);
  };
  
  // No fallback data - using only database table

  // DÜŞEYARA (VLOOKUP) function implementation using only database data
  const duseyaraLookup = (lookupValue, rangeArray, columnIndex, exactMatch = true) => {
    // Enhanced fallback values for common wire sizes - more comprehensive list
    const fallbackValues = {
      // Format: "HM_CapxCap": Calisma_Hizi (fallback speed value)
      // Common filmasin 5.5mm values
      "5.5x0.8": 20,    "5.5x0.9": 20,    "5.5x1": 20,     "5.5x1.1": 19,    "5.5x1.2": 19,
      "5.5x1.3": 19,    "5.5x1.4": 18,    "5.5x1.5": 18,   "5.5x1.6": 18,    "5.5x1.7": 17,
      "5.5x1.8": 17,    "5.5x1.9": 17,
      
      // Common filmasin 6mm values
      "6x0.8": 20,      "6x0.9": 20,      "6x1": 20,       "6x1.1": 19,      "6x1.2": 19,
      "6x1.3": 19,      "6x1.4": 18,      "6x1.5": 18,     "6x1.6": 18,      "6x1.7": 17,
      "6x1.8": 17,      "6x1.9": 17,      "6x2": 16,       "6x2.2": 16,      "6x2.4": 15,
      "6x2.6": 15,      "6x2.8": 14,      "6x3": 14,       "6x3.2": 13,      "6x3.4": 13,
      "6x3.6": 12,      "6x3.8": 12,      "6x4": 11,       "6x4.2": 11,      "6x4.4": 10,
      "6x4.5": 10,
      
      // Common filmasin 7mm values
      "7x4.5": 11,      "7x5": 10.5,      "7x5.5": 10,     "7x6": 10,
      
      // Common filmasin 8mm values
      "8x5.5": 11,      "8x6": 10.5,      "8x6.5": 10,     "8x7": 10,
      
      // Common filmasin 9mm values
      "9x7": 10.5,      "9x7.5": 10,      "9x8": 10,
      
      // Common filmasin 10mm values
      "10x7": 10.5,     "10x7.5": 10,     "10x8": 10
    };
    
    // Check if we have a fallback value for this exact combination
    if (fallbackValues[lookupValue]) {
      return fallbackValues[lookupValue];
    }
    
    // Try to find nearby values in fallback table if no exact match
    try {
      // Parse lookupValue format "7x1.25" -> [7, 1.25]
      const [hmCap, cap] = lookupValue.split("x").map(Number);
      
      // Find closest keys in the fallback values dictionary
      const fallbackKeys = Object.keys(fallbackValues);
      const closestFallbackKeys = fallbackKeys.filter(key => {
        const [fbHmCap, fbCap] = key.split("x").map(Number);
        return fbHmCap === hmCap && Math.abs(fbCap - cap) <= 0.5; // Within 0.5mm
      });
      
      if (closestFallbackKeys.length > 0) {
        // Sort by closest cap value
        closestFallbackKeys.sort((a, b) => {
          const [, aCapValue] = a.split("x").map(Number);
          const [, bCapValue] = b.split("x").map(Number);
          return Math.abs(aCapValue - cap) - Math.abs(bCapValue - cap);
        });
        
        // Return the closest match from fallback values
        const closestKey = closestFallbackKeys[0];
        return fallbackValues[closestKey];
      }
    } catch (e) {
      console.warn(`Error parsing fallback lookup: ${e.message}`);
    }
    
    // Check if we have database data in the cache
    if (Object.keys(tlcHizlarCache).length > 0) {
      // Database approach: direct lookup by code (format "7x1.25")
      if (tlcHizlarCache[lookupValue]) {
        // We have an exact match in the database
        return tlcHizlarCache[lookupValue];
      }
      
      // No exact match in DB, try to find closest match
      if (!exactMatch) {
        try {
          // Parse lookupValue format "7x1.25" -> [7, 1.25]
          const [hmCap, cap] = lookupValue.split("x").map(Number);
          
          // Find all keys that match the input HM cap (or very close)
          const matchingHmCapKeys = Object.keys(tlcHizlarCache).filter(key => {
            try {
              const [keyHmCap] = key.split("x").map(Number);
              // Allow for small rounding differences in HM cap (±0.05)
              return Math.abs(keyHmCap - hmCap) <= 0.05;
            } catch (e) {
              console.warn(`Invalid key format: ${key}`);
              return false;
            }
          });
          
          if (matchingHmCapKeys.length > 0) {
            // Sort by closest cap value
            matchingHmCapKeys.sort((a, b) => {
              const [, aCapValue] = a.split("x").map(Number);
              const [, bCapValue] = b.split("x").map(Number);
              return Math.abs(aCapValue - cap) - Math.abs(bCapValue - cap);
            });
            
            // Return the closest match
            const bestMatch = matchingHmCapKeys[0];
            return tlcHizlarCache[bestMatch];
          }
          
          // If we still don't have a match, try to find closest HM cap
          const allKeys = Object.keys(tlcHizlarCache);
          if (allKeys.length > 0) {
            // Sort by closest overall match using weighted scoring
            allKeys.sort((a, b) => {
              try {
                const [aHmCap, aCap] = a.split("x").map(Number);
                const [bHmCap, bCap] = b.split("x").map(Number);
                
                // Weight HM cap differences more heavily (3x)
                const aScore = Math.abs(aHmCap - hmCap) * 3 + Math.abs(aCap - cap);
                const bScore = Math.abs(bHmCap - hmCap) * 3 + Math.abs(bCap - cap);
                
                return aScore - bScore;
              } catch (e) {
                console.warn(`Error comparing keys ${a} and ${b}: ${e.message}`);
                return 0;
              }
            });
            
            // Return the closest overall match but only if reasonably close
            const bestOverallMatch = allKeys[0];
            const [bestHmCap, bestCap] = bestOverallMatch.split("x").map(Number);
            const distanceScore = Math.abs(bestHmCap - hmCap) * 3 + Math.abs(bestCap - cap);
            
            // If distance is too great, use a default value instead
            if (distanceScore > 5) {
              return 10; // Default value for calisma_hizi when no good match
            }
            
            return tlcHizlarCache[bestOverallMatch];
          }
        } catch (error) {
          console.error('Error finding approximate match in DÜŞEYARA:', error);
          // Return a reasonable default value in case of error
          return 10;
        }
      }
    }
    
    // If we couldn't find a match or have no data, use advanced estimation algorithm based on typical patterns
    
    // For any lookup value with format "Wx1.25", use more sophisticated estimation
    try {
      // Try to extract values from lookupValue (e.g., "7x1.25")
      const [estHmCap, estCap] = lookupValue.split('x').map(Number);
      if (!isNaN(estHmCap) && !isNaN(estCap)) {
        // Larger input diameters and smaller output diameters = faster speeds
        // This is a more nuanced heuristic based on the TLC_Hizlar patterns
        let baseSpeed;
        
        // Base speed depends on filmasin diameter (higher = slower)
        if (estHmCap <= 6) baseSpeed = 20;      // 5.5mm, 6mm are fastest
        else if (estHmCap <= 7) baseSpeed = 16; // 7mm is medium
        else if (estHmCap <= 8) baseSpeed = 13; // 8mm is slower
        else baseSpeed = 11;                    // 9mm, 10mm are slowest
        
        // Adjust for output diameter (thinner = faster processing)
        // Different adjustment scales based on filmasin diameter
        let capAdjustment; 
        if (estHmCap <= 6) {
          // For 5.5mm and 6mm filmasin, speed drops faster with thicker outputs
          capAdjustment = Math.max(0, (estCap - 1) * 1.5);
        } else {
          // For thicker filmasin, speed drops more gradually
          capAdjustment = Math.max(0, (estCap - 2) * 1);
        }
        
        const estimatedSpeed = Math.max(8, baseSpeed - capAdjustment);
        
        return estimatedSpeed;
      }
    } catch (e) {
      console.warn(`Error estimating TLC_Hiz: ${e.message}`);
    }
    
    // Absolute fallback if all else fails
    return 10;
  };
  
  // Calculate YuzeyAlani based on the formula
  const calculateYuzeyAlani = (cap) => {
    // YuzeyAlani: =1000*4000/PI()/'DIA (MM)'/'DIA (MM)'/7.85*'DIA (MM)'*PI()/1000
    return (1000 * 4000 / Math.PI / cap / cap / 7.85 * cap * Math.PI / 1000);
  };
  
  // Calculate total surface area
  const calculateTotalYuzeyAlani = () => {
    // toplam_yuzey_alani= uretim_kapasitesi_aylik *1000*4000/ ortalama_uretim_capi / ortalama_uretim_capi /3.14/7.85* ortalama_uretim_capi *3.14/1000
    const { uretim_kapasitesi_aylik, ortalama_uretim_capi } = userInputValues;
    return uretim_kapasitesi_aylik * 1000 * 4000 / ortalama_uretim_capi / ortalama_uretim_capi / Math.PI / 7.85 * ortalama_uretim_capi * Math.PI / 1000;
  };
  
  // Calculate Durdurma Vinç (DV) based on Min Mukavemet
  const calculateDV = (minMukavemet) => {
    // DV values with interpolation for intermediate mukavemet values
    const dvTable = [
      { mukavemet: 400, dv: 140 },
      { mukavemet: 500, dv: 160 },
      { mukavemet: 600, dv: 180 },
      { mukavemet: 700, dv: 200 }
    ];
    
    // Find exact match first
    const exactMatch = dvTable.find(entry => entry.mukavemet === minMukavemet);
    if (exactMatch) {
      return exactMatch.dv;
    }
    
    // Find closest values for interpolation
    let lowerBound = null;
    let upperBound = null;
    
    for (let i = 0; i < dvTable.length; i++) {
      if (dvTable[i].mukavemet < minMukavemet) {
        lowerBound = dvTable[i];
      } else if (dvTable[i].mukavemet > minMukavemet && !upperBound) {
        upperBound = dvTable[i];
        break;
      }
    }
    
    // Interpolate if we have both bounds
    if (lowerBound && upperBound) {
      const ratio = (minMukavemet - lowerBound.mukavemet) / (upperBound.mukavemet - lowerBound.mukavemet);
      const interpolatedDV = lowerBound.dv + ratio * (upperBound.dv - lowerBound.dv);
      return Math.round(interpolatedDV);
    }
    
    // Use closest value if outside range
    if (minMukavemet < 400) {
      return 140;
    } else {
      return 200;
    }
  };

  // Calculate tuketilenAsit
  const calculateTuketilenAsit = () => {
    // tuketilenAsit: = toplam_tuketilen_asit / toplam_yuzey_alani
    // Based on the formula from GalvanizliFormulas.txt
    const { toplam_tuketilen_asit } = userInputValues;
    const totalYuzeyAlani = calculateTotalYuzeyAlani();
    
    if (totalYuzeyAlani > 0) {
      const calculatedValue = toplam_tuketilen_asit / totalYuzeyAlani;
      return calculatedValue;
    } else {
      // Use default value from historical data if we can't calculate
      return 0.0647625; // Default value if totalYuzeyAlani is zero
    }
  };
  
  // Calculate TLC_Hiz based on HM_Cap and Cap values
  // TLC_Hiz= =DÜŞEYARA(BİRLEŞTİR(HM_Cap;"x"; Çap);'TLC_Hızlar'!C:F;4;YANLIŞ)*0.7
  const calculateTlcHiz = (hmCap, cap) => {
    // Format inputs to ensure consistency
    const formattedHmCap = parseFloat(hmCap);
    const formattedCap = parseFloat(cap);
    
    // Create lookup code in format: "7x1.25" with consistent formatting
    // Try both precise and rounded formats for better matching
    const exactLookupCode = `${formattedHmCap}x${formattedCap}`;
    const roundedLookupCode = `${formattedHmCap.toFixed(2)}x${formattedCap.toFixed(2)}`;
    
    
    // First try direct lookup in the cache
    if (tlcHizlarCache[exactLookupCode]) {
      const exactMatch = tlcHizlarCache[exactLookupCode];
      
      // The formula in GalvanizliFormulas.txt is: TLC_Hiz= =DÜŞEYARA(BİRLEŞTİR(HM_Cap;"x"; Çap);'TLC_Hızlar'!C:F;4;YANLIŞ)*0.7
      // The last column in TLC_Hizlar.csv is "calismahizi" which is what we need
      // We need to apply the 0.7 multiplier as specified in the formula
      return exactMatch * 0.7; 
    }
    
    if (tlcHizlarCache[roundedLookupCode]) {
      const roundedMatch = tlcHizlarCache[roundedLookupCode];
      return roundedMatch * 0.7; // Apply 0.7 multiplier as per formula
    }
    
    // If no direct match, find closest matches and interpolate
    
    // Find closest HM_Cap and Cap values in the cache
    const cacheKeys = Object.keys(tlcHizlarCache);
    let closestMatch = null;
    let minDistance = Infinity;
    
    // Try to find closest match by calculating distance
    cacheKeys.forEach(key => {
      const [keyHmCap, keyCap] = key.split('x').map(parseFloat);
      if (!isNaN(keyHmCap) && !isNaN(keyCap)) {
        // For COILER: Give more weight to hmCap (source diameter) differences
        // This ensures different source diameters get different TLC_Hiz values
        const distance = Math.abs(keyHmCap - formattedHmCap) * 0.7 + Math.abs(keyCap - formattedCap) * 0.3;
        if (distance < minDistance) {
          minDistance = distance;
          closestMatch = key;
        }
      }
    });

    if (closestMatch && tlcHizlarCache[closestMatch]) {
      const interpolatedValue = tlcHizlarCache[closestMatch];
      console.log(`🔧 TLC_HIZ MATCH: ${formattedHmCap}x${formattedCap} → closest: ${closestMatch} → value: ${interpolatedValue * 0.7}`);

      // Apply interpolation based on source diameter difference
      const [matchHmCap] = closestMatch.split('x').map(parseFloat);
      const capRatio = formattedHmCap / matchHmCap;

      // Adjust TLC_Hiz based on diameter ratio (larger source = slower speed)
      const adjustedValue = interpolatedValue / capRatio;

      return adjustedValue * 0.7;
    }
    
    // Final fallback - use a reasonable default based on wire size
    const fallbackValue = Math.max(50, 100 - formattedCap * 5); // Larger wire = slower speed
    return fallbackValue * 0.7; 
  };

  // Request selection handlers
  const handleSelectAllRequests = () => {
    const selectableRequests = getFilteredAndSortedRequests().filter(req => {
      const status = req.status?.toString().toLowerCase().trim();
      return status === 'approved' || status === 'rejected' || status === 'pending';
    });
    const allIds = selectableRequests.map(req => req.id);
    
    if (selectedRequestIds.length === allIds.length) {
      // Deselect all
      setSelectedRequestIds([]);
    } else {
      // Select all selectable requests
      setSelectedRequestIds(allIds);
    }
  };

  const handleToggleRequestSelection = (requestId) => {
    setSelectedRequestIds(prev => {
      if (prev.includes(requestId)) {
        return prev.filter(id => id !== requestId);
      } else {
        return [...prev, requestId];
      }
    });
  };

  // Handle bulk delete requests
  const handleBulkDeleteRequests = async () => {
    if (selectedRequestIds.length === 0) {
      toast.warning('Lütfen silmek için en az bir talep seçin');
      return;
    }
    
    const selectedRequests = requests.filter(req => selectedRequestIds.includes(req.id));
    const approvedCount = selectedRequests.filter(req => req.status === 'approved').length;
    const rejectedCount = selectedRequests.filter(req => req.status === 'rejected').length;
    const pendingCount = selectedRequests.filter(req => req.status === 'pending').length;
    
    let confirmMessage = `${selectedRequestIds.length} adet talebi silmek istediğinizden emin misiniz?\n\n`;
    
    if (pendingCount > 0) {
      confirmMessage += `• ${pendingCount} adet bekleyen talep\n`;
    }
    if (rejectedCount > 0) {
      confirmMessage += `• ${rejectedCount} adet reddedilmiş talep\n`;
    }
    if (approvedCount > 0) {
      confirmMessage += `• ${approvedCount} adet onaylanmış talep (Bu ürünler zaten veritabanına kaydedilmiş olabilir)\n`;
    }
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setIsDeletingBulk(true);

      // ✅ CRITICAL FIX: Delete requests SEQUENTIALLY to avoid database overload
      // Sending all DELETE requests in parallel (Promise.all) chokes the database
      let successCount = 0;
      let failureCount = 0;
      const failedIds = [];

      for (const id of selectedRequestIds) {
        try {
          console.log(`Deleting request ${successCount + failureCount + 1}/${selectedRequestIds.length}: ${id}`);

          const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${id}`, {
            method: 'DELETE'
          });

          if (response && response.ok) {
            successCount++;
            console.log(`✅ Successfully deleted request: ${id}`);
          } else {
            failureCount++;
            failedIds.push(id);
            console.error(`❌ Failed to delete request: ${id}, Status: ${response?.status}`);
          }
        } catch (error) {
          failureCount++;
          failedIds.push(id);
          console.error(`❌ Error deleting request ${id}:`, error);
        }

        // Small delay between deletions to prevent overwhelming the database
        if (successCount + failureCount < selectedRequestIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Show appropriate notification based on results
      if (successCount === selectedRequestIds.length) {
        toast.success(`✅ ${successCount} adet talep başarıyla silindi`);
      } else if (successCount > 0) {
        toast.warning(`⚠️ ${successCount} talep silindi, ${failureCount} talep silinemedi`);
      } else {
        toast.error(`❌ Hiçbir talep silinemedi (${failureCount} başarısız)`);
      }

      setSelectedRequestIds([]);
      await fetchRequests();

    } catch (error) {
      console.error('Toplu silme hatası:', error);
      toast.error('Toplu silme hatası: ' + error.message);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  
  // Download Today's Approved Excel
  const downloadTodaysApprovedExcel = async () => {
    try {
      setIsExportingExcel(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysApprovedRequests = requests.filter(req => {
        if (!req || !req.status) return false;
        
        const status = req.status.toString().toLowerCase().trim();
        const approvedAt = new Date(req.approved_at || req.updated_at);
        approvedAt.setHours(0, 0, 0, 0);
        
        return status === 'approved' && approvedAt.getTime() === today.getTime();
      });
      
      if (todaysApprovedRequests.length === 0) {
        toast.warning('Bugün onaylanmış talep bulunamadı.');
        return;
      }
      
      await generateBatchExcelFromRequests(todaysApprovedRequests);
      toast.success(`Bugün onaylanan ${todaysApprovedRequests.length} talep için Excel dosyaları oluşturuldu!`);
    } catch (error) {
      console.error('Today\'s Excel export error:', error);
      toast.error('Excel dosyaları oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setIsExportingExcel(false);
      setExcelProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
    }
  };
  
  // Download Session Approved Excel
  const downloadSessionApprovedExcel = async () => {
    try {
      setIsExportingExcel(true);
      
      console.log('Session approvals:', sessionApprovals);
      console.log('All requests:', requests.map(r => ({ id: r.id, status: r.status })));
      
      if (sessionApprovals.length === 0) {
        toast.warning('Bu oturumda onaylanmış talep bulunamadı.');
        return;
      }
      
      const sessionApprovedRequests = requests.filter(req => 
        sessionApprovals.includes(req.id)
      );
      
      console.log('Filtered session requests:', sessionApprovedRequests);
      
      if (sessionApprovedRequests.length === 0) {
        toast.warning('Oturum talepleri bulunamadı.');
        return;
      }
      
      await generateBatchExcelFromRequests(sessionApprovedRequests);
      toast.success(`Bu oturumda onaylanan ${sessionApprovedRequests.length} talep için Excel dosyaları oluşturuldu!`);
    } catch (error) {
      console.error('Session Excel export error:', error);
      toast.error('Excel dosyaları oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setIsExportingExcel(false);
      setExcelProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
    }
  };
  
  // Download Date Range Approved Excel

  // Export selected approved requests to Excel
  const exportSelectedToExcel = async () => {
    try {
      if (selectedRequestIds.length === 0) {
        toast.warning('Lütfen en az bir onaylanmış talep seçin');
        return;
      }
      
      setIsExportingExcel(true);
      const selectedRequests = requests.filter(req => {
        const status = req.status?.toString().toLowerCase().trim();
        return selectedRequestIds.includes(req.id) && status === 'approved';
      });
      
      if (selectedRequests.length === 0) {
        toast.warning('Seçilen taleplerin hiçbiri onaylanmış değil');
        return;
      }
      
      // Debug: Log all stok_kodu values from selected requests
      console.log('🔍 DEBUG: Selected requests stok_kodu values:');
      selectedRequests.forEach((req, index) => {
        console.log(`Request ${index + 1} (ID: ${req.id}): stok_kodu = "${req.stok_kodu}", status = "${req.status}", created_at = "${req.created_at}"`);
      });
      
      // Check for duplicate stok_kodu values
      const stokKodular = selectedRequests.map(req => req.stok_kodu).filter(Boolean);
      const uniqueStokKodular = [...new Set(stokKodular)];
      
      if (stokKodular.length !== uniqueStokKodular.length) {
        console.warn('⚠️ DUPLICATE STOK_KODU DETECTED!');
        console.warn('Total requests:', selectedRequests.length);
        console.warn('Unique stok_kodu values:', uniqueStokKodular.length);
        console.warn('Duplicate stok_kodular:', stokKodular.filter((item, index) => stokKodular.indexOf(item) !== index));
      }
      
      console.log('🚀 Starting Excel generation for', selectedRequests.length, 'requests');
      await generateBatchExcelFromRequests(selectedRequests);
      toast.success(`${selectedRequests.length} seçili onaylanmış talep için Excel dosyaları oluşturuldu`);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Excel dosyaları oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setIsExportingExcel(false);
      setExcelProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
    }
  };

  // Bulk Excel generation - download entire database (Tavli/Balya: 4 sheets only, no intermediate products)
  const generateBulkExcelFromDatabase = useCallback(async () => {
    try {
      setIsExportingExcel(true);
      setExcelProgress({ current: 0, total: 4, operation: 'Toplu veritabanı indirme başlıyor...', currentProduct: '' });

      console.log('🚀 BULK EXCEL TT: Starting bulk database download for Tavli/Balya Tel...');

      // 1. Get all TT (Tavli/Balya) product data - INCLUDES INTERMEDIATES (YM TT, YM STP)
      setExcelProgress({ current: 1, total: 4, operation: 'Ürün verileri alınıyor...', currentProduct: '' });

      const [mmResponse, ymTtResponse, ymStpResponse, ymstResponse] = await Promise.all([
        fetch(`${API_URLS.getAllTavliBalyaMm}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYmTt}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYmStp}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYMST}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [allMMProducts, allYmTtProducts, allYmStpProducts, allYMSTProducts] = await Promise.all([
        mmResponse.json(),
        ymTtResponse.json(),
        ymStpResponse.json(),
        ymstResponse.json()
      ]);

      console.log(`🚀 BULK EXCEL TT: Found MM TT(${allMMProducts.length}), YM TT(${allYmTtProducts.length}), YM STP(${allYmStpProducts.length}), YM ST(${allYMSTProducts.length}) products`);

      // 2. Fetch all recipe data (uses YM.TT intermediates for Tavli/Balya)
      setExcelProgress({ current: 2, total: 4, operation: 'Reçete verileri alınıyor...', currentProduct: '' });

      const [mmReceteResponse, ymTtReceteResponse, ymStpReceteResponse, ymstReceteResponse] = await Promise.all([
        fetch(`${API_URLS.getAllTavliBalyaMmRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYmTtRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYmStpRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYMSTRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [allMMRecetes, allYmTtRecetes, allYmStpRecetes, allYMSTRecetes] = await Promise.all([
        mmReceteResponse.json(),
        ymTtReceteResponse.json(),
        ymStpReceteResponse.json(),
        ymstReceteResponse.json()
      ]);

      console.log(`🚀 BULK EXCEL TT: Found MM TT Recipes(${allMMRecetes.length}), YM TT Recipes(${allYmTtRecetes.length}), YM STP Recipes(${allYmStpRecetes.length}), YM ST Recipes(${allYMSTRecetes.length})`);

      // 3. Generate Excel files - 2 Excel files with 8 sheets total (Stock: MM TT + YM TT + YM STP + YM ST, Recipe: same 4 sheets)
      setExcelProgress({ current: 3, total: 4, operation: 'Excel dosyaları oluşturuluyor...', currentProduct: '' });

      if (allMMProducts.length === 0) {
        toast.error('Hiç Tavlı/Balya Tel ürünü bulunamadı!');
        return;
      }

      // Generate the 2 Excel files: Stok Kartı (4 sheets), Reçete (4 sheets)
      await generateBulkExcelFiles(allMMProducts, allYmTtProducts, allYmStpProducts, allYMSTProducts, allMMRecetes, allYmTtRecetes, allYmStpRecetes, allYMSTRecetes);

      setExcelProgress({ current: 4, total: 4, operation: 'Tamamlandı!', currentProduct: '' });
      toast.success(`Toplu Excel başarıyla oluşturuldu! ${allMMProducts.length} MM TT, ${allYmTtProducts.length} YM TT, ${allYmStpProducts.length} YM STP, ${allYMSTProducts.length} YM ST ürün işlendi.`);

    } catch (error) {
      console.error('🚨 BULK EXCEL TT Error:', error);
      toast.error('Toplu Excel oluştururken hata: ' + error.message);
    } finally {
      setIsExportingExcel(false);
      setExcelProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
    }
  }, []);

  // Helper function to generate Excel files from bulk data - COMPLETE (8 sheets total, includes YM TT and YM STP intermediates)
  const generateBulkExcelFiles = async (allMMProducts, allYmTtProducts, allYmStpProducts, allYMSTProducts, allMMRecetes, allYmTtRecetes, allYmStpRecetes, allYMSTRecetes) => {

    // ===== 1. STOK KARTLARI EXCEL (4 sheets: MM TT + YM TT + YM STP + YM ST) =====
    const stokWorkbook = new ExcelJS.Workbook();

    // MM TT Sheet (Tavli/Balya finished products)
    const mmSheet = stokWorkbook.addWorksheet('MM TT');
    const mmHeaders = getTavliBalyaHeaders(); // Use specific headers for Tavli/Balya
    mmSheet.addRow(mmHeaders);

    // Add all MM TT products
    allMMProducts.forEach(mm => {
      mmSheet.addRow(generateTavliBalyaStokKartiDataForBatch(mm));
    });

    // YM TT Sheet (Annealed intermediate - shared by TAVLI and BALYA)
    const ymTtSheet = stokWorkbook.addWorksheet('YM TT');
    const ymTtHeaders = getTavliBalyaHeaders(); // YM TT uses same structure as MM TT
    ymTtSheet.addRow(ymTtHeaders);

    // Add all YM TT products
    allYmTtProducts.forEach(ymTt => {
      ymTtSheet.addRow(generateTavliBalyaStokKartiDataForBatch(ymTt));
    });

    // YM STP Sheet (Pressed intermediate - used when cap > 1.8mm)
    const ymStpSheet = stokWorkbook.addWorksheet('YM STP');
    const ymStpHeaders = getTavliBalyaHeaders(); // YM STP uses same structure as MM TT
    ymStpSheet.addRow(ymStpHeaders);

    // Add all YM STP products
    allYmStpProducts.forEach(ymStp => {
      ymStpSheet.addRow(generateTavliBalyaStokKartiDataForBatch(ymStp));
    });

    // YM ST Sheet - Raw materials (shared with Galvanizli)
    const ymStSheet = stokWorkbook.addWorksheet('YM ST');
    const ymStHeaders = getYmStHeaders();
    ymStSheet.addRow(ymStHeaders);

    // Add ALL YM ST products sorted by priority (0 first, then 1, 2, ...)
    const sortedYmStProducts = allYMSTProducts.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (a.stok_kodu || '').localeCompare(b.stok_kodu || '');
    });

    sortedYmStProducts.forEach(ymSt => {
      const rowData = generateYmStStokKartiData(ymSt);
      const priority = ymSt.priority || 0;
      rowData.push(priority); // Add priority column at the end
      ymStSheet.addRow(rowData);
    });

    // Save Stok Kartları Excel
    const stokBuffer = await stokWorkbook.xlsx.writeBuffer();
    const stokTimestamp = new Date().toISOString().slice(0, 10);
    const stokFilename = `Toplu_Stok_Kartlari_TT_${stokTimestamp}.xlsx`;
    saveAs(new Blob([stokBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), stokFilename);

    console.log(`✅ BULK EXCEL TT: Generated Stock Excel with ${allMMProducts.length} MM TT, ${allYmTtProducts.length} YM TT, ${allYmStpProducts.length} YM STP, ${allYMSTProducts.length} YM ST products`);


    // ===== 2. REÇETE EXCEL (4 sheets: MM TT REÇETE + YM TT REÇETE + YM STP REÇETE + YM ST REÇETE) =====
    const receteWorkbook = new ExcelJS.Workbook();

    // MM TT REÇETE Sheet (Tavli/Balya finished products)
    const mmReceteSheet = receteWorkbook.addWorksheet('MM TT REÇETE');
    const receteHeaders = getReceteHeaders();
    mmReceteSheet.addRow(receteHeaders);

    // Group MM TT recipes by mamul_kodu for proper sequencing
    const mmByProduct = {};
    allMMRecetes.forEach(recipe => {
      if (!mmByProduct[recipe.mamul_kodu]) {
        mmByProduct[recipe.mamul_kodu] = [];
      }
      mmByProduct[recipe.mamul_kodu].push(recipe);
    });

    // Add MM TT recipes with proper sequencing per product
    const sortedMmStokCodes = Object.keys(mmByProduct).sort();
    sortedMmStokCodes.forEach(stokKodu => {
      if (mmByProduct[stokKodu] && mmByProduct[stokKodu].length > 0) {
        let productSiraNo = 1;
        mmByProduct[stokKodu].forEach(recipe => {
          mmReceteSheet.addRow(generateTavliBalyaMmReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.mamul_kodu));
          productSiraNo++;
        });
      }
    });

    // YM TT REÇETE Sheet (Annealed intermediate - uses YM ST as input)
    const ymTtReceteSheet = receteWorkbook.addWorksheet('YM TT REÇETE');
    ymTtReceteSheet.addRow(receteHeaders);

    // Group YM TT recipes by mamul_kodu for proper sequencing
    const ymTtByProduct = {};
    allYmTtRecetes.forEach(recipe => {
      if (!ymTtByProduct[recipe.mamul_kodu]) {
        ymTtByProduct[recipe.mamul_kodu] = [];
      }
      ymTtByProduct[recipe.mamul_kodu].push(recipe);
    });

    // Add YM TT recipes with proper sequencing per product
    const sortedYmTtStokCodes = Object.keys(ymTtByProduct).sort();
    sortedYmTtStokCodes.forEach(stokKodu => {
      if (ymTtByProduct[stokKodu] && ymTtByProduct[stokKodu].length > 0) {
        let productSiraNo = 1;
        ymTtByProduct[stokKodu].forEach(recipe => {
          ymTtReceteSheet.addRow(generateTavliBalyaMmReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.mamul_kodu));
          productSiraNo++;
        });
      }
    });

    // YM STP REÇETE Sheet (Pressed intermediate - uses YM ST as input)
    const ymStpReceteSheet = receteWorkbook.addWorksheet('YM STP REÇETE');
    ymStpReceteSheet.addRow(receteHeaders);

    // Group YM STP recipes by mamul_kodu for proper sequencing
    const ymStpByProduct = {};
    allYmStpRecetes.forEach(recipe => {
      if (!ymStpByProduct[recipe.mamul_kodu]) {
        ymStpByProduct[recipe.mamul_kodu] = [];
      }
      ymStpByProduct[recipe.mamul_kodu].push(recipe);
    });

    // Add YM STP recipes with proper sequencing per product
    const sortedYmStpStokCodes = Object.keys(ymStpByProduct).sort();
    sortedYmStpStokCodes.forEach(stokKodu => {
      if (ymStpByProduct[stokKodu] && ymStpByProduct[stokKodu].length > 0) {
        let productSiraNo = 1;
        ymStpByProduct[stokKodu].forEach(recipe => {
          ymStpReceteSheet.addRow(generateTavliBalyaMmReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.mamul_kodu));
          productSiraNo++;
        });
      }
    });

    // YM ST REÇETE Sheet - Raw materials (shared with Galvanizli, priority 0 only)
    const ymStReceteSheet = receteWorkbook.addWorksheet('YM ST REÇETE');
    ymStReceteSheet.addRow(receteHeaders);

    // Group YM ST recipes by mamul_kodu for proper sequencing
    const ymStByProduct = {};
    const mainYmStRecetes = allYMSTRecetes.filter(r => (r.priority || 0) === 0);
    mainYmStRecetes.forEach(recipe => {
      if (!ymStByProduct[recipe.mamul_kodu]) {
        ymStByProduct[recipe.mamul_kodu] = [];
      }
      ymStByProduct[recipe.mamul_kodu].push(recipe);
    });

    // Add main YM ST recipes (priority 0 only, no alternatives for Tavli/Balya)
    const sortedYmStStokCodes = Object.keys(ymStByProduct).sort();
    sortedYmStStokCodes.forEach(stokKodu => {
      if (ymStByProduct[stokKodu] && ymStByProduct[stokKodu].length > 0) {
        let productSiraNo = 1;
        ymStByProduct[stokKodu].forEach(recipe => {
          ymStReceteSheet.addRow(generateYmStReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.mamul_kodu, 0));
          productSiraNo++;
        });
      }
    });

    // Save Reçete Excel
    const receteBuffer = await receteWorkbook.xlsx.writeBuffer();
    const receteTimestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const receteFilename = `Toplu_Recete_TT_${receteTimestamp}.xlsx`;
    saveAs(new Blob([receteBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), receteFilename);

    console.log(`✅ BULK EXCEL TT: Generated Recipe Excel with ${Object.keys(mmByProduct).length} MM TT, ${Object.keys(ymTtByProduct).length} YM TT, ${Object.keys(ymStpByProduct).length} YM STP, ${Object.keys(ymStByProduct).length} YM ST recipes`);
  };

  // Generate Excel files from multiple requests (creates combined stok and recipe Excel files)
  const generateBatchExcelFromRequests = async (requestsList) => {
    console.log('📋 === BATCH EXCEL GENERATION STARTED ===');
    
    // Input validation
    if (!requestsList || requestsList.length === 0) {
      console.error('No requests provided to generateBatchExcelFromRequests');
      throw new Error('Hiçbir talep bulunamadı');
    }

    if (!Array.isArray(requestsList)) {
      console.error('requestsList is not an array:', typeof requestsList);
      throw new Error('Geçersiz talep listesi formatı');
    }

    console.log('📝 Request details:', requestsList.map(r => ({ 
      id: r.id, 
      status: r.status,
      created_at: r.created_at?.substring(0, 10) || 'unknown'
    })));
    
    // Initialize progress tracking
    const totalSteps = requestsList.length + 3; // requests + 3 Excel files (stok, recipe, alternatif)
    setExcelProgress({ current: 0, total: totalSteps, operation: 'Excel hazırlanıyor...', currentProduct: '' });

    // ✅ FIXED: Fetch ALL data upfront for priority-based logic (same as bulk function)
    const [ymGtResponse, ymStResponse, ymGtRecetesResponse, ymStRecetesResponse] = await Promise.all([
      fetchWithAuth(`${API_URLS.tavliNetsisYmTt}?limit=5000`),
      fetchWithAuth(`${API_URLS.galYmSt}?limit=5000`),
      fetchWithAuth(`${API_URLS.tavliNetsisYmTtRecete}?limit=10000`),
      fetchWithAuth(`${API_URLS.galYmStRecete}?limit=10000`)
    ]);

    const ymGtData = (ymGtResponse && ymGtResponse.ok) ? await ymGtResponse.json() : [];
    const ymStData = (ymStResponse && ymStResponse.ok) ? await ymStResponse.json() : [];
    const ymGtRecipeData = (ymGtRecetesResponse && ymGtRecetesResponse.ok) ? await ymGtRecetesResponse.json() : [];
    const ymStRecipeData = (ymStRecetesResponse && ymStRecetesResponse.ok) ? await ymStRecetesResponse.json() : [];


    // Collect all products from all requests (using Maps to avoid duplicates)
    const mmMap = new Map(); // key: stok_kodu, value: MM TT data
    const ymGtMap = new Map(); // key: stok_kodu, value: YM TT data (variable name kept for compatibility)
    const ymStMap = new Map(); // key: stok_kodu, value: YM ST data (main only)
    const ymStAltMaps = {}; // Dynamic: { 1: Map, 2: Map, 3: Map, ... } for unlimited alternatives
    const mmRecipeMap = new Map(); // key: `${mm_gt_stok_kodu}-${bilesen_kodu}`, value: recipe
    const ymGtRecipeMap = new Map(); // key: `${ym_gt_stok_kodu}-${bilesen_kodu}`, value: recipe
    const ymStRecipeMap = new Map(); // key: `${ym_st_stok_kodu}-${bilesen_kodu}`, value: recipe (main only)
    const ymStAltRecipeMaps = {}; // Dynamic: { 1: Map, 2: Map, 3: Map, ... } for unlimited alternative recipes

    let totalApiCalls = 0;
    let successfulApiCalls = 0;
    let failedApiCalls = 0;
    let processedRequests = 0;

    for (const request of requestsList) {
      try {
        processedRequests++;
        setExcelProgress({ 
          current: processedRequests, 
          total: totalSteps, 
          operation: `Talep verisi işleniyor... (${processedRequests}/${requestsList.length})`,
          currentProduct: request.stok_kodu || `ID: ${request.id}`
        });
        
        console.log(`🔄 [${request.id}] Processing request with stok_kodu: "${request.stok_kodu}"`);
        
        // Check if request has stok_kodu
        if (!request.stok_kodu) {
          console.warn(`⚠️ [${request.id}] Request has no stok_kodu - skipping (old request without stok_kodu)`);
          continue;
        }
        
        // Find MM TT by stok_kodu
        console.log(`🔍 [${request.id}] Searching for MM TT with stok_kodu: "${request.stok_kodu}"`);
        
        totalApiCalls++;
        let mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_kodu=${request.stok_kodu}`);
        
        // If exact match fails due to parameter error, fetch all and filter client-side
        if (!mmResponse || !mmResponse.ok) {
          console.log(`🔍 [${request.id}] Exact match failed, fetching all MM TT and filtering client-side...`);
          const allMmGtResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?limit=1000`);
          if (allMmGtResponse && allMmGtResponse.ok) {
            const allMmGtProducts = await allMmGtResponse.json();
            const filteredProducts = allMmGtProducts.filter(p => p.stok_kodu === request.stok_kodu);
            
            // Create a mock response with filtered data
            mmResponse = {
              ok: true,
              json: async () => filteredProducts
            };
            
            console.log(`🔍 [${request.id}] Client-side filtering found ${filteredProducts.length} products with stok_kodu: "${request.stok_kodu}"`);
          }
        }
        
        if (mmResponse && mmResponse.ok) {
          const mmProducts = await mmResponse.json();
          successfulApiCalls++;
          
          console.log(`📋 [${request.id}] MM TT API response:`, mmProducts);
          
          // The API returns an array even for single stok_kodu query
          const mmArray = Array.isArray(mmProducts) ? mmProducts : [mmProducts];
          
          if (mmArray.length > 0) {
            console.log(`📦 [${request.id}] Found ${mmArray.length} MM TT product(s):`, mmArray.map(p => ({ 
              stok_kodu: p.stok_kodu, 
              id: p.id, 
              cap: p.cap,
              kg: p.kg
            })));
          }
          
          if (mmArray.length === 0) {
            console.warn(`⚠️ [${request.id}] No MM TT product found with stok_kodu: "${request.stok_kodu}"`);
            console.warn(`⚠️ [${request.id}] This could mean: 1) Product was deleted, 2) Wrong stok_kodu, 3) Sequence mismatch`);
            continue;
          }
          
          // Process only the specific MM TT for this request
          for (const mm of mmArray) {
            // Add MM TT
            console.log(`➕ [${request.id}] Adding MM TT to map: ${mm.stok_kodu} (ID: ${mm.id})`);
            mmMap.set(mm.stok_kodu, mm);

            // STEP 1: Fetch MM TT recipes first to extract YM TT stok_kodu
            console.log(`📖 [${processedRequests}/${requestsList.length}] Fetching MM TT recipes for mm_gt_id=${mm.id} (stok_kodu: ${mm.stok_kodu})...`);
            const allRecipesResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}?limit=10000`);
            let mmRecipes = [];

            if (allRecipesResponse && allRecipesResponse.ok) {
              const allRecipes = await allRecipesResponse.json();
              console.log(`📊 Total MM TT recipes fetched from API: ${allRecipes.length}`);

              // Try ID matching first, then stok_kodu matching as fallback
              const recipesByIdFilter = allRecipes.filter(r => r.mm_gt_id == mm.id);
              const recipesByStokKodu = allRecipes.filter(r => r.mamul_kodu === mm.stok_kodu);

              if (recipesByIdFilter.length > 0) {
                mmRecipes = recipesByIdFilter;
                console.log(`✅ Found ${mmRecipes.length} MM TT recipes by ID`);
              } else if (recipesByStokKodu.length > 0) {
                mmRecipes = recipesByStokKodu;
                console.log(`⚠️ Found ${mmRecipes.length} MM TT recipes by stok_kodu fallback`);
              } else {
                console.error(`❌ NO RECIPES found for MM TT ${mm.stok_kodu}`);
              }

              // Store MM TT recipes in map
              mmRecipes.forEach(r => {
                let updatedBilesenKodu = r.bilesen_kodu;
                if (r.bilesen_kodu && r.bilesen_kodu.includes('YM.GT.')) {
                  const mmSequence = mm.stok_kodu?.split('.').pop() || '00';
                  const bilesenParts = r.bilesen_kodu.split('.');
                  if (bilesenParts.length >= 5) {
                    bilesenParts[bilesenParts.length - 1] = mmSequence;
                    updatedBilesenKodu = bilesenParts.join('.');
                  }
                }

                const key = `${mm.stok_kodu}-${updatedBilesenKodu}`;
                mmRecipeMap.set(key, {
                  ...r,
                  bilesen_kodu: updatedBilesenKodu,
                  mm_gt_stok_kodu: mm.stok_kodu,
                  sequence: mm.stok_kodu?.split('.').pop() || '00'
                });
              });
            }

            // STEP 2: Extract YM TT stok_kodu from MM TT recipes
            const ymGtRecipe = mmRecipes.find(r =>
              (r.operasyon_bilesen === 'B' || r.operasyon_bilesen === 'Bileşen') &&
              r.bilesen_kodu &&
              r.bilesen_kodu.startsWith('YM.GT.')
            );

            let ymGtStokKodu = null;
            if (ymGtRecipe) {
              // Extract and update YM TT stok_kodu with MM TT sequence
              const mmSequence = mm.stok_kodu?.split('.').pop() || '00';
              const bilesenParts = ymGtRecipe.bilesen_kodu.split('.');
              if (bilesenParts.length >= 5) {
                bilesenParts[bilesenParts.length - 1] = mmSequence;
                ymGtStokKodu = bilesenParts.join('.');
              } else {
                ymGtStokKodu = ymGtRecipe.bilesen_kodu;
              }
            } else {
              // Fallback: Construct YM TT stok_kodu from MM TT stok_kodu
              ymGtStokKodu = mm.stok_kodu.replace('GT.', 'YM.GT.'); // Note: Variable name kept for compatibility
            }

            // STEP 3: Fetch YM TT by stok_kodu
            if (ymGtStokKodu) {
              const allYmGtResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmTt}?limit=1000`);

              if (allYmGtResponse && allYmGtResponse.ok) {
                const allYmGt = await allYmGtResponse.json();
                const ymGt = allYmGt.find(r => r.stok_kodu === ymGtStokKodu);

                if (ymGt) {
                  ymGtMap.set(ymGt.stok_kodu, ymGt);

                  // Fetch YM TT recipes
                  const allYmGtRecipesResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmTtRecete}?limit=2000`);

                  if (allYmGtRecipesResponse && allYmGtRecipesResponse.ok) {
                    const allYmGtRecipes = await allYmGtRecipesResponse.json();
                    const ymGtRecipes = allYmGtRecipes.filter(r => r.ym_gt_id == ymGt.id);

                    // Store YM TT recipes
                    ymGtRecipes.forEach(r => {
                      const key = `${ymGt.stok_kodu}-${r.bilesen_kodu}`;
                      ymGtRecipeMap.set(key, {
                        ...r,
                        ym_gt_stok_kodu: ymGt.stok_kodu,
                        mm_gt_stok_kodu: mm.stok_kodu,
                        sequence: mm.stok_kodu?.split('.').pop() || '00',
                      });
                    });

                    // STEP 4: Extract main YM ST from YM TT recipes
                    const mainYmStRecipe = ymGtRecipes.find(r =>
                      (r.operasyon_bilesen === 'B' || r.operasyon_bilesen === 'Bileşen') &&
                      r.bilesen_kodu &&
                      r.bilesen_kodu.startsWith('YM.ST.')
                    );

                    if (mainYmStRecipe) {

                      // Fetch main YM ST
                      const allYmStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?limit=1000`);
                      if (allYmStResponse && allYmStResponse.ok) {
                        const allYmSt = await allYmStResponse.json();
                        const ymSt = allYmSt.find(r => r.stok_kodu === mainYmStRecipe.bilesen_kodu);

                        if (ymSt) {
                          console.log(`✅ Found main YM ST: ${ymSt.stok_kodu} (ID: ${ymSt.id})`);
                          ymStMap.set(ymSt.stok_kodu, ymSt);

                          // Fetch main YM ST recipes
                          const allYmStRecipesResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?limit=2000`);
                          if (allYmStRecipesResponse && allYmStRecipesResponse.ok) {
                            const allYmStRecipes = await allYmStRecipesResponse.json();
                            const ymStRecipes = allYmStRecipes.filter(r => r.ym_st_id == ymSt.id);
                            console.log(`✅ Found ${ymStRecipes.length} main YM ST recipes`);

                            ymStRecipes.forEach(r => {
                              const key = `${ymSt.stok_kodu}-${r.bilesen_kodu}`;
                              ymStRecipeMap.set(key, {
                                ...r,
                                ym_st_stok_kodu: ymSt.stok_kodu
                              });
                            });
                          }
                        }
                      }
                    }
                  }
                } else {
                }
              }
            }

            // ✅ FIXED: STEP 5: Handle alternatives using PRIORITY column (not relationship table)
            console.log(`📋 BATCH: Using priority-based method for MM TT ${mm.stok_kodu}`);

            // Use YM TT that was already fetched and added to map (from line 10501)
            // Don't rely on ymGtData array which might be empty due to API timeout
            const ymGtForPriority = ymGtMap.get(ymGtStokKodu);

            if (ymGtForPriority) {
              const ymGtIdForPriority = ymGtForPriority.id;

              // Add YM TT to map (if not already added)
              if (!ymGtMap.has(ymGtForPriority.stok_kodu)) {
                ymGtMap.set(ymGtForPriority.stok_kodu, ymGtForPriority);
              }

              // Get YM TT recipes (might already be in map from above)
              const ymGtRecipesForPriority = ymGtRecipeData.filter(r => r.ym_gt_id == ymGtIdForPriority);

              // Store recipes if not already stored
              ymGtRecipesForPriority.forEach(r => {
                const key = `${ymGtForPriority.stok_kodu}-${r.bilesen_kodu}`;
                if (!ymGtRecipeMap.has(key)) {
                  ymGtRecipeMap.set(key, {
                    ...r,
                    mm_gt_stok_kodu: mm.stok_kodu,
                    sequence: mm.stok_kodu?.split('.').pop() || '00',
                    ym_gt_stok_kodu: ymGtForPriority.stok_kodu
                  });
                }
              });

              // ✅ FIXED: Find YM ST bilesen from YM TT recipe
              const ymStRecipe = ymGtRecipesForPriority.find(r => r.bilesen_kodu && r.bilesen_kodu.startsWith('YM.ST.'));
              if (ymStRecipe) {
                const mainYmStCode = ymStRecipe.bilesen_kodu;
                console.log(`📋 BATCH: Main YM ST bilesen: ${mainYmStCode}`);

                // Find main YM ST product (might already be in map from earlier code)
                let mainYmSt = ymStMap.get(mainYmStCode);
                if (!mainYmSt) {
                  mainYmSt = ymStData.find(ym => ym.stok_kodu === mainYmStCode);
                  if (mainYmSt) {
                    console.log(`✅ BATCH: Adding main YM ST from ymStData: ${mainYmSt.stok_kodu} (priority: ${mainYmSt.priority || 0})`);
                    ymStMap.set(mainYmSt.stok_kodu, mainYmSt);
                  }
                } else {
                  console.log(`✅ BATCH: Main YM ST already in map: ${mainYmSt.stok_kodu} (priority: ${mainYmSt.priority || 0})`);
                }

                if (mainYmSt) {
                  // Add main YM ST recipes (if not already added)
                  const mainYmStRecipes = ymStRecipeData.filter(r => r.ym_st_id == mainYmSt.id);
                  mainYmStRecipes.forEach(r => {
                    const key = `${mainYmSt.stok_kodu}-${r.bilesen_kodu}`;
                    if (!ymStRecipeMap.has(key)) {
                      ymStRecipeMap.set(key, {
                        ...r,
                        ym_st_stok_kodu: mainYmSt.stok_kodu
                      });
                    }
                  });

                  // ✅ FIXED: Find alternatives using PRIORITY column
                  let targetDiameter = null;
                  const stMatch = mainYmStCode.match(/YM\.ST\.(\d{4})/);
                  if (stMatch) {
                    targetDiameter = parseInt(stMatch[1], 10);
                  }

                  if (targetDiameter) {
                    console.log(`📋 BATCH: Searching for alternatives for diameter ${targetDiameter/100}mm`);

                    // Find all YM ST with same diameter and priority > 0
                    const alternatives = ymStData.filter(ym => {
                      const ymMatch = ym.stok_kodu.match(/YM\.ST\.(\d{4})/);
                      if (!ymMatch) return false;
                      const ymDiameter = parseInt(ymMatch[1], 10);
                      if (ymDiameter !== targetDiameter) return false;

                      const priority = ym.priority || 0;
                      return priority > 0;
                    });

                    console.log(`📋 BATCH: Found ${alternatives.length} alternatives using priority column`);

                    // Group alternatives by priority
                    alternatives.forEach(ymSt => {
                      const priority = ymSt.priority || 1;

                      // Initialize maps for this priority if needed
                      if (!ymStAltMaps[priority]) {
                        ymStAltMaps[priority] = new Map();
                      }
                      if (!ymStAltRecipeMaps[priority]) {
                        ymStAltRecipeMaps[priority] = new Map();
                      }

                      console.log(`📦 BATCH: Adding YM ST to ALT ${priority}: ${ymSt.stok_kodu}`);
                      ymStAltMaps[priority].set(ymSt.stok_kodu, ymSt);

                      // Add alternative YM ST recipes
                      const altRecipes = ymStRecipeData.filter(r => r.ym_st_id == ymSt.id);
                      altRecipes.forEach(r => {
                        const key = `${ymSt.stok_kodu}-${r.bilesen_kodu}`;
                        ymStAltRecipeMaps[priority].set(key, {
                          ...r,
                          ym_st_stok_kodu: ymSt.stok_kodu
                        });
                      });
                    });
                  } else {
                    console.warn(`⚠️ BATCH: Could not extract diameter from ${mainYmStCode}`);
                  }
                } else {
                  console.warn(`⚠️ BATCH: Main YM ST not found: ${mainYmStCode}`);
                }
              } else {
              }
            } else {
            }
          }
        } else {
          failedApiCalls++;
          console.error('[' + request.id + '] MM TT API failed - Response status: ' + (mmResponse?.status || 'undefined'));
          console.error('[' + request.id + '] Response text:', await mmResponse?.text().catch(() => 'Unable to read response'));
        }
      } catch (error) {
        failedApiCalls++;
        console.error('[' + request.id + '] Exception during data loading:', error);
        console.error('[' + request.id + '] Error details:', error.message);
      }
    } // End of outer for loop

    // API call statistics
    console.log('📊 === API CALL STATISTICS ===');

    // Convert Maps to arrays for Excel generation
    console.log('🗂️ === FINAL MAP CONTENTS ===');
    console.log(`MM TT Map keys: [${Array.from(mmMap.keys()).join(', ')}]`);
    console.log(`YM ST Map keys: [${Array.from(ymStMap.keys()).join(', ')}]`);

    // Log alternative maps dynamically
    Object.keys(ymStAltMaps).forEach(seqIndex => {
      console.log(`YM ST ALT ${seqIndex} Map keys: [${Array.from(ymStAltMaps[seqIndex].keys()).join(', ')}]`);
    });

    const allMmGtData = Array.from(mmMap.values());
    const allYmGtData = Array.from(ymGtMap.values());
    const allYmStData = Array.from(ymStMap.values());

    // Convert alternative maps to arrays dynamically
    const allYmStAltData = {}; // { 1: array, 2: array, 3: array, ... }
    Object.keys(ymStAltMaps).forEach(seqIndex => {
      allYmStAltData[seqIndex] = Array.from(ymStAltMaps[seqIndex].values());
    });

    const allMmGtRecipes = Array.from(mmRecipeMap.values());
    const allYmGtRecipes = Array.from(ymGtRecipeMap.values());
    const allYmStRecipes = Array.from(ymStRecipeMap.values());

    // Convert alternative recipe maps to arrays dynamically
    const allYmStAltRecipes = {}; // { 1: array, 2: array, 3: array, ... }
    Object.keys(ymStAltRecipeMaps).forEach(seqIndex => {
      allYmStAltRecipes[seqIndex] = Array.from(ymStAltRecipeMaps[seqIndex].values());
    });

    console.log('📊 === BATCH DATA COLLECTION SUMMARY ===');
    console.log(`MM TT Products: ${allMmGtData.length}`);
    console.log(`MM TT Recipes: ${allMmGtRecipes.length} (should be ~${allMmGtData.length * 8} for 8 components per product)`);
    console.log(`YM ST Products (Ana): ${allYmStData.length}`);
    console.log(`YM ST Recipes (Ana): ${allYmStRecipes.length}`);

    // Log alternatives dynamically
    Object.keys(allYmStAltData).forEach(seqIndex => {
      console.log(`YM ST Products (ALT ${seqIndex}): ${allYmStAltData[seqIndex].length}`);
      console.log(`YM ST Recipes (ALT ${seqIndex}): ${(allYmStAltRecipes[seqIndex] || []).length}`);
    });
    
    // Sort all products by diameter (cap) in ascending order (low to high)
    console.log('🔢 Sorting products by diameter (Çap) - ascending order...');
    
    const sortedMmGtData = allMmGtData.sort((a, b) => {
      const capA = parseFloat(a.cap) || 0;
      const capB = parseFloat(b.cap) || 0;
      // First sort by cap (diameter)
      if (capA !== capB) {
        return capA - capB; // Ascending: smaller diameters first
      }
      // If caps are equal, sort by stok_kodu to ensure sequence order
      return (a.stok_kodu || '').localeCompare(b.stok_kodu || '');
    });
    
    const sortedYmGtData = allYmGtData.sort((a, b) => {
      const capA = parseFloat(a.cap) || 0;
      const capB = parseFloat(b.cap) || 0;
      // First sort by cap (diameter)
      if (capA !== capB) {
        return capA - capB; // Ascending: smaller diameters first
      }
      // If caps are equal, sort by stok_kodu to ensure sequence order
      return (a.stok_kodu || '').localeCompare(b.stok_kodu || '');
    });
    
    const sortedYmStData = allYmStData.sort((a, b) => {
      const capA = parseFloat(a.cap) || 0;
      const capB = parseFloat(b.cap) || 0;
      // First sort by cap (diameter)
      if (capA !== capB) {
        return capA - capB; // Ascending: smaller diameters first
      }
      // If caps are equal, sort by stok_kodu to ensure sequence order
      return (a.stok_kodu || '').localeCompare(b.stok_kodu || '');
    });

    // Sort alternatives dynamically
    const sortedYmStAltData = {};
    Object.keys(allYmStAltData).forEach(seqIndex => {
      sortedYmStAltData[seqIndex] = allYmStAltData[seqIndex].sort((a, b) => {
        const capA = parseFloat(a.cap) || 0;
        const capB = parseFloat(b.cap) || 0;
        if (capA !== capB) {
          return capA - capB;
        }
        return (a.stok_kodu || '').localeCompare(b.stok_kodu || '');
      });
    });

    // Recipe order will be determined by sorted product data in generateBatchReceteExcel
    
    
    // Final data collection summary (after sorting)
    console.log('📊 === FINAL DATA COLLECTION SUMMARY (SORTED BY DIAMETER) ===');
    
    // Detailed product information (sorted by diameter)
    if (sortedMmGtData.length > 0) {
      console.log('📦 MM TT Products details (sorted by cap):', sortedMmGtData.map(m => ({ 
        stok_kodu: m.stok_kodu, 
        id: m.id, 
        request_id: m.request_id,
        cap: m.cap,
        kg: m.kg
      })));
    }
    if (sortedYmGtData.length > 0) {
      console.log('📦 YM TT Products details (sorted by cap):', sortedYmGtData.map(y => ({
        stok_kodu: y.stok_kodu,
        id: y.id,
        cap: y.cap
      })));
    }
    if (sortedYmStData.length > 0) {
      console.log('📦 YM ST Products details (sorted by cap):', sortedYmStData.map(s => ({ 
        stok_kodu: s.stok_kodu, 
        id: s.id,
        cap: s.cap,
        filmasin: s.filmasin
      })));
    }
    
    // Critical validation
    if (sortedMmGtData.length === 0) {
      console.error('💥 CRITICAL ERROR: No MM TT products found in any approved requests!');
      console.error('💡 Possible causes:');
      console.error('   1. Approved requests exist but have no saved MM TT products');
      console.error('   2. Database connection issue');
      console.error('   3. API filtering problem');
      console.error('   4. Products were deleted after approval');
      throw new Error('Seçilen onaylanmış taleplerde hiçbir ürün bulunamadı. Lütfen taleplerin doğru şekilde kaydedildiğinden emin olun.');
    }
    

    // Create two separate Excel files with EXACT same format as individual exports
    console.log('📄 Starting Stok Kartı Excel generation...');

    // Calculate total alternative products for progress message
    const altCounts = Object.keys(sortedYmStAltData).map(idx => `ALT ${idx}: ${sortedYmStAltData[idx].length}`).join(', ');

    setExcelProgress({
      current: requestsList.length + 1,
      total: totalSteps,
      operation: 'Stok Kartı Excel oluşturuluyor...',
      currentProduct: `${sortedMmGtData.length} MM TT, ${sortedYmGtData.length} YM TT, ${sortedYmStData.length} YM ST (Ana)${altCounts ? ', ' + altCounts : ''}`
    });
    await generateBatchStokKartiExcel(sortedMmGtData, sortedYmGtData, sortedYmStData, sortedYmStAltData);

    console.log('📄 Starting Reçete Excel generation...');

    // Calculate total recipes (ALT recipes will be generated dynamically)
    const totalRecipes = allMmGtRecipes.length + allYmGtRecipes.length + allYmStRecipes.length;

    setExcelProgress({
      current: requestsList.length + 2,
      total: totalSteps,
      operation: 'Reçete Excel oluşturuluyor...',
      currentProduct: `${totalRecipes} ana reçete (ALT reçeteler dinamik olarak oluşturulacak)`
    });
    await generateBatchReceteExcel(allMmGtRecipes, allYmGtRecipes, allYmStRecipes, sortedMmGtData, sortedYmGtData, sortedYmStData);
    
    console.log('🎉 === BATCH EXCEL GENERATION COMPLETED SUCCESSFULLY ===');
    setExcelProgress({ 
      current: totalSteps, 
      total: totalSteps, 
      operation: 'Tamamlandı!',
      currentProduct: 'Excel dosyaları başarıyla oluşturuldu'
    });
  };

  // Generate batch stock card Excel - EXACT same format as individual, just multiple rows
  const generateBatchStokKartiExcel = async (mmData, ymTtData, ymStpData, ymStData, ymStAltDataObj) => {
    console.log('📋 Batch Stok Kartı Excel - Input validation');

    if (!mmData || mmData.length === 0) {
      throw new Error('MM TT verisi bulunamadı - Stok Kartı Excel oluşturulamıyor');
    }

    const workbook = new ExcelJS.Workbook();

    // MM TT Sheet (Final Product - TT.BAG or TT.BALYA)
    const mmSheet = workbook.addWorksheet('MM TT');
    const mmHeaders = getStokKartiHeaders();
    mmSheet.addRow(mmHeaders);

    // Add multiple MM TT rows (one per product)
    for (const mm of mmData) {
      mmSheet.addRow(generateMmTtStokKartiDataForBatch(mm));
    }

    // YM TT Sheet (Annealed Intermediate - shared by both TAVLI and BALYA)
    if (ymTtData && ymTtData.length > 0) {
      const ymTtSheet = workbook.addWorksheet('YM TT');
      ymTtSheet.addRow(mmHeaders); // Same headers as MM TT
      for (const ymTt of ymTtData) {
        ymTtSheet.addRow(generateYmTtStokKartiData(ymTt));
      }
    }

    // YM STP Sheet (Pressed Intermediate - only if cap > 1.8mm)
    if (ymStpData && ymStpData.length > 0) {
      const ymStpSheet = workbook.addWorksheet('YM STP');
      ymStpSheet.addRow(mmHeaders); // Same headers as MM TT
      for (const ymStp of ymStpData) {
        ymStpSheet.addRow(generateYmStpStokKartiData(ymStp));
      }
    }

    // YM ST Sheet (Ana) - Main products only
    const ymStSheet = workbook.addWorksheet('YM ST');
    const ymStHeaders = getYmStHeaders();
    ymStSheet.addRow(ymStHeaders);

    // Categorize all YM STs by priority (from ymStData and ymStAltDataObj)
    const allYmSts = [...ymStData];
    if (ymStAltDataObj) {
      Object.values(ymStAltDataObj).forEach(altArray => {
        if (Array.isArray(altArray)) {
          allYmSts.push(...altArray);
        }
      });
    }

    // Group by priority
    const ymStsByPriority = {};
    allYmSts.forEach(ymSt => {
      const priority = ymSt.priority !== undefined ? ymSt.priority : 0;
      if (!ymStsByPriority[priority]) {
        ymStsByPriority[priority] = [];
      }
      ymStsByPriority[priority].push(ymSt);
    });

    // Add YM STs dynamically for each priority
    const priorities = Object.keys(ymStsByPriority).map(Number).sort((a, b) => a - b);

    priorities.forEach(priority => {
      const ymSts = ymStsByPriority[priority];

      if (priority === 0) {
        // Main products (priority 0) - add to main YM ST sheet
        ymSts.forEach(ymSt => {
          ymStSheet.addRow(generateYmStStokKartiData(ymSt));
        });
      } else if (priority > 0) {
        // ✅ FIXED: Alternative products (priority 1, 2, 3, ...) - Only create ALT sheets for priority >= 1
        if (ymSts.length > 0) {
          const altSheet = workbook.addWorksheet(`YM ST ALT ${priority}`);
          altSheet.addRow(ymStHeaders);
          ymSts.forEach(ymSt => {
            altSheet.addRow(generateYmStStokKartiData(ymSt));
          });
        }
      }
    });

    // Save with timestamp filename
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Toplu_Stok_Kartlari_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);

  };

  // Generate batch recipe Excel - EXACT same format as individual, just multiple rows
  const generateBatchReceteExcel = async (mmRecipes, ymTtRecipes, ymStpRecipes, ymStRecipes, sortedMmGtData, sortedYmTtData, sortedYmStpData, sortedYmStData) => {
    console.log('📋 Batch Reçete Excel - Input validation');

    const workbook = new ExcelJS.Workbook();

    // MM TT REÇETE Sheet (Final Product)
    const mmReceteSheet = workbook.addWorksheet('MM TT REÇETE');
    const receteHeaders = getReceteHeaders();
    mmReceteSheet.addRow(receteHeaders);
    
    // FIXED: Add multiple MM TT recipe rows with per-product sequence numbering
    const mmByProduct = {};
    console.log(`📊 Total MM TT recipes to process: ${mmRecipes.length}`);
    mmRecipes.forEach(recipe => {
      if (!mmByProduct[recipe.mm_gt_stok_kodu]) {
        mmByProduct[recipe.mm_gt_stok_kodu] = [];
      }
      mmByProduct[recipe.mm_gt_stok_kodu].push(recipe);
    });
    console.log(`📊 Recipes grouped into ${Object.keys(mmByProduct).length} products`);
    
    // Get stok codes from sorted product data to maintain diameter order
    const sortedMmGtStokCodes = sortedMmGtData.map(product => product.stok_kodu);
    console.log('🔍 DEBUG: Sorted MM TT product order by cap:', sortedMmGtData.map(p => ({ stok_kodu: p.stok_kodu, cap: p.cap })));
    console.log('🔍 DEBUG: Available MM TT recipe stok codes:', Object.keys(mmByProduct));
    console.log('🔍 DEBUG: Full mmByProduct structure:', mmByProduct);
    
    sortedMmGtStokCodes.forEach((stokKodu, index) => {
      if (mmByProduct[stokKodu] && mmByProduct[stokKodu].length > 0) {
        console.log(`✅ Adding ${mmByProduct[stokKodu].length} recipes for MM TT: ${stokKodu}`);
        let productSiraNo = 1; // Restart sequence for each product
        mmByProduct[stokKodu].forEach(recipe => {
          mmReceteSheet.addRow(generateMmTtReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.mm_gt_stok_kodu));
          productSiraNo++;
        });
      } else {
        console.warn(`⚠️ No recipes found for MM TT: ${stokKodu} - This product will have no recipe rows in Excel`);
      }
    });

    // YM TT REÇETE Sheet (Annealed Intermediate - always exists)
    if (ymTtRecipes && ymTtRecipes.length > 0) {
      const ymTtReceteSheet = workbook.addWorksheet('YM TT REÇETE');
      ymTtReceteSheet.addRow(receteHeaders);

      const ymTtByProduct = {};
      ymTtRecipes.forEach(recipe => {
        if (!ymTtByProduct[recipe.ym_tt_stok_kodu]) {
          ymTtByProduct[recipe.ym_tt_stok_kodu] = [];
        }
        ymTtByProduct[recipe.ym_tt_stok_kodu].push(recipe);
      });

      const sortedYmTtStokCodes = sortedYmTtData && sortedYmTtData.length > 0
        ? sortedYmTtData.map(product => product.stok_kodu)
        : Object.keys(ymTtByProduct);

      sortedYmTtStokCodes.forEach(stokKodu => {
        if (ymTtByProduct[stokKodu] && ymTtByProduct[stokKodu].length > 0) {
          console.log(`✅ Adding ${ymTtByProduct[stokKodu].length} recipes for YM TT: ${stokKodu}`);
          let productSiraNo = 1;
          ymTtByProduct[stokKodu].forEach(recipe => {
            ymTtReceteSheet.addRow(generateYmTtReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.ym_tt_stok_kodu, recipe.operasyon_bilesen));
            productSiraNo++;
          });
        }
      });

      console.log(`✅ YM TT REÇETE sheet created with ${ymTtRecipes.length} recipes`);
    }

    // YM STP REÇETE Sheet (Pressed Intermediate - only if cap > 1.8mm)
    if (ymStpRecipes && ymStpRecipes.length > 0) {
      const ymStpReceteSheet = workbook.addWorksheet('YM STP REÇETE');
      ymStpReceteSheet.addRow(receteHeaders);

      const ymStpByProduct = {};
      ymStpRecipes.forEach(recipe => {
        if (!ymStpByProduct[recipe.ym_stp_stok_kodu]) {
          ymStpByProduct[recipe.ym_stp_stok_kodu] = [];
        }
        ymStpByProduct[recipe.ym_stp_stok_kodu].push(recipe);
      });

      const sortedYmStpStokCodes = sortedYmStpData && sortedYmStpData.length > 0
        ? sortedYmStpData.map(product => product.stok_kodu)
        : Object.keys(ymStpByProduct);

      sortedYmStpStokCodes.forEach(stokKodu => {
        if (ymStpByProduct[stokKodu] && ymStpByProduct[stokKodu].length > 0) {
          console.log(`✅ Adding ${ymStpByProduct[stokKodu].length} recipes for YM STP: ${stokKodu}`);
          let productSiraNo = 1;
          ymStpByProduct[stokKodu].forEach(recipe => {
            ymStpReceteSheet.addRow(generateYmStpReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.ym_stp_stok_kodu, recipe.operasyon_bilesen));
            productSiraNo++;
          });
        }
      });

      console.log(`✅ YM STP REÇETE sheet created with ${ymStpRecipes.length} recipes`);
    }

    // YM ST REÇETE Sheet - Main products (priority 0)
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    ymStReceteSheet.addRow(receteHeaders);

    // 🆕 Generate COILER alternatives dynamically for .ST products (up to 8 alternatives)
    console.log('🔄 BATCH RECETE: Generating COILER alternatives for .ST products...');
    const coilerAlternatives = generateCoilerAlternatives(ymStRecipes, sortedYmStData);
    const altPriorities = Object.keys(coilerAlternatives).map(Number).sort((a, b) => a - b);
    console.log(`📋 BATCH RECETE: Generated COILER alternatives for priorities: ${altPriorities.join(', ')}`);

    // Group main recipes by product
    const ymStByProduct = {};
    ymStRecipes.forEach(recipe => {
      if (!ymStByProduct[recipe.ym_st_stok_kodu]) {
        ymStByProduct[recipe.ym_st_stok_kodu] = [];
      }
      ymStByProduct[recipe.ym_st_stok_kodu].push(recipe);
    });

    // Add main recipes (priority 0)
    const sortedYmStStokCodes = sortedYmStData.map(product => product.stok_kodu);
    sortedYmStStokCodes.forEach(stokKodu => {
      if (ymStByProduct[stokKodu] && ymStByProduct[stokKodu].length > 0) {
        let productSiraNo = 1;
        ymStByProduct[stokKodu].forEach(recipe => {
          ymStReceteSheet.addRow(generateYmStReceteRowForBatch(
            recipe.bilesen_kodu,
            recipe.miktar,
            productSiraNo,
            recipe.ym_st_stok_kodu,
            0 // Priority 0 for main sheet
          ));
          productSiraNo++;
        });
      }
    });

    // 🆕 Create YM ST REÇETE ALT 1-8 sheets dynamically based on generated alternatives
    altPriorities.forEach(priority => {
      const altRecipes = coilerAlternatives[priority];
      if (!altRecipes || altRecipes.length === 0) return;

      const altSheet = workbook.addWorksheet(`YM ST REÇETE ALT ${priority}`);
      altSheet.addRow(receteHeaders);

      // Group recipes by product
      const ymStAltByProduct = {};
      altRecipes.forEach(recipe => {
        if (!ymStAltByProduct[recipe.mamul_kodu]) {
          ymStAltByProduct[recipe.mamul_kodu] = [];
        }
        ymStAltByProduct[recipe.mamul_kodu].push(recipe);
      });

      // Add recipes sorted by product code
      Object.keys(ymStAltByProduct).sort().forEach(stokKodu => {
        if (ymStAltByProduct[stokKodu] && ymStAltByProduct[stokKodu].length > 0) {
          let productSiraNo = 1;
          ymStAltByProduct[stokKodu].forEach(recipe => {
            altSheet.addRow(generateYmStReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.mamul_kodu, priority));
            productSiraNo++;
          });
        }
      });

      console.log(`✅ BATCH RECETE: Created YM ST REÇETE ALT ${priority} sheet with ${altRecipes.length} recipes`);
    });

    // Save with timestamp filename
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Toplu_Receteler_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);

  };

  // Handle edit confirmation
  const handleEditConfirm = async () => {
    try {
      setIsLoading(true);
      setShowEditConfirmModal(false);
      
      // Proceed with saving using the existing checkForDuplicatesAndConfirm function
      const saveResult = await checkForDuplicatesAndConfirm();
      
      // If there's a queue resolve function waiting, call it
      if (window.editConfirmResolve) {
        window.editConfirmResolve(saveResult);
        window.editConfirmResolve = null;
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error in handleEditConfirm:', error);
      setIsLoading(false);
      
      // If there's a queue resolve function waiting, call it with error
      if (window.editConfirmResolve) {
        window.editConfirmResolve(false);
        window.editConfirmResolve = null;
      }
    }
  };

  // Generate Excel files for a specific request by loading its data from database
  const generateExcelFromRequest = async (request) => {
    if (!request || !request.stok_kodu) {
      toast.error('Geçersiz talep - stok_kodu bulunamadı');
      return;
    }

    try {
      setIsLoading(true);
      console.log(`🔄 Generating Excel for request ${request.id} with stok_kodu: ${request.stok_kodu}`);
      
      // Extract sequence from stok_kodu
      let requestSequence = '00';
      if (request.stok_kodu) {
        const match = request.stok_kodu.match(/\.(\d+)$/);
        if (match) {
          requestSequence = match[1];
        }
      }
      
      console.log(`📊 Using sequence: ${requestSequence} for request ${request.id}`);
      
      // Find MM TT by stok_kodu
      const mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_kodu=${request.stok_kodu}`);
      if (!mmResponse || !mmResponse.ok) {
        throw new Error('MM TT ürünü bulunamadı');
      }
      
      const mmProducts = await mmResponse.json();
      if (!mmProducts || mmProducts.length === 0) {
        throw new Error('MM TT ürünü veritabanında bulunamadı');
      }
      
      const mm = mmProducts[0];
      console.log(`📦 Found MM TT:`, { stok_kodu: mm.stok_kodu, id: mm.id });
      
      // Create individual Excel files using the request data
      await generateBatchExcelFromRequests([request]);
      
      toast.success('Excel dosyaları başarıyla oluşturuldu');
    } catch (error) {
      console.error('Excel generation from request failed:', error);
      toast.error('Excel oluşturulurken hata: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Excel for a specific task using stored data
  const generateExcelForTask = async (task) => {
    if (!task.excelData) {
      throw new Error('Bu görev için Excel verileri bulunamadı');
    }

    try {
      const { excelData } = task;
      
      // Use the existing Excel generation logic with stored data
      const Excel = require('exceljs');
      const { saveAs } = require('file-saver');
      
      // Create both stok kartı and reçete files
      await Promise.all([
        generateStokKartiExcelFromData(excelData),
        generateReceteExcelFromData(excelData)
      ]);
      
      toast.success('Excel dosyaları başarıyla oluşturuldu!');
      
    } catch (error) {
      console.error('Task Excel generation error:', error);
      throw error;
    }
  };

  // Helper function to generate individual stok kartı Excel from stored data
  const generateStokKartiExcelFromData = async (excelData) => {
    console.log('📋 === STOK KARTI EXCEL GENERATION DEBUG START ===');
    console.log('📋 ExcelData received:', {
      hasMMData: !!excelData.mmData,
      mmDataStokKodu: excelData.mmData?.stok_kodu,
      mmDataStokAdi: excelData.mmData?.stok_adi,
      mmDataCap: excelData.mmData?.cap,
      selectedYmStsCount: excelData.selectedYmSts?.length,
      autoGeneratedYmStsCount: excelData.autoGeneratedYmSts?.length,
      mainYmStIndex: excelData.mainYmStIndex,
      sequence: excelData.sequence
    });

    const Excel = require('exceljs');
    const { saveAs } = require('file-saver');

    const workbook = new Excel.Workbook();
    const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];

    console.log('📋 All YM.ST products combined:', allYmSts.map(y => ({ stok_kodu: y.stok_kodu, stok_adi: y.stok_adi })));

    // Ana YM ST'yi belirle
    const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];

    console.log('📋 Main YM.ST selected:', { index: excelData.mainYmStIndex, stok_kodu: mainYmSt?.stok_kodu, stok_adi: mainYmSt?.stok_adi });
    
    // Get stok kartı headers from the old function (assuming it's available)
    const stokKartiHeaders = getStokKartiHeaders();
    
    // MM TT Sheet - Artık sadece 1 tane MM TT
    const mmSheet = workbook.addWorksheet('MM TT');
    mmSheet.addRow(stokKartiHeaders);
    
    // Sadece 1 MM TT ekle (doğru sequence ile)
    mmSheet.addRow(generateMmTtStokKartiData(excelData.sequence));
    
    // YM ST Sheet - Ana YM ST'yi ilk sıraya ekle
    const ymStSheet = workbook.addWorksheet('YM ST');
    ymStSheet.addRow(stokKartiHeaders);

    // Ana YM ST'yi ilk sıraya ekle
    ymStSheet.addRow(generateYmStStokKartiData(mainYmSt));

    // Sonra diğer YM ST'leri ekle
    allYmSts.forEach((ymSt, index) => {
      // Ana YM ST'yi atla (zaten ekledik)
      if (index !== excelData.mainYmStIndex) {
        ymStSheet.addRow(generateYmStStokKartiData(ymSt));
      }
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `${excelData.stok_kodu}_Stok_Karti.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  };

  // Helper function to generate individual reçete Excel from stored data
  const generateReceteExcelFromData = async (excelData) => {
    console.log('📊 === RECIPE EXCEL GENERATION DEBUG START ===');
    console.log('📊 ExcelData received:', {
      hasMMData: !!excelData.mmData,
      mmDataStokKodu: excelData.mmData?.stok_kodu,
      mmDataStokAdi: excelData.mmData?.stok_adi,
      mmDataCap: excelData.mmData?.cap,
      selectedYmStsCount: excelData.selectedYmSts?.length,
      autoGeneratedYmStsCount: excelData.autoGeneratedYmSts?.length,
      mainYmStIndex: excelData.mainYmStIndex,
      sequence: excelData.sequence,
      hasAllRecipes: !!excelData.allRecipes,
      mmRecipesCount: excelData.allRecipes?.mmRecipes?.length
    });

    const Excel = require('exceljs');
    const { saveAs } = require('file-saver');

    const workbook = new Excel.Workbook();
    const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];

    console.log('📊 All YM.ST products combined:', allYmSts.map(y => ({ stok_kodu: y.stok_kodu, stok_adi: y.stok_adi })));

    // Get main YM ST
    const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];
    const mainYmStIndex_ = excelData.mainYmStIndex;
    const sequence = excelData.sequence;

    console.log('📊 Main YM.ST selected:', { index: mainYmStIndex_, stok_kodu: mainYmSt?.stok_kodu, stok_adi: mainYmSt?.stok_adi });
    
    // Get recipe headers from the old function (assuming it's available)
    const receteHeaders = getReceteHeaders();
    
    // MM TT REÇETE Sheet
    const mmReceteSheet = workbook.addWorksheet('MM TT REÇETE');
    mmReceteSheet.addRow(receteHeaders);
    
    // Sadece ana YMST için MM TT reçete satırları ekle
    const mmRecipe = { ...excelData.allRecipes.mmRecipes[mainYmStIndex_] } || {};
    
    
    // ✅ FIXED: Create correct YM.TT code - SHARED by both TAVLI and BALYA
    const capFormatted = Math.round(parseFloat(excelData.mmData.cap) * 100).toString().padStart(4, '0');
    const correctStokKodu = `YM.TT.${capFormatted}.${sequence}`;

    // Fix recipe YM.TT codes - create new object
    const fixedRecipe = {};
    Object.entries(mmRecipe).forEach(([key, value]) => {
      if (key.startsWith('YM.TT.') && key !== correctStokKodu) {
        // Always replace ANY YM.TT key with the correct sequence
        fixedRecipe[correctStokKodu] = value;
      } else {
        fixedRecipe[key] = value;
      }
    });
    
    // Düzeltilmiş reçeteyi kullan
    const processedMmGtRecipe = fixedRecipe;
    
    let siraNo = 1;
    
    // MMGT reçete sıralaması: fixed exact order as specified
    const recipeEntries = Object.entries(processedMmGtRecipe);
    
    // CRITICAL FIX: Ensure only ONE shrink entry exists for Excel
    const shrinkEntries = recipeEntries.filter(([key]) => key.includes('AMB.SHRİNK.'));
    if (shrinkEntries.length > 1) {
      console.warn(`Multiple shrink entries found (${shrinkEntries.length}), cleaning for Excel generation:`);
      shrinkEntries.forEach(([key, value]) => console.warn(`  ${key}: ${value}`));
      
      // Find the one with highest value or first non-zero
      const activeShrink = shrinkEntries.find(([key, value]) => value > 0) || shrinkEntries[0];
      console.warn(`Using only: ${activeShrink[0]} = ${activeShrink[1]}`);
      
      // Remove all other shrink entries from the recipe for Excel
      shrinkEntries.forEach(([key]) => {
        if (key !== activeShrink[0]) {
          delete processedMmGtRecipe[key];
        }
      });
      
      // Regenerate entries after cleanup
      const cleanedEntries = Object.entries(processedMmGtRecipe);
      recipeEntries.length = 0;
      recipeEntries.push(...cleanedEntries);
    }
    
    // ✅ FIXED: Maintain fixed order with YM.TT (not YM.GT) for Tavlı/Balya
    const correctYmTtStokKodu = correctStokKodu; // Already defined above
    const ymTtEntry = recipeEntries.find(([key]) => key === correctYmTtStokKodu) ||
                      recipeEntries.find(([key]) => key.startsWith('YM.TT.'));
    const tavlamaEntry = recipeEntries.find(([key]) => key === 'TAV01' || key === 'TVPKT01' || key === 'BAL01');
    const kartonEntry = recipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL');
    const shrinkEntry = recipeEntries.find(([key]) => key.includes('AMB.SHRİNK.'));
    const halkaEntry = recipeEntries.find(([key]) => key === 'SM.7MMHALKA');
    const plastikCemberEntry = recipeEntries.find(([key]) => key === 'AMB.PLASTİK.ÇEMBER');
    const tokaEntry = recipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
    const celikCemberEntry = recipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080'); // ✅ ADDED: Çelik Çember
    const paletEntry = recipeEntries.find(([key]) => key === 'AMB.PALET');
    // ❌ REMOVED: strecEntry - not in gene2l.csv

    // Other entries that might exist but aren't in the fixed order
    const otherEntries = recipeEntries.filter(([key]) =>
      !key.includes('YM.TT.') &&
      key !== 'TAV01' &&
      key !== 'TVPKT01' &&
      key !== 'BAL01' &&
      key !== 'AMB.ÇEM.KARTON.GAL' &&
      !key.includes('AMB.SHRİNK.') &&
      key !== 'SM.7MMHALKA' &&
      key !== 'AMB.PLASTİK.ÇEMBER' &&
      key !== 'AMB.TOKA.SIGNODE.114P. DKP' &&
      key !== 'AMB.APEX CEMBER 38X080' && // ✅ ADDED: Exclude Çelik Çember
      key !== 'AMB.PALET'
      // ❌ REMOVED: AMB.STREÇ exclusion
    );

    // Sırayla ekle - exact order (YM.TT then operations and auxiliaries)
    const orderedEntries = [
      ymTtEntry,
      tavlamaEntry, // TAV01, TVPKT01, or BAL01
      kartonEntry,
      shrinkEntry,
      halkaEntry,
      plastikCemberEntry,
      tokaEntry,
      celikCemberEntry, // ✅ ADDED: Çelik Çember
      paletEntry,
      ...otherEntries
    ].filter(Boolean);
    
    // MM TT reçete satırlarını eklerken doğru sequence'i kullan - Sadece 8 satır olmalı
    orderedEntries.forEach(([key, value]) => {
      if (value > 0) {
        mmReceteSheet.addRow(generateMmTtReceteRow(key, value, siraNo, sequence));
        siraNo++;
      }
    });
    
    // Debugging: Check if we have exactly 8 rows as expected
    const addedRows = orderedEntries.filter(([key, value]) => value > 0).length;
    if (addedRows !== 8) {
      console.warn(`MMGT reçetesi ${addedRows} satır içeriyor, 8 olmalı. Girdiler:`, 
        orderedEntries.filter(([key, value]) => value > 0).map(([key]) => key));
    }
    
    
    // YM ST Sheet
    const ymStSheet = workbook.addWorksheet('YM ST');
    ymStSheet.addRow(stokKartiHeaders);
    
    tasks.forEach(task => {
      const { excelData } = task;
      const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];
      const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];
      
      // Add MM TT
      mmSheet.addRow(generateMmGtStokKartiDataForBatch(excelData.mmData));
      
      
      // Add main YM ST first
      ymStSheet.addRow(generateYmStStokKartiData(mainYmSt));

      // Add other YM STs
      allYmSts.forEach((ymSt, index) => {
        if (index !== excelData.mainYmStIndex) {
          ymStSheet.addRow(generateYmStStokKartiData(ymSt));
        }
      });
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Birlestirilmis_Stok_Kartlari_${timestamp}.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  };

  // Helper function to generate combined reçete Excel from stored data
  const generateCombinedReceteExcelFromData = async (tasks) => {
    console.log('📋 === POST-SAVE COMBINED RECIPE EXCEL GENERATION STARTED ===');
    console.log('📋 Number of tasks to process:', tasks.length);

    // Instead of converting to requests and re-fetching from database,
    // directly use the task data which has complete MM TT information including proper stok_adi

    // Prepare complete MM TT data from task data (which already has proper formatting)
    const mmData = [];
    const ymTtData = [];
    const ymStpData = []; // ✅ ADDED: YM STP data array
    const ymStData = [];
    const mmRecipeData = [];
    const ymTtRecipeData = [];
    const ymStRecipeData = [];

    console.log('📋 Processing task data for direct Excel generation...');

    // Debug: Log each task's structure
    tasks.forEach((task, index) => {
      console.log(`📋 Task ${index + 1}/${tasks.length}:`, {
        hasExcelData: !!task.excelData,
        hasMMData: !!task.excelData?.mmData,
        mmStokKodu: task.excelData?.mmData?.stok_kodu,
        mmStokAdi: task.excelData?.mmData?.stok_adi,
        selectedYmStsCount: task.excelData?.selectedYmSts?.length,
        autoGeneratedYmStsCount: task.excelData?.autoGeneratedYmSts?.length
      });
    });
    
    for (const task of tasks) {
      const { excelData } = task;
      
      // Use the MM TT data from the task which already has correct stok_adi formatting
      if (excelData.mmData) {
        console.log(`📋 Adding MM TT: ${excelData.mmData.stok_kodu} -> stok_adi: "${excelData.mmData.stok_adi}"`);
        
        // If stok_adi is undefined, generate it from the saved data
        if (!excelData.mmData.stok_adi) {
          console.log(`⚠️ MM TT stok_adi is undefined, generating from saved data...`);
          const cap = parseFloat(excelData.mmData.cap);
          const toleransPlus = parseFloat(excelData.mmData.tolerans_plus) || 0;
          const toleransMinus = parseFloat(excelData.mmData.tolerans_minus) || 0;
          const bagAmount = excelData.mmData.cast_kont && excelData.mmData.cast_kont.trim() !== ''
            ? `/${excelData.mmData.cast_kont}`
            : '';

          // Format tolerance values with proper signs (values are already signed in database)
          const formattedMinus = (toleransMinus >= 0 ? '+' : '') + toleransMinus.toFixed(2).replace('.', ',');
          const formattedPlus = (toleransPlus >= 0 ? '+' : '') + toleransPlus.toFixed(2).replace('.', ',');
          const toleranceText = `${formattedMinus}/${formattedPlus}`;

          // Generate complete stok_adi with all the formatting
          // Use product_type to determine the correct product name
          const productName = excelData.mmData.product_type === 'TAVLI' ? 'Tavlı Tel' :
                              excelData.mmData.product_type === 'BALYA' ? 'Balya Teli' :
                              'Tavlı Tel'; // Default to Tavlı Tel if not specified

          // ✅ FIXED: Don't include kaplama (coating) for Tavli/Balya Tel (non-galvanized products)
          // Coating is only for galvanized products
          const generatedStokAdi = `${productName} ${parseFloat(cap.toFixed(2)).toString().replace('.', ',')} mm ${toleranceText} ${parseFloat(excelData.mmData.min_mukavemet) || '0'}-${parseFloat(excelData.mmData.max_mukavemet) || '0'} MPa ID:${parseFloat(excelData.mmData.ic_cap) || '45'} cm OD:${parseFloat(excelData.mmData.dis_cap) || '75'} cm ${parseFloat(excelData.mmData.kg) || '0'}${bagAmount} kg`;

          // ✅ FIXED: Extract yaglama and packaging suffixes from the saved task data
          const suffixes = [];

          // Add yaglama code FIRST (per genel4.csv format)
          if (!excelData.mmData.yaglama_tipi || excelData.mmData.yaglama_tipi === '' || excelData.mmData.yaglama_tipi === 'Tavlısız') {
            suffixes.push('Yagsiz');
          } else if (excelData.mmData.yaglama_tipi === 'Püskürtme') {
            suffixes.push('PSK');
          } else if (excelData.mmData.yaglama_tipi === 'Daldırma') {
            suffixes.push('DLD');
          }

          // Then add packaging suffixes
          // Check if packaging info exists in the task data
          if (task.packaging) {
            // Use packaging info from task if available
            console.log(`📦 Using task packaging: ${JSON.stringify(task.packaging)}`);
            if (task.packaging.shrink) suffixes.push('Shrink');
            if (task.packaging.paletli) suffixes.push('Plt');
            if (task.packaging.karton) suffixes.push('Krtn');
          } else if (excelData.packaging) {
            // Check if packaging is stored in excelData
            console.log(`📦 Using excelData packaging: ${JSON.stringify(excelData.packaging)}`);
            if (excelData.packaging.shrink) suffixes.push('Shrink');
            if (excelData.packaging.paletli) suffixes.push('Plt');
            if (excelData.packaging.karton) suffixes.push('Krtn');
          } else {
            // Fallback: use current form state (this shouldn't happen with the fix above)
            console.log(`⚠️ No packaging info found in task data, using current form state as fallback`);
            if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
            if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
            if (paketlemeSecenekleri.karton) suffixes.push('Krtn');
          }

          let finalStokAdi = generatedStokAdi;
          if (suffixes.length > 0) {
            finalStokAdi += '-' + suffixes.join('-');
          }

          excelData.mmData.stok_adi = finalStokAdi;
          console.log(`✅ Generated stok_adi with yaglama + packaging suffixes [${suffixes.join(', ')}]: "${finalStokAdi}"`);
        }
        
        mmData.push(excelData.mmData);
      }
      
      // ✅ FIXED: Add YM TT data (not YM GT)
      const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];
      const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];

      if (mainYmSt) {
        // ✅ FIXED: YM.TT is SHARED by both TAVLI and BALYA
        const capFormatted = Math.round(parseFloat(excelData.mmData.cap) * 100).toString().padStart(4, '0');
        const ymTtStokKodu = `YM.TT.${capFormatted}.${excelData.sequence}`;
        const ymTtItem = {
          stok_kodu: ymTtStokKodu,
          cap: excelData.mmData.cap,
          product_type: excelData.mmData.product_type,
          yaglama_tipi: excelData.mmData.yaglama_tipi,
          min_mukavemet: excelData.mmData.min_mukavemet,
          max_mukavemet: excelData.mmData.max_mukavemet,
          ic_cap: excelData.mmData.ic_cap,
          dis_cap: excelData.mmData.dis_cap,
          kg: excelData.mmData.kg,
          cast_kont: excelData.mmData.cast_kont,
          tolerans_plus: excelData.mmData.tolerans_plus,
          tolerans_minus: excelData.mmData.tolerans_minus,
          shrink: excelData.mmData.shrink,
          // ✅ FIXED: Generate YM TT stok names (will use product_type-specific generators)
          stok_adi: generateYmTtStokAdi(excelData.mmData, excelData.sequence),
          ingilizce_isim: generateYmTtEnglishName(excelData.mmData, excelData.sequence)
        };
        ymTtData.push(ymTtItem); // Add YM TT item to array

        // ✅ FIXED: Add YM STP data if pressing needed (cap >= 1.8mm)
        const cap = parseFloat(excelData.mmData.cap);
        if (cap >= 1.8) {
          const ymStpStokKodu = `${mainYmSt.stok_kodu}.P`;
          const ymStpItem = {
            stok_kodu: ymStpStokKodu,
            cap: mainYmSt.cap,
            product_type: excelData.mmData.product_type,
            yaglama_tipi: excelData.mmData.yaglama_tipi,
            min_mukavemet: excelData.mmData.min_mukavemet,
            max_mukavemet: excelData.mmData.max_mukavemet,
            ic_cap: excelData.mmData.ic_cap,
            dis_cap: excelData.mmData.dis_cap,
            kg: excelData.mmData.kg,
            cast_kont: excelData.mmData.cast_kont,
            stok_adi: `YM Preslenmiş Tel ${parseFloat(mainYmSt.cap).toString().replace('.', ',')} mm`,
            ingilizce_isim: `YM Pressed Wire ${mainYmSt.cap} mm`
          };
          ymStpData.push(ymStpItem);
        }

        // Add YM ST data
        allYmSts.forEach(ymSt => {
          if (!ymStData.find(item => item.stok_kodu === ymSt.stok_kodu)) {
            ymStData.push(ymSt);
          }
        });
      }
      
      // Add recipe data if available
      if (excelData.allRecipes) {
        if (excelData.allRecipes.mmRecipes) {
          mmRecipeData.push(...Object.values(excelData.allRecipes.mmRecipes));
        }
        if (excelData.allRecipes.ymGtRecipes) {
          ymTtRecipeData.push(...Object.values(excelData.allRecipes.ymGtRecipes));
        }
        if (excelData.allRecipes.ymStRecipes) {
          ymStRecipeData.push(...Object.values(excelData.allRecipes.ymStRecipes));
        }
      }
    }
    
    
    // Use the perfected direct Excel generation logic
    try {
      console.log('📋 Calling direct Excel generation with complete task data...');
      
      // Create Excel workbooks using the same perfected logic as batch generation
      await Promise.all([
        generateDirectStokKartiExcelFromData(mmData, ymTtData, ymStpData, ymStData),
        generateDirectReceteExcelFromData(mmRecipeData, ymTtRecipeData, ymStRecipeData, tasks)
      ]);
      
      console.log('✅ Post-save Excel generation completed successfully using direct data');
      return;
    } catch (error) {
      console.error('❌ Post-save Excel generation failed:', error);
      throw error;
    }
    
    // OLD CODE BELOW - keeping as fallback (should not reach here)

    // Helper functions for direct Excel generation
    // Tavlı/Balya Tel name generators
    function generateYmTtStokAdi(mmData, sequence) {
      const cap = parseFloat(mmData.cap);
      const bagAmount = mmData.cast_kont && mmData.cast_kont.trim() !== ''
        ? `/${mmData.cast_kont}`
        : '';

      // ✅ FIXED: YM TT stock name per genel4.csv specification
      // - Use "YM Tavlı Tel" not "Yumak Tavlı Tel"
      // - NO yaglama (yaglama only on MM products)
      // - Include tolerance values
      // - NO packaging suffixes
      const productName = mmData.product_type === 'TAVLI' ? 'YM Tavlı Tel' : 'YM Balya Tel';

      // Calculate tolerance values
      const toleransPlus = parseFloat(mmData.tolerans_plus) || 0;
      const toleransMinus = parseFloat(mmData.tolerans_minus) || 0;
      const formattedMinus = (toleransMinus >= 0 ? '+' : '') + toleransMinus.toFixed(2).replace('.', ',');
      const formattedPlus = (toleransPlus >= 0 ? '+' : '') + toleransPlus.toFixed(2).replace('.', ',');
      const toleranceText = `${formattedMinus}/${formattedPlus}`;

      return `${productName} ${parseFloat(cap.toFixed(2)).toString().replace('.', ',')} mm ${toleranceText} ${parseFloat(mmData.min_mukavemet) || '0'}-${parseFloat(mmData.max_mukavemet) || '0'} MPa ID:${parseFloat(mmData.ic_cap) || '45'} cm OD:${parseFloat(mmData.dis_cap) || '75'} cm ${parseFloat(mmData.kg) || '0'}${bagAmount} kg`;
    }

    function generateYmTtEnglishName(mmData, sequence) {
      const cap = parseFloat(mmData.cap);
      const bagAmount = mmData.cast_kont && mmData.cast_kont.trim() !== ''
        ? `/${mmData.cast_kont}`
        : '';

      // ✅ FIXED: YM TT English name - NO yaglama, WITH tolerance, NO packaging
      const productNameEn = mmData.product_type === 'TAVLI' ? 'Coil Annealed Wire' : 'Coil Bale Wire';

      // Calculate tolerance values
      const toleransPlus = parseFloat(mmData.tolerans_plus) || 0;
      const toleransMinus = parseFloat(mmData.tolerans_minus) || 0;
      const formattedMinus = (toleransMinus >= 0 ? '+' : '') + toleransMinus.toFixed(2);
      const formattedPlus = (toleransPlus >= 0 ? '+' : '') + toleransPlus.toFixed(2);
      const toleranceText = `${formattedMinus}/${formattedPlus}`;

      return `${productNameEn} ${parseFloat(cap.toFixed(2))} mm ${toleranceText} ${parseFloat(mmData.min_mukavemet) || '0'}-${parseFloat(mmData.max_mukavemet) || '0'} MPa ID:${parseFloat(mmData.ic_cap) || '45'} cm OD:${parseFloat(mmData.dis_cap) || '75'} cm ${parseFloat(mmData.kg) || '0'}${bagAmount} kg`;
    }

    async function generateDirectStokKartiExcelFromData(mmData, ymTtData, ymStpData, ymStData) {
      console.log('📋 Generating direct stok kartı Excel...');

      // ✅ FIXED: Use passed data instead of fetching from database!
      console.log(`📊 Using passed data: YM TT: ${ymTtData.length}, YM STP: ${ymStpData.length}`);

      // Create the exact same Excel structure as the batch function
      const workbook = new ExcelJS.Workbook();

      // MM TT Sheet - using perfected format
      const mmSheet = workbook.addWorksheet('MM TT');
      const mmHeaders = getStokKartiHeaders();
      mmSheet.addRow(mmHeaders);

      // Add MM TT data using the perfected generateMmTtStokKartiDataForBatch function
      for (const mm of mmData) {
        mmSheet.addRow(generateMmTtStokKartiDataForBatch(mm));
      }

      // ✅ FIXED: YM TT Sheet (Annealed Intermediate - always exists)
      if (ymTtData && ymTtData.length > 0) {
        const ymTtSheet = workbook.addWorksheet('YM TT');
        ymTtSheet.addRow(mmHeaders); // Same headers as MM TT
        for (const ymTt of ymTtData) {
          ymTtSheet.addRow(generateYmTtStokKartiData(ymTt));
        }
        console.log(`✅ YM TT sheet created with ${ymTtData.length} products`);
      }

      // ✅ FIXED: YM STP Sheet (Pressed Intermediate - only if cap >= 1.8mm)
      if (ymStpData && ymStpData.length > 0) {
        const ymStpSheet = workbook.addWorksheet('YM STP');
        ymStpSheet.addRow(mmHeaders); // Same headers as MM TT
        for (const ymStp of ymStpData) {
          ymStpSheet.addRow(generateYmStpStokKartiData(ymStp));
        }
        console.log(`✅ YM STP sheet created with ${ymStpData.length} products`);
      }

      // YM ST Sheet
      const ymStSheet = workbook.addWorksheet('YM ST');
      const ymStHeaders = getYmStHeaders();
      ymStSheet.addRow(ymStHeaders);

      // Add YM ST data
      for (const ymSt of ymStData) {
        ymStSheet.addRow(generateYmStStokKartiData(ymSt));
      }
      
      // Save the stok kartı Excel file
      console.log(`\n🔍 === SAVING STOK KARTI EXCEL ===`);
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `StokKarti_PostSave_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);

      console.log(`✅ StokKarti Excel saved: ${filename}`);
      console.log(`📊 Total sheets created:`);
      workbook.worksheets.forEach(ws => {
        console.log(`  - ${ws.name} (${ws.rowCount - 1} data rows)`);
      });
      console.log('✅ Direct stok kartı Excel generated successfully');
    }

    async function generateDirectReceteExcelFromData(mmRecipeData, ymTtRecipeData, ymStRecipeData, tasks) {
      console.log('📋 Generating direct recipe Excel using PERFECTED format...');

      // ✅ FIXED: Fetch YM TT and YM STP recipes from database for complete Excel generation
      const ymTtRecipesFromDb = [];
      const ymStpRecipesFromDb = [];

      for (const task of tasks) {
        const { excelData } = task;
        if (!excelData || !excelData.mmData) continue;

        const allYmSts = [...(excelData.selectedYmSts || []), ...(excelData.autoGeneratedYmSts || [])];
        const mainYmSt = allYmSts[excelData.mainYmStIndex || 0];
        const sequence = excelData.sequence;

        if (!mainYmSt) continue;

        // ✅ CRITICAL FIX: YM TT uses MM cap, NOT YM ST cap! (like YM GT uses MM GT cap in GalvanizliTel)
        const mmCapFormatted = Math.round(parseFloat(excelData.mmData.cap) * 100).toString().padStart(4, '0');
        const ymTtStokKodu = `YM.TT.${mmCapFormatted}.${sequence}`;

        console.log(`📋 Fetching YM TT: ${ymTtStokKodu} (MM cap: ${excelData.mmData.cap}mm, NOT YM ST cap: ${mainYmSt.cap}mm)`);

        // Fetch YM TT recipes from database (all priorities)
        try {
          const ymTtRecipeResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmTtRecete}?mamul_kodu=${encodeURIComponent(ymTtStokKodu)}`);
          if (ymTtRecipeResponse && ymTtRecipeResponse.ok) {
            const recipes = await ymTtRecipeResponse.json();
            recipes.forEach(recipe => {
              recipe.ym_tt_stok_kodu = ymTtStokKodu;
              recipe.sequence = sequence;
            });
            ymTtRecipesFromDb.push(...recipes);
            console.log(`📋 Fetched ${recipes.length} YM TT recipes for ${ymTtStokKodu}`);
          }
        } catch (error) {
          console.error(`Error fetching YM TT recipes for ${ymTtStokKodu}:`, error);
        }

        // Fetch YM STP recipes from database if pressing needed (cap > 1.8mm)
        const cap = parseFloat(excelData.mmData.cap);
        if (cap > 1.8) {
          const ymStpStokKodu = `${mainYmSt.stok_kodu}.P`;
          console.log(`📋 Fetching YM STP: ${ymStpStokKodu}`);

          try {
            const ymStpRecipeResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmStpRecete}?mamul_kodu=${encodeURIComponent(ymStpStokKodu)}`);
            if (ymStpRecipeResponse && ymStpRecipeResponse.ok) {
              const recipes = await ymStpRecipeResponse.json();
              recipes.forEach(recipe => {
                recipe.ym_stp_stok_kodu = ymStpStokKodu;
                recipe.sequence = sequence;
              });
              ymStpRecipesFromDb.push(...recipes);
              console.log(`📋 Fetched ${recipes.length} YM STP recipes for ${ymStpStokKodu}`);
            }
          } catch (error) {
            console.error(`Error fetching YM STP recipes for ${ymStpStokKodu}:`, error);
          }
        }
      }

      console.log(`📊 Total recipes fetched: YM TT: ${ymTtRecipesFromDb.length}, YM STP: ${ymStpRecipesFromDb.length}`);

      // Create the exact same Excel structure as the perfected batch function
      const workbook = new ExcelJS.Workbook();

      // Get the proper recipe headers (same as perfected function)
      const receteHeaders = getReceteHeaders();

      // MM TT REÇETE Sheet - Use PERFECTED format
      const mmReceteSheet = workbook.addWorksheet('MM TT REÇETE');
      mmReceteSheet.addRow(receteHeaders);
      
      // Add MM TT recipes using the PERFECTED logic
      for (const task of tasks) {
        const { excelData } = task;
        
        // Validate excelData structure
        if (!excelData || !excelData.allRecipes || !excelData.allRecipes.mmRecipes) {
          console.warn('⚠️ Missing recipe data in task, skipping MM TT recipes');
          continue;
        }
        
        const allYmSts = [...(excelData.selectedYmSts || []), ...(excelData.autoGeneratedYmSts || [])];
        const mainYmStIndex = excelData.mainYmStIndex || 0;
        const sequence = excelData.sequence;
        
        // ✅ FIXED: Use YM.TT logic - SHARED by both TAVLI and BALYA
        const mmRecipe = { ...excelData.allRecipes.mmRecipes[mainYmStIndex] } || {};
        const capFormatted = Math.round(parseFloat(excelData.mmData.cap) * 100).toString().padStart(4, '0');
        const correctStokKodu = `YM.TT.${capFormatted}.${sequence}`;

        // Fix YM.TT key in recipe
        const fixedRecipe = {};
        Object.entries(mmRecipe).forEach(([key, value]) => {
          if (key.startsWith('YM.TT.') && key !== correctStokKodu) {
            fixedRecipe[correctStokKodu] = value;
          } else {
            fixedRecipe[key] = value;
          }
        });
        
        // Process recipe entries using the PERFECTED fixed order
        const processedMmGtRecipe = fixedRecipe;
        const mmRecipeEntries = Object.entries(processedMmGtRecipe);
        
        // ✅ FIXED: Use YM.TT order (not YM.GT)
        const ymTtEntry = mmRecipeEntries.find(([key]) => key === correctStokKodu) ||
                          mmRecipeEntries.find(([key]) => key.startsWith('YM.TT.'));
        const tavlamaEntry = mmRecipeEntries.find(([key]) => key === 'TAV01' || key === 'TVPKT01' || key === 'BAL01');
        const kartonEntry = mmRecipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL');
        const shrinkEntry = mmRecipeEntries.find(([key]) => key.includes('AMB.SHRİNK.'));
        const halkaEntry = mmRecipeEntries.find(([key]) => key === 'SM.7MMHALKA');
        const plastikCemberEntry = mmRecipeEntries.find(([key]) => key === 'AMB.PLASTİK.ÇEMBER');
        const tokaEntry = mmRecipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
        const celikCemberEntry = mmRecipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080'); // ✅ ADDED: Çelik Çember
        const paletEntry = mmRecipeEntries.find(([key]) => key === 'AMB.PALET');
        // ❌ REMOVED: strecEntry - not in gene2l.csv

        // Add entries in the PERFECTED fixed order (YM.TT then operations and auxiliaries)
        const orderedEntries = [ymTtEntry, tavlamaEntry, kartonEntry, shrinkEntry, halkaEntry, plastikCemberEntry, tokaEntry, celikCemberEntry, paletEntry].filter(Boolean);
        
        // ✅ FIX: Use correct Tavli/Balya function (not Galvanizli function!)
        let siraNo = 1;
        orderedEntries.forEach(([key, value]) => {
          if (value > 0) {
            mmReceteSheet.addRow(generateTavliBalyaMmReceteRowForBatch(key, value, siraNo, sequence, excelData.mmData.stok_kodu));
            siraNo++;
          }
        });
      }

      // ✅ FIXED: YM TT REÇETE Sheets (Annealed Intermediate - priority 0 + alternatives)
      if (ymTtRecipesFromDb && ymTtRecipesFromDb.length > 0) {
        // Group by priority first
        const ymTtByPriority = {};
        ymTtRecipesFromDb.forEach(recipe => {
          const priority = recipe.priority || 0;
          if (!ymTtByPriority[priority]) {
            ymTtByPriority[priority] = [];
          }
          ymTtByPriority[priority].push(recipe);
        });

        // Sort priorities
        const priorities = Object.keys(ymTtByPriority).map(Number).sort((a, b) => a - b);
        console.log(`📋 YM TT recipes have priorities: ${priorities.join(', ')}`);

        priorities.forEach(priority => {
          const recipes = ymTtByPriority[priority];
          const sheetName = priority === 0 ? 'YM TT REÇETE' : `YM TT REÇETE ALT ${priority}`;
          const ymTtReceteSheet = workbook.addWorksheet(sheetName);
          ymTtReceteSheet.addRow(receteHeaders);

          // Group by product
          const ymTtByProduct = {};
          recipes.forEach(recipe => {
            if (!ymTtByProduct[recipe.ym_tt_stok_kodu]) {
              ymTtByProduct[recipe.ym_tt_stok_kodu] = [];
            }
            ymTtByProduct[recipe.ym_tt_stok_kodu].push(recipe);
          });

          const sortedYmTtStokCodes = Object.keys(ymTtByProduct).sort();
          sortedYmTtStokCodes.forEach(stokKodu => {
            if (ymTtByProduct[stokKodu] && ymTtByProduct[stokKodu].length > 0) {
              let productSiraNo = 1;
              ymTtByProduct[stokKodu].forEach(recipe => {
                const row = ymTtReceteSheet.addRow(generateYmTtReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.ym_tt_stok_kodu, recipe.operasyon_bilesen));

                // ✅ YELLOW ROW COLORING: .ST coiler products in ALT 1 (for 1.5-1.8mm range)
                // These are the yellow rows from the COILER matrix
                const isCoilerYellow = recipe.bilesen_kodu && recipe.bilesen_kodu.endsWith('.ST') && priority === 1;
                if (isCoilerYellow) {
                  row.eachCell((cell) => {
                    cell.fill = {
                      type: 'pattern',
                      pattern: 'solid',
                      fgColor: { argb: 'FFFFEEAA' } // Light cream (matching GalvanizliTel)
                    };
                  });
                }

                productSiraNo++;
              });
            }
          });

          console.log(`✅ ${sheetName} created with ${recipes.length} recipes`);
        });
      }

      // ✅ FIXED: YM STP REÇETE Sheet - ONE SHEET with ALL .P products (no ALT sheets)
      // User requirement: "there shant be YMSTP alternative sheets"
      // All priorities (0, 1, 2) go in the same YM STP REÇETE sheet
      if (ymStpRecipesFromDb && ymStpRecipesFromDb.length > 0) {
        console.log(`📋 YM STP: Creating ONE sheet with ALL .P products (all priorities)`);

        const ymStpReceteSheet = workbook.addWorksheet('YM STP REÇETE');
        ymStpReceteSheet.addRow(receteHeaders);

        // Group by product (all priorities together)
        const ymStpByProduct = {};
        ymStpRecipesFromDb.forEach(recipe => {
          if (!ymStpByProduct[recipe.ym_stp_stok_kodu]) {
            ymStpByProduct[recipe.ym_stp_stok_kodu] = [];
          }
          ymStpByProduct[recipe.ym_stp_stok_kodu].push(recipe);
        });

        // Add all products (sorted by stok_kodu)
        const sortedYmStpStokCodes = Object.keys(ymStpByProduct).sort();
        sortedYmStpStokCodes.forEach(stokKodu => {
          if (ymStpByProduct[stokKodu] && ymStpByProduct[stokKodu].length > 0) {
            let productSiraNo = 1;
            ymStpByProduct[stokKodu].forEach(recipe => {
              ymStpReceteSheet.addRow(generateYmStpReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.ym_stp_stok_kodu, recipe.operasyon_bilesen));
              productSiraNo++;
            });
          }
        });

        console.log(`✅ YM STP REÇETE created with ${ymStpRecipesFromDb.length} recipes (all .P products in one sheet)`);
      }

      // YM ST REÇETE Sheet - Use PERFECTED format
      const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
      ymStReceteSheet.addRow(receteHeaders);
      
      // Add YM ST recipes using PERFECTED logic
      for (const task of tasks) {
        const { excelData } = task;
        
        // Validate excelData structure for YM ST recipes
        if (!excelData || !excelData.allRecipes || !excelData.allRecipes.ymStRecipes) {
          console.warn('⚠️ Missing YM ST recipe data in task, skipping YM ST recipes');
          continue;
        }
        
        const allYmSts = [...(excelData.selectedYmSts || []), ...(excelData.autoGeneratedYmSts || [])];
        const mainYmStIndex = excelData.mainYmStIndex || 0;
        
        // Add main YM ST recipe first (PERFECTED logic)
        let siraNoMain = 1;
        const mainYmStRecipe = excelData.allRecipes.ymStRecipes[mainYmStIndex] || {};
        const mainRecipeEntries = Object.entries(mainYmStRecipe);
        
        // ✅ FIXED: Handle both filmaşin and coiler products
        // Filmaşin (>= 1.5mm): FLM.*.* + TLC01
        // Coiler (< 1.5mm): YM.ST.*.* + COTLC01
        const mainFlmEntry = mainRecipeEntries.find(([key]) => key.includes('FLM.'));
        const mainYmStSourceEntry = mainRecipeEntries.find(([key]) => key.startsWith('YM.ST.') && key !== allYmSts[mainYmStIndex]?.stok_kodu);
        const mainTlcEntry = mainRecipeEntries.find(([key]) => key === 'TLC01');
        const mainCotlcEntry = mainRecipeEntries.find(([key]) => key === 'COTLC01');

        console.log(`\n🔍 === YM ST MAIN RECIPE EXCEL DEBUG ===`);
        console.log(`📦 Main YM ST: ${allYmSts[mainYmStIndex]?.stok_kodu}`);
        console.log(`📏 Cap: ${allYmSts[mainYmStIndex]?.cap}mm`);
        console.log(`🔍 Recipe entries found:`);
        console.log(`  - FLM entry: ${mainFlmEntry ? mainFlmEntry[0] : 'NOT FOUND'}`);
        console.log(`  - YM.ST source entry: ${mainYmStSourceEntry ? mainYmStSourceEntry[0] : 'NOT FOUND'}`);
        console.log(`  - TLC01 entry: ${mainTlcEntry ? 'FOUND' : 'NOT FOUND'}`);
        console.log(`  - COTLC01 entry: ${mainCotlcEntry ? 'FOUND' : 'NOT FOUND'}`);

        // Priority: Material (FLM or YM.ST source) first, then Operation (TLC01 or COTLC01)
        const materialEntry = mainFlmEntry || mainYmStSourceEntry;
        const operationEntry = mainTlcEntry || mainCotlcEntry;
        const mainOrderedEntries = [materialEntry, operationEntry].filter(Boolean);

        console.log(`📊 Final recipe to add:`);
        mainOrderedEntries.forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}`);
        });
        console.log(`=== END YM ST MAIN RECIPE ===\n`);
        
        mainOrderedEntries.forEach(([key, value]) => {
          if (value > 0) {
            const mainYmSt = allYmSts[mainYmStIndex];
            ymStReceteSheet.addRow(generateYmStReceteRowForBatch(key, value, siraNoMain, mainYmSt.stok_kodu));
            siraNoMain++;
          }
        });
        
        // Add other YM ST recipes (PERFECTED logic)
        allYmSts.forEach((ymSt, index) => {
          if (index !== mainYmStIndex) { // Skip main YM ST (already added)
            let siraNoOther = 1;
            const otherYmStRecipe = excelData.allRecipes.ymStRecipes[index] || {};
            const otherRecipeEntries = Object.entries(otherYmStRecipe);
            
            // ✅ FIXED: Handle both filmaşin and coiler products
            const otherFlmEntry = otherRecipeEntries.find(([key]) => key.includes('FLM.'));
            const otherYmStSourceEntry = otherRecipeEntries.find(([key]) => key.startsWith('YM.ST.') && key !== ymSt?.stok_kodu);
            const otherTlcEntry = otherRecipeEntries.find(([key]) => key === 'TLC01');
            const otherCotlcEntry = otherRecipeEntries.find(([key]) => key === 'COTLC01');

            const otherMaterialEntry = otherFlmEntry || otherYmStSourceEntry;
            const otherOperationEntry = otherTlcEntry || otherCotlcEntry;
            const otherOrderedEntries = [otherMaterialEntry, otherOperationEntry].filter(Boolean);
            
            otherOrderedEntries.forEach(([key, value]) => {
              if (value > 0) {
                ymStReceteSheet.addRow(generateYmStReceteRowForBatch(key, value, siraNoOther, ymSt.stok_kodu));
                siraNoOther++;
              }
            });
          }
        });
      }

      // 🆕 Generate COILER alternatives dynamically for .ST products (up to 8 alternatives)
      console.log('🔄 POST-SAVE: Generating COILER alternatives for .ST products...');

      // Build YM ST recipes array from tasks
      const ymStRecipesForAlternatives = [];
      const ymStProductsForAlternatives = [];

      for (const task of tasks) {
        const { excelData } = task;
        if (!excelData || !excelData.allRecipes || !excelData.allRecipes.ymStRecipes) continue;

        const allYmSts = [...(excelData.selectedYmSts || []), ...(excelData.autoGeneratedYmSts || [])];

        allYmSts.forEach((ymSt, index) => {
          const ymStRecipe = excelData.allRecipes.ymStRecipes[index] || {};
          const recipeEntries = Object.entries(ymStRecipe);

          // Convert to array format expected by generateCoilerAlternatives
          recipeEntries.forEach(([bilesen_kodu, miktar]) => {
            // ✅ FIX: Add operasyon_bilesen field so generateCoilerAlternatives can distinguish B vs O
            const isOperation = ['TLC01', 'COTLC01'].includes(bilesen_kodu);

            ymStRecipesForAlternatives.push({
              mamul_kodu: ymSt.stok_kodu,
              bilesen_kodu,
              miktar,
              operasyon_bilesen: isOperation ? 'O' : 'B'  // Required by generateCoilerAlternatives
            });
          });

          ymStProductsForAlternatives.push(ymSt);
        });
      }

      console.log(`\n🔍 === COILER ALTERNATIVES GENERATION DEBUG ===`);
      console.log(`📊 Input recipes: ${ymStRecipesForAlternatives.length}`);
      console.log(`📦 Input products: ${ymStProductsForAlternatives.length}`);
      ymStProductsForAlternatives.forEach(p => {
        console.log(`  - ${p.stok_kodu} (${p.cap}mm) ${p.stok_kodu.endsWith('.ST') ? '[COILER]' : '[FILMAŞIN]'}`);
      });

      const coilerAlternatives = generateCoilerAlternatives(ymStRecipesForAlternatives, ymStProductsForAlternatives);

      // Note: All YM ST alternatives (including filmaşin products) use COILER_ALTERNATIVE_MATRIX
      // YM_ST_FILMASIN_PRIORITY_MAP is ONLY for YM GT alternatives in GalvanizliTel

      const altPriorities = Object.keys(coilerAlternatives).map(Number).sort((a, b) => a - b);
      console.log(`📋 Generated COILER alternatives for priorities: ${altPriorities.join(', ')}`);
      altPriorities.forEach(p => {
        console.log(`  Priority ${p}: ${coilerAlternatives[p].length} recipes`);
      });
      console.log(`=== END COILER ALTERNATIVES ===\n`);

      // Create YM ST REÇETE ALT 1-8 sheets dynamically based on generated alternatives
      console.log(`\n🔍 === CREATING YM ST ALT SHEETS ===`);
      altPriorities.forEach(priority => {
        const altRecipes = coilerAlternatives[priority];
        if (!altRecipes || altRecipes.length === 0) {
          console.log(`⏭️  Skipping priority ${priority} - no recipes`);
          return;
        }

        console.log(`📄 Creating sheet: YM ST REÇETE ALT ${priority} (${altRecipes.length} recipes)`);
        const altSheet = workbook.addWorksheet(`YM ST REÇETE ALT ${priority}`);
        altSheet.addRow(receteHeaders);

        // Group recipes by product
        const ymStAltByProduct = {};
        altRecipes.forEach(recipe => {
          if (!ymStAltByProduct[recipe.mamul_kodu]) {
            ymStAltByProduct[recipe.mamul_kodu] = [];
          }
          ymStAltByProduct[recipe.mamul_kodu].push(recipe);
        });

        // Add recipes sorted by product code
        Object.keys(ymStAltByProduct).sort().forEach(stokKodu => {
          if (ymStAltByProduct[stokKodu] && ymStAltByProduct[stokKodu].length > 0) {
            let productSiraNo = 1;
            ymStAltByProduct[stokKodu].forEach(recipe => {
              altSheet.addRow(generateYmStReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.mamul_kodu, priority));
              productSiraNo++;
            });
          }
        });

        console.log(`✅ POST-SAVE: Created YM ST REÇETE ALT ${priority} sheet with ${altRecipes.length} recipes`);
      });

      // Save the recipe Excel file
      console.log(`\n🔍 === SAVING RECIPE EXCEL ===`);
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `Recete_PostSave_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);

      console.log(`✅ Recipe Excel saved: ${filename}`);
      console.log(`📊 Total sheets created:`);
      workbook.worksheets.forEach(ws => {
        console.log(`  - ${ws.name} (${ws.rowCount - 1} data rows)`);
      });
      console.log('✅ Direct recipe Excel generated successfully using PERFECTED format');
    }
    
    tasks.forEach(task => {
      const { excelData } = task;
      const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];
      const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];
      const mainYmStIndex_ = excelData.mainYmStIndex;
      const sequence = excelData.sequence;
      
      // ✅ FIXED: Add MM TT recipes - YM.TT is SHARED by both TAVLI and BALYA
      const mmRecipe = { ...excelData.allRecipes.mmRecipes[mainYmStIndex_] } || {};
      const capFormatted = Math.round(parseFloat(excelData.mmData.cap) * 100).toString().padStart(4, '0');
      const correctStokKodu = `YM.TT.${capFormatted}.${sequence}`;

      // Fix YM.TT key in recipe (same logic as individual function)
      const fixedRecipe = {};
      Object.entries(mmRecipe).forEach(([key, value]) => {
        if (key.startsWith('YM.TT.') && key !== correctStokKodu) {
          // Always replace ANY YM.TT key with the correct sequence
          fixedRecipe[correctStokKodu] = value;
        } else {
          fixedRecipe[key] = value;
        }
      });
      
      // Process all MM TT recipe components in proper order
      const processedMmGtRecipe = fixedRecipe;
      const mmRecipeEntries = Object.entries(processedMmGtRecipe);
      
      // ✅ FIXED: Maintain fixed order with YM.TT (not YM.GT)
      const ymTtEntry = mmRecipeEntries.find(([key]) => key === correctStokKodu) ||
                        mmRecipeEntries.find(([key]) => key.startsWith('YM.TT.'));
      const tavlamaEntry = mmRecipeEntries.find(([key]) => key === 'TAV01' || key === 'TVPKT01' || key === 'BAL01');
      const kartonEntry = mmRecipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL');
      const shrinkEntry = mmRecipeEntries.find(([key]) => key.includes('AMB.SHRİNK.'));
      const halkaEntry = mmRecipeEntries.find(([key]) => key === 'SM.7MMHALKA');
      const plastikCemberEntry = mmRecipeEntries.find(([key]) => key === 'AMB.PLASTİK.ÇEMBER');
      const tokaEntry = mmRecipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
      const celikCemberEntry = mmRecipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080'); // ✅ ADDED: Çelik Çember
      const paletEntry = mmRecipeEntries.find(([key]) => key === 'AMB.PALET');
      // ❌ REMOVED: strecEntry - not in gene2l.csv

      // Other entries that might exist but aren't in the fixed order
      const otherEntries = mmRecipeEntries.filter(([key]) =>
        !key.includes('YM.TT.') &&
        key !== 'TAV01' &&
        key !== 'TVPKT01' &&
        key !== 'BAL01' &&
        key !== 'AMB.ÇEM.KARTON.GAL' &&
        !key.includes('AMB.SHRİNK.') &&
        key !== 'SM.7MMHALKA' &&
        key !== 'AMB.PLASTİK.ÇEMBER' &&
        key !== 'AMB.TOKA.SIGNODE.114P. DKP' &&
        key !== 'AMB.APEX CEMBER 38X080' && // ✅ ADDED: Exclude Çelik Çember
        key !== 'AMB.PALET'
        // ❌ REMOVED: AMB.STREÇ exclusion
      );

      // Sırayla ekle - exact order (YM.TT then operations and auxiliaries)
      const orderedEntries = [
        ymTtEntry,
        tavlamaEntry,
        kartonEntry,
        shrinkEntry,
        halkaEntry,
        plastikCemberEntry, // ✅ FIXED: Use Plastik Çember
        tokaEntry,
        strecEntry, // ✅ ADDED
        paletEntry, // ✅ ADDED
        ...otherEntries
      ].filter(Boolean);
      
      // Add all MM TT recipe components
      let siraNo = 1;
      orderedEntries.forEach(([key, value]) => {
        if (value > 0) {
          mmReceteSheet.addRow(generateMmTtReceteRow(key, value, siraNo, sequence));
          siraNo++;
        }
      });
      
      // Add YM TT recipes
      const ymGtRecipe = excelData.allRecipes.ymGtRecipe || {};
      const recipeEntries = Object.entries(ymGtRecipe);
      
      const sortedEntries = recipeEntries
        .filter(([key, value]) => value > 0)
        .sort(([keyA], [keyB]) => {
          if (keyA.includes('YM.ST')) return -1;
          if (keyB.includes('YM.ST')) return 1;
          if (keyA === 'GLV01') return -1;
          if (keyB === 'GLV01') return 1;
          if (keyA.includes('150 03')) return -1;
          if (keyB.includes('150 03')) return 1;
          if (keyA.includes('HIDROLİK.ASİT')) return -1;
          if (keyB.includes('HIDROLİK.ASİT')) return 1;
          return 0;
        });
      
      sortedEntries.forEach(([key, value], index) => {
        ymGtReceteSheet.addRow(generateYmGtReceteRow(key, value, index + 1, sequence));
      });
      
      // Add YM ST recipes - Main YM ST first
      let siraNoMain = 1;
      const mainYmStRecipe = excelData.allRecipes.ymStRecipes[mainYmStIndex_] || {};
      const mainRecipeEntries = Object.entries(mainYmStRecipe);
      
      const mainOrderedEntries = [
        mainRecipeEntries.find(([key]) => key.includes('FLM.')),
        mainRecipeEntries.find(([key]) => key === 'TLC01'),
        ...mainRecipeEntries.filter(([key]) => !key.includes('FLM.') && key !== 'TLC01')
      ].filter(Boolean);
      
      mainOrderedEntries.forEach(([key, value]) => {
        if (value > 0) {
          ymStReceteSheet.addRow(generateYmStReceteRow(key, value, siraNoMain, mainYmSt));
          siraNoMain++;
        }
      });
      
      // Add other YM STs
      allYmSts.forEach((ymSt, index) => {
        if (index !== mainYmStIndex_) {
          const ymStRecipe = excelData.allRecipes.ymStRecipes[index] || {};
          let siraNo = 1;
          
          const recipeEntries = Object.entries(ymStRecipe);
          const orderedEntries = [
            recipeEntries.find(([key]) => key.includes('FLM.')),
            recipeEntries.find(([key]) => key === 'TLC01'),
            ...recipeEntries.filter(([key]) => !key.includes('FLM.') && key !== 'TLC01')
          ].filter(Boolean);
          
          orderedEntries.forEach(([key, value]) => {
            if (value > 0) {
              ymStReceteSheet.addRow(generateYmStReceteRow(key, value, siraNo, ymSt));
              siraNo++;
            }
          });
        }
      });
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Birlestirilmis_Receteler_${timestamp}.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
  };

  // Generate combined Excel for all completed tasks using stored data
  const generateCombinedExcelForTasks = async (tasks) => {
    try {
      const tasksWithData = tasks.filter(task => task.excelData);
      if (tasksWithData.length === 0) {
        throw new Error('Tamamlanan görevler için Excel verileri bulunamadı');
      }
      
      // Create ONLY combined recipe Excel (stock Excel already created post-save)
      await generateCombinedReceteExcelFromData(tasksWithData);
      
      toast.success(`${tasksWithData.length} ürün için birleştirilmiş reçete Excel dosyası oluşturuldu!`);
      
    } catch (error) {
      console.error('Combined Excel generation error:', error);
      throw error;
    }
  };

  // Helper function to find requests for a specific task
  const findRequestsForTask = (task) => {
    try {
      console.log('🔍 Finding requests for task:', task.name);
      console.log('📋 Available requests count:', requests.length);
      console.log('📋 Approved requests:', requests.filter(r => r.status === 'approved').length);
      
      // Extract product info from task name
      const productInfo = task.name.match(/([A-Z0-9]+)\s+(\d+(?:\.\d+)?mm)/);
      if (!productInfo) {
        console.warn('Could not extract product info from task name:', task.name);
        return [];
      }
      
      const [, kod2, cap] = productInfo;
      const capValue = parseFloat(cap.replace('mm', ''));
      console.log('🎯 Extracted product info:', { kod2, cap, capValue });
      
      // Find approved requests that match this product
      const matchingRequests = requests.filter(request => {
        if (!request || request.status !== 'approved') return false;
        
        const reqKod2 = request.kod_2;
        const reqCap = parseFloat(request.cap);
        
        const matches = reqKod2 === kod2 && Math.abs(reqCap - capValue) < 0.001;
        if (matches) {
          console.log('✅ Found matching request:', { id: request.id, kod_2: reqKod2, cap: reqCap, stok_kodu: request.stok_kodu });
        }
        return matches;
      });
      
      console.log(`🔍 Found ${matchingRequests.length} matching requests by kod_2/cap`);
      
      // If no matching requests found in current requests, try to find by stok_kodu
      if (matchingRequests.length === 0) {
        console.log('🔍 No direct matches found, trying stok_kodu pattern...');
        
        // Generate expected stok_kodu patterns for both TAVLI and BALYA
        const capFormatted = Math.round(capValue * 100).toString().padStart(4, '0');
        const tavliPattern = `TT.BAG.${capFormatted}`;
        const balyaPattern = `TT.BALYA.${capFormatted}`;
        console.log('🎯 Expected stok_kodu patterns:', { tavliPattern, balyaPattern });

        const requestsByStokKodu = requests.filter(request => {
          if (!request || request.status !== 'approved' || !request.stok_kodu) return false;

          const matches = request.stok_kodu.startsWith(tavliPattern) || request.stok_kodu.startsWith(balyaPattern);
          if (matches) {
            console.log('✅ Found matching request by stok_kodu:', { id: request.id, stok_kodu: request.stok_kodu });
          }
          return matches;
        });
        
        console.log(`🔍 Found ${requestsByStokKodu.length} matching requests by stok_kodu`);
        return requestsByStokKodu;
      }
      
      return matchingRequests;
      
    } catch (error) {
      console.error('Error finding requests for task:', error);
      return [];
    }
  };

  // Generate Excel files from database (ensures Excel matches what was saved)
  const generateExcelFilesFromDatabase = async (mmStokKodu) => {
    try {
      console.log(`📋 Generating Excel from database for: ${mmStokKodu}`);

      // 1. Fetch MM TT from database (final product)
      const mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?limit=1000`);
      if (!mmResponse || !mmResponse.ok) {
        throw new Error('MM TT verisi yüklenemedi');
      }
      const allMmGt = await mmResponse.json();
      const mm = allMmGt.find(p => p.stok_kodu === mmStokKodu);

      if (!mm) {
        throw new Error(`MM TT bulunamadı: ${mmStokKodu}`);
      }

      console.log(`📋 MM TT found: ${mm.stok_kodu}, Product type: ${mm.product_type}`);

      // 2. Fetch YM TT from database (annealed intermediate - always exists)
      const allYmTtResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmTt}?limit=1000`);
      if (!allYmTtResponse || !allYmTtResponse.ok) {
        throw new Error('YM TT verisi yüklenemedi');
      }
      const allYmTt = await allYmTtResponse.json();
      const ymTt = allYmTt.find(p => p.source_mm_stok_kodu === mmStokKodu);

      if (!ymTt) {
        console.warn(`⚠️ YM TT bulunamadı for MM: ${mmStokKodu}`);
      } else {
        console.log(`📋 YM TT found: ${ymTt.stok_kodu}`);
      }

      // 3. Fetch YM STP from database (pressed intermediate - only if cap > 1.8mm)
      let ymStp = null;
      if (ymTt && ymTt.source_ym_st_stok_kodu && ymTt.source_ym_st_stok_kodu.includes('.P')) {
        // YM TT's source is YM STP (pressed)
        const ymStpStokKodu = ymTt.source_ym_st_stok_kodu;
        const allYmStpResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmStp}?limit=1000`);
        if (allYmStpResponse && allYmStpResponse.ok) {
          const allYmStp = await allYmStpResponse.json();
          ymStp = allYmStp.find(p => p.stok_kodu === ymStpStokKodu);
          if (ymStp) {
            console.log(`📋 YM STP found: ${ymStp.stok_kodu}`);
          }
        }
      }

      // 5. Fetch YM ST products
      // Find main YM ST from intermediate product recipes
      let mainYmStCode = null;

      if (ymStp) {
        // If pressed, get YM ST from YM STP recipe
        const ymStpRecipeResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmStpRecete}?mamul_kodu=${encodeURIComponent(ymStp.stok_kodu)}`);
        if (ymStpRecipeResponse && ymStpRecipeResponse.ok) {
          const ymStpRecipes = await ymStpRecipeResponse.json();
          const ymStInRecipe = ymStpRecipes.find(r => r.bilesen_kodu && r.bilesen_kodu.startsWith('YM.ST.'));
          if (ymStInRecipe) {
            mainYmStCode = ymStInRecipe.bilesen_kodu;
          }
        }
      } else if (ymTt) {
        // If not pressed, get YM ST from YM TT source
        mainYmStCode = ymTt.source_ym_st_stok_kodu;
      }

      if (!mainYmStCode) {
        throw new Error(`YM ST bulunamadı in intermediate recipes`);
      }

      console.log(`📋 Main YM ST found: ${mainYmStCode}`);

      // Fetch ALL YM ST products to build priority map
      const allYmStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?limit=5000`);
      if (!allYmStResponse || !allYmStResponse.ok) {
        throw new Error('YM ST verileri yüklenemedi');
      }
      const allYmSts = await allYmStResponse.json();

      // Find the main YM ST product
      const mainYmSt = allYmSts.find(ym => ym.stok_kodu === mainYmStCode);
      if (!mainYmSt) {
        throw new Error(`YM ST bulunamadı: ${mainYmStCode}`);
      }

      const ymStProducts = [mainYmSt]; // Priority 0 (main)
      const ymStAltDataObj = {}; // Group alternatives by priority

      // Extract diameter and quality from main YM ST
      let targetDiameter = null;
      let isCoilerProduct = false;

      if (mainYmStCode.endsWith('.ST')) {
        // This is a .ST product (coiler range)
        const match = mainYmStCode.match(/YM\.ST\.(\d{4})\.ST/);
        if (match) {
          targetDiameter = parseInt(match[1], 10); // e.g., 0150 → 150
          isCoilerProduct = true;
        }
      } else {
        // This is a filmasin product
        const match = mainYmStCode.match(/YM\.ST\.(\d{4})\./);
        if (match) {
          targetDiameter = parseInt(match[1], 10); // e.g., 0390 → 390
        }
      }

      if (!targetDiameter) {
        console.warn(`⚠️ Could not extract diameter from ${mainYmStCode}, skipping alternatives`);
      } else {
        console.log(`📋 SINGLE PRODUCT: Target diameter: ${targetDiameter/100}mm, isCoiler: ${isCoilerProduct}`);

        // Find alternatives based on priority column
        const alternativesForDiameter = allYmSts.filter(ym => {
          // Must have same target diameter
          const ymMatch = ym.stok_kodu.match(/YM\.ST\.(\d{4})/);
          if (!ymMatch) return false;
          const ymDiameter = parseInt(ymMatch[1], 10);
          if (ymDiameter !== targetDiameter) return false;

          // Must have priority > 0
          const priority = ym.priority || 0;
          if (priority === 0) return false;

          return true;
        });

        console.log(`📋 SINGLE PRODUCT: Found ${alternativesForDiameter.length} alternatives for diameter ${targetDiameter/100}mm`);

        // Group alternatives by priority
        alternativesForDiameter.forEach(ymSt => {
          const priority = ymSt.priority || 1;
          if (!ymStAltDataObj[priority]) {
            ymStAltDataObj[priority] = [];
          }
          ymStAltDataObj[priority].push(ymSt);
          console.log(`  Priority ${priority}: ${ymSt.stok_kodu}`);
        });
      }

      // 6. Fetch recipes from database for all products

      // MM TT recipes
      const mmRecipeResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMmRecete}?mm_id=${mm.id}`);
      const mmRecipes = (mmRecipeResponse && mmRecipeResponse.ok) ? await mmRecipeResponse.json() : [];
      mmRecipes.forEach(recipe => {
        recipe.mm_gt_stok_kodu = mmStokKodu;
        recipe.sequence = mmStokKodu.split('.').pop();
      });
      console.log(`📋 MM TT recipes: ${mmRecipes.length} items`);

      // YM TT recipes
      const ymTtRecipes = [];
      if (ymTt) {
        const ymTtRecipeResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmTtRecete}?mamul_kodu=${encodeURIComponent(ymTt.stok_kodu)}`);
        if (ymTtRecipeResponse && ymTtRecipeResponse.ok) {
          const recipes = await ymTtRecipeResponse.json();
          recipes.forEach(recipe => {
            recipe.ym_tt_stok_kodu = ymTt.stok_kodu;
            recipe.sequence = ymTt.stok_kodu.split('.').pop();
          });
          ymTtRecipes.push(...recipes);
        }
        console.log(`📋 YM TT recipes: ${ymTtRecipes.length} items`);
      }

      // YM STP recipes
      const ymStpRecipes = [];
      if (ymStp) {
        const ymStpRecipeResponse = await fetchWithAuth(`${API_URLS.tavliNetsisYmStpRecete}?mamul_kodu=${encodeURIComponent(ymStp.stok_kodu)}`);
        if (ymStpRecipeResponse && ymStpRecipeResponse.ok) {
          const recipes = await ymStpRecipeResponse.json();
          recipes.forEach(recipe => {
            recipe.ym_stp_stok_kodu = ymStp.stok_kodu;
            recipe.sequence = ymStp.stok_kodu.split('.').pop();
          });
          ymStpRecipes.push(...recipes);
        }
        console.log(`📋 YM STP recipes: ${ymStpRecipes.length} items`);
      }

      // Fetch YM ST recipes for all YM ST products (main and alternatives)
      const allYmStProducts = [...ymStProducts, ...Object.values(ymStAltDataObj).flat()];
      const ymStRecipes = [];

      for (const ymSt of allYmStProducts) {
        const ymStRecipeResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
        if (ymStRecipeResponse && ymStRecipeResponse.ok) {
          const recipes = await ymStRecipeResponse.json();
          recipes.forEach(recipe => {
            recipe.ym_st_stok_kodu = ymSt.stok_kodu;
            recipe.ym_st_priority = ymSt.priority;
          });
          ymStRecipes.push(...recipes);
        }
      }

      // 5. Generate Excel using batch functions (ensures format matches database reality)
      await generateBatchStokKartiExcel([mm], ymTt ? [ymTt] : [], ymStp ? [ymStp] : [], ymStProducts, ymStAltDataObj);
      await generateBatchReceteExcel(mmRecipes, ymTtRecipes, ymStpRecipes, ymStRecipes, [mm], ymTt ? [ymTt] : [], ymStp ? [ymStp] : [], allYmStProducts);

      console.log('✅ Excel files generated from database successfully');

    } catch (error) {
      console.error('Excel generation from database failed:', error);
      throw error;
    }
  };

  // Excel dosyalarını oluştur
  const generateExcelFiles = async () => {
    try {
      // Check if we're editing a request and need approval (but not already in approval process)
      if (isEditingRequest && selectedRequest && !isInApprovalProcess) {
        setIsInApprovalProcess(true);
        // Skip modal, proceed directly with approval and queue
        approveRequestAndContinue();
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      // Talep kullanıldıysa, onaylama penceresi göstermeden işleme devam et
      if (isRequestUsed) {
        // Excel oluşturmaya devam edecek, talep işlemleri ayrı bir süreçte yönetilecek
      }
      
      if (![...selectedYmSts, ...autoGeneratedYmSts].length) {
        toast.error('En az bir YM ST seçmelisiniz veya oluşturmalısınız');
        setIsLoading(false);
        return;
      }
      
      // Excel generation should use the processSequence that was set during database save
      // This ensures consistency between database and Excel files
      
      // Debug: Check sessionStorage for sequence consistency
      const storedSequence = sessionStorage.getItem('lastProcessSequence');
      
      // Extract sequence from selected request's stok_kodu if available
      let requestSequence = '00';
      if (selectedRequest && selectedRequest.stok_kodu) {
        const match = selectedRequest.stok_kodu.match(/\.(\d+)$/);
        if (match) {
          requestSequence = match[1];
          console.log(`🔍 Extracted sequence from request stok_kodu: ${requestSequence}`);
        }
      }
      
      // Priority: requestSequence > storedSequence > processSequence
      const sequenceToUse = requestSequence !== '00' ? requestSequence
        : (processSequence === '00' && storedSequence && storedSequence !== '00') 
          ? storedSequence 
          : processSequence;
        
      console.log(`🔍 Sequence selection debug:`, {
        requestSequence,
        storedSequence,
        processSequence,
        sequenceToUse
      });
        
      if (storedSequence && storedSequence !== processSequence) {
        // Update processSequence to match the stored value
        setProcessSequence(storedSequence);
      }
      
      // Calculate what the expected stok_kodu should be
      const expectedStokKodu = generateMmStokKodu(mmData.product_type, mmData.cap, sequenceToUse);
      
      if (!sequenceToUse || sequenceToUse === '00') {
      }
      
      // Generate Excel from database (ensures Excel matches what was actually saved)
      try {
        await generateExcelFilesFromDatabase(expectedStokKodu);
        console.log(`✅ Excel files generated from database for: ${expectedStokKodu}`);
      } catch (excelError) {
        console.error('Excel generation from database failed:', excelError);
        toast.error('Excel oluşturulamadı: ' + excelError.message);
        throw excelError; // Rethrow to stop the process
      }
      
      // Both Excel files generated successfully
      
      // Only show success message if we're not in the request approval flow
      // (the approval flow will handle its own success message)
      if (!isEditingRequest) {
        setSuccessMessage('Excel dosyaları başarıyla oluşturuldu');
        toast.success('Excel dosyaları başarıyla oluşturuldu');
        
        // Clear the success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Excel oluşturma ana hatası:', error);
      setError('Excel oluşturma hatası: ' + error.message);
      toast.error('Excel oluşturma hatası: ' + error.message);
    } finally {
      console.log('Excel oluşturma işlemi sonlandı');
      setIsLoading(false);
      
      // Force UI update
      setTimeout(() => {
        // Reset loading state again just to be sure
        setIsLoading(false);
      }, 500);
    }
  };

  // Stok Kartı Excel oluştur - yeni 1:1:n ilişki modeli ile
  const generateStokKartiExcel = async (sequenceParam = '00') => {
    // Use the passed sequence parameter which should be the correct one
    const sequence = sequenceParam || processSequence || '00';
    // Excel generation using sequence: ${sequence}
    
    const workbook = new ExcelJS.Workbook();
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    // Ana YM ST'yi belirle (ya seçilmiş ya da otomatik oluşturulmuş)
    const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
    
    
    // MM TT Sheet - Artık sadece 1 tane MM TT
    const mmSheet = workbook.addWorksheet('MM TT');
    const mmHeaders = getStokKartiHeaders();
    mmSheet.addRow(mmHeaders);
    
    // Sadece 1 MM TT ekle (doğru sequence ile)
    mmSheet.addRow(generateMmGtStokKartiData(sequence));
    
    
    // YM ST Sheet - Main products only
    const ymStSheet = workbook.addWorksheet('YM ST');
    const ymStHeaders = getYmStHeaders();
    ymStSheet.addRow(ymStHeaders);

    // Categorize YM STs by priority/isMain - DYNAMIC VERSION (supports unlimited priorities)
    const ymStsByPriority = {};

    allYmSts.forEach((ymSt, index) => {
      const isMain = ymSt.isMain !== false && (ymSt.priority === 0 || ymSt.priority === undefined || index === mainYmStIndex);
      const priority = ymSt.priority !== undefined ? ymSt.priority : (index === mainYmStIndex ? 0 : index);

      // Group by priority dynamically
      if (!ymStsByPriority[priority]) {
        ymStsByPriority[priority] = [];
      }
      ymStsByPriority[priority].push(ymSt);
    });

    // Add YM STs dynamically for each priority
    const priorities = Object.keys(ymStsByPriority).map(Number).sort((a, b) => a - b);

    priorities.forEach(priority => {
      const ymSts = ymStsByPriority[priority];

      if (priority === 0) {
        // Main products (priority 0) - add to main YM ST sheet
        ymSts.forEach(ymSt => {
          ymStSheet.addRow(generateYmStStokKartiData(ymSt));
        });
      } else if (priority > 0) {
        // ✅ FIXED: Alternative products (priority 1, 2, 3, ...) - Only create ALT sheets for priority >= 1
        if (ymSts.length > 0) {
          const altSheet = workbook.addWorksheet(`YM ST ALT ${priority}`);
          altSheet.addRow(ymStHeaders);
          ymSts.forEach(ymSt => {
            altSheet.addRow(generateYmStStokKartiData(ymSt));
          });
        }
      }
    });
    
    try {
      // Validate data before writing
      console.log('Stok Kartı Excel dosyası oluşturuluyor...');
      const buffer = await workbook.xlsx.writeBuffer();
      console.log('Stok Kartı Excel buffer oluşturuldu, dosya boyutu:', buffer.byteLength, 'bytes');
      
      // Additional validation - ensure buffer is not empty
      if (buffer.byteLength === 0) {
        throw new Error('Stok Kartı Excel buffer boş - veri sorunu');
      }
      
      // ✅ FIXED: Generate filename using MM TT stok_kodu (TT.BAG or TT.BALYA)
      const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
      const productPrefix = mmData.product_type === 'TAVLI' ? 'TT.BAG' : 'TT.BALYA';
      const mmStokKodu = `${productPrefix}.${capFormatted}.${sequence}`;
      const filename = `${mmStokKodu}_Stok_Karti.xlsx`;
      
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
    } catch (excelError) {
      console.error('Stok Kartı Excel oluşturma hatası:', excelError);
      throw new Error(`Stok Kartı Excel dosyası oluşturulamadı: ${excelError.message}`);
    }
  };

  // Reçete Excel oluştur - Yeni 1:1:n ilişki modeli ile
  const generateReceteExcel = async (sequenceParam = '00') => {
    // Use the passed sequence parameter which should be the correct one
    const sequence = sequenceParam || processSequence || '00';
    // Recipe Excel generation using sequence: ${sequence}
    
    const workbook = new ExcelJS.Workbook();
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    // Ana YM ST'yi belirle (ya seçilmiş ya da otomatik oluşturulmuş)
    const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
    const mainYmStIndex_ = mainYmStIndex; // Closure için yerel değişken
    
    
    // MM TT REÇETE Sheet
    const mmReceteSheet = workbook.addWorksheet('MM TT REÇETE');
    const receteHeaders = getReceteHeaders();
    mmReceteSheet.addRow(receteHeaders);
    
    // Sadece ana YMST için MM TT reçete satırları ekle
    const mmRecipe = { ...allRecipes.mmRecipes[mainYmStIndex_] } || {}; // Clone to avoid modifying the original
    
    // ✅ FIXED: Tavlı/Balya uses YM.TT intermediates - SHARED by both
    // Create correct YM.TT stok kodu - should match MM TT sequence
    const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
    const correctStokKodu = `YM.TT.${capFormatted}.${sequence}`;

    // Fix recipe YM.TT codes - create new object
    const fixedRecipe = {};
    Object.entries(mmRecipe).forEach(([key, value]) => {
      if (key.startsWith('YM.TT.') && key !== correctStokKodu) {
        fixedRecipe[correctStokKodu] = value;
      } else {
        fixedRecipe[key] = value;
      }
    });
    
    // Düzeltilmiş reçeteyi kullan
    const processedMmGtRecipe = fixedRecipe;
    
    let siraNo = 1;
    
    // MMGT reçete sıralaması: fixed exact order as specified
    const recipeEntries = Object.entries(processedMmGtRecipe);
    
    // CRITICAL FIX: Ensure only ONE shrink entry exists for Excel
    const shrinkEntries = recipeEntries.filter(([key]) => key.includes('AMB.SHRİNK.'));
    if (shrinkEntries.length > 1) {
      console.warn(`Multiple shrink entries found (${shrinkEntries.length}), cleaning for Excel generation:`);
      shrinkEntries.forEach(([key, value]) => console.warn(`  ${key}: ${value}`));
      
      // Find the one with highest value or first non-zero
      const activeShrink = shrinkEntries.find(([key, value]) => value > 0) || shrinkEntries[0];
      console.warn(`Using only: ${activeShrink[0]} = ${activeShrink[1]}`);
      
      // Remove all other shrink entries from the recipe for Excel
      shrinkEntries.forEach(([key]) => {
        if (key !== activeShrink[0]) {
          delete processedMmGtRecipe[key];
        }
      });
      
      // Regenerate entries after cleanup
      const cleanedEntries = Object.entries(processedMmGtRecipe);
      recipeEntries.length = 0;
      recipeEntries.push(...cleanedEntries);
    }
    
    // ✅ FIXED: Maintain fixed order with YM.TT (not YM.GT) for Tavlı/Balya
    // Operations: TAV01 (tavlama), TVPKT01 (tavlı paketleme) or BAL01 (balya), etc.
    const correctYmTtStokKodu = correctStokKodu; // Already defined above
    const ymTtEntry = recipeEntries.find(([key]) => key === correctYmTtStokKodu) ||
                      recipeEntries.find(([key]) => key.startsWith('YM.TT.'));
    const tavlamaEntry = recipeEntries.find(([key]) => key === 'TAV01' || key === 'TVPKT01' || key === 'BAL01');
    const kartonEntry = recipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL');
    const shrinkEntry = recipeEntries.find(([key]) => key.includes('AMB.SHRİNK.'));
    const halkaEntry = recipeEntries.find(([key]) => key === 'SM.7MMHALKA');
    const plastikCemberEntry = recipeEntries.find(([key]) => key === 'AMB.PLASTİK.ÇEMBER');
    const tokaEntry = recipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
    const celikCemberEntry = recipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080'); // ✅ ADDED: Çelik Çember
    const paletEntry = recipeEntries.find(([key]) => key === 'AMB.PALET');
    // ❌ REMOVED: strecEntry - not in gene2l.csv

    // Other entries that might exist but aren't in the fixed order
    const otherEntries = recipeEntries.filter(([key]) =>
      !key.includes('YM.TT.') &&
      key !== 'TAV01' &&
      key !== 'TVPKT01' &&
      key !== 'BAL01' &&
      key !== 'AMB.ÇEM.KARTON.GAL' &&
      !key.includes('AMB.SHRİNK.') &&
      key !== 'SM.7MMHALKA' &&
      key !== 'AMB.PLASTİK.ÇEMBER' &&
      key !== 'AMB.TOKA.SIGNODE.114P. DKP' &&
      key !== 'AMB.APEX CEMBER 38X080' && // ✅ ADDED: Exclude Çelik Çember
      key !== 'AMB.PALET'
      // ❌ REMOVED: AMB.STREÇ exclusion
    );

    // Sırayla ekle - exact order (YM.TT then operations and auxiliaries)
    const orderedEntries = [
      ymTtEntry,
      tavlamaEntry, // TAV01, TVPKT01, or BAL01
      kartonEntry,
      shrinkEntry,
      halkaEntry,
      plastikCemberEntry,
      tokaEntry,
      celikCemberEntry, // ✅ ADDED: Çelik Çember
      paletEntry,
      ...otherEntries
    ].filter(Boolean);
    
    // MM TT reçete satırlarını eklerken doğru sequence'i kullan - Sadece 8 satır olmalı
    orderedEntries.forEach(([key, value]) => {
      if (value > 0) {
        mmReceteSheet.addRow(generateMmTtReceteRow(key, value, siraNo, sequence));
        siraNo++;
      }
    });
    
    // Debugging: Check if we have exactly 8 rows as expected
    const addedRows = orderedEntries.filter(([key, value]) => value > 0).length;
    if (addedRows !== 8) {
      console.warn(`MMGT reçetesi ${addedRows} satır içeriyor, 8 olmalı. Girdiler:`, 
        orderedEntries.filter(([key, value]) => value > 0).map(([key]) => key));
    }
    
    // YM ST REÇETE Sheet - Main products only
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    ymStReceteSheet.addRow(receteHeaders);

    // Build main YM ST recipes array from allRecipes.ymStRecipes
    // Filter for .ST products (COILER products)
    const mainYmStRecipes = [];
    allYmSts.forEach((ymSt, index) => {
      const ymStRecipe = allRecipes.ymStRecipes[index] || {};
      const recipeEntries = Object.entries(ymStRecipe);

      // Convert recipe format to match what generateCoilerAlternatives expects
      recipeEntries.forEach(([bilesen_kodu, miktar]) => {
        if (bilesen_kodu !== 'NOTE' && miktar > 0) {
          // ✅ FIX: Add operasyon_bilesen field so generateCoilerAlternatives can distinguish B vs O
          const isOperation = ['TLC01', 'COTLC01'].includes(bilesen_kodu);

          mainYmStRecipes.push({
            mamul_kodu: ymSt.stok_kodu,
            bilesen_kodu: bilesen_kodu,
            miktar: miktar,
            priority: 0,
            operasyon_bilesen: isOperation ? 'O' : 'B'  // Required by generateCoilerAlternatives
          });
        }
      });
    });

    // Add main YM ST recipes to sheet
    const ymStByProduct = {};
    mainYmStRecipes.forEach(recipe => {
      if (!ymStByProduct[recipe.mamul_kodu]) {
        ymStByProduct[recipe.mamul_kodu] = [];
      }
      ymStByProduct[recipe.mamul_kodu].push(recipe);
    });

    const sortedYmStStokCodes = Object.keys(ymStByProduct).sort();
    sortedYmStStokCodes.forEach(stokKodu => {
      if (ymStByProduct[stokKodu] && ymStByProduct[stokKodu].length > 0) {
        let productSiraNo = 1;
        ymStByProduct[stokKodu].forEach(recipe => {
          const ymSt = allYmSts.find(y => y.stok_kodu === stokKodu);
          ymStReceteSheet.addRow(generateYmStReceteRow(recipe.bilesen_kodu, recipe.miktar, productSiraNo, ymSt || { stok_kodu: stokKodu }));
          productSiraNo++;
        });
      }
    });

    // 🆕 Generate COILER alternatives dynamically for .ST products (up to 8 alternatives)
    console.log('🔄 SINGLE RECIPE: Generating COILER alternatives for .ST products...');
    const coilerAlternatives = generateCoilerAlternatives(mainYmStRecipes, allYmSts);
    const altPriorities = Object.keys(coilerAlternatives).map(Number).sort((a, b) => a - b);
    console.log(`📋 SINGLE RECIPE: Generated COILER alternatives for priorities: ${altPriorities.join(', ')}`);

    // 🆕 Create YM ST REÇETE ALT 1-8 sheets dynamically based on available alternatives
    altPriorities.forEach(priority => {
      const altRecipes = coilerAlternatives[priority];
      if (!altRecipes || altRecipes.length === 0) return;

      const altSheet = workbook.addWorksheet(`YM ST REÇETE ALT ${priority}`);
      altSheet.addRow(receteHeaders);

      // Group recipes by product
      const ymStAltByProduct = {};
      altRecipes.forEach(recipe => {
        if (!ymStAltByProduct[recipe.mamul_kodu]) {
          ymStAltByProduct[recipe.mamul_kodu] = [];
        }
        ymStAltByProduct[recipe.mamul_kodu].push(recipe);
      });

      // Add recipes sorted by product code
      Object.keys(ymStAltByProduct).sort().forEach(stokKodu => {
        if (ymStAltByProduct[stokKodu] && ymStAltByProduct[stokKodu].length > 0) {
          let productSiraNo = 1;
          ymStAltByProduct[stokKodu].forEach(recipe => {
            const ymSt = allYmSts.find(y => y.stok_kodu === stokKodu);
            altSheet.addRow(generateYmStReceteRow(recipe.bilesen_kodu, recipe.miktar, productSiraNo, ymSt || { stok_kodu: stokKodu }));
            productSiraNo++;
          });
        }
      });

      console.log(`✅ SINGLE RECIPE: Created YM ST REÇETE ALT ${priority} sheet with ${altRecipes.length} recipes`);
    });
    
    try {
      // Validate data before writing
      console.log('Excel dosyası oluşturuluyor...');
      const buffer = await workbook.xlsx.writeBuffer();
      console.log('Excel buffer oluşturuldu, dosya boyutu:', buffer.byteLength, 'bytes');
      
      // Additional validation - ensure buffer is not empty
      if (buffer.byteLength === 0) {
        throw new Error('Excel buffer boş - veri sorunu');
      }
      
      // ✅ FIXED: Generate filename using MM TT stok_kodu (TT.BAG or TT.BALYA)
      const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');
      const productPrefix = mmData.product_type === 'TAVLI' ? 'TT.BAG' : 'TT.BALYA';
      const mmStokKodu = `${productPrefix}.${capFormatted}.${sequence}`;
      const filename = `${mmStokKodu}_Recete.xlsx`;
      
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
    } catch (excelError) {
      console.error('Excel oluşturma hatası:', excelError);
      throw new Error(`Excel dosyası oluşturulamadı: ${excelError.message}`);
    }
  };

  // ✅ FIXED: Excel header fonksiyonları (Tavlı/Balya Tel - removed Kaplama, updated Kod labels)
  const getStokKartiHeaders = () => [
    'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Ürün Tipi', 'Cari/Satıcı Kodu',
    'Türü', 'Mamul Grup', 'İngilizce İsim', 'Satıcı İsmi', 'Muh. Detay', 'Depo Kodu', 'Br-1', 'Br-2',
    'Pay-1', 'Payda-1', 'Çevrim Değeri-1', 'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2',
    'Çevrim Değeri-2', 'Çap', 'Yağlama Tipi', 'Min Mukavemet', 'Max Mukavemet', 'KG',
    'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Çap2', 'Shrink', 'Tolerans(+)',
    'Tolerans(-)', 'Ebat(En)', 'Göz Aralığı', 'Ebat(Boy)', 'Hasır Tipi',
    'Özel Saha 8 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi', 'Satış Fiyatı-1',
    'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4', 'Satış Tipi',
    'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı', 'Azami Stok',
    'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Bekleme Süresi', 'Temin Süresi',
    'Birim Ağırlık', 'Nakliye Tutar', 'Satış KDV Oranı', 'Alış KDV Oranı',
    'Stok Türü', 'Mali Grup Kodu', 'Barkod 1', 'Barkod 2', 'Barkod 3',
    'Kod-3', 'Kod-4', 'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın',
    'Bağlı Stok Kodu', 'Yapılandırma Kodu', 'Yap. Açıklama', 'Alış Döviz Tipi',
    'Gümrük Tarife Kodu', 'Dağıtıcı Kodu', 'Menşei', 'METARIAL', 'DIA (MM)',
    'DIA TOL (MM) +', 'DIA TOL (MM) -', 'ZING COATING (GR/M2)', 'TENSILE ST. (MPA) MIN',
    'TENSILE ST. (MPA) MAX', 'WAX', 'LIFTING LUGS', 'UNWINDING', 'CAST KONT. (CM)',
    'HELIX KONT. (CM)', 'ELONGATION (%) MIN', 'COIL DIMENSIONS (CM) ID',
    'COIL DIMENSIONS (CM) OD', 'COIL WEIGHT (KG)', 'COIL WEIGHT (KG) MIN',
    'COIL WEIGHT (KG) MAX', 'Tolerans Açıklama'
  ];

  const getYmStHeaders = () => [
    'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Kod-2', 'Kod-3',
    'Satış KDV Oranı', 'Muh.Detay', 'Depo Kodu', 'Br-1', 'Br-2', 'Pay-1',
    'Payda-1', 'Çevrim Değeri-1', 'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2',
    'Çevrim Değeri-2', 'Alış Fiyatı', 'Fiyat Birimi', 'Satış Fiyatı-1',
    'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4', 'Döviz Tip',
    'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı', 'Azami Stok',
    'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Alış Döviz Tipi', 'Bekleme Süresi',
    'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar', 'Stok Türü', 'Mali Grup Kodu',
    'İngilizce İsim', 'Özel Saha 1 (Say.)', 'Özel Saha 2 (Say.)', 'Özel Saha 3 (Say.)',
    'Özel Saha 4 (Say.)', 'Özel Saha 5 (Say.)', 'Özel Saha 6 (Say.)', 'Özel Saha 7 (Say.)',
    'Özel Saha 8 (Say.)', 'Özel Saha 1 (Alf.)', 'Özel Saha 2 (Alf.)', 'Özel Saha 3 (Alf.)',
    'Özel Saha 4 (Alf.)', 'Özel Saha 5 (Alf.)', 'Özel Saha 6 (Alf.)', 'Özel Saha 7 (Alf.)',
    'Özel Saha 8 (Alf.)', 'Kod-4', 'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın',
    'Bağlı Stok Kodu', 'Yapılandırma Kodu', 'Yap. Açıklama'
  ];

  const getReceteHeaders = () => [
    'Mamul Kodu(*)', 'Reçete Top.', 'Fire Oranı (%)', 'Oto.Reç.', 'Ölçü Br.',
    'Sıra No(*)', 'Operasyon Bileşen', 'Bileşen Kodu(*)', 'Ölçü Br. - Bileşen',
    'Miktar(*)', 'Açıklama', 'Miktar Sabitle', 'Stok/Maliyet', 'Fire Mik.',
    'Sabit Fire Mik.', 'İstasyon Kodu', 'Hazırlık Süresi', 'Üretim Süresi',
    'Ü.A.Dahil Edilsin', 'Son Operasyon', 'Matris', 'Planlama Oranı',
    'Alternatif Politika - D.A.Transfer Fişi', 'Alternatif Politika - Ambar Ç. Fişi',
    'Alternatif Politika - Üretim S.Kaydı', 'Alternatif Politika - MRP', 'İÇ/DIŞ'
  ];

  // Tavlı/Balya Teli specific headers (TT MM products)
  const getTavliBalyaHeaders = () => [
    'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Cari/Satıcı Kodu',
    'Türü', 'Mamul Grup', 'İngilizce İsim', 'Satıcı İsmi', 'Muh. Detay', 'Depo Kodu', 'Br-1', 'Br-2',
    'Pay-1', 'Payda-1', 'Çevrim Değeri-1', 'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2',
    'Çevrim Değeri-2', 'Çap', 'Min Mukavemet', 'Max Mukavemet', 'KG',
    'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Çap2', 'Shrink', 'Tolerans(+)',
    'Tolerans(-)', 'Ebat(En)', 'Göz Aralığı', 'Ebat(Boy)', 'Hasır Tipi',
    'Özel Saha 8 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi', 'Satış Fiyatı-1',
    'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4', 'Satış Tipi',
    'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı', 'Azami Stok',
    'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Bekleme Süresi', 'Temin Süresi',
    'Birim Ağırlık', 'Nakliye Tutar', 'Satış KDV Oranı', 'Alış KDV Oranı',
    'Stok Türü', 'Mali Grup Kodu', 'Barkod 1', 'Barkod 2', 'Barkod 3',
    'Kod-3', 'Kod-4', 'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın',
    'Bağlı Stok Kodu', 'Yapılandırma Kodu', 'Yap. Açıklama', 'Alış Döviz Tipi',
    'Gümrük Tarife Kodu', 'Dağıtıcı Kodu', 'Menşei', 'METARIAL', 'DIA (MM)',
    'DIA TOL (MM) +', 'DIA TOL (MM) -', 'TENSILE ST. (MPA) MIN',
    'TENSILE ST. (MPA) MAX', 'WAX', 'LIFTING LUGS', 'UNWINDING', 'CAST KONT. (CM)',
    'HELIX KONT. (CM)', 'ELONGATION (%) MIN', 'COIL DIMENSIONS (CM) ID',
    'COIL DIMENSIONS (CM) OD', 'COIL WEIGHT (KG)', 'COIL WEIGHT (KG) MIN',
    'COIL WEIGHT (KG) MAX', 'Tolerans Açıklama', 'Ürün Tipi', 'Yağlama Tipi'
  ];

  // Helper function to extract packaging options from stok_adi
  const extractPackagingFromStokAdi = (stokAdi) => {
    if (!stokAdi) return { shrink: false, paletli: false, karton: false };
    
    const parts = stokAdi.split(' kg');
    if (parts.length < 2) return { shrink: false, paletli: false, karton: false };
    
    const suffixPart = parts[1]; // Everything after "kg"
    return {
      shrink: suffixPart.includes('-Shrink'),
      paletli: suffixPart.includes('-Plt'),
      karton: suffixPart.includes('-Krt')
    };
  };

  // Excel veri oluşturma fonksiyonları - doğru formatlar ve COMMA usage
  // Batch version that takes MM TT data as parameter
  const generateMmTtStokKartiDataForBatch = (mm) => {
    const cap = parseFloat(mm.cap);
    const toleransPlus = parseFloat(mm.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mm.tolerans_minus) || 0;

    // Tolerance values are already signed in database, use them directly
    const adjustedPlus = toleransPlus;
    const adjustedMinus = toleransMinus;
    
    // Check if stok_adi already has packaging suffixes
    const existingPackaging = extractPackagingFromStokAdi(mm.stok_adi);
    
    // Generate stok_adi for this specific MM TT
    const bagAmount = mm.cast_kont && mm.cast_kont.trim() !== '' 
      ? `/${mm.cast_kont}` 
      : '';
    
    // Use stok_adi from database if available, otherwise generate it
    let stokAdi = mm.stok_adi;
    let englishName = mm.ingilizce_isim;

    // Define productName outside the if block so it's available for METARIAL field later
    const productName = mm.product_type === 'TAVLI' ? 'Tavlı Tel' :
                        mm.product_type === 'BALYA' ? 'Balya Teli' :
                        'Tavlı Tel'; // Default to Tavlı Tel

    // If stok_adi is not in database, generate it (shouldn't happen with proper data)
    if (!stokAdi) {
      const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + parseFloat(adjustedMinus.toFixed(2)).toString().replace('.', ',');
      const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + parseFloat(adjustedPlus.toFixed(2)).toString().replace('.', ',');
      stokAdi = `${productName} ${parseFloat(cap.toFixed(2)).toString().replace('.', ',')} mm ${formattedMinus}/${formattedPlus} ${mm.kaplama || '0'} gr/m² ${parseFloat(mm.min_mukavemet) || '0'}-${parseFloat(mm.max_mukavemet) || '0'} MPa ID:${parseFloat(mm.ic_cap) || '45'} cm OD:${parseFloat(mm.dis_cap) || '75'} cm ${parseFloat(mm.kg) || '0'}${bagAmount} kg`;
    }

    // If English name is not in database, generate it - FIXED for Tavli/Balya
    if (!englishName) {
      const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + parseFloat(adjustedMinus.toFixed(2));
      const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + parseFloat(adjustedPlus.toFixed(2));
      // Determine English product name based on product type
      const englishProductName = mm.product_type === 'BALYA' ? 'Bale Wire' : 'Annealed Wire';
      englishName = `${englishProductName} ${parseFloat(cap.toFixed(2))} mm ${formattedMinus}/${formattedPlus} ${parseFloat(mm.min_mukavemet) || '0'}-${parseFloat(mm.max_mukavemet) || '0'} MPa ID:${parseFloat(mm.ic_cap) || '45'} cm OD:${parseFloat(mm.dis_cap) || '75'} cm ${parseFloat(mm.kg) || '0'}${bagAmount} kg`;
    }

    return [
      mm.stok_kodu, // Stok Kodu - use actual stok_kodu from database
      stokAdi, // Stok Adı
      'MM', // Grup Kodu
      'TT', // Kod-1 - FIXED: TT for Tavli/Balya (was GT)
      mm.kod_2, // Kod-2
      '', // Cari/Satıcı Kodu
      'M', // Türü
      mm.stok_kodu, // Mamul Grup
      englishName, // İngilizce İsim
      '', // Satıcı İsmi
      '26', // Muh. Detay
      '36', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1 (Excel formatı - keep as 1000)
      '0.001', // Çevrim Değeri-1
      '', // Ölçü Br-3
      '1', // Çevrim Pay-2
      '1', // Çevrim Payda-2
      '1', // Çevrim Değeri-2
      cap.toFixed(2).replace('.', ','), // Çap (VIRGÜL for Excel)
      mm.kaplama, // Kaplama
      mm.min_mukavemet, // Min Mukavemet
      mm.max_mukavemet, // Max Mukavemet
      mm.kg, // KG
      mm.ic_cap, // İç Çap
      mm.dis_cap, // Dış Çap
      '', // Çap2
      mm.shrink, // Shrink
      formatDecimalForExcel(adjustedPlus), // Tolerans(+) (NOKTA format, no trailing zeros)
      formatDecimalForExcel(adjustedMinus), // Tolerans(-) (NOKTA format, no trailing zeros)
      '', // Ebat(En)
      '', // Göz Aralığı
      '', // Ebat(Boy)
      '', // Hasır Tipi
      '', // Özel Saha 8 (Alf.)
      '0', // Alış Fiyatı
      '1', // Fiyat Birimi
      '0', // Satış Fiyatı-1
      '0', // Satış Fiyatı-2
      '0', // Satış Fiyatı-3
      '0', // Satış Fiyatı-4
      '1', // Satış Tipi
      '0', // Döviz Alış
      '0', // Döviz Maliyeti
      '0', // Döviz Satış Fiyatı
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Döv.Tutar
      '0', // Döv.Tipi
      '0', // Bekleme Süresi
      '0', // Temin Süresi
      '0', // Birim Ağırlık
      '0', // Nakliye Tutar
      '20', // Satış KDV Oranı
      '20', // Alış KDV Oranı
      'D', // Stok Türü
      '', // Mali Grup Kodu
      '', // Barkod 1
      '', // Barkod 2
      '', // Barkod 3
      '', // Kod-3
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapılandır
      'H', // Süper Reçete Kullanılsın
      '', // Bağlı Stok Kodu
      '', // Yapılandırma Kodu
      '', // Yap. Açıklama
      '2', // Alış Döviz Tipi
      getGumrukTarifeKoduForCap(cap), // Gümrük Tarife Kodu
      '', // Dağıtıcı Kodu
      '052', // Menşei
      productName, // METARIAL (use same product name as stok_adi)
      cap.toFixed(2).replace('.', ','), // DIA (MM) - COMMA for Excel
      formatDecimalForExcel(adjustedPlus), // DIA TOL (MM) + (matching Turkish tolerans)
      formatDecimalForExcel(adjustedMinus), // DIA TOL (MM) - (matching Turkish tolerans)
      mm.kaplama, // ZING COATING (GR/M2)
      mm.min_mukavemet, // TENSILE ST. (MPA) MIN
      mm.max_mukavemet, // TENSILE ST. (MPA) MAX
      '+', // WAX
      '+', // LIFTING LUGS
      mm.unwinding === 'Clockwise' ? 'Clockwise' : '', // UNWINDING
      mm.cast_kont || '', // CAST KONT. (CM)
      mm.helix_kont || '', // HELIX KONT. (CM)
      mm.elongation || '', // ELONGATION (%) MIN
      mm.ic_cap, // COIL DIMENSIONS (CM) ID
      mm.dis_cap, // COIL DIMENSIONS (CM) OD
      mm.kg, // COIL WEIGHT (KG)
      '', // COIL WEIGHT (KG) MIN
      mm.kg, // COIL WEIGHT (KG) MAX - Copy the same value from COIL WEIGHT
      generateToleransAciklamaForBatch(mm.tolerans_plus, mm.tolerans_minus) // Tolerans Açıklama
    ];
  };

  // Tavlı/Balya Teli specific batch data generation (TT MM products)
  const generateTavliBalyaStokKartiDataForBatch = (mm) => {
    const cap = parseFloat(mm.cap);
    const toleransPlus = parseFloat(mm.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mm.tolerans_minus) || 0;

    // Tolerance values are already signed in database, use them directly
    const adjustedPlus = toleransPlus;
    const adjustedMinus = toleransMinus;

    // Generate stok_adi for this specific TT product
    const bagAmount = mm.cast_kont && mm.cast_kont.trim() !== ''
      ? `/${mm.cast_kont}`
      : '';

    // Use stok_adi from database if available, otherwise generate it
    let stokAdi = mm.stok_adi;
    let englishName = mm.ingilizce_isim;

    // If stok_adi is not in database, generate it
    if (!stokAdi) {
      const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + parseFloat(adjustedMinus.toFixed(2)).toString().replace('.', ',');
      const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + parseFloat(adjustedPlus.toFixed(2)).toString().replace('.', ',');
      const productName = mm.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli';
      stokAdi = `${productName} ${parseFloat(cap.toFixed(2)).toString().replace('.', ',')} mm ${formattedMinus}/${formattedPlus} ${parseFloat(mm.min_mukavemet) || '0'}-${parseFloat(mm.max_mukavemet) || '0'} MPa ID:${parseFloat(mm.ic_cap) || '45'} cm OD:${parseFloat(mm.dis_cap) || '75'} cm ${parseFloat(mm.kg) || '0'}${bagAmount} kg`;
    }

    // If English name is not in database, generate it
    if (!englishName) {
      const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + parseFloat(adjustedMinus.toFixed(2));
      const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + parseFloat(adjustedPlus.toFixed(2));
      const productName = mm.product_type === 'TAVLI' ? 'Annealed Wire' : 'Bale Wire';
      englishName = `${productName} ${parseFloat(cap.toFixed(2))} mm ${formattedMinus}/${formattedPlus} ${parseFloat(mm.min_mukavemet) || '0'}-${parseFloat(mm.max_mukavemet) || '0'} MPa ID:${parseFloat(mm.ic_cap) || '45'} cm OD:${parseFloat(mm.dis_cap) || '75'} cm ${parseFloat(mm.kg) || '0'}${bagAmount} kg`;
    }

    return [
      mm.stok_kodu, // Stok Kodu
      stokAdi, // Stok Adı
      'MM', // Grup Kodu
      mm.product_type === 'TAVLI' ? 'TT.BAG' : 'TT.BALYA', // Kod-1
      '', // Cari/Satıcı Kodu
      'M', // Türü
      mm.stok_kodu, // Mamul Grup
      englishName, // İngilizce İsim
      '', // Satıcı İsmi
      '26', // Muh. Detay
      '36', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1
      '0.001', // Çevrim Değeri-1
      '', // Ölçü Br-3
      '1', // Çevrim Pay-2
      '1', // Çevrim Payda-2
      '1', // Çevrim Değeri-2
      cap.toFixed(2).replace('.', ','), // Çap (VIRGÜL for Excel)
      mm.min_mukavemet, // Min Mukavemet
      mm.max_mukavemet, // Max Mukavemet
      mm.kg, // KG
      mm.ic_cap, // İç Çap
      mm.dis_cap, // Dış Çap
      '', // Çap2
      mm.shrink, // Shrink
      formatDecimalForExcel(adjustedPlus), // Tolerans(+)
      formatDecimalForExcel(adjustedMinus), // Tolerans(-)
      '', // Ebat(En)
      '', // Göz Aralığı
      '', // Ebat(Boy)
      '', // Hasır Tipi
      '', // Özel Saha 8 (Alf.)
      '0', // Alış Fiyatı
      '1', // Fiyat Birimi
      '0', // Satış Fiyatı-1
      '0', // Satış Fiyatı-2
      '0', // Satış Fiyatı-3
      '0', // Satış Fiyatı-4
      '1', // Satış Tipi
      '0', // Döviz Alış
      '0', // Döviz Maliyeti
      '0', // Döviz Satış Fiyatı
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Döv.Tutar
      '0', // Döv.Tipi
      '0', // Bekleme Süresi
      '0', // Temin Süresi
      '0', // Birim Ağırlık
      '0', // Nakliye Tutar
      '20', // Satış KDV Oranı
      '20', // Alış KDV Oranı
      'D', // Stok Türü
      '', // Mali Grup Kodu
      '', // Barkod 1
      '', // Barkod 2
      '', // Barkod 3
      '', // Kod-3
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapılandır
      'H', // Süper Reçete Kullanılsın
      '', // Bağlı Stok Kodu
      '', // Yapılandırma Kodu
      '', // Yap. Açıklama
      '2', // Alış Döviz Tipi
      getGumrukTarifeKoduForCap(cap), // Gümrük Tarife Kodu
      '', // Dağıtıcı Kodu
      '052', // Menşei
      mm.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli', // MATERIAL
      cap.toFixed(2).replace('.', ','), // DIA (MM) - COMMA for Excel
      formatDecimalForExcel(adjustedPlus), // DIA TOL (MM) +
      formatDecimalForExcel(adjustedMinus), // DIA TOL (MM) -
      mm.min_mukavemet, // TENSILE ST. (MPA) MIN
      mm.max_mukavemet, // TENSILE ST. (MPA) MAX
      mm.product_type === 'BALYA' ? '+' : '', // WAX (only for Balya)
      '+', // LIFTING LUGS
      mm.unwinding === 'Clockwise' ? 'Clockwise' : '', // UNWINDING
      mm.cast_kont || '', // CAST KONT. (CM)
      mm.helix_kont || '', // HELIX KONT. (CM)
      mm.elongation || '', // ELONGATION (%) MIN
      mm.ic_cap, // COIL DIMENSIONS (CM) ID
      mm.dis_cap, // COIL DIMENSIONS (CM) OD
      mm.kg, // COIL WEIGHT (KG)
      '', // COIL WEIGHT (KG) MIN
      mm.kg, // COIL WEIGHT (KG) MAX
      generateToleransAciklamaForBatch(mm.tolerans_plus, mm.tolerans_minus), // Tolerans Açıklama
      mm.product_type, // Ürün Tipi (TAVLI/BALYA)
      mm.yaglama_tipi || '' // Yağlama Tipi (Püskürtme/Normal for BALYA, empty for TAVLI)
    ];
  };

  const generateMmTtStokKartiData = (sequence = '00') => {
    const cap = parseFloat(mmData.cap);
    const capFormatted = Math.round(cap * 100).toString().padStart(4, '0');
    // ✅ FIXED: Use TT.BAG/TT.BALYA format based on product_type
    const productPrefix = mmData.product_type === 'TAVLI' ? 'TT.BAG' : 'TT.BALYA';
    const stokKodu = `${productPrefix}.${capFormatted}.${sequence}`;
    const { adjustedPlus, adjustedMinus, adjustedPlusFormatted, adjustedMinusFormatted } = getAdjustedToleranceValues();


    return [
      stokKodu, // Stok Kodu
      generateStokAdiForExcel(), // Stok Adı
      'MM', // Grup Kodu
      mmData.product_type === 'TAVLI' ? 'TT.BAG' : 'TT.BALYA', // ✅ FIXED: Kod-1 (TT.BAG or TT.BALYA)
      mmData.product_type, // ✅ FIXED: Kod-2 now shows product type (TAVLI/BALYA)
      '', // Cari/Satıcı Kodu
      'M', // Türü
      stokKodu, // Mamul Grup
      generateEnglishNameForExcel(), // İngilizce İsim
      '', // Satıcı İsmi
      '26', // Muh. Detay
      '36', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1 (Excel formatı - keep as 1000)
      '0.001', // Çevrim Değeri-1
      '', // Ölçü Br-3
      '1', // Çevrim Pay-2
      '1', // Çevrim Payda-2
      '1', // Çevrim Değeri-2
      cap.toFixed(2).replace('.', ','), // Çap (VIRGÜL for Excel)
      mmData.kaplama, // Kaplama
      mmData.min_mukavemet, // Min Mukavemet
      mmData.max_mukavemet, // Max Mukavemet
      mmData.kg, // KG
      mmData.ic_cap, // İç Çap
      mmData.dis_cap, // Dış Çap
      '', // Çap2
      mmData.shrink, // Shrink
      formatDecimalForExcel(adjustedPlus), // Tolerans(+) (adjusted value with sign)
      formatDecimalForExcel(adjustedMinus), // Tolerans(-) (adjusted value with sign)
      '', // Ebat(En)
      '', // Göz Aralığı
      '', // Ebat(Boy)
      '', // Hasır Tipi
      '', // Özel Saha 8 (Alf.)
      '0', // Alış Fiyatı
      '1', // Fiyat Birimi
      '0', // Satış Fiyatı-1
      '0', // Satış Fiyatı-2
      '0', // Satış Fiyatı-3
      '0', // Satış Fiyatı-4
      '1', // Satış Tipi
      '0', // Döviz Alış
      '0', // Döviz Maliyeti
      '0', // Döviz Satış Fiyatı
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Döv.Tutar
      '0', // Döv.Tipi
      '0', // Bekleme Süresi
      '0', // Temin Süresi
      '0', // Birim Ağırlık
      '0', // Nakliye Tutar
      '20', // Satış KDV Oranı
      '20', // Alış KDV Oranı
      'D', // Stok Türü
      '', // Mali Grup Kodu
      '', // Barkod 1
      '', // Barkod 2
      '', // Barkod 3
      '', // Kod-3
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapılandır
      'H', // Süper Reçete Kullanılsın
      '', // Bağlı Stok Kodu
      '', // Yapılandırma Kodu
      '', // Yap. Açıklama
      '2', // Alış Döviz Tipi
      getGumrukTarifeKodu(), // Gümrük Tarife Kodu
      '', // Dağıtıcı Kodu
      '052', // Menşei
      mmData.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli', // METARIAL
      cap.toFixed(2).replace('.', ','), // DIA (MM) - COMMA for Excel
      formatDecimalForExcel(adjustedPlus), // DIA TOL (MM) + (adjusted value matching Turkish tolerans)
      formatDecimalForExcel(adjustedMinus), // DIA TOL (MM) - (adjusted value matching Turkish tolerans)
      mmData.kaplama, // ZING COATING (GR/M2)
      mmData.min_mukavemet, // TENSILE ST. (MPA) MIN
      mmData.max_mukavemet, // TENSILE ST. (MPA) MAX
      '+', // WAX
      '+', // LIFTING LUGS
      mmData.unwinding === 'Clockwise' ? 'Clockwise' : '', // UNWINDING
      mmData.cast_kont || '', // CAST KONT. (CM)
      mmData.helix_kont || '', // HELIX KONT. (CM)
      mmData.elongation || '', // ELONGATION (%) MIN
      mmData.ic_cap, // COIL DIMENSIONS (CM) ID
      mmData.dis_cap, // COIL DIMENSIONS (CM) OD
      mmData.kg, // COIL WEIGHT (KG)
      '', // COIL WEIGHT (KG) MIN
      mmData.kg, // COIL WEIGHT (KG) MAX - Copy the same value from COIL WEIGHT
      getToleransAciklama() // Tolerans Açıklama
    ];
  };

  // ===================================================================
  // INTERMEDIATE PRODUCT STOK KARTI DATA GENERATION FUNCTIONS
  // ===================================================================

  const generateYmTtStokKartiData = (ymTt) => {
    const cap = parseFloat(ymTt.cap || 0);

    return [
      ymTt.stok_kodu, // Stok Kodu
      ymTt.stok_adi || `Tavlı Tel ${parseFloat(cap.toFixed(2)).toString().replace('.', ',')} mm`, // Stok Adı
      'YM', // Grup Kodu
      'TT', // Kod-1
      ymTt.kod_2 || '', // Kod-2
      '', // Cari/Satıcı Kodu
      'M', // Türü
      ymTt.stok_kodu, // Mamul Grup
      ymTt.ingilizce_isim || `Annealed Wire ${cap.toFixed(2)} mm`, // İngilizce İsim
      '', // Satıcı İsmi
      '28', // Muh. Detay
      '35', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1
      '0.001', // Çevrim Değeri-1
      '', // Ölçü Br-3
      '1', // Çevrim Pay-2
      '1', // Çevrim Payda-2
      '1', // Çevrim Değeri-2
      cap.toFixed(2).replace('.', ','), // Çap
      '', // Kaplama
      '', // Min Mukavemet
      '', // Max Mukavemet
      '', // KG
      '', // İç Çap
      '', // Dış Çap
      '', // Çap2
      '', // Shrink
      '', // Tolerans(+)
      '', // Tolerans(-)
      '', // Ebat(En)
      '', // Göz Aralığı
      '', // Ebat(Boy)
      '', // Hasır Tipi
      '', // Özel Saha 8 (Alf.)
      '0', // Alış Fiyatı
      '1', // Fiyat Birimi
      '0', // Satış Fiyatı-1
      '0', // Satış Fiyatı-2
      '0', // Satış Fiyatı-3
      '0', // Satış Fiyatı-4
      '1', // Satış Tipi
      '0', // Döviz Alış
      '0', // Döviz Maliyeti
      '0', // Döviz Satış Fiyatı
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Döv.Tutar
      '0', // Döv.Tipi
      '0', // Bekleme Süresi
      '0', // Temin Süresi
      '0', // Birim Ağırlık
      '0', // Nakliye Tutar
      '20', // Satış KDV Oranı
      '20', // Alış KDV Oranı
      'D', // Stok Türü
      '', // Mali Grup Kodu
      '', // Barkod 1
      '', // Barkod 2
      '', // Barkod 3
      '', // Kod-3
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapılandır
      'H', // Süper Reçete Kullanılsın
      '', // Bağlı Stok Kodu
      '', // Yapılandırma Kodu
      '', // Yap. Açıklama
      '2', // Alış Döviz Tipi
      '', // Gümrük Tarife Kodu
      '', // Dağıtıcı Kodu
      '052', // Menşei
      'Tavlı Tel', // METARIAL
      cap.toFixed(2).replace('.', ','), // DIA (MM)
      '', // DIA TOL (MM) +
      '', // DIA TOL (MM) -
      '', // ZING COATING (GR/M2)
      '', // TENSILE ST. (MPA) MIN
      '', // TENSILE ST. (MPA) MAX
      '', // WAX
      '', // LIFTING LUGS
      '', // UNWINDING
      '', // Tolerans Açıklama
    ];
  };

  const generateYmStpStokKartiData = (ymStp) => {
    const cap = parseFloat(ymStp.cap || 0);

    return [
      ymStp.stok_kodu, // Stok Kodu
      ymStp.stok_adi || `Preslenmiş Siyah Tel ${cap.toFixed(2).replace('.', ',')} mm`, // Stok Adı
      'YM', // Grup Kodu
      'STP', // Kod-1
      ymStp.kod_2 || '', // Kod-2
      '', // Cari/Satıcı Kodu
      'M', // Türü
      ymStp.stok_kodu, // Mamul Grup
      ymStp.ingilizce_isim || `Pressed Black Wire ${cap.toFixed(2)} mm`, // İngilizce İsim
      '', // Satıcı İsmi
      '28', // Muh. Detay
      '35', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1
      '0.001', // Çevrim Değeri-1
      '', // Ölçü Br-3
      '1', // Çevrim Pay-2
      '1', // Çevrim Payda-2
      '1', // Çevrim Değeri-2
      cap.toFixed(2).replace('.', ','), // Çap
      '', // Kaplama
      '', // Min Mukavemet
      '', // Max Mukavemet
      '', // KG
      '', // İç Çap
      '', // Dış Çap
      '', // Çap2
      '', // Shrink
      '', // Tolerans(+)
      '', // Tolerans(-)
      '', // Ebat(En)
      '', // Göz Aralığı
      '', // Ebat(Boy)
      '', // Hasır Tipi
      '', // Özel Saha 8 (Alf.)
      '0', // Alış Fiyatı
      '1', // Fiyat Birimi
      '0', // Satış Fiyatı-1
      '0', // Satış Fiyatı-2
      '0', // Satış Fiyatı-3
      '0', // Satış Fiyatı-4
      '1', // Satış Tipi
      '0', // Döviz Alış
      '0', // Döviz Maliyeti
      '0', // Döviz Satış Fiyatı
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Döv.Tutar
      '0', // Döv.Tipi
      '0', // Bekleme Süresi
      '0', // Temin Süresi
      '0', // Birim Ağırlık
      '0', // Nakliye Tutar
      '20', // Satış KDV Oranı
      '20', // Alış KDV Oranı
      'D', // Stok Türü
      '', // Mali Grup Kodu
      '', // Barkod 1
      '', // Barkod 2
      '', // Barkod 3
      '', // Kod-3
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapılandır
      'H', // Süper Reçete Kullanılsın
      '', // Bağlı Stok Kodu
      '', // Yapılandırma Kodu
      '', // Yap. Açıklama
      '2', // Alış Döviz Tipi
      '', // Gümrük Tarife Kodu
      '', // Dağıtıcı Kodu
      '052', // Menşei
      'Preslenmiş Siyah Tel', // METARIAL
      cap.toFixed(2).replace('.', ','), // DIA (MM)
      '', // DIA TOL (MM) +
      '', // DIA TOL (MM) -
      '', // ZING COATING (GR/M2)
      '', // TENSILE ST. (MPA) MIN
      '', // TENSILE ST. (MPA) MAX
      '', // WAX
      '', // LIFTING LUGS
      '', // UNWINDING
      '', // Tolerans Açıklama
    ];
  };

  // Batch version that takes YM TT data as parameter

  const generateYmStStokKartiData = (ymSt) => {
    return [
      ymSt.stok_kodu, // Stok Kodu
      ymSt.stok_adi, // Stok Adı
      'YM', // Grup Kodu
      'ST', // Kod-1
      '', // Kod-2
      '', // Kod-3
      '20', // Satış KDV Oranı
      '28', // Muh.Detay
      '35', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1 (Excel formatı - keep as 1000)
      '0.001', // Çevrim Değeri-1
      '', // Ölçü Br-3
      '1', // Çevrim Pay-2
      '1', // Çevrim Payda-2
      '1', // Çevrim Değeri-2
      '0', // Alış Fiyatı
      '1', // Fiyat Birimi
      '0', // Satış Fiyatı-1
      '0', // Satış Fiyatı-2
      '0', // Satış Fiyatı-3
      '0', // Satış Fiyatı-4
      '1', // Döviz Tip
      '0', // Döviz Alış
      '0', // Döviz Maliyeti
      '0', // Döviz Satış Fiyatı
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Döv.Tutar
      '0', // Döv.Tipi
      '0', // Alış Döviz Tipi
      '0', // Bekleme Süresi
      '0', // Temin Süresi
      '0', // Birim Ağırlık
      '0', // Nakliye Tutar
      'D', // Stok Türü
      '', // Mali Grup Kodu
      '', // İngilizce İsim
      '1', // Özel Saha 1 (Say.)
      '0', // Özel Saha 2 (Say.)
      '0', // Özel Saha 3 (Say.)
      '0', // Özel Saha 4 (Say.)
      '0', // Özel Saha 5 (Say.)
      '0', // Özel Saha 6 (Say.)
      '0', // Özel Saha 7 (Say.)
      '0', // Özel Saha 8 (Say.)
      '', // Özel Saha 1 (Alf.)
      '', // Özel Saha 2 (Alf.)
      '', // Özel Saha 3 (Alf.)
      '', // Özel Saha 4 (Alf.)
      '', // Özel Saha 5 (Alf.)
      '', // Özel Saha 6 (Alf.)
      '', // Özel Saha 7 (Alf.)
      '', // Özel Saha 8 (Alf.)
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapılandır
      'H', // Süper Reçete Kullanılsın
      '', // Bağlı Stok Kodu
      '', // Yapılandırma Kodu
      '' // Yap. Açıklama
    ];
  };

  // Reçete satır oluşturma fonksiyonları

  const generateMmTtReceteRow = (bilesenKodu, miktar, siraNo, sequence = '00') => {
    const capFormatted = Math.round(parseFloat(mmData.cap) * 100).toString().padStart(4, '0');

    // Map bilesen code to new standardized code
    const mappedBilesenKodu = mapBilesenKoduForExcel(bilesenKodu);

    // Determine if this is an Operation row
    const isOperation = bilesenKodu === 'GTPKT01';

    return [
      generateMmStokKodu(mmData.product_type, mmData.cap, sequence), // Mamul Kodu - TT.BAG or TT.BALYA based on product type
      '1', // Reçete Top.
      '0,00040', // Fire Oranı (%) - 5 decimals with comma for MM TT
      '', // Oto.Reç.
      getOlcuBr(bilesenKodu), // Ölçü Br. - use original code for logic
      siraNo, // Sıra No - incremental as requested
      isOperation ? 'O' : 'B', // GTPKT01 should be marked as O (Operasyon) per Excel format
      mappedBilesenKodu, // Bileşen Kodu - use mapped code for Excel
      '1', // Ölçü Br. - Bileşen
      formatDecimalForReceteExcel(miktar), // Miktar - Always apply 5 decimals for all rows
      getReceteAciklama(bilesenKodu), // Açıklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // İstasyon Kodu
      '', // Hazırlık Süresi
      isOperation ? formatDecimalForReceteExcel(miktar) : '', // Üretim Süresi - 5 decimals ONLY for O rows
      isOperation ? 'E' : '', // Ü.A.Dahil Edilsin - only 'E' for Operasyon
      isOperation ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Öncelik
      '', // Planlama Oranı
      '', // Alternatif Politika - D.A.Transfer Fişi
      '', // Alternatif Politika - Ambar Ç. Fişi
      '', // Alternatif Politika - Üretim S.Kaydı
      '', // Alternatif Politika - MRP
      '' // İÇ/DIŞ
    ];
  };



  const generateYmStReceteRow = (bilesenKodu, miktar, siraNo, ymSt) => {
    // Determine if this is an Operation row
    const isOperation = ['TLC01', 'COTLC01'].includes(bilesenKodu);
    
    return [
      ymSt.stok_kodu || '', // Mamul Kodu
      '1', // Reçete Top.
      '', // Fire Oranı (%)
      '', // Oto.Reç.
      getOlcuBr(bilesenKodu), // Ölçü Br.
      siraNo, // Sıra No - incremental as requested
      bilesenKodu.includes('FLM.') ? 'B' : (isOperation ? 'O' : 'B'), // FLM kodu her zaman B (Bileşen) olmalı, sadece TLC01 O (Operasyon) olmalı
      bilesenKodu, // Bileşen Kodu
      '1', // Ölçü Br. - Bileşen
      formatDecimalForReceteExcel(miktar), // Miktar - Always apply 5 decimals for all rows
      getReceteAciklama(bilesenKodu), // Açıklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // İstasyon Kodu
      '', // Hazırlık Süresi
      isOperation ? formatDecimalForReceteExcel(miktar) : '', // Üretim Süresi - 5 decimals ONLY for O rows
      isOperation ? 'E' : '', // Ü.A.Dahil Edilsin - only 'E' for Operasyon
      isOperation ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Öncelik
      '', // Planlama Oranı
      '', // Alternatif Politika - D.A.Transfer Fişi
      '', // Alternatif Politika - Ambar Ç. Fişi
      '', // Alternatif Politika - Üretim S.Kaydı
      '', // Alternatif Politika - MRP
      '' // İÇ/DIŞ
    ];
  };

  // Map old bilesen codes to new standardized codes for Excel export
  const mapBilesenKoduForExcel = (bilesenKodu) => {
    const bilesenMapping = {
      // MM TT bilesen mappings
      'AMB.APEX CEMBER 38X080': 'SM-AMB-000017',
      'AMB.PLASTİK.ÇEMBER': 'SM-AMB-000024', // ✅ ADDED: Plastik Çember for MM products
      'AMB.STREÇ': 'SM-AMB-000025', // ✅ ADDED: Streç for MM products
      'AMB.PALET': 'SM-AMB-000026', // ✅ ADDED: Palet for MM products
      'AMB.TOKA.SIGNODE.114P. DKP': 'SM-AMB-000018',
      'SM.7MMHALKA': 'SM-AMB-000023',
      'AMB.ÇEM.KARTON.GAL': 'SM-AMB-000019',
      'AMB.SHRİNK.200*140CM': 'SM-AMB-000027',
      'AMB.SHRİNK.200*160CM': 'SM-AMB-000028',
      'AMB.SHRİNK.200*190CM': 'SM-AMB-000030',
      // ✅ REMOVED: 'SM.DESİ.PAK': 'SM-KMY-000102' - not in tavlı/balya specification
      // YM TT bilesen mappings (tavlı/balya-specific)
      '150 03': 'HM-000001',
      'SM.HİDROLİK.ASİT': 'SM-KMY-000096'
    };

    return bilesenMapping[bilesenKodu] || bilesenKodu;
  };

  // Batch Excel için MM TT recipe row generator
  const generateMmTtReceteRowForBatch = (bilesenKodu, miktar, siraNo, sequence, mmStokKodu) => {
    // FIXED: MM TT recipe should use MM TT stok kodu, not YM GT format
    // The mmStokKodu is already in correct format (GT.PAD.0087.00)

    // Map bilesen code to new standardized code
    const mappedBilesenKodu = mapBilesenKoduForExcel(bilesenKodu);

    // Determine if this is an Operation row
    const isOperation = bilesenKodu === 'GTPKT01';

    return [
      mmStokKodu, // Mamul Kodu - Use MM TT kodu directly (GT.PAD.0087.00)
      '1', // Reçete Top.
      '0,00040', // Fire Oranı (%) - 5 decimals with comma for MM TT
      '', // Oto.Reç.
      getOlcuBr(bilesenKodu), // Ölçü Br. - use original code for logic
      siraNo, // Sıra No - incremental
      bilesenKodu.includes('FLM.') ? 'B' : (isOperation ? 'O' : 'B'), // Bileşen/Operasyon
      mappedBilesenKodu, // Bileşen Kodu - use mapped code for Excel
      '1', // Ölçü Br. - Bileşen
      formatDecimalForReceteExcel(miktar), // Miktar - Always apply 5 decimals for all rows
      getReceteAciklama(bilesenKodu), // Açıklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // İstasyon Kodu
      '', // Hazırlık Süresi
      isOperation ? formatDecimalForReceteExcel(miktar) : '', // Üretim Süresi - 5 decimals ONLY for O rows
      isOperation ? 'E' : '', // Ü.A.Dahil Edilsin - only 'E' for Operasyon
      isOperation ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Öncelik
      '', // Planlama Oranı
      '', // Alternatif Politika - D.A.Transfer Fişi
      '', // Alternatif Politika - Ambar Ç. Fişi
      '', // Alternatif Politika - Üretim S.Kaydı
      '', // Alternatif Politika - MRP
      '' // İÇ/DIŞ
    ];
  };

  // Batch Excel için Tavlı/Balya Teli recipe row generator (TT MM)
  const generateTavliBalyaMmReceteRowForBatch = (bilesenKodu, miktar, siraNo, sequence, mmStokKodu) => {
    // Map bilesen code to new standardized code
    const mappedBilesenKodu = mapBilesenKoduForExcel(bilesenKodu);

    // Determine if this is an Operation row (TVPKT01 for TAVLI, BAL01 for BALYA)
    const isOperation = bilesenKodu === 'TVPKT01' || bilesenKodu === 'BAL01';

    return [
      mmStokKodu, // Mamul Kodu - Use TT MM kodu directly (TT.BAG.0340.00 or TT.BALYA.0340.00)
      '1', // Reçete Top.
      '0,00040', // Fire Oranı (%) - 5 decimals with comma for Tavlı/Balya (same as Galvaniz)
      '', // Oto.Reç.
      getOlcuBr(bilesenKodu), // Ölçü Br. - use original code for logic
      siraNo, // Sıra No - incremental
      bilesenKodu.includes('FLM.') ? 'B' : (isOperation ? 'O' : 'B'), // Bileşen/Operasyon
      mappedBilesenKodu, // Bileşen Kodu - use mapped code for Excel
      '1', // Ölçü Br. - Bileşen
      formatDecimalForReceteExcel(miktar), // Miktar - Always apply 5 decimals for all rows
      getReceteAciklama(bilesenKodu), // Açıklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // İstasyon Kodu
      '', // Hazırlık Süresi
      isOperation ? formatDecimalForReceteExcel(miktar) : '', // Üretim Süresi - 5 decimals ONLY for O rows
      isOperation ? 'E' : '', // Ü.A.Dahil Edilsin - only 'E' for Operasyon
      isOperation ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Öncelik
      '', // Planlama Oranı
      '', // Alternatif Politika - D.A.Transfer Fişi
      '', // Alternatif Politika - Ambar Ç. Fişi
      '', // Alternatif Politika - Üretim S.Kaydı
      '', // Alternatif Politika - MRP
      '' // İÇ/DIŞ
    ];
  };

  // ===================================================================
  // INTERMEDIATE PRODUCT RECIPE ROW GENERATION FUNCTIONS
  // ===================================================================

  const generateYmTtReceteRowForBatch = (bilesenKodu, miktar, siraNo, ymTtStokKodu, operasyonBilesen) => {
    const mappedBilesenKodu = mapBilesenKoduForExcel(bilesenKodu);
    const isOperation = operasyonBilesen === 'O' || bilesenKodu === 'TAV01';

    return [
      ymTtStokKodu, // Mamul Kodu
      '1', // Reçete Top.
      '0', // Fire Oranı - NO FIRE for Tavlı
      '', // Oto.Reç.
      getOlcuBr(bilesenKodu), // Ölçü Br.
      siraNo, // Sıra No
      isOperation ? 'O' : 'B', // Bileşen/Operasyon
      mappedBilesenKodu, // Bileşen Kodu
      '1', // Ölçü Br. - Bileşen
      formatDecimalForReceteExcel(miktar), // Miktar
      getReceteAciklama(bilesenKodu), // Açıklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // İstasyon Kodu
      '', // Hazırlık Süresi
      isOperation ? formatDecimalForReceteExcel(miktar) : '', // Üretim Süresi
      isOperation ? 'E' : '', // Ü.A.Dahil Edilsin
      isOperation ? 'E' : '', // Son Operasyon
      '', // Öncelik
      '', // Planlama Oranı
      '', // Alternatif Politika - D.A.Transfer Fişi
      '', // Alternatif Politika - Ambar Ç. Fişi
      '', // Alternatif Politika - Üretim S.Kaydı
      '', // Alternatif Politika - MRP
      '' // İÇ/DIŞ
    ];
  };

  const generateYmStpReceteRowForBatch = (bilesenKodu, miktar, siraNo, ymStpStokKodu, operasyonBilesen) => {
    const mappedBilesenKodu = mapBilesenKoduForExcel(bilesenKodu);
    const isOperation = operasyonBilesen === 'O' || bilesenKodu === 'STPRS01';

    return [
      ymStpStokKodu, // Mamul Kodu
      '1', // Reçete Top.
      '0', // Fire Oranı - NO FIRE for Preslenmiş
      '', // Oto.Reç.
      getOlcuBr(bilesenKodu), // Ölçü Br.
      siraNo, // Sıra No
      isOperation ? 'O' : 'B', // Bileşen/Operasyon
      mappedBilesenKodu, // Bileşen Kodu
      '1', // Ölçü Br. - Bileşen
      formatDecimalForReceteExcel(miktar), // Miktar
      getReceteAciklama(bilesenKodu), // Açıklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // İstasyon Kodu
      '', // Hazırlık Süresi
      isOperation ? formatDecimalForReceteExcel(miktar) : '', // Üretim Süresi
      isOperation ? 'E' : '', // Ü.A.Dahil Edilsin
      isOperation ? 'E' : '', // Son Operasyon
      '', // Öncelik
      '', // Planlama Oranı
      '', // Alternatif Politika - D.A.Transfer Fişi
      '', // Alternatif Politika - Ambar Ç. Fişi
      '', // Alternatif Politika - Üretim S.Kaydı
      '', // Alternatif Politika - MRP
      '' // İÇ/DIŞ
    ];
  };

  // Batch Excel için YM TT recipe row generator

  // Batch Excel için YM ST recipe row generator (stok_kodu ve priority parametreli)
  const generateYmStReceteRowForBatch = (bilesenKodu, miktar, siraNo, stokKodu, priority = '') => {
    // Determine if this is an Operation row
    const isOperation = ['TLC01', 'COTLC01'].includes(bilesenKodu);

    return [
      stokKodu, // Mamul Kodu - batch'de parametre olarak verilen stok kodu
      '1', // Reçete Top.
      '', // Fire Oranı (%)
      '', // Oto.Reç.
      getOlcuBr(bilesenKodu), // Ölçü Br.
      siraNo, // Sıra No - incremental as requested
      bilesenKodu.includes('FLM.') ? 'B' : (isOperation ? 'O' : 'B'), // FLM kodu her zaman B (Bileşen) olmalı, sadece TLC01 O (Operasyon) olmalı
      bilesenKodu, // Bileşen Kodu
      '1', // Ölçü Br. - Bileşen
      formatDecimalForReceteExcel(miktar), // Miktar - Always apply 5 decimals for all rows
      getReceteAciklama(bilesenKodu), // Açıklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // İstasyon Kodu
      '', // Hazırlık Süresi
      isOperation ? formatDecimalForReceteExcel(miktar) : '', // Üretim Süresi - 5 decimals ONLY for O rows
      isOperation ? 'E' : '', // Ü.A.Dahil Edilsin - only 'E' for Operasyon
      isOperation ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      priority, // Matris - 0=Ana, 1=ALT_1, 2=ALT_2
      '', // Planlama Oranı
      '', // Alternatif Politika - D.A.Transfer Fişi
      '', // Alternatif Politika - Ambar Ç. Fişi
      '', // Alternatif Politika - Üretim S.Kaydı
      '', // Alternatif Politika - MRP
      '' // İÇ/DIŞ
    ];
  };

  // String oluşturma fonksiyonları - COMMA Excel formatında
  // Database version - uses POINT format
  const generateStokAdi = () => {
    console.log('📝 === generateStokAdi CALLED ===');
    console.log('📝 mmData for stok_adi:', {
      cap: mmData.cap,
      product_type: mmData.product_type,
      yaglama_tipi: mmData.yaglama_tipi,
      min_mukavemet: mmData.min_mukavemet,
      max_mukavemet: mmData.max_mukavemet,
      ic_cap: mmData.ic_cap,
      dis_cap: mmData.dis_cap,
      kg: mmData.kg,
      cast_kont: mmData.cast_kont
    });
    console.log('📝 paketlemeSecenekleri:', paketlemeSecenekleri);

    const cap = parseFloat(mmData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    console.log('📝 Tolerance values:', { adjustedPlus, adjustedMinus });

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmData.cast_kont && mmData.cast_kont.trim() !== ''
      ? `/${mmData.cast_kont}`
      : '';

    // Format with proper signs (negative sign automatic from toFixed, add + for positive)
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2);
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2);
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    console.log('📝 Formatted tolerance text:', toleranceText);

    // Base stok adı - PRODUCT-SPECIFIC NAMES
    const productName = mmData.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli';

    console.log('📝 Product name:', productName);

    // Parse values to remove trailing zeros - use parseFloat to strip .00
    const capDisplay = parseFloat(cap.toFixed(2)); // Format then parse to remove trailing zeros
    const minMukavemet = parseFloat(mmData.min_mukavemet) || 0;
    const maxMukavemet = parseFloat(mmData.max_mukavemet) || 0;
    const icCap = parseFloat(mmData.ic_cap) || 45;
    const disCap = parseFloat(mmData.dis_cap) || 75;
    const kg = parseFloat(mmData.kg) || 0;

    let stokAdi = `${productName} ${capDisplay} mm ${toleranceText} ${minMukavemet}-${maxMukavemet} MPa ID:${icCap} cm OD:${disCap} cm ${kg}${bagAmount} kg`;

    console.log('📝 Base stok_adi before packaging:', stokAdi);

    // ✅ FIXED: Yaglama added with packaging suffixes (genel4.csv format)
    // Yagsiz (no oil), PSK (Püskürtme), DLD (Daldırma)
    const suffixes = [];

    // Add yaglama code first
    if (!mmData.yaglama_tipi || mmData.yaglama_tipi === '' || mmData.yaglama_tipi === 'Tavlısız') {
      suffixes.push('Yagsiz');
    } else if (mmData.yaglama_tipi === 'Püskürtme') {
      suffixes.push('PSK');
    } else if (mmData.yaglama_tipi === 'Daldırma') {
      suffixes.push('DLD');
    }

    // Then add packaging options
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.karton) suffixes.push('Krtn');

    console.log('📝 Packaging suffixes:', suffixes);

    if (suffixes.length > 0) {
      stokAdi += '-' + suffixes.join('-');
    }

    console.log('📝 FINAL stok_adi:', stokAdi);
    console.log('📝 FINAL stok_adi length:', stokAdi.length);

    // Use point for database storage - NO comma replacement for database
    return stokAdi;
  };

  // Excel version - uses COMMA format  
  const generateStokAdiForExcel = () => {
    const cap = parseFloat(mmData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmData.cast_kont && mmData.cast_kont.trim() !== ''
      ? `/${mmData.cast_kont}`
      : '';

    // Format with proper signs and comma for Excel
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + parseFloat(adjustedMinus.toFixed(2)).toString().replace('.', ',');
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + parseFloat(adjustedPlus.toFixed(2)).toString().replace('.', ',');
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base stok adı - PRODUCT-SPECIFIC NAMES (Excel format with comma)
    const productName = mmData.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli';
    let stokAdi = `${productName} ${parseFloat(cap.toFixed(2)).toString().replace('.', ',')} mm ${toleranceText} ${parseFloat(mmData.min_mukavemet) || '0'}-${parseFloat(mmData.max_mukavemet) || '0'} MPa ID:${parseFloat(mmData.ic_cap) || '45'} cm OD:${parseFloat(mmData.dis_cap) || '75'} cm ${parseFloat(mmData.kg) || '0'}${bagAmount} kg`;

    // ✅ FIXED: Add yaglama and packaging suffixes (NOT in base name!)
    const suffixes = [];

    // Add yaglama code FIRST (per genel4.csv format)
    if (!mmData.yaglama_tipi || mmData.yaglama_tipi === '' || mmData.yaglama_tipi === 'Tavlısız') {
      suffixes.push('Yagsiz');
    } else if (mmData.yaglama_tipi === 'Püskürtme') {
      suffixes.push('PSK');
    } else if (mmData.yaglama_tipi === 'Daldırma') {
      suffixes.push('DLD');
    }

    // Then add packaging suffixes
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.karton) suffixes.push('Krtn');

    if (suffixes.length > 0) {
      stokAdi += '-' + suffixes.join('-');
    }

    // Use comma for Excel display
    return stokAdi;
  };


  // Database version - uses POINT format
  const generateEnglishName = () => {
    const cap = parseFloat(mmData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmData.cast_kont && mmData.cast_kont.trim() !== ''
      ? `/${mmData.cast_kont}`
      : '';

    // Format with proper signs (negative sign automatic from toFixed, add + for positive)
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + parseFloat(adjustedMinus.toFixed(2));
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + parseFloat(adjustedPlus.toFixed(2));
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base english name - PRODUCT-SPECIFIC NAMES
    const productNameEn = mmData.product_type === 'TAVLI' ? 'Annealed Wire' : 'Bale Wire';
    let englishName = `${productNameEn} ${parseFloat(cap.toFixed(2))} mm ${toleranceText} ${parseFloat(mmData.min_mukavemet) || '0'}-${parseFloat(mmData.max_mukavemet) || '0'} MPa ID:${parseFloat(mmData.ic_cap) || '45'} cm OD:${parseFloat(mmData.dis_cap) || '75'} cm ${parseFloat(mmData.kg) || '0'}${bagAmount} kg`;

    // ✅ FIXED: Add yaglama and packaging suffixes
    const suffixes = [];

    // Add yaglama code FIRST
    if (!mmData.yaglama_tipi || mmData.yaglama_tipi === '' || mmData.yaglama_tipi === 'Tavlısız') {
      suffixes.push('Yagsiz');
    } else if (mmData.yaglama_tipi === 'Püskürtme') {
      suffixes.push('PSK');
    } else if (mmData.yaglama_tipi === 'Daldırma') {
      suffixes.push('DLD');
    }

    // Then add packaging suffixes
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.karton) suffixes.push('Krtn');

    if (suffixes.length > 0) {
      englishName += '-' + suffixes.join('-');
    }

    // Use points for database storage
    return englishName;
  };

  // Excel version - uses COMMA format
  const generateEnglishNameForExcel = () => {
    const cap = parseFloat(mmData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmData.cast_kont && mmData.cast_kont.trim() !== ''
      ? `/${mmData.cast_kont}`
      : '';

    // Format with proper signs and comma for Excel
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + parseFloat(adjustedMinus.toFixed(2)).toString().replace('.', ',');
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + parseFloat(adjustedPlus.toFixed(2)).toString().replace('.', ',');
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base english name - PRODUCT-SPECIFIC NAMES (Excel format with comma)
    const productNameEn = mmData.product_type === 'TAVLI' ? 'Annealed Wire' : 'Bale Wire';
    let englishName = `${productNameEn} ${parseFloat(cap.toFixed(2)).toString().replace('.', ',')} mm ${toleranceText} ${parseFloat(mmData.min_mukavemet) || '0'}-${parseFloat(mmData.max_mukavemet) || '0'} MPa ID:${parseFloat(mmData.ic_cap) || '45'} cm OD:${parseFloat(mmData.dis_cap) || '75'} cm ${parseFloat(mmData.kg) || '0'}${bagAmount} kg`;

    // ✅ FIXED: Add yaglama and packaging suffixes
    const suffixes = [];

    // Add yaglama code FIRST
    if (!mmData.yaglama_tipi || mmData.yaglama_tipi === '' || mmData.yaglama_tipi === 'Tavlısız') {
      suffixes.push('Yagsiz');
    } else if (mmData.yaglama_tipi === 'Püskürtme') {
      suffixes.push('PSK');
    } else if (mmData.yaglama_tipi === 'Daldırma') {
      suffixes.push('DLD');
    }

    // Then add packaging suffixes
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.karton) suffixes.push('Krtn');
    
    if (suffixes.length > 0) {
      englishName += '-' + suffixes.join('-');
    }
    
    // Use comma for Excel display
    return englishName;
  };

  // Talep onaylama
  const handleApproveRequest = async () => {
    if (!selectedRequest || !databaseIds.mmIds.length) {
      toast.error('Onaylamak için önce veritabanına kaydedin');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'approved',
          processed_by: user.username,
          processed_at: new Date().toISOString(),
          mm_gt_id: databaseIds.mmIds[0] // İlk MM TT ID'yi kullan
        })
      });
      
      if (response && response.ok) {
        // Add to session approvals - avoid duplicates
        setSessionApprovals(prev => {
          if (!prev.includes(selectedRequest.id)) {
            console.log('Adding to session approvals:', selectedRequest.id, 'Current total:', prev.length + 1);
            return [...prev, selectedRequest.id];
          }
          console.log('Request already in session approvals:', selectedRequest.id);
          return prev;
        });
        
        toast.success('Talep başarıyla onaylandı');
        fetchRequests();
        setSelectedRequest(null);
      } else {
        throw new Error('Talep onaylanamadı');
      }
    } catch (error) {
      console.error('Talep onaylama hatası:', error);
      toast.error('Talep onaylama hatası: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Talep reddetme
  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    
    const reason = prompt('Red nedeni:');
    if (!reason) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
          processed_by: user.username,
          processed_at: new Date().toISOString(),
          rejection_reason: reason
        })
      });
      
      if (response && response.ok) {
        toast.success('Talep başarıyla reddedildi');
        fetchRequests();
        setSelectedRequest(null);
      } else {
        throw new Error('Talep reddedilemedi');
      }
    } catch (error) {
      console.error('Talep reddetme hatası:', error);
      toast.error('Talep reddetme hatası: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Shrink miktarı ve tipi ile ilgili yardımcı fonksiyonlar
  const handleShrinkChange = (recipeIndex, newShrinkCode) => {
    const currentShrinkAmount = calculateShrinkAmount(parseFloat(mmData.kg) || 0);
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    // Mevcut reçeteleri güncelle
    updateRecipeValue('mm', recipeIndex, newShrinkCode, currentShrinkAmount);
    
    // Eski shrink kodlarını temizle (eğer farklıysa)
    const shrinkTypes = ['AMB.SHRİNK.200*140CM', 'AMB.SHRİNK.200*160CM', 'AMB.SHRİNK.200*190CM'];
    shrinkTypes.forEach(shrinkType => {
      if (shrinkType !== newShrinkCode) {
        updateRecipeValue('mm', recipeIndex, shrinkType, 0);
      }
    });
    
    // Update dropdown state to reflect the change
    setActiveTabDropdownValues(prev => ({
      ...prev,
      shrinkType: newShrinkCode
    }));
  };

  return (
    <div className={`p-6 max-w-7xl mx-auto min-h-screen ${isViewingExistingProduct ? 'bg-yellow-50' : 'bg-gray-50'}`}>
      {/* Edit Mode Indicator */}
      {isViewingExistingProduct && (
        <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-r-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-sm font-medium text-yellow-800">
              Düzenleme Modu - Mevcut ürün: {selectedExistingMm?.stok_kodu || 'Bilinmiyor'}
            </p>
          </div>
        </div>
      )}
      
      {/* Ana Başlık ve Butonlar */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className={`w-8 h-8 ${isViewingExistingProduct ? 'bg-yellow-600' : 'bg-red-600'} rounded-lg flex items-center justify-center`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            Tavlı & Balya Tel Netsis Entegrasyonu {isViewingExistingProduct && '(Düzenleme)'}
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            {mmData.product_type === 'TAVLI'
              ? `Tavlı Tel${mmData.yaglama_tipi ? ` (${mmData.yaglama_tipi === 'Yagsiz' ? 'Yağsız' : mmData.yaglama_tipi === 'Normal' ? 'Normal Yağlı' : 'Püskürtme Yağlı'})` : ''} (Annealed Wire)`
              : mmData.product_type === 'BALYA'
                ? `Balya Teli${mmData.yaglama_tipi ? ` (${mmData.yaglama_tipi === 'Yagsiz' ? 'Yağsız' : mmData.yaglama_tipi === 'Normal' ? 'Normal Yağlı' : 'Püskürtme Yağlı'})` : ''} (Bale Wire)`
                : 'Ürün tipi seçiniz'}
          </p>
        </div>

        <div className="flex gap-3">
          {/* Product Type Selector */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                if (!selectedRequest) {
                  setMmData(prev => ({ ...prev, product_type: 'TAVLI', yaglama_tipi: '' }));
                }
              }}
              disabled={!!selectedRequest}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mmData.product_type === 'TAVLI'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              } ${selectedRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={selectedRequest ? 'Talep seçiliyken ürün tipi değiştirilemez' : ''}
            >
              Tavlı Tel
            </button>
            <button
              onClick={() => {
                if (!selectedRequest) {
                  setMmData(prev => ({ ...prev, product_type: 'BALYA' }));
                }
              }}
              disabled={!!selectedRequest}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mmData.product_type === 'BALYA'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200'
              } ${selectedRequest ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={selectedRequest ? 'Talep seçiliyken ürün tipi değiştirilemez' : ''}
            >
              Balya Teli
            </button>
          </div>

          {/* Database Button */}
          <button
            onClick={() => setShowExistingMmModal(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-lg flex flex-col items-start gap-0.5"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <span>Veritabanı</span>
            </div>
          </button>

          {/* Requests Button */}
          <button
            onClick={() => {
              setShowRequestsModal(true);
              fetchRequests();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg relative flex flex-col items-start gap-0.5"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span>Talepler</span>
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Ana İçerik */}
      {currentStep === 'input' && (
        <div className={`${isViewingExistingProduct ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-white'} rounded-xl shadow-lg p-8`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              {isViewingExistingProduct ? 'Ürün Düzenleme' : 'Ürün Bilgileri'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="font-medium">Zorunlu Alanlar</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Çap (mm) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmData.cap)}
                onChange={(e) => handleInputChange('cap', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="0.00000"
                lang="en-US" // Force EN-US locale with point decimal separator
                onKeyDown={(e) => handleCommaToPoint(e, 'cap')}
              />
              <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 0.90 - 4.00 mm</p>
            </div>

            {/* Yağlama Tipi - For both TAVLI and BALYA products */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Yağlama Tipi {mmData.product_type === 'BALYA' && <span className="text-red-500">*</span>}
              </label>
              <select
                value={mmData.yaglama_tipi}
                onChange={(e) => handleInputChange('yaglama_tipi', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  mmData.product_type === 'BALYA' && !mmData.yaglama_tipi
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              >
                <option value="">Yağsız</option>
                <option value="Püskürtme">Püskürtme</option>
                <option
                  value="Daldırma"
                  disabled={!mmData.cap || parseFloat(mmData.cap) < 1.80 || parseFloat(mmData.cap) > 3.80}
                >
                  Daldırma {(!mmData.cap || parseFloat(mmData.cap) < 1.80 || parseFloat(mmData.cap) > 3.80) && '(Sadece 1.80-3.80mm)'}
                </option>
              </select>
              {mmData.yaglama_tipi === 'Daldırma' && mmData.cap && (parseFloat(mmData.cap) < 1.80 || parseFloat(mmData.cap) > 3.80) && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Daldırma yağlama sadece 1.80-3.80mm çap aralığında kullanılabilir
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Min Mukavemet (MPa) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmData.min_mukavemet)}
                onChange={(e) => handleInputChange('min_mukavemet', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="350-1000"
                onKeyDown={(e) => handleCommaToPoint(e, 'min_mukavemet')}
              />
              <p className="text-xs text-gray-500 mt-1">Önerilen aralık: 350 - 1000 MPa</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Max Mukavemet (MPa) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmData.max_mukavemet)}
                onChange={(e) => handleInputChange('max_mukavemet', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="350-1000"
                onKeyDown={(e) => handleCommaToPoint(e, 'max_mukavemet')}
              />
              <p className="text-xs text-gray-500 mt-1">Önerilen aralık: 350 - 1000 MPa</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Ağırlık (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmData.kg)}
                onChange={(e) => handleInputChange('kg', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="5-750"
                onKeyDown={(e) => handleCommaToPoint(e, 'kg')}
              />
              <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 5 - 750 kg</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Bobin Boyutu (İç Çap - Dış Çap)
              </label>
              <select
                value={`${mmData.ic_cap}-${mmData.dis_cap}`}
                onChange={(e) => {
                  const [ic, dis] = e.target.value.split('-').map(v => parseInt(v));
                  handleInputChange('ic_cap', ic);
                  handleInputChange('dis_cap', dis);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value="21-34">ID: 21 cm - OD: 34 cm</option>
                <option value="21-35">ID: 21 cm - OD: 35 cm</option>
                <option value="25-35">ID: 25 cm - OD: 35 cm</option>
                <option value="40-75">ID: 40 cm - OD: 75 cm</option>
                <option value="45-75">ID: 45 cm - OD: 75 cm (Varsayılan)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Sabit bobin boyutu kombinasyonları</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Max Tolerans (mm)
              </label>
              <div className="flex gap-2">
                <select
                  value={toleransMaxSign}
                  onChange={(e) => setToleransMaxSign(e.target.value)}
                  className="w-16 px-2 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                >
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={normalizeDecimalDisplay(mmData.tolerans_plus || '')}
                  onChange={(e) => handleInputChange('tolerans_plus', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  placeholder="0.00000"
                  onKeyDown={(e) => handleCommaToPoint(e, 'tolerans_plus')}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: Pozitif değerler</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Min Tolerans (mm)
              </label>
              <div className="flex gap-2">
                <select
                  value={toleransMinSign}
                  onChange={(e) => setToleransMinSign(e.target.value)}
                  className="w-16 px-2 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                >
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  value={normalizeDecimalDisplay(mmData.tolerans_minus || '')}
                  onChange={(e) => handleInputChange('tolerans_minus', e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                  placeholder="0.00000"
                  onKeyDown={(e) => handleCommaToPoint(e, 'tolerans_minus')}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: Pozitif değerler</p>
            </div>

            {/* Paketleme Seçenekleri */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Paketleme Seçenekleri
              </label>
              <div className="border border-gray-300 rounded-lg p-4 space-y-3">
                {/* Shrink - Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="shrink"
                    checked={paketlemeSecenekleri.shrink}
                    onChange={(e) => {
                      setPaketlemeSecenekleri(prev => ({
                        ...prev,
                        shrink: e.target.checked
                      }));
                      handleInputChange('shrink', e.target.checked ? 'evet' : 'hayır');
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="shrink" className="ml-2 text-sm text-gray-900">
                    Shrink
                  </label>
                </div>

                {/* Palet - Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="palet"
                    checked={paketlemeSecenekleri.paletli}
                    onChange={(e) => setPaketlemeSecenekleri(prev => ({
                      ...prev,
                      paletli: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="palet" className="ml-2 text-sm text-gray-900">
                    Palet
                  </label>
                </div>

                {/* Karton - Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="karton"
                    checked={paketlemeSecenekleri.karton}
                    onChange={(e) => setPaketlemeSecenekleri(prev => ({
                      ...prev,
                      karton: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="karton" className="ml-2 text-sm text-gray-900">
                    Karton
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Unwinding
              </label>
              <select
                value={mmData.unwinding}
                onChange={(e) => handleInputChange('unwinding', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value="">Anti-Clockwise (Varsayılan)</option>
                <option value="Clockwise">Clockwise</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Bağ Miktarı
              </label>
              <input
                type="text"
                value={mmData.cast_kont}
                onChange={(e) => handleInputChange('cast_kont', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="Örn: 100"
              />
              <p className="text-xs text-gray-500 mt-1">Bağ miktarı, stok adında kg değerinden sonra '/100' şeklinde görünecektir</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Helix Kont
              </label>
              <input
                type="text"
                value={mmData.helix_kont}
                onChange={(e) => handleInputChange('helix_kont', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="Opsiyonel"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Elongation
              </label>
              <input
                type="text"
                value={mmData.elongation}
                onChange={(e) => handleInputChange('elongation', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="Opsiyonel"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleNext}
              disabled={isLoading || isLoadingRecipes}
              className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg flex items-center gap-2"
            >
              {isLoading || isLoadingRecipes ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLoadingRecipes ? 'Reçete verileri yükleniyor...' : 'İşleniyor...'}
                </>
              ) : (
                <>
                  Devam
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {currentStep === 'summary' && (
        <div className="space-y-6">
          {/* Durum Çubuğu */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedRequest && (
                  <div className="bg-blue-50 px-4 py-2 rounded-lg">
                    <span className="text-blue-700 font-medium">Talep Seçildi</span>
                  </div>
                )}
                {selectedExistingMm && (
                  <div className="bg-purple-50 px-4 py-2 rounded-lg">
                    <span className="text-purple-700 font-medium">Mevcut MM TT Seçildi</span>
                  </div>
                )}
                {isRequestUsed && (
                  <div className="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
                    <span className="text-yellow-700 font-medium">
                      {isEditingRequest 
                        ? "Düzenlenen talep için kaydet/export işlemi sonrası talep onaylanacaktır" 
                        : pendingApprovalAction === 'approve' 
                          ? "Onay için hazırlandı - Kaydet/export işlemi sonrası talep onaylanacaktır"
                          : "Kullanılan talep var - Talep onaylandı olarak işaretlenmiştir"}
                    </span>
                  </div>
                )}
              </div>
              
{!isViewingExistingProduct && (
                <button
                  onClick={handleBackToManual}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Manuel Girişe Dön
                </button>
              )}
            </div>
          </div>

          {/* MM TT Özet */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                mmData.product_type === 'TAVLI' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                <span className={`font-bold ${
                  mmData.product_type === 'TAVLI' ? 'text-blue-600' : 'text-green-600'
                }`}>MM</span>
              </div>
              {mmData.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli'} - Mamul Ürün Özeti
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Stok Kodu', value: generateMmStokKodu(mmData.product_type, mmData.cap, processSequence) },
                { label: 'Çap', value: `${parseFloat(mmData.cap || 0)} mm` },
                ...(mmData.product_type === 'BALYA' ? [{ label: 'Yağlama Tipi', value: mmData.yaglama_tipi || 'Belirtilmedi' }] : []),
                { label: 'Mukavemet', value: `${parseFloat(mmData.min_mukavemet || 0)}-${parseFloat(mmData.max_mukavemet || 0)} MPa` },
                { label: 'Ağırlık', value: `${parseFloat(mmData.kg || 0)} kg` },
                { label: 'İç Çap', value: `${parseFloat(mmData.ic_cap || 0)} cm` },
                { label: 'Dış Çap', value: `${parseFloat(mmData.dis_cap || 0)} cm` }
              ].map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-sm text-gray-500 block">{item.label}:</span>
                  <p className="font-semibold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* YM TT Özet (Tavlı/Balya Tel Intermediate) */}
          {ymTtData && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  mmData.product_type === 'TAVLI' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  <span className={`font-bold ${
                    mmData.product_type === 'TAVLI' ? 'text-blue-600' : 'text-green-600'
                  }`}>YM</span>
                </div>
                YM TT Yumak {mmData.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli'} Özeti
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-sm text-gray-500 block">Stok Kodu:</span>
                  <p className="font-semibold text-gray-800">{ymTtData.stok_kodu}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-sm text-gray-500 block">Stok Adı:</span>
                  <p className="font-semibold text-gray-800">{ymTtData.stok_adi}</p>
                </div>
              </div>
            </div>
          )}

          {/* YM ST Yönetimi - Siyah Tel Seçimi */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Diameter-based info banner */}
            {calculatedYmStDiameter !== null && (
              <div className="mb-4 p-4 rounded-lg border-l-4 bg-blue-50 border-blue-500">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-800">
                      Hesaplanan YM ST Çapı: {calculatedYmStDiameter.toFixed(2)} mm
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-semibold text-blue-700">Siyah Tel:</span> Tavlı/Balya Tel için siyah tel (YM.ST) hammadde olarak kullanılır.
                      {needsPressing && <span className="text-orange-600 font-semibold ml-1">(Çap &gt; 1.8mm - Presleme gereklidir)</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Simplified YM ST Creation UI */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">ST</span>
                </div>
                YM ST Ürün Oluşturma
              </h2>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                <div className="space-y-4">
                  {/* Suggested Diameter Display */}
                  {calculatedYmStDiameter !== null && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Önerilen YM ST Çapı: <strong className="text-blue-700">{calculatedYmStDiameter.toFixed(2)} mm</strong></span>
                    </div>
                  )}

                  {/* Editable Diameter Input */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        YM ST Çapı (manuel düzeltme yapabilirsiniz)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={userYmStDiameter}
                          onChange={(e) => setUserYmStDiameter(e.target.value)}
                          className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg font-semibold"
                          placeholder={calculatedYmStDiameter !== null ? `Önerilen: ${calculatedYmStDiameter.toFixed(2)} mm` : "YM ST çapını giriniz"}
                        />
                        <span className="text-gray-700 font-medium">mm</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateYmStFromDiameter}
                      disabled={!userYmStDiameter || isLoading || isLoadingRecipes}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Ekle
                    </button>
                  </div>

                  {/* Info Text Based on Diameter */}
                  {userYmStDiameter && parseFloat(userYmStDiameter) > 0 && (
                    <div className="mt-3 text-sm space-y-1">
                      <div className="text-blue-700 space-y-1">
                        <p className="font-semibold">ℹ️ Tavlı/Balya Tel Üretim Akışı:</p>
                        <ul className="ml-6 list-disc space-y-0.5">
                          <li>Siyah Tel (YM.ST) → Tavlama (TAV01) → Tavlı Tel (YM.TT)</li>
                          {parseFloat(userYmStDiameter) > 1.8 && (
                            <li className="text-orange-600">Çap &gt; 1.8mm: Presleme (STPRS01) işlemi eklenir</li>
                          )}
                          <li>YM.TT → {mmData.product_type === 'TAVLI' ? 'Paketleme (TVPKT01)' : 'Balyalama (BAL01)'} → Mamul Ürün</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>


            {/* Seçilen YM ST'ler - İyileştirilmiş tasarım */}
            {(selectedYmSts.length > 0 || autoGeneratedYmSts.length > 0) && (
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-700">Seçilen / Oluşturulan YM ST'ler</h3>
                  <div className="flex items-center">
                    <span className="text-sm text-blue-700 font-semibold mr-2">
                      <svg className="w-5 h-5 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                      </svg>
                      Ana YM ST'yi seçin - Ürün ilişkisi buna göre kurulacak
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Seçilen YM ST'ler */}
                  {selectedYmSts.map((ymSt, index) => {
                    const selectedIndex = index;
                    const isMain = mainYmStIndex === selectedIndex;
                    
                    return (
                      <div
                        key={`selected-${index}`}
                        className={`p-4 border-2 rounded-lg ${
                          isMain 
                            ? 'border-green-500 bg-green-50 ring-2 ring-green-300' 
                            : ymSt.source === 'manual-added' 
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-purple-200 bg-purple-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="mainYmSt"
                                id={`main-ymst-${index}`}
                                checked={isMain}
                                onChange={() => setMainYmStIndex(selectedIndex)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`main-ymst-${index}`} className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                {isMain && (
                                  <span className="text-blue-700 font-bold mr-1">Ana YM ST - </span>
                                )}
                                {ymSt.stok_kodu || ''}
                                {ymSt.isExisting === true && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500 text-white border-2 border-emerald-600 shadow-sm">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-1.528A6 6 0 004 9.528V4z" />
                                      <path fillRule="evenodd" d="M8 10a4 4 0 00-3.446 6.032l-1.261 1.26a1 1 0 101.414 1.415l1.261-1.261A4 4 0 108 10zm-2 4a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                                    </svg>
                                    VERİTABANI
                                  </span>
                                )}
                                {ymSt.isExisting === false && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 text-white border-2 border-amber-600 shadow-sm">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                    </svg>
                                    YENİ OLUŞTURULACAK
                                  </span>
                                )}
                              </label>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2 ml-6">{ymSt.stok_adi || ''}</p>
                          </div>
                          <button
                            onClick={() => {
                              // If removing the main YMST, set a new main YMST
                              if (isMain) {
                                // Find new main index - prefer to keep among selected YMSTs
                                const newMainIndex = selectedYmSts.length > 1 
                                  ? (index === selectedYmSts.length - 1 ? index - 1 : index + 1) 
                                  : (autoGeneratedYmSts.length > 0 ? selectedYmSts.length : 0);
                                setMainYmStIndex(newMainIndex);
                              } else if (index < mainYmStIndex) {
                                // If removing an YMST with index less than main, adjust main index
                                setMainYmStIndex(mainYmStIndex - 1);
                              }
                              removeSelectedYmSt(index);
                            }}
                            className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                            isMain 
                              ? 'bg-green-200 text-green-800' 
                              : ymSt.source === 'manual-added' 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                          }`}>
                            {ymSt.source === 'manual-added' ? 'Elle Eklendi' : 'Veritabanı'}
                            {isMain && ' (Ana)'}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {parseFloat(ymSt.cap || 0)} mm
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Otomatik oluşturulan YM ST'ler */}
                  {autoGeneratedYmSts.map((ymSt, index) => {
                    const autoIndex = selectedYmSts.length + index;
                    const isMain = mainYmStIndex === autoIndex;
                    
                    return (
                      <div
                        key={`auto-${index}`}
                        className={`p-4 border-2 rounded-lg ${
                          isMain ? 'border-green-500 bg-green-50 ring-2 ring-green-300' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="mainYmSt"
                                id={`main-ymst-auto-${index}`}
                                checked={isMain}
                                onChange={() => setMainYmStIndex(autoIndex)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`main-ymst-auto-${index}`} className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                {isMain && (
                                  <span className="text-blue-700 font-bold mr-1">Ana YM ST - </span>
                                )}
                                {ymSt.stok_kodu || ''}
                                {ymSt.isExisting === true && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500 text-white border-2 border-emerald-600 shadow-sm">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-1.528A6 6 0 004 9.528V4z" />
                                      <path fillRule="evenodd" d="M8 10a4 4 0 00-3.446 6.032l-1.261 1.26a1 1 0 101.414 1.415l1.261-1.261A4 4 0 108 10zm-2 4a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                                    </svg>
                                    VERİTABANI
                                  </span>
                                )}
                                {ymSt.isExisting === false && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 text-white border-2 border-amber-600 shadow-sm">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                    </svg>
                                    YENİ OLUŞTURULACAK
                                  </span>
                                )}
                              </label>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2 ml-6">{ymSt.stok_adi || ''}</p>
                          </div>
                          <button
                            onClick={() => {
                              // If removing the main YMST, set a new main YMST
                              if (isMain) {
                                // Find new main index - prefer to keep among auto YMSTs or selected YMSTs
                                const newMainIndex = autoGeneratedYmSts.length > 1 
                                  ? (index === autoGeneratedYmSts.length - 1 
                                    ? selectedYmSts.length + index - 1 
                                    : selectedYmSts.length + index + 1) 
                                  : (selectedYmSts.length > 0 ? 0 : 0);
                                setMainYmStIndex(newMainIndex);
                              } else if (autoIndex < mainYmStIndex) {
                                // If removing an YMST with index less than main, adjust main index
                                setMainYmStIndex(mainYmStIndex - 1);
                              }
                              removeAutoGeneratedYmSt(index);
                            }}
                            className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                            isMain ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            Otomatik Oluşturuldu
                            {isMain && ' (Ana)'}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {parseFloat(ymSt.cap || 0)} mm
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* Reçete Bölümü - Mamul Ürün Bileşenleri */}
          {(selectedYmSts.length > 0 || autoGeneratedYmSts.length > 0) && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold">R</span>
                  </div>
                  Reçete Bileşenleri
                </h2>
                <button
                  onClick={() => {
                    console.log('🔧 Otomatik Doldur button clicked');
                    // Auto-fill recipe components with formulas
                    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
                    console.log(`📊 YM STs available: selectedYmSts=${selectedYmSts.length}, autoGeneratedYmSts=${autoGeneratedYmSts.length}, total=${allYmSts.length}`);
                    const kg = parseFloat(mmData.kg) || 0;
                    console.log(`📦 Weight (kg): ${kg}`);

                    if (kg <= 0) {
                      console.error('❌ Invalid weight:', kg);
                      toast.error('Lütfen geçerli bir ağırlık (kg) giriniz');
                      return;
                    }

                    if (allYmSts.length === 0) {
                      console.error('❌ No YM STs available');
                      toast.error('Lütfen en az bir YM ST seçiniz veya oluşturunuz');
                      return;
                    }

                    console.log('✅ Starting recipe auto-fill...');

                    // ✅ CRITICAL FIX: Calculate needsPressing from YM ST cap (NOT MM cap)
                    // Use the main YM ST (first one) cap for pressing check
                    const ymStCapValue = parseFloat(allYmSts[0].cap) || 0;
                    const needsPressing = ymStCapValue >= 1.8;
                    console.log(`🔨 Pressing needed: ${needsPressing} (YM ST cap: ${ymStCapValue}mm, MM cap: ${parseFloat(mmData.cap)}mm)`);

                    // Calculate shrink based on inner diameter
                    const shrinkCode = getShrinkCode(mmData.ic_cap);
                    const shrinkAmount = calculateShrinkAmount(kg);

                    // Calculate auxiliary components using formulas
                    // ✅ FIXED: Karton - "1.2 tonda 7 adet" per 2.csv → proportional to weight
                    const kartonValue = parseFloat((7 / 1200).toFixed(5));

                    // ✅ FIXED: Kaldırma Kancası - "4 adet paketleme + 2 adet presleme" per 2.csv → proportional to weight
                    const halkaValue = parseFloat((4 / 1200).toFixed(5));

                    // ✅ FIXED: Plastik Çember - "1.2 tonda 10 m" per 2.csv → proportional to weight
                    const plastikCemberValue = parseFloat((10 / 1200).toFixed(5));

                    // ✅ FIXED: Çember Tokası - "paketleme 4 + presleme 4" per 2.csv → proportional to weight
                    const tokaValue = parseFloat((4 / 1200).toFixed(5));

                    // ❌ REMOVED: AMB.STREÇ - not in gene2l.csv constraints
                    // const strecValue = parseFloat(((0.5 * (1000 / kg)) / 1000).toFixed(5));

                    // ✅ FIXED: Palet - "1.2 tonda 1 palet" per 2.csv → proportional to weight
                    const paletValue = parseFloat((1 / 1200).toFixed(5));

                    // ✅ FIXED: Çelik Çember - "Galvaniz componentinden al" per 2.csv → use Galvaniz formula
                    const celikCemberValue = parseFloat(((1.2 * (1000 / kg)) / 1000).toFixed(5));

                    // Packaging operation duration
                    const packagingOperation = mmData.product_type === 'TAVLI' ? 'TVPKT01' : 'BAL01';
                    // ✅ CRITICAL FIX: OPERATION_DURATIONS values are functions - must call them!
                    const mmCapValue = parseFloat(mmData.cap) || 0;
                    const packagingDuration = mmData.product_type === 'TAVLI'
                      ? OPERATION_DURATIONS.TVPKT01(paketlemeSecenekleri.shrink, mmCapValue, kg)  // ✅ FIX: Pass diameter for 1.2mm check
                      : OPERATION_DURATIONS.BAL01(kg);

                    // Update recipes for all YM STs
                    const updatedRecipes = { ...allRecipes };
                    const updatedRecipeStatus = { ...recipeStatus };

                    if (!updatedRecipes.mmRecipes) updatedRecipes.mmRecipes = {};
                    if (!updatedRecipeStatus.mmRecipes) updatedRecipeStatus.mmRecipes = {};

                    let updatedCount = 0;

                    allYmSts.forEach((ymSt, index) => {
                      if (!updatedRecipes.mmRecipes[index]) updatedRecipes.mmRecipes[index] = {};
                      if (!updatedRecipeStatus.mmRecipes[index]) updatedRecipeStatus.mmRecipes[index] = {};

                      // ✅ CRITICAL FIX: YM TT stok_kodu uses MM cap (NOT YM ST cap)!
                      // This matches GalvanizliTelNetsis logic: YM GT uses MM GT cap
                      const mmCapValue = parseFloat(mmData.cap) || 0;
                      const capFormatted = Math.round(mmCapValue * 100).toString().padStart(4, '0');

                      // ✅ CRITICAL FIX: Use processSequence if available, otherwise calculate next sequence
                      // For new products, use '00' as temporary placeholder - will be updated during save
                      const sequence = processSequence && processSequence !== '00' ? processSequence : '00';
                      const ymTtSource = `YM.TT.${capFormatted}.${sequence}`;

                      console.log(`📝 Auto-filling for YM ST ${index}: ${ymSt.stok_kodu}, YM TT source: ${ymTtSource}`);

                      // Only update if not from database
                      const updateIfNotDb = (key, value) => {
                        if (!recipeStatus.mmRecipes?.[index]?.[key] || recipeStatus.mmRecipes[index][key] !== 'database') {
                          updatedRecipes.mmRecipes[index][key] = value;
                          updatedRecipeStatus.mmRecipes[index][key] = 'auto';
                          updatedCount++;
                          console.log(`  ✅ Updated ${key} = ${value}`);
                        } else {
                          console.log(`  ⏭️  Skipped ${key} (from database)`);
                        }
                      };

                      // ✅ CRITICAL FIX: Add YM TT source first
                      updateIfNotDb(ymTtSource, 1);
                      // ✅ FIXED: packagingDuration is already a number from OPERATION_DURATIONS function
                      updateIfNotDb(packagingOperation, packagingDuration);

                      // ✅ FIXED: Only add components based on packaging options
                      // Shrink - Only if packaging includes shrink
                      if (paketlemeSecenekleri.shrink) {
                        updateIfNotDb(shrinkCode, shrinkAmount);
                      }

                      // ✅ CRITICAL FIX: Karton AND Plastik Çember - BOTH for oiled products only (per 2.csv)
                      // "Yağlı ürünlerde ekle" - NOT controlled by checkbox, but by yaglama_tipi
                      if (mmData.yaglama_tipi && mmData.yaglama_tipi !== 'Yağsız') {
                        // Both MUST be added together for oiled products
                        updateIfNotDb('AMB.ÇEM.KARTON.GAL', kartonValue);
                        updateIfNotDb('AMB.PLASTİK.ÇEMBER', plastikCemberValue);
                      }

                      // ✅ TAVLI-ONLY components (per 4.csv structure)
                      if (mmData.product_type === 'TAVLI') {
                        // Halka (Kaldırma Kancası) - TAVLI only (4 for packaging + 2 for pressing if cap >= 1.8mm)
                        // ✅ FIX: "4 adet paketleme + 2 adet presleme" → 6 total if pressing needed
                        const halkaTotalValue = needsPressing ? parseFloat((6 / 1200).toFixed(5)) : halkaValue;
                        updateIfNotDb('SM.7MMHALKA', halkaTotalValue);

                        // Çember Tokası - TAVLI only (4 for packaging + 4 for pressing if cap >= 1.8mm)
                        // "paketleme 4 + presleme 4" → 8 total if pressing needed
                        const tokaTotalValue = needsPressing ? parseFloat((8 / 1200).toFixed(5)) : tokaValue;
                        updateIfNotDb('AMB.TOKA.SIGNODE.114P. DKP', tokaTotalValue);

                        // Çelik Çember - TAVLI only, x2 if pressing needed (Galvaniz formula)
                        const celikCemberTotalValue = needsPressing ? parseFloat(((2.4 * (1000 / kg)) / 1000).toFixed(5)) : celikCemberValue;
                        updateIfNotDb('AMB.APEX CEMBER 38X080', celikCemberTotalValue);
                      }

                      // Palet - Only if packaging includes palet (both TAVLI and BALYA)
                      if (paketlemeSecenekleri.paletli) {
                        updateIfNotDb('AMB.PALET', paletValue);
                      }
                    });

                    // ✅ NEW: Auto-generate YM ST recipes
                    console.log('🔧 Auto-generating YM ST recipes...');
                    if (!updatedRecipes.ymStRecipes) updatedRecipes.ymStRecipes = [];
                    if (!updatedRecipeStatus.ymStRecipes) updatedRecipeStatus.ymStRecipes = [];

                    allYmSts.forEach((ymSt, index) => {
                      if (!updatedRecipes.ymStRecipes[index]) updatedRecipes.ymStRecipes[index] = {};
                      if (!updatedRecipeStatus.ymStRecipes[index]) updatedRecipeStatus.ymStRecipes[index] = {};

                      const ymStDiameter = parseFloat(ymSt.cap) || 0;
                      console.log(`\n🔍 === YM ST RECIPE AUTO-FILL DEBUG ${index} ===`);
                      console.log(`📦 YM ST: ${ymSt.stok_kodu}`);
                      console.log(`📏 Cap: ${ymStDiameter}mm`);
                      console.log(`🔍 Product type: ${ymSt.stok_kodu.endsWith('.ST') ? 'COILER (.ST)' : 'FILMAŞIN'}`);

                      // Helper to update if not from database
                      const updateYmStIfNotDb = (key, value) => {
                        if (!recipeStatus.ymStRecipes?.[index]?.[key] || recipeStatus.ymStRecipes[index][key] !== 'database') {
                          updatedRecipes.ymStRecipes[index][key] = value;
                          updatedRecipeStatus.ymStRecipes[index][key] = 'auto';
                          updatedCount++;
                          console.log(`  ✅ YM ST Updated ${key} = ${value}`);
                        } else {
                          console.log(`  ⏭️  YM ST Skipped ${key} (from database)`);
                        }
                      };

                      if (ymStDiameter >= 1.5) {
                        console.log(`📊 Category: >= 1.5mm → FILMAŞIN method (FLM + TLC01)`);
                        // Case 1: >= 1.5mm → FLM (filmaşin) + TLC01
                        // Extract filmasin and quality from stok_kodu
                        // Format: YM.ST.{cap}.{filmasin}.{quality} or YM.ST.{cap}.ST
                        const stokParts = ymSt.stok_kodu.split('.');

                        if (stokParts.length >= 5 && stokParts[4]) {
                          // Has filmasin: YM.ST.{cap}.{filmasin}.{quality}
                          const filmasinPart = stokParts[3]; // e.g., "0600"
                          const qualityPart = stokParts[4];  // e.g., "1006"
                          const flmCode = `FLM.${filmasinPart}.${qualityPart}`;

                          console.log(`  ✅ Filmaşin product detected`);
                          console.log(`  📍 FLM code: ${flmCode}`);
                          updateYmStIfNotDb(flmCode, 1);

                          // TLC01 operation duration
                          const tlc01Duration = OPERATION_DURATIONS.TLC01 ? OPERATION_DURATIONS.TLC01(ymStDiameter) : 0.002;
                          console.log(`  📍 TLC01 duration: ${tlc01Duration}`);
                          updateYmStIfNotDb('TLC01', tlc01Duration);
                        } else if (stokParts.length === 4 && stokParts[3] === 'ST') {
                          // .ST product with cap >= 1.5mm → needs a coiler source
                          // Find matching coiler source from database or use default
                          console.warn(`  ⚠️  .ST product with cap >= 1.5mm - unusual, skipping auto-fill`);
                          // For now, skip auto-generation for .ST products >= 1.5mm
                          // These would typically be alternatives and use a different source
                        }
                      } else {
                        console.log(`📊 Category: < 1.5mm → COILER method (YM.ST source + COTLC01)`);
                        // Case 2: < 1.5mm → YM.ST source (coiler) + COTLC01
                        // For products < 1.5mm, the source is typically another YM.ST product
                        // We need to determine the correct coiler source based on the product

                        // Extract the stok_kodu pattern to determine source
                        // For .ST products, source should be from a .0550. or .0600. coiler
                        const stokParts = ymSt.stok_kodu.split('.');

                        if (stokParts.length >= 4 && stokParts[3] === 'ST') {
                          // This is a .ST (coiler) product
                          // Source should be a matching .0550. or .0600. coiler variant
                          const capPart = stokParts[2]; // e.g., "0236"

                          // Default to .0550.1005 coiler for .ST products
                          const coilerSource = `YM.ST.${capPart}.0550.1005`;
                          console.log(`  ✅ Coiler product detected`);
                          console.log(`  📍 Source: ${coilerSource}`);
                          updateYmStIfNotDb(coilerSource, 1);

                          // COTLC01 operation duration
                          const cotlc01Duration = OPERATION_DURATIONS.COTLC01 ? OPERATION_DURATIONS.COTLC01(ymStDiameter) : 0.002;
                          console.log(`  📍 COTLC01 duration: ${cotlc01Duration}`);
                          updateYmStIfNotDb('COTLC01', cotlc01Duration);
                        } else {
                          console.warn(`  ⚠️  Expected .ST product for < 1.5mm but got: ${ymSt.stok_kodu}`);
                        }
                      }
                      console.log(`=== END YM ST ${index} ===\n`);
                    });

                    console.log(`📝 Total components updated: ${updatedCount}`);
                    console.log('📋 Updated recipes:', updatedRecipes);
                    console.log('🔄 Setting state with updated recipes...');

                    setAllRecipes(updatedRecipes);
                    setRecipeStatus(updatedRecipeStatus);

                    if (updatedCount > 0) {
                      console.log(`✅ Successfully auto-filled ${updatedCount} components for ${allYmSts.length} products`);
                      toast.success(`${allYmSts.length} ürün için reçete bileşenleri otomatik dolduruldu`);
                    } else {
                      console.log('⚠️ No components updated - all from database');
                      toast.info('Tüm bileşenler zaten veritabanından yüklendi');
                    }
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                  Otomatik Doldur
                </button>
              </div>

              {/* YM ST Tabs - Show if multiple YM STs */}
              {[...selectedYmSts, ...autoGeneratedYmSts].length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6 border-b">
                  {[...selectedYmSts, ...autoGeneratedYmSts].map((ymSt, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveRecipeTab(index)}
                      className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                        activeRecipeTab === index
                          ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      YM ST #{index + 1}
                      <span className="text-xs block">
                        {parseFloat(ymSt.cap || 0).toFixed(2)} mm
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Recipe Components */}
              {activeRecipeTab !== null && (
                <div className="space-y-6">
                  {/* MM Recipe - Packaging Components */}
                  <div className="p-6 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4 text-blue-700">
                      {mmData.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli'} Mamul Ürün Reçetesi #{activeRecipeTab + 1}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(() => {
                        const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
                        const packagingOp = mmData.product_type === 'TAVLI' ? 'TVPKT01' : 'BAL01';
                        const packagingLabel = mmData.product_type === 'TAVLI' ? 'Paketleme (TVPKT01)' : 'Balyalama (BAL01)';

                        // ✅ FIX: Define all possible components, then filter based on packaging selection AND product type
                        const allComponents = [
                          { key: 'ymtt_source', label: 'YM.TT Kaynağı', type: 'readonly', unit: 'KG', alwaysShow: true },
                          { key: packagingOp, label: packagingLabel, type: 'input', unit: 'DK', alwaysShow: true },
                          { key: 'AMB.ÇEM.KARTON.GAL', label: 'Karton', type: 'input', unit: 'AD', condition: paketlemeSecenekleri.karton },
                          { key: 'shrink', label: 'Shrink', type: 'dropdown', unit: 'KG', condition: paketlemeSecenekleri.shrink },
                          // ✅ TAVLI-ONLY components (per 4.csv structure)
                          { key: 'SM.7MMHALKA', label: '7mm Halka (Kaldırma Kancası)', type: 'input', unit: 'AD', condition: mmData.product_type === 'TAVLI' },
                          { key: 'AMB.TOKA.SIGNODE.114P. DKP', label: 'Çember Tokası', type: 'input', unit: 'AD', condition: mmData.product_type === 'TAVLI' },
                          { key: 'AMB.APEX CEMBER 38X080', label: 'Çelik Çember', type: 'input', unit: 'AD', condition: mmData.product_type === 'TAVLI' },
                          // ✅ BOTH TAVLI and BALYA components
                          { key: 'AMB.PLASTİK.ÇEMBER', label: 'Plastik Çember', type: 'input', unit: 'M', alwaysShow: true },
                          { key: 'AMB.PALET', label: 'Palet', type: 'input', unit: 'AD', condition: paketlemeSecenekleri.paletli }
                        ];

                        // ✅ FIX: Only show components that are either always shown OR have their condition met
                        const components = allComponents.filter(comp => comp.alwaysShow || comp.condition);

                        return components.map(({ key, label, type, unit }) => {
                          let currentValue = '';

                          if (type === 'readonly') {
                            // ✅ FIXED: YM TT uses MM cap, not YM ST cap
                            const cap = parseFloat(mmData.cap || 0);
                            const capFormatted = Math.round(cap * 100).toString().padStart(4, '0');
                            const sequence = activeRecipeTab.toString().padStart(2, '0');
                            currentValue = `YM.TT.${capFormatted}.${sequence}`;
                          } else if (key === 'shrink') {
                            const shrinkKeys = ['AMB.SHRİNK.200*140CM', 'AMB.SHRİNK.200*160CM', 'AMB.SHRİNK.200*190CM'];
                            const currentShrinkKey = shrinkKeys.find(sk => allRecipes.mmRecipes?.[activeRecipeTab]?.[sk] > 0);
                            currentValue = currentShrinkKey || '';
                          } else {
                            currentValue = allRecipes.mmRecipes?.[activeRecipeTab]?.[key] || '';
                          }

                          const isFromDatabase = recipeStatus.mmRecipes?.[activeRecipeTab]?.[key] === 'database';

                          return (
                            <div key={key} className="space-y-2">
                              {type !== 'dropdown' && (
                                <label className="block text-sm font-medium text-gray-700">
                                  {label}
                                  <span className="text-xs text-gray-500 ml-2">({unit})</span>
                                </label>
                              )}
                              {type === 'readonly' ? (
                                <input
                                  type="text"
                                  value={currentValue}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                                  readOnly
                                />
                              ) : type === 'dropdown' ? (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Shrink Tipi
                                    </label>
                                    <select
                                      value={currentValue}
                                      onChange={(e) => {
                                        const newShrinkType = e.target.value;
                                        const updatedRecipes = { ...allRecipes };
                                        if (!updatedRecipes.mmRecipes) updatedRecipes.mmRecipes = {};
                                        if (!updatedRecipes.mmRecipes[activeRecipeTab]) updatedRecipes.mmRecipes[activeRecipeTab] = {};

                                        // Remove old shrink types
                                        ['AMB.SHRİNK.200*140CM', 'AMB.SHRİNK.200*160CM', 'AMB.SHRİNK.200*190CM'].forEach(sk => {
                                          delete updatedRecipes.mmRecipes[activeRecipeTab][sk];
                                        });

                                        // Add new shrink type with default value
                                        if (newShrinkType) {
                                          const kg = parseFloat(mmData.kg) || 500;
                                          const shrinkAmount = calculateShrinkAmount(kg);
                                          updatedRecipes.mmRecipes[activeRecipeTab][newShrinkType] = shrinkAmount;
                                        }

                                        setAllRecipes(updatedRecipes);
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      disabled={isFromDatabase}
                                    >
                                      <option value="">Shrink Tipi Seçin</option>
                                      <option value="AMB.SHRİNK.200*140CM">AMB.SHRİNK.200*140CM</option>
                                      <option value="AMB.SHRİNK.200*160CM">AMB.SHRİNK.200*160CM</option>
                                      <option value="AMB.SHRİNK.200*190CM">AMB.SHRİNK.200*190CM</option>
                                    </select>
                                  </div>
                                  {currentValue && (
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium text-gray-700">
                                        Shrink Tüketimi (KG)
                                      </label>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={normalizeDecimalDisplay(allRecipes.mmRecipes?.[activeRecipeTab]?.[currentValue] || '')}
                                        onChange={(e) => {
                                          const value = normalizeInputValue(e.target.value);
                                          const updatedRecipes = { ...allRecipes };
                                          if (!updatedRecipes.mmRecipes) updatedRecipes.mmRecipes = {};
                                          if (!updatedRecipes.mmRecipes[activeRecipeTab]) updatedRecipes.mmRecipes[activeRecipeTab] = {};
                                          updatedRecipes.mmRecipes[activeRecipeTab][currentValue] = parseFloat(value) || 0;
                                          setAllRecipes(updatedRecipes);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={isFromDatabase}
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={normalizeDecimalDisplay(currentValue || '')}
                                  onChange={(e) => {
                                    const value = normalizeInputValue(e.target.value);
                                    const updatedRecipes = { ...allRecipes };
                                    if (!updatedRecipes.mmRecipes) updatedRecipes.mmRecipes = {};
                                    if (!updatedRecipes.mmRecipes[activeRecipeTab]) updatedRecipes.mmRecipes[activeRecipeTab] = {};
                                    updatedRecipes.mmRecipes[activeRecipeTab][key] = parseFloat(value) || 0;
                                    setAllRecipes(updatedRecipes);
                                  }}
                                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    isFromDatabase ? 'bg-gray-100 cursor-not-allowed' : ''
                                  }`}
                                  disabled={isFromDatabase}
                                />
                              )}
                              <div className="h-4">
                                {isFromDatabase && (
                                  <p className="text-xs text-gray-500 italic">Veritabanından yüklendi</p>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* İşlem Butonları */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => {
                  if (isViewingExistingProduct) {
                    // Cancel changes and go back to database list
                    if (window.confirm('Değişiklikleri iptal etmek istediğinizden emin misiniz?')) {
                      setCurrentStep('input');
                      setSavedToDatabase(false);
                      setDatabaseIds({ mmIds: [], ymGtId: null, ymStIds: [] });
                      setSessionSavedProducts({ mmIds: [], ymGtId: null, ymStIds: [] });
                      setSelectedYmSts([]);
                      setAutoGeneratedYmSts([]);
                      setIsLoading(false);
                      setIsViewingExistingProduct(false);
                      setIsEditingExistingProduct(false);
                      setSelectedExistingMmGt(null);
                      setOriginalProductData(null);
                      setProcessSequence('00');
                      sessionStorage.removeItem('lastProcessSequence');
                      toast.info('Değişiklikler iptal edildi');
                    }
                  } else {
                    // Normal back behavior for new products
                    setCurrentStep('input');
                    setSavedToDatabase(false);
                    setDatabaseIds({ mmIds: [], ymGtId: null, ymStIds: [] });
                    setSessionSavedProducts({ mmIds: [], ymGtId: null, ymStIds: [] });
                    setSelectedYmSts([]);
                    setAutoGeneratedYmSts([]);
                    setIsLoading(false);
                    setIsViewingExistingProduct(false);
                    setIsEditingExistingProduct(false);
                    setProcessSequence('00');
                    console.log('Back to input - resetting processSequence to 00');
                    sessionStorage.removeItem('lastProcessSequence');
                  }
                }}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {isViewingExistingProduct ? 'Değişiklikleri İptal Et' : 'Geri'}
              </button>
              
              {/* REMOVED: Veritabanına Kaydet ve Excel Oluştur button - was causing infinite loops */}
              {/* Use only the queue-based "Kaydet ve Kuyruğa Al" button below */}
              
              {/* For existing products, show a simple save changes button */}
              {isViewingExistingProduct && (
                <button
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      
                      // First check for duplicate stok_kodu when editing
                      const isDuplicateValid = await checkForDuplicatesWhenEditing();
                      if (!isDuplicateValid) {
                        setIsLoading(false);
                        return;
                      }
                      
                      // Check for changes when editing existing product
                      const changes = detectChanges();
                      
                      // Show change preview modal
                      setPendingChanges({
                        changes: changes,
                        originalData: originalProductData,
                        currentData: {
                          mm: mmData,
                          ymTts: ymTtData ? [ymTtData] : [], // ✅ FIXED: Use ymTtData for Tavlı/Balya (not ymGtData)
                          ymSts: [...selectedYmSts, ...autoGeneratedYmSts]
                        }
                      });
                      setShowChangePreviewModal(true);
                      setIsLoading(false);
                      return;
                    } catch (error) {
                      console.error("Error during operation:", error);
                      setError(`İşlem hatası: ${error.message}`);
                      toast.error(`İşlem hatası: ${error.message}`);
                      
                      // Reset loading state to allow user to try again
                      setIsLoading(false);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      İşlem Yapılıyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Değişiklikleri Kaydet
                    </>
                  )}
                </button>
              )}
              
              {/* Sadece Kaydet button - yeni urunler icin veya talep duzenlerken goster */}
              {(() => {
                const shouldShow = ((!isViewingExistingProduct && !savedToDatabase) || isEditingRequest) && !isViewingExistingProduct;
                // Removed frequent console.log to reduce render noise
                return shouldShow;
              })() && (
                <button
                  onClick={(e) => {
                    console.log("Sadece Kaydet - adding to queue");

                    // Get product name for task display - FIXED for Tavli/Balya
                    const productType = mmData.product_type || 'TAVLI';
                    const productPrefix = productType === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli';
                    const productName = `${productPrefix} ${parseFloat(mmData.cap)}mm`;
                    console.log('🏷️ Product name for queue:', productName);
                    const taskName = `${productName}`;
                    const taskId = Date.now().toString();

                    // ✅ CRITICAL FIX: Capture request ID when task is created, not when it runs
                    const currentRequestId = selectedRequest?.id;
                    console.log(`📝 Capturing request ID for queue task: ${currentRequestId}`);

                    // 🔒 STATE SNAPSHOT: Capture ALL state at task creation to prevent mixing
                    console.log(`📸 Creating state snapshot for task: ${productName}`);
                    const stateSnapshot = {
                      mmData: JSON.parse(JSON.stringify(mmData)),
                      selectedYmSts: JSON.parse(JSON.stringify(selectedYmSts)),
                      autoGeneratedYmSts: JSON.parse(JSON.stringify(autoGeneratedYmSts)),
                      allRecipes: JSON.parse(JSON.stringify(allRecipes)),
                      mainYmStIndex: mainYmStIndex,
                      paketlemeSecenekleri: JSON.parse(JSON.stringify(paketlemeSecenekleri)),
                      pendingApprovalAction: pendingApprovalAction,
                      selectedRequest: selectedRequest ? JSON.parse(JSON.stringify(selectedRequest)) : null,
                      toleransMaxSign: toleransMaxSign,
                      toleransMinSign: toleransMinSign,
                      currentRequestId: currentRequestId
                    };
                    console.log(`✅ State snapshot created:`, {
                      kod_2: stateSnapshot.mmData.kod_2,
                      cap: stateSnapshot.mmData.cap,
                      ymStCount: stateSnapshot.selectedYmSts.length + stateSnapshot.autoGeneratedYmSts.length,
                      requestId: stateSnapshot.currentRequestId
                    });

                    // Create animation element
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const animElement = document.createElement('div');
                    animElement.className = 'fixed z-50 bg-green-600 text-white px-3 py-1 rounded-lg text-sm pointer-events-none transition-all duration-700 shadow-lg';
                    animElement.innerHTML = `
                      <div class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        ${taskName}
                      </div>
                    `;
                    animElement.style.left = `${buttonRect.left}px`;
                    animElement.style.top = `${buttonRect.top}px`;
                    document.body.appendChild(animElement);
                    
                    // Calculate target position (bottom bar)
                    const targetY = window.innerHeight - 60;
                    const targetX = 100 + (taskQueue.length * 150);
                    
                    // Animate to bottom bar
                    requestAnimationFrame(() => {
                      animElement.style.transform = `translate(${targetX - buttonRect.left}px, ${targetY - buttonRect.top}px) scale(0.9)`;
                      animElement.style.opacity = '0.3';
                    });
                    
                    // Remove animation element
                    setTimeout(() => {
                      if (animElement.parentNode) {
                        document.body.removeChild(animElement);
                      }
                    }, 700);
                    
                    // Add to queue with save function
                    addToTaskQueue(taskName, async () => {
                      let saveResult;
                      let actualSequence = '00'; // ✅ CRITICAL FIX: Declare outside try block

                      // 🔒 USE SNAPSHOT: All operations use stateSnapshot, NEVER global state
                      console.log(`🔄 Task executing with snapshot:`, {
                        kod_2: stateSnapshot.mmData.kod_2,
                        cap: stateSnapshot.mmData.cap,
                        requestId: stateSnapshot.currentRequestId
                      });

                      // For "Sadece Kaydet" button, save directly using queue system
                      try {
                        const allYmSts = [...stateSnapshot.selectedYmSts, ...stateSnapshot.autoGeneratedYmSts];

                        if (allYmSts.length === 0) {
                          toast.error('En az bir YM ST seçmelisiniz veya oluşturmalısınız');
                          return false;
                        }

                        // Get next sequence for this product with atomic sequence generation
                        const capFormatted = Math.round(parseFloat(stateSnapshot.mmData.cap) * 100).toString().padStart(4, '0');
                        const productPrefix = getProductPrefix(stateSnapshot.mmData.product_type);
                        const baseCode = `${productPrefix}.${capFormatted}`;
                        
                        // Add task ID to sequence generation for atomic operation
                        const taskId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        console.log(`🔒 [${taskId}] Starting atomic sequence generation for ${baseCode}`);
                        
                        let sequence = '00';
                        let attempts = 0;
                        const maxAttempts = 5;
                        
                        while (attempts < maxAttempts) {
                          attempts++;
                          console.log(`🔄 [${taskId}] Sequence generation attempt ${attempts}/${maxAttempts}`);
                          
                          const response = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
                          let nextSequence = 0; // FIXED: Start from 0, not 1
                          
                          if (response && response.ok) {
                            const existingProducts = await response.json();
                            if (existingProducts.length > 0) {
                              const sequences = existingProducts
                                .map(p => {
                                  const match = p.stok_kodu.match(/\.(\d+)$/);
                                  return match ? parseInt(match[1]) : 0;
                                })
                                .filter(seq => !isNaN(seq));
                              
                              if (sequences.length > 0) {
                                nextSequence = Math.max(...sequences) + 1;
                              } else {
                                nextSequence = 0; // If no valid sequences found, start from 0
                              }
                            }
                          }
                          
                          sequence = nextSequence.toString().padStart(2, '0');
                          const potentialStokKodu = `${baseCode}.${sequence}`;
                          
                          console.log(`🔍 [${taskId}] Checking if ${potentialStokKodu} already exists...`);
                          
                          // Double-check: verify this sequence is not already taken
                          const checkResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_kodu=${potentialStokKodu}`);
                          if (checkResponse && checkResponse.ok) {
                            const existing = await checkResponse.json();
                            if (existing.length === 0) {
                              console.log(`✅ [${taskId}] Sequence ${sequence} is available for ${baseCode}`);
                              break; // Sequence is available
                            } else {
                              console.log(`⚠️ [${taskId}] Sequence ${sequence} is taken, retrying...`);
                              // Add small delay to prevent tight loop
                              await new Promise(resolve => setTimeout(resolve, 100));
                              continue; // Try again
                            }
                          }
                        }
                        
                        if (attempts >= maxAttempts) {
                          console.error(`💥 [${taskId}] Failed to generate unique sequence after ${maxAttempts} attempts`);
                          toast.error('Sequence generation failed after multiple attempts');
                          return false;
                        }
                        
                        console.log(`🎯 [${taskId}] Final sequence: ${sequence} for ${baseCode}`);
                        setProcessSequence(sequence);
                        
                        // Convert sequence string back to number for proceedWithSave
                        const nextSequence = parseInt(sequence);
                        
                        // ✅ CRITICAL FIX: Capture the actual sequence for later use in approval
                        actualSequence = sequence;

                        // ✅ CRITICAL FIX: Pass the captured request ID to proceedWithSave
                        console.log(`🎯 Using snapshot request ID in queue task: ${stateSnapshot.currentRequestId}`);
                        saveResult = await proceedWithSave(allYmSts, nextSequence, stateSnapshot.currentRequestId);
                      } catch (error) {
                        console.error('Queue save error:', error);
                        toast.error('Kayıt hatası: ' + error.message);
                        saveResult = false;
                      }
                      
                      // If we have a pending approval action and save was successful, approve the request
                      if (saveResult && stateSnapshot.pendingApprovalAction && stateSnapshot.selectedRequest) {
                        console.log("Sadece Kaydet: Pending approval action detected, approving request");

                        // Generate the actual stok_kodu that was used during database save
                        const capFormatted = Math.round(parseFloat(stateSnapshot.mmData.cap) * 100).toString().padStart(4, '0');
                        const actualStokKodu = generateMmStokKodu(stateSnapshot.mmData.product_type, stateSnapshot.mmData.cap, actualSequence);
                        console.log(`🎯 [Queue Approval] Using captured sequence: ${actualSequence} for stok_kodu: ${actualStokKodu}`);

                        // Check what action was pending
                        const isApproval = stateSnapshot.pendingApprovalAction === 'approve';
                        const isEdit = stateSnapshot.pendingApprovalAction === 'edit';
                        
                        const updateRequestData = {
                          status: 'approved',
                          processed_by: user?.username || user?.id || 'system',
                          processed_at: new Date().toISOString(),
                          stok_kodu: actualStokKodu // Update with the actual stok_kodu used in database
                        };
                        
                        try {
                          console.log(`🎯 [Queue Approval] Updating request ${stateSnapshot.selectedRequest.id} with actualStokKodu: ${actualStokKodu}`);
                          const updateResponse = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${stateSnapshot.currentRequestId}`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(updateRequestData)
                          });
                          
                          if (updateResponse && updateResponse.ok) {
                            // Show appropriate success message
                            if (isApproval) {
                              toast.success('Talep başarıyla onaylandı');
                            } else if (isEdit) {
                              toast.success('Talep başarıyla düzenlendi ve onaylandı');
                            }
                            
                            // Reset states
                            setIsEditingRequest(false);
                            setPendingApprovalAction(null);
                            setIsRequestUsed(false); // Clear the used flag to remove status message
                            
                            // Refresh requests list to update status from 'işleniyor' to 'onaylandı'
                            setTimeout(async () => {
                              await fetchRequests();
                            }, 500);
                            
                            // ✅ Return success with excel data since both save and approval succeeded
                            const capFormatted = Math.round(parseFloat(stateSnapshot.mmData.cap) * 100).toString().padStart(4, '0');
                            const finalStokKodu = generateMmStokKodu(stateSnapshot.mmData.product_type, stateSnapshot.mmData.cap, actualSequence);

                            // Get signed tolerance values for Excel generation from snapshot
                            const adjustedPlus = stateSnapshot.toleransMaxSign === '+' ? stateSnapshot.mmData.tolerans_plus : `-${stateSnapshot.mmData.tolerans_plus}`;
                            const adjustedMinus = stateSnapshot.toleransMinSign === '-' ? `-${stateSnapshot.mmData.tolerans_minus}` : stateSnapshot.mmData.tolerans_minus;

                            const excelData = {
                              stok_kodu: finalStokKodu,
                              kod_2: stateSnapshot.mmData.kod_2,
                              cap: stateSnapshot.mmData.cap,
                              sequence: actualSequence,
                              mmData: { ...stateSnapshot.mmData, stok_kodu: finalStokKodu, tolerans_plus: adjustedPlus, tolerans_minus: adjustedMinus },
                              selectedYmSts: [...stateSnapshot.selectedYmSts],
                              autoGeneratedYmSts: [...stateSnapshot.autoGeneratedYmSts],
                              mainYmStIndex: stateSnapshot.mainYmStIndex,
                              allRecipes: JSON.parse(JSON.stringify(stateSnapshot.allRecipes)), // Deep clone to avoid reference issues
                              requestId: stateSnapshot.currentRequestId,
                              packaging: { ...stateSnapshot.paketlemeSecenekleri } // Include packaging options
                            };
                            
                            return { success: true, excelData };
                          } else {
                            console.error('Failed to update request status');
                            toast.error('Talep onaylanamadı');
                            // ❌ Return failure since approval failed
                            return { success: false };
                          }
                        } catch (error) {
                          console.error('Error updating request status:', error);
                          toast.error('Talep onaylanamadı: ' + error.message);
                          // ❌ Return failure since approval failed
                          return { success: false };
                        }
                      }
                      
                      // If save was successful, prepare Excel data for instant generation
                      if (saveResult) {
                        const capFormatted = Math.round(parseFloat(stateSnapshot.mmData.cap) * 100).toString().padStart(4, '0');
                        const finalStokKodu = generateMmStokKodu(stateSnapshot.mmData.product_type, stateSnapshot.mmData.cap, actualSequence);

                        // Get signed tolerance values for Excel generation from snapshot
                        const adjustedPlus = stateSnapshot.toleransMaxSign === '+' ? stateSnapshot.mmData.tolerans_plus : `-${stateSnapshot.mmData.tolerans_plus}`;
                        const adjustedMinus = stateSnapshot.toleransMinSign === '-' ? `-${stateSnapshot.mmData.tolerans_minus}` : stateSnapshot.mmData.tolerans_minus;

                        const excelData = {
                          stok_kodu: finalStokKodu,
                          kod_2: stateSnapshot.mmData.kod_2,
                          cap: stateSnapshot.mmData.cap,
                          sequence: actualSequence,
                          mmData: { ...stateSnapshot.mmData, stok_kodu: finalStokKodu, tolerans_plus: adjustedPlus, tolerans_minus: adjustedMinus },
                          selectedYmSts: [...stateSnapshot.selectedYmSts],
                          autoGeneratedYmSts: [...stateSnapshot.autoGeneratedYmSts],
                          mainYmStIndex: stateSnapshot.mainYmStIndex,
                          allRecipes: JSON.parse(JSON.stringify(stateSnapshot.allRecipes)), // Deep clone to avoid reference issues
                          requestId: stateSnapshot.currentRequestId,
                          packaging: { ...stateSnapshot.paketlemeSecenekleri } // Include packaging options
                        };

                        console.log(`✅ Excel data prepared from snapshot for ${finalStokKodu}`);
                        return { success: true, excelData };
                      }
                      
                      // If no approval action, return the save result
                      return { success: saveResult };
                    }, taskId);
                    
                    // Start processing queue
                    processTaskQueue();
                  }}
                  disabled={isLoadingRecipes}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sadece Kaydet (Kuyruğa Al)
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* YM ST Reçete Modalı (Standalone - Filmaşinden YM ST) */}
      {showYmStReceteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Coiler Reçete Oluştur
                </h2>
                <button
                  onClick={() => setShowCoilerReceteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-gray-600 mb-4">
                  İnce çaplı YM ST ürünleri (0.8mm-1.8mm) için kalın YM ST malzemesi kullanarak Coiler reçetesi oluşturun.
                </p>

                {/* Target YM ST Input - Only diameter */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Hedef Ürün Çapı (mm) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={coilerTargetDiameter}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '.');
                      setCoilerTargetDiameter(value);
                    }}
                    placeholder="1.2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">İzin verilen aralık: 0.8mm - 1.8mm</p>

                  {/* Validation feedback */}
                  {coilerTargetDiameter && (() => {
                    const validation = validateCoilerTargetInputs();
                    if (!validation.valid) {
                      return (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          {validation.errors.map((error, index) => (
                            <div key={index}>• {error}</div>
                          ))}
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                          ✓ Oluşturulacak Stok Kodu: {validation.targetStokKodu}
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Source YM ST Selection - Multiple */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Hammadde Siyah Tel * (Birden fazla seçebilirsiniz)
                  </label>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={coilerSourceYmStSearch}
                      onChange={(e) => setCoilerSourceYmStSearch(e.target.value)}
                      placeholder="YM ST ara... (stok kodu, çap, filmaşin, kalite)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <svg className="absolute right-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Source YM ST Dropdown - Multiple Selection */}
                  <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                    {getFilteredSourceYmSts().length === 0 ? (
                      <div className="p-3 text-gray-500 text-sm">
                        {existingYmSts.length === 0 ? 'YM ST veritabanı yükleniyor...' : 'Arama kriterine uygun YM ST bulunamadı'}
                      </div>
                    ) : (
                      getFilteredSourceYmSts().map((ymSt) => {
                        const isSelected = coilerSourceYmSts.some(s => s.id === ymSt.id);
                        return (
                          <div
                            key={ymSt.id}
                            onClick={() => toggleSourceYmStSelection(ymSt)}
                            className={`p-3 cursor-pointer border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                              isSelected ? 'bg-blue-100 border-blue-300' : ''
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-sm">{ymSt.stok_kodu}</div>
                                <div className="text-xs text-gray-600">
                                  Çap: {ymSt.cap}mm | Filmaşin: {ymSt.filmasin}mm | Kalite: {ymSt.quality}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSelected && (
                                  <>
                                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                                      {coilerSourceYmSts.findIndex(s => s.id === ymSt.id) + 1}
                                    </span>
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Selected YM STs Summary */}
                  {coilerSourceYmSts.length > 0 && (
                    <div className="text-xs p-2 bg-blue-50 rounded space-y-1">
                      <div className="font-semibold text-blue-700">Seçilen Hammaddeler ({coilerSourceYmSts.length}):</div>
                      {coilerSourceYmSts.map((ymSt, index) => (
                        <div key={ymSt.id} className="text-blue-600">
                          {index + 1}. {ymSt.stok_kodu} ({ymSt.cap}mm)
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCoilerReceteModal(false);
                      setCoilerTargetDiameter('');
                      setCoilerSourceYmSts([]);
                      setCoilerSourceYmStSearch('');
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={generateCoilerExcel}
                    disabled={isGeneratingCoilerExcel || !coilerTargetDiameter || coilerSourceYmSts.length === 0}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isGeneratingCoilerExcel ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Coiler Exceli Oluştur
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YM ST Reçete Modalı (Standalone - Filmaşinden YM ST) */}
      {showYmStReceteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  YM ST Reçete Oluştur (Filmaşinden)
                </h2>
                <button
                  onClick={() => {
                    setShowYmStReceteModal(false);
                    setYmStReceteList([]);
                    setNewYmStRecete({ cap: '', filmasin: '', quality: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-gray-600">
                  Filmaşinden üretilen YM ST (Siyah Tel) ürünleri için Stok Kartı ve Reçete Excel dosyaları oluşturun.
                </p>

                {/* Add YM ST Form */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">YM ST Ekle</h3>

                  <div className="grid grid-cols-3 gap-4">
                    {/* YM ST Çap */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        YM ST Çapı (mm) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={newYmStRecete.cap}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, '.');
                          setNewYmStRecete(prev => ({ ...prev, cap: value }));
                        }}
                        placeholder="3.08"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    {/* Filmaşin Text Field */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Filmaşin Çapı (mm) *
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={newYmStRecete.filmasin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, '.');
                          setNewYmStRecete(prev => ({ ...prev, filmasin: value }));
                        }}
                        placeholder="6.0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    {/* Kalite Dropdown */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Kalite *
                      </label>
                      <select
                        value={newYmStRecete.quality}
                        onChange={(e) => setNewYmStRecete(prev => ({ ...prev, quality: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Seçin</option>
                        <option value="1005">1005</option>
                        <option value="1006">1006</option>
                        <option value="1008">1008</option>
                        <option value="1010">1010</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={addYmStToReceteList}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Listeye Ekle
                  </button>
                </div>

                {/* YM ST List */}
                {ymStReceteList.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Eklenecek YM ST Listesi ({ymStReceteList.length})
                    </h3>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-60 overflow-y-auto">
                      {ymStReceteList.map((ymSt, index) => (
                        <div
                          key={ymSt.stok_kodu}
                          className="p-3 hover:bg-gray-50 transition-colors flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium text-sm">{ymSt.stok_kodu}</div>
                            <div className="text-xs text-gray-600">{ymSt.stok_adi}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Çap: {ymSt.cap}mm | Filmaşin: {ymSt.filmasin}mm | Kalite: {ymSt.quality}
                            </div>
                          </div>
                          <button
                            onClick={() => removeYmStFromReceteList(ymSt.stok_kodu)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Listeden çıkar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowYmStReceteModal(false);
                      setYmStReceteList([]);
                      setNewYmStRecete({ cap: '', filmasin: '', quality: '' });
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={generateYmStReceteExcel}
                    disabled={isGeneratingYmStExcel || ymStReceteList.length === 0}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isGeneratingYmStExcel ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Excel Oluştur
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YM ST Ekleme Modalı */}
      {/* Talepler Modalı */}
      {showRequestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Tavlı Tel / Balya Teli Talepleri
                </h2>
                <div className="flex gap-3">
                  {/* Excel Disari Aktarma Butonlari */}
                  <div className="relative">
                    <button
                      onClick={() => setShowBulkExcelMenu(!showBulkExcelMenu)}
                      disabled={isExportingExcel}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      title="Toplu Excel oluşturma seçenekleri"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {isExportingExcel ? 'İşleniyor...' : 'Toplu Excel Oluştur'}
                      <svg className={`w-4 h-4 transition-transform ${showBulkExcelMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showBulkExcelMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            setShowBulkExcelMenu(false);
                            downloadTodaysApprovedExcel();
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
                        >
                          <div className="font-medium">Bugün Onaylananları İndir</div>
                          <div className="text-sm text-gray-500">Sadece bugün onaylanan talepler</div>
                        </button>
                        
                        <button
                          onClick={() => {
                            console.log('Session approvals before download:', sessionApprovals);
                            setShowBulkExcelMenu(false);
                            downloadSessionApprovedExcel();
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50"
                        >
                          <div className="font-medium">Bu Oturumda Onaylananları İndir</div>
                          <div className="text-sm text-gray-500">{sessionApprovals.length} talep</div>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={exportSelectedToExcel}
                    disabled={isExportingExcel || selectedRequestIds.length === 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`${selectedRequestIds.filter(id => requests.find(r => r.id === id)?.status === 'approved').length} seçili onaylanmış talebi Excel'e aktar`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isExportingExcel ? 'İşleniyor...' : `Seçili Onaylanmışlar Excel (${selectedRequestIds.filter(id => requests.find(r => r.id === id)?.status === 'approved').length})`}
                  </button>
                  
                  {/* Bulk Delete Button */}
                  {selectedRequestIds.length > 0 && (
                    <button
                      onClick={handleBulkDeleteRequests}
                      disabled={isDeletingBulk || isLoading}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`${selectedRequestIds.length} seçili talebi sil`}
                    >
                      {isDeletingBulk ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Siliniyor...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Seçilenleri Sil ({selectedRequestIds.length})
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={fetchRequests}
                    disabled={isLoading || isLoadingRecipes}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Yenile
                  </button>
                  <button
                    onClick={() => setShowRequestsModal(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Filtreleme ve Arama */}
              <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">Ara</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="searchQuery"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Çap, ürün tipi, yağlama tipi, açıklama vb."
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Durum Filtresi</label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="pending">Beklemede</option>
                    <option value="approved">Onaylandı</option>
                    <option value="rejected">Reddedildi</option>
                    <option value="in_progress">İşleniyor</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="silinmis">Silinmiş</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="sortField" className="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
                  <div className="flex space-x-2">
                    <select
                      id="sortField"
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="created_at">Oluşturma Tarihi</option>
                      <option value="updated_at">Onaylanma Tarihi</option>
                      <option value="status">Durum</option>
                      <option value="cap">Çap</option>
                      <option value="product_type">Ürün Tipi</option>
                      <option value="yaglama_tipi">Yağlama Tipi</option>
                      <option value="kg">Ağırlık</option>
                      <option value="cast_kont">Bağ Miktarı</option>
                      <option value="unwinding">Unwinding</option>
                    </select>
                    <button
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"
                      title={sortDirection === 'asc' ? 'Artan' : 'Azalan'}
                    >
                      {sortDirection === 'asc' ? (
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-gray-500 flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Yükleniyor...
                  </div>
                </div>
              ) : getFilteredAndSortedRequests().length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500 text-lg">Talep bulunamadı.</p>
                  {(statusFilter !== 'all' || searchQuery.trim() !== '') && (
                    <button 
                      onClick={() => {
                        setStatusFilter('all');
                        setSearchQuery('');
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Filtrelenmis sonuclar bilgisi gosterimi */}
                  {(statusFilter !== 'all' || searchQuery.trim() !== '') && (
                    <div className="mb-4 text-sm text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {getFilteredAndSortedRequests().length} / {requests.length} talep gösteriliyor
                        {statusFilter !== 'all' && ` (${getStatusText(statusFilter)} durumunda)`}
                        {searchQuery.trim() !== '' && ` "${searchQuery}" arama sonuçları`}
                      </span>
                      <button 
                        onClick={() => {
                          setStatusFilter('all');
                          setSearchQuery('');
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        Filtreleri Temizle
                      </button>
                    </div>
                  )}
                  
                  <table className="w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={
                                selectedRequestIds.length > 0 && 
                                selectedRequestIds.length === getFilteredAndSortedRequests().filter(req => 
                                  req.status === 'approved' || req.status === 'rejected' || req.status === 'pending'
                                ).length &&
                                getFilteredAndSortedRequests().filter(req => 
                                  req.status === 'approved' || req.status === 'rejected' || req.status === 'pending'
                                ).length > 0
                              }
                              onChange={handleSelectAllRequests}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              title="Tüm talepleri seç/kaldır"
                            />
                          </div>
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          Çap
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          Tip
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Yağlama
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          Mukavemet
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          Ağırlık
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Unwinding
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Durum
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Tarih
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Talep Eden
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          İşleyen
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          İşlem
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredAndSortedRequests().map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedRequestIds.includes(request.id)}
                                onChange={() => handleToggleRequestSelection(request.id)}
                                disabled={request.status !== 'approved' && request.status !== 'rejected' && request.status !== 'pending' && request.status !== 'silinmis'}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title={
                                  request.status === 'approved' || request.status === 'rejected' || request.status === 'pending' || request.status === 'silinmis'
                                    ? 'Bu talebi seç/kaldır' 
                                    : 'Bu talep seçilemez'
                                }
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                            {parseFloat(request.cap || 0)}mm
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                              request.product_type === 'TAVLI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {request.product_type === 'TAVLI' ? 'Tavlı' : 'Balya'}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {request.yaglama_tipi || 'Yağsız'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {parseFloat(request.min_mukavemet || 0)}-{parseFloat(request.max_mukavemet || 0)}MPa
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {parseFloat(request.kg || 0)}kg
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {(request.unwinding || 'Anti-Clockwise').slice(0, 8)}...
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-1 py-0.5 text-xs font-medium rounded border ${getStatusBadgeColor(request.status, request.id)}`}>
                                {getStatusText(request.status, request.id).slice(0, 6)}
                              </span>
                              {/* Queue indicator removed for safety */}
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {formatDate(request.created_at)?.slice(0, 8)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {getUsernameById(request.created_by)?.slice(0, 8)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {getUsernameById(request.processed_by)?.slice(0, 8)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSelectRequest(request)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                disabled={request.status === 'rejected'}
                                title={request.status === 'rejected' ? 'Reddedilmiş talepler kullanılamaz' : 'Talebi görüntüle'}
                              >
                                Detay
                              </button>
                              {(request.status === 'pending' || request.status === 'in_progress') && (
                                <button
                                  onClick={() => {
                                    // If request is in queue, remove it from queue first
                                    if (isRequestInQueue(request.id)) {
                                      setTaskQueue(prev => prev.filter(t => !t.name.includes(request.id)));
                                      taskQueueRef.current = taskQueueRef.current.filter(t => !t.name.includes(request.id));
                                    }
                                    const confirmMessage = request.status === 'in_progress' 
                                      ? 'Bu "İşleniyor" durumundaki talebi silmek istediğinizden emin misiniz?' 
                                      : 'Bu talebi silmek istediğinizden emin misiniz?';
                                    if (window.confirm(confirmMessage)) {
                                      deleteRequest(request.id);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title={
                                    request.status === 'in_progress' 
                                      ? 'İşleniyor durumundaki talebi sil' 
                                      : (isRequestInQueue(request.id) ? 'İşlem kuyruğundan çıkarılacak ve silinecek' : 'Talebi sil')
                                  }
                                >
                                  Sil
                                </button>
                              )}
                              {request.status === 'approved' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('Bu onaylanmış talebi silmek istediğinizden emin misiniz?\n\nBu ürünler zaten veritabanına kaydedilmiş olabilir. Onaylanmış talepleri takip etmek istiyorsanız bu kayıtları saklamanız önerilir.')) {
                                      deleteRequest(request.id);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Onaylanmış talebi sil"
                                  disabled={isLoading || isLoadingRecipes}
                                >
                                  Sil
                                </button>
                              )}
                              {request.status === 'rejected' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('Bu reddedilmiş talebi silmek istediğinizden emin misiniz?')) {
                                      deleteRequest(request.id);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Reddedilmiş talebi sil"
                                  disabled={isLoading || isLoadingRecipes}
                                >
                                  Sil
                                </button>
                              )}
                              {request.status === 'silinmis' && (
                                <button
                                  onClick={() => permanentlyDeleteRequest(request)}
                                  className="text-red-700 hover:text-red-900 transition-colors"
                                  title="Kalıcı Sil (Veritabanından Sil)"
                                  disabled={isLoading || isLoadingRecipes}
                                >
                                  Kalıcı Sil
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Talep Detay Modalı */}
      {showRequestDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Talep Detayları
                </h2>
                <button
                  onClick={() => setShowRequestDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <p className="text-blue-700 text-sm">
                  Bu talebi düzenleyebilir, onaylayabilir veya reddedebilirsiniz. Onayladığınızda talep "onaylandı" olarak işaretlenecek ve hesaplamalar için kullanılacaktır.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Sol sütun */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Talep ID</p>
                    <p className="text-base text-gray-900">{selectedRequest.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Stok Kodu</p>
                    <p className="text-base text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                      {selectedRequest.stok_kodu || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Durum</p>
                    <p className={`px-2 py-1 text-xs inline-flex items-center font-medium rounded-full border ${
                      selectedRequest.status === 'silinmis' 
                        ? 'bg-red-100 text-red-800 border-red-200' 
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      {selectedRequest.status === 'pending' ? 'Beklemede' : 
                       selectedRequest.status?.toString().toLowerCase().trim() === 'approved' ? 'Onaylandı' : 
                       selectedRequest.status === 'rejected' ? 'Reddedildi' : 
                       selectedRequest.status === 'in_progress' ? 'İşleniyor' : 
                       selectedRequest.status === 'completed' ? 'Tamamlandı' : 
                       selectedRequest.status === 'silinmis' ? 'Silinmiş' :
                       selectedRequest.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tel Çapı</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.cap)} mm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ürün Tipi</p>
                    <p className="text-base text-gray-900">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedRequest.product_type === 'TAVLI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedRequest.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli'}
                      </span>
                      {selectedRequest.yaglama_tipi && ` - ${selectedRequest.yaglama_tipi}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mukavemet</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.min_mukavemet)} - {parseFloat(selectedRequest.max_mukavemet)} MPa</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ağırlık</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.kg)} kg</p>
                  </div>
                </div>
                
                {/* Sağ sütun */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">İç Çap</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.ic_cap)} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dış Çap</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.dis_cap)} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tolerans</p>
                    <p className="text-base text-gray-900">
                      {(() => {
                        // Apply mathematical correction to display tolerance values correctly
                        const plusValue = parseFloat(selectedRequest.tolerans_plus) || 0;
                        const minusValue = parseFloat(selectedRequest.tolerans_minus) || 0;
                        const maxSign = selectedRequest.tolerans_max_sign || '+';
                        const minSign = selectedRequest.tolerans_min_sign || '-';
                        
                        // Apply signs to get actual values
                        const actualPlusValue = maxSign === '-' ? -Math.abs(plusValue) : Math.abs(plusValue);
                        const actualMinusValue = minSign === '-' ? -Math.abs(minusValue) : Math.abs(minusValue);
                        
                        // Determine which is mathematically higher/lower
                        const higherValue = Math.max(actualPlusValue, actualMinusValue);
                        const lowerValue = Math.min(actualPlusValue, actualMinusValue);
                        
                        // Format with proper signs
                        const lowerText = lowerValue >= 0 ? `+${lowerValue.toFixed(2)}` : lowerValue.toFixed(2);
                        const higherText = higherValue >= 0 ? `+${higherValue.toFixed(2)}` : higherValue.toFixed(2);
                        
                        return `${lowerText} mm / ${higherText} mm`;
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Paketleme Seçenekleri</p>
                    <div className="text-base text-gray-900">
                      {(() => {
                        const packaging = [];
                        
                        // Extract packaging info from stok_adi if available (new format)
                        if (selectedRequest.stok_adi) {
                          if (selectedRequest.stok_adi.includes('-Shrink')) packaging.push('Shrink');
                          if (selectedRequest.stok_adi.includes('-Plt')) packaging.push('Paletli');
                          if (selectedRequest.stok_adi.includes('-Krt')) packaging.push('Karton');
                        }
                        
                        // Fallback to legacy shrink field if no packaging suffixes found
                        if (packaging.length === 0 && selectedRequest.shrink) {
                          const shrinkText = selectedRequest.shrink === 'evet' || selectedRequest.shrink === 'Yes' ? 'Shrink' : 'Shrink Yok';
                          packaging.push(shrinkText);
                        }
                        
                        // If still no packaging info, show default
                        if (packaging.length === 0) {
                          packaging.push('Belirtilmemiş');
                        }
                        
                        return packaging.join(', ');
                      })()}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Unwinding</p>
                    <p className="text-base text-gray-900">{selectedRequest.unwinding || 'Anti-Clockwise'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bağ Miktarı</p>
                    <p className="text-base text-gray-900">{selectedRequest.cast_kont || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Helix Kontrol</p>
                    <p className="text-base text-gray-900">{selectedRequest.helix_kont || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Elongation</p>
                    <p className="text-base text-gray-900">{selectedRequest.elongation || '-'}</p>
                  </div>
                </div>
              </div>
              
              {/* Rejection reason and edit notes */}
              {(selectedRequest.rejection_reason || selectedRequest.edit_notes) && (
                <div className="pt-4 border-t border-gray-200">
                  {selectedRequest.rejection_reason && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Reddedilme Sebebi</p>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-900 whitespace-pre-line">{selectedRequest.rejection_reason}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedRequest.edit_notes && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Düzenleme Notları</p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-blue-900 whitespace-pre-line">{selectedRequest.edit_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Change tracking information - show if there are any changes recorded */}
              {(selectedRequest.change_summary || selectedRequest.changed_fields || selectedRequest.original_stok_adi !== selectedRequest.final_stok_adi) && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Üretim Ekibi Tarafından Yapılan Değişiklikler</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      {selectedRequest.change_summary && selectedRequest.change_summary !== 'Değişiklik yok' ? (
                        <p className="text-green-900 mb-2">{selectedRequest.change_summary}</p>
                      ) : null}
                      
                      {selectedRequest.original_stok_adi && selectedRequest.final_stok_adi && 
                       selectedRequest.original_stok_adi !== selectedRequest.final_stok_adi && (
                        <div className="space-y-1 text-sm">
                          <p className="text-green-700"><strong>Orijinal Ürün:</strong> {selectedRequest.original_stok_adi}</p>
                          <p className="text-green-700"><strong>Son Ürün:</strong> {selectedRequest.final_stok_adi}</p>
                        </div>
                      )}
                      
                      {!selectedRequest.change_summary && !selectedRequest.original_stok_adi && (
                        <p className="text-green-900">Bu talep üretim ekibi tarafından düzenlenmiştir.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowRequestDetailModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  İptal
                </button>
                
                <div className="flex gap-3">
                  {/* Show different buttons based on request status */}
                  {selectedRequest.status === 'pending' ? (
                    // Pending status - show all three buttons
                    <>
                      <button
                        onClick={handleEditRequest}
                        className="px-4 py-2 text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 flex items-center"
                      >
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Düzenle
                      </button>
                      
                      <button
                        onClick={handleDetailApproveRequest}
                        disabled={isLoading || isLoadingRecipes}
                        className="px-4 py-2 text-green-700 bg-green-100 rounded-md hover:bg-green-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <svg className="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        Onayla
                      </button>
                      
                      <button
                        onClick={handleOpenRejectModal}
                        disabled={isLoading || isLoadingRecipes}
                        className="px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Reddet
                      </button>
                    </>
                  ) : selectedRequest.status?.toString().toLowerCase().trim() === 'approved' ? (
                    // Approved status - show edit saved product button
                    <button
                      onClick={async () => {
                        // Find the saved product using multiple methods with priority order
                        let foundProduct = null;
                        
                        try {
                          setIsLoading(true);
                          
                          // Method 1: Try with stok_kodu (most reliable)
                          if (selectedRequest.stok_kodu && !foundProduct) {
                            console.log('Trying to find product by stok_kodu:', selectedRequest.stok_kodu);
                            const response = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_kodu=${selectedRequest.stok_kodu}`);
                            if (response && response.ok) {
                              const products = await response.json();
                              if (products && products.length > 0) {
                                foundProduct = products[0];
                                console.log('Found product by stok_kodu');
                              }
                            }
                          }
                          
                          // Method 2: Try with final_stok_adi if available (for edited products)
                          if (!foundProduct && selectedRequest.final_stok_adi) {
                            console.log('Trying to find product by final_stok_adi:', selectedRequest.final_stok_adi);
                            const response = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_adi=${encodeURIComponent(selectedRequest.final_stok_adi)}`);
                            if (response && response.ok) {
                              const products = await response.json();
                              if (products && products.length > 0) {
                                foundProduct = products[0];
                                console.log('Found product by final_stok_adi');
                              }
                            }
                          }
                          
                          // Method 3: Try with original stok_adi as fallback
                          if (!foundProduct && selectedRequest.stok_adi) {
                            console.log('Trying to find product by stok_adi:', selectedRequest.stok_adi);
                            const response = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?stok_adi=${encodeURIComponent(selectedRequest.stok_adi)}`);
                            if (response && response.ok) {
                              const products = await response.json();
                              if (products && products.length > 0) {
                                foundProduct = products[0];
                                console.log('Found product by original stok_adi');
                              }
                            }
                          }
                          
                          // Method 4: Use final_product_key to match based on product characteristics
                          if (!foundProduct && selectedRequest.final_product_key) {
                            console.log('Trying to find product by product key characteristics');
                            try {
                              const productKey = JSON.parse(selectedRequest.final_product_key);
                              // Build query parameters from product key
                              const queryParams = new URLSearchParams();
                              if (productKey.cap) queryParams.append('cap', productKey.cap);
                              if (productKey.kod_2) queryParams.append('kod_2', productKey.kod_2);
                              if (productKey.kalinlik) queryParams.append('kalinlik', productKey.kalinlik);
                              
                              const response = await fetchWithAuth(`${API_URLS.tavliBalyaMm}?${queryParams.toString()}`);
                              if (response && response.ok) {
                                const products = await response.json();
                                if (products && products.length > 0) {
                                  // Find the best match based on more characteristics
                                  foundProduct = products.find(p => 
                                    p.cap === productKey.cap && 
                                    p.kod_2 === productKey.kod_2 &&
                                    p.kalinlik === productKey.kalinlik
                                  ) || products[0];
                                  console.log('Found product by product key characteristics');
                                }
                              }
                            } catch (keyError) {
                              console.warn('Error parsing final_product_key:', keyError);
                            }
                          }
                          
                          if (foundProduct) {
                            // Close the request detail modal
                            setShowRequestDetailModal(false);
                            // Set editing existing product flag
                            setIsEditingExistingProduct(true);
                            // Load the product for editing
                            handleSelectExistingMmGt(foundProduct);
                          } else {
                            toast.error('Kaydedilmiş ürün bulunamadı. Ürün silinmiş olabilir veya farklı parametrelerle kaydedilmiş olabilir.');
                          }
                        } catch (error) {
                          console.error('Error loading saved product:', error);
                          toast.error('Ürün yüklenirken hata oluştu');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading}
                      className="px-4 py-2 text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <svg className="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                      Kaydedilmiş Ürünü Düzenle
                    </button>
                  ) : selectedRequest.status === 'silinmis' ? (
                    // Silinmiş status - show reopen option
                    <button
                      onClick={async () => {
                        if (window.confirm('Bu silinmiş talebi yeniden açmak istediğinizden emin misiniz?\n\nTalep "Beklemede" durumuna geçecek ve tekrar işlenebilir hale gelecektir.')) {
                          try {
                            setIsLoading(true);
                            await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${selectedRequest.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'pending' })
                            });
                            
                            // Update local state
                            setRequests(prev => prev.map(req => 
                              req.id === selectedRequest.id 
                                ? { ...req, status: 'pending' }
                                : req
                            ));
                            
                            setSelectedRequest(prev => ({ ...prev, status: 'pending' }));
                            toast.success('Talep başarıyla yeniden açıldı');
                          } catch (error) {
                            console.error('Error reopening request:', error);
                            toast.error('Talep yeniden açılırken hata oluştu');
                          } finally {
                            setIsLoading(false);
                          }
                        }
                      }}
                      disabled={isLoading}
                      className="px-4 py-2 text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <svg className="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      Talebi Yeniden Aç
                    </button>
                  ) : (
                    // Rejected or other status - no action buttons
                    null
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reddetme Nedeni Modalı */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Talebi Reddetme Nedeni
                </h2>
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-1">
                  Ret Nedeni
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Talebi neden reddettiğinizi açıklayın..."
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleDetailRejectConfirm}
                  disabled={isLoading || !rejectionReason.trim()}
                  className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <svg className="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  Talebi Reddet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Düzenleme Nedeni Modalı */}
      {showEditReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Düzenleme Nedeni
                </h2>
                <button
                  onClick={() => {
                    setShowEditReasonModal(false);
                    setEditReason('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <label htmlFor="editReason" className="block text-sm font-medium text-gray-700 mb-1">
                  Düzenleme Nedeni
                </label>
                <textarea
                  id="editReason"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  rows={4}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Talebi neden düzenlediğinizi açıklayın..."
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditReasonModal(false);
                    setEditReason('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleEditReasonConfirm}
                  disabled={isLoading || !editReason.trim()}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <svg className="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Düzenle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Ürün Düzenleme Onay Modalı */}
      {showEditConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Değişiklik Onayı
                </h2>
                <button
                  onClick={() => setShowEditConfirmModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Aşağıdaki alanlar değiştirildi ve veritabanında güncellenecek:
                </p>
                
                {changedFields.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-2 font-medium text-gray-700">Alan</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-700">Eski Değer</th>
                          <th className="text-left py-2 px-2 font-medium text-gray-700">Yeni Değer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changedFields.map((change, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2 px-2 text-gray-600">{change.field}</td>
                            <td className="py-2 px-2 text-red-600">{change.oldValue}</td>
                            <td className="py-2 px-2 text-green-600">{change.newValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <p className="mt-4 text-gray-700">
                  Bu değişiklikleri onaylıyor ve Excel oluşturmak istiyor musunuz?
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditConfirmModal(false);
                    // If there's a queue resolve function waiting, call it with cancel
                    if (window.editConfirmResolve) {
                      window.editConfirmResolve(false);
                      window.editConfirmResolve = null;
                    }
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleEditConfirm}
                  disabled={isLoading}
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <svg className="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Değişiklikleri Kaydet ve Excel Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Database Detail Modal */}
      {showDatabaseDetailModal && selectedDatabaseProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Ürün Detayları
                </h2>
                <button
                  onClick={() => {
                    setShowDatabaseDetailModal(false);
                    setSelectedDatabaseProduct(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Product Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Stok Kodu</p>
                    <p className="text-base text-gray-900">{selectedDatabaseProduct.stok_kodu || 'Belirtilmemiş'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tel Çapı</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedDatabaseProduct.cap || 0)} mm</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ürün Tipi</p>
                    <p className="text-base text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedDatabaseProduct.product_type === 'TAVLI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedDatabaseProduct.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli'}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500">Yağlama Tipi</p>
                    <p className="text-base text-gray-900">{selectedDatabaseProduct.yaglama_tipi || 'Yağsız'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ağırlık</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedDatabaseProduct.kg || 0)} kg</p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mukavemet</p>
                    <p className="text-base text-gray-900">
                      {parseFloat(selectedDatabaseProduct.min_mukavemet || 0)}-{parseFloat(selectedDatabaseProduct.max_mukavemet || 0)} MPa
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">İç Çap</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedDatabaseProduct.ic_cap || 0)} mm</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dış Çap</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedDatabaseProduct.dis_cap || 0)} mm</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tolerans</p>
                    <p className="text-base text-gray-900">
                      {selectedDatabaseProduct.tolerance_plus && selectedDatabaseProduct.tolerance_minus ? (
                        <>
                          +{selectedDatabaseProduct.tolerance_plus} / -{selectedDatabaseProduct.tolerance_minus}
                        </>
                      ) : (
                        'Belirtilmemiş'
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Oluşturulma</p>
                    <p className="text-base text-gray-900">
                      {selectedDatabaseProduct.created_at ? 
                        new Date(selectedDatabaseProduct.created_at).toLocaleDateString('tr-TR') : 
                        'Belirtilmemiş'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDatabaseDetailModal(false);
                    setSelectedDatabaseProduct(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Kapat
                </button>
                <button
                  onClick={() => {
                    setShowDatabaseDetailModal(false);
                    handleSelectExistingMmGt(selectedDatabaseProduct);
                  }}
                  className="px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Kaydedilmiş Ürünü Düzenle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mevcut MM TT / YM ST Modalı */}
      {showExistingMmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Veritabanı
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      fetchExistingMmGts();
                      fetchExistingYmSts();
                    }}
                    disabled={isLoading || isLoadingRecipes}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Yenile
                  </button>

                  <button
                    onClick={() => generateBulkExcelFromDatabase()}
                    disabled={isExportingExcel}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg flex items-center gap-2 hover:bg-teal-700 transition-colors shadow-sm disabled:bg-gray-400"
                  >
                    <svg className={`w-4 h-4 ${isExportingExcel ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Tüm Ürünler Excel
                  </button>
                  
                  <button
                    onClick={() => setShowExistingMmModal(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Tab'lar */}
              <div className="flex gap-4 mb-6 border-b">
                <button
                  onClick={() => setActiveDbTab('mm')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeDbTab === 'mm'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  MM Ürünler
                </button>
                <button
                  onClick={() => setActiveDbTab('ymst')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeDbTab === 'ymst'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  YM ST (Ham Madde)
                </button>
              </div>
              
              {/* Filtreleme ve Toplu İşlem Bölümü */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  {/* Arama */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
                    <input
                      type="text"
                      placeholder="Stok kodu, çap, ürün tipi..."
                      value={dbSearchQuery}
                      onChange={(e) => setDbSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  {/* Çap Filtresi */}
                  <div className="min-w-[120px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Çap</label>
                    <input
                      type="text"
                      placeholder="Çap değeri"
                      value={dbCapFilter}
                      onChange={(e) => setDbCapFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  {/* Ürün Tipi Filtresi (sadece Tavlı/Balya için) */}
                  {activeDbTab === 'mm' && (
                    <div className="min-w-[120px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Tipi</label>
                      <select
                        value={dbProductTypeFilter}
                        onChange={(e) => setDbProductTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="all">Tümü</option>
                        <option value="TAVLI">Tavlı Tel</option>
                        <option value="BALYA">Balya Teli</option>
                      </select>
                    </div>
                  )}
                  
                  {/* Sıralama */}
                  <div className="min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
                    <select
                      value={dbSortField}
                      onChange={(e) => setDbSortField(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="cap">Çap</option>
                      <option value="product_type">{activeDbTab === 'mm' ? 'Ürün Tipi' : 'Kalite'}</option>
                      <option value="yaglama_tipi">{activeDbTab === 'mm' ? 'Yağlama Tipi' : 'Filmaşin'}</option>
                      <option value="created_at">Oluşturma Tarihi</option>
                    </select>
                  </div>
                  
                  {/* Sıralama Yönü */}
                  <div className="min-w-[120px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yön</label>
                    <select
                      value={dbSortDirection}
                      onChange={(e) => setDbSortDirection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="asc">Artan (A-Z, 1-9)</option>
                      <option value="desc">Azalan (Z-A, 9-1)</option>
                    </select>
                  </div>
                  
                  {/* Filtreleri Temizle */}
                  <div className="min-w-[100px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                    <button
                      onClick={() => {
                        setDbSearchQuery('');
                        setDbCapFilter('');
                        setDbProductTypeFilter('all');
                        setDbSortField('cap');
                        setDbSortDirection('asc');
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Temizle
                    </button>
                  </div>
                </div>
                
                {/* Toplu İşlemler */}
                {selectedDbItems.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <span className="text-blue-700 font-medium">
                      {selectedDbItems.length} ürün seçili
                    </span>
                    <button
                      onClick={handleBulkDelete}
                      disabled={isDeletingBulkDb}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 transition-colors flex items-center gap-2"
                    >
                      {isDeletingBulkDb ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Siliniyor...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Seçilileri Sil
                        </>
                      )}
                    </button>
                    <button
                      onClick={clearDbSelection}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      Seçimi Temizle
                    </button>
                  </div>
                )}
              </div>
              
              {/* MM TT Tab İçeriği */}
              {activeDbTab === 'mm' && (
                <>
                  {(() => {
                    const filteredMmGts = filterDbProducts(existingMms, 'mm');
                    
                    if (filteredMmGts.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <p className="text-gray-500 text-lg">
                              {existingMms.length === 0 ? 'Mevcut MM TT bulunamadı.' : 'Filtre kriterlerine uygun ürün bulunamadı.'}
                            </p>
                          </div>
                        );
                    }
                    
                    return (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                checked={filteredMmGts.length > 0 && filteredMmGts.every(item => selectedDbItems.includes(item.id))}
                                onChange={() => handleSelectAllDb(filteredMmGts)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stok Kodu
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleDbSort('cap')}
                              title="Çapa göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Çap
                                {dbSortField === 'cap' && (
                                  <span className="text-purple-600">
                                    {dbSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleDbSort('product_type')}
                              title="Ürün tipine göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Ürün Tipi
                                {dbSortField === 'product_type' && (
                                  <span className="text-purple-600">
                                    {dbSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleDbSort('yaglama_tipi')}
                              title="Yağlama tipine göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Yağlama Tipi
                                {dbSortField === 'yaglama_tipi' && (
                                  <span className="text-purple-600">
                                    {dbSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mukavemet
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ağırlık
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              İşlem
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredMmGts.map((mm) => (
                            <tr key={mm.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedDbItems.includes(mm.id)}
                                  onChange={() => handleToggleDbSelection(mm.id)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {mm.stok_kodu || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {parseFloat(mm.cap || 0)} mm
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  mm.product_type === 'TAVLI' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {mm.product_type === 'TAVLI' ? 'Tavlı Tel' : 'Balya Teli'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mm.yaglama_tipi || 'Yağsız'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mm.min_mukavemet || '0'}-{mm.max_mukavemet || '0'} MPa
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mm.kg || '0'} kg
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedDatabaseProduct(mm);
                                      setShowDatabaseDetailModal(true);
                                    }}
                                    className="text-purple-600 hover:text-purple-900 transition-colors"
                                  >
                                    Detay
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(mm, 'mm')}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                  >
                                    Sil
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    );
                  })()}
                </>
              )}
              
              {/* YM ST Tab İçeriği */}
              {activeDbTab === 'ymst' && (
                <>
                  {(() => {
                    const filteredYmSts = filterDbProducts(existingYmSts, 'ymst');
                    
                    if (filteredYmSts.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <p className="text-gray-500 text-lg">
                            {existingYmSts.length === 0 ? 'Mevcut YM ST bulunamadı.' : 'Filtre kriterlerine uygun ürün bulunamadı.'}
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <input
                                type="checkbox"
                                checked={filteredYmSts.length > 0 && filteredYmSts.every(item => selectedDbItems.includes(item.id))}
                                onChange={() => handleSelectAllDb(filteredYmSts)}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stok Kodu
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleDbSort('cap')}
                              title="Çapa göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Çap
                                {dbSortField === 'cap' && (
                                  <span className="text-purple-600">
                                    {dbSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleDbSort('product_type')}
                              title="Ürün tipine göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Ürün Tipi
                                {dbSortField === 'product_type' && (
                                  <span className="text-purple-600">
                                    {dbSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleDbSort('yaglama_tipi')}
                              title="Yağlama tipine göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Yağlama Tipi
                                {dbSortField === 'yaglama_tipi' && (
                                  <span className="text-purple-600">
                                    {dbSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              İşlem
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredYmSts.map((ymSt) => (
                            <tr key={ymSt.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedDbItems.includes(ymSt.id)}
                                  onChange={() => handleToggleDbSelection(ymSt.id)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {ymSt.stok_kodu || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {parseFloat(ymSt.cap || 0)} mm
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {ymSt.filmasin || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {ymSt.quality || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleDeleteClick(ymSt, 'ymst')}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                >
                                  Sil
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    );
                  })()}
                </>
              )}
              
              {/* Tumunu Sil Butonu - Sadece ogeli aktif sekme icin goster */}
              {((activeDbTab === 'mm' && existingMms.length > 0) || 
                (activeDbTab === 'ymst' && existingYmSts.length > 0)) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowDeleteAllConfirm(true)}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Tümünü Sil
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Silme Onayı</h2>
                <button
                  onClick={() => handleDeleteCancel()}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 mb-6">
                {deleteType === 'mm' 
                  ? 'Bu MM TT\'yi ve tüm bağlı verilerini (YM TT\'ler, reçeteler vb.) silmek istediğinizden emin misiniz?'
                  : 'Bu YM ST\'yi ve bağlı reçetelerini silmek istediğinizden emin misiniz?'
                }
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteCancel()}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={() => deleteType === 'mm' ? deleteMmGt(itemToDelete) : deleteYmSt(itemToDelete)}
                  disabled={isLoading || isLoadingRecipes}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tümünü Sil Onay Modalı */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Tümünü Sil Onayı</h2>
                <button
                  onClick={() => {
                    setShowDeleteAllConfirm(false);
                    setDeleteAllConfirmText('');
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                {activeDbTab === 'mm' 
                  ? 'Tüm MM TT ve ilişkili YM TT verilerini ve bunların tüm reçetelerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
                  : 'Tüm YM ST verilerini ve reçetelerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'}
              </p>
              
              <p className="text-red-600 font-medium mb-4">
                Onaylamak için aşağıya <span className="font-bold">"Hepsini Sil"</span> yazın:
              </p>
              
              <input
                type="text"
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                placeholder="Hepsini Sil"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAllConfirm(false);
                    setDeleteAllConfirmText('');
                    setIsLoading(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={isLoading || deleteAllConfirmText !== 'Hepsini Sil'}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Siliniyor...' : 'Tümünü Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tekrar Eden Urun Onay Modali */}
      {showDuplicateConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Mevcut Ürünler Tespit Edildi
                </h2>
                <button
                  onClick={() => {
                    setShowDuplicateConfirmModal(false);
                    setDuplicateProducts([]);
                    setPendingSaveData(null);
                    setIsLoading(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Aynı teknik özelliklere sahip {duplicateProducts.length} adet ürün bulundu. Mevcut ürünlerden birini kullanabilir veya yeni bir varyant oluşturabilirsiniz:
              </p>
              
              <div className="max-h-60 overflow-y-auto mb-6">
                {duplicateProducts.map((product, index) => (
                  <div 
                    key={index} 
                    className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3 cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => {
                      // User clicked on a specific product
                      setShowDuplicateConfirmModal(false);
                      handleSelectExistingMmGt(product);
                      setShowExistingMmModal(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="inline-block bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                          {product.type}
                        </span>
                        <p className="font-medium text-gray-800 mt-1">
                          Stok Kodu: {product.stok_kodu}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stok Adı: {product.stok_adi}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDuplicateConfirmModal(false);
                    setDuplicateProducts([]);
                    setPendingSaveData(null);
                    setIsLoading(false);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  İptal
                </button>
                {duplicateProducts.some(p => p.type === 'YM ST') && (
                  <button
                    onClick={async () => {
                      if (pendingSaveData) {
                        setShowDuplicateConfirmModal(false);
                        
                        // Fetch existing YM STs from database for Excel generation
                        const existingYmStsForExcel = [];
                        for (const duplicate of duplicateProducts.filter(p => p.type === 'YM ST')) {
                          try {
                            const existingYmSt = await checkExistingProduct(API_URLS.galYmSt, duplicate.stok_kodu);
                            if (existingYmSt) {
                              existingYmStsForExcel.push({
                                ...existingYmSt,
                                source: 'database'
                              });
                            }
                          } catch (error) {
                            console.error('Error fetching existing YM ST:', error);
                          }
                        }
                        
                        // Keep non-duplicate YM STs and add existing ones for Excel
                        const ymStsForSave = pendingSaveData.allYmSts.filter(ymSt => 
                          ymSt.source === 'database' || 
                          !duplicateProducts.some(dup => dup.type === 'YM ST' && dup.stok_kodu === ymSt.stok_kodu)
                        );
                        
                        const ymStsForExcel = [
                          ...ymStsForSave,
                          ...existingYmStsForExcel
                        ];
                        
                        // Update the selected YM STs for Excel generation
                        const originalSelectedYmSts = [...selectedYmSts];
                        const originalAutoGeneratedYmSts = [...autoGeneratedYmSts];
                        
                        // Temporarily update YM STs for Excel generation
                        setSelectedYmSts(ymStsForExcel.filter(ym => ym.source === 'database'));
                        setAutoGeneratedYmSts(ymStsForExcel.filter(ym => ym.source !== 'database'));
                        
                        const result = await proceedWithSave(ymStsForSave, pendingSaveData.nextSequence);
                        if (result) {
                          try {
                            toast.info("Excel dosyaları oluşturuluyor...");
                            await generateExcelFiles();
                            toast.success("İşlem başarıyla tamamlandı!");
                          } catch (error) {
                            console.error("Excel generation error:", error);
                            toast.error(`Excel oluşturma hatası: ${error.message}`);
                          }
                        }
                        
                        // Restore original YM ST states
                        setSelectedYmSts(originalSelectedYmSts);
                        setAutoGeneratedYmSts(originalAutoGeneratedYmSts);
                        
                        setDuplicateProducts([]);
                        setPendingSaveData(null);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    YM ST Güncellemeden Devam Et
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YM ST Veritabani Secim Modali */}
      {showYmStSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Kayıtlı YM ST'leri Seç
                </h2>
                <button
                  onClick={() => {
                    setShowYmStSelectionModal(false);
                    setSelectedYmStsForAdd([]);
                    setYmStSearchQuery('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Arama Cubugu */}
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={ymStSearchQuery}
                    onChange={(e) => setYmStSearchQuery(e.target.value)}
                    placeholder="YM ST ara (Stok Kodu, Stok Adı, Çap)..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Islem Butonlari */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500">
                  {selectedYmStsForAdd.length > 0 ? `${selectedYmStsForAdd.length} öğe seçili` : 'Hiç öğe seçilmedi'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedYmStsForAdd([])}
                    disabled={selectedYmStsForAdd.length === 0}
                    className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    Seçimi Temizle
                  </button>
                  <button
                    onClick={async () => {
                      // Add selected YM STs to the main selection
                      const ymStsToAdd = selectedYmStsForAdd.filter(ymSt => 
                        !selectedYmSts.find(selected => selected.stok_kodu === ymSt.stok_kodu)
                      );
                      
                      // Add all YM STs first
                      const newYmSts = ymStsToAdd.map(ymSt => ({ ...ymSt, source: 'database' }));
                      setSelectedYmSts(prev => [...prev, ...newYmSts]);
                      
                      // Close modal and clear selection
                      setShowYmStSelectionModal(false);
                      setSelectedYmStsForAdd([]);
                      setYmStSearchQuery('');
                      
                      // Wait for state update then load recipe data
                      setTimeout(async () => {
                        if (newYmSts.length > 0) {
                          await loadExistingRecipeData(newYmSts);
                        }
                        toast.success(`${ymStsToAdd.length} YM ST eklendi ve reçete verileri yüklendi`);
                      }, 100);
                    }}
                    disabled={selectedYmStsForAdd.length === 0}
                    className="px-4 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    Ekle ({selectedYmStsForAdd.length})
                  </button>
                </div>
              </div>

              {/* YM ST Tablo/Izgara */}
              <div className="max-h-96 overflow-y-auto">
                {allYmStsForSelection.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">YM ST verileri yükleniyor...</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allYmStsForSelection
                      .filter(ymSt => {
                        if (!ymStSearchQuery) return true;
                        const query = ymStSearchQuery.toLowerCase();
                        return (ymSt.stok_kodu || '').toLowerCase().includes(query) ||
                               (ymSt.stok_adi || '').toLowerCase().includes(query) ||
                               (ymSt.cap || '').toString().includes(query);
                      })
                      .map((ymSt, index) => {
                        const isSelected = selectedYmStsForAdd.find(selected => selected.stok_kodu === ymSt.stok_kodu);
                        const isAlreadyInMain = selectedYmSts.find(selected => selected.stok_kodu === ymSt.stok_kodu);

                        // Determine if this is a suggested item
                        // Suggested items are sorted first, so check cap difference
                        const cap = parseFloat(mmData.cap) || 0;
                        const ymStCap = parseFloat(ymSt.cap) || 0;
                        const capDifference = Math.abs(ymStCap - cap);
                        const isSuggested = capDifference <= 0.5;

                        return (
                          <div
                            key={ymSt.id}
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                              isAlreadyInMain
                                ? 'bg-green-50 border-green-300 opacity-50'
                                : isSelected
                                ? 'bg-purple-100 border-purple-500 shadow-lg'
                                : isSuggested
                                ? 'bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400'
                                : 'bg-gray-50 border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                            }`}
                            onClick={() => {
                              if (isAlreadyInMain) return;
                              if (isSelected) {
                                setSelectedYmStsForAdd(prev => prev.filter(item => item.stok_kodu !== ymSt.stok_kodu));
                              } else {
                                setSelectedYmStsForAdd(prev => [...prev, ymSt]);
                              }
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-800 text-xs">{ymSt.stok_kodu || ''}</p>
                                  {isSuggested && !isAlreadyInMain && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      Önerilen
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">{ymSt.stok_adi || ''}</p>
                              </div>
                              <div className={`ml-2 ${isAlreadyInMain ? 'text-green-600' : isSelected ? 'text-purple-600' : 'text-gray-400'}`}>
                                {isAlreadyInMain ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : isSelected ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              <div>
                                <span className="text-gray-500">Çap:</span>
                                <span className="ml-1 font-medium">{ymSt.cap || 'N/A'} mm</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Filmaşin:</span>
                                <span className="ml-1 font-medium">{ymSt.filmasin || 'N/A'}</span>
                              </div>
                            </div>
                            
                            {isAlreadyInMain && (
                              <div className="mt-2 text-xs text-green-600 font-medium">
                                Zaten seçili
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hata ve Başarı Mesajları */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 shadow-sm">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              {error.split('\n').map((line, i) => (
                <div key={i} className={line.startsWith('•') ? 'ml-2' : 'font-medium'}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Urun Catisma Uyari Modali */}
      {showProductConflictModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Ürün Çakışması
                </h2>
                <button
                  onClick={() => {
                    setShowProductConflictModal(false);
                    setConflictProduct(null);
                    setConflictType('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                {conflictType === 'exact' ? (
                  <div className="text-center">
                    <div className="text-red-600 mb-4">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Aynı Ürün Zaten Mevcut</h3>
                    <p className="text-gray-600 mb-4">
                      Bu ürün zaten veritabanında kayıtlı. Mevcut ürünü kullanmak için "Veritabanı" seçeneğini kullanın.
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Mevcut Ürün:</p>
                      <p className="text-sm text-gray-600">{conflictProduct?.stok_kodu}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-orange-500 mb-4">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Benzer Ürün Mevcut</h3>
                    <p className="text-gray-600 mb-4">
                      Bu anahtar özelliklere sahip bir ürün zaten mevcut. Lütfen mevcut ürünü seçin veya ERP Yöneticisine danışın.
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Mevcut Ürün:</p>
                      <p className="text-sm text-gray-600">{conflictProduct?.stok_kodu}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowProductConflictModal(false);
                    setConflictProduct(null);
                    setConflictType('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Tamam
                </button>
                <button
                  onClick={() => {
                    setShowProductConflictModal(false);
                    setConflictProduct(null);
                    setConflictType('');
                    setShowExistingMmModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Veritabanı
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* YMST Zaten Mevcut Modali */}
      {showYmStExistsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mevcut YM ST Ürünleri Bulundu
                </h2>
                <button
                  onClick={() => {
                    setShowYmStExistsModal(false);
                    setExistingYmStsForModal([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  <span className="font-semibold text-blue-600">{existingYmStsForModal.length} adet</span> otomatik oluşturulacak YM ST ürünü zaten veritabanında mevcut:
                </p>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <div className="space-y-2">
                    {existingYmStsForModal.map((ym, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-blue-700">{ym.stok_kodu}</span>
                        <span className="text-gray-600">- {ym.stok_adi}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Mevcut ürünleri kullanmak, kayıtlı reçete verilerini otomatik olarak yükler ve tutarlılığı sağlar.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleGoToYmStSelection}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Kayıtlılardan Seç
                </button>
                <button
                  onClick={handleUseExistingYmSts}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mevcut Ürünleri Kullan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      {/* Excel Generation Progress Modal */}
      {isExportingExcel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <svg className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <h3 className="text-lg font-semibold mb-2">Excel Dosyaları Oluşturuluyor</h3>
              <p className="text-gray-600 mb-4">{excelProgress.operation}</p>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${excelProgress.total > 0 ? (excelProgress.current / excelProgress.total) * 100 : 0}%` }}
                />
              </div>
              
              <p className="text-sm text-gray-500 mb-2">
                {excelProgress.current} / {excelProgress.total} adım
              </p>
              
              {excelProgress.currentProduct && (
                <p className="text-xs text-gray-400 break-words">
                  {excelProgress.currentProduct}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Task Queue Bottom Bar - Calibre Style */}
      {taskQueue.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white z-40 shadow-2xl">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-medium">İşlemler</h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-blue-600 px-2 py-0.5 rounded">
                    {taskQueue.filter(t => t.status === 'processing').length} işleniyor
                  </span>
                  <span className="bg-gray-600 px-2 py-0.5 rounded">
                    {taskQueue.filter(t => t.status === 'pending').length} bekliyor
                  </span>
                  <span className="bg-green-600 px-2 py-0.5 rounded">
                    {taskQueue.filter(t => t.status === 'completed').length} tamamlandı
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTaskQueuePopup(!showTaskQueuePopup)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                <svg className={`w-5 h-5 transition-transform ${showTaskQueuePopup ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              </div>
            </div>
            
            {/* Task Items */}
            <div className={`overflow-hidden transition-all duration-300 ${showTaskQueuePopup ? 'max-h-48' : 'max-h-0'}`}>
              <div className="flex gap-2 overflow-x-auto pb-2 pt-2">
                {taskQueue.map((task) => (
                  <div
                    key={task.id}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm flex items-center gap-2 min-w-[140px] ${
                      task.status === 'completed' ? 'bg-green-600' :
                      task.status === 'processing' ? 'bg-blue-600' :
                      task.status === 'failed' ? 'bg-red-600' :
                      'bg-gray-700'
                    }`}
                  >
                    {task.status === 'processing' && (
                      <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {task.status === 'completed' && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {task.status === 'failed' && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {task.status === 'pending' && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className="truncate">{task.name}</span>
                  </div>
                ))}
              </div>
              
              {/* Clear completed button */}
              {taskQueue.some(t => t.status === 'completed') && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => {
                      // If completion popup is showing, don't allow clearing
                      if (showQueueCompletionPopup) {
                        toast.warning('Önce kuyruk tamamlanma penceresini kapatın');
                        return;
                      }
                      setTaskQueue(prev => prev.filter(t => t.status !== 'completed'));
                      taskQueueRef.current = taskQueueRef.current.filter(t => t.status !== 'completed');
                    }}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Tamamlananları Temizle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Change Preview Modal for Edit Mode */}
      {showChangePreviewModal && pendingChanges && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Değişiklik Önizlemesi
                </h2>
                <button
                  onClick={() => {
                    setShowChangePreviewModal(false);
                    setPendingChanges(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
                {pendingChanges.changes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Değişiklik Bulunamadı</h3>
                    <p className="text-gray-500">Hiçbir alan değiştirilmemiş. Sadece Excel dosyaları oluşturulacak.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gray-50 border-l-4 border-gray-400 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Stok Kodu:</span>
                        <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                          {selectedExistingMm?.stok_kodu || 'Bilinmiyor'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        <strong>Not:</strong> Stok kodu değiştirilemez ve korunur.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-4">Değişen Alanlar ({pendingChanges.changes.length})</h3>
                      <div className="space-y-4">
                        {pendingChanges.changes.map((change, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-700">{change.field}</h4>
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                Değiştirildi
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs text-gray-500 block mb-1">Eski Değer:</span>
                                <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-red-800">
                                  {change.oldValue || 'Boş'}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 block mb-1">Yeni Değer:</span>
                                <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-green-800">
                                  {change.newValue || 'Boş'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowChangePreviewModal(false);
                    setPendingChanges(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    try {
                      setShowChangePreviewModal(false);
                      setIsLoading(true);
                      
                      if (pendingChanges.changes.length > 0) {
                        // Update existing product directly - NO queue system needed for editing
                        const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
                        
                        // Extract existing sequence from the existing product's stok_kodu
                        const existingStokKodu = selectedExistingMm.stok_kodu;
                        const sequencePart = existingStokKodu.split('.').pop(); // Get last part (e.g., "00")
                        const existingSequence = parseInt(sequencePart); // Convert to number
                        
                        console.log('🔄 Updating existing product:', {
                          existingStokKodu,
                          extractedSequence: existingSequence,
                          productId: selectedExistingMm.id
                        });
                        
                        // Update existing product using existing sequence (no new product creation)
                        const saveResult = await proceedWithSave(allYmSts, existingSequence);
                        
                        if (saveResult) {
                          await generateExcelFiles();
                          toast.success("Ürün güncellendi ve Excel dosyaları oluşturuldu!");
                        }
                      } else {
                        // No changes, just generate Excel
                        await generateExcelFiles();
                        toast.success("Excel dosyaları oluşturuldu!");
                      }
                      
                      setPendingChanges(null);
                      setIsLoading(false);
                    } catch (error) {
                      console.error('Save error:', error);
                      toast.error('Kayıt hatası: ' + error.message);
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {pendingChanges.changes.length > 0 ? 'Değişiklikleri Kaydet ve Excel Oluştur' : 'Excel Oluştur'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue Completion Popup */}
      {showQueueCompletionPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold">Kuyruk Tamamlandı</h3>
            </div>
            
            <div className="text-gray-600 mb-4">
              {completedQueueTasks.length} işlem başarıyla tamamlandı. Aşağıdaki Excel dosyalarını indirebilirsiniz:
            </div>
            
            <div className="space-y-2 mb-6">
              {completedQueueTasks.map((task, index) => {
                const isLoading = excelGenerationProgress[task.id]?.loading || false;
                const progress = excelGenerationProgress[task.id]?.progress || 0;
                
                return (
                  <div key={task.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700 min-w-[1.5rem]">{index + 1}.</span>
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium truncate">{task.name}</span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            // Set loading state and progress
                            setExcelGenerationProgress(prev => ({
                              ...prev,
                              [task.id]: { loading: true, progress: 0 }
                            }));
                            
                            // Simulate progress updates
                            setTimeout(() => {
                              setExcelGenerationProgress(prev => ({
                                ...prev,
                                [task.id]: { ...prev[task.id], progress: 30 }
                              }));
                            }, 100);
                            
                            setTimeout(() => {
                              setExcelGenerationProgress(prev => ({
                                ...prev,
                                [task.id]: { ...prev[task.id], progress: 60 }
                              }));
                            }, 300);
                            
                            setTimeout(() => {
                              setExcelGenerationProgress(prev => ({
                                ...prev,
                                [task.id]: { ...prev[task.id], progress: 90 }
                              }));
                            }, 600);
                            
                            await generateExcelForTask(task);
                            
                            // Complete progress
                            setExcelGenerationProgress(prev => ({
                              ...prev,
                              [task.id]: { loading: false, progress: 100 }
                            }));
                            
                            // Clear progress after a short delay
                            setTimeout(() => {
                              setExcelGenerationProgress(prev => {
                                const newState = { ...prev };
                                delete newState[task.id];
                                return newState;
                              });
                            }, 2000);
                          } catch (error) {
                            console.error('Excel export error:', error);
                            toast.error('Excel dosyası oluşturulamadı: ' + error.message);
                            // Clear loading state on error
                            setExcelGenerationProgress(prev => {
                              const newState = { ...prev };
                              delete newState[task.id];
                              return newState;
                            });
                          }
                        }}
                        disabled={isLoading}
                        className={`text-xs px-3 py-1 rounded transition-colors ${
                          isLoading 
                            ? 'bg-gray-400 text-white cursor-not-allowed' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-1">
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            İndiriliyor...
                          </div>
                        ) : (
                          'Excel İndir'
                        )}
                      </button>
                    </div>
                    
                    {/* Progress Bar */}
                    {isLoading && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="border-t pt-4">
              {(() => {
                const isCombinedLoading = excelGenerationProgress['combined']?.loading || false;
                const combinedProgress = excelGenerationProgress['combined']?.progress || 0;
                
                return (
                  <div className="mb-3">
                    <button
                      onClick={async () => {
                        try {
                          // Set loading state and progress for combined export
                          setExcelGenerationProgress(prev => ({
                            ...prev,
                            combined: { loading: true, progress: 0 }
                          }));
                          
                          // Simulate progress updates for combined export
                          setTimeout(() => {
                            setExcelGenerationProgress(prev => ({
                              ...prev,
                              combined: { ...prev.combined, progress: 25 }
                            }));
                          }, 200);
                          
                          setTimeout(() => {
                            setExcelGenerationProgress(prev => ({
                              ...prev,
                              combined: { ...prev.combined, progress: 50 }
                            }));
                          }, 500);
                          
                          setTimeout(() => {
                            setExcelGenerationProgress(prev => ({
                              ...prev,
                              combined: { ...prev.combined, progress: 75 }
                            }));
                          }, 800);
                          
                          await generateCombinedExcelForTasks(completedQueueTasks);
                          
                          // Complete progress
                          setExcelGenerationProgress(prev => ({
                            ...prev,
                            combined: { loading: false, progress: 100 }
                          }));
                          
                          // Clear progress after a short delay
                          setTimeout(() => {
                            setExcelGenerationProgress(prev => {
                              const newState = { ...prev };
                              delete newState.combined;
                              return newState;
                            });
                          }, 2000);
                        } catch (error) {
                          console.error('Combined Excel export error:', error);
                          toast.error('Birleştirilmiş Excel dosyası oluşturulamadı: ' + error.message);
                          // Clear loading state on error
                          setExcelGenerationProgress(prev => {
                            const newState = { ...prev };
                            delete newState.combined;
                            return newState;
                          });
                        }
                      }}
                      disabled={isCombinedLoading}
                      className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        isCombinedLoading 
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isCombinedLoading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Birleştiriliyor...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Birleştirilmiş Excel İndir
                        </>
                      )}
                    </button>
                    
                    {/* Progress Bar for Combined Excel */}
                    {isCombinedLoading && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${combinedProgress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <button
                onClick={() => {
                  setShowQueueCompletionPopup(false);
                  setCompletedQueueTasks([]);
                  // Clear completed tasks from queue
                  setTaskQueue(prev => prev.filter(t => t.status !== 'completed'));
                  taskQueueRef.current = taskQueueRef.current.filter(t => t.status !== 'completed');
                }}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YM TT (Tavlı Tel) Ara Mamul Modal */}
      {showYmTtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <span className="text-3xl">🔥</span>
                    YM TT - Tavlı Tel Ara Mamul Ürünleri
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">Tavlanmış tel yarı mamul ürünlerinin listesi</p>
                </div>
                <button
                  onClick={() => setShowYmTtModal(false)}
                  className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚧</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Yakında Gelecek</h3>
                <p className="text-gray-600">YM TT ara mamul ürün yönetimi şu anda geliştirme aşamasındadır.</p>
                <p className="text-gray-500 text-sm mt-2">Tavlı tel ara mamul ürünlerini buradan görüntüleyebilecek ve yönetebileceksiniz.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TavliBalyaTelNetsis;