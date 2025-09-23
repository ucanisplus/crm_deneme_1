import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Download,
  Trash2,
  Zap,
  Clock,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader,
  Settings,
  FileText,
  BarChart3
} from 'lucide-react';

const ActionPanel = ({
  currentSession,
  onRunScheduling,
  onExportExcel,
  onClearSession,
  isProcessing,
  summaryStats
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const canRunScheduling = currentSession && summaryStats.totalOrders > 0 && !isProcessing;
  const canExport = currentSession && summaryStats.scheduledOrders > 0;

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Oturum Özeti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentSession ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {summaryStats.totalOrders}
                  </div>
                  <div className="text-xs text-blue-700">Toplam Sipariş</div>
                </div>

                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {summaryStats.totalWeight}
                  </div>
                  <div className="text-xs text-green-700">Toplam Ağırlık (kg)</div>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {summaryStats.scheduledOrders}
                  </div>
                  <div className="text-xs text-purple-700">Planlanan</div>
                </div>

                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {summaryStats.completionRate}%
                  </div>
                  <div className="text-xs text-orange-700">Tamamlanma</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Planlama İlerlemesi</span>
                  <span className="font-medium">{summaryStats.completionRate}%</span>
                </div>
                <Progress value={summaryStats.completionRate} className="h-2" />
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {summaryStats.totalOrders > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {summaryStats.totalOrders} sipariş
                  </Badge>
                )}

                {summaryStats.scheduledOrders > 0 && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {summaryStats.scheduledOrders} planlandı
                  </Badge>
                )}

                {summaryStats.totalWeight > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {summaryStats.totalWeight} kg
                  </Badge>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Oturum seçin</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Ana İşlemler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Run Scheduling */}
          <Button
            onClick={onRunScheduling}
            disabled={!canRunScheduling}
            className="w-full"
            size="sm"
          >
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                Planlama Yapılıyor...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Otomatik Planlama Çalıştır
              </>
            )}
          </Button>

          {/* Export Excel */}
          <Button
            onClick={onExportExcel}
            disabled={!canExport}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Excel Olarak İndir
          </Button>

          {/* Additional Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!currentSession}
              onClick={() => {
                // TODO: Open optimization settings
                console.log('Open optimization settings');
              }}
            >
              <Settings className="h-3 w-3 mr-1" />
              Ayarlar
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!currentSession}
              onClick={() => {
                // TODO: Generate report
                console.log('Generate report');
              }}
            >
              <FileText className="h-3 w-3 mr-1" />
              Rapor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warnings and Information */}
      {currentSession && (
        <Card>
          <CardContent className="p-4">
            {summaryStats.totalOrders === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Üretim planlaması için önce Excel dosyası yükleyiniz
                </AlertDescription>
              </Alert>
            )}

            {summaryStats.totalOrders > 0 && summaryStats.completionRate < 100 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {summaryStats.totalOrders - summaryStats.scheduledOrders} sipariş henüz planlanmamış.
                  Otomatik planlama çalıştırın.
                </AlertDescription>
              </Alert>
            )}

            {summaryStats.completionRate === 100 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-green-800">
                  Tüm siparişler başarıyla planlandı! Excel dosyasını indirebilirsiniz.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      {currentSession && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Tehlikeli İşlemler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showClearConfirm ? (
              <Button
                onClick={() => setShowClearConfirm(true)}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Oturumu Sil
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-600 mb-3">
                  Bu oturumdaki tüm veriler kalıcı olarak silinecek!
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setShowClearConfirm(false)}
                    variant="outline"
                    size="sm"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={() => {
                      onClearSession();
                      setShowClearConfirm(false);
                    }}
                    variant="destructive"
                    size="sm"
                  >
                    Sil
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-900 mb-2 text-sm">💡 İpuçları</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Excel dosyasında "Firma" sütunu boş olan ürünler dolgu olarak algılanır</li>
            <li>• Makine çizelgelerinde sürükle-bırak ile sıra değiştirebilirsiniz</li>
            <li>• Dashboard sekmesinden detaylı analiz görüntüleyebilirsiniz</li>
            <li>• Çizelge değişikliklerinden sonra planlamayı yeniden çalıştırın</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActionPanel;