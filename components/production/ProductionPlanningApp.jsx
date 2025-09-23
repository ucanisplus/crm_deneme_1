import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { toast } from 'react-toastify';
import { API_URLS, fetchWithAuth } from '@/api-config';
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
  Activity
} from 'lucide-react';

// Import our production components
import ExcelUploadModule from './ExcelUploadModule';
import SessionManagement from './SessionManagement';
import MachineSchedulesGrid from './MachineSchedulesGrid';
import ProductionDashboard from './ProductionDashboard';
import ActionPanel from './ActionPanel';

const ProductionPlanningApp = () => {
  const { user, hasPermission } = useAuth();
  const router = useRouter();

  // Core state management
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [machineSchedules, setMachineSchedules] = useState({});
  const [dashboardData, setDashboardData] = useState({});

  // UI state
  const [viewMode, setViewMode] = useState('planning');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Session management state
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  // Machine configuration
  const machines = useMemo(() => [
    { id: 'MG316', name: 'MG316', type: 'mesh', maxCapacity: 24 },
    { id: 'MG208-1', name: 'MG208-1', type: 'mesh', maxCapacity: 24 },
    { id: 'MG208-2', name: 'MG208-2', type: 'mesh', maxCapacity: 24 },
    { id: 'EUROBEND', name: 'EUROBEND', type: 'mesh', maxCapacity: 24 }
  ], []);

  // Permission check
  useEffect(() => {
    if (!user) return;

    if (!hasPermission('page:planlama')) {
      toast.error('Üretim planlaması için yetkiniz bulunmamaktadır');
      router.push('/unauthorized');
      return;
    }

    // Load initial data
    loadSessions();
  }, [user, hasPermission, router]);

  // Load sessions from API
  const loadSessions = async () => {
    setIsSessionLoading(true);
    try {
      const response = await fetchWithAuth(API_URLS.production.sessions);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);

        // Auto-select most recent session
        if (data.sessions && data.sessions.length > 0) {
          const recentSession = data.sessions[0];
          setCurrentSession(recentSession);
          await loadSessionData(recentSession.id);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Oturumlar yüklenemedi');
    } finally {
      setIsSessionLoading(false);
    }
  };

  // Load specific session data
  const loadSessionData = async (sessionId) => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      // Load production orders
      const ordersResponse = await fetchWithAuth(`${API_URLS.production.orders}?session_id=${sessionId}`);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setProductionOrders(ordersData.orders || []);
      }

      // Load machine schedules
      const schedulesResponse = await fetchWithAuth(`${API_URLS.production.schedules}?session_id=${sessionId}`);
      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        setMachineSchedules(schedulesData.schedules || {});
      }

      // Load dashboard data
      await loadDashboardData(sessionId);

    } catch (error) {
      console.error('Error loading session data:', error);
      toast.error('Oturum verileri yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Load dashboard analytics data
  const loadDashboardData = async (sessionId) => {
    try {
      const response = await fetchWithAuth(`${API_URLS.production.analytics}?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Handle session change
  const handleSessionChange = async (session) => {
    setCurrentSession(session);
    if (session) {
      await loadSessionData(session.id);
    } else {
      setProductionOrders([]);
      setMachineSchedules({});
      setDashboardData({});
    }
  };

  // Create new session
  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('Oturum adı giriniz');
      return;
    }

    try {
      const response = await fetchWithAuth(API_URLS.production.sessions, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSessionName.trim(),
          description: `Yeni üretim planı - ${new Date().toLocaleDateString('tr-TR')}`
        })
      });

      if (response.ok) {
        const newSession = await response.json();

        setSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
        setNewSessionName('');
        setShowNewSessionDialog(false);

        // Clear current data for new session
        setProductionOrders([]);
        setMachineSchedules({});
        setDashboardData({});

        toast.success('Yeni oturum oluşturuldu');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Session creation failed');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error(`Oturum oluşturulamadı: ${error.message}`);
    }
  };

  // Handle Excel upload completion
  const handleUploadComplete = async (uploadResult) => {
    setUploadProgress(null);
    setIsProcessing(false);

    if (uploadResult.success) {
      // Reload session data to reflect new uploads
      await loadSessionData(currentSession.id);
      toast.success(`${uploadResult.total_products} ürün yüklendi`);
    } else {
      toast.error(uploadResult.message || 'Yükleme başarısız');
    }
  };

  // Run scheduling algorithm
  const handleRunScheduling = async () => {
    if (!currentSession) {
      toast.error('Önce bir oturum seçiniz');
      return;
    }

    if (productionOrders.length === 0) {
      toast.error('Üretim siparişi bulunmamaktadır');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetchWithAuth(API_URLS.production.runScheduling, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSession.id })
      });

      if (response.ok) {
        const result = await response.json();

        // Update schedules with new data
        setMachineSchedules(result.schedules || {});

        // Reload dashboard data
        await loadDashboardData(currentSession.id);

        toast.success('Üretim planlaması tamamlandı');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Scheduling failed');
      }
    } catch (error) {
      console.error('Error running scheduling:', error);
      toast.error(`Planlama hatası: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle schedule updates (drag & drop)
  const handleScheduleUpdate = async (machineId, updatedSchedule) => {
    try {
      const response = await fetchWithAuth(API_URLS.production.updateSchedule, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSession.id,
          machine_id: machineId,
          schedule: updatedSchedule
        })
      });

      if (response.ok) {
        // Update local state
        setMachineSchedules(prev => ({
          ...prev,
          [machineId]: updatedSchedule
        }));

        // Reload dashboard data to reflect changes
        await loadDashboardData(currentSession.id);
      } else {
        throw new Error('Schedule update failed');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Çizelge güncellenemedi');
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (!currentSession) {
      toast.error('Önce bir oturum seçiniz');
      return;
    }

    try {
      const response = await fetchWithAuth(
        `${API_URLS.production.export}?session_id=${currentSession.id}&format=excel`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `uretim_plani_${currentSession.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('Excel dosyası indirildi');
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Export hatası');
    }
  };

  // Clear session data
  const handleClearSession = async () => {
    if (!currentSession) return;

    if (!confirm('Bu oturumdaki tüm veriler silinecek. Emin misiniz?')) {
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_URLS.production.sessions}/${currentSession.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from sessions list
        setSessions(prev => prev.filter(s => s.id !== currentSession.id));

        // Clear current session
        setCurrentSession(null);
        setProductionOrders([]);
        setMachineSchedules({});
        setDashboardData({});

        toast.success('Oturum silindi');
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error clearing session:', error);
      toast.error('Oturum silinemedi');
    }
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalOrders = productionOrders.length;
    const totalWeight = productionOrders.reduce((sum, order) => sum + (order.total_weight || 0), 0);
    const scheduledOrders = Object.values(machineSchedules).flat().length;
    const completionRate = totalOrders > 0 ? (scheduledOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      totalWeight: Math.round(totalWeight),
      scheduledOrders,
      completionRate: Math.round(completionRate)
    };
  }, [productionOrders, machineSchedules]);

  if (!user || !hasPermission('page:planlama')) {
    return null;
  }

  return (
    <div className="production-planning-app min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Çelik Hasır Üretim Planlaması</h1>
              <p className="text-gray-600">Otomatik makine atama ve kapasite optimizasyonu</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Summary Stats */}
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{summaryStats.totalOrders}</div>
                <div className="text-xs text-gray-600">Sipariş</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{summaryStats.totalWeight}kg</div>
                <div className="text-xs text-gray-600">Toplam</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{summaryStats.completionRate}%</div>
                <div className="text-xs text-gray-600">Planlanan</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Session Management */}
        <div className="mb-6">
          <SessionManagement
            sessions={sessions}
            currentSession={currentSession}
            onSessionChange={handleSessionChange}
            onNewSession={() => setShowNewSessionDialog(true)}
            isLoading={isSessionLoading}
          />
        </div>

        {/* Tab Navigation */}
        <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="planning" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Üretim Planlaması
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Detaylı Analiz
            </TabsTrigger>
          </TabsList>

          {/* Planning Tab */}
          <TabsContent value="planning" className="space-y-0">
            <div className="grid grid-cols-12 gap-6">
              {/* Left Sidebar - Controls */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                <ExcelUploadModule
                  onUploadComplete={handleUploadComplete}
                  uploadProgress={uploadProgress}
                  isProcessing={isProcessing}
                  sessionId={currentSession?.id}
                />

                <ActionPanel
                  currentSession={currentSession}
                  onRunScheduling={handleRunScheduling}
                  onExportExcel={handleExportExcel}
                  onClearSession={handleClearSession}
                  isProcessing={isProcessing}
                  summaryStats={summaryStats}
                />
              </div>

              {/* Main Area - Machine Schedules */}
              <div className="col-span-12 lg:col-span-9">
                {currentSession ? (
                  <MachineSchedulesGrid
                    schedules={machineSchedules}
                    onScheduleUpdate={handleScheduleUpdate}
                    sessionId={currentSession.id}
                    machines={machines}
                    isLoading={isLoading}
                  />
                ) : (
                  <Card className="h-[600px] flex items-center justify-center">
                    <CardContent className="text-center">
                      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Oturum Seçin
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Üretim planlamasına başlamak için bir oturum seçin veya yeni oturum oluşturun
                      </p>
                      <Button onClick={() => setShowNewSessionDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Oturum
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            {currentSession ? (
              <ProductionDashboard
                dashboardData={dashboardData}
                currentSession={currentSession}
                onDataRefresh={() => loadDashboardData(currentSession.id)}
              />
            ) : (
              <Card className="h-[400px] flex items-center justify-center">
                <CardContent className="text-center">
                  <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Dashboard Görüntülenemedi
                  </h3>
                  <p className="text-gray-600">
                    Dashboard verilerini görüntülemek için bir oturum seçin
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Detaylı Analiz
                </h3>
                <p className="text-gray-600">
                  Gelişmiş analiz özellikleri yakında eklenecek
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Oturum Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sessionName">Oturum Adı</Label>
              <Input
                id="sessionName"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Örn: Ocak 2024 Üretim Planı"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowNewSessionDialog(false)}
              >
                İptal
              </Button>
              <Button onClick={handleCreateSession}>
                Oluştur
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionPlanningApp;