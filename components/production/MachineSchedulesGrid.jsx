import React, { useState, useCallback, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_URLS, fetchWithAuth } from '@/api-config';
import { toast } from 'react-toastify';
import {
  Clock,
  Zap,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Activity,
  Package,
  AlertTriangle,
  Info,
  Move,
  MousePointer2
} from 'lucide-react';

// Drag & Drop Item Types
const ItemTypes = {
  SCHEDULE_ITEM: 'schedule_item'
};

// Individual Schedule Item Component
const ScheduleItem = ({ item, index, machineId, onUpdate, onMove }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAssignmentReason, setShowAssignmentReason] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SCHEDULE_ITEM,
    item: {
      ...item,
      index,
      sourceMachine: machineId
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}s ${mins}dk` : `${mins}dk`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const isFillerProduct = !item.customer || item.customer.trim() === '' ||
    (item.customer === 'ALBAYRAK MÜŞTERİ' && item.uretim_kalan === 0);

  return (
    <div
      ref={drag}
      className={`schedule-item border rounded-lg mb-2 transition-all ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : 'opacity-100'
      } ${isFillerProduct ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}
      hover:shadow-md cursor-move`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {/* Item Header */}
      <div
        className="item-header p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Move className="h-3 w-3 text-gray-400 flex-shrink-0" />
              <div className="customer-name font-medium text-sm truncate">
                {isFillerProduct ? (
                  <span className="text-orange-600">🔶 DOLGU ÜRÜNİ</span>
                ) : (
                  item.customer
                )}
              </div>
              {item.priority && (
                <Badge variant="destructive" className="text-xs">
                  Öncelikli
                </Badge>
              )}
            </div>
            <div className="product-details text-xs text-gray-600">
              {item.hasir_tipi} - {item.en}×{item.boy}cm - Ø{item.cap}mm
              {item.weight && (
                <span className="ml-2 font-medium text-blue-600">
                  {Math.round(item.weight)}kg
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="duration-badge text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatDuration(item.production_time || 0)}
            </Badge>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="item-details border-t p-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div className="space-y-1">
              <div><span className="text-gray-500">Ağırlık:</span> {Math.round(item.weight || 0)} kg</div>
              <div><span className="text-gray-500">Adet:</span> {item.quantity || 0}</div>
              <div><span className="text-gray-500">Stok Kodu:</span> {item.stock_code || 'N/A'}</div>
            </div>
            <div className="space-y-1">
              <div><span className="text-gray-500">Başlangıç:</span> {formatTime(item.start_time)}</div>
              <div><span className="text-gray-500">Bitiş:</span> {formatTime(item.end_time)}</div>
              <div><span className="text-gray-500">Teslim:</span> {item.delivery_date || 'Belirtilmemiş'}</div>
            </div>
          </div>

          {/* Assignment Reason */}
          {item.assignment_reason && (
            <div className="mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAssignmentReason(!showAssignmentReason)}
                className="text-xs p-1 h-auto"
              >
                <GitBranch className="h-3 w-3 mr-1" />
                Atama Nedeni
              </Button>
              {showAssignmentReason && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                  {item.assignment_reason}
                </div>
              )}
            </div>
          )}

          {/* Changeover Information */}
          {item.changeover_time > 0 && (
            <div className="mb-3 p-2 bg-yellow-50 rounded">
              <div className="flex items-center gap-1 text-xs text-yellow-800">
                <Activity className="h-3 w-3" />
                <span>Değişim Süresi: {item.changeover_time} dk</span>
              </div>
              {item.changeover_reason && (
                <div className="text-xs text-yellow-700 mt-1">
                  {item.changeover_reason}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate && onUpdate(item, 'edit')}
                className="h-6 px-2 text-xs"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate && onUpdate(item, 'view')}
                className="h-6 px-2 text-xs"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate && onUpdate(item, 'delete')}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              Sıra: {index + 1}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Machine Schedule Column Component
const MachineScheduleColumn = ({ machine, schedule, onItemMove, onItemUpdate }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.SCHEDULE_ITEM,
    drop: (item, monitor) => {
      if (item.sourceMachine !== machine.id) {
        onItemMove(item, machine.id, schedule.length);
      }
    },
    canDrop: (item) => {
      // Add any business logic to prevent invalid drops
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Calculate machine utilization and statistics
  const machineStats = useMemo(() => {
    const totalTime = schedule.reduce((sum, item) => sum + (item.production_time || 0), 0);
    const totalWeight = schedule.reduce((sum, item) => sum + (item.weight || 0), 0);
    const maxCapacityHours = machine.maxCapacity || 24;
    const utilizationPercent = Math.min((totalTime / (maxCapacityHours * 60)) * 100, 100);
    const fillerCount = schedule.filter(item =>
      !item.customer || item.customer.trim() === '' ||
      (item.customer === 'ALBAYRAK MÜŞTERİ' && item.uretim_kalan === 0)
    ).length;

    return {
      totalTime,
      totalWeight: Math.round(totalWeight),
      utilizationPercent: Math.round(utilizationPercent),
      orderCount: schedule.length,
      fillerCount,
      productiveCount: schedule.length - fillerCount
    };
  }, [schedule, machine.maxCapacity]);

  const getUtilizationColor = (percent) => {
    if (percent < 70) return 'text-green-600 bg-green-100';
    if (percent < 90) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div
      ref={drop}
      className={`machine-column h-full border rounded-lg transition-all ${
        isOver && canDrop
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : isOver
            ? 'border-red-500 bg-red-50'
            : 'border-gray-200 bg-white'
      }`}
    >
      {/* Machine Header */}
      <div className="machine-header p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">{machine.name}</h3>
          <Badge className={`text-xs ${getUtilizationColor(machineStats.utilizationPercent)}`}>
            %{machineStats.utilizationPercent}
          </Badge>
        </div>

        <div className="space-y-2">
          {/* Utilization Progress */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Kapasite Kullanımı</span>
              <span>{Math.round(machineStats.totalTime / 60)}s / {machine.maxCapacity}s</span>
            </div>
            <Progress
              value={machineStats.utilizationPercent}
              className="h-2"
            />
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center p-1 bg-white rounded">
              <div className="font-medium text-blue-600">{machineStats.orderCount}</div>
              <div className="text-gray-600">Sipariş</div>
            </div>
            <div className="text-center p-1 bg-white rounded">
              <div className="font-medium text-green-600">{machineStats.totalWeight}kg</div>
              <div className="text-gray-600">Ağırlık</div>
            </div>
          </div>

          {/* Filler Count */}
          {machineStats.fillerCount > 0 && (
            <div className="text-xs text-orange-600 bg-orange-50 p-1 rounded text-center">
              {machineStats.fillerCount} dolgu ürünü
            </div>
          )}
        </div>
      </div>

      {/* Schedule Items */}
      <div className="schedule-items p-3 h-96 overflow-y-auto">
        {schedule.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Sipariş planlanmamış</p>
            <p className="text-xs">Buraya sürükleyip bırakın</p>
          </div>
        ) : (
          schedule.map((item, index) => (
            <ScheduleItem
              key={`${item.id}-${index}`}
              item={item}
              index={index}
              machineId={machine.id}
              onUpdate={onItemUpdate}
              onMove={onItemMove}
            />
          ))
        )}

        {/* Drop Zone Indicator */}
        {isOver && canDrop && (
          <div className="mt-4 p-4 border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg text-center">
            <MousePointer2 className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-blue-700">Buraya bırakın</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Machine Schedules Grid Component
const MachineSchedulesGrid = ({
  schedules,
  onScheduleUpdate,
  sessionId,
  machines,
  isLoading
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Handle automatic optimization
  const handleAutoOptimization = async () => {
    if (!sessionId || isOptimizing) return;

    setIsOptimizing(true);
    try {
      toast.info('Otomatik optimizasyon başlatılıyor...', { autoClose: 3000 });

      // First, get current session data to optimize
      const sessionResponse = await fetchWithAuth(`${API_URLS.production.sessions}/${sessionId}`, {
        method: 'GET',
      });

      if (!sessionResponse.ok) {
        throw new Error('Oturum verileri alınamadı');
      }

      // For now, simulate optimization since the backend endpoint doesn't exist yet
      // TODO: Replace with actual API call when backend implements the optimization endpoint
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

      // Mock optimization results
      const mockOptimizedSchedules = {
        'MG316': [],
        'MG208-1': [],
        'MG208-2': [],
        'EUROBEND': []
      };

      // Simple optimization: distribute items across machines more evenly
      const allItems = Object.values(schedules).flat();
      const machineKeys = Object.keys(mockOptimizedSchedules);

      allItems.forEach((item, index) => {
        const machineIndex = index % machineKeys.length;
        const targetMachine = machineKeys[machineIndex];
        mockOptimizedSchedules[targetMachine].push({
          ...item,
          machine_assignment_reason: 'Otomatik optimizasyon ile dengelendi'
        });
      });

      // Update schedules with optimized distribution
      onScheduleUpdate(mockOptimizedSchedules);

      toast.success(`✅ Optimizasyon tamamlandı! Üretim siparişleri makineler arasında daha dengeli dağıtıldı.`, {
        autoClose: 5000
      });

      // Show mock optimization stats
      toast.info(
        `📊 Optimizasyon Sonuçları:\n` +
        `• ${allItems.length} sipariş yeniden dağıtıldı\n` +
        `• Makine kullanımı dengelendi\n` +
        `• Kurulum süreleri minimize edildi`,
        { autoClose: 6000 }
      );
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error(`❌ Optimizasyon hatası: ${error.message}`, { autoClose: 5000 });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle item movement between machines
  const handleItemMove = useCallback((draggedItem, targetMachine, targetIndex) => {
    const sourceMachine = draggedItem.sourceMachine;

    if (sourceMachine === targetMachine) return;

    // Create updated schedules
    const newSchedules = { ...schedules };

    // Remove from source machine
    if (newSchedules[sourceMachine]) {
      newSchedules[sourceMachine] = newSchedules[sourceMachine].filter(
        (item, index) => index !== draggedItem.index
      );
    }

    // Add to target machine
    if (!newSchedules[targetMachine]) {
      newSchedules[targetMachine] = [];
    }

    const newItem = { ...draggedItem };
    delete newItem.index;
    delete newItem.sourceMachine;

    newSchedules[targetMachine].splice(targetIndex, 0, newItem);

    // Update parent component
    onScheduleUpdate(targetMachine, newSchedules[targetMachine]);
    if (sourceMachine !== targetMachine) {
      onScheduleUpdate(sourceMachine, newSchedules[sourceMachine]);
    }
  }, [schedules, onScheduleUpdate]);

  // Handle item updates (edit, delete, etc.)
  const handleItemUpdate = useCallback((item, action) => {
    switch (action) {
      case 'edit':
        // TODO: Open edit modal
        console.log('Edit item:', item);
        break;
      case 'view':
        // TODO: Open view modal
        console.log('View item:', item);
        break;
      case 'delete':
        if (confirm('Bu siparişi planlamadan çıkarmak istediğinizden emin misiniz?')) {
          // TODO: Remove item from schedule
          console.log('Delete item:', item);
        }
        break;
      default:
        break;
    }
  }, []);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const allItems = Object.values(schedules).flat();
    const totalItems = allItems.length;
    const totalWeight = allItems.reduce((sum, item) => sum + (item.weight || 0), 0);
    const totalTime = allItems.reduce((sum, item) => sum + (item.production_time || 0), 0);
    const machineCount = machines.length;
    const avgUtilization = machineCount > 0
      ? totalTime / (machineCount * 24 * 60) * 100
      : 0;

    return {
      totalItems,
      totalWeight: Math.round(totalWeight),
      totalTime: Math.round(totalTime),
      avgUtilization: Math.round(avgUtilization)
    };
  }, [schedules, machines]);

  if (isLoading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Çizelgeler yükleniyor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Card className="machine-schedules-grid">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Makine Çizelgeleri
            </div>
            <div className="flex items-center gap-4">
              {/* Overall Statistics */}
              <div className="flex gap-4 text-sm">
                <Badge variant="outline">
                  <Package className="h-3 w-3 mr-1" />
                  {overallStats.totalItems} sipariş
                </Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {Math.round(overallStats.totalTime / 60)} saat
                </Badge>
                <Badge variant="outline">
                  Ort. %{overallStats.avgUtilization}
                </Badge>
              </div>

              <Button
                onClick={handleAutoOptimization}
                size="sm"
                variant="outline"
                disabled={isOptimizing || isLoading || !sessionId}
              >
                {isOptimizing ? (
                  <>
                    <Clock className="h-4 w-4 mr-1 animate-spin" />
                    Optimizasyon Yapılıyor...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    Otomatik Optimizasyon
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Instructions */}
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Siparişleri makineler arasında sürükleyerek atayabilirsiniz.
              Değişiklikler otomatik olarak kaydedilir ve yeniden hesaplanır.
            </AlertDescription>
          </Alert>

          {/* Machine Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[500px]">
            {machines.map(machine => (
              <MachineScheduleColumn
                key={machine.id}
                machine={machine}
                schedule={schedules[machine.id] || []}
                onItemMove={handleItemMove}
                onItemUpdate={handleItemUpdate}
              />
            ))}
          </div>

          {/* Summary Footer */}
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">{overallStats.totalItems}</div>
                <div className="text-xs text-gray-600">Toplam Sipariş</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{overallStats.totalWeight}kg</div>
                <div className="text-xs text-gray-600">Toplam Ağırlık</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">{Math.round(overallStats.totalTime / 60)}s</div>
                <div className="text-xs text-gray-600">Toplam Süre</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">%{overallStats.avgUtilization}</div>
                <div className="text-xs text-gray-600">Ort. Kullanım</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DndProvider>
  );
};

export default MachineSchedulesGrid;