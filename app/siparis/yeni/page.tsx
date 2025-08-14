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
// import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  ArrowLeft, 
  Calculator, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Settings
} from 'lucide-react';

interface OrderItem {
  id: string;
  product_type: string;
  specifications: Record<string, any>;
  quantity: number;
  unit: string;
  calculated_weight?: number;
  estimated_cost?: number;
  production_time?: number;
  raw_materials?: Record<string, number>;
  notes?: string;
}

interface ProductSpecification {
  field: string;
  label: string;
  type: 'number' | 'select' | 'text' | 'checkbox';
  options?: string[];
  required: boolean;
  unit?: string;
  min?: number;
  max?: number;
  precision?: number;
}

const YeniSiparis = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('galvanizli_tel');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState<OrderItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [suggestedDeliveryDate, setSuggestedDeliveryDate] = useState<string>('');
  const [minDeliveryDate, setMinDeliveryDate] = useState<string>('');
  const [customerInfo, setCustomerInfo] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  // Product specifications based on component analysis
  const productSpecifications: Record<string, ProductSpecification[]> = {
    galvanizli_tel: [
      { field: 'cap', label: 'Tel Çapı', type: 'number', required: true, unit: 'mm', min: 1.25, max: 8.0, precision: 2 },
      { field: 'kod_2', label: 'Kaplama Tipi', type: 'select', options: ['NIT', 'PAD'], required: true },
      { field: 'kaplama', label: 'Kaplama Miktarı', type: 'select', options: ['30', '40', '50', '75', '100', '120', '150', '200', '250', '300'], required: true, unit: 'gr/m²' },
      { field: 'min_mukavemet', label: 'Min. Mukavemet', type: 'number', required: true, unit: 'MPa', min: 300, max: 700 },
      { field: 'max_mukavemet', label: 'Max. Mukavemet', type: 'number', required: true, unit: 'MPa', min: 400, max: 800 },
      { field: 'kg', label: 'Bobin Ağırlığı', type: 'select', options: ['500', '1000', '1500', '2000'], required: true, unit: 'kg' },
      { field: 'ic_cap', label: 'İç Çap', type: 'number', required: true, unit: 'cm', min: 30, max: 60 },
      { field: 'dis_cap', label: 'Dış Çap', type: 'number', required: true, unit: 'cm', min: 50, max: 120 },
      { field: 'tolerans_plus', label: 'Tolerans (+)', type: 'number', required: true, unit: 'mm', precision: 3 },
      { field: 'tolerans_minus', label: 'Tolerans (-)', type: 'number', required: true, unit: 'mm', precision: 3 },
      { field: 'shrink', label: 'Shrink Ambalaj', type: 'checkbox', required: false },
      { field: 'paletli', label: 'Paletli', type: 'checkbox', required: false }
    ],
    panel_cit: [
      { field: 'panel_tipi', label: 'Panel Tipi', type: 'select', options: ['Single', 'Double', 'Guvenlik', 'Ozel'], required: true },
      { field: 'boy', label: 'Boy', type: 'number', required: true, unit: 'cm', min: 50, max: 350 },
      { field: 'en', label: 'En', type: 'number', required: true, unit: 'cm', min: 100, max: 350 },
      { field: 'dikey_tel_capi', label: 'Dikey Tel Çapı', type: 'select', options: ['3', '4', '5', '6'], required: true, unit: 'mm' },
      { field: 'yatay_tel_capi', label: 'Yatay Tel Çapı', type: 'select', options: ['3', '4', '5', '6'], required: true, unit: 'mm' },
      { field: 'dikey_goz_araligi', label: 'Dikey Göz Aralığı', type: 'select', options: ['50', '75', '100', '125', '150', '200'], required: true, unit: 'mm' },
      { field: 'yatay_goz_araligi', label: 'Yatay Göz Aralığı', type: 'select', options: ['25', '50', '75', '100'], required: true, unit: 'mm' },
      { field: 'bukum_sayisi', label: 'Büküm Sayısı', type: 'number', required: true, min: 0, max: 6 },
      { field: 'bukumdeki_cubuk_sayisi', label: 'Bükümde Çubuk Sayısı', type: 'number', required: true, min: 0, max: 5 },
      { field: 'boyali', label: 'Boyalı', type: 'checkbox', required: false },
      { field: 'renk', label: 'Boya Rengi', type: 'select', options: ['RAL6005', 'RAL9005', 'RAL7016', 'RAL9010'], required: false }
    ],
    celik_hasir: [
      { field: 'hasir_tipi', label: 'Hasır Tipi', type: 'text', required: true },
      { field: 'boy', label: 'Boy', type: 'number', required: true, unit: 'cm', min: 100, max: 600 },
      { field: 'en', label: 'En', type: 'number', required: true, unit: 'cm', min: 100, max: 300 },
      { field: 'boyCap', label: 'Boy Çubuk Çapı', type: 'select', options: ['4', '4.2', '5', '6', '8', '10', '12'], required: true, unit: 'mm' },
      { field: 'enCap', label: 'En Çubuk Çapı', type: 'select', options: ['4', '4.2', '5', '6', '8', '10', '12'], required: true, unit: 'mm' },
      { field: 'boyAraligi', label: 'Boy Aralığı', type: 'number', required: true, unit: 'mm', min: 50, max: 300 },
      { field: 'enAraligi', label: 'En Aralığı', type: 'number', required: true, unit: 'mm', min: 50, max: 300 },
      { field: 'adet', label: 'Adet', type: 'number', required: true, min: 1 }
    ],
    civi: [
      { field: 'civi_tipi', label: 'Çivi Tipi', type: 'select', options: ['Dökme', 'Tele Dizgi', 'Plastik Dizgi'], required: true },
      { field: 'cap', label: 'Çivi Çapı', type: 'select', options: ['1.8', '2.0', '2.2', '2.5', '2.8', '3.0', '3.2', '3.5', '4.0'], required: true, unit: 'mm' },
      { field: 'uzunluk', label: 'Çivi Uzunluğu', type: 'number', required: true, unit: 'mm', min: 25, max: 130 },
      { field: 'paket_tipi', label: 'Paketleme Tipi', type: 'select', options: ['25kg kutu', '5kg kutu', '1kg kutu'], required: false },
      { field: 'galvanizli', label: 'Galvanizli', type: 'checkbox', required: false }
    ],
    profil: [
      { field: 'profil_en1', label: 'En 1', type: 'number', required: true, unit: 'mm', min: 20, max: 100 },
      { field: 'profil_en2', label: 'En 2', type: 'number', required: true, unit: 'mm', min: 20, max: 100 },
      { field: 'et_kalinligi', label: 'Et Kalınlığı', type: 'number', required: true, unit: 'mm', min: 1, max: 5, precision: 1 },
      { field: 'yukseklik', label: 'Uzunluk', type: 'number', required: true, unit: 'cm', min: 50, max: 600 },
      { field: 'galvanizli', label: 'Galvanizli', type: 'checkbox', required: false },
      { field: 'flansli', label: 'Flanşlı', type: 'checkbox', required: false },
      { field: 'vida_adet', label: 'Vida Adeti', type: 'number', required: false, min: 0, max: 10 },
      { field: 'klips_adet', label: 'Klips Adeti', type: 'number', required: false, min: 0, max: 10 },
      { field: 'dubel_adet', label: 'Dübel Adeti', type: 'number', required: false, min: 0, max: 10 },
      { field: 'kapak_adet', label: 'Kapak Adeti', type: 'number', required: false, min: 0, max: 10 }
    ]
  };

  // Calculate delivery dates based on product type and complexity
  const calculateDeliveryDates = (items: OrderItem[]) => {
    let totalDays = 0;
    
    items.forEach(item => {
      switch (item.product_type) {
        case 'galvanizli_tel':
          totalDays = Math.max(totalDays, 7); // 1 week for galvanized wire
          break;
        case 'panel_cit':
          const isPainted = item.specifications.boyali;
          totalDays = Math.max(totalDays, isPainted ? 14 : 10); // 2 weeks if painted
          break;
        case 'celik_hasir':
          totalDays = Math.max(totalDays, 12); // 1.5 weeks for steel mesh
          break;
        case 'civi':
          totalDays = Math.max(totalDays, 5); // 5 days for nails
          break;
        case 'profil':
          totalDays = Math.max(totalDays, 7); // 1 week for profiles
          break;
      }
    });

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + totalDays);
    
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + totalDays + 3); // Add buffer
    
    setMinDeliveryDate(minDate.toISOString().split('T')[0]);
    setSuggestedDeliveryDate(suggestedDate.toISOString().split('T')[0]);
  };

  useEffect(() => {
    if (orderItems.length > 0) {
      calculateDeliveryDates(orderItems);
    }
  }, [orderItems]);

  const addOrderItem = () => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      product_type: activeTab,
      specifications: {},
      quantity: 1,
      unit: getDefaultUnit(activeTab)
    };
    setCurrentItem(newItem);
    setShowItemModal(true);
  };

  const getDefaultUnit = (productType: string): string => {
    switch (productType) {
      case 'galvanizli_tel': return 'kg';
      case 'panel_cit': return 'adet';
      case 'celik_hasir': return 'adet';
      case 'civi': return 'kg';
      case 'profil': return 'adet';
      default: return 'adet';
    }
  };

  const saveOrderItem = () => {
    if (!currentItem) return;
    
    const updatedItems = currentItem.id && orderItems.find(i => i.id === currentItem.id) 
      ? orderItems.map(item => item.id === currentItem.id ? currentItem : item)
      : [...orderItems, currentItem];
    
    setOrderItems(updatedItems);
    setShowItemModal(false);
    setCurrentItem(null);
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(orderItems.filter(item => item.id !== id));
  };

  const renderSpecificationField = (spec: ProductSpecification) => {
    const value = currentItem?.specifications[spec.field] || '';
    
    switch (spec.type) {
      case 'select':
        return (
          <Select 
            value={value} 
            onValueChange={(val) => setCurrentItem(prev => prev ? {
              ...prev,
              specifications: { ...prev.specifications, [spec.field]: val }
            } : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`${spec.label} seç`} />
            </SelectTrigger>
            <SelectContent>
              {spec.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option} {spec.unit && `${spec.unit}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id={spec.field}
              checked={value === true}
              onCheckedChange={(checked) => setCurrentItem(prev => prev ? {
                ...prev,
                specifications: { ...prev.specifications, [spec.field]: checked }
              } : null)}
            />
            <Label htmlFor={spec.field}>{spec.label}</Label>
          </div>
        );
        
      case 'number':
        return (
          <div className="relative">
            <Input
              type="number"
              value={value}
              onChange={(e) => setCurrentItem(prev => prev ? {
                ...prev,
                specifications: { ...prev.specifications, [spec.field]: parseFloat(e.target.value) || 0 }
              } : null)}
              min={spec.min}
              max={spec.max}
              step={spec.precision ? Math.pow(10, -spec.precision) : 1}
              placeholder={`${spec.label} girin`}
            />
            {spec.unit && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                {spec.unit}
              </span>
            )}
          </div>
        );
        
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => setCurrentItem(prev => prev ? {
              ...prev,
              specifications: { ...prev.specifications, [spec.field]: e.target.value }
            } : null)}
            placeholder={`${spec.label} girin`}
          />
        );
    }
  };

  const getProductDisplayName = (productType: string): string => {
    switch (productType) {
      case 'galvanizli_tel': return 'Galvanizli Tel';
      case 'panel_cit': return 'Panel Çit';
      case 'celik_hasir': return 'Çelik Hasır';
      case 'civi': return 'Çivi';
      case 'profil': return 'Profil';
      default: return productType;
    }
  };

  const generateItemSummary = (item: OrderItem): string => {
    const specs = item.specifications;
    switch (item.product_type) {
      case 'galvanizli_tel':
        return `${specs.cap || '?'}mm ${specs.kod_2 || '?'} ${specs.kaplama || '?'}gr/m² - ${specs.kg || '?'}kg bobin`;
      case 'panel_cit':
        return `${specs.panel_tipi || '?'} ${specs.boy || '?'}x${specs.en || '?'}cm ${specs.boyali ? '(Boyalı)' : ''}`;
      case 'celik_hasir':
        return `${specs.hasir_tipi || '?'} ${specs.boy || '?'}x${specs.en || '?'}cm Ø${specs.boyCap || '?'}mm`;
      case 'civi':
        return `${specs.civi_tipi || '?'} Ø${specs.cap || '?'}mm x ${specs.uzunluk || '?'}mm`;
      case 'profil':
        return `${specs.profil_en1 || '?'}x${specs.profil_en2 || '?'}x${specs.et_kalinligi || '?'}mm x ${specs.yukseklik || '?'}cm`;
      default:
        return 'Tanımlanmamış ürün';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/satis')}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Satış</span>
          </button>
        </div>

        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Plus className="w-8 h-8 mr-3 text-blue-600" />
                Yeni Sipariş Oluştur
              </h1>
              <p className="text-gray-600 mt-2">Ürün özelliklerine göre sipariş hazırlama</p>
            </div>
            {orderItems.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Tahmini Teslimat</p>
                <p className="text-lg font-semibold text-green-600">
                  {new Date(suggestedDeliveryDate).toLocaleDateString('tr-TR')}
                </p>
                <p className="text-xs text-gray-500">
                  En erken: {new Date(minDeliveryDate).toLocaleDateString('tr-TR')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Müşteri Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Firma Adı *</Label>
                <Input 
                  value={customerInfo.company_name}
                  onChange={(e) => setCustomerInfo({...customerInfo, company_name: e.target.value})}
                  placeholder="Firma adı girin"
                />
              </div>
              <div>
                <Label>İletişim Kişisi</Label>
                <Input 
                  value={customerInfo.contact_person}
                  onChange={(e) => setCustomerInfo({...customerInfo, contact_person: e.target.value})}
                  placeholder="İletişim kişisi"
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input 
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  placeholder="Telefon numarası"
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input 
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  placeholder="E-mail adresi"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Adres</Label>
                <Input
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  placeholder="Müşteri adresi"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Selection Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="galvanizli_tel">Galvanizli Tel</TabsTrigger>
            <TabsTrigger value="panel_cit">Panel Çit</TabsTrigger>
            <TabsTrigger value="celik_hasir">Çelik Hasır</TabsTrigger>
            <TabsTrigger value="civi">Çivi</TabsTrigger>
            <TabsTrigger value="profil">Profil</TabsTrigger>
          </TabsList>

          {Object.keys(productSpecifications).map(tabKey => (
            <TabsContent key={tabKey} value={tabKey} className="space-y-4">
              
              {/* Add Product Button */}
              <div className="flex justify-center">
                <Button 
                  onClick={addOrderItem}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {getProductDisplayName(tabKey)} Ekle
                </Button>
              </div>
              
              {/* Order Items List */}
              {orderItems.filter(item => item.product_type === tabKey).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sipariş Kalemleri - {getProductDisplayName(tabKey)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {orderItems.filter(item => item.product_type === tabKey).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{generateItemSummary(item)}</p>
                            <p className="text-sm text-gray-600">
                              Miktar: {item.quantity} {item.unit}
                              {item.calculated_weight && ` • Ağırlık: ${item.calculated_weight} kg`}
                              {item.production_time && ` • Üretim: ${item.production_time} gün`}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCurrentItem(item);
                                setShowItemModal(true);
                              }}
                            >
                              Düzenle
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeOrderItem(item.id)}
                            >
                              Sil
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
            </TabsContent>
          ))}
        </Tabs>

        {/* Order Summary */}
        {orderItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Sipariş Özeti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Teslimat Bilgileri</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Minimum Teslimat:</span>
                      <span className="font-medium text-red-600">
                        {new Date(minDeliveryDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Önerilen Teslimat:</span>
                      <span className="font-medium text-green-600">
                        {new Date(suggestedDeliveryDate).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Sipariş Detayları</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Toplam Kalem:</span>
                      <span className="font-medium">{orderItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ürün Çeşidi:</span>
                      <span className="font-medium">{new Set(orderItems.map(i => i.product_type)).size}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-end space-y-2">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setShowCalculatorModal(true)}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Maliyet Hesapla
                  </Button>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={orderItems.length === 0 || !customerInfo.company_name}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Siparişi Tamamla
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Specification Modal */}
        <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {currentItem && getProductDisplayName(currentItem.product_type)} Özellikleri
              </DialogTitle>
            </DialogHeader>
            
            {currentItem && (
              <div className="space-y-6">
                {/* Product Specifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productSpecifications[currentItem.product_type]?.map(spec => (
                    <div key={spec.field} className="space-y-2">
                      <Label className="flex items-center">
                        {spec.label}
                        {spec.required && <span className="text-red-500 ml-1">*</span>}
                        {spec.unit && <span className="text-sm text-gray-500 ml-1">({spec.unit})</span>}
                      </Label>
                      {renderSpecificationField(spec)}
                    </div>
                  ))}
                </div>

                {/* Quantity and Unit */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>Miktar *</Label>
                    <Input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({
                        ...currentItem,
                        quantity: parseInt(e.target.value) || 1
                      })}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label>Birim</Label>
                    <Select 
                      value={currentItem.unit} 
                      onValueChange={(value) => setCurrentItem({...currentItem, unit: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adet">adet</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="ton">ton</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="m²">m²</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notlar</Label>
                  <Input
                    value={currentItem.notes || ''}
                    onChange={(e) => setCurrentItem({...currentItem, notes: e.target.value})}
                    placeholder="Ek açıklamalar..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowItemModal(false)}>
                    İptal
                  </Button>
                  <Button onClick={saveOrderItem} className="bg-green-600 hover:bg-green-700 text-white">
                    Kaydet
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default YeniSiparis;