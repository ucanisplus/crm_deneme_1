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
import { Upload, Settings, Play, Pause, AlertTriangle, CheckCircle, Plus, Filter, Search, BarChart3, Calendar, Package, Users, Zap, Clock, Move, Eye, Target, ArrowRight, GitBranch, Layers, Activity } from 'lucide-react';
import { API_URLS } from '@/api-config';

// Type definitions for unified APS system
interface Product {
  id: string;
  stok_adi: string; // Friendly name like "Galvanizli Tel NIT 1.22mm"
  stok_kodu: string; // Code like "GT.NIT.0122.00"
  line_type: string;
  production_time_per_kg: number;
  setup_requirements?: string[];
  dependencies?: ProductDependency[];
}

interface ProductDependency {
  child_product: string;
  quantity_ratio: number;
  process_stage: string;
}

interface UnifiedOrder {
  id: string;
  customer: string;
  product: Product;
  quantity: number;
  priority: 'high' | 'medium' | 'low';
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  current_stage: string;
  estimated_completion?: string;
  dependencies_status?: DependencyStatus[];
  assigned_machines?: string[];
}

interface DependencyStatus {
  stage: string;
  product: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  estimated_start: string;
  estimated_end: string;
}

interface UnifiedMachine {
  id: string;
  name: string;
  line_type: string;
  status: 'running' | 'idle' | 'maintenance' | 'setup';
  current_order: string | null;
  queue: UnifiedOrder[];
  efficiency: number;
  setup_time_remaining?: number;
  next_maintenance?: string;
}

interface HorizontalProcess {
  id: string;
  order: UnifiedOrder;
  stages: ProcessStage[];
  total_duration: number;
  critical_path: string[];
}

interface ProcessStage {
  id: string;
  name: string;
  machine_type: string;
  status: 'waiting' | 'ready' | 'in_progress' | 'completed';
  start_time?: string;
  end_time?: string;
  duration: number;
  dependencies: string[];
  assigned_machine?: string;
}

