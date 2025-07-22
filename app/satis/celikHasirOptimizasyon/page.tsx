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
  uzunlukBoy: number;
  uzunlukEn: number;
  hasirSayisi: number;
  boyCap: number;
  enCap: number;
  boyAraligi: number;
  enAraligi: number;
  cubukSayisiBoy: number;
  cubukSayisiEn: number;
  adetKg: number;
  toplamKg: number;
  isOptimized: boolean;
  uretilemez: boolean;
  aciklama: string;
  mergeHistory?: string[];
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
    boyCap: [] as number[],
    enCap: [] as number[],
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: 'asc' | 'desc';
  }[]>([]);
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [dragOverProduct, setDragOverProduct] = useState<Product | null>(null);
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
      hasirSayisi: source.hasirSayisi + target.hasirSayisi,
      toplamKg: source.toplamKg + target.toplamKg,
      mergeHistory: [
        ...(target.mergeHistory || []),
        `${source.hasirSayisi}adet(${source.uzunlukBoy}x${source.uzunlukEn}) + ${target.hasirSayisi}adet → ${source.hasirSayisi + target.hasirSayisi}adet↑`
      ],
      aciklama: `Boydan birleştirildi: ${source.id} + ${target.id}`
    };
  };

  const mergeEnden = (source: Product, target: Product): Product => {
    return {
      ...target,
      id: `merged_${Date.now()}`,
      uzunlukEn: source.uzunlukEn + target.uzunlukEn,
      hasirSayisi: source.hasirSayisi + target.hasirSayisi,
      toplamKg: source.toplamKg + target.toplamKg,
      mergeHistory: [
        ...(target.mergeHistory || []),
        `${source.hasirSayisi}adet(${source.uzunlukBoy}x${source.uzunlukEn}) + ${target.hasirSayisi}adet → ${source.hasirSayisi + target.hasirSayisi}adet→`
      ],
      aciklama: `Enden birleştirildi: ${source.id} + ${target.id}`
    };
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, product: Product) => {
    setDraggedProduct(product);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, product: Product) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverProduct(product);
  };

  const handleDragLeave = () => {
    setDragOverProduct(null);
  };

  const handleDrop = (e: React.DragEvent, targetProduct: Product) => {
    e.preventDefault();
    setDragOverProduct(null);
    
    if (draggedProduct && draggedProduct.id !== targetProduct.id) {
      setPendingMerge({ source: draggedProduct, target: targetProduct });
      setShowMergeDialog(true);
    }
    
    setDraggedProduct(null);
  };

  const executeMerge = (operation: 'boydan' | 'enden') => {
    if (!pendingMerge) return;

    const { source, target } = pendingMerge;
    let mergedProduct: Product;
    let explanation: string;

    if (operation === 'boydan') {
      mergedProduct = mergeBoydan(source, target);
      explanation = `Boydan birleştirme: ${source.hasirSayisi} + ${target.hasirSayisi} = ${mergedProduct.hasirSayisi} adet`;
    } else {
      mergedProduct = mergeEnden(source, target);
      explanation = `Enden birleştirme: ${source.hasirSayisi} + ${target.hasirSayisi} = ${mergedProduct.hasirSayisi} adet`;
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
      boyCap: Array.from(new Set(products.map(p => p.boyCap))).sort((a, b) => a - b),
      enCap: Array.from(new Set(products.map(p => p.enCap))).sort((a, b) => a - b),
    };
  }, [products]);

  // Handle back to main list
  const handleBackToMainList = () => {
    const updatedData = encodeURIComponent(JSON.stringify(products));
    router.push(`/uretim/hesaplamalar/urun?optimizedData=${updatedData}`);
  };

  // Automatic merge operations
  const findMergeOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    const usedIds = new Set<string>();

    // Check for exact matches first
    for (const product1 of products) {
      if (usedIds.has(product1.id)) continue;

      for (const product2 of products) {
        if (usedIds.has(product2.id) || product1.id === product2.id) continue;

        // Check if they can be merged
        const canMergeBoydan = 
          product1.hasirTipi === product2.hasirTipi &&
          product1.uzunlukEn === product2.uzunlukEn &&
          product1.boyCap === product2.boyCap &&
          product1.enCap === product2.enCap;

        const canMergeEnden = 
          product1.hasirTipi === product2.hasirTipi &&
          product1.uzunlukBoy === product2.uzunlukBoy &&
          product1.boyCap === product2.boyCap &&
          product1.enCap === product2.enCap;

        if (canMergeBoydan) {
          const merged = mergeBoydan(product1, product2);
          opportunities.push({
            type: 'boydan',
            source: product1,
            target: product2,
            result: merged,
            explanation: `Boydan birleştirme: ${product1.hasirSayisi} + ${product2.hasirSayisi} = ${merged.hasirSayisi} adet`
          });
          usedIds.add(product1.id);
          usedIds.add(product2.id);
          break;
        } else if (canMergeEnden) {
          const merged = mergeEnden(product1, product2);
          opportunities.push({
            type: 'enden',
            source: product1,
            target: product2,
            result: merged,
            explanation: `Enden birleştirme: ${product1.hasirSayisi} + ${product2.hasirSayisi} = ${merged.hasirSayisi} adet`
          });
          usedIds.add(product1.id);
          usedIds.add(product2.id);
          break;
        }
      }
    }

    return opportunities;
  };

  // Find folded improvements (multiplication opportunities)
  const findFoldedImprovements = () => {
    const opportunities: MergeOperation[] = [];
    const usedIds = new Set<string>();

    for (const product1 of products) {
      if (usedIds.has(product1.id)) continue;

      for (const product2 of products) {
        if (usedIds.has(product2.id) || product1.id === product2.id) continue;

        // Check if same type
        if (product1.hasirTipi !== product2.hasirTipi) continue;

        // Check for multiplication opportunities
        let canFold = false;
        let explanation = '';
        let result: Product;

        // Check boy same, en multiple
        if (product1.uzunlukBoy === product2.uzunlukBoy) {
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
              aciklama: `Katlı birleştirme: ${product1.id} → ${product2.id}`
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
              aciklama: `Katlı birleştirme: ${product2.id} → ${product1.id}`
            };
            
            explanation = `Katlı iyileştirme: ${product2.uzunlukEn}cm'yi ${ratio2} katla ${product1.uzunlukEn}cm yap`;
            canFold = true;
          }
        }

        // Check en same, boy multiple
        if (!canFold && product1.uzunlukEn === product2.uzunlukEn) {
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
              aciklama: `Katlı birleştirme: ${product1.id} → ${product2.id}`
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
              aciklama: `Katlı birleştirme: ${product2.id} → ${product1.id}`
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

  // Find rounding opportunities
  const findRoundingOpportunities = () => {
    const opportunities: MergeOperation[] = [];
    
    for (const product of products) {
      if (product.hasirSayisi >= 20) continue; // Only for low quantity products
      
      const toleranceValue = getTolerance(product.hasirSayisi);
      
      for (const target of products) {
        if (product.id === target.id || target.hasirSayisi < 20) continue;
        if (product.hasirTipi !== target.hasirTipi) continue;
        
        // Check if dimensions are close enough to round up
        const boyDiff = Math.abs(product.uzunlukBoy - target.uzunlukBoy);
        const enDiff = Math.abs(product.uzunlukEn - target.uzunlukEn);
        
        if (boyDiff <= toleranceValue && enDiff <= toleranceValue) {
          const result = {
            ...target,
            id: `rounded_${Date.now()}`,
            hasirSayisi: product.hasirSayisi + target.hasirSayisi,
            toplamKg: product.toplamKg + target.toplamKg,
            mergeHistory: [
              ...(target.mergeHistory || []),
              `Yukarı yuvarla: ${product.uzunlukBoy}x${product.uzunlukEn}(${product.hasirSayisi}) → ${target.uzunlukBoy}x${target.uzunlukEn}(+${product.hasirSayisi})`
            ],
            aciklama: `Yuvarlama birleştirme: ${product.id} → ${target.id}`
          };
          
          opportunities.push({
            type: 'tamamla',
            source: product,
            target: target,
            result: result,
            explanation: `Üste tamamla: ${product.hasirSayisi}adet ${product.uzunlukBoy}x${product.uzunlukEn} → ${target.uzunlukBoy}x${target.uzunlukEn} (tolerans: ${Math.max(boyDiff, enDiff)}mm)`
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
      toast.info('Otomatik birleştirilebilecek ürün bulunamadı');
      return;
    }
    
    setPendingOperations(opportunities);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
  };

  const executeFoldedImprovements = () => {
    const opportunities = findFoldedImprovements();
    if (opportunities.length === 0) {
      toast.info('Katlı iyileştirme yapılabilecek ürün bulunamadı');
      return;
    }
    
    setPendingOperations(opportunities);
    setCurrentOperationIndex(0);
    setShowApprovalDialog(true);
  };

  const executeRoundingOperations = () => {
    const opportunities = findRoundingOpportunities();
    if (opportunities.length === 0) {
      toast.info('Üste tamamlanabilecek ürün bulunamadı');
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
      toast.info('İşlemler tamamlandı');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-full">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">İleri Optimizasyon</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                Geri Al
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              >
                <Redo2 className="h-4 w-4 mr-1" />
                İleri Al
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToInitial}
                disabled={historyIndex === 0}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Başlangıca Dön
              </Button>
              <Button onClick={handleBackToMainList}>
                Ana Listeye Dön
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Filtreler</Label>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" />
                      Hasır Tipi
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
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" />
                      Boy Çap
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
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" />
                      En Çap
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
                  onClick={() => setSelectedFilters({ hasirTipi: [], boyCap: [], enCap: [] })}
                >
                  Filtreleri Temizle
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">Toplam Ürün</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {products.filter(p => p.hasirSayisi < 20).length}
                </div>
                <p className="text-xs text-muted-foreground">20'den Az</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {products.filter(p => p.hasirSayisi >= 20 && p.hasirSayisi < 50).length}
                </div>
                <p className="text-xs text-muted-foreground">20-50 Arası</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {products.filter(p => p.hasirSayisi >= 50).length}
                </div>
                <p className="text-xs text-muted-foreground">50'den Fazla</p>
              </CardContent>
            </Card>
          </div>

          {/* Products table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Hasır Tipi</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
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
                    className="cursor-pointer hover:bg-gray-100"
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
                  <TableHead>Boy Çap (mm)</TableHead>
                  <TableHead>En Çap (mm)</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-gray-100"
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
                  <TableHead>Toplam Kg</TableHead>
                  <TableHead>Açıklama</TableHead>
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
                    className={`cursor-move hover:bg-gray-50 ${
                      dragOverProduct?.id === product.id ? 'bg-blue-50' : ''
                    } ${
                      product.hasirSayisi < 20 ? 'bg-red-50' : ''
                    }`}
                  >
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-gray-400" />
                    </TableCell>
                    <TableCell>{product.hasirTipi}</TableCell>
                    <TableCell>{product.uzunlukBoy}</TableCell>
                    <TableCell>{product.uzunlukEn}</TableCell>
                    <TableCell>{product.boyCap}</TableCell>
                    <TableCell>{product.enCap}</TableCell>
                    <TableCell className={product.hasirSayisi < 20 ? 'font-bold text-red-600' : ''}>
                      {product.hasirSayisi}
                    </TableCell>
                    <TableCell>{product.toplamKg.toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      {product.mergeHistory?.join(' | ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Automatic operations */}
          <div className="flex gap-4 justify-center mt-4">
            <Button 
              variant="outline"
              onClick={executeAutomaticMerges}
            >
              <Merge className="h-4 w-4 mr-1" />
              Otomatik Tüm Birleştirmeleri Uygula
            </Button>
            <Button 
              variant="outline"
              onClick={executeFoldedImprovements}
            >
              Katlı İyileştirmeler
            </Button>
            <Button 
              variant="outline"
              onClick={executeRoundingOperations}
            >
              En Yakın Üste Tamamla
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                toast.info('Hasır tipi değişiklikleri henüz kullanılabilir değil');
              }}
            >
              Hasır Tipi Değişikliği
            </Button>
          </div>

          {/* Tolerance slider for rounding operations */}
          <div className="mt-4 p-4 border rounded-lg">
            <Label>Yuvarlama Toleransı: {tolerance}mm</Label>
            <Slider
              value={[tolerance]}
              onValueChange={(value) => setTolerance(value[0])}
              min={5}
              max={30}
              step={1}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Üste tamamlama işlemlerinde kullanılacak tolerans değeri
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Merge dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Birleştirme İşlemi</DialogTitle>
            <DialogDescription>
              İki ürünü nasıl birleştirmek istiyorsunuz?
            </DialogDescription>
          </DialogHeader>
          {pendingMerge && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="font-semibold">Kaynak Ürün:</p>
                <p className="text-sm">
                  {pendingMerge.source.hasirTipi} - 
                  {pendingMerge.source.uzunlukBoy}x{pendingMerge.source.uzunlukEn} - 
                  {pendingMerge.source.hasirSayisi} adet
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <p className="font-semibold">Hedef Ürün:</p>
                <p className="text-sm">
                  {pendingMerge.target.hasirTipi} - 
                  {pendingMerge.target.uzunlukBoy}x{pendingMerge.target.uzunlukEn} - 
                  {pendingMerge.target.hasirSayisi} adet
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              İptal
            </Button>
            <Button onClick={() => executeMerge('boydan')}>
              Boydan Ekle
            </Button>
            <Button onClick={() => executeMerge('enden')}>
              Enden Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval dialog for automatic operations */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>İşlem Onayı</DialogTitle>
            <DialogDescription>
              {pendingOperations.length > 0 && 
                `İşlem ${currentOperationIndex + 1} / ${pendingOperations.length}`}
            </DialogDescription>
          </DialogHeader>
          
          {pendingOperations.length > 0 && currentOperationIndex < pendingOperations.length && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-semibold text-blue-800 mb-2">Önerilen İşlem:</p>
                <p className="text-blue-700">{pendingOperations[currentOperationIndex].explanation}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="font-semibold mb-2">Kaynak Ürün:</p>
                  <div className="text-sm space-y-1">
                    <p><strong>Tip:</strong> {pendingOperations[currentOperationIndex].source.hasirTipi}</p>
                    <p><strong>Boyut:</strong> {pendingOperations[currentOperationIndex].source.uzunlukBoy}x{pendingOperations[currentOperationIndex].source.uzunlukEn} cm</p>
                    <p><strong>Adet:</strong> {pendingOperations[currentOperationIndex].source.hasirSayisi}</p>
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
                Tümünü İptal Et
              </Button>
              <Button 
                variant="outline" 
                onClick={rejectCurrentOperation}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" />
                Bu İşlemi Atla
              </Button>
              <Button 
                onClick={approveCurrentOperation}
                className="flex-1"
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