import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { API_URLS, fetchWithAuth } from '@/api-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import {
  Factory, Calendar, Clock, Settings, BarChart3, RefreshCw,
  Play, Pause, Plus, Trash2, Eye, Download, AlertTriangle,
  CheckCircle, Zap, Users, Package, Target, Activity, Upload,
  FileSpreadsheet, X, Loader, Info, TrendingUp, Gauge, Truck,
  Move, Edit, GitBranch, ChevronDown, ArrowRight, Check
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine
} from 'recharts';

const CelikHasirPlanlama = () => {
  const { user, hasPermission, permissions, loading: authLoading } = useAuth();
  const router = useRouter();

  // Core State yönetimi
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [machineSchedules, setMachineSchedules] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState(null);

  // Excel Upload State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMappings, setColumnMappings] = useState({});
  const [parsedData, setParsedData] = useState(null);
  const [headerRowIndex, setHeaderRowIndex] = useState(1);
  const fileInputRef = useRef(null);

  // Session Management State
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  // Define Gerekli columns için Üretim planning
  const REQUIRED_COLUMNS = [
    { key: 'firma', label: 'Firma', required: true },
    { key: 'stok_karti', label: 'Stok Kartı', required: true },
    { key: 'hasir_cinsi', label: 'Hasır Cinsi', required: true },
    { key: 'boy', label: 'Boy (cm)', required: true },
    { key: 'en', label: 'En (cm)', required: true },
    { key: 'boy_cap', label: 'Boy Çap (mm)', required: false },
    { key: 'en_cap', label: 'En Çap (mm)', required: false },
    { key: 'boy_ara', label: 'Boy Aralığı (cm)', required: false },
    { key: 'en_ara', label: 'En Aralığı (cm)', required: false },
    { key: 'birim_agirlik', label: 'Birim Ağırlık (kg)', required: true },
    { key: 'uretim_kalan', label: 'Üretim Kalan (adet)', required: true },
    { key: 'siparis_miktari', label: 'Sipariş Miktarı (adet)', required: false },
    { key: 's_tarihi', label: 'Sipariş Tarihi', required: false },
    { key: 'stok_adet', label: 'Stok (adet)', required: false },
    { key: 'stok_kg', label: 'Stok (kg)', required: false },
  ];

  const MACHINES = useMemo(() => [
    { id: 'MG316', name: 'MG316', maxCapacity: 24 },
    { id: 'EUROBEND', name: 'EUROBEND', maxCapacity: 24 },
    { id: 'MG208-1', name: 'MG208-1', maxCapacity: 24 },
    { id: 'MG208-2', name: 'MG208-2', maxCapacity: 24 }
  ], []);

  // Helper a Kontrol et if column is auto-detected
  const isAutoDetected = (field, mappedIndex) => {
    if (!parsedData?.headers) return false;
    const autoMapping = autoDetectColumns(parsedData.headers);
    return Object.entries(autoMapping).find(([idx, key]) => key === field && idx === mappedIndex.toString()) !== undefined;
  };

  // İşle column mapping Değiştir
  const handleMappingChange = (field, columnIndex) => {
    const newMappings = { ...columnMappings };
    // Kaldır any existing mapping için this Alan
    Object.entries(newMappings).forEach(([idx, mappedField]) => {
      if (mappedField === field) delete newMappings[idx];
    });
    // Ekle new mapping değilse -1
    if (columnIndex !== '-1') {
      newMappings[columnIndex] = field;
    }
    setColumnMappings(newMappings);
  };

  // Session Management Functions
  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(API_URLS.production.sessions);
      if (response.ok) {
        const sessionsData = await response.json();
        setSessions(sessionsData);
        if (sessionsData.length > 0 && !currentSession) {
          setCurrentSession(sessionsData[0]);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Oturumlar yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  // Başlat Bileşen
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!permissions.includes('page:planlama')) {
      toast.error('Bu sayfaya erişim yetkiniz yok');
      router.push('/');
      return;
    }
    loadSessions();
  }, [user, permissions, authLoading, router, loadSessions]);

  // Auto-detect column mappings
  const autoDetectColumns = useCallback((headers) => {
    const mappings = {};

    const patterns = {
      'firma': /firma|müşteri|customer|company/i,
      'stok_karti': /stok.*kart|stok.*kod|stock.*code/i,
      'hasir_cinsi': /hasır.*cins|mesh.*type/i,
      'boy': /^boy$|length/i,
      'en': /^en$|width/i,
      'boy_cap': /boy.*çap|boy.*cap|length.*dia/i,
      'en_cap': /en.*çap|en.*cap|width.*dia/i,
      'boy_ara': /boy.*ara|boy.*spacing/i,
      'en_ara': /en.*ara|en.*spacing/i,
      'birim_agirlik': /birim.*ağır|unit.*weight|ağırlık/i,
      'uretim_kalan': /ü\.?\s*kalan|üret.*kalan|remaining/i,
      'siparis_miktari': /sipariş.*miktar|order.*quantity/i,
    };

    headers.forEach((header, index) => {
      if (!header) return;
      const headerStr = header.toString().trim();

      Object.entries(patterns).forEach(([columnKey, pattern]) => {
        if (pattern.test(headerStr) && !mappings[index]) {
          mappings[index] = columnKey;
        }
      });
    });

    return mappings;
  }, []);

  const createSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Oturum adı gereklidir');
      return;
    }

    try {
      const response = await fetchWithAuth(API_URLS.production.sessions, {
        method: 'POST',
        body: JSON.stringify({
          name: newSessionName,
          description: `Üretim planı - ${new Date().toLocaleDateString('tr-TR')}`
        })
      });

      if (response.ok) {
        const newSession = await response.json();
        setSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
        setNewSessionName('');
        setShowCreateSession(false);
        toast.success('Yeni oturum oluşturuldu');
      }
    } catch (error) {
      console.error('Session creation error:', error);
      toast.error('Oturum oluşturulamadı');
    }
  };

  // Excel parsing
  const parseFile = useCallback(async (file) => {
    try {
      setIsProcessing(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        defval: ''
      });

      const filteredData = jsonData.filter(row =>
        row && row.some(cell => cell !== '' && cell !== null && cell !== undefined)
      );

      if (filteredData.length < 3) {
        toast.error('Dosya en az 3 satır veri içermelidir');
        return;
      }

      const headers = filteredData[headerRowIndex] || filteredData[1] || filteredData[0];
      const dataRows = filteredData.slice(headerRowIndex + 1);
      const detectedMappings = autoDetectColumns(headers);

      setParsedData({ headers, data: dataRows, totalRows: dataRows.length });
      setColumnMappings(detectedMappings);

      toast.success(`${dataRows.length} satır veri başarıyla okundu`);
    } catch (error) {
      console.error('File parsing error:', error);
      toast.error(`Dosya okuma hatası: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [headerRowIndex, autoDetectColumns]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx?|csv)$/i)) {
      toast.error('Desteklenen formatlar: .xlsx, .xls, .csv');
      return;
    }

    setUploadedFile(file);
    parseFile(file);
  }, [parseFile]);

  // Validation
  const isValidMappings = () => {
    const requiredKeys = REQUIRED_COLUMNS.filter(col => col.required).map(col => col.key);
    const mappedKeys = Object.values(columnMappings);
    return requiredKeys.every(key => mappedKeys.includes(key));
  };

  const validateMappings = () => {
    const requiredKeys = REQUIRED_COLUMNS.filter(col => col.required).map(col => col.key);
    const mappedKeys = Object.values(columnMappings);
    const missingKeys = requiredKeys.filter(key => !mappedKeys.includes(key));

    if (missingKeys.length > 0) {
      const missingLabels = missingKeys.map(key =>
        REQUIRED_COLUMNS.find(col => col.key === key)?.label
      );
      toast.error(`Eksik zorunlu sütunlar: ${missingLabels.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleProcessData = async () => {
    if (!validateMappings() || !currentSession) return;

    try {
      setIsProcessing(true);
      const { headers, data } = parsedData;
      const processedOrders = [];

      // İşlem each row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const order = {};
        Object.entries(columnMappings).forEach(([index, columnKey]) => {
          order[columnKey] = row[index] || '';
        });

        // Parse et numeric values
        order.boy = parseInt(order.boy || 500);
        order.en = parseInt(order.en || 215);
        order.boy_cap = parseFloat(order.boy_cap || 4.5);
        order.en_cap = parseFloat(order.en_cap || 4.5);
        order.boy_ara = parseFloat(order.boy_ara || 15);
        order.en_ara = parseFloat(order.en_ara || 15);
        order.birim_agirlik = parseFloat(order.birim_agirlik || 0);
        order.uretim_kalan = parseInt(order.uretim_kalan || 0);
        order.siparis_miktari = parseInt(order.siparis_miktari || 0);

        if (order.uretim_kalan > 0 && order.stok_karti) {
          processedOrders.push(order);
        }
      }

      // Send a backend
      const response = await fetchWithAuth(API_URLS.production.uploadExcel, {
        method: 'POST',
        body: JSON.stringify({
          session_id: currentSession.id,
          orders: processedOrders,
          total_orders: processedOrders.length
        })
      });

      if (!response.ok) throw new Error('Backend processing failed');

      // Trigger scheduling
      const scheduleResponse = await fetchWithAuth(`${API_URLS.production.runScheduling}/${currentSession.id}`, {
        method: 'POST'
      });

      const scheduleResult = await scheduleResponse.json();

      toast.success(`✅ ${processedOrders.length} sipariş başarıyla planlandı!`);
      toast.success(`📊 ${scheduleResult.total_production_days || 0} gün üretim süresi`);

      // Sıfırla and switch a dashboard
      handleReset();
      setActiveTab('dashboard');
      await loadScheduleData();

    } catch (error) {
      console.error('Processing error:', error);
      toast.error(`İşlem hatası: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setParsedData(null);
    setColumnMappings({});
    setShowColumnMapping(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Dashboard Functions
  const processScheduleData = useCallback((schedules, orders) => {
    const machineStats = {};
    const customerStats = {};
    let totalOrders = 0;
    let totalWeight = 0;
    let totalTime = 0;

    // Başlat Makine stats
    MACHINES.forEach(machine => {
      machineStats[machine.id] = {
        id: machine.id,
        name: machine.name,
        orders: [],
        totalTime: 0,
        utilizationPercent: 0,
        orderCount: 0,
        totalHours: 0,
        maxCapacity: machine.maxCapacity * 60
      };
    });

    // İşlem schedules
    schedules.forEach(schedule => {
      const machine = schedule.assigned_machine_id;
      if (machineStats[machine]) {
        machineStats[machine].orders.push(schedule);
        machineStats[machine].totalTime += schedule.production_time_minutes || 0;
        machineStats[machine].orderCount++;
      }
      totalTime += schedule.production_time_minutes || 0;
    });

    // Hesapla utilization
    Object.values(machineStats).forEach(machine => {
      machine.totalHours = Math.round(machine.totalTime / 60);
      machine.utilizationPercent = Math.round((machine.totalTime / machine.maxCapacity) * 100);
    });

    // İşlem customer stats
    orders.forEach(order => {
      const customer = order.firma || 'BILINMEYEN';
      if (!customerStats[customer]) {
        customerStats[customer] = {
          name: customer,
          orderCount: 0,
          totalWeight: 0,
          completionPercent: 0
        };
      }
      customerStats[customer].orderCount++;
      customerStats[customer].totalWeight += (order.birim_agirlik * order.uretim_kalan) || 0;
      totalOrders++;
      totalWeight += (order.birim_agirlik * order.uretim_kalan) || 0;
    });

    const maxProductionDays = Math.max(...Object.values(machineStats).map(m => Math.ceil(m.totalTime / 1440)));

    return {
      summary: {
        totalOrders,
        totalWeight: Math.round(totalWeight),
        totalHours: Math.round(totalTime / 60),
        estimatedDays: maxProductionDays,
        uniqueCustomers: Object.keys(customerStats).length,
        avgOrderWeight: totalOrders > 0 ? Math.round(totalWeight / totalOrders) : 0,
      },
      machines: {
        machines: Object.values(machineStats)
      },
      customers: {
        customers: Object.values(customerStats)
      }
    };
  }, [MACHINES]);

  const loadScheduleData = useCallback(async () => {
    if (!currentSession?.id) return;

    try {
      const [schedulesResponse, ordersResponse] = await Promise.all([
        fetchWithAuth(`${API_URLS.production.schedules}/${currentSession.id}`),
        fetchWithAuth(`${API_URLS.production.orders}/${currentSession.id}`)
      ]);

      const schedules = await schedulesResponse.json();
      const orders = await ordersResponse.json();

      const processedData = processScheduleData(schedules, orders);
      setRealTimeData(processedData);

      // Group schedules ile Makine
      const schedulesById = {};
      MACHINES.forEach(machine => {
        schedulesById[machine.id] = [];
      });

      schedules.forEach(schedule => {
        const machineId = schedule.assigned_machine_id;
        if (schedulesById[machineId]) {
          schedulesById[machineId].push({
            ...schedule,
            customer: schedule.firma,
            hasir_tipi: schedule.hasir_cinsi,
            weight: schedule.total_tonnage * 1000 || 0,
            production_time: schedule.production_time_minutes || 0
          });
        }
      });

      setMachineSchedules(schedulesById);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    }
  }, [currentSession?.id, MACHINES, processScheduleData]);

  // Yükle schedule Veri zaman session changes
  useEffect(() => {
    if (currentSession) {
      loadScheduleData();
    }
  }, [currentSession, loadScheduleData]);

  // Render et Functions
  const renderExcelUpload = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Excel Dosyası Yükle
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!uploadedFile ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Excel dosyasını seçin</p>
              <p className="text-gray-600 mb-4">
                Desteklenen formatlar: .xlsx, .xls, .csv
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="mb-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Dosya Seç
              </Button>
              <div className="text-sm text-gray-500 mt-4">
                <p>• Başlık satırı: 2. satır (varsayılan)</p>
                <p>• Veri başlangıcı: 3. satır</p>
                <p>• Gerekli sütunlar: Firma, Stok Kartı, Hasır Cinsi, Boy, En, Birim Ağırlık, Ü. Kalan</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">{uploadedFile.name}</p>
                    <p className="text-sm text-green-600">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {parsedData && (
                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      {parsedData.totalRows} satır veri okundu.
                      Sütun eşleştirmelerini kontrol edin ve devam edin.
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={() => setShowColumnMapping(true)}
                    className="w-full"
                    size="lg"
                  >
                    <ArrowRight className="h-5 w-5 mr-2" />
                    Sütunları Eşleştir ve Devam Et
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderDashboard = () => {
    const data = realTimeData || {};

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">{data.summary?.totalOrders || 0}</div>
              <div className="text-sm text-gray-600">Toplam Sipariş</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{data.summary?.totalWeight || 0}kg</div>
              <div className="text-sm text-gray-600">Toplam Ağırlık</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold text-purple-600">{data.summary?.totalHours || 0}s</div>
              <div className="text-sm text-gray-600">Toplam Süre</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Factory className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold text-orange-600">{data.summary?.estimatedDays || 0}</div>
              <div className="text-sm text-gray-600">Tahmini Gün</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Makine Kullanım Oranları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.machines?.machines?.map((machine) => (
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
                    <span>{machine.totalHours}s / {machine.maxCapacity / 60}s</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMachineSchedules = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Makine Çizelgeleri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MACHINES.map(machine => (
            <div key={machine.id} className="border rounded-lg p-4">
              <div className="font-medium text-center mb-4">{machine.name}</div>
              <div className="space-y-2">
                {machineSchedules[machine.id]?.slice(0, 5).map((schedule, index) => (
                  <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                    <div className="font-medium">{schedule.customer}</div>
                    <div className="text-gray-600">{schedule.hasir_tipi}</div>
                    <div className="text-blue-600">{Math.round(schedule.weight)}kg</div>
                  </div>
                )) || (
                  <div className="text-center text-gray-500 text-sm py-4">
                    Sipariş planlanmamış
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Yükleniyor...</h2>
          <p className="text-gray-600">Sistem başlatılıyor</p>
        </div>
      </div>
    );
  }

  if (!currentSession && !isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Factory className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Planlama Oturumu Gerekli</h2>
          <p className="text-gray-600 mb-4">
            Üretim planlaması yapmak için önce bir oturum oluşturun.
          </p>
          <Button onClick={() => setShowCreateSession(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Oturum Oluştur
          </Button>
        </div>

        {/* Create Session Dialog */}
        <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Planlama Oturumu</DialogTitle>
              <DialogDescription>
                Üretim planlaması için yeni bir oturum oluşturun
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-name">Oturum Adı</Label>
                <Input
                  id="session-name"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Örnek: Ocak 2025 Planlaması"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateSession(false)}>
                  İptal
                </Button>
                <Button onClick={createSession}>
                  Oluştur
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Çelik Hasır Üretim Planlaması</h1>
          <p className="text-gray-600">
            {currentSession ? `${currentSession.session_name} - ${new Date(currentSession.created_at).toLocaleDateString('tr-TR')}` : 'Oturum seçin'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={loadScheduleData}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Oturum Yönetimi
            </div>
            <Button
              onClick={() => setShowCreateSession(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Oturum
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Aktif Oturum</Label>
              <Select
                value={currentSession?.id?.toString()}
                onValueChange={(value) => {
                  const session = sessions.find(s => s.id.toString() === value);
                  setCurrentSession(session);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Oturum seçin" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.id} value={session.id.toString()}>
                      {session.session_name} ({new Date(session.created_at).toLocaleDateString('tr-TR')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentSession && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-lg font-bold text-blue-600">{currentSession.total_products || 0}</div>
                  <div className="text-xs text-blue-700">Toplam Ürün</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-lg font-bold text-green-600">{currentSession.total_regular_products || 0}</div>
                  <div className="text-xs text-green-700">Normal Ürün</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <div className="text-lg font-bold text-purple-600">{currentSession.system_efficiency_percent || 0}%</div>
                  <div className="text-xs text-purple-700">Sistem Verimliliği</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded">
                  <div className="text-lg font-bold text-orange-600">{currentSession.overall_utilization_percent || 0}%</div>
                  <div className="text-xs text-orange-700">Genel Kullanım</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Dosya Yükleme</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="schedules">Çizelgeler</TabsTrigger>
          <TabsTrigger value="settings">Ayarlar</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {renderExcelUpload()}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          {renderDashboard()}
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          {renderMachineSchedules()}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sistem Ayarları</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Geliştirilmekte...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Column Mapping Dialog - Exact design from CelikHasirHesaplama */}
      {showColumnMapping && parsedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Üretim Planlaması Sütun Eşleştirme</h2>
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-md font-medium">
                {parsedData.totalRows} satır tespit edildi
              </span>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Excel dosyanızdaki sütunları sistem alanlarıyla eşleştirin. Otomatik tespit edilen sütunlar işaretlenmiştir.
              </p>

              <div className="flex justify-between items-center mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlık Satırı</label>
                  <select
                    value={headerRowIndex}
                    onChange={(e) => {
                      setHeaderRowIndex(parseInt(e.target.value));
                      if (uploadedFile) parseFile(uploadedFile);
                    }}
                    className="border rounded-md p-2"
                  >
                    <option value="0">1. Satır</option>
                    <option value="1">2. Satır (Önerilen)</option>
                    <option value="2">3. Satır</option>
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newMappings = autoDetectColumns(parsedData?.headers);
                    setColumnMappings(newMappings);
                    toast.success('Otomatik eşleştirme yapıldı');
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Otomatik Algıla
                </Button>
              </div>

              {/* Column Mapping Grid - Exact style from CelikHasirHesaplama */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {REQUIRED_COLUMNS.map((column) => {
                  const mappedIndex = Object.entries(columnMappings).find(([_, v]) => v === column.key)?.[0];
                  const isMapped = mappedIndex !== undefined;
                  const isAuto = isAutoDetected(column.key, mappedIndex);

                  return (
                    <div key={column.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {column.label} {column.required && <span className="text-red-500">*</span>}
                        {isAuto && <span className="text-green-600 text-xs ml-2">✓ Otomatik</span>}
                      </label>
                      <select
                        className={`w-full border rounded-md p-2 ${isMapped ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                        value={mappedIndex || '-1'}
                        onChange={(e) => handleMappingChange(column.key, e.target.value)}
                      >
                        <option value="-1">Seçiniz</option>
                        {parsedData.headers.map((header, index) => (
                          <option key={index} value={index}>
                            Sütun {String.fromCharCode(65 + index)}: {header || `Sütun ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Veri Önizlemesi (İlk 5 Satır)</h3>
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {parsedData.headers.map((header, idx) => (
                        <th key={idx} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {String.fromCharCode(65 + idx)}: {header || `Sütun ${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedData.data.slice(0, 5).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-2 text-sm text-gray-900">
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Validation and Actions */}
            <div className="flex justify-between items-center">
              <div>
                {!isValidMappings() && (
                  <div className="text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    Zorunlu sütunları eşleştirin: {
                      REQUIRED_COLUMNS
                        .filter(col => col.required && !Object.values(columnMappings).includes(col.key))
                        .map(col => col.label)
                        .join(', ')
                    }
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => {
                  setShowColumnMapping(false);
                  setUploadedFile(null);
                  setParsedData(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}>
                  İptal
                </Button>
                <Button
                  onClick={handleProcessData}
                  disabled={isProcessing || !isValidMappings()}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      İşleniyor...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Devam Et ve Planla
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Dialog */}
      <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Planlama Oturumu</DialogTitle>
            <DialogDescription>
              Üretim planlaması için yeni bir oturum oluşturun
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-session-name">Oturum Adı</Label>
              <Input
                id="new-session-name"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Örnek: Ocak 2025 Planlaması"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateSession(false)}>
                İptal
              </Button>
              <Button onClick={createSession}>
                Oluştur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CelikHasirPlanlama;