export default function UnifiedAPSSystem() {
  const [activeView, setActiveView] = useState<'dashboard' | 'machines' | 'orders' | 'timeline'>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<UnifiedMachine | null>(null);
  const [newOrderDialog, setNewOrderDialog] = useState(false);
  const [timeFilter, setTimeFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sample data with friendly product names from CSV
  const sampleProducts: Product[] = [
    {
      id: 'gt_nit_122',
      stok_adi: 'Galvanizli Tel NIT 1.22mm',
      stok_kodu: 'GT.NIT.0122.00',
      line_type: 'galvaniz',
      production_time_per_kg: 0.19, // Based on 5354 kg/saat
      dependencies: [
        { child_product: 'siyah_tel_122', quantity_ratio: 1.05, process_stage: 'tel_cekme' }
      ]
    },
    {
      id: 'panel_2d_830_2500',
      stok_adi: 'Panel Çit 2D 830x2500mm RAL6005',
      stok_kodu: '2D.0740.0540.2500.2030.51.6005',
      line_type: 'panel',
      production_time_per_kg: 2.4, // Based on setup times from CSV
      dependencies: [
        { child_product: 'gt_pad_400', quantity_ratio: 1.2, process_stage: 'galvaniz' }
      ]
    },
    {
      id: 'celik_hasir_std',
      stok_adi: 'Çelik Hasır Standard 450mm',
      stok_kodu: 'CH.STD.0450.00',
      line_type: 'hasir',
      production_time_per_kg: 0.5,
      dependencies: [
        { child_product: 'filmasin_1008', quantity_ratio: 1.1, process_stage: 'filmasin' }
      ]
    },
    {
      id: 'civi_dokme',
      stok_adi: 'Dökme Çivi 2.5x50mm',
      stok_kodu: 'CV.DKM.01',
      line_type: 'civi',
      production_time_per_kg: 10, // 100 kg/saat
      dependencies: [
        { child_product: 'siyah_tel_280', quantity_ratio: 1.05, process_stage: 'tel_cekme' }
      ]
    }
  ];

  const [orders, setOrders] = useState<UnifiedOrder[]>([
    {
      id: 'ORD-2024-001',
      customer: 'ABC İnşaat',
      product: sampleProducts[1], // Panel Çit
      quantity: 100,
      priority: 'high',
      due_date: '2024-08-20',
      status: 'blocked',
      current_stage: 'galvaniz_bekleniyor',
      dependencies_status: [
        { stage: 'filmasin', product: 'Filmaşin 6.0x1008', status: 'completed', estimated_start: '2024-08-13T08:00', estimated_end: '2024-08-13T09:00' },
        { stage: 'tel_cekme', product: 'Siyah Tel 4.0mm', status: 'completed', estimated_start: '2024-08-13T09:00', estimated_end: '2024-08-13T11:00' },
        { stage: 'galvaniz', product: 'Galvanizli Tel PAD 4.0mm', status: 'in_progress', estimated_start: '2024-08-13T11:00', estimated_end: '2024-08-13T14:00' },
        { stage: 'panel_kesme', product: 'Panel Kesme', status: 'not_started', estimated_start: '2024-08-13T14:00', estimated_end: '2024-08-13T15:00' },
        { stage: 'panel_kaynak', product: 'Panel Kaynak', status: 'not_started', estimated_start: '2024-08-13T15:00', estimated_end: '2024-08-13T16:30' },
        { stage: 'boyama', product: 'Boyama RAL6005', status: 'not_started', estimated_start: '2024-08-13T16:30', estimated_end: '2024-08-13T18:30' },
        { stage: 'sevkiyat', product: 'Sevkiyat', status: 'not_started', estimated_start: '2024-08-13T18:30', estimated_end: '2024-08-13T19:00' }
      ]
    },
    {
      id: 'ORD-2024-002',
      customer: 'XYZ Metal',
      product: sampleProducts[0], // Galvanizli Tel
      quantity: 500,
      priority: 'medium',
      due_date: '2024-08-18',
      status: 'in_progress',
      current_stage: 'galvaniz',
      assigned_machines: ['KAFA-15', 'KAFA-16']
    }
  ]);

  const [machines, setMachines] = useState<UnifiedMachine[]>([
    // Tel Çekme Machines
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `TC${i + 1}`,
      name: `Tel Çekme ${i + 1}`,
      line_type: 'tel_cekme',
      status: (['running', 'idle', 'setup'] as const)[Math.floor(Math.random() * 3)],
      current_order: Math.random() > 0.6 ? `TC-${i + 1}-001` : null,
      queue: [],
      efficiency: Math.floor(Math.random() * 30) + 70,
      setup_time_remaining: Math.random() > 0.8 ? Math.floor(Math.random() * 60) : undefined
    })),
    // Galvaniz Kafalar
    ...Array.from({ length: 36 }, (_, i) => ({
      id: `KAFA-${i + 1}`,
      name: `Galvaniz Kafa ${i + 1}`,
      line_type: 'galvaniz',
      status: (['running', 'idle', 'maintenance'] as const)[Math.floor(Math.random() * 3)],
      current_order: i < 15 ? `GT-2024-${String(i + 100).padStart(3, '0')}` : null,
      queue: [],
      efficiency: Math.floor(Math.random() * 40) + 60
    }))
  ]);

  // OR-Tools Integration Function - Advanced Scheduling Algorithm
  const optimizeOrderScheduling = async (newOrder: UnifiedOrder) => {
    try {
      // Call Render backend with OR-Tools constraint programming
      const response = await fetch(API_URLS.apsOptimizeSchedule, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order: newOrder,
          available_machines: machines.filter(m => m.line_type === newOrder.product.line_type && m.status !== 'maintenance'),
          current_schedule: orders,
          constraints: {
            due_date: newOrder.due_date,
            priority: newOrder.priority,
            setup_time_matrix: getSetupTimeMatrix(newOrder.product.line_type),
            capacity_limits: getMachineCapacityLimits(newOrder.product.line_type),
            dependency_chain: buildDependencyChain(newOrder.product)
          }
        })
      });
      
      if (response.ok) {
        const optimization = await response.json();
        return {
          assigned_machines: optimization.optimal_machines,
          estimated_completion: optimization.completion_time,
          dependency_timeline: optimization.stage_schedule,
          setup_optimizations: optimization.setup_reductions,
          capacity_utilization: optimization.utilization_improvement,
          objective_value: optimization.total_cost_reduction
        };
      }
    } catch (error) {
      console.error('OR-Tools optimization failed, using heuristic fallback:', error);
      return generateHeuristicSchedule(newOrder);
    }
    return null;
  };

  // Heuristic fallback for OR-Tools unavailability
  const generateHeuristicSchedule = (order: UnifiedOrder) => {
    const availableMachines = machines.filter(m => 
      m.line_type === order.product.line_type && 
      m.status === 'idle'
    ).sort((a, b) => b.efficiency - a.efficiency);

    if (availableMachines.length === 0) return null;

    const estimatedDuration = order.quantity * order.product.production_time_per_kg;
    const completionTime = new Date(Date.now() + estimatedDuration * 60 * 60 * 1000);

    return {
      assigned_machines: [availableMachines[0].id],
      estimated_completion: completionTime.toISOString(),
      dependency_timeline: generateBasicTimeline(order),
      setup_optimizations: [],
      capacity_utilization: availableMachines[0].efficiency,
      objective_value: 0
    };
  };

  // Helper functions for OR-Tools constraints
  const getSetupTimeMatrix = (lineType: string) => {
    // Return setup time matrix based on line type
    const matrices: { [key: string]: any } = {
      'panel': { /* Panel Çit setup matrix from CSV */ },
      'galvaniz': { 'nit_to_pad': 20, 'pad_to_nit': 90 },
      'tel_cekme': { /* Tel çekme setup estimates */ }
    };
    return matrices[lineType] || {};
  };

  const getMachineCapacityLimits = (lineType: string) => {
    const limits: { [key: string]: any } = {
      'galvaniz': { min_daily: 110000, max_hourly: 6250 }, // kg
      'panel': { max_daily: 800 }, // adet
      'tel_cekme': { max_hourly: 800 } // kg per machine
    };
    return limits[lineType] || {};
  };

  const buildDependencyChain = (product: Product) => {
    const chain = [];
    let currentProduct = product;
    
    while (currentProduct.dependencies && currentProduct.dependencies.length > 0) {
      chain.push({
        stage: currentProduct.dependencies[0].process_stage,
        product: currentProduct.dependencies[0].child_product,
        ratio: currentProduct.dependencies[0].quantity_ratio
      });
      // In real implementation, would recursively build full chain
      break;
    }
    
    return chain;
  };

  const generateBasicTimeline = (order: UnifiedOrder): DependencyStatus[] => {
    const stages = ['filmasin', 'tel_cekme', 'galvaniz', 'panel_kesme', 'panel_kaynak', 'boyama', 'sevkiyat'];
    const timeline: DependencyStatus[] = [];
    let currentTime = new Date();

    stages.forEach((stage, index) => {
      const duration = 2; // 2 hours per stage (basic estimate)
      const startTime = new Date(currentTime.getTime() + index * duration * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
      
      timeline.push({
        stage,
        product: `${stage} işlemi`,
        status: 'not_started' as const,
        estimated_start: startTime.toISOString(),
        estimated_end: endTime.toISOString()
      });
    });

    return timeline;
  };

  // State for optimization results
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Add new order with automatic OR-Tools assignment
  const handleNewOrder = async (orderData: any) => {
    setIsOptimizing(true);
    
    const newOrder: UnifiedOrder = {
      id: `ORD-2024-${String(orders.length + 1).padStart(3, '0')}`,
      customer: orderData.customer as string,
      product: orderData.product as Product,
      quantity: orderData.quantity as number,
      priority: orderData.priority as 'high' | 'medium' | 'low',
      due_date: orderData.due_date as string,
      status: 'pending' as const,
      current_stage: 'planning'
    };

    try {
      // Get OR-Tools optimization
      const optimization = await optimizeOrderScheduling(newOrder);
      
      if (optimization) {
        setOptimizationResult(optimization);
        
        newOrder.assigned_machines = optimization.assigned_machines;
        newOrder.estimated_completion = optimization.estimated_completion;
        newOrder.dependencies_status = optimization.dependency_timeline;
        newOrder.status = 'in_progress';
        newOrder.current_stage = optimization.dependency_timeline?.[0]?.stage || 'filmasin';
        
        // Update machine queues based on OR-Tools results
        const updatedMachines = machines.map(machine => {
          const isAssigned = optimization.assigned_machines?.includes(machine.id);
          if (isAssigned) {
            return {
              ...machine,
              queue: [...machine.queue, newOrder],
              status: machine.status === 'idle' ? 'setup' as const : machine.status
            };
          }
          return machine;
        });
        setMachines(updatedMachines);

        // Show success message with optimization results
        console.log('OR-Tools Optimization Results:', {
          setup_reductions: optimization.setup_optimizations,
          capacity_improvement: optimization.capacity_utilization,
          cost_savings: optimization.objective_value
        });
      }

      setOrders(prev => [...prev, newOrder]);
      
      // Keep dialog open briefly to show results, then close
      setTimeout(() => {
        setNewOrderDialog(false);
        setOptimizationResult(null);
      }, 3000);
      
    } catch (error) {
      console.error('Order creation failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Horizontal Timeline Component
  const HorizontalTimeline = ({ order }: { order: UnifiedOrder }) => (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Badge className={order.priority === 'high' ? 'bg-red-500' : order.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}>
            {order.priority.toUpperCase()}
          </Badge>
          <span className="font-semibold">{order.id}</span>
          <span className="text-gray-600">{order.product.stok_adi}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
          <Eye className="h-4 w-4 mr-1" />
          Detaylar
        </Button>
      </div>
      
      <div className="relative">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {order.dependencies_status?.map((dep, index) => (
            <React.Fragment key={dep.stage}>
              <div className={`flex-shrink-0 p-3 rounded-lg border-2 min-w-[150px] ${
                dep.status === 'completed' ? 'bg-green-100 border-green-400' :
                dep.status === 'in_progress' ? 'bg-blue-100 border-blue-400' :
                dep.status === 'blocked' ? 'bg-red-100 border-red-400' :
                'bg-gray-100 border-gray-300'
              }`}>
                <div className="text-sm font-medium">{dep.stage.replace('_', ' ').toUpperCase()}</div>
                <div className="text-xs text-gray-600 mt-1">{dep.product}</div>
                <div className="text-xs mt-1">
                  {new Date(dep.estimated_start).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(dep.estimated_end).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {index < order.dependencies_status!.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  // Machine Card Component
  const MachineCard = ({ machine }: { machine: UnifiedMachine }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${selectedMachine?.id === machine.id ? 'ring-2 ring-blue-500' : ''}`}
      onClick={() => setSelectedMachine(machine)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">{machine.name}</h4>
          <Badge className={
            machine.status === 'running' ? 'bg-green-500' :
            machine.status === 'idle' ? 'bg-yellow-500' : 
            machine.status === 'maintenance' ? 'bg-red-500' : 'bg-blue-500'
          }>
            {machine.status === 'running' ? 'Çalışıyor' : 
             machine.status === 'idle' ? 'Boş' : 
             machine.status === 'maintenance' ? 'Bakım' : 'Setup'}
          </Badge>
        </div>
        
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Verimlilik:</span>
            <span className={machine.efficiency > 80 ? 'text-green-600' : 'text-yellow-600'}>
              {machine.efficiency}%
            </span>
          </div>
          
          {machine.current_order && (
            <div className="flex justify-between">
              <span>Mevcut:</span>
              <span className="font-mono text-xs">{machine.current_order}</span>
            </div>
          )}
          
          {machine.setup_time_remaining && (
            <div className="flex justify-between">
              <span>Setup:</span>
              <span>{machine.setup_time_remaining} dk kaldı</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Kuyruk:</span>
            <span>{machine.queue.length} sipariş</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Order Detail Dialog
  const OrderDetailDialog = ({ order, onClose }: { order: UnifiedOrder; onClose: () => void }) => (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Sipariş Detayları: {order.id}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Genel Bilgiler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Müşteri:</span>
                  <span className="font-medium">{order.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ürün:</span>
                  <span className="font-medium">{order.product.stok_adi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stok Kodu:</span>
                  <span className="font-mono">{order.product.stok_kodu}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Miktar:</span>
                  <span className="font-medium">{order.quantity.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Teslim Tarihi:</span>
                  <span className="font-medium">{new Date(order.due_date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Durum:</span>
                  <Badge className={
                    order.status === 'completed' ? 'bg-green-500' :
                    order.status === 'in_progress' ? 'bg-blue-500' :
                    order.status === 'blocked' ? 'bg-red-500' : 'bg-gray-500'
                  }>
                    {order.status === 'completed' ? 'Tamamlandı' :
                     order.status === 'in_progress' ? 'Devam Ediyor' :
                     order.status === 'blocked' ? 'Engelli' : 'Bekliyor'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Helper Materials Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Yardımcı Malzemeler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {order.product.line_type === 'galvaniz' && (
                    <>
                      <div className="flex justify-between">
                        <span>Çinko:</span>
                        <span>{(order.quantity * 0.08).toFixed(1)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Asit (HCl):</span>
                        <span>{(order.quantity * 0.02).toFixed(1)} L</span>
                      </div>
                    </>
                  )}
                  {order.product.line_type === 'panel' && (
                    <>
                      <div className="flex justify-between">
                        <span>Boya (RAL6005):</span>
                        <span>{(order.quantity * 0.15).toFixed(1)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kaynak Elektrodu:</span>
                        <span>{(order.quantity * 0.03).toFixed(1)} kg</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Üretim Süreci Takibi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.dependencies_status?.map((dep, index) => (
                    <div key={dep.stage} className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        dep.status === 'completed' ? 'bg-green-500' :
                        dep.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
                        dep.status === 'blocked' ? 'bg-red-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium">{dep.stage.replace('_', ' ').toUpperCase()}</div>
                        <div className="text-sm text-gray-600">{dep.product}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(dep.estimated_start).toLocaleString('tr-TR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - 
                          {new Date(dep.estimated_end).toLocaleString('tr-TR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Unified APS System</h1>
          <p className="text-gray-600 mt-1">Advanced Planning & Scheduling - OR-Tools Powered</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Bugün</SelectItem>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => setNewOrderDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Sipariş
          </Button>
        </div>
      </div>

      {/* View Selector */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center space-x-2">
            <GitBranch className="h-4 w-4" />
            <span>Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="machines" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Makineler</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Siparişler</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard View */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{orders.filter(o => o.status === 'in_progress').length}</div>
                    <div className="text-sm text-gray-600">Aktif Siparişler</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Settings className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{machines.filter(m => m.status === 'running').length}</div>
                    <div className="text-sm text-gray-600">Çalışan Makineler</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <div className="text-2xl font-bold">{orders.filter(o => o.status === 'blocked').length}</div>
                    <div className="text-sm text-gray-600">Engelli Siparişler</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {Math.round(machines.reduce((acc, m) => acc + m.efficiency, 0) / machines.length)}%
                    </div>
                    <div className="text-sm text-gray-600">Ortalama Verimlilik</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Timeline Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Kritik Siparişler - Hızlı Görünüm</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.filter(o => o.priority === 'high' && o.dependencies_status).slice(0, 3).map(order => (
                <HorizontalTimeline key={order.id} order={order} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GitBranch className="h-5 w-5" />
                <span>Horizontal Süreç Takip Sistemi</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.filter(o => o.dependencies_status).map(order => (
                <HorizontalTimeline key={order.id} order={order} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Machines View */}
        <TabsContent value="machines" className="space-y-4">
          {/* Machine Type Filters */}
          <div className="flex space-x-2 overflow-x-auto">
            {['all', 'tel_cekme', 'galvaniz', 'panel', 'hasir', 'civi'].map(type => (
              <Button 
                key={type}
                variant="outline" 
                size="sm"
                className="whitespace-nowrap"
              >
                {type === 'all' ? 'Tümü' :
                 type === 'tel_cekme' ? 'Tel Çekme' :
                 type === 'galvaniz' ? 'Galvaniz' :
                 type === 'panel' ? 'Panel Çit' :
                 type === 'hasir' ? 'Çelik Hasır' : 'Çivi'}
              </Button>
            ))}
          </div>

          {/* Machines Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {machines.map(machine => (
              <MachineCard key={machine.id} machine={machine} />
            ))}
          </div>
        </TabsContent>

        {/* Orders View */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sipariş Listesi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orders.map(order => (
                  <div 
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center space-x-4">
                      <Badge className={
                        order.priority === 'high' ? 'bg-red-500' :
                        order.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }>
                        {order.priority}
                      </Badge>
                      <div>
                        <div className="font-medium">{order.id}</div>
                        <div className="text-sm text-gray-600">{order.customer}</div>
                      </div>
                      <div>
                        <div className="font-medium">{order.product.stok_adi}</div>
                        <div className="text-sm text-gray-600">{order.quantity.toLocaleString()} kg</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        order.status === 'completed' ? 'bg-green-500' :
                        order.status === 'in_progress' ? 'bg-blue-500' :
                        order.status === 'blocked' ? 'bg-red-500' : 'bg-gray-500'
                      }>
                        {order.status}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {new Date(order.due_date).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Popup Dialogs */}
      {selectedOrder && (
        <OrderDetailDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {/* New Order Dialog - Complete OR-Tools Integration */}
      <Dialog open={newOrderDialog} onOpenChange={setNewOrderDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <span>Yeni Sipariş - OR-Tools Otomatik Optimizasyon</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Akıllı Planlama Sistemi</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                OR-Tools algoritması sipariş bilgilerinizi analiz ederek en uygun makine atamasını, 
                setup süresi optimizasyonunu ve filmaşin→sevkiyat tam timeline'ını otomatik oluşturur.
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleNewOrder({
                customer: formData.get('customer'),
                product: sampleProducts.find(p => p.id === formData.get('product')),
                quantity: Number(formData.get('quantity')),
                priority: formData.get('priority'),
                due_date: formData.get('due_date')
              });
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">Müşteri</Label>
                  <Input 
                    id="customer" 
                    name="customer" 
                    placeholder="Müşteri adı" 
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="product">Ürün</Label>
                  <Select name="product" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Ürün seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleProducts.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.stok_adi}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="quantity">Miktar (kg)</Label>
                  <Input 
                    id="quantity" 
                    name="quantity" 
                    type="number" 
                    placeholder="0" 
                    min="1" 
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="priority">Öncelik</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Yüksek</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="low">Düşük</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="due_date">Teslim Tarihi</Label>
                  <Input 
                    id="due_date" 
                    name="due_date" 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]}
                    required 
                  />
                </div>
              </div>

              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  OR-Tools Optimizasyon Hedefleri
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center">
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span>Setup süresi minimizasyonu</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span>Kapasite optimizasyonu</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span>Teslim tarihi garantisi</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span>Operatör yükü dengeleme</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setNewOrderDialog(false)}>
                  İptal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isOptimizing}>
                  {isOptimizing ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Optimize Ediliyor...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      OR-Tools ile Optimize Et ve Ata
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* OR-Tools Results Display */}
            {optimizationResult && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Optimizasyon Tamamlandı!</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-green-800">Setup Tasarrufu</div>
                    <div className="text-lg font-bold text-green-900">
                      {optimizationResult.setup_optimizations?.length || 0} optimizasyon
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-800">Kapasite Kullanımı</div>
                    <div className="text-lg font-bold text-blue-900">
                      {optimizationResult.capacity_utilization || 0}%
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-purple-800">Atanan Makineler</div>
                    <div className="text-lg font-bold text-purple-900">
                      {optimizationResult.assigned_machines?.length || 0} makine
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  ✓ Tahmini tamamlanma: {optimizationResult.estimated_completion ? 
                    new Date(optimizationResult.estimated_completion).toLocaleDateString('tr-TR') : 'Hesaplanıyor'}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}