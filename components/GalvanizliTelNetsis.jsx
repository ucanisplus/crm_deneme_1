// Galvanizli Tel Maliyet Hesaplama Componenti
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth, normalizeInputValue } from '@/api-config';
import { fetchWithCorsProxy, CORS_PROXY_API_URLS } from '@/lib/cors-proxy';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// YM ST Wire Drawing Matrix (UPDATED: 2025-10-09 from revised matrix CSV)
// Products >= 1.50mm use TLC01 direct drawing, < 1.50mm use COTLC01 two-step method with YM.ST (not Filmaşin)
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
// YM ST COILER (.ST) Products Alternative Matrix
// For .ST products (COTLC01 method) that use classical YM.ST products as sources
// Main (0) uses xxx.0600.1006, ALT 1 uses xxx.0600.1008, ALT 2 uses xxx.0550.1006
// NOTE: Only for diameters 2.00-2.30mm (.ST product final diameters)
const YM_ST_COILER_ALTERNATIVE_MAP = {
  // For all .ST products in 2.00-2.30mm range
  // Main: 6.00mm 1006 quality → ALT 1: 6.00mm 1008 quality → ALT 2: 5.50mm 1006 quality
  2.00: { alt1: { filmasin: 6.0, quality: '1008' }, alt2: { filmasin: 5.5, quality: '1006' } },
  2.10: { alt1: { filmasin: 6.0, quality: '1008' }, alt2: { filmasin: 5.5, quality: '1006' } },
  2.20: { alt1: { filmasin: 6.0, quality: '1008' }, alt2: { filmasin: 5.5, quality: '1006' } },
  2.30: { alt1: { filmasin: 6.0, quality: '1008' }, alt2: { filmasin: 5.5, quality: '1006' } }
};

// Helper: Generate alternative recipes for .ST COILER products
const generateCoilerAlternatives = (mainRecipes, ymStProducts) => {
  const alt1Recipes = [];
  const alt2Recipes = [];

  // Group recipes by product
  const recipesByProduct = {};
  mainRecipes.forEach(recipe => {
    if (!recipesByProduct[recipe.ym_st_stok_kodu]) {
      recipesByProduct[recipe.ym_st_stok_kodu] = [];
    }
    recipesByProduct[recipe.ym_st_stok_kodu].push(recipe);
  });

  // For each .ST product, generate alternatives
  Object.keys(recipesByProduct).forEach(stokKodu => {
    // Check if it's a .ST product (COTLC01 method)
    if (!stokKodu.endsWith('.ST')) return;

    const productRecipes = recipesByProduct[stokKodu];

    // Find the product data to get diameter
    const product = ymStProducts.find(p => p.stok_kodu === stokKodu);
    if (!product || !product.cap) return;

    const diameter = parseFloat(product.cap);

    // Check if diameter is in COILER range (2.00-2.30mm)
    if (diameter < 2.00 || diameter > 2.30) return;

    // Get matrix key (round to nearest 0.10mm)
    const matrixKey = Math.floor(diameter * 10) / 10;
    const alternatives = YM_ST_COILER_ALTERNATIVE_MAP[matrixKey];
    if (!alternatives) return;

    console.log(`🔄 Generating COILER alternatives for ${stokKodu} (${diameter}mm)`);

    // Generate ALT 1 and ALT 2 recipes
    productRecipes.forEach(recipe => {
      // Only modify bilesen (B) rows, keep operations (O) as is
      if (recipe.operasyon_bilesen === 'B') {
        const oldBilesenKodu = recipe.bilesen_kodu;

        // ALT 1: Replace xxx.0600.1006 with xxx.0600.1008
        if (oldBilesenKodu.includes('.0600.1006')) {
          const alt1BilesenKodu = oldBilesenKodu.replace('.0600.1006', '.0600.1008');
          alt1Recipes.push({
            ...recipe,
            bilesen_kodu: alt1BilesenKodu
          });
          console.log(`  ALT 1: ${oldBilesenKodu} → ${alt1BilesenKodu}`);
        }

        // ALT 2: Replace xxx.0600.1006 with xxx.0550.1006
        if (oldBilesenKodu.includes('.0600.1006')) {
          const alt2BilesenKodu = oldBilesenKodu.replace('.0600.1006', '.0550.1006');
          alt2Recipes.push({
            ...recipe,
            bilesen_kodu: alt2BilesenKodu
          });
          console.log(`  ALT 2: ${oldBilesenKodu} → ${alt2BilesenKodu}`);
        }
      } else {
        // Keep operation rows unchanged
        alt1Recipes.push({ ...recipe });
        alt2Recipes.push({ ...recipe });
      }
    });
  });

  return { alt1Recipes, alt2Recipes };
};

const getMatrixRangeKey = (targetDiameter) => {
  // Matrix only for products >= 1.50mm (products < 1.50mm use COTLC01 with YM.ST, not Filmaşin)
  if (targetDiameter < 1.50) return null;

  // Floor to 0.10mm range: Math.floor(diameter * 10) / 10
  const rangeKey = Math.floor(targetDiameter * 10) / 10;

  // Handle special cases where matrix jumps (e.g., 7.50 → 8.00)
  if (rangeKey >= 7.60 && rangeKey < 8.00) return 7.50;
  if (rangeKey >= 8.20) return 8.10;

  return rangeKey;
};

// Helper: Get filmaşin by priority for YM ST
const getYmStFilmasinByPriority = (targetDiameter, priority) => {
  // Products < 1.50mm use COTLC01 method with YM.ST (not Filmaşin from matrix)
  if (targetDiameter < 1.50) {
    return null;
  }

  // Floor diameter to matrix range key
  const rangeKey = getMatrixRangeKey(targetDiameter);
  if (!rangeKey) return null;

  const priorityList = YM_ST_FILMASIN_PRIORITY_MAP[rangeKey];

  if (!priorityList || priority >= priorityList.length) {
    return null;
  }

  const filmasin = priorityList[priority];
  const diameterStr = filmasin.diameter.toString().replace('.', '').padStart(4, '0');

  return {
    code: `FLM.${diameterStr}.${filmasin.quality}`,
    diameter: filmasin.diameter,
    quality: filmasin.quality,
    priority: priority
  };
};

const GalvanizliTelNetsis = () => {
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
  
  // Mevcut MM GT seçimi için state'ler
  const [existingMmGts, setExistingMmGts] = useState([]);
  const [selectedExistingMmGt, setSelectedExistingMmGt] = useState(null);
  const [showExistingMmGtModal, setShowExistingMmGtModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('mmgt'); // 'mmgt' veya 'ymst'
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  
  // Kullanici girdi degerleri icin ayarlar modali
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Coiler Recete modali icin state'ler
  const [showCoilerReceteModal, setShowCoilerReceteModal] = useState(false);
  const [coilerTargetDiameter, setCoilerTargetDiameter] = useState('');
  const [coilerSourceYmSts, setCoilerSourceYmSts] = useState([]); // Multiple sources
  const [coilerSourceYmStSearch, setCoilerSourceYmStSearch] = useState('');
  const [isGeneratingCoilerExcel, setIsGeneratingCoilerExcel] = useState(false);

  // YM ST Recete modali (standalone - filmaşinden YM ST)
  const [showYmStReceteModal, setShowYmStReceteModal] = useState(false);
  const [ymStReceteList, setYmStReceteList] = useState([]); // List of YM STs to generate
  const [newYmStRecete, setNewYmStRecete] = useState({
    cap: '',
    filmasin: '',
    quality: ''
  });
  const [isGeneratingYmStExcel, setIsGeneratingYmStExcel] = useState(false);

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

  // Manuel Oluştur modal state'leri
  const [showManuelOlusturModal, setShowManuelOlusturModal] = useState(false);
  const [manuelFilmasinSelection, setManuelFilmasinSelection] = useState('');
  const [manuelYmStSelection, setManuelYmStSelection] = useState('');
  
  // YMST listesi için stateler
  const [existingYmSts, setExistingYmSts] = useState([]);
  const [activeDbTab, setActiveDbTab] = useState('mmgt'); // 'mmgt' veya 'ymst'
  const [mainYmStIndex, setMainYmStIndex] = useState(0); // Ana YMST'nin indeksi (1:1:n iliskisi icin)
  
  // Veritabanı filtreleme ve seçim durumları
  const [dbSearchQuery, setDbSearchQuery] = useState(''); // Arama sorgusu
  const [dbCapFilter, setDbCapFilter] = useState(''); // Çap filtresi
  const [dbKaplamaFilter, setDbKaplamaFilter] = useState('all'); // Kaplama filtresi
  const [selectedDbItems, setSelectedDbItems] = useState([]); // Seçili ürün ID'leri
  const [isDeletingBulkDb, setIsDeletingBulkDb] = useState(false); // Toplu silme durumu
  
  // Veritabanı sıralama durumları
  const [dbSortField, setDbSortField] = useState('cap'); // Sıralama alanı (cap, kod_2, kaplama, created_at)
  
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
    mmGtIds: [],
    ymGtId: null,
    ymStIds: []
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
    return numValue.toFixed(5).replace('.', ',');
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
  const [mmGtData, setMmGtData] = useState({
    cap: '2.50', // Nokta ondalik ayracini garantile 
    kod_2: 'NIT',
    kaplama: '50', // Tam sayi degeri
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
    sepetli: false
  });
  
  // Tolerans işaret durumları
  const [toleransMaxSign, setToleransMaxSign] = useState('+'); // Max Tolerans için işaret
  const [toleransMinSign, setToleransMinSign] = useState('-'); // Min Tolerans için işaret

  // Calculated YM ST diameter for conditional UI rendering
  const [calculatedYmStDiameter, setCalculatedYmStDiameter] = useState(null);

  // Hesaplanan/oluşturulan veriler
  const [ymGtData, setYmGtData] = useState(null);
  const [suitableYmSts, setSuitableYmSts] = useState([]);
  const [selectedYmSts, setSelectedYmSts] = useState([]);
  const [autoGeneratedYmSts, setAutoGeneratedYmSts] = useState([]);
  
  // Recete verileri - Her YM ST icin MM GT, YM GT ve YM ST receteleri
  const [allRecipes, setAllRecipes] = useState({
    mmGtRecipes: {}, // { ymStIndex: { recete } }
    ymGtRecipe: {}, // Tek YM GT recetesi (siralama eslestirme)
    ymStRecipes: {} // { ymStIndex: { recete } }
  });
  
  // Recete durumu takibi - hangi alan nereden geldi
  const [recipeStatus, setRecipeStatus] = useState({
    mmGtRecipes: {}, // { ymStIndex: { bilesen_kodu: 'veritabani' | 'otomatik' | 'manuel' } }
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
    mmGtIds: [], // Çoklu MM GT ID'ler
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

  // Dostça alan adları
  const friendlyNames = {
    'TLC01': 'Tel Çekme Süre (TLC01)',
    'SM.HİDROLİK.ASİT': 'HCL Asit (SM.HİDROLİK.ASİT)',
    '150 03': 'Çinko (150 03)',
    'AMB.APEX CEMBER 38X080': 'Çelik çember (AMB.APEX CEMBER 38X080)',
    'AMB.TOKA.SIGNODE.114P. DKP': 'Çember tokası (AMB.TOKA.SIGNODE.114P. DKP)',
    'SM.7MMHALKA': 'Kaldırma kancası (SM.7MMHALKA)',
    'AMB.SHRİNK.200*140CM': 'Shrink Tüketimi (KG)',
    'AMB.SHRİNK.200*160CM': 'Shrink Tüketimi (KG)',
    'AMB.SHRİNK.200*190CM': 'Shrink Tüketimi (KG)',
    'AMB.ÇEM.KARTON.GAL': 'Karton (AMB.ÇEM.KARTON.GAL)',
    'GTPKT01': 'Paketleme Süre (GTPKT01)',
    'GLV01': 'Galvaniz Süre (GLV01)',
    'SM.DESİ.PAK': 'Silkajel Tüketimi (AD)'
  };

  // Tum useEffect hooklar - Hook Kurallarina uymak icin izin kontrolunden once tasindi
  
  // Sayfa yüklendiğinde talepleri getir
  useEffect(() => {
    fetchRequests();
    fetchExistingMmGts();
    fetchExistingYmSts();
    fetchUserInputValues();
    fetchUsers(); // Kullanici adi arama icin kullanicilari getir
  }, []);
  
  // Cap değeri değiştiğinde Dış Çap'ı otomatik hesapla
  useEffect(() => {
    if (mmGtData.cap && mmGtData.ic_cap) {
      const cap = parseFloat(mmGtData.cap) || 0;
      const icCap = parseInt(mmGtData.ic_cap) || 45;
      let disCap;
      
      // Çap ve iç çapa göre dış çap hesaplama
      if (icCap === 45) disCap = 75;
      else if (icCap === 50) disCap = 90;
      else if (icCap === 55) disCap = 105;
      else disCap = icCap + (cap * 10); // Genel hesaplama
      
      setMmGtData(prev => ({ ...prev, dis_cap: disCap }));
    }
  }, [mmGtData.cap, mmGtData.ic_cap]);
  
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

  // Kod-2 değişikliğinde kaplama değerini güncelle
  useEffect(() => {
    if (mmGtData.kod_2 === 'PAD' && mmGtData.kaplama === '100') {
      // Only auto-set if it's the default NIT value (100)
      setMmGtData(prev => ({ ...prev, kaplama: '50' }));
    }
  }, [mmGtData.kod_2]);

  // MM GT verileri değiştiğinde YM GT verilerini otomatik güncelle
  useEffect(() => {
    if (mmGtData.cap && mmGtData.kod_2) {
      generateYmGtData();
    }
  }, [mmGtData.cap, mmGtData.kod_2, mmGtData.kaplama, mmGtData.min_mukavemet, mmGtData.max_mukavemet, mmGtData.kg, mmGtData.ic_cap, mmGtData.dis_cap, mmGtData.tolerans_plus, mmGtData.tolerans_minus]);

  // Calculate YM ST diameter for UI conditional rendering
  useEffect(() => {
    if (mmGtData.cap && mmGtData.kaplama && mmGtData.tolerans_minus) {
      const cap = parseFloat(mmGtData.cap) || 0;
      const kaplama = parseInt(mmGtData.kaplama) || 0;
      const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;

      const actualToleranceMinus = Math.abs(toleransMinus);
      const coatingReduction = (kaplama / 35) * 0.01; // Changed from Math.floor to match user's formula

      const baseAdjustedCap = cap - actualToleranceMinus - coatingReduction + 0.01; // Added +0.01 as per user's formula
      const ymStDiameter = Math.max(Math.round(baseAdjustedCap * 100) / 100, 0.1);

      setCalculatedYmStDiameter(ymStDiameter);
    } else {
      setCalculatedYmStDiameter(null);
    }
  }, [mmGtData.cap, mmGtData.kaplama, mmGtData.tolerans_minus]);

  // Component yuklendikten sonra TLC_Hizlar verisini veritabanindan yukle
  useEffect(() => {
    fetchTlcHizlarData();
  }, []);
  
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
      const currentShrinkKey = shrinkKeys.find(sk => allRecipes.mmGtRecipes[activeRecipeTab]?.[sk] > 0);
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
  }, [activeRecipeTab, selectedYmSts, autoGeneratedYmSts, allRecipes.mmGtRecipes]);


  // İzin kontrolü
  if (!hasPermission('access:galvanizli-tel')) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Bu modüle erişim izniniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  // Veritabanindan kullanici girdi degerlerini getir
  const fetchUserInputValues = async () => {
    try {
      // API endpoint URL tanimli mi kontrol et
      if (!API_URLS.galUserInputValues) {
        console.warn('galUserInputValues API endpoint is not defined, using default values');
        return;
      }
      
      const response = await fetch(API_URLS.galUserInputValues);
      if (response && response.ok) {
        const data = await response.json();
        // En son kaydi al
        if (data && data.length > 0) {
          // En son kaydi almak icin tarihe gore sirala
          const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const latestValues = sortedData[0];
          
          setUserInputValues({
            ash: parseFloat(latestValues.ash) || 5.54,
            lapa: parseFloat(latestValues.lapa) || 2.73,
            uretim_kapasitesi_aylik: parseFloat(latestValues.uretim_kapasitesi_aylik) || 2800,
            toplam_tuketilen_asit: parseFloat(latestValues.toplam_tuketilen_asit) || 30000,
            ortalama_uretim_capi: parseFloat(latestValues.ortalama_uretim_capi) || 3.08,
            paketlemeDkAdet: parseFloat(latestValues.paketlemeDkAdet) || 10
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user input values:', error);
    }
  };
  
  // Kullanici girdi degerlerini veritabanina kaydet
  const saveUserInputValues = async () => {
    try {
      setIsLoading(true);
      
      // Tum girdilerin gecerli sayi oldugunu kontrol et
      const validatedInputs = {
        ash: parseFloat(userInputValues.ash) || 5.54,
        lapa: parseFloat(userInputValues.lapa) || 2.73,
        uretim_kapasitesi_aylik: parseFloat(userInputValues.uretim_kapasitesi_aylik) || 2800,
        toplam_tuketilen_asit: parseFloat(userInputValues.toplam_tuketilen_asit) || 30000,
        ortalama_uretim_capi: parseFloat(userInputValues.ortalama_uretim_capi) || 3.08,
        paketlemeDkAdet: parseFloat(userInputValues.paketlemeDkAdet) || 10
      };
      
      // Dogrulanan degerlerle state'i guncelle
      setUserInputValues(validatedInputs);
      
      // API endpoint tanimli mi kontrol et
      if (API_URLS.galUserInputValues) {
        // Endpoint varsa veritabanina kaydet
        const response = await fetch(API_URLS.galUserInputValues, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validatedInputs)
        });
        
        if (response.ok) {
          toast.success('Hesaplama değerleri başarıyla kaydedildi.');
        } else {
          toast.error('Hesaplama değerleri kaydedilirken bir hata oluştu.');
        }
      } else {
        // Endpoint yoksa sadece yerel state guncelle
        toast.success('Hesaplama değerleri güncellendi.');
      }
      
      // Modali kapat
      setShowSettingsModal(false);
      
      // Eger mevcut degerler varsa yeni degerlerle receteleri yeniden hesapla
      if (Object.keys(allRecipes.ymGtRecipe).length > 0 || 
          Object.keys(allRecipes.ymStRecipes).length > 0) {
        calculateAutoRecipeValues();
      }
    } catch (error) {
      console.error('Error saving user input values:', error);
      toast.error('Hesaplama değerleri kaydedilirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };


  // Talepleri getir
  // Kullanıcı listesi getir
  const fetchUsers = async () => {
    try {
      const response = await fetchWithAuth(API_URLS.crmUsers);
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
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}`);
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
      // Get MM GT products to check against (limit to recent products for performance)
      const response = await fetchWithAuth(`${API_URLS.galMmGt}?limit=2000&sort_by=created_at&sort_order=desc`);
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
              product.kod_2 === request.kod_2 &&
              Math.abs(parseFloat(product.kaplama || 0) - parseFloat(request.kaplama || 0)) < 1 &&
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
            await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
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
    
    return `${product.cap || ''}_${product.kod_2 || ''}_${product.kaplama || ''}_${product.min_mukavemet || ''}_${product.max_mukavemet || ''}_${product.kg || ''}_${product.ic_cap || ''}_${product.dis_cap || ''}_${product.tolerans_plus || ''}_${product.tolerans_minus || ''}_${product.shrink || ''}_${product.unwinding || ''}`;
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
      
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${request.id}`, {
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

  // Mevcut MM GT'leri getir
  const fetchExistingMmGts = async () => {
    try {
      const response = await fetchWithAuth(`${API_URLS.galMmGt}?limit=2000&sort_by=created_at&sort_order=desc`);
      if (response && response.ok) {
        const data = await response.json();
        setExistingMmGts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Mevcut MM GT listesi getirilirken hata:', error);
      toast.error('Mevcut MM GT listesi getirilemedi');
    }
  };

  // Mevcut YM ST'leri getir
  const fetchExistingYmSts = async () => {
    try {
      const response = await fetchWithAuth(`${API_URLS.galYmSt}?limit=2000&sort_by=created_at&sort_order=desc`);
      if (response && response.ok) {
        const data = await response.json();
        setExistingYmSts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Mevcut YM ST listesi getirilirken hata:', error);
      toast.error('Mevcut YM ST listesi getirilemedi');
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
          (type === 'mmgt' && product.kod_2 && product.kod_2.toLowerCase().includes(searchLower)) ||
          (type === 'ymst' && product.filmasin && product.filmasin.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }
      
      // Çap filtresi
      if (dbCapFilter && product.cap) {
        if (!product.cap.toString().includes(dbCapFilter)) return false;
      }
      
      // Kaplama filtresi (sadece MM GT için)
      if (type === 'mmgt' && dbKaplamaFilter !== 'all' && product.kod_2) {
        if (product.kod_2 !== dbKaplamaFilter) return false;
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
        case 'kod_2':
          aValue = (a.kod_2 || '').toString();
          bValue = (b.kod_2 || '').toString();
          break;
        case 'kaplama':
          if (type === 'mmgt') {
            aValue = parseFloat(a.kaplama) || 0;
            bValue = parseFloat(b.kaplama) || 0;
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
      
      if (activeDbTab === 'mmgt') {
        // For MM GT, we need cascade deletion including YM GT
        for (const itemId of selectedDbItems) {
          try {
            console.log('Deleting MM GT with cascade:', itemId);
            
            // Get MM GT data before deletion
            const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${itemId}`);
            let mmGt = null;
            if (mmGtResponse && mmGtResponse.ok) {
              mmGt = await mmGtResponse.json();
            }
            
            // Step 1: Find and delete related YM GTs through relationship table
            try {
              const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${itemId}`);
              if (relationResponse && relationResponse.ok) {
                const relations = await relationResponse.json();
                console.log(`Found ${relations.length} relationships for MM GT ${itemId}`);
                
                // Delete related YM GTs first
                for (const relation of relations) {
                  if (relation.ym_gt_id) {
                    try {
                      const ymGtDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${relation.ym_gt_id}`, {
                        method: 'DELETE'
                      });
                      if (ymGtDeleteResponse.ok) {
                        console.log(`Bulk: Deleted YM GT ${relation.ym_gt_id}`);
                      } else {
                        console.error('Bulk: Failed to delete YM GT ' + relation.ym_gt_id + ': ' + ymGtDeleteResponse.status);
                      }
                    } catch (ymGtError) {
                      console.error('Bulk: Error deleting YM GT ' + relation.ym_gt_id + ':', ymGtError);
                    }
                  }
                }
                
                // Delete relationship records
                for (const relation of relations) {
                  try {
                    await fetchWithAuth(`${API_URLS.galMmGtYmSt}/${relation.id}`, {
                      method: 'DELETE'
                    });
                  } catch (relationError) {
                    console.error('Bulk: Error deleting relationship ' + relation.id + ':', relationError);
                  }
                }
              }
            } catch (relationError) {
              console.error('Bulk: Error finding related YM GTs through relationships:', relationError);
            }
            
            // Step 2: Fallback - find orphaned YM GTs by stok_kodu pattern
            if (mmGt && mmGt.stok_kodu && mmGt.stok_kodu.startsWith('GT.')) {
              const expectedYmGtStokKodu = mmGt.stok_kodu.replace(/^GT\./, 'YM.GT.');
              try {
                const ymGtSearchResponse = await fetchWithAuth(`${API_URLS.galYmGt}?stok_kodu=${encodeURIComponent(expectedYmGtStokKodu)}`);
                if (ymGtSearchResponse && ymGtSearchResponse.ok) {
                  const ymGtData = await ymGtSearchResponse.json();
                  if (Array.isArray(ymGtData) && ymGtData.length > 0) {
                    for (const orphanedYmGt of ymGtData) {
                      try {
                        const orphanedDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${orphanedYmGt.id}`, {
                          method: 'DELETE'
                        });
                        if (orphanedDeleteResponse.ok) {
                          console.log(`Bulk: Deleted orphaned YM GT ${orphanedYmGt.id}`);
                        }
                      } catch (orphanedError) {
                        console.error('Bulk: Error deleting orphaned YM GT:', orphanedError);
                      }
                    }
                  }
                }
              } catch (fallbackError) {
                console.error('Bulk: Error in YM GT fallback cleanup:', fallbackError);
              }
            }
            
            // Step 3: Delete the MM GT itself
            const deleteResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${itemId}`, {
              method: 'DELETE'
            });

            if (deleteResponse && deleteResponse.ok) {
              successCount++;
              console.log('Bulk: Successfully deleted MM GT:', itemId);
            } else {
              errorCount++;
              console.error('Bulk: Failed to delete MM GT:', itemId, 'Status:', deleteResponse?.status);
            }
            
          } catch (error) {
            console.error('Bulk: Error deleting MM GT ' + itemId + ':', error);
            errorCount++;
          }
        }
      } else {
        // For YM ST, simple deletion (no cascade needed)
        for (const itemId of selectedDbItems) {
          try {
            const deleteUrl = `${API_URLS.galYmSt}/${itemId}`;
            
            console.log('Deleting YM ST:', itemId, 'URL:', deleteUrl);
            
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
        }
      }

      // Başarı mesajı
      if (successCount > 0) {
        toast.success(`${successCount} ürün başarıyla silindi`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} ürün silinemedi`);
      }

      // Mark related requests as "silinmiş" for deleted MM GT products
      if (activeDbTab === 'mmgt' && successCount > 0) {
        try {
          // Get requests to check for related ones (limit for performance)
          const allRequestsResponse = await fetchWithAuth(`${API_URLS.galSalRequests}?limit=200&sort_by=created_at&sort_order=desc`);
          if (allRequestsResponse && allRequestsResponse.ok) {
            const allRequests = await allRequestsResponse.json();
            const requestsToUpdate = [];
            
            // Get current MM GT products to see which ones are missing (deleted)
            const currentProductsResponse = await fetchWithAuth(`${API_URLS.galMmGt}?limit=2000`);
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
                  product.kod_2 === request.kod_2 &&
                  Math.abs(parseFloat(product.kaplama || 0) - parseFloat(request.kaplama || 0)) < 1 &&
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
            
            // Update related requests to "silinmiş" status
            if (requestsToUpdate.length > 0) {
              console.log(`Bulk delete: Marking ${requestsToUpdate.length} related requests as silinmiş`);
              
              for (const requestId of requestsToUpdate) {
                try {
                  await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'silinmis' })
                  });
                } catch (updateError) {
                  console.error(`Failed to update request ${requestId} status:`, updateError);
                }
              }
              
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
      if (activeDbTab === 'mmgt') {
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
  const fetchExistingRecipes = async (mmGtId, ymGtId, ymStIds) => {
    try {
      setIsLoading(true);
      let statusUpdates = {
        mmGtRecipes: {},
        ymGtRecipe: {},
        ymStRecipes: {}
      };
      
      // MM GT recetelerini getir
      if (mmGtId) {
        const mmGtRecipeResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
        if (mmGtRecipeResponse && mmGtRecipeResponse.ok) {
          const mmGtRecipeData = await mmGtRecipeResponse.json();
          // Recete verisini isle
          const parsedMmGtRecipe = {};
          mmGtRecipeData.forEach(item => {
            parsedMmGtRecipe[item.bilesen_kodu] = item.miktar;
            if (!statusUpdates.mmGtRecipes[0]) statusUpdates.mmGtRecipes[0] = {};
            statusUpdates.mmGtRecipes[0][item.bilesen_kodu] = 'database';
          });
          setAllRecipes(prev => ({
            ...prev,
            mmGtRecipes: { ...prev.mmGtRecipes, 0: parsedMmGtRecipe }
          }));
        }
      }
      
      // YM GT recetesini getir
      if (ymGtId) {
        console.log(`📖 Fetching all YM GT recipes and filtering for ym_gt_id=${ymGtId}...`);
        const allYmGtRecipesResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?limit=2000`);
        let ymGtRecipeResponse = null;
        
        if (allYmGtRecipesResponse && allYmGtRecipesResponse.ok) {
          const allYmGtRecipes = await allYmGtRecipesResponse.json();
          const filteredYmGtRecipes = allYmGtRecipes.filter(r => r.ym_gt_id == ymGtId); // Use == for type coercion
          console.log(`📖 Found ${filteredYmGtRecipes.length} YM GT recipes for ym_gt_id=${ymGtId}`);
          
          // Create mock response
          ymGtRecipeResponse = {
            ok: true,
            json: async () => filteredYmGtRecipes
          };
        }
        
        if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
          const ymGtRecipeData = await ymGtRecipeResponse.json();
          const parsedYmGtRecipe = {};
          ymGtRecipeData.forEach(item => {
            parsedYmGtRecipe[item.bilesen_kodu] = item.miktar;
            statusUpdates.ymGtRecipe[item.bilesen_kodu] = 'database';
          });
          setAllRecipes(prev => ({
            ...prev,
            ymGtRecipe: parsedYmGtRecipe
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
        mmGtRecipes: {},
        ymGtRecipe: {},
        ymStRecipes: {}
      };
      
      
      if (allYmSts.length === 0) {
        toast.warning('Henüz YM ST seçilmemiş. Önce YM ST sedin veya oluşturun.');
        setIsLoading(false);
        return;
      }
      
      // Mevcut form verilerine gore MM GT bulmaya calis
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const sequence = processSequence || '00';
      const mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      
      
      // Find MM GT
      const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu=${encodeURIComponent(mmGtStokKodu)}`);
      if (mmGtResponse && mmGtResponse.ok) {
        const mmGtData = await mmGtResponse.json();
        if (mmGtData.length > 0) {
          const mmGt = mmGtData[0];
          
          // 🆕 YENI: YM GT ve YM ST bulmak icin gelistirilmis iliski tablosunu kullan
          const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
          if (relationResponse && relationResponse.ok) {
            const relations = await relationResponse.json();
            
            if (relations.length > 0) {
              const ymGtId = relations[0].ym_gt_id; // All relations should have same ym_gt_id
              
              // Load MM GT recipes
              const mmGtRecipeResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
              if (mmGtRecipeResponse && mmGtRecipeResponse.ok) {
                const mmGtRecipeData = await mmGtRecipeResponse.json();
                if (mmGtRecipeData.length > 0) {
                  
                  // MM GT recetelerini tum YM ST indekslerine uygula
                  for (let i = 0; i < allYmSts.length; i++) {
                    const parsedMmGtRecipe = {};
                    mmGtRecipeData.forEach(item => {
                      // Cinko icin ozel islem: veritabani '150' saklar ama biz '150 03' gosteririz
                      let displayCode = item.bilesen_kodu;
                      if (item.bilesen_kodu === '150' && item.aciklama === 'Çinko Tüketim Miktarı') {
                        displayCode = '150 03';
                      }
                      
                      parsedMmGtRecipe[displayCode] = parseFloat(item.miktar || 0); // Temiz sayi, gereksiz sifir yok
                      if (!statusUpdates.mmGtRecipes[i]) statusUpdates.mmGtRecipes[i] = {};
                      statusUpdates.mmGtRecipes[i][displayCode] = 'database';
                    });
                    setAllRecipes(prev => ({
                      ...prev,
                      mmGtRecipes: { ...prev.mmGtRecipes, [i]: parsedMmGtRecipe }
                    }));
                  }
                  foundAny = true;
                }
              }
              
              // 🆕 YENI: Iliski kullanarak YM GT recetelerini yukle
              if (ymGtId) {
                console.log(`📖 Fetching all YM GT recipes and filtering for ym_gt_id=${ymGtId}...`);
                const allYmGtRecipesResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?limit=2000`);
                let ymGtRecipeResponse = null;
                
                if (allYmGtRecipesResponse && allYmGtRecipesResponse.ok) {
                  const allYmGtRecipes = await allYmGtRecipesResponse.json();
                  const filteredYmGtRecipes = allYmGtRecipes.filter(r => r.ym_gt_id == ymGtId); // Use == for type coercion
                  console.log(`📖 Found ${filteredYmGtRecipes.length} YM GT recipes for ym_gt_id=${ymGtId}`);
                  
                  // Create mock response
                  ymGtRecipeResponse = {
                    ok: true,
                    json: async () => filteredYmGtRecipes
                  };
                }
                
                if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
                  const ymGtRecipeData = await ymGtRecipeResponse.json();
                  if (ymGtRecipeData.length > 0) {
                    
                    const parsedYmGtRecipe = {};
                    ymGtRecipeData.forEach(item => {
                      // Cinko icin ozel islem: veritabani '150' saklar ama biz '150 03' gosteririz
                      let displayCode = item.bilesen_kodu;
                      if (item.bilesen_kodu === '150' && item.aciklama === 'Çinko Tüketim Miktarı') {
                        displayCode = '150 03';
                      }
                      
                      parsedYmGtRecipe[displayCode] = parseFloat(item.miktar || 0); // Temiz sayi, gereksiz sifir yok
                      statusUpdates.ymGtRecipe[displayCode] = 'database';
                    });
                    setAllRecipes(prev => ({
                      ...prev,
                      ymGtRecipe: parsedYmGtRecipe
                    }));
                    foundAny = true;
                  }
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
                      
                      if (relation.is_main) {
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
      
      // MM GT bulunamazsa, bireysel YM ST arama icin yedek yontemi dene (manuel recete yukleme icin)
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
          mmGtRecipes: {},
          ymGtRecipe: {},
          ymStRecipes: {}
        });
        setRecipeStatus({
          mmGtRecipes: {},
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
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
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

  // MM GT silme fonksiyonu - İlişkili YM GT'leri de siler - Enhanced version
  const deleteMmGt = async (mmGt) => {
    try {
      setIsLoading(true);
      
      const mmGtId = mmGt.id;
      const mmGtStokKodu = mmGt.stok_kodu;
      console.log(`Deleting MM GT: ${mmGtStokKodu} (ID: ${mmGtId})`);
      
      // Step 1: Find related YM GTs through relationship table
      try {
        const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGtId}`);
        if (relationResponse && relationResponse.ok) {
          const relations = await relationResponse.json();
          console.log(`Found ${relations.length} relationships for MM GT ${mmGtId}`);
          
          // Delete relationship records first
          for (const relation of relations) {
            try {
              const relationDeleteResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}/${relation.id}`, {
                method: 'DELETE'
              });
              if (relationDeleteResponse.ok) {
                console.log(`Deleted relationship ${relation.id}`);
              }
            } catch (relationError) {
              console.error('Error deleting relationship ' + relation.id + ':', relationError);
            }
          }
          
          // Delete related YM GTs after relationships are removed
          for (const relation of relations) {
            if (relation.ym_gt_id) {
              try {
                const ymGtDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${relation.ym_gt_id}`, {
                  method: 'DELETE'
                });
                if (ymGtDeleteResponse.ok) {
                  console.log(`Deleted YM GT ${relation.ym_gt_id}`);
                } else {
                  console.error('Failed to delete YM GT ' + relation.ym_gt_id + ': ' + ymGtDeleteResponse.status);
                }
              } catch (ymGtError) {
                console.error('Error deleting YM GT ' + relation.ym_gt_id + ':', ymGtError);
              }
            }
          }
        }
      } catch (relationError) {
        console.error('Error finding related YM GTs through relationships:', relationError);
      }
      
      // Step 2: COMPREHENSIVE FALLBACK - Multiple methods to find orphaned YMGTs
      try {
        console.log('Starting comprehensive YMGT cleanup fallback methods...');
        
        if (mmGtStokKodu && mmGtStokKodu.startsWith('GT.')) {
          // Method 2a: Direct stok_kodu pattern matching
          const expectedYmGtStokKodu = mmGtStokKodu.replace(/^GT\./, 'YM.GT.');
          console.log(`Method 2a: Looking for YM GT with exact stok_kodu: ${expectedYmGtStokKodu}`);
          
          const ymGtExactResponse = await fetchWithAuth(`${API_URLS.galYmGt}?stok_kodu=${encodeURIComponent(expectedYmGtStokKodu)}`);
          if (ymGtExactResponse && ymGtExactResponse.ok) {
            const ymGtExactData = await ymGtExactResponse.json();
            if (Array.isArray(ymGtExactData) && ymGtExactData.length > 0) {
              for (const exactYmGt of ymGtExactData) {
                console.log(`Method 2a: Found exact YM GT: ${exactYmGt.stok_kodu} (ID: ${exactYmGt.id})`);
                try {
                  const exactDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${exactYmGt.id}`, {
                    method: 'DELETE'
                  });
                  if (exactDeleteResponse.ok) {
                    console.log(`Method 2a: Successfully deleted YM GT ${exactYmGt.id}`);
                  } else {
                    console.error(`Method 2a: Failed to delete YM GT ${exactYmGt.id}, status: ${exactDeleteResponse.status}`);
                  }
                } catch (exactDeleteError) {
                  console.error('Method 2a: Error deleting exact YM GT:', exactDeleteError);
                }
              }
            } else {
              console.log('Method 2a: No exact match found');
            }
          } else {
            console.log('Method 2a: API call failed or returned no data');
          }
          
          // Method 2b: Pattern-based search (stok_kodu LIKE)
          // Extract base pattern from MM GT stok_kodu for broader search
          const mmGtParts = mmGtStokKodu.split('.');
          if (mmGtParts.length >= 4) {
            const basePattern = `YM.GT.${mmGtParts[1]}.${mmGtParts[2]}`; // e.g., "YM.GT.NIT.0250"
            console.log(`Method 2b: Searching for YM GTs with pattern: ${basePattern}`);
            
            try {
              const ymGtPatternResponse = await fetchWithAuth(`${API_URLS.galYmGt}?stok_kodu_like=${encodeURIComponent(basePattern)}`);
              if (ymGtPatternResponse && ymGtPatternResponse.ok) {
                const ymGtPatternData = await ymGtPatternResponse.json();
                if (Array.isArray(ymGtPatternData) && ymGtPatternData.length > 0) {
                  console.log(`Method 2b: Found ${ymGtPatternData.length} YM GTs matching pattern`);
                  
                  for (const patternYmGt of ymGtPatternData) {
                    // Additional check: make sure the sequence matches too
                    if (patternYmGt.stok_kodu.endsWith(`.${mmGtParts[3]}`)) {
                      console.log(`Method 2b: Found matching sequence YM GT: ${patternYmGt.stok_kodu} (ID: ${patternYmGt.id})`);
                      try {
                        const patternDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${patternYmGt.id}`, {
                          method: 'DELETE'
                        });
                        if (patternDeleteResponse.ok) {
                          console.log(`Method 2b: Successfully deleted YM GT ${patternYmGt.id}`);
                        } else {
                          console.error(`Method 2b: Failed to delete YM GT ${patternYmGt.id}, status: ${patternDeleteResponse.status}`);
                        }
                      } catch (patternDeleteError) {
                        console.error('Method 2b: Error deleting pattern YM GT:', patternDeleteError);
                      }
                    } else {
                      console.log(`Method 2b: Skipping YM GT ${patternYmGt.stok_kodu} - sequence doesn't match`);
                    }
                  }
                } else {
                  console.log('Method 2b: No pattern matches found');
                }
              } else {
                console.log('Method 2b: Pattern search API call failed');
              }
            } catch (patternError) {
              console.error('Method 2b: Error in pattern search:', patternError);
            }
          }
          
          // Method 2c: Brute force - get all YM GTs and find matches
          console.log('Method 2c: Performing brute force search of all YM GTs...');
          try {
            const allYmGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?limit=1000`);
            if (allYmGtResponse && allYmGtResponse.ok) {
              const allYmGtData = await allYmGtResponse.json();
              if (Array.isArray(allYmGtData) && allYmGtData.length > 0) {
                console.log(`Method 2c: Scanning ${allYmGtData.length} YM GTs for matches...`);
                
                for (const ymGt of allYmGtData) {
                  if (ymGt.stok_kodu === expectedYmGtStokKodu) {
                    console.log(`Method 2c: Found brute force match: ${ymGt.stok_kodu} (ID: ${ymGt.id})`);
                    try {
                      const bruteDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${ymGt.id}`, {
                        method: 'DELETE'
                      });
                      if (bruteDeleteResponse.ok) {
                        console.log(`Method 2c: Successfully deleted YM GT ${ymGt.id}`);
                      } else {
                        console.error(`Method 2c: Failed to delete YM GT ${ymGt.id}, status: ${bruteDeleteResponse.status}`);
                      }
                    } catch (bruteDeleteError) {
                      console.error('Method 2c: Error deleting brute force YM GT:', bruteDeleteError);
                    }
                    break; // Found and processed the match
                  }
                }
              }
            }
          } catch (bruteError) {
            console.error('Method 2c: Error in brute force search:', bruteError);
          }
        }
      } catch (fallbackError) {
        console.error('Error in comprehensive YM GT fallback cleanup:', fallbackError);
      }
      
      // Step 3: Finally delete the MM GT itself
      const deleteResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${mmGtId}`, { 
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete MM GT: ${deleteResponse.status}`);
      }
      
      console.log('MM GT ' + mmGt.stok_kodu + ' deleted successfully with all related YM GTs');
      
      // Step 4: Find and mark related requests as "silinmiş"
      try {
        const allRequestsResponse = await fetchWithAuth(`${API_URLS.galSalRequests}?limit=200&sort_by=created_at&sort_order=desc`);
        if (allRequestsResponse && allRequestsResponse.ok) {
          const allRequests = await allRequestsResponse.json();
          const requestsToUpdate = [];
          
          // Find requests that match the deleted product
          for (const request of allRequests) {
            if (request.status === 'silinmis') continue; // Skip already marked
            
            let isRelatedToDeletedProduct = false;
            
            // Strategy 1: Match by final_stok_adi
            if (request.final_stok_adi === mmGt.stok_adi) {
              isRelatedToDeletedProduct = true;
            }
            
            // Strategy 2: Match by stok_kodu
            if (!isRelatedToDeletedProduct && request.stok_kodu === mmGtStokKodu) {
              isRelatedToDeletedProduct = true;
            }
            
            // Strategy 3: Match by product specifications
            if (!isRelatedToDeletedProduct) {
              const specsMatch = (
                Math.abs(parseFloat(mmGt.cap || 0) - parseFloat(request.cap || 0)) < 0.01 &&
                mmGt.kod_2 === request.kod_2 &&
                Math.abs(parseFloat(mmGt.kaplama || 0) - parseFloat(request.kaplama || 0)) < 1 &&
                Math.abs(parseFloat(mmGt.min_mukavemet || 0) - parseFloat(request.min_mukavemet || 0)) < 1 &&
                Math.abs(parseFloat(mmGt.max_mukavemet || 0) - parseFloat(request.max_mukavemet || 0)) < 1 &&
                Math.abs(parseFloat(mmGt.kg || 0) - parseFloat(request.kg || 0)) < 1 &&
                Math.abs(parseFloat(mmGt.ic_cap || 0) - parseFloat(request.ic_cap || 0)) < 0.1 &&
                Math.abs(parseFloat(mmGt.dis_cap || 0) - parseFloat(request.dis_cap || 0)) < 0.1
              );
              
              if (specsMatch) {
                isRelatedToDeletedProduct = true;
              }
            }
            
            if (isRelatedToDeletedProduct) {
              requestsToUpdate.push(request.id);
            }
          }
          
          // Update related requests to "silinmiş" status
          if (requestsToUpdate.length > 0) {
            console.log(`Marking ${requestsToUpdate.length} related requests as silinmiş`);
            
            for (const requestId of requestsToUpdate) {
              try {
                await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'silinmis' })
                });
              } catch (updateError) {
                console.error(`Failed to update request ${requestId} status:`, updateError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error updating related request statuses:', error);
        // Continue without failing the deletion
      }
      
      // Refresh the MM GT list
      await fetchExistingMmGts();
      
      // Refresh requests to show updated statuses
      await fetchRequests();
      
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      toast.success(`MM GT ${mmGt.stok_kodu} ve bağlantılı YM GT'ler başarıyla silindi`);
    } catch (error) {
      console.error('MM GT deletion error:', error);
      toast.error('MM GT silme hatası: ' + error.message);
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
    setDeleteType('mmgt');
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
      
      if (activeDbTab === 'mmgt') {
        // Bireysel silme ile ayni mantigi kullanarak MM GT tek tek sil
        console.log('Deleting ' + existingMmGts.length + ' MM GTs with related YM GTs (sequential processing)');
        
        for (const mmGt of existingMmGts) {
          try {
            console.log('Processing MM GT: ' + mmGt.stok_kodu + ' (ID: ' + mmGt.id + ')');
            
            // Find related YM GTs from relationship table
            const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
            if (relationResponse && relationResponse.ok) {
              const relations = await relationResponse.json();
                  
              // Step 1: Delete relationship records first
              for (const relation of relations) {
                try {
                  const relationDeleteResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}/${relation.id}`, {
                    method: 'DELETE'
                  });
                  if (relationDeleteResponse.ok) {
                    console.log(`Bulk: Deleted relationship ${relation.id}`);
                  }
                } catch (relationError) {
                  console.error('Error deleting relationship ' + relation.id + ':', relationError);
                }
              }
              
              // Step 2: Delete related YM GTs after relationships are removed
              for (const relation of relations) {
                if (relation.ym_gt_id) {
                  try {
                    const ymGtDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${relation.ym_gt_id}`, {
                      method: 'DELETE'
                    });
                    if (ymGtDeleteResponse.ok) {
                      console.log(`Bulk: Deleted YM GT ${relation.ym_gt_id}`);
                    } else {
                      console.error('Failed to delete YM GT ' + relation.ym_gt_id + ': ' + ymGtDeleteResponse.status);
                    }
                  } catch (ymGtError) {
                    console.error('Error deleting YM GT ' + relation.ym_gt_id + ':', ymGtError);
                  }
                }
              }
            }
            
            // FALLBACK: Check for orphaned YM GT by stok_kodu pattern
            if (mmGt.stok_kodu && mmGt.stok_kodu.startsWith('GT.')) {
              const expectedYmGtStokKodu = mmGt.stok_kodu.replace(/^GT\./, 'YM.GT.');
              try {
                const ymGtSearchResponse = await fetchWithAuth(`${API_URLS.galYmGt}?stok_kodu=${encodeURIComponent(expectedYmGtStokKodu)}`);
                if (ymGtSearchResponse && ymGtSearchResponse.ok) {
                  const ymGtData = await ymGtSearchResponse.json();
                  if (Array.isArray(ymGtData) && ymGtData.length > 0) {
                    for (const orphanedYmGt of ymGtData) {
                      try {
                        const orphanedDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${orphanedYmGt.id}`, {
                          method: 'DELETE'
                        });
                        if (orphanedDeleteResponse.ok) {
                          console.log(`Bulk: Deleted orphaned YM GT ${orphanedYmGt.id}`);
                        }
                      } catch (orphanedError) {
                        console.error('Bulk: Error deleting orphaned YM GT:', orphanedError);
                      }
                    }
                  }
                }
              } catch (fallbackError) {
                console.error('Bulk: Error in YM GT fallback cleanup:', fallbackError);
              }
            }
            
            // Step 3: Delete the MM GT
            const deleteResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${mmGt.id}`, { 
              method: 'DELETE'
            });
            
            if (deleteResponse.ok) {
              console.log('MM GT ' + mmGt.stok_kodu + ' deleted successfully');
            } else {
              console.error('Failed to delete MM GT ' + mmGt.stok_kodu + ': ' + deleteResponse.status);
            }
            
          } catch (error) {
            console.error('Error processing MM GT ' + mmGt.stok_kodu + ':', error);
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
      if (activeDbTab === 'mmgt') {
        const deletedCount = existingMmGts.length;
        toast.success(`${deletedCount} MM GT ve ilişkili YM GT'ler ile tüm reçeteler başarıyla silindi`);
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
        (request.kod_2 && request.kod_2.toLowerCase().includes(query)) ||
        (request.kaplama && request.kaplama.toString().includes(query)) ||
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
      if (sortField === 'cap' || sortField === 'kaplama' || sortField === 'kg' || sortField === 'cast_kont') {
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
      const updateResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
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
            kalinlik: selectedRequest.kalinlik || '',
            kod_2: selectedRequest.kod_2 || '',
            kalite: selectedRequest.kalite || '',
            kaplama: selectedRequest.kaplama || ''
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
      setMmGtData({
        cap: selectedRequest.cap ? normalizeDecimalDisplay(selectedRequest.cap) : '',
        kod_2: selectedRequest.kod_2 || 'NIT',
        kaplama: selectedRequest.kaplama ? normalizeDecimalDisplay(selectedRequest.kaplama) : '',
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
          sepetli: selectedRequest.stok_adi.includes('-Spt')
        };
        
        // If no packaging suffixes found, fallback to legacy shrink field
        if (!packaging.shrink && !packaging.paletli && !packaging.sepetli && selectedRequest.shrink) {
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
      
      // Trigger YM GT generation for the loaded data
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
      setMmGtData({
        cap: selectedRequest.cap ? normalizeDecimalDisplay(selectedRequest.cap) : '',
        kod_2: selectedRequest.kod_2 || 'NIT',
        kaplama: selectedRequest.kaplama ? normalizeDecimalDisplay(selectedRequest.kaplama) : '',
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
          sepetli: selectedRequest.stok_adi.includes('-Spt')
        };
        
        // If no packaging suffixes found, fallback to legacy shrink field
        if (!packaging.shrink && !packaging.paletli && !packaging.sepetli && selectedRequest.shrink) {
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
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
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

  // Mevcut MM GT seçimi
  const handleSelectExistingMmGt = async (mmGt) => {
    try {
      setIsLoading(true);
      setSelectedExistingMmGt(mmGt);
      setIsViewingExistingProduct(true); // Mark as viewing existing product
      
      // Store original product data for change detection (will be updated after YM STs are loaded)
      setOriginalProductData({
        mmGt: { ...mmGt },
        ymGts: [],
        ymSts: [] // Will be updated after loading
      });
      
      // Extract sequence from existing product's stok_kodu
      const existingSequence = mmGt.stok_kodu ? mmGt.stok_kodu.split('.').pop() : '00';
      console.log('Loading existing MM GT: ' + mmGt.stok_kodu + ' (ID: ' + mmGt.id + ', Sequence: ' + existingSequence + ')');
      setProcessSequence(existingSequence);
      
      // Use normalized decimal display for numeric values to ensure points not commas
      setMmGtData({
        cap: mmGt.cap ? normalizeDecimalDisplay(mmGt.cap) : '',
        kod_2: mmGt.kod_2 || 'NIT',
        kaplama: mmGt.kaplama ? normalizeDecimalDisplay(mmGt.kaplama) : '',
        min_mukavemet: mmGt.min_mukavemet ? normalizeDecimalDisplay(mmGt.min_mukavemet) : '',
        max_mukavemet: mmGt.max_mukavemet ? normalizeDecimalDisplay(mmGt.max_mukavemet) : '',
        kg: mmGt.kg ? normalizeDecimalDisplay(mmGt.kg) : '',
        ic_cap: mmGt.ic_cap || 45,
        dis_cap: mmGt.dis_cap || 75,
        tolerans_plus: mmGt.tolerans_plus !== undefined && mmGt.tolerans_plus !== null ? normalizeDecimalDisplay(Math.abs(mmGt.tolerans_plus)) : '',
        tolerans_minus: mmGt.tolerans_minus !== undefined && mmGt.tolerans_minus !== null ? normalizeDecimalDisplay(Math.abs(mmGt.tolerans_minus)) : '',
        shrink: mmGt.shrink || 'evet',
        unwinding: mmGt.unwinding || '',
        cast_kont: mmGt.cast_kont || '',
        helix_kont: mmGt.helix_kont || '',
        elongation: mmGt.elongation || ''
      });
      
      // Set tolerance signs based on original values
      if (mmGt.tolerans_plus !== undefined && mmGt.tolerans_plus !== null && mmGt.tolerans_plus !== '') {
        setToleransMaxSign(mmGt.tolerans_plus >= 0 ? '+' : '-');
      }
      if (mmGt.tolerans_minus !== undefined && mmGt.tolerans_minus !== null && mmGt.tolerans_minus !== '') {
        setToleransMinSign(mmGt.tolerans_minus >= 0 ? '+' : '-');
      }
      
      // Clear existing selections first to avoid conflicts
      setSelectedYmSts([]);
      setAutoGeneratedYmSts([]);
      setAllRecipes({ mmGtRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
      setRecipeStatus({ mmGtRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
      
      // 🔄 STEP 1: Find all related data through the enhanced relationship table
      console.log('🔍 Step 1: Finding related YM STs and YM GT...');
      const mmGtYmStResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
      
      let loadedYmSts = [];
      let relatedYmGtId = null;
      let mainYmStIndex = 0;
      
      if (mmGtYmStResponse && mmGtYmStResponse.ok) {
        const mmGtYmStRelations = await mmGtYmStResponse.json();
        
        if (mmGtYmStRelations.length > 0) {
          // 🆕 NEW: Get YM GT ID from the relationship (all relations should have the same ym_gt_id)
          relatedYmGtId = mmGtYmStRelations[0].ym_gt_id;
          
          // 🆕 NEW: Sort relations by sequence_index to maintain order
          const sortedRelations = mmGtYmStRelations.sort((a, b) => (a.sequence_index || 0) - (b.sequence_index || 0));
          
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
                  
                  // 🆕 NEW: Track which YM ST is the main one
                  if (relation.is_main) {
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
        mmGtRecipes: {}, 
        ymGtRecipe: {}, 
        ymStRecipes: {} 
      };
      const updatedRecipeStatus = { 
        mmGtRecipes: {}, 
        ymGtRecipe: {}, 
        ymStRecipes: {} 
      };
      
      // 2A. Load MM GT recipes
      try {
        console.log('🍳 Loading MM GT recipes...');
        const mmGtRecipeResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
        if (mmGtRecipeResponse && mmGtRecipeResponse.ok) {
          const mmGtRecipes = await mmGtRecipeResponse.json();
          
          // Initialize MM GT recipes for each YM ST index (including if no YM STs yet)
          const ymStCount = Math.max(loadedYmSts.length, 1); // At least 1 for the case where no YM STs are loaded yet
          for (let index = 0; index < ymStCount; index++) {
            updatedAllRecipes.mmGtRecipes[index] = {};
            updatedRecipeStatus.mmGtRecipes[index] = {};
            
            // Add each recipe
            mmGtRecipes.forEach(recipe => {
              if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                // Special handling for Çinko: database stores as '150' but we display as '150 03'
                let displayCode = recipe.bilesen_kodu;
                if (recipe.bilesen_kodu === '150' && recipe.aciklama === 'Çinko Tüketim Miktarı') {
                  displayCode = '150 03';
                }
                
                updatedAllRecipes.mmGtRecipes[index][displayCode] = parseFloat(recipe.miktar);
                updatedRecipeStatus.mmGtRecipes[index][displayCode] = 'database';
              }
            });
          }
        } else {
          console.log('No MM GT recipes found');
        }
      } catch (mmGtError) {
        console.error('Error loading MM GT recipes:', mmGtError);
      }
      
      // 2B. Load YM GT recipes using the relationship
      if (relatedYmGtId) {
        try {
          
          // 🆕 NEW: Use the YM GT ID from the relationship instead of searching by stok_kodu
          console.log(`📖 Fetching all YM GT recipes and filtering for ym_gt_id=${relatedYmGtId}...`);
          const allYmGtRecipesResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?limit=2000`);
          let ymGtRecipeResponse = null;
          
          if (allYmGtRecipesResponse && allYmGtRecipesResponse.ok) {
            const allYmGtRecipes = await allYmGtRecipesResponse.json();
            const filteredYmGtRecipes = allYmGtRecipes.filter(r => r.ym_gt_id == relatedYmGtId); // Use == for type coercion
            console.log(`📖 Found ${filteredYmGtRecipes.length} YM GT recipes for ym_gt_id=${relatedYmGtId}`);
            
            // Create mock response
            ymGtRecipeResponse = {
              ok: true,
              json: async () => filteredYmGtRecipes
            };
          }
          
          if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
            const ymGtRecipes = await ymGtRecipeResponse.json();
            
            // Store YM GT recipes from database exactly as they are
            ymGtRecipes.forEach(recipe => {
              if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                // Special handling for Çinko: database stores as '150' but we display as '150 03'
                let displayCode = recipe.bilesen_kodu;
                if (recipe.bilesen_kodu === '150' && recipe.aciklama === 'Çinko Tüketim Miktarı') {
                  displayCode = '150 03';
                }
                
                updatedAllRecipes.ymGtRecipe[displayCode] = parseFloat(recipe.miktar);
                updatedRecipeStatus.ymGtRecipe[displayCode] = 'database';
              }
            });
          } else {
            console.log('No YM GT recipes found for ID:', relatedYmGtId);
          }
        } catch (ymGtError) {
          console.error('Error loading YM GT recipes:', ymGtError);
        }
      } else {
        console.log('No related YM GT ID found, calculating YM GT recipes...');
        
        // Generate YM GT data first
        generateYmGtData();
        
        // Only calculate YM GT recipes if NO database recipes exist
        if (loadedYmSts.length > 0) {
          const mainYmSt = loadedYmSts[mainYmStIndex] || loadedYmSts[0];
          
          // Simply set the main YM ST relationship - calculations will be done later if needed
          const ymGtRecipeValues = {
            [mainYmSt.stok_kodu]: 1 // Ana hammadde - other recipes should come from database
          };
          
          // Set the calculated values
          Object.entries(ymGtRecipeValues).forEach(([code, value]) => {
            if (value > 0) {
              updatedAllRecipes.ymGtRecipe[code] = value;
              updatedRecipeStatus.ymGtRecipe[code] = 'auto';
            }
          });
          
        }
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
      
      // Load existing YM GT data if available, otherwise generate it
      if (relatedYmGtId) {
        try {
          const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?id=${relatedYmGtId}`);
          if (ymGtResponse && ymGtResponse.ok) {
            const ymGtData = await ymGtResponse.json();
            const ymGt = Array.isArray(ymGtData) ? ymGtData[0] : ymGtData;
            if (ymGt) {
              console.log('Loaded existing YM GT: ' + ymGt.stok_kodu + ' (ID: ' + ymGt.id + ')');
              setYmGtData({
                stok_kodu: ymGt.stok_kodu,
                stok_adi: ymGt.stok_adi,
                cap: ymGt.cap ? normalizeDecimalDisplay(ymGt.cap) : '',
                kod_2: ymGt.kod_2 || 'NIT',
                kaplama: ymGt.kaplama ? normalizeDecimalDisplay(ymGt.kaplama) : '',
                min_mukavemet: ymGt.min_mukavemet ? normalizeDecimalDisplay(ymGt.min_mukavemet) : '',
                max_mukavemet: ymGt.max_mukavemet ? normalizeDecimalDisplay(ymGt.max_mukavemet) : '',
                kg: ymGt.kg ? normalizeDecimalDisplay(ymGt.kg) : '',
                ic_cap: ymGt.ic_cap || 45,
                dis_cap: ymGt.dis_cap || 75,
                tolerans_plus: ymGt.tolerans_plus ? normalizeDecimalDisplay(ymGt.tolerans_plus) : '',
                tolerans_minus: ymGt.tolerans_minus ? normalizeDecimalDisplay(ymGt.tolerans_minus) : '',
                shrink: ymGt.shrink || 'evet',
                unwinding: ymGt.unwinding || ''
              });
            }
          } else {
            console.log('Failed to load YM GT, generating new data');
            generateYmGtData();
          }
        } catch (error) {
          console.error('Error loading YM GT:', error);
          generateYmGtData();
        }
      } else {
        console.log('ℹ️ No related YM GT found, generating new data');
        generateYmGtData();
      }
      
      // Stay on input step for editing, or move to summary for viewing
      setShowExistingMmGtModal(false);
      // Keep on input step when editing so user can modify basic product details
      setCurrentStep('input');
      
      console.log('📊 Recipe data summary:', {
        mmGtRecipes: Object.keys(updatedAllRecipes.mmGtRecipes).length,
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
      kod_2: data.kod_2 || '',
      kalite: data.kalite || '',
      kaplama: data.kaplama || '',
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
  const generateMmGtStokAdi = () => generateStokAdi();

  // Detect changes between original and current data
  const detectChanges = () => {
    if (!originalProductData || !originalProductData.mmGt) return [];
    
    const changes = [];
    const original = originalProductData.mmGt;
    
    // Check each field for changes
    const fieldsToCheck = [
      { key: 'cap', label: 'Çap' },
      { key: 'kod_2', label: 'Kod' },
      { key: 'kaplama', label: 'Kaplama' },
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
      const currentValue = mmGtData[field.key];
      
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
      sepetli: original.stok_adi?.includes('-Spt')
    };
    
    if (originalPackaging.shrink !== paketlemeSecenekleri.shrink ||
        originalPackaging.paletli !== paketlemeSecenekleri.paletli ||
        originalPackaging.sepetli !== paketlemeSecenekleri.sepetli) {
      changes.push({
        field: 'Paketleme Seçenekleri',
        oldValue: `Shrink: ${originalPackaging.shrink ? 'Evet' : 'Hayır'}, Paletli: ${originalPackaging.paletli ? 'Evet' : 'Hayır'}, Sepetli: ${originalPackaging.sepetli ? 'Evet' : 'Hayır'}`,
        newValue: `Shrink: ${paketlemeSecenekleri.shrink ? 'Evet' : 'Hayır'}, Paletli: ${paketlemeSecenekleri.paletli ? 'Evet' : 'Hayır'}, Sepetli: ${paketlemeSecenekleri.sepetli ? 'Evet' : 'Hayır'}`
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

  // YM GT verilerini otomatik oluştur
  const generateYmGtData = () => {
    if (!mmGtData.cap) return;
    
    // Çap formatını düzelt: 2.50 -> 0250 (tam 4 karakter)
    const capValue = parseFloat(mmGtData.cap);
    const capFormatted = Math.round(capValue * 100).toString().padStart(4, '0');
    const sequence = processSequence || '00'; // Use processSequence state instead of hardcoded '00'
    
    const ymGt = {
      stok_kodu: `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`,
      stok_adi: generateYmGtStokAdi(sequence), // Use the function that handles signs correctly
      cap: capValue,
      kod_2: mmGtData.kod_2,
      kaplama: parseInt(mmGtData.kaplama) || 0,
      min_mukavemet: parseInt(mmGtData.min_mukavemet) || 0,
      max_mukavemet: parseInt(mmGtData.max_mukavemet) || 0,
      kg: parseInt(mmGtData.kg) || 0,
      ic_cap: mmGtData.ic_cap,
      dis_cap: mmGtData.dis_cap,
      tolerans_plus: parseFloat(mmGtData.tolerans_plus) || 0,
      tolerans_minus: parseFloat(mmGtData.tolerans_minus) || 0,
      tolerans_max_sign: toleransMaxSign,
      tolerans_min_sign: toleransMinSign,
      shrink: mmGtData.shrink,
      unwinding: mmGtData.unwinding
    };
    
    setYmGtData(ymGt);
  };

  // Uygun YM ST'leri bul - yeniden arama yapma fonksiyonu
  const findSuitableYmSts = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_URLS.galYmSt}?limit=1000&sort_by=cap&sort_order=asc`);
      if (response && response.ok) {
        const allYmSts = await response.json();
        const cap = parseFloat(mmGtData.cap) || 0;
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
          
          // Ardından geniş aralıkta filtrele
          if (mmGtData.kod_2 === 'PAD') {
            // PAD için çap aralığı kriterlerine göre filtrele
            if (cap >= 0.12 && cap <= 0.14) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 0.12 && ymStCap <= 0.14 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 0.15 && cap <= 2.55) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 0.15 && ymStCap <= 2.55 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 2.60 && cap <= 4.25) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 2.60 && ymStCap <= 4.25 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 4.30 && cap <= 5.90) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 4.30 && ymStCap <= 5.90 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 6.00 && cap <= 7.00) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 6.00 && ymStCap <= 7.00 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 7.30 && cap <= 7.40) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 7.30 && ymStCap <= 7.40 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 7.70 && cap <= 8.00) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 7.70 && ymStCap <= 8.00 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            }
          } else if (mmGtData.kod_2 === 'NIT') {
            // NIT için hesaplanan çap aralığına göre filtrele (prompt'ta belirtilen formüllerle)
            const minYmStCap = cap * 0.935; // %6.5 azalma
            const maxYmStCap = cap * 0.995; // %0.5 azalma
            const rangeFilter = allYmSts.filter(ymSt => {
              const ymStCap = parseFloat(ymSt.cap) || 0;
              return ymStCap >= minYmStCap && ymStCap <= maxYmStCap && !filtered.includes(ymSt);
            });
            filtered = [...filtered, ...rangeFilter];
          }
          
          // En yakın 5 ürünle sınırla
          filtered = filtered.slice(0, 5);
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
    const cap = parseFloat(mmGtData.cap) || 0;
    const kaplama = parseInt(mmGtData.kaplama) || 0;
    const kodType = mmGtData.kod_2; // 'PAD' or 'NIT'

    // ========== STEP 1: Calculate YM ST diameter with CORRECT formula ==========
    // Formula: YM_ST_diameter = YM_GT_nominal - abs(min_tolerance) - coating_reduction
    const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
    const toleransMinSign = mmGtData.tolerans_min_sign || '-';

    const actualToleranceMinus = Math.abs(toleransMinus);
    const coatingReduction = (kaplama / 35) * 0.01; // Changed from Math.floor to match user's formula

    const baseAdjustedCap = cap - actualToleranceMinus - coatingReduction + 0.01; // Added +0.01 as per user's formula
    const ymStDiameter = Math.max(Math.round(baseAdjustedCap * 100) / 100, 0.1); // Minimum 0.1mm, round to 2 decimals

    console.log(`🔧 YM ST Diameter Calculation:`, {
      mmGtCap: cap,
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
        isStProduct: true // Mark as .ST product
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
              isMain: true
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
          isMain: true
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
            isMain: false
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
                isMain: alt.priority === 0
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
          isMain: true
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

    // Calculate recipes for auto-generated YM STs
    setTimeout(() => {
      calculateAutoRecipeValues();
    }, 100);
  };

  // Manuel YM ST oluştur - kullanıcı tarafından seçilen Filmaşin/YM ST ile
  const handleManuelOlustur = async () => {
    try {
      // Validate based on diameter
      const ymStDiam = calculatedYmStDiameter || 0;

      console.log('🔧 Manuel Oluştur - Calculated YM ST Diameter:', ymStDiam);
      console.log('Selected Filmaşin:', manuelFilmasinSelection);
      console.log('Selected YM ST:', manuelYmStSelection);

      if (ymStDiam < 1.5 && !manuelYmStSelection) {
        toast.error('YM ST seçimi gerekli (çap < 1.5mm)');
        return;
      }

      if (ymStDiam >= 1.5 && ymStDiam < 1.8 && (!manuelFilmasinSelection || !manuelYmStSelection)) {
        toast.error('Hem Filmaşin hem YM ST seçimi gerekli (çap 1.5-1.8mm)');
        return;
      }

      if (ymStDiam >= 1.8 && !manuelFilmasinSelection) {
        toast.error('Filmaşin seçimi gerekli (çap >= 1.8mm)');
        return;
      }

      const cap = parseFloat(mmGtData.cap) || 0;
      const kaplama = parseInt(mmGtData.kaplama) || 0;

      // Get tolerances for calculation
      const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
      const actualToleranceMinus = Math.abs(toleransMinus);
      const coatingReduction = (kaplama / 35) * 0.01;
      const baseAdjustedCap = cap - actualToleranceMinus - coatingReduction + 0.01;
      const calculatedCap = Math.max(Math.round(baseAdjustedCap * 100) / 100, 0.1);

      const manuelYmSts = [];

      // Case 1: < 1.5mm - Only YM ST product
      if (ymStDiam < 1.5 && manuelYmStSelection) {
        const selectedYmSt = await fetchWithAuth(`${API_URLS.galYmSt}/${manuelYmStSelection}`);
        if (selectedYmSt && selectedYmSt.ok) {
          const ymStData = await selectedYmSt.json();
          manuelYmSts.push({
            ...ymStData,
            source: 'manual-selected',
            priority: 0,
            isMain: true
          });
        }
      }
      // Case 2: 1.5-1.8mm - Both Filmaşin (Ana) and YM ST (ALT)
      else if (ymStDiam >= 1.5 && ymStDiam < 1.8 && manuelFilmasinSelection && manuelYmStSelection) {
        // Add Filmaşin-based product (Ana)
        const filmasinResponse = await fetchWithAuth(`${API_URLS.galFilmasin}/${manuelFilmasinSelection}`);
        if (filmasinResponse && filmasinResponse.ok) {
          const filmasinData = await filmasinResponse.json();
          const capStr = Math.round(calculatedCap * 100).toString().padStart(4, '0');
          const filmasinStr = (parseFloat(filmasinData.cap) * 100).toString().padStart(4, '0');
          const stokKodu = `YM.ST.${capStr}.${filmasinStr}.${filmasinData.kalite}`;

          manuelYmSts.push({
            stok_kodu: stokKodu,
            stok_adi: `YM Siyah Tel ${calculatedCap.toFixed(2)} mm HM:${filmasinStr}.${filmasinData.kalite}`,
            cap: calculatedCap,
            filmasin: Math.round(parseFloat(filmasinData.cap) * 100),
            quality: filmasinData.kalite,
            payda_1: 1,
            kaplama: kaplama,
            source: 'manual-created-filmasin',
            priority: 0,
            isMain: true
          });
        }

        // Add YM ST product (ALT_1)
        const ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}/${manuelYmStSelection}`);
        if (ymStResponse && ymStResponse.ok) {
          const ymStData = await ymStResponse.json();
          manuelYmSts.push({
            ...ymStData,
            source: 'manual-selected',
            priority: 1
          });
        }
      }
      // Case 3: >= 1.8mm - Only Filmaşin-based product
      else if (ymStDiam >= 1.8 && manuelFilmasinSelection) {
        const filmasinResponse = await fetchWithAuth(`${API_URLS.galFilmasin}/${manuelFilmasinSelection}`);
        if (filmasinResponse && filmasinResponse.ok) {
          const filmasinData = await filmasinResponse.json();
          const capStr = Math.round(calculatedCap * 100).toString().padStart(4, '0');
          const filmasinStr = (parseFloat(filmasinData.cap) * 100).toString().padStart(4, '0');
          const stokKodu = `YM.ST.${capStr}.${filmasinStr}.${filmasinData.kalite}`;

          manuelYmSts.push({
            stok_kodu: stokKodu,
            stok_adi: `YM Siyah Tel ${calculatedCap.toFixed(2)} mm HM:${filmasinStr}.${filmasinData.kalite}`,
            cap: calculatedCap,
            filmasin: Math.round(parseFloat(filmasinData.cap) * 100),
            quality: filmasinData.kalite,
            payda_1: 1,
            kaplama: kaplama,
            source: 'manual-created-filmasin',
            priority: 0,
            isMain: true
          });
        }
      }

      if (manuelYmSts.length === 0) {
        toast.error('Manuel YM ST oluşturulamadı - lütfen seçimleri kontrol edin');
        return;
      }

      console.log(`✅ Manually created ${manuelYmSts.length} YM ST products:`, manuelYmSts.map(y => y.stok_kodu));

      // Add to selected YM STs
      setSelectedYmSts(prev => [...prev, ...manuelYmSts]);

      // Set main YM ST index if this is the first selection
      if (selectedYmSts.length === 0 && manuelYmSts.length > 0) {
        setMainYmStIndex(0);
      }

      // Close modal and reset selections
      setShowManuelOlusturModal(false);
      setManuelFilmasinSelection('');
      setManuelYmStSelection('');

      toast.success(`${manuelYmSts.length} YM ST manuel olarak eklendi`);

      // Calculate recipes
      setTimeout(() => {
        calculateAutoRecipeValues();
      }, 100);

    } catch (error) {
      console.error('Error in handleManuelOlustur:', error);
      toast.error('Manuel YM ST oluşturma hatası: ' + error.message);
    }
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
    1.20: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 5.5, quality: '1006', priority: 1 }
    ],
    1.30: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 5.5, quality: '1006', priority: 1 }
    ],
    1.40: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 5.5, quality: '1006', priority: 1 }
    ],
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
      { diameter: 6.0, quality: '1008', priority: 2 }
    ],
    1.80: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 2 }
    ],
    1.90: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 2 }
    ],
    2.00: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
    ],
    2.10: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 },
      { diameter: 5.5, quality: '1006', priority: 2 }
    ],
    2.20: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 },
      { diameter: 5.5, quality: '1006', priority: 2 }
    ],
    2.30: [
      { diameter: 6.0, quality: '1006', priority: 0 },
      { diameter: 6.0, quality: '1008', priority: 1 }
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
      { diameter: 6.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1008', priority: 1 },
      { diameter: 7.0, quality: '1010', priority: 2 }
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
      { diameter: 7.0, quality: '1008', priority: 0 },
      { diameter: 7.0, quality: '1010', priority: 1 }
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
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    5.90: [
      { diameter: 8.0, quality: '1010', priority: 0 }
    ],
    6.00: [
      { diameter: 8.0, quality: '1010', priority: 0 }
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
      { diameter: 9.0, quality: '1010', priority: 0 }
    ],
    7.10: [
      { diameter: 9.0, quality: '1010', priority: 0 }
    ],
    7.20: [
      { diameter: 9.0, quality: '1010', priority: 0 }
    ],
    7.30: [
      { diameter: 9.0, quality: '1010', priority: 0 }
    ],
    7.40: [
      { diameter: 9.0, quality: '1010', priority: 0 }
    ],
    7.50: [
      { diameter: 9.0, quality: '1010', priority: 0 }
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
        
        // Now check if these YM STs have relationships with MM GT and YM GT
        // and load their recipes as well
        for (let i = 0; i < selectedExisting.length; i++) {
          const ymSt = selectedExisting[i];
          if (ymSt.id) {
            try {
              // Find relationships for this YM ST
              const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?ym_st_id=${ymSt.id}`);
              if (relationResponse && relationResponse.ok) {
                const relations = await relationResponse.json();
                
                if (relations && relations.length > 0) {
                  // Found relationships - load MM GT and YM GT recipes
                  for (const relation of relations) {
                    const ymStIndex = prevSelectedLength + i;
                    
                    // Load MM GT recipes if relation has mm_gt_id
                    if (relation.mm_gt_id) {
                      const mmGtRecipeResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${relation.mm_gt_id}`);
                      if (mmGtRecipeResponse && mmGtRecipeResponse.ok) {
                        const mmGtRecipes = await mmGtRecipeResponse.json();
                        
                        if (!updatedAllRecipes.mmGtRecipes[ymStIndex]) {
                          updatedAllRecipes.mmGtRecipes[ymStIndex] = {};
                        }
                        if (!updatedRecipeStatus.mmGtRecipes[ymStIndex]) {
                          updatedRecipeStatus.mmGtRecipes[ymStIndex] = {};
                        }
                        
                        mmGtRecipes.forEach(recipe => {
                          if (recipe.bilesen_kodu && recipe.miktar !== null) {
                            updatedAllRecipes.mmGtRecipes[ymStIndex][recipe.bilesen_kodu] = parseFloat(recipe.miktar);
                            updatedRecipeStatus.mmGtRecipes[ymStIndex][recipe.bilesen_kodu] = 'database';
                          }
                        });
                        
                      }
                    }
                    
                    // Load YM GT recipes if relation has ym_gt_id
                    if (relation.ym_gt_id) {
                      console.log(`📖 Fetching all YM GT recipes and filtering for ym_gt_id=${relation.ym_gt_id}...`);
                      const allYmGtRecipesResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?limit=2000`);
                      let ymGtRecipeResponse = null;
                      
                      if (allYmGtRecipesResponse && allYmGtRecipesResponse.ok) {
                        const allYmGtRecipes = await allYmGtRecipesResponse.json();
                        const filteredYmGtRecipes = allYmGtRecipes.filter(r => r.ym_gt_id == relation.ym_gt_id); // Use == for type coercion
                        console.log(`📖 Found ${filteredYmGtRecipes.length} YM GT recipes for ym_gt_id=${relation.ym_gt_id}`);
                        
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
        
        // Trigger recipe calculation
        setTimeout(() => {
          calculateAutoRecipeValues();
        }, 100);
        
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
      
      // Trigger recipe calculation to populate other fields
      setTimeout(() => {
        calculateAutoRecipeValues();
      }, 100);
      
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
    if (!mmGtData.kg || parseFloat(mmGtData.kg) <= 0) errors.push('Ağırlık değeri geçersiz');
    if (!mmGtData.cap || parseFloat(mmGtData.cap) <= 0) errors.push('Çap değeri geçersiz');
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

  // ======================= COILER RECETE FUNCTIONS =======================

  // Validate Coiler target inputs
  const validateCoilerTargetInputs = () => {
    const errors = [];

    // Validate diameter
    const diameter = parseFloat(coilerTargetDiameter);
    if (!coilerTargetDiameter || isNaN(diameter)) {
      errors.push('Çap değeri gereklidir');
    } else if (diameter < 0.8 || diameter > 1.8) {
      errors.push(`Çap ${diameter}mm izin verilen aralıkta değil (0.8mm - 1.8mm)`);
    }

    const capStr = Math.round(diameter * 100).toString().padStart(4, '0');
    const targetStokKodu = `YM.ST.${capStr}.ST`; // New format: YM.ST.XXXX.ST

    return {
      valid: errors.length === 0,
      errors,
      diameter,
      capStr,
      targetStokKodu
    };
  };

  // Toggle selection of source YM ST
  const toggleSourceYmStSelection = (ymSt) => {
    // Validate that source diameter is greater than target
    const targetDiameter = parseFloat(coilerTargetDiameter) || 0;
    const sourceDiameter = parseFloat(ymSt.cap) || 0;

    if (targetDiameter > 0 && sourceDiameter <= targetDiameter) {
      toast.error(`Hammadde çapı (${sourceDiameter}mm) hedef çaptan (${targetDiameter}mm) büyük olmalıdır`);
      return;
    }

    setCoilerSourceYmSts(prev => {
      const exists = prev.find(s => s.id === ymSt.id);
      if (exists) {
        return prev.filter(s => s.id !== ymSt.id);
      } else {
        return [...prev, ymSt];
      }
    });
  };

  // Filter and search source YM STs
  const getFilteredSourceYmSts = () => {
    if (!existingYmSts || existingYmSts.length === 0) return [];

    // Parse target diameter for filtering
    const targetDiameter = parseFloat(coilerTargetDiameter) || 0;

    return existingYmSts.filter(ymSt => {
      // Filter by diameter - source must be greater than target
      const sourceDiameter = parseFloat(ymSt.cap) || 0;
      if (targetDiameter > 0 && sourceDiameter <= targetDiameter) {
        return false; // Don't show YM ST with diameter <= target diameter
      }

      // Filter by search term
      if (!coilerSourceYmStSearch) return true;

      const searchLower = coilerSourceYmStSearch.toLowerCase();
      return (
        (ymSt.stok_kodu && ymSt.stok_kodu.toLowerCase().includes(searchLower)) ||
        (ymSt.cap && ymSt.cap.toString().toLowerCase().includes(searchLower)) ||
        (ymSt.filmasin && ymSt.filmasin.toString().toLowerCase().includes(searchLower)) ||
        (ymSt.quality && ymSt.quality.toLowerCase().includes(searchLower))
      );
    });
  };

  // Calculate Coiler recipe values for multiple source YM STs
  const calculateCoilerRecipeValuesForSource = (targetDiameter, sourceYmSt) => {
    if (!targetDiameter || !sourceYmSt) return null;

    const sourceDiameter = parseFloat(sourceYmSt.cap) || 0;
    console.log(`🔧 COILER SOURCE DEBUG: Processing source YM ST: ${sourceYmSt.stok_kodu}, diameter: ${sourceDiameter}mm`);

    // CORRECT: For Coiler, use source YM ST diameter directly as giris_capi
    // TLC_Hızlar table: giris_capi = source diameter, cikis_capi = target diameter
    const giris_capi = sourceDiameter; // Source YM ST diameter (input)
    const cikis_capi = targetDiameter; // Target YM ST diameter (output)

    // Use source YM ST diameter as input to TLC_Hiz lookup
    const tlcHiz = calculateTlcHiz(giris_capi, cikis_capi);
    console.log(`🔧 COILER TLC_HIZ DEBUG: ${giris_capi}mm → ${cikis_capi}mm = TLC_Hiz: ${tlcHiz}`);

    if (!tlcHiz || tlcHiz <= 0) {
      console.warn(`⚠️ COILER: No TLC_Hiz found for ${giris_capi}mm → ${cikis_capi}mm`);
      return {
        materialAmount: 1, // Default 1 kg source YM ST per 1 kg target YM ST
        operationDuration: 0.01 // Default small duration if no valid TLC_Hiz
      };
    }

    // COTLC01 calculation using same formula as YM ST recipe
    const tlc01Raw = (1000 * 4000 / Math.PI / 7.85 / targetDiameter / targetDiameter / tlcHiz / 60);
    const operationDuration = parseFloat((tlc01Raw / 1000).toFixed(5));

    console.log(`🔧 COILER DURATION DEBUG: Source ${sourceDiameter}mm → Target ${targetDiameter}mm → TLC_Hiz ${tlcHiz} → Duration ${operationDuration}`);

    return {
      materialAmount: 1, // 1 kg source YM ST per 1 kg target YM ST
      operationDuration: operationDuration
    };
  };

  // Generate Coiler Excel file
  const generateCoilerExcel = async () => {
    if (!coilerSourceYmSts || coilerSourceYmSts.length === 0) {
      toast.error('Lütfen en az bir Hammadde Siyah Tel seçin');
      return;
    }

    const validation = validateCoilerTargetInputs();
    if (!validation.valid) {
      toast.error(`Validation error: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      setIsGeneratingCoilerExcel(true);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('YM ST REÇETE');

      // Use same headers as existing recipe Excel
      const receteHeaders = getReceteHeaders();
      worksheet.addRow(receteHeaders);

      // Generate rows for each selected source YM ST
      coilerSourceYmSts.forEach((sourceYmSt) => {
        const recipeCalc = calculateCoilerRecipeValuesForSource(validation.diameter, sourceYmSt);

        if (recipeCalc) {
          // Material row (Bileşen) - Always Sıra No: 1
          const materialRow = [
            validation.targetStokKodu, // Mamul Kodu(*)
            '1', // Reçete Top.
            '', // Fire Oranı (%)
            '', // Oto.Reç.
            'KG', // Ölçü Br. (for main product)
            '1', // Sıra No(*) - Always 1 for material
            'B', // Operasyon Bileşen
            sourceYmSt.stok_kodu, // Bileşen Kodu(*)
            '1', // Ölçü Br. - Bileşen
            recipeCalc.materialAmount.toLocaleString('tr-TR', {
              minimumFractionDigits: 5,
              maximumFractionDigits: 5,
              useGrouping: false
            }), // Miktar(*)
            'Hammadde Siyah Tel Tüketimi', // Açıklama
            '', // Miktar Sabitle
            '', // Stok/Maliyet
            '', // Fire Mik.
            '', // Sabit Fire Mik.
            '', // İstasyon Kodu
            '', // Hazırlık Süresi
            '', // Üretim Süresi
            '', // Ü.A.Dahil Edilsin
            '', // Son Operasyon
            '', // Öncelik
            '', // Planlama Oranı
            '', '', '', '', '' // Alternatif Politika fields and İÇ/DIŞ
          ];
          worksheet.addRow(materialRow);

          // Operation row (COTLC01) - Always Sıra No: 2
          const operationRow = [
            validation.targetStokKodu, // Mamul Kodu(*)
            '1', // Reçete Top.
            '', // Fire Oranı (%)
            '', // Oto.Reç.
            'DK', // Ölçü Br. (DK for operation)
            '2', // Sıra No(*) - Always 2 for operation
            'O', // Operasyon Bileşen
            'COTLC01', // Bileşen Kodu(*)
            '1', // Ölçü Br. - Bileşen
            '', // Miktar(*) - Empty for operation
            'Coiler Tel Çekme Operasyonu', // Açıklama
            '', // Miktar Sabitle
            '', // Stok/Maliyet
            '', // Fire Mik.
            '', // Sabit Fire Mik.
            '', // İstasyon Kodu
            '', // Hazırlık Süresi
            recipeCalc.operationDuration.toLocaleString('tr-TR', {
              minimumFractionDigits: 5,
              maximumFractionDigits: 5,
              useGrouping: false
            }), // Üretim Süresi - Duration goes here!
            'E', // Ü.A.Dahil Edilsin
            'E', // Son Operasyon
            '', // Öncelik (was 'E', should be empty)
            '', // Planlama Oranı
            '', '', '', '', '' // Alternatif Politika fields and İÇ/DIŞ
          ];
          worksheet.addRow(operationRow);
        }
      });

      // Save Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `Coiler_Recete_${validation.capStr}_${timestamp}.xlsx`;

      saveAs(new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }), filename);

      toast.success(`Coiler Reçete Excel dosyası oluşturuldu: ${filename}`);

      // Close modal and reset form
      setShowCoilerReceteModal(false);
      setCoilerTargetDiameter('');
      setCoilerSourceYmSts([]);
      setCoilerSourceYmStSearch('');

    } catch (error) {
      console.error('Coiler Excel generation error:', error);
      toast.error(`Excel oluşturma hatası: ${error.message}`);
    } finally {
      setIsGeneratingCoilerExcel(false);
    }
  };

  // ======================= END COILER RECETE FUNCTIONS =======================

  // ======================= YM ST RECETE (STANDALONE) FUNCTIONS =======================

  // Add YM ST to list
  const addYmStToReceteList = () => {
    const capValue = parseFloat(newYmStRecete.cap);
    const filmasinValue = parseFloat(newYmStRecete.filmasin);
    const qualityValue = newYmStRecete.quality;

    // Validation
    if (!capValue || capValue <= 0) {
      toast.error('Geçerli bir YM ST çapı girin');
      return;
    }
    if (!filmasinValue || filmasinValue <= 0) {
      toast.error('Geçerli bir filmaşin çapı girin');
      return;
    }
    if (!qualityValue) {
      toast.error('Kalite seçin');
      return;
    }

    const capStr = Math.round(capValue * 100).toString().padStart(4, '0');
    const filmasinStr = Math.round(filmasinValue * 100).toString().padStart(4, '0');
    const stokKodu = `YM.ST.${capStr}.${filmasinStr}.${qualityValue}`;
    const stokAdi = `YM Siyah Tel ${capValue.toFixed(2)} mm HM:${filmasinStr}.${qualityValue}`;

    // Check for duplicates
    if (ymStReceteList.some(item => item.stok_kodu === stokKodu)) {
      toast.warning('Bu YM ST zaten listede mevcut');
      return;
    }

    const newYmSt = {
      stok_kodu: stokKodu,
      stok_adi: stokAdi,
      cap: capValue,
      filmasin: filmasinValue,
      quality: qualityValue
    };

    setYmStReceteList(prev => [...prev, newYmSt]);
    setNewYmStRecete({ cap: '', filmasin: '', quality: '' });
    toast.success('YM ST listeye eklendi');
  };

  // Remove YM ST from list
  const removeYmStFromReceteList = (stokKodu) => {
    setYmStReceteList(prev => prev.filter(item => item.stok_kodu !== stokKodu));
  };

  // Generate YM ST Excel files (Stok + Reçete)
  const generateYmStReceteExcel = async () => {
    if (ymStReceteList.length === 0) {
      toast.error('Lütfen en az bir YM ST ekleyin');
      return;
    }

    try {
      setIsGeneratingYmStExcel(true);

      // ===== STOK KARTI EXCEL =====
      const stokWorkbook = new ExcelJS.Workbook();
      const stokSheet = stokWorkbook.addWorksheet('YM ST');

      // Add headers
      const stokHeaders = getYmStHeaders();
      stokSheet.addRow(stokHeaders);

      // Add YM ST products
      ymStReceteList.forEach(ymSt => {
        stokSheet.addRow(generateYmStStokKartiData(ymSt));
      });

      // Save Stok Kartı Excel
      const stokBuffer = await stokWorkbook.xlsx.writeBuffer();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const stokFilename = `YM_ST_Stok_Karti_${timestamp}.xlsx`;
      saveAs(new Blob([stokBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }), stokFilename);

      // ===== REÇETE EXCEL =====
      const receteWorkbook = new ExcelJS.Workbook();
      const receteSheet = receteWorkbook.addWorksheet('YM ST REÇETE');

      // Add headers
      const receteHeaders = getReceteHeaders();
      receteSheet.addRow(receteHeaders);

      // Add recipes for each YM ST using the same helper functions as main flow
      ymStReceteList.forEach(ymSt => {
        // Calculate TLC01 value using the proper calculateTlcHiz function
        const ymStCap = parseFloat(ymSt.cap);
        const hmCap = parseFloat(ymSt.filmasin);

        // Calculate TLC_Hiz using the same function as main flow
        const tlcHizValue = calculateTlcHiz(hmCap, ymStCap);

        // TLC01 formula
        const tlc01Raw = (1000 * 4000 / Math.PI / 7.85 / ymStCap / ymStCap / tlcHizValue / 60);
        const tlcValue = parseFloat((tlc01Raw / 1000).toFixed(5));

        // Filmaşin code
        const filmasinStr = Math.round(ymSt.filmasin * 100).toString().padStart(4, '0');
        const filmasinKodu = `FLM.${filmasinStr}.${ymSt.quality}`;

        // Use the exact same helper function as main flow for YM ST recipe rows
        // Row 1: Filmaşin (Bileşen)
        receteSheet.addRow(generateYmStReceteRow(filmasinKodu, 1, 1, ymSt));

        // Row 2: TLC01 (Operasyon)
        receteSheet.addRow(generateYmStReceteRow('TLC01', tlcValue, 2, ymSt));
      });

      // Save Reçete Excel
      const receteBuffer = await receteWorkbook.xlsx.writeBuffer();
      const receteFilename = `YM_ST_Recete_${timestamp}.xlsx`;
      saveAs(new Blob([receteBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }), receteFilename);

      toast.success(`${ymStReceteList.length} YM ST için Stok ve Reçete Excel dosyaları oluşturuldu!`);

      // Close modal and reset
      setShowYmStReceteModal(false);
      setYmStReceteList([]);
      setNewYmStRecete({ cap: '', filmasin: '', quality: '' });

    } catch (error) {
      console.error('YM ST Excel generation error:', error);
      toast.error(`Excel oluşturma hatası: ${error.message}`);
    } finally {
      setIsGeneratingYmStExcel(false);
    }
  };

  // ======================= END YM ST RECETE (STANDALONE) FUNCTIONS =======================

  // Otomatik reçete değerlerini hesapla - NOKTA kullan ve geliştirilmiş hata kontrolü ile
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
    
    // DÜZELTME: mmGtSequence değişkenini tanımla
    const sequence = '00'; // Default sequence
    
    const cap = parseFloat(mmGtData.cap) || 0;
    const kg = parseFloat(mmGtData.kg) || 0;
    const kaplama = parseInt(mmGtData.kaplama) || 0;
    
    // Create copies of arrays to avoid direct state mutation
    const updatedSelectedYmSts = [...selectedYmSts];
    const updatedAutoGeneratedYmSts = [...autoGeneratedYmSts];
    const allYmSts = [...updatedSelectedYmSts, ...updatedAutoGeneratedYmSts];
    
    // Tüm YM ST'ler için reçeteler hesapla
    const newMmGtRecipes = {};
    const newYmStRecipes = {};
    let newYmGtRecipe = {};
    
    // Reçete durumlarını güncelle
    const newRecipeStatus = {
      mmGtRecipes: {},
      ymGtRecipe: {},
      ymStRecipes: {}
    };
    
    // Her YM ST için sequence değer hesapla
    allYmSts.forEach((ymSt, index) => {
      const sequence = index.toString().padStart(2, '0');
      const capFormatted = Math.round(cap * 100).toString().padStart(4, '0');
      
      // MM GT Reçete - her MM GT için
      // DÜZELTME: YMGT kod oluştur - sequence parametresini kullan
      let correctYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      
      // Otomatik Doldur: Shrink tipi ve miktarını otomatik belirle (İç Çap'a göre)
      const shrinkCode = getShrinkCode(mmGtData.ic_cap);
      const shrinkAmount = calculateShrinkAmount(kg);
      
      // We'll calculate values without modifying the YM ST objects directly
      // This avoids interfering with the selection functionality
      // The original objects will be preserved, just recipes will be calculated
      
      // Updated formulas with adjusted coefficients to match target values
      // Target analysis: 900kg coil should give ~0.0011 NAYLON, 0.0013 CEMBER, 0.0044 TOKA/HALKA, 0.0089 KARTON, 0.011 GTPKT01
      
      // NAYLON (KG/TON): =(1*(1000/'COIL WEIGHT (KG)'))/1000 - Original formula
      const naylonValue = parseFloat(((1 * (1000 / kg)) / 1000).toFixed(5));
      
      // AMB.APEX CEMBER 38X080: =(1.2*(1000/'COIL WEIGHT (KG)'))/1000
      const cemberValue = parseFloat(((1.2 * (1000 / kg)) / 1000).toFixed(5));
      
      // AMB.TOKA.SIGNODE.114P. DKP: =(4*(1000/'COIL WEIGHT (KG)'))/1000
      const tokaValue = parseFloat(((4.0 * (1000 / kg)) / 1000).toFixed(5));
      
      // SM.7MMHALKA: =(4*(1000/'COIL WEIGHT (KG)'))/1000
      const halkaValue = parseFloat(((4.0 * (1000 / kg)) / 1000).toFixed(5));
      
      // AMB.ÇEM.KARTON.GAL: =(8*(1000/'COIL WEIGHT (KG)'))/1000
      const kartonValue = parseFloat(((8.0 * (1000 / kg)) / 1000).toFixed(5));
      
      // GTPKT01: Keep formula but coefficients should now better match target ~0.011
      const gtpktValue = parseFloat(((1000 / kg * userInputValues.paketlemeDkAdet) / 1000).toFixed(5));
      
      // DÜZELTME: SM.DESİ.PAK = 0.1231* AMB.ÇEM.KARTON.GAL + 0.0154* NAYLON (referans formülüne göre)
      // Önceki hata: shrinkAmount kullanılıyordu, doğrusu naylonValue olmalı
      const desiValue = safeCalculate(
        () => 0.1231 * kartonValue + 0.0154 * naylonValue,
        0.002, // Varsayılan desi değeri
        { kartonValue, naylonValue },
        'SM.DESİ.PAK'
      );
      
      // Debug bilgisi
      debugFormula('SM.DESİ.PAK', 
        { kartonValue, naylonValue }, 
        desiValue,
        [`0.1231 * ${kartonValue} + 0.0154 * ${naylonValue} = ${desiValue}`]
      );
      
      // Hesaplama sonuçlarını debug et
      debugFormula('NAYLON', { kg }, naylonValue, [`(1 * (1000/${kg}))/1000 = ${naylonValue}`]);
      debugFormula('KARTON', { kg }, kartonValue, [`(8 * (1000/${kg}))/1000 = ${kartonValue}`]);
      debugFormula('GTPKT01', { kg, paketleme: userInputValues.paketlemeDkAdet }, gtpktValue);
      
      newMmGtRecipes[index] = {
        [correctYmGtStokKodu]: 1, // YM GT bileşeni - MMGT ile aynı sequence kullanılmalı
        'GTPKT01': parseFloat(gtpktValue.toFixed(5)),
        // NAYLON removed - it's already represented by AMB.SHRİNK codes
        'AMB.ÇEM.KARTON.GAL': parseFloat(kartonValue.toFixed(5)),
        [shrinkCode]: parseFloat(shrinkAmount.toFixed(5)), // Shrink ayrı bileşen olarak
        'SM.7MMHALKA': parseFloat(halkaValue.toFixed(5)),
        'AMB.APEX CEMBER 38X080': parseFloat(cemberValue.toFixed(5)),
        'AMB.TOKA.SIGNODE.114P. DKP': parseFloat(tokaValue.toFixed(5)),
        'SM.DESİ.PAK': parseFloat(desiValue.toFixed(5))
      };
      
      // Reçete durumlarını 'auto' olarak işaretle
      newRecipeStatus.mmGtRecipes[index] = {};
      Object.keys(newMmGtRecipes[index]).forEach(key => {
        newRecipeStatus.mmGtRecipes[index][key] = 'auto';
      });
      
      // ========== YM ST Recipe Calculation ==========
      const ymStCap = parseFloat(ymSt.cap); // Each YM ST must use its own cap value

      // Check if this is a .ST product (COTLC01-based) or filmaşin-based (TLC01)
      const isStProduct = ymSt.isStProduct || ymSt.quality === 'ST';

      if (isStProduct) {
        // ========== .ST PRODUCT: Use COTLC01 with source YM ST ==========
        console.log(`📍 Calculating .ST recipe for ${ymSt.stok_kodu}`);

        // Find suitable source YM ST from existing YM STs (larger diameter, filmaşin-based)
        let sourceYmSt = null;
        if (existingYmSts && existingYmSts.length > 0) {
          // Filter for filmaşin-based YM STs with larger diameter
          const suitableSources = existingYmSts.filter(ym => {
            const sourceCap = parseFloat(ym.cap) || 0;
            const isFilmasinBased = ym.quality !== 'ST' && ym.filmasin > 0;
            return sourceCap > ymStCap && isFilmasinBased;
          });

          // Sort by cap (ascending) and pick the smallest suitable one
          if (suitableSources.length > 0) {
            suitableSources.sort((a, b) => parseFloat(a.cap) - parseFloat(b.cap));
            sourceYmSt = suitableSources[0];
            console.log(`✅ Found source YM ST: ${sourceYmSt.stok_kodu} (${sourceYmSt.cap}mm)`);
          }
        }

        if (sourceYmSt) {
          // Calculate COTLC01 operation using coiler logic
          const sourceDiameter = parseFloat(sourceYmSt.cap);
          const giris_capi = sourceDiameter;
          const cikis_capi = ymStCap;

          const tlcHiz = calculateTlcHiz(giris_capi, cikis_capi);

          let operationDuration = 0.01; // Default small duration
          if (tlcHiz && tlcHiz > 0) {
            const cotlc01Raw = (1000 * 4000 / Math.PI / 7.85 / ymStCap / ymStCap / tlcHiz / 60);
            operationDuration = parseFloat((cotlc01Raw / 1000).toFixed(5));
          }

          console.log(`🔧 COTLC01: ${sourceDiameter}mm → ${ymStCap}mm, TLC_Hiz: ${tlcHiz}, Duration: ${operationDuration}`);

          newYmStRecipes[index] = {
            [sourceYmSt.stok_kodu]: 1, // Source YM ST (1 kg)
            'COTLC01': operationDuration // Coiler operation duration
          };
        } else {
          // No source YM ST found - create placeholder recipe
          console.warn(`⚠️ No source YM ST found for .ST product ${ymSt.stok_kodu}`);
          newYmStRecipes[index] = {
            'NOTE': '(Hammadde YM ST seçilmeli)' // Placeholder
          };
        }

      } else {
        // ========== FILMAŞIN PRODUCT: Use TLC01 ==========
        const filmasinKodu = getFilmasinKodu(ymSt);

        // Extract HM_Cap from filmasinKodu (e.g., "FLM.0800.1010" -> 8)
        const hmCapMatch = filmasinKodu.match(/FLM\.0*(\d+)\./);
        const hmCap = hmCapMatch ? parseFloat(hmCapMatch[1]) / 100 : 6; // Default to 6 if not found

        // Otomatik Doldur: YM ST Filmaşin ve Kalite değerlerini otomatik seç (kullanıcı değiştirebilir)
        if (!ymSt.filmasin || !ymSt.quality || ymSt.source === 'auto-generated') {
          if (hmCapMatch) {
            ymSt.filmasin = parseInt(hmCapMatch[1]);
            console.log('Otomatik Doldur: Filmasin Capi = ' + (ymSt.filmasin/100) + 'mm secildi for cap ' + ymSt.cap);
          }
          const qualityMatch = filmasinKodu.match(/\.(\d{4})$/);
          if (qualityMatch) {
            ymSt.quality = qualityMatch[1];
            console.log('Otomatik Doldur: Filmasin Kalitesi = ' + ymSt.quality + ' secildi for cap ' + ymSt.cap);
          }
          ymSt.autoSelected = true;
        }

        // Calculate TLC_Hiz using the lookup table
        const tlcHiz = calculateTlcHiz(hmCap, cap);

        if (!tlcHiz || tlcHiz <= 0) {
          newYmStRecipes[index] = {
            [filmasinKodu]: 1,
            'TLC01': ''
          };
        } else {
          const tlc01Raw = (1000 * 4000 / Math.PI / 7.85 / ymStCap / ymStCap / tlcHiz / 60);
          const tlcValue = parseFloat((tlc01Raw / 1000).toFixed(5));

          newYmStRecipes[index] = {
            [filmasinKodu]: 1,
            'TLC01': tlcValue
          };
        }
      }
      
      // YM ST reçete durumlarını 'auto' olarak işaretle
      newRecipeStatus.ymStRecipes[index] = {};
      Object.keys(newYmStRecipes[index]).forEach(key => {
        newRecipeStatus.ymStRecipes[index][key] = 'auto';
      });
    });
    
    // YM GT Reçete (sequence 00 için)
    // Calculate YM GT recipe fields regardless of YM ST selection
    // This allows users to see calculated values even before selecting YM STs
    
    // Calculate DV (Durdurma Vinç) value based on Min Mukavemet
    const dvValue = calculateDV(parseInt(mmGtData.min_mukavemet));
    
    // GLV01:= =1000*4000/ Çap/ Çap /PI()/7.85/'DV'* Çap
    // Excel shows 126.7 dk/ton, we need dk/kg so divide by 1000
    // Original formula gives dk/ton, convert to dk/kg
    const glvTimeRaw = (1000 * 4000 / cap / cap / Math.PI / 7.85 / dvValue * cap);
    const glvTime = parseFloat((glvTimeRaw / 1000).toFixed(5)); // Convert dk/ton to dk/kg
    
    // SM.HİDROLİK.ASİT: =('YuzeyAlani'*'tuketilenAsit')/1000
    const yuzeyAlani = calculateYuzeyAlani(cap);
    const tuketilenAsit = calculateTuketilenAsit();
    const acidConsumption = parseFloat(((yuzeyAlani * tuketilenAsit) / 1000).toFixed(5));
    
    // 150 03(Çinko) : =((1000*4000/3.14/7.85/'DIA (MM)'/'DIA (MM)'*'DIA (MM)'*3.14/1000*'ZING COATING (GR/M2)'/1000)+('Ash'*0.6)+('Lapa'*0.7))/1000
    const zincConsumption = parseFloat((
      ((1000 * 4000 / Math.PI / 7.85 / cap / cap * cap * Math.PI / 1000 * kaplama / 1000) + 
      (userInputValues.ash * 0.6) + 
      (userInputValues.lapa * 0.7)) / 1000
    ).toFixed(5));
    
    
    if (allYmSts.length > 0) {
      // If YM STs are selected, include the first YM ST stok_kodu in the recipe
      const firstYmSt = allYmSts[0];
      if (!firstYmSt || !firstYmSt.stok_kodu) {
        console.error('HATA: İlk YM ST eksik veya stok_kodu tanımsız!', firstYmSt);
        toast.error('İlk YM ST eksik veya stok_kodu tanımsız! YM GT reçetesi oluşturulamadı.');
        return;
      }
      
      
      newYmGtRecipe = {
        [firstYmSt.stok_kodu]: 1 - zincConsumption, // İlk YM ST component - Miktar = 1 - Çinko Tüketim Miktarı
        'GLV01': glvTime, // Galvanizleme operasyonu
        '150 03': zincConsumption, // Çinko Tüketim Miktarı - restored to YM GT for correct Excel format
        'SM.HİDROLİK.ASİT': acidConsumption // Asit tüketimi
      };
    } else {
      // If no YM STs are selected, still calculate the other fields
      // This allows the user to see the calculated values for GLV01, Zinc, and Acid
      newYmGtRecipe = {
        'GLV01': glvTime, // Galvanizleme operasyonu
        '150 03': zincConsumption, // Çinko Tüketim Miktarı
        'SM.HİDROLİK.ASİT': acidConsumption // Asit tüketimi
      };
    }
    
    
    // YM GT reçete durumlarını 'auto' olarak işaretle
    Object.keys(newYmGtRecipe).forEach(key => {
      newRecipeStatus.ymGtRecipe[key] = 'auto';
    });
    
    // YM ST dizilerini direkt güncellemeiyoruz - seçim sorunlarını önlemek için
    // Sadece reçeteler güncellenecek, orijinal YM ST objeleri korunacak
    
    // Tüm hesaplamaların başarılı olduğunu doğrula
    const totalCalculations = Object.keys(newMmGtRecipes).length + 
                             Object.keys(newYmGtRecipe).length + 
                             Object.keys(newYmStRecipes).length;
    
    if (totalCalculations > 0) {
      setAllRecipes(prev => {
        // Preserve existing database values and only update auto-calculated ones
        const mergedMmGtRecipes = { ...prev.mmGtRecipes };
        const mergedYmGtRecipe = { ...prev.ymGtRecipe };
        const mergedYmStRecipes = { ...prev.ymStRecipes };
        
        // Merge MM GT recipes - preserve database values
        Object.keys(newMmGtRecipes).forEach(index => {
          if (!mergedMmGtRecipes[index]) {
            mergedMmGtRecipes[index] = {};
          }
          Object.keys(newMmGtRecipes[index]).forEach(key => {
            // Only update if not from database
            if (!recipeStatus.mmGtRecipes[index]?.[key] || recipeStatus.mmGtRecipes[index][key] !== 'database') {
              mergedMmGtRecipes[index][key] = newMmGtRecipes[index][key];
            }
          });
        });
        
        // Merge YM GT recipe - preserve database values
        Object.keys(newYmGtRecipe).forEach(key => {
          // Only update if not from database
          if (!recipeStatus.ymGtRecipe[key] || recipeStatus.ymGtRecipe[key] !== 'database') {
            mergedYmGtRecipe[key] = newYmGtRecipe[key];
            if (key === '150 03') {
            }
          }
        });
        console.log('Final mergedYmGtRecipe:', mergedYmGtRecipe);
        
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
          mmGtRecipes: mergedMmGtRecipes,
          ymGtRecipe: mergedYmGtRecipe,
          ymStRecipes: mergedYmStRecipes
        };
      });
      
      setRecipeStatus(prev => {
        // Merge status, preserving 'database' status
        const mergedStatus = { ...prev };
        
        // Update MM GT recipe status
        Object.keys(newRecipeStatus.mmGtRecipes).forEach(index => {
          if (!mergedStatus.mmGtRecipes[index]) {
            mergedStatus.mmGtRecipes[index] = {};
          }
          Object.keys(newRecipeStatus.mmGtRecipes[index]).forEach(key => {
            // Only update if not from database
            if (!prev.mmGtRecipes[index]?.[key] || prev.mmGtRecipes[index][key] !== 'database') {
              mergedStatus.mmGtRecipes[index][key] = newRecipeStatus.mmGtRecipes[index][key];
            }
          });
        });
        
        // Update YM GT recipe status
        Object.keys(newRecipeStatus.ymGtRecipe).forEach(key => {
          // Only update if not from database
          if (!prev.ymGtRecipe[key] || prev.ymGtRecipe[key] !== 'database') {
            mergedStatus.ymGtRecipe[key] = newRecipeStatus.ymGtRecipe[key];
          }
        });
        
        // Update YM ST recipe status
        Object.keys(newRecipeStatus.ymStRecipes).forEach(index => {
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
      toast.success(`${totalCalculations} reçete başarıyla hesaplandı!`);
      
      // Hesaplama özetini logla
      
      // Filmaşin dropdown değerlerinin güncellendiğini logla
    } else {
      console.warn('Hiçbir reçete hesaplanamadı - giriş değerlerini kontrol edin');
      toast.warning('Reçete hesaplaması yapılamadı. Lütfen giriş değerlerini kontrol edin.');
    }
  };

  // Fill empty fields with auto-fill indicators for all recipe types
  const fillEmptyFieldsWithAutoFill = () => {
    
    // Instead of using hardcoded defaults, calculate proper values
    calculateAutoRecipeValues(); // Calculate proper recipe values based on formulas
    
    // Mark all filled fields as 'auto' in recipe status
    setRecipeStatus(prev => {
      const updated = { ...prev };
      
      // Mark MM GT recipe fields as auto
      [...selectedYmSts, ...autoGeneratedYmSts].forEach((ymSt, index) => {
        if (!updated.mmGtRecipes[index]) {
          updated.mmGtRecipes[index] = {};
        }
        
        const mmGtFields = ['NAYLON', 'AMB.APEX CEMBER 38X080', 'AMB.TOKA.SIGNODE.114P. DKP', 
                           'SM.7MMHALKA', 'AMB.ÇEM.KARTON.GAL', 'GTPKT01', 'SM.DESİ.PAK'];
        
        const shrinkCode = getShrinkCode(mmGtData.ic_cap);
        if (shrinkCode) {
          mmGtFields.push(shrinkCode);
        }
        
        mmGtFields.forEach(key => {
          if (!prev.mmGtRecipes[index]?.[key] || prev.mmGtRecipes[index][key] !== 'database') {
            updated.mmGtRecipes[index][key] = 'auto';
          }
        });
      });
      
      // Mark YM GT recipe fields as auto
      if (!updated.ymGtRecipe) {
        updated.ymGtRecipe = {};
      }
      
      ['GLV01', '150 03', 'SM.HİDROLİK.ASİT'].forEach(key => {
        if (!prev.ymGtRecipe[key] || prev.ymGtRecipe[key] !== 'database') {
          updated.ymGtRecipe[key] = 'auto';
        }
      });
      
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
    if (cap < 2.0) return 0.00200;
    if (cap >= 2.0 && cap <= 4.0) return 0.00130;
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

  // Gümrük Tarife Kodu belirle
  const getGumrukTarifeKodu = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    if (cap <= 1.5) return '721720300011';  // up to 1.5mm including 1.5
    if (cap > 1.5 && cap <= 6.0) return '721720300012';  // between 1.5 to 6 including 6
    return '721720300013';  // above 6
  };

  const getGumrukTarifeKoduForCap = (capValue) => {
    const cap = parseFloat(capValue) || 0;
    if (cap <= 1.5) return '721720300011';  // up to 1.5mm including 1.5
    if (cap > 1.5 && cap <= 6.0) return '721720300012';  // between 1.5 to 6 including 6
    return '721720300013';  // above 6
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
    const keyFields = ['cap', 'kod_2', 'kaplama', 'min_mukavemet', 'max_mukavemet', 'kg'];
    
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
      setMmGtData(prev => ({
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
    if (['cap', 'kaplama', 'min_mukavemet', 'max_mukavemet', 'kg', 'tolerans_plus', 'tolerans_minus'].includes(field)) {
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
    
    setMmGtData(prev => ({
      ...prev,
      [field]: normalizedValue
    }));
  };


  // Comprehensive state reset function - used when switching between requests
  const resetApplicationState = () => {
    
    setYmGtData(null);
    setSuitableYmSts([]);
    setSelectedYmSts([]);
    setAutoGeneratedYmSts([]);
    setSavedToDatabase(false);
    setDatabaseIds({ mmGtIds: [], ymGtId: null, ymStIds: [] });
    setAllRecipes({ mmGtRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
    setRecipeStatus({ mmGtRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
    setActiveRecipeTab(0);
    setError(null);
    setSuccessMessage('');
    
    // Session tracking temizle
    setSessionSavedProducts({ mmGtIds: [], ymGtId: null, ymStIds: [] });
    
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
    
    // Clear MM GT form data - reset to DEFAULT VALUES (same as initial page load)
    setMmGtData({
      cap: '2.50',           // Default cap value
      kod_2: 'NIT',          // Default to NIT not PAD
      kaplama: '50',         // Default kaplama value
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
  // Validation function for MM GT data with detailed error messages
  const validateMmGtData = () => {
    const errors = [];
    
    // Check required fields
    const requiredFields = {
      'cap': 'Çap',
      'kaplama': 'Kaplama Miktarı',
      'min_mukavemet': 'Min Mukavemet',
      'max_mukavemet': 'Max Mukavemet',
      'kg': 'Ağırlık'
    };
    
    Object.entries(requiredFields).forEach(([field, label]) => {
      if (!mmGtData[field]) {
        errors.push(`${label} alanı zorunludur`);
      }
    });
    
    // If any required fields are missing, return early
    if (errors.length > 0) {
      return errors;
    }
    
    // Çap validation: 0.8 - 8 arasında olmalı
    const capValue = parseFloat(mmGtData.cap);
    if (isNaN(capValue)) {
      errors.push('Çap için geçerli bir sayısal değer giriniz (0.8 ile 8 arasında).');
    } else if (capValue < 0.8 || capValue > 8.1) {
      errors.push(`Çap değeri 0.8 ile 8 arasında olmalıdır. Girilen değer: ${mmGtData.cap}`);
    }
    
    // Kaplama validation: PAD için 50, NIT için 100-400 arasında
    const kaplamaValue = parseFloat(mmGtData.kaplama);
    if (isNaN(kaplamaValue)) {
      errors.push('Kaplama için geçerli bir sayısal değer giriniz.');
    } else {
      if (mmGtData.kod_2 === 'PAD' && (kaplamaValue < 50 || kaplamaValue > 80)) {
        errors.push(`PAD kaplama türü için kaplama değeri 50 ile 80 arasında olmalıdır. Girilen değer: ${mmGtData.kaplama}`);
      } else if (mmGtData.kod_2 === 'NIT' && (kaplamaValue < 100 || kaplamaValue > 400)) {
        errors.push(`NIT kaplama türü için kaplama değeri 100 ile 400 arasında olmalıdır. Girilen değer: ${mmGtData.kaplama}`);
      }
    }
    
    // Tolerans validation and mathematical correction
    let toleransPlusValue = null;
    let toleransMinusValue = null;
    
    if (mmGtData.tolerans_plus) {
      toleransPlusValue = parseFloat(mmGtData.tolerans_plus);
      if (isNaN(toleransPlusValue)) {
        errors.push('Tolerans+ için geçerli bir sayısal değer giriniz.');
      } else if (toleransPlusValue < 0) {
        errors.push(`Tolerans+ değeri negatif olamaz. Girilen değer: ${mmGtData.tolerans_plus}`);
      }
    }
    
    if (mmGtData.tolerans_minus) {
      toleransMinusValue = parseFloat(mmGtData.tolerans_minus);
      if (isNaN(toleransMinusValue)) {
        errors.push('Tolerans- için geçerli bir sayısal değer giriniz.');
      } else if (toleransMinusValue < 0) {
        errors.push(`Tolerans- değeri negatif olamaz. Girilen değer: ${mmGtData.tolerans_minus}`);
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
        setMmGtData(prev => ({
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
    const kgValue = parseFloat(mmGtData.kg);
    if (isNaN(kgValue)) {
      errors.push('Ağırlık için geçerli bir sayısal değer giriniz (250 ile 20000 arasında).');
    } else if (kgValue < 250 || kgValue > 20000) {
      errors.push(`Ağırlık değeri 250 ile 20000 arasında olmalıdır. Girilen değer: ${mmGtData.kg}`);
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
      const mmGtStokAdi = generateStokAdi();
      
      
      // Search ALL MM GT products to find functional duplicates by stok_adi
      const allProductsResponse = await fetchWithAuth(`${API_URLS.galMmGt}?limit=1000`);
      
      if (allProductsResponse && allProductsResponse.ok) {
        const allProducts = await allProductsResponse.json();
        
        if (allProducts.length > 0 && !isViewingExistingProduct) {
          // Find products with the same stok_adi (functional duplicates)
          
          const functionalDuplicates = allProducts.filter(product => {
            const isMatch = product.stok_adi === mmGtStokAdi;
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
    calculateAutoRecipeValues();
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
    
    // Only recalculate auto values if not viewing existing product
    if (!isViewingExistingProduct) {
      // Seçim değiştiğinde reçeteleri yeniden hesapla
      setTimeout(() => {
        calculateAutoRecipeValues();
      }, 200);
    }
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
    setTimeout(() => {
      calculateAutoRecipeValues();
    }, 100);
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
    setTimeout(() => {
      calculateAutoRecipeValues();
    }, 100);
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
      setDatabaseIds({ mmGtIds: [], ymGtId: null, ymStIds: [] });
      setSessionSavedProducts({ mmGtIds: [], ymGtId: null, ymStIds: [] });
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
          [recipeType === 'mmgt' 
            ? 'mmGtRecipes' 
            : recipeType === 'ymgt' 
              ? 'ymGtRecipe' 
              : 'ymStRecipes']: recipeType === 'ymgt' 
                ? { ...prev.ymGtRecipe, [key]: 'manual' }
                : {
                    ...prev[recipeType === 'mmgt' ? 'mmGtRecipes' : 'ymStRecipes'],
                    [ymStIndex]: {
                      ...prev[recipeType === 'mmgt' ? 'mmGtRecipes' : 'ymStRecipes'][ymStIndex],
                      [key]: 'manual'
                    }
                  }
        }));
        
        // Update the appropriate recipe with the exact string value
        if (recipeType === 'mmgt') {
          setAllRecipes(prev => ({
            ...prev,
            mmGtRecipes: {
              ...prev.mmGtRecipes,
              [ymStIndex]: {
                ...prev.mmGtRecipes[ymStIndex],
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

    if (recipeType === 'mmgt') {
      setAllRecipes(prev => ({
        ...prev,
        mmGtRecipes: {
          ...prev.mmGtRecipes,
          [ymStIndex]: {
            ...prev.mmGtRecipes[ymStIndex],
            [key]: formattedValue // Store as formatted string with point decimal
          }
        }
      }));
      // Manuel değişiklik olarak işaretle
      setRecipeStatus(prev => ({
        ...prev,
        mmGtRecipes: {
          ...prev.mmGtRecipes,
          [ymStIndex]: {
            ...prev.mmGtRecipes[ymStIndex],
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
      // FLM değişikliği durumunda diğer hesaplamaları tetikle
      if (key.includes('FLM.')) {
        setTimeout(() => {
          calculateAutoRecipeValues();
        }, 100);
      }
    }
  };

  // Reçete durumunu gösterir
  const getRecipeStatusText = (recipeType, ymStIndex, key) => {
    let status = '';
    if (recipeType === 'mmgt') {
      status = recipeStatus.mmGtRecipes[ymStIndex]?.[key];
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

  // İnkremental ürün oluşturma kontrolü - Değişen mantık: Sadece stok_kodu veya stok_adı etkileyen değerler değişirse
  const checkForExistingProducts = async (cap, kod_2, kaplama, minMukavemet, maxMukavemet, kg) => {
    console.log('🚨 checkForExistingProducts CALLED with params:', { cap, kod_2, kaplama, minMukavemet, maxMukavemet, kg });
    try {
      const capFormatted = Math.round(parseFloat(cap) * 100).toString().padStart(4, '0');
      const mmGtBaseCode = `GT.${kod_2}.${capFormatted}`;
      const ymGtBaseCode = `YM.GT.${kod_2}.${capFormatted}`;
      
      // Search both MMGT and YMGT to find the highest sequence
      const [mmGtResponse, ymGtResponse] = await Promise.all([
        fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu_like=${encodeURIComponent(mmGtBaseCode)}`),
        fetchWithAuth(`${API_URLS.galYmGt}?stok_kodu_like=${encodeURIComponent(ymGtBaseCode)}`)
      ]);
      
      const allProducts = [];
      
      if (mmGtResponse && mmGtResponse.ok) {
        const mmGtProducts = await mmGtResponse.json();
        allProducts.push(...mmGtProducts);
      }
      
      if (ymGtResponse && ymGtResponse.ok) {
        const ymGtProducts = await ymGtResponse.json();
        allProducts.push(...ymGtProducts);
      }
      
      // Filter products to only include those with the exact base code pattern
      const filteredProducts = allProducts.filter(product => {
        const productBaseCode = product.stok_kodu.substring(0, product.stok_kodu.lastIndexOf('.'));
        return productBaseCode === mmGtBaseCode || productBaseCode === ymGtBaseCode;
      });
      
      console.log('🔍 checkForExistingProducts search:');
      console.log('Looking for base codes:', mmGtBaseCode, ymGtBaseCode);
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
    
    if (sessionSavedProducts.mmGtIds.length > 0) {
      // Ana YM ST'yi belirle
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      
      // MMGT için doğru sequence'i belirle - özellikle key değerleri değiştiyse önemli
      let sequence = '00';
      let oldSequence = '00';
      
      // MMGT'nin stok_kodu'ndan mevcut sequence'i al
      const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${sessionSavedProducts.mmGtIds[0]}`);
      if (mmGtResponse && mmGtResponse.ok) {
        const mmGt = await mmGtResponse.json();
        if (mmGt && mmGt.stok_kodu) {
          oldSequence = mmGt.stok_kodu.split('.').pop();
          
          // Key değerlerinde değişim var mı çok dikkatli kontrol et
          const currentKey = `${mmGtData.cap}|${mmGtData.kod_2}|${mmGtData.kaplama}|${mmGtData.min_mukavemet}|${mmGtData.max_mukavemet}|${mmGtData.kg}`;
          const oldKey = `${mmGt.cap}|${mmGt.kod_2}|${mmGt.kaplama}|${mmGt.min_mukavemet}|${mmGt.max_mukavemet}|${mmGt.kg}`;
          
          if (currentKey !== oldKey) {
            // Key değişmişse yeni sequence hesapla using the unified checkForExistingProducts function
            const nextSequence = await checkForExistingProducts(
              mmGtData.cap,
              mmGtData.kod_2,
              mmGtData.kaplama,
              mmGtData.min_mukavemet,
              mmGtData.max_mukavemet,
              mmGtData.kg
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
      
      // Sadece 1 MM GT'yi güncelle
      if (sessionSavedProducts.mmGtIds[0]) {
        await fetchWithAuth(`${API_URLS.galMmGt}/${sessionSavedProducts.mmGtIds[0]}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmGtDatabaseData(sequence))
        });
      }
      
      // Sadece 1 YM GT'yi güncelle
      if (sessionSavedProducts.ymGtId) {
        await fetchWithAuth(`${API_URLS.galYmGt}/${sessionSavedProducts.ymGtId}`, {
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
      
      // MM GT - Ana YM ST ilişkisini güncelle - ilişkileri sil ve yeniden oluştur
      try {
        // Önce ilişkileri sil
        if (sessionSavedProducts.mmGtIds[0]) {
          await fetchWithAuth(`${API_URLS.galMmGtYmSt}/mm_gt/${sessionSavedProducts.mmGtIds[0]}`, {
            method: 'DELETE'
          });
        }
        
        // Yeni ilişkiyi oluştur
        if (sessionSavedProducts.mmGtIds[0] && sessionSavedProducts.ymStIds[mainYmStIndex]) {
          await fetchWithAuth(API_URLS.galMmGtYmSt, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mm_gt_id: sessionSavedProducts.mmGtIds[0],
              ym_gt_id: sessionSavedProducts.ymGtId, // Include YM GT ID
              ym_st_id: sessionSavedProducts.ymStIds[mainYmStIndex],
              is_main: true
            })
          });
        }
      } catch (error) {
        console.error('İlişki güncelleme hatası:', error);
      }
      
      return {
        mmGtIds: [sessionSavedProducts.mmGtIds[0]], // Artık sadece 1 MM GT var
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
        mmGtData.cap,
        mmGtData.kod_2, 
        mmGtData.kaplama,
        mmGtData.min_mukavemet,
        mmGtData.max_mukavemet,
        mmGtData.kg
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
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const baseCode = `GT.${mmGtData.kod_2}.${capFormatted}`;
      
      // Get all existing products with same base code
      const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
      if (response && response.ok) {
        const existingProducts = await response.json();
        
        if (existingProducts.length > 0) {
          // Check each existing product for matches
          for (const existingProduct of existingProducts) {
            // Check if ALL fields match (exact duplicate)
            const allFieldsMatch = 
              Math.abs(parseFloat(existingProduct.cap) - parseFloat(mmGtData.cap)) < 0.001 &&
              existingProduct.kod_2 === mmGtData.kod_2 &&
              Math.abs(parseFloat(existingProduct.tolerans_plus) - parseFloat(mmGtData.tolerans_plus)) < 0.001 &&
              Math.abs(parseFloat(existingProduct.tolerans_minus) - parseFloat(mmGtData.tolerans_minus)) < 0.001 &&
              parseInt(existingProduct.kaplama) === parseInt(mmGtData.kaplama) &&
              parseInt(existingProduct.min_mukavemet) === parseInt(mmGtData.min_mukavemet) &&
              parseInt(existingProduct.max_mukavemet) === parseInt(mmGtData.max_mukavemet) &&
              parseInt(existingProduct.kg) === parseInt(mmGtData.kg) &&
              parseInt(existingProduct.ic_cap) === parseInt(mmGtData.ic_cap) &&
              parseInt(existingProduct.dis_cap) === parseInt(mmGtData.dis_cap) &&
              (existingProduct.cast_kont || 'hayır') === (mmGtData.cast_kont || 'hayır') &&
              (existingProduct.shrink || 'hayır') === (mmGtData.shrink || 'hayır') &&
              (existingProduct.unwinding || '') === (mmGtData.unwinding || '') &&
              (existingProduct.helix_kont || 'hayır') === (mmGtData.helix_kont || 'hayır') &&
              (existingProduct.elongation || '') === (mmGtData.elongation || '');
            
            if (allFieldsMatch) {
              // Exact duplicate found
              setConflictProduct(existingProduct);
              setConflictType('exact');
              setShowProductConflictModal(true);
              setIsLoading(false);
              return false;
            }
            
            // Check if only key fields match (key fields that affect stok_adi and stok_kodu)
            // Key fields: cap, kod_2, tolerans_plus/minus, kaplama, min/max_mukavemet, kg, ic_cap, dis_cap, cast_kont
            const keyFieldsMatch = 
              Math.abs(parseFloat(existingProduct.cap) - parseFloat(mmGtData.cap)) < 0.001 &&
              existingProduct.kod_2 === mmGtData.kod_2 &&
              Math.abs(parseFloat(existingProduct.tolerans_plus) - parseFloat(mmGtData.tolerans_plus)) < 0.001 &&
              Math.abs(parseFloat(existingProduct.tolerans_minus) - parseFloat(mmGtData.tolerans_minus)) < 0.001 &&
              parseInt(existingProduct.kaplama) === parseInt(mmGtData.kaplama) &&
              parseInt(existingProduct.min_mukavemet) === parseInt(mmGtData.min_mukavemet) &&
              parseInt(existingProduct.max_mukavemet) === parseInt(mmGtData.max_mukavemet) &&
              parseInt(existingProduct.kg) === parseInt(mmGtData.kg) &&
              parseInt(existingProduct.ic_cap) === parseInt(mmGtData.ic_cap) &&
              parseInt(existingProduct.dis_cap) === parseInt(mmGtData.dis_cap) &&
              (existingProduct.cast_kont || 'hayır') === (mmGtData.cast_kont || 'hayır');
            
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
            mmGtData.cap,
            mmGtData.kod_2,
            mmGtData.kaplama,  
            mmGtData.min_mukavemet,
            mmGtData.max_mukavemet,
            mmGtData.kg
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
            mmGtData.cap,
            mmGtData.kod_2, 
            mmGtData.kaplama,
            mmGtData.min_mukavemet,
            mmGtData.max_mukavemet,
            mmGtData.kg
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
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const baseCode = `GT.${mmGtData.kod_2}.${capFormatted}`;
      
      // Get all existing products with same base code
      const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
      if (response && response.ok) {
        const existingProducts = await response.json();
        
        if (existingProducts.length > 0) {
          // Check each existing product for matches, excluding the current product being edited
          for (const existingProduct of existingProducts) {
            // Skip the product we're currently editing (same ID)
            if (selectedExistingMmGt && existingProduct.id === selectedExistingMmGt.id) {
              continue;
            }
            
            // Check if ALL fields match (exact duplicate with a different product)
            const allFieldsMatch = 
              Math.abs(parseFloat(existingProduct.cap) - parseFloat(mmGtData.cap)) < 0.001 &&
              existingProduct.kod_2 === mmGtData.kod_2 &&
              Math.abs(parseFloat(existingProduct.tolerans_plus) - parseFloat(mmGtData.tolerans_plus)) < 0.001 &&
              Math.abs(parseFloat(existingProduct.tolerans_minus) - parseFloat(mmGtData.tolerans_minus)) < 0.001 &&
              parseInt(existingProduct.kaplama) === parseInt(mmGtData.kaplama) &&
              parseInt(existingProduct.min_mukavemet) === parseInt(mmGtData.min_mukavemet) &&
              parseInt(existingProduct.max_mukavemet) === parseInt(mmGtData.max_mukavemet) &&
              parseInt(existingProduct.kg) === parseInt(mmGtData.kg) &&
              parseInt(existingProduct.ic_cap) === parseInt(mmGtData.ic_cap) &&
              parseInt(existingProduct.dis_cap) === parseInt(mmGtData.dis_cap) &&
              (existingProduct.cast_kont || 'hayır') === (mmGtData.cast_kont || 'hayır') &&
              (existingProduct.shrink || 'hayır') === (mmGtData.shrink || 'hayır') &&
              (existingProduct.unwinding || '') === (mmGtData.unwinding || '') &&
              (existingProduct.helix_kont || 'hayır') === (mmGtData.helix_kont || 'hayır') &&
              (existingProduct.elongation || '') === (mmGtData.elongation || '');
            
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
      const mmGtIds = [];
      const ymStIds = [];
      let ymGtId = null;
      
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const sequence = nextSequence.toString().padStart(2, '0');
      
      console.log('🔢 SEQUENCE DEBUG: nextSequence =', nextSequence, 'formatted sequence =', sequence);
      
      // IMPORTANT: Set the processSequence state so Excel generation uses correct sequence
      setProcessSequence(sequence);
      
      // Also store sequence in sessionStorage for debugging
      sessionStorage.setItem('lastProcessSequence', sequence);
      
      // Save YM GT - Check if existing YM GT needs to be updated or new one created
      const ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      
      console.log('🔍 DEBUGGING YMGT:');
      console.log('MMGT sequence being used:', sequence);
      console.log('Expected YMGT stok_kodu:', ymGtStokKodu);
      console.log('Calling generateYmGtDatabaseData with sequence:', sequence);
      
      const ymGtData = generateYmGtDatabaseData(sequence); // Use same sequence as MMGT
      console.log('Generated YMGT data stok_kodu:', ymGtData.stok_kodu);
      
      // Check if YM GT already exists (especially important when editing)
      const existingYmGt = await checkExistingProduct(API_URLS.galYmGt, ymGtStokKodu);
      let ymGtResponse;
      
      if (existingYmGt) {
        // Update existing YM GT
        console.log('🔄 Updating existing YM GT with ID:', existingYmGt.id);
        ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${existingYmGt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ymGtData)
        });
        
        if (ymGtResponse && ymGtResponse.ok) {
          ymGtId = existingYmGt.id;
          console.log('✅ YM GT updated successfully with ID:', ymGtId);
        }
      } else {
        // Create new YM GT
        console.log('🆕 Creating new YM GT');
        ymGtResponse = await fetchWithAuth(API_URLS.galYmGt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ymGtData)
        });
        
        if (ymGtResponse && ymGtResponse.ok) {
          const ymGtResult = await ymGtResponse.json();
          ymGtId = ymGtResult.id;
          console.log('✅ YM GT created successfully with ID:', ymGtId);
        }
      }
      
      if (!ymGtResponse || !ymGtResponse.ok) {
        console.error('YM GT operation failed:', ymGtResponse?.status, await ymGtResponse?.text());
        throw new Error('YM GT kaydedilemedi');
      }
      
      // Save MM GT - Update existing if editing, create new if creating
      let mmGtResponse;
      if (isViewingExistingProduct && selectedExistingMmGt) {
        // Update existing MM GT
        console.log('🔄 Updating existing MM GT with ID:', selectedExistingMmGt.id);
        mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${selectedExistingMmGt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmGtDatabaseData(sequence))
        });
        
        if (mmGtResponse && mmGtResponse.ok) {
          mmGtIds.push(selectedExistingMmGt.id); // Use existing ID
          console.log('✅ MM GT updated successfully');
        }
      } else {
        // Create new MM GT
        console.log('🆕 Creating new MM GT');
        mmGtResponse = await fetchWithAuth(API_URLS.galMmGt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmGtDatabaseData(sequence))
        });
        
        if (mmGtResponse && mmGtResponse.ok) {
          const mmGtResult = await mmGtResponse.json();
          mmGtIds.push(mmGtResult.id);
          console.log('✅ MM GT created successfully with ID:', mmGtResult.id);
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
      
      // Create relationships between ALL YM STs and MM GT, including YM GT reference
      
      for (let i = 0; i < ymStIds.length; i++) {
        try {
          const relationshipData = {
            mm_gt_id: mmGtIds[0],
            ym_gt_id: ymGtId, // 🆕 NEW: Include YM GT ID in relationship
            ym_st_id: ymStIds[i],
            is_main: i === mainYmStIndex, // 🆕 NEW: Mark main YM ST
            sequence_index: i // 🆕 NEW: Store sequence/order
          };
          
          console.log(`🔗 Creating relationship ${i + 1}/${ymStIds.length}:`, relationshipData);
          
          await fetchWithAuth(API_URLS.galMmGtYmSt, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(relationshipData)
          });
          
        } catch (relationError) {
          console.error('Error creating relationship for YM ST ' + (i + 1) + ':', relationError);
          // Continue with other relationships even if one fails
        }
      }
      
      const newDatabaseIds = {
        mmGtIds: mmGtIds,
        ymGtId: ymGtId,
        ymStIds: ymStIds
      };
      
      await saveRecipesToDatabase(mmGtIds, ymGtId, ymStIds);
      
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
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          const actualStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
          
          console.log('[proceedWithSave] Updating request ' + requestId + ' with correct stok_kodu: ' + actualStokKodu + ' (sequence: ' + sequence + ')');
          
          const updateResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
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
                const refreshResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`);
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
        await saveRecipesToDatabase(updatedIds.mmGtIds, updatedIds.ymGtId, updatedIds.ymStIds);
        
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
      
      const mmGtIds = [];
      const ymStIds = [];
      let ymGtId = null;
      
      // Aynı sequence ile 1 tane YM GT oluştur (MMGT ile aynı sequence)
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      // sequence already defined above
      // MMGT ile aynı sequence'i kullan
      // Create YM GT stock code
      const ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      const existingYmGt = await checkExistingProduct(API_URLS.galYmGt, ymGtStokKodu);
      
      if (existingYmGt) {
        // YM GT mevcut - güncelle
        const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${existingYmGt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateYmGtDatabaseData(sequence))
        });
        if (ymGtResponse && ymGtResponse.ok) {
          ymGtId = existingYmGt.id;
        }
      } else {
        // YM GT yeni - oluştur
        const ymGtResponse = await fetchWithAuth(API_URLS.galYmGt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateYmGtDatabaseData(sequence))
        });
        
        if (ymGtResponse && ymGtResponse.ok) {
          const ymGtResult = await ymGtResponse.json();
          ymGtId = ymGtResult.id;
        }
      }
      
      // Create MM GT with same sequence
      const mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      const existingMmGt = await checkExistingProduct(API_URLS.galMmGt, mmGtStokKodu);
      
      if (existingMmGt) {
        // MM GT mevcut - güncelle
        const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${existingMmGt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmGtDatabaseData(sequence))
        });
        if (mmGtResponse && mmGtResponse.ok) {
          mmGtIds.push(existingMmGt.id);
        }
      } else {
        // MM GT yeni - oluştur
        const mmGtResponse = await fetchWithAuth(API_URLS.galMmGt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmGtDatabaseData(sequence))
        });
        
        if (mmGtResponse && mmGtResponse.ok) {
          const mmGtResult = await mmGtResponse.json();
          mmGtIds.push(mmGtResult.id);
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
      
      // Sadece ana YM ST ile MM GT arasında ilişki kur
      try {
        await fetchWithAuth(API_URLS.galMmGtYmSt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mm_gt_id: mmGtIds[0],
            ym_gt_id: ymGtId, // Include YM GT ID in relationship
            ym_st_id: ymStIds[mainYmStIndex],
            is_main: true
          })
        });
      } catch (relationError) {
        console.log('İlişki zaten mevcut veya hata oluştu:', relationError);
      }
      
      // Reçeteleri kaydet - sadece 1 MM GT, 1 YM GT ve tüm YM ST'ler için
      await saveRecipesToDatabase(mmGtIds, ymGtId, ymStIds);
      
      setDatabaseIds({
        mmGtIds: mmGtIds,
        ymGtId: ymGtId,
        ymStIds: ymStIds
      });
      
      // Session'da kaydedilen ürünleri takip et
      setSessionSavedProducts({
        mmGtIds: mmGtIds,
        ymGtId: ymGtId,
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
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          const actualStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
          
          console.log('[proceedWithSave] Updating request ' + requestId + ' with correct stok_kodu: ' + actualStokKodu + ' (sequence: ' + sequence + ')');
          
          const updateResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
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

  // Veritabanı için MM GT verisi oluştur - Excel formatıyla tam uyuşum için güncellendi
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

  const generateMmGtDatabaseData = (sequence = '00') => {
    // Sequence değerini doğrula
    const validSequence = validateSequence(sequence);
    const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
    const capValue = parseFloat(mmGtData.cap);

    // Preserve the exact format in existing Excel files
    const capForExcel = capValue.toFixed(2);
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Hem stok_kodu'nda hem de içeride kullanılan sequence değerini güncel tut
    return {
      stok_kodu: `GT.${mmGtData.kod_2}.${capFormatted}.${validSequence}`,
      stok_adi: generateStokAdi(),
      grup_kodu: 'MM',
      kod_1: 'GT',
      kod_2: mmGtData.kod_2,
      turu: 'M',
      mamul_grup: `GT.${mmGtData.kod_2}.${capFormatted}.${validSequence}`,
      muh_detay: '26',
      depo_kodu: '36',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1000.000, // ✅ FIXED - KG to TN conversion (1 TN = 1000 KG)
      cevrim_degeri_1: 0.001, // ✅ FIXED - Conversion rate for KG to TN
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      cap: capValue, // Store as number for calculations
      kaplama: parseInt(mmGtData.kaplama),
      min_mukavemet: parseInt(mmGtData.min_mukavemet),
      max_mukavemet: parseInt(mmGtData.max_mukavemet),
      kg: parseInt(mmGtData.kg),
      ic_cap: parseInt(mmGtData.ic_cap),
      dis_cap: parseInt(mmGtData.dis_cap),
      cap2: capForExcel, // Use formatted string value
      tolerans_plus: adjustedPlus,
      tolerans_minus: adjustedMinus,
      shrink: mmGtData.shrink,
      unwinding: mmGtData.unwinding || '',
      cast_kont: mmGtData.cast_kont || '',
      helix_kont: mmGtData.helix_kont || '',
      elongation: mmGtData.elongation || '',
      amb_shrink: getShrinkCode(mmGtData.ic_cap),
      satis_kdv_orani: '20', // Match Excel format as string
      alis_kdv_orani: '20', // Match Excel format as string
      stok_turu: 'D',
      fiyat_birimi: 1,
      satis_tipi: 1,
      birim_agirlik: parseInt(mmGtData.kg),
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
      zing_coating: `${mmGtData.kaplama} gr/m²`,
      tensile_st_min: `${mmGtData.min_mukavemet} MPa`,
      tensile_st_max: `${mmGtData.max_mukavemet} MPa`,
      wax: 'NONE',
      lifting_lugs: mmGtData.shrink === 'evet' ? 'YES' : 'NO',
      coil_dimensions_id: mmGtData.ic_cap.toString(),
      coil_dimensions_od: mmGtData.dis_cap.toString(),
      coil_weight: mmGtData.kg.toString(),
      coil_weight_min: (parseInt(mmGtData.kg) * 0.95).toFixed(0),
      coil_weight_max: (parseInt(mmGtData.kg) * 1.05).toFixed(0),
      tolerans_aciklama: getToleransAciklama()
    };
  };

  // Veritabanı için YM GT verisi oluştur - Excel formatına tam uyumlu
  const generateYmGtDatabaseData = (sequence = '00') => {
    // YMGT should use the same sequence as MMGT for consistency
    const validSequence = sequence;
    const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
    const capValue = parseFloat(mmGtData.cap);
    const capForExcel = capValue.toFixed(2);
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Sequence değerlerinin MMGT ile aynı olduğunu logla

    return {
      stok_kodu: `YM.GT.${mmGtData.kod_2}.${capFormatted}.${validSequence}`,
      stok_adi: generateYmGtStokAdi(validSequence),
      grup_kodu: 'YM',
      kod_1: 'GT',
      kod_2: mmGtData.kod_2,
      turu: 'Y',
      mamul_grup: `YM.GT.${mmGtData.kod_2}.${capFormatted}.${validSequence}`,
      muh_detay: '83',
      depo_kodu: '35',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1000.000, // ✅ FIXED - KG to TN conversion (1 TN = 1000 KG)
      cevrim_degeri_1: 0.001, // ✅ FIXED - Conversion rate for KG to TN
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      cap: capValue, // Store as number for calculations
      kaplama: parseInt(mmGtData.kaplama),
      min_mukavemet: parseInt(mmGtData.min_mukavemet),
      max_mukavemet: parseInt(mmGtData.max_mukavemet),
      kg: parseInt(mmGtData.kg),
      ic_cap: parseInt(mmGtData.ic_cap),
      dis_cap: parseInt(mmGtData.dis_cap),
      cap2: capForExcel, // Use formatted string to match Excel
      tolerans_plus: adjustedPlus,
      tolerans_minus: adjustedMinus,
      shrink: mmGtData.shrink,
      unwinding: mmGtData.unwinding || '',
      cast_kont: mmGtData.cast_kont || '',
      helix_kont: mmGtData.helix_kont || '',
      elongation: mmGtData.elongation || '',
      satis_kdv_orani: '20', // Match Excel format as string
      alis_kdv_orani: '20', // Match Excel format as string
      stok_turu: 'D',
      fiyat_birimi: 1,
      satis_tipi: 1,
      birim_agirlik: parseInt(mmGtData.kg),
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H',
      alis_doviz_tipi: 2,
      ingilizce_isim: generateYmGtInglizceIsim().replace(/,/g, '.'), // Use the adjusted function and convert commas to dots for database
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
      payda_1: 1000.000, // ✅ FIXED - KG to TN conversion (1 TN = 1000 KG)
      cevrim_degeri_1: 0.001, // ✅ FIXED - Conversion rate for KG to TN
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      satis_kdv_orani: '20', // Match Excel format as string
      cap: ymSt.cap,
      filmasin: parseInt(ymSt.filmasin),
      quality: ymSt.quality,
      ozel_saha_1_say: 1, // ✅ FIXED - Must ALWAYS be 1 for all YM ST products (NOT filmasin value!)
      birim_agirlik: ymSt.kg || 0,
      fiyat_birimi: 1,
      doviz_tip: 1,
      stok_turu: 'D',
      ingilizce_isim: `YM Black Wire ${capForExcel} mm Quality: ${ymSt.quality}`,
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H'
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
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const searchPattern = `GT.${mmGtData.kod_2}.${capFormatted}.`;
      
      // Tüm MM GT ürünlerini getir
      const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}?limit=1000`);
      if (!mmGtResponse || !mmGtResponse.ok) {
        console.warn('MM GT ürünleri alınamadı, sequence "00" kullanılacak');
        return '00';
      }
      
      const allMmGt = await mmGtResponse.json();
      if (!Array.isArray(allMmGt) || allMmGt.length === 0) {
        console.warn('MM GT ürünü bulunamadı, sequence "00" kullanılacak');
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
      continueSaveToDatabase(databaseIds.mmGtIds, databaseIds.ymGtId, databaseIds.ymStIds);
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
      await continueSaveToDatabase(databaseIds.mmGtIds, databaseIds.ymGtId, databaseIds.ymStIds);
      console.log('Veritabanına kayıt işlemi tamamlandı');
      
      // Talep onaylama işlemini kuyruk üzerinden yap
      console.log('Database save başarılı, request onaylama işlemi başlatılıyor...');
      
      // Generate the actual stok_kodu that was used during database save
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const actualStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${processSequence}`;
      
      console.log('Updating request ' + selectedRequest.id + ' with new stok_kodu: ' + actualStokKodu + ' (sequence: ' + processSequence + ')');
      console.log('Original request stok_kodu: ' + selectedRequest.stok_kodu);
      
      // Prepare tracking data for the request update
      const currentProductKey = generateProductKey({
        stok_adi: generateMmGtStokAdi(),
        cap: mmGtData.cap,
        kalinlik: mmGtData.kalinlik,
        kod_2: mmGtData.kod_2,
        kalite: mmGtData.kalite,
        kaplama: mmGtData.kaplama,
        tensile_min: mmGtData.tensile_min,
        tensile_max: mmGtData.tensile_max
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
        original_stok_adi: originalProductData?.mmGt?.stok_adi || selectedRequest.stok_adi || '',
        final_stok_adi: generateMmGtStokAdi(),
        original_product_key: originalProductData ? generateProductKey(originalProductData.mmGt) : '',
        final_product_key: currentProductKey,
        changed_fields: JSON.stringify(changedFieldNames),
        change_summary: changeSummary
      };
      
      console.log(`📤 Sending update request with data:`, updateRequestData);
      
      const updateResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
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
          const refreshResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`);
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
  
  // The actual database save logic is defined below after saveRecipesToDatabase
  
  // This is the main function that gets called from UI
  const saveRecipesToDatabase = async (mmGtIds, ymGtId, ymStIds) => {
    console.log('saveRecipesToDatabase called - isEditingRequest:', isEditingRequest);
    
    // Save the parameters to database IDs state for later use
    setDatabaseIds({
      mmGtIds: mmGtIds || [],
      ymGtId: ymGtId || '',
      ymStIds: ymStIds || []
    });
    
    // Always proceed with normal save
    // Request approval will be handled by the calling context (either approveRequestAndContinue or Sadece Kaydet button)
    console.log('Proceeding with database save only...');
    await continueSaveToDatabase(mmGtIds, ymGtId, ymStIds);
  };
  
  // The actual database save logic that was in the original saveRecipesToDatabase function
  const continueSaveToDatabase = async (mmGtIds, ymGtId, ymStIds) => {
    try {
      // If we're coming from the approval process, reset the editing state
      if (isEditingRequest) {
        setIsEditingRequest(false);
      }
      
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      
      // Sequence değeri MMGT ID'sinden değil, stok_kodu'ndan alınacak
      let sequence = processSequence || '00'; // Use processSequence state instead of hardcoded '00'
      
      let mmGtSequence = sequence; // Öncelikle sequence parametresini kullan
      let mmGtStokKodu = '';
      let ymGtSequence = sequence; // YMGT için de aynı sequence kullan
      let ymGtStokKodu = '';
      
      // 1. MMGT stok_kodu'nu direkt olarak veritabanından al
      if (mmGtIds.length > 0) {
        const mmGtId = mmGtIds[0];
        
        try {
          // MMGT'yi tüm liste içinden bulma yaklaşımı - 404 hatasını önlemek için
          const allMmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}?limit=1000`);
          if (allMmGtResponse && allMmGtResponse.ok) {
            const allMmGt = await allMmGtResponse.json();
            // ID'ye göre ilgili ürünü bul
            const mmGt = Array.isArray(allMmGt) ? allMmGt.find(item => item.id === mmGtId) : null;
            
            if (mmGt && mmGt.stok_kodu) {
              mmGtStokKodu = mmGt.stok_kodu;
              mmGtSequence = mmGt.stok_kodu.split('.').pop();
              
              if (mmGtSequence === '00') {
                console.warn(`UYARI: MMGT ürünü veritabanında "00" sequence ile kaydedilmiş`);
              } else {
              }
            } else {
              console.error(`MMGT veritabanında bulunamadı veya stok_kodu eksik! ID: ${mmGtId}`);
              // Ürün bulunamadı durumunda otomatik kod oluştur
              const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
              mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
              mmGtSequence = '00';
            }
          } else {
            console.error(`MMGT veritabanından alınamadı! ID: ${mmGtId}`);
            // API hatası durumunda otomatik kod oluştur
            const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
            mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
            mmGtSequence = '00';
          }
        } catch (error) {
          console.error(`MMGT bilgileri alınırken hata: ${error.message}`);
          // Hata durumunda otomatik kod oluştur
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
          mmGtSequence = '00';
        }
      }
      
      // 2. YMGT stok_kodu'nu direkt olarak veritabanından al
      if (ymGtId) {
        try {
          // YMGT'yi tüm liste içinden bulma yaklaşımı - 404 hatasını önlemek için
          const allYmGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?limit=1000`);
          if (allYmGtResponse && allYmGtResponse.ok) {
            const allYmGt = await allYmGtResponse.json();
            // ID'ye göre ilgili ürünü bul
            const ymGt = Array.isArray(allYmGt) ? allYmGt.find(item => item.id === ymGtId) : null;
            
            if (ymGt && ymGt.stok_kodu) {
              ymGtStokKodu = ymGt.stok_kodu;
              ymGtSequence = ymGt.stok_kodu.split('.').pop();
              
              if (ymGtSequence === '00') {
                console.warn(`UYARI: YMGT ürünü veritabanında "00" sequence ile kaydedilmiş`);
              } else {
              }
              
              // MMGT ve YMGT aynı sequence'e sahip olmalı!
              if (mmGtSequence !== ymGtSequence) {
                console.error(`SORUN! MMGT ve YMGT farklı sequence'lere sahip! MMGT: ${mmGtSequence}, YMGT: ${ymGtSequence}`);
                // YMGT sequence'i MMGT ile aynı yap - kritik düzeltme
                ymGtSequence = mmGtSequence;
              }
            } else {
              console.error(`YMGT veritabanında bulunamadı veya stok_kodu eksik! ID: ${ymGtId}`);
              // Ürün bulunamadı durumunda otomatik kod oluştur
              const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
              // Veritabanında beklendiği şekilde oluştur - sequence değeri eksikse '00' kullan
              ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`; // sequence değeri fonksiyonun parametresi
            }
          } else {
            console.error(`YMGT veritabanından alınamadı! ID: ${ymGtId}`);
            // API hatası durumunda otomatik kod oluştur
            const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
            // Veritabanında beklendiği şekilde oluştur - sequence değeri eksikse '00' kullan
            ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`; // sequence değeri fonksiyonun parametresi
          }
        } catch (error) {
          console.error(`YMGT bilgileri alınırken hata: ${error.message}`);
          // Hata durumunda otomatik kod oluştur
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          // Veritabanında beklendiği şekilde oluştur - sequence değeri eksikse '00' kullan
          ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`; // sequence değeri fonksiyonun parametresi
        }
      }
      
      
      // YMGT kontrolü yap ve eğer gerekiyorsa MMGT ile aynı sequence'e güncelle
      if (ymGtId && sequence !== '00') {
        const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`);
        if (ymGtResponse && ymGtResponse.ok) {
          const ymGt = await ymGtResponse.json();
          if (ymGt && ymGt.stok_kodu) {
            const ymGtCurrentSequence = ymGt.stok_kodu.split('.').pop();
            
            // MMGT ile aynı sequence olup olmadığını kontrol et
            if (ymGtCurrentSequence !== sequence) {
              console.warn(`Sequence uyumsuzluğu! MMGT: ${sequence}, YMGT: ${ymGtCurrentSequence}`);
              console.warn(`YMGT sequence güncelleniyor: ${ymGtCurrentSequence} -> ${sequence}`);
              
              // YMGT'yi MMGT ile aynı sequence'e güncelle
              const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
              const updatedYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
              const updatedYmGtStokAdi = generateYmGtStokAdi(sequence);
              
              await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...generateYmGtDatabaseData(sequence),
                  stok_kodu: updatedYmGtStokKodu,
                  stok_adi: updatedYmGtStokAdi
                })
              });
              
            }
          }
        }
      }
      
      // ÖNEMLİ: Reçeteleri kaydetmeden önce, tüm mevcut reçeteleri sil
      // Bu şekilde yeni sequence'li reçeteler eklenecek
      
      // Sadece 1 MM GT reçetesini kaydet
      if (mmGtIds.length > 0) {
        // mmGtStokKodu null ise oluştur
        if (!mmGtStokKodu) {
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
          mmGtSequence = '00';
        }
        const mmGtId = mmGtIds[0]; // Artık sadece 1 tane MM GT var
        const mmGtRecipe = allRecipes.mmGtRecipes[mainYmStIndex] || {}; // Ana YM ST'ye bağlı MM GT reçetesi
        
        
        // MMGT için mevcut tüm reçeteleri kontrol et ve sil
        try {
          // 1. Tüm mevcut reçeteleri getir
          const allRecipesResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
          if (allRecipesResponse && allRecipesResponse.ok) {
            const allRecipesData = await allRecipesResponse.json();
            
            // 2. Her reçeteyi kontrol et, yanlış mamul_kodu veya bilesen_kodu içerenleri sil
            for (const recipe of allRecipesData) {
              // mamul_kodu mmGtStokKodu ile aynı değilse sil
              if (recipe.mamul_kodu !== mmGtStokKodu) {
                try {
                  await fetchWithAuth(`${API_URLS.galMmGtRecete}/${recipe.id}`, { method: 'DELETE' });
                } catch (deleteError) {
                  console.error(`MMGT reçetesi silinemedi: ${deleteError.message}`);
                }
              }
            }
          } else {
          }
        } catch (error) {
          console.error('MMGT reçeteleri kontrol edilirken hata:', error);
          // Hata durumunda işleme devam et
        }
        
        // Tüm mevcut reçeteleri sil - güvenlik için
        // Reçeteleri kontrol et ve yanlış mamul_kodu içerenleri temizle
        await checkAndFixStokKodu('mmgt', mmGtId, mmGtStokKodu);
        
        // Tüm mevcut reçeteleri sil
        await deleteExistingRecipes('mmgt', mmGtId);
        
        let siraNo = 1;
        const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
        
        // KRİTİK: mamul_kodu kesinlikle ve kesinlikle MMGT stok kartı tablosundaki stok_kodu ile aynı olmalı
        const mamulKodu = mmGtStokKodu;
        
        // Son bir kontrol: mmGtStokKodu boş olmamalı ve doğru formatta olmalı
        if (!mamulKodu || !mamulKodu.includes('.')) {
          console.error(`HATA! Geçersiz MMGT stok_kodu: ${mamulKodu}`);
          throw new Error(`Geçersiz MMGT stok_kodu: ${mamulKodu}`);
        }
        
        
        // Son bir kontrol: sequence doğru mu?
        const recordSequence = mamulKodu.split('.').pop();
        if (recordSequence !== mmGtSequence) {
          console.error(`UYARI! Sequence tutarsızlığı: Reçete için ${recordSequence}, Stok için ${mmGtSequence}`);
        }
        
        // MMGT reçete sıralaması: Excel ile TAM UYUMLU kesin sıralama
        // DÜZELTME: Sıralama: 1. YM.GT, 2. GTPKT01, 3. KARTON, 4. HALKA, 5. CEMBER, 6. TOKA, 7. DESİ, 8. SHRINK (sadece bir adet), 9. Diğerleri
        const recipeEntries = Object.entries(mmGtRecipe);
        
        // Her bileşeni TAMAMEN Excel ile aynı şekilde bul - KESIN ISIMLERIYLE
        const ymGtEntry = recipeEntries.find(([key]) => key.includes('YM.GT.'));
        const gtpkt01Entry = recipeEntries.find(([key]) => key === 'GTPKT01');
        const kartonEntry = recipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL');
        const halkaEntry = recipeEntries.find(([key]) => key === 'SM.7MMHALKA');
        const cemberEntry = recipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080');
        const tokaEntry = recipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
        const desiEntry = recipeEntries.find(([key]) => key === 'SM.DESİ.PAK');
        
        // DÜZELTME: Shrink bileşeni işleniyor - eğer birden fazla var ise sadece birini al
        let shrinkEntry = null;
        const shrinkEntries = recipeEntries.filter(([key]) => key.includes('AMB.SHRİNK.'));
        if (shrinkEntries.length > 0) {
          // Sadece ilk shrink girişini al - diğerleri yok sayılacak
          shrinkEntry = shrinkEntries[0];
          
          // Uyarı ver
          if (shrinkEntries.length > 1) {
            console.warn(`Birden fazla Shrink bileşeni var! Sadece ${shrinkEntry[0]} kullanılacak, diğerleri atlanacak.`);
            console.warn(`Shrink bileşenleri:`, shrinkEntries.map(([key]) => key).join(', '));
          }
        }
        
        // Diğer tüm bileşenler - Excel ile TAM UYUMLU şekilde tanımla
        const otherEntries = recipeEntries.filter(([key]) => 
          !key.includes('YM.GT.') && 
          key !== 'GTPKT01' &&
          key !== 'AMB.ÇEM.KARTON.GAL' &&
          !key.includes('AMB.SHRİNK.') && // Tüm shrink bileşenlerini hariç tut
          key !== 'SM.7MMHALKA' &&
          key !== 'AMB.APEX CEMBER 38X080' &&
          key !== 'AMB.TOKA.SIGNODE.114P. DKP' &&
          key !== 'SM.DESİ.PAK'
        );
        
        // DÜZELTME: Excel formatına tam uygun sırada ekle - Shrink en sonda
        const orderedEntries = [
          ymGtEntry, 
          gtpkt01Entry, 
          kartonEntry,
          halkaEntry,
          cemberEntry,
          tokaEntry,
          desiEntry,
          // Shrink en sonda yer alacak
          shrinkEntry,
          ...otherEntries
        ].filter(Boolean);
        
        for (const [key, value] of orderedEntries) {
          if (value > 0) {
            // Operasyon/Bileşen sınıflandırması düzeltmesi
            // Excel format requires GTPKT01 to be marked as Operasyon (O), all others as Bileşen (B)
            const operasyonBilesen = key === 'GTPKT01' ? 'O' : 'B';
            
            // We don't need isSpecialCode check anymore, all handling is in operasyonBilesen
            
            // Tam kod kontrolü ve log kaydı
            
            // Format the value exactly as it would appear in Excel, using points as decimal separators
            let formattedValue = value;
            if (typeof value === 'number') {
              formattedValue = value.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 5,
                useGrouping: false // No thousand separators
              });
            }
            
            // Son bir kontrol: mamulKodu'nun sequence'ini doğrula
            const recordSequence = mamulKodu.split('.').pop();
            if (recordSequence !== mmGtSequence) {
              console.error(`Sequence uyuşmazlığı! Reçete kaydediliyor: ${recordSequence}, olması gereken: ${mmGtSequence}`);
            }
            
            
            // BURADA ÖNEMLİ: MMGT reçeteleri için her zaman doğru sequence'i içeren mamul_kodu kullanmak çok önemli
            
            // Tüm parametreleri logla
            const receteParams = {
              mm_gt_id: mmGtId,
              mamul_kodu: mamulKodu, // ÖNEMLİ: Her zaman doğru sequence ile güncel mamul_kodu
              bilesen_kodu: key,
              miktar: formattedValue,
              sira_no: siraNo++,
              operasyon_bilesen: operasyonBilesen,
              olcu_br: getOlcuBr(key),
            };
            console.log("REÇETE PARAMETRE KONTROLÜ:", JSON.stringify(receteParams));
            
            // Başka bir reçete ile çakışma olabilir mi kontrol et
            try {
              const checkResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
              if (checkResponse && checkResponse.ok) {
                const existingRecipes = await checkResponse.json();
                const conflictRecipe = existingRecipes.find(r => r.bilesen_kodu === key && r.mamul_kodu !== mamulKodu);
                if (conflictRecipe) {
                  console.error(`ÇAKIŞMA! Farklı mamul_kodu ile reçete mevcut: ${conflictRecipe.mamul_kodu} (silinecek)`);
                  try {
                    await fetchWithAuth(`${API_URLS.galMmGtRecete}/${conflictRecipe.id}`, { method: 'DELETE' });
                  } catch (deleteError) {
                    console.error(`Çakışan reçete silinemedi: ${deleteError.message}`);
                    // Silme hatasına rağmen devam et
                  }
                }
              } else if (checkResponse && checkResponse.status === 404) {
                // 404 hatası - reçete hiç yok, sorun değil, devam et
              } else {
                // Diğer API hataları
                console.warn(`MMGT reçeteleri sorgulanamadı - HTTP ${checkResponse ? checkResponse.status : 'unknown'}`);
              }
            } catch (checkError) {
              console.error(`Reçete çakışması kontrol edilirken hata: ${checkError.message}`);
              // Hata durumunda bile işleme devam et
            }
            
            // Reçeteyi oluşturmaya devam et
            try {
              const saveResponse = await fetchWithAuth(API_URLS.galMmGtRecete, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...receteParams,
                  olcu_br_bilesen: '1',
                  aciklama: getReceteAciklama(key),
                  ua_dahil_edilsin: operasyonBilesen === 'O' ? 'E' : '',
                  son_operasyon: operasyonBilesen === 'O' ? 'E' : '',
                  recete_top: 1,
                  fire_orani: 0.0004, // Match Excel format
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
                })
              });
              
              if (saveResponse && saveResponse.ok) {
              } else {
                console.error(`MMGT reçetesi kaydedilemedi: ${key}, HTTP ${saveResponse ? saveResponse.status : 'unknown'}`);
              }
            } catch (saveError) {
              console.error(`MMGT reçetesi kaydedilirken hata: ${saveError.message}`);
              // Kaydetme hatası oluşsa bile diğer reçeteleri eklemeye devam et
            }
          }
        }
      }
      
      // Sadece 1 YM GT için reçete kaydet - Excel formatıyla tam uyumlu
      if (ymGtId && Object.keys(allRecipes.ymGtRecipe).length > 0) {
        // ymGtStokKodu null ise oluştur
        if (!ymGtStokKodu) {
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
        }
        
        
        // *** KRİTİK DÜZELTME *** - ID ile değil, stok_kodu ile kayıt bul
        // Bu yaklaşım, hem 404 Not Found hem de 409 Conflict hatalarını önler
        
        try {
          // Önce stok_kodu ile doğrudan ara
          const searchResponse = await fetchWithAuth(`${API_URLS.galYmGt}?stok_kodu=${encodeURIComponent(ymGtStokKodu)}`);
          
          let actualYmGtId = null;
          
          if (searchResponse && searchResponse.ok) {
            const searchResults = await searchResponse.json();
            
            if (Array.isArray(searchResults) && searchResults.length > 0) {
              // Mevcut kaydın ID'sini kullan
              actualYmGtId = searchResults[0].id;
            } else {
              // Tam eşleşme yoksa, benzer aramayla dene
              
              // Önce kod_2 ve cap ile ara
              try {
                const baseCode = ymGtStokKodu.split('.').slice(0, 3).join('.');
                const likeResponse = await fetchWithAuth(`${API_URLS.galYmGt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
                
                if (likeResponse && likeResponse.ok) {
                  const likeResults = await likeResponse.json();
                  
                  if (Array.isArray(likeResults) && likeResults.length > 0) {
                    // Tam eşleşme aranıyor
                    const exactMatch = likeResults.find(item => item.stok_kodu === ymGtStokKodu);
                    
                    if (exactMatch) {
                      actualYmGtId = exactMatch.id;
                    } else {
                      // En yakın eşleşme (aynı çap ve kod) kullanılıyor
                      actualYmGtId = likeResults[0].id;
                    }
                  } else {
                    // Hiç benzer kayıt bulunamadı - yeni oluşturulacak
                  }
                } else {
                }
              } catch (likeError) {
                console.error(`YMGT benzer arama hatası: ${likeError.message}`);
                // Hata olursa yeni kayıt oluşturmaya devam et
              }
              
              // ID bulunamadıysa, yeni kayıt oluştur
              if (!actualYmGtId) {
                try {
                  
                  const createResponse = await fetchWithAuth(API_URLS.galYmGt, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(generateYmGtDatabaseData(mmGtSequence))
                  });
                  
                  if (createResponse && createResponse.ok) {
                    const result = await createResponse.json();
                    actualYmGtId = result.id;
                  } else if (createResponse && createResponse.status === 409) {
                    // 409 Conflict - başka bir tam arama yöntemi dene
                    
                    // Tüm YMGT'leri getirip tam uyan var mı kontrol et
                    try {
                      const allYmGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?limit=1000`);
                      
                      if (allYmGtResponse && allYmGtResponse.ok) {
                        const allYmGts = await allYmGtResponse.json();
                        
                        if (Array.isArray(allYmGts) && allYmGts.length > 0) {
                          const exactMatch = allYmGts.find(item => item.stok_kodu === ymGtStokKodu);
                          
                          if (exactMatch) {
                            actualYmGtId = exactMatch.id;
                          } else {
                            // Son çare - mmGtId ile ilişkili YMGT'leri ara
                            const relatedYmGt = allYmGts.find(item => item.mm_gt_id === mmGtIds[0] || 
                              item.stok_kodu.includes(mmGtData.kod_2) && 
                              item.stok_kodu.includes(Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0')));
                              
                            if (relatedYmGt) {
                              actualYmGtId = relatedYmGt.id;
                            } else {
                              console.error(`YMGT için hiçbir uygun kayıt bulunamadı! İşlem yapılamıyor.`);
                              return; // Çık
                            }
                          }
                        } else {
                          console.error(`YMGT listesi boş veya geçersiz! İşlem yapılamıyor.`);
                          return; // Çık
                        }
                      } else {
                        console.error(`YMGT listesi alınamadı! İşlem yapılamıyor.`);
                        return; // Çık
                      }
                    } catch (allError) {
                      console.error(`YMGT listesi alınırken hata: ${allError.message}`);
                      return; // Çık
                    }
                  } else {
                    console.error(`YMGT oluşturulamadı: HTTP ${createResponse ? createResponse.status : 'unknown'}`);
                    return; // Çık
                  }
                } catch (createError) {
                  console.error(`YMGT oluşturma hatası: ${createError.message}`);
                  return; // Çık
                }
              }
            }
          } else {
            console.error(`YMGT arama hatası: HTTP ${searchResponse ? searchResponse.status : 'unknown'}`);
            return; // Çık
          }
          
          // Bu noktada mutlaka geçerli bir ID'ye sahip olmalıyız
          if (!actualYmGtId) {
            console.error(`YMGT için geçerli ID bulunamadı! İşlem yapılamıyor.`);
            return; // Çık
          }
          
          // ID'yi güncelle
          ymGtId = actualYmGtId;
        } catch (mainError) {
          console.error(`YMGT arama/oluşturma işlemi sırasında kritik hata: ${mainError.message}`);
          return; // Kritik hata durumunda çık
        }
        
        // MMGT ve YMGT sequence değerlerini karşılaştır ve gerekirse YMGT'yi güncelle
        // sequence değişkeni fonksiyon parametresi, mmGtSequence henüz tanımlanmamış
        const currentSequence = sequence;
        if (currentSequence !== ymGtSequence && currentSequence !== '00') {
          console.error(`UYARI! YMGT sequence (${ymGtSequence}) ile seçilen sequence (${currentSequence}) eşleşmiyor!`);
          
          // YMGT'yi MMGT ile aynı sequence'e güncelle
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          const updatedYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${currentSequence}`;
          
          try {
            console.warn(`YMGT stok_kodu düzeltiliyor: ${ymGtStokKodu} → ${updatedYmGtStokKodu}`);
            
            await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...generateYmGtDatabaseData(currentSequence),
                stok_kodu: updatedYmGtStokKodu
              })
            });
            
            // Güncellenmiş kodu kullan
            ymGtStokKodu = updatedYmGtStokKodu;
            ymGtSequence = currentSequence;
            
          } catch (updateError) {
            console.error(`YMGT güncellenirken hata: ${updateError.message}`);
          }
        }
        
        // Son kontrol: ymGtStokKodu geçerli olmalı
        if (!ymGtStokKodu || !ymGtStokKodu.includes('.')) {
          console.error(`HATA! Geçersiz YMGT stok_kodu: ${ymGtStokKodu}`);
          throw new Error(`Geçersiz YMGT stok_kodu: ${ymGtStokKodu}`);
        }
        
        // YMGT için mevcut tüm reçeteleri kontrol et ve sil
        try {
          // 1. Tüm mevcut reçeteleri getir
          const allRecipesResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`);
          if (allRecipesResponse && allRecipesResponse.ok) {
            const allRecipesData = await allRecipesResponse.json();
            
            // 2. Her reçeteyi kontrol et, yanlış mamul_kodu içerenleri sil
            for (const recipe of allRecipesData) {
              // mamul_kodu ymGtStokKodu ile aynı değilse sil
              if (recipe.mamul_kodu !== ymGtStokKodu) {
                try {
                  await fetchWithAuth(`${API_URLS.galYmGtRecete}/${recipe.id}`, { method: 'DELETE' });
                } catch (deleteError) {
                  console.error(`YMGT reçetesi silinemedi: ${deleteError.message}`);
                }
              }
            }
          } else {
          }
        } catch (error) {
          console.error('YMGT reçeteleri kontrol edilirken hata:', error);
          // Hata durumunda işleme devam et
        }
        
        // Güvenlik için tüm reçeteleri temizle
        // Reçeteleri kontrol et ve yanlış mamul_kodu içerenleri temizle
        await checkAndFixStokKodu('ymgt', ymGtId, ymGtStokKodu);
        
        // Tüm mevcut reçeteleri sil
        await deleteExistingRecipes('ymgt', ymGtId);
        
        
        // YM GT'yi bul - oluşturulmuş stok kodu ile
        const existingYmGt = await checkExistingProduct(API_URLS.galYmGt, ymGtStokKodu);
        if (existingYmGt) {
          // ÖNEMLİ: Önce reçeteleri sil, her durumda mevcut reçeteleri silip yeniden oluştur
          // Reçeteleri kontrol et ve yanlış mamul_kodu içerenleri temizle
          await checkAndFixStokKodu('ymgt', existingYmGt.id, ymGtStokKodu);
          
          // Tüm mevcut reçeteleri sil
          await deleteExistingRecipes('ymgt', existingYmGt.id);
          
          let siraNo = 1;
          
          // YMGT reçete sıralaması - Excel formatına uygun kesin sıralama 
          // Sıralama: 1. YM.ST (ana), 2. GLV01, 3. Çinko, 4. Asit, 5. Diğerleri
          const recipeEntries = Object.entries(allRecipes.ymGtRecipe);
          
          // Define mainYmSt from available data
          const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
          const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
          
          // Her bileşen türünü ayrı ayrı bul - tam eşleşme kontrolü ile
          let ymStEntry = null;
          
          // Ana YM.ST için güvenlik kontrolleri
          if (!mainYmSt || !mainYmSt.stok_kodu) {
            console.error(`HATA: Ana YM.ST bilgileri eksik veya geçersiz! YMGT reçetesi oluşturulamayabilir.`);
            console.error('Available YM STs:', allYmSts.map(ym => ({ stok_kodu: ym.stok_kodu, source: ym.source })));
          } else {
            // Önce tam eşleşme ara
            ymStEntry = recipeEntries.find(([key]) => key === mainYmSt.stok_kodu);
            
            // Tam eşleşme yoksa, kısmi eşleşme dene
            if (!ymStEntry) {
              const anyYmStEntry = recipeEntries.find(([key]) => key.includes('YM.ST.'));
              if (anyYmStEntry) {
                console.warn(`Ana YM.ST (${mainYmSt.stok_kodu}) reçetede bulunamadı, alternatif kullanılıyor: ${anyYmStEntry[0]}`);
                ymStEntry = anyYmStEntry;
              } else {
                console.error(`HATA: YMGT reçetesinde YM.ST bileşeni bulunamadı!`);
                // CRITICAL FIX: Create the missing YM.ST entry
                if (mainYmSt && mainYmSt.stok_kodu) {
                  ymStEntry = [mainYmSt.stok_kodu, 1];
                }
              }
            }
          }
          
          // Kritik operasyon ve bileşenleri tam kod eşleşmesi ile bul
          const glv01Entry = recipeEntries.find(([key]) => key === 'GLV01');
          const cinkoEntry = recipeEntries.find(([key]) => key === '150 03');
          const asitEntry = recipeEntries.find(([key]) => key === 'SM.HİDROLİK.ASİT');
          
          // Eksik kritik bileşenleri kontrol et ve uyar
          if (!glv01Entry) {
            console.error(`HATA: YMGT reçetesinde GLV01 operasyonu bulunamadı!`);
          }
          
          if (!cinkoEntry) {
            console.warn(`UYARI: YMGT reçetesinde çinko bileşeni (150 03) bulunamadı!`);
          }
          
          if (!asitEntry) {
            console.warn(`UYARI: YMGT reçetesinde asit bileşeni (SM.HİDROLİK.ASİT) bulunamadı!`);
          }
          
          // Diğer bileşenler - kesin kod eşleşmesi ile filtrele
          const otherEntries = recipeEntries.filter(([key]) => 
            key !== (mainYmSt?.stok_kodu || '') && 
            !key.includes('YM.ST.') && 
            key !== 'GLV01' && 
            key !== '150 03' && 
            key !== 'SM.HİDROLİK.ASİT'
          );
          
          // Excel formatına tam uygun sırada ekle - HER ZAMAN SADECE 1 GLV01 OPERASYONu olmalı
          // Calculate correct YM.ST miktar: 1 - Çinko Tüketim Miktarı
          let ymStMiktar = ymStEntry ? ymStEntry[1] : 1;
          if (ymStEntry && cinkoEntry && cinkoEntry[1]) {
            ymStMiktar = 1 - parseFloat(cinkoEntry[1]);
          }
          
          const orderedEntries = [
            ymStEntry ? [mainYmSt.stok_kodu, ymStMiktar] : null, // Ana YM ST'yi kullan - calculated value
            glv01Entry,  // Sadece 1 galvanizleme operasyonu
            cinkoEntry,  // Çinko bileşeni  
            asitEntry,   // Asit bileşeni
            ...otherEntries
          ].filter(Boolean);
          
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
              
              // Son bir kontrol: ymGtStokKodu'nun sequence'ini doğrula
              const recordSequence = ymGtStokKodu.split('.').pop();
              if (recordSequence !== mmGtSequence) {
                console.error(`YMGT Sequence uyuşmazlığı! Reçete kaydediliyor: ${recordSequence}, olması gereken: ${mmGtSequence}`);
                
                // Sequence farklıysa doğru sequence ile düzelt - ÇOK ÖNEMLİ
                const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
                const updatedYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
                
                // YMGT veritabanındaki kaydı güncelle
                try {
                  console.warn(`YMGT stok_kodu son kez düzeltiliyor: ${ymGtStokKodu} → ${updatedYmGtStokKodu}`);
                  
                  await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...generateYmGtDatabaseData(sequence),
                      stok_kodu: updatedYmGtStokKodu
                    })
                  });
                  
                  // Güncellenmiş kodu kullan
                  ymGtStokKodu = updatedYmGtStokKodu;
                } catch (updateError) {
                  console.error(`YMGT kaydı güncellenirken hata: ${updateError.message}`);
                }
              }
              
              
              // BURADA ÖNEMLİ: YMGT reçeteleri için her zaman doğru sequence'i içeren mamul_kodu kullanmak çok önemli
              
              // Son bir kez daha kontrol et - YMGT'nin stok_kodu ile tamamıyla aynı olmasını garantile
              // Liste yaklaşımını kullan - 404 hatasını önlemek için
              const allYmGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?limit=1000`);
              if (allYmGtResponse && allYmGtResponse.ok) {
                const allYmGt = await allYmGtResponse.json();
                const doubleCheckYmGt = Array.isArray(allYmGt) ? allYmGt.find(item => item.id === existingYmGt.id) : null;
                if (doubleCheckYmGt && doubleCheckYmGt.stok_kodu) {
                  if (doubleCheckYmGt.stok_kodu !== ymGtStokKodu) {
                    console.warn(`UYARI! YMGT stok_kodu (${doubleCheckYmGt.stok_kodu}) ile reçete mamul_kodu (${ymGtStokKodu}) eşleşmiyor!`);
                    
                    // Tutarsızlığı çöz - stok tablosundaki kodu kullanmak yerine, stok tablosunu düzeltmeyi dene
                    const dbSequence = doubleCheckYmGt.stok_kodu.split('.').pop();
                    if (dbSequence !== mmGtSequence) {
                      // MMGT'den gelen sequence'i kullanmalıyız - veritabanını düzelt!
                      try {
                        console.warn(`YMGT stok tablosundaki kaydı düzeltme girişimi: ${doubleCheckYmGt.stok_kodu} → ${ymGtStokKodu}`);
                        
                        await fetchWithAuth(`${API_URLS.galYmGt}/${existingYmGt.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...generateYmGtDatabaseData(sequence),
                            stok_kodu: ymGtStokKodu
                          })
                        });
                        
                      } catch (error) {
                        console.error(`YMGT stok tablosu güncellenirken hata: ${error.message}`);
                        
                        // Güncellenemezse mevcut veritabanı kodunu kullan
                        ymGtStokKodu = doubleCheckYmGt.stok_kodu;
                      }
                    } else {
                      // Eşit sequence değerleri, ama farklı stok_kodu - veritabanındaki kodu kullan
                      ymGtStokKodu = doubleCheckYmGt.stok_kodu;
                    }
                  } else {
                  }
                } else {
                  console.warn(`UYARI: YMGT stok kaydında stok_kodu bulunamadı!`);
                }
              } else {
                console.warn(`UYARI: YMGT stok kaydına erişilemedi!`);
              }
              
              // Tüm parametreleri logla
              const receteParams = {
                ym_gt_id: existingYmGt.id,
                mamul_kodu: ymGtStokKodu, // ÖNEMLİ: Her zaman doğru sequence ile güncel mamul_kodu
                bilesen_kodu: key,
                miktar: formattedValue,
                sira_no: siraNo++,
                // DÜZELTME: YM.ST ve FLM kodları her zaman bileşen, sadece GLV01 ve TLC01 operasyon
                operasyon_bilesen: key === 'GLV01' ? 'O' : 'B', // Only GLV01 is Operasyon (O) in YMGT recipes
                olcu_br: getOlcuBr(key),
              };
              console.log("YMGT REÇETE PARAMETRE KONTROLÜ:", JSON.stringify(receteParams));
              
              // Başka bir reçete ile çakışma olabilir mi kontrol et
              try {
                const checkResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${existingYmGt.id}`);
                if (checkResponse && checkResponse.ok) {
                  const existingRecipes = await checkResponse.json();
                  const conflictRecipe = existingRecipes.find(r => r.bilesen_kodu === key && r.mamul_kodu !== ymGtStokKodu);
                  if (conflictRecipe) {
                    console.error(`ÇAKIŞMA! Farklı mamul_kodu ile YMGT reçete mevcut: ${conflictRecipe.mamul_kodu} (silinecek)`);
                    try {
                      await fetchWithAuth(`${API_URLS.galYmGtRecete}/${conflictRecipe.id}`, { method: 'DELETE' });
                    } catch (deleteError) {
                      console.error(`Çakışan YMGT reçetesi silinemedi: ${deleteError.message}`);
                      // Silme hatasına rağmen devam et
                    }
                  }
                } else if (checkResponse && checkResponse.status === 404) {
                  // 404 hatası - reçete hiç yok, sorun değil, devam et
                } else {
                  // Diğer API hataları
                  console.warn(`YMGT reçeteleri sorgulanamadı - HTTP ${checkResponse ? checkResponse.status : 'unknown'}`);
                }
              } catch (checkError) {
                console.error(`YMGT reçete çakışması kontrol edilirken hata: ${checkError.message}`);
                // Hata durumunda bile işleme devam et
              }
              
              // Reçeteyi oluşturmaya devam et
              try {
                const saveResponse = await fetchWithAuth(API_URLS.galYmGtRecete, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...receteParams,
                    olcu_br_bilesen: '1',
                    aciklama: getReceteAciklama(key),
                    recete_top: 1,
                    fire_orani: 0.0004, // Match Excel format
                    ua_dahil_edilsin: receteParams.operasyon_bilesen === 'O' ? 'E' : '',
                    son_operasyon: receteParams.operasyon_bilesen === 'O' ? 'E' : '',
                    // Match Excel format EXACTLY - VARCHAR=empty string, NUMERIC/INT=null
                    miktar_sabitle: '',
                    stok_maliyet: '',
                    fire_mik: null, // NUMERIC
                    sabit_fire_mik: null, // NUMERIC
                    istasyon_kodu: '',
                    hazirlik_suresi: null, // NUMERIC
                    uretim_suresi: receteParams.operasyon_bilesen === 'O' ? formattedValue : null, // NUMERIC
                    oncelik: null, // INT
                    planlama_orani: null, // NUMERIC
                    alt_pol_da_transfer: '',
                    alt_pol_ambar_cikis: '',
                    alt_pol_uretim_kaydi: '',
                    alt_pol_mrp: '',
                    ic_dis: ''
                  })
                });
                
                if (saveResponse && saveResponse.ok) {
                  // Update allRecipes.ymGtRecipe state with the newly saved component
                  setAllRecipes(prev => ({
                    ...prev,
                    ymGtRecipe: {
                      ...prev.ymGtRecipe,
                      [key]: value
                    }
                  }));
                } else {
                  console.error(`YMGT reçetesi kaydedilemedi: ${key}, HTTP ${saveResponse ? saveResponse.status : 'unknown'}`);
                }
              } catch (saveError) {
                console.error(`YMGT reçetesi kaydedilirken hata: ${saveError.message}`);
                // Kaydetme hatası oluşsa bile diğer reçeteleri eklemeye devam et
              }
            }
          }
        }
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
    
    if (productType === 'mmgt') {
      apiUrl = API_URLS.galMmGtRecete;
      paramName = 'mm_gt_id';
    } else if (productType === 'ymgt') {
      apiUrl = API_URLS.galYmGtRecete;
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
      
      if (type === 'mmgt') {
        apiUrl = API_URLS.galMmGtRecete;
        paramName = 'mm_gt_id';
        typeLabel = 'MMGT';
      } else if (type === 'ymgt') {
        apiUrl = API_URLS.galYmGtRecete;
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
    // For YM GT readonly component always show KG
    if (bilesen === 'readonly') return 'KG';
    
    // For process codes with 01 suffix, typically times
    if (bilesen === 'GTPKT01' || bilesen === 'TLC01' || bilesen === 'GLV01') return 'DK';
    
    // All other cases return KG for material weight
    if (bilesen.includes('03') || bilesen.includes('ASİT')) return 'KG';
    if (bilesen.includes('KARTON') || bilesen.includes('HALKA') || bilesen.includes('TOKA') || bilesen.includes('DESİ')) return 'AD';
    if (bilesen.includes('CEMBER') || bilesen.includes('SHRİNK')) return 'KG';
    if (bilesen.includes('YM.GT.')) return 'KG';
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

  // YM GT için tolerans açıklama (matematiksel düzeltme tespiti için)
  const getYmGtToleransAciklama = (ymGtData) => {
    if (!ymGtData) return '';

    const toleransPlus = parseFloat(ymGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(ymGtData.tolerans_minus) || 0;
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
    const plusValue = parseFloat(mmGtData.tolerans_plus) || 0;
    const minusValue = parseFloat(mmGtData.tolerans_minus) || 0;

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
    if (bilesen === '150 03' || bilesen === 'HM-000001') return 'Çinko Tüketim Miktarı';
    if (bilesen === 'SM.HİDROLİK.ASİT' || bilesen === 'SM-KMY-000096') return 'Asit Tüketim Miktarı';
    if (bilesen.includes('FLM.')) return 'Filmaşin Tüketimi';
    if (bilesen.includes('YM.GT.')) return 'Galvanizli Tel Tüketim Miktarı';
    if (bilesen.includes('YM.ST.')) return 'Siyah Tel Tüketim Miktarı';
    if (bilesen.includes('KARTON') || bilesen === 'SM-AMB-000019') return 'Karton Tüketim Miktarı';
    if (bilesen.includes('SHRİNK') || bilesen === 'SM-AMB-000027' || bilesen === 'SM-AMB-000028' || bilesen === 'SM-AMB-000030') return 'Naylon Tüketim Miktarı';
    if (bilesen.includes('HALKA') || bilesen === 'SM-AMB-000023') return 'Kaldırma Kancası Tüketim Miktarı';
    if (bilesen.includes('CEMBER') || bilesen === 'SM-AMB-000017') return 'Çelik çember Tüketim Miktarı';
    if (bilesen.includes('TOKA') || bilesen === 'SM-AMB-000018') return 'Çember Tokası Tüketim Miktarı';
    if (bilesen.includes('DESİ') || bilesen === 'SM-KMY-000102') return 'Slikajel Tüketim Miktarı';
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
    
    // For diameters ≤ 2mm, use YM ST's own filmasin/quality if available, otherwise use defaults
    if (cap <= 2.00) {
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
  const fetchTlcHizlarData = async () => {
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
      
      // Delete selected requests
      const deletePromises = selectedRequestIds.map(async (id) => {
        const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${id}`, {
          method: 'DELETE'
        });
        return response;
      });
      
      await Promise.all(deletePromises);
      
      toast.success(`${selectedRequestIds.length} adet talep başarıyla silindi`);
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

  // Bulk Excel generation - download entire database and process locally (similar to Çelik Hasır pattern)
  const generateBulkExcelFromDatabase = useCallback(async () => {
    try {
      setIsExportingExcel(true);
      setExcelProgress({ current: 0, total: 6, operation: 'Toplu veritabanı indirme başlıyor...', currentProduct: '' });

      console.log('🚀 BULK EXCEL GT: Starting bulk database download using unified fetch approach...');

      // 1. Get all product data first
      setExcelProgress({ current: 1, total: 6, operation: 'Ürün verileri alınıyor...', currentProduct: '' });
      
      const [mmgtResponse, ymgtResponse, ymstResponse] = await Promise.all([
        fetch(`${API_URLS.getAllMMGT}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYMGT}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYMST}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [allMMGTProducts, allYMGTProducts, allYMSTProducts] = await Promise.all([
        mmgtResponse.json(),
        ymgtResponse.json(),
        ymstResponse.json()
      ]);

      console.log(`🚀 BULK EXCEL GT: Found MM GT(${allMMGTProducts.length}), YM GT(${allYMGTProducts.length}), YM ST(${allYMSTProducts.length}) products`);

      // 2. Fetch all recipe data
      setExcelProgress({ current: 2, total: 6, operation: 'Reçete verileri alınıyor...', currentProduct: '' });
      
      const [mmgtReceteResponse, ymgtReceteResponse, ymstReceteResponse] = await Promise.all([
        fetch(`${API_URLS.getAllMMGTRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYMGTRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_URLS.getAllYMSTRecetes}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [allMMGTRecetes, allYMGTRecetes, allYMSTRecetes] = await Promise.all([
        mmgtReceteResponse.json(),
        ymgtReceteResponse.json(),
        ymstReceteResponse.json()
      ]);

      console.log(`🚀 BULK EXCEL GT: Found MM GT Recipes(${allMMGTRecetes.length}), YM GT Recipes(${allYMGTRecetes.length}), YM ST Recipes(${allYMSTRecetes.length})`);

      // 3. Generate Excel files using the EXACT same format as existing - 2 Excel files with 3 sheets each
      setExcelProgress({ current: 3, total: 6, operation: 'Excel dosyaları oluşturuluyor...', currentProduct: '' });
      
      if (allMMGTProducts.length === 0) {
        toast.error('Hiç MM GT ürünü bulunamadı!');
        return;
      }

      // Generate the 2 Excel files with 3 sheets each - exactly like existing format
      await generateBulkExcelFiles(allMMGTProducts, allYMGTProducts, allYMSTProducts, allMMGTRecetes, allYMGTRecetes, allYMSTRecetes);

      setExcelProgress({ current: 6, total: 6, operation: 'Tamamlandı!', currentProduct: '' });
      toast.success(`Toplu Excel başarıyla oluşturuldu! ${allMMGTProducts.length} MM GT, ${allYMGTProducts.length} YM GT, ${allYMSTProducts.length} YM ST ürün işlendi.`);

    } catch (error) {
      console.error('🚨 BULK EXCEL GT Error:', error);
      toast.error('Toplu Excel oluştururken hata: ' + error.message);
    } finally {
      setIsExportingExcel(false);
      setExcelProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
    }
  }, []);

  // Helper function to generate Excel files from bulk data - EXACT same format as existing
  const generateBulkExcelFiles = async (allMMGTProducts, allYMGTProducts, allYMSTProducts, allMMGTRecetes, allYMGTRecetes, allYMSTRecetes) => {
    
    // ===== 1. STOK KARTLARI EXCEL (3 sheets) =====
    const stokWorkbook = new ExcelJS.Workbook();
    
    // MM GT Sheet
    const mmGtSheet = stokWorkbook.addWorksheet('MM GT');
    const mmGtHeaders = getStokKartiHeaders();
    mmGtSheet.addRow(mmGtHeaders);
    
    // Add all MM GT products
    allMMGTProducts.forEach(mmGt => {
      mmGtSheet.addRow(generateMmGtStokKartiDataForBatch(mmGt));
    });
    
    // YM GT Sheet  
    const ymGtSheet = stokWorkbook.addWorksheet('YM GT');
    const ymGtHeaders = getYmGtHeaders();
    ymGtSheet.addRow(ymGtHeaders);
    
    // Add all YM GT products
    allYMGTProducts.forEach(ymGt => {
      ymGtSheet.addRow(generateYmGtStokKartiDataForBatch(ymGt));
    });
    
    // YM ST Sheet - Show ALL products (including alternatives) with Matris column
    const ymStSheet = stokWorkbook.addWorksheet('YM ST');
    const ymStHeadersWithPriority = [...getYmStHeaders(), 'Matris']; // Add Matris column for priority
    ymStSheet.addRow(ymStHeadersWithPriority);

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
    const stokFilename = `Toplu_Stok_Kartlari_${stokTimestamp}.xlsx`;
    saveAs(new Blob([stokBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), stokFilename);
    
    console.log(`✅ BULK EXCEL GT: Generated Stock Excel with ${allMMGTProducts.length} MM GT, ${allYMGTProducts.length} YM GT, ${allYMSTProducts.length} YM ST products (all priorities with Matris column)`);
    
    
    // ===== 2. REÇETE EXCEL (3 sheets) =====
    const receteWorkbook = new ExcelJS.Workbook();
    
    // MM GT REÇETE Sheet
    const mmGtReceteSheet = receteWorkbook.addWorksheet('MM GT REÇETE');
    const receteHeaders = getReceteHeaders();
    mmGtReceteSheet.addRow(receteHeaders);
    
    // Group MM GT recipes by mamul_kodu for proper sequencing
    const mmGtByProduct = {};
    allMMGTRecetes.forEach(recipe => {
      if (!mmGtByProduct[recipe.mamul_kodu]) {
        mmGtByProduct[recipe.mamul_kodu] = [];
      }
      mmGtByProduct[recipe.mamul_kodu].push(recipe);
    });
    
    // Add MM GT recipes with proper sequencing per product
    const sortedMmGtStokCodes = Object.keys(mmGtByProduct).sort();
    sortedMmGtStokCodes.forEach(stokKodu => {
      if (mmGtByProduct[stokKodu] && mmGtByProduct[stokKodu].length > 0) {
        let productSiraNo = 1;
        mmGtByProduct[stokKodu].forEach(recipe => {
          // FIX: Update YM.GT bilesen codes to match MM GT sequence (same logic as batch Excel)
          let updatedBilesenKodu = recipe.bilesen_kodu;
          if (recipe.bilesen_kodu && recipe.bilesen_kodu.includes('YM.GT.')) {
            // Get sequence from MM GT stok kodu
            const mmGtSequence = stokKodu.split('.').pop() || '00';
            // Replace sequence in YM.GT bilesen kodu
            const bilesenParts = recipe.bilesen_kodu.split('.');
            if (bilesenParts.length >= 5) {
              bilesenParts[bilesenParts.length - 1] = mmGtSequence;
              updatedBilesenKodu = bilesenParts.join('.');
            }
          }

          mmGtReceteSheet.addRow(generateMmGtReceteRowForBatch(updatedBilesenKodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.mamul_kodu));
          productSiraNo++;
        });
      }
    });
    
    // YM GT REÇETE Sheet
    const ymGtReceteSheet = receteWorkbook.addWorksheet('YM GT REÇETE');
    ymGtReceteSheet.addRow(receteHeaders);
    
    // Group YM GT recipes by mamul_kodu for proper sequencing
    const ymGtByProduct = {};
    allYMGTRecetes.forEach(recipe => {
      if (!ymGtByProduct[recipe.mamul_kodu]) {
        ymGtByProduct[recipe.mamul_kodu] = [];
      }
      ymGtByProduct[recipe.mamul_kodu].push(recipe);
    });
    
    // Add YM GT recipes with proper sequencing per product
    const sortedYmGtStokCodes = Object.keys(ymGtByProduct).sort();
    sortedYmGtStokCodes.forEach(stokKodu => {
      if (ymGtByProduct[stokKodu] && ymGtByProduct[stokKodu].length > 0) {
        let productSiraNo = 1;
        ymGtByProduct[stokKodu].forEach(recipe => {
          // Use the actual miktar value from database - component code fix happens inside generateYmGtReceteRowForBatch
          ymGtReceteSheet.addRow(generateYmGtReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.mamul_kodu));
          productSiraNo++;
        });
      }
    });

    // YM GT REÇETE ALT Sheets - OPTION 2: Coiler (1.5-1.8mm → .ST) + Matrix Priority Alternatives
    // Step 1: Build YM ST priority mapping from database
    const ymStPriorityMap = {}; // {diameter_quality: {priority: stok_kodu}}

    console.log('📋 BATCH: Fetching all YM ST products for priority mapping...');
    const allYmStForPriorityResponse = await fetchWithAuth(`${API_URLS.galYmSt}?limit=5000`);
    if (allYmStForPriorityResponse && allYmStForPriorityResponse.ok) {
      const allYmStsForPriority = await allYmStForPriorityResponse.json();

      // Build priority map grouped by target diameter and quality
      allYmStsForPriority.forEach(ymSt => {
        const cap = parseFloat(ymSt.cap);
        const quality = ymSt.quality;
        const priority = ymSt.priority || 0;
        const key = `${Math.round(cap * 100)}_${quality}`;

        if (!ymStPriorityMap[key]) {
          ymStPriorityMap[key] = {};
        }
        ymStPriorityMap[key][priority] = ymSt.stok_kodu;
      });

      console.log(`✅ BATCH: Built YM ST priority map with ${Object.keys(ymStPriorityMap).length} diameter-quality combinations`);

      // Debug: Show some priority map entries
      const sampleKeys = Object.keys(ymStPriorityMap).slice(0, 5);
      sampleKeys.forEach(key => {
        console.log(`  Map[${key}]:`, ymStPriorityMap[key]);
      });
    }

    // Step 2: Identify COILER products (1.5-1.8mm filmaşin → .ST)
    const coilerProducts = new Map(); // {mamul_kodu: {ymStBilesen, replacementCode, recipes}}

    allYMGTRecetes.forEach(recipe => {
      if (recipe.bilesen_kodu && recipe.bilesen_kodu.match(/YM\.ST\.(\d{4})\.\d+\.\d+$/)) {
        const match = recipe.bilesen_kodu.match(/YM\.ST\.(\d{4})\.\d+\.\d+$/);
        if (match) {
          const diameter = parseFloat(match[1]) / 100.0;
          if (diameter >= 1.5 && diameter <= 1.8) {
            const replacementCode = `YM.ST.${match[1]}.ST`;
            if (!coilerProducts.has(recipe.mamul_kodu)) {
              coilerProducts.set(recipe.mamul_kodu, {
                ymStBilesen: recipe.bilesen_kodu,
                replacementCode,
                recipes: []
              });
            }
          }
        }
      }
    });

    // Collect all recipes for coiler products
    allYMGTRecetes.forEach(recipe => {
      if (coilerProducts.has(recipe.mamul_kodu)) {
        coilerProducts.get(recipe.mamul_kodu).recipes.push(recipe);
      }
    });

    console.log(`📋 BATCH: Found ${coilerProducts.size} COILER products (1.5-1.8mm)`);

    // Step 3: Generate MATRIX priority alternatives for ALL YM GT products
    const ymGtAltRecipesByPriority = {}; // {priority: {mamul_kodu: {recipes, isCoiler}}}

    Object.keys(ymGtByProduct).forEach(mamulKodu => {
      const recipes = ymGtByProduct[mamulKodu];
      const ymStRecipe = recipes.find(r => r.bilesen_kodu && r.bilesen_kodu.startsWith('YM.ST.'));
      if (!ymStRecipe) return;

      // Skip .ST products (they're coiler products, handled separately)
      if (ymStRecipe.bilesen_kodu.endsWith('.ST')) return;

      const ymStMatch = ymStRecipe.bilesen_kodu.match(/YM\.ST\.(\d{4})\.(\d{4})\.(\d{4})$/);
      if (!ymStMatch) return;

      const targetCap = parseInt(ymStMatch[1], 10);
      const quality = ymStMatch[3];
      const mapKey = `${targetCap}_${quality}`;

      const priorities = ymStPriorityMap[mapKey];
      if (!priorities) {
        console.log(`⚠️ BATCH: No priority map found for ${ymStRecipe.bilesen_kodu} (key: ${mapKey})`);
        return;
      }

      // For each priority (excluding 0), create alternative recipes
      Object.keys(priorities).forEach(priorityStr => {
        const priority = parseInt(priorityStr);
        if (priority === 0) return; // Skip main priority

        const altYmStCode = priorities[priority];
        if (!altYmStCode) return;

        if (!ymGtAltRecipesByPriority[priority]) {
          ymGtAltRecipesByPriority[priority] = {};
        }

        if (!ymGtAltRecipesByPriority[priority][mamulKodu]) {
          ymGtAltRecipesByPriority[priority][mamulKodu] = { recipes: [], isCoiler: false };
        }

        recipes.forEach(recipe => {
          const altRecipe = { ...recipe };
          if (recipe.bilesen_kodu === ymStRecipe.bilesen_kodu) {
            altRecipe.bilesen_kodu = altYmStCode;
          }
          ymGtAltRecipesByPriority[priority][mamulKodu].recipes.push(altRecipe);
        });
      });
    });

    console.log(`📋 BATCH: Generated matrix priority alternatives for priorities:`, Object.keys(ymGtAltRecipesByPriority));
    Object.keys(ymGtAltRecipesByPriority).forEach(pri => {
      const products = Object.keys(ymGtAltRecipesByPriority[pri]);
      console.log(`  Priority ${pri}: ${products.length} products`);
      if (products.length <= 20) {
        console.log(`    Products:`, products.join(', '));
      }
    });

    // Step 4: Add COILER products to ALT 1
    if (!ymGtAltRecipesByPriority[1]) {
      ymGtAltRecipesByPriority[1] = {};
    }

    let coilerReplacedMatrix = 0;
    coilerProducts.forEach((data, mamulKodu) => {
      // Coiler products REPLACE any matrix priority products (coiler takes precedence)
      if (ymGtAltRecipesByPriority[1][mamulKodu]) {
        coilerReplacedMatrix++;
      }

      ymGtAltRecipesByPriority[1][mamulKodu] = { recipes: [], isCoiler: true };

      // Generate .ST replacement recipes
      data.recipes.forEach(recipe => {
        const altRecipe = { ...recipe };
        if (recipe.bilesen_kodu === data.ymStBilesen) {
          altRecipe.bilesen_kodu = data.replacementCode;
        }
        ymGtAltRecipesByPriority[1][mamulKodu].recipes.push(altRecipe);
      });
    });

    console.log(`📋 BATCH: Coiler products replaced ${coilerReplacedMatrix} matrix priority 1 products`);

    // Step 5: Create ALT sheets for each priority
    const foundPriorities = Object.keys(ymGtAltRecipesByPriority)
      .map(p => parseInt(p))
      .sort((a, b) => a - b);

    console.log(`📋 BATCH: Found priorities for YM GT ALT sheets: ${foundPriorities.join(', ')}`);

    foundPriorities.forEach(priority => {
      const altProducts = ymGtAltRecipesByPriority[priority];
      if (!altProducts || Object.keys(altProducts).length === 0) return;

      const sheetName = `YM GT REÇETE ALT ${priority}`;
      const ymGtAltSheet = receteWorkbook.addWorksheet(sheetName);
      ymGtAltSheet.addRow(receteHeaders);

      const sortedMamulCodes = Object.keys(altProducts).sort();
      let coilerCount = 0;
      let matrixCount = 0;

      sortedMamulCodes.forEach(mamulKodu => {
        const { recipes, isCoiler } = altProducts[mamulKodu];
        if (!recipes || recipes.length === 0) return;

        // Count coiler vs matrix products in this priority
        if (isCoiler) {
          coilerCount++;
        } else {
          matrixCount++;
        }

        let productSiraNo = 1;
        recipes.forEach(recipe => {
          const row = ymGtAltSheet.addRow(generateYmGtReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.mamul_kodu));

          // Color COILER products with light cream
          if (isCoiler) {
            row.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEEAA' } // Light cream
              };
            });
          }

          productSiraNo++;
        });
      });

      console.log(`✅ BATCH: Created ${sheetName} with ${sortedMamulCodes.length} products (${coilerCount} coiler, ${matrixCount} matrix)`);
    });

    // YM ST REÇETE Sheet - Main recipes only (priority 0)
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

    // Add main YM ST recipes (priority 0)
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

    // 🆕 Generate COILER alternatives dynamically for .ST products
    console.log('🔄 TÜM ÜRÜNLER: Generating COILER alternatives for .ST products...');
    const { alt1Recipes, alt2Recipes } = generateCoilerAlternatives(mainYmStRecetes, allYMSTProducts);
    console.log(`📋 TÜM ÜRÜNLER: Created ${alt1Recipes.length} ALT 1 recipes and ${alt2Recipes.length} ALT 2 recipes for COILER products`);

    // 🆕 Create YM ST REÇETE ALT 1 sheet (for .ST products with xxx.0600.1008)
    if (alt1Recipes.length > 0) {
      const alt1Sheet = receteWorkbook.addWorksheet('YM ST REÇETE ALT 1');
      alt1Sheet.addRow(receteHeaders);

      // Group ALT 1 recipes by product
      const ymStAlt1ByProduct = {};
      alt1Recipes.forEach(recipe => {
        if (!ymStAlt1ByProduct[recipe.mamul_kodu]) {
          ymStAlt1ByProduct[recipe.mamul_kodu] = [];
        }
        ymStAlt1ByProduct[recipe.mamul_kodu].push(recipe);
      });

      // Add ALT 1 recipes
      Object.keys(ymStAlt1ByProduct).sort().forEach(stokKodu => {
        if (ymStAlt1ByProduct[stokKodu] && ymStAlt1ByProduct[stokKodu].length > 0) {
          let productSiraNo = 1;
          ymStAlt1ByProduct[stokKodu].forEach(recipe => {
            alt1Sheet.addRow(generateYmStReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.mamul_kodu, 1));
            productSiraNo++;
          });
        }
      });

      console.log(`✅ TÜM ÜRÜNLER: Created YM ST REÇETE ALT 1 sheet with ${alt1Recipes.length} recipes`);
    }

    // 🆕 Create YM ST REÇETE ALT 2 sheet (for .ST products with xxx.0550.1006)
    if (alt2Recipes.length > 0) {
      const alt2Sheet = receteWorkbook.addWorksheet('YM ST REÇETE ALT 2');
      alt2Sheet.addRow(receteHeaders);

      // Group ALT 2 recipes by product
      const ymStAlt2ByProduct = {};
      alt2Recipes.forEach(recipe => {
        if (!ymStAlt2ByProduct[recipe.mamul_kodu]) {
          ymStAlt2ByProduct[recipe.mamul_kodu] = [];
        }
        ymStAlt2ByProduct[recipe.mamul_kodu].push(recipe);
      });

      // Add ALT 2 recipes
      Object.keys(ymStAlt2ByProduct).sort().forEach(stokKodu => {
        if (ymStAlt2ByProduct[stokKodu] && ymStAlt2ByProduct[stokKodu].length > 0) {
          let productSiraNo = 1;
          ymStAlt2ByProduct[stokKodu].forEach(recipe => {
            alt2Sheet.addRow(generateYmStReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.mamul_kodu, 2));
            productSiraNo++;
          });
        }
      });

      console.log(`✅ TÜM ÜRÜNLER: Created YM ST REÇETE ALT 2 sheet with ${alt2Recipes.length} recipes`);
    }
    
    // Save Reçete Excel
    const receteBuffer = await receteWorkbook.xlsx.writeBuffer();
    const receteTimestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const receteFilename = `Toplu_Recete_${receteTimestamp}.xlsx`;
    saveAs(new Blob([receteBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), receteFilename);
    
    console.log(`✅ BULK EXCEL GT: Generated Recipe Excel with ${Object.keys(mmGtByProduct).length} MM GT products, ${Object.keys(ymGtByProduct).length} YM GT products, ${allYMSTRecetes.length} YM ST recipes`);
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
    
    // Collect all products from all requests (using Maps to avoid duplicates)
    const mmGtMap = new Map(); // key: stok_kodu, value: MM GT data
    const ymGtMap = new Map(); // key: stok_kodu, value: YM GT data
    const ymStMap = new Map(); // key: stok_kodu, value: YM ST data (main only)
    const ymStAltMaps = {}; // Dynamic: { 1: Map, 2: Map, 3: Map, ... } for unlimited alternatives
    const mmGtRecipeMap = new Map(); // key: `${mm_gt_stok_kodu}-${bilesen_kodu}`, value: recipe
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
        
        // Find MM GT by stok_kodu
        console.log(`🔍 [${request.id}] Searching for MM GT with stok_kodu: "${request.stok_kodu}"`);
        
        totalApiCalls++;
        let mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu=${request.stok_kodu}`);
        
        // If exact match fails due to parameter error, fetch all and filter client-side
        if (!mmGtResponse || !mmGtResponse.ok) {
          console.log(`🔍 [${request.id}] Exact match failed, fetching all MM GT and filtering client-side...`);
          const allMmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}?limit=1000`);
          if (allMmGtResponse && allMmGtResponse.ok) {
            const allMmGtProducts = await allMmGtResponse.json();
            const filteredProducts = allMmGtProducts.filter(p => p.stok_kodu === request.stok_kodu);
            
            // Create a mock response with filtered data
            mmGtResponse = {
              ok: true,
              json: async () => filteredProducts
            };
            
            console.log(`🔍 [${request.id}] Client-side filtering found ${filteredProducts.length} products with stok_kodu: "${request.stok_kodu}"`);
          }
        }
        
        if (mmGtResponse && mmGtResponse.ok) {
          const mmGtProducts = await mmGtResponse.json();
          successfulApiCalls++;
          
          console.log(`📋 [${request.id}] MM GT API response:`, mmGtProducts);
          
          // The API returns an array even for single stok_kodu query
          const mmGtArray = Array.isArray(mmGtProducts) ? mmGtProducts : [mmGtProducts];
          
          if (mmGtArray.length > 0) {
            console.log(`📦 [${request.id}] Found ${mmGtArray.length} MM GT product(s):`, mmGtArray.map(p => ({ 
              stok_kodu: p.stok_kodu, 
              id: p.id, 
              cap: p.cap,
              kg: p.kg
            })));
          }
          
          if (mmGtArray.length === 0) {
            console.warn(`⚠️ [${request.id}] No MM GT product found with stok_kodu: "${request.stok_kodu}"`);
            console.warn(`⚠️ [${request.id}] This could mean: 1) Product was deleted, 2) Wrong stok_kodu, 3) Sequence mismatch`);
            continue;
          }
          
          // Process only the specific MM GT for this request
          for (const mmGt of mmGtArray) {
            // Add MM GT
            console.log(`➕ [${request.id}] Adding MM GT to map: ${mmGt.stok_kodu} (ID: ${mmGt.id})`);
            mmGtMap.set(mmGt.stok_kodu, mmGt);

            // STEP 1: Fetch MM GT recipes first to extract YM GT stok_kodu
            console.log(`📖 [${processedRequests}/${requestsList.length}] Fetching MM GT recipes for mm_gt_id=${mmGt.id} (stok_kodu: ${mmGt.stok_kodu})...`);
            const allRecipesResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?limit=10000`);
            let mmGtRecipes = [];

            if (allRecipesResponse && allRecipesResponse.ok) {
              const allRecipes = await allRecipesResponse.json();
              console.log(`📊 Total MM GT recipes fetched from API: ${allRecipes.length}`);

              // Try ID matching first, then stok_kodu matching as fallback
              const recipesByIdFilter = allRecipes.filter(r => r.mm_gt_id == mmGt.id);
              const recipesByStokKodu = allRecipes.filter(r => r.mamul_kodu === mmGt.stok_kodu);

              if (recipesByIdFilter.length > 0) {
                mmGtRecipes = recipesByIdFilter;
                console.log(`✅ Found ${mmGtRecipes.length} MM GT recipes by ID`);
              } else if (recipesByStokKodu.length > 0) {
                mmGtRecipes = recipesByStokKodu;
                console.log(`⚠️ Found ${mmGtRecipes.length} MM GT recipes by stok_kodu fallback`);
              } else {
                console.error(`❌ NO RECIPES found for MM GT ${mmGt.stok_kodu}`);
              }

              // Store MM GT recipes in map
              mmGtRecipes.forEach(r => {
                let updatedBilesenKodu = r.bilesen_kodu;
                if (r.bilesen_kodu && r.bilesen_kodu.includes('YM.GT.')) {
                  const mmGtSequence = mmGt.stok_kodu?.split('.').pop() || '00';
                  const bilesenParts = r.bilesen_kodu.split('.');
                  if (bilesenParts.length >= 5) {
                    bilesenParts[bilesenParts.length - 1] = mmGtSequence;
                    updatedBilesenKodu = bilesenParts.join('.');
                  }
                }

                const key = `${mmGt.stok_kodu}-${updatedBilesenKodu}`;
                mmGtRecipeMap.set(key, {
                  ...r,
                  bilesen_kodu: updatedBilesenKodu,
                  mm_gt_stok_kodu: mmGt.stok_kodu,
                  sequence: mmGt.stok_kodu?.split('.').pop() || '00'
                });
              });
            }

            // STEP 2: Extract YM GT stok_kodu from MM GT recipes
            const ymGtRecipe = mmGtRecipes.find(r =>
              (r.operasyon_bilesen === 'B' || r.operasyon_bilesen === 'Bileşen') &&
              r.bilesen_kodu &&
              r.bilesen_kodu.startsWith('YM.GT.')
            );

            let ymGtStokKodu = null;
            if (ymGtRecipe) {
              // Extract and update YM GT stok_kodu with MM GT sequence
              const mmGtSequence = mmGt.stok_kodu?.split('.').pop() || '00';
              const bilesenParts = ymGtRecipe.bilesen_kodu.split('.');
              if (bilesenParts.length >= 5) {
                bilesenParts[bilesenParts.length - 1] = mmGtSequence;
                ymGtStokKodu = bilesenParts.join('.');
              } else {
                ymGtStokKodu = ymGtRecipe.bilesen_kodu;
              }
              console.log(`✅ Found YM GT stok_kodu from MM GT recipe: ${ymGtStokKodu}`);
            } else {
              // Fallback: Construct YM GT stok_kodu from MM GT stok_kodu
              ymGtStokKodu = mmGt.stok_kodu.replace('GT.', 'YM.GT.');
              console.log(`⚠️ No YM GT in recipes, using fallback: ${ymGtStokKodu}`);
            }

            // STEP 3: Fetch YM GT by stok_kodu
            if (ymGtStokKodu) {
              console.log(`📖 Fetching YM GT by stok_kodu: ${ymGtStokKodu}...`);
              const allYmGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?limit=1000`);

              if (allYmGtResponse && allYmGtResponse.ok) {
                const allYmGt = await allYmGtResponse.json();
                const ymGt = allYmGt.find(r => r.stok_kodu === ymGtStokKodu);

                if (ymGt) {
                  console.log(`✅ Found YM GT: ${ymGt.stok_kodu} (ID: ${ymGt.id})`);
                  ymGtMap.set(ymGt.stok_kodu, ymGt);

                  // Fetch YM GT recipes
                  console.log(`📖 Fetching YM GT recipes for ym_gt_id=${ymGt.id}...`);
                  const allYmGtRecipesResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?limit=2000`);

                  if (allYmGtRecipesResponse && allYmGtRecipesResponse.ok) {
                    const allYmGtRecipes = await allYmGtRecipesResponse.json();
                    const ymGtRecipes = allYmGtRecipes.filter(r => r.ym_gt_id == ymGt.id);
                    console.log(`✅ Found ${ymGtRecipes.length} YM GT recipes`);

                    // Store YM GT recipes
                    ymGtRecipes.forEach(r => {
                      const key = `${ymGt.stok_kodu}-${r.bilesen_kodu}`;
                      ymGtRecipeMap.set(key, {
                        ...r,
                        ym_gt_stok_kodu: ymGt.stok_kodu,
                        mm_gt_stok_kodu: mmGt.stok_kodu,
                        sequence: mmGt.stok_kodu?.split('.').pop() || '00',
                      });
                    });

                    // STEP 4: Extract main YM ST from YM GT recipes
                    const mainYmStRecipe = ymGtRecipes.find(r =>
                      (r.operasyon_bilesen === 'B' || r.operasyon_bilesen === 'Bileşen') &&
                      r.bilesen_kodu &&
                      r.bilesen_kodu.startsWith('YM.ST.')
                    );

                    if (mainYmStRecipe) {
                      console.log(`✅ Found main YM ST stok_kodu from YM GT recipe: ${mainYmStRecipe.bilesen_kodu}`);

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
                  console.warn(`⚠️ YM GT not found: ${ymGtStokKodu}`);
                }
              }
            }

            // STEP 5: Handle alternatives from relationship table (if any)
            let relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
            
            // If relation fetch fails due to parameter error, fetch all and filter client-side
            if (!relationResponse || !relationResponse.ok) {
              console.log(`🔗 Relation fetch failed for mm_gt_id=${mmGt.id}, fetching all relations and filtering...`);
              const allRelationsResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?limit=1000`);
              if (allRelationsResponse && allRelationsResponse.ok) {
                const allRelations = await allRelationsResponse.json();
                const filteredRelations = allRelations.filter(r => r.mm_gt_id === mmGt.id);
                console.log(`🔗 Found ${filteredRelations.length} relations for MM GT ${mmGt.stok_kodu}`);
                
                // Create mock response
                relationResponse = {
                  ok: true,
                  json: async () => filteredRelations
                };
              }
            }
            
            if (relationResponse && relationResponse.ok) {
              const relations = await relationResponse.json();
              
              if (relations.length > 0) {
                console.log(`Relationship data for MM GT ${mmGt.id}:`, relations);
                const ymGtId = relations[0].ym_gt_id;
                
                // Add YM GT data if it exists
                if (ymGtId) {
                  try {
                    console.log(`📖 Excel: Fetching all YM GT products and filtering for id=${ymGtId}...`);
                    const allYmGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?limit=1000`);
                    let ymGtResponse = null;
                    
                    if (allYmGtResponse && allYmGtResponse.ok) {
                      const allYmGt = await allYmGtResponse.json();
                      const filteredYmGt = allYmGt.filter(r => r.id == ymGtId); // Use == for type coercion
                      console.log(`📖 Excel: Found ${filteredYmGt.length} YM GT products for id=${ymGtId}`);
                      
                      // FALLBACK: If not found by ID, try searching by stok_kodu pattern
                      if (filteredYmGt.length === 0) {
                        console.log(`⚠️ YM GT not found by ID ${ymGtId}, trying stok_kodu fallback...`);
                        
                        // Construct expected YM GT stok_kodu from MM GT stok_kodu
                        const mmGtStokKodu = mmGt.stok_kodu; // e.g., "GT.PAD.0120.01"
                        const expectedYmGtStokKodu = mmGtStokKodu.replace('GT.', 'YM.GT.'); // e.g., "YM.GT.PAD.0120.01"
                        
                        console.log(`🔍 Searching for YM GT with stok_kodu: ${expectedYmGtStokKodu}`);
                        
                        const fallbackYmGt = allYmGt.filter(r => r.stok_kodu === expectedYmGtStokKodu);
                        if (fallbackYmGt.length > 0) {
                          console.log(`✅ Found YM GT by stok_kodu fallback: ${fallbackYmGt[0].stok_kodu} (ID: ${fallbackYmGt[0].id})`);
                          ymGtResponse = {
                            ok: true,
                            json: async () => fallbackYmGt[0]
                          };
                        } else {
                          console.log(`❌ YM GT not found by stok_kodu either: ${expectedYmGtStokKodu}`);
                          ymGtResponse = {
                            ok: true,
                            json: async () => []
                          };
                        }
                      } else {
                        // Create mock response - return first match
                        ymGtResponse = {
                          ok: true,
                          json: async () => filteredYmGt.length > 0 ? filteredYmGt[0] : []
                        };
                      }
                    }
                    
                    if (ymGtResponse && ymGtResponse.ok) {
                      const ymGtData = await ymGtResponse.json();
                      console.log(`YM GT data received:`, ymGtData);
                      const ymGt = Array.isArray(ymGtData) ? ymGtData[0] : ymGtData;
                      if (ymGt) {
                        ymGtMap.set(ymGt.stok_kodu, ymGt);
                        
                        // Add YM GT recipes
                        console.log(`📖 Excel: Fetching all YM GT recipes and filtering for ym_gt_id=${ymGtId}...`);
                        const allYmGtRecipesResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?limit=2000`);
                        let ymGtRecipeResponse = null;
                        
                        if (allYmGtRecipesResponse && allYmGtRecipesResponse.ok) {
                          const allYmGtRecipes = await allYmGtRecipesResponse.json();
                          const filteredYmGtRecipes = allYmGtRecipes.filter(r => r.ym_gt_id == ymGtId); // Use == for type coercion
                          console.log(`📖 Excel: Found ${filteredYmGtRecipes.length} YM GT recipes for ym_gt_id=${ymGtId}`);
                          
                          // Create mock response
                          ymGtRecipeResponse = {
                            ok: true,
                            json: async () => filteredYmGtRecipes
                          };
                        }
                        
                        if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
                          const ymGtRecipes = await ymGtRecipeResponse.json();
                          ymGtRecipes.forEach(r => {
                            const key = `${ymGt.stok_kodu}-${r.bilesen_kodu}`;
                            ymGtRecipeMap.set(key, {
                              ...r,
                              mm_gt_stok_kodu: mmGt.stok_kodu,
                              sequence: mmGt.stok_kodu?.split('.').pop() || '00',
                              ym_gt_stok_kodu: ymGt.stok_kodu
                            });
                          });
                        }
                      }
                    }
                  } catch (error) {
                    console.error(`YM GT ${ymGtId} might be deleted, skipping:`, error);
                  }
                } else {
                  console.warn(`No YM GT ID found in relationship for MM GT ${mmGt.id}`);
                }
                
                // Only add YM STs that were specifically selected for this request
                // Filter by checking if they were part of the approved calculation for this MM GT
                for (const relation of relations) {
                  try {
                    console.log(`📖 Excel: Fetching all YM ST products and filtering for id=${relation.ym_st_id}...`);
                    const allYmStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?limit=1000`);
                    let ymStResponse = null;
                    
                    if (allYmStResponse && allYmStResponse.ok) {
                      const allYmSt = await allYmStResponse.json();
                      const filteredYmSt = allYmSt.filter(r => r.id == relation.ym_st_id); // Use == for type coercion
                      console.log(`📖 Excel: Found ${filteredYmSt.length} YM ST products for id=${relation.ym_st_id}`);
                      
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
                        // Determine which map to use based on is_main and sequence_index
                        const isMain = relation.is_main === true || relation.is_main === 1;
                        const sequenceIndex = parseInt(relation.sequence_index) || 0;

                        let targetStockMap, targetRecipeMap, altLabel;

                        if (isMain) {
                          // ✅ FIXED: Main products always go to Ana sheet (regardless of sequence_index)
                          targetStockMap = ymStMap;
                          targetRecipeMap = ymStRecipeMap;
                          altLabel = 'Ana';
                        } else if (sequenceIndex > 0) {
                          // ✅ FIXED: Alternative products ONLY for sequence_index >= 1 (ALT 1, ALT 2, ALT 3, ...)
                          if (!ymStAltMaps[sequenceIndex]) {
                            ymStAltMaps[sequenceIndex] = new Map();
                          }
                          if (!ymStAltRecipeMaps[sequenceIndex]) {
                            ymStAltRecipeMaps[sequenceIndex] = new Map();
                          }
                          targetStockMap = ymStAltMaps[sequenceIndex];
                          targetRecipeMap = ymStAltRecipeMaps[sequenceIndex];
                          altLabel = `ALT ${sequenceIndex}`;
                        } else {
                          // ✅ FIXED: Skip inconsistent data (is_main=false AND sequence_index=0)
                          console.warn(`⚠️ Skipping YM ST ${ymSt.stok_kodu}: is_main=false but sequence_index=0 (inconsistent data)`);
                          continue; // Skip this product
                        }

                        console.log(`📦 Adding YM ST to ${altLabel}: ${ymSt.stok_kodu}`);
                        targetStockMap.set(ymSt.stok_kodu, ymSt);

                        // Add YM ST recipes to appropriate map
                        console.log(`📖 Excel: Fetching all YM ST recipes and filtering for ym_st_id=${relation.ym_st_id}...`);
                        const allYmStRecipesResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?limit=2000`);
                        let ymStRecipeResponse = null;

                        if (allYmStRecipesResponse && allYmStRecipesResponse.ok) {
                          const allYmStRecipes = await allYmStRecipesResponse.json();
                          const filteredYmStRecipes = allYmStRecipes.filter(r => r.ym_st_id == relation.ym_st_id); // Use == for type coercion
                          console.log(`📖 Excel: Found ${filteredYmStRecipes.length} YM ST recipes for ym_st_id=${relation.ym_st_id} (${altLabel})`);

                          // Create mock response
                          ymStRecipeResponse = {
                            ok: true,
                            json: async () => filteredYmStRecipes
                          };
                        }

                        if (ymStRecipeResponse && ymStRecipeResponse.ok) {
                          const ymStRecipes = await ymStRecipeResponse.json();
                          ymStRecipes.forEach(r => {
                            const key = `${ymSt.stok_kodu}-${r.bilesen_kodu}`;
                            targetRecipeMap.set(key, {
                              ...r,
                              ym_st_stok_kodu: ymSt.stok_kodu
                            });
                          });
                        }
                      }
                    }
                  } catch (error) {
                    console.error(`YM ST ${relation.ym_st_id} might be deleted, skipping:`, error);
                  }
                }
              }
            }
          }
        } else {
          failedApiCalls++;
          console.error('[' + request.id + '] MM GT API failed - Response status: ' + (mmGtResponse?.status || 'undefined'));
          console.error('[' + request.id + '] Response text:', await mmGtResponse?.text().catch(() => 'Unable to read response'));
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
    console.log(`MM GT Map keys: [${Array.from(mmGtMap.keys()).join(', ')}]`);
    console.log(`YM GT Map keys: [${Array.from(ymGtMap.keys()).join(', ')}]`);
    console.log(`YM ST Map keys: [${Array.from(ymStMap.keys()).join(', ')}]`);

    // Log alternative maps dynamically
    Object.keys(ymStAltMaps).forEach(seqIndex => {
      console.log(`YM ST ALT ${seqIndex} Map keys: [${Array.from(ymStAltMaps[seqIndex].keys()).join(', ')}]`);
    });

    const allMmGtData = Array.from(mmGtMap.values());
    const allYmGtData = Array.from(ymGtMap.values());
    const allYmStData = Array.from(ymStMap.values());

    // Convert alternative maps to arrays dynamically
    const allYmStAltData = {}; // { 1: array, 2: array, 3: array, ... }
    Object.keys(ymStAltMaps).forEach(seqIndex => {
      allYmStAltData[seqIndex] = Array.from(ymStAltMaps[seqIndex].values());
    });

    const allMmGtRecipes = Array.from(mmGtRecipeMap.values());
    const allYmGtRecipes = Array.from(ymGtRecipeMap.values());
    const allYmStRecipes = Array.from(ymStRecipeMap.values());

    // Convert alternative recipe maps to arrays dynamically
    const allYmStAltRecipes = {}; // { 1: array, 2: array, 3: array, ... }
    Object.keys(ymStAltRecipeMaps).forEach(seqIndex => {
      allYmStAltRecipes[seqIndex] = Array.from(ymStAltRecipeMaps[seqIndex].values());
    });

    console.log('📊 === BATCH DATA COLLECTION SUMMARY ===');
    console.log(`MM GT Products: ${allMmGtData.length}`);
    console.log(`MM GT Recipes: ${allMmGtRecipes.length} (should be ~${allMmGtData.length * 8} for 8 components per product)`);
    console.log(`YM GT Products: ${allYmGtData.length}`);
    console.log(`YM GT Recipes: ${allYmGtRecipes.length}`);
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
      console.log('📦 MM GT Products details (sorted by cap):', sortedMmGtData.map(m => ({ 
        stok_kodu: m.stok_kodu, 
        id: m.id, 
        request_id: m.request_id,
        cap: m.cap,
        kg: m.kg
      })));
    }
    if (sortedYmGtData.length > 0) {
      console.log('📦 YM GT Products details (sorted by cap):', sortedYmGtData.map(y => ({ 
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
      console.error('💥 CRITICAL ERROR: No MM GT products found in any approved requests!');
      console.error('💡 Possible causes:');
      console.error('   1. Approved requests exist but have no saved MM GT products');
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
      currentProduct: `${sortedMmGtData.length} MM GT, ${sortedYmGtData.length} YM GT, ${sortedYmStData.length} YM ST (Ana)${altCounts ? ', ' + altCounts : ''}`
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
  const generateBatchStokKartiExcel = async (mmGtData, ymGtData, ymStData, ymStAltDataObj) => {
    console.log('📋 Batch Stok Kartı Excel - Input validation');

    if (!mmGtData || mmGtData.length === 0) {
      throw new Error('MM GT verisi bulunamadı - Stok Kartı Excel oluşturulamıyor');
    }

    const workbook = new ExcelJS.Workbook();

    // MM GT Sheet - EXACT same structure as individual
    const mmGtSheet = workbook.addWorksheet('MM GT');
    const mmGtHeaders = getStokKartiHeaders();
    mmGtSheet.addRow(mmGtHeaders);

    // Add multiple MM GT rows (one per product)
    for (const mmGt of mmGtData) {
      // Create a batch-specific row with actual MM GT data
      mmGtSheet.addRow(generateMmGtStokKartiDataForBatch(mmGt));
    }

    // YM GT Sheet - EXACT same structure as individual
    const ymGtSheet = workbook.addWorksheet('YM GT');
    const ymGtHeaders = getYmGtHeaders();
    ymGtSheet.addRow(ymGtHeaders);

    // Add multiple YM GT rows (one per product)
    for (const ymGt of ymGtData) {
      // Create a batch-specific row with actual YM GT data
      ymGtSheet.addRow(generateYmGtStokKartiDataForBatch(ymGt));
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
  const generateBatchReceteExcel = async (mmGtRecipes, ymGtRecipes, ymStRecipes, sortedMmGtData, sortedYmGtData, sortedYmStData) => {
    console.log('📋 Batch Reçete Excel - Input validation');
    
    const workbook = new ExcelJS.Workbook();
    
    // MM GT REÇETE Sheet - EXACT same structure as individual
    const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');
    const receteHeaders = getReceteHeaders();
    mmGtReceteSheet.addRow(receteHeaders);
    
    // FIXED: Add multiple MM GT recipe rows with per-product sequence numbering
    const mmGtByProduct = {};
    console.log(`📊 Total MM GT recipes to process: ${mmGtRecipes.length}`);
    mmGtRecipes.forEach(recipe => {
      if (!mmGtByProduct[recipe.mm_gt_stok_kodu]) {
        mmGtByProduct[recipe.mm_gt_stok_kodu] = [];
      }
      mmGtByProduct[recipe.mm_gt_stok_kodu].push(recipe);
    });
    console.log(`📊 Recipes grouped into ${Object.keys(mmGtByProduct).length} products`);
    
    // Get stok codes from sorted product data to maintain diameter order
    const sortedMmGtStokCodes = sortedMmGtData.map(product => product.stok_kodu);
    console.log('🔍 DEBUG: Sorted MM GT product order by cap:', sortedMmGtData.map(p => ({ stok_kodu: p.stok_kodu, cap: p.cap })));
    console.log('🔍 DEBUG: Available MM GT recipe stok codes:', Object.keys(mmGtByProduct));
    console.log('🔍 DEBUG: Full mmGtByProduct structure:', mmGtByProduct);
    
    sortedMmGtStokCodes.forEach((stokKodu, index) => {
      if (mmGtByProduct[stokKodu] && mmGtByProduct[stokKodu].length > 0) {
        console.log(`✅ Adding ${mmGtByProduct[stokKodu].length} recipes for MM GT: ${stokKodu}`);
        let productSiraNo = 1; // Restart sequence for each product
        mmGtByProduct[stokKodu].forEach(recipe => {
          mmGtReceteSheet.addRow(generateMmGtReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.mm_gt_stok_kodu));
          productSiraNo++;
        });
      } else {
        console.warn(`⚠️ No recipes found for MM GT: ${stokKodu} - This product will have no recipe rows in Excel`);
      }
    });
    
    // YM GT REÇETE Sheet - EXACT same structure as individual
    const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');
    ymGtReceteSheet.addRow(receteHeaders);
    
    // FIXED: Add multiple YM GT recipe rows with per-product sequence numbering
    const ymGtByProduct = {};
    ymGtRecipes.forEach(recipe => {
      if (!ymGtByProduct[recipe.ym_gt_stok_kodu]) {
        ymGtByProduct[recipe.ym_gt_stok_kodu] = [];
      }
      ymGtByProduct[recipe.ym_gt_stok_kodu].push(recipe);
    });
    
    // Get stok codes from sorted product data to maintain diameter order
    const sortedYmGtStokCodes = sortedYmGtData.map(product => product.stok_kodu);
    
    sortedYmGtStokCodes.forEach(stokKodu => {
      if (ymGtByProduct[stokKodu] && ymGtByProduct[stokKodu].length > 0) {
        let productSiraNo = 1; // Restart sequence for each product
        
        // Find the Çinko (150 03) recipe for this product to calculate YM.ST miktar
        const zincRecipe = ymGtByProduct[stokKodu].find(r => r.bilesen_kodu === '150' || r.bilesen_kodu === '150 03');
        
        ymGtByProduct[stokKodu].forEach(recipe => {
          let finalMiktar = recipe.miktar;
          
          // For YM.ST entries, calculate the value as "1 - Çinko Tüketim Miktarı"
          if (recipe.bilesen_kodu && recipe.bilesen_kodu.includes('YM.ST.') && zincRecipe) {
            finalMiktar = 1 - parseFloat(zincRecipe.miktar);
          }
          
          ymGtReceteSheet.addRow(generateYmGtReceteRowForBatch(recipe.bilesen_kodu, finalMiktar, productSiraNo, recipe.sequence, recipe.ym_gt_stok_kodu));
          productSiraNo++;
        });
      }
    });

    // YM GT REÇETE ALT 1 Sheet - For COILER alternatives (1.5-1.8mm YM ST filmaşin bilesen)
    // Step 1: Identify YM GT products that use FILMAŞIN YM ST bilesen in 1.5-1.8mm range
    // These will get ALTERNATIVE recipes using .ST versions (alternatives NOT in database)
    const ymGtAltProductCodes = new Set();

    // First pass: Find products with filmaşin in 1.5-1.8mm range
    ymGtRecipes.forEach(recipe => {
      if (recipe.bilesen_kodu && recipe.bilesen_kodu.startsWith('YM.ST.')) {
        // Match filmaşin pattern: YM.ST.XXXX.YYYY.ZZZZ (not .ST ending)
        const bilesenMatch = recipe.bilesen_kodu.match(/YM\.ST\.(\d{4})\.\d+\.\d+$/);
        if (bilesenMatch) {
          const ymStBilesenDiameter = parseFloat(bilesenMatch[1]) / 100.0;
          // Check if diameter is in 1.5-1.8mm range (inclusive)
          if (ymStBilesenDiameter >= 1.5 && ymStBilesenDiameter <= 1.8) {
            ymGtAltProductCodes.add(recipe.ym_gt_stok_kodu);
          }
        }
      }
    });

    // Second pass: Get ALL recipe rows for these products (not just YM.ST row!)
    const ymGtAltOriginalRecipes = {}; // Store original recipes to generate alternatives
    ymGtRecipes.forEach(recipe => {
      if (ymGtAltProductCodes.has(recipe.ym_gt_stok_kodu)) {
        if (!ymGtAltOriginalRecipes[recipe.ym_gt_stok_kodu]) {
          ymGtAltOriginalRecipes[recipe.ym_gt_stok_kodu] = [];
        }
        ymGtAltOriginalRecipes[recipe.ym_gt_stok_kodu].push(recipe);
      }
    });

    // Step 2: Generate ALTERNATIVE recipes by replacing filmaşin with .ST version
    const ymGtAltRecipes = [];
    Object.keys(ymGtAltOriginalRecipes).forEach(stokKodu => {
      ymGtAltOriginalRecipes[stokKodu].forEach(recipe => {
        // Clone the recipe
        const altRecipe = { ...recipe };

        // If this is the YM.ST bilesen row, replace filmaşin with .ST version
        if (recipe.bilesen_kodu && recipe.bilesen_kodu.match(/YM\.ST\.(\d{4})\.\d+\.\d+$/)) {
          const match = recipe.bilesen_kodu.match(/YM\.ST\.(\d{4})\.\d+\.\d+$/);
          if (match) {
            const diameter = match[1];
            altRecipe.bilesen_kodu = `YM.ST.${diameter}.ST`;
          }
        }

        ymGtAltRecipes.push(altRecipe);
      });
    });

    console.log(`📋 Found ${ymGtAltProductCodes.size} YM GT products with filmaşin YM ST (1.5-1.8mm), generating ${ymGtAltRecipes.length} ALTERNATIVE recipe rows`);

    // Create YM GT REÇETE ALT 1 sheet if there are alternatives
    if (ymGtAltRecipes.length > 0) {
      const ymGtAltSheet = workbook.addWorksheet('YM GT REÇETE ALT 1');
      ymGtAltSheet.addRow(receteHeaders);

      // Group ALT recipes by YM GT stok kodu for proper sequencing
      const ymGtAltByProduct = {};
      ymGtAltRecipes.forEach(recipe => {
        if (!ymGtAltByProduct[recipe.ym_gt_stok_kodu]) {
          ymGtAltByProduct[recipe.ym_gt_stok_kodu] = [];
        }
        ymGtAltByProduct[recipe.ym_gt_stok_kodu].push(recipe);
      });

      // Sort by YM GT stok kodu
      const sortedYmGtAltStokCodes = Object.keys(ymGtAltByProduct).sort();

      sortedYmGtAltStokCodes.forEach(stokKodu => {
        if (ymGtAltByProduct[stokKodu] && ymGtAltByProduct[stokKodu].length > 0) {
          let productSiraNo = 1; // Restart sequence for each product

          // Find the Çinko (150 03) recipe for this product to calculate YM.ST miktar
          const zincRecipe = ymGtAltByProduct[stokKodu].find(r => r.bilesen_kodu === '150' || r.bilesen_kodu === '150 03');

          ymGtAltByProduct[stokKodu].forEach(recipe => {
            let finalMiktar = recipe.miktar;

            // For YM.ST entries, calculate the value as "1 - Çinko Tüketim Miktarı"
            if (recipe.bilesen_kodu && recipe.bilesen_kodu.includes('YM.ST.') && zincRecipe) {
              finalMiktar = 1 - parseFloat(zincRecipe.miktar);
            }

            ymGtAltSheet.addRow(generateYmGtReceteRowForBatch(recipe.bilesen_kodu, finalMiktar, productSiraNo, recipe.sequence, recipe.ym_gt_stok_kodu));
            productSiraNo++;
          });
        }
      });

      console.log(`✅ Created YM GT REÇETE ALT 1 sheet with ${ymGtAltProductCodes.size} products, ${ymGtAltRecipes.length} total rows`);
    } else {
      console.log(`ℹ️ No YM GT COILER alternatives found for YM ST 1.5-1.8mm range - skipping YM GT REÇETE ALT 1 sheet`);
    }

    // YM ST REÇETE Sheet - Main products (priority 0)
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    ymStReceteSheet.addRow(receteHeaders);

    // 🆕 Generate COILER alternatives dynamically for .ST products
    console.log('🔄 Generating COILER alternatives for .ST products...');
    const { alt1Recipes, alt2Recipes } = generateCoilerAlternatives(ymStRecipes, sortedYmStData);
    console.log(`📋 Created ${alt1Recipes.length} ALT 1 recipes and ${alt2Recipes.length} ALT 2 recipes for COILER products`);

    console.log(`📋 Creating YM ST Reçete sheets: Ana (${ymStRecipes.length}), ALT 1 (${alt1Recipes.length}), ALT 2 (${alt2Recipes.length}) recipes`);

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

    // 🆕 Create YM ST REÇETE ALT 1 sheet (for .ST products with xxx.0600.1008)
    if (alt1Recipes.length > 0) {
      const alt1Sheet = workbook.addWorksheet('YM ST REÇETE ALT 1');
      alt1Sheet.addRow(receteHeaders);

      // Group ALT 1 recipes by product
      const ymStAlt1ByProduct = {};
      alt1Recipes.forEach(recipe => {
        if (!ymStAlt1ByProduct[recipe.ym_st_stok_kodu]) {
          ymStAlt1ByProduct[recipe.ym_st_stok_kodu] = [];
        }
        ymStAlt1ByProduct[recipe.ym_st_stok_kodu].push(recipe);
      });

      // Add ALT 1 recipes (only for .ST products)
      sortedYmStStokCodes.forEach(stokKodu => {
        if (ymStAlt1ByProduct[stokKodu] && ymStAlt1ByProduct[stokKodu].length > 0) {
          let productSiraNo = 1;
          ymStAlt1ByProduct[stokKodu].forEach(recipe => {
            alt1Sheet.addRow(generateYmStReceteRowForBatch(
              recipe.bilesen_kodu,
              recipe.miktar,
              productSiraNo,
              recipe.ym_st_stok_kodu,
              1 // Priority 1 for ALT 1
            ));
            productSiraNo++;
          });
        }
      });

      console.log(`✅ Created YM ST REÇETE ALT 1 sheet with ${alt1Recipes.length} recipes`);
    }

    // 🆕 Create YM ST REÇETE ALT 2 sheet (for .ST products with xxx.0550.1006)
    if (alt2Recipes.length > 0) {
      const alt2Sheet = workbook.addWorksheet('YM ST REÇETE ALT 2');
      alt2Sheet.addRow(receteHeaders);

      // Group ALT 2 recipes by product
      const ymStAlt2ByProduct = {};
      alt2Recipes.forEach(recipe => {
        if (!ymStAlt2ByProduct[recipe.ym_st_stok_kodu]) {
          ymStAlt2ByProduct[recipe.ym_st_stok_kodu] = [];
        }
        ymStAlt2ByProduct[recipe.ym_st_stok_kodu].push(recipe);
      });

      // Add ALT 2 recipes (only for .ST products)
      sortedYmStStokCodes.forEach(stokKodu => {
        if (ymStAlt2ByProduct[stokKodu] && ymStAlt2ByProduct[stokKodu].length > 0) {
          let productSiraNo = 1;
          ymStAlt2ByProduct[stokKodu].forEach(recipe => {
            alt2Sheet.addRow(generateYmStReceteRowForBatch(
              recipe.bilesen_kodu,
              recipe.miktar,
              productSiraNo,
              recipe.ym_st_stok_kodu,
              2 // Priority 2 for ALT 2
            ));
            productSiraNo++;
          });
        }
      });

      console.log(`✅ Created YM ST REÇETE ALT 2 sheet with ${alt2Recipes.length} recipes`);
    }

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
      
      // Find MM GT by stok_kodu
      const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu=${request.stok_kodu}`);
      if (!mmGtResponse || !mmGtResponse.ok) {
        throw new Error('MM GT ürünü bulunamadı');
      }
      
      const mmGtProducts = await mmGtResponse.json();
      if (!mmGtProducts || mmGtProducts.length === 0) {
        throw new Error('MM GT ürünü veritabanında bulunamadı');
      }
      
      const mmGt = mmGtProducts[0];
      console.log(`📦 Found MM GT:`, { stok_kodu: mmGt.stok_kodu, id: mmGt.id });
      
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
    const Excel = require('exceljs');
    const { saveAs } = require('file-saver');
    
    const workbook = new Excel.Workbook();
    const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];
    
    // Ana YM ST'yi belirle
    const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];
    
    // Get stok kartı headers from the old function (assuming it's available)
    const stokKartiHeaders = getStokKartiHeaders();
    
    // MM GT Sheet - Artık sadece 1 tane MM GT
    const mmGtSheet = workbook.addWorksheet('MM GT');
    mmGtSheet.addRow(stokKartiHeaders);
    
    // Sadece 1 MM GT ekle (doğru sequence ile)
    mmGtSheet.addRow(generateMmGtStokKartiData(excelData.sequence));
    
    // YM GT Sheet - Artık sadece 1 tane YM GT
    const ymGtSheet = workbook.addWorksheet('YM GT');
    ymGtSheet.addRow(stokKartiHeaders);
    
    // YM GT için doğru sequence kullan (stok kartı fonksiyonu sequence bekliyor, stok kodu değil)
    ymGtSheet.addRow(generateYmGtStokKartiData(excelData.sequence));
    
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
    const Excel = require('exceljs');
    const { saveAs } = require('file-saver');
    
    const workbook = new Excel.Workbook();
    const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];
    
    // Get main YM ST
    const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];
    const mainYmStIndex_ = excelData.mainYmStIndex;
    const sequence = excelData.sequence;
    
    // Get recipe headers from the old function (assuming it's available)
    const receteHeaders = getReceteHeaders();
    
    // MM GT REÇETE Sheet
    const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');
    mmGtReceteSheet.addRow(receteHeaders);
    
    // Sadece ana YMST için MM GT reçete satırları ekle
    const mmGtRecipe = { ...excelData.allRecipes.mmGtRecipes[mainYmStIndex_] } || {};
    
    
    // DÜZELTME: Doğru YM.GT kodu oluştur - MMGT ile aynı sequence kullanılmalı
    const correctStokKodu = `YM.GT.${excelData.mmGtData.kod_2}.${Math.round(parseFloat(excelData.mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;
    
    // Reçetedeki YM.GT kodlarını düzelt - yeni bir obje oluşturarak
    const fixedRecipe = {};
    Object.entries(mmGtRecipe).forEach(([key, value]) => {
      if (key.includes('YM.GT.')) {
        // Always replace ANY YM.GT key with the correct sequence
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
    
    // Maintain fixed order: YM.GT.*.*, GTPKT01, AMB.ÇEM.KARTON.GAL, AMB.SHRİNK.*, SM.7MMHALKA, AMB.APEX CEMBER, AMB.TOKA.SIGNODE, SM.DESİ.PAK
    const correctYmGtStokKodu = `YM.GT.${excelData.mmGtData.kod_2}.${Math.round(parseFloat(excelData.mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;
    const ymGtEntry = recipeEntries.find(([key]) => key === correctYmGtStokKodu) || 
                      recipeEntries.find(([key]) => key.includes('YM.GT.'));
    const gtpkt01Entry = recipeEntries.find(([key]) => key === 'GTPKT01');
    const kartonEntry = recipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL');
    const shrinkEntry = recipeEntries.find(([key]) => key.includes('AMB.SHRİNK.'));
    const halkaEntry = recipeEntries.find(([key]) => key === 'SM.7MMHALKA');
    const cemberEntry = recipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080');
    const tokaEntry = recipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
    const desiEntry = recipeEntries.find(([key]) => key === 'SM.DESİ.PAK');
    
    // Other entries that might exist but aren't in the fixed order
    const otherEntries = recipeEntries.filter(([key]) => 
      !key.includes('YM.GT.') && 
      key !== 'GTPKT01' &&
      key !== 'AMB.ÇEM.KARTON.GAL' &&
      !key.includes('AMB.SHRİNK.') &&
      key !== 'SM.7MMHALKA' &&
      key !== 'AMB.APEX CEMBER 38X080' &&
      key !== 'AMB.TOKA.SIGNODE.114P. DKP' &&
      key !== 'SM.DESİ.PAK'
    );
    
    // Sırayla ekle - exact order
    const orderedEntries = [
      ymGtEntry, 
      gtpkt01Entry, 
      kartonEntry,
      shrinkEntry,
      halkaEntry,
      cemberEntry,
      tokaEntry,
      desiEntry,
      ...otherEntries
    ].filter(Boolean);
    
    // MM GT reçete satırlarını eklerken doğru sequence'i kullan - Sadece 8 satır olmalı
    orderedEntries.forEach(([key, value]) => {
      if (value > 0) {
        mmGtReceteSheet.addRow(generateMmGtReceteRow(key, value, siraNo, sequence));
        siraNo++;
      }
    });
    
    // Debugging: Check if we have exactly 8 rows as expected
    const addedRows = orderedEntries.filter(([key, value]) => value > 0).length;
    if (addedRows !== 8) {
      console.warn(`MMGT reçetesi ${addedRows} satır içeriyor, 8 olmalı. Girdiler:`, 
        orderedEntries.filter(([key, value]) => value > 0).map(([key]) => key));
    }
    
    // YM GT REÇETE Sheet - Artık sadece 1 tane YM GT reçetesi
    const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');
    ymGtReceteSheet.addRow(receteHeaders);
    
    // Sadece 1 YM GT reçetesi ekle - aynı sequence'i kullan
    let siraNo2 = 1;
    
    // YM GT reçetesinden sequence'e uygun değerleri al - fixed exact order
    const ymGtRecipeEntries = Object.entries(excelData.allRecipes.ymGtRecipe);
    
    // Fixed order: YM.ST.*.*.*, GLV01, 150 03, SM.HİDROLİK.ASİT
    // Find YM.ST component in YM GT recipe
    const ymStEntry = ymGtRecipeEntries.find(([key]) => key.includes('YM.ST.'));
    const glv01Entry = ymGtRecipeEntries.find(([key]) => key === 'GLV01');
    // Get Çinko from YM GT recipe (NOT YM ST recipe)
    const zincEntry = ymGtRecipeEntries.find(([key]) => key === '150 03');
    const asitEntry = ymGtRecipeEntries.find(([key]) => key === 'SM.HİDROLİK.ASİT');
    
    // Other entries that might exist but aren't in the fixed order
    const otherYmGtEntries = ymGtRecipeEntries.filter(([key]) => 
      !key.includes('YM.ST.') && 
      key !== 'GLV01' && 
      key !== '150 03' && 
      key !== 'SM.HİDROLİK.ASİT'
    );
    
    // Sırayla ekle - exact order
    const orderedYmGtEntries = [
      ymStEntry, // Use the YM.ST entry as found
      glv01Entry,
      zincEntry,
      asitEntry,
      ...otherYmGtEntries
    ].filter(Boolean);
    
    orderedYmGtEntries.forEach(([key, value]) => {
      if (value > 0) {
        // For YM.ST entries, calculate the value as "1 - Çinko Tüketim Miktarı"
        let finalValue = value;
        if (key.includes('YM.ST.') && zincEntry && zincEntry[1]) {
          finalValue = 1 - parseFloat(zincEntry[1]);
        }
        ymGtReceteSheet.addRow(generateYmGtReceteRow(key, finalValue, siraNo2, sequence));
        siraNo2++;
      }
    });

    // YM GT REÇETE ALT 1 Sheet - For COILER alternatives (1.5-1.8mm YM ST filmaşin bilesen)
    // Check if this product uses FILMAŞIN YM ST in 1.5-1.8mm range (then generate .ST alternative)
    let hasFilmasinInCoilerRange = false;
    let ymStBilesenDiameter = 0;
    let alternativeBilesenKodu = '';

    if (ymStEntry && ymStEntry[0] && ymStEntry[0].startsWith('YM.ST.')) {
      // Match filmaşin pattern: YM.ST.XXXX.YYYY.ZZZZ (not .ST ending)
      const bilesenMatch = ymStEntry[0].match(/YM\.ST\.(\d{4})\.\d+\.\d+$/);
      if (bilesenMatch) {
        ymStBilesenDiameter = parseFloat(bilesenMatch[1]) / 100.0;
        // Check if diameter is in 1.5-1.8mm range (inclusive)
        if (ymStBilesenDiameter >= 1.5 && ymStBilesenDiameter <= 1.8) {
          hasFilmasinInCoilerRange = true;
          // Generate alternative bilesen code (replace filmaşin with .ST)
          const diameter = bilesenMatch[1];
          alternativeBilesenKodu = `YM.ST.${diameter}.ST`;
        }
      }
    }

    if (hasFilmasinInCoilerRange) {
      console.log(`📋 SINGLE: YM GT recipe uses filmaşin ${ymStEntry[0]} (${ymStBilesenDiameter}mm), generating .ST alternative: ${alternativeBilesenKodu}`);

      const ymGtAltSheet = workbook.addWorksheet('YM GT REÇETE ALT 1');
      ymGtAltSheet.addRow(receteHeaders);

      // Create ALTERNATIVE YM GT recipe structure with .ST bilesen (4 rows: YM.ST.*.ST, GLV01, Çinko, Asit)
      let altSiraNo = 1;

      orderedYmGtEntries.forEach(([key, value]) => {
        if (value > 0) {
          let finalKey = key;
          let finalValue = value;

          // Replace filmaşin YM.ST with .ST version
          if (key.includes('YM.ST.') && key.match(/YM\.ST\.(\d{4})\.\d+\.\d+$/)) {
            finalKey = alternativeBilesenKodu;
            if (zincEntry && zincEntry[1]) {
              finalValue = 1 - parseFloat(zincEntry[1]);
            }
          } else if (key.includes('YM.ST.') && zincEntry && zincEntry[1]) {
            finalValue = 1 - parseFloat(zincEntry[1]);
          }

          ymGtAltSheet.addRow(generateYmGtReceteRow(finalKey, finalValue, altSiraNo, sequence));
          altSiraNo++;
        }
      });

      console.log(`✅ SINGLE: Created YM GT REÇETE ALT 1 sheet with .ST alternative (${ymStBilesenDiameter}mm)`);
    }

    // YM ST REÇETE Sheet - Main YM ST recipes
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    ymStReceteSheet.addRow(receteHeaders);
    
    // İlk olarak ana YM ST'nin reçetesini ekle
    let siraNoMain = 1;
    
    // Ana YMST reçete sıralaması: fixed exact order - 1) FLM bileşeni, 2) TLC01 operasyonu
    const mainYmStRecipe = excelData.allRecipes.ymStRecipes[mainYmStIndex_] || {};
    const mainRecipeEntries = Object.entries(mainYmStRecipe);
    
    // Fixed order: FLM.*.*, TLC01
    const mainFlmEntry = mainRecipeEntries.find(([key]) => key.includes('FLM.'));
    const mainTlc01Entry = mainRecipeEntries.find(([key]) => key === 'TLC01');
    
    // Any other entries that might exist but aren't in the fixed order
    const mainOtherEntries = mainRecipeEntries.filter(([key]) => 
      !key.includes('FLM.') && 
      key !== 'TLC01'
    );
    
    // Sırayla ekle - exact order
    const mainOrderedEntries = [
      mainFlmEntry,
      mainTlc01Entry,
      ...mainOtherEntries
    ].filter(Boolean);
    
    mainOrderedEntries.forEach(([key, value]) => {
      if (value > 0) {
        ymStReceteSheet.addRow(generateYmStReceteRow(key, value, siraNoMain, mainYmSt));
        siraNoMain++;
      }
    });
    
    // YM ST REÇETE ALT Sheets - For matrix alternatives (all priorities > 0)
    // Group alternatives by priority
    const ymStAltsByPriority = {};
    allYmSts.forEach((ymSt, index) => {
      const priority = ymSt.priority !== undefined ? ymSt.priority : (index === mainYmStIndex_ ? 0 : 999);
      if (priority > 0) {
        if (!ymStAltsByPriority[priority]) {
          ymStAltsByPriority[priority] = [];
        }
        ymStAltsByPriority[priority].push({ ymSt, index });
      }
    });

    // Create separate ALT sheet for each priority
    Object.keys(ymStAltsByPriority).sort((a, b) => Number(a) - Number(b)).forEach(priority => {
      const alts = ymStAltsByPriority[priority];
      const altSheet = workbook.addWorksheet(`YM ST REÇETE ALT ${priority}`);
      altSheet.addRow(receteHeaders);

      // Add all alternatives for this priority
      alts.forEach(({ ymSt, index }) => {
        const ymStRecipe = excelData.allRecipes.ymStRecipes[index] || {};
        let siraNo = 1;

        // YMST reçete sıralaması: fixed exact order
        const recipeEntries = Object.entries(ymStRecipe);

        // Fixed order: FLM/YM.ST source, TLC01/COTLC01
        const flmEntry = recipeEntries.find(([key]) => key.includes('FLM.'));
        const ymStSourceEntry = recipeEntries.find(([key]) => key.includes('YM.ST.') && key !== ymSt.stok_kodu);
        const tlc01Entry = recipeEntries.find(([key]) => key === 'TLC01');
        const cotlc01Entry = recipeEntries.find(([key]) => key === 'COTLC01');

        // Any other entries
        const otherEntries = recipeEntries.filter(([key]) =>
          !key.includes('FLM.') &&
          !(key.includes('YM.ST.') && key !== ymSt.stok_kodu) &&
          key !== 'TLC01' &&
          key !== 'COTLC01'
        );

        // Sırayla ekle - exact order
        const orderedEntries = [
          flmEntry || ymStSourceEntry,
          tlc01Entry || cotlc01Entry,
          ...otherEntries
        ].filter(Boolean);

        orderedEntries.forEach(([key, value]) => {
          if (value > 0) {
            altSheet.addRow(generateYmStReceteRow(key, value, siraNo, ymSt));
            siraNo++;
          }
        });
      });
    });
    
    try {
      // Validate data before writing
      console.log('Reçete Excel dosyası oluşturuluyor...');
      const buffer = await workbook.xlsx.writeBuffer();
      console.log('Reçete Excel buffer oluşturuldu, dosya boyutu:', buffer.byteLength, 'bytes');
      
      // Additional validation - ensure buffer is not empty
      if (buffer.byteLength === 0) {
        throw new Error('Reçete Excel buffer boş - veri sorunu');
      }
      
      // Generate filename using MMGT stok_kodu
      const capFormatted = Math.round(parseFloat(excelData.mmGtData.cap) * 100).toString().padStart(4, '0');
      const mmGtStokKodu = `GT.${excelData.mmGtData.kod_2}.${capFormatted}.${sequence}`;
      const filename = `${mmGtStokKodu}_Recete.xlsx`;
      
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
      console.log('Reçete Excel dosyası başarıyla kaydedildi:', filename);
    } catch (error) {
      console.error('Reçete Excel oluşturma hatası:', error);
      throw new Error(`Reçete Excel dosyası oluşturulamadı: ${error.message}`);
    }
  };

  // Helper function to generate combined stok kartı Excel from stored data
  const generateCombinedStokKartiExcelFromData = async (tasks) => {
    const Excel = require('exceljs');
    const { saveAs } = require('file-saver');
    
    const workbook = new Excel.Workbook();
    const stokKartiHeaders = getStokKartiHeaders();
    
    // MM GT Sheet
    const mmGtSheet = workbook.addWorksheet('MM GT');
    mmGtSheet.addRow(stokKartiHeaders);
    
    // YM GT Sheet  
    const ymGtSheet = workbook.addWorksheet('YM GT');
    ymGtSheet.addRow(stokKartiHeaders);
    
    // YM ST Sheet
    const ymStSheet = workbook.addWorksheet('YM ST');
    ymStSheet.addRow(stokKartiHeaders);
    
    tasks.forEach(task => {
      const { excelData } = task;
      const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];
      const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];
      
      // Add MM GT
      mmGtSheet.addRow(generateMmGtStokKartiDataForBatch(excelData.mmGtData));
      
      // Add YM GT - Create YM GT data from task-specific MM GT data
      const taskYmGtData = {
        stok_kodu: `YM.GT.${excelData.mmGtData.kod_2}.${Math.round(parseFloat(excelData.mmGtData.cap) * 100).toString().padStart(4, '0')}.${excelData.sequence}`,
        cap: excelData.mmGtData.cap,
        kod_2: excelData.mmGtData.kod_2,
        sequence: excelData.sequence
      };
      ymGtSheet.addRow(generateYmGtStokKartiDataForBatch(taskYmGtData));
      
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
    
    // Instead of converting to requests and re-fetching from database, 
    // directly use the task data which has complete MM GT information including proper stok_adi
    
    // Prepare complete MM GT data from task data (which already has proper formatting)
    const mmGtData = [];
    const ymGtData = [];
    const ymStData = [];
    const mmGtRecipeData = [];
    const ymGtRecipeData = [];
    const ymStRecipeData = [];
    
    console.log('📋 Processing task data for direct Excel generation...');
    
    for (const task of tasks) {
      const { excelData } = task;
      
      // Use the MM GT data from the task which already has correct stok_adi formatting
      if (excelData.mmGtData) {
        console.log(`📋 Adding MM GT: ${excelData.mmGtData.stok_kodu} -> stok_adi: "${excelData.mmGtData.stok_adi}"`);
        
        // If stok_adi is undefined, generate it from the saved data
        if (!excelData.mmGtData.stok_adi) {
          console.log(`⚠️ MM GT stok_adi is undefined, generating from saved data...`);
          const cap = parseFloat(excelData.mmGtData.cap);
          const toleransPlus = parseFloat(excelData.mmGtData.tolerans_plus) || 0;
          const toleransMinus = parseFloat(excelData.mmGtData.tolerans_minus) || 0;
          const bagAmount = excelData.mmGtData.cast_kont && excelData.mmGtData.cast_kont.trim() !== ''
            ? `/${excelData.mmGtData.cast_kont}`
            : '';

          // Format tolerance values with proper signs (values are already signed in database)
          const formattedMinus = (toleransMinus >= 0 ? '+' : '') + toleransMinus.toFixed(2).replace('.', ',');
          const formattedPlus = (toleransPlus >= 0 ? '+' : '') + toleransPlus.toFixed(2).replace('.', ',');
          const toleranceText = `${formattedMinus}/${formattedPlus}`;

          // Generate complete stok_adi with all the formatting
          const generatedStokAdi = `Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm ${toleranceText} ${excelData.mmGtData.kaplama || '0'} gr/m² ${excelData.mmGtData.min_mukavemet || '0'}-${excelData.mmGtData.max_mukavemet || '0'} MPa ID:${excelData.mmGtData.ic_cap || '45'} cm OD:${excelData.mmGtData.dis_cap || '75'} cm ${excelData.mmGtData.kg || '0'}${bagAmount} kg`;
          
          // Extract packaging suffixes from the saved task data
          const suffixes = [];
          
          // Check if packaging info exists in the task data
          if (task.packaging) {
            // Use packaging info from task if available
            console.log(`📦 Using task packaging: ${JSON.stringify(task.packaging)}`);
            if (task.packaging.shrink) suffixes.push('Shrink');
            if (task.packaging.paletli) suffixes.push('Plt');
            if (task.packaging.sepetli) suffixes.push('Spt');
          } else if (excelData.packaging) {
            // Check if packaging is stored in excelData
            console.log(`📦 Using excelData packaging: ${JSON.stringify(excelData.packaging)}`);
            if (excelData.packaging.shrink) suffixes.push('Shrink');
            if (excelData.packaging.paletli) suffixes.push('Plt');
            if (excelData.packaging.sepetli) suffixes.push('Spt');
          } else {
            // Fallback: use current form state (this shouldn't happen with the fix above)
            console.log(`⚠️ No packaging info found in task data, using current form state as fallback`);
            if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
            if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
            if (paketlemeSecenekleri.sepetli) suffixes.push('Spt');
          }
          
          let finalStokAdi = generatedStokAdi;
          if (suffixes.length > 0) {
            finalStokAdi += '-' + suffixes.join('-');
          }
          
          excelData.mmGtData.stok_adi = finalStokAdi;
          console.log(`✅ Generated stok_adi with packaging suffixes [${suffixes.join(', ')}]: "${finalStokAdi}"`);
        }
        
        mmGtData.push(excelData.mmGtData);
      }
      
      // Add YM GT data
      const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];
      const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];
      
      if (mainYmSt) {
        const ymGtStokKodu = `YM.GT.${excelData.mmGtData.kod_2}.${Math.round(parseFloat(excelData.mmGtData.cap) * 100).toString().padStart(4, '0')}.${excelData.sequence}`;
        const ymGtItem = {
          stok_kodu: ymGtStokKodu,
          cap: excelData.mmGtData.cap,
          kod_2: excelData.mmGtData.kod_2,
          kaplama: excelData.mmGtData.kaplama,
          min_mukavemet: excelData.mmGtData.min_mukavemet,
          max_mukavemet: excelData.mmGtData.max_mukavemet,
          ic_cap: excelData.mmGtData.ic_cap,
          dis_cap: excelData.mmGtData.dis_cap,
          kg: excelData.mmGtData.kg,
          cast_kont: excelData.mmGtData.cast_kont,
          tolerans_plus: excelData.mmGtData.tolerans_plus,
          tolerans_minus: excelData.mmGtData.tolerans_minus,
          shrink: excelData.mmGtData.shrink,
          // Generate proper stok_adi with complete formatting
          stok_adi: generateYmGtStokAdi(excelData.mmGtData, excelData.sequence),
          ingilizce_isim: generateYmGtEnglishName(excelData.mmGtData, excelData.sequence)
        };
        ymGtData.push(ymGtItem);
        
        // Add YM ST data 
        allYmSts.forEach(ymSt => {
          if (!ymStData.find(item => item.stok_kodu === ymSt.stok_kodu)) {
            ymStData.push(ymSt);
          }
        });
      }
      
      // Add recipe data if available
      if (excelData.allRecipes) {
        if (excelData.allRecipes.mmGtRecipes) {
          mmGtRecipeData.push(...Object.values(excelData.allRecipes.mmGtRecipes));
        }
        if (excelData.allRecipes.ymGtRecipes) {
          ymGtRecipeData.push(...Object.values(excelData.allRecipes.ymGtRecipes));
        }
        if (excelData.allRecipes.ymStRecipes) {
          ymStRecipeData.push(...Object.values(excelData.allRecipes.ymStRecipes));
        }
      }
    }
    
    console.log(`📋 Prepared ${mmGtData.length} MM GT, ${ymGtData.length} YM GT, ${ymStData.length} YM ST products for Excel generation`);
    
    // Use the perfected direct Excel generation logic
    try {
      console.log('📋 Calling direct Excel generation with complete task data...');
      
      // Create Excel workbooks using the same perfected logic as batch generation
      await Promise.all([
        generateDirectStokKartiExcelFromData(mmGtData, ymGtData, ymStData),
        generateDirectReceteExcelFromData(mmGtRecipeData, ymGtRecipeData, ymStRecipeData, tasks)
      ]);
      
      console.log('✅ Post-save Excel generation completed successfully using direct data');
      return;
    } catch (error) {
      console.error('❌ Post-save Excel generation failed:', error);
      throw error;
    }
    
    // OLD CODE BELOW - keeping as fallback (should not reach here)
    
    // Helper functions for direct Excel generation
    function generateYmGtStokAdi(mmGtData, sequence) {
      const cap = parseFloat(mmGtData.cap);
      const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== '' 
        ? `/${mmGtData.cast_kont}` 
        : '';
      
      return `Yumak Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg Shrink`;
    }
    
    function generateYmGtEnglishName(mmGtData, sequence) {
      const cap = parseFloat(mmGtData.cap);
      const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== '' 
        ? `/${mmGtData.cast_kont}` 
        : '';
      
      return `Coil Galvanized Steel Wire ${cap.toFixed(2)} mm ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg Shrink`;
    }
    
    async function generateDirectStokKartiExcelFromData(mmGtData, ymGtData, ymStData) {
      console.log('📋 Generating direct stok kartı Excel...');
      
      // Create the exact same Excel structure as the batch function
      const workbook = new ExcelJS.Workbook();
      
      // MM GT Sheet - using perfected format
      const mmGtSheet = workbook.addWorksheet('MM GT');
      const mmGtHeaders = getStokKartiHeaders();
      mmGtSheet.addRow(mmGtHeaders);
      
      // Add MM GT data using the perfected generateMmGtStokKartiDataForBatch function
      for (const mmGt of mmGtData) {
        mmGtSheet.addRow(generateMmGtStokKartiDataForBatch(mmGt));
      }
      
      // YM GT Sheet
      const ymGtSheet = workbook.addWorksheet('YM GT');
      const ymGtHeaders = getYmGtHeaders();
      ymGtSheet.addRow(ymGtHeaders);
      
      // Add YM GT data
      for (const ymGt of ymGtData) {
        ymGtSheet.addRow(generateYmGtStokKartiDataForBatch(ymGt));
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
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `StokKarti_PostSave_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
      
      console.log('✅ Direct stok kartı Excel generated successfully');
    }
    
    async function generateDirectReceteExcelFromData(mmGtRecipeData, ymGtRecipeData, ymStRecipeData, tasks) {
      console.log('📋 Generating direct recipe Excel using PERFECTED format...');
      
      // Create the exact same Excel structure as the perfected batch function
      const workbook = new ExcelJS.Workbook();
      
      // Get the proper recipe headers (same as perfected function)
      const receteHeaders = getReceteHeaders();
      
      // MM GT REÇETE Sheet - Use PERFECTED format
      const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');
      mmGtReceteSheet.addRow(receteHeaders);
      
      // Add MM GT recipes using the PERFECTED logic
      for (const task of tasks) {
        const { excelData } = task;
        
        // Validate excelData structure
        if (!excelData || !excelData.allRecipes || !excelData.allRecipes.mmGtRecipes) {
          console.warn('⚠️ Missing recipe data in task, skipping MM GT recipes');
          continue;
        }
        
        const allYmSts = [...(excelData.selectedYmSts || []), ...(excelData.autoGeneratedYmSts || [])];
        const mainYmStIndex = excelData.mainYmStIndex || 0;
        const sequence = excelData.sequence;
        
        // Use the SAME logic as the perfected individual Excel generation
        const mmGtRecipe = { ...excelData.allRecipes.mmGtRecipes[mainYmStIndex] } || {};
        const correctStokKodu = `YM.GT.${excelData.mmGtData.kod_2}.${Math.round(parseFloat(excelData.mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;
        
        // Fix YM.GT key in recipe (same as perfected)
        const fixedRecipe = {};
        Object.entries(mmGtRecipe).forEach(([key, value]) => {
          if (key.includes('YM.GT.')) {
            fixedRecipe[correctStokKodu] = value;
          } else {
            fixedRecipe[key] = value;
          }
        });
        
        // Process recipe entries using the PERFECTED fixed order
        const processedMmGtRecipe = fixedRecipe;
        const mmGtRecipeEntries = Object.entries(processedMmGtRecipe);
        
        // PERFECTED fixed order: YM.GT.*.*, GTPKT01, AMB.ÇEM.KARTON.GAL, AMB.SHRİNK.*, SM.7MMHALKA, AMB.APEX CEMBER, AMB.TOKA.SIGNODE, SM.DESİ.PAK
        const ymGtEntry = mmGtRecipeEntries.find(([key]) => key === correctStokKodu) || 
                          mmGtRecipeEntries.find(([key]) => key.includes('YM.GT.'));
        const gtpkt01Entry = mmGtRecipeEntries.find(([key]) => key === 'GTPKT01');
        const kartonEntry = mmGtRecipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL');
        const shrinkEntry = mmGtRecipeEntries.find(([key]) => key.includes('AMB.SHRİNK.'));
        const halkaEntry = mmGtRecipeEntries.find(([key]) => key === 'SM.7MMHALKA');
        const cemberEntry = mmGtRecipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080');
        const tokaEntry = mmGtRecipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
        const desiEntry = mmGtRecipeEntries.find(([key]) => key === 'SM.DESİ.PAK');
        
        // Add entries in the PERFECTED fixed order
        const orderedEntries = [ymGtEntry, gtpkt01Entry, kartonEntry, shrinkEntry, halkaEntry, cemberEntry, tokaEntry, desiEntry].filter(Boolean);
        
        // Use the PERFECTED generateMmGtReceteRowForBatch function (which accepts parameters)
        let siraNo = 1;
        orderedEntries.forEach(([key, value]) => {
          if (value > 0) {
            mmGtReceteSheet.addRow(generateMmGtReceteRowForBatch(key, value, siraNo, sequence, excelData.mmGtData.stok_kodu));
            siraNo++;
          }
        });
      }
      
      // YM GT REÇETE Sheet - Use PERFECTED format
      const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');
      ymGtReceteSheet.addRow(receteHeaders);
      
      // Add YM GT recipes using PERFECTED logic
      for (const task of tasks) {
        const { excelData } = task;
        
        // Validate excelData structure for YM GT recipes
        if (!excelData || !excelData.allRecipes || !excelData.allRecipes.ymGtRecipe) {
          console.warn('⚠️ Missing YM GT recipe data in task, skipping YM GT recipes');
          continue;
        }
        
        const sequence = excelData.sequence;
        
        // Use PERFECTED YM GT recipe logic
        let siraNo2 = 1;
        const ymGtRecipeEntries = Object.entries(excelData.allRecipes.ymGtRecipe);
        
        // PERFECTED fixed order: YM.ST.*.*.*, GLV01, 150 03, SM.HİDROLİK.ASİT
        const ymStEntry = ymGtRecipeEntries.find(([key]) => key.includes('YM.ST.'));
        const glv01Entry = ymGtRecipeEntries.find(([key]) => key === 'GLV01');
        const zincEntry = ymGtRecipeEntries.find(([key]) => key === '150 03');
        const asitEntry = ymGtRecipeEntries.find(([key]) => key === 'SM.HİDROLİK.ASİT');
        
        const otherYmGtEntries = ymGtRecipeEntries.filter(([key]) => 
          !key.includes('YM.ST.') && 
          key !== 'GLV01' && 
          key !== '150 03' && 
          key !== 'SM.HİDROLİK.ASİT'
        );
        
        // Add entries in PERFECTED order
        const orderedYmGtEntries = [
          ymStEntry, 
          glv01Entry,
          zincEntry,
          asitEntry,
          ...otherYmGtEntries
        ].filter(Boolean);
        
        orderedYmGtEntries.forEach(([key, value]) => {
          if (value > 0) {
            // For YM.ST entries, calculate the value as "1 - Çinko Tüketim Miktarı"
            let finalValue = value;
            if (key.includes('YM.ST.') && zincEntry && zincEntry[1]) {
              finalValue = 1 - parseFloat(zincEntry[1]);
            }
            const ymGtStokKodu = `YM.GT.${excelData.mmGtData.kod_2}.${Math.round(parseFloat(excelData.mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;
            ymGtReceteSheet.addRow(generateYmGtReceteRowForBatch(key, finalValue, siraNo2, sequence, ymGtStokKodu));
            siraNo2++;
          }
        });
      }

      // YM GT REÇETE ALT 1 Sheet - For COILER alternatives (1.5-1.8mm YM ST filmaşin bilesen)
      const ymGtAltRecipes = [];
      for (const task of tasks) {
        const { excelData } = task;

        // Validate excelData structure
        if (!excelData || !excelData.allRecipes || !excelData.allRecipes.ymGtRecipe) {
          continue;
        }

        const sequence = excelData.sequence;
        const ymGtRecipeEntries = Object.entries(excelData.allRecipes.ymGtRecipe);

        // Check if YM GT recipe uses FILMAŞIN YM ST bilesen in 1.5-1.8mm range
        const ymStEntry = ymGtRecipeEntries.find(([key]) => key.includes('YM.ST.'));
        let hasFilmasinInCoilerRange = false;
        let ymStBilesenDiameter = 0;
        let alternativeBilesenKodu = '';

        if (ymStEntry && ymStEntry[0] && ymStEntry[0].startsWith('YM.ST.')) {
          // Match filmaşin pattern: YM.ST.XXXX.YYYY.ZZZZ (not .ST ending)
          const bilesenMatch = ymStEntry[0].match(/YM\.ST\.(\d{4})\.\d+\.\d+$/);
          if (bilesenMatch) {
            ymStBilesenDiameter = parseFloat(bilesenMatch[1]) / 100.0;
            // Check if diameter is in 1.5-1.8mm range (inclusive)
            if (ymStBilesenDiameter >= 1.5 && ymStBilesenDiameter <= 1.8) {
              hasFilmasinInCoilerRange = true;
              // Generate alternative bilesen code (replace filmaşin with .ST)
              const diameter = bilesenMatch[1];
              alternativeBilesenKodu = `YM.ST.${diameter}.ST`;
            }
          }
        }

        if (hasFilmasinInCoilerRange) {
          console.log(`📋 COMBINED: Found filmaşin YM ST ${ymStEntry[0]} (${ymStBilesenDiameter}mm), generating .ST alternative: ${alternativeBilesenKodu}`);

          // Store recipe data for ALT sheet with .ST alternative
          const glv01Entry = ymGtRecipeEntries.find(([key]) => key === 'GLV01');
          const zincEntry = ymGtRecipeEntries.find(([key]) => key === '150 03');
          const asitEntry = ymGtRecipeEntries.find(([key]) => key === 'SM.HİDROLİK.ASİT');
          const otherYmGtEntries = ymGtRecipeEntries.filter(([key]) =>
            !key.includes('YM.ST.') &&
            key !== 'GLV01' &&
            key !== '150 03' &&
            key !== 'SM.HİDROLİK.ASİT'
          );

          // Replace filmaşin with .ST in the ordered entries
          const orderedEntries = [
            [alternativeBilesenKodu, ymStEntry[1]], // Use .ST alternative
            glv01Entry,
            zincEntry,
            asitEntry,
            ...otherYmGtEntries
          ].filter(Boolean);

          const ymGtStokKodu = `YM.GT.${excelData.mmGtData.kod_2}.${Math.round(parseFloat(excelData.mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;

          ymGtAltRecipes.push({
            orderedEntries,
            zincEntry,
            sequence,
            ymGtStokKodu
          });
        }
      }

      // Create YM GT REÇETE ALT 1 sheet if there are COILER alternatives
      if (ymGtAltRecipes.length > 0) {
        const ymGtAltSheet = workbook.addWorksheet('YM GT REÇETE ALT 1');
        ymGtAltSheet.addRow(receteHeaders);

        ymGtAltRecipes.forEach(recipeData => {
          let altSiraNo = 1;
          recipeData.orderedEntries.forEach(([key, value]) => {
            if (value > 0) {
              let finalValue = value;
              if (key.includes('YM.ST.') && recipeData.zincEntry && recipeData.zincEntry[1]) {
                finalValue = 1 - parseFloat(recipeData.zincEntry[1]);
              }
              ymGtAltSheet.addRow(generateYmGtReceteRowForBatch(key, finalValue, altSiraNo, recipeData.sequence, recipeData.ymGtStokKodu));
              altSiraNo++;
            }
          });
        });

        console.log(`✅ COMBINED: Created YM GT REÇETE ALT 1 sheet with ${ymGtAltRecipes.length} COILER alternative recipes (YM ST 1.5-1.8mm)`);
      } else {
        console.log(`ℹ️ COMBINED: No YM GT COILER alternatives found for YM ST 1.5-1.8mm range`);
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
        
        // PERFECTED fixed order: FLM.*.*, TLC01
        const mainFlmEntry = mainRecipeEntries.find(([key]) => key.includes('FLM.'));
        const mainTlcEntry = mainRecipeEntries.find(([key]) => key === 'TLC01');
        
        const mainOrderedEntries = [mainFlmEntry, mainTlcEntry].filter(Boolean);
        
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
            
            // Same PERFECTED fixed order for other YM STs
            const otherFlmEntry = otherRecipeEntries.find(([key]) => key.includes('FLM.'));
            const otherTlcEntry = otherRecipeEntries.find(([key]) => key === 'TLC01');
            
            const otherOrderedEntries = [otherFlmEntry, otherTlcEntry].filter(Boolean);
            
            otherOrderedEntries.forEach(([key, value]) => {
              if (value > 0) {
                ymStReceteSheet.addRow(generateYmStReceteRowForBatch(key, value, siraNoOther, ymSt.stok_kodu));
                siraNoOther++;
              }
            });
          }
        });
      }
      
      // Save the recipe Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `Recete_PostSave_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
      
      console.log('✅ Direct recipe Excel generated successfully using PERFECTED format');
    }
    
    tasks.forEach(task => {
      const { excelData } = task;
      const allYmSts = [...excelData.selectedYmSts, ...excelData.autoGeneratedYmSts];
      const mainYmSt = allYmSts[excelData.mainYmStIndex] || allYmSts[0];
      const mainYmStIndex_ = excelData.mainYmStIndex;
      const sequence = excelData.sequence;
      
      // Add MM GT recipes  
      const mmGtRecipe = { ...excelData.allRecipes.mmGtRecipes[mainYmStIndex_] } || {};
      const correctStokKodu = `YM.GT.${excelData.mmGtData.kod_2}.${Math.round(parseFloat(excelData.mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;
      
      // Fix YM.GT key in recipe (same logic as individual function)
      const fixedRecipe = {};
      Object.entries(mmGtRecipe).forEach(([key, value]) => {
        if (key.includes('YM.GT.')) {
          // Always replace ANY YM.GT key with the correct sequence
          fixedRecipe[correctStokKodu] = value;
        } else {
          fixedRecipe[key] = value;
        }
      });
      
      // Process all MM GT recipe components in proper order
      const processedMmGtRecipe = fixedRecipe;
      const mmGtRecipeEntries = Object.entries(processedMmGtRecipe);
      
      // Maintain fixed order: YM.GT.*.*, GTPKT01, AMB.ÇEM.KARTON.GAL, AMB.SHRİNK.*, SM.7MMHALKA, AMB.APEX CEMBER, AMB.TOKA.SIGNODE, SM.DESİ.PAK
      const ymGtEntry = mmGtRecipeEntries.find(([key]) => key === correctStokKodu) || 
                        mmGtRecipeEntries.find(([key]) => key.includes('YM.GT.'));
      const gtpkt01Entry = mmGtRecipeEntries.find(([key]) => key === 'GTPKT01');
      const kartonEntry = mmGtRecipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL');
      const shrinkEntry = mmGtRecipeEntries.find(([key]) => key.includes('AMB.SHRİNK.'));
      const halkaEntry = mmGtRecipeEntries.find(([key]) => key === 'SM.7MMHALKA');
      const cemberEntry = mmGtRecipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080');
      const tokaEntry = mmGtRecipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
      const desiEntry = mmGtRecipeEntries.find(([key]) => key === 'SM.DESİ.PAK');
      
      // Other entries that might exist but aren't in the fixed order
      const otherEntries = mmGtRecipeEntries.filter(([key]) => 
        !key.includes('YM.GT.') && 
        key !== 'GTPKT01' &&
        key !== 'AMB.ÇEM.KARTON.GAL' &&
        !key.includes('AMB.SHRİNK.') &&
        key !== 'SM.7MMHALKA' &&
        key !== 'AMB.APEX CEMBER 38X080' &&
        key !== 'AMB.TOKA.SIGNODE.114P. DKP' &&
        key !== 'SM.DESİ.PAK'
      );
      
      // Sırayla ekle - exact order
      const orderedEntries = [
        ymGtEntry, 
        gtpkt01Entry, 
        kartonEntry,
        shrinkEntry,
        halkaEntry,
        cemberEntry,
        tokaEntry,
        desiEntry,
        ...otherEntries
      ].filter(Boolean);
      
      // Add all MM GT recipe components
      let siraNo = 1;
      orderedEntries.forEach(([key, value]) => {
        if (value > 0) {
          mmGtReceteSheet.addRow(generateMmGtReceteRow(key, value, siraNo, sequence));
          siraNo++;
        }
      });
      
      // Add YM GT recipes
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
        
        // Generate expected stok_kodu pattern
        const capFormatted = Math.round(capValue * 100).toString().padStart(4, '0');
        const expectedStokKoduPattern = `GT.${kod2}.${capFormatted}`;
        console.log('🎯 Expected stok_kodu pattern:', expectedStokKoduPattern);
        
        const requestsByStokKodu = requests.filter(request => {
          if (!request || request.status !== 'approved' || !request.stok_kodu) return false;
          
          const matches = request.stok_kodu.startsWith(expectedStokKoduPattern);
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
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const expectedStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequenceToUse}`;
      
      if (!sequenceToUse || sequenceToUse === '00') {
      }
      
      // Her iki Excel'de de aynı sequence'i kullan
      // Stok Kartı Excel
      try {
        await generateStokKartiExcel(sequenceToUse);
      } catch (excelError) {
        console.error('Stok kartı Excel oluşturma hatası:', excelError);
        toast.error('Stok kartı Excel oluşturulamadı: ' + excelError.message);
        throw excelError; // Rethrow to stop the process
      }
      
      try {
        await generateReceteExcel(sequenceToUse);
      } catch (excelError) {
        console.error('Reçete Excel oluşturma hatası:', excelError);
        toast.error('Reçete Excel oluşturulamadı: ' + excelError.message);
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
    
    
    // MM GT Sheet - Artık sadece 1 tane MM GT
    const mmGtSheet = workbook.addWorksheet('MM GT');
    const mmGtHeaders = getStokKartiHeaders();
    mmGtSheet.addRow(mmGtHeaders);
    
    // Sadece 1 MM GT ekle (doğru sequence ile)
    mmGtSheet.addRow(generateMmGtStokKartiData(sequence));
    
    // YM GT Sheet - Artık sadece 1 tane YM GT
    const ymGtSheet = workbook.addWorksheet('YM GT');
    const ymGtHeaders = getYmGtHeaders();
    ymGtSheet.addRow(ymGtHeaders);
    
    // Sadece 1 YM GT ekle (doğru sequence ile)
    ymGtSheet.addRow(generateYmGtStokKartiData(sequence));
    
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
      
      // Generate filename using MMGT stok_kodu
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      const filename = `${mmGtStokKodu}_Stok_Karti.xlsx`;
      
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
    
    
    // MM GT REÇETE Sheet
    const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');
    const receteHeaders = getReceteHeaders();
    mmGtReceteSheet.addRow(receteHeaders);
    
    // Sadece ana YMST için MM GT reçete satırları ekle
    const mmGtRecipe = { ...allRecipes.mmGtRecipes[mainYmStIndex_] } || {}; // Clone to avoid modifying the original
    
    // DÜZELTME: Eğer YM.GT kodu yanlış sequence'e sahipse düzelt
    // Doğru YM.GT kodu oluştur - MMGT ile aynı sequence kullanılmalı
    const correctStokKodu = `YM.GT.${mmGtData.kod_2}.${Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;
    
    // Reçetedeki YM.GT kodlarını düzelt - yeni bir obje oluşturarak
    const fixedRecipe = {};
    Object.entries(mmGtRecipe).forEach(([key, value]) => {
      if (key.includes('YM.GT.') && key !== correctStokKodu) {
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
    
    // Maintain fixed order: YM.GT.*.*, GTPKT01, AMB.ÇEM.KARTON.GAL, AMB.SHRİNK.*, SM.7MMHALKA, AMB.APEX CEMBER, AMB.TOKA.SIGNODE, SM.DESİ.PAK
    // Düzeltme: YM.GT kodunu mamul_kodu ile aynı sequence'e sahip olacak şekilde ara
    const correctYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;
    const ymGtEntry = recipeEntries.find(([key]) => key === correctYmGtStokKodu) || 
                      recipeEntries.find(([key]) => key.includes('YM.GT.'));
    const gtpkt01Entry = recipeEntries.find(([key]) => key === 'GTPKT01');
    const kartonEntry = recipeEntries.find(([key]) => key === 'AMB.ÇEM.KARTON.GAL');
    const shrinkEntry = recipeEntries.find(([key]) => key.includes('AMB.SHRİNK.'));
    const halkaEntry = recipeEntries.find(([key]) => key === 'SM.7MMHALKA');
    const cemberEntry = recipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080');
    const tokaEntry = recipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
    const desiEntry = recipeEntries.find(([key]) => key === 'SM.DESİ.PAK');
    
    // Other entries that might exist but aren't in the fixed order
    const otherEntries = recipeEntries.filter(([key]) => 
      !key.includes('YM.GT.') && 
      key !== 'GTPKT01' &&
      key !== 'AMB.ÇEM.KARTON.GAL' &&
      !key.includes('AMB.SHRİNK.') &&
      key !== 'SM.7MMHALKA' &&
      key !== 'AMB.APEX CEMBER 38X080' &&
      key !== 'AMB.TOKA.SIGNODE.114P. DKP' &&
      key !== 'SM.DESİ.PAK'
    );
    
    // Sırayla ekle - exact order
    const orderedEntries = [
      ymGtEntry, 
      gtpkt01Entry, 
      kartonEntry,
      shrinkEntry,
      halkaEntry,
      cemberEntry,
      tokaEntry,
      desiEntry,
      ...otherEntries
    ].filter(Boolean);
    
    // MM GT reçete satırlarını eklerken doğru sequence'i kullan - Sadece 8 satır olmalı
    orderedEntries.forEach(([key, value]) => {
      if (value > 0) {
        mmGtReceteSheet.addRow(generateMmGtReceteRow(key, value, siraNo, sequence));
        siraNo++;
      }
    });
    
    // Debugging: Check if we have exactly 8 rows as expected
    const addedRows = orderedEntries.filter(([key, value]) => value > 0).length;
    if (addedRows !== 8) {
      console.warn(`MMGT reçetesi ${addedRows} satır içeriyor, 8 olmalı. Girdiler:`, 
        orderedEntries.filter(([key, value]) => value > 0).map(([key]) => key));
    }
    
    // YM GT REÇETE Sheet - Artık sadece 1 tane YM GT reçetesi
    const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');
    ymGtReceteSheet.addRow(receteHeaders);
    
    // Sadece 1 YM GT reçetesi ekle - aynı sequence'i kullan
    let siraNo2 = 1;
    
    // YM GT reçetesinden sequence'e uygun değerleri al - fixed exact order
    const ymGtRecipeEntries = Object.entries(allRecipes.ymGtRecipe);
    
    // Fixed order: YM.ST.*.*.*, GLV01, 150 03, SM.HİDROLİK.ASİT
    // Find YM.ST component in YM GT recipe
    const ymStEntry = ymGtRecipeEntries.find(([key]) => key.includes('YM.ST.'));
    const glv01Entry = ymGtRecipeEntries.find(([key]) => key === 'GLV01');
    // Get Çinko from YM GT recipe (NOT YM ST recipe)
    const zincEntry = ymGtRecipeEntries.find(([key]) => key === '150 03');
    const asitEntry = ymGtRecipeEntries.find(([key]) => key === 'SM.HİDROLİK.ASİT');
    
    // Other entries that might exist but aren't in the fixed order
    const otherYmGtEntries = ymGtRecipeEntries.filter(([key]) => 
      !key.includes('YM.ST.') && 
      key !== 'GLV01' && 
      key !== '150 03' && 
      key !== 'SM.HİDROLİK.ASİT'
    );
    
    // Sırayla ekle - exact order
    const orderedYmGtEntries = [
      ymStEntry, // Use the YM.ST entry as found
      glv01Entry,
      zincEntry,
      asitEntry,
      ...otherYmGtEntries
    ].filter(Boolean);
    
    orderedYmGtEntries.forEach(([key, value]) => {
      if (value > 0) {
        // For YM.ST entries, calculate the value as "1 - Çinko Tüketim Miktarı"
        let finalValue = value;
        if (key.includes('YM.ST.') && zincEntry && zincEntry[1]) {
          finalValue = 1 - parseFloat(zincEntry[1]);
        }
        ymGtReceteSheet.addRow(generateYmGtReceteRow(key, finalValue, siraNo2, sequence));
        siraNo2++;
      }
    });

    // YM GT REÇETE ALT 1 Sheet - For COILER alternatives (1.5-1.8mm YM ST filmaşin bilesen)
    // Check if this product uses FILMAŞIN YM ST in 1.5-1.8mm range (then generate .ST alternative)
    let hasFilmasinInCoilerRange = false;
    let ymStBilesenDiameter = 0;
    let alternativeBilesenKodu = '';

    if (ymStEntry && ymStEntry[0] && ymStEntry[0].startsWith('YM.ST.')) {
      // Match filmaşin pattern: YM.ST.XXXX.YYYY.ZZZZ (not .ST ending)
      const bilesenMatch = ymStEntry[0].match(/YM\.ST\.(\d{4})\.\d+\.\d+$/);
      if (bilesenMatch) {
        ymStBilesenDiameter = parseFloat(bilesenMatch[1]) / 100.0;
        // Check if diameter is in 1.5-1.8mm range (inclusive)
        if (ymStBilesenDiameter >= 1.5 && ymStBilesenDiameter <= 1.8) {
          hasFilmasinInCoilerRange = true;
          // Generate alternative bilesen code (replace filmaşin with .ST)
          const diameter = bilesenMatch[1];
          alternativeBilesenKodu = `YM.ST.${diameter}.ST`;
        }
      }
    }

    if (hasFilmasinInCoilerRange) {
      console.log(`📋 SINGLE RECIPE: YM GT recipe uses filmaşin ${ymStEntry[0]} (${ymStBilesenDiameter}mm), generating .ST alternative: ${alternativeBilesenKodu}`);

      const ymGtAltSheet = workbook.addWorksheet('YM GT REÇETE ALT 1');
      ymGtAltSheet.addRow(receteHeaders);

      // Create ALTERNATIVE YM GT recipe structure with .ST bilesen (4 rows: YM.ST.*.ST, GLV01, Çinko, Asit)
      let altSiraNo = 1;

      orderedYmGtEntries.forEach(([key, value]) => {
        if (value > 0) {
          let finalKey = key;
          let finalValue = value;

          // Replace filmaşin YM.ST with .ST version
          if (key.includes('YM.ST.') && key.match(/YM\.ST\.(\d{4})\.\d+\.\d+$/)) {
            finalKey = alternativeBilesenKodu;
            if (zincEntry && zincEntry[1]) {
              finalValue = 1 - parseFloat(zincEntry[1]);
            }
          } else if (key.includes('YM.ST.') && zincEntry && zincEntry[1]) {
            finalValue = 1 - parseFloat(zincEntry[1]);
          }

          ymGtAltSheet.addRow(generateYmGtReceteRow(finalKey, finalValue, altSiraNo, sequence));
          altSiraNo++;
        }
      });

      console.log(`✅ SINGLE RECIPE: Created YM GT REÇETE ALT 1 sheet with .ST alternative (${ymStBilesenDiameter}mm)`);
    }

    // YM ST REÇETE Sheet - Main products only
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    ymStReceteSheet.addRow(receteHeaders);

    // Categorize YM STs by priority - DYNAMIC VERSION (supports unlimited priorities)
    const ymStsByPriority = {};

    allYmSts.forEach((ymSt, index) => {
      const isMain = ymSt.isMain !== false && (ymSt.priority === 0 || ymSt.priority === undefined || index === mainYmStIndex_);
      const priority = ymSt.priority !== undefined ? ymSt.priority : (index === mainYmStIndex_ ? 0 : index);

      const ymStWithIndex = { ...ymSt, originalIndex: index };

      // Group by priority dynamically
      if (!ymStsByPriority[priority]) {
        ymStsByPriority[priority] = [];
      }
      ymStsByPriority[priority].push(ymStWithIndex);
    });

    // Helper function to add YM ST recipe rows
    const addYmStRecipeRows = (ymSt, sheet) => {
      const ymStRecipe = allRecipes.ymStRecipes[ymSt.originalIndex] || {};
      let siraNo = 1;

      const recipeEntries = Object.entries(ymStRecipe);

      // Fixed order: FLM/YM.ST (material), TLC01/COTLC01 (operation)
      const flmEntry = recipeEntries.find(([key]) => key.includes('FLM.'));
      const ymStEntry = recipeEntries.find(([key]) => key.includes('YM.ST.') && !key.includes(ymSt.stok_kodu));
      const tlc01Entry = recipeEntries.find(([key]) => key === 'TLC01');
      const cotlc01Entry = recipeEntries.find(([key]) => key === 'COTLC01');

      const otherEntries = recipeEntries.filter(([key]) =>
        !key.includes('FLM.') &&
        (!key.includes('YM.ST.') || key.includes(ymSt.stok_kodu)) &&
        key !== 'TLC01' &&
        key !== 'COTLC01' &&
        key !== 'NOTE'
      );

      const orderedEntries = [
        flmEntry || ymStEntry, // Material (FLM or source YM ST)
        tlc01Entry || cotlc01Entry, // Operation
        ...otherEntries
      ].filter(Boolean);

      orderedEntries.forEach(([key, value]) => {
        if (value > 0 || key === 'TLC01' || key === 'COTLC01') {
          sheet.addRow(generateYmStReceteRow(key, value, siraNo, ymSt));
          siraNo++;
        }
      });
    };

    // Add YM ST recipes dynamically for each priority
    const priorities = Object.keys(ymStsByPriority).map(Number).sort((a, b) => a - b);

    priorities.forEach(priority => {
      const ymSts = ymStsByPriority[priority];

      if (priority === 0) {
        // Main recipes (priority 0)
        ymSts.forEach(ymSt => {
          addYmStRecipeRows(ymSt, ymStReceteSheet);
        });
      } else {
        // Alternative recipes (priority 1, 2, 3, ...)
        const altSheet = workbook.addWorksheet(`YM ST Reçete ALT ${priority}`);
        altSheet.addRow(receteHeaders);
        ymSts.forEach(ymSt => {
          addYmStRecipeRows(ymSt, altSheet);
        });
      }
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
      
      // Generate filename using MMGT stok_kodu
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      const filename = `${mmGtStokKodu}_Recete.xlsx`;
      
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
    } catch (excelError) {
      console.error('Excel oluşturma hatası:', excelError);
      throw new Error(`Excel dosyası oluşturulamadı: ${excelError.message}`);
    }
  };

  // Excel header fonksiyonları
  const getStokKartiHeaders = () => [
    'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Kod-2', 'Cari/Satıcı Kodu',
    'Türü', 'Mamul Grup', 'İngilizce İsim', 'Satıcı İsmi', 'Muh. Detay', 'Depo Kodu', 'Br-1', 'Br-2',
    'Pay-1', 'Payda-1', 'Çevrim Değeri-1', 'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2',
    'Çevrim Değeri-2', 'Çap', 'Kaplama', 'Min Mukavemet', 'Max Mukavemet', 'KG',
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

  const getYmGtHeaders = () => [
    'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Kod-2', 'Cari/Satıcı Kodu',
    'Türü', 'Mamul Grup', 'İngilizce İsim', 'Satıcı İsmi', 'Muh. Detay', 'Depo Kodu', 'Br-1', 'Br-2',
    'Pay-1', 'Payda-1', 'Çevrim Değeri-1', 'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2',
    'Çevrim Değeri-2', 'Çap', 'Kaplama', 'Min Mukavemet', 'Max Mukavemet', 'KG',
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
    'Gümrük Tarife Kodu', 'Dağıtıcı Kodu', 'Menşei', 'Tolerans Açıklama'
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

  // Helper function to extract packaging options from stok_adi
  const extractPackagingFromStokAdi = (stokAdi) => {
    if (!stokAdi) return { shrink: false, paletli: false, sepetli: false };
    
    const parts = stokAdi.split(' kg');
    if (parts.length < 2) return { shrink: false, paletli: false, sepetli: false };
    
    const suffixPart = parts[1]; // Everything after "kg"
    return {
      shrink: suffixPart.includes('-Shrink'),
      paletli: suffixPart.includes('-Plt'),
      sepetli: suffixPart.includes('-Spt')
    };
  };

  // Excel veri oluşturma fonksiyonları - doğru formatlar ve COMMA usage
  // Batch version that takes MM GT data as parameter
  const generateMmGtStokKartiDataForBatch = (mmGt) => {
    const cap = parseFloat(mmGt.cap);
    const toleransPlus = parseFloat(mmGt.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGt.tolerans_minus) || 0;

    // Tolerance values are already signed in database, use them directly
    const adjustedPlus = toleransPlus;
    const adjustedMinus = toleransMinus;
    
    // Check if stok_adi already has packaging suffixes
    const existingPackaging = extractPackagingFromStokAdi(mmGt.stok_adi);
    
    // Generate stok_adi for this specific MM GT
    const bagAmount = mmGt.cast_kont && mmGt.cast_kont.trim() !== '' 
      ? `/${mmGt.cast_kont}` 
      : '';
    
    // Use stok_adi from database if available, otherwise generate it
    let stokAdi = mmGt.stok_adi;
    let englishName = mmGt.ingilizce_isim;
    
    // If stok_adi is not in database, generate it (shouldn't happen with proper data)
    if (!stokAdi) {
      const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2).replace('.', ',');
      const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2).replace('.', ',');
      stokAdi = `Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm ${formattedMinus}/${formattedPlus} ${mmGt.kaplama || '0'} gr/m² ${mmGt.min_mukavemet || '0'}-${mmGt.max_mukavemet || '0'} MPa ID:${mmGt.ic_cap || '45'} cm OD:${mmGt.dis_cap || '75'} cm ${mmGt.kg || '0'}${bagAmount} kg`;
    }

    // If English name is not in database, generate it
    if (!englishName) {
      const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2);
      const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2);
      englishName = `Galvanized Steel Wire ${cap.toFixed(2)} mm ${formattedMinus}/${formattedPlus} ${mmGt.kaplama || '0'} gr/m² ${mmGt.min_mukavemet || '0'}-${mmGt.max_mukavemet || '0'} MPa ID:${mmGt.ic_cap || '45'} cm OD:${mmGt.dis_cap || '75'} cm ${mmGt.kg || '0'}${bagAmount} kg`;
    }
    
    return [
      mmGt.stok_kodu, // Stok Kodu - use actual stok_kodu from database
      stokAdi, // Stok Adı
      'MM', // Grup Kodu
      'GT', // Kod-1
      mmGt.kod_2, // Kod-2
      '', // Cari/Satıcı Kodu
      'M', // Türü
      mmGt.stok_kodu, // Mamul Grup
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
      mmGt.kaplama, // Kaplama
      mmGt.min_mukavemet, // Min Mukavemet
      mmGt.max_mukavemet, // Max Mukavemet
      mmGt.kg, // KG
      mmGt.ic_cap, // İç Çap
      mmGt.dis_cap, // Dış Çap
      '', // Çap2
      mmGt.shrink, // Shrink
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
      'Galvanizli Tel', // METARIAL
      cap.toFixed(2).replace('.', ','), // DIA (MM) - COMMA for Excel
      formatDecimalForExcel(adjustedPlus), // DIA TOL (MM) + (matching Turkish tolerans)
      formatDecimalForExcel(adjustedMinus), // DIA TOL (MM) - (matching Turkish tolerans)
      mmGt.kaplama, // ZING COATING (GR/M2)
      mmGt.min_mukavemet, // TENSILE ST. (MPA) MIN
      mmGt.max_mukavemet, // TENSILE ST. (MPA) MAX
      '+', // WAX
      '+', // LIFTING LUGS
      mmGt.unwinding === 'Clockwise' ? 'Clockwise' : '', // UNWINDING
      mmGt.cast_kont || '', // CAST KONT. (CM)
      mmGt.helix_kont || '', // HELIX KONT. (CM)
      mmGt.elongation || '', // ELONGATION (%) MIN
      mmGt.ic_cap, // COIL DIMENSIONS (CM) ID
      mmGt.dis_cap, // COIL DIMENSIONS (CM) OD
      mmGt.kg, // COIL WEIGHT (KG)
      '', // COIL WEIGHT (KG) MIN
      mmGt.kg, // COIL WEIGHT (KG) MAX - Copy the same value from COIL WEIGHT
      generateToleransAciklamaForBatch(mmGt.tolerans_plus, mmGt.tolerans_minus) // Tolerans Açıklama
    ];
  };

  const generateMmGtStokKartiData = (sequence = '00') => {
    const cap = parseFloat(mmGtData.cap);
    const capFormatted = Math.round(cap * 100).toString().padStart(4, '0');
    const stokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
    const { adjustedPlus, adjustedMinus, adjustedPlusFormatted, adjustedMinusFormatted } = getAdjustedToleranceValues();
    
    
    return [
      stokKodu, // Stok Kodu
      generateStokAdiForExcel(), // Stok Adı
      'MM', // Grup Kodu
      'GT', // Kod-1
      mmGtData.kod_2, // Kod-2
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
      mmGtData.kaplama, // Kaplama
      mmGtData.min_mukavemet, // Min Mukavemet
      mmGtData.max_mukavemet, // Max Mukavemet
      mmGtData.kg, // KG
      mmGtData.ic_cap, // İç Çap
      mmGtData.dis_cap, // Dış Çap
      '', // Çap2
      mmGtData.shrink, // Shrink
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
      'Galvanizli Tel', // METARIAL
      cap.toFixed(2).replace('.', ','), // DIA (MM) - COMMA for Excel
      formatDecimalForExcel(adjustedPlus), // DIA TOL (MM) + (adjusted value matching Turkish tolerans)
      formatDecimalForExcel(adjustedMinus), // DIA TOL (MM) - (adjusted value matching Turkish tolerans)
      mmGtData.kaplama, // ZING COATING (GR/M2)
      mmGtData.min_mukavemet, // TENSILE ST. (MPA) MIN
      mmGtData.max_mukavemet, // TENSILE ST. (MPA) MAX
      '+', // WAX
      '+', // LIFTING LUGS
      mmGtData.unwinding === 'Clockwise' ? 'Clockwise' : '', // UNWINDING
      mmGtData.cast_kont || '', // CAST KONT. (CM)
      mmGtData.helix_kont || '', // HELIX KONT. (CM)
      mmGtData.elongation || '', // ELONGATION (%) MIN
      mmGtData.ic_cap, // COIL DIMENSIONS (CM) ID
      mmGtData.dis_cap, // COIL DIMENSIONS (CM) OD
      mmGtData.kg, // COIL WEIGHT (KG)
      '', // COIL WEIGHT (KG) MIN
      mmGtData.kg, // COIL WEIGHT (KG) MAX - Copy the same value from COIL WEIGHT
      getToleransAciklama() // Tolerans Açıklama
    ];
  };

  // Batch version that takes YM GT data as parameter
  const generateYmGtStokKartiDataForBatch = (ymGt) => {
    // Use cap directly from ymGt object if available, otherwise parse from stok_kodu
    let cap;
    if (ymGt.cap) {
      cap = parseFloat(ymGt.cap);
    } else {
      // Extract cap from stok_kodu as fallback
      const stokParts = ymGt.stok_kodu.split('.');
      const capCode = stokParts[3]; // cap code like 0250
      cap = parseInt(capCode) / 100; // Convert back to decimal (0250 -> 2.50)
    }
    
    // Extract other values from stok_kodu for display
    const stokParts = ymGt.stok_kodu.split('.');
    const kod2 = stokParts[2]; // GT kod_2
    const sequence = stokParts[4] || '00'; // sequence
    
    console.log('Batch YM GT - stok_kodu:', ymGt.stok_kodu, 'calculated cap:', cap, 'gumruk tarife kodu:', getGumrukTarifeKoduForCap(cap));
    
    // Get values from YM GT data
    const toleransPlus = parseFloat(ymGt.tolerans_plus) || 0;
    const toleransMinus = parseFloat(ymGt.tolerans_minus) || 0;

    // Tolerance values are already signed in database, use them directly
    const adjustedPlus = toleransPlus;
    const adjustedMinus = toleransMinus;

    // Get proper signs for tolerance display
    const plusSign = adjustedPlus >= 0 ? '+' : '';
    const minusSign = adjustedMinus >= 0 ? '+' : '';

    const kaplama = ymGt.kaplama || '0';
    const minMukavemet = ymGt.min_mukavemet || '0';
    const maxMukavemet = ymGt.max_mukavemet || '0';
    const icCap = ymGt.ic_cap || '45';
    const disCap = ymGt.dis_cap || '75';
    const kg = ymGt.kg || '0';
    const castKont = ymGt.cast_kont;

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = castKont && castKont.trim() !== '' ? `/${castKont}` : '';

    // Generate stok_adi with proper tolerance signs
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2).replace('.', ',');
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2).replace('.', ',');
    const toleranceText = `${formattedMinus}/${formattedPlus}`;
    const stokAdi = `YM Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm ${toleranceText} ${kaplama} gr/m² ${minMukavemet}-${maxMukavemet} MPa ID:${icCap} cm OD:${disCap} cm ${kg}${bagAmount} kg`;

    // Generate cari_adi with proper tolerance signs
    const cariAdi = `Tel ${cap.toFixed(2).replace('.', ',')} mm ${toleranceText} ${kaplama} gr/m² ${minMukavemet}-${maxMukavemet} MPa ID:${icCap} cm OD:${disCap} cm ${kg} kg`;

    // Generate english name with proper tolerance signs
    const englishName = `Galvanized Steel Wire ${cap.toFixed(2).replace('.', ',')} mm ${toleranceText} ${kaplama} gr/m² ${minMukavemet}-${maxMukavemet} MPa ID:${icCap} cm OD:${disCap} cm ${kg} kg`;
    
    return [
      ymGt.stok_kodu, // Stok Kodu - use actual from database
      stokAdi, // Stok Adı - proper format
      'YM', // Grup Kodu
      'GT', // Kod-1
      kod2, // Kod-2
      cariAdi, // Cari/Satıcı Kodu - proper format
      'Y', // Türü
      ymGt.stok_kodu, // Mamul Grup
      englishName, // İngilizce İsim - proper format
      '', // Satıcı İsmi
      '83', // Muh. Detay
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
      kaplama, // Kaplama - YM GT HAS these values from database
      minMukavemet, // Min Mukavemet
      maxMukavemet, // Max Mukavemet
      kg, // KG
      icCap, // İç Çap
      disCap, // Dış Çap
      '', // Çap2
      ymGt.shrink || '', // Shrink
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
      'M', // Stok Türü
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
      generateToleransAciklamaForBatch(ymGt.tolerans_plus, ymGt.tolerans_minus) // Tolerans Açıklama
    ];
  };

  const generateYmGtStokKartiData = (sequence = '00') => {
    // If ymGtData is not populated, generate it from mmGtData and current form values
    let currentYmGtData = ymGtData;
    if (!currentYmGtData && mmGtData) {
      console.log('⚠️ YMGT data missing, generating from MMGT data and current form values');
      currentYmGtData = generateYmGtDatabaseData(sequence);
    }
    
    if (!currentYmGtData) {
      console.error('❌ Cannot generate YMGT stok kartı data - both ymGtData and mmGtData are missing');
      return [];
    }
    
    const cap = parseFloat(currentYmGtData.cap);
    // Generate correct stock code using the passed sequence
    const capFormatted = Math.round(cap * 100).toString().padStart(4, '0');
    const stokKodu = `YM.GT.${currentYmGtData.kod_2}.${capFormatted}.${sequence}`;
    
    // Use YM GT tolerance data - values are already signed in database
    const toleransPlus = parseFloat(currentYmGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(currentYmGtData.tolerans_minus) || 0;
    // Values are already signed, use them directly
    let adjustedPlus = toleransPlus;
    let adjustedMinus = toleransMinus;

    // Apply mathematical correction if needed (same logic as getAdjustedToleranceValues)
    if (adjustedPlus < adjustedMinus) {
      // Swap values if mathematically incorrect
      const temp = adjustedPlus;
      adjustedPlus = adjustedMinus;
      adjustedMinus = temp;
      console.log('YM GT: Mathematical correction applied - tolerance values swapped');
    }
    
    const adjustedPlusFormatted = adjustedPlus.toString();
    const adjustedMinusFormatted = adjustedMinus.toString();
    
    return [
      stokKodu, // Stok Kodu - sequence eşleştirme!
      generateYmGtStokAdiForExcel(sequence), // Stok Adı - ALWAYS regenerate with adjusted tolerance values!
      'YM', // Grup Kodu
      'GT', // Kod-1
      mmGtData.kod_2, // Kod-2 - Use mmGtData to get correct value (NIT, PAD, etc.)
      generateYmGtCariadiKodu(), // Cari/Satıcı Kodu - ALWAYS regenerate with adjusted tolerance values!
      'Y', // Türü
      stokKodu, // Mamul Grup
      generateYmGtInglizceIsim(), // İngilizce İsim - ALWAYS regenerate with adjusted tolerance values!
      '', // Satıcı İsmi
      '83', // Muh. Detay
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
      cap.toFixed(2).replace('.', ','), // Çap (VIRGÜL for Excel)
      currentYmGtData.kaplama || '0', // Kaplama
      currentYmGtData.min_mukavemet || '0', // Min Mukavemet
      currentYmGtData.max_mukavemet || '0', // Max Mukavemet
      currentYmGtData.kg || '0', // KG
      currentYmGtData.ic_cap || '45', // İç Çap
      currentYmGtData.dis_cap || '75', // Dış Çap
      '', // Çap2
      currentYmGtData.shrink || '', // Shrink
      formatDecimalForExcel(adjustedPlus), // Tolerans(+) - adjusted value with sign
      formatDecimalForExcel(adjustedMinus), // Tolerans(-) - adjusted value with sign
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
      '', // Alış Döviz Tipi
      '', // Gümrük Tarife Kodu
      '', // Dağıtıcı Kodu
      '', // Menşei
      getYmGtToleransAciklama(currentYmGtData) // Tolerans Açıklama - YM GT specific with math correction
    ];
  };

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

  const generateMmGtReceteRow = (bilesenKodu, miktar, siraNo, sequence = '00') => {
    const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');

    // Map bilesen code to new standardized code
    const mappedBilesenKodu = mapBilesenKoduForExcel(bilesenKodu);

    // Determine if this is an Operation row
    const isOperation = bilesenKodu === 'GTPKT01';

    return [
      `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`, // Mamul Kodu - güncel sequence ile!
      '1', // Reçete Top.
      '0,00040', // Fire Oranı (%) - 5 decimals with comma for MM GT
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

  const generateYmGtReceteRow = (bilesenKodu, miktar, siraNo, sequence = '00') => {
    const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');

    // Fix: Convert "150" to "150 03"
    const fixedBilesenKodu = bilesenKodu === '150' ? '150 03' : bilesenKodu;

    // Map bilesen code to new standardized code
    const mappedBilesenKodu = mapBilesenKoduForExcel(fixedBilesenKodu);

    // Determine if this is an Operation row
    const isOperation = fixedBilesenKodu === 'GLV01';

    return [
      `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`, // Mamul Kodu - güncel sequence ile!
      '1', // Reçete Top.
      '0,00000', // Fire Oranı (%) - 5 decimals with comma for YM GT
      '', // Oto.Reç.
      getOlcuBr(fixedBilesenKodu), // Ölçü Br. - use original code for logic
      siraNo, // Sıra No - incremental as requested
      isOperation ? 'O' : 'B', // According to Excel format, only GLV01 is O (Operasyon), all others are B (Bileşen)
      mappedBilesenKodu, // Bileşen Kodu - use mapped code for Excel
      '1', // Ölçü Br. - Bileşen
      formatDecimalForReceteExcel(miktar), // Miktar - Always apply 5 decimals for all rows
      getReceteAciklama(fixedBilesenKodu), // Açıklama
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
      // MM GT bilesen mappings
      'AMB.APEX CEMBER 38X080': 'SM-AMB-000017',
      'AMB.TOKA.SIGNODE.114P. DKP': 'SM-AMB-000018',
      'SM.7MMHALKA': 'SM-AMB-000023',
      'AMB.ÇEM.KARTON.GAL': 'SM-AMB-000019',
      'AMB.SHRİNK.200*140CM': 'SM-AMB-000027',
      'AMB.SHRİNK.200*160CM': 'SM-AMB-000028',
      'AMB.SHRİNK.200*190CM': 'SM-AMB-000030',
      'SM.DESİ.PAK': 'SM-KMY-000102',
      // YM GT bilesen mappings
      '150 03': 'HM-000001',
      'SM.HİDROLİK.ASİT': 'SM-KMY-000096'
    };

    return bilesenMapping[bilesenKodu] || bilesenKodu;
  };

  // Batch Excel için MM GT recipe row generator
  const generateMmGtReceteRowForBatch = (bilesenKodu, miktar, siraNo, sequence, mmGtStokKodu) => {
    // FIXED: MM GT recipe should use MM GT stok kodu, not YM GT format
    // The mmGtStokKodu is already in correct format (GT.PAD.0087.00)

    // Map bilesen code to new standardized code
    const mappedBilesenKodu = mapBilesenKoduForExcel(bilesenKodu);

    // Determine if this is an Operation row
    const isOperation = bilesenKodu === 'GTPKT01';

    return [
      mmGtStokKodu, // Mamul Kodu - Use MM GT kodu directly (GT.PAD.0087.00)
      '1', // Reçete Top.
      '0,00040', // Fire Oranı (%) - 5 decimals with comma for MM GT
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

  // Batch Excel için YM GT recipe row generator
  const generateYmGtReceteRowForBatch = (bilesenKodu, miktar, siraNo, sequence, ymGtStokKodu) => {
    // Fix: Convert "150" to "150 03"
    const fixedBilesenKodu = bilesenKodu === '150' ? '150 03' : bilesenKodu;

    // Map bilesen code to new standardized code
    const mappedBilesenKodu = mapBilesenKoduForExcel(fixedBilesenKodu);

    // Determine if this is an Operation row
    const isOperation = fixedBilesenKodu === 'GLV01';

    return [
      ymGtStokKodu, // Mamul Kodu - YM GT stok kodu from parameter
      '1', // Reçete Top.
      '0,00000', // Fire Oranı (%) - 5 decimals with comma for YM GT
      '', // Oto.Reç.
      getOlcuBr(fixedBilesenKodu), // Ölçü Br. - use original code for logic
      siraNo, // Sıra No - incremental
      isOperation ? 'O' : 'B', // GLV01 is O (Operasyon), others are B (Bileşen)
      mappedBilesenKodu, // Bileşen Kodu - use mapped code for Excel
      '1', // Ölçü Br. - Bileşen
      formatDecimalForReceteExcel(miktar), // Miktar - Always apply 5 decimals for all rows
      getReceteAciklama(fixedBilesenKodu), // Açıklama
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
    const cap = parseFloat(mmGtData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== ''
      ? `/${mmGtData.cast_kont}`
      : '';

    // Format with proper signs (negative sign automatic from toFixed, add + for positive)
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2);
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2);
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base stok adı
    let stokAdi = `Galvanizli Tel ${cap.toFixed(2)} mm ${toleranceText} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
    
    // Paketleme suffixes ekle
    const suffixes = [];
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.sepetli) suffixes.push('Spt');
    
    if (suffixes.length > 0) {
      stokAdi += '-' + suffixes.join('-');
    }
    
    // Use point for database storage - NO comma replacement for database
    return stokAdi;
  };

  // Excel version - uses COMMA format  
  const generateStokAdiForExcel = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== ''
      ? `/${mmGtData.cast_kont}`
      : '';

    // Format with proper signs and comma for Excel
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2).replace('.', ',');
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2).replace('.', ',');
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base stok adı
    let stokAdi = `Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm ${toleranceText} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
    
    // Paketleme suffixes ekle
    const suffixes = [];
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.sepetli) suffixes.push('Spt');
    
    if (suffixes.length > 0) {
      stokAdi += '-' + suffixes.join('-');
    }
    
    // Use comma for Excel display
    return stokAdi;
  };

  // Database version for YM GT - uses POINT format
  const generateYmGtStokAdi = (sequence = '00') => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== ''
      ? `/${mmGtData.cast_kont}`
      : '';

    // Format with proper signs (negative sign automatic from toFixed, add + for positive)
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2);
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2);
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base stok adı
    let stokAdi = `YM Galvanizli Tel ${cap.toFixed(2)} mm ${toleranceText} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
    
    // Paketleme suffixes ekle
    const suffixes = [];
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.sepetli) suffixes.push('Spt');
    
    if (suffixes.length > 0) {
      stokAdi += '-' + suffixes.join('-');
    }
    
    // Use point for database storage
    return stokAdi;
  };

  // Excel version for YM GT - uses COMMA format
  const generateYmGtStokAdiForExcel = (sequence = '00') => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== ''
      ? `/${mmGtData.cast_kont}`
      : '';

    // Format with proper signs and comma for Excel
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2).replace('.', ',');
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2).replace('.', ',');
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base stok adı
    let stokAdi = `YM Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm ${toleranceText} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
    
    // Paketleme suffixes ekle
    const suffixes = [];
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.sepetli) suffixes.push('Spt');
    
    if (suffixes.length > 0) {
      stokAdi += '-' + suffixes.join('-');
    }
    
    // Use comma for Excel display
    return stokAdi;
  };

  const generateYmGtCariadiKodu = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Format with proper signs and comma for Excel
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2).replace('.', ',');
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2).replace('.', ',');
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base cari/satıcı kodu
    let carriKodu = `Tel ${cap.toFixed(2).replace('.', ',')} mm ${toleranceText} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'} kg`;
    
    // Paketleme suffixes ekle
    const suffixes = [];
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.sepetli) suffixes.push('Spt');
    
    if (suffixes.length > 0) {
      carriKodu += '-' + suffixes.join('-');
    }
    
    return carriKodu;
  };

  const generateYmGtInglizceIsim = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== ''
      ? `/${mmGtData.cast_kont}`
      : '';

    // Format with proper signs and comma for Excel
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2).replace('.', ',');
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2).replace('.', ',');
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base ingilizce isim
    let ingilizceIsim = `Galvanized Steel Wire ${cap.toFixed(2).replace('.', ',')} mm ${toleranceText} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
    
    // Paketleme suffixes ekle
    const suffixes = [];
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.sepetli) suffixes.push('Spt');
    
    if (suffixes.length > 0) {
      ingilizceIsim += '-' + suffixes.join('-');
    }
    
    return ingilizceIsim;
  };

  // Database version - uses POINT format
  const generateEnglishName = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== ''
      ? `/${mmGtData.cast_kont}`
      : '';

    // Format with proper signs (negative sign automatic from toFixed, add + for positive)
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2);
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2);
    const toleranceText = `${formattedMinus}/${formattedPlus}`;

    // Base english name
    let englishName = `Galvanized Steel Wire ${cap.toFixed(2)} mm ${toleranceText} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
    
    // Paketleme suffixes ekle
    const suffixes = [];
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.sepetli) suffixes.push('Spt');
    
    if (suffixes.length > 0) {
      englishName += '-' + suffixes.join('-');
    }
    
    // Use points for database storage
    return englishName;
  };

  // Excel version - uses COMMA format
  const generateEnglishNameForExcel = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const { adjustedPlus, adjustedMinus } = getAdjustedToleranceValues();

    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== ''
      ? `/${mmGtData.cast_kont}`
      : '';

    // Format with proper signs and comma for Excel
    const formattedMinus = (adjustedMinus >= 0 ? '+' : '') + adjustedMinus.toFixed(2).replace('.', ',');
    const formattedPlus = (adjustedPlus >= 0 ? '+' : '') + adjustedPlus.toFixed(2).replace('.', ',');
    const toleranceText = `${formattedMinus}/${formattedPlus}`;
    
    // Base english name
    let englishName = `Galvanized Steel Wire ${cap.toFixed(2).replace('.', ',')} mm ${toleranceText} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
    
    // Paketleme suffixes ekle
    const suffixes = [];
    if (paketlemeSecenekleri.shrink) suffixes.push('Shrink');
    if (paketlemeSecenekleri.paletli) suffixes.push('Plt');
    if (paketlemeSecenekleri.sepetli) suffixes.push('Spt');
    
    if (suffixes.length > 0) {
      englishName += '-' + suffixes.join('-');
    }
    
    // Use comma for Excel display
    return englishName;
  };

  // Talep onaylama
  const handleApproveRequest = async () => {
    if (!selectedRequest || !databaseIds.mmGtIds.length) {
      toast.error('Onaylamak için önce veritabanına kaydedin');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'approved',
          processed_by: user.username,
          processed_at: new Date().toISOString(),
          mm_gt_id: databaseIds.mmGtIds[0] // İlk MM GT ID'yi kullan
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
      
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
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
    const currentShrinkAmount = calculateShrinkAmount(parseFloat(mmGtData.kg) || 0);
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    // Mevcut reçeteleri güncelle
    updateRecipeValue('mmgt', recipeIndex, newShrinkCode, currentShrinkAmount);
    
    // Eski shrink kodlarını temizle (eğer farklıysa)
    const shrinkTypes = ['AMB.SHRİNK.200*140CM', 'AMB.SHRİNK.200*160CM', 'AMB.SHRİNK.200*190CM'];
    shrinkTypes.forEach(shrinkType => {
      if (shrinkType !== newShrinkCode) {
        updateRecipeValue('mmgt', recipeIndex, shrinkType, 0);
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
              Düzenleme Modu - Mevcut ürün: {selectedExistingMmGt?.stok_kodu || 'Bilinmiyor'}
            </p>
          </div>
        </div>
      )}
      
      {/* Ana Başlık ve Butonlar */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <div className={`w-8 h-8 ${isViewingExistingProduct ? 'bg-yellow-600' : 'bg-red-600'} rounded-lg flex items-center justify-center`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Galvanizli Tel Netsis Entegrasyonu {isViewingExistingProduct && '(Düzenleme)'}
        </h1>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 bg-gray-800 text-white rounded-md text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Hesaplama Değerleri
          </button>
          <button
            onClick={() => setShowCoilerReceteModal(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Coiler Reçete
          </button>
          <button
            onClick={() => setShowYmStReceteModal(true)}
            className="px-3 py-2 bg-green-600 text-white rounded-md text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            YM ST Reçete
          </button>
          <button
            onClick={() => setShowExistingMmGtModal(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Veritabanı
          </button>
          <button
            onClick={() => {
              setShowRequestsModal(true);
              fetchRequests(); // Auto-refresh when opening modal
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg relative flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Talepler
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
          
        </div>
      </div>

      {/* Ana İçerik */}
      {currentStep === 'input' && (
        <div className={`${isViewingExistingProduct ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-white'} rounded-xl shadow-lg p-8`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              {isViewingExistingProduct ? 'MM GT Ürün Düzenleme' : 'MM GT Ürün Bilgileri'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span>Zorunlu Alanlar</span>
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
                value={normalizeDecimalDisplay(mmGtData.cap)}
                onChange={(e) => handleInputChange('cap', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="0.00000"
                lang="en-US" // Force EN-US locale with point decimal separator
                onKeyDown={(e) => handleCommaToPoint(e, 'cap')}
              />
              <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 0.8 - 8.1 mm</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Kaplama Türü <span className="text-red-500">*</span>
              </label>
              <select
                value={mmGtData.kod_2}
                onChange={(e) => handleInputChange('kod_2', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value="NIT">NIT</option>
                <option value="PAD">PAD</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Kaplama (gr/m²) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.kaplama)}
                onChange={(e) => handleInputChange('kaplama', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder={mmGtData.kod_2 === 'PAD' ? '50-80' : '100-400'}
                onKeyDown={(e) => handleCommaToPoint(e, 'kaplama')}
              />
              {mmGtData.kod_2 === 'PAD' ? (
                <p className="text-xs text-gray-500 mt-1">PAD kaplama için izin verilen aralık: 50 - 80 g/m²</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">NIT kaplama için izin verilen aralık: 100 - 400 g/m²</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Min Mukavemet (MPa) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.min_mukavemet)}
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
                value={normalizeDecimalDisplay(mmGtData.max_mukavemet)}
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
                value={normalizeDecimalDisplay(mmGtData.kg)}
                onChange={(e) => handleInputChange('kg', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="250-20000"
                onKeyDown={(e) => handleCommaToPoint(e, 'kg')}
              />
              <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 250 - 20000 kg</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                İç Çap (cm)
              </label>
              <select
                value={mmGtData.ic_cap}
                onChange={(e) => handleInputChange('ic_cap', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value={45}>45</option>
                <option value={50}>50</option>
                <option value={55}>55</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Dış Çap (cm)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.dis_cap || '')}
                onChange={(e) => handleInputChange('dis_cap', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all bg-gray-50"
                readOnly
              />
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
                  value={normalizeDecimalDisplay(mmGtData.tolerans_plus || '')}
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
                  value={normalizeDecimalDisplay(mmGtData.tolerans_minus || '')}
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
                {/* Shrink - Checkbox olarak */}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paketlemeSecenekleri.shrink}
                    onChange={(e) => {
                      setPaketlemeSecenekleri(prev => ({
                        ...prev,
                        shrink: e.target.checked
                      }));
                      handleInputChange('shrink', e.target.checked ? 'evet' : 'hayır');
                    }}
                    className="w-4 h-4 text-red-600 focus:ring-red-500 rounded"
                  />
                  <span className="text-sm">Shrink</span>
                </label>
                
                {/* Paletli ve Sepetli - Radio buttons (mutually exclusive) */}
                <div className="pl-6 space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paletSepet"
                      checked={paketlemeSecenekleri.paletli}
                      onChange={() => {
                        setPaketlemeSecenekleri(prev => ({
                          ...prev,
                          paletli: true,
                          sepetli: false
                        }));
                      }}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm">Paletli</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paletSepet"
                      checked={paketlemeSecenekleri.sepetli}
                      onChange={() => {
                        setPaketlemeSecenekleri(prev => ({
                          ...prev,
                          paletli: false,
                          sepetli: true
                        }));
                      }}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm">Sepetli</span>
                  </label>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paletSepet"
                      checked={!paketlemeSecenekleri.paletli && !paketlemeSecenekleri.sepetli}
                      onChange={() => {
                        setPaketlemeSecenekleri(prev => ({
                          ...prev,
                          paletli: false,
                          sepetli: false
                        }));
                      }}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm">Hiçbiri</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Unwinding
              </label>
              <select
                value={mmGtData.unwinding}
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
                value={mmGtData.cast_kont}
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
                value={mmGtData.helix_kont}
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
                value={mmGtData.elongation}
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
                {selectedExistingMmGt && (
                  <div className="bg-purple-50 px-4 py-2 rounded-lg">
                    <span className="text-purple-700 font-medium">Mevcut MM GT Seçildi</span>
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

          {/* MM GT Özet */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold">MM</span>
              </div>
              MM GT Ürün Özeti
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Stok Kodu', value: `GT.${mmGtData.kod_2}.${Math.round(parseFloat(mmGtData.cap || 0) * 100).toString().padStart(4, '0')}.${processSequence}` },
                { label: 'Çap', value: `${mmGtData.cap || '0'} mm` },
                { label: 'Kaplama Türü', value: mmGtData.kod_2 },
                { label: 'Kaplama', value: `${mmGtData.kaplama || '0'} gr/m²` },
                { label: 'Mukavemet', value: `${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa` },
                { label: 'Ağırlık', value: `${mmGtData.kg || '0'} kg` }
              ].map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-sm text-gray-500 block">{item.label}:</span>
                  <p className="font-semibold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* YM GT Özet */}
          {ymGtData && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">YM</span>
                </div>
                YM GT Ürün Özeti
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-sm text-gray-500 block">Stok Kodu:</span>
                  <p className="font-semibold text-gray-800">{ymGtData.stok_kodu}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-sm text-gray-500 block">Stok Adı:</span>
                  <p className="font-semibold text-gray-800">{ymGtData.stok_adi}</p>
                </div>
              </div>
            </div>
          )}

          {/* YM ST Yönetimi - Geliştirilmiş UI */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Diameter-based info banner */}
            {calculatedYmStDiameter !== null && (
              <div className={`mb-4 p-4 rounded-lg border-l-4 ${
                calculatedYmStDiameter < 1.5
                  ? 'bg-blue-50 border-blue-500'
                  : calculatedYmStDiameter >= 1.5 && calculatedYmStDiameter < 1.8
                  ? 'bg-purple-50 border-purple-500'
                  : 'bg-green-50 border-green-500'
              }`}>
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-800">
                      Hesaplanan YM ST Çapı: {calculatedYmStDiameter.toFixed(2)} mm
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {calculatedYmStDiameter < 1.5 && (
                        <>
                          <span className="font-semibold text-blue-700">Çap &lt; 1.5mm:</span> Sadece YM ST hammadde kullanılır (COTLC01 operasyonu)
                        </>
                      )}
                      {calculatedYmStDiameter >= 1.5 && calculatedYmStDiameter < 1.8 && (
                        <>
                          <span className="font-semibold text-purple-700">1.5mm ≤ Çap &lt; 1.8mm:</span> Hem filmaşin (Ana) hem YM ST (ALT) alternatifleri oluşturulabilir
                        </>
                      )}
                      {calculatedYmStDiameter >= 1.8 && (
                        <>
                          <span className="font-semibold text-green-700">Çap ≥ 1.8mm:</span> Filmaşin hammadde kullanılır (matris bazlı alternatifler)
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">ST</span>
                </div>
                YM ST Seçimi ve Yönetimi
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setShowYmStSelectionModal(true);
                    // Load all YM STs for selection with auto-suggested ones on top
                    try {
                      const response = await fetchWithAuth(`${API_URLS.galYmSt}?limit=1000`);
                      if (response && response.ok) {
                        const allYmSts = await response.json();
                        if (Array.isArray(allYmSts)) {
                          // Get suggested YM STs using the same logic as Otomatik Oluştur
                          const cap = parseFloat(mmGtData.cap) || 0;
                          const suggestedYmSts = [];
                          const otherYmSts = [];
                          
                          allYmSts.forEach(ymSt => {
                            const ymStCap = parseFloat(ymSt.cap) || 0;
                            const capDifference = Math.abs(ymStCap - cap);
                            // Use same suggestion logic as Otomatik Oluştur
                            if (capDifference <= 0.5) {
                              suggestedYmSts.push(ymSt);
                            } else {
                              otherYmSts.push(ymSt);
                            }
                          });
                          
                          // Sort suggested ones by closest cap match
                          suggestedYmSts.sort((a, b) => {
                            const aDiff = Math.abs(parseFloat(a.cap || 0) - cap);
                            const bDiff = Math.abs(parseFloat(b.cap || 0) - cap);
                            return aDiff - bDiff;
                          });
                          
                          // Combine: suggested ones first, then others
                          setAllYmStsForSelection([...suggestedYmSts, ...otherYmSts]);
                        }
                      }
                    } catch (error) {
                      console.error('YM ST verileri yüklenemedi:', error);
                      toast.error('YM ST verileri yüklenemedi');
                    }
                  }}
                  disabled={isLoading || isLoadingRecipes}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Kayıtlılardan Seç
                </button>
                <button
                  onClick={generateAutoYmSts}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Otomatik Oluştur
                </button>
                <button
                  onClick={() => setShowManuelOlusturModal(true)}
                  disabled={!calculatedYmStDiameter}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Manuel Oluştur
                </button>
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
                              <label htmlFor={`main-ymst-${index}`} className="font-semibold text-gray-800 text-sm">
                                {isMain && (
                                  <span className="text-blue-700 font-bold mr-1">Ana YM ST - </span>
                                )}
                                {ymSt.stok_kodu || ''}
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
                              <label htmlFor={`main-ymst-auto-${index}`} className="font-semibold text-gray-800 text-sm">
                                {isMain && (
                                  <span className="text-blue-700 font-bold mr-1">Ana YM ST - </span>
                                )}
                                {ymSt.stok_kodu || ''}
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

          {/* Reçete Bölümü - Kategorize Görüntüleme */}
          {(selectedYmSts.length > 0 || autoGeneratedYmSts.length > 0) && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold">R</span>
                  </div>
                  Reçete Değerleri
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Fill empty fields with auto-fill indicators
                      fillEmptyFieldsWithAutoFill();
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                    Otomatik Doldur
                  </button>
                </div>
              </div>

              {/* YM ST Sekmeleri */}
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
                      {parseFloat(ymSt.cap || 0)} mm
                    </span>
                  </button>
                ))}
              </div>

              {/* Reçete İçeriklerini Kategorize Göster */}
              {activeRecipeTab !== null && (
                <div className="space-y-6">
                  {/* MM GT Reçete */}
                  <div className="p-6 bg-red-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4 text-red-700">
                      MM GT #{activeRecipeTab + 1} Reçetesi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* 8 alan için özel düzenleme - Shrink alanı dropdown ile */}
                      {[
                        { key: `YM.GT.${mmGtData.kod_2}.${Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0')}.${activeRecipeTab.toString().padStart(2, '0')}`, type: 'readonly' }, // YM GT bileşeni - sequence eşleştirme
                        { key: 'GTPKT01', type: 'input' },
                        { key: 'AMB.ÇEM.KARTON.GAL', type: 'input' },
                        { key: 'SM.7MMHALKA', type: 'input' },
                        { key: 'AMB.TOKA.SIGNODE.114P. DKP', type: 'input' },
                        { key: 'shrink', type: 'dropdown' }, // Özel shrink dropdown
                        { key: 'AMB.APEX CEMBER 38X080', type: 'input' },
                        { key: 'SM.DESİ.PAK', type: 'input' }
                      ].map(({ key, type }, idx) => {
                        const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
                        let currentValue = '';
                        
                        if (type === 'readonly') {
                          currentValue = key;
                        } else if (key === 'shrink') {
                          // Mevcut shrink tipini bul
                          const shrinkKeys = ['AMB.SHRİNK.200*140CM', 'AMB.SHRİNK.200*160CM', 'AMB.SHRİNK.200*190CM'];
                          const currentShrinkKey = shrinkKeys.find(sk => allRecipes.mmGtRecipes[activeRecipeTab]?.[sk] > 0);
                          currentValue = currentShrinkKey || '';
                        } else {
                          currentValue = allRecipes.mmGtRecipes[activeRecipeTab]?.[key] || '';
                        }
                        
                        const friendlyName = type === 'readonly' ? 'YM GT Bileşeni' : friendlyNames[key] || key;
                        const statusText = type === 'readonly' ? 'Otomatik oluşturuldu' : getRecipeStatusText('mmgt', activeRecipeTab, key);
                        // Force 'readonly' type to use KG as the unit
                        
                        return (
                          <div key={key} className="space-y-2">
                            {type !== 'dropdown' && (
                              <label className="block text-sm font-medium text-gray-700">
                                {friendlyName}
                                <span className="text-xs text-gray-500 ml-2">
                                  ({getOlcuBr(key)})
                                </span>
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
                                    value={activeTabDropdownValues.shrinkType}
                                    onChange={(e) => handleShrinkChange(activeRecipeTab, e.target.value)}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                      currentValue && recipeStatus.mmGtRecipes[activeRecipeTab]?.[currentValue] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                    disabled={currentValue && recipeStatus.mmGtRecipes[activeRecipeTab]?.[currentValue] === 'database'}
                                  >
                                    <option value="">Shrink Tipi Seçin</option>
                                    <option value="AMB.SHRİNK.200*140CM">AMB.SHRİNK.200*140CM</option>
                                    <option value="AMB.SHRİNK.200*160CM">AMB.SHRİNK.200*160CM</option>
                                    <option value="AMB.SHRİNK.200*190CM">AMB.SHRİNK.200*190CM</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Shrink Tüketimi (KG)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={currentValue ? normalizeDecimalDisplay(allRecipes.mmGtRecipes[activeRecipeTab]?.[currentValue] || 0) : ''}
                                    onChange={(e) => currentValue && updateRecipeValue('mmgt', activeRecipeTab, currentValue, e.target.value)}
                                    placeholder="Shrink Miktarı"
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                      currentValue && recipeStatus.mmGtRecipes[activeRecipeTab]?.[currentValue] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                    disabled={!currentValue || (currentValue && recipeStatus.mmGtRecipes[activeRecipeTab]?.[currentValue] === 'database')}
                                    onKeyDown={(e) => currentValue && handleRecipeCommaToPoint(e, 'mmgt', activeRecipeTab, currentValue)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={normalizeDecimalDisplay(currentValue || '')}
                                onChange={(e) => updateRecipeValue('mmgt', activeRecipeTab, key, e.target.value)}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                  recipeStatus.mmGtRecipes[activeRecipeTab]?.[key] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                }`}
                                onKeyDown={(e) => handleRecipeCommaToPoint(e, 'mmgt', activeRecipeTab, key)}
                                disabled={recipeStatus.mmGtRecipes[activeRecipeTab]?.[key] === 'database'}
                              />
                            )}
                            <div className="h-4">
                              {statusText && (
                                <p className="text-xs text-gray-500 italic">{statusText}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* YM GT Reçete */}
                  <div className="p-6 bg-yellow-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4 text-yellow-700">
                      YM GT Reçetesi
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      YM ST bağlantısı otomatik olarak yapılır. Sadece aşağıdaki 3 değeri düzenleyebilirsiniz:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 3 alan için özel düzenleme - YM ST bileşeni readonly */}
                      {[
                        { key: [...selectedYmSts, ...autoGeneratedYmSts][activeRecipeTab]?.stok_kodu || 'YM.ST.PLACEHOLDER', type: 'readonly' }, // YM ST bileşeni otomatik
                        { key: 'GLV01', type: 'input' },
                        { key: '150 03', type: 'input' },
                        { key: 'SM.HİDROLİK.ASİT', type: 'input' }
                      ].map(({ key, type }, idx) => {
                        if (idx === 0) {
                          // İlk alan YM ST bileşeni - sadece gösterim için
                          return (
                            <div key={key} className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                YM ST Bileşeni (Otomatik)
                              </label>
                              <input
                                type="text"
                                value={key || ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                                readOnly
                              />
                              <p className="text-xs text-gray-500 italic">
                                Otomatik belirlendi
                              </p>
                            </div>
                          );
                        }
                        
                        const friendlyName = friendlyNames[key] || key;
                        // YM GT recipe is shared across all YM STs since it's the final product recipe
                        const isMainYmSt = activeRecipeTab === mainYmStIndex;
                        const currentValue = allRecipes.ymGtRecipe?.[key] || '';
                        const statusText = getRecipeStatusText('ymgt', null, key);
                        
                        return (
                          <div key={key} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {friendlyName}
                              <span className="text-xs text-gray-500 ml-2">
                                ({getOlcuBr(key)})
                              </span>
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={normalizeDecimalDisplay(currentValue || '')}
                              onChange={(e) => updateRecipeValue('ymgt', null, key, e.target.value)}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                                recipeStatus.ymGtRecipe?.[key] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                              onKeyDown={(e) => handleRecipeCommaToPoint(e, 'ymgt', null, key)}
                              disabled={recipeStatus.ymGtRecipe?.[key] === 'database'}
                              placeholder={!isMainYmSt ? 'Boş - Otomatik Doldur ile doldurabilirsiniz' : ''}
                            />
                            <div className="h-4">
                              {statusText && (
                                <p className="text-xs text-gray-500 italic">{statusText}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* YM ST Reçete */}
                  <div className="p-6 bg-green-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4 text-green-700">
                      YM ST #{activeRecipeTab + 1} Reçetesi
                    </h3>
                    {(() => {
                      // Get active YM ST diameter to determine which fields to show
                      const activeYmSt = [...selectedYmSts, ...autoGeneratedYmSts][activeRecipeTab];
                      const activeYmStDiameter = parseFloat(activeYmSt?.cap || 0);

                      // Show appropriate message based on diameter
                      const infoMessage = activeYmStDiameter >= 1.5
                        ? 'Filmaşin-based reçete (otomatik oluşturuldu):'
                        : 'Coiler yöntemi reçetesi (otomatik oluşturuldu):';

                      return (
                        <>
                          <p className="text-sm text-gray-600 mb-3">
                            {infoMessage}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Show all recipe fields uniformly */}
                            {Object.keys(allRecipes.ymStRecipes[activeRecipeTab] || {}).map((key) => {
                              const friendlyName = friendlyNames[key] || key;
                              const currentValue = allRecipes.ymStRecipes[activeRecipeTab]?.[key] || '';
                              const statusText = getRecipeStatusText('ymst', activeRecipeTab, key);

                              return (
                                <div key={key} className="space-y-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    {friendlyName}
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({getOlcuBr(key)})
                                    </span>
                                  </label>
                                  <div className="mt-2">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={normalizeDecimalDisplay(currentValue || '')}
                                      onChange={(e) => updateRecipeValue('ymst', activeRecipeTab, key, e.target.value)}
                                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                        recipeStatus.ymStRecipes[activeRecipeTab]?.[key] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                      }`}
                                      onKeyDown={(e) => handleRecipeCommaToPoint(e, 'ymst', activeRecipeTab, key)}
                                      disabled={recipeStatus.ymStRecipes[activeRecipeTab]?.[key] === 'database'}
                                    />
                                  </div>
                                  <div className="h-4">
                                    {statusText && (
                                      <p className="text-xs text-gray-500 italic">{statusText}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
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
                      setDatabaseIds({ mmGtIds: [], ymGtId: null, ymStIds: [] });
                      setSessionSavedProducts({ mmGtIds: [], ymGtId: null, ymStIds: [] });
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
                    setDatabaseIds({ mmGtIds: [], ymGtId: null, ymStIds: [] });
                    setSessionSavedProducts({ mmGtIds: [], ymGtId: null, ymStIds: [] });
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
                          mmGt: mmGtData,
                          ymGts: [ymGtData],
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
                    
                    // Get product name for task display
                    const productName = `${mmGtData.kod_2} ${mmGtData.cap}mm`;
                    const taskName = `${productName}`;
                    const taskId = Date.now().toString();
                    
                    // ✅ CRITICAL FIX: Capture request ID when task is created, not when it runs
                    const currentRequestId = selectedRequest?.id;
                    console.log(`📝 Capturing request ID for queue task: ${currentRequestId}`);

                    // 🔒 STATE SNAPSHOT: Capture ALL state at task creation to prevent mixing
                    console.log(`📸 Creating state snapshot for task: ${productName}`);
                    const stateSnapshot = {
                      mmGtData: JSON.parse(JSON.stringify(mmGtData)),
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
                      kod_2: stateSnapshot.mmGtData.kod_2,
                      cap: stateSnapshot.mmGtData.cap,
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
                        kod_2: stateSnapshot.mmGtData.kod_2,
                        cap: stateSnapshot.mmGtData.cap,
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
                        const capFormatted = Math.round(parseFloat(stateSnapshot.mmGtData.cap) * 100).toString().padStart(4, '0');
                        const baseCode = `GT.${stateSnapshot.mmGtData.kod_2}.${capFormatted}`;
                        
                        // Add task ID to sequence generation for atomic operation
                        const taskId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        console.log(`🔒 [${taskId}] Starting atomic sequence generation for ${baseCode}`);
                        
                        let sequence = '00';
                        let attempts = 0;
                        const maxAttempts = 5;
                        
                        while (attempts < maxAttempts) {
                          attempts++;
                          console.log(`🔄 [${taskId}] Sequence generation attempt ${attempts}/${maxAttempts}`);
                          
                          const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
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
                          const checkResponse = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu=${potentialStokKodu}`);
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
                        const capFormatted = Math.round(parseFloat(stateSnapshot.mmGtData.cap) * 100).toString().padStart(4, '0');
                        const actualStokKodu = `GT.${stateSnapshot.mmGtData.kod_2}.${capFormatted}.${actualSequence}`;
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
                          const updateResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${stateSnapshot.currentRequestId}`, {
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
                            const capFormatted = Math.round(parseFloat(stateSnapshot.mmGtData.cap) * 100).toString().padStart(4, '0');
                            const finalStokKodu = `GT.${stateSnapshot.mmGtData.kod_2}.${capFormatted}.${actualSequence}`;

                            // Get signed tolerance values for Excel generation from snapshot
                            const adjustedPlus = stateSnapshot.toleransMaxSign === '+' ? stateSnapshot.mmGtData.tolerans_plus : `-${stateSnapshot.mmGtData.tolerans_plus}`;
                            const adjustedMinus = stateSnapshot.toleransMinSign === '-' ? `-${stateSnapshot.mmGtData.tolerans_minus}` : stateSnapshot.mmGtData.tolerans_minus;

                            const excelData = {
                              stok_kodu: finalStokKodu,
                              kod_2: stateSnapshot.mmGtData.kod_2,
                              cap: stateSnapshot.mmGtData.cap,
                              sequence: actualSequence,
                              mmGtData: { ...stateSnapshot.mmGtData, stok_kodu: finalStokKodu, tolerans_plus: adjustedPlus, tolerans_minus: adjustedMinus },
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
                        const capFormatted = Math.round(parseFloat(stateSnapshot.mmGtData.cap) * 100).toString().padStart(4, '0');
                        const finalStokKodu = `GT.${stateSnapshot.mmGtData.kod_2}.${capFormatted}.${actualSequence}`;

                        // Get signed tolerance values for Excel generation from snapshot
                        const adjustedPlus = stateSnapshot.toleransMaxSign === '+' ? stateSnapshot.mmGtData.tolerans_plus : `-${stateSnapshot.mmGtData.tolerans_plus}`;
                        const adjustedMinus = stateSnapshot.toleransMinSign === '-' ? `-${stateSnapshot.mmGtData.tolerans_minus}` : stateSnapshot.mmGtData.tolerans_minus;

                        const excelData = {
                          stok_kodu: finalStokKodu,
                          kod_2: stateSnapshot.mmGtData.kod_2,
                          cap: stateSnapshot.mmGtData.cap,
                          sequence: actualSequence,
                          mmGtData: { ...stateSnapshot.mmGtData, stok_kodu: finalStokKodu, tolerans_plus: adjustedPlus, tolerans_minus: adjustedMinus },
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

      {/* Kullanici Girdi Degerleri icin Ayarlar Modali */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Hesaplama Değerleri
                </h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <p className="text-sm text-gray-600 mb-4">
                  Bu değerler hesaplamalarda kullanılacak olan sabit değerlerdir. Değişiklik yaptıktan sonra "Kaydet" düğmesine basarak kaydedin.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Ash (Kül) (Kg/tonne)
                    </label>
                    <input
                      type="text"
                      value={userInputValues.ash}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        ash: e.target.value.replace(/,/g, '.') // Replace commas with points
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        ash: parseFloat(e.target.value.replace(/,/g, '.')) || prev.ash // Convert to number on blur
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Lapa (Kg/tonne)
                    </label>
                    <input
                      type="text"
                      value={userInputValues.lapa}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        lapa: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        lapa: parseFloat(e.target.value.replace(/,/g, '.')) || prev.lapa
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Üretim Kapasitesi (Aylık)
                    </label>
                    <input
                      type="text"
                      value={userInputValues.uretim_kapasitesi_aylik}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        uretim_kapasitesi_aylik: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        uretim_kapasitesi_aylik: parseFloat(e.target.value.replace(/,/g, '.')) || prev.uretim_kapasitesi_aylik
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Toplam Tüketilen Asit
                    </label>
                    <input
                      type="text"
                      value={userInputValues.toplam_tuketilen_asit}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        toplam_tuketilen_asit: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        toplam_tuketilen_asit: parseFloat(e.target.value.replace(/,/g, '.')) || prev.toplam_tuketilen_asit
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Ortalama Üretim Çapı
                    </label>
                    <input
                      type="text"
                      value={userInputValues.ortalama_uretim_capi}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        ortalama_uretim_capi: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        ortalama_uretim_capi: parseFloat(e.target.value.replace(/,/g, '.')) || prev.ortalama_uretim_capi
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Paketleme Dk. Adet
                    </label>
                    <input
                      type="text"
                      value={userInputValues.paketlemeDkAdet}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        paketlemeDkAdet: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        paketlemeDkAdet: parseFloat(e.target.value.replace(/,/g, '.')) || prev.paketlemeDkAdet
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={saveUserInputValues}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coiler Recete Modalı */}
      {showCoilerReceteModal && (
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
                  Galvanizli Tel Talepleri
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
                      placeholder="Çap, kaplama, açıklama vb."
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
                      <option value="kod_2">Kaplama Türü</option>
                      <option value="kaplama">Kaplama Miktarı</option>
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
                          Kaplama
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
                            {request.cap || 0}mm
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                              request.kod_2 === 'NIT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {request.kod_2 || ''}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {request.kaplama || '0'}g/m²
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {request.min_mukavemet || '0'}-{request.max_mukavemet || '0'}MPa
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {request.kg || '0'}kg
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
                    <p className="text-base text-gray-900">{selectedRequest.cap} mm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Kaplama</p>
                    <p className="text-base text-gray-900">{selectedRequest.kod_2} {selectedRequest.kaplama} g/m²</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mukavemet</p>
                    <p className="text-base text-gray-900">{selectedRequest.min_mukavemet} - {selectedRequest.max_mukavemet} MPa</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ağırlık</p>
                    <p className="text-base text-gray-900">{selectedRequest.kg} kg</p>
                  </div>
                </div>
                
                {/* Sağ sütun */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">İç Çap</p>
                    <p className="text-base text-gray-900">{selectedRequest.ic_cap} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dış Çap</p>
                    <p className="text-base text-gray-900">{selectedRequest.dis_cap} cm</p>
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
                          if (selectedRequest.stok_adi.includes('-Spt')) packaging.push('Sepetli');
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
                            const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu=${selectedRequest.stok_kodu}`);
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
                            const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_adi=${encodeURIComponent(selectedRequest.final_stok_adi)}`);
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
                            const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_adi=${encodeURIComponent(selectedRequest.stok_adi)}`);
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
                              
                              const response = await fetchWithAuth(`${API_URLS.galMmGt}?${queryParams.toString()}`);
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
                            await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
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
                    <p className="text-sm font-medium text-gray-500">Kaplama Türü</p>
                    <p className="text-base text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedDatabaseProduct.kod_2 === 'NIT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedDatabaseProduct.kod_2 || 'Belirtilmemiş'}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Kaplama</p>
                    <p className="text-base text-gray-900">{selectedDatabaseProduct.kaplama || '0'} gr/m²</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ağırlık</p>
                    <p className="text-base text-gray-900">{selectedDatabaseProduct.kg || '0'} kg</p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mukavemet</p>
                    <p className="text-base text-gray-900">
                      {selectedDatabaseProduct.min_mukavemet || '0'}-{selectedDatabaseProduct.max_mukavemet || '0'} MPa
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">İç Çap</p>
                    <p className="text-base text-gray-900">{selectedDatabaseProduct.ic_cap || '0'} mm</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dış Çap</p>
                    <p className="text-base text-gray-900">{selectedDatabaseProduct.dis_cap || '0'} mm</p>
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

      {/* Mevcut MM GT / YM ST Modalı */}
      {showExistingMmGtModal && (
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
                    onClick={() => setShowExistingMmGtModal(false)}
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
                  onClick={() => setActiveDbTab('mmgt')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeDbTab === 'mmgt'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  MM GT
                </button>
                <button
                  onClick={() => setActiveDbTab('ymst')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeDbTab === 'ymst'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  YM ST
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
                      placeholder="Stok kodu, çap, kaplama türü..."
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
                  
                  {/* Kaplama Filtresi (sadece MM GT için) */}
                  {activeDbTab === 'mmgt' && (
                    <div className="min-w-[120px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kaplama</label>
                      <select
                        value={dbKaplamaFilter}
                        onChange={(e) => setDbKaplamaFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="all">Tümü</option>
                        <option value="NIT">NIT</option>
                        <option value="PAD">PAD</option>
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
                      <option value="kod_2">{activeDbTab === 'mmgt' ? 'Kaplama Türü' : 'Kalite'}</option>
                      <option value="kaplama">{activeDbTab === 'mmgt' ? 'Kaplama' : 'Filmaşin'}</option>
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
                        setDbKaplamaFilter('all');
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
              
              {/* MM GT Tab İçeriği */}
              {activeDbTab === 'mmgt' && (
                <>
                  {(() => {
                    const filteredMmGts = filterDbProducts(existingMmGts, 'mmgt');
                    
                    if (filteredMmGts.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <p className="text-gray-500 text-lg">
                              {existingMmGts.length === 0 ? 'Mevcut MM GT bulunamadı.' : 'Filtre kriterlerine uygun ürün bulunamadı.'}
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
                              onClick={() => handleDbSort('kod_2')}
                              title="Kaplama türüne göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Kaplama Türü
                                {dbSortField === 'kod_2' && (
                                  <span className="text-purple-600">
                                    {dbSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleDbSort('kaplama')}
                              title="Kaplamaya göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Kaplama
                                {dbSortField === 'kaplama' && (
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
                          {filteredMmGts.map((mmGt) => (
                            <tr key={mmGt.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedDbItems.includes(mmGt.id)}
                                  onChange={() => handleToggleDbSelection(mmGt.id)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {mmGt.stok_kodu || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {parseFloat(mmGt.cap || 0)} mm
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  mmGt.kod_2 === 'NIT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {mmGt.kod_2 || ''}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mmGt.kaplama || '0'} gr/m²
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mmGt.min_mukavemet || '0'}-{mmGt.max_mukavemet || '0'} MPa
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mmGt.kg || '0'} kg
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedDatabaseProduct(mmGt);
                                      setShowDatabaseDetailModal(true);
                                    }}
                                    className="text-purple-600 hover:text-purple-900 transition-colors"
                                  >
                                    Detay
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(mmGt, 'mmgt')}
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
                              onClick={() => handleDbSort('kaplama')}
                              title="Filmaşine göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Filmaşin
                                {dbSortField === 'kaplama' && (
                                  <span className="text-purple-600">
                                    {dbSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                              onClick={() => handleDbSort('kod_2')}
                              title="Kaliteye göre sırala"
                            >
                              <div className="flex items-center gap-1">
                                Kalite
                                {dbSortField === 'kod_2' && (
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
              {((activeDbTab === 'mmgt' && existingMmGts.length > 0) || 
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
                {deleteType === 'mmgt' 
                  ? 'Bu MM GT\'yi ve tüm bağlı verilerini (YM GT\'ler, reçeteler vb.) silmek istediğinizden emin misiniz?'
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
                  onClick={() => deleteType === 'mmgt' ? deleteMmGt(itemToDelete) : deleteYmSt(itemToDelete)}
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
                {activeDbTab === 'mmgt' 
                  ? 'Tüm MM GT ve ilişkili YM GT verilerini ve bunların tüm reçetelerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
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
                      setShowExistingMmGtModal(false);
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

      {/* Manuel Oluştur Modal */}
      {showManuelOlusturModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Manuel YM ST Oluştur
                </h2>
                <button
                  onClick={() => {
                    setShowManuelOlusturModal(false);
                    setManuelFilmasinSelection('');
                    setManuelYmStSelection('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Diameter Info */}
              {calculatedYmStDiameter !== null && (
                <div className={`mb-6 p-4 rounded-lg border-l-4 ${
                  calculatedYmStDiameter < 1.5
                    ? 'bg-blue-50 border-blue-500'
                    : calculatedYmStDiameter >= 1.5 && calculatedYmStDiameter < 1.8
                    ? 'bg-purple-50 border-purple-500'
                    : 'bg-green-50 border-green-500'
                }`}>
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Hesaplanan YM ST Çapı: {calculatedYmStDiameter.toFixed(2)} mm
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {calculatedYmStDiameter < 1.5 && (
                          <>
                            <span className="font-semibold text-blue-700">Çap &lt; 1.5mm:</span> Sadece YM ST seçimi gerekli
                          </>
                        )}
                        {calculatedYmStDiameter >= 1.5 && calculatedYmStDiameter < 1.8 && (
                          <>
                            <span className="font-semibold text-purple-700">1.5mm ≤ Çap &lt; 1.8mm:</span> Hem Filmaşin hem YM ST seçimi gerekli
                          </>
                        )}
                        {calculatedYmStDiameter >= 1.8 && (
                          <>
                            <span className="font-semibold text-green-700">Çap ≥ 1.8mm:</span> Sadece Filmaşin seçimi gerekli
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selection Fields */}
              <div className="space-y-4">
                {/* Filmaşin Selection - Show for >= 1.5mm */}
                {calculatedYmStDiameter !== null && calculatedYmStDiameter >= 1.5 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filmaşin Seçimi
                      {calculatedYmStDiameter < 1.8 && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                      value={manuelFilmasinSelection}
                      onChange={(e) => setManuelFilmasinSelection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- Filmaşin Seçin --</option>
                      {/* Options will be loaded from API - for now placeholder */}
                      <option value="1">FLM.0550.1006 (5.5mm, 1006)</option>
                      <option value="2">FLM.0600.1006 (6.0mm, 1006)</option>
                      <option value="3">FLM.0600.1008 (6.0mm, 1008)</option>
                      <option value="4">FLM.0700.1008 (7.0mm, 1008)</option>
                      <option value="5">FLM.0700.1010 (7.0mm, 1010)</option>
                    </select>
                  </div>
                )}

                {/* YM ST Selection - Show for < 1.8mm */}
                {calculatedYmStDiameter !== null && calculatedYmStDiameter < 1.8 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YM ST Seçimi
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={manuelYmStSelection}
                      onChange={(e) => setManuelYmStSelection(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- YM ST Seçin --</option>
                      {/* Options will be loaded from API - for now placeholder */}
                      <option value="1">YM.ST.0100.ST (1.00mm)</option>
                      <option value="2">YM.ST.0110.ST (1.10mm)</option>
                      <option value="3">YM.ST.0120.ST (1.20mm)</option>
                      <option value="4">YM.ST.0130.ST (1.30mm)</option>
                      <option value="5">YM.ST.0140.ST (1.40mm)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowManuelOlusturModal(false);
                    setManuelFilmasinSelection('');
                    setManuelYmStSelection('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  İptal
                </button>
                <button
                  onClick={handleManuelOlustur}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Oluştur
                </button>
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
                        const cap = parseFloat(mmGtData.cap) || 0;
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
                    setShowExistingMmGtModal(true);
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
                          {selectedExistingMmGt?.stok_kodu || 'Bilinmiyor'}
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
                        const existingStokKodu = selectedExistingMmGt.stok_kodu;
                        const sequencePart = existingStokKodu.split('.').pop(); // Get last part (e.g., "00")
                        const existingSequence = parseInt(sequencePart); // Convert to number
                        
                        console.log('🔄 Updating existing product:', {
                          existingStokKodu,
                          extractedSequence: existingSequence,
                          productId: selectedExistingMmGt.id
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
    </div>
  );
};

export default GalvanizliTelNetsis;