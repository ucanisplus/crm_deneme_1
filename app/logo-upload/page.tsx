"use client";
import React, { useState } from 'react';
import { Upload, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const LogoUploadPage = () => {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Check permissions
  if (!hasPermission('all')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erişim Reddedildi</h1>
          <p>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Only accept images
    if (!file.type.startsWith('image/')) {
      setError('Lütfen sadece resim dosyası seçin');
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setSelectedFile(file);
    setError('');
    setSuccess('');

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setError('');

      // Import the upload function
      const { uploadFile } = await import('@/lib/supabaseStorage');
      
      // Upload with specific filename for company logo
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `company-logo.${fileExt}`;
      
      // Create a new File object with the new name
      const renamedFile = new File([selectedFile], fileName, { type: selectedFile.type });
      
      // Upload to profile-pictures bucket
      const uploadedUrl = await uploadFile(renamedFile, 'profile-pictures', '');
      
      setSuccess(`Logo başarıyla yüklendi! URL: ${uploadedUrl}`);
      console.log('Logo URL:', uploadedUrl);
      
      // Clear form after successful upload
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
      }, 2000);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Logo yüklenirken bir hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Şirket Logosu Yükleme</h1>
          
          {/* Current Logo */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Mevcut Logo:</h2>
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
              <img 
                src="https://qanwthnnjyidnlaajnmg.supabase.co/storage/v1/object/public/profile-pictures/company-logo.png"
                alt="Mevcut Logo"
                className="max-h-32 mx-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<p class="text-gray-500 text-center">Logo henüz yüklenmemiş</p>';
                  }
                }}
              />
            </div>
          </div>

          {/* Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeni Logo Yükle:
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="logo-input"
            />
            <label
              htmlFor="logo-input"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="mr-2 h-5 w-5" />
              Dosya Seç
            </label>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Önizleme:</h3>
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="Logo önizleme"
                  className="max-h-48 rounded-lg shadow-md"
                />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              <Check className="inline mr-2" size={16} />
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                !selectedFile || isUploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isUploading ? 'Yükleniyor...' : 'Logoyu Yükle'}
            </button>
            
            <button
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50"
            >
              Geri Dön
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Not:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Logo otomatik olarak "company-logo" adıyla kaydedilecektir</li>
              <li>• Desteklenen formatlar: PNG, JPG, JPEG, GIF</li>
              <li>• Maksimum dosya boyutu: 5MB</li>
              <li>• Logo email bildirimlerinde kullanılacaktır</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoUploadPage;