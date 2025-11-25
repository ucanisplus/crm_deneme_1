// Albayrak Demir Çelik APS (Advanced Planning & Scheduling) System - IMPROVED VERSION
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  Loader2, Clock, Factory, AlertCircle, Target, BarChart3, Zap, Settings, 
  Plus, Trash2, CheckCircle, XCircle, TrendingUp, Activity, Users, Gauge,
  Calendar, Package, Wrench, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function AlbayrakAPSImproved() {
  const { user } = useAuth();
  
  // State yönetimi
  const [activeTab, setActiveTab] = useState('calculator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Üretim Süresi Hesaplayıcı State
  const [calculator, setCalculator] = useState({
    product: '',
    quantity: '',
    specifications: {
      input_diameter: '8.0',
      output_diameter: '3.0',
      panel_type: 'double',
      panel_color: 'yesil',
      height: '1800',
      mesh_type: 'yari_oto',
      diameter: '1.2'
    },
    result: null
  });
  
  // Çizelge Optimize Edici State
  const [optimizer, setOptimizer] = useState({
    orders: [
      {
        id: 1,
        product: '',
        quantity: '',
        priority: 1,
        specifications: {}
      }
    ],
    scheduleName: '',
    targetDate: '',
    result: null
  });
  
  // Fabrika Durum State
  const [factoryStatus, setFactoryStatus] = useState(null);
  const [capacityData, setCapacityData] = useState(null);

  // Kaydedilmiş Çizelgeler State
  const [savedSchedules, setSavedSchedules] = useState([]);

  // Albayrak Demir Çelik için DOĞRU Ürün tipleri
  const productTypes = [
    { 
      value: 'galvanizli_tel', 
      label: 'Galvanizli Tel', 
      icon: '🔗',
      routing: ['tel_cekme', 'galvaniz'],
      description: 'Çeşitli çaplarda galvanizli tel üretimi'
    },
    { 
      value: 'panel_cit_yesil', 
      label: 'Panel Çit Yeşil', 
      icon: '🟢',
      routing: ['tel_cekme', 'galvaniz', 'panel_cit'],
      description: 'RAL 6005 yeşil renk panel çit'
    },
    { 
      value: 'panel_cit_antrasit', 
      label: 'Panel Çit Antrasit', 
      icon: '⚫',
      routing: ['tel_cekme', 'galvaniz', 'panel_cit'],
      description: 'RAL 7016 antrasit renk panel çit'
    },
    { 
      value: 'celik_hasir', 
      label: 'Çelik Hasır', 
      icon: '⬜',
      routing: ['tel_cekme', 'celik_hasir'],
      description: 'İnşaat ve betonarme çelik hasır'
    },
    { 
      value: 'civi', 
      label: 'Çivi', 
      icon: '📌',
      routing: ['tel_cekme', 'civi'],
      description: 'Çeşitli boyutlarda inşaat çivisi'
    },
    { 
      value: 'tavli_tel', 
      label: 'Tavlı Tel', 
      icon: '🔄',
      routing: ['tel_cekme', 'tavli_tel'],
      description: 'Yumuşak tavlı tel (1.2mm, 3.5mm)'
    },
    { 
      value: 'balya_teli', 
      label: 'Balya Teli', 
      icon: '🌾',
      routing: ['tel_cekme', 'tavli_tel'],
      description: 'Tarımsal balya bağlama teli'
    },
    { 
      value: 'profil_kesim', 
      label: 'Profil Kesim', 
      icon: '📐',
      routing: ['profil'],
      description: 'Çeşitli profil kesim ve kaynak'
    }
  ];

  const priorityLevels = [
    { value: 1, label: 'Normal', color: 'bg-slate-100 text-slate-700', icon: '📋' },
    { value: 2, label: 'Yüksek', color: 'bg-yellow-100 text-yellow-700', icon: '⚡' },
    { value: 3, label: 'Acil', color: 'bg-orange-100 text-orange-700', icon: '🚨' },
    { value: 4, label: 'Patron Önceliği', color: 'bg-red-100 text-red-700', icon: '👑' }
  ];

  // Panel özellikleri
  const panelTypes = [
    { value: 'double', label: 'Double Panel', description: '2 yatay tel sistemi' },
    { value: 'single', label: 'Single Panel', description: '1 yatay tel sistemi' },
    { value: 'guvenlik', label: 'Güvenlik Panel', description: 'Yüksek güvenlik paneli' }
  ];

  const panelColors = [
    { value: 'yesil', label: 'Yeşil (RAL 6005)', color: 'bg-green-600' },
    { value: 'antrasit', label: 'Antrasit (RAL 7016)', color: 'bg-gray-800' }
  ];

  // API Konfigürasyonu
  const API_BASE = 'https://crm-factory-backend.onrender.com/api/aps';
  
  const makeAPICall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API call failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call error for ${endpoint}:`, error);
      throw error;
    }
  };

  // Mount sırasında veri yükle
  useEffect(() => {
    loadFactoryStatus();
    loadCapacityData();
    if (user?.username) {
      loadSavedSchedules();
    }
  }, [user]);

  const loadFactoryStatus = async () => {
    try {
      const status = await makeAPICall('/factory-status');
      setFactoryStatus(status);
    } catch (error) {
      console.error('Failed to load factory status:', error);
    }
  };

  const loadCapacityData = async () => {
    try {
      const capacity = await makeAPICall('/line-capacities');
      setCapacityData(capacity);
    } catch (error) {
      console.error('Failed to load capacity data:', error);
    }
  };

  const loadSavedSchedules = async () => {
    try {
      const schedules = await makeAPICall(`/schedules?created_by=${user.username}&limit=20`);
      setSavedSchedules(schedules.schedules || []);
    } catch (error) {
      console.error('Failed to load saved schedules:', error);
    }
  };

  // Production Time Calculator Functions
  const calculateProductionTime = async () => {
    if (!calculator.product || !calculator.quantity) {
      setError('Ürün tipi ve miktar gereklidir');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await makeAPICall('/calculate-time', {
        method: 'POST',
        body: JSON.stringify({
          product: calculator.product,
          quantity: parseFloat(calculator.quantity),
          specifications: calculator.specifications
        })
      });

      setCalculator(prev => ({ ...prev, result }));
      toast.success('Üretim süresi başarıyla hesaplandı!');
    } catch (error) {
      setError(`Hesaplama hatası: ${error.message}`);
      toast.error('Üretim süresi hesaplanamadı');
    } finally {
      setLoading(false);
    }
  };

  const calculateTLCSpeed = async () => {
    const { input_diameter, output_diameter } = calculator.specifications;
    
    if (!input_diameter || !output_diameter) {
      toast.error('Giriş ve çıkış çapı gereklidir');
      return;
    }

    try {
      setLoading(true);
      const result = await makeAPICall('/calculate-tlc', {
        method: 'POST',
        body: JSON.stringify({
          input_diameter: parseFloat(input_diameter),
          output_diameter: parseFloat(output_diameter)
        })
      });

      toast.success(`TLC Hızı: ${result.tlc_speed_kg_hour.toFixed(2)} kg/saat`);
    } catch (error) {
      toast.error(`TLC hesaplama hatası: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Yardımcı Fonksiyonlar
  const formatDuration = (hours) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} dakika`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)} saat`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days} gün ${remainingHours.toFixed(1)} saat`;
    }
  };

  const getProductInfo = (productType) => {
    return productTypes.find(p => p.value === productType) || {};
  };

  const getPriorityInfo = (priority) => {
    return priorityLevels.find(p => p.value === priority) || priorityLevels[0];
  };

  const getBottleneckColor = (bottleneck) => {
    if (bottleneck.includes('eurobend') || bottleneck.includes('critical')) return 'bg-red-100 text-red-800';
    if (bottleneck.includes('polishing') || bottleneck.includes('single_machine')) return 'bg-orange-100 text-orange-800';
    if (bottleneck.includes('painting') || bottleneck.includes('workers')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Enhanced Header with gradient and better typography */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <Factory className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Albayrak Demir Çelik</h1>
                <p className="text-blue-100 text-lg">İleri Planlama ve Çizelgeleme Sistemi</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>8 Üretim Hattı</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Gerçek Zamanlı</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>OR-Tools</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Navigation with better icons and styling */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg rounded-xl p-1">
            <TabsTrigger 
              value="calculator" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Süre Hesaplama</span>
              <span className="sm:hidden">Hesapla</span>
            </TabsTrigger>
            <TabsTrigger 
              value="optimizer" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
            >
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Plan Optimizasyonu</span>
              <span className="sm:hidden">Optimize</span>
            </TabsTrigger>
            <TabsTrigger 
              value="status" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Fabrika Durumu</span>
              <span className="sm:hidden">Durum</span>
            </TabsTrigger>
            <TabsTrigger 
              value="schedules" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Kayıtlı Planlar</span>
              <span className="sm:hidden">Planlar</span>
            </TabsTrigger>
          </TabsList>

          {/* Production Time Calculator Tab - ENHANCED */}
          <TabsContent value="calculator" className="mt-6 space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Üretim Süresi Hesaplayıcı</h2>
                    <p className="text-blue-100 text-sm">TLC_Hızlar formülü ile gerçek zamanlı hesaplama</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Enhanced Product Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Ürün Tipi *</label>
                    <Select value={calculator.product} onValueChange={(value) => 
                      setCalculator(prev => ({ ...prev, product: value }))
                    }>
                      <SelectTrigger className="h-12 border-2 border-gray-200 hover:border-blue-300 transition-colors">
                        <SelectValue placeholder="Üretim yapılacak ürünü seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {productTypes.map(product => (
                          <SelectItem key={product.value} value={product.value}>
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{product.icon}</span>
                              <div>
                                <div className="font-medium">{product.label}</div>
                                <div className="text-xs text-gray-500">{product.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Üretim Miktarı (kg) *</label>
                    <Input
                      type="number"
                      placeholder="Kilogram cinsinden miktar"
                      value={calculator.quantity}
                      onChange={(e) => setCalculator(prev => ({ 
                        ...prev, 
                        quantity: e.target.value 
                      }))}
                      className="h-12 border-2 border-gray-200 hover:border-blue-300 transition-colors"
                    />
                  </div>
                </div>

                {/* Enhanced Specifications */}
                {calculator.product && (
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                      <Wrench className="h-5 w-5 text-blue-600" />
                      <span>Ürün Özellikleri</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      {/* Wire Drawing specifications */}
                      {(['galvanizli_tel', 'panel_cit_yesil', 'panel_cit_antrasit', 'celik_hasir', 'civi', 'tavli_tel'].includes(calculator.product)) && (
                        <>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Giriş Çapı (mm)</label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Filmaşin çapı"
                              value={calculator.specifications.input_diameter}
                              onChange={(e) => setCalculator(prev => ({
                                ...prev,
                                specifications: {
                                  ...prev.specifications,
                                  input_diameter: e.target.value
                                }
                              }))}
                              className="border-gray-300"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Çıkış Çapı (mm)</label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Hedef tel çapı"
                              value={calculator.specifications.output_diameter}
                              onChange={(e) => setCalculator(prev => ({
                                ...prev,
                                specifications: {
                                  ...prev.specifications,
                                  output_diameter: e.target.value
                                }
                              }))}
                              className="border-gray-300"
                            />
                          </div>
                          
                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={calculateTLCSpeed}
                              disabled={loading}
                              className="w-full h-10 border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              TLC Hızı Hesapla
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Panel Çit specifications - CORRECTED */}
                      {(calculator.product === 'panel_cit_yesil' || calculator.product === 'panel_cit_antrasit') && (
                        <>
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Panel Tipi</label>
                            <Select 
                              value={calculator.specifications.panel_type} 
                              onValueChange={(value) => setCalculator(prev => ({
                                ...prev,
                                specifications: {
                                  ...prev.specifications,
                                  panel_type: value
                                }
                              }))}
                            >
                              <SelectTrigger className="border-gray-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {panelTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div>
                                      <div className="font-medium">{type.label}</div>
                                      <div className="text-xs text-gray-500">{type.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Panel Yüksekliği (mm)</label>
                            <Select
                              value={calculator.specifications.height}
                              onValueChange={(value) => setCalculator(prev => ({
                                ...prev,
                                specifications: {
                                  ...prev.specifications,
                                  height: value
                                }
                              }))}
                            >
                              <SelectTrigger className="border-gray-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1200">1.20m (1200mm)</SelectItem>
                                <SelectItem value="1500">1.50m (1500mm)</SelectItem>
                                <SelectItem value="1800">1.80m (1800mm)</SelectItem>
                                <SelectItem value="2000">2.00m (2000mm)</SelectItem>
                                <SelectItem value="2200">2.20m (2200mm)</SelectItem>
                                <SelectItem value="2500">2.50m (2500mm)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Renk</label>
                            <div className="bg-white rounded-lg border border-gray-300 p-2">
                              {calculator.product === 'panel_cit_yesil' ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                                  <span className="text-sm font-medium">Yeşil (RAL 6005)</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
                                  <span className="text-sm font-medium">Antrasit (RAL 7016)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Other product specifications... */}
                      {calculator.product === 'celik_hasir' && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Hasır Tipi</label>
                          <Select 
                            value={calculator.specifications.mesh_type} 
                            onValueChange={(value) => setCalculator(prev => ({
                              ...prev,
                              specifications: {
                                ...prev.specifications,
                                mesh_type: value
                              }
                            }))}
                          >
                            <SelectTrigger className="border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tam_oto">Tam Otomatik Schlatter</SelectItem>
                              <SelectItem value="yari_oto">Yarı Otomatik</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {calculator.product === 'tavli_tel' && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Tel Çapı (mm)</label>
                          <Select
                            value={calculator.specifications.diameter}
                            onValueChange={(value) => setCalculator(prev => ({
                              ...prev,
                              specifications: {
                                ...prev.specifications,
                                diameter: value
                              }
                            }))}
                          >
                            <SelectTrigger className="border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1.2">1.2mm (İnşaat Teli)</SelectItem>
                              <SelectItem value="3.5">3.5mm (Kalın Tel)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Enhanced Calculate Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={calculateProductionTime}
                    disabled={loading || !calculator.product || !calculator.quantity}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {loading && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                    <Clock className="mr-3 h-5 w-5" />
                    Üretim Süresini Hesapla
                  </Button>
                </div>

                {/* Enhanced Results Display */}
                {calculator.result && (
                  <div className="mt-8 space-y-6">
                    <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                        <CardTitle className="flex items-center space-x-3">
                          <CheckCircle className="h-6 w-6" />
                          <span>Hesaplama Sonuçları</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white rounded-xl p-6 text-center shadow-lg border border-blue-100">
                            <div className="text-3xl font-bold text-blue-600 mb-2">
                              {formatDuration(calculator.result.total_time_hours)}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Toplam Üretim Süresi</div>
                          </div>
                          
                          <div className="bg-white rounded-xl p-6 text-center shadow-lg border border-purple-100">
                            <div className="text-3xl font-bold text-purple-600 mb-2">
                              {calculator.result.critical_path?.line?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Kritik Üretim Hattı</div>
                          </div>
                          
                          <div className="bg-white rounded-xl p-6 text-center shadow-lg border border-orange-100">
                            <div className="text-3xl font-bold text-orange-600 mb-2">
                              {calculator.result.bottlenecks?.length || 0}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">Tespit Edilen Darboğaz</div>
                          </div>
                        </div>

                        {/* Production Line Breakdown */}
                        {calculator.result.line_breakdown && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                              <TrendingUp className="h-5 w-5 text-blue-600" />
                              <span>Hat Bazlı Detay Analiz</span>
                            </h4>
                            <div className="space-y-3">
                              {calculator.result.line_breakdown.map((line, index) => (
                                <div key={index} className="bg-white rounded-lg p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="font-semibold text-gray-800 capitalize">
                                      {line.line.replace(/_/g, ' ')}
                                    </span>
                                    <div className="flex items-center space-x-3">
                                      <span className="text-sm font-medium text-blue-600">
                                        {formatDuration(line.time_hours)}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {line.capacity_utilization.toFixed(0)}% Kapasite
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500" 
                                      style={{ width: `${Math.min(line.capacity_utilization, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Bottlenecks */}
                        {calculator.result.bottlenecks && calculator.result.bottlenecks.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                              <span>Tespit Edilen Darboğazlar</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {calculator.result.bottlenecks.map((bottleneck, index) => (
                                <div key={index} className="bg-white rounded-lg p-3 border-l-4 border-l-red-500 shadow-sm">
                                  <Badge variant="outline" className={`${getBottleneckColor(bottleneck)} text-xs`}>
                                    {bottleneck.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs content would continue here... */}
          <TabsContent value="optimizer" className="mt-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-3">
                  <Target className="h-6 w-6" />
                  <span>Üretim Planı Optimizasyonu</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Plan Optimizasyonu</h3>
                  <p className="text-gray-500">
                    Çoklu sipariş optimizasyonu özelliği yakında eklenecek...
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Factory Status Overview */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-3">
                    <Factory className="h-6 w-6" />
                    <span>Fabrika Durumu</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {capacityData?.production_lines ? (
                    <div className="space-y-4">
                      {Object.entries(capacityData.production_lines).slice(0, 4).map(([lineName, data]) => (
                        <div key={lineName} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold capitalize text-gray-800">
                              {lineName.replace(/_/g, ' ')}
                            </h4>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {data.shifts || 1} Vardiya
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {data.machines && (
                              <div className="flex items-center space-x-2">
                                <Gauge className="h-4 w-4 text-blue-500" />
                                <span className="text-gray-600">Makine:</span>
                                <span className="font-medium">{data.machines}</span>
                              </div>
                            )}
                            {data.workers && (
                              <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-green-500" />
                                <span className="text-gray-600">İşçi:</span>
                                <span className="font-medium">{data.workers}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">Fabrika durumu yükleniyor...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Capacity Overview */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center space-x-3">
                    <BarChart3 className="h-6 w-6" />
                    <span>Kapasite Durumu</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Kapasite Analizi</h3>
                    <p className="text-gray-500">
                      Detaylı kapasite analizi yakında eklenecek...
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedules" className="mt-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center space-x-3">
                  <Settings className="h-6 w-6" />
                  <span>Kayıtlı Üretim Planları</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Üretim Planları</h3>
                  <p className="text-gray-500">
                    Henüz kayıtlı plan bulunmuyor...
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enhanced Error Display */}
        {error && (
          <Card className="mt-6 border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 text-red-800">
                <XCircle className="h-6 w-6" />
                <div>
                  <span className="font-semibold">Hata Oluştu</span>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 border-red-300 text-red-700 hover:bg-red-50" 
                onClick={() => setError(null)}
              >
                Kapat
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}