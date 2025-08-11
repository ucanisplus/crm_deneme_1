// Production Time Calculator Component - Uses hybrid API for OR-Tools calculations
'use client';

import { useState } from 'react';
import { calculateProductionTime, getMachineCapacity } from '../api-config-hybrid';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, Clock, Factory, AlertCircle } from 'lucide-react';

export default function ProductionTimeCalculator() {
  const [formData, setFormData] = useState({
    product: '',
    quantity: '',
    diameter: '',
    specifications: {
      width: '',
      height: '',
      color: '',
      coating: 'pad'
    }
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [capacityData, setCapacityData] = useState(null);

  const productTypes = [
    { value: 'galvanizli_tel', label: 'Galvanizli Tel' },
    { value: 'panel_cit_beyaz', label: 'Panel Çit Beyaz' },
    { value: 'panel_cit_yesil', label: 'Panel Çit Yeşil' },
    { value: 'panel_cit_gri', label: 'Panel Çit Gri' },
    { value: 'celik_hasir', label: 'Çelik Hasır' },
    { value: 'civi', label: 'Çivi' },
    { value: 'tavli_tel', label: 'Tavlı Tel' },
    { value: 'balya_teli', label: 'Balya Teli' }
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const calculateTime = async () => {
    if (!formData.product || !formData.quantity) {
      setError('Ürün tipi ve miktar zorunludur');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Calculating production time...', formData);
      
      // Show user we might be waking up server
      if (!result) {
        setError('Sunucu başlatılıyor, lütfen 15-20 saniye bekleyin...');
      }
      
      const response = await calculateProductionTime({
        product: formData.product,
        quantity: parseFloat(formData.quantity),
        diameter: parseFloat(formData.diameter) || null,
        specifications: formData.specifications
      });

      if (response.success) {
        setResult(response);
        setError(null);
        console.log('✅ Production time calculated:', response);
      } else {
        throw new Error(response.error || 'Calculation failed');
      }
    } catch (err) {
      console.error('❌ Production calculation error:', err);
      setError(err.message || 'Hesaplama hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadCapacityData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading capacity data...');
      
      const response = await getMachineCapacity();
      
      if (response.success) {
        setCapacityData(response.capacity);
        console.log('✅ Capacity data loaded:', response.capacity);
      } else {
        throw new Error(response.error || 'Failed to load capacity');
      }
    } catch (err) {
      console.error('❌ Capacity loading error:', err);
      setError(err.message || 'Kapasite verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🏭 Üretim Süresi Hesaplama
        </h1>
        <p className="text-gray-600">
          Ürün özelliklerini girin ve tahmini üretim süresini öğrenin
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5" />
              Ürün Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Ürün Tipi *
              </label>
              <Select 
                value={formData.product} 
                onValueChange={(value) => handleInputChange('product', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ürün tipini seçin" />
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

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Miktar (kg) *
              </label>
              <Input
                type="number"
                placeholder="Örn: 5000"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
              />
            </div>

            {/* Diameter */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Tel Çapı (mm)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="Örn: 4.5"
                value={formData.diameter}
                onChange={(e) => handleInputChange('diameter', e.target.value)}
              />
            </div>

            {/* Panel specifications (conditional) */}
            {formData.product.includes('panel') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Genişlik (mm)
                    </label>
                    <Input
                      type="number"
                      placeholder="123"
                      value={formData.specifications.width}
                      onChange={(e) => handleInputChange('specifications.width', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Yükseklik (mm)
                    </label>
                    <Input
                      type="number"
                      placeholder="250"
                      value={formData.specifications.height}
                      onChange={(e) => handleInputChange('specifications.height', e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Renk
                  </label>
                  <Select 
                    value={formData.specifications.color} 
                    onValueChange={(value) => handleInputChange('specifications.color', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Renk seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beyaz">Beyaz</SelectItem>
                      <SelectItem value="gri">Gri</SelectItem>
                      <SelectItem value="yesil">Yeşil</SelectItem>
                      <SelectItem value="siyah">Siyah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={calculateTime} 
                disabled={loading || !formData.product || !formData.quantity}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 mr-2" />
                )}
                Üretim Süresini Hesapla
              </Button>
              
              <Button 
                variant="outline" 
                onClick={loadCapacityData}
                disabled={loading}
              >
                Kapasite Görüntüle
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Production Time Result */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">
                  ✅ Üretim Süresi Hesaplandı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Tahmini Süre</div>
                      <div className="text-2xl font-bold">
                        {result.estimatedTime.toFixed(1)} saat
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Hazır Olma Tarihi</div>
                      <div className="text-lg font-semibold">
                        {new Date(result.readyDate).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  </div>

                  {result.routing && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Üretim Rotası</div>
                      <div className="flex flex-wrap gap-2">
                        {result.routing.map((step, index) => (
                          <div key={index} className="flex items-center">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                              {step}
                            </span>
                            {index < result.routing.length - 1 && (
                              <span className="mx-2 text-gray-400">→</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Capacity Data */}
          {capacityData && (
            <Card>
              <CardHeader>
                <CardTitle>📊 Makine Kapasiteleri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(capacityData).map(([department, machines]) => (
                    <div key={department}>
                      <div className="font-semibold mb-2 capitalize">
                        {department.replace('_', ' ')}
                      </div>
                      <div className="grid gap-2">
                        {Object.entries(machines).map(([machine, data]) => (
                          <div key={machine} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-medium">{machine}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600">
                                {data.capacity} kg/saat
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-gray-200 rounded">
                                  <div 
                                    className={`h-full rounded ${
                                      data.current_load > 80 ? 'bg-red-500' :
                                      data.current_load > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${data.current_load}%` }}
                                  />
                                </div>
                                <span className="text-sm">%{data.current_load}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}