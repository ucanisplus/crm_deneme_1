"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Calendar, Package, AlertCircle, TrendingUp, Users, Clock } from 'lucide-react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi } from '@/lib/crmApi';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  created_at?: string;
  is_read?: boolean;
  read: boolean;
  icon: React.ReactNode;
  action_link?: string;
  actionLink?: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Icon mapping from string to React component
  const iconMap: { [key: string]: React.ReactNode } = {
    'Bell': <Bell size={20} />,
    'Package': <Package size={20} />,
    'AlertCircle': <AlertCircle size={20} />,
    'TrendingUp': <TrendingUp size={20} />,
    'Users': <Users size={20} />,
    'Calendar': <Calendar size={20} />,
    'Clock': <Clock size={20} />
  };
  
  // Mock data as fallback
  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: 'Yeni Galvaniz Talebi',
      message: 'ABC Firması yeni bir galvaniz talebi oluşturdu. Talep #GT-2024-001',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 dakika önce
      read: false,
      icon: <Package size={20} />,
      actionLink: '/satis/galvaniz-talebi'
    },
    {
      id: '2',
      title: 'Maliyet Hesaplama Tamamlandı',
      message: 'Panel çit üretimi için maliyet hesaplaması başarıyla tamamlandı.',
      type: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 saat önce
      read: false,
      icon: <TrendingUp size={20} />,
      actionLink: '/uretim/hesaplamalar/maliyet'
    },
    {
      id: '3',
      title: 'Üretim Kapasitesi Uyarısı',
      message: 'Galvanizli tel üretim hattı %95 kapasiteye ulaştı.',
      type: 'warning',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 gün önce
      read: true,
      icon: <AlertCircle size={20} />,
      actionLink: '/uretim/hesaplamalar/kapasite'
    },
    {
      id: '4',
      title: 'Yeni Müşteri Kaydı',
      message: 'XYZ Ltd. Şti. sisteme yeni müşteri olarak eklendi.',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 gün önce
      read: true,
      icon: <Users size={20} />,
      actionLink: '/under-construction'
    },
    {
      id: '5',
      title: 'Aylık Rapor Hazır',
      message: 'Ocak 2024 üretim ve maliyet raporu hazırlandı.',
      type: 'info',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 gün önce
      read: true,
      icon: <Calendar size={20} />,
      actionLink: '/under-construction'
    }
  ];
  
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      // Use username for notifications (not numeric ID)
      const userId = user?.username || user?.user_id;
      
      if (userId) {
        try {
          console.log('Fetching notifications for user:', userId);
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://crm-deneme-backend.vercel.app/api'}/notifications/${userId}`);
          console.log('Response status:', response.status);
          const data = await response.json();
          console.log('Response data:', data);
          
          // Ensure data is an array and convert to our format
          if (Array.isArray(data)) {
            const formattedNotifications = data.map(notif => ({
              id: notif.id,
              title: notif.title,
              message: notif.message,
              type: notif.type,
              timestamp: new Date(notif.created_at || notif.timestamp),
              read: notif.is_read || notif.read || false,
              icon: iconMap[notif.icon] || iconMap['Bell'],
              actionLink: notif.action_link || notif.actionLink
            }));
            setNotifications(formattedNotifications);
          } else {
            console.error('Invalid notifications data:', data);
            setNotifications(mockNotifications);
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
          // Use mock data as fallback
          setNotifications(mockNotifications);
        } finally {
          setLoading(false);
        }
      } else {
        // Use mock data if no user ID
        console.log('No user ID found, using mock data');
        setNotifications(mockNotifications);
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const markAllAsRead = async () => {
    try {
      const userId = user?.username || user?.user_id;
      if (userId) {
        await notificationsApi.markAllAsRead(userId);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationsApi.deleteNotification(id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika önce`;
    } else if (diffInHours < 24) {
      return `${diffInHours} saat önce`;
    } else {
      return `${diffInDays} gün önce`;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'error':
        return 'bg-red-50 text-red-600 border-red-200';
      default:
        return 'bg-blue-50 text-blue-600 border-blue-200';
    }
  };

  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Bildirimler</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {unreadCount} okunmamış bildirim
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Tümünü Okundu İşaretle
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50"
                >
                  Tümünü Temizle
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4 animate-pulse">
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Bildirimler yükleniyor...
                </h3>
              </div>
            ) : notifications?.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Bildirim bulunmuyor
                </h3>
                <p className="text-gray-500">
                  Yeni bildirimler burada görünecek.
                </p>
              </div>
            ) : (
              notifications?.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg border ${notification.read ? 'border-gray-200' : 'border-red-300'} p-4 transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg ${getNotificationStyle(notification.type)}`}>
                        {notification.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-gray-900 ${!notification.read && 'font-bold'}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <Clock size={14} className="mr-1" />
                          {getTimeAgo(notification.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-4">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Okundu olarak işaretle"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Sil"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  {notification.actionLink && (
                    <a
                      href={notification.actionLink}
                      className="inline-block mt-3 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Detayları Gör →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}