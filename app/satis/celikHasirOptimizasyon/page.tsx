'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-hot-toast';
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
  RefreshCw
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
  type: 'boydan' | 'enden' | 'katli' | 'katli_exact' | 'katli_tolerance' | 'tamamla' | 'tipi_degisiklik' | 'tipi_degisiklik_same' | 'tipi_degisiklik_cross';
  source: Product;
  target: Product;
  result: Product;
  explanation: string;
  toleranceUsed: number; // Actual tolerance used for this operation
  safetyLevel: 'safe' | 'caution' | 'risky'; // Safety indicator
}

// Helper function to determine safety level based on tolerance used
const getSafetyLevel = (toleranceUsed: number): 'safe' | 'caution' | 'risky' => {
  if (toleranceUsed === 0) return 'safe';
  if (toleranceUsed <= 10) return 'caution';
  return 'risky';
};

const CelikHasirOptimizasyon: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedFilters, setSelectedFilters] = useState({
    hasirTipi: [] as string[],
    hasirKodu: [] as string[],
    hasirTuru: [] as string[],
    boyCap: [] as number[],
    enCap: [] as number[],
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [dragOverProduct, setDragOverProduct] = useState<Product | null>(null);
  const [currentDragMode, setCurrentDragMode] = useState<'reorder' | 'merge'>('reorder');
  const [dragHoverTimeout, setDragHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [dragInsertPosition, setDragInsertPosition] = useState<{ productId: string; position: 'before' | 'after' } | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingMerge, setPendingMerge] = useState<{
    source: Product;
    target: Product;
    operation?: 'boydan' | 'enden';
  } | null>(null);
  const [tolerance, setTolerance] = useState(10);
  const [maxHasirSayisi, setMaxHasirSayisi] = useState(50); // Only eliminate products with ≤ this quantity
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<MergeOperation[]>([]);
  const [currentOperationIndex, setCurrentOperationIndex] = useState(0);

  // Load initial data
  useEffect(() => {
    // First try to load from sessionStorage
    const sessionData = sessionStorage.getItem('celikHasirOptimizasyonData');
    if (sessionData) {
      try {
        const parsedData = JSON.parse(sessionData);
        setProducts(parsedData);
        setFilteredProducts(parsedData);
        // Initialize history
        setHistory([{ products: parsedData, timestamp: Date.now() }]);
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
        setProducts(decodedData);
        setFilteredProducts(decodedData);
        // Initialize history
        setHistory([{ products: decodedData, timestamp: Date.now() }]);
        setHistoryIndex(0);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Veri yüklenirken hata oluştu');
      }
    }
  }, [searchParams]);

  // Update filtered products when filters or sort change
  useEffect(() => {
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

    // Apply sorting - single column
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal !== undefined && bVal !== undefined) {
          // Handle different data types properly
          let comparison = 0;
          
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal);
          } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
          } else {
            // Fallback to string comparison
            comparison = String(aVal).localeCompare(String(bVal));
          }
          
          const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
          return comparison * multiplier;
        }
        return 0;
      });
    }

    setFilteredProducts(filtered);
  }, [products, selectedFilters, sortConfig]);

  // History management
  const addToHistory = (newProducts: Product[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ products: newProducts, timestamp: Date.now() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setProducts(newProducts);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setProducts(history[historyIndex - 1].products);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setProducts(history[historyIndex + 1].products);
    }
  };

  const resetToInitial = () => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setProducts(history[0].products);
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
        `OPTİMİZASYON: ${smallerProduct.hasirSayisi}adet(${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn}) eliminated → produced as ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn}`
      ],
      advancedOptimizationNotes: `Optimizasyon: ${smallerProduct.hasirSayisi}adet ${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn} eliminated, produced as ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn}`,
      aciklama: `${biggerProduct.aciklama || ''} | OPT: ${smallerProduct.hasirSayisi}adet ${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn} -> ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn} (${totalQuantity} total)`
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
        `OPTİMİZASYON: ${smallerProduct.hasirSayisi}adet(${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn}) eliminated → produced as ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn}`
      ],
      advancedOptimizationNotes: `Optimizasyon: ${smallerProduct.hasirSayisi}adet ${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn} eliminated, produced as ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn}`,
      aciklama: `${biggerProduct.aciklama || ''} | OPT: ${smallerProduct.hasirSayisi}adet ${smallerProduct.uzunlukBoy}x${smallerProduct.uzunlukEn} -> ${biggerProduct.uzunlukBoy}x${biggerProduct.uzunlukEn} (${totalQuantity} total)`
    };
  };

  // Smart merge suggestion based on product analysis
  const getSuggestedMergeOperation = (source: Product, target: Product): 'boydan' | 'enden' | null => {
    // Tolerance and dimensions are both in cm
    const toleranceCm = tolerance;
    
    // Can merge boydan if same en, boyCap, enCap, hasirTipi
    const enDiffCm = Math.abs(source.uzunlukEn - target.uzunlukEn);
    const canMergeBoydan = 
      source.hasirTipi === target.hasirTipi &&
      enDiffCm <= toleranceCm &&
      source.boyCap === target.boyCap &&
      source.enCap === target.enCap;

    // Can merge enden if same boy, boyCap, enCap, hasirTipi
    const boyDiffCm = Math.abs(source.uzunlukBoy - target.uzunlukBoy);
    const canMergeEnden = 
      source.hasirTipi === target.hasirTipi &&
      boyDiffCm <= toleranceCm &&
      source.boyCap === target.boyCap &&
      source.enCap === target.enCap;

    if (canMergeBoydan && canMergeEnden) {
      // If both possible, suggest the one that results in more standard dimensions
      return 'boydan'; // Default to boydan
    } else if (canMergeBoydan) {
      return 'boydan';
    } else if (canMergeEnden) {
      return 'enden';
    }
    return null;
  };

  // Single-click drag handlers - work immediately
  const handleReorderDragStart = (e: React.DragEvent, product: Product) => {
    console.log('Reorder drag started for:', product.id);
    setDraggedProduct(product);
    // Don't override the mode - it's already set by radio buttons
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', product.id);
    
    // Immediate visual feedback
    const dragElement = e.currentTarget as HTMLElement;
    if (dragElement) {
      dragElement.style.opacity = '0.5';
      dragElement.style.transform = 'scale(0.95)';
      dragElement.style.transition = 'all 0.1s ease';
      dragElement.style.border = '2px dashed #3b82f6';
    }
  };
  
  const handleMergeDragStart = (e: React.DragEvent, product: Product) => {
    console.log('Merge drag started for:', product.id);
    setDraggedProduct(product);
    // Don't override the mode - it's already set by radio buttons
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', product.id);
    
    // Immediate visual feedback with merge-specific styling
    const dragElement = e.currentTarget as HTMLElement;
    if (dragElement) {
      dragElement.style.opacity = '0.5';
      dragElement.style.transform = 'scale(0.95)';
      dragElement.style.transition = 'all 0.1s ease';
      dragElement.style.border = '2px dashed #16a34a';
      dragElement.style.backgroundColor = '#dcfce7';
    }
  };

  const handleDragOver = (e: React.DragEvent, product: Product) => {
    console.log('✅ handleDragOver called for product:', product.id, 'draggedProduct:', draggedProduct?.id);
    setDragOverProduct(product);
    
    if (!draggedProduct || draggedProduct.id === product.id) {
      console.log('⚠️ No dragged product or same product, skipping');
      return;
    }
    
    if (currentDragMode === 'reorder') {
      console.log('📝 Reorder mode - setting insertion position');
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = e.clientY < midpoint ? 'before' : 'after';
      setDragInsertPosition({ productId: product.id, position });
    } else {
      console.log('🔄 Merge mode - checking merge possibility');
      const suggestion = getSuggestedMergeOperation(draggedProduct, product);
      if (suggestion) {
        console.log('✅ Merge possible:', suggestion);
        e.dataTransfer.dropEffect = 'copy';
        setDragInsertPosition(null);
      } else {
        console.log('❌ Merge not possible');
        e.dataTransfer.dropEffect = 'none';
      }
    }
  };

  const handleDragLeave = () => {
    if (dragHoverTimeout) {
      clearTimeout(dragHoverTimeout);
      setDragHoverTimeout(null);
    }
    setDragOverProduct(null);
    setDragInsertPosition(null);
  };

  const handleDragEnd = () => {
    console.log('Drag ended');
    
    // Clean up ALL drag visual styles
    const allRows = document.querySelectorAll('tr[style]');
    allRows.forEach((el) => {
      const element = el as HTMLElement;
      element.style.opacity = '';
      element.style.transform = '';
      element.style.transition = '';
      element.style.border = '';
      element.style.backgroundColor = '';
    });
    
    // Reset drag state
    setDraggedProduct(null);
    // Keep current drag mode - don't reset it
    setDragOverProduct(null);
    setDragInsertPosition(null);
  };

  const reorderProducts = (sourceProduct: Product, targetProduct: Product, position: 'before' | 'after') => {
    const newProducts = [...products];
    const sourceIndex = newProducts.findIndex(p => p.id === sourceProduct.id);
    const targetIndex = newProducts.findIndex(p => p.id === targetProduct.id);
    
    if (sourceIndex === -1 || targetIndex === -1) return;
    
    // Remove source product
    const [removed] = newProducts.splice(sourceIndex, 1);
    
    // Calculate new insertion index (account for removed item)
    const adjustedTargetIndex = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
    const insertIndex = position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1;
    
    // Insert at new position
    newProducts.splice(insertIndex, 0, removed);
    
    addToHistory(newProducts);
    toast.success('Ürün sıralaması güncellendi');
  };

  const handleDrop = (e: React.DragEvent, targetProduct: Product) => {
    e.preventDefault();
    console.log('handleDrop called:', { 
      draggedProduct: draggedProduct?.id, 
      targetProduct: targetProduct.id, 
      currentDragMode 
    });
    setDragOverProduct(null);
    
    // Reset opacity and transform immediately
    const draggedElements = document.querySelectorAll('[style*="opacity: 0.4"]');
    draggedElements.forEach((el) => {
      (el as HTMLElement).style.opacity = '1';
      (el as HTMLElement).style.transform = 'scale(1)';
    });
    
    if (dragHoverTimeout) {
      clearTimeout(dragHoverTimeout);
      setDragHoverTimeout(null);
    }
    
    if (draggedProduct && draggedProduct.id !== targetProduct.id) {
      if (currentDragMode === 'merge') {
        const suggestion = getSuggestedMergeOperation(draggedProduct, targetProduct);
        if (suggestion) {
          setPendingMerge({ source: draggedProduct, target: targetProduct, operation: suggestion });
          setShowMergeDialog(true);
        } else {
          toast.error('Ürünler birleştirilemez - farklı özellikler veya tolerans aşımı');
        }
      } else if (dragInsertPosition) {
        reorderProducts(draggedProduct, targetProduct, dragInsertPosition.position);
      }
    }
    
    setDraggedProduct(null);
    setDragInsertPosition(null);
  };

  const executeMerge = (operation: 'boydan' | 'enden') => {
    if (!pendingMerge) return;

    const { source, target } = pendingMerge;
    let mergedProduct: Product;
    let explanation: string;

    if (operation === 'boydan') {
      mergedProduct = optimizeBoydan(source, target);
      explanation = `OPTIMIZASYON: ${source.hasirSayisi}adet ${source.uzunlukBoy}x${source.uzunlukEn} eliminated → ${target.uzunlukBoy}x${target.uzunlukEn} (${Number(source.hasirSayisi) + Number(target.hasirSayisi)} total)`;
    } else {
      mergedProduct = optimizeEnden(source, target);
      explanation = `OPTIMIZASYON: ${source.hasirSayisi}adet ${source.uzunlukBoy}x${source.uzunlukEn} eliminated → ${target.uzunlukBoy}x${target.uzunlukEn} (${Number(source.hasirSayisi) + Number(target.hasirSayisi)} total)`;
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

  // Handle back to main list
  const handleBackToMainList = () => {
    // Mark all products as optimized since advanced optimization may have changed values
    const optimizedProducts = products.map(product => ({
      ...product,
      isOptimized: true
    }));
    
    // Store data in sessionStorage instead of URL
    sessionStorage.setItem('celikHasirOptimizedData', JSON.stringify(optimizedProducts));
    router.push('/uretim/hesaplamalar/urun');
  };

  // OPTIMIZATION: Find opportunities to eliminate low-quantity products
  const findMergeOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    const usedIds = new Set<string>();

    // STEP 1: Find all products that can be optimized (no quantity restriction)
    const candidateProducts = products.filter(p => !usedIds.has(p.id));
    
    for (const sourceProduct of candidateProducts) {
      if (usedIds.has(sourceProduct.id)) continue;
      
      // Only consider products with hasirSayisi <= maxHasirSayisi for elimination
      if (Number(sourceProduct.hasirSayisi) > maxHasirSayisi) continue;
      
      // STEP 2: Find a SIMILAR product to merge with (no quantity restriction)
      const candidates = products.filter(p => 
        p.id !== sourceProduct.id && 
        !usedIds.has(p.id) &&
        p.hasirTipi === sourceProduct.hasirTipi && // Same mesh type
        p.boyCap === sourceProduct.boyCap && // Same boy diameter 
        p.enCap === sourceProduct.enCap // Same en diameter
      );
      
      if (candidates.length === 0) continue;
      
      // Tolerance is in mm, dimensions are in cm, so convert tolerance to cm
      const toleranceCm = tolerance;
      
      // STEP 3: Find the best match within tolerance
      for (const targetProduct of candidates) {
        const boyDiffCm = Math.abs(Number(sourceProduct.uzunlukBoy) - Number(targetProduct.uzunlukBoy));
        const enDiffCm = Math.abs(Number(sourceProduct.uzunlukEn) - Number(targetProduct.uzunlukEn));
        
        // Check which dimension is closer for optimization choice  
        // For boydan merge: EN must be same/similar (within tolerance), BOY can be different
        const canOptimizeBoydan = enDiffCm <= toleranceCm; 
        // For enden merge: BOY must be same/similar (within tolerance), EN can be different  
        const canOptimizeEnden = boyDiffCm <= toleranceCm;
        
        if (canOptimizeBoydan) {
          const optimized = optimizeBoydan(sourceProduct, targetProduct);
          const actualDiffCm = boyDiffCm; // Show BOY difference for boydan merge
          opportunities.push({
            type: 'boydan',
            source: sourceProduct,
            target: targetProduct,
            result: optimized,
            explanation: `OPTİMİZASYON: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} silindi → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} olarak üretilecek (+${sourceProduct.hasirSayisi} adet, tolerans: ${actualDiffCm.toFixed(1)}cm)`,
            toleranceUsed: actualDiffCm,
            safetyLevel: getSafetyLevel(actualDiffCm)
          });
          usedIds.add(sourceProduct.id);
          usedIds.add(targetProduct.id);
          break;
        } else if (canOptimizeEnden) {
          const optimized = optimizeEnden(sourceProduct, targetProduct);
          const actualDiffCm = enDiffCm; // Show EN difference for enden merge
          opportunities.push({
            type: 'enden',
            source: sourceProduct,
            target: targetProduct,
            result: optimized,
            explanation: `OPTİMİZASYON: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} silindi → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} olarak üretilecek (+${sourceProduct.hasirSayisi} adet, tolerans: ${actualDiffCm.toFixed(1)}cm)`,
            toleranceUsed: actualDiffCm,
            safetyLevel: getSafetyLevel(actualDiffCm)
          });
          usedIds.add(sourceProduct.id);
          usedIds.add(targetProduct.id);
          break;
        }
      }
    }

    // Sort by tolerance used (safest first: 0 tolerance first, then higher)
    return opportunities.sort((a, b) => a.toleranceUsed - b.toleranceUsed);
  };

  // Find folded improvements - FIRST exact multiples, THEN with tolerance
  const findFoldedImprovements = () => {
    const opportunities: MergeOperation[] = [];
    const usedIds = new Set<string>();

    // PHASE 1: Look for EXACT multiples first (2x, 3x) - no tolerance
    for (const sourceProduct of products) {
      if (usedIds.has(sourceProduct.id)) continue;
      
      // Only consider products with hasirSayisi <= maxHasirSayisi for elimination
      if (Number(sourceProduct.hasirSayisi) > maxHasirSayisi) continue;

      for (const targetProduct of products) {
        if (usedIds.has(targetProduct.id) || sourceProduct.id === targetProduct.id) continue;
        if (sourceProduct.hasirTipi !== targetProduct.hasirTipi || 
            sourceProduct.boyCap !== targetProduct.boyCap || 
            sourceProduct.enCap !== targetProduct.enCap) continue;

        // Check for EXACT dimensional multiples (2x, 3x)
        const exactMatches = [
          // 2x possibilities
          { targetBoy: sourceProduct.uzunlukBoy * 2, targetEn: sourceProduct.uzunlukEn, multiple: '2x boy' },
          { targetBoy: sourceProduct.uzunlukBoy, targetEn: sourceProduct.uzunlukEn * 2, multiple: '2x en' },
          { targetBoy: sourceProduct.uzunlukBoy * 2, targetEn: sourceProduct.uzunlukEn * 2, multiple: '2x boyxen' },
          // 3x possibilities  
          { targetBoy: sourceProduct.uzunlukBoy * 3, targetEn: sourceProduct.uzunlukEn, multiple: '3x boy' },
          { targetBoy: sourceProduct.uzunlukBoy, targetEn: sourceProduct.uzunlukEn * 3, multiple: '3x en' },
          { targetBoy: sourceProduct.uzunlukBoy * 3, targetEn: sourceProduct.uzunlukEn * 3, multiple: '3x boyxen' }
        ];

        for (const match of exactMatches) {
          if (targetProduct.uzunlukBoy === match.targetBoy && targetProduct.uzunlukEn === match.targetEn) {
            const result = {
              ...targetProduct,
              id: `folded_exact_${Date.now()}`,
              hasirSayisi: Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi),
              toplamKg: Number(sourceProduct.toplamKg) + Number(targetProduct.toplamKg),
              mergeHistory: [
                ...(targetProduct.mergeHistory || []),
                `KATLI İYİLEŞTİRME: ${sourceProduct.hasirSayisi}adet(${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn}) EXACT ${match.multiple} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn}`
              ],
              advancedOptimizationNotes: `Katlı iyileştirme EXACT: ${match.multiple} - ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn}`,
              aciklama: `${targetProduct.aciklama || ''} | KATLI: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} -> ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple})`
            };

            opportunities.push({
              type: 'katli_exact',
              source: sourceProduct,
              target: targetProduct,
              result: result,
              explanation: `Katlı iyileştirme EXACT: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${match.multiple} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn}`,
              toleranceUsed: 0, // Exact match = 0 tolerance
              safetyLevel: getSafetyLevel(0)
            });

            usedIds.add(sourceProduct.id);
            usedIds.add(targetProduct.id);
            break;
          }
        }
        if (usedIds.has(sourceProduct.id)) break; // Found exact match, move to next source
      }
    }

    // PHASE 2: If no exact matches found, apply tolerance to multiples
    for (const sourceProduct of products.filter(p => !usedIds.has(p.id))) {
      if (usedIds.has(sourceProduct.id)) continue;
      
      // Only consider products with hasirSayisi <= maxHasirSayisi for elimination
      if (Number(sourceProduct.hasirSayisi) > maxHasirSayisi) continue;

      for (const targetProduct of products) {
        if (usedIds.has(targetProduct.id) || sourceProduct.id === targetProduct.id) continue;
        if (sourceProduct.hasirTipi !== targetProduct.hasirTipi || 
            sourceProduct.boyCap !== targetProduct.boyCap || 
            sourceProduct.enCap !== targetProduct.enCap) continue;

        // Check tolerance-based multiples
        const toleranceMatches = [
          // 2x with tolerance
          { targetBoy: sourceProduct.uzunlukBoy * 2, targetEn: sourceProduct.uzunlukEn, multiple: '2x boy + tol' },
          { targetBoy: sourceProduct.uzunlukBoy, targetEn: sourceProduct.uzunlukEn * 2, multiple: '2x en + tol' },
          // 3x with tolerance
          { targetBoy: sourceProduct.uzunlukBoy * 3, targetEn: sourceProduct.uzunlukEn, multiple: '3x boy + tol' },
          { targetBoy: sourceProduct.uzunlukBoy, targetEn: sourceProduct.uzunlukEn * 3, multiple: '3x en + tol' }
        ];

        for (const match of toleranceMatches) {
          // FIXED: Target must be >= multiple size (can cut down), within tolerance
          const boyDiff = targetProduct.uzunlukBoy - match.targetBoy; // Positive = target is bigger
          const enDiff = targetProduct.uzunlukEn - match.targetEn;     // Positive = target is bigger
          
          // Target must be bigger than multiple in BOTH dimensions, within tolerance
          if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= tolerance && enDiff <= tolerance) {
            const result = {
              ...targetProduct,
              id: `folded_tolerance_${Date.now()}`,
              hasirSayisi: Number(sourceProduct.hasirSayisi) + Number(targetProduct.hasirSayisi),
              toplamKg: Number(sourceProduct.toplamKg) + Number(targetProduct.toplamKg),
              mergeHistory: [
                ...(targetProduct.mergeHistory || []),
                `KATLI + TOLERANS: ${sourceProduct.hasirSayisi}adet(${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn}) ${match.multiple} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (tol: ${Math.max(boyDiff, enDiff)}cm)`
              ],
              advancedOptimizationNotes: `Katlı + Tolerans: ${match.multiple} - tol: ${Math.max(boyDiff, enDiff)}cm`,
              aciklama: `${targetProduct.aciklama || ''} | KATLI+TOL: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} -> ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (${match.multiple}, ${Math.max(boyDiff, enDiff)}cm)`
            };

            opportunities.push({
              type: 'katli_tolerance',
              source: sourceProduct,
              target: targetProduct,
              result: result,
              explanation: `Katlı + Tolerans: ${sourceProduct.hasirSayisi}adet ${sourceProduct.uzunlukBoy}x${sourceProduct.uzunlukEn} → ${match.multiple} → ${targetProduct.uzunlukBoy}x${targetProduct.uzunlukEn} (tolerans: ${Math.max(boyDiff, enDiff)}cm)`,
              toleranceUsed: Math.max(boyDiff, enDiff),
              safetyLevel: getSafetyLevel(Math.max(boyDiff, enDiff))
            });

            usedIds.add(sourceProduct.id);
            usedIds.add(targetProduct.id);
            break;
          }
        }
        if (usedIds.has(sourceProduct.id)) break; // Found tolerance match, move to next source
      }
    }

    // Sort by tolerance used (safest first: 0 tolerance first, then higher)
    return opportunities.sort((a, b) => a.toleranceUsed - b.toleranceUsed);
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
  const findRoundingOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    const usedIds = new Set<string>();
    
    for (const product of products) {
      if (usedIds.has(product.id)) continue;
      
      // Only consider products with hasirSayisi <= maxHasirSayisi for elimination
      if (Number(product.hasirSayisi) > maxHasirSayisi) continue;
      
      for (const target of products) {
        if (product.id === target.id || usedIds.has(target.id)) continue;
        if (product.hasirTipi !== target.hasirTipi || 
            product.boyCap !== target.boyCap || 
            product.enCap !== target.enCap) continue;
        
        // CRITICAL: Target must be LARGER or EQUAL in BOTH dimensions for "rounding up"
        // Check if we can round UP to target dimensions (target >= source + tolerance)
        const toleranceCm = tolerance; // Tolerance is in cm, same as dimensions
        const boyDiffCm = target.uzunlukBoy - product.uzunlukBoy; // Positive = target is bigger
        const enDiffCm = target.uzunlukEn - product.uzunlukEn;     // Positive = target is bigger
        
        // Both dimensions must be larger OR within tolerance (can be equal or slightly bigger)
        if (boyDiffCm >= 0 && enDiffCm >= 0 && boyDiffCm <= toleranceCm && enDiffCm <= toleranceCm) {
          const result = {
            ...target,
            id: `rounded_${Date.now()}`,
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
            safetyLevel: getSafetyLevel(Math.max(boyDiffCm, enDiffCm))
          });
          
          usedIds.add(product.id);
          usedIds.add(target.id);
          break; // Found match for this product, move to next
        }
      }
    }
    
    // Sort by tolerance used (safest first: 0 tolerance first, then higher)
    return opportunities.sort((a, b) => a.toleranceUsed - b.toleranceUsed);
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
    
    setPendingOperations(opportunities);
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

  // Find hasır tipi change opportunities (Q->TR, TR->R etc.)
  const findHasirTipiChangeOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    const usedIds = new Set<string>();
    
    for (const product of products) {
      if (usedIds.has(product.id)) continue;
      
      // Only consider products with hasirSayisi <= maxHasirSayisi for elimination
      if (Number(product.hasirSayisi) > maxHasirSayisi) continue; // No quantity restriction
      
      // PHASE 1: Try within same group first (Q to Q, R to R, TR to TR)
      const currentType = product.hasirTipi.charAt(0);
      const sameGroupTargets = products.filter(target => 
        !usedIds.has(target.id) && 
        target.id !== product.id &&
        target.hasirTipi.charAt(0) === currentType
      );
      
      let found = false;
      
      // Try same group first
      for (const target of sameGroupTargets) {
        const targetBoy = Number(target.uzunlukBoy);
        const targetEn = Number(target.uzunlukEn);
        const sourceBoy = Number(product.uzunlukBoy);
        const sourceEn = Number(product.uzunlukEn);
        const toleranceCm = tolerance;
        
        // Target dimensions must be >= source dimensions AND within tolerance limit
        const boyDiff = targetBoy - sourceBoy; // Positive = target is bigger
        const enDiff = targetEn - sourceEn;   // Positive = target is bigger
        
        if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= toleranceCm && enDiff <= toleranceCm) {
          const result = {
            ...target,
            id: `type_changed_same_${Date.now()}`,
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
            explanation: `Hasır tipi değişikliği (same group): ${product.hasirTipi}(${product.hasirSayisi}) ${sourceBoy}x${sourceEn} -> ${target.hasirTipi}(${targetBoy}x${targetEn}) - Aynı grup içinde`,
            toleranceUsed: Math.max(boyDiff, enDiff),
            safetyLevel: getSafetyLevel(Math.max(boyDiff, enDiff))
          });
          
          usedIds.add(product.id);
          usedIds.add(target.id);
          found = true;
          break;
        }
      }
      
      // PHASE 2: If no same-group match found, try cross-group (Q->TR->R)
      if (!found) {
        let targetTypes: string[] = [];
        if (currentType === 'Q') targetTypes = ['T']; // Q -> TR
        else if (currentType === 'T') targetTypes = ['R']; // TR -> R
        
        for (const targetType of targetTypes) {
          for (const target of products) {
            if (usedIds.has(target.id) || target.id === product.id) continue;
            if (!target.hasirTipi.startsWith(targetType)) continue;
            
            const targetBoy = Number(target.uzunlukBoy);
            const targetEn = Number(target.uzunlukEn);
            const sourceBoy = Number(product.uzunlukBoy);
            const sourceEn = Number(product.uzunlukEn);
            const toleranceCm = tolerance;
            
            const boyDiff = targetBoy - sourceBoy;
            const enDiff = targetEn - sourceEn;
            
            if (boyDiff >= 0 && enDiff >= 0 && boyDiff <= toleranceCm && enDiff <= toleranceCm) {
              const result = {
                ...target,
                id: `type_changed_cross_${Date.now()}`,
                hasirSayisi: Number(product.hasirSayisi) + Number(target.hasirSayisi),
                toplamKg: Number(product.toplamKg) + Number(target.toplamKg),
                mergeHistory: [
                  ...(target.mergeHistory || []),
                  `Tip değişikliği (cross-group): ${product.hasirTipi}(${product.hasirSayisi}) -> ${target.hasirTipi}(+${product.hasirSayisi})`
                ],
                advancedOptimizationNotes: `Hasır tipi değişikliği (cross-group): ${product.hasirTipi} -> ${target.hasirTipi}`,
                aciklama: target.aciklama || `Cross-group tip değişikliği: ${product.id} -> ${target.id}`
              };
              
              opportunities.push({
                type: 'tipi_degisiklik_cross',
                source: product,
                target: target,
                result: result,
                explanation: `Hasır tipi değişikliği (cross-group): ${product.hasirTipi}(${product.hasirSayisi}) ${sourceBoy}x${sourceEn} -> ${target.hasirTipi}(${targetBoy}x${targetEn})`,
                toleranceUsed: Math.max(boyDiff, enDiff),
                safetyLevel: getSafetyLevel(Math.max(boyDiff, enDiff))
              });
              
              usedIds.add(product.id);
              usedIds.add(target.id);
              break;
            }
          }
          if (usedIds.has(product.id)) break; // Found cross-group match
        }
      }
    }
    
    // Sort by tolerance used (safest first: 0 tolerance first, then higher)
    return opportunities.sort((a, b) => a.toleranceUsed - b.toleranceUsed);
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

  // Approve current operation
  const approveCurrentOperation = () => {
    if (currentOperationIndex >= pendingOperations.length) return;
    
    const operation = pendingOperations[currentOperationIndex];
    const newProducts = products
      .filter(p => p.id !== operation.source.id && p.id !== operation.target.id)
      .concat(operation.result);
    
    addToHistory(newProducts);
    
    if (currentOperationIndex < pendingOperations.length - 1) {
      setCurrentOperationIndex(prev => prev + 1);
    } else {
      setShowApprovalDialog(false);
      setPendingOperations([]);
      setCurrentOperationIndex(0);
      toast.success(`${pendingOperations.length} işlem tamamlandı`);
    }
  };

  const rejectCurrentOperation = () => {
    if (currentOperationIndex < pendingOperations.length - 1) {
      setCurrentOperationIndex(prev => prev + 1);
    } else {
      setShowApprovalDialog(false);
      setPendingOperations([]);
      setCurrentOperationIndex(0);
      toast('İşlemler tamamlandı');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-3xl font-bold">İleri Optimizasyon</CardTitle>
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
                onClick={resetToInitial}
                disabled={historyIndex === 0}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Başlangıca Dön
              </Button>
              <Button onClick={handleBackToMainList} className="bg-white text-blue-600 hover:bg-gray-100">
                Ana Listeye Dön
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {/* Filters and Tolerance */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtreler
              </Label>
              <div className="flex items-center gap-6">
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
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
                onClick={() => setSelectedFilters({ hasirTipi: [], hasirKodu: [], hasirTuru: [], boyCap: [], enCap: [] })}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Filtreleri Temizle
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-slate-600 to-slate-700 text-white border-l-4 border-slate-400">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-sm font-medium opacity-90">Toplam Ürün</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-amber-600 to-orange-700 text-white border-l-4 border-amber-400">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {products.filter(p => p.hasirSayisi < 20).length}
                </div>
                <p className="text-sm font-medium opacity-90">Düşük Miktar (&lt; 20)</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-l-4 border-blue-400">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {products.filter(p => p.hasirSayisi >= 20 && p.hasirSayisi < 50).length}
                </div>
                <p className="text-sm font-medium opacity-90">Orta Miktar (20-50)</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-emerald-600 to-green-700 text-white border-l-4 border-emerald-400">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {products.filter(p => p.hasirSayisi >= 50).length}
                </div>
                <p className="text-sm font-medium opacity-90">Yüksek Miktar (50+)</p>
              </CardContent>
            </Card>
          </div>

          {/* Modern drag mode indicator */}
          {draggedProduct && (
            <Alert className="mb-4 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className={`h-4 w-4 rounded-full ${currentDragMode === 'merge' ? 'bg-green-500' : 'bg-blue-500'}`}>
                <span className="text-white text-xs flex items-center justify-center h-full">
                  {currentDragMode === 'merge' ? '⚬' : '≡'}
                </span>
              </div>
              <AlertDescription className="text-gray-800 flex items-center gap-2">
                <span className="font-medium">
                  {currentDragMode === 'merge' ? 'Birleştirme Modu' : 'Sıralama Modu'}:
                </span>
                <span>
                  "{draggedProduct.hasirTipi}" ürününü {currentDragMode === 'merge' ? 'uyumlu hedef üzerine bırakın' : 'istenen konuma taşıyın'}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Drag Mode Selector */}
          <div className="mb-2 p-2 bg-gray-100 rounded-lg flex items-center gap-4">
            <span className="font-medium">Sürükleme:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="dragMode" 
                value="reorder"
                checked={currentDragMode === 'reorder'}
                onChange={() => setCurrentDragMode('reorder')}
                className="text-blue-600"
              />
              <span>Sırala</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="dragMode" 
                value="merge"
                checked={currentDragMode === 'merge'}
                onChange={() => setCurrentDragMode('merge')}
                className="text-green-600"
              />
              <span>Birleştir</span>
            </label>
          </div>

          {/* Products table */}
          <div className="border rounded-lg bg-white shadow-lg">
            <div className="max-h-96 overflow-y-auto relative">
              <Table 
                onDragOver={(e) => {
                  e.preventDefault();
                  console.log('Table dragOver - allowing drop');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  console.log('Table drop - preventing default');
                }}
              >
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-100 to-gray-200">
                    <TableHead className="w-8 sticky top-0 bg-white z-10"></TableHead>
                    <TableHead 
                      className={`sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100 ${
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
                      className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'hasirSayisi') {
                            return { key: 'hasirSayisi', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'hasirSayisi', direction: 'asc' };
                        });
                      }}
                    >
                      Hasır Sayısı <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'toplamKg') {
                            return { key: 'toplamKg', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'toplamKg', direction: 'asc' };
                        });
                      }}
                    >Toplam Kg <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead 
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
                    </TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">İleri Opt. Notları</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(product => (
                    <TableRow
                      key={product.id}
                      draggable="true"
                      onDragStart={(e) => {
                        console.log(`Starting drag for ${product.id} in ${currentDragMode} mode`);
                        e.dataTransfer.effectAllowed = currentDragMode === 'reorder' ? 'move' : 'copy';
                        e.dataTransfer.setData('text/plain', product.id);
                        setDraggedProduct(product);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('ROW dragOver for product:', product.id);
                        handleDragOver(e, product);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        console.log('ROW dragEnter for product:', product.id);
                      }}
                      onDragLeave={(e) => {
                        console.log('ROW dragLeave for product:', product.id);
                        handleDragLeave();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('ROW onDrop triggered for product:', product.id);
                        handleDrop(e, product);
                      }}
                      onDragEnd={(e) => {
                        console.log('ROW Drag ended for product:', product.id);
                        handleDragEnd();
                      }}
                      className={`transition-all duration-200 hover:bg-gray-50 relative ${
                        currentDragMode === 'reorder' ? 'cursor-move' : 'cursor-copy'
                      } ${
                        draggedProduct?.id === product.id
                          ? 'opacity-40 bg-gray-100 scale-[0.98] shadow-md'
                          : dragOverProduct?.id === product.id 
                          ? currentDragMode === 'merge' 
                            ? 'bg-green-50 border-2 border-green-400 shadow-lg transform scale-[1.01]' 
                            : 'bg-blue-50 border border-blue-300'
                          : ''
                      } ${
                        product.hasirSayisi < 20 ? 'bg-red-50' : ''
                      } ${
                        product.mergeHistory && product.mergeHistory.length > 0 ? 'bg-green-50' : ''
                      }`}
                    >
                      <TableCell>
                        <div className={`inline-flex items-center justify-center p-2 rounded ${
                          currentDragMode === 'reorder' 
                            ? 'cursor-move hover:bg-blue-100' 
                            : 'cursor-copy hover:bg-green-100'
                        }`}>
                          {currentDragMode === 'reorder' ? (
                            <GripVertical className="h-5 w-5 text-blue-600 pointer-events-none" />
                          ) : (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center pointer-events-none">
                              <span className="text-white text-xs font-bold">+</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.hasirTipi}</TableCell>
                      <TableCell>{product.uzunlukBoy}</TableCell>
                      <TableCell>{product.uzunlukEn}</TableCell>
                      <TableCell>{product.boyCap}</TableCell>
                      <TableCell>{product.enCap}</TableCell>
                      <TableCell className="font-semibold relative">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border"
                            style={{
                              backgroundColor: (() => {
                                const quantity = Number(product.hasirSayisi);
                                if (quantity >= 100) return '#22c55e'; // Green for 100+
                                const ratio = Math.min(quantity / 100, 1);
                                const red = Math.round(255 * (1 - ratio));
                                const green = Math.round(255 * ratio);
                                return `rgb(${red}, ${green}, 0)`;
                              })()
                            }}
                          />
                          <span className={Number(product.hasirSayisi) < 20 ? 'text-red-600 font-bold' : ''}>
                            {product.hasirSayisi}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.toplamKg.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{product.hasirTuru || '-'}</TableCell>
                      <TableCell className="text-xs">{product.boyAraligi || '-'}</TableCell>
                      <TableCell className="text-xs">{product.enAraligi || '-'}</TableCell>
                      <TableCell className="text-xs">{product.cubukSayisiBoy || '-'}</TableCell>
                      <TableCell className="text-xs">{product.cubukSayisiEn || '-'}</TableCell>
                      <TableCell className="text-xs">{product.solFiliz?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-xs">{product.sagFiliz?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-xs">{product.onFiliz?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-xs">{product.arkaFiliz?.toFixed(2) || '-'}</TableCell>
                      <TableCell className="text-xs">{product.adetKg?.toFixed(3) || '-'}</TableCell>
                      <TableCell className="text-xs max-w-xs">
                        <div className="truncate" title={product.advancedOptimizationNotes || product.mergeHistory?.join(' | ')}>
                          {product.advancedOptimizationNotes || product.mergeHistory?.join(' | ') || '-'}
                        </div>
                      </TableCell>
                      
                      {/* Modern insertion indicators for reorder mode */}
                      {dragInsertPosition?.productId === product.id && currentDragMode === 'reorder' && (
                        <div className="absolute inset-0 pointer-events-none z-10">
                          <div className={`absolute left-0 right-0 h-0.5 bg-blue-500 shadow-lg animate-pulse ${
                            dragInsertPosition.position === 'before' ? '-top-0.5' : '-bottom-0.5'
                          }`} />
                          <div className={`absolute w-3 h-3 bg-blue-500 rounded-full shadow-lg -left-1.5 transform -translate-y-1/2 ${
                            dragInsertPosition.position === 'before' ? 'top-0' : 'bottom-0'
                          }`} />
                          <div className={`absolute w-3 h-3 bg-blue-500 rounded-full shadow-lg -right-1.5 transform -translate-y-1/2 ${
                            dragInsertPosition.position === 'before' ? 'top-0' : 'bottom-0'
                          }`} />
                        </div>
                      )}
                      
                      {/* Merge indicator for merge mode */}
                      {dragOverProduct?.id === product.id && currentDragMode === 'merge' && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                            Birleştir
                          </div>
                        </div>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Automatic operations */}
          <div className="flex gap-4 items-center justify-center mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mr-4">
              <Label className="text-sm font-medium">Tolerans: {tolerance}cm</Label>
              <Slider
                value={[tolerance]}
                onValueChange={(value) => setTolerance(value[0])}
                min={0}
                max={100}
                step={1}
                className="w-32"
              />
            </div>
            <div className="flex items-center gap-2 mr-4">
              <Label className="text-sm font-medium">Max Hasır Sayısı: {maxHasirSayisi}</Label>
              <Slider
                value={[maxHasirSayisi]}
                onValueChange={(value) => setMaxHasirSayisi(value[0])}
                min={1}
                max={200}
                step={1}
                className="w-32"
              />
            </div>
            <Button 
              variant="outline"
              onClick={executeAutomaticMerges}
              className="bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              <Settings className="w-4 h-4 mr-2" />
              Otomatik Tüm Birleştirmeleri Uygula
            </Button>
            <Button 
              variant="outline"
              onClick={executeFoldedImprovements}
              className="bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              <Layers className="w-4 h-4 mr-2" />
              Katlı İyileştirmeler
            </Button>
            <Button 
              variant="outline"
              onClick={executeRoundingOperations}
              className="bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              ⬆️ En Yakın Üste Tamamla
            </Button>
            <Button 
              variant="outline"
              onClick={executeHasirTipiChanges}
              className="bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Hasır Tipi Değişikliği
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                // Create test data with all required Product properties
                const testData: Product[] = [
                  { 
                    id: '1', hasirTipi: 'Q275/275', uzunlukBoy: 250, uzunlukEn: 175, hasirSayisi: 15, 
                    toplamKg: 100, boyCap: 275, enCap: 275, hasirTuru: 'Normal', mergeHistory: [],
                    boyAraligi: 200, enAraligi: 200, cubukSayisiBoy: 10, cubukSayisiEn: 8,
                    solFiliz: 75, sagFiliz: 75, onFiliz: 75, arkaFiliz: 75, adetKg: 6.67,
                    isOptimized: false, uretilemez: false, aciklama: 'Test product 1'
                  },
                  { 
                    id: '2', hasirTipi: 'Q275/275', uzunlukBoy: 260, uzunlukEn: 185, hasirSayisi: 25, 
                    toplamKg: 150, boyCap: 275, enCap: 275, hasirTuru: 'Normal', mergeHistory: [],
                    boyAraligi: 200, enAraligi: 200, cubukSayisiBoy: 11, cubukSayisiEn: 9,
                    solFiliz: 75, sagFiliz: 75, onFiliz: 75, arkaFiliz: 75, adetKg: 6.0,
                    isOptimized: false, uretilemez: false, aciklama: 'Test product 2'
                  },
                  { 
                    id: '3', hasirTipi: 'TR275/275', uzunlukBoy: 250, uzunlukEn: 175, hasirSayisi: 10, 
                    toplamKg: 80, boyCap: 275, enCap: 275, hasirTuru: 'Normal', mergeHistory: [],
                    boyAraligi: 200, enAraligi: 200, cubukSayisiBoy: 10, cubukSayisiEn: 8,
                    solFiliz: 75, sagFiliz: 75, onFiliz: 75, arkaFiliz: 75, adetKg: 8.0,
                    isOptimized: false, uretilemez: false, aciklama: 'Test product 3'
                  }
                ];
                setProducts(testData);
                setFilteredProducts(testData);
                addToHistory(testData);
                toast.success('Test verisi yüklendi');
              }}
              className="bg-yellow-100 shadow-md hover:shadow-lg transition-shadow"
            >
              🧪 Test Verisi Yükle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Merge dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Birleştirme İşlemi</DialogTitle>
            <DialogDescription>
              İki ürünü nasıl birleştirmek istiyorsunuz?
            </DialogDescription>
          </DialogHeader>
          {pendingMerge && (
            <div className="space-y-4">
              {pendingMerge.operation && (
                <Alert className="mb-4 border-green-300 bg-green-50">
                  <AlertTriangle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Önerilen işlem: <strong>{pendingMerge.operation === 'boydan' ? 'Boydan Ekle' : 'Enden Ekle'}</strong>
                    {pendingMerge.operation === 'boydan' && ' (Aynı en boyutu tespit edildi)'}
                    {pendingMerge.operation === 'enden' && ' (Aynı boy uzunluğu tespit edildi)'}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <p className="font-semibold text-blue-800">Kaynak Ürün:</p>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Tip:</strong> {pendingMerge.source.hasirTipi}</p>
                    <p><strong>Boyut:</strong> {pendingMerge.source.uzunlukBoy}x{pendingMerge.source.uzunlukEn} cm</p>
                    <p><strong>Çap:</strong> {pendingMerge.source.boyCap}x{pendingMerge.source.enCap} mm</p>
                    <p><strong>Adet:</strong> {pendingMerge.source.hasirSayisi}</p>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded border border-green-200">
                  <p className="font-semibold text-green-800">Hedef Ürün:</p>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Tip:</strong> {pendingMerge.target.hasirTipi}</p>
                    <p><strong>Boyut:</strong> {pendingMerge.target.uzunlukBoy}x{pendingMerge.target.uzunlukEn} cm</p>
                    <p><strong>Çap:</strong> {pendingMerge.target.boyCap}x{pendingMerge.target.enCap} mm</p>
                    <p><strong>Adet:</strong> {pendingMerge.target.hasirSayisi}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              ❌ İptal
            </Button>
            {pendingMerge?.operation === 'boydan' ? (
              <>
                <Button variant="outline" onClick={() => executeMerge('enden')}>
                  ➡️ Enden Ekle
                </Button>
                <Button onClick={() => executeMerge('boydan')} className="bg-green-600 hover:bg-green-700">
                  Boydan Ekle (Önerilen)
                </Button>
              </>
            ) : pendingMerge?.operation === 'enden' ? (
              <>
                <Button variant="outline" onClick={() => executeMerge('boydan')}>
                  ⬆️ Boydan Ekle
                </Button>
                <Button onClick={() => executeMerge('enden')} className="bg-green-600 hover:bg-green-700">
                  Enden Ekle (Önerilen)
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => executeMerge('boydan')}>
                  ⬆️ Boydan Ekle
                </Button>
                <Button onClick={() => executeMerge('enden')}>
                  ➡️ Enden Ekle
                </Button>
              </>
            )}
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
          
          {pendingOperations.length > 0 && currentOperationIndex < pendingOperations.length && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-blue-800">Önerilen İşlem:</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">İşlem Güvenliği:</span>
                    <div 
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        pendingOperations[currentOperationIndex].safetyLevel === 'safe' 
                          ? 'bg-green-500 text-white' 
                          : pendingOperations[currentOperationIndex].safetyLevel === 'caution'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {pendingOperations[currentOperationIndex].safetyLevel === 'safe' 
                        ? '✓ GÜVENLİ' 
                        : pendingOperations[currentOperationIndex].safetyLevel === 'caution'
                        ? '⚠ DİKKAT'
                        : '⚠ RİSKLİ'}
                    </div>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {pendingOperations[currentOperationIndex].toleranceUsed.toFixed(1)}cm tolerans
                    </span>
                  </div>
                </div>
                <p className="text-blue-700">{pendingOperations[currentOperationIndex].explanation}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <p className="font-semibold mb-2 text-red-800">Kaynak Ürün: <span className="text-xs">(SİLİNECEK)</span></p>
                  <div className="text-sm space-y-1">
                    <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].source.hasirTipi}</p>
                    <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].source.uzunlukBoy}x{pendingOperations[currentOperationIndex].source.uzunlukEn} cm</p>
                    <p><strong>Adet:</strong> 
                      <span className={`ml-1 px-2 py-1 rounded font-bold ${
                        Number(pendingOperations[currentOperationIndex].source.hasirSayisi) >= 50 
                          ? 'bg-red-600 text-white' 
                          : Number(pendingOperations[currentOperationIndex].source.hasirSayisi) >= 20
                          ? 'bg-yellow-600 text-white'
                          : 'bg-green-600 text-white'
                      }`}>
                        {pendingOperations[currentOperationIndex].source.hasirSayisi}
                      </span>
                      <span className="text-xs text-red-600 ml-2">
                        {Number(pendingOperations[currentOperationIndex].source.hasirSayisi) >= 50 
                          ? '(YÜKSEK MİKTAR - DİKKAT!)' 
                          : Number(pendingOperations[currentOperationIndex].source.hasirSayisi) >= 20
                          ? '(ORTA MİKTAR)'
                          : '(DÜŞÜK MİKTAR)'}
                      </span>
                    </p>
                    <p><strong>Kg:</strong> {pendingOperations[currentOperationIndex].source.toplamKg?.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded">
                  <p className="font-semibold mb-2">Hedef Ürün:</p>
                  <div className="text-sm space-y-1">
                    <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].target.hasirTipi}</p>
                    <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].target.uzunlukBoy}x{pendingOperations[currentOperationIndex].target.uzunlukEn} cm</p>
                    <p><strong>Adet:</strong> {pendingOperations[currentOperationIndex].target.hasirSayisi}</p>
                    <p><strong>Kg:</strong> {pendingOperations[currentOperationIndex].target.toplamKg?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="font-semibold text-green-800 mb-2">Sonuç:</p>
                <div className="text-sm space-y-1 text-green-700">
                  <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].result.hasirTipi}</p>
                  <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].result.uzunlukBoy}x{pendingOperations[currentOperationIndex].result.uzunlukEn} cm</p>
                  <p><strong>Adet:</strong> {pendingOperations[currentOperationIndex].result.hasirSayisi}</p>
                  <p><strong>Kg:</strong> {pendingOperations[currentOperationIndex].result.toplamKg?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowApprovalDialog(false);
                  setPendingOperations([]);
                  setCurrentOperationIndex(0);
                }}
                className="flex-1"
              >
                🚫 Tümünü İptal Et
              </Button>
              <Button 
                variant="outline" 
                onClick={rejectCurrentOperation}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                ⏭️ Bu İşlemi Atla
              </Button>
              <Button 
                onClick={approveCurrentOperation}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Onayla
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CelikHasirOptimizasyon;