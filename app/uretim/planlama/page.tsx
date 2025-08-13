"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Settings, Play, Pause, AlertTriangle, CheckCircle, Plus, Filter, Search, BarChart3, Calendar, Package, Users, Zap, Clock, Move, Eye, Target } from 'lucide-react';
import { API_URLS } from '@/api-config';

// Galvaniz Line Planning Component with 36 Kafas
const GalvanizLinePlanning = () => {
  const [selectedKafa, setSelectedKafa] = useState(null);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState(null);

  // Generate 36 kafas with mock data
  const kafas = Array.from({ length: 36 }, (_, i) => ({
    id: i + 1,
    name: `Kafa ${i + 1}`,
    status: ['running', 'idle', 'maintenance'][Math.floor(Math.random() * 3)],
    currentOrder: Math.random() > 0.6 ? `GT-2024-${String(i + 100).padStart(3, '0')}` : null,
    queue: Math.random() > 0.7 ? [
      { id: `order-${i}-1`, product: 'Galvanizli Tel 3mm', quantity: 500, estimatedTime: 120 },
      { id: `order-${i}-2`, product: 'Galvanizli Tel 2.5mm', quantity: 300, estimatedTime: 90 }
    ] : [],
    efficiency: Math.floor(Math.random() * 40) + 60
  }));

  const globalOrderQueue = [
    { id: 'global-1', product: 'Galvanizli Tel 2mm', quantity: 1000, priority: 'high', estimatedTime: 180 },
    { id: 'global-2', product: 'Galvanizli Tel 3.5mm', quantity: 750, priority: 'medium', estimatedTime: 160 },
    { id: 'global-3', product: 'Galvanizli Tel 2.5mm', quantity: 500, priority: 'low', estimatedTime: 120 }
  ];

  const handleDragStart = (e, order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, kafaId) => {
    e.preventDefault();
    if (draggedOrder) {
      // Here we would call OR-Tools to optimize the placement
      console.log(`Moving order ${draggedOrder.id} to Kafa ${kafaId}`);
      setDraggedOrder(null);
    }
  };

  const KafaCard = ({ kafa }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${selectedKafa?.id === kafa.id ? 'ring-2 ring-blue-500' : ''}`}
      onClick={() => setSelectedKafa(kafa)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, kafa.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">{kafa.name}</h4>
          <Badge 
            className={
              kafa.status === 'running' ? 'bg-green-500' :
              kafa.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
            }
          >
            {kafa.status === 'running' ? 'Çalışıyor' : 
             kafa.status === 'idle' ? 'Boş' : 'Bakım'}
          </Badge>
        </div>
        
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Verimlilik:</span>
            <span className={kafa.efficiency > 80 ? 'text-green-600' : 'text-yellow-600'}>
              {kafa.efficiency}%
            </span>
          </div>
          
          {kafa.currentOrder && (
            <div className="flex justify-between">
              <span>Mevcut:</span>
              <span className="font-mono text-xs">{kafa.currentOrder}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Kuyruk:</span>
            <span>{kafa.queue.length} sipariş</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Kafas Grid - Left Side */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>⚗️</span>
              <span>Galvaniz Kafaları (36 Adet)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-3">
              {kafas.map((kafa) => (
                <KafaCard key={kafa.id} kafa={kafa} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Queue and Selected Kafa Details - Right Side */}
      <div className="space-y-4">
        {/* Global Order Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sipariş Kuyruğu</span>
              <Button size="sm" onClick={() => setShowOrderDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Yeni
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {globalOrderQueue.map((order) => (
              <div
                key={order.id}
                draggable
                onDragStart={(e) => handleDragStart(e, order)}
                className="p-3 border rounded cursor-move hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{order.product}</span>
                  <Badge variant={order.priority === 'high' ? 'destructive' : order.priority === 'medium' ? 'default' : 'secondary'}>
                    {order.priority}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Miktar:</span>
                    <span>{order.quantity} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tahmini Süre:</span>
                    <span>{order.estimatedTime} dk</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Selected Kafa Details */}
        {selectedKafa && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>{selectedKafa.name} Detayları</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Durum:</span>
                  <Badge className={
                    selectedKafa.status === 'running' ? 'bg-green-500' :
                    selectedKafa.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                  }>
                    {selectedKafa.status === 'running' ? 'Çalışıyor' : 
                     selectedKafa.status === 'idle' ? 'Boş' : 'Bakım'}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span>Verimlilik:</span>
                  <span>{selectedKafa.efficiency}%</span>
                </div>

                {selectedKafa.currentOrder && (
                  <div>
                    <h4 className="font-semibold mb-2">Mevcut Sipariş</h4>
                    <div className="p-2 bg-blue-50 rounded text-sm">
                      {selectedKafa.currentOrder}
                    </div>
                  </div>
                )}

                {selectedKafa.queue.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Kuyruktaki Siparişler</h4>
                    <div className="space-y-2">
                      {selectedKafa.queue.map((order) => (
                        <div key={order.id} className="p-2 border rounded text-sm">
                          <div className="font-medium">{order.product}</div>
                          <div className="text-gray-600">
                            {order.quantity} kg - {order.estimatedTime} dk
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Panel Çit Line Planning Component - Painting Bottleneck Focus
const PanelCitLinePlanning = () => {
  const [orderQueue, setOrderQueue] = useState([
    { id: 'pc-1', type: 'Double Panel', height: 173, width: 250, color: 'RAL 6005 (Yeşil)', quantity: 100, priority: 'high', estimatedTime: 280 },
    { id: 'pc-2', type: 'Single Panel', height: 203, width: 250, color: 'RAL 7016 (Antrasit)', quantity: 150, priority: 'medium', estimatedTime: 180 },
    { id: 'pc-3', type: 'Double Panel', height: 123, width: 250, color: 'RAL 6005 (Yeşil)', quantity: 75, priority: 'low', estimatedTime: 210 }
  ]);

  const paintingLineStatus = {
    currentOrder: 'pc-1',
    remainingTime: 45, // minutes
    efficiency: 85,
    status: 'running',
    bottleneckInfo: {
      speed: '1 metre/70 saniye',
      dailyCapacity: '500 Double Panel veya 800 Single Panel',
      currentBottleneck: true
    }
  };

  const OrderCard = ({ order, isActive = false, isDraggable = true }) => (
    <Card className={`transition-all ${isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'} ${isDraggable ? 'cursor-move' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">{order.type}</h4>
          <Badge variant={order.priority === 'high' ? 'destructive' : order.priority === 'medium' ? 'default' : 'secondary'}>
            {order.priority}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div>Boyut: {order.height}x{order.width}</div>
          <div>Miktar: {order.quantity} adet</div>
          <div className="col-span-2">Renk: {order.color}</div>
          <div>Tahmini Süre: {order.estimatedTime} dk</div>
          <div className={isActive ? 'text-blue-600 font-semibold' : ''}>
            {isActive ? `Kalan: ${paintingLineStatus.remainingTime} dk` : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Painting Line Visualization */}
      <div className="lg:col-span-2">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-red-500" />
              <span>Boyama Hattı - Ana Darboğaz</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-6 rounded-lg">
              {/* Visual representation of painting line */}
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="bg-white border-2 border-dashed border-gray-400 p-4 rounded text-center">
                    <span className="text-gray-600">Panel Hazırlama</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className={`border-2 p-4 rounded text-center ${paintingLineStatus.status === 'running' ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'}`}>
                    <div className="font-bold text-lg">🎨 BOYAMA</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {paintingLineStatus.bottleneckInfo.speed}
                    </div>
                    {paintingLineStatus.currentOrder && (
                      <div className="text-xs mt-2 font-mono">
                        Mevcut: {paintingLineStatus.currentOrder}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="bg-white border-2 border-dashed border-gray-400 p-4 rounded text-center">
                    <span className="text-gray-600">Kurutma & Paketleme</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-700">Operatör</div>
                  <div>7 kişi</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">Darboğaz Kapasitesi</div>
                  <div>{paintingLineStatus.bottleneckInfo.dailyCapacity}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">Mevcut Verimlilik</div>
                  <div>{paintingLineStatus.efficiency}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Order Details */}
        {paintingLineStatus.currentOrder && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-4 w-4 text-green-500" />
                <span>Şu Anda İşleniyor</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderQueue
                .filter(order => order.id === paintingLineStatus.currentOrder)
                .map(order => (
                  <OrderCard key={order.id} order={order} isActive={true} isDraggable={false} />
                ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Queue */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sipariş Kuyruğu</span>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Yeni Panel
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderQueue
              .filter(order => order.id !== paintingLineStatus.currentOrder)
              .map((order, index) => (
                <div key={order.id} className="relative">
                  <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    #{index + 1}
                  </div>
                  <OrderCard order={order} />
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Setup Time Information */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Setup Süreleri</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Aynı tip panel:</span>
                <span>70 saniye</span>
              </div>
              <div className="flex justify-between">
                <span>Farklı tip panel:</span>
                <span>300 saniye</span>
              </div>
              <div className="flex justify-between">
                <span>Renk değişimi:</span>
                <span>1080 saniye</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Tel Çekme Line Planning Component - TLC_Hızlar Integration
const TelCekmeLinePlanning = () => {
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [tlcCalculator, setTlcCalculator] = useState({ inputDiameter: '', outputDiameter: '', calculatedSpeed: null });

  // 9 Tel Çekme machines
  const machines = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    name: `TC${i + 1}`,
    status: ['running', 'idle', 'setup'][Math.floor(Math.random() * 3)],
    currentOrder: Math.random() > 0.5 ? {
      id: `TC-2024-${String(i + 50).padStart(3, '0')}`,
      inputDiameter: [5, 6, 7, 8][Math.floor(Math.random() * 4)],
      outputDiameter: [1.25, 1.4, 1.6, 2, 2.5, 3][Math.floor(Math.random() * 6)],
      quantity: Math.floor(Math.random() * 1000) + 500,
      progress: Math.floor(Math.random() * 100)
    } : null,
    efficiency: Math.floor(Math.random() * 30) + 70
  }));

  const calculateTLCSpeed = async () => {
    if (tlcCalculator.inputDiameter && tlcCalculator.outputDiameter) {
      try {
        const response = await fetch(API_URLS.apsCalculateTime.replace('/calculate-time', '/calculate-tlc'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_diameter: tlcCalculator.inputDiameter,
            output_diameter: tlcCalculator.outputDiameter
          })
        });
        const data = await response.json();
        setTlcCalculator(prev => ({ ...prev, calculatedSpeed: data.speed }));
      } catch (error) {
        console.error('TLC calculation failed:', error);
      }
    }
  };

  const MachineCard = ({ machine }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${selectedMachine?.id === machine.id ? 'ring-2 ring-blue-500' : ''}`}
      onClick={() => setSelectedMachine(machine)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold">{machine.name}</h4>
          <Badge className={
            machine.status === 'running' ? 'bg-green-500' :
            machine.status === 'idle' ? 'bg-yellow-500' : 'bg-blue-500'
          }>
            {machine.status === 'running' ? 'Çalışıyor' : 
             machine.status === 'idle' ? 'Boş' : 'Setup'}
          </Badge>
        </div>
        
        {machine.currentOrder && (
          <div className="text-sm space-y-1">
            <div className="font-mono text-xs">{machine.currentOrder.id}</div>
            <div>
              {machine.currentOrder.inputDiameter}mm → {machine.currentOrder.outputDiameter}mm
            </div>
            <div>{machine.currentOrder.quantity} kg</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${machine.currentOrder.progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600">{machine.currentOrder.progress}% tamamlandı</div>
          </div>
        )}
        
        <div className="mt-2 text-sm text-gray-600">
          Verimlilik: {machine.efficiency}%
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Machines Grid */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🔧</span>
              <span>Tel Çekme Makineleri (9 Adet)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {machines.map((machine) => (
                <MachineCard key={machine.id} machine={machine} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TLC Calculator and Selected Machine Details */}
      <div className="space-y-4">
        {/* TLC Hızlar Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>TLC Hız Hesaplama</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Giriş Çapı (mm)</Label>
              <Input
                type="number"
                value={tlcCalculator.inputDiameter}
                onChange={(e) => setTlcCalculator(prev => ({ ...prev, inputDiameter: e.target.value }))}
                placeholder="5, 6, 7, 8"
              />
            </div>
            
            <div>
              <Label>Çıkış Çapı (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={tlcCalculator.outputDiameter}
                onChange={(e) => setTlcCalculator(prev => ({ ...prev, outputDiameter: e.target.value }))}
                placeholder="1.25, 1.4, 2.5, vb."
              />
            </div>
            
            <Button onClick={calculateTLCSpeed} className="w-full">
              Hızı Hesapla
            </Button>
            
            {tlcCalculator.calculatedSpeed && (
              <div className="p-3 bg-green-50 rounded">
                <div className="font-bold text-green-700">
                  {tlcCalculator.calculatedSpeed} kg/saat
                </div>
                <div className="text-sm text-green-600">
                  {tlcCalculator.inputDiameter}mm → {tlcCalculator.outputDiameter}mm
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Boş Makara Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>Boş Makara Durumu</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Mevcut Stok:</span>
                <span className="font-bold">150 adet</span>
              </div>
              <div className="flex justify-between">
                <span>Günlük İhtiyaç:</span>
                <span className="text-red-600 font-bold">35-40 adet</span>
              </div>
              <div className="flex justify-between">
                <span>Durum:</span>
                <Badge variant="destructive">Kritik Seviye</Badge>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Üretim kaybı: 1.5-2 saat/gün
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Machine Details */}
        {selectedMachine && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>{selectedMachine.name} Detayları</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Durum:</span>
                  <Badge className={
                    selectedMachine.status === 'running' ? 'bg-green-500' :
                    selectedMachine.status === 'idle' ? 'bg-yellow-500' : 'bg-blue-500'
                  }>
                    {selectedMachine.status === 'running' ? 'Çalışıyor' : 
                     selectedMachine.status === 'idle' ? 'Boş' : 'Setup'}
                  </Badge>
                </div>
                
                <div className="flex justify-between">
                  <span>Verimlilik:</span>
                  <span>{selectedMachine.efficiency}%</span>
                </div>

                {selectedMachine.currentOrder && (
                  <div>
                    <h4 className="font-semibold mb-2">Mevcut Sipariş</h4>
                    <div className="p-3 bg-blue-50 rounded text-sm space-y-1">
                      <div className="font-mono">{selectedMachine.currentOrder.id}</div>
                      <div>
                        Çap: {selectedMachine.currentOrder.inputDiameter}mm → {selectedMachine.currentOrder.outputDiameter}mm
                      </div>
                      <div>Miktar: {selectedMachine.currentOrder.quantity} kg</div>
                      <div>İlerleme: {selectedMachine.currentOrder.progress}%</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default function APSPlanlamaSistemi() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [factoryStatus, setFactoryStatus] = useState(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('today');
  const [selectedLine, setSelectedLine] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newOrderDialog, setNewOrderDialog] = useState(false);
  const [selectedLineForOrder, setSelectedLineForOrder] = useState('');
  const [stockData, setStockData] = useState({
    totalStock: 0,
    orderBoundStock: 0,
    details: []
  });

  // Production line configurations
  const productionLines = {
    tel_cekme: {
      name: 'Tel Çekme',
      machines: 9,
      operators: 4,
      color: 'bg-blue-500',
      icon: '🔧'
    },
    galvaniz: {
      name: 'Galvaniz',
      machines: 36, // kafas
      operators: 27,
      color: 'bg-green-500',
      icon: '⚗️'
    },
    panel_cit: {
      name: 'Panel Çit',
      machines: 1, // painting line
      operators: 7,
      color: 'bg-purple-500',
      icon: '🎨'
    },
    celik_hasir: {
      name: 'Çelik Hasır',
      machines: 4, // Schlatter, Eurobend, 2x Yarı Oto
      operators: 8,
      color: 'bg-yellow-500',
      icon: '🕸️'
    },
    civi: {
      name: 'Çivi',
      machines: 10, // 9 kesme + 1 parlatma
      operators: 10,
      color: 'bg-red-500',
      icon: '📎'
    },
    tavli_tel: {
      name: 'Tavlı Tel',
      machines: 1,
      operators: 2,
      color: 'bg-orange-500',
      icon: '🔥'
    },
    profil: {
      name: 'Profil',
      machines: 2, // kesme + kaynak
      operators: 1,
      color: 'bg-gray-500',
      icon: '📐'
    },
    palet: {
      name: 'Palet',
      machines: 1,
      operators: 1,
      color: 'bg-brown-500',
      icon: '📦'
    }
  };

  useEffect(() => {
    loadFactoryData();
    loadStockData();
  }, []);

  const loadFactoryData = async () => {
    try {
      const response = await fetch(API_URLS.apsTest.replace('/test', '/factory-status'));
      if (response.ok) {
        const data = await response.json();
        setFactoryStatus(data);
      }
    } catch (error) {
      console.error('Factory status load failed:', error);
    }
  };

  const loadStockData = () => {
    // Mock stock data - will be replaced with real data from Excel upload
    setStockData({
      totalStock: 245000, // kg
      orderBoundStock: 89000, // kg
      details: [
        { material: 'Çelik Tel 5mm', stock: 15000, reserved: 8000, unit: 'kg' },
        { material: 'Çinko', stock: 2500, reserved: 450, unit: 'kg' },
        { material: 'Panel Malzeme', stock: 850, reserved: 200, unit: 'adet' }
      ]
    });
  };

  const ProductionSummaryCard = ({ title, value, change, icon: Icon, color }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold">{value}</p>
              {change && (
                <Badge variant={change > 0 ? "default" : "destructive"} className="text-xs">
                  {change > 0 ? '+' : ''}{change}%
                </Badge>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const LineStatusBadge = ({ status }) => {
    const statusConfig = {
      running: { color: 'bg-green-500', text: 'Çalışıyor', icon: Play },
      idle: { color: 'bg-yellow-500', text: 'Beklemede', icon: Pause },
      maintenance: { color: 'bg-red-500', text: 'Bakım', icon: AlertTriangle }
    };
    
    const config = statusConfig[status] || statusConfig.idle;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const StockOverview = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Stok Durumu</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Toplam Stok</p>
            <p className="text-2xl font-bold text-blue-600">{stockData.totalStock.toLocaleString()} kg</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Siparişe Bağlı Stok</p>
            <p className="text-2xl font-bold text-orange-600">{stockData.orderBoundStock.toLocaleString()} kg</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-sm text-gray-600">Kullanılabilir Stok</p>
            <p className="text-2xl font-bold text-green-600">
              {(stockData.totalStock - stockData.orderBoundStock).toLocaleString()} kg
            </p>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Detaylar</h4>
          <div className="space-y-2">
            {stockData.details.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-2 border rounded">
                <span className="font-medium">{item.material}</span>
                <div className="text-right">
                  <span className="text-green-600">{item.stock.toLocaleString()}</span>
                  <span className="text-gray-400"> / </span>
                  <span className="text-orange-600">{item.reserved.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ExcelUploadSection = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Üretim Verisi Yükleme</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-semibold mb-2">Excel Dosyasını Yükleyin</p>
          <p className="text-gray-600 mb-4">
            Sistem otomatik olarak hangi sayfada hangi verilerin olduğunu algılayacak
          </p>
          {/* TODO: Will be replaced with actual Excel parsing logic */}
          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded mb-4">
            {/* Mock: System will parse sheets automatically:
                - Tel Çekme data from "TC" sheet
                - Galvaniz data from "GAL" sheet  
                - Panel Çit data from "PC" sheet
                - etc. */}
            MOCK: Excel analizi - Gerçek implementasyon sonraki adımda eklenecek
          </div>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Dosya Seç
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MainDashboard = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <Select value={selectedTimeFilter} onValueChange={setSelectedTimeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Bugün</SelectItem>
                  <SelectItem value="week">Bu Hafta</SelectItem>
                  <SelectItem value="month">Bu Ay</SelectItem>
                  <SelectItem value="quarter">Çeyrek</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <Select value={selectedLine} onValueChange={setSelectedLine}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Hat Seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Hatlar</SelectItem>
                  {Object.entries(productionLines).map(([key, line]) => (
                    <SelectItem key={key} value={key}>{line.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Sipariş ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ProductionSummaryCard
          title="Aktif Siparişler"
          value={factoryStatus?.active_orders || 0}
          change={8}
          icon={Package}
          color="bg-blue-500"
        />
        <ProductionSummaryCard
          title="Bugün Tamamlanan"
          value={factoryStatus?.completed_today || 0}
          change={12}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <ProductionSummaryCard
          title="Genel Verimlilik"
          value={`${factoryStatus?.overall_efficiency || 0}%`}
          change={-3}
          icon={BarChart3}
          color="bg-purple-500"
        />
        <ProductionSummaryCard
          title="Çalışan Hatlar"
          value={`${Object.values(factoryStatus?.lines || {}).filter(line => line.status === 'running').length}/8`}
          change={0}
          icon={Zap}
          color="bg-orange-500"
        />
      </div>

      {/* Stock Overview */}
      <StockOverview />

      {/* Excel Upload */}
      <ExcelUploadSection />

      {/* Production Lines Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Üretim Hatları Durumu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(productionLines).map(([key, line]) => {
              const status = factoryStatus?.lines?.[key];
              return (
                <Card key={key} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{line.icon}</span>
                        <h3 className="font-semibold">{line.name}</h3>
                      </div>
                      <LineStatusBadge status={status?.status || 'idle'} />
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Makine:</span>
                        <span>{line.machines}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Operatör:</span>
                        <span>{line.operators}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Verimlilik:</span>
                        <span className={status?.efficiency > 80 ? 'text-green-600' : status?.efficiency > 60 ? 'text-yellow-600' : 'text-red-600'}>
                          {status?.efficiency || 0}%
                        </span>
                      </div>
                      {status?.current_order && (
                        <div className="flex justify-between">
                          <span>Mevcut Sipariş:</span>
                          <span className="font-mono text-xs">{status.current_order}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">APS Planlama Sistemi</h1>
          <p className="text-gray-600">Gelişmiş Üretim Planlama ve Çizelgeleme</p>
        </div>
        
        <div className="flex space-x-2">
          <Dialog open={newOrderDialog} onOpenChange={setNewOrderDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Sipariş
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni Sipariş Ekle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Üretim Hattı</Label>
                  <Select value={selectedLineForOrder} onValueChange={setSelectedLineForOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Hat seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(productionLines).map(([key, line]) => (
                        <SelectItem key={key} value={key}>{line.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Dynamic form fields will be added based on selected line */}
                <Button className="w-full">Siparişi Ekle ve Planla</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Ayarlar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="dashboard">Ana Panel</TabsTrigger>
          <TabsTrigger value="tel_cekme">Tel Çekme</TabsTrigger>
          <TabsTrigger value="galvaniz">Galvaniz</TabsTrigger>
          <TabsTrigger value="panel_cit">Panel Çit</TabsTrigger>
          <TabsTrigger value="celik_hasir">Çelik Hasır</TabsTrigger>
          <TabsTrigger value="civi">Çivi</TabsTrigger>
          <TabsTrigger value="tavli_tel">Tavlı Tel</TabsTrigger>
          <TabsTrigger value="profil">Profil</TabsTrigger>
          <TabsTrigger value="palet">Palet</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <MainDashboard />
        </TabsContent>

        {/* Galvaniz Line - Special implementation with 36 kafas */}
        <TabsContent value="galvaniz">
          <GalvanizLinePlanning />
        </TabsContent>

        {/* Panel Çit Line - Painting bottleneck focus */}
        <TabsContent value="panel_cit">
          <PanelCitLinePlanning />
        </TabsContent>

        {/* Tel Çekme Line - TLC_Hızlar integration */}
        <TabsContent value="tel_cekme">
          <TelCekmeLinePlanning />
        </TabsContent>

        {/* Other production lines */}
        {Object.entries(productionLines)
          .filter(([key]) => !['galvaniz', 'panel_cit', 'tel_cekme'].includes(key))
          .map(([key, line]) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span className="text-2xl">{line.icon}</span>
                  <span>{line.name} Hattı Planlaması</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-semibold">{line.name} hattı detay planlaması</p>
                  <p className="text-sm">Drag & drop sipariş listesi, makine görselleştirmesi ve detaylı planlama araçları - yakında eklenecek</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}