import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  Package,
  Truck,
  Target,
  Activity,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Factory,
  GitBranch
} from 'lucide-react';

// Dashboard Section Components
const ExecutiveSummary = ({ data }) => {
  const summary = data || {};

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold text-blue-600">{summary.totalOrders || 0}</div>
          <div className="text-sm text-gray-600">Toplam Sipariş</div>
          <div className="text-xs text-green-600 mt-1">
            +{summary.newOrdersToday || 0} bugün
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <div className="text-2xl font-bold text-green-600">{summary.totalWeight || 0}kg</div>
          <div className="text-sm text-gray-600">Toplam Ağırlık</div>
          <div className="text-xs text-blue-600 mt-1">
            {summary.avgOrderWeight || 0}kg ort/sipariş
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <div className="text-2xl font-bold text-purple-600">{summary.totalHours || 0}s</div>
          <div className="text-sm text-gray-600">Toplam Süre</div>
          <div className="text-xs text-orange-600 mt-1">
            {summary.estimatedDays || 0} gün (4 makine)
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-orange-500" />
          <div className="text-2xl font-bold text-orange-600">{summary.uniqueCustomers || 0}</div>
          <div className="text-sm text-gray-600">Müşteri</div>
          <div className="text-xs text-purple-600 mt-1">
            {summary.avgOrdersPerCustomer || 0} sip/müşteri
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const MachineUtilizationPanel = ({ data }) => {
  const machineData = data?.machines || [];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const pieData = machineData.map((machine, index) => ({
    name: machine.name,
    value: machine.utilizationPercent,
    hours: machine.totalHours,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Makine Kullanım Oranları
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: %${value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`%${value}`, 'Kullanım']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Machine Details */}
          <div className="space-y-4">
            {machineData.map((machine, index) => (
              <div key={machine.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{machine.name}</span>
                  <Badge
                    variant={machine.utilizationPercent > 90 ? 'destructive' :
                            machine.utilizationPercent > 70 ? 'default' : 'secondary'}
                  >
                    %{machine.utilizationPercent}
                  </Badge>
                </div>
                <Progress value={machine.utilizationPercent} className="h-2" />
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{machine.orderCount} sipariş</span>
                  <span>{machine.totalHours}s / {machine.maxCapacity}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CustomerProgressPanel = ({ data }) => {
  const customers = data?.customers || [];

  const topCustomers = customers
    .sort((a, b) => b.totalWeight - a.totalWeight)
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Müşteri Analizi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCustomers} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={10}
              />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  `${value}${name === 'totalWeight' ? 'kg' : name === 'completionPercent' ? '%' : ''}`,
                  name === 'totalWeight' ? 'Ağırlık' :
                  name === 'orderCount' ? 'Sipariş' : 'Tamamlanma'
                ]}
              />
              <Legend />
              <Bar dataKey="totalWeight" fill="#3B82F6" name="Ağırlık (kg)" />
              <Bar dataKey="orderCount" fill="#10B981" name="Sipariş Sayısı" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Summary Table */}
        <div className="mt-4 max-h-32 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2">Müşteri</th>
                <th className="text-right p-2">Sipariş</th>
                <th className="text-right p-2">Ağırlık</th>
                <th className="text-right p-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2 truncate max-w-24">{customer.name}</td>
                  <td className="p-2 text-right">{customer.orderCount}</td>
                  <td className="p-2 text-right">{customer.totalWeight}kg</td>
                  <td className="p-2 text-right">
                    <Badge
                      variant={customer.completionPercent === 100 ? 'success' : 'secondary'}
                      className="text-xs"
                    >
                      %{customer.completionPercent}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const TirShipmentPanel = ({ data }) => {
  const shipments = data?.shipments || [];

  const shipmentData = shipments.map(shipment => ({
    date: new Date(shipment.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
    planned: shipment.plannedTons,
    actual: shipment.actualTons || 0,
    efficiency: shipment.efficiency || 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Tır Sevkiyat Analizi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{data?.summary?.totalShipments || 0}</div>
            <div className="text-xs text-blue-700">Toplam Sevkiyat</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{data?.summary?.avgEfficiency || 0}%</div>
            <div className="text-xs text-green-700">Ort. Verimlilik</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded">
            <div className="text-lg font-bold text-purple-600">{data?.summary?.totalTons || 0}</div>
            <div className="text-xs text-purple-700">Toplam Ton</div>
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={shipmentData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis />
              <Tooltip formatter={(value, name) => [`${value} ton`, name === 'planned' ? 'Planlanan' : 'Gerçekleşen']} />
              <Area type="monotone" dataKey="planned" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="actual" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
              <ReferenceLine y={23} stroke="#EF4444" strokeDasharray="5 5" label="Max Kapasite" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Efficiency Indicators */}
        <div className="mt-4 space-y-2">
          {shipments.slice(0, 3).map((shipment, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span>{new Date(shipment.date).toLocaleDateString('tr-TR')}</span>
              <div className="flex items-center gap-2">
                <span>{shipment.actualTons || 0}/{shipment.plannedTons} ton</span>
                <Badge
                  variant={shipment.efficiency >= 90 ? 'success' : shipment.efficiency >= 70 ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  %{shipment.efficiency || 0}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ProductionTimelinePanel = ({ data }) => {
  const timeline = data?.timeline || [];

  const timelineData = timeline.map(point => ({
    date: new Date(point.date).toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' }),
    production: point.dailyProduction,
    target: point.dailyTarget,
    cumulative: point.cumulativeProduction
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Üretim Zaman Çizelgesi (60 Gün)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  `${value} ton`,
                  name === 'production' ? 'Günlük Üretim' :
                  name === 'target' ? 'Hedef' : 'Kümülatif'
                ]}
              />
              <Legend />
              <Line type="monotone" dataKey="production" stroke="#3B82F6" strokeWidth={2} name="Günlük Üretim" />
              <Line type="monotone" dataKey="target" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" name="Günlük Hedef" />
              <Line type="monotone" dataKey="cumulative" stroke="#10B981" strokeWidth={2} name="Kümülatif" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline Summary */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="font-bold text-blue-600">{data?.summary?.totalDays || 0}</div>
            <div className="text-xs text-blue-700">Toplam Gün</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-bold text-green-600">{data?.summary?.avgDailyProduction || 0}</div>
            <div className="text-xs text-green-700">Günlük Ort.</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className="font-bold text-purple-600">{data?.summary?.peakDay || 0}</div>
            <div className="text-xs text-purple-700">En Yoğun Gün</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <div className="font-bold text-orange-600">{data?.summary?.efficiency || 0}%</div>
            <div className="text-xs text-orange-700">Verimlilik</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AssignmentIntelligencePanel = ({ data }) => {
  const assignments = data?.assignments || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Atama Zekası & Optimizasyon Nedenleri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignment Reasons */}
          <div>
            <h4 className="font-medium mb-3">Atama Nedenleri</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {assignments.map((assignment, index) => (
                <div key={index} className="border rounded p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{assignment.customer}</span>
                    <Badge variant="outline" className="text-xs">
                      {assignment.machine}
                    </Badge>
                  </div>
                  <div className="text-gray-600 text-xs mb-2">
                    {assignment.product} - {assignment.weight}kg
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-xs text-blue-800">
                    <div className="flex items-start gap-1">
                      <GitBranch className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{assignment.reason}</span>
                    </div>
                  </div>
                  {assignment.optimization && (
                    <div className="bg-green-50 p-2 rounded text-xs text-green-800 mt-1">
                      <div className="flex items-start gap-1">
                        <Target className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{assignment.optimization}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Algorithm Performance */}
          <div>
            <h4 className="font-medium mb-3">Algoritma Performansı</h4>
            <div className="space-y-4">
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-lg font-bold text-green-600">{data?.performance?.optimizationScore || 0}%</div>
                  <div className="text-xs text-green-700">Optimizasyon Skoru</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-lg font-bold text-blue-600">{data?.performance?.balanceIndex || 0}</div>
                  <div className="text-xs text-blue-700">Denge İndeksi</div>
                </div>
              </div>

              {/* Optimization Details */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Kapasite Kullanımı:</span>
                  <span className="font-medium">{data?.performance?.capacityUtilization || 0}%</span>
                </div>
                <Progress value={data?.performance?.capacityUtilization || 0} className="h-2" />

                <div className="flex justify-between text-sm">
                  <span>Değişim Optimizasyonu:</span>
                  <span className="font-medium">{data?.performance?.changeoverOptimization || 0}%</span>
                </div>
                <Progress value={data?.performance?.changeoverOptimization || 0} className="h-2" />

                <div className="flex justify-between text-sm">
                  <span>Müşteri Gruplama:</span>
                  <span className="font-medium">{data?.performance?.customerGrouping || 0}%</span>
                </div>
                <Progress value={data?.performance?.customerGrouping || 0} className="h-2" />
              </div>

              {/* Algorithm Insights */}
              <div className="bg-gray-50 p-3 rounded text-xs">
                <div className="font-medium mb-2">Algoritma İçgörüleri:</div>
                <ul className="space-y-1 text-gray-700">
                  {data?.insights?.map((insight, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-blue-500">•</span>
                      <span>{insight}</span>
                    </li>
                  )) || [
                    <li key="default" className="flex items-start gap-1">
                      <span className="text-blue-500">•</span>
                      <span>Optimizasyon verileri yükleniyor...</span>
                    </li>
                  ]}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
const ProductionDashboard = ({ dashboardData, currentSession, onDataRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('overview');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onDataRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const data = dashboardData || {};

  return (
    <div className="production-dashboard space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Üretim Dashboard</h2>
          <p className="text-gray-600">
            {currentSession?.name} - Gerçek zamanlı analiz ve performans metrikleri
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Genel Bakış</SelectItem>
              <SelectItem value="machines">Makine Analizi</SelectItem>
              <SelectItem value="customers">Müşteri Analizi</SelectItem>
              <SelectItem value="shipments">Sevkiyat Analizi</SelectItem>
              <SelectItem value="timeline">Zaman Çizelgesi</SelectItem>
              <SelectItem value="optimization">Optimizasyon</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <ExecutiveSummary data={data.summary} />

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MachineUtilizationPanel data={data.machines} />
        <CustomerProgressPanel data={data.customers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TirShipmentPanel data={data.shipments} />
        <div className="lg:col-span-1">
          {/* Additional metrics or smaller charts can go here */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Hızlı Metrikler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-red-50 rounded">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-red-500" />
                  <div className="font-bold text-red-600">{data.alerts?.critical || 0}</div>
                  <div className="text-xs text-red-700">Kritik Uyarı</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <CheckCircle className="h-6 w-6 mx-auto mb-1 text-green-500" />
                  <div className="font-bold text-green-600">{data.alerts?.completed || 0}</div>
                  <div className="text-xs text-green-700">Tamamlanan</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-width panels */}
      <ProductionTimelinePanel data={data.timeline} />
      <AssignmentIntelligencePanel data={data.intelligence} />
    </div>
  );
};

export default ProductionDashboard;