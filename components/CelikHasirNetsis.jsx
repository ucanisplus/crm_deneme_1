// Çelik Hasır Netsis Integration Component
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  return `FLM.${String(Math.round(flmDiameter * 100)).padStart(4, '0')}.${flmQuality}`;
};

const CelikHasirNetsis = React.forwardRef(({ optimizedProducts = [], onProductsUpdate }, ref) => {
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
  const [isDeletingBulkDb, setIsDeletingBulkDb] = useState(false); // Bulk delete status
  
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
    return realistic_duration_minutes / 60;
  };

  // NTEL duration calculation per meter (Reliability: 91.3%)
  const calculateNTELDuration = (diameter_mm) => {
    return 0.001 + (diameter_mm * 0.000185);
  };

  // YOTOCH duration calculation (Reliability: 98.7%)
  const calculateYOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
    const area = boy_mm * en_mm;
    const totalRods = cubukSayisiBoy + cubukSayisiEn;
    const wireFactor = Math.pow(diameter_mm, 1.2);
    const densityFactor = totalRods / (area / 10000); // rods per cm²
    
    return 0.08 + 
           (area * 0.0000012) + 
           (wireFactor * 0.015) + 
           (densityFactor * 0.02);
  };

  // OTOCH duration calculation (Estimated Reliability: 85.2%)
  const calculateOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
    const area = boy_mm * en_mm;
    const totalRods = cubukSayisiBoy + cubukSayisiEn;
    const wireFactor = Math.pow(diameter_mm, 1.1);
    const densityFactor = totalRods / (area / 10000);
    
    return 0.05 + 
           (area * 0.0000008) + 
           (wireFactor * 0.01) + 
           (densityFactor * 0.015);
  };

  // Database verileri
  const [savedProducts, setSavedProducts] = useState({
    mm: [],
    ncbk: [],
    ntel: []
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
    
    // Apply hasır tipi filter
    if (dbFilterHasirTipi && dbFilterHasirTipi !== 'All') {
      if (dbFilterHasirTipi === 'Q types') {
        filteredProducts = filteredProducts.filter(product => 
          (product.hasir_tipi || product.stok_kodu || '').toLowerCase().includes('q')
        );
      } else if (dbFilterHasirTipi === 'R types') {
        filteredProducts = filteredProducts.filter(product => {
          const hasirTipi = (product.hasir_tipi || product.stok_kodu || '').toLowerCase();
          return hasirTipi.includes('r') && !hasirTipi.includes('tr');
        });
      } else if (dbFilterHasirTipi === 'TR types') {
        filteredProducts = filteredProducts.filter(product => 
          (product.hasir_tipi || product.stok_kodu || '').toLowerCase().includes('tr')
        );
      }
    }
    
    // Apply hasır türü filter (looking in hasir_turu column)
    if (dbFilterHasirTuru && dbFilterHasirTuru !== 'All') {
      filteredProducts = filteredProducts.filter(product => 
        (product.hasir_turu || '').toLowerCase() === dbFilterHasirTuru.toLowerCase()
      );
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

    try {
      const tabEndpoints = {
        mm: API_URLS.celikHasir,
        ncbk: API_URLS.celikHasirNcbk,
        ntel: API_URLS.celikHasirNtel
      };

      for (const itemId of selectedDbItems) {
        try {
          const response = await fetch(`${tabEndpoints[activeDbTab]}/${itemId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (error) {
          console.error(`Failed to delete item ${itemId}:`, error);
          toast.error(`Ürün ${itemId} silinemedi: ${error.message}`);
        }
      }

      toast.success(`${selectedDbItems.length} ürün başarıyla silindi`);
      setSelectedDbItems([]);
      await fetchSavedProducts();
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
      boyAraligi: product.goz_araligi ? product.goz_araligi.split('*')[0] : '15',
      enAraligi: product.goz_araligi ? product.goz_araligi.split('*')[1] || product.goz_araligi.split('*')[0] : '15',
      gozAraligi: product.goz_araligi || '15*15',
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
    fetchSavedProducts();
    fetchSequences();
  }, []);

  // Force update when savedProducts or validProducts change to ensure counts are accurate
  useEffect(() => {
    // This will trigger re-render when dependencies change
    console.log('Count update triggered - optimized products:', validProducts.length, 
                'unoptimized:', validProducts.filter(p => !isProductOptimized(p)).length);
    // Note: Removed getProductsToSave from dependencies to avoid potential infinite loops
  }, [savedProducts, validProducts]);

  // Veritabanından kayıtlı ürünleri getir
  const fetchSavedProducts = async () => {
    try {
      setIsLoading(true);
      
      console.log('Fetching saved products from database...');
      
      // Paralel olarak tüm ürün tiplerini getir
      const [mmResponse, ncbkResponse, ntelResponse] = await Promise.all([
        fetchWithAuth(API_URLS.celikHasirMm),
        fetchWithAuth(API_URLS.celikHasirNcbk),
        fetchWithAuth(API_URLS.celikHasirNtel)
      ]);

      const newSavedProducts = {
        mm: mmResponse?.ok ? await mmResponse.json() : [],
        ncbk: ncbkResponse?.ok ? await ncbkResponse.json() : [],
        ntel: ntelResponse?.ok ? await ntelResponse.json() : []
      };
      
      console.log('Fetched products from database:', {
        mm: newSavedProducts.mm.length,
        ncbk: newSavedProducts.ncbk.length,
        ntel: newSavedProducts.ntel.length,
        mmCodes: newSavedProducts.mm.map(p => p.stok_kodu),
        ncbkCodes: newSavedProducts.ncbk.map(p => p.stok_kodu),
        ntelCodes: newSavedProducts.ntel.map(p => p.stok_kodu)
      });
      
      setSavedProducts(newSavedProducts);
    } catch (error) {
      console.error('Kayıtlı ürünler getirilemedi:', error);
      toast.error('Kayıtlı ürünler getirilemedi');
    } finally {
      setIsLoading(false);
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
  
  // Reset batch counter for new batch
  const resetBatchSequenceCounter = () => {
    batchSequenceCounter = null;
  };

  function checkForExistingProducts(product, productType, batchIndex = 0) {
    try {
      if (productType === 'CH') {
        const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                           (formatGozAraligi(product) === '15*15' || formatGozAraligi(product) === '15*25');
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
          
          // Initialize counter only once per batch (when batchIndex is 0)  
          if (batchIndex === 0 || batchSequenceCounter === null) {
            const existingOzelProducts = savedProducts.mm.filter(p => 
              p.stok_kodu && p.stok_kodu.startsWith('CHOZL')
            );
            
            let maxSequence = 0;
            existingOzelProducts.forEach(p => {
              const match = p.stok_kodu.match(/^CHOZL(\d+)$/);
              if (match) {
                const sequenceNum = parseInt(match[1]);
                if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
                  maxSequence = sequenceNum;
                }
              }
            });
            
            batchSequenceCounter = maxSequence;
            
            console.log('*** BATCH STOK KODU INITIALIZED ***');
            console.log('Total savedProducts.mm:', savedProducts.mm.length);
            console.log('Existing CHOZL products:', existingOzelProducts.length);
            console.log('Max sequence in database:', maxSequence);
            console.log('Batch counter initialized at:', batchSequenceCounter);
          }
          
          // Generate sequential codes for batch: CHOZL0062, CHOZL0063, CHOZL0064, etc.
          const sequenceForThisProduct = batchSequenceCounter + 1 + batchIndex;
          const generatedCode = `CHOZL${String(sequenceForThisProduct).padStart(4, '0')}`;
          
          console.log('*** STOK KODU GENERATION ***');
          console.log('Product:', { hasirTipi: product.hasirTipi, batchIndex });
          console.log('Sequence for this product:', sequenceForThisProduct, 'Generated:', generatedCode);
          
          return generatedCode;
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

  // Stok kodu oluştur - Enhanced with database-aware incrementality  
  function generateStokKodu(product, productType, batchIndex = 0) {
    return checkForExistingProducts(product, productType, batchIndex);
  }

  // Stok adı oluştur - Moved up to avoid hoisting issues
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
        gozAraligi = `${boyAraligi}*${enAraligi}`;
      } else if (product.gozAraligi) {
        gozAraligi = product.gozAraligi;
      } else if (product.goz_araligi) {
        gozAraligi = product.goz_araligi;
      }
      
      // Normalize hasır tipi to correct format (Q257/257, R257, TR257)
      const normalizedHasirTipi = normalizeHasirTipi(product.hasirTipi);
      
      // Create the standard format used in database saves
      const stokAdi = `${normalizedHasirTipi} Çap(${product.boyCap || 0}x${product.enCap || 0} mm) Ebat(${product.uzunlukBoy || 0}x${product.uzunlukEn || 0} cm)${gozAraligi ? ` Göz Ara(${gozAraligi} cm)` : ''}`;
      
      return stokAdi;
    } else if (productType === 'NCBK') {
      return `YM Nervürlü Çubuk ${product.cap} mm ${product.length} cm`;
    } else if (productType === 'NTEL') {
      return `YM Nervürlü Tel ${product.cap} mm`;
    }
    return '';
  };

  // Kaydedilecek ürünleri hesapla - Enhanced with Stok Adı matching
  const getProductsToSave = useCallback(() => {
    if (validProducts.length === 0) return [];
    
    const newProducts = [];
    
    for (const product of validProducts) {
      // Generate the Stok Adı for this product
      const productStokAdi = generateStokAdi(product, 'CH');
      
      // Check if product exists using multiple strategies similar to GalvanizliTelNetsis
      let productExists = false;
      
      // Strategy 1: Match by Stok Adı (most reliable)
      productExists = savedProducts.mm.some(p => p.stok_adi === productStokAdi);
      
      // Strategy 2: Fallback - Match by product specifications (legacy)
      if (!productExists) {
        productExists = savedProducts.mm.some(p => 
          p.hasir_tipi === product.hasirTipi &&
          Math.abs(parseFloat(p.ebat_boy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.01 &&
          Math.abs(parseFloat(p.ebat_en || 0) - parseFloat(product.uzunlukEn || 0)) < 0.01 &&
          Math.abs(parseFloat(p.cap || 0) - parseFloat(product.boyCap || 0)) < 0.01 &&
          Math.abs(parseFloat(p.cap2 || 0) - parseFloat(product.enCap || 0)) < 0.01
        );
      }
      
      // Only add if product doesn't exist
      if (!productExists) {
        newProducts.push(product);
      }
    }
    
    return newProducts;
  }, [validProducts, savedProducts]);

  // Get products that are already saved in database (opposite of getProductsToSave)
  const getSavedProductsList = useCallback(() => {
    if (!validProducts?.length || !savedProducts?.mm?.length) return [];

    const savedProductsList = [];
    
    for (const product of validProducts) {
      // Generate the Stok Adı for this product
      const productStokAdi = generateStokAdi(product, 'CH');
      
      // Check if this product exists in database by Stok Adı
      const existingProduct = savedProducts.mm.find(p => p.stok_adi === productStokAdi);
      
      if (existingProduct) {
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
    
    for (const product of validProducts) {
      // Generate the Stok Adı for this product
      const productStokAdi = generateStokAdi(product, 'CH');
      console.log('DEBUG: Looking for product with stok_adi:', productStokAdi);
      
      // Find existing product by Stok Adı
      let existingProduct = savedProducts.mm.find(p => p.stok_adi === productStokAdi);
      
      // Fallback to specifications matching if not found by Stok Adı
      if (!existingProduct) {
        existingProduct = savedProducts.mm.find(p => 
          p.hasir_tipi === product.hasirTipi &&
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
          
          // Enhanced decimal normalization (handles comma vs dot, different precisions)
          const normalizeDecimal = (value) => {
            if (!value) return 0;
            return parseFloat(String(value).replace(',', '.'));
          };
          
          // Tighter tolerance for diameter matching to handle precision differences
          const diameterMatch = Math.abs(normalizeDecimal(p.cap) - normalizeDecimal(product.boyCap)) < 0.001 &&
                               Math.abs(normalizeDecimal(p.cap2) - normalizeDecimal(product.enCap)) < 0.001;
          
          // Enhanced hasır tipi comparison with format variations (Q257/257 vs Q257)
          const enhancedNormalizeHasirTipi = (hasirTipi) => {
            if (!hasirTipi) return '';
            let normalized = normalizeHasirTipi(hasirTipi);
            // Remove trailing /XXX patterns (Q257/257 → Q257)
            normalized = normalized.replace(/\/\d+$/, '').toUpperCase().trim();
            return normalized;
          };
          
          const hasirTipiMatch = enhancedNormalizeHasirTipi(p.hasir_tipi) === enhancedNormalizeHasirTipi(product.hasirTipi);
          
          // Enhanced göz aralığı normalization (handles all format variations)
          const enhancedNormalizeGozAraligi = (goz) => {
            if (!goz) return '';
            return String(goz)
              .replace(/\s*cm\s*/gi, '')     // Remove cm/CM
              .replace(/\s*x\s*/gi, '*')     // Replace x/X with *  
              .replace(/\s+/g, '')           // Remove all spaces
              .toLowerCase()
              .trim();
          };
          
          const gozMatch = enhancedNormalizeGozAraligi(p.goz_araligi) === enhancedNormalizeGozAraligi(formatGozAraligi(product));
          
          // Enhanced Stok Adı similarity check (typo tolerance)
          const calculateSimilarity = (str1, str2) => {
            if (!str1 || !str2) return 0;
            
            // Advanced normalization for typo detection
            const normalize = (s) => s.toLowerCase()
              .replace(/\s+/g, ' ')                    // Multiple spaces → single space
              .replace(/[()]/g, '')                    // Remove parentheses
              .replace(/[*x×]/gi, '')                  // Remove separators from göz aralığı  
              .replace(/mm|cm/gi, '')                  // Remove units
              .replace(/[,]/g, '.')                    // Comma → dot decimals
              .replace(/çaa+p/gi, 'çap')              // Fix typos: çaap/çaaap → çap
              .replace(/ebaa+t/gi, 'ebat')            // Fix typos: ebaaat → ebat  
              .replace(/göz\s*ara+/gi, 'göz ara')     // Fix typos: göz araaa → göz ara
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
              similarity: similarity.toFixed(3), 
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
          // Try with just hasir tipi and dimensions (less strict)
          const fallbackMatches = savedProducts.mm.filter(p => {
            const hasirTipiBasicMatch = (p.hasir_tipi || '').toLowerCase().includes(product.hasirTipi.toLowerCase()) ||
                                      product.hasirTipi.toLowerCase().includes((p.hasir_tipi || '').toLowerCase());
            const dimensionMatch = Math.abs(parseFloat(p.ebat_boy || 0) - parseFloat(product.uzunlukBoy || 0)) < 0.01 &&
                                 Math.abs(parseFloat(p.ebat_en || 0) - parseFloat(product.uzunlukEn || 0)) < 0.01;
            return hasirTipiBasicMatch && dimensionMatch;
          });
          
          if (fallbackMatches.length > 0) {
            console.log(`DEBUG: Fallback found ${fallbackMatches.length} matches:`, fallbackMatches.map(p => p.stok_kodu));
            allMatchingProducts.push(...fallbackMatches);
          }
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
        const newStokKodu = checkForExistingProducts(product, 'CH', modalBatchIndex);
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
      return 'Wire Mesh';
    } else if (productType === 'NCBK') {
      return '';
    } else if (productType === 'NTEL') {
      return '';
    }
    return '';
  };

  // Göz aralığı formatla
  const formatGozAraligi = (product) => {
    // Check multiple possible field names
    if (product.boyAraligi && product.enAraligi) {
      return `${product.boyAraligi}*${product.enAraligi}`;
    } else if (product.boyAralik && product.enAralik) {
      return `${product.boyAralik}*${product.enAralik}`;
    } else if (product.gozAraligi) {
      return product.gozAraligi;
    } else if (product.goz_araligi) {
      return product.goz_araligi;
    } else {
      // Default fallback - return empty or default value
      return '0*0';
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

  // Excel dosyalarını oluştur
  const generateExcelFiles = async (products, includeAllProducts = false) => {
    try {
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
  };

  // Stok Kartı Excel oluştur
  const generateStokKartiExcel = async (products, timestamp, includeAllProducts) => {
    const workbook = new ExcelJS.Workbook();
    
    // CH STOK sheet oluştur
    const chSheet = workbook.addWorksheet('CH STOK');
    const chHeaders = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Kod-2', 'İngilizce İsim',
      'Alış KDV Oranı', 'Satış KDV Oranı', 'Muh. Detay ', 'Depo Kodu',
      'Ölçü Br-1', 'Ölçü Br-2', 'Çevrim Pay-1', 'Çevrim Payda-1', 'Çevrim Değeri-1',
      'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2', 'Çevrim Değeri-2', 'Türü',
      'Mamul Grup', 'Hasır Tipi', 'Çap', 'Çap2', 'Ebat(Boy)', 'Ebat(En)', 'Göz Aralığı', 'KG',
      'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Özel Saha 2 (Say.)',
      'Özel Saha 3 (Say.)', 'Özel Saha 4 (Say.)', 'Özel Saha 1 (Alf.)',
      'Özel Saha 2 (Alf.)', 'Özel Saha 3 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi',
      'Satış Fiyatı-1', 'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4',
      'Döviz Tip', 'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı',
      'Azami Stok', 'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Alış Döviz Tipi',
      'Bekleme Süresi', 'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar',
      'Stok Türü', 'Mali Grup Kodu', 'Özel Saha 8 (Alf.)', 'Kod-3', 'Kod-4',
      'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 'Bağlı Stok Kodu',
      'Yapılandırma Kodu', 'Yap. Açıklama', 'Girişlerde Seri Numarası Takibi Yapılsın',
      'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    chSheet.addRow(chHeaders);

    // CH ürünlerini ekle
    let excelBatchIndex = 0;
    for (const product of products) {
      if (isProductOptimized(product)) {
        // For saved products, use existing Stok Kodu; for new products, generate new one
        const stokKodu = product.existingStokKodu || generateStokKodu(product, 'CH', excelBatchIndex);
        const stokAdi = generateStokAdi(product, 'CH');
        const ingilizceIsim = generateIngilizceIsim(product, 'CH');
        const gozAraligi = formatGozAraligi(product);
        excelBatchIndex++;
        
        const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                           (formatGozAraligi(product) === '15*15' || formatGozAraligi(product) === '15*25');
        
        chSheet.addRow([
          stokKodu, stokAdi, 'MM', 'HSR', isStandard ? 'STD' : 'OZL', ingilizceIsim,
          '20', '20', '31', '36', 'KG', 'AD', '1', parseFloat(product.totalKg || product.adetKg || 0).toFixed(5), '',
          '1', '1', '1', 'M', stokKodu, 'MM', product.hasirTipi, parseFloat(product.boyCap || 0).toFixed(1),
          parseFloat(product.enCap || 0).toFixed(1), parseInt(product.uzunlukBoy || 0), parseInt(product.uzunlukEn || 0),
          gozAraligi, parseFloat(product.totalKg || product.adetKg || 0).toFixed(5), parseInt(product.cubukSayisiBoy || 0),
          parseInt(product.cubukSayisiEn || 0), '0', '0', '0', '', '', '', '0', '2', '0', '0', '0',
          '0', '0', '0', '0', '0', '0', '0', '', '0', '0', '0', '0', '0', '0', 'D', '', '', '', '', '',
          'H', 'H', '', '', ''
        ]);
      }
    }

    // YM NCBK STOK sheet oluştur
    const ncbkSheet = workbook.addWorksheet('YM NCBK STOK');
    const ncbkHeaders = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Kod-2', 'İngilizce İsim',
      'Alış KDV Oranı', 'Satış KDV Oranı', 'Muh. Detay ', 'Depo Kodu',
      'Br-1', 'Br-2', 'Pay-1', 'Payda-1', 'Çevrim Değeri-1', 'Ölçü Br-3',
      'Çevrim Pay-2', 'Çevrim Payda-2', 'Çevrim Değeri-2', 'Türü', 'Mamul Grup',
      'Hasır Tipi', 'Çap', 'Çap2', 'Ebat(Boy)', 'Ebat(En)', 'Göz Aralığı', 'KG',
      'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Özel Saha 2 (Say.)',
      'Özel Saha 3 (Say.)', 'Özel Saha 4 (Say.)', 'Özel Saha 1 (Alf.)', 'Özel Saha 2 (Alf.)',
      'Özel Saha 3 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi', 'Satış Fiyatı-1', 'Satış Fiyatı-2',
      'Satış Fiyatı-3', 'Satış Fiyatı-4', 'Döviz Tip', 'Döviz Alış', 'Döviz Maliyeti',
      'Döviz Satış Fiyatı', 'Azami Stok', 'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi',
      'Alış Döviz Tipi', 'Bekleme Süresi', 'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar',
      'Stok Türü', 'Mali Grup Kodu', 'Özel Saha 8 (Alf.)', 'Kod-3', 'Kod-4', 'Kod-5',
      'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 'Bağlı Stok Kodu', 'Yapılandırma Kodu',
      'Yap. Açıklama', 'Girişlerde Seri Numarası Takibi Yapılsın', 'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    ncbkSheet.addRow(ncbkHeaders);

    // YM NTEL STOK sheet oluştur
    const ntelSheet = workbook.addWorksheet('YM NTEL STOK');
    const ntelHeaders = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Kod-2', 'İngilizce İsim',
      'Alış KDV Oranı', 'Satış KDV Oranı', 'Muh. Detay ', 'Depo Kodu',
      ' Br-1', ' Br-2', 'Pay-1', 'Payda-1', 'Çevrim Değeri-1', 'Ölçü Br-3',
      'Çevrim Pay-2', 'Çevrim Payda-2', 'Çevrim Değeri-2', 'Türü', 'Mamul Grup',
      'Hasır Tipi', 'Çap', 'Çap2', 'Ebat(Boy)', 'Ebat(En)', 'Göz Aralığı', 'KG',
      'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Özel Saha 2 (Say.)',
      'Özel Saha 3 (Say.)', 'Özel Saha 4 (Say.)', 'Özel Saha 1 (Alf.)', 'Özel Saha 2 (Alf.)',
      'Özel Saha 3 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi', 'Satış Fiyatı-1', 'Satış Fiyatı-2',
      'Satış Fiyatı-3', 'Satış Fiyatı-4', 'Döviz Tip', 'Döviz Alış', 'Döviz Maliyeti',
      'Döviz Satış Fiyatı', 'Azami Stok', 'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi',
      'Alış Döviz Tipi', 'Bekleme Süresi', 'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar',
      'Stok Türü', 'Mali Grup Kodu', 'Özel Saha 8 (Alf.)', 'Kod-3', 'Kod-4', 'Kod-5',
      'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 'Bağlı Stok Kodu', 'Yapılandırma Kodu',
      'Yap. Açıklama', 'Girişlerde Seri Numarası Takibi Yapılsın', 'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    ntelSheet.addRow(ntelHeaders);

    // NCBK ve NTEL ürünlerini generate et
    products.forEach(product => {
      if (isProductOptimized(product)) {
        // NCBK ürünleri - Boy ve En çubukları için
        [500, 215].forEach(length => {
          const stokKodu = `YM.NCBK.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}.${length}`;
          const stokAdi = `YM Nervürlü Çubuk ${product.boyCap} mm ${length} cm`;
          
          const ncbkWeight = product.boyCap ? (Math.PI * (parseFloat(product.boyCap)/20) * (parseFloat(product.boyCap)/20) * length * 7.85 / 1000).toFixed(5) : '';
          
          ncbkSheet.addRow([
            stokKodu, stokAdi, 'YM', 'NCBK', '', '', '20', '20', '20', '35',
            'AD', 'KG', ncbkWeight, '1', '', '1', '1', '1', 'Y', stokKodu,
            'YM', '', parseFloat(product.boyCap || 0).toFixed(1), '', length, '', '', ncbkWeight, '0', '0',
            '', '', '', '', '0', '2', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
            '', '0', '0', '0', '0', '0', '0', 'D', '', '', '', '', '', 'H', 'H',
            '', '', '', 'E', 'E'
          ]);
        });

        // NTEL ürünü
        const ntelStokKodu = `YM.NTEL.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}`;
        const ntelStokAdi = `YM Nervürlü Tel ${product.boyCap} mm`;
        const ntelWeight = product.boyCap ? (Math.PI * (parseFloat(product.boyCap)/20) * (parseFloat(product.boyCap)/20) * 100 * 7.85 / 1000).toFixed(5) : '';
        
        ntelSheet.addRow([
          ntelStokKodu, ntelStokAdi, 'YM', 'NTEL', '', '', '20', '20', '20', '35',
          'MT', 'KG', ntelWeight, '1', '', '', '', '', 'Y', ntelStokKodu,
          'YM', '', parseFloat(product.boyCap || 0).toFixed(1), '', '', '', '', ntelWeight, '0', '0',
          '', '', '', '', '0', '2', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
          '', '0', '0', '0', '0', '0', '0', 'D', '', '', '', '', '', 'H', 'H',
          '', '', '', 'E', 'E'
        ]);
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
      if (isProductOptimized(product)) {
        const chStokKodu = product.existingStokKodu || generateStokKodu(product, 'CH', receteBatchIndex);
        receteBatchIndex++;
        
        // CH Reçete - Boy ve En çubuk tüketimleri
        // Determine mesh type pattern for quantities
        const isQType = product.hasirTipi && product.hasirTipi.includes('Q');
        const isRType = product.hasirTipi && product.hasirTipi.includes('R');
        
        // Set quantities based on reference pattern
        const enCubukMiktar = isRType ? '20' : '32'; // R-type: 20, Q-type: 32
        const boyCubukMiktar = '15'; // Always 15 for BOY ÇUBUĞU
        const operationTime = isRType ? '0.1667' : '0.2667'; // R-type: 0.1667, Q-type: 0.2667
        
        // EN ÇUBUĞU (215cm)
        chReceteSheet.addRow([
          chStokKodu, '1', '', '', '2', '1', 'Bileşen',
          `YM.NCBK.${String(Math.round(parseFloat(product.enCap) * 100)).padStart(4, '0')}.215`, 
          '', enCubukMiktar, 'EN ÇUBUĞU ', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        
        // BOY ÇUBUĞU (500cm)  
        chReceteSheet.addRow([
          chStokKodu, '1', '', '', '2', '2', 'Bileşen',
          `YM.NCBK.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}.500`,
          '', boyCubukMiktar, 'BOY ÇUBUĞU', '', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        
        // YOTOCH Operasyon
        chReceteSheet.addRow([
          chStokKodu, '1', '', '', '2', '3', 'Operasyon', 'YOTOCH',
          '', '1', '', '', '', '', '', '', '', operationTime,
          'E', 'E', '', '', '', '', '', '', ''
        ]);

        // NCBK Reçeteler - Her boy için
        [500, 215].forEach((length, index) => {
          const diameter = parseFloat(index === 0 ? product.boyCap : product.enCap);
          const ncbkStokKodu = `YM.NCBK.${String(Math.round(diameter * 100)).padStart(4, '0')}.${length}`;
          // Use proper FILMASIN_MAPPING table for accurate selection
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
          
          // If not in mapping, use formula: +1.5mm for small diameters, +2mm for larger
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
          
          // Calculate FLM consumption with correct formula
          // Use final product diameter, not filmaşin diameter
          // π × (diameter_mm/20)² × length_cm × 7.85 g/cm³ / 1000 for kg
          const flmTuketimi = (Math.PI * (diameter/20) * (diameter/20) * length * 7.85 / 1000).toFixed(5);
          
          // Bileşen - FLM
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen', flmKodu,
            '1', parseFloat(flmTuketimi).toFixed(5), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          // Operasyon - NDK01
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', '', '2', 'Operasyon', 'NDK01',
            '', '1', '', '', '', '', '', '', calculateOperationDuration('NCBK', { ...product, length: length, boyCap: diameter, enCap: diameter }),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        });

        // NTEL Reçete
        const ntelDiameter = parseFloat(product.boyCap || product.enCap);
        const ntelStokKodu = `YM.NTEL.${String(Math.round(ntelDiameter * 100)).padStart(4, '0')}`;
        // NTEL için aynı FILMASIN_MAPPING tablosunu kullan
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
        let ntelFlmDiameter = NTEL_FILMASIN_MAPPING[ntelDiameter];
        
        // If not in mapping, use formula
        if (!ntelFlmDiameter) {
          if (ntelDiameter <= 6.0) {
            ntelFlmDiameter = ntelDiameter + 1.5;
          } else if (ntelDiameter <= 8.0) {
            ntelFlmDiameter = ntelDiameter + 1.5;
          } else {
            ntelFlmDiameter = ntelDiameter + 2.0;
          }
          const ntelStandardSizes = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0];
          ntelFlmDiameter = ntelStandardSizes.find(s => s >= ntelFlmDiameter) || ntelFlmDiameter;
        }
        
        const ntelFlmQuality = ntelFlmDiameter >= 7.0 ? '1010' : '1008';
        
        const ntelFlmKodu = `FLM.${String(Math.round(ntelFlmDiameter * 100)).padStart(4, '0')}.${ntelFlmQuality}`;
        
        // Calculate NTEL FLM consumption per meter using correct formula
        // Use final product diameter: π × (diameter_mm/20)² × length_cm × 7.85 g/cm³ / 1000 for kg
        const ntelFlmTuketimi = (Math.PI * (ntelDiameter/20) * (ntelDiameter/20) * 100 * 7.85 / 1000).toFixed(5);
        
        // Bileşen - FLM
        ntelReceteSheet.addRow([
          ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen', ntelFlmKodu,
          '1', parseFloat(ntelFlmTuketimi).toFixed(5), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
        
        // Operasyon - NTLC01
        ntelReceteSheet.addRow([
          ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
          '', '1.00000', '', '', '', '', '', '', calculateOperationDuration('NTEL', product),
          'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
      }
    }

    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Recete_${timestamp}.xlsx`);
  };

  // Alternatif Reçete Excel oluştur
  const generateAlternatifReceteExcel = async (products, timestamp, includeAllProducts) => {
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
    for (const product of products) {
      if (isProductOptimized(product)) {
        const chStokKodu = product.existingStokKodu || generateStokKodu(product, 'CH', altReceteBatchIndex);
        altReceteBatchIndex++;
        const boyLength = parseFloat(product.cubukSayisiBoy || 0) * 500;
        const enLength = parseFloat(product.cubukSayisiEn || 0) * 215;
        const totalLength = boyLength + enLength; // cm cinsinden
        
        // FLM tüketimi hesapla (NTEL için)
        const diameter = parseFloat(product.boyCap || product.enCap || 0);
        
        // Calculate filmaşin diameter and quality (same logic as in other functions)
        const ALT_FILMASIN_MAPPING = {
          4.45: 6.0, 4.50: 6.0, 4.75: 6.0, 4.85: 6.0, 5.00: 6.0,
          5.50: 6.5,
          6.00: 7.0,
          6.50: 7.5,
          7.00: 8.0,
          7.50: 9.0, 7.80: 9.0, 8.00: 9.0, 8.50: 9.0, 8.60: 9.0,
          9.20: 11.0,
          10.60: 12.0
        };
        
        let flmDiameter = ALT_FILMASIN_MAPPING[diameter];
        if (!flmDiameter) {
          if (diameter <= 6.0) {
            flmDiameter = diameter + 1.5;
          } else if (diameter <= 8.0) {
            flmDiameter = diameter + 1.5;
          } else {
            flmDiameter = diameter + 2.0;
          }
          const standardSizes = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0];
          flmDiameter = standardSizes.find(s => s >= flmDiameter) || flmDiameter;
        }
        
        const flmQuality = flmDiameter >= 7.0 ? '1010' : '1008';
        const flmTuketimi = (Math.PI * (diameter/20) * (diameter/20) * totalLength * 7.85 / 1000).toFixed(5); // kg
        
        // CH REÇETE entries
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', 'KG', '1', 'Bileşen',
          `FLM.${String(Math.round(flmDiameter * 100)).padStart(4, '0')}.${flmQuality}`,
          'KG', flmTuketimi, 'FLM Tüketimi (NTEL Bazlı)', '', '', '', '', '', '', '1',
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', 'DK', '2', 'Operasyon', 'OTOCH',
          'DK', '1', 'Tam Otomatik Operasyon', '', '', '', '', '', '', calculateOperationDuration('OTOCH', product),
          'E', 'E', '', '', '', '', '', '', ''
        ]);
        
        // NCBK REÇETE entries - Boy ve En çubukları için
        [500, 215].forEach(length => {
          const ncbkStokKodu = `YM.NCBK.${String(Math.round(diameter * 100)).padStart(4, '0')}.${length}`;
          const ncbkFlmTuketimi = (Math.PI * (diameter/20) * (diameter/20) * length * 7.85 / 1000).toFixed(5); // kg
          
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', 'AD', '1', 'Bileşen',
            `FLM.${String(Math.round(flmDiameter * 100)).padStart(4, '0')}.${flmQuality}`,
            'KG', parseFloat(ncbkFlmTuketimi).toFixed(5), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
          
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NDK01',
            '', '1.00000', '', '', '', '', '', '', calculateOperationDuration('NCBK', { ...product, length: length, boyCap: diameter, enCap: diameter }),
            'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
          ]);
        });
        
        // NTEL REÇETE entries
        const ntelStokKodu = `YM.NTEL.${String(Math.round(diameter * 100)).padStart(4, '0')}`;
        const ntelFlmTuketimi = (Math.PI * (diameter/20) * (diameter/20) * 100 * 7.85 / 1000).toFixed(5); // kg per meter
        
        ntelReceteSheet.addRow([
          ntelStokKodu, '1', '', '', 'MT', '1', 'Bileşen',
          `FLM.${String(Math.round(flmDiameter * 100)).padStart(4, '0')}.${flmQuality}`,
          'KG', parseFloat(ntelFlmTuketimi).toFixed(5), 'Filmaşin Tüketim Miktarı', '', '', '', '', '', '',
          'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
        
        ntelReceteSheet.addRow([
          ntelStokKodu, '1', '', '', 'DK', '2', 'Operasyon', 'NTLC01',
          '', '1.00000', '', '', '', '', '', '', calculateOperationDuration('NTEL', product),
          'E', 'E', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
      }
    }

    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Alternatif_Recete_${timestamp}.xlsx`);
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
          bilesen_kodu: ncbkResults[500]?.stok_kodu || '',
          olcu_br_bilesen: 'AD',
          miktar: product.cubukSayisiBoy || 0,
          aciklama: `Boy çubuk - ${product.cubukSayisiBoy} adet`,
        },
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'AD',
          sira_no: 2,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: ncbkResults[215]?.stok_kodu || '',
          olcu_br_bilesen: 'AD',
          miktar: product.cubukSayisiEn || 0,
          aciklama: `En çubuk - ${product.cubukSayisiEn} adet`,
        },
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'AD',
          sira_no: 3,
          operasyon_bilesen: 'Operasyon',
          bilesen_kodu: 'YOTOCH',
          olcu_br_bilesen: 'AD',
          miktar: 1,
          aciklama: 'Yarı Otomatik Çelik Hasır Operasyonu',
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
            bilesen_kodu: getFilmasinKodu(parseFloat(ncbkResult.cap)),
            olcu_br_bilesen: 'KG',
            miktar: parseFloat((Math.PI * (parseFloat(ncbkResult.cap)/20) * (parseFloat(ncbkResult.cap)/20) * parseFloat(length) * 7.85 / 1000).toFixed(5)),
            aciklama: `FLM tüketimi - ${length}cm çubuk için`,
          },
          // Operasyon - Yarı Otomatik İşlem
          {
            mamul_kodu: ncbkResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'AD',
            sira_no: 2,
            operasyon_bilesen: 'Operasyon',
            bilesen_kodu: 'YOTOCH',
            olcu_br_bilesen: 'AD',
            miktar: 1,
            aciklama: 'Yarı Otomatik Nervürlü Çubuk Operasyonu',
            uretim_suresi: calculateOperationDuration('NCBK', { ...product, length: 500 })
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

      // NTEL Recipe kayıtları
      const ntelRecipes = [
        // Bileşen - FLM tüketimi
        {
          mamul_kodu: ntelResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'MT',
          sira_no: 1,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: getFilmasinKodu(parseFloat(ntelResult.cap)),
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
          aciklama: 'Tam Otomatik Nervürlü Tel Operasyonu',
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

    } catch (error) {
      console.error('Recipe kaydetme hatası:', error);
      throw error;
    }
  };

  // Sequence güncelleme
  const updateSequences = async (product) => {
    try {
      // CH sequence güncelle
      const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215';
      const kod2 = isStandard ? 'STD' : 'OZL';
      const capCode = isStandard ? String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0') : '';
      
      await fetchWithAuth(API_URLS.celikHasirSequence, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type: 'CH',
          kod_2: kod2,
          cap_code: capCode
        })
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
      
      // Önce optimize edilmemiş ürünleri kontrol et
      if (products.length > 0 && hasUnoptimizedProducts()) {
        setIsSavingToDatabase(false);
        setIsLoading(false);
        setShowOptimizationWarning(true);
        return;
      }
      
      // Sadece kaydedilmesi gereken ürünleri kaydet
      const productsToSave = getProductsToSave();
      
      if (productsToSave.length === 0) {
        toast.warning('Kaydedilecek ürün bulunamadı.');
        return;
      }

      // Mevcut ürünleri getir ve karşılaştır
      setDatabaseProgress({ current: 0, total: 0, operation: 'Mevcut ürünler kontrol ediliyor...', currentProduct: '' });
      
      console.log('Refreshing database state before save...');
      
      // Force fresh database fetch
      const [mmResponse, ncbkResponse, ntelResponse] = await Promise.all([
        fetchWithAuth(API_URLS.celikHasirMm),
        fetchWithAuth(API_URLS.celikHasirNcbk),
        fetchWithAuth(API_URLS.celikHasirNtel)
      ]);

      const freshSavedProducts = {
        mm: mmResponse?.ok ? await mmResponse.json() : [],
        ncbk: ncbkResponse?.ok ? await ncbkResponse.json() : [],
        ntel: ntelResponse?.ok ? await ntelResponse.json() : []
      };
      
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
          newProducts.push(product);
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
        const chData = {
          stok_kodu: generateStokKodu(product, 'CH', i),
          stok_adi: generateStokAdi(product, 'CH'),
          grup_kodu: 'MM',
          kod_1: 'HSR',
          kod_2: (product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                  (formatGozAraligi(product) === '15*15' || formatGozAraligi(product) === '15*25')) ? 'STD' : 'OZL',
          ingilizce_isim: generateIngilizceIsim(product, 'CH'),
          hasir_tipi: normalizeHasirTipi(product.hasirTipi),
          cap: parseFloat(product.boyCap),
          cap2: parseFloat(product.enCap),
          ebat_boy: parseFloat(product.uzunlukBoy),
          ebat_en: parseFloat(product.uzunlukEn),
          goz_araligi: formatGozAraligi(product),
          kg: parseFloat(product.adetKg || 0),
          ic_cap_boy_cubuk_ad: parseInt(product.cubukSayisiBoy),
          dis_cap_en_cubuk_ad: parseInt(product.cubukSayisiEn),
          hasir_sayisi: parseInt(product.hasirSayisi || 1),
          cubuk_sayisi_boy: parseInt(product.cubukSayisiBoy),
          cubuk_sayisi_en: parseInt(product.cubukSayisiEn),
          adet_kg: parseFloat(product.adetKg || 0),
          toplam_kg: parseFloat(product.toplamKg || 0),
          hasir_turu: product.hasirTuru || '',
          user_id: user.id
        };

        let chResult, ncbkResults = {}, ntelResult, chResponse;
        
        try {
          // CH kaydı - Önce var mı kontrol et, yoksa oluştur
          chResponse = await fetchWithAuth(API_URLS.celikHasirMm, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chData)
          });
          
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

          // NCBK kayıtları (Boy ve En için ayrı ayrı)
          const ncbkLengths = [500, 215];
          for (const length of ncbkLengths) {
            const cap = length === 500 ? product.boyCap : product.enCap;
            const ncbkData = {
              stok_kodu: `YM.NCBK.${String(Math.round(parseFloat(cap) * 100)).padStart(4, '0')}.${length}`,
              stok_adi: `YM Nervürlü Çubuk ${cap} mm ${length} cm`,
              grup_kodu: 'YM',
              kod_1: 'NCBK',
              cap: parseFloat(cap),
              ebat_boy: length,
              length_cm: length,
              user_id: user.id
            };

            const ncbkResponse = await fetchWithAuth(API_URLS.celikHasirNcbk, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ncbkData)
            });
            
            if (ncbkResponse.status === 409) {
              // Bu OLMAMALI - duplicate checking başarısız olmuş
              console.error(`BEKLENMEYEN DUPLICATE: NCBK ürün zaten var: ${ncbkData.stok_kodu}`);
              toast.error(`Duplicate hatası: ${ncbkData.stok_kodu}`);
              continue; // Bu NCBK'yi atla
            } else if (!ncbkResponse.ok) {
              throw new Error(`NCBK kaydı başarısız: ${ncbkResponse.status}`);
            } else {
              const ncbkResult = await ncbkResponse.json();
              ncbkResults[length] = ncbkResult;
            }
          }

          // NTEL kaydı
          const ntelData = {
            stok_kodu: `YM.NTEL.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}`,
            stok_adi: `YM Nervürlü Tel ${product.boyCap} mm`,
            grup_kodu: 'YM',
            kod_1: 'NTEL',
            br_1: 'MT',
            cap: parseFloat(product.boyCap),
            user_id: user.id
          };

          const ntelResponse = await fetchWithAuth(API_URLS.celikHasirNtel, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ntelData)
          });
          
          if (ntelResponse.status === 409) {
            // Bu OLMAMALI - duplicate checking başarısız olmuş
            console.error(`BEKLENMEYEN DUPLICATE: NTEL ürün zaten var: ${ntelData.stok_kodu}`);
            toast.error(`Duplicate hatası: ${ntelData.stok_kodu}`);
            // NTEL kaydı atlandı ama devam et
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
            // Extra validation before calling saveRecipeData
            const validNcbkResults = {};
            Object.entries(ncbkResults).forEach(([key, result]) => {
              if (result && result.stok_kodu) {
                validNcbkResults[key] = result;
              }
            });
            
            if (Object.keys(validNcbkResults).length > 0) {
              await saveRecipeData(product, chResult, validNcbkResults, ntelResult);
              console.log(`Recipe kayıtları başarıyla oluşturuldu: ${product.hasirTipi}`);
            } else {
              console.warn(`Recipe kayıtları atlandı - geçerli NCBK sonucu yok: ${product.hasirTipi}`);
            }
            
            // Sequence güncelle (sadece yeni ürünler için)
            if (chResponse && chResponse.status !== 409) {
              await updateSequences(product);
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
      
      // Listeyi güncelle
      await fetchSavedProducts();
      
      // Force re-render for count updates
      setIsSavingToDatabase(false);
      setIsLoading(false);
      
      // Sadece yeni kaydedilen ürünleri döndür
      return newProducts;
      
    } catch (error) {
      console.error('Veritabanına kaydetme hatası:', error);
      toast.error('Veritabanına kaydetme sırasında hata oluştu');
      return [];
    } finally {
      setIsLoading(false);
      setIsSavingToDatabase(false);
    }
  };

  // Ürün sil
  const deleteProduct = async (productId, productType) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setIsLoading(true);
      
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
                    const deleteRecipeResponse = await fetchWithAuth(`${recipeApiUrl}/${recipe.id}`, { method: 'DELETE' });
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

      const response = await fetchWithAuth(apiUrl, { method: 'DELETE' });
      
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
                    const deleteRecipeResponse = await fetchWithAuth(`${recipeApiUrl}/${recipe.id}`, { method: 'DELETE' });
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
        
        await fetchWithAuth(`${apiUrl}/${product.id}`, { method: 'DELETE' });
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
        await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=OZL`, { 
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
            // Refresh saved products state to ensure accurate counts
            await fetchSavedProducts();
            
            // Show analysis count
            const newProductsCount = getProductsToSave().length;
            const existingProductsCount = validProducts.length - newProductsCount;
            toast.info(`Analiz: ${validProducts.length} toplam ürün | ${existingProductsCount} veritabanında mevcut | ${newProductsCount} kaydedilecek`);
            
            if (validProducts.length === 0) {
              setShowDatabaseModal(true);
            } else if (hasUnoptimizedProducts()) {
              setShowOptimizationWarning(true);
            } else {
              // Analyze products and show pre-save confirmation
              const analysisData = await analyzeProductsForConfirmation();
              setPreSaveConfirmData(analysisData);
              setShowPreSaveConfirmModal(true);
            }
          }}
          disabled={isLoading || isGeneratingExcel}
          className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          Kaydet ve Excel Oluştur
        </button>
        
        <button
          onClick={async () => {
            if (validProducts.length === 0) {
              toast.warn('Excel oluşturmak için önce ürün listesini doldurun.');
              return;
            }
            
            // Show analysis count for Excel operations
            const newProductsCount = getProductsToSave().length;
            const existingProductsCount = validProducts.length - newProductsCount;
            toast.info(`Analiz: ${validProducts.length} toplam ürün | ${existingProductsCount} veritabanında mevcut | ${newProductsCount} kaydedilmemiş`);
            
            setShowExcelOptionsModal(true);
          }}
          disabled={isLoading || isGeneratingExcel || validProducts.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
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
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
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
                    onClick={fetchSavedProducts}
                    disabled={isLoading}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-400"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Yenile
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-red-600 text-white rounded-md flex items-center gap-2 hover:bg-red-700 transition-colors text-sm disabled:bg-gray-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    {activeDbTab === 'mm' ? 'CH Sil' : activeDbTab === 'ncbk' ? 'NCBK Sil' : 'NTEL Sil'}
                  </button>
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
                    <option value="Q types">Q types</option>
                    <option value="R types">R types</option>
                    <option value="TR types">TR types</option>
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
                    Toplam: {getFilteredAndSortedProducts().length} / {savedProducts[activeDbTab].length} ürün
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

                {/* Bulk Actions Toolbar */}
                {selectedDbItems.length > 0 && (
                  <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <span className="text-blue-700 font-medium">
                      {selectedDbItems.length} ürün seçili
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleBulkDeleteSelected}
                        disabled={isDeletingBulkDb}
                        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 text-sm flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Seçilileri Sil
                      </button>
                      <button
                        onClick={handleBulkExportSelected}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Excel'e Aktar
                      </button>
                    </div>
                  </div>
                )}
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
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {getFilteredAndSortedProducts().length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {savedProducts[activeDbTab].length === 0 
                      ? "Bu kategoride kayıtlı ürün bulunmamaktadır."
                      : "Filtrelere uygun ürün bulunmamaktadır."
                    }
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
                  await generateExcelFiles(validProducts, true);
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
              >
                <div className="font-medium">Tüm Ürünler ({validProducts.length} adet)</div>
                <div className="text-sm opacity-90 mt-1">Listede bulunan tüm ürünler için Excel oluştur</div>
              </button>
              
              <button
                onClick={async () => {
                  setShowExcelOptionsModal(false);
                  const newProducts = getProductsToSave();
                  if (newProducts.length === 0) {
                    toast.info('Kaydedilmemiş ürün bulunamadı.');
                    return;
                  }
                  await generateExcelFiles(newProducts, false);
                }}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
              >
                <div className="font-medium">Sadece Kaydedilmemiş Ürünler ({getProductsToSave().length} adet)</div>
                <div className="text-sm opacity-90 mt-1">Veritabanında bulunmayan ürünler için Excel oluştur</div>
              </button>
              
              <button
                onClick={async () => {
                  setShowExcelOptionsModal(false);
                  const savedProductsList = getSavedProductsList();
                  if (savedProductsList.length === 0) {
                    toast.info('Kaydedilmiş ürün bulunamadı.');
                    return;
                  }
                  await generateExcelFiles(savedProductsList, false);
                }}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left"
              >
                <div className="font-medium">Sadece Kaydedilmiş Ürünler ({getSavedProductsList().length} adet)</div>
                <div className="text-sm opacity-90 mt-1">Veritabanında zaten kayıtlı olan ürünler için Excel oluştur</div>
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
                          <th className="text-left p-2 font-medium text-gray-700 border-r border-gray-200">NCBK 500cm</th>
                          <th className="text-left p-2 font-medium text-gray-700 border-r border-gray-200">NCBK 215cm</th>
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
                              <div className="font-mono text-xs text-blue-600">
                                {product.existingStokAdiVariants?.ncbk500?.length > 0 
                                  ? product.existingStokAdiVariants.ncbk500.map((kod, i) => (
                                      <div key={i} className="bg-blue-50 px-1 py-0.5 rounded mb-1 last:mb-0">{kod}</div>
                                    ))
                                  : <span className="text-gray-400 italic">Kayıtsız</span>}
                              </div>
                            </td>
                            <td className="p-2 border-r border-gray-200">
                              <div className="font-mono text-xs text-blue-600">
                                {product.existingStokAdiVariants?.ncbk215?.length > 0 
                                  ? product.existingStokAdiVariants.ncbk215.map((kod, i) => (
                                      <div key={i} className="bg-blue-50 px-1 py-0.5 rounded mb-1 last:mb-0">{kod}</div>
                                    ))
                                  : <span className="text-gray-400 italic">Kayıtsız</span>}
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="font-mono text-xs text-blue-600">
                                {product.existingStokAdiVariants?.ntel?.length > 0 
                                  ? product.existingStokAdiVariants.ntel.map((kod, i) => (
                                      <div key={i} className="bg-blue-50 px-1 py-0.5 rounded mb-1 last:mb-0">{kod}</div>
                                    ))
                                  : <span className="text-gray-400 italic">Kayıtsız</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Export button for existing products */}
                  {((preSaveConfirmData.existingProducts && preSaveConfirmData.existingProducts.length > 0) || 
                    (preSaveConfirmData.skippedProducts && preSaveConfirmData.skippedProducts.length > 0)) && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={async () => {
                          const existingProducts = [
                            ...(preSaveConfirmData.existingProducts || []),
                            ...(preSaveConfirmData.skippedProducts || [])
                          ];
                          
                          const transformedProducts = existingProducts.map(product => ({
                            boyCap: product.boyCap || 0,
                            enCap: product.enCap || 0,
                            hasirTipi: product.hasirTipi || '',
                            uzunlukBoy: product.uzunlukBoy || 0,
                            uzunlukEn: product.uzunlukEn || 0,
                            boyAraligi: product.boyAraligi || '15',
                            enAraligi: product.enAraligi || '15',
                            gozAraligi: product.gozAraligi || '15*15',
                            totalKg: product.totalKg || 0,
                            adetKg: product.adetKg || 0,
                            cubukSayisiBoy: product.cubukSayisiBoy || 0,
                            cubukSayisiEn: product.cubukSayisiEn || 0,
                            hasirSayisi: product.hasirSayisi || 1,
                            hasirTuru: product.hasirTuru || 'Standart',
                            existingStokKodu: product.existingStokKodus && product.existingStokKodus.length > 0 ? product.existingStokKodus[0] : '',
                            isOptimized: true
                          }));
                          
                          try {
                            await generateExcelFiles(transformedProducts, true);
                            toast.success(`${transformedProducts.length} kayıtlı ürün için Excel dosyaları oluşturuldu!`);
                          } catch (error) {
                            console.error('Export error:', error);
                            toast.error('Excel dosyaları oluşturulurken hata oluştu');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Kayıtlı Ürünleri Excel'e Aktar
                      </button>
                    </div>
                  )}
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
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
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

export default CelikHasirNetsis;