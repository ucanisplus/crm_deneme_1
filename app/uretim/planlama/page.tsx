'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Settings,
  BarChart3,
  Factory,
  Users,
  Target,
  TrendingUp,
  Package,
  Truck,
  Search,
  Filter,
  Plus,
  Upload,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Zap,
  PieChart,
  ArrowRight,
  ChevronDown,
  MousePointer2,
  Move,
  Activity,
  Layers,
  GitBranch,
  Database,
  Gauge,
  Flame,
  Wrench,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';

// Comprehensive Types based on real production flow
interface ProductSpec {
  // Galvanizli Tel Specs
  cap?: number;
  kaplama?: 'NIT' | 'PAD';
  kaplama_miktari?: number;
  agirlik?: number;
  
  // Panel Çit Specs  
  type?: 'single' | 'double';
  panel_type?: '2D' | '3DV' | '3DW';
  boy?: number;
  en?: number;
  diameter?: number;
  renk?: string;
  
  // Çelik Hasır Specs
  genislik?: number;
  uzunluk?: number;
  cap_araligi?: number;
  
  // Çivi Specs
  civi_boyu?: number;
  civi_capi?: number;
  yuzey_islem?: 'parlatma' | 'ovalama' | 'ham';
  paketleme_turu?: 'dokme' | 'tele_dizilmis' | 'plastige_dizilmis';
  
  // Tavlı Tel Specs
  tavlama_turu?: 'tam' | 'yarim';
  yaglama?: boolean;
  sarima_turu?: 'rozet' | 'sirali';
  
  // Profil Specs
  profil_tipi?: string;
  kesim_boyu?: number;
  kaynak_noktasi?: number;
}

interface UnifiedOrder {
  id: string;
  orderNumber: string;
  customer: string;
  product: string;
  productType: 'galvaniz' | 'panel' | 'hasir' | 'civi' | 'tavli' | 'profil' | 'palet';
  quantity: number;
  unit: string;
  specs: ProductSpec;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  currentStage: string;
  progress: number;
  estimatedCompletion: string;
  assignedMachines: string[];
  orToolsOptimized: boolean;
  costSaving?: number;
  setupReduction?: number;
}

interface Machine {
  id: string;
  code: string;
  name: string;
  line: string;
  type: string;
  status: 'idle' | 'running' | 'maintenance' | 'blocked' | 'setup';
  currentOrder?: UnifiedOrder;
  efficiency: number;
  queue: UnifiedOrder[];
  nextAvailable: string;
  capacity: number;
  currentProduct?: string;
  setupTimeRemaining?: number;
  operatorCount: number;
  powerRating?: number;
}

interface ProductionLine {
  id: string;
  name: string;
  code: string;
  machines: Machine[];
  dailyCapacity: number;
  currentUtilization: number;
  activeOrders: number;
  averageEfficiency: number;
}

interface StockInfo {
  stokAdi: string;
  stokKodu: string;
  miktar: number;
  stokMiktari: number; // Total stock amount
  birim: string;
  sipariseBagliStok: number;
  serbestStok: number;
  minimumStok: number;
  kritikStok: number; // Critical stock level
  lokasyon: string;
  status: 'normal' | 'critical' | 'low';
  rezervedFor?: string[]; // Orders this stock is reserved for
}

interface ProcessStage {
  id: string;
  name: string;
  displayName: string;
  status: 'not_started' | 'ready' | 'in_progress' | 'completed' | 'blocked';
  machine?: string;
  startTime?: string;
  endTime?: string;
  estimatedDuration: number;
  dependencies: string[];
}

// Production flow mapping - from mermaid file
const PRODUCTION_FLOWS = {
  galvaniz: [
    { id: 'filmasin', name: 'Filmaşin', displayName: 'Filmaşin Hazırlama' },
    { id: 'tel_cekme', name: 'Tel Çekme', displayName: 'Tel Çekme İşlemi' },
    { id: 'siyah_tel_stok', name: 'Siyah Tel Stok', displayName: 'Siyah Tel Stokta Bekletme' },
    { id: 'galvaniz_takeup', name: 'Galvaniz Takeup', displayName: 'Galvaniz Takeup (36 Kafa)' },
    { id: 'galvaniz_process', name: 'Galvaniz İşlem', displayName: 'Galvanizleme İşlemi' },
    { id: 'galvaniz_payoff', name: 'Galvaniz Payoff', displayName: 'Galvaniz Payoff' },
    { id: 'paketleme', name: 'Paketleme', displayName: 'Paketleme İşlemi' },
    { id: 'sevkiyat', name: 'Sevkıyat', displayName: 'Sevkıyat' }
  ],
  panel: [
    { id: 'filmasin', name: 'Filmaşin', displayName: 'Filmaşin Hazırlama' },
    { id: 'tel_cekme', name: 'Tel Çekme', displayName: 'Tel Çekme İşlemi' },
    { id: 'siyah_tel_stok', name: 'Siyah Tel Stok', displayName: 'Siyah Tel Stokta Bekletme' },
    { id: 'galvaniz_takeup', name: 'Galvaniz Takeup', displayName: 'Galvaniz Takeup (36 Kafa)' },
    { id: 'galvaniz_process', name: 'Galvaniz İşlem', displayName: 'Galvanizleme İşlemi' },
    { id: 'galvaniz_payoff', name: 'Galvaniz Payoff', displayName: 'Galvaniz Payoff' },
    { id: 'panel_kesme', name: 'Panel Kesme', displayName: 'Panel Kesme İşlemi' },
    { id: 'panel_kaynak', name: 'Panel Kaynak', displayName: 'Panel Kaynak İşlemi' },
    { id: 'boyama', name: 'Boyama', displayName: 'Boyama İşlemi' },
    { id: 'paketleme', name: 'Paketleme', displayName: 'Paketleme İşlemi' },
    { id: 'sevkiyat', name: 'Sevkıyat', displayName: 'Sevkıyat' }
  ],
  hasir: [
    { id: 'filmasin', name: 'Filmaşin', displayName: 'Filmaşin 1008/1010' },
    { id: 'cubuk_kesme', name: 'Çubuk Kesme', displayName: 'Nervürlü Çubuk Kesme' },
    { id: 'nervurleme', name: 'Nervürleme', displayName: 'Nervürleme İşlemi' },
    { id: 'hasir_kaynak', name: 'Hasır Kaynak', displayName: 'Çelik Hasır Kaynak' },
    { id: 'sevkiyat', name: 'Sevkıyat', displayName: 'Sevkıyat' }
  ],
  civi: [
    { id: 'filmasin', name: 'Filmaşin', displayName: 'Filmaşin Hazırlama' },
    { id: 'tel_cekme', name: 'Tel Çekme', displayName: 'Tel Çekme İşlemi' },
    { id: 'siyah_tel_stok', name: 'Siyah Tel Stok', displayName: 'Siyah Tel Stokta Bekletme' },
    { id: 'civi_kesme', name: 'Çivi Kesme', displayName: 'Çivi Kesme (9 Makine)' },
    { id: 'parlatma', name: 'Parlatma', displayName: 'Parlatma İşlemi' },
    { id: 'ovalama', name: 'Ovalama', displayName: 'Ovalama İşlemi' },
    { id: 'paketleme', name: 'Paketleme', displayName: 'Paketleme İşlemi' },
    { id: 'sevkiyat', name: 'Sevkıyat', displayName: 'Sevkıyat' }
  ],
  tavli: [
    { id: 'filmasin', name: 'Filmaşin', displayName: 'Filmaşin Hazırlama' },
    { id: 'tel_cekme', name: 'Tel Çekme', displayName: 'Tel Çekme İşlemi' },
    { id: 'aracap', name: 'Araçap', displayName: 'Araçap İşlemi (1.2mm)' },
    { id: 'tavlama', name: 'Tavlama', displayName: 'Tavlama Fırını (5.5 ton/9h)' },
    { id: 'yaglama', name: 'Yağlama', displayName: 'Yağlama İşlemi' },
    { id: 'paketleme', name: 'Paketleme', displayName: 'Paketleme İşlemi' },
    { id: 'sevkiyat', name: 'Sevkıyat', displayName: 'Sevkıyat' }
  ],
  profil: [
    { id: 'profil_hammadde', name: 'Profil Hammadde', displayName: 'Dış Alım Profil' },
    { id: 'profil_kesme', name: 'Profil Kesme', displayName: 'Profil Kesme İşlemi' },
    { id: 'profil_kaynak', name: 'Profil Kaynak', displayName: 'Profil Kaynak İşlemi' },
    { id: 'boyama', name: 'Boyama', displayName: 'Boyama İşlemi' },
    { id: 'sevkiyat', name: 'Sevkıyat', displayName: 'Sevkıyat' }
  ],
  palet: [
    { id: 'palet_hammadde', name: 'Palet Hammadde', displayName: 'Palet Hammadde Hazırlama' },
    { id: 'palet_imalat', name: 'Palet İmalat', displayName: 'Palet İmalat İşlemi' },
    { id: 'sevkiyat', name: 'Sevkıyat', displayName: 'Sevkıyat' }
  ]
};

// Friendly product names from CSV
const FRIENDLY_PRODUCTS = {
  'GT.NIT.0122.00': 'Galvanizli Tel NIT 1.22mm',
  'GT.PAD.0390.00': 'Galvanizli Tel PAD 3.90mm', 
  '2D.0740.0540.2500.2030.51.6005': 'Panel Çit 2D 830x2500mm RAL6005',
  '3DV.0480.2500.2030.46.RAL6005': 'Panel Çit 3DV 2500x2030mm RAL6005',
  '3DW.0480.2500.2030.46.RAL6005': 'Panel Çit 3DW 2500x2030mm RAL6005',
  'CH.STD.0450.00': 'Çelik Hasır Standard 450mm',
  'CV.DKM.01': 'Dökme Çivi 2.5x50mm',
  'CV.TD.RG.0250.050.00': 'Tele Dizilmiş Çivi Ring 2.5x50mm',
  'TT.BAG.0160.01': 'Tavlı Tel Bağlama 1.60mm',
  'TT.BALYA.0300.00': 'Balya Teli 3.00mm'
};

// Production Lines Data - Based on Mermaid Flow
const mockProductionLines: ProductionLine[] = [
  {
    id: 'tel_cekme',
    name: 'Tel Çekme Hattı',
    code: 'TC',
    machines: [],
    dailyCapacity: 15000, // kg
    currentUtilization: 78,
    activeOrders: 12,
    averageEfficiency: 87
  },
  {
    id: 'galvaniz',
    name: 'Galvaniz Hattı',
    code: 'GV',
    machines: [],
    dailyCapacity: 128500, // kg
    currentUtilization: 85,
    activeOrders: 24,
    averageEfficiency: 92
  },
  {
    id: 'panel',
    name: 'Panel Çit Hattı',
    code: 'PC',
    machines: [],
    dailyCapacity: 800, // adet
    currentUtilization: 68,
    activeOrders: 8,
    averageEfficiency: 74
  },
  {
    id: 'hasir',
    name: 'Çelik Hasır Hattı',
    code: 'CH',
    machines: [],
    dailyCapacity: 2000, // adet
    currentUtilization: 72,
    activeOrders: 6,
    averageEfficiency: 71
  },
  {
    id: 'civi',
    name: 'Çivi Hattı',
    code: 'CV',
    machines: [],
    dailyCapacity: 8000, // kg
    currentUtilization: 45,
    activeOrders: 4,
    averageEfficiency: 65
  },
  {
    id: 'tavli',
    name: 'Tavlı Tel Hattı',
    code: 'TT',
    machines: [],
    dailyCapacity: 5500, // kg
    currentUtilization: 82,
    activeOrders: 3,
    averageEfficiency: 89
  },
  {
    id: 'profil',
    name: 'Profil Hattı',
    code: 'PF',
    machines: [],
    dailyCapacity: 400, // adet
    currentUtilization: 56,
    activeOrders: 2,
    averageEfficiency: 76
  }
];

