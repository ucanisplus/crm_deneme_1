// Albayrak Demir Çelik APS (Advanced Planning & Scheduling) System
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Loader2, Clock, Factory, AlertCircle, Target, BarChart3, Zap, Settings, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AlbayrakAPSSystem() {
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
      input_diameter: '',
      output_diameter: '',
      panel_type: 'double',
      height: '',
      mesh_type: 'yari_oto',
      diameter: ''
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
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // Gerçek fabrika ürünlerine dayalı ürün tipleri
  const productTypes = [
    { value: 'galvanizli_tel', label: 'Galvanizli Tel', routing: ['tel_cekme', 'galvaniz'] },
    { value: 'panel_cit_yesil', label: 'Panel Çit Yeşil', routing: ['tel_cekme', 'galvaniz', 'panel_cit'] },
    { value: 'panel_cit_antrasit', label: 'Panel Çit Antrasit', routing: ['tel_cekme', 'galvaniz', 'panel_cit'] },
    { value: 'celik_hasir', label: 'Çelik Hasır', routing: ['tel_cekme', 'celik_hasir'] },
    { value: 'civi', label: 'Çivi', routing: ['tel_cekme', 'civi'] },
    { value: 'tavli_tel', label: 'Tavlı Tel', routing: ['tel_cekme', 'tavli_tel'] },
    { value: 'balya_teli', label: 'Balya Teli', routing: ['tel_cekme', 'tavli_tel'] },
    { value: 'profil_kesim', label: 'Profil Kesim', routing: ['profil'] }
  ];

  const priorityLevels = [
    { value: 1, label: 'Normal', color: 'bg-gray-100 text-gray-800' },
    { value: 2, label: 'Yüksek', color: 'bg-yellow-100 text-yellow-800' },
    { value: 3, label: 'Acil', color: 'bg-orange-100 text-orange-800' },
    { value: 4, label: 'Patron Önceliği', color: 'bg-red-100 text-red-800' }
  ];

  // API Konfigürasyonu - APS için Render backend kullan
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

  // Mount sırasında fabrika durumu ve kapasite verilerini yükle
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

  // Üretim Süresi Hesaplayıcı Fonksiyonları
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

  // Çizelge Optimize Edici Fonksiyonları
  const addOrder = () => {
    const newOrder = {
      id: Date.now(),
      product: '',
      quantity: '',
      priority: 1,
      specifications: {}
    };
    
    setOptimizer(prev => ({
      ...prev,
      orders: [...prev.orders, newOrder]
    }));
  };

  const removeOrder = (orderId) => {
    setOptimizer(prev => ({
      ...prev,
      orders: prev.orders.filter(order => order.id !== orderId)
    }));
  };

  const updateOrder = (orderId, field, value) => {
    setOptimizer(prev => ({
      ...prev,
      orders: prev.orders.map(order => 
        order.id === orderId 
          ? { ...order, [field]: value }
          : order
      )
    }));
  };

  const optimizeSchedule = async () => {
    const validOrders = optimizer.orders.filter(order => order.product && order.quantity);
    
    if (validOrders.length === 0) {
      setError('En az bir geçerli sipariş gereklidir');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await makeAPICall('/optimize-schedule', {
        method: 'POST',
        body: JSON.stringify({
          orders: validOrders.map(order => ({
            product: order.product,
            quantity: parseFloat(order.quantity),
            priority: order.priority,
            specifications: order.specifications
          }))
        })
      });

      setOptimizer(prev => ({ ...prev, result: result.optimization_result }));
      toast.success('Üretim planı optimize edildi!');
    } catch (error) {
      setError(`Optimizasyon hatası: ${error.message}`);
      toast.error('Üretim planı optimize edilemedi');
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    if (!optimizer.scheduleName || !optimizer.result) {
      toast.error('Plan adı ve optimize edilmiş plan gereklidir');
      return;
    }

    try {
      setLoading(true);
      const result = await makeAPICall('/create-schedule', {
        method: 'POST',
        body: JSON.stringify({
          schedule_name: optimizer.scheduleName,
          orders: optimizer.orders.filter(order => order.product && order.quantity),
          target_completion_date: optimizer.targetDate || null,
          created_by: user?.username || 'system'
        })
      });

      toast.success('Üretim planı kaydedildi!');
      loadSavedSchedules();
      setOptimizer(prev => ({ ...prev, scheduleName: '', targetDate: '' }));
    } catch (error) {
      toast.error(`Plan kaydetme hatası: ${error.message}`);
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
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center space-x-3">
          <Factory className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Albayrak Demir Çelik APS Sistemi</h1>
            <p className="text-blue-100">İleri Planlama ve Çizelgeleme Sistemi</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Süre Hesaplama</span>
          </TabsTrigger>
          <TabsTrigger value="optimizer" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Plan Optimizasyonu</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Fabrika Durumu</span>
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Kayıtlı Planlar</span>
          </TabsTrigger>
        </TabsList>

        {/* Production Time Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Üretim Süresi Hesaplayıcı</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ürün Tipi *</label>
                  <Select value={calculator.product} onValueChange={(value) => 
                    setCalculator(prev => ({ ...prev, product: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Ürün tipi seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypes.map(product => (
                        <SelectItem key={product.value} value={product.value}>
                          {product.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Miktar (kg) *</label>
                  <Input
                    type="number"
                    placeholder="Üretim miktarı"
                    value={calculator.quantity}
                    onChange={(e) => setCalculator(prev => ({ 
                      ...prev, 
                      quantity: e.target.value 
                    }))}
                  />
                </div>
              </div>

              {/* Specifications based on product type */}
              {calculator.product && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="font-medium mb-3">Ürün Özellikleri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Tel Çekme specifications */}
                    {(['galvanizli_tel', 'panel_cit_yesil', 'panel_cit_antrasit', 'celik_hasir', 'civi', 'tavli_tel'].includes(calculator.product)) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Giriş Çapı (mm)</label>
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
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Çıkış Çapı (mm)</label>
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
                          />
                        </div>
                        
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={calculateTLCSpeed}
                            disabled={loading}
                            className="w-full"
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            TLC Hızı Hesapla
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Panel Çit specifications */}
                    {(calculator.product === 'panel_cit_yesil' || calculator.product === 'panel_cit_antrasit') && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Panel Tipi</label>
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
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="double">Double</SelectItem>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="guvenlik">Güvenlik</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Yükseklik (mm)</label>
                          <Input
                            type="number"
                            placeholder="Panel yüksekliği"
                            value={calculator.specifications.height}
                            onChange={(e) => setCalculator(prev => ({
                              ...prev,
                              specifications: {
                                ...prev.specifications,
                                height: e.target.value
                              }
                            }))}
                          />
                        </div>
                      </>
                    )}

                    {/* Çelik Hasır specifications */}
                    {calculator.product === 'celik_hasir' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Hasır Tipi</label>
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tam_oto">Tam Otomatik</SelectItem>
                            <SelectItem value="yari_oto">Yarı Otomatik</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Tavlı Tel specifications */}
                    {calculator.product === 'tavli_tel' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Tel Çapı (mm)</label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="1.2 veya 3.5"
                          value={calculator.specifications.diameter}
                          onChange={(e) => setCalculator(prev => ({
                            ...prev,
                            specifications: {
                              ...prev.specifications,
                              diameter: e.target.value
                            }
                          }))}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Calculate Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={calculateProductionTime}
                  disabled={loading}
                  className="w-full md:w-auto px-8 py-2"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Üretim Süresini Hesapla
                </Button>
              </div>

              {/* Results */}
              {calculator.result && (
                <div className="mt-6 space-y-4">
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-800 flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5" />
                        <span>Hesaplama Sonuçları</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatDuration(calculator.result.total_time_hours)}
                          </div>
                          <div className="text-sm text-gray-600">Toplam Süre</div>
                        </div>
                        
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-purple-600">
                            {calculator.result.critical_path?.line || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">Kritik Hat</div>
                        </div>
                        
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-orange-600">
                            {calculator.result.bottlenecks?.length || 0}
                          </div>
                          <div className="text-sm text-gray-600">Darboğaz Sayısı</div>
                        </div>
                      </div>

                      {/* Production Line Breakdown */}
                      {calculator.result.line_breakdown && (
                        <div>
                          <h4 className="font-medium mb-2">Hat Bazlı Analiz</h4>
                          <div className="space-y-2">
                            {calculator.result.line_breakdown.map((line, index) => (
                              <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                                <span className="font-medium">{line.line}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm">{formatDuration(line.time_hours)}</span>
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full" 
                                      style={{ width: `${Math.min(line.capacity_utilization, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500">{line.capacity_utilization.toFixed(0)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bottlenecks */}
                      {calculator.result.bottlenecks && calculator.result.bottlenecks.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Tespit Edilen Darboğazlar</h4>
                          <div className="flex flex-wrap gap-2">
                            {calculator.result.bottlenecks.map((bottleneck, index) => (
                              <Badge key={index} variant="outline" className={getBottleneckColor(bottleneck)}>
                                {bottleneck.replace(/_/g, ' ')}
                              </Badge>
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

        {/* Schedule Optimizer Tab */}
        <TabsContent value="optimizer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Üretim Planı Optimizasyonu</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schedule Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Plan Adı</label>
                  <Input
                    placeholder="Üretim planı adı"
                    value={optimizer.scheduleName}
                    onChange={(e) => setOptimizer(prev => ({
                      ...prev,
                      scheduleName: e.target.value
                    }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Hedef Tarih</label>
                  <Input
                    type="datetime-local"
                    value={optimizer.targetDate}
                    onChange={(e) => setOptimizer(prev => ({
                      ...prev,
                      targetDate: e.target.value
                    }))}
                  />
                </div>
              </div>

              {/* Orders */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Siparişler</h3>
                  <Button onClick={addOrder} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Sipariş Ekle
                  </Button>
                </div>

                <div className="space-y-4">
                  {optimizer.orders.map((order, index) => (
                    <Card key={order.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Ürün Tipi</label>
                            <Select 
                              value={order.product} 
                              onValueChange={(value) => updateOrder(order.id, 'product', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Ürün seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                {productTypes.map(product => (
                                  <SelectItem key={product.value} value={product.value}>
                                    {product.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Miktar (kg)</label>
                            <Input
                              type="number"
                              placeholder="Miktar"
                              value={order.quantity}
                              onChange={(e) => updateOrder(order.id, 'quantity', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Öncelik</label>
                            <Select 
                              value={order.priority.toString()} 
                              onValueChange={(value) => updateOrder(order.id, 'priority', parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {priorityLevels.map(priority => (
                                  <SelectItem key={priority.value} value={priority.value.toString()}>
                                    {priority.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeOrder(order.id)}
                              disabled={optimizer.orders.length === 1}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Optimize Button */}
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={optimizeSchedule}
                  disabled={loading}
                  size="lg"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Planı Optimize Et
                </Button>
                
                {optimizer.result && (
                  <Button
                    onClick={saveSchedule}
                    disabled={loading || !optimizer.scheduleName}
                    variant="outline"
                    size="lg"
                  >
                    Planı Kaydet
                  </Button>
                )}
              </div>

              {/* Optimization Results */}
              {optimizer.result && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="text-purple-800 flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5" />
                      <span>Optimize Edilmiş Plan</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-purple-600">
                          {formatDuration(optimizer.result.total_makespan_hours || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Toplam Süre</div>
                      </div>
                      
                      <div className="text-center p-4 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-green-600">
                          {optimizer.result.solver_status || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">Çözüm Durumu</div>
                      </div>
                      
                      <div className="text-center p-4 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">
                          {optimizer.result.schedule?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600">Toplam Sipariş</div>
                      </div>
                    </div>

                    {/* Schedule Timeline */}
                    {optimizer.result.schedule && (
                      <div>
                        <h4 className="font-medium mb-3">Üretim Çizelgesi</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {optimizer.result.schedule.map((item, index) => {
                            const productInfo = getProductInfo(item.product);
                            const priorityInfo = getPriorityInfo(item.priority);
                            
                            return (
                              <div key={index} className="p-3 bg-white rounded-lg border hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                      Sıra {index + 1}
                                    </Badge>
                                    <Badge className={priorityInfo.color}>
                                      {priorityInfo.label}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {formatDuration(item.duration_hours)}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="font-medium">{productInfo.label}</span>
                                    <span className="text-gray-500 ml-2">{item.quantity} kg</span>
                                  </div>
                                  <div className="text-gray-600">
                                    {item.start_time_hours.toFixed(1)}h - {item.end_time_hours.toFixed(1)}h
                                  </div>
                                </div>
                                
                                {item.bottlenecks && item.bottlenecks.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {item.bottlenecks.map((bottleneck, bIndex) => (
                                      <Badge 
                                        key={bIndex} 
                                        variant="outline" 
                                        className={`text-xs ${getBottleneckColor(bottleneck)}`}
                                      >
                                        {bottleneck.replace(/_/g, ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottleneck Analysis */}
                    {optimizer.result.bottleneck_analysis && (
                      <div>
                        <h4 className="font-medium mb-3">Darboğaz Analizi</h4>
                        <div className="bg-white rounded-lg border p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-2">Kritik Darboğazlar</div>
                              {optimizer.result.bottleneck_analysis.critical_bottlenecks && 
                               Object.entries(optimizer.result.bottleneck_analysis.critical_bottlenecks).map(([name, data], index) => (
                                <div key={index} className="flex justify-between items-center py-1">
                                  <span className="text-sm">{name.replace(/_/g, ' ')}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {data.count} sipariş
                                  </Badge>
                                </div>
                              ))}
                            </div>
                            
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-2">Öneriler</div>
                              {optimizer.result.bottleneck_analysis.recommendations?.slice(0, 3).map((rec, index) => (
                                <div key={index} className="text-xs text-gray-600 mb-1">
                                  • {rec.action}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Factory Status Tab */}
        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Capacity Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Hat Kapasiteleri</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {capacityData?.production_lines ? (
                  <div className="space-y-4">
                    {Object.entries(capacityData.production_lines).map(([lineName, data]) => (
                      <div key={lineName} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium capitalize">{lineName.replace(/_/g, ' ')}</h4>
                          <Badge variant="outline">
                            {data.shifts || 1} vardiya
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {data.machines && (
                            <div>
                              <span className="text-gray-600">Makine: </span>
                              <span className="font-medium">{data.machines}</span>
                            </div>
                          )}
                          {data.heads && (
                            <div>
                              <span className="text-gray-600">Kafa: </span>
                              <span className="font-medium">{data.heads}</span>
                            </div>
                          )}
                          {data.workers && (
                            <div>
                              <span className="text-gray-600">İşçi: </span>
                              <span className="font-medium">{data.workers}</span>
                            </div>
                          )}
                          {data.capacity_kg_hour && (
                            <div>
                              <span className="text-gray-600">Kapasite: </span>
                              <span className="font-medium">{data.capacity_kg_hour} kg/h</span>
                            </div>
                          )}
                        </div>
                        
                        {data.bottlenecks && data.bottlenecks.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {data.bottlenecks.map((bottleneck, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className={`text-xs ${getBottleneckColor(bottleneck)}`}
                              >
                                {bottleneck.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Kapasite verileri yükleniyor...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Factory Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Factory className="h-5 w-5" />
                  <span>Fabrika Durumu</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {factoryStatus ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {Object.keys(factoryStatus.factory_status?.production_lines || {}).length}
                        </div>
                        <div className="text-xs text-green-600">Aktif Hat</div>
                      </div>
                      
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {factoryStatus.factory_status?.current_bottlenecks?.length || 0}
                        </div>
                        <div className="text-xs text-red-600">Kritik Darboğaz</div>
                      </div>
                    </div>

                    {factoryStatus.factory_status?.current_bottlenecks && (
                      <div>
                        <h4 className="font-medium mb-2">Mevcut Darboğazlar</h4>
                        <div className="space-y-2">
                          {factoryStatus.factory_status.current_bottlenecks.map((bottleneck, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                              <span className="text-sm font-medium">{bottleneck.replace(/_/g, ' ')}</span>
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {factoryStatus.factory_status?.recommendations && (
                      <div>
                        <h4 className="font-medium mb-2">Öneriler</h4>
                        <div className="space-y-1">
                          {factoryStatus.factory_status.recommendations.slice(0, 5).map((rec, index) => (
                            <div key={index} className="text-xs text-gray-600 p-2 bg-blue-50 border border-blue-200 rounded">
                              • {rec.action}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <Button 
                        onClick={loadFactoryStatus} 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        disabled={loading}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Durumu Yenile
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Fabrika durumu yükleniyor...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Saved Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Kayıtlı Üretim Planları</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedSchedules.length > 0 ? (
                <div className="space-y-4">
                  {savedSchedules.map((schedule) => (
                    <Card key={schedule.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{schedule.schedule_name}</h4>
                            <p className="text-sm text-gray-600">
                              {new Date(schedule.created_at).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-1">
                              {schedule.solver_status}
                            </Badge>
                            <div className="text-sm text-gray-600">
                              {formatDuration(schedule.total_makespan_hours || 0)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Oluşturan: </span>
                            <span>{schedule.created_by}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Öncelik: </span>
                            <span>{schedule.priority_level}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Durum: </span>
                            <span className="capitalize">{schedule.status}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Hedef: </span>
                            <span>
                              {schedule.target_completion_date 
                                ? new Date(schedule.target_completion_date).toLocaleDateString('tr-TR')
                                : 'Belirsiz'
                              }
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Henüz kayıtlı plan bulunmuyor</p>
                  <p className="text-sm">Optimizer sekmesinden yeni planlar oluşturabilirsiniz</p>
                </div>
              )}
              
              {user?.username && (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={loadSavedSchedules} 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Planları Yenile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-800">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Hata</span>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3" 
              onClick={() => setError(null)}
            >
              Kapat
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}