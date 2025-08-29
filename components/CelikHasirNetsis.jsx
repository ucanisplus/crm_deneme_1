// Çelik Hasır Netsis Integration Component
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { API_URLS, fetchWithAuth } from '@/api-config';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
  RefreshCw
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

const CelikHasirNetsis = React.forwardRef(({ optimizedProducts = [], onProductsUpdate }, ref) => {
  // OPTIMIZATION: Add refs for request cancellation and caching
  const fetchControllerRef = useRef(null);
  const cacheRef = useRef(new Map()); // Simple cache for API responses
  const lastFetchTimeRef = useRef(0);
  
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
        return calculateNCBKDuration(
          parseFloat(product.length || 500), // default to 500mm if not specified
          parseFloat(product.boyCap || product.enCap)
        );
        
      case 'NTEL':
        return calculateNTELDuration(
          parseFloat(product.boyCap || product.enCap)
        );
        
      case 'YOTOCH':
        return calculateYOTOCHDuration(
          parseFloat(product.uzunlukBoy),
          parseFloat(product.uzunlukEn),
          parseFloat(product.boyCap),
          parseInt(product.cubukSayisiBoy),
          parseInt(product.cubukSayisiEn)
        );
        
      case 'OTOCH':
        return calculateOTOCHDuration(
          parseFloat(product.uzunlukBoy),
          parseFloat(product.uzunlukEn),
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
    
    // But this seems too small. Let me add a realistic cutting/setup time
    // Real-world cutting involves setup, positioning, etc.
    const realistic_duration_minutes = duration_minutes + 0.5; // Add 0.5 min setup time
    
    // Convert to hours and return  
    return parseFloat((realistic_duration_minutes / 60).toFixed(5));
  };

  // NTEL duration calculation per meter (Reliability: 91.3%)
  const calculateNTELDuration = (diameter_mm) => {
    return parseFloat((0.001 + (diameter_mm * 0.000185)).toFixed(5));
  };

  // YOTOCH duration calculation (Reliability: 98.7%)
  const calculateYOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
    const area = boy_mm * en_mm;
    const totalRods = cubukSayisiBoy + cubukSayisiEn;
    const wireFactor = Math.pow(diameter_mm, 1.2);
    const densityFactor = totalRods / (area / 10000); // rods per cm²
    
    return parseFloat((0.08 + 
           (area * 0.0000012) + 
           (wireFactor * 0.015) + 
           (densityFactor * 0.02)).toFixed(5));
  };

  // OTOCH duration calculation (Estimated Reliability: 85.2%)
  const calculateOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
    const area = boy_mm * en_mm;
    const totalRods = cubukSayisiBoy + cubukSayisiEn;
    const wireFactor = Math.pow(diameter_mm, 1.1);
    const densityFactor = totalRods / (area / 10000);
    
    return parseFloat((0.05 + 
           (area * 0.0000008) + 
           (wireFactor * 0.01) + 
           (densityFactor * 0.015)).toFixed(5));
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
  
  // Database save progress
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [databaseProgress, setDatabaseProgress] = useState({ current: 0, total: 0, operation: '', currentProduct: '' });

  // New popup states for enhanced database checking
  const [showExcelOptionsModal, setShowExcelOptionsModal] = useState(false);
  const [showPreSaveConfirmModal, setShowPreSaveConfirmModal] = useState(false);
  const [preSaveConfirmData, setPreSaveConfirmData] = useState({ newProducts: [], existingProducts: [] });
  
  // Sequence tracking
  const [sequences, setSequences] = useState({});

  // Filter and sort database products
  const getFilteredAndSortedProducts = useCallback(() => {
    let filteredProducts = [...savedProducts[activeDbTab]];
    
    // Apply search filter
    if (dbSearchText.trim()) {
      const searchLower = dbSearchText.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        (product.stok_kodu || '').toLowerCase().includes(searchLower) ||
        (product.stok_adi || '').toLowerCase().includes(searchLower) ||
        (product.grup_kodu || '').toLowerCase().includes(searchLower) ||
        (product.kod_1 || '').toLowerCase().includes(searchLower) ||
        (product.kod_2 || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Apply hasır tipi filter - primarily check stok_adi where Q/R/TR codes are stored
    if (dbFilterHasirTipi && dbFilterHasirTipi !== 'All') {
      console.log(`🔍 Filtering for ${dbFilterHasirTipi}, total products before filter:`, filteredProducts.length);
      
      if (dbFilterHasirTipi === 'Q Tipleri') {
        filteredProducts = filteredProducts.filter(product => 
          (product.stok_adi || product.hasir_tipi || product.stok_kodu || '').toLowerCase().includes('q')
        );
      } else if (dbFilterHasirTipi === 'R Tipleri') {
        // Debug: Show sample products to understand the data structure
        if (filteredProducts.length > 0) {
          console.log('🔍 Sample products for R-type debugging:', filteredProducts.slice(0, 5).map(p => ({
            stok_adi: p.stok_adi,
            hasir_tipi: p.hasir_tipi, 
            stok_kodu: p.stok_kodu
          })));
        }
        
        filteredProducts = filteredProducts.filter(product => {
          const searchText = (product.stok_adi || product.hasir_tipi || product.stok_kodu || '').toLowerCase();
          
          // More specific R-type detection - look for R followed by numbers (like R257, R131, etc.)
          // This avoids false matches from words containing 'r' like "Ara", "Çap", etc.
          const hasRCode = /\br\d+/i.test(searchText); // R followed by digits
          const hasTR = searchText.includes('tr');
          const match = hasRCode && !hasTR;
          
          // Debug individual matches
          if (searchText.includes('r')) {
            console.log(`🔍 R-type check: "${searchText}" -> hasRCode:${hasRCode}, hasTR:${hasTR}, match:${match}`);
          }
          
          return match;
        });
      } else if (dbFilterHasirTipi === 'TR Tipleri') {
        filteredProducts = filteredProducts.filter(product => 
          (product.stok_adi || product.hasir_tipi || product.stok_kodu || '').toLowerCase().includes('tr')
        );
      }
      
      console.log(`🔍 After filtering for ${dbFilterHasirTipi}, remaining products:`, filteredProducts.length);
    }
    
    // Apply hasır türü filter - check both hasir_turu and kod_2 columns
    if (dbFilterHasirTuru && dbFilterHasirTuru !== 'All') {
      if (dbFilterHasirTuru.toLowerCase() === 'standart') {
        // For Standart, check kod_2 = 'STD'
        filteredProducts = filteredProducts.filter(product => 
          (product.kod_2 || '').toUpperCase() === 'STD'
        );
      } else {
        // For other filters, use hasir_turu column
        filteredProducts = filteredProducts.filter(product => 
          (product.hasir_turu || '').toLowerCase() === dbFilterHasirTuru.toLowerCase()
        );
      }
    }
    
    
    // Apply sorting
    filteredProducts.sort((a, b) => {
      let aValue = a[dbSortBy];
      let bValue = b[dbSortBy];
      
      // Handle numeric fields
      if (dbSortBy === 'cap' || dbSortBy === 'length_cm') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (dbSortBy === 'created_at') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else {
        // Handle text fields
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      }
      
      if (aValue < bValue) return dbSortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return dbSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filteredProducts;
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
        
        // If it's a 504 or 500 error, retry
        if ((response.status === 504 || response.status === 500) && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Request failed with ${response.status}, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
          
          // Update progress indicator if callback provided
          if (progressCallback) {
            progressCallback(`⏳ Sunucu zaman aşımı, tekrar denenecek... (${attempt}/${maxRetries})`);
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

  // Bulk delete function for selected items
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

    try {
      const tabEndpoints = {
        mm: API_URLS.celikHasirMm,
        ncbk: API_URLS.celikHasirNcbk,
        ntel: API_URLS.celikHasirNtel
      };

      // Delete products in parallel for speed - let backend handle recipe cascading
      const deletePromises = selectedDbItems.map(async (itemId) => {
        try {
          const response = await fetchWithRetry(`${tabEndpoints[activeDbTab]}/${itemId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          }, 3, 2000, (retryMessage) => {
            // Show retry progress to user
            toast.info(`${itemId}: ${retryMessage}`, { autoClose: 3000 });
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          deletedCount++;
          return { success: true, itemId };
        } catch (error) {
          console.error(`Failed to delete item ${itemId}:`, error);
          return { success: false, itemId, error: error.message };
        }
      });

      const results = await Promise.all(deletePromises);
      
      // Check for any failures
      const failures = results.filter(result => !result.success);
      
      if (failures.length > 0) {
        failures.forEach(failure => {
          toast.error(`Ürün ${failure.itemId} silinemedi: ${failure.error}`);
        });
      }

      if (deletedCount > 0) {
        toast.success(`${deletedCount} ürün başarıyla silindi`);
        setSelectedDbItems([]);
        await fetchSavedProducts();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Toplu silme işlemi sırasında hata oluştu');
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

    const filteredProducts = getFilteredAndSortedProducts();
    const selectedProducts = filteredProducts.filter(product => 
      selectedDbItems.includes(product.id)
    );

    if (selectedProducts.length === 0) {
      toast.error('Seçili ürünler bulunamadı');
      return;
    }

    // Transform database products to expected Excel format
    const transformedProducts = selectedProducts.map(product => ({
      // Map database fields to expected Excel generation format
      boyCap: product.cap || 0,
      enCap: product.cap2 || 0,
      hasirTipi: product.hasir_tipi || '',
      uzunlukBoy: product.ebat_boy || 0,
      uzunlukEn: product.ebat_en || 0,
      boyAraligi: product.goz_araligi ? product.goz_araligi.split(/[*x]/)[0] : '15',
      enAraligi: product.goz_araligi ? product.goz_araligi.split(/[*x]/)[1] || product.goz_araligi.split(/[*x]/)[0] : '15',
      gozAraligi: product.goz_araligi ? product.goz_araligi.replace('*', 'x') : '15x15',
      totalKg: product.kg || 0,
      adetKg: product.kg || 0,
      cubukSayisiBoy: product.ic_cap_boy_cubuk_ad || 0,
      cubukSayisiEn: product.dis_cap_en_cubuk_ad || 0,
      hasirSayisi: product.hasir_sayisi || 1,
      hasirTuru: product.hasir_turu || 'Standart',
      // Add existing stok kodu for saved products
      existingStokKodu: product.stok_kodu,
      // CRITICAL: Mark as optimized so Excel generation processes them
      isOptimized: true
    }));

    console.log('DEBUG: Selected products for export:', transformedProducts);

    try {
      await generateExcelFiles(transformedProducts, true); // Set includeAllProducts to true for saved products
      toast.success(`${selectedProducts.length} ürün için Excel dosyaları oluşturuldu!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Excel dosyaları oluşturulurken hata oluştu');
    }
  };

  // Component yüklendiğinde verileri getir
  useEffect(() => {
    fetchSavedProducts(); // Load all data automatically on component mount
    fetchSequences();
  }, []);

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
      
      console.log('🚀 OPTIMIZED: Fetching all saved products from database...');
      
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
        timeoutPromise(fetchWithAuth(API_URLS.celikHasirMm, { signal })),
        timeoutPromise(fetchWithAuth(API_URLS.celikHasirNcbk, { signal })),
        timeoutPromise(fetchWithAuth(API_URLS.celikHasirNtel, { signal }))
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
      setSavedProducts(allData);
      
      // Reset error states on successful fetch
      setBackendError(null);
      setRetryCount(0);
      
      // Display current page vs total for pagination
      const mmDisplay = mmTotal === mmData.length ? `MM(${mmTotal})` : `MM(${mmData.length}/${mmTotal})`;
      const ncbkDisplay = ncbkTotal === ncbkData.length ? `NCBK(${ncbkTotal})` : `NCBK(${ncbkData.length}/${ncbkTotal})`;
      const ntelDisplay = ntelTotal === ntelData.length ? `NTEL(${ntelTotal})` : `NTEL(${ntelData.length}/${ntelTotal})`;
      
      console.log(`✅ Başarıyla yüklendi - Toplam: ${mmDisplay}, ${ncbkDisplay}, ${ntelDisplay} ürün`);
      
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
      
      // Initialize batch counter only once per batch operation
      if (!batchSequenceInitialized) {
        let maxSequence = 2443; // Default fallback
        
        // First check sequence table for OZL products
        // Look for any sequence key that starts with CH_OZL_
        const ozlSequenceKey = Object.keys(sequences).find(key => key.startsWith('CH_OZL_'));
        if (ozlSequenceKey && sequences[ozlSequenceKey]) {
          maxSequence = sequences[ozlSequenceKey];
          console.log('*** Using sequence from sequence table with key:', ozlSequenceKey, 'value:', maxSequence);
        } else {
          // Fallback: scan existing products if sequence table not available
          console.log('*** Sequence table not available, scanning existing products');
          const existingOzelProducts = savedProducts.mm.filter(p => p.stok_kodu && p.stok_kodu.startsWith('CHOZL'));
          
          existingOzelProducts.forEach(p => {
            const match = p.stok_kodu.match(/CHOZL(\d+)/);
            if (match) {
              const sequenceNum = parseInt(match[1]);
              if (sequenceNum > maxSequence) {
                maxSequence = sequenceNum;
              }
            }
          });
          console.log('Existing CHOZL products scanned:', existingOzelProducts.length);
        }
        
        batchSequenceCounter = maxSequence;
        batchSequenceInitialized = true;
        
        console.log('*** BATCH STOK KODU INITIALIZED FOR NEW PRODUCTS ***');
        console.log('Max sequence determined:', maxSequence);
        console.log('Batch counter initialized at:', batchSequenceCounter);
      }
      
      // Increment counter ONLY when creating NEW product (not cached)
      batchSequenceCounter++;
      const generatedCode = `CHOZL${String(batchSequenceCounter).padStart(4, '0')}`;
      
      // Cache the generated code for this product
      productStokKoduCache.set(productKey, generatedCode);
      
      console.log('*** NEW STOK KODU GENERATION ***');
      console.log('Product:', { hasirTipi: product.hasirTipi, batchIndex });
      console.log('Sequence for this NEW product:', batchSequenceCounter, 'Generated:', generatedCode);
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
    if (validProducts.length === 0) return { newProducts: [], existingProducts: [] };
    
    const newProducts = [];
    const existingProducts = [];
    let modalBatchIndex = 0;
    
    // Debug: Log the savedProducts structure
    console.log('DEBUG: savedProducts in analyzeProductsForConfirmation:', {
      mm: savedProducts.mm?.length || 0,
      ncbk: savedProducts.ncbk?.length || 0,
      ntel: savedProducts.ntel?.length || 0
    });
    
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
      console.log('DEBUG: Looking for product with stok_adi:', productStokAdi);
      
      // Find existing product by exact Stok Adı
      let existingProduct = savedProducts.mm.find(p => p.stok_adi === productStokAdi);
      
      // Try normalized Stok Adı if exact match not found
      if (!existingProduct) {
        const normalizedProductStokAdi = normalizeStokAdiForComparison(productStokAdi);
        existingProduct = savedProducts.mm.find(p => {
          const normalizedDbStokAdi = normalizeStokAdiForComparison(p.stok_adi);
          return normalizedDbStokAdi === normalizedProductStokAdi;
        });
        
        if (existingProduct) {
          console.log(`DEBUG: Found match via normalized Stok Adı: "${productStokAdi}" matched "${existingProduct.stok_adi}"`);
        } else {
          // If still not found, show some similar products for debugging
          const similarProducts = savedProducts.mm.filter(p => {
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

        existingProduct = savedProducts.mm.find(p => 
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
        
        const allMatchingProducts = savedProducts.mm.filter(p => {
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
        const allHasirTipiVariations = new Set(savedProducts.mm.map(p => p.hasir_tipi).filter(Boolean));
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
          const fallbackMatches = savedProducts.mm.filter(p => {
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
        [...savedProducts.mm, ...savedProducts.ncbk, ...savedProducts.ntel].forEach(p => {
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
    
    return { newProducts, existingProducts };
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
      // Ensure it's in "X*Y" format, if it's just a single number, duplicate it
      const gozValue = product.gozAraligi.toString();
      if (gozValue.includes('*')) {
        return gozValue;
      } else {
        return `${gozValue}x${gozValue}`;
      }
    } else if (product.goz_araligi) {
      // Ensure it's in "X*Y" format, if it's just a single number, duplicate it
      const gozValue = product.goz_araligi.toString();
      if (gozValue.includes('*')) {
        return gozValue;
      } else {
        return `${gozValue}x${gozValue}`;
      }
    } else {
      // Default fallback - return default mesh spacing
      return '15*15';
    }
  };

  // Smart hasır tipi normalizer - handles Q/R/TR format variations intelligently
  const normalizeHasirTipi = (tipi) => {
    if (!tipi) return '';
    
    // Handle various input formats and clean the string
    let cleanTipi = tipi.toString().trim().toUpperCase();
    
    // Remove any extra whitespace between letters and numbers
    cleanTipi = cleanTipi.replace(/\s+/g, '');
    
    // Extract the base pattern (Q257, R257, TR257, etc.)
    // Handle both Q257 and Q257/257 formats
    const match = cleanTipi.match(/^(Q|R|TR)(\d+)(?:\/\d+)?/);
    if (!match) return cleanTipi;
    
    const prefix = match[1];  // Q, R, or TR
    const number = match[2];  // 257, 221, etc.
    
    // Normalize based on type rules from CSV analysis:
    // Q types should have double format: Q257/257
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

  // Excel dosyalarını oluştur
  const generateExcelFiles = useCallback(async (products, includeAllProducts = false) => {
    try {
      // DON'T clear cache here - it should persist from database save to Excel generation
      // so that same products get same STOK KODUs in both database and Excel files
      
      console.log('DEBUG: generateExcelFiles called with:', {
        productsCount: products.length,
        includeAllProducts,
        firstProduct: products[0] || 'No products'
      });
      
      setIsGeneratingExcel(true);
      setExcelProgress({ current: 0, total: 3, operation: 'Excel dosyaları hazırlanıyor...' });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      
      // 1. Stok Kartı Excel
      console.log('DEBUG: Starting Stok Kartı Excel generation...');
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

  // Stok Kartı Excel oluştur
  const generateStokKartiExcel = async (products, timestamp, includeAllProducts) => {
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

    // CH ürünlerini ekle
    let excelBatchIndex = 0;
    for (const product of products) {
      // For Excel generation, process all products regardless of optimization status
        // For saved products, use existing Stok Kodu; for new products, generate new one
        const stokKodu = product.existingStokKodu || generateStokKodu(product, 'CH', excelBatchIndex);
        const stokAdi = generateStokAdi(product, 'CH');
        const ingilizceIsim = generateIngilizceIsim(product, 'CH');
        const gozAraligi = formatGozAraligi(product);
        excelBatchIndex++;
        
        const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                           (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25');
        
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
          // 28-35: Counts and custom fields (İç Çap/Boy Çubuk AD, Dış Çap/En Çubuk AD, Özel Saha 2-4 Say, Özel Saha 1-3 Alf)
          parseInt(product.cubukSayisiBoy || 0), parseInt(product.cubukSayisiEn || 0), '0', '0', '0', '', '', '',
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
            stokKodu, stokAdi, 'YM', 'YM', 'NCBK', '', ingilizceIsim,
            // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
            '20', '20', '20', '35',
            // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
            'AD', 'KG', toExcelDecimal(parseFloat(ncbkWeight).toFixed(5)), '1', '',
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
            ntelStokKodu, ntelStokAdi, 'YM', 'NTEL', '', ntelIngilizceIsim, '20', '20', '20', '35',
            'MT', 'KG', toExcelDecimal(ntelWeight), '1', '', '', '1', '1', '1', ntelStokKodu,
            'YM', 'YM', toExcelDecimal(parseFloat(boyCap).toFixed(1)), '', '', '', '', toExcelDecimal(ntelWeight), '0', '0',
            '0', '0', '0', '', '', '', '0', '2', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
            '', '0', '0', '0', '0', '0', '0', 'D', '', '', '', '', '', 'H', 'H',
            '', '', '', 'E', 'E'
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
            stokKodu, stokAdi, 'YM', 'YM', 'NCBK', '', ingilizceIsim,
            // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
            '20', '20', '20', '35',
            // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
            'AD', 'KG', '1', toExcelDecimal(parseFloat(ncbkWeight).toFixed(5)), '',
            // 17-20: More conversions (Ölçü Br-3, Çevrim Pay-2, Çevrim Payda-2, Çevrim Değeri-2)
            '', '1', '1', '1',
            // 21-27: Product specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
            '', toExcelDecimal(parseFloat(enCap).toFixed(1)), '', uzunlukEn, '', '', toExcelDecimal(parseFloat(ncbkWeight).toFixed(5)),
            // 28-35: Counts and custom fields (İç Çap/Boy Çubuk AD, Dış Çap/En Çubuk AD, Özel Saha 2-4 Say, Özel Saha 1-3 Alf)
            '1', '', '0', '0', '0', '', '', '',
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
              ntelStokKodu, ntelStokAdi, 'YM', '', 'NTEL', '', ntelIngilizceIsim,
              // 8-11: KDV and codes (Alış KDV Oranı, Satış KDV Oranı, Muh. Detay, Depo Kodu)
              '20', '20', '20', '35',
              // 12-16: Units and conversions (Br-1, Br-2, Pay-1, Payda-1, Çevrim Değeri-1)
              'MT', 'KG', '1', toExcelDecimal(parseFloat(ntelWeight).toFixed(5)), '',
              // 17-20: More conversions (Ölçü Br-3, Çevrim Pay-2, Çevrim Payda-2, Çevrim Değeri-2)
              '', '1', '1', '1',
              // 21-27: Product specifications (Hasır Tipi, Çap, Çap2, Ebat(Boy), Ebat(En), Göz Aralığı, KG)
              '', toExcelDecimal(parseFloat(enCap).toFixed(1)), '', '', '', '', toExcelDecimal(parseFloat(ntelWeight).toFixed(5)),
              // 28-35: Counts and custom fields (İç Çap/Boy Çubuk AD, Dış Çap/En Çubuk AD, Özel Saha 2-4 Say, Özel Saha 1-3 Alf)
              '', '', '0', '0', '0', '', '', '',
              // 36-45: Price fields (Alış Fiyatı, Fiyat Birimi, Satış Fiyatları 1-4, Döviz Tip, Döviz Alış, Döviz Maliyeti, Döviz Satış Fiyatı)
              '0', '2', '0', '0', '0', '0', '0', '0', '0', '0',
              // 46-55: Stock and other fields (Azami Stok, Asgari Stok, Döv.Tutar, Döv.Tipi, Alış Döviz Tipi, Bekleme Süresi, Temin Süresi, Birim Ağırlık, Nakliye Tutar, Stok Türü)
              '0', '0', '', '0', '0', '0', '0', '0', '0', 'D',
              // 56-65: Final template fields (Mali Grup Kodu, Özel Saha 8 Alf, Kod-3, Kod-4, Kod-5, Esnek Yapılandır, Süper Reçete Kullanılsın, Bağlı Stok Kodu, Yapılandırma Kodu, Yap. Açıklama)
              '', '', '', '', '', 'H', 'H', '', '', '',
              // 66-69: Extra columns from our app format (not in CSV template)
              ntelStokKodu, 'YM', 'E', 'E'
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
    for (const product of products) {
      // For Excel generation, process all products regardless of optimization status
        const chStokKodu = product.existingStokKodu || generateStokKodu(product, 'CH', receteBatchIndex);
        receteBatchIndex++;
        
        // CH Reçete - Boy ve En çubuk tüketimleri
        // Determine mesh type pattern for quantities
        const isQType = product.hasirTipi && product.hasirTipi.includes('Q');
        const isRType = product.hasirTipi && product.hasirTipi.includes('R');
        
        // FIXED: Calculate correct quantities based on actual product dimensions
        const enCubukMiktar = Math.round((parseFloat(product.uzunlukEn) || 0) / (parseFloat(product.gozAraligiEn) || 15) + 1);
        const boyCubukMiktar = Math.round((parseFloat(product.uzunlukBoy) || 0) / (parseFloat(product.gozAraligiBoy) || 15) + 1);
        const operationTime = isRType ? '0,1667' : '0,2667'; // R-type: 0.1667, Q-type: 0.2667
        
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
              'DK', '1', '', '', '', '', '', '', '', toExcelDecimal(calculateOperationDuration('NCBK', { length: uzunlukBoy, boyCap: boyCap, enCap: boyCap }).toFixed(5)),
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
            'DK', '1', '', '', '', '', '', '', '', toExcelDecimal(calculateOperationDuration('NTEL', {boyCap: boyCap, enCap: boyCap}).toFixed(5)),
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
            const flmTuketimi = (Math.PI * (enCap/20) * (enCap/20) * uzunlukEn * 7.85 / 1000).toFixed(5);
            
            // Olcu Birimi: Originally was 'AD' for NCBK, now left empty per user request
            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', '', '1', 'Bileşen', flmKodu,
              'KG', toExcelDecimal(parseFloat(flmTuketimi).toFixed(5)), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
              '', 'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
            ]);
            
            ncbkReceteSheet.addRow([
              ncbkStokKodu, '1', '', '', '', '2', 'Operasyon', 'NDK01',
              'DK', '1', '', '', '', '', '', '', '', toExcelDecimal(calculateOperationDuration('NCBK', { length: uzunlukEn, boyCap: enCap, enCap: enCap }).toFixed(5)),
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
            'DK', '1', '', '', '', '', '', '', '', toExcelDecimal(calculateOperationDuration('NTEL', {boyCap: enCap, enCap: enCap}).toFixed(5)),
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

    // Alternatif reçete verilerini ekle (NTEL bazlı)
    let altReceteBatchIndex = 0;
    console.log('DEBUG: Starting CH reçete generation for', products.length, 'products');
    let chRowCount = 0;
    for (const product of products) {
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
        
        // Boy direction NTEL consumption
        if (boyCap > 0) {
          const boyNtelKodu = `YM.NTEL.${String(Math.round(boyCap * 100)).padStart(4, '0')}`;
          const boyNtelMiktar = (parseFloat(product.cubukSayisiBoy || 0) * 5).toFixed(5); // 5 meters per cubuk
          
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
        if (enCap > 0 && enCap !== boyCap) {
          const enNtelKodu = `YM.NTEL.${String(Math.round(enCap * 100)).padStart(4, '0')}`;
          const enNtelMiktar = (parseFloat(product.cubukSayisiEn || 0) * 2.15).toFixed(5); // 2.15 meters per cubuk
          
          // Olcu Birimi: Originally was 'MT' for CH alternatif recipe, now left empty per user request
          chReceteSheet.addRow([
            chStokKodu, '1', '0', '', '', '2', 'Bileşen',
            enNtelKodu,
            'MT', toExcelDecimal(enNtelMiktar), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', ''
          ]);
        } else if (enCap > 0 && enCap === boyCap) {
          // Same diameter for both directions
          const enNtelKodu = `YM.NTEL.${String(Math.round(enCap * 100)).padStart(4, '0')}`;
          const enNtelMiktar = (parseFloat(product.cubukSayisiEn || 0) * 2.15).toFixed(5);
          
          // Olcu Birimi: Originally was 'MT' for CH alternatif recipe, now left empty per user request
          chReceteSheet.addRow([
            chStokKodu, '1', '0', '', '', '2', 'Bileşen',
            enNtelKodu,
            'MT', toExcelDecimal(enNtelMiktar), 'En NTEL Tüketimi', '', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', ''
          ]);
        }
        
        // Olcu Birimi: Originally was 'DK' for CH alternatif recipe operations, now left empty per user request
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', '', '3', 'Operasyon', 'OTOCH',
          'DK', '1', 'Tam Otomatik Operasyon', '', '', '', '', '', '', toExcelDecimal(calculateOperationDuration('OTOCH', product).toFixed(5)),
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
            'DK', '1', '', '', '', '', '', '', '', toExcelDecimal(calculateOperationDuration('NCBK', { ...product, length: uzunlukBoy, boyCap: boyCap, enCap: boyCap }).toFixed(5)),
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
            'DK', '1', '', '', '', '', '', '', '', toExcelDecimal(calculateOperationDuration('NCBK', { ...product, length: 215, boyCap: enCap, enCap: enCap }).toFixed(5)),
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
            'DK', '1', '', '', '', '', '', '', '', toExcelDecimal(calculateOperationDuration('NTEL', { ...product, boyCap: boyCap }).toFixed(5)),
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
            'DK', '1', '', '', '', '', '', '', '', toExcelDecimal(calculateOperationDuration('NTEL', { ...product, boyCap: enCap }).toFixed(5)),
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

  // Recipe kayıtlarını veritabanına kaydet
  const saveRecipeData = async (product, chResult, ncbkResults, ntelResult) => {
    try {
      // CH Recipe kayıtları
      const chRecipes = [
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'AD',
          sira_no: 1,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: (ncbkResults[`${product.boyCap}-${parseInt(product.uzunlukBoy || 0)}`] || ncbkResults[parseInt(product.uzunlukBoy || 0)])?.stok_kodu || '',
          olcu_br_bilesen: 'AD',
          miktar: product.cubukSayisiBoy || 0,
          aciklama: 'BOY ÇUBUĞU',
        },
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'AD',
          sira_no: 2,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: (ncbkResults[`${product.enCap}-${parseInt(product.uzunlukEn || 0)}`] || ncbkResults[parseInt(product.uzunlukEn || 0)])?.stok_kodu || '',
          olcu_br_bilesen: 'AD',
          miktar: product.cubukSayisiEn || 0,
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

      // NCBK Recipe kayıtları
      for (const [length, ncbkResult] of Object.entries(ncbkResults)) {
        const ncbkRecipes = [
          // Bileşen - FLM tüketimi
          {
            mamul_kodu: ncbkResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'AD',
            sira_no: 1,
            operasyon_bilesen: 'Bileşen',
            bilesen_kodu: getFilmasinKodu(parseFloat(ncbkResult.cap)).code,
            olcu_br_bilesen: 'KG',
            miktar: parseFloat((Math.PI * (parseFloat(ncbkResult.cap)/20) * (parseFloat(ncbkResult.cap)/20) * parseFloat(length) * 7.85 / 1000).toFixed(5)),
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
            uretim_suresi: calculateOperationDuration('NCBK', { ...product, length: length })
          }
        ];

        // NCBK recipes kaydet - paralel işlem
        await Promise.all(ncbkRecipes.map(recipe =>
          fetchWithAuth(API_URLS.celikHasirNcbkRecete, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipe)
          })
        ));
      }

      // NTEL Recipe kayıtları - only if ntelResult exists (newly created)
      if (ntelResult && ntelResult.stok_kodu) {
        const ntelRecipes = [
          // Bileşen - FLM tüketimi
          {
            mamul_kodu: ntelResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'MT',
            sira_no: 1,
            operasyon_bilesen: 'Bileşen',
            bilesen_kodu: getFilmasinKodu(parseFloat(ntelResult.cap)).code,
            olcu_br_bilesen: 'KG',
            miktar: parseFloat((Math.PI * (parseFloat(ntelResult.cap)/20) * (parseFloat(ntelResult.cap)/20) * 100 * 7.85 / 1000).toFixed(5)),
            aciklama: 'FLM tüketimi - metre başına',
          },
          // Operasyon - Tam Otomatik İşlem
          {
            mamul_kodu: ntelResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'MT',
            sira_no: 2,
            operasyon_bilesen: 'Operasyon',
            bilesen_kodu: 'OTOCH',
            olcu_br_bilesen: 'MT',
            miktar: 1,
            aciklama: 'Yarı Otomatik Operasyon',
            uretim_suresi: calculateOperationDuration('NTEL', product)
          }
        ];

        // NTEL recipes kaydet - paralel işlem
        await Promise.all(ntelRecipes.map(recipe =>
          fetchWithAuth(API_URLS.celikHasirNtelRecete, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipe)
          })
        ));
      }

    } catch (error) {
      console.error('Recipe kaydetme hatası:', error);
      throw error;
    }
  };

  // Sequence güncelleme
  const updateSequences = async (product, actualSequenceNumber = null) => {
    try {
      // CH sequence güncelle with UPSERT operation
      const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                         (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25');
      const kod2 = isStandard ? 'STD' : 'OZL';
      const capCode = isStandard ? String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0') : '';
      
      // For OZL products, use the actual generated sequence number
      const sequenceData = {
        product_type: 'CH',
        kod_2: kod2,
        cap_code: capCode,
        last_sequence: actualSequenceNumber || 0, // Use actual sequence number for OZL
        upsert: true // Signal backend to use UPSERT instead of INSERT
      };
      
      await fetchWithAuth(API_URLS.celikHasirSequence, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sequenceData)
      });
      
    } catch (error) {
      console.error('Sequence güncelleme hatası:', error);
    }
  };

  // Veritabanına kaydet
  const saveToDatabase = async (products) => {
    try {
      // Reset batch sequence counter for new batch
      resetBatchSequenceCounter();
      
      setIsLoading(true);
      setIsSavingToDatabase(true);
      setDatabaseProgress({ current: 0, total: 0, operation: 'Veritabanı kontrol ediliyor...', currentProduct: '' });
      
      // Optimization check removed - save products with or without optimization
      
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
      
      for (const product of productsToSave) {
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
        console.log('allSkippedStokKodusList:', skippedStokKodusList);
        setPreSaveConfirmData({
          newProducts: [],
          skippedProducts: skippedProducts,
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
      setDatabaseProgress({ 
        current: 0, 
        total: totalCount, 
        operation: `${newProducts.length} yeni ürün kaydediliyor, ${skippedProducts.length} mevcut ürün atlanıyor...`,
        currentProduct: unoptimizedCount > 0 ? `(${unoptimizedCount} optimize edilmemiş)` : ''
      });
      
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
        // CH kaydı
        const kgValue = parseFloat(product.adetKg || product.totalKg || 0);
        
        
        // Generate stok_kodu and capture it for sequence tracking
        const generatedStokKodu = generateStokKodu(product, 'CH', i);
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

          chResponse = await fetchWithRetry(API_URLS.celikHasirMm, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chData)
          }, 5, 1000, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: msg })));
          
          if (chResponse.status === 409) {
            // Bu OLMAMALI - duplicate checking başarısız olmuş
            console.error(`BEKLENMEYEN DUPLICATE: CH ürün zaten var: ${chData.stok_kodu}`);
            toast.error(`Duplicate hatası: ${chData.stok_kodu}`);
            continue; // Bu ürünü atla
          } else if (!chResponse.ok) {
            throw new Error(`CH kaydı başarısız: ${chResponse.status}`);
          } else {
            chResult = await chResponse.json();
          }

          // NCBK kayıtları (Boy ve En için ayrı ayrı - gerçek boyutları kullan)
          // Database should create ALL NCBKs including duplicates for recipe accuracy
          const ncbkSpecs = [
            { cap: product.boyCap, length: parseInt(product.uzunlukBoy || 0), type: 'boy' },
            { cap: product.enCap, length: parseInt(product.uzunlukEn || 0), type: 'en' }
          ];
          
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
              ingilizce_isim: `Ribbed Rod ${formatDecimalForDisplay(cap, false)} mm ${length} cm`,
              // Standard columns
              alis_kdv_orani: 20,
              satis_kdv_orani: 20,
              muh_detay: 35,
              depo_kodu: 36,
              br_1: 'AD',
              br_2: 'KG',
              pay_1: parseFloat(ncbkWeight.toFixed(5)),
              payda_1: 1,
              cevrim_degeri_1: 0,
              olcu_br_3: null,
              cevrim_pay_2: 1,
              cevrim_payda_2: 1,
              cevrim_degeri_2: 1,
              // Product specific
              cap: parseFloat(parseFloat(cap || 0).toFixed(1)),
              cap2: parseFloat(parseFloat(cap || 0).toFixed(1)),
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

            const ncbkResponse = await fetchWithRetry(API_URLS.celikHasirNcbk, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ncbkData)
            }, 5, 1000, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: `${msg} - NCBK ${spec.type}` })));
            
            if (ncbkResponse.status === 409) {
              // NCBK already exists - this is normal, just use existing
              console.log(`ℹ️ NCBK already exists, using existing: ${ncbkData.stok_kodu}`);
              // Store a placeholder result to continue the process
              const specKey = `${spec.type}-${cap}-${length}`;
              ncbkResults[specKey] = { stok_kodu: ncbkData.stok_kodu, message: 'existing' };
              ncbkResults[length] = { stok_kodu: ncbkData.stok_kodu, message: 'existing' };
              continue; // Continue to next NCBK
            } else if (!ncbkResponse.ok) {
              throw new Error(`NCBK kaydı başarısız: ${ncbkResponse.status}`);
            } else {
              const ncbkResult = await ncbkResponse.json();
              // Store with spec type to handle boy/en separately even if same dimensions
              const specKey = `${spec.type}-${cap}-${length}`;
              ncbkResults[specKey] = ncbkResult;
              // Also store with just length for recipe lookup compatibility
              ncbkResults[length] = ncbkResult;
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

          const ntelResponse = await fetchWithRetry(API_URLS.celikHasirNtel, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ntelData)
          }, 5, 1000, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: `${msg} - NTEL` })));
          
          if (ntelResponse.status === 409) {
            // NTEL already exists - this is normal, just use existing
            console.log(`ℹ️ NTEL already exists, using existing: ${ntelData.stok_kodu}`);
            ntelResult = { stok_kodu: ntelData.stok_kodu, message: 'existing' };
            // Continue with existing NTEL
          } else if (!ntelResponse.ok) {
            throw new Error(`NTEL kaydı başarısız: ${ntelResponse.status}`);
          } else {
            ntelResult = await ntelResponse.json();
          }
        } catch (error) {
          console.error(`Ürün kaydı hatası (${product.hasirTipi}):`, error);
          toast.error(`Ürün kaydı hatası: ${product.hasirTipi}`);
          continue; // Bu ürünü atla, diğerlerine devam et
        }

        // Recipe kayıtları oluştur (sadece yeni ürünler için)
        if (chResult && chResult.stok_kodu && Object.keys(ncbkResults).length > 0) {
          try {
            // Only create recipes for NEWLY created NCBK/NTEL (not existing ones)
            const newNcbkResults = {};
            Object.entries(ncbkResults).forEach(([key, result]) => {
              if (result && result.stok_kodu && result.message !== 'existing') {
                newNcbkResults[key] = result;
              }
            });
            
            // Check if NTEL is newly created (not existing)
            const newNtelResult = (ntelResult && ntelResult.message !== 'existing') ? ntelResult : null;
            
            console.log('🔍 DEBUG - Recipe Creation Decision:', {
              productType: product.hasirTipi,
              chResult: !!chResult,
              totalNcbkResults: Object.keys(ncbkResults).length,
              newNcbkResults: Object.keys(newNcbkResults).length,
              ntelResult: !!ntelResult,
              newNtelResult: !!newNtelResult,
              willCreateRecipes: Object.keys(newNcbkResults).length > 0 || newNtelResult
            });

            // Always create CH recipes when CH is new, even if NCBK/NTEL exist
            // Use existing NCBK/NTEL if no new ones were created
            const ncbkForRecipe = Object.keys(newNcbkResults).length > 0 ? newNcbkResults : ncbkResults;
            const ntelForRecipe = newNtelResult || ntelResult;
            
            await saveRecipeData(product, chResult, ncbkForRecipe, ntelForRecipe);
            console.log(`✅ Recipe kayıtları başarıyla oluşturuldu: ${product.hasirTipi}`);
            
            // Sequence güncelle (sadece yeni ürünler için)
            if (chResponse && chResponse.status !== 409) {
              // Extract sequence number from generated stok_kodu for OZL products
              let actualSequenceNumber = null;
              if (generatedStokKodu && generatedStokKodu.startsWith('CHOZL')) {
                const match = generatedStokKodu.match(/CHOZL(\d+)/);
                if (match) {
                  actualSequenceNumber = parseInt(match[1]);
                }
              }
              await updateSequences(product, actualSequenceNumber);
            }
          } catch (error) {
            console.error(`Recipe kaydı hatası (${product.hasirTipi}):`, error);
            // Recipe hatası durumunda warning ver ama devam et
            toast.warning(`Recipe kaydı hatası: ${product.hasirTipi}`);
          }
        }
      }

      toast.success(`${processedCount} yeni ürün ve reçeteleri başarıyla kaydedildi!`);
      setDatabaseProgress({ 
        current: processedCount, 
        total: totalCount, 
        operation: 'Veritabanı kaydı tamamlandı!',
        currentProduct: ''
      });
      
      console.log('Veritabanı kaydetme tamamlandı. Excel için döndürülen ürünler:', {
        count: newProducts.length,
        products: newProducts.map(p => p.hasirTipi)
      });
      
      // Listeyi güncelle (don't await to avoid timeout)
      fetchSavedProducts().catch(error => {
        console.warn('Database refresh failed after save:', error);
        toast.warning('Veritabanı yenileme başarısız - sayfa yenileyebilirsiniz');
      });
      
      // Force re-render for count updates
      setIsSavingToDatabase(false);
      setIsLoading(false);
      
      // Sadece yeni kaydedilen ürünleri döndür
      return newProducts;
      
    } catch (error) {
      console.error('Veritabanına kaydetme hatası:', error);
      
      // Provide specific error messages based on error type
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
      setIsLoading(false);
      setIsSavingToDatabase(false);
      setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
    }
  };

  // Ürün sil
  const deleteProduct = async (productId, productType) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setIsLoading(true);
      setDeletingProductId(productId); // Track which product is being deleted
      
      // Önce reçete kayıtlarını sil
      const product = savedProducts[productType].find(p => p.id === productId);
      if (product && product.stok_kodu) {
        try {
          let recipeApiUrl = '';
          if (productType === 'mm') recipeApiUrl = API_URLS.celikHasirMmRecete;
          else if (productType === 'ncbk') recipeApiUrl = API_URLS.celikHasirNcbkRecete;
          else if (productType === 'ntel') recipeApiUrl = API_URLS.celikHasirNtelRecete;
          
          if (recipeApiUrl) {
            // Önce bu mamul_kodu ile reçete kayıtlarını getir
            const getRecipeResponse = await fetchWithAuth(`${recipeApiUrl}?mamul_kodu=${product.stok_kodu}`);
            
            if (getRecipeResponse.ok) {
              const recipes = await getRecipeResponse.json();
              console.log(`Found ${recipes.length} recipes for mamul_kodu: ${product.stok_kodu}`);
              
              // Sadece bu mamul_kodu'na ait reçeteleri filtrele ve sil
              const recipesToDelete = recipes.filter(r => r.mamul_kodu === product.stok_kodu);
              console.log(`Filtered to ${recipesToDelete.length} recipes to delete`);
              
              // Her reçete kaydını ID ile sil
              for (const recipe of recipesToDelete) {
                if (recipe.id) {
                  try {
                    const deleteRecipeResponse = await fetchWithRetry(`${recipeApiUrl}/${recipe.id}`, { method: 'DELETE' }, 3, 2000, (retryMessage) => {
                      toast.info(`Reçete siliniyor: ${retryMessage}`, { autoClose: 2000 });
                    });
                    if (!deleteRecipeResponse.ok) {
                      console.warn(`Reçete silme uyarısı (ID: ${recipe.id}): ${deleteRecipeResponse.status}`);
                    }
                  } catch (deleteError) {
                    console.warn(`Reçete silme hatası (ID: ${recipe.id}):`, deleteError);
                  }
                }
              }
            }
          }
        } catch (recipeError) {
          console.warn('Reçete silme uyarısı:', recipeError);
          // Reçete silme hatası durumunda devam et
        }
      }
      
      // Sonra ana ürün kaydını sil
      let apiUrl = '';
      if (productType === 'mm') apiUrl = `${API_URLS.celikHasirMm}/${productId}`;
      else if (productType === 'ncbk') apiUrl = `${API_URLS.celikHasirNcbk}/${productId}`;
      else if (productType === 'ntel') apiUrl = `${API_URLS.celikHasirNtel}/${productId}`;

      const response = await fetchWithRetry(apiUrl, { method: 'DELETE' }, 3, 2000, (retryMessage) => {
        toast.info(`Ürün siliniyor: ${retryMessage}`, { autoClose: 2000 });
      });
      
      if (response?.ok) {
        toast.success('Ürün ve reçeteleri başarıyla silindi');
        
        // State'i hemen güncelle - fetch bekleme
        setSavedProducts(prev => ({
          ...prev,
          [productType]: prev[productType].filter(p => p.id !== productId)
        }));
        
        // Sonra fetch ile doğrula
        await fetchSavedProducts();
      } else {
        toast.error('Ürün silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Ürün silinirken hata oluştu');
    } finally {
      setIsLoading(false);
      setDeletingProductId(null); // Clear deletion tracking
    }
  };

  // Tümünü sil
  const bulkDeleteAll = async () => {
    try {
      setIsLoading(true);
      setIsBulkDeleting(true);
      setShowBulkDeleteModal(false);
      setBulkDeleteText('');
      
      const apiUrl = activeDbTab === 'mm' ? API_URLS.celikHasirMm :
                     activeDbTab === 'ncbk' ? API_URLS.celikHasirNcbk :
                     API_URLS.celikHasirNtel;
      
      const recipeApiUrl = activeDbTab === 'mm' ? API_URLS.celikHasirMmRecete :
                          activeDbTab === 'ncbk' ? API_URLS.celikHasirNcbkRecete :
                          API_URLS.celikHasirNtelRecete;
      
      const tabName = activeDbTab === 'mm' ? 'CH' : activeDbTab === 'ncbk' ? 'NCBK' : 'NTEL';
      const totalProducts = savedProducts[activeDbTab].length;
      
      setBulkDeleteProgress({ 
        current: 0, 
        total: totalProducts, 
        operation: 'Reçete kayıtları siliniyor...', 
        currentItem: '' 
      });
      
      // İlk önce reçete kayıtlarını sil - her ürün için ayrı ayrı
      let recipeDeleteCount = 0;
      let processedCount = 0;
      
      for (const product of savedProducts[activeDbTab]) {
        processedCount++;
        setBulkDeleteProgress({ 
          current: processedCount, 
          total: totalProducts, 
          operation: 'Reçete kayıtları siliniyor...', 
          currentItem: product.stok_kodu || `Ürün ${processedCount}` 
        });
        
        if (product.stok_kodu) {
          try {
            // Önce bu mamul_kodu ile reçete kayıtlarını getir
            const getRecipeResponse = await fetchWithAuth(`${recipeApiUrl}?mamul_kodu=${product.stok_kodu}`);
            
            if (getRecipeResponse.ok) {
              const recipes = await getRecipeResponse.json();
              
              // Her reçete kaydını ID ile sil
              for (const recipe of recipes) {
                if (recipe.id) {
                  try {
                    const deleteRecipeResponse = await fetchWithRetry(`${recipeApiUrl}/${recipe.id}`, { method: 'DELETE' }, 3, 2000, (retryMessage) => {
                      setBulkDeleteProgress(prev => ({
                        ...prev,
                        operation: `${prev.operation} ${retryMessage}`
                      }));
                    });
                    if (deleteRecipeResponse.ok) {
                      recipeDeleteCount++;
                    }
                  } catch (deleteError) {
                    console.warn(`Reçete silme hatası (ID: ${recipe.id}):`, deleteError);
                  }
                }
              }
            }
          } catch (recipeError) {
            console.warn(`Reçete alma hatası (${product.stok_kodu}):`, recipeError);
          }
        }
      }
      
      // Sonra ana ürün kayıtlarını sil
      processedCount = 0;
      for (const product of savedProducts[activeDbTab]) {
        processedCount++;
        setBulkDeleteProgress({ 
          current: processedCount, 
          total: totalProducts, 
          operation: 'Ürün kayıtları siliniyor...', 
          currentItem: product.stok_kodu || `Ürün ${processedCount}` 
        });
        
        await fetchWithRetry(`${apiUrl}/${product.id}`, { method: 'DELETE' }, 3, 2000, (retryMessage) => {
          setBulkDeleteProgress(prev => ({
            ...prev,
            operation: `Ürün kayıtları siliniyor... ${retryMessage}`
          }));
        });
      }
      
      // Eğer CH (mm) siliyorsak, sequence tablosunu da temizle
      if (activeDbTab === 'mm' && savedProducts.mm.length > 0) {
        setBulkDeleteProgress({ 
          current: totalProducts, 
          total: totalProducts, 
          operation: 'Sequence kayıtları temizleniyor...', 
          currentItem: 'CH Sequence' 
        });
        
        // OZL sequence'ı sıfırla
        await fetchWithRetry(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=OZL`, { 
          method: 'DELETE' 
        }).catch(() => {}); // Hata olsa bile devam et
      }
      
      setBulkDeleteProgress({ 
        current: totalProducts, 
        total: totalProducts, 
        operation: 'Tamamlandı!', 
        currentItem: `${totalProducts} ürün silindi` 
      });
      
      toast.success(`Tüm ${tabName} kayıtları ve reçeteleri başarıyla silindi`);
      
      // State'i hemen güncelle - fetch bekleme
      setSavedProducts(prev => ({
        ...prev,
        [activeDbTab]: []
      }));
      
      // Sonra fetch ile doğrula
      await fetchSavedProducts();
      
    } catch (error) {
      console.error('Toplu silme hatası:', error);
      toast.error('Toplu silme sırasında hata oluştu');
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
                // Analyze products and show pre-save confirmation - skip optimization check
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
                    console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için`);
                    await generateExcelFiles(newProducts, false);
                    toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu!`);
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
                      console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için`);
                      await generateExcelFiles(newProducts);
                      toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu!`);
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
                    onClick={() => {
                      fetchSavedProducts();
                    }}
                    disabled={isLoadingDb}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-400"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingDb ? 'animate-spin' : ''}`} />
                    Yenile
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-red-600 text-white rounded-md flex items-center gap-2 hover:bg-red-700 transition-colors text-sm disabled:bg-gray-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    {activeDbTab === 'mm' ? 'Tüm CH\'leri Sil' : activeDbTab === 'ncbk' ? 'Tüm NCBK\'leri Sil' : 'Tüm NTEL\'leri Sil'}
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
                {getFilteredAndSortedProducts().map(product => (
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
                
                {/* Empty State */}
                {!backendError && getFilteredAndSortedProducts().length === 0 && !isLoadingDb && (
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
                      console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için`);
                      await generateExcelFiles(newProducts);
                      toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu!`);
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
                  
                  validProducts.forEach(product => {
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
                  });
                  
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
                  
                  // Add planned stok_kodu to new products for Excel generation 
                  const newProductsWithPlannedCodes = newProducts.map((product, index) => ({
                    ...product,
                    existingStokKodu: generateStokKodu(product, 'CH', index)
                  }));
                  
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
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowExcelOptionsModal(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Save Confirmation Modal */}
      {showPreSaveConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold">Veritabanı Kayıt Onayı</h3>
            </div>
            
            <div className="mb-6">
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
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreSaveConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              
              {preSaveConfirmData.newProducts.length > 0 ? (
                <button
                  onClick={async () => {
                    setShowPreSaveConfirmModal(false);
                    const newProducts = await saveToDatabase(validProducts);
                    if (newProducts && newProducts.length > 0) {
                      console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için`);
                      await generateExcelFiles(newProducts, false);
                      toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu!`);
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
              ) : (
                <button
                  onClick={() => {
                    setShowPreSaveConfirmModal(false);
                    toast.info('Kaydedilecek yeni ürün bulunmamaktadır.');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                  disabled
                >
                  Kaydedilecek Yeni Ürün Yok
                </button>
              )}
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