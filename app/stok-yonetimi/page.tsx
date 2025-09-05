'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Package, 
  Search, 
  Filter, 
  Upload,
  Plus,
  Edit,
  ArrowLeft,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface StockItem {
  id: string;
  stok_kodu: string;
  stok_adi: string;
  kategori: string;
  alt_kategori?: string;
  miktar: number;
  birim: string;
  kritik_stok: number;
  rezerve_miktar: number;
  musait_miktar: number;
  birim_fiyat?: number;
  para_birimi?: string;
  tedarikci?: string;
  raf_no?: string;
  son_giris_tarihi?: string;
  son_cikis_tarihi?: string;
  aciklama?: string;
}

interface StockCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  alt_kategoriler?: string[];
}

const StokYonetimi = () => {
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('hammadde');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Stock Categories with comprehensive structure based on analysis
  const stockCategories: Record<string, StockCategory[]> = {
    hammadde: [
      {
        id: 'filmasin',
        name: 'Filmaşin',
        description: 'Ham tel malzemesi (FLM codes)',
        icon: '🔗',
        alt_kategoriler: ['FLM.0550.1006', 'FLM.0550.1008', 'FLM.0600.1008']
      },
      {
        id: 'siyah_tel',
        name: 'Siyah Tel',
        description: 'YM.ST kodlu siyah teller',
        icon: '⚫',
        alt_kategoriler: ['YM.ST.248', 'YM.ST.320', 'YM.ST.420']
      },
      {
        id: 'nervurlu_cubuk',
        name: 'Nervürlü Çubuk',
        description: 'NCBK kodlu nervürlü çubuklar',
        icon: '📏',
        alt_kategoriler: ['YM.NCBK.0420.500', 'YM.NCBK.0420.215', 'YM.NCBK.0500.500']
      },
      {
        id: 'galvanizli_cubuk',
        name: 'Galvanizli Çubuk',
        description: 'GT kodlu galvanizli çubuk malzemeler',
        icon: '🔘',
        alt_kategoriler: ['GT.NIT.0420', 'GT.PAD.0500']
      }
    ],
    yari_mamul: [
      {
        id: 'galvanizli_tel',
        name: 'Galvanizli Tel',
        description: 'GT kodlu galvanizli teller',
        icon: '🌟',
        alt_kategoriler: ['GT.NIT.0250', 'GT.NIT.0320', 'GT.PAD.0420']
      },
      {
        id: 'nervurlu_tel',
        name: 'Nervürlü Tel',
        description: 'NTEL kodlu nervürlü teller',
        icon: '〰️',
        alt_kategoriler: ['YM.NTEL.0420', 'YM.NTEL.0500']
      },
      {
        id: 'celik_hasir',
        name: 'Çelik Hasır',
        description: 'CH kodlu çelik hasır ürünleri',
        icon: '🔲',
        alt_kategoriler: ['CHSTD0420', 'CHSTD0500', 'CHOZL']
      }
    ],
    sarf_malzemeler: [
      {
        id: 'kimyasal',
        name: 'Kimyasallar',
        description: 'Asit, çinko ve diğer kimyasallar',
        icon: '🧪',
        alt_kategoriler: ['SM.HIDROLİK.ASİT', '150 03 (Çinko)', 'DESİ.PAK']
      },
      {
        id: 'ambalaj',
        name: 'Ambalaj Malzemeleri',
        description: 'Shrink, karton, çember, toka',
        icon: '📦',
        alt_kategoriler: ['AMB.SHRİNK', 'AMB.APEX CEMBER', 'AMB.TOKA.SIGNODE', 'AMB.ÇEM.KARTON']
      },
      {
        id: 'boya_malzeme',
        name: 'Boya ve Malzemeler',
        description: 'Elektrostatik toz boya malzemeleri',
        icon: '🎨',
        alt_kategoriler: ['TOZ.BOYA.RAL', 'ASTAR.MALZEME']
      },
      {
        id: 'makinaaksamlar',
        name: 'Makina Aksamları',
        description: 'Makina yedek parça ve aksamları',
        icon: '⚙️',
        alt_kategoriler: ['YEDEK.PARCA', 'BAKIM.MALZEME']
      }
    ],
    mamul_urun: [
      {
        id: 'panel_cit',
        name: 'Panel Çit',
        description: 'Üretilen panel çit ürünleri',
        icon: '🏗️',
        alt_kategoriler: ['SP (Single)', 'DP (Double)', 'GP (Güvenlik)']
      },
      {
        id: 'profil_urun',
        name: 'Profil Ürünleri',
        description: 'Kesilmiş ve işlenmiş profil ürünler',
        icon: '📐',
        alt_kategoriler: ['PROFIL.40x60', 'PROFIL.50x100']
      },
      {
        id: 'civi_urun',
        name: 'Çivi Ürünleri',
        description: 'Üretilen çivi ürünleri',
        icon: '📎',
        alt_kategoriler: ['CIVI.DOKME', 'CIVI.TELE.DIZGI', 'CIVI.PLASTIK.DIZGI']
      }
    ]
  };

  // Sample stock data - to be replaced with API calls
  const sampleStockData: StockItem[] = [
    {
      id: '1',
      stok_kodu: 'FLM.0550.1006',
      stok_adi: 'Filmaşin 5.50mm 1006 kalite',
      kategori: 'hammadde',
      alt_kategori: 'filmasin',
      miktar: 15000,
      birim: 'kg',
      kritik_stok: 2000,
      rezerve_miktar: 1500,
      musait_miktar: 13500,
      birim_fiyat: 25.50,
      para_birimi: 'USD',
      tedarikci: 'Erdemir',
      raf_no: 'A1-01',
      son_giris_tarihi: '2024-12-01'
    },
    {
      id: '2', 
      stok_kodu: 'GT.NIT.0250.00',
      stok_adi: 'Galvanizli Tel 2.50 mm -0.06/+0.05 50 gr/m² 350-550 MPa',
      kategori: 'yari_mamul',
      alt_kategori: 'galvanizli_tel',
      miktar: 8500,
      birim: 'kg',
      kritik_stok: 1000,
      rezerve_miktar: 2500,
      musait_miktar: 6000,
      birim_fiyat: 42.80,
      para_birimi: 'USD',
      raf_no: 'B2-15'
    },
    {
      id: '3',
      stok_kodu: 'CHSTD0420',
      stok_adi: 'Çelik Hasır 4.20mm Standart 500x215cm',
      kategori: 'yari_mamul', 
      alt_kategori: 'celik_hasir',
      miktar: 150,
      birim: 'adet',
      kritik_stok: 20,
      rezerve_miktar: 50,
      musait_miktar: 100,
      birim_fiyat: 125.00,
      para_birimi: 'USD',
      raf_no: 'C1-08'
    },
    {
      id: '4',
      stok_kodu: 'SM.HIDROLİK.ASİT',
      stok_adi: 'Hidroklorik Asit %31',
      kategori: 'sarf_malzemeler',
      alt_kategori: 'kimyasal',
      miktar: 25000,
      birim: 'kg',
      kritik_stok: 5000,
      rezerve_miktar: 3000,
      musait_miktar: 22000,
      birim_fiyat: 1.20,
      para_birimi: 'USD',
      tedarikci: 'Akkim Kimya',
      raf_no: 'D3-01'
    }
  ];

  useEffect(() => {
    setStockItems(sampleStockData);
  }, []);

  const getStockStatus = (item: StockItem) => {
    const ratio = item.musait_miktar / item.kritik_stok;
    if (ratio <= 1) return 'critical';
    if (ratio <= 2) return 'low';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500 text-white';
      case 'low': return 'bg-yellow-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'Kritik';
      case 'low': return 'Düşük';
      default: return 'Normal';
    }
  };

  const filteredItems = stockItems.filter(item => {
    const matchesTab = item.kategori === activeTab;
    const matchesSearch = item.stok_kodu.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.stok_adi.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterCategory || item.alt_kategori === filterCategory;
    
    return matchesTab && matchesSearch && matchesFilter;
  });

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Process Excel data and update stock
        console.log('Excel data:', jsonData);
        setShowUploadModal(false);
        
      } catch (error) {
        console.error('Excel okuma hatası:', error);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Ana Sayfa</span>
          </button>
        </div>

        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Package className="w-8 h-8 mr-3 text-green-600" />
                Stok Yönetimi
              </h1>
              <p className="text-gray-600 mt-2">Hammadde, yarı mamul ve sarf malzeme stok takibi</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Excel Yükle
              </Button>
              <Button
                onClick={() => setShowItemModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Stok
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Stok kodu veya adı ile ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-48">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Kategori filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tüm Kategoriler</SelectItem>
                  {stockCategories[activeTab]?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stock Categories Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hammadde">Hammadde</TabsTrigger>
            <TabsTrigger value="yari_mamul">Yarı Mamul</TabsTrigger>
            <TabsTrigger value="sarf_malzemeler">Sarf Malzemeler</TabsTrigger>
            <TabsTrigger value="mamul_urun">Mamul Ürün</TabsTrigger>
          </TabsList>

          {Object.entries(stockCategories).map(([tabKey, categories]) => (
            <TabsContent key={tabKey} value={tabKey} className="space-y-4">
              
              {/* Category Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map(category => {
                  const categoryItems = filteredItems.filter(item => item.alt_kategori === category.id);
                  const criticalCount = categoryItems.filter(item => getStockStatus(item) === 'critical').length;
                  
                  return (
                    <Card key={category.id} className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setFilterCategory(category.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{category.icon}</span>
                          {criticalCount > 0 && (
                            <Badge className="bg-red-100 text-red-800">
                              {criticalCount} kritik
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{categoryItems.length} ürün</p>
                        <p className="text-xs text-gray-400 mt-2">{category.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Stock Items Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Durum</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Stok Kodu</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Stok Adı</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Mevcut</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rezerve</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Müsait</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Kritik Stok</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Raf No</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredItems.map((item) => {
                        const status = getStockStatus(item);
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Badge className={`text-xs ${getStatusColor(status)}`}>
                                {getStatusText(status)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm">{item.stok_kodu}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-900">{item.stok_adi}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium">{item.miktar.toLocaleString()} {item.birim}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-orange-600">{item.rezerve_miktar.toLocaleString()} {item.birim}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-green-600">{item.musait_miktar.toLocaleString()} {item.birim}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-red-600">{item.kritik_stok.toLocaleString()} {item.birim}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-500">{item.raf_no || '-'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowItemModal(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
            </TabsContent>
          ))}
        </Tabs>

        {/* Excel Upload Modal */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Excel Dosyası Yükle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-4">Stok bilgilerini içeren Excel dosyasını seçin</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Dosya Seç
                  </Button>
                </label>
              </div>
              <div className="text-xs text-gray-500">
                <p>• Desteklenen formatlar: .xlsx, .xls</p>
                <p>• Maksimum dosya boyutu: 10MB</p>
                <p>• Sütun başlıkları: stok_kodu, stok_adi, miktar, birim, kritik_stok</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stock Item Modal */}
        <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedItem ? 'Stok Düzenle' : 'Yeni Stok Ekle'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stok Kodu</Label>
                <Input placeholder="Örn: FLM.0550.1006" />
              </div>
              <div>
                <Label>Kategori</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filmasin">Filmaşin</SelectItem>
                    <SelectItem value="galvanizli_tel">Galvanizli Tel</SelectItem>
                    <SelectItem value="celik_hasir">Çelik Hasır</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Stok Adı</Label>
                <Input placeholder="Detaylı ürün açıklaması" />
              </div>
              <div>
                <Label>Mevcut Miktar</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <Label>Birim</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Birim seç" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="adet">adet</SelectItem>
                    <SelectItem value="ton">ton</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kritik Stok Seviyesi</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div>
                <Label>Raf No</Label>
                <Input placeholder="Örn: A1-01" />
              </div>
              <div className="col-span-2 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowItemModal(false)}>
                  İptal
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Kaydet
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default StokYonetimi;