import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Users,
  Package,
  Loader
} from 'lucide-react';

const SessionManagement = ({
  sessions,
  currentSession,
  onSessionChange,
  onNewSession,
  isLoading
}) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionStatus = (session) => {
    if (!session.status) return 'draft';
    return session.status;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { variant: 'secondary', label: 'Taslak' },
      active: { variant: 'default', label: 'Aktif' },
      completed: { variant: 'success', label: 'Tamamlandı' },
      archived: { variant: 'outline', label: 'Arşivlendi' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Oturum Yönetimi
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={onNewSession}>
              <Plus className="h-4 w-4 mr-1" />
              Yeni Oturum
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Session Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Aktif Oturum
            </label>
            {isLoading ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-gray-600">Oturumlar yükleniyor...</span>
              </div>
            ) : (
              <Select
                value={currentSession?.id || ''}
                onValueChange={(sessionId) => {
                  const session = sessions.find(s => s.id === sessionId);
                  onSessionChange(session);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Oturum seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{session.name}</span>
                        <div className="flex items-center gap-2 ml-2">
                          {getStatusBadge(getSessionStatus(session))}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {sessions.length === 0 && (
                    <SelectItem value="no-session" disabled>
                      Oturum bulunamadı
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Current Session Details */}
          {currentSession && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{currentSession.name}</h4>
                  {currentSession.description && (
                    <p className="text-sm text-gray-600 mt-1">{currentSession.description}</p>
                  )}
                </div>
                {getStatusBadge(getSessionStatus(currentSession))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-gray-600">Oluşturulma</div>
                    <div className="font-medium">
                      {formatDate(currentSession.created_at)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-gray-600">Son Güncelleme</div>
                    <div className="font-medium">
                      {formatDate(currentSession.updated_at || currentSession.created_at)}
                    </div>
                  </div>
                </div>

                {currentSession.stats && (
                  <>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-gray-600">Sipariş Sayısı</div>
                        <div className="font-medium">
                          {currentSession.stats.total_orders || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-gray-600">Müşteri Sayısı</div>
                        <div className="font-medium">
                          {currentSession.stats.unique_customers || 0}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Session Progress */}
              {currentSession.stats && (
                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Planlama İlerlemesi</span>
                    <span className="font-medium">
                      {currentSession.stats.scheduled_orders || 0} / {currentSession.stats.total_orders || 0}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${currentSession.stats.total_orders > 0
                          ? ((currentSession.stats.scheduled_orders || 0) / currentSession.stats.total_orders) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {currentSession && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Open session settings
                  console.log('Open session settings');
                }}
                className="flex-1"
              >
                Ayarlar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Clone session
                  console.log('Clone session');
                }}
                className="flex-1"
              >
                Kopyala
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionManagement;