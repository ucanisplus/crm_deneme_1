import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import {
  Factory,
  Calendar,
  Clock,
  Settings,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  Plus,
  Trash2,
  Eye,
  Download,
  AlertTriangle,
  CheckCircle,
  Zap,
  Users,
  Package,
  Target,
  Activity,
  Upload,
  FileSpreadsheet,
  X,
  Loader,
  Info,
  TrendingUp,
  Gauge,
  Truck,
  Move,
  Edit,
  GitBranch,
  ChevronDown
} from 'lucide-react';
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

const CelikHasirPlanlama = () => {
  const { user, hasPermission, permissions, loading: authLoading } = useAuth();
  const router = useRouter();

  // API Base URL
  const API_BASE_URL = 'https://crm-deneme-backend.vercel.app/api';

  // Core state management
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [machineSchedules, setMachineSchedules] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState(null);

  // Excel Upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMappings, setColumnMappings] = useState({});
  const [parsedData, setParsedData] = useState(null);
  const [headerRowIndex, setHeaderRowIndex] = useState(1); // Default to row 2
  const fileInputRef = useRef(null);

  // Session Management state
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  // Standard column mapping for CSV format (A=0, B=1, etc.)
  const STANDARD_COLUMNS = useMemo(() => ({
    0: 'S. Tarihi',
    1: 'Firma',
    2: 'Stok Kartı',
    3: 'Hasır cinsi',
    4: 'Boy',
    5: 'En',
    6: 'Boy çap',
    7: 'En çap',
    8: 'Boy ara',
    9: 'En ara',
    10: 'Filiz Ön',
    11: 'Filiz Arka',
    12: 'Filiz Sağ',
    13: 'Filiz Sol',
    14: 'Birim ağırlık',
    15: 'Sipariş miktarı adet',
    16: 'stok(adet)',
    17: 'stok(kg)',
    18: 'Ü. Kalan',
    19: 'Kalan Kg'
  }), []);

  const REQUIRED_COLUMNS = [
    'Firma',
    'Stok Kartı',
    'Hasır cinsi',
    'Boy',
    'En',
    'Birim ağırlık',
    'Ü. Kalan'
  ];

  const MACHINES = useMemo(() => [
    { id: 'MG316', name: 'MG316', maxCapacity: 24 },
    { id: 'EUROBEND', name: 'EUROBEND', maxCapacity: 24 },
    { id: 'MG208-1', name: 'MG208-1', maxCapacity: 24 },
    { id: 'MG208-2', name: 'MG208-2', maxCapacity: 24 }
  ], []);

  // Session Management Functions - moved before useEffect to avoid initialization issues
  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/celik-hasir-planlama/sessions`);
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
  }, [API_BASE_URL, currentSession]);

  // Initialize component
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Check permissions without causing infinite loop
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

    // For standard format, use position-based mapping
    if (headers && headers.length >= 20) {
      Object.entries(STANDARD_COLUMNS).forEach(([index, columnName]) => {
        const headerIndex = parseInt(index);
        if (headerIndex < headers.length && headers[headerIndex]) {
          mappings[headers[headerIndex].toString().trim()] = columnName;
        }
      });
      return mappings;
    }

    // Fallback pattern matching
    const patterns = {
      'S. Tarihi': /s\.?\s*tarihi?/i,
      'Firma': /firma|müşteri|customer/i,
      'Stok Kartı': /stok.*kart|stok.*kod/i,
      'Hasır cinsi': /hasır.*cins/i,
      'Boy': /^boy$/i,
      'En': /^en$/i,
      'Boy çap': /boy.*çap/i,
      'En çap': /en.*çap/i,
      'Birim ağırlık': /birim.*ağır|ağır/i,
      'Ü. Kalan': /ü\.?\s*kalan|uret.*kalan/i
    };

    headers.forEach((header, index) => {
      if (!header) return;
      const headerStr = header.toString().trim();

      Object.entries(patterns).forEach(([columnName, pattern]) => {
        if (pattern.test(headerStr)) {
          mappings[headerStr] = columnName;
        }
      });
    });

    return mappings;
  }, [STANDARD_COLUMNS]);

  const createSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Oturum adı gereklidir');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/celik-hasir-planlama/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Excel Upload Functions - parseFile moved before handleFileUpload to avoid initialization issues
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
      setShowColumnMapping(true);

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

  const validateMappings = () => {
    const mappedColumns = new Set(Object.values(columnMappings));
    const missingColumns = REQUIRED_COLUMNS.filter(col => !mappedColumns.has(col));

    if (missingColumns.length > 0) {
      toast.error(`Eksik sütunlar: ${missingColumns.join(', ')}`);
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

      const reverseMapping = {};
      Object.entries(columnMappings).forEach(([header, column]) => {
        reverseMapping[column] = headers.indexOf(header);
      });

      // Process each data row
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const uretimKalan = parseInt(row[reverseMapping['Ü. Kalan']] || 0);
        if (uretimKalan <= 0) continue;

        const order = {
          siparis_tarihi: row[reverseMapping['S. Tarihi']] || null,
          firma: row[reverseMapping['Firma']] || '',
          stok_kodu: row[reverseMapping['Stok Kartı']] || '',
          hasir_cinsi: row[reverseMapping['Hasır cinsi']] || '',
          boy: parseInt(row[reverseMapping['Boy']] || 500),
          en: parseInt(row[reverseMapping['En']] || 215),
          boy_cap: parseFloat(row[reverseMapping['Boy çap']] || 4.5),
          en_cap: parseFloat(row[reverseMapping['En çap']] || 4.5),
          boy_ara: parseFloat(row[reverseMapping['Boy ara']] || 15),
          en_ara: parseFloat(row[reverseMapping['En ara']] || 15),
          filiz_on: parseFloat(row[reverseMapping['Filiz Ön']] || 0),
          filiz_arka: parseFloat(row[reverseMapping['Filiz Arka']] || 0),
          filiz_sag: parseFloat(row[reverseMapping['Filiz Sağ']] || 0),
          filiz_sol: parseFloat(row[reverseMapping['Filiz Sol']] || 0),
          birim_agirlik: parseFloat(row[reverseMapping['Birim ağırlık']] || 0),
          siparis_miktari: parseInt(row[reverseMapping['Sipariş miktarı adet']] || 0),
          stok_adet: parseInt(row[reverseMapping['stok(adet)']] || 0),
          stok_kg: parseFloat(row[reverseMapping['stok(kg)']] || 0),
          uretim_kalan: uretimKalan,
          kalan_kg: parseFloat(row[reverseMapping['Kalan Kg']] || (uretimKalan * parseFloat(row[reverseMapping['Birim ağırlık']] || 0)))
        };

        // Enhance with stock database information if stock code exists
        if (order.stok_kodu && order.stok_kodu.trim()) {
          try {
            const stockResponse = await fetch(`${API_BASE_URL}/celik-hasir-planlama/stock/${encodeURIComponent(order.stok_kodu)}`);
            if (stockResponse.ok) {
              const stockData = await stockResponse.json();
              if (stockData && stockData.length > 0) {
                const stock = stockData[0];
                order.has_stock_data = true;
                order.dis_cap_boy_cubuk_ad = stock.dis_cap_boy_cubuk_ad;
                order.dis_cap_en_cubuk_ad = stock.dis_cap_en_cubuk_ad;
                order.ic_cap_boy_cubuk_ad = stock.ic_cap_boy_cubuk_ad;
                order.ic_cap_en_cubuk_ad = stock.ic_cap_en_cubuk_ad;
                order.stock_complexity_score = (stock.dis_cap_boy_cubuk_ad || 0) + (stock.dis_cap_en_cubuk_ad || 0);
              }
            }
          } catch (stockError) {
            console.warn('Stock lookup failed for', order.stok_kodu, stockError);
            order.has_stock_data = false;
          }
        }

        // Calculate derived fields
        order.primary_diameter = Math.max(order.boy_cap, order.en_cap);
        order.secondary_diameter = Math.min(order.boy_cap, order.en_cap);
        order.mesh_type = extractMeshType(order.hasir_cinsi);
        order.total_tonnage = (order.birim_agirlik * order.uretim_kalan) / 1000;
        order.is_stock_customer = (order.firma || '').includes('ALBAYRAK MÜŞTERİ');
        order.is_filler_product = !order.firma || order.firma.trim() === '';
        order.is_regular_product = order.uretim_kalan > 0;

        if (order.stok_kodu && order.primary_diameter > 0) {
          processedOrders.push(order);
        }
      }

      // Send to backend for processing
      const response = await fetch(`${API_BASE_URL}/celik-hasir-planlama/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.id,
          orders: processedOrders,
          total_orders: processedOrders.length
        })
      });

      if (!response.ok) throw new Error('Backend processing failed');

      // Trigger scheduling
      const scheduleResponse = await fetch(`${API_BASE_URL}/celik-hasir-planlama/schedule/${currentSession.id}`, {
        method: 'POST'
      });

      const scheduleResult = await scheduleResponse.json();

      toast.success(`✅ ${processedOrders.length} sipariş başarıyla planlandı!`);
      toast.success(`📊 ${scheduleResult.total_production_days} gün üretim süresi`);

      // Reset and switch to dashboard
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

  const extractMeshType = (hasirCinsi) => {
    const upperStr = (hasirCinsi || '').toUpperCase();
    if (upperStr.includes('Q')) return 'Q';
    if (upperStr.includes('R')) return 'R';
    if (upperStr.includes('TR')) return 'TR';
    if (upperStr.includes('S')) return 'S';
    return 'UNKNOWN';
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

  // Dashboard Functions - processScheduleData moved before loadScheduleData to avoid initialization issues
  const processScheduleData = useCallback((schedules, orders) => {
    const machineStats = {};
    const customerStats = {};
    let totalOrders = 0;
    let totalWeight = 0;
    let totalTime = 0;

    // Initialize machine stats
    MACHINES.forEach(machine => {
      machineStats[machine.id] = {
        id: machine.id,
        name: machine.name,
        orders: [],
        totalTime: 0,
        utilizationPercent: 0,
        orderCount: 0,
        totalHours: 0,
        maxCapacity: machine.maxCapacity * 60 // Convert to minutes
      };
    });

    // Process schedules
    schedules.forEach(schedule => {
      const machine = schedule.assigned_machine_id;
      if (machineStats[machine]) {
        machineStats[machine].orders.push(schedule);
        machineStats[machine].totalTime += schedule.production_time_minutes || 0;
        machineStats[machine].orderCount++;
      }
      totalTime += schedule.production_time_minutes || 0;
    });

    // Calculate machine utilization
    Object.values(machineStats).forEach(machine => {
      machine.totalHours = Math.round(machine.totalTime / 60);
      machine.utilizationPercent = Math.round((machine.totalTime / machine.maxCapacity) * 100);
    });

    // Process orders for customer stats
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
        avgOrdersPerCustomer: Math.round(totalOrders / Math.max(Object.keys(customerStats).length, 1)),
        newOrdersToday: 0
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
        fetch(`${API_BASE_URL}/celik-hasir-planlama/schedules/${currentSession.id}`),
        fetch(`${API_BASE_URL}/celik-hasir-planlama/orders/${currentSession.id}`)
      ]);

      const schedules = await schedulesResponse.json();
      const orders = await ordersResponse.json();

      // Process data for dashboard
      const processedData = processScheduleData(schedules, orders);
      setRealTimeData(processedData);

      // Group schedules by machine
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
  }, [currentSession?.id, API_BASE_URL, MACHINES, processScheduleData]);

  // Load schedule data when session changes
  useEffect(() => {
    if (currentSession) {
      loadScheduleData();
    }
  }, [currentSession, loadScheduleData]);

  const processing = isProcessing;

  // Render Functions
  const renderSessionManagement = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Oturum Yönetimi
          </div>
          <Button onClick={() => setShowCreateSession(true)} size="sm">
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

      {/* Create Session Dialog */}
      <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Planlama Oturumu</DialogTitle>
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
                Oturum Oluştur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );

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
                disabled={processing}
              />
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Excel dosyasını seçin</p>
              <p className="text-gray-600 mb-4">
                Desteklenen formatlar: .xlsx, .xls, .csv
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="mb-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Dosya Seç
              </Button>
              <div className="text-sm text-gray-500 mt-4">
                <p>• Başlık satırı: 2. satır (varsayılan)</p>
                <p>• Veri başlangıcı: 3. satır</p>
                <p>• Gerekli sütunlar: Firma, Stok Kartı, Hasır cinsi, Boy, En, Birim ağırlık, Ü. Kalan</p>
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
                  disabled={processing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {parsedData && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {parsedData.totalRows} satır veri okundu. Sütun eşleşmeleri kontrol edin.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {processing && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Loader className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <div>
                <p className="font-medium">Üretim planlaması yapılıyor...</p>
                <p className="text-sm text-gray-600">
                  Bu işlem birkaç dakika sürebilir
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderDashboard = () => {
    const data = realTimeData || {};

    return (
      <div className="space-y-6">
        {/* Executive Summary */}
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

        {/* Machine Utilization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Makine Kullanım Oranları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.machines?.machines?.map((machine, index) => (
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

  // Show loading while auth is initializing
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
      {renderSessionManagement()}

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

      {/* Column Mapping Dialog */}
      <Dialog open={showColumnMapping} onOpenChange={setShowColumnMapping}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sütunları Eşleştir</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header Row Selection */}
            <div className="space-y-2">
              <Label>Başlık Satırı</Label>
              <Select
                value={headerRowIndex.toString()}
                onValueChange={(value) => setHeaderRowIndex(parseInt(value))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">1. Satır</SelectItem>
                  <SelectItem value="1">2. Satır (Önerilen)</SelectItem>
                  <SelectItem value="2">3. Satır</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Column Mappings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-3">Excel Sütunları</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parsedData?.headers.map((header, index) => (
                    <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                      {String.fromCharCode(65 + index)}: {header || `Sütun ${index + 1}`}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Sistem Sütunları</h4>
                <div className="space-y-2">
                  {REQUIRED_COLUMNS.map(column => (
                    <div key={column} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{column}</span>
                      <Badge variant={
                        Object.values(columnMappings).includes(column) ? "default" : "destructive"
                      }>
                        {Object.values(columnMappings).includes(column) ? "Eşleşti" : "Gerekli"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowColumnMapping(false)}>
                İptal
              </Button>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const newMappings = autoDetectColumns(parsedData?.headers);
                    setColumnMappings(newMappings);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Otomatik Eşle
                </Button>
                <Button
                  onClick={handleProcessData}
                  disabled={processing || !validateMappings()}
                >
                  {processing ? (
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Planlamayı Başlat
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CelikHasirPlanlama;