// Generate comprehensive machine data
const generateMachines = (): Machine[] => {
  const machines: Machine[] = [];
  
  // Tel Çekme Machines (9 + 1 Araçap)
  for (let i = 1; i <= 9; i++) {
    machines.push({
      id: `TC${i}`,
      code: `TC${i}`,
      name: `Tel Çekme ${i}`,
      line: 'tel_cekme',
      type: 'wire_drawing',
      status: ['running', 'idle', 'setup', 'maintenance'][Math.floor(Math.random() * 4)] as any,
      efficiency: Math.floor(Math.random() * 30) + 70,
      queue: [],
      nextAvailable: `${9 + Math.floor(Math.random() * 8)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      capacity: Math.floor(Math.random() * 500) + 500, // Çapa bağlı değişken kapasite
      operatorCount: 1,
      currentProduct: Math.random() > 0.5 ? `Siyah Tel ${(Math.random() * 3 + 2).toFixed(1)}mm` : undefined,
      setupTimeRemaining: Math.random() > 0.7 ? Math.floor(Math.random() * 60) + 15 : undefined
    });
  }
  
  // Araçap
  machines.push({
    id: 'ARACAP1',
    code: 'ARACAP',
    name: 'Araçap (1.2mm İnşaat Teli)',
    line: 'tel_cekme',
    type: 'intermediate_drawing',
    status: 'running',
    efficiency: 85,
    queue: [],
    nextAvailable: '14:30',
    capacity: 600,
    operatorCount: 1,
    currentProduct: 'İnşaat Teli 1.2mm'
  });
  
  // Galvaniz Kafalar (36 units)
  for (let i = 1; i <= 36; i++) {
    const isActive = i <= 21; // 21 kafa iç piyasa aktif
    machines.push({
      id: `KAFA${i}`,
      code: `KAFA-${i}`,
      name: `Galvaniz Kafa ${i}`,
      line: 'galvaniz',
      type: 'galvanizing_head',
      status: isActive ? (['running', 'idle', 'setup'][Math.floor(Math.random() * 3)] as any) : 'maintenance',
      efficiency: isActive ? Math.floor(Math.random() * 35) + 65 : 0,
      queue: [],
      nextAvailable: `${10 + Math.floor(Math.random() * 8)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      capacity: 150,
      operatorCount: 1,
      powerRating: Math.random() > 0.6 ? 5 : 3, // 5KW or 3KW
      currentProduct: isActive && Math.random() > 0.4 ? 
        (Math.random() > 0.5 ? 'GT NIT 1.22mm' : 'GT PAD 3.90mm') : undefined
    });
  }
  
  // Panel Çit Machines
  machines.push(
    {
      id: 'PCK1',
      code: 'PCK-1',
      name: 'Panel Kesme 1',
      line: 'panel',
      type: 'panel_cutting',
      status: 'running',
      efficiency: 78,
      queue: [],
      nextAvailable: '13:20',
      capacity: 40, // panel/hour
      operatorCount: 2,
      currentProduct: 'Panel 2D 2500mm'
    },
    {
      id: 'PKY1',
      code: 'PKY-1',
      name: 'Panel Kaynak 1',
      line: 'panel',
      type: 'panel_welding',
      status: 'running',
      efficiency: 82,
      queue: [],
      nextAvailable: '14:10',
      capacity: 35, // panel/hour
      operatorCount: 2,
      currentProduct: 'Panel 3DV 2030mm'
    },
    {
      id: 'PBY1',
      code: 'PBY-1',
      name: 'Panel Boyama Fırını',
      line: 'panel',
      type: 'panel_painting',
      status: 'running',
      efficiency: 75,
      queue: [],
      nextAvailable: '16:00',
      capacity: 25, // panel/hour
      operatorCount: 7, // Min 7 kişi %100 verim
      currentProduct: 'Panel RAL6005 Boyama'
    }
  );
  
  // Çelik Hasır Machines
  machines.push(
    {
      id: 'YOTO1',
      code: 'YOTO-1',
      name: 'Yarı Oto Kaynak 1',
      line: 'hasir',
      type: 'semi_auto_welding',
      status: 'running',
      efficiency: 75,
      queue: [],
      nextAvailable: '15:30',
      capacity: 20, // hasır/hour
      operatorCount: 2,
      currentProduct: 'Hasır 450mm Standard'
    },
    {
      id: 'YOTO2',
      code: 'YOTO-2', 
      name: 'Yarı Oto Kaynak 2',
      line: 'hasir',
      type: 'semi_auto_welding',
      status: 'setup',
      efficiency: 0,
      queue: [],
      nextAvailable: '11:00',
      capacity: 20,
      operatorCount: 2,
      setupTimeRemaining: 45
    },
    {
      id: 'TAMO1',
      code: 'TAMO-1',
      name: 'Tam Oto Kaynak 1 (Schlatter)',
      line: 'hasir',
      type: 'full_auto_welding',
      status: 'running',
      efficiency: 88,
      queue: [],
      nextAvailable: '17:00',
      capacity: 30, // hasır/hour
      operatorCount: 1,
      currentProduct: 'Hasır 600mm'
    },
    {
      id: 'TAMO2',
      code: 'TAMO-2',
      name: 'Tam Oto Kaynak 2 (Eurobend)',
      line: 'hasir',
      type: 'full_auto_welding',
      status: 'maintenance',
      efficiency: 0,
      queue: [],
      nextAvailable: '09:00+1',
      capacity: 25, // hasır/hour - çok arızalı
      operatorCount: 1
    }
  );
  
  // Çivi Machines
  for (let i = 1; i <= 9; i++) {
    machines.push({
      id: `CK${i}`,
      code: `CK-${i}`,
      name: `Çivi Kesme ${i}`,
      line: 'civi',
      type: 'nail_cutting',
      status: i <= 6 ? 'running' : 'idle',
      efficiency: i <= 6 ? Math.floor(Math.random() * 25) + 65 : 0,
      queue: [],
      nextAvailable: `${10 + Math.floor(Math.random() * 6)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      capacity: 100, // kg/hour
      operatorCount: Math.ceil(i/3), // 4 operatör total
      currentProduct: i <= 6 ? 'Çivi 2.5x50mm' : undefined
    });
  }
  
  // Çivi Parlatma & Ovalama
  machines.push(
    {
      id: 'CP1',
      code: 'CP-1',
      name: 'Çivi Parlatma 1',
      line: 'civi',
      type: 'nail_polishing',
      status: 'running',
      efficiency: 85,
      queue: [],
      nextAvailable: '13:45',
      capacity: 400, // kg/hour
      operatorCount: 1,
      currentProduct: 'Parlatma İşlemi'
    },
    {
      id: 'CO1',
      code: 'CO-1',
      name: 'Çivi Ovalama 1',
      line: 'civi',
      type: 'nail_rounding',
      status: 'idle',
      efficiency: 0,
      queue: [],
      nextAvailable: '10:00',
      capacity: 1100, // kg/day per machine
      operatorCount: 1
    }
  );
  
  // Tavlı Tel Machines
  machines.push(
    {
      id: 'TAV1',
      code: 'TAV-1',
      name: 'Tavlama Fırını',
      line: 'tavli',
      type: 'annealing_furnace',
      status: 'running',
      efficiency: 92,
      queue: [],
      nextAvailable: '18:00',
      capacity: 611, // kg/hour (5.5 ton/9 hour)
      operatorCount: 2,
      currentProduct: 'İnşaat Teli 1.60mm Tavlama'
    },
    {
      id: 'YAG1',
      code: 'YAG-1',
      name: 'Yağlama Ünitesi',
      line: 'tavli',
      type: 'oiling_unit',
      status: 'running',
      efficiency: 88,
      queue: [],
      nextAvailable: '19:00',
      capacity: 500, // kg/hour
      operatorCount: 1,
      currentProduct: 'Balya Teli Yağlama'
    }
  );
  
  // Profil Machines
  machines.push(
    {
      id: 'PFK1',
      code: 'PFK-1',
      name: 'Profil Kesme 1',
      line: 'profil',
      type: 'profile_cutting',
      status: 'idle',
      efficiency: 0,
      queue: [],
      nextAvailable: '08:00',
      capacity: 300, // adet/day
      operatorCount: 1
    },
    {
      id: 'PFY1',
      code: 'PFY-1',
      name: 'Profil Kaynak 1',
      line: 'profil',
      type: 'profile_welding',
      status: 'setup',
      efficiency: 0,
      queue: [],
      nextAvailable: '12:30',
      capacity: 400, // adet/vardiya
      operatorCount: 1,
      setupTimeRemaining: 90 // Ayar kaçması problem
    }
  );
  
  return machines;
};

// Generate comprehensive stock data
const mockStock: StockInfo[] = [
  // Hammadde
  { stokAdi: 'Filmaşin 6.00mm 1008 Kalite', stokKodu: 'FLM.0600.1008', miktar: 25000, stokMiktari: 25000, birim: 'kg', sipariseBagliStok: 8000, serbestStok: 17000, minimumStok: 5000, kritikStok: 3000, lokasyon: 'HAMMADDE_1', status: 'normal', rezervedFor: ['SIP-2024-001', 'SIP-2024-003'] },
  { stokAdi: 'Filmaşin 7.00mm 1010 Kalite', stokKodu: 'FLM.0700.1010', miktar: 18000, stokMiktari: 18000, birim: 'kg', sipariseBagliStok: 5500, serbestStok: 12500, minimumStok: 4000, kritikStok: 2500, lokasyon: 'HAMMADDE_1', status: 'normal', rezervedFor: ['SIP-2024-002'] },
  { stokAdi: 'Profil Hammadde Galvanizli', stokKodu: 'PROF.GLVZ.01', miktar: 2500, stokMiktari: 2500, birim: 'kg', sipariseBagliStok: 800, serbestStok: 1700, minimumStok: 1000, kritikStok: 800, lokasyon: 'HAMMADDE_2', status: 'normal' },
  
  // Yarı Mamul
  { stokAdi: 'Siyah Tel 2.00mm', stokKodu: 'YM.ST.0200.00', miktar: 12000, stokMiktari: 12000, birim: 'kg', sipariseBagliStok: 5500, serbestStok: 6500, minimumStok: 2000, kritikStok: 1500, lokasyon: 'YARIMAMUL_1', status: 'normal', rezervedFor: ['SIP-2024-004'] },
  { stokAdi: 'Siyah Tel 4.00mm', stokKodu: 'YM.ST.0400.00', miktar: 8500, stokMiktari: 8500, birim: 'kg', sipariseBagliStok: 3200, serbestStok: 5300, minimumStok: 1500, kritikStok: 1200, lokasyon: 'YARIMAMUL_1', status: 'normal' },
  { stokAdi: 'Nervürlü Tel 6.5mm', stokKodu: 'YM.NTEL.0650', miktar: 4200, stokMiktari: 4200, birim: 'kg', sipariseBagliStok: 1800, serbestStok: 2400, minimumStok: 1000, kritikStok: 800, lokasyon: 'YARIMAMUL_2', status: 'normal' },
  
  // Mamul
  { stokAdi: 'Galvanizli Tel NIT 1.22mm', stokKodu: 'GT.NIT.0122.00', miktar: 8500, stokMiktari: 8500, birim: 'kg', sipariseBagliStok: 3000, serbestStok: 5500, minimumStok: 1500, kritikStok: 1000, lokasyon: 'MAMUL_GALV', status: 'normal' },
  { stokAdi: 'Galvanizli Tel PAD 3.90mm', stokKodu: 'GT.PAD.0390.00', miktar: 6200, stokMiktari: 6200, birim: 'kg', sipariseBagliStok: 2100, serbestStok: 4100, minimumStok: 1200, kritikStok: 900, lokasyon: 'MAMUL_GALV', status: 'normal' },
  { stokAdi: 'Panel Çit 2D 830x2500mm RAL6005', stokKodu: '2D.0740.0540.2500.2030.51.6005', miktar: 150, stokMiktari: 150, birim: 'adet', sipariseBagliStok: 80, serbestStok: 70, minimumStok: 50, kritikStok: 30, lokasyon: 'MAMUL_PANEL', status: 'normal' },
  
  // Yardımcı Malzemeler
  { stokAdi: 'Çinko (Galvaniz)', stokKodu: 'CNKO.GLV.01', miktar: 850, stokMiktari: 850, birim: 'kg', sipariseBagliStok: 200, serbestStok: 650, minimumStok: 300, kritikStok: 250, lokasyon: 'KIMYASAL_1', status: 'critical' },
  { stokAdi: 'Asit (HCl)', stokKodu: 'ASIT.HCL.01', miktar: 1200, stokMiktari: 1200, birim: 'L', sipariseBagliStok: 300, serbestStok: 900, minimumStok: 500, kritikStok: 400, lokasyon: 'KIMYASAL_1', status: 'normal' },
  { stokAdi: 'Boya RAL6005', stokKodu: 'BOYA.RAL6005', miktar: 180, stokMiktari: 180, birim: 'kg', sipariseBagliStok: 45, serbestStok: 135, minimumStok: 100, kritikStok: 80, lokasyon: 'BOYA_DEPO', status: 'low' },
  { stokAdi: 'Boş Makara', stokKodu: 'MAKARA.BOS.01', miktar: 230, stokMiktari: 230, birim: 'adet', sipariseBagliStok: 45, serbestStok: 185, minimumStok: 100, kritikStok: 80, lokasyon: 'MAKARA_DEPO', status: 'critical' },
  { stokAdi: 'Kaynak Elektrodu', stokKodu: 'ELKT.KYNK.01', miktar: 450, stokMiktari: 450, birim: 'kg', sipariseBagliStok: 80, serbestStok: 370, minimumStok: 150, kritikStok: 120, lokasyon: 'KAYNAK_DEPO', status: 'normal' }
];

// Generate sample orders
const generateSampleOrders = (): UnifiedOrder[] => [
  {
    id: 'ORD-2024-001',
    orderNumber: 'ORD-2024-001',
    customer: 'ABC İnşaat Ltd.',
    product: 'Panel Çit 2D 830x2500mm RAL6005',
    productType: 'panel',
    quantity: 150,
    unit: 'adet',
    specs: {
      type: 'double',
      panel_type: '2D',
      boy: 2500,
      en: 2030,
      diameter: 5.1,
      renk: 'RAL6005'
    },
    priority: 'high',
    dueDate: '2024-08-20',
    status: 'in_progress',
    currentStage: 'panel_kaynak',
    progress: 65,
    estimatedCompletion: '2024-08-19T16:00:00Z',
    assignedMachines: ['PKY1', 'PBY1'],
    orToolsOptimized: true,
    costSaving: 1250,
    setupReduction: 35
  },
  {
    id: 'ORD-2024-002',
    orderNumber: 'ORD-2024-002',
    customer: 'XYZ Metal San.',
    product: 'Galvanizli Tel NIT 1.22mm',
    productType: 'galvaniz',
    quantity: 2500,
    unit: 'kg',
    specs: {
      cap: 1.22,
      kaplama: 'NIT',
      agirlik: 2500
    },
    priority: 'medium',
    dueDate: '2024-08-18',
    status: 'in_progress',
    currentStage: 'galvaniz_process',
    progress: 45,
    estimatedCompletion: '2024-08-17T14:30:00Z',
    assignedMachines: ['KAFA1', 'KAFA5'],
    orToolsOptimized: true,
    costSaving: 890,
    setupReduction: 20
  },
  {
    id: 'ORD-2024-003',
    orderNumber: 'ORD-2024-003',
    customer: 'DEF Yapı A.Ş.',
    product: 'Çelik Hasır Standard 450mm',
    productType: 'hasir',
    quantity: 200,
    unit: 'adet',
    specs: {
      genislik: 450,
      uzunluk: 2000,
      cap_araligi: 6.0
    },
    priority: 'low',
    dueDate: '2024-08-25',
    status: 'pending',
    currentStage: 'beklemede',
    progress: 0,
    estimatedCompletion: '2024-08-24T12:00:00Z',
    assignedMachines: [],
    orToolsOptimized: false
  },
  {
    id: 'ORD-2024-004',
    orderNumber: 'ORD-2024-004',
    customer: 'GHI Endüstri',
    product: 'Dökme Çivi 2.5x50mm',
    productType: 'civi',
    quantity: 1500,
    unit: 'kg',
    specs: {
      civi_boyu: 50,
      civi_capi: 2.5,
      yuzey_islem: 'parlatma',
      paketleme_turu: 'dokme'
    },
    priority: 'medium',
    dueDate: '2024-08-22',
    status: 'in_progress',
    currentStage: 'parlatma',
    progress: 30,
    estimatedCompletion: '2024-08-21T18:00:00Z',
    assignedMachines: ['CK1', 'CK2', 'CP1'],
    orToolsOptimized: true,
    costSaving: 450,
    setupReduction: 15
  }
];

export default function ComprehensiveAPSSystem() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // State Management
  const [activeView, setActiveView] = useState<'overview' | 'orders' | 'machines' | 'lines'>('overview');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
  
  // Data State
  const [orders, setOrders] = useState<UnifiedOrder[]>(generateSampleOrders());
  const [machines] = useState<Machine[]>(generateMachines());
  const [stock] = useState<StockInfo[]>(mockStock);
  const [productionLines] = useState<ProductionLine[]>(mockProductionLines);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedLineForDetail, setSelectedLineForDetail] = useState<string | null>(null);
  const [showLineDetailModal, setShowLineDetailModal] = useState(false);

  // Reçete (Recipe) and Raw Material System Integration
  const [recipeData] = useState({
    // Connected calculation components with full recipe support:
    galvanizliTel: {
      component: '/components/GalvanizliTelNetsis.jsx',
      features: ['Otomatik reçete hesaplama', 'YM ST bileşen optimizasyonu', 'Kaplama hesaplamaları', 'Excel export'],
      rawMaterials: ['Filmaşin', 'Çinko', 'Alüminyum', 'Demir klorür']
    },
    panelCit: {
      component: '/components/PanelCitHesaplama.jsx', 
      features: ['Profil hammadde hesaplama', 'Tel tüketim analizi', 'Maliyet optimizasyonu'],
      rawMaterials: ['Profiller', 'Galvanizli Tel', 'Aksesuar parçaları']
    },
    celikHasir: {
      component: '/components/CelikHasirHesaplama.jsx',
      features: ['Tel tüketim hesaplama', 'Kaynak süre optimizasyonu'],
      rawMaterials: ['Çelik tel', 'Kaynak malzemesi']
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Helper Functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'blocked': return 'bg-red-500';
      case 'ready': return 'bg-yellow-500';
      case 'setup': return 'bg-purple-500';
      case 'maintenance': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  // OR-Tools Integration Function
  const optimizeWithORTools = async (order: UnifiedOrder) => {
    setIsOptimizing(true);
    
    // Simulate OR-Tools optimization call
    try {
      // Mock API call to Render backend with OR-Tools
      const optimizationData = {
        order: order,
        available_machines: machines.filter(m => 
          m.line === order.productType && 
          ['idle', 'running'].includes(m.status)
        ),
        constraints: {
          due_date: order.dueDate,
          priority: order.priority,
          setup_matrix: getSetupMatrix(order.productType),
          capacity_limits: getCapacityLimits(order.productType)
        }
      };
      
      // Simulate optimization result
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = {
        optimal_machines: optimizationData.available_machines.slice(0, 2).map(m => m.id),
        completion_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        cost_saving: Math.floor(Math.random() * 1000) + 500,
        setup_reduction: Math.floor(Math.random() * 30) + 10
      };
      
      // Update order with OR-Tools results
      const updatedOrder = {
        ...order,
        assignedMachines: result.optimal_machines,
        estimatedCompletion: result.completion_time,
        status: 'in_progress' as const,
        orToolsOptimized: true,
        costSaving: result.cost_saving,
        setupReduction: result.setup_reduction
      };
      
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
      
      alert(`OR-Tools Optimizasyonu Tamamlandı!
• Maliyet Tasarrufu: ${result.cost_saving}₺
• Setup Azalması: ${result.setup_reduction} dakika
• Atanan Makineler: ${result.optimal_machines.join(', ')}`);
      
    } catch (error) {
      console.error('OR-Tools optimization failed:', error);
      alert('OR-Tools optimizasyonu başarısız! Heuristik algoritma kullanılıyor.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const getSetupMatrix = (productType: string) => {
    // Return setup time matrices based on product type and CSV data
    const matrices: any = {
      'panel': {
        '2D_to_3DV': 180, // minutes from CSV
        '3DV_to_3DW': 1080, // minutes from CSV
        '3DW_to_2D': 360
      },
      'galvaniz': {
        'nit_to_pad': 20, // minutes
        'pad_to_nit': 90 // minutes
      }
    };
    return matrices[productType] || {};
  };

  const getCapacityLimits = (productType: string) => {
    const limits: any = {
      'galvaniz': { min_daily_kg: 110000, max_hourly_kg: 6250 },
      'panel': { max_daily_adet: 800 },
      'tel_cekme': { max_hourly_kg_per_machine: 800 },
      'hasir': { max_daily_adet: 2000 },
      'civi': { max_daily_kg: 8000 }
    };
    return limits[productType] || {};
  };

  // Render Horizontal Timeline
  const renderHorizontalTimeline = (order: UnifiedOrder) => {
    const flow = PRODUCTION_FLOWS[order.productType] || [];
    const currentIndex = Math.floor(flow.length * (order.progress / 100));
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Üretim Süreci - {order.product}</h4>
          <div className="flex items-center space-x-2">
            <Badge className={getPriorityColor(order.priority)}>{order.priority.toUpperCase()}</Badge>
            {order.orToolsOptimized && (
              <Badge className="bg-purple-100 text-purple-800">OR-Tools ile Optimize Edildi</Badge>
            )}
          </div>
        </div>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200"></div>
          <div 
            className="absolute top-4 left-0 h-0.5 bg-blue-500 transition-all duration-1000"
            style={{ width: `${order.progress}%` }}
          ></div>
          
          {/* Stages */}
          <div className="flex justify-between relative">
            {flow.map((stage, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isBlocked = order.status === 'blocked' && index === currentIndex;
              
              return (
                <div key={stage.id} className="flex flex-col items-center space-y-2 bg-white px-2 py-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                    isCompleted ? 'bg-green-500 text-white border-green-500' :
                    isCurrent ? (isBlocked ? 'bg-red-500 text-white border-red-500' : 'bg-blue-500 text-white border-blue-500') :
                    'bg-gray-100 text-gray-600 border-gray-300'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div className="text-xs text-center max-w-[100px]">
                    <div className="font-medium">{stage.displayName}</div>
                    {isCurrent && (
                      <div className={`mt-1 ${isBlocked ? 'text-red-600' : 'text-blue-600'}`}>
                        {isBlocked ? 'Engelli' : 'Aktif'}
                      </div>
                    )}
                    {isCompleted && (
                      <div className="text-green-600 mt-1">Tamamlandı</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <div className="flex justify-between items-center">
            <span>İlerleme: {order.progress}%</span>
            <span>Tahmini Bitiş: {new Date(order.estimatedCompletion).toLocaleDateString('tr-TR')}</span>
          </div>
          <Progress value={order.progress} className="mt-2" />
        </div>
      </div>
    );
  };

  // Render Machine Visual for Production Lines
  const renderMachineGrid = (lineId: string) => {
    const lineMachines = machines.filter(m => m.line === lineId);
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {lineMachines.map((machine) => (
          <Card 
            key={machine.id}
            className="cursor-pointer hover:shadow-lg transition-all border-2"
            onClick={() => setSelectedMachine(machine)}
            style={{
              borderColor: 
                machine.status === 'running' ? '#10b981' :
                machine.status === 'idle' ? '#f59e0b' :
                machine.status === 'maintenance' ? '#3b82f6' :
                machine.status === 'setup' ? '#8b5cf6' :
                '#ef4444'
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">{machine.code}</span>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(machine.status)}`} />
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-gray-600">{machine.name}</div>
                {machine.currentProduct && (
                  <div className="text-blue-600 font-medium truncate">{machine.currentProduct}</div>
                )}
                <div className="flex justify-between">
                  <span>Verimlilik:</span>
                  <span className={`font-medium ${machine.efficiency > 80 ? 'text-green-600' : machine.efficiency > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {machine.efficiency}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Operatör:</span>
                  <span>{machine.operatorCount}</span>
                </div>
                <div className="pt-1 border-t flex items-center justify-center">
                  <MousePointer2 className="w-3 h-3 mr-1" />
                  <span className="text-gray-500">Detay için tıkla</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Enhanced Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center">
                <Zap className="w-10 h-10 mr-3 text-blue-600" />
                APS - İleri Planlama & Çizelgeleme
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                OR-Tools destekli akıllı üretim optimizasyonu | Filmaşin → Sevkıyat tam takip
              </p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <Activity className="w-4 h-4 mr-1" />
                <span>Gerçek Zamanlı Üretim Takibi</span>
                <span className="mx-2">•</span>
                <GitBranch className="w-4 h-4 mr-1" />
                <span>Yatay Süreç Akışı</span>
                <span className="mx-2">•</span>
                <Database className="w-4 h-4 mr-1" />
                <span>Birleşik Makine & Sipariş Görünümleri</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setShowUploadDialog(true)} variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Excel Yükle
              </Button>
              <Button onClick={() => setShowNewOrderDialog(true)} variant="default" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Sipariş
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isOptimizing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isOptimizing ? 'animate-spin' : ''}`} />
                {isOptimizing ? 'Optimizasyon Devam Ediyor...' : 'OR-Tools Optimize Et'}
              </Button>
            </div>
          </div>
          
          {/* Enhanced Filters */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Sipariş, ürün, müşteri ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Zaman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Bugün</SelectItem>
                <SelectItem value="week">Bu Hafta</SelectItem>
                <SelectItem value="month">Bu Ay</SelectItem>
                <SelectItem value="quarter">3 Ay</SelectItem>
                <SelectItem value="year">Yıl</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Üretim Hattı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Hatlar</SelectItem>
                <SelectItem value="tel_cekme">Tel Çekme</SelectItem>
                <SelectItem value="galvaniz">Galvaniz</SelectItem>
                <SelectItem value="panel">Panel Çit</SelectItem>
                <SelectItem value="hasir">Çelik Hasır</SelectItem>
                <SelectItem value="civi">Çivi</SelectItem>
                <SelectItem value="tavli">Tavlı Tel</SelectItem>
                <SelectItem value="profil">Profil</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              İleri Filtre
            </Button>
          </div>
        </div>

        {/* Stock Cards moved to separate screen - show only when activeView is 'stoklar' */}

        {/* Main Tabs System - Reorganized */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-10 gap-1">
            <TabsTrigger value="overview" className="flex items-center space-x-1">
              <BarChart3 className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Genel Bakış</span>
            </TabsTrigger>
            <TabsTrigger value="stoklar" className="flex items-center space-x-1">
              <Package className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Stoklar</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center space-x-1">
              <ShoppingCart className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Siparişler</span>
            </TabsTrigger>
            <TabsTrigger value="tel_cekme" className="flex items-center space-x-1">
              <Settings className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Tel Çekme</span>
            </TabsTrigger>
            <TabsTrigger value="galvaniz" className="flex items-center space-x-1">
              <Layers className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Galvaniz</span>
            </TabsTrigger>
            <TabsTrigger value="tavli" className="flex items-center space-x-1">
              <Flame className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Tavlı Tel</span>
            </TabsTrigger>
            <TabsTrigger value="civi" className="flex items-center space-x-1">
              <Wrench className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Çivi</span>
            </TabsTrigger>
            <TabsTrigger value="hasir" className="flex items-center space-x-1">
              <Activity className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Çelik Hasır</span>
            </TabsTrigger>
            <TabsTrigger value="panel" className="flex items-center space-x-1">
              <Gauge className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Panel Çit</span>
            </TabsTrigger>
            <TabsTrigger value="lines" className="flex items-center space-x-1">
              <GitBranch className="w-3 h-3" />
              <span className="hidden xl:inline text-xs">Profil/Palet</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Aktif Siparişler</p>
                      <p className="text-3xl font-bold text-blue-900">{orders.filter(o => o.status === 'in_progress').length}</p>
                      <p className="text-xs text-blue-600 mt-1">+{Math.floor(Math.random() * 5) + 2} bu hafta</p>
                    </div>
                    <Target className="w-10 h-10 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Çalışan Makineler</p>
                      <p className="text-3xl font-bold text-green-900">{machines.filter(m => m.status === 'running').length}</p>
                      <p className="text-xs text-green-600 mt-1">/ {machines.length} toplam</p>
                    </div>
                    <Factory className="w-10 h-10 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">Ortalama Verimlilik</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {Math.round(machines.filter(m => m.efficiency > 0).reduce((acc, m) => acc + m.efficiency, 0) / machines.filter(m => m.efficiency > 0).length)}%
                      </p>
                      <p className="text-xs text-orange-600 mt-1">+{Math.floor(Math.random() * 5) + 1}% bu hafta</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">OR-Tools Tasarrufu</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {orders.filter(o => o.orToolsOptimized).reduce((acc, o) => acc + (o.costSaving || 0), 0).toLocaleString()}₺
                      </p>
                      <p className="text-xs text-purple-600 mt-1">bu ay</p>
                    </div>
                    <Zap className="w-10 h-10 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Production Line Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Factory className="w-5 h-5 mr-2" />
                  Üretim Hatları Durumu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productionLines.map((line) => (
                    <Card key={line.id} className="bg-gray-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{line.name}</h4>
                          <Badge className="bg-blue-100 text-blue-800">{line.code}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Günlük Kapasite:</span>
                            <span className="font-medium">{line.dailyCapacity.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kullanım Oranı:</span>
                            <span className={`font-medium ${line.currentUtilization > 80 ? 'text-green-600' : line.currentUtilization > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {line.currentUtilization}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Aktif Sipariş:</span>
                            <span className="font-medium">{line.activeOrders}</span>
                          </div>
                          <Progress value={line.currentUtilization} className="mt-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Üretim Hatları Kapasite Durumu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Gauge className="w-5 h-5 mr-2" />
                    Üretim Hatları Kapasite ve Verimlilik
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    6 ana hat
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Tel Çekme */}
                  <div 
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-b from-blue-50 to-white"
                    onClick={() => {
                      setSelectedLineForDetail('tel_cekme');
                      setShowLineDetailModal(true);
                    }}
                  >
                    <div className="text-center">
                      <h4 className="font-semibold text-sm mb-2">Tel Çekme</h4>
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="transform -rotate-90 w-20 h-20">
                          <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                          <circle 
                            cx="40" cy="40" r="36" 
                            stroke="#3b82f6" 
                            strokeWidth="8" 
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 36}`}
                            strokeDashoffset={`${2 * Math.PI * 36 * (1 - 0.72)}`}
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">72%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">9 makine aktif</p>
                    </div>
                  </div>

                  {/* Galvaniz */}
                  <div 
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-b from-green-50 to-white"
                    onClick={() => {
                      setSelectedLineForDetail('galvaniz');
                      setShowLineDetailModal(true);
                    }}
                  >
                    <div className="text-center">
                      <h4 className="font-semibold text-sm mb-2">Galvaniz</h4>
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="transform -rotate-90 w-20 h-20">
                          <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                          <circle 
                            cx="40" cy="40" r="36" 
                            stroke="#10b981" 
                            strokeWidth="8" 
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 36}`}
                            strokeDashoffset={`${2 * Math.PI * 36 * (1 - 0.84)}`}
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">84%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">36 kafa</p>
                    </div>
                  </div>

                  {/* Tavlı Tel */}
                  <div 
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-b from-orange-50 to-white"
                    onClick={() => {
                      setSelectedLineForDetail('tavli_tel');
                      setShowLineDetailModal(true);
                    }}
                  >
                    <div className="text-center">
                      <h4 className="font-semibold text-sm mb-2">Tavlı Tel</h4>
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="transform -rotate-90 w-20 h-20">
                          <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                          <circle 
                            cx="40" cy="40" r="36" 
                            stroke="#f97316" 
                            strokeWidth="8" 
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 36}`}
                            strokeDashoffset={`${2 * Math.PI * 36 * (1 - 0.91)}`}
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">91%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Fırın + Yağlama</p>
                    </div>
                  </div>

                  {/* Çivi */}
                  <div 
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-b from-red-50 to-white"
                    onClick={() => {
                      setSelectedLineForDetail('civi');
                      setShowLineDetailModal(true);
                    }}
                  >
                    <div className="text-center">
                      <h4 className="font-semibold text-sm mb-2">Çivi</h4>
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="transform -rotate-90 w-20 h-20">
                          <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                          <circle 
                            cx="40" cy="40" r="36" 
                            stroke="#ef4444" 
                            strokeWidth="8" 
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 36}`}
                            strokeDashoffset={`${2 * Math.PI * 36 * (1 - 0.56)}`}
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">56%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">9 makine</p>
                    </div>
                  </div>

                  {/* Çelik Hasır */}
                  <div 
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-b from-purple-50 to-white"
                    onClick={() => {
                      setSelectedLineForDetail('celik_hasir');
                      setShowLineDetailModal(true);
                    }}
                  >
                    <div className="text-center">
                      <h4 className="font-semibold text-sm mb-2">Çelik Hasır</h4>
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="transform -rotate-90 w-20 h-20">
                          <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                          <circle 
                            cx="40" cy="40" r="36" 
                            stroke="#a855f7" 
                            strokeWidth="8" 
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 36}`}
                            strokeDashoffset={`${2 * Math.PI * 36 * (1 - 0.75)}`}
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">75%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">2 makine</p>
                    </div>
                  </div>

                  {/* Panel Çit */}
                  <div 
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-b from-indigo-50 to-white"
                    onClick={() => {
                      setSelectedLineForDetail('panel_cit');
                      setShowLineDetailModal(true);
                    }}
                  >
                    <div className="text-center">
                      <h4 className="font-semibold text-sm mb-2">Panel Çit</h4>
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="transform -rotate-90 w-20 h-20">
                          <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                          <circle 
                            cx="40" cy="40" r="36" 
                            stroke="#6366f1" 
                            strokeWidth="8" 
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 36}`}
                            strokeDashoffset={`${2 * Math.PI * 36 * (1 - 0.68)}`}
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">68%</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">Kesme + Kaynak</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stoklar Tab */}
          <TabsContent value="stoklar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Stok Yönetimi
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {stock.length} ürün
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {stock.map((item) => (
                    <Card 
                      key={item.stokKodu} 
                      className="hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                      onClick={() => setSelectedStock(item)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant={item.stokMiktari > item.kritikStok ? "default" : "destructive"}>
                            {item.stokKodu}
                          </Badge>
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                        <CardTitle className="text-sm mt-2">{item.stokAdi}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Toplam Stok:</span>
                            <span className="font-bold">{item.stokMiktari.toLocaleString()} {item.birim}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Siparişe Bağlı:</span>
                            <span className="font-medium text-blue-600">{item.sipariseBagliStok.toLocaleString()} {item.birim}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Serbest:</span>
                            <span className="font-medium text-green-600">{item.serbestStok.toLocaleString()} {item.birim}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Kritik Stok:</span>
                            <span className="text-xs font-medium">{item.kritikStok.toLocaleString()} {item.birim}</span>
                          </div>
                          {item.stokMiktari <= item.kritikStok && (
                            <div className="mt-2 p-2 bg-red-50 rounded-md">
                              <p className="text-xs text-red-700 font-medium flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Kritik seviyede!
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Doluluk</span>
                            <span>{Math.round((item.stokMiktari / (item.stokMiktari + item.kritikStok * 2)) * 100)}%</span>
                          </div>
                          <Progress 
                            value={Math.round((item.stokMiktari / (item.stokMiktari + item.kritikStok * 2)) * 100)} 
                            className="h-2"
                          />
                        </div>

                        {item.rezervedFor && item.rezervedFor.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-gray-500">Rezerve:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.rezervedFor.slice(0, 2).map((order) => (
                                <Badge key={order} variant="secondary" className="text-xs">
                                  {order}
                                </Badge>
                              ))}
                              {item.rezervedFor.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{item.rezervedFor.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order View Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Sipariş Yönetimi ve Planlama
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{orders.length} toplam sipariş</Badge>
                    <Button size="sm" onClick={() => setShowNewOrderDialog(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Yeni Sipariş
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Order Filters */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Filtreler:</span>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="min-w-[150px]">
                      <Select defaultValue="all">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Durum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Durumlar</SelectItem>
                          <SelectItem value="pending">Beklemede</SelectItem>
                          <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                          <SelectItem value="completed">Tamamlandı</SelectItem>
                          <SelectItem value="blocked">Engellendi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Product Type Filter */}
                    <div className="min-w-[150px]">
                      <Select defaultValue="all">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Ürün Tipi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Ürünler</SelectItem>
                          <SelectItem value="galvaniz">Galvanizli Tel</SelectItem>
                          <SelectItem value="panel">Panel Çit</SelectItem>
                          <SelectItem value="hasir">Çelik Hasır</SelectItem>
                          <SelectItem value="civi">Çivi</SelectItem>
                          <SelectItem value="tavli">Tavlı Tel</SelectItem>
                          <SelectItem value="profil">Profil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority Filter */}
                    <div className="min-w-[120px]">
                      <Select defaultValue="all">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Öncelik" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Öncelikler</SelectItem>
                          <SelectItem value="urgent">Acil</SelectItem>
                          <SelectItem value="high">Yüksek</SelectItem>
                          <SelectItem value="medium">Orta</SelectItem>
                          <SelectItem value="low">Düşük</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="min-w-[130px]">
                      <Select defaultValue="all">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Zaman Aralığı" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Zamanlar</SelectItem>
                          <SelectItem value="today">Bugün</SelectItem>
                          <SelectItem value="week">Bu Hafta</SelectItem>
                          <SelectItem value="month">Bu Ay</SelectItem>
                          <SelectItem value="overdue">Geciken</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* OR-Tools Filter */}
                    <div className="min-w-[120px]">
                      <Select defaultValue="all">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="OR-Tools" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Hepsi</SelectItem>
                          <SelectItem value="optimized">Optimize Edildi</SelectItem>
                          <SelectItem value="not_optimized">Optimize Edilmedi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Sipariş no, müşteri adı veya ürün ara..."
                        className="pl-10 h-8 text-xs"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="h-8 px-3">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Temizle
                    </Button>
                  </div>

                  {/* Active Filters Display */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs text-gray-500">Aktif Filtreler:</span>
                    <Badge variant="secondary" className="text-xs">
                      Tüm Durumlar
                      <XCircle className="w-3 h-3 ml-1 cursor-pointer" />
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Tüm Ürünler
                      <XCircle className="w-3 h-3 ml-1 cursor-pointer" />
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  {orders.map((order, index) => (
                    <div
                      key={order.id}
                      className="p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow cursor-move"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", order.id);
                        e.currentTarget.classList.add('opacity-50');
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('opacity-50');
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Move className="w-4 h-4 text-gray-400" />
                          <span className="font-bold">{order.orderNumber}</span>
                          <Badge className={getPriorityColor(order.priority)}>{order.priority}</Badge>
                          <Badge variant="outline">{order.productType.toUpperCase()}</Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!order.orToolsOptimized && (
                            <Button 
                              size="sm" 
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => optimizeWithORTools(order)}
                              disabled={isOptimizing}
                            >
                              <Zap className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Ürün:</span>
                          <p className="font-medium">{order.product}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Müşteri:</span>
                          <p className="font-medium">{order.customer}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Miktar:</span>
                          <p className="font-medium">{order.quantity.toLocaleString()} {order.unit}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Teslim:</span>
                          <p className="font-medium">{new Date(order.dueDate).toLocaleDateString('tr-TR')}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Durum: {order.currentStage}</span>
                          <span className="font-medium">{order.progress}% tamamlandı</span>
                        </div>
                        <Progress value={order.progress} className="mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Machine View Tab */}
          <TabsContent value="machines" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Factory className="w-5 h-5 mr-2" />
                    Makine Durumu ve Atamalar
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {machines.filter(m => m.status === 'running').length}/{machines.length} çalışıyor
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Machine Type Filters */}
                <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
                  {['all', 'tel_cekme', 'galvaniz', 'panel', 'hasir', 'civi', 'tavli', 'profil'].map(type => (
                    <Button 
                      key={type}
                      variant={selectedLine === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedLine(type)}
                      className="whitespace-nowrap"
                    >
                      {type === 'all' ? 'Tümü' :
                       type === 'tel_cekme' ? 'Tel Çekme' :
                       type === 'galvaniz' ? 'Galvaniz' :
                       type === 'panel' ? 'Panel Çit' :
                       type === 'hasir' ? 'Çelik Hasır' : 
                       type === 'civi' ? 'Çivi' :
                       type === 'tavli' ? 'Tavlı Tel' : 'Profil'}
                    </Button>
                  ))}
                </div>

                {/* Machines Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {machines.filter(m => selectedLine === 'all' || m.line === selectedLine).map((machine) => (
                    <Card 
                      key={machine.id}
                      className="cursor-pointer hover:shadow-lg transition-all border-2"
                      onClick={() => setSelectedMachine(machine)}
                      style={{
                        borderColor: 
                          machine.status === 'running' ? '#10b981' :
                          machine.status === 'idle' ? '#f59e0b' :
                          machine.status === 'maintenance' ? '#3b82f6' :
                          machine.status === 'setup' ? '#8b5cf6' :
                          '#ef4444'
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold">{machine.code}</h3>
                          <div className={`w-4 h-4 rounded-full ${getStatusColor(machine.status)}`} />
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{machine.name}</p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Hat:</span>
                            <span className="font-medium capitalize">{machine.line.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Verimlilik:</span>
                            <span className={`font-medium ${machine.efficiency > 80 ? 'text-green-600' : machine.efficiency > 60 ? 'text-yellow-600' : machine.efficiency > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {machine.efficiency}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Kapasite:</span>
                            <span className="font-medium">{machine.capacity}/saat</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Operatör:</span>
                            <span className="font-medium">{machine.operatorCount} kişi</span>
                          </div>
                        </div>
                        
                        {machine.currentProduct && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-blue-600 font-medium">{machine.currentProduct}</p>
                          </div>
                        )}
                        
                        
                        <div className="mt-3 pt-3 border-t flex items-center justify-center text-xs text-gray-500">
                          <MousePointer2 className="w-3 h-3 mr-1" />
                          Detay için tıklayın
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Individual Production Line Tabs */}
          <TabsContent value="tel_cekme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tel Çekme Hattı - 9 Makine + Araçap</CardTitle>
                <p className="text-gray-600">4 operatör ile 10 makine yönetimi | Kapasite: Çap ve ürün tipine bağlı</p>
              </CardHeader>
              <CardContent>
                {renderMachineGrid('tel_cekme')}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Tel Çekme İş Sırası</h4>
                  <div className="space-y-2">
                    {orders.filter(o => o.productType === 'galvaniz' || o.productType === 'civi' || o.productType === 'tavli').map((order) => (
                      <div key={order.id} className="p-3 border rounded-lg flex items-center justify-between">
                        <div>
                          <span className="font-medium">{order.orderNumber}</span>
                          <p className="text-sm text-gray-600">{order.product}</p>
                        </div>
                        <div className="text-right">
                          <Badge>{order.specs.cap || '2.0'}mm</Badge>
                          <p className="text-sm text-gray-600">{order.quantity} {order.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="galvaniz" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Galvaniz Hattı - 36 Kafa Sistemi</CardTitle>
                <p className="text-gray-600">27 operatör, 3 vardiya | 128.5 ton/gün kapasitesi</p>
              </CardHeader>
              <CardContent>
                {renderMachineGrid('galvaniz')}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Galvaniz Üretim Sırası</h4>
                    <div className="space-y-2">
                      {orders.filter(o => o.productType === 'galvaniz').map((order) => (
                        <div key={order.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{order.orderNumber}</span>
                            <Badge className={order.specs.kaplama === 'NIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                              {order.specs.kaplama || 'NIT'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{order.product}</p>
                          <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>Çap: {order.specs.cap}mm</span>
                            <span>{order.quantity} kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Setup Durumu</h4>
                    <div className="space-y-2">
                      <div className="p-3 border rounded-lg bg-yellow-50">
                        <p className="font-medium">NIT → PAD Geçiş</p>
                        <p className="text-sm text-gray-600">Tahmini süre: 20 dakika</p>
                      </div>
                      <div className="p-3 border rounded-lg bg-orange-50">
                        <p className="font-medium">PAD → NIT Geçiş</p>
                        <p className="text-sm text-gray-600">Tahmini süre: 90 dakika</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tavlı Tel Tab */}
          <TabsContent value="tavli" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tavlı Tel Hattı</CardTitle>
                <p className="text-gray-600">3 operatör | Fırın + Yağlama sistemleri</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Fırın Alt Sistemi */}
                  <Card className="border-2">
                    <CardHeader className="bg-orange-50">
                      <CardTitle className="text-lg flex items-center">
                        <Flame className="w-5 h-5 mr-2 text-orange-600" />
                        Fırın Alt Sistemi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Durum:</span>
                          <Badge className="bg-green-100 text-green-800">Aktif - Eski Fırın</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kapasite:</span>
                          <span className="font-medium">Ürün tipine bağlı</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Operatör:</span>
                          <span className="font-medium">2 kişi</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sıcaklık:</span>
                          <span className="font-medium text-orange-600">850°C</span>
                        </div>
                        <Progress value={91} className="mt-3" />
                        <p className="text-xs text-gray-500 text-center">Verimlilik: 91%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Yağlama Makinesi */}
                  <Card className="border-2">
                    <CardHeader className="bg-blue-50">
                      <CardTitle className="text-lg">Yağlama Makinesi</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ürün:</span>
                          <Badge variant="outline">Balya Teli</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kapasite:</span>
                          <span className="font-medium">Veri gerekli</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Operatör:</span>
                          <span className="font-medium">1 kişi</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Yağ Tipi:</span>
                          <span className="font-medium">Endüstriyel</span>
                        </div>
                        <Progress value={88} className="mt-3" />
                        <p className="text-xs text-gray-500 text-center">Verimlilik: 88%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Üretim Özeti */}
                <Card className="mt-6 bg-gradient-to-r from-orange-50 to-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Günlük Üretim Özeti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-orange-600">12.5</p>
                        <p className="text-sm text-gray-600">Ton/Gün</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">3</p>
                        <p className="text-sm text-gray-600">Aktif Sipariş</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">91%</p>
                        <p className="text-sm text-gray-600">Hat Verimi</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Çivi Tab */}
          <TabsContent value="civi" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Çivi Üretim Hattı</CardTitle>
                <p className="text-gray-600">9 makine | 2 Jingu + 7 Enkotek</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Jingu Makineleri */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Badge className="mr-2">Jingu</Badge>
                      2 Makine
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2].map((id) => (
                        <Card key={id} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Jingu #{id}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Durum:</span>
                                <Badge className={id === 1 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                                  {id === 1 ? "Çalışıyor" : "Bakımda"}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Kapasite:</span>
                                <span className="font-medium">Çapa bağlı</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Üretim:</span>
                                <span className="font-medium">{id === 1 ? "2.5mm çivi" : "-"}</span>
                              </div>
                              <Progress value={id === 1 ? 65 : 0} className="mt-2" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Enkotek Makineleri */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Badge className="mr-2" variant="outline">Enkotek</Badge>
                      7 Makine
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7].map((id) => {
                        const isRunning = id <= 5;
                        return (
                          <Card key={id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2 pt-3">
                              <CardTitle className="text-xs">Enkotek #{id}</CardTitle>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <div className="space-y-1 text-xs">
                                <Badge 
                                  variant={isRunning ? "default" : "secondary"}
                                  className="w-full justify-center"
                                >
                                  {isRunning ? "Aktif" : "Boşta"}
                                </Badge>
                                <div className="text-center text-gray-600 mt-1">
                                  {isRunning ? `${(Math.random() * 3 + 2).toFixed(1)}mm` : "-"}
                                </div>
                                <Progress value={isRunning ? Math.floor(Math.random() * 40) + 40 : 0} className="h-1" />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Özet Bilgiler */}
                  <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">9</p>
                          <p className="text-xs text-gray-600">Toplam Makine</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">6</p>
                          <p className="text-xs text-gray-600">Aktif</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">56%</p>
                          <p className="text-xs text-gray-600">Verimlilik</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-orange-600">4.2</p>
                          <p className="text-xs text-gray-600">Ton/Gün</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="panel" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Panel Çit Hattı</CardTitle>
                <p className="text-gray-600">40-60 panel/saat | Kapasite: Ürün tipine bağlı</p>
              </CardHeader>
              <CardContent>
                {renderMachineGrid('panel')}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Panel Üretim Sırası</h4>
                  <div className="space-y-2">
                    {orders.filter(o => o.productType === 'panel').map((order) => (
                      <div key={order.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{order.orderNumber}</span>
                          <div className="flex space-x-2">
                            <Badge>{order.specs.panel_type || '2D'}</Badge>
                            <Badge variant="outline">{order.specs.renk || 'RAL6005'}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{order.product}</p>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>Boy: {order.specs.boy}mm</span>
                          <span>En: {order.specs.en}mm</span>
                          <span>{order.quantity} adet</span>
                        </div>
                        {order.orToolsOptimized && (
                          <div className="mt-2 text-xs text-purple-600">
                            ✓ OR-Tools ile Optimize Edildi - Ayar Süresi {order.setupReduction}dk azaldı
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hasir" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Çelik Hasır Hattı</CardTitle>
                <p className="text-gray-600">15 operatör | Yarı oto + tam oto kaynak makineleri</p>
              </CardHeader>
              <CardContent>
                {renderMachineGrid('hasir')}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Hasır Üretim Sırası</h4>
                  <div className="space-y-2">
                    {orders.filter(o => o.productType === 'hasir').map((order) => (
                      <div key={order.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{order.orderNumber}</span>
                          <Badge>{order.specs.genislik}mm</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{order.product}</p>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>Genişlik: {order.specs.genislik}mm</span>
                          <span>Uzunluk: {order.specs.uzunluk}mm</span>
                          <span>{order.quantity} adet</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lines" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profil ve Palet Üretim Hatları</CardTitle>
                <p className="text-gray-600">Özel üretim hatları | Düşük hacimli, yüksek değerli ürünler</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Profil Hattı */}
                  <Card className="border-2">
                    <CardHeader className="bg-indigo-50">
                      <CardTitle className="text-lg">Profil Üretim Hattı</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Kapasite:</span>
                          <span className="font-medium">300-450 adet/vardiya</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Operatör:</span>
                          <span className="font-medium">2 kişi</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Durum:</span>
                          <Badge className="bg-yellow-100 text-yellow-800">Ayar Kaçması</Badge>
                        </div>
                        <Progress value={35} className="mt-3" />
                        <p className="text-xs text-gray-500 text-center">Verimlilik: 35%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Palet Hattı */}
                  <Card className="border-2">
                    <CardHeader className="bg-green-50">
                      <CardTitle className="text-lg">Palet Üretim Hattı</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Kapasite:</span>
                          <span className="font-medium">150-200 palet/gün</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Operatör:</span>
                          <span className="font-medium">3 kişi</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Durum:</span>
                          <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                        </div>
                        <Progress value={65} className="mt-3" />
                        <p className="text-xs text-gray-500 text-center">Verimlilik: 65%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals and Dialogs */}
        
        {/* Order Detail Modal */}
        {selectedOrder && (
          <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Sipariş Detayı: {selectedOrder.orderNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Genel Bilgiler</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Ürün:</span>
                          <p className="font-medium">{selectedOrder.product}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Müşteri:</span>
                          <p className="font-medium">{selectedOrder.customer}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Miktar:</span>
                          <p className="font-medium">{selectedOrder.quantity.toLocaleString()} {selectedOrder.unit}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Teslim:</span>
                          <p className="font-medium">{new Date(selectedOrder.dueDate).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Öncelik:</span>
                          <Badge className={getPriorityColor(selectedOrder.priority)}>
                            {selectedOrder.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-500">Durum:</span>
                          <Badge>{selectedOrder.status.toUpperCase()}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Product Specifications */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ürün Özellikleri</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(selectedOrder.specs).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* OR-Tools Results */}
                  {selectedOrder.orToolsOptimized && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                          <Zap className="w-5 h-5 mr-2 text-purple-600" />
                          OR-Tools Optimizasyon Sonuçları
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Maliyet Tasarrufu:</span>
                            <span className="font-bold text-green-600">+{selectedOrder.costSaving?.toLocaleString()}₺</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ayar Süresi Azalması:</span>
                            <span className="font-bold text-purple-600">-{selectedOrder.setupReduction}dk</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Atanan Makineler:</span>
                            <span className="font-medium">{selectedOrder.assignedMachines.join(', ')}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Üretim İlerlemesi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress value={selectedOrder.progress} className="mb-4" />
                      <p className="text-sm text-gray-600 mb-4">
                        {selectedOrder.progress}% tamamlandı
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Horizontal Süreç Takibi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderHorizontalTimeline(selectedOrder)}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Machine Detail Modal */}
        {selectedMachine && (
          <Dialog open={!!selectedMachine} onOpenChange={() => setSelectedMachine(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedMachine.name} ({selectedMachine.code})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-600">Durum</p>
                      <div className="flex items-center justify-center mt-2">
                        <div className={`w-4 h-4 rounded-full mr-2 ${getStatusColor(selectedMachine.status)}`} />
                        <span className="font-medium capitalize">{selectedMachine.status}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-600">Verimlilik</p>
                      <p className="text-2xl font-bold mt-2">{selectedMachine.efficiency}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-600">Kapasite</p>
                      <p className="text-2xl font-bold mt-2">{selectedMachine.capacity}/h</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-600">Operatör</p>
                      <p className="text-2xl font-bold mt-2">{selectedMachine.operatorCount}</p>
                    </CardContent>
                  </Card>
                </div>
                
                {selectedMachine.currentProduct && (
                  <Card>
                    <CardContent className="p-4 bg-blue-50">
                      <h4 className="font-medium text-blue-900 mb-2">Mevcut Üretim</h4>
                      <p className="text-blue-700">{selectedMachine.currentProduct}</p>
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle>Üretim Kuyruğu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedMachine.queue.length > 0 ? (
                      <div className="space-y-2">
                        {selectedMachine.queue.map((order, index) => (
                          <div key={order.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{index + 1}. {order.orderNumber}</span>
                              <Badge className={getPriorityColor(order.priority)}>
                                {order.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{order.product}</p>
                            <p className="text-sm text-gray-500">{order.quantity} {order.unit}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">Kuyrukta sipariş yok</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Stock Detail Modal */}
        {selectedStock && (
          <Dialog open={!!selectedStock} onOpenChange={() => setSelectedStock(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Stok Detayı: {selectedStock.stokAdi}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Stok Kodu</Label>
                    <p className="font-mono text-sm">{selectedStock.stokKodu}</p>
                  </div>
                  <div>
                    <Label>Lokasyon</Label>
                    <p className="font-medium">{selectedStock.lokasyon}</p>
                  </div>
                  <div>
                    <Label>Toplam Miktar</Label>
                    <p className="text-lg font-bold">{selectedStock.miktar.toLocaleString()} {selectedStock.birim}</p>
                  </div>
                  <div>
                    <Label>Siparişe Bağlı</Label>
                    <p className="text-lg font-bold text-orange-600">{selectedStock.sipariseBagliStok.toLocaleString()} {selectedStock.birim}</p>
                  </div>
                  <div>
                    <Label>Serbest Stok</Label>
                    <p className="text-lg font-bold text-green-600">{selectedStock.serbestStok.toLocaleString()} {selectedStock.birim}</p>
                  </div>
                  <div>
                    <Label>Minimum Stok</Label>
                    <p className="text-lg font-medium">{selectedStock.minimumStok.toLocaleString()} {selectedStock.birim}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label>Stok Durumu</Label>
                  <div className="flex items-center mt-2">
                    <div className={`w-4 h-4 rounded-full mr-2 ${getStockStatusColor(selectedStock.status)}`} />
                    <span className="font-medium capitalize">
                      {selectedStock.status === 'critical' ? 'Kritik' : selectedStock.status === 'low' ? 'Düşük' : 'Normal'}
                    </span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* New Order Modal */}
        {showNewOrderDialog && (
          <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-blue-600" />
                  Yeni Sipariş - OR-Tools Akıllı Atama
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">Akıllı Planlama Sistemi Aktif</span>
                  </div>
                  <p className="text-sm text-purple-700 mt-2">
                    Sipariş özelliklerinizi girin, OR-Tools algoritması en optimal makine atamasını, 
                    ayar süresi minimizasyonunu ve filmaşin→sevkıyat tam zaman çizelgesini otomatik hesaplayacak.
                  </p>
                </div>
                
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer">Müşteri *</Label>
                      <Input id="customer" placeholder="Müşteri adı" required />
                    </div>
                    <div>
                      <Label htmlFor="product-type">Ürün Tipi *</Label>
                      <Select required>
                        <SelectTrigger>
                          <SelectValue placeholder="Ürün tipi seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="galvaniz">Galvanizli Tel</SelectItem>
                          <SelectItem value="panel">Panel Çit</SelectItem>
                          <SelectItem value="hasir">Çelik Hasır</SelectItem>
                          <SelectItem value="civi">Çivi</SelectItem>
                          <SelectItem value="tavli">Tavlı Tel</SelectItem>
                          <SelectItem value="profil">Profil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantity">Miktar *</Label>
                      <Input id="quantity" type="number" placeholder="0" min="1" required />
                    </div>
                    <div>
                      <Label htmlFor="unit">Birim</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Birim" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="adet">adet</SelectItem>
                          <SelectItem value="ton">ton</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority">Öncelik</Label>
                      <Select defaultValue="medium">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Acil</SelectItem>
                          <SelectItem value="high">Yüksek</SelectItem>
                          <SelectItem value="medium">Orta</SelectItem>
                          <SelectItem value="low">Düşük</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="due_date">Teslim Tarihi *</Label>
                      <Input 
                        id="due_date" 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        required 
                      />
                    </div>
                  </div>

                  {/* Product-specific attributes would be shown here based on selection */}
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Ürün Özel Özellikleri</h4>
                    
                    {/* Galvanizli Tel Specific */}
                    <div className="space-y-3" id="galvaniz-fields" style={{display: 'none'}}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="cap">Çap (mm) *</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Çap seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1.25">1.25mm</SelectItem>
                              <SelectItem value="1.4">1.4mm</SelectItem>
                              <SelectItem value="1.6">1.6mm</SelectItem>
                              <SelectItem value="2.0">2.0mm</SelectItem>
                              <SelectItem value="2.5">2.5mm</SelectItem>
                              <SelectItem value="3.0">3.0mm</SelectItem>
                              <SelectItem value="4.0">4.0mm</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="kaplama">Kaplama Türü</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Kaplama" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NIT">NIT</SelectItem>
                              <SelectItem value="PAD">PAD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="kaplama_miktari">Kaplama Miktarı (gr/m²)</Label>
                          <Input type="number" placeholder="245" />
                        </div>
                      </div>
                    </div>

                    {/* Panel Çit Specific */}
                    <div className="space-y-3" id="panel-fields" style={{display: 'none'}}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="en">En (mm) *</Label>
                          <Input type="number" placeholder="2030" />
                        </div>
                        <div>
                          <Label htmlFor="yukseklik">Yükseklik (mm) *</Label>
                          <Input type="number" placeholder="2500" />
                        </div>
                        <div>
                          <Label htmlFor="tel_cap">Tel Çapı (mm)</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Çap" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4.0">4.0mm</SelectItem>
                              <SelectItem value="5.0">5.0mm</SelectItem>
                              <SelectItem value="6.0">6.0mm</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Çivi Specific */}
                    <div className="space-y-3" id="civi-fields" style={{display: 'none'}}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="civi_cap">Çap (mm) *</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Çap seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2.0">2.0mm</SelectItem>
                              <SelectItem value="2.5">2.5mm</SelectItem>
                              <SelectItem value="3.0">3.0mm</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="civi_uzunluk">Uzunluk (mm)</Label>
                          <Input type="number" placeholder="50" />
                        </div>
                        <div>
                          <Label htmlFor="civi_tip">Çivi Tipi</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Tip seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="duz">Düz Başlı</SelectItem>
                              <SelectItem value="spiral">Spiral</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Default message when no product selected */}
                    <div id="no-product-selected" className="text-center py-4">
                      <p className="text-gray-500 text-sm">
                        Ürün tipi seçtikten sonra özel özellikler burada görünecek
                      </p>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      OR-Tools Optimizasyon Hedefleri
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                        <span>Setup süresi minimizasyonu</span>
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                        <span>Kapasite optimizasyonu</span>
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                        <span>Teslim tarihi garantisi</span>
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                        <span>Operatör yükü dengeleme</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setShowNewOrderDialog(false)}>
                      İptal
                    </Button>
                    <Button type="submit" disabled={isOptimizing}>
                      {isOptimizing ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                          Optimize Ediliyor...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          OR-Tools ile Optimize Et ve Ekle
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Excel Upload Modal */}
        {showUploadDialog && (
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-green-600" />
                  Üretim Excel Dosyası Yükleme
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Excel Sheet Mapping</h4>
                  <p className="text-sm text-blue-700">
                    Sistem, üretim Excel dosyanızın hangi sheet'inde hangi verinin olduğunu otomatik tanıyacak:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
                    <li>• Stok durumları ve miktarları</li>
                    <li>• Üretim miktarları ve ilerlemeleri</li>
                    <li>• Makine durumları ve verimlilikleri</li>
                    <li>• Sipariş durumları ve teslim tarihleri</li>
                  </ul>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">Excel dosyasını buraya sürükleyip bırakın</p>
                  <p className="text-sm text-gray-600 mt-2">veya dosya seçmek için tıklayın</p>
                  <Button variant="outline" className="mt-4">
                    Dosya Seç
                  </Button>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Not:</h4>
                  <p className="text-sm text-yellow-700">
                    // TODO: Excel dosyası yükleme ve sheet mapping fonksiyonalitesi geliştirilecek.
                    Sistem Excel'deki sheet'leri otomatik tanıyacak ve verileri ilgili tablolara aktaracak.
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                    İptal
                  </Button>
                  <Button>
                    Dosyayı Yükle ve İşle
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Production Line Detail Modal */}
        {showLineDetailModal && (
          <Dialog open={showLineDetailModal} onOpenChange={setShowLineDetailModal}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedLineForDetail === 'tel_cekme' && 'Tel Çekme Hattı Detayları'}
                  {selectedLineForDetail === 'galvaniz' && 'Galvaniz Hattı Detayları'}
                  {selectedLineForDetail === 'tavli_tel' && 'Tavlı Tel Hattı Detayları'}
                  {selectedLineForDetail === 'civi' && 'Çivi Hattı Detayları'}
                  {selectedLineForDetail === 'celik_hasir' && 'Çelik Hasır Hattı Detayları'}
                  {selectedLineForDetail === 'panel_cit' && 'Panel Çit Hattı Detayları'}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-6">
                {/* Tel Çekme Details */}
                {selectedLineForDetail === 'tel_cekme' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Ana Tel Çekme Makineleri</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Makine Sayısı:</span>
                              <span className="font-medium">9 aktif + 1 yedek</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Çapa bağlı</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">4 kişi</span>
                            </div>
                            <Progress value={72} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Bobin Sarma</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Makine Sayısı:</span>
                              <span className="font-medium">2 makine</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Otomatik sarma</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">2 kişi</span>
                            </div>
                            <Progress value={85} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Toplam Hat Durumu</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Toplam Operatör:</span>
                            <p className="font-medium text-lg">7 kişi</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Vardiya:</span>
                            <p className="font-medium text-lg">3 vardiya</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Verimlilik:</span>
                            <p className="font-medium text-lg">72%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Galvaniz Details */}
                {selectedLineForDetail === 'galvaniz' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Galvanizleme Alt Sistemi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Makine Sayısı:</span>
                              <span className="font-medium">36 kafa</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Güç Dağılımı:</span>
                              <span className="font-medium">6x5KW + 30x3KW</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">5 kişi</span>
                            </div>
                            <Progress value={84} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Paketleme Alt Sistemi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Makine Sayısı:</span>
                              <span className="font-medium">1 makine</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Otomatik paketleme</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">2 kişi</span>
                            </div>
                            <Progress value={90} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Tavlı Tel Details */}
                {selectedLineForDetail === 'tavli_tel' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Fırın Alt Sistemi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Fırın:</span>
                              <span className="font-medium">Eski fırın (aktif)</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Veri gerekli</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">2 kişi</span>
                            </div>
                            <Progress value={91} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Yağlama Makinesi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Ürün:</span>
                              <span className="font-medium">Balya teli</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Veri gerekli</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">1 kişi</span>
                            </div>
                            <Progress value={88} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Çivi Details */}
                {selectedLineForDetail === 'civi' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Jingu Makineleri</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Makine Sayısı:</span>
                              <span className="font-medium">2 adet</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Çapa bağlı</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Durum:</span>
                              <span className="font-medium">Aktif</span>
                            </div>
                            <Progress value={60} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Enkotek Makineleri</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Makine Sayısı:</span>
                              <span className="font-medium">7 adet</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Çapa bağlı</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Durum:</span>
                              <span className="font-medium">Aktif</span>
                            </div>
                            <Progress value={55} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Çelik Hasır Details */}
                {selectedLineForDetail === 'celik_hasir' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Schlatter Makinesi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tip:</span>
                              <span className="font-medium">Tam Otomatik</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Yüksek hız</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">2 kişi</span>
                            </div>
                            <Progress value={80} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Eurobend Makinesi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tip:</span>
                              <span className="font-medium">Tam Otomatik</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Orta hız</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">2 kişi</span>
                            </div>
                            <Progress value={70} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Panel Çit Details */}
                {selectedLineForDetail === 'panel_cit' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Kesme Makinesi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Makine Sayısı:</span>
                              <span className="font-medium">1 adet</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Veri gerekli</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">1 kişi</span>
                            </div>
                            <Progress value={65} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Kaynak Makinesi</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Panel tipine bağlı</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Kapasite:</span>
                              <span className="font-medium">Veri gerekli</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Operatör:</span>
                              <span className="font-medium">2 kişi</span>
                            </div>
                            <Progress value={70} className="mt-2" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}