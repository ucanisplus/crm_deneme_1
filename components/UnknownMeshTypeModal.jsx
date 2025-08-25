import React, { useState } from 'react';
import { AlertTriangle, Save, X } from 'lucide-react';

const UnknownMeshTypeModal = ({ isOpen, onClose, meshTypes = [], onSave, onSkipAndContinue }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [specifications, setSpecifications] = useState({
    boyCap: '',
    enCap: '',
    boyAralik: '',
    enAralik: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  
  const currentMeshType = meshTypes[currentIndex] || '';
  const totalTypes = meshTypes.length;

  const handleInputChange = (field, value) => {
    // Convert comma to period for decimal inputs
    const normalizedValue = value.replace(',', '.');
    setSpecifications(prev => ({
      ...prev,
      [field]: normalizedValue
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate each field
    Object.entries(specifications).forEach(([key, value]) => {
      const numValue = parseFloat(value);
      if (!value || value.trim() === '') {
        newErrors[key] = 'Bu alan zorunludur';
      } else if (isNaN(numValue) || numValue <= 0) {
        newErrors[key] = 'Geçerli bir pozitif sayı giriniz';
      }
    });

    // Additional validation for reasonable ranges
    const boyCap = parseFloat(specifications.boyCap);
    const enCap = parseFloat(specifications.enCap);
    const boyAralik = parseFloat(specifications.boyAralik);
    const enAralik = parseFloat(specifications.enAralik);

    if (boyCap && (boyCap < 3 || boyCap > 20)) {
      newErrors.boyCap = 'Boy çapı 3-20 mm arasında olmalıdır';
    }
    if (enCap && (enCap < 3 || enCap > 20)) {
      newErrors.enCap = 'En çapı 3-20 mm arasında olmalıdır';
    }
    if (boyAralik && (boyAralik < 5 || boyAralik > 100)) {
      newErrors.boyAralik = 'Boy aralığı 5-100 cm arasında olmalıdır';
    }
    if (enAralik && (enAralik < 5 || enAralik > 100)) {
      newErrors.enAralik = 'En aralığı 5-100 cm arasında olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Convert strings to numbers
      const meshConfig = {
        hasirTipi: currentMeshType,
        boyCap: parseFloat(specifications.boyCap),
        enCap: parseFloat(specifications.enCap),
        boyAralik: parseFloat(specifications.boyAralik),
        enAralik: parseFloat(specifications.enAralik),
        type: currentMeshType.substring(0, currentMeshType.match(/\d/) ? currentMeshType.search(/\d/) : currentMeshType.length).toUpperCase()
      };

      await onSave(meshConfig);
      
      // Reset form for next mesh type
      setSpecifications({
        boyCap: '',
        enCap: '',
        boyAralik: '',
        enAralik: ''
      });
      setErrors({});
      
      // Move to next mesh type or close if done
      if (currentIndex < totalTypes - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All mesh types processed, close modal
        setCurrentIndex(0);
        onClose();
      }
    } catch (error) {
      console.error('Error saving mesh type:', error);
      alert('Hasır tipi kaydedilirken hata oluştu: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSpecifications({
      boyCap: '',
      enCap: '',
      boyAralik: '',
      enAralik: ''
    });
    setErrors({});
    setCurrentIndex(0);
    onClose();
  };

  const handleSkipAndContinue = () => {
    setSpecifications({
      boyCap: '',
      enCap: '',
      boyAralik: '',
      enAralik: ''
    });
    setErrors({});
    setCurrentIndex(0);
    if (onSkipAndContinue) {
      onSkipAndContinue();
    } else {
      onClose();
    }
  };

  if (!isOpen || totalTypes === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 p-2 rounded-full">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                Bilinmeyen Hasır Tipi
              </h2>
              {totalTypes > 1 && (
                <div className="bg-gray-100 px-3 py-1 rounded-full">
                  <span className="text-sm font-medium text-gray-600">
                    {currentIndex + 1}/{totalTypes}
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600">
              <span className="font-medium">{currentMeshType}</span> için teknik özellikler gerekli
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Boy Çapı (mm)
            </label>
            <input
              type="text"
              value={specifications.boyCap}
              onChange={(e) => handleInputChange('boyCap', e.target.value)}
              placeholder="Örn: 8.0"
              className={`w-full p-3 border rounded-md ${
                errors.boyCap ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.boyCap && (
              <p className="text-red-500 text-xs mt-1">{errors.boyCap}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              En Çapı (mm)
            </label>
            <input
              type="text"
              value={specifications.enCap}
              onChange={(e) => handleInputChange('enCap', e.target.value)}
              placeholder="Örn: 6.0"
              className={`w-full p-3 border rounded-md ${
                errors.enCap ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.enCap && (
              <p className="text-red-500 text-xs mt-1">{errors.enCap}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Boy Aralığı (cm)
            </label>
            <input
              type="text"
              value={specifications.boyAralik}
              onChange={(e) => handleInputChange('boyAralik', e.target.value)}
              placeholder="Örn: 15.0"
              className={`w-full p-3 border rounded-md ${
                errors.boyAralik ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.boyAralik && (
              <p className="text-red-500 text-xs mt-1">{errors.boyAralik}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              En Aralığı (cm)
            </label>
            <input
              type="text"
              value={specifications.enAralik}
              onChange={(e) => handleInputChange('enAralik', e.target.value)}
              placeholder="Örn: 15.0"
              className={`w-full p-3 border rounded-md ${
                errors.enAralik ? 'border-red-500' : 'border-gray-300'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
            {errors.enAralik && (
              <p className="text-red-500 text-xs mt-1">{errors.enAralik}</p>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-md mt-4">
          <p className="text-blue-800 text-sm">
            <strong>Not:</strong> Bu bilgiler hasır tipinin çubuk sayısı ve ağırlık hesaplamalarında kullanılacaktır. 
            Kaydettiğiniz değerler gelecekte aynı hasır tipi için otomatik olarak kullanılacaktır.
          </p>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleClose}
            disabled={saving}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
          >
            <X size={16} className="inline mr-1" />
            İptal
          </button>
          <button
            onClick={handleSkipAndContinue}
            disabled={saving}
            className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm"
          >
            Atla ve Devam Et
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 text-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnknownMeshTypeModal;