"use client";

import React, { useState } from 'react';
import { User, Mail, Phone, Building, Shield, Camera, Save, Key, Bell, Globe, Palette } from 'lucide-react';
import MainLayout3 from '@/components/MainLayout3';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import { useAuth } from '@/context/AuthContext';
// import ProfilePictureUpload from '@/components/ProfilePictureUpload';

export default function ProfilePage() {
  const { user, profilePicture } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || 'kullanici@albayrakdemir.com',
    phone: '+90 555 123 4567',
    department: 'Üretim Yönetimi',
    role: user?.role || 'user'
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    systemNotifications: true,
    language: 'tr',
    theme: 'light'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences({
      ...preferences,
      [key]: value
    });
  };

  const handleSaveProfile = () => {
    // Profil kaydetme işlemi
    alert('Profil bilgileri kaydedildi!');
  };

  const handleSavePreferences = () => {
    // Tercihler kaydetme işlemi
    alert('Tercihler kaydedildi!');
  };

  const handleChangePassword = () => {
    // Şifre değiştirme işlemi
    alert('Şifre değiştirme e-postası gönderildi!');
  };

  return (
    <ClientAuthCheck>
      <MainLayout3>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Profil ve Ayarlar</h1>
          
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profil Bilgileri
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'preferences'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tercihler
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'security'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Güvenlik
              </button>
            </nav>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-6 mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                    {profilePicture ? (
                      <img src={profilePicture} alt={user?.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-600 text-white">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors">
                    <Camera size={16} />
                  </button>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{user?.username}</h2>
                  <p className="text-sm text-gray-500">{user?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline w-4 h-4 mr-1" />
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="inline w-4 h-4 mr-1" />
                    E-posta
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="inline w-4 h-4 mr-1" />
                    Telefon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building className="inline w-4 h-4 mr-1" />
                    Departman
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Save size={16} />
                  Kaydet
                </button>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bildirim Ayarları</h3>
              
              <div className="space-y-4 mb-6">
                <label className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    E-posta Bildirimleri
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Bell className="w-4 h-4 mr-2 text-gray-500" />
                    Sistem Bildirimleri
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.systemNotifications}
                    onChange={(e) => handlePreferenceChange('systemNotifications', e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                </label>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Uygulama Ayarları</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="inline w-4 h-4 mr-1" />
                    Dil
                  </label>
                  <select
                    value={preferences.language}
                    onChange={(e) => handlePreferenceChange('language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Palette className="inline w-4 h-4 mr-1" />
                    Tema
                  </label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="light">Açık Tema</option>
                    <option value="dark">Koyu Tema</option>
                    <option value="auto">Sistem Teması</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSavePreferences}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Save size={16} />
                  Kaydet
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Güvenlik Ayarları</h3>
              
              <div className="space-y-6">
                <div className="pb-6 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Şifre Değiştir</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Hesabınızın güvenliği için şifrenizi düzenli olarak değiştirmenizi öneririz.
                  </p>
                  <button
                    onClick={handleChangePassword}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Key size={16} />
                    Şifre Değiştir
                  </button>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Son Giriş Bilgileri</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Son Giriş:</span> Bugün, 09:45
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">IP Adresi:</span> 192.168.1.100
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Cihaz:</span> Windows - Chrome
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">İki Faktörlü Doğrulama</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Hesabınıza ekstra güvenlik katmanı ekleyin.
                  </p>
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <Shield size={16} />
                    İki Faktörlü Doğrulamayı Etkinleştir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </MainLayout3>
    </ClientAuthCheck>
  );
}