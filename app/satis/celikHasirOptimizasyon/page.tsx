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
  ChevronDown
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
  type: 'boydan' | 'enden' | 'katli' | 'tamamla';
  source: Product;
  target: Product;
  result: Product;
  explanation: string;
}

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
    boyCap: [] as number[],
    enCap: [] as number[],
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: 'asc' | 'desc';
  }[]>([]);
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [dragOverProduct, setDragOverProduct] = useState<Product | null>(null);
  const [dragModePreference, setDragModePreference] = useState<'reorder' | 'merge'>('reorder');
  const [currentDragMode, setCurrentDragMode] = useState<'merge' | 'reorder'>('reorder');
  const [dragHoverTimeout, setDragHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [dragInsertPosition, setDragInsertPosition] = useState<{ productId: string; position: 'before' | 'after' } | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingMerge, setPendingMerge] = useState<{
    source: Product;
    target: Product;
    operation?: 'boydan' | 'enden';
  } | null>(null);
  const [tolerance, setTolerance] = useState(10);
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
    if (selectedFilters.boyCap.length > 0) {
      filtered = filtered.filter(p => selectedFilters.boyCap.includes(p.boyCap));
    }
    if (selectedFilters.enCap.length > 0) {
      filtered = filtered.filter(p => selectedFilters.enCap.includes(p.enCap));
    }

    // Apply sorting
    if (sortConfig.length > 0) {
      filtered.sort((a, b) => {
        for (const config of sortConfig) {
          const aVal = a[config.key];
          const bVal = b[config.key];
          if (aVal !== undefined && bVal !== undefined && aVal !== bVal) {
            const multiplier = config.direction === 'asc' ? 1 : -1;
            return (aVal < bVal ? -1 : 1) * multiplier;
          }
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

  // Get tolerance based on quantity
  const getTolerance = (hasirSayisi: number): number => {
    if (hasirSayisi < 15) return 20;
    if (hasirSayisi < 35) return 15;
    if (hasirSayisi < 50) return 10;
    if (hasirSayisi < 100) return 7;
    return 5;
  };

  // Merge functions
  const mergeBoydan = (source: Product, target: Product): Product => {
    return {
      ...target,
      id: `merged_${Date.now()}`,
      uzunlukBoy: source.uzunlukBoy + target.uzunlukBoy,
      hasirSayisi: Number(source.hasirSayisi) + Number(target.hasirSayisi),
      toplamKg: Number(source.toplamKg) + Number(target.toplamKg),
      mergeHistory: [
        ...(target.mergeHistory || []),
        `${source.hasirSayisi}adet(${source.uzunlukBoy}x${source.uzunlukEn}) + ${target.hasirSayisi}adet → ${Number(source.hasirSayisi) + Number(target.hasirSayisi)}adet↑`
      ],
      advancedOptimizationNotes: `Boydan birleştirildi: ${source.hasirSayisi}+${target.hasirSayisi}=${Number(source.hasirSayisi) + Number(target.hasirSayisi)} adet`,
      aciklama: target.aciklama || `Boydan birleştirildi: ${source.id} + ${target.id}`
    };
  };

  const mergeEnden = (source: Product, target: Product): Product => {
    return {
      ...target,
      id: `merged_${Date.now()}`,
      uzunlukEn: source.uzunlukEn + target.uzunlukEn,
      hasirSayisi: Number(source.hasirSayisi) + Number(target.hasirSayisi),
      toplamKg: Number(source.toplamKg) + Number(target.toplamKg),
      mergeHistory: [
        ...(target.mergeHistory || []),
        `${source.hasirSayisi}adet(${source.uzunlukBoy}x${source.uzunlukEn}) + ${target.hasirSayisi}adet → ${Number(source.hasirSayisi) + Number(target.hasirSayisi)}adet→`
      ],
      advancedOptimizationNotes: `Enden birleştirildi: ${source.hasirSayisi}+${target.hasirSayisi}=${Number(source.hasirSayisi) + Number(target.hasirSayisi)} adet`,
      aciklama: target.aciklama || `Enden birleştirildi: ${source.id} + ${target.id}`
    };
  };

  // Smart merge suggestion based on product analysis
  const getSuggestedMergeOperation = (source: Product, target: Product): 'boydan' | 'enden' | null => {
    // Convert tolerance from mm to cm for comparison (tolerance slider is in mm, dimensions are in cm)
    const toleranceCm = tolerance / 10;
    
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

  // Modern drag and drop handlers with mode preference
  const handleDragStart = (e: React.DragEvent, product: Product) => {
    setDraggedProduct(product);
    setCurrentDragMode(dragModePreference);
    e.dataTransfer.effectAllowed = dragModePreference === 'reorder' ? 'move' : 'copy';
    
    // Add visual feedback for drag start
    setTimeout(() => {
      const dragElement = e.currentTarget as HTMLElement;
      if (dragElement) {
        dragElement.style.opacity = '0.4';
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent, product: Product) => {
    e.preventDefault();
    setDragOverProduct(product);
    
    if (!draggedProduct || draggedProduct.id === product.id) return;
    
    if (dragModePreference === 'reorder') {
      // Reorder mode: show insertion position
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const position = e.clientY < midpoint ? 'before' : 'after';
      setDragInsertPosition({ productId: product.id, position });
      setCurrentDragMode('reorder');
    } else {
      // Merge mode: check if merge is possible
      const suggestion = getSuggestedMergeOperation(draggedProduct, product);
      if (suggestion) {
        e.dataTransfer.dropEffect = 'copy';
        setCurrentDragMode('merge');
        setDragInsertPosition(null);
      } else {
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
    setDragOverProduct(null);
    
    // Reset opacity for dragged element
    setTimeout(() => {
      const draggedElements = document.querySelectorAll('[style*="opacity: 0.4"]');
      draggedElements.forEach((el) => {
        (el as HTMLElement).style.opacity = '1';
      });
    }, 0);
    
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
    setCurrentDragMode(dragModePreference);
  };

  const executeMerge = (operation: 'boydan' | 'enden') => {
    if (!pendingMerge) return;

    const { source, target } = pendingMerge;
    let mergedProduct: Product;
    let explanation: string;

    if (operation === 'boydan') {
      mergedProduct = mergeBoydan(source, target);
      explanation = `Boydan birleştirme: ${source.hasirSayisi} + ${target.hasirSayisi} = ${Number(source.hasirSayisi) + Number(target.hasirSayisi)} adet`;
    } else {
      mergedProduct = mergeEnden(source, target);
      explanation = `Enden birleştirme: ${source.hasirSayisi} + ${target.hasirSayisi} = ${Number(source.hasirSayisi) + Number(target.hasirSayisi)} adet`;
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

  // Automatic merge operations with tolerance
  const findMergeOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    const usedIds = new Set<string>();

    // Check for exact matches and tolerance-based matches
    for (const product1 of products) {
      if (usedIds.has(product1.id)) continue;

      for (const product2 of products) {
        if (usedIds.has(product2.id) || product1.id === product2.id) continue;

        // Must have same hasir type and caps
        if (product1.hasirTipi !== product2.hasirTipi || 
            product1.boyCap !== product2.boyCap || 
            product1.enCap !== product2.enCap) continue;

        // Convert tolerance from mm to cm for comparison (tolerance slider is in mm, dimensions are in cm)
        const toleranceCm = tolerance / 10;
        
        // Check boydan merge with tolerance
        const enDiffCm = Math.abs(product1.uzunlukEn - product2.uzunlukEn);
        const canMergeBoydan = enDiffCm <= toleranceCm;

        // Check enden merge with tolerance  
        const boyDiffCm = Math.abs(product1.uzunlukBoy - product2.uzunlukBoy);
        const canMergeEnden = boyDiffCm <= toleranceCm;

        if (canMergeBoydan) {
          const merged = mergeBoydan(product1, product2);
          const actualDiffMm = Math.round(enDiffCm * 10); // Convert back to mm for display
          opportunities.push({
            type: 'boydan',
            source: product1,
            target: product2,
            result: merged,
            explanation: `Boydan birleştirme: ${product1.hasirSayisi} + ${product2.hasirSayisi} = ${Number(product1.hasirSayisi) + Number(product2.hasirSayisi)} adet (tolerans: ${actualDiffMm}mm)`
          });
          usedIds.add(product1.id);
          usedIds.add(product2.id);
          break;
        } else if (canMergeEnden) {
          const merged = mergeEnden(product1, product2);
          const actualDiffMm = Math.round(boyDiffCm * 10); // Convert back to mm for display
          opportunities.push({
            type: 'enden',
            source: product1,
            target: product2,
            result: merged,
            explanation: `Enden birleştirme: ${product1.hasirSayisi} + ${product2.hasirSayisi} = ${Number(product1.hasirSayisi) + Number(product2.hasirSayisi)} adet (tolerans: ${actualDiffMm}mm)`
          });
          usedIds.add(product1.id);
          usedIds.add(product2.id);
          break;
        }
      }
    }

    return opportunities;
  };

  // Find folded improvements (multiplication opportunities) with tolerance
  const findFoldedImprovements = () => {
    const opportunities: MergeOperation[] = [];
    const usedIds = new Set<string>();

    for (const product1 of products) {
      if (usedIds.has(product1.id)) continue;

      for (const product2 of products) {
        if (usedIds.has(product2.id) || product1.id === product2.id) continue;

        // Must have same type and caps  
        if (product1.hasirTipi !== product2.hasirTipi || 
            product1.boyCap !== product2.boyCap || 
            product1.enCap !== product2.enCap) continue;

        // Check for multiplication opportunities
        let canFold = false;
        let explanation = '';
        let result: Product;

        // Check boy similar (within tolerance), en multiple
        const toleranceCm = tolerance / 10; // Convert mm to cm
        const boyDiffCm = Math.abs(product1.uzunlukBoy - product2.uzunlukBoy);
        if (boyDiffCm <= toleranceCm) {
          const ratio1 = product2.uzunlukEn / product1.uzunlukEn;
          const ratio2 = product1.uzunlukEn / product2.uzunlukEn;
          
          if (Number.isInteger(ratio1) && ratio1 >= 2) {
            // product2's en is multiple of product1's en
            const newCount = Math.floor(product1.hasirSayisi / ratio1);
            const remainder = product1.hasirSayisi % ratio1;
            
            result = {
              ...product2,
              id: `folded_${Date.now()}`,
              hasirSayisi: product2.hasirSayisi + newCount + (remainder > 0 ? 1 : 0),
              toplamKg: product2.toplamKg + product1.toplamKg,
              mergeHistory: [
                ...(product2.mergeHistory || []),
                `Katlı: ${product1.hasirSayisi}adet(${product1.uzunlukBoy}x${product1.uzunlukEn}) ÷${ratio1} + ${remainder > 0 ? '1' : '0'}→ ${newCount + (remainder > 0 ? 1 : 0)}`
              ],
              advancedOptimizationNotes: `Katlı iyileştirme: ${product1.uzunlukEn}cm→${product2.uzunlukEn}cm (x${ratio1}) tol:${Math.round(boyDiffCm * 10)}mm`,
              aciklama: product2.aciklama || `Katlı birleştirme: ${product1.id} → ${product2.id}`
            };
            
            explanation = `Katlı iyileştirme: ${product1.uzunlukEn}cm'yi ${ratio1} katla ${product2.uzunlukEn}cm yap`;
            canFold = true;
          } else if (Number.isInteger(ratio2) && ratio2 >= 2) {
            // product1's en is multiple of product2's en
            const newCount = Math.floor(product2.hasirSayisi / ratio2);
            const remainder = product2.hasirSayisi % ratio2;
            
            result = {
              ...product1,
              id: `folded_${Date.now()}`,
              hasirSayisi: product1.hasirSayisi + newCount + (remainder > 0 ? 1 : 0),
              toplamKg: product1.toplamKg + product2.toplamKg,
              mergeHistory: [
                ...(product1.mergeHistory || []),
                `Katlı: ${product2.hasirSayisi}adet(${product2.uzunlukBoy}x${product2.uzunlukEn}) ÷${ratio2} + ${remainder > 0 ? '1' : '0'}→ ${newCount + (remainder > 0 ? 1 : 0)}`
              ],
              advancedOptimizationNotes: `Katlı iyileştirme: ${product2.uzunlukEn}cm→${product1.uzunlukEn}cm (x${ratio2}) tol:${Math.round(boyDiffCm * 10)}mm`,
              aciklama: product1.aciklama || `Katlı birleştirme: ${product2.id} → ${product1.id}`
            };
            
            explanation = `Katlı iyileştirme: ${product2.uzunlukEn}cm'yi ${ratio2} katla ${product1.uzunlukEn}cm yap`;
            canFold = true;
          }
        }

        // Check en similar (within tolerance), boy multiple
        const enDiff = Math.abs(product1.uzunlukEn - product2.uzunlukEn);
        if (!canFold && enDiff <= tolerance) {
          const ratio1 = product2.uzunlukBoy / product1.uzunlukBoy;
          const ratio2 = product1.uzunlukBoy / product2.uzunlukBoy;
          
          if (Number.isInteger(ratio1) && ratio1 >= 2) {
            const newCount = Math.floor(product1.hasirSayisi / ratio1);
            const remainder = product1.hasirSayisi % ratio1;
            
            result = {
              ...product2,
              id: `folded_${Date.now()}`,
              hasirSayisi: product2.hasirSayisi + newCount + (remainder > 0 ? 1 : 0),
              toplamKg: product2.toplamKg + product1.toplamKg,
              mergeHistory: [
                ...(product2.mergeHistory || []),
                `Katlı: ${product1.hasirSayisi}adet(${product1.uzunlukBoy}x${product1.uzunlukEn}) ÷${ratio1} + ${remainder > 0 ? '1' : '0'}→ ${newCount + (remainder > 0 ? 1 : 0)}`
              ],
              advancedOptimizationNotes: `Katlı iyileştirme: ${product1.uzunlukBoy}cm→${product2.uzunlukBoy}cm (x${ratio1}) tol:${enDiff}mm`,
              aciklama: product2.aciklama || `Katlı birleştirme: ${product1.id} → ${product2.id}`
            };
            
            explanation = `Katlı iyileştirme: ${product1.uzunlukBoy}cm'yi ${ratio1} katla ${product2.uzunlukBoy}cm yap`;
            canFold = true;
          } else if (Number.isInteger(ratio2) && ratio2 >= 2) {
            const newCount = Math.floor(product2.hasirSayisi / ratio2);
            const remainder = product2.hasirSayisi % ratio2;
            
            result = {
              ...product1,
              id: `folded_${Date.now()}`,
              hasirSayisi: product1.hasirSayisi + newCount + (remainder > 0 ? 1 : 0),
              toplamKg: product1.toplamKg + product2.toplamKg,
              mergeHistory: [
                ...(product1.mergeHistory || []),
                `Katlı: ${product2.hasirSayisi}adet(${product2.uzunlukBoy}x${product2.uzunlukEn}) ÷${ratio2} + ${remainder > 0 ? '1' : '0'}→ ${newCount + (remainder > 0 ? 1 : 0)}`
              ],
              advancedOptimizationNotes: `Katlı iyileştirme: ${product2.uzunlukBoy}cm→${product1.uzunlukBoy}cm (x${ratio2}) tol:${enDiff}mm`,
              aciklama: product1.aciklama || `Katlı birleştirme: ${product2.id} → ${product1.id}`
            };
            
            explanation = `Katlı iyileştirme: ${product2.uzunlukBoy}cm'yi ${ratio2} katla ${product1.uzunlukBoy}cm yap`;
            canFold = true;
          }
        }

        if (canFold) {
          opportunities.push({
            type: 'katli',
            source: product1,
            target: product2,
            result: result!,
            explanation
          });
          usedIds.add(product1.id);
          usedIds.add(product2.id);
          break;
        }
      }
    }

    return opportunities;
  };

  // Find rounding opportunities using global tolerance
  const findRoundingOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    
    for (const product of products) {
      if (product.hasirSayisi >= 20) continue; // Only for low quantity products
      
      for (const target of products) {
        if (product.id === target.id || target.hasirSayisi < 20) continue;
        if (product.hasirTipi !== target.hasirTipi) continue;
        
        // Check if dimensions are close enough to round up using global tolerance
        const toleranceCm = tolerance / 10; // Convert mm to cm
        const boyDiffCm = Math.abs(product.uzunlukBoy - target.uzunlukBoy);
        const enDiffCm = Math.abs(product.uzunlukEn - target.uzunlukEn);
        
        if (boyDiffCm <= toleranceCm && enDiffCm <= toleranceCm) {
          const result = {
            ...target,
            id: `rounded_${Date.now()}`,
            hasirSayisi: Number(product.hasirSayisi) + Number(target.hasirSayisi),
            toplamKg: Number(product.toplamKg) + Number(target.toplamKg),
            mergeHistory: [
              ...(target.mergeHistory || []),
              `Yukarı yuvarla: ${product.uzunlukBoy}x${product.uzunlukEn}(${product.hasirSayisi}) → ${target.uzunlukBoy}x${target.uzunlukEn}(+${product.hasirSayisi})`
            ],
            advancedOptimizationNotes: `Üste tamamla: ${product.hasirSayisi}+${target.hasirSayisi}=${Number(product.hasirSayisi) + Number(target.hasirSayisi)} adet (tol:${Math.round(Math.max(boyDiffCm, enDiffCm) * 10)}mm)`,
            aciklama: target.aciklama || `Yuvarlama birleştirme: ${product.id} → ${target.id}`
          };
          
          opportunities.push({
            type: 'tamamla',
            source: product,
            target: target,
            result: result,
            explanation: `Üste tamamla: ${product.hasirSayisi}adet ${product.uzunlukBoy}x${product.uzunlukEn} → ${target.uzunlukBoy}x${target.uzunlukEn} (tolerans: ${Math.round(Math.max(boyDiffCm, enDiffCm) * 10)}mm)`
          });
        }
      }
    }
    
    return opportunities;
  };

  // Execute automatic merges
  const executeAutomaticMerges = () => {
    const opportunities = findMergeOpportunities();
    if (opportunities.length === 0) {
      toast('Otomatik birleştirilebilecek ürün bulunamadı', { icon: '📋' });
      return;
    }
    
    setPendingOperations(opportunities);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
  };

  const executeFoldedImprovements = () => {
    const opportunities = findFoldedImprovements();
    if (opportunities.length === 0) {
      toast('Katlı iyileştirme yapılabilecek ürün bulunamadı', { icon: '📋' });
      return;
    }
    
    setPendingOperations(opportunities);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
  };

  const executeRoundingOperations = () => {
    const opportunities = findRoundingOpportunities();
    if (opportunities.length === 0) {
      toast('Üste tamamlanabilecek ürün bulunamadı', { icon: '📋' });
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
      toast('İşlemler tamamlandı', { icon: '✅' });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-3xl font-bold">🔧 İleri Optimizasyon</CardTitle>
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
              <Label className="text-lg font-semibold">🔍 Filtreler</Label>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Tolerans: {tolerance}mm</Label>
                  <Slider
                    value={[tolerance]}
                    onValueChange={(value) => setTolerance(value[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="w-32"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Sürükleme:</Label>
                  <div className="flex border rounded-md overflow-hidden bg-white">
                    <button
                      onClick={() => setDragModePreference('reorder')}
                      className={`px-3 py-1 text-xs font-medium transition-all ${
                        dragModePreference === 'reorder'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                      title="Ürünleri yeniden sırala"
                    >
                      📋 Sıralama
                    </button>
                    <button
                      onClick={() => setDragModePreference('merge')}
                      className={`px-3 py-1 text-xs font-medium transition-all border-l ${
                        dragModePreference === 'merge'
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                      title="Ürünleri birleştir"
                    >
                      🔗 Birleştirme
                    </button>
                  </div>
                </div>
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
                onClick={() => setSelectedFilters({ hasirTipi: [], hasirKodu: [], boyCap: [], enCap: [] })}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                🗑️ Filtreleri Temizle
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs opacity-90">Toplam Ürün</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {products.filter(p => p.hasirSayisi < 20).length}
                </div>
                <p className="text-xs opacity-90">20'den Az</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {products.filter(p => p.hasirSayisi >= 20 && p.hasirSayisi < 50).length}
                </div>
                <p className="text-xs opacity-90">20-50 Arası</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {products.filter(p => p.hasirSayisi >= 50).length}
                </div>
                <p className="text-xs opacity-90">50'den Fazla</p>
              </CardContent>
            </Card>
          </div>

          {/* Modern drag mode indicator */}
          {draggedProduct && (
            <Alert className="mb-4 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className={`h-4 w-4 rounded-full ${currentDragMode === 'merge' ? 'bg-green-500' : 'bg-blue-500'}`}>
                <span className="text-white text-xs flex items-center justify-center h-full">
                  {currentDragMode === 'merge' ? '🔗' : '📋'}
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

          {/* Products table */}
          <div className="border rounded-lg overflow-hidden bg-white shadow-lg">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-100 to-gray-200">
                    <TableHead className="w-8 sticky top-0 bg-white z-10"></TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          const existing = prev.find(s => s.key === 'hasirTipi');
                          if (existing) {
                            return prev.map(s => 
                              s.key === 'hasirTipi' 
                                ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                                : s
                            );
                          }
                          return [...prev, { key: 'hasirTipi', direction: 'asc' }];
                        });
                      }}
                    >Hasır Tipi <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                    <TableHead 
                      className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          const existing = prev.find(s => s.key === 'uzunlukBoy');
                          if (existing) {
                            return prev.map(s => 
                              s.key === 'uzunlukBoy' 
                                ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                                : s
                            );
                          }
                          return [...prev, { key: 'uzunlukBoy', direction: 'asc' }];
                        });
                      }}
                    >
                      Boy (cm) <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                    <TableHead 
                      className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          const existing = prev.find(s => s.key === 'uzunlukEn');
                          if (existing) {
                            return prev.map(s => 
                              s.key === 'uzunlukEn' 
                                ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                                : s
                            );
                          }
                          return [...prev, { key: 'uzunlukEn', direction: 'asc' }];
                        });
                      }}
                    >
                      En (cm) <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          const existing = prev.find(s => s.key === 'boyCap');
                          if (existing) {
                            return prev.map(s => 
                              s.key === 'boyCap' 
                                ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                                : s
                            );
                          }
                          return [...prev, { key: 'boyCap', direction: 'asc' }];
                        });
                      }}
                    >Boy Çap (mm) <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          const existing = prev.find(s => s.key === 'enCap');
                          if (existing) {
                            return prev.map(s => 
                              s.key === 'enCap' 
                                ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                                : s
                            );
                          }
                          return [...prev, { key: 'enCap', direction: 'asc' }];
                        });
                      }}
                    >En Çap (mm) <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                    <TableHead 
                      className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          const existing = prev.find(s => s.key === 'hasirSayisi');
                          if (existing) {
                            return prev.map(s => 
                              s.key === 'hasirSayisi' 
                                ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                                : s
                            );
                          }
                          return [...prev, { key: 'hasirSayisi', direction: 'asc' }];
                        });
                      }}
                    >
                      Hasır Sayısı <ArrowUpDown className="inline h-4 w-4" />
                    </TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSortConfig(prev => {
                          const existing = prev.find(s => s.key === 'toplamKg');
                          if (existing) {
                            return prev.map(s => 
                              s.key === 'toplamKg' 
                                ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
                                : s
                            );
                          }
                          return [...prev, { key: 'toplamKg', direction: 'asc' }];
                        });
                      }}
                    >Toplam Kg <ArrowUpDown className="inline h-4 w-4" /></TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">Hasır Türü</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">Boy Aralığı</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">En Aralığı</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">Boy Çubuk</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">En Çubuk</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">Sol Filiz</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">Sağ Filiz</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">Ön Filiz</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">Arka Filiz</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">Adet Kg</TableHead>
                    <TableHead className="sticky top-0 bg-white z-10 text-xs">İleri Opt. Notları</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map(product => (
                    <TableRow
                      key={product.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, product)}
                      onDragOver={(e) => handleDragOver(e, product)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, product)}
                      className={`transition-all duration-200 hover:bg-gray-50 relative ${
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
                        dragModePreference === 'reorder' ? 'cursor-move' : 'cursor-copy'
                      }`}
                    >
                      <TableCell>
                        <div className="flex flex-col items-center justify-center">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <div className="text-xs opacity-60 mt-0.5">
                            {dragModePreference === 'reorder' ? '📋' : '🔗'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.hasirTipi}</TableCell>
                      <TableCell>{product.uzunlukBoy}</TableCell>
                      <TableCell>{product.uzunlukEn}</TableCell>
                      <TableCell>{product.boyCap}</TableCell>
                      <TableCell>{product.enCap}</TableCell>
                      <TableCell className={product.hasirSayisi < 20 ? 'font-bold text-red-600' : 'font-semibold'}>
                        {product.hasirSayisi}
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
                            🔗 Birleştir
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
          <div className="flex gap-4 justify-center mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
            <Button 
              variant="outline"
              onClick={executeAutomaticMerges}
              className="bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              <Merge className="h-4 w-4 mr-1" />
              🤖 Otomatik Tüm Birleştirmeleri Uygula
            </Button>
            <Button 
              variant="outline"
              onClick={executeFoldedImprovements}
              className="bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              📐 Katlı İyileştirmeler
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
              onClick={() => {
                toast('Hasır tipi değişiklikleri henüz kullanılabilir değil', { icon: '🔧' });
              }}
              className="bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              🔄 Hasır Tipi Değişikliği
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Merge dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">🔀 Birleştirme İşlemi</DialogTitle>
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
                    ✅ Önerilen işlem: <strong>{pendingMerge.operation === 'boydan' ? 'Boydan Ekle' : 'Enden Ekle'}</strong>
                    {pendingMerge.operation === 'boydan' && ' (Aynı en boyutu tespit edildi)'}
                    {pendingMerge.operation === 'enden' && ' (Aynı boy uzunluğu tespit edildi)'}
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                  <p className="font-semibold text-blue-800">📦 Kaynak Ürün:</p>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Tip:</strong> {pendingMerge.source.hasirTipi}</p>
                    <p><strong>Boyut:</strong> {pendingMerge.source.uzunlukBoy}x{pendingMerge.source.uzunlukEn} cm</p>
                    <p><strong>Çap:</strong> {pendingMerge.source.boyCap}x{pendingMerge.source.enCap} mm</p>
                    <p><strong>Adet:</strong> {pendingMerge.source.hasirSayisi}</p>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded border border-green-200">
                  <p className="font-semibold text-green-800">🎯 Hedef Ürün:</p>
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
                  ✅ Boydan Ekle (Önerilen)
                </Button>
              </>
            ) : pendingMerge?.operation === 'enden' ? (
              <>
                <Button variant="outline" onClick={() => executeMerge('boydan')}>
                  ⬆️ Boydan Ekle
                </Button>
                <Button onClick={() => executeMerge('enden')} className="bg-green-600 hover:bg-green-700">
                  ✅ Enden Ekle (Önerilen)
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
            <DialogTitle className="text-xl font-bold">⚡ İşlem Onayı</DialogTitle>
            <DialogDescription>
              {pendingOperations.length > 0 && 
                `İşlem ${currentOperationIndex + 1} / ${pendingOperations.length}`}
            </DialogDescription>
          </DialogHeader>
          
          {pendingOperations.length > 0 && currentOperationIndex < pendingOperations.length && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-semibold text-blue-800 mb-2">🎯 Önerilen İşlem:</p>
                <p className="text-blue-700">{pendingOperations[currentOperationIndex].explanation}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="font-semibold mb-2">📦 Kaynak Ürün:</p>
                  <div className="text-sm space-y-1">
                    <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].source.hasirTipi}</p>
                    <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].source.uzunlukBoy}x{pendingOperations[currentOperationIndex].source.uzunlukEn} cm</p>
                    <p><strong>Adet:</strong> {pendingOperations[currentOperationIndex].source.hasirSayisi}</p>
                    <p><strong>Kg:</strong> {pendingOperations[currentOperationIndex].source.toplamKg?.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded">
                  <p className="font-semibold mb-2">🎯 Hedef Ürün:</p>
                  <div className="text-sm space-y-1">
                    <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].target.hasirTipi}</p>
                    <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].target.uzunlukBoy}x{pendingOperations[currentOperationIndex].target.uzunlukEn} cm</p>
                    <p><strong>Adet:</strong> {pendingOperations[currentOperationIndex].target.hasirSayisi}</p>
                    <p><strong>Kg:</strong> {pendingOperations[currentOperationIndex].target.toplamKg?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="font-semibold text-green-800 mb-2">✨ Sonuç:</p>
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
                ✅ Onayla
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CelikHasirOptimizasyon;