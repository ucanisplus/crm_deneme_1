"use client";
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URLS } from '@/api-config';
import { User, Upload, X } from 'lucide-react';

const ProfilePictureUpload = () => {
  const { user, profilePicture } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // İşle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Only accept images
    if (!file.type.startsWith('image/')) {
      setError('Lütfen sadece resim dosyası seçin');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Oluştur preview URL
    const fileReader = new FileReader();
    fileReader.onload = () => {
      setPreviewUrl(fileReader.result);
    };
    fileReader.readAsDataURL(file);
  };

  // İşle file upload a Supabase
  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    try {
      setIsUploading(true);
      setError('');

      // Import the uploadFile function
      const { uploadFile } = await import('@/lib/supabaseStorage');
      
      // Upload file a Supabase Storage
      const uploadedUrl = await uploadFile(
        selectedFile, 
        'profile-pictures', 
        user.username
      );

      // Save profile picture URL to database
      const response = await fetch(API_URLS.updateProfilePicture, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          pp_url: uploadedUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Profil resmi güncellenemedi');
      }

      // You would typically reload the user Veri or Güncelle the Context here
      window.location.reload(); // Simple reload for now
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Bir hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  // İptal upload
  const cancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Profil Fotoğrafı</h2>

      {/* Current Profile Picture */}
      <div className="mb-6 flex items-center">
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0 bg-gray-100">
          {profilePicture ? (
            <img src={profilePicture} alt={user?.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-600">
              <User size={40} />
            </div>
          )}
        </div>
        <div className="ml-4">
          <p className="font-medium">{user?.username}</p>
          <p className="text-sm text-gray-500">{user?.role}</p>
        </div>
      </div>

      {/* Upload Preview */}
      {previewUrl && (
        <div className="mb-4">
          <div className="relative inline-block">
            <img src={previewUrl} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-blue-300" />
            <button 
              onClick={cancelUpload}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/4 -translate-y-1/4"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* File Upload */}
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Yeni Profil Fotoğrafı Yükle
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
          disabled={isUploading}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Yükleniyor...
            </>
          ) : (
            <>
              <Upload size={16} className="mr-2" />
              Yükle
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ProfilePictureUpload;
