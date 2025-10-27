'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
// Using native HTML table elements instead of shadcn/ui components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { 
  Undo2, 
  Redo2, 
  RotateCcw, 
  Filter, 
  ArrowUpDown,
  Merge,
  AlertTriangle,
  Check,
  X,
  GripVertical,
  ChevronDown,
  Settings,
  Layers,
  RefreshCw,
  FileSpreadsheet,
  Trash2,
  ArrowLeft
} from 'lucide-react';

interface Product {
  id: string;
  hasirTipi: string;
  hasirTuru: string;
  uzunlukBoy: number;
  uzunlukEn: number;
  hasirSayisi: number;
  boyCap: number;
  enCap: number;
  boyAraligi: number;
  enAraligi: number;
  cubukSayisiBoy: number;
  cubukSayisiEn: number;
  solFiliz: number;
  sagFiliz: number;
  onFiliz: number;
  arkaFiliz: number;
  adetKg: number;
  toplamKg: number;
  isOptimized: boolean;
  uretilemez: boolean;
  aciklama: string;
  mergeHistory?: string[];
  advancedOptimizationNotes?: string; // Separate field for advanced optimization notes
}

interface HistoryState {
  products: Product[];
  timestamp: number;
}

interface MergeOperation {
  type: 'boydan' | 'enden' | 'katli' | 'katli_exact' | 'katli_tolerance' | 'tamamla' | 'tipi_degisiklik' | 'tipi_degisiklik_same' | 'tipi_degisiklik_cross' | 'smart_multi';
  source: Product;
  target: Product;
  result: Product;
  explanation: string;
  toleranceUsed: number; // Actual tolerance used for this operation
  safetyLevel: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk' | 'risky'; // Safety indicator
  safetyLevelNumber: number; // 0-10 numeric safety level for sorting
  approved?: boolean; // Whether this operation has been approved
  skipped?: boolean; // Whether this operation has been skipped
  smartData?: {
    involvedProducts: Product[];
    traditionalAlternative: {
      steps: number;
      totalTolerance: number;
      feasible: boolean;
      path?: string[];
    };
    smartOption: {
      type: string;
      steps: number;
      finalDimensions: string;
      toleranceBoy: number;
      toleranceEn: number;
      totalTolerance: number;
    };
  };
}

// Helper function to determine safety level based on tolerance used (0-10 scale)
const getSafetyLevel = (toleranceUsed: number, isHasirTipiChange: boolean = false, isFoldingOperation: boolean = false): { level: number; category: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk' | 'risky' } => {
  // Cross-group Hasır Tipi changes (Q→T, T→R) are always maximum risk
  // Same-group changes (Q→Q, T→T, R→R) use normal tolerance-based safety
  if (isHasirTipiChange) return { level: 10, category: 'risky' };
  
  // Folding operations are never 'safe', even with 0 tolerance
  if (isFoldingOperation) {
    if (toleranceUsed === 0) return { level: 1, category: 'low_risk' };     // Exact folding - light green
    if (toleranceUsed <= 10) return { level: 2, category: 'low_risk' };     // Low tolerance folding
    if (toleranceUsed <= 20) return { level: 4, category: 'medium_risk' };  // Medium tolerance folding
    return { level: 6, category: 'high_risk' };                             // High tolerance folding
  }
  
  // Regular merge operations
  if (toleranceUsed === 0) return { level: 0, category: 'safe' };           // Perfect match - dark green
  if (toleranceUsed <= 5) return { level: 1, category: 'low_risk' };        // Very low tolerance  
  if (toleranceUsed <= 10) return { level: 2, category: 'low_risk' };       // Low tolerance
  if (toleranceUsed <= 20) return { level: 4, category: 'medium_risk' };    // Medium risk - yellow
  if (toleranceUsed <= 30) return { level: 6, category: 'high_risk' };      // Higher risk - orange
  if (toleranceUsed <= 50) return { level: 8, category: 'risky' };          // Risky - red
  return { level: 10, category: 'risky' };                                  // Very risky - dark red
};

// Helper functions for standardized display  
const getSafetyDisplay = (safetyLevel: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk' | 'risky', toleranceUsed: number, safetyLevelNumber?: number) => {
  const configs = {
    safe: { bgClass: 'bg-green-600 text-white', text: 'Güvenli', icon: '✓' },
    low_risk: { 
      bgClass: toleranceUsed <= 5 ? 'bg-green-500 text-white' : 'bg-green-400 text-white', 
      text: toleranceUsed <= 5 ? 'Çok Düşük Risk' : 'Düşük Risk', 
      icon: '✓' 
    },
    medium_risk: { bgClass: 'bg-yellow-500 text-black', text: 'Orta Risk', icon: '⚠' },
    high_risk: { bgClass: 'bg-orange-500 text-white', text: 'Yüksek Risk', icon: '⚠' },
    risky: { bgClass: 'bg-red-600 text-white', text: 'Riskli', icon: '⚠' }
  };
  const levelDisplay = safetyLevelNumber !== undefined ? ` [${safetyLevelNumber}]` : '';
  return {
    ...configs[safetyLevel],
    fullText: `${configs[safetyLevel].icon} ${configs[safetyLevel].text.toUpperCase()}${levelDisplay} - ${toleranceUsed.toFixed(1)}cm tolerans`
  };
};

const getQuantityColor = (quantity: number) => {
  if (quantity <= 40) return 'bg-green-600 text-white';
  if (quantity <= 60) return 'bg-yellow-600 text-white';
  if (quantity <= 100) return 'bg-orange-600 text-white';
  return 'bg-red-600 text-white';
};

const getQuantityLabel = (quantity: number) => {
  if (quantity <= 40) return 'Düşük';
  if (quantity <= 60) return 'Orta';
  if (quantity <= 100) return 'Yüksek';
  return 'Çok Yüksek';
};

// Check if a product is deleted (exists in history but not in current products)
const isProductDeleted = (productId: string, products: Product[], history: HistoryState[]) => {
  if (history.length <= 1) return false;
  
  // Check if product exists in current state
  const existsInCurrent = products.some(p => p.id === productId);
  if (existsInCurrent) return false;
  
  // Check if product existed in any previous history state
  for (let i = 0; i < history.length - 1; i++) {
    const existedBefore = history[i].products.some(p => p.id === productId);
    if (existedBefore) return true;
  }
  
  return false;
};

// Get all deleted products from history
const getDeletedProducts = (products: Product[], history: HistoryState[]) => {
  if (history.length <= 1) return [];
  
  const allHistoricalProducts = new Map();
  
  // Collect all products from all history states
  history.forEach(state => {
    state.products.forEach(product => {
      if (!allHistoricalProducts.has(product.id)) {
        allHistoricalProducts.set(product.id, product);
      }
    });
  });
  
  // Find products that exist in history but not in current state
  const currentProductIds = new Set(products.map(p => p.id));
  const deletedProducts: (Product & { isDeleted: boolean })[] = [];
  
  allHistoricalProducts.forEach((product, id) => {
    if (!currentProductIds.has(id)) {
      deletedProducts.push({ ...product, isDeleted: true });
    }
  });
  
  return deletedProducts;
};

const CelikHasirOptimizasyonContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  
  // Debug wrapper for setProducts
  const setProductsWithDebug = (newProducts: Product[] | ((prev: Product[]) => Product[])) => {
    if (typeof newProducts === 'function') {
      setProducts(prev => {
        const result = newProducts(prev);
        console.log(`🔄 SET PRODUCTS (function): ${prev.length} → ${result.length}, unique IDs: ${new Set(result.map(p => p.id)).size}`);
        
        // Check for duplicates in result
        const uniqueIds = new Set(result.map(p => p.id));
        if (uniqueIds.size !== result.length) {
          console.error(`🚨 DUPLICATE IDS DETECTED in products update (function)!`);
          console.error(`🚨 Total products: ${result.length}, Unique IDs: ${uniqueIds.size}`);
        }
        
        return result;
      });
    } else {
      console.log(`🔄 SET PRODUCTS (direct): ${newProducts.length} products, unique IDs: ${new Set(newProducts.map(p => p.id)).size}`);
      
      // Check for duplicates in newProducts
      const uniqueIds = new Set(newProducts.map(p => p.id));
      if (uniqueIds.size !== newProducts.length) {
        console.error(`🚨 DUPLICATE IDS DETECTED in products update (direct)!`);
        console.error(`🚨 Total products: ${newProducts.length}, Unique IDs: ${uniqueIds.size}`);
        
        // Remove duplicates by ID (keep first occurrence)
        const seenIds = new Set();
        const deduplicatedProducts = newProducts.filter(product => {
          if (seenIds.has(product.id)) {
            console.warn(`🚨 Removing duplicate product ID: ${product.id}`);
            return false;
          }
          seenIds.add(product.id);
          return true;
        });
        console.log(`🔧 After deduplication: ${deduplicatedProducts.length} products`);
        setProducts(deduplicatedProducts);
      } else {
        setProducts(newProducts);
      }
    }
  };
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<(Product & { deletedAt: Date, mergedInto?: string, reason: string })[]>([]);
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedFilters, setSelectedFilters] = useState({
    hasirTipi: [] as string[],
    hasirKodu: [] as string[],
    hasirTuru: [] as string[],
    boyCap: [] as number[],
    enCap: [] as number[],
    quantityFilter: 'all' as 'all' | 'low' | 'medium' | 'high',
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: 'asc' | 'desc';
  } | null>(null);
  // Simple drag state - just source and target
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingMerge, setPendingMerge] = useState<{
    source: Product;
    target: Product;
    operation?: 'boydan' | 'enden';
    options?: Array<{
      type: 'boydan' | 'enden' | 'tipi_degisiklik' | 'tipi_degisiklik_same' | 'tipi_degisiklik_cross' | 'tamamla' | 'katli' | 'katli_exact' | 'katli_tolerance';
      source: Product;
      target: Product;
      explanation: string;
      tolerance: number;
      safetyLevel: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk' | 'risky';
      priority: number;
      result?: Product;
    }>;
  } | null>(null);
  const [tolerance, setTolerance] = useState(10); // Hidden - uses default value for main page operations
  const [maxHasirSayisi, setMaxHasirSayisi] = useState(50); // Hidden - uses default value for main page operations
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<MergeOperation[]>([]);
  const [currentOperationIndex, setCurrentOperationIndex] = useState(0);
  const [sortMode, setSortMode] = useState<'safety' | 'quantity'>('safety');
  const [includeTypeChanges, setIncludeTypeChanges] = useState(false);
  const [dialogTolerance, setDialogTolerance] = useState(10);
  const [dialogMaxHasirSayisi, setDialogMaxHasirSayisi] = useState(50);
  const [showBackConfirmDialog, setShowBackConfirmDialog] = useState(false);

  // Load initial data
  useEffect(() => {
    // First try to load from sessionStorage
    const sessionData = sessionStorage.getItem('celikHasirOptimizasyonData');
    if (sessionData) {
      try {
        const parsedData = JSON.parse(sessionData);
        // Ensure all products have string IDs
        const dataWithIds = parsedData.map((product: any, index: number) => ({
          ...product,
          id: String(product.id || `product_${index}_${Date.now()}`)
        }));
        setProductsWithDebug(dataWithIds);
        setFilteredProducts(dataWithIds);
        // Initialize history
        setHistory([{ products: dataWithIds, timestamp: Date.now() }]);
        setHistoryIndex(0);
        // Clear the data from sessionStorage after loading
        sessionStorage.removeItem('celikHasirOptimizasyonData');
        return;
      } catch (error) {
        console.error('Error loading data from sessionStorage:', error);
      }
    }

    // Fallback to URL parameters for backward compatibility
    const dataParam = searchParams?.get('data');
    if (dataParam) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        // Ensure all products have string IDs
        const dataWithIds = decodedData.map((product: any, index: number) => ({
          ...product,
          id: String(product.id || `product_${index}_${Date.now()}`)
        }));
        setProductsWithDebug(dataWithIds);
        setFilteredProducts(dataWithIds);
        // Initialize history
        setHistory([{ products: dataWithIds, timestamp: Date.now() }]);
        setHistoryIndex(0);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Veri yüklenirken hata oluştu');
      }
    }
  }, [searchParams]);

  // Update filtered products when filters or sort change
  useEffect(() => {
    console.log(`🎯 FILTER UPDATE: products.length=${products.length}, unique IDs=${new Set(products.map(p => p.id)).size}`);
    console.log(`🔍 SORTING DEBUG: sortConfig=`, sortConfig);
    console.log(`🎲 PRODUCT IDs BEFORE SORT:`, products.map(p => p.id));
    let filtered = [...products];

    // Apply filters
    if (selectedFilters.hasirTipi.length > 0) {
      filtered = filtered.filter(p => selectedFilters.hasirTipi.includes(p.hasirTipi));
    }
    if (selectedFilters.hasirKodu.length > 0) {
      filtered = filtered.filter(p => {
        const firstChar = p.hasirTipi.charAt(0).toUpperCase();
        return selectedFilters.hasirKodu.includes(firstChar);
      });
    }
    if (selectedFilters.hasirTuru.length > 0) {
      filtered = filtered.filter(p => selectedFilters.hasirTuru.includes(p.hasirTuru || ''));
    }
    if (selectedFilters.boyCap.length > 0) {
      filtered = filtered.filter(p => selectedFilters.boyCap.includes(p.boyCap));
    }
    if (selectedFilters.enCap.length > 0) {
      filtered = filtered.filter(p => selectedFilters.enCap.includes(p.enCap));
    }
    
    // Apply quantity filter
    if (selectedFilters.quantityFilter === 'low') {
      filtered = filtered.filter(p => p.hasirSayisi < 20);
    } else if (selectedFilters.quantityFilter === 'medium') {
      filtered = filtered.filter(p => p.hasirSayisi >= 20 && p.hasirSayisi < 50);
    } else if (selectedFilters.quantityFilter === 'high') {
      filtered = filtered.filter(p => p.hasirSayisi >= 50);
    }

    // Apply sorting - single column
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal !== undefined && bVal !== undefined) {
          // Handle different data types properly
          let comparison = 0;
          
          // Convert to numbers for numeric columns
          if (['uzunlukBoy', 'uzunlukEn', 'boyCap', 'enCap', 'hasirSayisi', 'toplamKg', 'adetKg'].includes(sortConfig.key)) {
            const aNum = Number(aVal);
            const bNum = Number(bVal);
            comparison = aNum - bNum;
          } else if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal, 'tr');
          } else {
            // Fallback to string comparison
            comparison = String(aVal).localeCompare(String(bVal), 'tr');
          }
          
          const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
          return comparison * multiplier;
        }
        return 0;
      });
    }

    console.log(`🎯 FILTERED RESULT: filtered.length=${filtered.length}, unique IDs=${new Set(filtered.map(p => p.id)).size}`);
    console.log(`🎲 PRODUCT IDs AFTER SORT:`, filtered.map(p => p.id));
    
    // Critical check: ensure no duplicate IDs in filtered products
    const uniqueIds = new Set(filtered.map(p => p.id));
    if (uniqueIds.size !== filtered.length) {
      console.error(`🚨 DUPLICATE IDS DETECTED in filtered products!`);
      console.error(`🚨 Total products: ${filtered.length}, Unique IDs: ${uniqueIds.size}`);
      
      // Remove duplicates by ID (keep first occurrence)
      const seenIds = new Set();
      filtered = filtered.filter(product => {
        if (seenIds.has(product.id)) {
          console.warn(`🚨 Removing duplicate product ID: ${product.id}`);
          return false;
        }
        seenIds.add(product.id);
        return true;
      });
      console.log(`🔧 After deduplication: ${filtered.length} products`);
    }
    
    setFilteredProducts(filtered);
  }, [products, selectedFilters, sortConfig]);

  // History management
  const addToHistory = (newProducts: Product[]) => {
    console.log(`📚 ADD TO HISTORY: ${newProducts.length} products, unique IDs: ${new Set(newProducts.map(p => p.id)).size}`);
    console.log(`📚 NEW PRODUCT IDS:`, newProducts.map(p => p.id));
    
    // Check if we're adding the same products as current
    if (products.length === newProducts.length && products.every((p, i) => p.id === newProducts[i]?.id)) {
      console.log(`⚠️ HISTORY: Skipping duplicate state (same products)`);
      return;
    }
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ products: newProducts, timestamp: Date.now() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setProductsWithDebug(newProducts);
  };

  const undo = () => {
    if (historyIndex > 0) {
      console.log(`⏪ UNDO: historyIndex ${historyIndex} → ${historyIndex - 1}`);
      setHistoryIndex(historyIndex - 1);
      const previousProducts = history[historyIndex - 1].products;
      console.log(`⏪ UNDO PRODUCTS: ${previousProducts.length} products, unique IDs: ${new Set(previousProducts.map(p => p.id)).size}`);
      setProductsWithDebug(previousProducts);
    }
  };

  // Function to move products to deleted list (without updating products state)
  const moveToDeleted = (productsToDelete: Product[], reason: string, mergedInto?: string) => {
    const deletedItems = productsToDelete.map(product => ({
      ...product,
      deletedAt: new Date(),
      mergedInto,
      reason
    }));
    
    setDeletedProducts(prev => [...prev, ...deletedItems]);
    
    console.log(`🗑️ Moved ${productsToDelete.length} products to deleted list`);
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      console.log(`⏩ REDO: historyIndex ${historyIndex} → ${historyIndex + 1}`);
      setHistoryIndex(historyIndex + 1);
      const nextProducts = history[historyIndex + 1].products;
      console.log(`⏩ REDO PRODUCTS: ${nextProducts.length} products, unique IDs: ${new Set(nextProducts.map(p => p.id)).size}`);
      setProductsWithDebug(nextProducts);
    }
  };

  const resetToInitial = () => {
    if (history.length > 0) {
      console.log(`🔄 RESET: historyIndex ${historyIndex} → 0`);
      setHistoryIndex(0);
      const initialProducts = history[0].products;
      console.log(`🔄 RESET PRODUCTS: ${initialProducts.length} products, unique IDs: ${new Set(initialProducts.map(p => p.id)).size}`);
      setProductsWithDebug(initialProducts);
    }
  };

  // Helper function to create sortable header - single active column

  // Get tolerance based on quantity
  const getTolerance = (hasirSayisi: number): number => {
    if (hasirSayisi < 15) return 20;
    if (hasirSayisi < 35) return 15;
    if (hasirSayisi < 50) return 10;
    if (hasirSayisi < 100) return 7;
    return 5;
  };

  // Merge functions
  // OPTIMIZATION: Eliminate SMALLER product by producing it as BIGGER similar product  
  const optimizeBoydan = (smallerProduct: Product, biggerProduct: Product): Product => {
    const totalQuantity = Number(smallerProduct.hasirSayisi) + Number(biggerProduct.hasirSayisi);
    const totalWeight = Number(smallerProduct.toplamKg) + Number(biggerProduct.toplamKg);
    
    return {
      ...biggerProduct, // KEEP BIGGER PRODUCT'S DIMENSIONS!
      id: `optimized_${Date.now()}`,
      hasirSayisi: totalQuantity,
      toplamKg: totalWeight,
      mergeHistory: [
        ...(biggerProduct.mergeHistory || []),
        `OPTİMİZASYON: ${smallerProduct.hasirSayisi}adet(${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn}) silinecek → ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn} olarak üretilecek`
      ],
      advancedOptimizationNotes: `Optimizasyon: ${smallerProduct.hasirSayisi}adet ${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn} silinecek → ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn} olarak üretilecek`,
      aciklama: `${biggerProduct.aciklama || ''} | OPT: ${smallerProduct.hasirSayisi}adet ${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn} -> ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn} (${totalQuantity} toplam)`
    };
  };

  // OPTIMIZATION: Eliminate SMALLER product by producing it as BIGGER similar product
  const optimizeEnden = (smallerProduct: Product, biggerProduct: Product): Product => {
    const totalQuantity = Number(smallerProduct.hasirSayisi) + Number(biggerProduct.hasirSayisi);
    const totalWeight = Number(smallerProduct.toplamKg) + Number(biggerProduct.toplamKg);
    
    return {
      ...biggerProduct, // KEEP BIGGER PRODUCT'S DIMENSIONS!
      id: `optimized_${Date.now()}`,
      hasirSayisi: totalQuantity,
      toplamKg: totalWeight,
      mergeHistory: [
        ...(biggerProduct.mergeHistory || []),
        `OPTİMİZASYON: ${smallerProduct.hasirSayisi}adet(${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn}) silinecek → ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn} olarak üretilecek`
      ],
      advancedOptimizationNotes: `Optimizasyon: ${smallerProduct.hasirSayisi}adet ${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn} silinecek → ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn} olarak üretilecek`,
      aciklama: `${biggerProduct.aciklama || ''} | OPT: ${smallerProduct.hasirSayisi}adet ${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn} -> ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn} (${totalQuantity} toplam)`
    };
  };

  // Smart merge suggestion based on product analysis
  const getSuggestedMergeOperation = (source: Product, target: Product, toleranceCm: number = 10): 'boydan' | 'enden' | null => {
    // CRITICAL: Source product will be ELIMINATED and produced as target size
    // Therefore, target dimensions MUST be >= source dimensions (can cut down, not up)
    
    // Use passed tolerance parameter or default to 10cm
    const sourceBoy = Number(source.uzunlukBoy);
    const sourceEn = Number(source.uzunlukEn);
    const targetBoy = Number(target.uzunlukBoy);
    const targetEn = Number(target.uzunlukEn);
    
    // Basic compatibility check
    if (source.hasirTipi !== target.hasirTipi || 
        source.boyCap !== target.boyCap || 
        source.enCap !== target.enCap) {
      return null;
    }
    
    // For boydan merge: EN must be same/similar, target BOY must be >= source BOY
    const enDiffCm = Math.abs(targetEn - sourceEn);
    const canMergeBoydan = enDiffCm <= toleranceCm && 
                          targetBoy >= sourceBoy && 
                          (targetBoy - sourceBoy) <= toleranceCm;
    
    // For enden merge: BOY must be same/similar, target EN must be >= source EN  
    const boyDiffCm = Math.abs(targetBoy - sourceBoy);
    const canMergeEnden = boyDiffCm <= toleranceCm && 
                         targetEn >= sourceEn && 
                         (targetEn - sourceEn) <= toleranceCm;
    
    if (canMergeBoydan && canMergeEnden) {
      // Both possible - choose the one with smaller tolerance usage
      const boyTolerance = targetBoy - sourceBoy;
      const enTolerance = targetEn - sourceEn;
      return boyTolerance <= enTolerance ? 'boydan' : 'enden';
    } else if (canMergeBoydan) {
      return 'boydan';
    } else if (canMergeEnden) {
      return 'enden';
    }
    
    return null;
  };

  // Get all possible merge options between two products
  const getAllMergeOptions = (product1: Product, product2: Product, allowTypeChanges: boolean = false) => {
    const options: Array<{
      type: 'boydan' | 'enden' | 'tipi_degisiklik' | 'tipi_degisiklik_same' | 'tipi_degisiklik_cross' | 'tamamla' | 'katli' | 'katli_exact' | 'katli_tolerance';
      source: Product;
      target: Product;
      explanation: string;
      tolerance: number;
      safetyLevel: 'safe' | 'low_risk' | 'medium_risk' | 'high_risk' | 'risky';
      safetyLevelNumber?: number;
      priority: number;
      result?: Product;
    }> = [];
    
    const boy1 = Number(product1.uzunlukBoy);
    const en1 = Number(product1.uzunlukEn);
    const boy2 = Number(product2.uzunlukBoy);
    const en2 = Number(product2.uzunlukEn);
    
    // OPTION 1: Direct merge (same type, same diameter)
    if (product1.hasirTipi === product2.hasirTipi && 
        product1.boyCap === product2.boyCap && 
        product1.enCap === product2.enCap) {
      
      // Check product1 → product2 (product1 into product2)
      if (boy2 >= boy1 && en2 >= en1) {
        const boyDiff = boy2 - boy1;
        const enDiff = en2 - en1;
        const tolerance = Math.max(boyDiff, enDiff);
        
        if (boyDiff >= enDiff) {
          const safety = getSafetyLevel(tolerance);
          options.push({
            type: 'boydan',
            source: product1,
            target: product2,
            explanation: `${product1.hasirSayisi}adet ${boy1}x${en1} → ${boy2}x${en2} (boydan ${tolerance}cm)`,
            tolerance,
            safetyLevel: safety.category,
            safetyLevelNumber: safety.level,
            priority: 1
          });
        } else {
          const safety = getSafetyLevel(tolerance);
          options.push({
            type: 'enden',
            source: product1,
            target: product2,
            explanation: `${product1.hasirSayisi}adet ${boy1}x${en1} → ${boy2}x${en2} (enden ${tolerance}cm)`,
            tolerance,
            safetyLevel: safety.category,
            safetyLevelNumber: safety.level,
            priority: 1
          });
        }
      }
      
      // Check product2 → product1 (product2 into product1)
      if (boy1 >= boy2 && en1 >= en2) {
        const boyDiff = boy1 - boy2;
        const enDiff = en1 - en2;
        const tolerance = Math.max(boyDiff, enDiff);
        
        if (boyDiff >= enDiff) {
          const safety = getSafetyLevel(tolerance);
          options.push({
            type: 'boydan',
            source: product2,
            target: product1,
            explanation: `${product2.hasirSayisi}adet ${boy2}x${en2} → ${boy1}x${en1} (boydan ${tolerance}cm)`,
            tolerance,
            safetyLevel: safety.category,
            safetyLevelNumber: safety.level,
            priority: 1
          });
        } else {
          const safety = getSafetyLevel(tolerance);
          options.push({
            type: 'enden',
            source: product2,
            target: product1,
            explanation: `${product2.hasirSayisi}adet ${boy2}x${en2} → ${boy1}x${en1} (enden ${tolerance}cm)`,
            tolerance,
            safetyLevel: safety.category,
            safetyLevelNumber: safety.level,
            priority: 1
          });
        }
      }
    }
    
    // OPTION 2: Hasır Tipi Değişikliği - Same Group (Q->Q, T->T, R->R)
    const type1 = product1.hasirTipi.charAt(0);
    const type2 = product2.hasirTipi.charAt(0);
    
    if (allowTypeChanges && product1.hasirTipi !== product2.hasirTipi && type1 === type2) {
      // Check if dimensions are compatible for type change
      const canChange1to2 = boy2 >= boy1 && en2 >= en1;
      const canChange2to1 = boy1 >= boy2 && en1 >= en2;
      
      if (canChange1to2) {
        const tolerance = Math.max(boy2 - boy1, en2 - en1);
        const result = {
          ...product2,
          id: `type_changed_same_${Date.now()}_${Math.random()}`,
          hasirSayisi: Number(product1.hasirSayisi) + Number(product2.hasirSayisi),
          toplamKg: Number(product1.toplamKg) + Number(product2.toplamKg),
          mergeHistory: [
            ...(product2.mergeHistory || []),
            `Tip değişikliği: ${product1.hasirTipi}(${product1.hasirSayisi}) -> ${product2.hasirTipi}(+${product1.hasirSayisi})`
          ],
          advancedOptimizationNotes: `Hasır tipi değişikliği (aynı grup): ${product1.hasirTipi} -> ${product2.hasirTipi}`,
          aciklama: product2.aciklama || `Tip değişikliği: ${product1.id} -> ${product2.id}`
        };
        const safety = getSafetyLevel(tolerance, false); // Same-group changes use normal tolerance-based safety
        options.push({
          type: 'tipi_degisiklik_same',
          source: product1,
          target: product2,
          result: result,
          explanation: `Tip değişikliği (aynı grup): ${product1.hasirSayisi}adet ${product1.hasirTipi} → ${product2.hasirTipi} (${tolerance}cm)`,
          tolerance,
          safetyLevel: safety.category,
          safetyLevelNumber: safety.level,
          priority: 4
        });
      }
      
      if (canChange2to1) {
        const tolerance = Math.max(boy1 - boy2, en1 - en2);
        const result = {
          ...product1,
          id: `type_changed_same_${Date.now()}_${Math.random()}`,
          hasirSayisi: Number(product2.hasirSayisi) + Number(product1.hasirSayisi),
          toplamKg: Number(product2.toplamKg) + Number(product1.toplamKg),
          mergeHistory: [
            ...(product1.mergeHistory || []),
            `Tip değişikliği: ${product2.hasirTipi}(${product2.hasirSayisi}) -> ${product1.hasirTipi}(+${product2.hasirSayisi})`
          ],
          advancedOptimizationNotes: `Hasır tipi değişikliği (aynı grup): ${product2.hasirTipi} -> ${product1.hasirTipi}`,
          aciklama: product1.aciklama || `Tip değişikliği: ${product2.id} -> ${product1.id}`
        };
        const safety = getSafetyLevel(tolerance, false); // Same-group changes use normal tolerance-based safety
        options.push({
          type: 'tipi_degisiklik_same',
          source: product2,
          target: product1,
          result: result,
          explanation: `Tip değişikliği (aynı grup): ${product2.hasirSayisi}adet ${product2.hasirTipi} → ${product1.hasirTipi} (${tolerance}cm)`,
          tolerance,
          safetyLevel: safety.category,
          safetyLevelNumber: safety.level,
          priority: 4
        });
      }
    }
    
    // OPTION 2B: Hasır Tipi Değişikliği - Cross Group (Q->T, T->R)
    if (allowTypeChanges) {
      const crossGroupPairs = [['Q', 'T'], ['T', 'R']];
      for (const [from, to] of crossGroupPairs) {
        if ((type1 === from && type2 === to) || (type1 === to && type2 === from)) {
        const canChange1to2 = boy2 >= boy1 && en2 >= en1;
        const canChange2to1 = boy1 >= boy2 && en1 >= en2;
        
        if (canChange1to2 && type1 === from) {
          const tolerance = Math.max(boy2 - boy1, en2 - en1);
          const result = {
            ...product2,
            id: `type_changed_cross_${Date.now()}_${Math.random()}`,
            hasirSayisi: Number(product1.hasirSayisi) + Number(product2.hasirSayisi),
            toplamKg: Number(product1.toplamKg) + Number(product2.toplamKg),
            mergeHistory: [
              ...(product2.mergeHistory || []),
              `Tip değişikliği (gruplar arası): ${product1.hasirTipi}(${product1.hasirSayisi}) -> ${product2.hasirTipi}(+${product1.hasirSayisi})`
            ],
            advancedOptimizationNotes: `Hasır tipi değişikliği (gruplar arası): ${product1.hasirTipi} -> ${product2.hasirTipi}`,
            aciklama: product2.aciklama || `Gruplar arası tip değişikliği: ${product1.id} -> ${product2.id}`
          };
          options.push({
            type: 'tipi_degisiklik_cross',
            source: product1,
            target: product2,
            result: result,
            explanation: `Tip değişikliği (GRUPLAR ARASI): ${product1.hasirSayisi}adet ${product1.hasirTipi} → ${product2.hasirTipi} (${tolerance}cm)`,
            tolerance,
            safetyLevel: 'risky',
            safetyLevelNumber: 10,
            priority: 5
          });
        }
        
        if (canChange2to1 && type2 === from) {
          const tolerance = Math.max(boy1 - boy2, en1 - en2);
          const result = {
            ...product1,
            id: `type_changed_cross_${Date.now()}_${Math.random()}`,
            hasirSayisi: Number(product2.hasirSayisi) + Number(product1.hasirSayisi),
            toplamKg: Number(product2.toplamKg) + Number(product1.toplamKg),
            mergeHistory: [
              ...(product1.mergeHistory || []),
              `Tip değişikliği (gruplar arası): ${product2.hasirTipi}(${product2.hasirSayisi}) -> ${product1.hasirTipi}(+${product2.hasirSayisi})`
            ],
            advancedOptimizationNotes: `Hasır tipi değişikliği (gruplar arası): ${product2.hasirTipi} -> ${product1.hasirTipi}`,
            aciklama: product1.aciklama || `Gruplar arası tip değişikliği: ${product2.id} -> ${product1.id}`
          };
          options.push({
            type: 'tipi_degisiklik_cross',
            source: product2,
            target: product1,
            result: result,
            explanation: `Tip değişikliği (GRUPLAR ARASI): ${product2.hasirSayisi}adet ${product2.hasirTipi} → ${product1.hasirTipi} (${tolerance}cm)`,
            tolerance,
            safetyLevel: 'risky',
            safetyLevelNumber: 10,
            priority: 5
          });
        }
      }
    }
    }
    
    // OPTION 3: Üste Tamamlama (Rounding up) - even for different types if diameter matches
    if (product1.boyCap === product2.boyCap && product1.enCap === product2.enCap) {
      // Check if we can round up product1 to product2 dimensions
      const boyDiff1to2 = boy2 - boy1;
      const enDiff1to2 = en2 - en1;
      
      if (boyDiff1to2 >= 0 && enDiff1to2 >= 0 && (boyDiff1to2 > 0 || enDiff1to2 > 0)) {
        const tolerance = Math.max(boyDiff1to2, enDiff1to2);
        const safety = getSafetyLevel(tolerance);
        options.push({
          type: 'tamamla',
          source: product1,
          target: product2,
          explanation: `Üste tamamla: ${product1.hasirSayisi}adet ${boy1}x${en1} → ${boy2}x${en2} (+${tolerance}cm)`,
          tolerance,
          safetyLevel: safety.category,
          safetyLevelNumber: safety.level,
          priority: 3
        });
      }
      
      // Check if we can round up product2 to product1 dimensions
      const boyDiff2to1 = boy1 - boy2;
      const enDiff2to1 = en1 - en2;
      
      if (boyDiff2to1 >= 0 && enDiff2to1 >= 0 && (boyDiff2to1 > 0 || enDiff2to1 > 0)) {
        const tolerance = Math.max(boyDiff2to1, enDiff2to1);
        const safety = getSafetyLevel(tolerance);
        options.push({
          type: 'tamamla',
          source: product2,
          target: product1,
          explanation: `Üste tamamla: ${product2.hasirSayisi}adet ${boy2}x${en2} → ${boy1}x${en1} (+${tolerance}cm)`,
          tolerance,
          safetyLevel: safety.category,
          safetyLevelNumber: safety.level,
          priority: 3
        });
      }
    }
    
    // Remove duplicates - prioritize direct merges over rounding operations
    const uniqueOptions = options.filter((option, index, arr) => {
      // Find if there's another option with same source, target, and tolerance
      const duplicate = arr.find((other, otherIndex) => 
        otherIndex !== index &&
        other.source.id === option.source.id &&
        other.target.id === option.target.id &&
        Math.abs(other.tolerance - option.tolerance) < 0.1 // Same tolerance (within 0.1cm)
      );
      
      if (duplicate) {
        // If duplicate exists, prefer direct merge (boydan/enden) over tamamla
        if ((option.type === 'boydan' || option.type === 'enden') && duplicate.type === 'tamamla') {
          return true; // Keep the direct merge
        } else if (option.type === 'tamamla' && (duplicate.type === 'boydan' || duplicate.type === 'enden')) {
          return false; // Remove the tamamla option
        }
      }
      
      return true; // Keep if no duplicate or no preference
    });
    
    // FALLBACK OPTIONS: If no good options found, add risky/extreme alternatives
    if (uniqueOptions.length === 0) {
      console.log(`⚠️ No standard merge options found for ${product1.hasirTipi} ↔ ${product2.hasirTipi}, adding fallback options`);
      
      // FALLBACK 1: Force merge with new bigger dimensions (creates new larger product)
      const maxBoy = Math.max(boy1, boy2);
      const maxEn = Math.max(en1, en2);
      const newBoy = Math.ceil(maxBoy * 1.1); // 10% larger
      const newEn = Math.ceil(maxEn * 1.1);
      
      const biggerProduct1 = {
        ...product1,
        id: `forced_bigger_${Date.now()}_${Math.random()}`,
        uzunlukBoy: newBoy,
        uzunlukEn: newEn,
        hasirSayisi: Number(product1.hasirSayisi) + Number(product2.hasirSayisi),
        toplamKg: Number(product1.toplamKg) + Number(product2.toplamKg),
        mergeHistory: [
          ...(product1.mergeHistory || []),
          `ZORLA BİRLEŞTİRME: ${product2.hasirSayisi}adet ${product2.hasirTipi}(${boy2}x${en2}) → YENİ BOYUT ${newBoy}x${newEn}`
        ],
        advancedOptimizationNotes: `Zorla birleştirme: Yeni boyut ${newBoy}x${newEn} yaratıldı`,
        aciklama: `ZORLA BİRLEŞTİRME: ${product1.hasirTipi} + ${product2.hasirTipi} → ${newBoy}x${newEn}`
      };
      
      uniqueOptions.push({
        type: 'tamamla',
        source: product2,
        target: product1,
        result: biggerProduct1,
        explanation: `🚨 ZORLA BİRLEŞTİRME: Yeni büyük boyut yaratılacak ${newBoy}x${newEn} (ÇOK RİSKLİ!)`,
        tolerance: Math.max(newBoy - maxBoy, newEn - maxEn),
        safetyLevel: 'risky',
        safetyLevelNumber: 10,
        priority: 9
      });
      
      // FALLBACK 2: Different diameter merge (very risky)  
      if (product1.boyCap !== product2.boyCap || product1.enCap !== product2.enCap) {
        const targetDiameter = Math.max(product1.boyCap, product2.boyCap);
        const result = {
          ...product1,
          id: `diameter_change_${Date.now()}_${Math.random()}`,
          boyCap: targetDiameter,
          enCap: Math.max(product1.enCap, product2.enCap),
          hasirSayisi: Number(product1.hasirSayisi) + Number(product2.hasirSayisi),
          toplamKg: Number(product1.toplamKg) + Number(product2.toplamKg),
          mergeHistory: [
            ...(product1.mergeHistory || []),
            `ÇAP DEĞİŞİKLİĞİ: ${product2.hasirTipi}(${product2.boyCap}x${product2.enCap}) → (${targetDiameter}x${Math.max(product1.enCap, product2.enCap)})`
          ],
          advancedOptimizationNotes: `Çap değişikliği: ${product2.boyCap}x${product2.enCap} → ${targetDiameter}x${Math.max(product1.enCap, product2.enCap)}`,
          aciklama: `ÇAP DEĞİŞİKLİĞİ: ${product2.hasirTipi} çapı değiştirildi`
        };
        
        uniqueOptions.push({
          type: 'tipi_degisiklik',
          source: product2,
          target: product1,
          result: result,
          explanation: `🚨 ÇAP DEĞİŞİKLİĞİ: ${product2.hasirTipi} çapı ${product2.boyCap}→${targetDiameter} (AŞIRI RİSKLİ!)`,
          tolerance: Math.abs(targetDiameter - product2.boyCap),
          safetyLevel: 'risky',
          safetyLevelNumber: 10,
          priority: 10
        });
      }
      
      // FALLBACK 3: All possible type transitions (Q↔R, R↔Q, etc.)
      const allTypeTransitions = [
        ['Q', 'R'], ['R', 'Q'], ['Q', 'T'], ['T', 'Q'], ['T', 'R'], ['R', 'T']
      ];
      
      for (const [fromType, toType] of allTypeTransitions) {
        if (type1 === fromType && type2 === toType) {
          const newBoySize = Math.max(boy1, boy2) + 10; // Add 10cm safety
          const newEnSize = Math.max(en1, en2) + 10;
          
          const result = {
            ...product2,
            id: `extreme_type_change_${Date.now()}_${Math.random()}`,
            uzunlukBoy: newBoySize,
            uzunlukEn: newEnSize,
            hasirSayisi: Number(product1.hasirSayisi) + Number(product2.hasirSayisi),
            toplamKg: Number(product1.toplamKg) + Number(product2.toplamKg),
            mergeHistory: [
              ...(product2.mergeHistory || []),
              `AŞIRI TİP DEĞİŞİKLİĞİ: ${product1.hasirTipi}(${boy1}x${en1}) → ${product2.hasirTipi}(${newBoySize}x${newEnSize})`
            ],
            advancedOptimizationNotes: `Aşırı tip değişikliği: ${product1.hasirTipi} → ${product2.hasirTipi} + boyut artışı`,
            aciklama: `AŞIRI TİP DEĞİŞİKLİĞİ: ${product1.hasirTipi} → ${product2.hasirTipi}`
          };
          
          uniqueOptions.push({
            type: 'tipi_degisiklik_cross',
            source: product1,
            target: product2,
            result: result,
            explanation: `🚨 AŞIRI TİP DEĞİŞİKLİĞİ: ${product1.hasirTipi} → ${product2.hasirTipi} + boyut artışı (TEHLİKELİ!)`,
            tolerance: Math.max(newBoySize - Math.max(boy1, boy2), newEnSize - Math.max(en1, en2)),
            safetyLevel: 'risky',
            safetyLevelNumber: 10,
            priority: 11
          });
          break;
        }
      }
    }

    // Sort by priority first, then by safety/tolerance  
    return uniqueOptions.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.safetyLevel !== b.safetyLevel) {
        const safetyOrder = { safe: 0, low_risk: 1, medium_risk: 2, high_risk: 3, risky: 4 };
        return safetyOrder[a.safetyLevel] - safetyOrder[b.safetyLevel];
      }
      return a.tolerance - b.tolerance;
    });
  };

  // Removed old drag handlers - now using simple inline handlers

  // Removed old drag functions - using simple inline handlers now

  const executeMerge = (operation: 'boydan' | 'enden') => {
    if (!pendingMerge) return;

    const { source, target } = pendingMerge;
    let mergedProduct: Product;
    let explanation: string;

    if (operation === 'boydan') {
      mergedProduct = optimizeBoydan(source, target);
      explanation = `OPTIMIZASYON: ${source.hasirSayisi}adet ${source.uzunlukBoy}x${source.uzunlukEn} silinecek → ${target.uzunlukBoy}x${target.uzunlukEn} (${Number(source.hasirSayisi) + Number(target.hasirSayisi)} toplam)`;
    } else {
      mergedProduct = optimizeEnden(source, target);
      explanation = `OPTIMIZASYON: ${source.hasirSayisi}adet ${source.uzunlukBoy}x${source.uzunlukEn} silinecek → ${target.uzunlukBoy}x${target.uzunlukEn} (${Number(source.hasirSayisi) + Number(target.hasirSayisi)} toplam)`;
    }

    const newProducts = products
      .filter(p => p.id !== source.id && p.id !== target.id)
      .concat(mergedProduct);

    addToHistory(newProducts);
    setShowMergeDialog(false);
    setPendingMerge(null);
    toast.success(explanation);
  };

  // Filter unique values
  const uniqueValues = useMemo(() => {
    return {
      hasirTipi: Array.from(new Set(products.map(p => p.hasirTipi))).sort(),
      hasirKodu: ['Q', 'TR', 'R'], // Fixed hasır kodu options
      hasirTuru: Array.from(new Set(products.map(p => p.hasirTuru).filter(Boolean))).sort(),
      boyCap: Array.from(new Set(products.map(p => p.boyCap))).sort((a, b) => a - b),
      enCap: Array.from(new Set(products.map(p => p.enCap))).sort((a, b) => a - b),
    };
  }, [products]);

  // Handle applying optimizations to main list
  const handleApplyToMainList = () => {
    const confirmApply = window.confirm(
      'Bu optimizasyonları ana listeye uygulamak istediğinizden emin misiniz? Bu işlem geri alınamaz.'
    );
    
    if (confirmApply) {
      // Mark all products as optimized and identify merged products
      const optimizedProducts = products.map(product => ({
        ...product,
        isOptimized: true,
        // Mark products that have merge history as merged for green background
        isMerged: !!(product.mergeHistory && product.mergeHistory.length > 0) || 
                  !!(product.advancedOptimizationNotes && product.advancedOptimizationNotes.includes('birleştir'))
      }));
      
      // Store data in sessionStorage instead of URL
      sessionStorage.setItem('celikHasirOptimizedData', JSON.stringify(optimizedProducts));
      
      // Check return path first
      const returnPath = sessionStorage.getItem('celikHasirReturnPath');
      console.log('Return path from storage:', returnPath);
      
      if (returnPath) {
        // Force navigation back
        window.location.replace(returnPath);
        return;
      }
      
      // Fallback to referrer logic
      const referrer = sessionStorage.getItem('celikHasirReferrer');
      console.log('Returning to main list, referrer:', referrer);
      
      if (referrer === 'maliyet') {
        window.location.replace('/uretim/hesaplamalar/maliyet');
      } else if (referrer === 'urun') {
        window.location.replace('/uretim/hesaplamalar/urun');
      } else {
        // Default fallback - go back two steps to reach the component
        window.history.go(-2);
      }
    }
  };

  // OPTIMIZATION: Find ALL merge opportunities without early breaks or usedIds limitations
  const findMergeOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    const processedPairs = new Set<string>();
    
    // STEP 1: Find all products that can be optimized
    const candidateProducts = products.filter(p => 
      Number(p.hasirSayisi) <= maxHasirSayisi // Only products under the threshold
    );
    
    console.log(`🔍 Candidates for elimination: ${candidateProducts.length}/${products.length} products`);
    
    // STEP 2: Check ALL possible combinations (no early breaks)
    for (let i = 0; i < candidateProducts.length; i++) {
      const sourceProduct = candidateProducts[i];
      
      // Find ALL potential targets (not just the first match)
      for (let j = 0; j < products.length; j++) {
        const targetProduct = products[j];
        
        // Skip self
        if (sourceProduct.id === targetProduct.id) continue;
        
        // Create unique pair key to avoid duplicates
        const pairKey1 = `${sourceProduct.id}-${targetProduct.id}`;
        const pairKey2 = `${targetProduct.id}-${sourceProduct.id}`;
        
        if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) continue;
        
        // Must be same type and diameter
        if (targetProduct.hasirTipi !== sourceProduct.hasirTipi || 
            targetProduct.boyCap !== sourceProduct.boyCap || 
            targetProduct.enCap !== sourceProduct.enCap) continue;
        
        const toleranceCm = tolerance;
        const targetBoy = Number(targetProduct.uzunlukBoy);
        const targetEn = Number(targetProduct.uzunlukEn);
        const sourceBoy = Number(sourceProduct.uzunlukBoy);
        const sourceEn = Number(sourceProduct.uzunlukEn);
        
        // Target must be >= source in both dimensions
        const boyDiff = targetBoy - sourceBoy;
        const enDiff = targetEn - sourceEn;
        
        if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= toleranceCm && enDiff <= toleranceCm) {
          const actualDiffCm = Math.max(boyDiff, enDiff);
          
          // Determine merge type based on which dimension has less difference
          const mergeType = boyDiff <= enDiff ? 'boydan' : 'enden';
          const optimized = mergeType === 'boydan' 
            ? optimizeBoydan(sourceProduct, targetProduct)
            : optimizeEnden(sourceProduct, targetProduct);
          
          opportunities.push({
            type: mergeType,
            source: sourceProduct,
            target: targetProduct,
            result: optimized,
            explanation: `OPTİMİZASYON: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} silinecek → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} olarak üretilecek (+${sourceProduct.hasirSayisi} adet, tolerans: ${actualDiffCm.toFixed(1)}cm)`,
            toleranceUsed: actualDiffCm,
            safetyLevel: getSafetyLevel(actualDiffCm).category,
            safetyLevelNumber: getSafetyLevel(actualDiffCm).level
          });
          
          processedPairs.add(pairKey1);
        }
      }
    }
    
    console.log(`💡 Found ${opportunities.length} unique merge opportunities`);
    console.log(`🎯 Perfect matches (0 tolerance): ${opportunities.filter(op => op.toleranceUsed === 0).length}`);
    
    // Sort by safety (lowest tolerance first)
    return opportunities.sort((a, b) => a.toleranceUsed - b.toleranceUsed);
  };

  // Helper function to find matching multiples
  const findMatchingMultiples = (source: Product, target: Product) => {
    const matches: Array<{ type: 'exact' | 'tolerance'; multiple: string; boyMult: number; enMult: number }> = [];
    
    // Check various multiple combinations
    const multiples = [
      { boyMult: 2, enMult: 1, label: '2x boy' },
      { boyMult: 1, enMult: 2, label: '2x en' },
      { boyMult: 2, enMult: 2, label: '2x boyxen' },
      { boyMult: 3, enMult: 1, label: '3x boy' },
      { boyMult: 1, enMult: 3, label: '3x en' },
      { boyMult: 3, enMult: 3, label: '3x boyxen' }
    ];
    
    for (const mult of multiples) {
      const expectedBoy = source.uzunlukBoy * mult.boyMult;
      const expectedEn = source.uzunlukEn * mult.enMult;
      
      // Check exact match
      if (target.uzunlukBoy === expectedBoy && target.uzunlukEn === expectedEn) {
        matches.push({ type: 'exact', multiple: mult.label, boyMult: mult.boyMult, enMult: mult.enMult });
      } else {
        // Check with tolerance
        const boyDiff = Math.abs(target.uzunlukBoy - expectedBoy);
        const enDiff = Math.abs(target.uzunlukEn - expectedEn);
        
        if (boyDiff <= tolerance && enDiff <= tolerance) {
          matches.push({ type: 'tolerance', multiple: mult.label, boyMult: mult.boyMult, enMult: mult.enMult });
        }
      }
    }
    
    return matches;
  };

  // Find folded improvements - check ALL combinations
  const findFoldedImprovements = () => {
    const opportunities: MergeOperation[] = [];
    const processedPairs = new Set<string>();
    
    const candidateProducts = products.filter(p => 
      Number(p.hasirSayisi) <= maxHasirSayisi
    );
    
    // Check ALL possible folding combinations
    for (let i = 0; i < candidateProducts.length; i++) {
      const sourceProduct = candidateProducts[i];
      
      for (let j = 0; j < products.length; j++) {
        const targetProduct = products[j];
        
        if (sourceProduct.id === targetProduct.id) continue;
        if (sourceProduct.hasirTipi !== targetProduct.hasirTipi) continue;
        
        // Skip if we've already processed this pair
        const pairKey1 = `${sourceProduct.id}-${targetProduct.id}`;
        const pairKey2 = `${targetProduct.id}-${sourceProduct.id}`;
        if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) continue;
        
        // Check for exact multiples and multiples with tolerance
        const matches = findMatchingMultiples(sourceProduct, targetProduct);
        
        if (matches.length > 0) {
          // Mark this pair as processed since we found at least one match
          processedPairs.add(pairKey1);
        }
        
        for (const match of matches) {
          if (match.type === 'exact') {
            const result = {
              ...targetProduct,
              id: `folded_exact_${Date.now()}_${Math.random()}`,
              hasirSayisi: Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi),
              toplamKg: Number(sourceProduct.toplamKg) + Number(targetProduct.toplamKg),
              mergeHistory: [
                ...(targetProduct.mergeHistory || []),
                `KATLI İYİLEŞTİRME: ${sourceProduct.hasirSayisi}adet(${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn}) EXACT ${match.multiple} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn}`
              ],
              advancedOptimizationNotes: `Katlı iyileştirme EXACT: ${match.multiple} - ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn}`,
              aciklama: `${targetProduct.aciklama || ''} | KATLI: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} -> ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple}x)`
            };
            
            opportunities.push({
              type: 'katli_exact',
              source: sourceProduct,
              target: targetProduct,
              result: result,
              explanation: `KATLI İYİLEŞTİRME (TAM KAT): ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple}x kat, tolerans: 0cm)`,
              toleranceUsed: 0,
              safetyLevel: getSafetyLevel(0, false, true).category,  // Pass isFoldingOperation=true
              safetyLevelNumber: getSafetyLevel(0, false, true).level
            });
          } else if (match.type === 'tolerance') {
            const boyDiff = Math.abs(Number(targetProduct.uzunlukBoy) - Number(sourceProduct.uzunlukBoy) * match.boyMult);
            const enDiff = Math.abs(Number(targetProduct.uzunlukEn) - Number(sourceProduct.uzunlukEn) * match.enMult);
            const toleranceUsed = Math.max(boyDiff, enDiff);
            
            const result = {
              ...targetProduct,
              id: `folded_tolerance_${Date.now()}_${Math.random()}`,
              hasirSayisi: Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi),
              toplamKg: Number(sourceProduct.toplamKg) + Number(targetProduct.toplamKg),
              mergeHistory: [
                ...(targetProduct.mergeHistory || []),
                `KATLI + TOLERANS: ${sourceProduct.hasirSayisi}adet(${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn}) ${match.multiple} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (tol: ${toleranceUsed}cm)`
              ],
              advancedOptimizationNotes: `Katlı + Tolerans: ${match.multiple} - tol: ${toleranceUsed}cm`,
              aciklama: `${targetProduct.aciklama || ''} | KATLI+TOL: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} -> ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple}x, ${toleranceUsed}cm)`
            };
            
            opportunities.push({
              type: 'katli_tolerance',
              source: sourceProduct,
              target: targetProduct,
              result: result,
              explanation: `KATLI İYİLEŞTİRME + TOLERANS: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple}x kat, tolerans: ${toleranceUsed.toFixed(1)}cm)`,
              toleranceUsed: toleranceUsed,
              safetyLevel: getSafetyLevel(toleranceUsed, false, true).category,  // Pass isFoldingOperation=true
              safetyLevelNumber: getSafetyLevel(toleranceUsed, false, true).level
            });
          }
        }
      }
    }
    
    // Remove duplicates and sort by safety
    const uniqueOps = opportunities.filter((op, index, self) => 
      index === self.findIndex(o => 
        ((o.source.id === op.source.id && o.target.id === op.target.id) ||
         (o.source.id === op.target.id && o.target.id === op.source.id)) && o.type === op.type
      )
    );
    
    return uniqueOps.sort((a, b) => a.toleranceUsed - b.toleranceUsed);
  };

  // Find rounding opportunities using global tolerance
//   const findRoundingOpportunities = () => {
//               id: `folded_${Date.now()}`,
//               hasirSayisi: product1.hasirSayisi + newCount + (remainder > 0 ? 1 : 0),
//               toplamKg: Number(product1.toplamKg) + Number(product2.toplamKg),
//               mergeHistory: [
//                 ...(product1.mergeHistory || []),
//                 `Katlı: ${product2.hasirSayisi}adet(${product2.uzunlukBoy}x${product2.uzunlukEn}) ÷${ratio2} + ${remainder > 0 ? '1' : '0'}→ ${newCount + (remainder > 0 ? 1 : 0)}`
//               ],
//               advancedOptimizationNotes: `Katlı iyileştirme: ${product2.uzunlukEn}cm→${product1.uzunlukEn}cm (x${ratio2}) tol:${Math.round(boyDiffCm * 10)}mm`,
//               aciklama: product1.aciklama || `Katlı birleştirme: ${product2.id} → ${product1.id}`
//             };
//             
//             explanation = `Katlı iyileştirme: ${product2.uzunlukEn}cm'yi ${ratio2} katla ${product1.uzunlukEn}cm yap`;
//             canFold = true;
//           }
//         }
// 
//         // Check en similar (within tolerance), boy multiple
//         const enDiff = Math.abs(product1.uzunlukEn - product2.uzunlukEn);
//         if (!canFold && enDiff <= tolerance) {
//           const ratio1 = product2.uzunlukBoy / product1.uzunlukBoy;
//           const ratio2 = product1.uzunlukBoy / product2.uzunlukBoy;
//           
//           if (Number.isInteger(ratio1) && ratio1 >= 2) {
//             const newCount = Math.floor(product1.hasirSayisi / ratio1);
//             const remainder = product1.hasirSayisi % ratio1;
//             
//             result = {
//               ...product2,
//               id: `folded_${Date.now()}`,
//               hasirSayisi: product2.hasirSayisi + newCount + (remainder > 0 ? 1 : 0),
//               toplamKg: Number(product2.toplamKg) + Number(product1.toplamKg),
//               mergeHistory: [
//                 ...(product2.mergeHistory || []),
//                 `Katlı: ${product1.hasirSayisi}adet(${product1.uzunlukBoy}x${product1.uzunlukEn}) ÷${ratio1} + ${remainder > 0 ? '1' : '0'}→ ${newCount + (remainder > 0 ? 1 : 0)}`
//               ],
//               advancedOptimizationNotes: `Katlı iyileştirme: ${product1.uzunlukBoy}cm→${product2.uzunlukBoy}cm (x${ratio1}) tol:${enDiff}mm`,
//               aciklama: product2.aciklama || `Katlı birleştirme: ${product1.id} → ${product2.id}`
//             };
//             
//             explanation = `Katlı iyileştirme: ${product1.uzunlukBoy}cm'yi ${ratio1} katla ${product2.uzunlukBoy}cm yap`;
//             canFold = true;
//           } else if (Number.isInteger(ratio2) && ratio2 >= 2) {
//             const newCount = Math.floor(product2.hasirSayisi / ratio2);
//             const remainder = product2.hasirSayisi % ratio2;
//             
//             result = {
//               ...product1,
//               id: `folded_${Date.now()}`,
//               hasirSayisi: product1.hasirSayisi + newCount + (remainder > 0 ? 1 : 0),
//               toplamKg: Number(product1.toplamKg) + Number(product2.toplamKg),
//               mergeHistory: [
//                 ...(product1.mergeHistory || []),
//                 `Katlı: ${product2.hasirSayisi}adet(${product2.uzunlukBoy}x${product2.uzunlukEn}) ÷${ratio2} + ${remainder > 0 ? '1' : '0'}→ ${newCount + (remainder > 0 ? 1 : 0)}`
//               ],
//               advancedOptimizationNotes: `Katlı iyileştirme: ${product2.uzunlukBoy}cm→${product1.uzunlukBoy}cm (x${ratio2}) tol:${enDiff}mm`,
//               aciklama: product1.aciklama || `Katlı birleştirme: ${product2.id} → ${product1.id}`
//             };
//             
//             explanation = `Katlı iyileştirme: ${product2.uzunlukBoy}cm'yi ${ratio2} katla ${product1.uzunlukBoy}cm yap`;
//             canFold = true;
//           }
//         }
// 
//         if (canFold) {
//           opportunities.push({
//             type: 'katli',
//             source: product1,
//             target: product2,
//             result: result!,
//             explanation
//           });
//           usedIds.add(product1.id);
//           usedIds.add(product2.id);
//           break;
//         }
//       }
//     }
// 
//     // Sort by tolerance used (safest first: 0 tolerance first, then higher)
//     return opportunities.sort((a, b) => a.toleranceUsed - b.toleranceUsed);
//   };
// 
//   // Find rounding opportunities using global tolerance
  // Find rounding opportunities - check ALL combinations
  const findRoundingOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    const processedPairs = new Set<string>();
    
    const candidateProducts = products.filter(p => 
      Number(p.hasirSayisi) <= maxHasirSayisi
    );
    
    for (let i = 0; i < candidateProducts.length; i++) {
      const product = candidateProducts[i];
      
      for (let j = 0; j < products.length; j++) {
        const target = products[j];
        
        if (product.id === target.id) continue;
        
        // Skip if we've already processed this pair
        const pairKey1 = `${product.id}-${target.id}`;
        const pairKey2 = `${target.id}-${product.id}`;
        if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) continue;
        
        if (product.hasirTipi !== target.hasirTipi || 
            product.boyCap !== target.boyCap || 
            product.enCap !== target.enCap) continue;
        
        const toleranceCm = tolerance;
        const boyDiffCm = target.uzunlukBoy - product.uzunlukBoy;
        const enDiffCm = target.uzunlukEn - product.uzunlukEn;
        
        // Both dimensions must be larger OR within tolerance
        if (boyDiffCm >= 0 && enDiffCm >= 0 && boyDiffCm <= toleranceCm && enDiffCm <= toleranceCm) {
          // Mark this pair as processed
          processedPairs.add(pairKey1);
          
          const result = {
            ...target,
            id: `rounded_${Date.now()}_${Math.random()}`,
            hasirSayisi: Number(product.hasirSayisi) + Number(target.hasirSayisi),
            toplamKg: Number(product.toplamKg) + Number(target.toplamKg),
            mergeHistory: [
              ...(target.mergeHistory || []),
              `Yukarı yuvarla: ${product.uzunlukBoy}x${product.uzunlukEn}(${product.hasirSayisi}) → ${target.uzunlukBoy}x${target.uzunlukEn}(+${product.hasirSayisi})`
            ],
            advancedOptimizationNotes: `Üste tamamla: ${product.hasirSayisi}+${target.hasirSayisi}=${Number(product.hasirSayisi) + Number(target.hasirSayisi)} adet (boy:+${boyDiffCm}cm, en:+${enDiffCm}cm)`,
            aciklama: target.aciklama || `Yuvarlama birleştirme: ${product.id} → ${target.id}`
          };
          
          opportunities.push({
            type: 'tamamla',
            source: product,
            target: target,
            result: result,
            explanation: `Üste tamamla: ${product.hasirSayisi}adet ${product.uzunlukBoy}x${product.uzunlukEn} → ${target.uzunlukBoy}x${target.uzunlukEn} (tolerans: ${Math.max(boyDiffCm, enDiffCm).toFixed(1)}cm)`,
            toleranceUsed: Math.max(boyDiffCm, enDiffCm),
            safetyLevel: getSafetyLevel(Math.max(boyDiffCm, enDiffCm)).category,
            safetyLevelNumber: getSafetyLevel(Math.max(boyDiffCm, enDiffCm)).level
          });
        }
      }
    }
    
    // Remove duplicates and sort
    const uniqueOps = opportunities.filter((op, index, self) => 
      index === self.findIndex(o => 
        (o.source.id === op.source.id && o.target.id === op.target.id) ||
        (o.source.id === op.target.id && o.target.id === op.source.id)
      )
    );
    
    return uniqueOps.sort((a, b) => a.toleranceUsed - b.toleranceUsed);
  };

  // Execute automatic merges
  const executeAutomaticMerges = () => {
    console.log('executeAutomaticMerges clicked - tolerance:', tolerance);
    console.log('Products count:', products.length);
    const opportunities = findMergeOpportunities();
    console.log('Found merge opportunities:', opportunities.length, opportunities);
    if (opportunities.length === 0) {
      toast.error('Otomatik birleştirilebilecek ürün bulunamadı (tolerance: ' + tolerance + 'cm)');
      return;
    }
    
    // Apply initial sorting based on current sortMode
    const sortedOps = sortPendingOperations(opportunities, sortMode);
    setPendingOperations(sortedOps);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
  };

  const executeFoldedImprovements = () => {
    console.log('executeFoldedImprovements clicked - tolerance:', tolerance);
    console.log('Products count:', products.length);
    const opportunities = findFoldedImprovements();
    console.log('Found folded opportunities:', opportunities.length, opportunities);
    if (opportunities.length === 0) {
      toast.error('Katlı iyileştirme yapılabilecek ürün bulunamadı (tolerance: ' + tolerance + 'cm)');
      return;
    }
    
    setPendingOperations(opportunities);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
  };

  const executeRoundingOperations = () => {
    console.log('executeRoundingOperations clicked - tolerance:', tolerance);
    console.log('Products count:', products.length);
    const opportunities = findRoundingOpportunities();
    console.log('Found rounding opportunities:', opportunities.length, opportunities);
    if (opportunities.length === 0) {
      toast.error('Üste tamamlanabilecek ürün bulunamadı (tolerance: ' + tolerance + 'cm)');
      return;
    }
    
    setPendingOperations(opportunities);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
  };

  // Find Hasir Tipi change opportunities - check ALL combinations
  const findHasirTipiChangeOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    const processedPairs = new Set<string>();
    
    const candidateProducts = products.filter(p => 
      Number(p.hasirSayisi) <= maxHasirSayisi
    );
    
    for (let i = 0; i < candidateProducts.length; i++) {
      const product = candidateProducts[i];
      const currentType = product.hasirTipi.charAt(0);
      
      // PHASE 1: Check all same-group possibilities
      for (let j = 0; j < products.length; j++) {
        const target = products[j];
        
        if (product.id === target.id) continue;
        if (target.hasirTipi.charAt(0) !== currentType) continue;
        
        // Skip if we've already processed this pair
        const pairKey1 = `${product.id}-${target.id}`;
        const pairKey2 = `${target.id}-${product.id}`;
        if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) continue;
        
        const toleranceCm = tolerance;
        const targetBoy = Number(target.uzunlukBoy);
        const targetEn = Number(target.uzunlukEn);
        const sourceBoy = Number(product.uzunlukBoy);
        const sourceEn = Number(product.uzunlukEn);
        
        const boyDiff = targetBoy - sourceBoy;
        const enDiff = targetEn - sourceEn;
        
        if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= toleranceCm && enDiff <= toleranceCm) {
          // Mark this pair as processed
          processedPairs.add(pairKey1);
          
          const result = {
            ...target,
            id: `type_changed_same_${Date.now()}_${Math.random()}`,
            hasirSayisi: Number(product.hasirSayisi) + Number(target.hasirSayisi),
            toplamKg: Number(product.toplamKg) + Number(target.toplamKg),
            mergeHistory: [
              ...(target.mergeHistory || []),
              `Tip değişikliği: ${product.hasirTipi}(${product.hasirSayisi}) -> ${target.hasirTipi}(+${product.hasirSayisi})`
            ],
            advancedOptimizationNotes: `Hasır tipi değişikliği: ${product.hasirTipi} -> ${target.hasirTipi}`,
            aciklama: target.aciklama || `Tip değişikliği: ${product.id} -> ${target.id}`
          };
          
          opportunities.push({
            type: 'tipi_degisiklik_same',
            source: product,
            target: target,
            result: result,
            explanation: `Hasır tipi değişikliği (aynı grup): ${product.hasirTipi}(${product.hasirSayisi}) ${sourceBoy}x${sourceEn} -> ${target.hasirTipi}(${targetBoy}x${targetEn})`,
            toleranceUsed: Math.max(boyDiff, enDiff),
            safetyLevel: getSafetyLevel(Math.max(boyDiff, enDiff), false).category,
            safetyLevelNumber: getSafetyLevel(Math.max(boyDiff, enDiff), false).level
          });
        }
      }
      
      // PHASE 2: Check all cross-group possibilities
      let targetTypes: string[] = [];
      if (currentType === 'Q') targetTypes = ['T'];
      else if (currentType === 'T') targetTypes = ['R'];
      
      for (const targetType of targetTypes) {
        for (let j = 0; j < products.length; j++) {
          const target = products[j];
          
          if (product.id === target.id) continue;
          if (!target.hasirTipi.startsWith(targetType)) continue;
          
          // Skip if we've already processed this pair
          const pairKey1 = `${product.id}-${target.id}`;
          const pairKey2 = `${target.id}-${product.id}`;
          if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) continue;
          
          const toleranceCm = tolerance;
          const targetBoy = Number(target.uzunlukBoy);
          const targetEn = Number(target.uzunlukEn);
          const sourceBoy = Number(product.uzunlukBoy);
          const sourceEn = Number(product.uzunlukEn);
          
          const boyDiff = targetBoy - sourceBoy;
          const enDiff = targetEn - sourceEn;
          
          if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= toleranceCm && enDiff <= toleranceCm) {
            // Mark this pair as processed
            processedPairs.add(pairKey1);
            
            const result = {
              ...target,
              id: `type_changed_cross_${Date.now()}_${Math.random()}`,
              hasirSayisi: Number(product.hasirSayisi) + Number(target.hasirSayisi),
              toplamKg: Number(product.toplamKg) + Number(target.toplamKg),
              mergeHistory: [
                ...(target.mergeHistory || []),
                `Tip değişikliği (gruplar arası): ${product.hasirTipi}(${product.hasirSayisi}) -> ${target.hasirTipi}(+${product.hasirSayisi})`
              ],
              advancedOptimizationNotes: `Hasır tipi değişikliği (gruplar arası): ${product.hasirTipi} -> ${target.hasirTipi}`,
              aciklama: target.aciklama || `Gruplar arası tip değişikliği: ${product.id} -> ${target.id}`
            };
            
            opportunities.push({
              type: 'tipi_degisiklik_cross',
              source: product,
              target: target,
              result: result,
              explanation: `Hasır tipi değişikliği (gruplar arası): ${product.hasirTipi}(${product.hasirSayisi}) ${sourceBoy}x${sourceEn} -> ${target.hasirTipi}(${targetBoy}x${targetEn})`,
              toleranceUsed: Math.max(boyDiff, enDiff),
              safetyLevel: getSafetyLevel(Math.max(boyDiff, enDiff), true).category,
              safetyLevelNumber: getSafetyLevel(Math.max(boyDiff, enDiff), true).level
            });
          }
        }
      }
    }
    
    // Remove duplicates and sort
    const uniqueOps = opportunities.filter((op, index, self) => 
      index === self.findIndex(o => 
        ((o.source.id === op.source.id && o.target.id === op.target.id) ||
         (o.source.id === op.target.id && o.target.id === op.source.id)) && o.type === op.type
      )
    );
    
    return uniqueOps.sort((a, b) => a.toleranceUsed - b.toleranceUsed);
  };

  // Smart Multi-Product Merging Analysis
  const findSmartMultiProductMerges = () => {
    console.log('🔍 Starting smart multi-product analysis...');
    const opportunities: MergeOperation[] = [];
    const usedIds = new Set<string>();
    
    // Group products by similar characteristics (type, diameter)
    const productGroups = new Map<string, Product[]>();
    
    products.forEach(product => {
      if (Number(product.hasirSayisi) > maxHasirSayisi) return; // Skip high quantity products
      
      const groupKey = `${product.hasirTipi}_${product.boyCap}_${product.enCap}`;
      if (!productGroups.has(groupKey)) {
        productGroups.set(groupKey, []);
      }
      productGroups.get(groupKey)!.push(product);
    });
    
    // Analyze each group for multi-product merge opportunities
    productGroups.forEach((groupProducts, groupKey) => {
      if (groupProducts.length < 2) return; // Need at least 2 products for smart merge
      
      console.log(`📊 Analyzing group ${groupKey} with ${groupProducts.length} products`);
      
      // Sort by quantity (prioritize eliminating smaller quantities)
      const sortedByQuantity = [...groupProducts].sort((a, b) => 
        Number(a.hasirSayisi) - Number(b.hasirSayisi)
      );
      
      // Try different combinations (2 to 5 products)
      for (let combinationSize = 2; combinationSize <= Math.min(5, sortedByQuantity.length); combinationSize++) {
        const combinations = generateCombinations(sortedByQuantity.filter(p => !usedIds.has(p.id)), combinationSize);
        
        for (const combination of combinations) {
          // Calculate optimal NEW product dimensions
          const maxBoy = Math.max(...combination.map(p => Number(p.uzunlukBoy)));
          const maxEn = Math.max(...combination.map(p => Number(p.uzunlukEn)));
          
          // Check if tolerances are within smart limits (20cm per dimension)
          const boyTolerances = combination.map(p => maxBoy - Number(p.uzunlukBoy));
          const enTolerances = combination.map(p => maxEn - Number(p.uzunlukEn));
          const maxBoyTolerance = Math.max(...boyTolerances);
          const maxEnTolerance = Math.max(...enTolerances);
          
          if (maxBoyTolerance <= 20 && maxEnTolerance <= 20) {
            // Calculate traditional merging path
            const traditionalPath = calculateTraditionalPath(combination);
            const smartTotalTolerance = maxBoyTolerance + maxEnTolerance;
            
            // Smart wins if it saves at least 20cm total tolerance compared to traditional
            if (traditionalPath.feasible && (traditionalPath.totalTolerance - smartTotalTolerance >= 20)) {
              const totalQuantity = combination.reduce((sum, p) => sum + Number(p.hasirSayisi), 0);
              const totalKg = combination.reduce((sum, p) => sum + Number(p.toplamKg), 0);
              
              // Create new optimal product
              const newProduct: Product = {
                ...combination[0], // Use first product as base
                id: `smart_new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                uzunlukBoy: maxBoy,
                uzunlukEn: maxEn,
                hasirSayisi: totalQuantity,
                toplamKg: totalKg,
                mergeHistory: [
                  `AKILLI YENİ ÜRÜN: ${combination.map(p => `${p.uzunlukBoy}x${p.uzunlukEn}(${p.hasirSayisi})`).join(' + ')} → ${maxBoy}x${maxEn}(${totalQuantity})`
                ],
                advancedOptimizationNotes: `SMART NEW: ${combination.length} ürün → yeni optimal boyut ${maxBoy}x${maxEn}`,
                aciklama: `Akıllı yeni ürün oluşturma`
              };
              
              opportunities.push({
                type: 'smart_multi',
                source: combination[0], // Primary source for display
                target: newProduct, // The NEW product we're creating
                result: newProduct,
                explanation: `AKILLI YENİ ÜRÜN: ${combination.length} ürün → YENİ ${maxBoy}x${maxEn} (tolerans tasarrufu: ${(traditionalPath.totalTolerance - smartTotalTolerance).toFixed(1)}cm)`,
                toleranceUsed: Math.max(maxBoyTolerance, maxEnTolerance),
                safetyLevel: getSafetyLevel(Math.max(maxBoyTolerance, maxEnTolerance)).category,
                safetyLevelNumber: getSafetyLevel(Math.max(maxBoyTolerance, maxEnTolerance)).level,
                smartData: {
                  involvedProducts: combination,
                  traditionalAlternative: traditionalPath,
                  smartOption: {
                    type: 'smart',
                    steps: 1,
                    finalDimensions: `${maxBoy}x${maxEn}`,
                    toleranceBoy: maxBoyTolerance,
                    toleranceEn: maxEnTolerance,
                    totalTolerance: smartTotalTolerance
                  }
                }
              });
              
              // Mark all products as used
              combination.forEach(p => usedIds.add(p.id));
              
              console.log(`✅ Smart new product: ${combination.length} products → NEW ${maxBoy}x${maxEn} (saves ${(traditionalPath.totalTolerance - smartTotalTolerance).toFixed(1)}cm tolerance)`);
              break; // Found best combination for these products
            }
          }
        }
      }
    });
    
    console.log(`🎯 Smart analysis complete: ${opportunities.length} multi-product opportunities found`);
    return opportunities.sort((a, b) => a.safetyLevelNumber - b.safetyLevelNumber);
  };
  
  // Helper function to generate combinations
  const generateCombinations = (arr: Product[], size: number): Product[][] => {
    if (size === 1) return arr.map(item => [item]);
    if (size === arr.length) return [arr];
    if (size > arr.length) return [];
    
    const combinations: Product[][] = [];
    for (let i = 0; i <= arr.length - size; i++) {
      const smallerCombinations = generateCombinations(arr.slice(i + 1), size - 1);
      smallerCombinations.forEach(combination => {
        combinations.push([arr[i], ...combination]);
      });
    }
    return combinations;
  };
  
  // Calculate traditional merging path and total tolerance
  const calculateTraditionalPath = (products: Product[]) => {
    // Sort by size (smallest to largest)
    const sorted = [...products].sort((a, b) => 
      (Number(a.uzunlukBoy) * Number(a.uzunlukEn)) - (Number(b.uzunlukBoy) * Number(b.uzunlukEn))
    );
    
    let steps = 0;
    let totalTolerance = 0;
    let currentProduct = sorted[0];
    const path: string[] = [];
    
    // Try to merge each product into the next larger one
    for (let i = 1; i < sorted.length; i++) {
      const nextProduct = sorted[i];
      const boyDiff = Number(nextProduct.uzunlukBoy) - Number(currentProduct.uzunlukBoy);
      const enDiff = Number(nextProduct.uzunlukEn) - Number(currentProduct.uzunlukEn);
      
      // Check if merge is possible within global tolerance
      if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= tolerance && enDiff <= tolerance) {
        steps++;
        const stepTolerance = boyDiff + enDiff;
        totalTolerance += stepTolerance;
        path.push(`${currentProduct.uzunlukBoy}x${currentProduct.uzunlukEn} → ${nextProduct.uzunlukBoy}x${nextProduct.uzunlukEn} (${stepTolerance}cm)`);
        currentProduct = nextProduct;
      } else {
        // Traditional path not feasible
        return { steps: 0, totalTolerance: 0, feasible: false, path: [] };
      }
    }
    
    return { steps, totalTolerance, feasible: true, path };
  };

  // Generate smart alternative for any operation
  const generateSmartAlternativeForOperation = (operation: MergeOperation) => {
    // Find other products that could be included in a smart merge
    const involvedProductIds = new Set([operation.source.id, operation.target.id]);
    
    // Look for additional products of same type/diameter that could be merged
    const sameTypeProducts = products.filter(p => 
      !involvedProductIds.has(p.id) &&
      p.hasirTipi === operation.source.hasirTipi &&
      p.boyCap === operation.source.boyCap &&
      p.enCap === operation.source.enCap &&
      Number(p.hasirSayisi) <= maxHasirSayisi
    );
    
    // Try combinations with the current operation products
    const baseProducts = [operation.source, operation.target];
    
    // Test different combinations (2-4 products)
    for (let additionalCount = 0; additionalCount <= Math.min(2, sameTypeProducts.length); additionalCount++) {
      if (additionalCount === 0) {
        // Just the original two products
        const testProducts = baseProducts;
        const smartAlternative = testSmartMergeForProducts(testProducts);
        if (smartAlternative) return smartAlternative;
      } else {
        // Add 1-2 additional products
        const combinations = generateCombinations(sameTypeProducts, additionalCount);
        for (const additionalProducts of combinations) {
          const testProducts = [...baseProducts, ...additionalProducts];
          const smartAlternative = testSmartMergeForProducts(testProducts);
          if (smartAlternative) return smartAlternative;
        }
      }
    }
    
    return null;
  };

  // Test if products can be smart merged
  const testSmartMergeForProducts = (products: Product[]) => {
    if (products.length < 2) return null;
    
    // Calculate optimal dimensions
    const maxBoy = Math.max(...products.map(p => Number(p.uzunlukBoy)));
    const maxEn = Math.max(...products.map(p => Number(p.uzunlukEn)));
    
    // Check smart merge constraints
    const boyTolerances = products.map(p => maxBoy - Number(p.uzunlukBoy));
    const enTolerances = products.map(p => maxEn - Number(p.uzunlukEn));
    const maxBoyTolerance = Math.max(...boyTolerances);
    const maxEnTolerance = Math.max(...enTolerances);
    
    // Must be within 20cm per dimension
    if (maxBoyTolerance > 20 || maxEnTolerance > 20) return null;
    
    // Calculate traditional path
    const traditionalPath = calculateTraditionalPath(products);
    if (!traditionalPath.feasible) return null;
    
    const smartTotalTolerance = maxBoyTolerance + maxEnTolerance;
    
    // Smart must save at least 20cm total tolerance
    if (traditionalPath.totalTolerance - smartTotalTolerance < 20) return null;
    
    return {
      involvedProducts: products,
      traditionalAlternative: traditionalPath,
      smartOption: {
        type: 'smart',
        steps: 1,
        finalDimensions: `${maxBoy}x${maxEn}`,
        toleranceBoy: maxBoyTolerance,
        toleranceEn: maxEnTolerance,
        totalTolerance: smartTotalTolerance
      }
    };
  };

  const executeSmartMultiProductMerges = () => {
    console.log('🚀 executeSmartMultiProductMerges clicked - tolerance:', tolerance);
    const opportunities = findSmartMultiProductMerges();
    console.log('Smart multi-product opportunities:', opportunities.length, opportunities);
    
    if (opportunities.length === 0) {
      toast.error('Akıllı çoklu birleştirme yapılabilecek ürün grubu bulunamadı (min 3 ürün gerekli)');
      return;
    }
    
    setPendingOperations(opportunities);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
    toast.success(`${opportunities.length} akıllı çoklu birleştirme fırsatı bulundu!`);
  };

  // Find the best optimization opportunity for a specific product pair
  const findBestOpportunityForPair = (sourceProduct: any, targetProduct: any, includeTypeChanges: boolean = false): MergeOperation | null => {
    const opportunities: MergeOperation[] = [];
    
    // 1. Check basic merge (boydan/enden)
    if (targetProduct.hasirTipi === sourceProduct.hasirTipi && 
        targetProduct.boyCap === sourceProduct.boyCap && 
        targetProduct.enCap === sourceProduct.enCap) {
      
      const toleranceCm = tolerance;
      const targetBoy = Number(targetProduct.uzunlukBoy);
      const targetEn = Number(targetProduct.uzunlukEn);
      const sourceBoy = Number(sourceProduct.uzunlukBoy);
      const sourceEn = Number(sourceProduct.uzunlukEn);
      
      const boyDiff = targetBoy - sourceBoy;
      const enDiff = targetEn - sourceEn;
      
      if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= toleranceCm && enDiff <= toleranceCm) {
        const actualDiffCm = Math.max(boyDiff, enDiff);
        const mergeType = boyDiff <= enDiff ? 'boydan' : 'enden';
        const optimized = mergeType === 'boydan' 
          ? optimizeBoydan(sourceProduct, targetProduct)
          : optimizeEnden(sourceProduct, targetProduct);
        
        opportunities.push({
          type: mergeType,
          source: sourceProduct,
          target: targetProduct,
          result: optimized,
          explanation: `OPTİMİZASYON: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} silinecek → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} olarak üretilecek (+${sourceProduct.hasirSayisi} adet, tolerans: ${actualDiffCm.toFixed(1)}cm)`,
          toleranceUsed: actualDiffCm,
          safetyLevel: getSafetyLevel(actualDiffCm).category,
          safetyLevelNumber: getSafetyLevel(actualDiffCm).level
        });
      }
    }
    
    // 2. Check rounding (tamamla)
    if (sourceProduct.hasirTipi === targetProduct.hasirTipi && 
        sourceProduct.boyCap === targetProduct.boyCap && 
        sourceProduct.enCap === targetProduct.enCap) {
      
      const toleranceCm = tolerance;
      const boyDiffCm = targetProduct.uzunlukBoy - sourceProduct.uzunlukBoy;
      const enDiffCm = targetProduct.uzunlukEn - sourceProduct.uzunlukEn;
      
      if (boyDiffCm >= 0 && enDiffCm >= 0 && boyDiffCm <= toleranceCm && enDiffCm <= toleranceCm) {
        const result = {
          ...targetProduct,
          id: `rounded_${Date.now()}_${Math.random()}`,
          hasirSayisi: Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi),
          toplamKg: Number(sourceProduct.toplamKg) + Number(targetProduct.toplamKg),
          mergeHistory: [
            ...(targetProduct.mergeHistory || []),
            `Yukarı yuvarla: ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn}(${sourceProduct.hasirSayisi}) → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn}(+${sourceProduct.hasirSayisi})`
          ],
          advancedOptimizationNotes: `Üste tamamla: ${sourceProduct.hasirSayisi}+${targetProduct.hasirSayisi}=${Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi)} adet (boy:+${boyDiffCm}cm, en:+${enDiffCm}cm)`,
          aciklama: targetProduct.aciklama || `Yuvarlama birleştirme: ${sourceProduct.id} → ${targetProduct.id}`
        };
        
        opportunities.push({
          type: 'tamamla',
          source: sourceProduct,
          target: targetProduct,
          result: result,
          explanation: `Üste tamamla: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (tolerans: ${Math.max(boyDiffCm, enDiffCm).toFixed(1)}cm)`,
          toleranceUsed: Math.max(boyDiffCm, enDiffCm),
          safetyLevel: getSafetyLevel(Math.max(boyDiffCm, enDiffCm)).category,
          safetyLevelNumber: getSafetyLevel(Math.max(boyDiffCm, enDiffCm)).level
        });
      }
    }
    
    // 3. Check folding opportunities
    if (sourceProduct.hasirTipi === targetProduct.hasirTipi) {
      const matches = findMatchingMultiples(sourceProduct, targetProduct);
      
      for (const match of matches) {
        if (match.type === 'exact') {
          const result = {
            ...targetProduct,
            id: `folded_exact_${Date.now()}_${Math.random()}`,
            hasirSayisi: Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi),
            toplamKg: Number(sourceProduct.toplamKg) + Number(targetProduct.toplamKg),
            mergeHistory: [
              ...(targetProduct.mergeHistory || []),
              `KATLI İYİLEŞTİRME: ${sourceProduct.hasirSayisi}adet(${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn}) EXACT ${match.multiple} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn}`
            ],
            advancedOptimizationNotes: `Katlı iyileştirme EXACT: ${match.multiple} - ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn}`,
            aciklama: `${targetProduct.aciklama || ''} | KATLI: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} -> ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple}x)`
          };
          
          opportunities.push({
            type: 'katli_exact',
            source: sourceProduct,
            target: targetProduct,
            result: result,
            explanation: `KATLI İYİLEŞTİRME (TAM KAT): ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple}x kat, tolerans: 0cm)`,
            toleranceUsed: 0,
            safetyLevel: getSafetyLevel(0, false, true).category,
            safetyLevelNumber: getSafetyLevel(0, false, true).level
          });
        } else if (match.type === 'tolerance') {
          const boyDiff = Math.abs(Number(targetProduct.uzunlukBoy) - Number(sourceProduct.uzunlukBoy) * match.boyMult);
          const enDiff = Math.abs(Number(targetProduct.uzunlukEn) - Number(sourceProduct.uzunlukEn) * match.enMult);
          const toleranceUsed = Math.max(boyDiff, enDiff);
          
          const result = {
            ...targetProduct,
            id: `folded_tolerance_${Date.now()}_${Math.random()}`,
            hasirSayisi: Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi),
            toplamKg: Number(sourceProduct.toplamKg) + Number(targetProduct.toplamKg),
            mergeHistory: [
              ...(targetProduct.mergeHistory || []),
              `KATLI + TOLERANS: ${sourceProduct.hasirSayisi}adet(${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn}) ${match.multiple} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (tol: ${toleranceUsed}cm)`
            ],
            advancedOptimizationNotes: `Katlı + Tolerans: ${match.multiple} - tol: ${toleranceUsed}cm`,
            aciklama: `${targetProduct.aciklama || ''} | KATLI+TOL: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} -> ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple}x, ${toleranceUsed}cm)`
          };
          
          opportunities.push({
            type: 'katli_tolerance',
            source: sourceProduct,
            target: targetProduct,
            result: result,
            explanation: `KATLI İYİLEŞTİRME + TOLERANS: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple}x kat, tolerans: ${toleranceUsed.toFixed(1)}cm)`,
            toleranceUsed: toleranceUsed,
            safetyLevel: getSafetyLevel(toleranceUsed, false, true).category,
            safetyLevelNumber: getSafetyLevel(toleranceUsed, false, true).level
          });
        }
      }
    }
    
    // 4. Check hasir tipi changes (same group AND cross group) - only if includeTypeChanges is true
    if (includeTypeChanges) {
      const currentType = sourceProduct.hasirTipi.charAt(0);

      // 4a. Same group changes (Q->Q, T->T, R->R)
      if (targetProduct.hasirTipi.charAt(0) === currentType) {
        const toleranceCm = tolerance;
        const targetBoy = Number(targetProduct.uzunlukBoy);
        const targetEn = Number(targetProduct.uzunlukEn);
        const sourceBoy = Number(sourceProduct.uzunlukBoy);
        const sourceEn = Number(sourceProduct.uzunlukEn);

        const boyDiff = targetBoy - sourceBoy;
        const enDiff = targetEn - sourceEn;

        if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= toleranceCm && enDiff <= toleranceCm) {
          const result = {
            ...targetProduct,
            id: `type_changed_same_${Date.now()}_${Math.random()}`,
            hasirSayisi: Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi),
            toplamKg: Number(sourceProduct.toplamKg) + Number(targetProduct.toplamKg),
            mergeHistory: [
              ...(targetProduct.mergeHistory || []),
              `Tip değişikliği: ${sourceProduct.hasirTipi}(${sourceProduct.hasirSayisi}) -> ${targetProduct.hasirTipi}(+${sourceProduct.hasirSayisi})`
            ],
            advancedOptimizationNotes: `Hasır tipi değişikliği: ${sourceProduct.hasirTipi} -> ${targetProduct.hasirTipi}`,
            aciklama: targetProduct.aciklama || `Tip değişikliği: ${sourceProduct.id} -> ${targetProduct.id}`
          };

          opportunities.push({
            type: 'tipi_degisiklik_same',
            source: sourceProduct,
            target: targetProduct,
            result: result,
            explanation: `Hasır tipi değişikliği (aynı grup): ${sourceProduct.hasirTipi}(${sourceProduct.hasirSayisi}) ${sourceBoy}x${sourceEn} -> ${targetProduct.hasirTipi}(${targetBoy}x${targetEn})`,
            toleranceUsed: Math.max(boyDiff, enDiff),
            safetyLevel: getSafetyLevel(Math.max(boyDiff, enDiff), false).category,
            safetyLevelNumber: getSafetyLevel(Math.max(boyDiff, enDiff), false).level
          });
        }
      }

      // 4b. Cross group changes (Q->T, T->R) - CRITICAL FIX: Move inside includeTypeChanges check
      let targetTypes: string[] = [];
      if (currentType === 'Q') targetTypes = ['T'];
      else if (currentType === 'T') targetTypes = ['R'];

      for (const targetType of targetTypes) {
        if (targetProduct.hasirTipi.startsWith(targetType)) {
          const toleranceCm = tolerance;
          const targetBoy = Number(targetProduct.uzunlukBoy);
          const targetEn = Number(targetProduct.uzunlukEn);
          const sourceBoy = Number(sourceProduct.uzunlukBoy);
          const sourceEn = Number(sourceProduct.uzunlukEn);

          const boyDiff = targetBoy - sourceBoy;
          const enDiff = targetEn - sourceEn;

          if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= toleranceCm && enDiff <= toleranceCm) {
            const result = {
              ...targetProduct,
              id: `type_changed_cross_${Date.now()}_${Math.random()}`,
              hasirSayisi: Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi),
              toplamKg: Number(sourceProduct.toplamKg) + Number(targetProduct.toplamKg),
              mergeHistory: [
                ...(targetProduct.mergeHistory || []),
                `Tip değişikliği (gruplar arası): ${sourceProduct.hasirTipi}(${sourceProduct.hasirSayisi}) -> ${targetProduct.hasirTipi}(+${sourceProduct.hasirSayisi})`
              ],
              advancedOptimizationNotes: `Hasır tipi değişikliği (gruplar arası): ${sourceProduct.hasirTipi} -> ${targetProduct.hasirTipi}`,
              aciklama: targetProduct.aciklama || `Gruplar arası tip değişikliği: ${sourceProduct.id} -> ${targetProduct.id}`
            };

            opportunities.push({
              type: 'tipi_degisiklik_cross',
              source: sourceProduct,
              target: targetProduct,
              result: result,
              explanation: `Hasır tipi değişikliği (gruplar arası): ${sourceProduct.hasirTipi}(${sourceProduct.hasirSayisi}) ${sourceBoy}x${sourceEn} -> ${targetProduct.hasirTipi}(${targetBoy}x${targetEn})`,
              toleranceUsed: Math.max(boyDiff, enDiff),
              safetyLevel: getSafetyLevel(Math.max(boyDiff, enDiff), true).category,
              safetyLevelNumber: getSafetyLevel(Math.max(boyDiff, enDiff), true).level
            });
          }
        }
      }
    } // Close includeTypeChanges check - FIXED: Now encompasses both same-group and cross-group changes
    
    // Return the safest (lowest safetyLevelNumber) opportunity if any found
    if (opportunities.length === 0) return null;
    
    return opportunities.sort((a, b) => a.safetyLevelNumber - b.safetyLevelNumber)[0];
  };

  // Comprehensive mega-function with global deduplication
  const findAllOptimizationOpportunities = () => {
    console.log('🚀 Starting comprehensive optimization analysis...');
    
    const allOpportunities: MergeOperation[] = [];
    const globalProcessedPairs = new Set<string>();
    const operationSignatures = new Set<string>(); // Track unique operations to prevent duplicates
    
    const candidateProducts = products.filter(p => 
      Number(p.hasirSayisi) <= maxHasirSayisi
    );
    
    console.log(`🔍 Candidates for elimination: ${candidateProducts.length}/${products.length} products`);
    
    // Check ALL possible product pairs ONCE across all optimization types
    for (let i = 0; i < candidateProducts.length; i++) {
      const sourceProduct = candidateProducts[i];
      
      for (let j = 0; j < products.length; j++) {
        const targetProduct = products[j];
        
        if (sourceProduct.id === targetProduct.id) continue;
        
        // Create unique pair key to avoid duplicates
        const pairKey1 = `${sourceProduct.id}-${targetProduct.id}`;
        const pairKey2 = `${targetProduct.id}-${sourceProduct.id}`;
        
        if (globalProcessedPairs.has(pairKey1) || globalProcessedPairs.has(pairKey2)) continue;
        
        // Mark this pair as processed immediately
        globalProcessedPairs.add(pairKey1);
        
        // Use getAllMergeOptions to get all possible merge options (including fallbacks)
        const mergeOptions = getAllMergeOptions(sourceProduct, targetProduct, includeTypeChanges);
        
        // First, try to find options within tolerance
        const safeOptions = mergeOptions.filter(option => option.tolerance <= tolerance);
        
        if (safeOptions.length > 0) {
          // Convert to MergeOperation format and add safe options (take the best one)
          const bestSafeOption = safeOptions[0]; // Already sorted by safety/tolerance
          const result = bestSafeOption.result || 
            (bestSafeOption.type === 'boydan' ? optimizeBoydan(bestSafeOption.source, bestSafeOption.target) : 
             bestSafeOption.type === 'enden' ? optimizeEnden(bestSafeOption.source, bestSafeOption.target) : 
             bestSafeOption.target);
          
          // Create a signature for this operation to prevent duplicates
          const sourceKey = `${bestSafeOption.source.hasirTipi}-${bestSafeOption.source.uzunlukBoy}x${bestSafeOption.source.uzunlukEn}-${bestSafeOption.source.hasirSayisi}`;
          const targetKey = `${bestSafeOption.target.hasirTipi}-${bestSafeOption.target.uzunlukBoy}x${bestSafeOption.target.uzunlukEn}`;
          const operationSig = `${bestSafeOption.type}:${sourceKey}→${targetKey}`;
          
          // Only add if this exact operation hasn't been added before
          if (!operationSignatures.has(operationSig)) {
            operationSignatures.add(operationSig);
            allOpportunities.push({
              type: bestSafeOption.type,
              source: bestSafeOption.source,
              target: bestSafeOption.target,
              result: result,
              explanation: bestSafeOption.explanation,
              toleranceUsed: bestSafeOption.tolerance,
              safetyLevel: bestSafeOption.safetyLevel,
              safetyLevelNumber: bestSafeOption.safetyLevelNumber || getSafetyLevel(bestSafeOption.tolerance).level
            });
          }
        } else if (mergeOptions.length > 0) {
          // No safe options found, add the safest risky option as fallback
          const safestRiskyOption = mergeOptions[0]; // getAllMergeOptions already sorts by safety
          const result = safestRiskyOption.result || safestRiskyOption.target;
          
          // Create a signature for this operation to prevent duplicates
          const sourceKey = `${safestRiskyOption.source.hasirTipi}-${safestRiskyOption.source.uzunlukBoy}x${safestRiskyOption.source.uzunlukEn}-${safestRiskyOption.source.hasirSayisi}`;
          const targetKey = `${safestRiskyOption.target.hasirTipi}-${safestRiskyOption.target.uzunlukBoy}x${safestRiskyOption.target.uzunlukEn}`;
          const operationSig = `${safestRiskyOption.type}:${sourceKey}→${targetKey}`;
          
          // Only add if this exact operation hasn't been added before
          if (!operationSignatures.has(operationSig)) {
            operationSignatures.add(operationSig);
            allOpportunities.push({
              type: safestRiskyOption.type,
              source: safestRiskyOption.source,
              target: safestRiskyOption.target,
              result: result,
              explanation: `⚠️ YEDEK SEÇENEK: ${safestRiskyOption.explanation}`,
              toleranceUsed: safestRiskyOption.tolerance,
              safetyLevel: safestRiskyOption.safetyLevel,
              safetyLevelNumber: safestRiskyOption.safetyLevelNumber || getSafetyLevel(safestRiskyOption.tolerance).level
            });
          }
        }
      }
    }
    
    // Sort by safety level (safest first: 0 → 10)
    const sortedOpportunities = allOpportunities.sort((a, b) => a.safetyLevelNumber - b.safetyLevelNumber);
    
    // Debug: Count operations by type and safety level
    const safeOps = sortedOpportunities.filter(op => op.safetyLevel === 'safe');
    console.log(`🔍 Safe operations: ${safeOps.length}`);
    console.log('Safe operation types:', safeOps.map(op => `${op.type} (${op.toleranceUsed}cm)`));
    
    const byType: Record<string, number> = {};
    sortedOpportunities.forEach(op => {
      byType[op.type] = (byType[op.type] || 0) + 1;
    });
    console.log('Operations by type:', byType);
    
    console.log(`💡 Total unique opportunities: ${sortedOpportunities.length} (globally deduplicated)`);
    return sortedOpportunities;
  };

  const executeComprehensiveOptimization = () => {
    console.log('🎯 executeComprehensiveOptimization clicked - opening dialog with default values');
    // Use default dialog values (no longer dependent on main page sliders)
    setDialogTolerance(10); // Default tolerance
    setDialogMaxHasirSayisi(50); // Default minimum hasır sayısı
    const opportunities = findAllOptimizationOpportunities();
    console.log('Comprehensive opportunities:', opportunities.length, opportunities);
    
    // Debug: Count operations by type and safety level
    const safeOps = opportunities.filter(op => op.safetyLevel === 'safe');
    const riskyOps = opportunities.filter(op => op.safetyLevel === 'risky');
    const fallbackOps = opportunities.filter(op => op.explanation.includes('YEDEK SEÇENEK'));
    
    console.log(`🔍 Safe operations: ${safeOps.length}, Risky operations: ${riskyOps.length}, Fallback options: ${fallbackOps.length}`);
    console.log('Safe operation types:', safeOps.map(op => `${op.type} (${op.toleranceUsed}cm)`));
    if (fallbackOps.length > 0) {
      console.log('Fallback operation types:', fallbackOps.map(op => `${op.type} (${op.toleranceUsed}cm)`));
    }
    
    const byType: Record<string, number> = {};
    opportunities.forEach(op => {
      byType[op.type] = (byType[op.type] || 0) + 1;
    });
    console.log('Operations by type:', byType);
    
    if (opportunities.length === 0) {
      toast.error('Optimizasyon yapılabilecek ürün kombinasyonu bulunamadı');
      return;
    }
    
    // Apply initial sorting based on current sortMode (default is 'safety')
    const sortedOps = sortPendingOperations(opportunities, sortMode);

    // Debug: Show first 10 operations with their sort keys
    console.log(`📊 INITIAL SORT (${sortMode === 'safety' ? 'by safety' : 'by quantity'}):`, sortedOps.slice(0, 10).map(op => ({
      type: op.type,
      explanation: op.explanation.substring(0, 50),
      safetyLevel: op.safetyLevelNumber,
      tolerance: op.toleranceUsed,
      hasirSayisi: op.source.hasirSayisi
    })));

    setPendingOperations(sortedOps);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
    toast.success(`${opportunities.length} optimizasyon fırsatı bulundu! (${sortMode === 'safety' ? 'Güvenlik sırasına' : 'Hasır sayısına'} göre sıralandı)`);
  };

  // Sort pending operations based on selected mode
  const sortPendingOperations = (operations: MergeOperation[], mode: 'safety' | 'quantity') => {
    return [...operations].sort((a, b) => {
      if (mode === 'safety') {
        // Sort by safety level (safest first: 0 → 10)
        const aLevel = a.safetyLevelNumber ?? 10; // Default to most dangerous if undefined
        const bLevel = b.safetyLevelNumber ?? 10;
        if (aLevel !== bLevel) {
          return aLevel - bLevel;
        }
        // If safety levels are equal, sort by tolerance as tiebreaker
        return a.toleranceUsed - b.toleranceUsed;
      } else {
        // Sort by quantity (lowest hasir sayisi first)
        const aQty = Number(a.source.hasirSayisi) || 0;
        const bQty = Number(b.source.hasirSayisi) || 0;
        if (aQty !== bQty) {
          return aQty - bQty;
        }
        // If quantities are equal, sort by safety as tiebreaker
        const aLevel = a.safetyLevelNumber ?? 10;
        const bLevel = b.safetyLevelNumber ?? 10;
        return aLevel - bLevel;
      }
    });
  };

  // Apply sorting when sort mode changes
  const applySorting = (newSortMode: 'safety' | 'quantity') => {
    console.log(`🔄 APPLYING SORT: ${sortMode} → ${newSortMode}`);
    setSortMode(newSortMode);
    if (pendingOperations.length > 0) {
      const sortedOps = sortPendingOperations(pendingOperations, newSortMode);

      // Debug: Show first 5 operations with their sort keys
      console.log(`📊 SORTED OPS (${sortMode === 'safety' ? 'by safety' : 'by quantity'}):`, sortedOps.slice(0, 5).map(op => ({
        type: op.type,
        source: `${op.source.hasirTipi}/${op.source.hasirSayisi}`,
        target: `${op.target.hasirTipi}`,
        safetyLevel: op.safetyLevelNumber,
        tolerance: op.toleranceUsed,
        hasirSayisi: op.source.hasirSayisi
      })));

      // Force a new array reference to ensure React re-renders
      setPendingOperations([...sortedOps]);
      // Reset to first operation after sorting
      setCurrentOperationIndex(0);
      // Force component re-render by updating state
      setTimeout(() => {
        console.log(`✅ SORT COMPLETE: Now showing operation for ${sortedOps[0]?.source.hasirTipi}`);
      }, 10);
    }
  };

  const executeHasirTipiChanges = () => {
    console.log('executeHasirTipiChanges clicked - tolerance:', tolerance);
    console.log('Products count:', products.length);
    const opportunities = findHasirTipiChangeOpportunities();
    console.log('Found hasir tipi opportunities:', opportunities.length, opportunities);
    if (opportunities.length === 0) {
      toast.error('Hasır tipi değişikliği yapılabilecek ürün bulunamadı (tolerance: ' + tolerance + 'cm)');
      return;
    }
    
    setPendingOperations(opportunities);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
  };

  // Remove ALL operations involving deleted products when an operation is approved
  const removeConflictingOperations = (approvedOperation: MergeOperation, operations: MergeOperation[]) => {
    // When we approve an operation, the source product gets DELETED
    const deletedProductId = approvedOperation.source.id;
    
    console.log(`🗑️ Removing all operations involving deleted product: ${deletedProductId}`);
    
    // Remove ALL operations (both processed and unprocessed) that involve the deleted product
    const remainingOperations = operations.filter((op, index) => {
      // Skip the current approved operation itself
      if (index === currentOperationIndex) return false;
      
      // Remove any operation that uses the deleted product as source OR target
      const involvesDeletedProduct = op.source.id === deletedProductId || op.target.id === deletedProductId;
      
      if (involvesDeletedProduct) {
        console.log(`❌ Removing operation: ${op.explanation}`);
      }
      
      return !involvesDeletedProduct;
    });
    
    console.log(`📊 Operations reduced from ${operations.length} to ${remainingOperations.length}`);
    return remainingOperations;
  };

  // Approve current operation and apply immediately
  const approveCurrentOperation = () => {
    if (currentOperationIndex >= pendingOperations.length) return;
    
    const operation = pendingOperations[currentOperationIndex];
    
    // STEP 1: Apply the merge immediately to the products table
    const sourceExists = products.find(p => p.id === operation.source.id);
    const targetExists = products.find(p => p.id === operation.target.id);
    
    if (sourceExists && targetExists) {
      // Move source product to deleted list
      const sourceProduct = products.find(p => p.id === operation.source.id)!;
      moveToDeleted([sourceProduct], `Merged into ${operation.target.hasirTipi} (${operation.target.uzunlukBoy}x${operation.target.uzunlukEn})`, operation.result.id);
      
      // Remove source and target, add merged result
      const updatedProducts = products
        .filter(p => p.id !== operation.source.id && p.id !== operation.target.id)
        .concat(operation.result);
      
      setProductsWithDebug(updatedProducts);
      addToHistory(updatedProducts);
      
      console.log(`✅ Applied merge: ${operation.source.id} + ${operation.target.id} = ${operation.result.id}`);
      console.log(`📊 Products count: ${products.length} → ${updatedProducts.length}`);
    }
    
    // STEP 2: Remove ALL operations involving the deleted product
    const filteredOperations = removeConflictingOperations(operation, pendingOperations);
    setPendingOperations(filteredOperations);
    
    // STEP 3: Move to next operation or close dialog
    if (filteredOperations.length > 0 && currentOperationIndex < filteredOperations.length) {
      // Find next available operation index
      const nextIndex = Math.min(currentOperationIndex, filteredOperations.length - 1);
      setCurrentOperationIndex(nextIndex);
    } else {
      // No more operations left
      setShowApprovalDialog(false);
      setPendingOperations([]);
      setCurrentOperationIndex(0);
      toast.success('Tüm işlemler tamamlandı!');
    }
  };

  // Apply all safe operations (only operations marked as 'safe')
  const applyAllSafeOperations = () => {
    // Only include operations with 'safe' safety level
    const safeOperations = pendingOperations.filter(op => op.safetyLevel === 'safe');
    
    if (safeOperations.length === 0) {
      toast.error('Güvenli işlem bulunamadı');
      return;
    }
    
    console.log(`🚀 Applying ${safeOperations.length} safe operations automatically`);
    
    // Apply all safe operations sequentially
    let currentProducts = [...products];
    let appliedCount = 0;
    let skippedCount = 0;
    
    for (const operation of safeOperations) {
      // Check if source and target still exist (might have been used in previous operation)
      const sourceExists = currentProducts.find(p => p.id === operation.source.id);
      const targetExists = currentProducts.find(p => p.id === operation.target.id);
      
      if (sourceExists && targetExists) {
        // Move source product to deleted list
        const sourceProduct = currentProducts.find(p => p.id === operation.source.id)!;
        const deletedItems = [{
          ...sourceProduct,
          deletedAt: new Date(),
          mergedInto: operation.result.id,
          reason: `Auto Safe Merge: Into ${operation.target.hasirTipi} (${operation.target.uzunlukBoy}x${operation.target.uzunlukEn})`
        }];
        setDeletedProducts(prev => [...prev, ...deletedItems]);
        
        // Apply the merge
        currentProducts = currentProducts
          .filter(p => p.id !== operation.source.id && p.id !== operation.target.id)
          .concat(operation.result);
        appliedCount++;
        console.log(`✅ Applied safe merge: ${operation.source.id} + ${operation.target.id}`);
      } else {
        skippedCount++;
        if (!sourceExists) console.log(`⏭️ Skipped: Source ${operation.source.id} no longer exists`);
        if (!targetExists) console.log(`⏭️ Skipped: Target ${operation.target.id} no longer exists`);
      }
    }
    
    console.log(`📊 Results: ${appliedCount} applied, ${skippedCount} skipped (products already merged)`);
    console.log(`📈 Products: ${products.length} → ${currentProducts.length} (reduced by ${products.length - currentProducts.length})`);
    
    // Update products and close dialog
    setProductsWithDebug(currentProducts);
    addToHistory(currentProducts);
    setShowApprovalDialog(false);
    setPendingOperations([]);
    setCurrentOperationIndex(0);
    
    toast.success(`${appliedCount} güvenli birleştirme uygulandı! (${skippedCount} zaten kullanılmış ürün atlandı)`);
  };

  const rejectCurrentOperation = () => {
    // Mark current operation as skipped
    const updatedOperations = [...pendingOperations];
    updatedOperations[currentOperationIndex] = { 
      ...updatedOperations[currentOperationIndex], 
      skipped: true 
    };
    setPendingOperations(updatedOperations);
    
    // Move to next unapproved/unskipped operation
    let nextIndex = currentOperationIndex + 1;
    while (nextIndex < pendingOperations.length && 
           (updatedOperations[nextIndex]?.approved || updatedOperations[nextIndex]?.skipped)) {
      nextIndex++;
    }
    
    if (nextIndex < pendingOperations.length) {
      setCurrentOperationIndex(nextIndex);
    } else {
      // Check if there are any remaining unapproved/unskipped operations
      const remainingOps = updatedOperations.filter(op => !op.approved && !op.skipped);
      if (remainingOps.length === 0) {
        setShowApprovalDialog(false);
        // Apply all approved operations in sequence
        const approvedOperations = updatedOperations.filter(op => op.approved);
        
        if (approvedOperations.length > 0) {
          // Apply all approved operations sequentially
          let currentProducts = [...products];
          
          for (const operation of approvedOperations) {
            // Check if source and target products still exist
            const sourceExists = currentProducts.find(p => p.id === operation.source.id);
            const targetExists = currentProducts.find(p => p.id === operation.target.id);
            
            if (sourceExists && targetExists) {
              // Remove source and target, add result
              currentProducts = currentProducts
                .filter(p => p.id !== operation.source.id && p.id !== operation.target.id)
                .concat(operation.result);
            }
          }
          
          // Update products state with final result
          setProductsWithDebug(currentProducts);
          addToHistory(currentProducts);
          
          toast(`${approvedOperations.length} işlem onaylandı ve uygulandı`);
        } else {
          toast('Hiçbir işlem onaylanmadı');
        }
        setPendingOperations([]);
        setCurrentOperationIndex(0);
      } else {
        // Find first unapproved/unskipped operation
        const firstRemainingIndex = updatedOperations.findIndex(op => !op.approved && !op.skipped);
        if (firstRemainingIndex !== -1) {
          setCurrentOperationIndex(firstRemainingIndex);
        }
      }
    }
  };

  return (
    <div className="p-2 w-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBackConfirmDialog(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Geri
              </Button>
              <CardTitle className="text-xl font-bold">İleri Optimizasyon</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Undo2 className="h-4 w-4 mr-1" />
                Geri Al
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Redo2 className="h-4 w-4 mr-1" />
                İleri Al
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeletedDialog(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Silinen Ürünler ({deletedProducts.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToInitial}
                disabled={historyIndex === 0}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Başlangıca Dön
              </Button>
              <Button 
                onClick={() => {
                  // Export current optimized products to Excel
                  const exportData = filteredProducts.map(product => ({
                    'Hasır Tipi': product.hasirTipi,
                    'Boy (cm)': product.uzunlukBoy,
                    'En (cm)': product.uzunlukEn,
                    'Boy Çap (mm)': product.boyCap,
                    'En Çap (mm)': product.enCap,
                    'Hasır Sayısı': product.hasirSayisi,
                    'Toplam Kg': (product.toplamKg && typeof product.toplamKg === 'number') ? product.toplamKg.toFixed(2) : '0.00',
                    'Hasır Türü': product.hasirTuru || '',
                    'Boy Aralığı': product.boyAraligi || '',
                    'En Aralığı': product.enAraligi || '',
                    'Boy Çubuk': product.cubukSayisiBoy || '',
                    'En Çubuk': product.cubukSayisiEn || '',
                    'Sol Filiz': product.solFiliz?.toFixed(2) || '',
                    'Sağ Filiz': product.sagFiliz?.toFixed(2) || '',
                    'Ön Filiz': product.onFiliz?.toFixed(2) || '',
                    'Arka Filiz': product.arkaFiliz?.toFixed(2) || '',
                    'Adet Kg': product.adetKg?.toFixed(2) || '',
                    'İleri Opt. Notları': product.advancedOptimizationNotes || '',
                    'Açıklama': product.aciklama || ''
                  }));
                  
                  // Create workbook and worksheet
                  const ws = XLSX.utils.json_to_sheet(exportData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'İleri Optimizasyon');
                  
                  // Auto-fit columns
                  const colWidths = Object.keys(exportData[0] || {}).map(key => ({
                    wch: Math.max(key.length, 15)
                  }));
                  ws['!cols'] = colWidths;
                  
                  // Export file
                  const fileName = `celik_hasir_ileri_optimizasyon_${new Date().toISOString().split('T')[0]}.xlsx`;
                  XLSX.writeFile(wb, fileName);
                  toast.success('Excel dosyası başarıyla indirildi!');
                }}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Excel'e Aktar
              </Button>
              <Button onClick={handleApplyToMainList} className="bg-blue-600 text-white hover:bg-blue-700">
                Ana Listeye Uygula
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 p-3">
          {/* Filters and Tolerance */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-2 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtreler
              </Label>
            </div>
            <div className="flex gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shadow-sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Hasır Kodu ({selectedFilters.hasirKodu.length})
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueValues.hasirKodu.map(value => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={selectedFilters.hasirKodu.includes(value)}
                      onCheckedChange={(checked) => {
                        setSelectedFilters(prev => ({
                          ...prev,
                          hasirKodu: checked
                            ? [...prev.hasirKodu, value]
                            : prev.hasirKodu.filter(v => v !== value)
                        }));
                      }}
                    >
                      {value}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shadow-sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Hasır Tipi ({selectedFilters.hasirTipi.length})
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>  
                <DropdownMenuContent>
                  {uniqueValues.hasirTipi.map(value => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={selectedFilters.hasirTipi.includes(value)}
                      onCheckedChange={(checked) => {
                        setSelectedFilters(prev => ({
                          ...prev,
                          hasirTipi: checked
                            ? [...prev.hasirTipi, value]
                            : prev.hasirTipi.filter(v => v !== value)
                        }));
                      }}
                    >
                      {value}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shadow-sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Hasır Türü ({selectedFilters.hasirTuru.length})
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueValues.hasirTuru.map(value => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={selectedFilters.hasirTuru.includes(value)}
                      onCheckedChange={(checked) => {
                        setSelectedFilters(prev => ({
                          ...prev,
                          hasirTuru: checked
                            ? [...prev.hasirTuru, value]
                            : prev.hasirTuru.filter(v => v !== value)
                        }));
                      }}
                    >
                      {value}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shadow-sm">
                    <Filter className="h-4 w-4 mr-1" />
                    Boy Çap ({selectedFilters.boyCap.length})
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueValues.boyCap.map(value => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={selectedFilters.boyCap.includes(value)}
                      onCheckedChange={(checked) => {
                        setSelectedFilters(prev => ({
                          ...prev,
                          boyCap: checked
                            ? [...prev.boyCap, value]
                            : prev.boyCap.filter(v => v !== value)
                        }));
                      }}
                    >
                      {value} mm
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="shadow-sm">
                    <Filter className="h-4 w-4 mr-1" />
                    En Çap ({selectedFilters.enCap.length})
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueValues.enCap.map(value => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={selectedFilters.enCap.includes(value)}
                      onCheckedChange={(checked) => {
                        setSelectedFilters(prev => ({
                          ...prev,
                          enCap: checked
                            ? [...prev.enCap, value]
                            : prev.enCap.filter(v => v !== value)
                        }));
                      }}
                    >
                      {value} mm
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (showApprovalDialog) {
                    toast('⚠️ Onay işlemi sırasında filtre değişikliği önerilmez');
                  }
                  setSelectedFilters({ hasirTipi: [], hasirKodu: [], hasirTuru: [], boyCap: [], enCap: [], quantityFilter: 'all' });
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Filtreleri Temizle
              </Button>
            </div>
          </div>

          {/* Quantity Filter Buttons */}
          <div className="flex gap-2 items-center">
            <span className="text-xs font-medium text-gray-700">Miktar:</span>
            <Button
              variant={selectedFilters.quantityFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (showApprovalDialog) {
                  toast('⚠️ Onay işlemi sırasında filtre değişikliği önerilmez');
                }
                setSelectedFilters(prev => ({ ...prev, quantityFilter: 'all' }));
              }}
              className="text-xs px-3 py-1 h-7"
            >
              Tümü ({filteredProducts.length})
            </Button>
            <Button
              variant={selectedFilters.quantityFilter === 'low' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (showApprovalDialog) {
                  toast('⚠️ Onay işlemi sırasında filtre değişikliği önerilmez');
                }
                setSelectedFilters(prev => ({ ...prev, quantityFilter: 'low' }));
              }}
              className={`text-xs px-3 py-1 h-7 ${
                selectedFilters.quantityFilter === 'low' 
                  ? 'bg-amber-600 text-white border-amber-600' 
                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Düşük ({filteredProducts.filter(p => p.hasirSayisi < 20).length})
            </Button>
            <Button
              variant={selectedFilters.quantityFilter === 'medium' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (showApprovalDialog) {
                  toast('⚠️ Onay işlemi sırasında filtre değişikliği önerilmez');
                }
                setSelectedFilters(prev => ({ ...prev, quantityFilter: 'medium' }));
              }}
              className={`text-xs px-3 py-1 h-7 ${
                selectedFilters.quantityFilter === 'medium' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Orta ({filteredProducts.filter(p => p.hasirSayisi >= 20 && p.hasirSayisi < 50).length})
            </Button>
            <Button
              variant={selectedFilters.quantityFilter === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (showApprovalDialog) {
                  toast('⚠️ Onay işlemi sırasında filtre değişikliği önerilmez');
                }
                setSelectedFilters(prev => ({ ...prev, quantityFilter: 'high' }));
              }}
              className={`text-xs px-3 py-1 h-7 ${
                selectedFilters.quantityFilter === 'high' 
                  ? 'bg-green-600 text-white border-green-600' 
                  : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
              }`}
            >
              Yüksek ({filteredProducts.filter(p => p.hasirSayisi >= 50).length})
            </Button>
          </div>

          {/* Drag Instructions */}
          <div className="mb-1 p-1 bg-green-100 rounded-lg flex items-center gap-2 text-sm">
            <span className="font-medium text-green-800">Sürükle & Bırak:</span>
            <span className="text-green-700">Ürünleri birleştirmek için bir ürünü diğerinin üzerine sürükleyin</span>
          </div>

          {/* Products table */}
          <div className="border rounded-lg bg-white shadow-lg">
            <div className="max-h-[575px] overflow-y-auto overflow-x-auto relative">
              <table 
                className="w-full border-collapse"
              >
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-200 border-b">
                    <th className="w-8 sticky top-0 bg-white z-10 px-2 py-3 text-left font-medium text-gray-900 text-xs">No.</th>
                    <th className="sticky top-0 bg-white z-10 px-2 py-3 text-left font-medium text-gray-900 w-16">Kodu</th>
                    <th 
                      className={`sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100 px-4 py-3 text-left font-medium text-gray-900 ${
                        sortConfig?.key === 'hasirTipi' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'hasirTipi') {
                            return { key: 'hasirTipi', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'hasirTipi', direction: 'asc' };
                        });
                      }}
                    >
                      Hasır Tipi {sortConfig?.key === 'hasirTipi' ? (
                        sortConfig.direction === 'asc' ? '↑' : '↓'
                      ) : (
                        <ArrowUpDown className="inline h-4 w-4" />
                      )}
                    </th>
                    <th 
                      className={`sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100 ${
                        sortConfig?.key === 'uzunlukBoy' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'uzunlukBoy') {
                            return { key: 'uzunlukBoy', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'uzunlukBoy', direction: 'asc' };
                        });
                      }}
                    >
                      Boy (cm) {sortConfig?.key === 'uzunlukBoy' ? (
                        sortConfig.direction === 'asc' ? '↑' : '↓'
                      ) : (
                        <ArrowUpDown className="inline h-4 w-4" />
                      )}
                    </th>
                    <th 
                      className={`sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100 ${
                        sortConfig?.key === 'uzunlukEn' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'uzunlukEn') {
                            return { key: 'uzunlukEn', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'uzunlukEn', direction: 'asc' };
                        });
                      }}
                    >
                      En (cm) {sortConfig?.key === 'uzunlukEn' ? (
                        sortConfig.direction === 'asc' ? '↑' : '↓'
                      ) : (
                        <ArrowUpDown className="inline h-4 w-4" />
                      )}
                    </th>
                    <th 
                      className={`sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100 ${
                        sortConfig?.key === 'boyCap' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'boyCap') {
                            return { key: 'boyCap', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'boyCap', direction: 'asc' };
                        });
                      }}
                    >
                      Boy Çap (mm) {sortConfig?.key === 'boyCap' ? (
                        sortConfig.direction === 'asc' ? '↑' : '↓'
                      ) : (
                        <ArrowUpDown className="inline h-4 w-4" />
                      )}
                    </th>
                    <th 
                      className={`sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100 ${
                        sortConfig?.key === 'enCap' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'enCap') {
                            return { key: 'enCap', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'enCap', direction: 'asc' };
                        });
                      }}
                    >
                      En Çap (mm) {sortConfig?.key === 'enCap' ? (
                        sortConfig.direction === 'asc' ? '↑' : '↓'
                      ) : (
                        <ArrowUpDown className="inline h-4 w-4" />
                      )}
                    </th>
                    <th 
                      className={`sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100 ${
                        sortConfig?.key === 'hasirSayisi' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'hasirSayisi') {
                            return { key: 'hasirSayisi', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'hasirSayisi', direction: 'asc' };
                        });
                      }}
                    >
                      Hasır Sayısı {sortConfig?.key === 'hasirSayisi' ? (
                        sortConfig.direction === 'asc' ? '↑' : '↓'
                      ) : (
                        <ArrowUpDown className="inline h-4 w-4" />
                      )}
                    </th>
                    <th 
                      className={`sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100 ${
                        sortConfig?.key === 'toplamKg' ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'toplamKg') {
                            return { key: 'toplamKg', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'toplamKg', direction: 'asc' };
                        });
                      }}
                    >
                      Toplam Kg {sortConfig?.key === 'toplamKg' ? (
                        sortConfig.direction === 'asc' ? '↑' : '↓'
                      ) : (
                        <ArrowUpDown className="inline h-4 w-4" />
                      )}
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'hasirTuru') {
                            return { key: 'hasirTuru', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'hasirTuru', direction: 'asc' };
                        });
                      }}
                    >
                      Hasır Türü <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'boyAraligi') {
                            return { key: 'boyAraligi', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'boyAraligi', direction: 'asc' };
                        });
                      }}
                    >
                      Boy Aralığı <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'enAraligi') {
                            return { key: 'enAraligi', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'enAraligi', direction: 'asc' };
                        });
                      }}
                    >
                      En Aralığı <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'cubukSayisiBoy') {
                            return { key: 'cubukSayisiBoy', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'cubukSayisiBoy', direction: 'asc' };
                        });
                      }}
                    >
                      Boy Çubuk <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'cubukSayisiEn') {
                            return { key: 'cubukSayisiEn', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'cubukSayisiEn', direction: 'asc' };
                        });
                      }}
                    >
                      En Çubuk <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'solFiliz') {
                            return { key: 'solFiliz', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'solFiliz', direction: 'asc' };
                        });
                      }}
                    >
                      Sol Filiz <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'sagFiliz') {
                            return { key: 'sagFiliz', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'sagFiliz', direction: 'asc' };
                        });
                      }}
                    >
                      Sağ Filiz <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'onFiliz') {
                            return { key: 'onFiliz', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'onFiliz', direction: 'asc' };
                        });
                      }}
                    >
                      Ön Filiz <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'arkaFiliz') {
                            return { key: 'arkaFiliz', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'arkaFiliz', direction: 'asc' };
                        });
                      }}
                    >
                      Arka Filiz <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th 
                      className="sticky top-0 bg-white z-10 text-xs cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'adetKg') {
                            return { key: 'adetKg', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'adetKg', direction: 'asc' };
                        });
                      }}
                    >
                      Adet Kg <ArrowUpDown className="inline h-3 w-3" />
                    </th>
                    <th className="sticky top-0 bg-white z-10 text-xs">İleri Opt. Notları</th>
                  </tr>
                </thead>
                <tbody key={`tbody-${products.length}-${filteredProducts.length}`}>
                  {filteredProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      draggable={true}
                      onDragStart={(e) => {
                        console.log('🚀 DRAG START:', product.id, product.hasirTipi);
                        e.dataTransfer.setData('text/plain', String(product.id));
                        setDraggedProductId(String(product.id));
                        e.currentTarget.classList.add('opacity-50');
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        console.log('🎯 DRAG OVER:', product.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        console.log('🎯 DROP EVENT on:', product.id);
                        const sourceId = e.dataTransfer.getData('text/plain');
                        const targetId = String(product.id);
                        console.log('🔄 Attempting merge:', sourceId, '→', targetId);
                        
                        if (sourceId !== targetId) {
                          console.log('Looking for products with IDs:', sourceId, targetId);
                          console.log('Available product IDs:', filteredProducts.map(p => p.id));
                          console.log('First few products:', filteredProducts.slice(0, 5));
                          const sourceProduct = filteredProducts.find(p => String(p.id) === sourceId);
                          const targetProduct = filteredProducts.find(p => String(p.id) === targetId);
                          console.log('Found products:', sourceProduct, targetProduct);
                          
                          if (sourceProduct && targetProduct) {
                            const mergeOptions = getAllMergeOptions(sourceProduct, targetProduct);
                            console.log('Merge options found:', mergeOptions.length);
                            
                            if (mergeOptions.length > 0) {
                              // Set up merge dialog with all options
                              setPendingMerge({
                                source: sourceProduct,
                                target: targetProduct,
                                operation: undefined,
                                options: mergeOptions
                              });
                              setShowMergeDialog(true);
                            } else {
                              console.log('❌ No merge options available');
                              toast.error(`Bu ürünler birleştirilemez: ${sourceProduct.hasirTipi} ↔ ${targetProduct.hasirTipi}`);
                            }
                          }
                        }
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('opacity-50');
                        setDraggedProductId(null);
                      }}
                      className={`hover:bg-gray-50 cursor-move ${
                        (product.advancedOptimizationNotes && product.advancedOptimizationNotes.trim() !== '') 
                        ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                      } ${
                        draggedProductId === product.id ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="text-center px-2 py-3 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                      </td>
                      <td className="text-center px-2 py-3 border-b border-gray-200 font-bold text-sm">
                        {product.hasirTipi.charAt(0).toUpperCase()}
                      </td>
                      <td className="font-medium  px-4 py-3 border-b border-gray-200">{product.hasirTipi}</td>
                      <td className=" px-4 py-3 border-b border-gray-200">{product.uzunlukBoy}</td>
                      <td className=" px-4 py-3 border-b border-gray-200">{product.uzunlukEn}</td>
                      <td className=" px-4 py-3 border-b border-gray-200">{product.boyCap}</td>
                      <td className=" px-4 py-3 border-b border-gray-200">{product.enCap}</td>
                      <td className="font-semibold relative ">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getQuantityColor(Number(product.hasirSayisi)).replace('text-white', '').replace('bg-', 'bg-')}`} />
                          <span className={`px-2 py-1 rounded font-bold text-xs ${getQuantityColor(Number(product.hasirSayisi))}`}>
                            {product.hasirSayisi}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({getQuantityLabel(Number(product.hasirSayisi))})
                          </span>
                        </div>
                      </td>
                      <td className="font-medium ">{(product.toplamKg && typeof product.toplamKg === 'number') ? product.toplamKg.toFixed(2) : '0.00'}</td>
                      <td className="text-xs ">{product.hasirTuru || '-'}</td>
                      <td className="text-xs ">{product.boyAraligi || '-'}</td>
                      <td className="text-xs ">{product.enAraligi || '-'}</td>
                      <td className="text-xs ">{product.cubukSayisiBoy || '-'}</td>
                      <td className="text-xs ">{product.cubukSayisiEn || '-'}</td>
                      <td className="text-xs ">{product.solFiliz?.toFixed(2) || '-'}</td>
                      <td className="text-xs ">{product.sagFiliz?.toFixed(2) || '-'}</td>
                      <td className="text-xs ">{product.onFiliz?.toFixed(2) || '-'}</td>
                      <td className="text-xs ">{product.arkaFiliz?.toFixed(2) || '-'}</td>
                      <td className="text-xs ">{product.adetKg?.toFixed(3) || '-'}</td>
                      <td className="text-xs max-w-xs">
                        <div 
                          className={`${product.advancedOptimizationNotes ? 'font-semibold text-blue-700' : ''}`}
                          title={product.advancedOptimizationNotes || product.mergeHistory?.join(' | ')}
                          style={{ 
                            maxWidth: '300px',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: '1.4'
                          }}
                        >
                          {product.advancedOptimizationNotes || product.mergeHistory?.join(' | ') || '-'}
                        </div>
                      </td>
                      
                      
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Automatic operations */}
          <div className="mt-1 p-1 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
            <div className="flex items-center gap-4 mb-1 flex-wrap justify-center">
            </div>
            <div className="flex gap-4 justify-center">
            <Button 
              variant="default"
              onClick={executeComprehensiveOptimization}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 text-sm font-semibold px-6"
            >
              <Settings className="w-4 h-4 mr-2" />
              Otomatik Tüm Birleştirmeler
            </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Birleştirme İşlemi Seçenekleri</DialogTitle>
            <DialogDescription>
              Sürükleyip bıraktığınız ürünler için tüm birleştirme seçenekleri gösteriliyor.
            </DialogDescription>
          </DialogHeader>
          {pendingMerge && (
            <div className="space-y-4">
              {pendingMerge.options && pendingMerge.options.length > 0 ? (
                <div>
                  {/* Product Details Summary */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="font-semibold mb-2 text-blue-800">Kaynak Ürün:</p>
                      <div className="text-sm space-y-1">
                        <p><strong>Tip:</strong> {pendingMerge.source.hasirTipi}</p>
                        <p><strong>Boyut:</strong> {pendingMerge.source.uzunlukBoy}x{pendingMerge.source.uzunlukEn} cm</p>
                        <p><strong>Adet:</strong> {pendingMerge.source.hasirSayisi}</p>
                        <p><strong>Ağırlık:</strong> {pendingMerge.source.toplamKg}kg</p>
                      </div>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <p className="font-semibold mb-2 text-green-800">Hedef Ürün:</p>
                      <div className="text-sm space-y-1">
                        <p><strong>Tip:</strong> {pendingMerge.target.hasirTipi}</p>
                        <p><strong>Boyut:</strong> {pendingMerge.target.uzunlukBoy}x{pendingMerge.target.uzunlukEn} cm</p>
                        <p><strong>Adet:</strong> {pendingMerge.target.hasirSayisi}</p>
                        <p><strong>Ağırlık:</strong> {pendingMerge.target.toplamKg}kg</p>
                      </div>
                    </div>
                  </div>

                  {/* Merge Options */}
                  <h4 className="font-semibold mb-3">Mevcut Birleştirme Seçenekleri:</h4>
                  <div className="space-y-2">
                    {pendingMerge.options.map((option, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded border cursor-pointer hover:bg-gray-50 ${
                          index === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className={`font-medium ${ index === 0 ? 'text-green-800' : 'text-gray-800'}`}>
                              {option.explanation}
                              {index === 0 && <span className="text-green-600 ml-2">(Önerilen)</span>}
                            </p>
                            <div className="text-xs text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-1 rounded text-xs ${getSafetyDisplay(option.safetyLevel, option.tolerance).bgClass}`}>
                                {getSafetyDisplay(option.safetyLevel, option.tolerance).icon} {getSafetyDisplay(option.safetyLevel, option.tolerance).text}
                              </span>
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                Maks: {tolerance}cm
                              </span>
                              <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">
                                Kullanılan: {option.tolerance.toFixed(1)}cm
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              
                              let merged: Product;
                              let successMessage: string;
                              
                              // Use the result if provided, otherwise create merged product
                              if (option.result) {
                                merged = option.result;
                                successMessage = `${option.explanation}`;
                              } else {
                                // Legacy handling for options without result
                                if (option.type === 'boydan') {
                                  merged = optimizeBoydan(option.source, option.target);
                                  successMessage = `Boydan birleştirme başarılı`;
                                } else if (option.type === 'enden') {
                                  merged = optimizeEnden(option.source, option.target);
                                  successMessage = `Enden birleştirme başarılı`;
                                } else if (option.type === 'tipi_degisiklik') {
                                  // Create merged product for type change
                                  merged = {
                                    ...option.target,
                                    id: `merged_tipi_${Date.now()}`,
                                    hasirSayisi: Number(option.source.hasirSayisi) + Number(option.target.hasirSayisi),
                                    toplamKg: Number(option.source.toplamKg) + Number(option.target.toplamKg),
                                    mergeHistory: [
                                      ...(option.target.mergeHistory || []),
                                      `Tip değişikliği: ${option.source.hasirSayisi}adet ${option.source.hasirTipi} → ${option.target.hasirTipi}`
                                    ],
                                    aciklama: `${option.target.aciklama || ''} | TİP DEĞ: ${option.source.hasirTipi} → ${option.target.hasirTipi}`
                                  };
                                  successMessage = `Tip değişikliği birleştirmesi başarılı`;
                                } else { // tamamla
                                  merged = {
                                    ...option.target,
                                    id: `merged_tamamla_${Date.now()}`,
                                    hasirSayisi: Number(option.source.hasirSayisi) + Number(option.target.hasirSayisi),
                                    toplamKg: Number(option.source.toplamKg) + Number(option.target.toplamKg),
                                    mergeHistory: [
                                      ...(option.target.mergeHistory || []),
                                      `Üste tamamla: ${option.source.hasirSayisi}adet ${option.source.uzunlukBoy}x${option.source.uzunlukEn} → ${option.target.uzunlukBoy}x${option.target.uzunlukEn}`
                                    ],
                                    aciklama: `${option.target.aciklama || ''} | TAMAMLA: +${option.tolerance.toFixed(1)}cm`
                                  };
                                  successMessage = `Üste tamamlama birleştirmesi başarılı`;
                                }
                              }
                              
                              // Move source product to deleted list
                              const sourceProduct = products.find(p => p.id === option.source.id)!;
                              moveToDeleted([sourceProduct], `Drag & Drop: Merged into ${option.target.hasirTipi} (${option.target.uzunlukBoy}x${option.target.uzunlukEn})`, merged.id);
                              
                              const newProducts = [
                                ...products.filter(p => p.id !== option.source.id && p.id !== option.target.id),
                                merged
                              ];
                              setProductsWithDebug(newProducts);
                              addToHistory(newProducts);
                              setShowMergeDialog(false);
                              setPendingMerge(null);
                              
                              toast.success(`${successMessage}: ${option.explanation}`);
                            }}
                            className={`${index === 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                          >
                            Uygula
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Bu ürünler için birleştirme seçeneği bulunamadı.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              İptal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval dialog for automatic operations */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">İşlem Onayı</DialogTitle>
            <DialogDescription>
              {pendingOperations.length > 0 && 
                `İşlem ${currentOperationIndex + 1} / ${pendingOperations.length}`}
            </DialogDescription>
          </DialogHeader>

          {/* Advanced Filters and Controls */}
          <div className="space-y-4 border-b pb-4 mb-4">
            {/* Sorting Options */}
            {pendingOperations.length > 1 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Sıralama:</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sort-safety"
                      name="sortMode"
                      checked={sortMode === 'safety'}
                      onChange={() => applySorting('safety')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="sort-safety" className="text-sm cursor-pointer">
                      İşlem Güvenliği (En Güvenli İlk)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="sort-quantity"
                      name="sortMode"
                      checked={sortMode === 'quantity'}
                      onChange={() => applySorting('quantity')}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="sort-quantity" className="text-sm cursor-pointer">
                      Hasır Sayısı (En Düşük İlk)
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Tolerance Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Tolerans (cm):</Label>
                <span className="text-sm font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {dialogTolerance} cm
                </span>
              </div>
              <Slider
                value={[dialogTolerance]}
                onValueChange={(value) => {
                  setDialogTolerance(value[0]);
                  setTolerance(value[0]); // Update main tolerance too
                  // Refilter operations when tolerance changes
                  const updatedOps = findAllOptimizationOpportunities();
                  const filteredOps = updatedOps.filter(op => op.toleranceUsed <= value[0]);
                  const sortedOps = sortPendingOperations(filteredOps, sortMode);
                  setPendingOperations(sortedOps);
                  setCurrentOperationIndex(0);
                  toast(`Tolerans güncellendi: ${value[0]}cm`);
                }}
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Minimum Hasır Sayısı Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Minimum Hasır Sayısı:</Label>
                <span className="text-sm font-semibold bg-green-100 text-green-800 px-2 py-1 rounded">
                  {dialogMaxHasirSayisi} adet
                </span>
              </div>
              <Slider
                value={[dialogMaxHasirSayisi]}
                onValueChange={(value) => {
                  setDialogMaxHasirSayisi(value[0]);
                  setMaxHasirSayisi(value[0]);
                  // Refilter operations when max hasır sayısı changes
                  const updatedOps = findAllOptimizationOpportunities();
                  const sortedOps = sortPendingOperations(updatedOps, sortMode);
                  setPendingOperations(sortedOps);
                  setCurrentOperationIndex(0);
                }}
                min={1}
                max={400}
                step={1}
                className="w-full"
              />
            </div>

            {/* Type Change Radio Button */}
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <Checkbox
                id="include-type-changes"
                checked={includeTypeChanges}
                onCheckedChange={(checked) => {
                  setIncludeTypeChanges(checked as boolean);
                  // Refilter operations when type change setting changes
                  const updatedOps = findAllOptimizationOpportunities();
                  const sortedOps = sortPendingOperations(updatedOps, sortMode);
                  setPendingOperations(sortedOps);
                  setCurrentOperationIndex(0);
                  toast(checked ? 'Hasır tipi değişiklikleri dahil edildi' : 'Hasır tipi değişiklikleri hariç tutuldu');
                }}
              />
              <Label htmlFor="include-type-changes" className="text-sm cursor-pointer">
                <span className="font-medium">Hasır Tipi Değişikliklerini Dahil Et</span>
                <span className="text-xs text-yellow-700 block">
                  (Riskli: Farklı hasır tiplerini birleştirir)
                </span>
              </Label>
            </div>
          </div>
          
          {pendingOperations.length > 0 && currentOperationIndex < pendingOperations.length && (
            <div key={`operation-${currentOperationIndex}-${sortMode}-${pendingOperations[currentOperationIndex]?.source.id || 'none'}`} className="space-y-4">
              {pendingOperations[currentOperationIndex]?.approved && (
                <Alert className="border-green-300 bg-green-50">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Bu işlem zaten onaylanmış. "Önceki" ile onaylanmamış işlemlere dönebilirsiniz.
                  </AlertDescription>
                </Alert>
              )}
              <div className={`p-4 border rounded ${
                pendingOperations[currentOperationIndex]?.approved 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`font-semibold ${
                    pendingOperations[currentOperationIndex]?.approved 
                      ? 'text-green-800' 
                      : 'text-blue-800'
                  }`}>
                    {pendingOperations[currentOperationIndex]?.approved ? 'Onaylanmış İşlem:' : 'Önerilen İşlem:'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">İşlem Güvenliği:</span>
                    <div 
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        getSafetyDisplay(pendingOperations[currentOperationIndex].safetyLevel, pendingOperations[currentOperationIndex].toleranceUsed, pendingOperations[currentOperationIndex].safetyLevelNumber).bgClass
                      }`}
                    >
                      {getSafetyDisplay(pendingOperations[currentOperationIndex].safetyLevel, pendingOperations[currentOperationIndex].toleranceUsed, pendingOperations[currentOperationIndex].safetyLevelNumber).icon} {getSafetyDisplay(pendingOperations[currentOperationIndex].safetyLevel, pendingOperations[currentOperationIndex].toleranceUsed, pendingOperations[currentOperationIndex].safetyLevelNumber).text.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Küresel Tolerans: {tolerance}cm
                      </span>
                      <span className="bg-gray-200 px-2 py-1 rounded">
                        Kullanılan: {pendingOperations[currentOperationIndex].toleranceUsed.toFixed(1)}cm
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-blue-700">{pendingOperations[currentOperationIndex].explanation}</p>
              </div>
              
              {/* Show comparison for smart operations OR generate smart alternative */}
              {(() => {
                const currentOp = pendingOperations[currentOperationIndex];
                const existingSmartData = currentOp.type === 'smart_multi' ? currentOp.smartData : null;
                const generatedSmartData = existingSmartData ? null : generateSmartAlternativeForOperation(currentOp);
                const smartData = existingSmartData || generatedSmartData;
                
                return smartData && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Alternatif Seçenekler Karşılaştırması
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Traditional Option */}
                    <div className="bg-white p-3 rounded border">
                      <h5 className="font-medium text-sm mb-2 text-gray-700">Geleneksel Birleştirme</h5>
                      <div className="text-xs space-y-1">
                        <p><strong>Adım Sayısı:</strong> {smartData.traditionalAlternative.steps}</p>
                        <p><strong>Toplam Tolerans:</strong> 
                          <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded">
                            {smartData.traditionalAlternative.totalTolerance.toFixed(1)}cm
                          </span>
                        </p>
                        <div className="mt-2 text-gray-600">
                          {smartData.traditionalAlternative.path?.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="text-gray-400">{idx + 1}.</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Smart Option */}
                    <div className="bg-white p-3 rounded border border-green-300">
                      <h5 className="font-medium text-sm mb-2 text-green-700">Akıllı Yeni Ürün ✓</h5>
                      <div className="text-xs space-y-1">
                        <p><strong>Adım Sayısı:</strong> 1 (Tek işlem)</p>
                        <p><strong>Toplam Tolerans:</strong> 
                          <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 rounded">
                            {smartData.smartOption.totalTolerance.toFixed(1)}cm
                          </span>
                        </p>
                        <p><strong>Yeni Boyut:</strong> {smartData.smartOption.finalDimensions}</p>
                        <p className="text-green-600 font-medium mt-2">
                          ✓ {(smartData.traditionalAlternative.totalTolerance - smartData.smartOption.totalTolerance).toFixed(1)}cm tolerans tasarrufu
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                    <strong>Not:</strong> Akıllı birleştirme yeni bir ürün boyutu oluşturur ancak daha az tolerans kullanır.
                  </div>
                </div>
                );
              })()}
              
              {/* For smart multi, show all involved products */}
              {(() => {
                const currentOp = pendingOperations[currentOperationIndex];
                const existingSmartData = currentOp.type === 'smart_multi' ? currentOp.smartData : null;
                const generatedSmartData = existingSmartData ? null : generateSmartAlternativeForOperation(currentOp);
                const smartData = existingSmartData || generatedSmartData;
                
                return smartData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded">
                    <p className="font-semibold mb-2 text-red-800">Birleştirilecek Ürünler: <span className="text-xs">(SİLİNECEKLER)</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      {smartData.involvedProducts.map((product, idx) => (
                        <div key={idx} className="bg-white p-2 rounded text-sm">
                          <p className="font-medium">{product.hasirTipi}</p>
                          <p>{product.uzunlukBoy}x{product.uzunlukEn} cm</p>
                          <p className={`inline-block px-2 py-1 rounded text-xs ${getQuantityColor(Number(product.hasirSayisi))}`}>
                            {product.hasirSayisi} adet
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <p className="font-semibold mb-2 text-green-800">Yeni Oluşturulacak Ürün:</p>
                    <div className="text-sm space-y-1">
                      <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].result.hasirTipi}</p>
                      <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].result.uzunlukBoy}x{pendingOperations[currentOperationIndex].result.uzunlukEn} cm</p>
                      <p><strong>Toplam Adet:</strong> {pendingOperations[currentOperationIndex].result.hasirSayisi}</p>
                      <p><strong>Toplam Kg:</strong> {(pendingOperations[currentOperationIndex].result.toplamKg && typeof pendingOperations[currentOperationIndex].result.toplamKg === 'number') ? pendingOperations[currentOperationIndex].result.toplamKg.toFixed(2) : '0.00'}</p>
                    </div>
                  </div>
                </div>
                ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded">
                      <p className="font-semibold mb-2 text-red-800">Kaynak Ürün: <span className="text-xs">(SİLİNECEK)</span></p>
                      <div className="text-sm space-y-1">
                        <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].source.hasirTipi}</p>
                        <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].source.uzunlukBoy}x{pendingOperations[currentOperationIndex].source.uzunlukEn} cm</p>
                        <p><strong>Adet:</strong> 
                          <span className={`ml-1 px-2 py-1 rounded font-bold ${getQuantityColor(Number(pendingOperations[currentOperationIndex].source.hasirSayisi))}`}>
                            {pendingOperations[currentOperationIndex].source.hasirSayisi}
                          </span>
                          <span className="text-xs text-gray-600 ml-2">
                            ({getQuantityLabel(Number(pendingOperations[currentOperationIndex].source.hasirSayisi)).toUpperCase()} MİKTAR)
                          </span>
                        </p>
                        <p><strong>Kg:</strong> {(pendingOperations[currentOperationIndex].source.toplamKg && typeof pendingOperations[currentOperationIndex].source.toplamKg === 'number') ? pendingOperations[currentOperationIndex].source.toplamKg.toFixed(2) : '0.00'}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="font-semibold mb-2">Hedef Ürün:</p>
                      <div className="text-sm space-y-1">
                        <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].target.hasirTipi}</p>
                        <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].target.uzunlukBoy}x{pendingOperations[currentOperationIndex].target.uzunlukEn} cm</p>
                        <p><strong>Adet:</strong> {pendingOperations[currentOperationIndex].target.hasirSayisi}</p>
                        <p><strong>Kg:</strong> {(pendingOperations[currentOperationIndex].target.toplamKg && typeof pendingOperations[currentOperationIndex].target.toplamKg === 'number') ? pendingOperations[currentOperationIndex].target.toplamKg.toFixed(2) : '0.00'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <p className="font-semibold text-green-800 mb-2">Sonuç:</p>
                    <div className="text-sm space-y-1 text-green-700">
                      <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].result.hasirTipi}</p>
                      <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].result.uzunlukBoy}x{pendingOperations[currentOperationIndex].result.uzunlukEn} cm</p>
                      <p><strong>Adet:</strong> {pendingOperations[currentOperationIndex].result.hasirSayisi}</p>
                      <p><strong>Kg:</strong> {(pendingOperations[currentOperationIndex].result.toplamKg && typeof pendingOperations[currentOperationIndex].result.toplamKg === 'number') ? pendingOperations[currentOperationIndex].result.toplamKg.toFixed(2) : '0.00'}</p>
                    </div>
                  </div>
                </>
                );
              })()}
            </div>
          )}
          
          <DialogFooter>
            <div className="flex flex-col gap-2 w-full">
              {/* Safe operations button - only operations marked as 'safe' */}
              {pendingOperations.filter(op => op.safetyLevel === 'safe').length > 0 && (
                <Button 
                  onClick={applyAllSafeOperations}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-bold"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Tüm Güvenli Birleştirmeleri Uygula (~{pendingOperations.filter(op => op.safetyLevel === 'safe').length} potansiyel)
                </Button>
              )}
              
              {/* Individual operation buttons */}
              <div className="flex gap-2 w-full">
                {pendingOperations.length > 1 && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Go back to previous operation (approved or not)
                      if (currentOperationIndex > 0) {
                        setCurrentOperationIndex(currentOperationIndex - 1);
                      }
                    }}
                    className="flex-1"
                  >
                    ⬅️ Önceki
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={rejectCurrentOperation}
                  disabled={pendingOperations[currentOperationIndex]?.approved || pendingOperations[currentOperationIndex]?.skipped}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-1" />
                  {pendingOperations[currentOperationIndex]?.approved ? 'Onaylandı' : 
                   pendingOperations[currentOperationIndex]?.skipped ? 'Atlandı' : '⏭️ Bu İşlemi Atla'}
                </Button>
                <Button 
                  onClick={approveCurrentOperation}
                  disabled={pendingOperations[currentOperationIndex]?.approved}
                  className={`flex-1 ${
                    pendingOperations[currentOperationIndex]?.approved 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {pendingOperations[currentOperationIndex]?.approved ? 'Onaylandı' : 'Onayla'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deleted Products Dialog */}
      <Dialog open={showDeletedDialog} onOpenChange={setShowDeletedDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Silinen Ürünler ({deletedProducts.length})</DialogTitle>
            <DialogDescription>
              Birleştirme işlemleri sırasında silinen ürünler burada görüntülenir.
            </DialogDescription>
          </DialogHeader>
          
          {deletedProducts.length > 0 ? (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left font-medium">Hasır Tipi</th>
                      <th className="border p-2 text-left font-medium">Boyut</th>
                      <th className="border p-2 text-left font-medium">Adet</th>
                      <th className="border p-2 text-left font-medium">Silme Nedeni</th>
                      <th className="border p-2 text-left font-medium">Silme Tarihi</th>
                      <th className="border p-2 text-left font-medium">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedProducts.map((product, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border p-2">{product.hasirTipi}</td>
                        <td className="border p-2">{product.uzunlukBoy}x{product.uzunlukEn}</td>
                        <td className="border p-2">{product.hasirSayisi}</td>
                        <td className="border p-2 text-xs">{product.reason}</td>
                        <td className="border p-2 text-xs">{product.deletedAt.toLocaleString('tr-TR')}</td>
                        <td className="border p-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Restore product - create a clean Product object
                              const restoredProduct: Product = {
                                id: product.id,
                                hasirTipi: product.hasirTipi,
                                hasirTuru: product.hasirTuru,
                                uzunlukBoy: product.uzunlukBoy,
                                uzunlukEn: product.uzunlukEn,
                                boyCap: product.boyCap,
                                enCap: product.enCap,
                                hasirSayisi: product.hasirSayisi,
                                toplamKg: product.toplamKg,
                                boyAraligi: product.boyAraligi,
                                enAraligi: product.enAraligi,
                                cubukSayisiBoy: product.cubukSayisiBoy,
                                cubukSayisiEn: product.cubukSayisiEn,
                                solFiliz: product.solFiliz,
                                sagFiliz: product.sagFiliz,
                                onFiliz: product.onFiliz,
                                arkaFiliz: product.arkaFiliz,
                                adetKg: product.adetKg,
                                isOptimized: product.isOptimized,
                                uretilemez: product.uretilemez,
                                aciklama: product.aciklama,
                                mergeHistory: product.mergeHistory,
                                advancedOptimizationNotes: product.advancedOptimizationNotes
                              };
                              
                              setProductsWithDebug(prev => [...prev, restoredProduct]);
                              setDeletedProducts(prev => prev.filter((_, i) => i !== index));
                              toast.success(`${product.hasirTipi} geri yüklendi`);
                            }}
                            className="text-xs"
                          >
                            Geri Yükle
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm(`${deletedProducts.length} silinen ürünün tümünü geri yüklemek istediğinizden emin misiniz?`)) {
                      const restoredProducts: Product[] = deletedProducts.map(product => ({
                        id: product.id,
                        hasirTipi: product.hasirTipi,
                        hasirTuru: product.hasirTuru,
                        uzunlukBoy: product.uzunlukBoy,
                        uzunlukEn: product.uzunlukEn,
                        boyCap: product.boyCap,
                        enCap: product.enCap,
                        hasirSayisi: product.hasirSayisi,
                        toplamKg: product.toplamKg,
                        boyAraligi: product.boyAraligi,
                        enAraligi: product.enAraligi,
                        cubukSayisiBoy: product.cubukSayisiBoy,
                        cubukSayisiEn: product.cubukSayisiEn,
                        solFiliz: product.solFiliz,
                        sagFiliz: product.sagFiliz,
                        onFiliz: product.onFiliz,
                        arkaFiliz: product.arkaFiliz,
                        adetKg: product.adetKg,
                        isOptimized: product.isOptimized,
                        uretilemez: product.uretilemez,
                        aciklama: product.aciklama,
                        mergeHistory: product.mergeHistory,
                        advancedOptimizationNotes: product.advancedOptimizationNotes
                      }));
                      
                      setProductsWithDebug(prev => [...prev, ...restoredProducts]);
                      setDeletedProducts([]);
                      toast.success(`${restoredProducts.length} ürün geri yüklendi`);
                    }
                  }}
                >
                  Tümünü Geri Yükle
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Silinen ürünlerin tümünü kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
                      setDeletedProducts([]);
                      toast.success('Silinen ürünler kalıcı olarak temizlendi');
                    }
                  }}
                >
                  Kalıcı Olarak Sil
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Henüz silinmiş ürün bulunmuyor.
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletedDialog(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Back Confirmation Dialog */}
      <Dialog open={showBackConfirmDialog} onOpenChange={setShowBackConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sayfadan Ayrılmak İstiyor musunuz?</DialogTitle>
            <DialogDescription>
              Yaptığınız değişiklikler kaydedilmeyecektir. Çelik Hasır ana sayfasına geri dönmek istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBackConfirmDialog(false)}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowBackConfirmDialog(false);
                router.push('/uretim/hesaplamalar/urun');
              }}
            >
              Evet, Geri Dön
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main page component with layout
const CelikHasirOptimizasyon: React.FC = () => {
  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Çelik Hasır İleri Optimizasyon</h1>
            <p className="text-gray-600">Akıllı algoritma ile çelik hasır ürün optimizasyonu ve birleştirme işlemleri</p>
          </div>
          
          <div className="bg-white rounded-lg shadow">
            <CelikHasirOptimizasyonContent />
          </div>
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
};

export default CelikHasirOptimizasyon;