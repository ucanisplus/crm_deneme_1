// SatisGalvanizRequest.jsx
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth, normalizeInputValue } from '@/api-config';
import { toast } from 'react-toastify';

/**
 * Sales team request form component for galvanized wire products
 * This component allows sales team to create requests for the production team
 */
const SatisGalvanizRequest = () => {
  const { user, hasPermission } = useAuth();
  
  // State variables
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form data for MM GT request
  const [requestData, setRequestData] = useState({
    cap: '2.50',           // Default: 2.50mm
    kod_2: 'NIT',          // Default: NIT
    kaplama: '50',         // Default: 50 g/m²
    min_mukavemet: '350',  // Default: 350 MPa
    max_mukavemet: '550',  // Default: 550 MPa
    kg: '500',             // Default: 500 kg
    ic_cap: 45,            // Default: 45 cm
    dis_cap: 75,           // Default: 75 cm
    tolerans_plus: '0.05', // Default: ±0.05 mm
    tolerans_minus: '0.06', // Default: ±0.06 mm
    shrink: 'evet',         // Default: Yes
    unwinding: '',          // Optional
    cast_kont: '',          // Optional
    helix_kont: '',         // Optional
    elongation: '',         // Optional
    notes: ''               // Additional notes for the request
  });
  
  // Permission check
  if (!hasPermission('access:galvanizli-tel-request')) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Bu modüle erişim izniniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let normalizedValue = value;
    
    // Convert comma to point for decimal values and ensure proper format
    if (name === 'cap' || name === 'kaplama' || name === 'min_mukavemet' || 
        name === 'max_mukavemet' || name === 'kg' || 
        name === 'tolerans_plus' || name === 'tolerans_minus') {
      normalizedValue = normalizeInputValue(value);
    }
    
    setRequestData({
      ...requestData,
      [name]: normalizedValue
    });
  };
  
  // Cap input change also updates dis_cap automatically
  const handleCapChange = (e) => {
    const value = normalizeInputValue(e.target.value);
    setRequestData(prev => {
      const icCap = prev.ic_cap || 45;
      let disCap;
      
      if (icCap === 45) disCap = 75;
      else if (icCap === 50) disCap = 90;
      else if (icCap === 55) disCap = 105;
      else disCap = icCap + (parseFloat(value) * 10); // General calculation
      
      return {
        ...prev,
        cap: value,
        dis_cap: disCap
      };
    });
  };
  
  // Handle internal diameter change
  const handleIcCapChange = (e) => {
    const value = parseInt(e.target.value);
    setRequestData(prev => {
      let disCap;
      
      if (value === 45) disCap = 75;
      else if (value === 50) disCap = 90;
      else if (value === 55) disCap = 105;
      else disCap = value + (parseFloat(prev.cap) * 10); // General calculation
      
      return {
        ...prev,
        ic_cap: value,
        dis_cap: disCap
      };
    });
  };
  
  // Submit the request
  const submitRequest = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage('');
      
      // Create request object with additional fields
      const request = {
        ...requestData,
        status: 'pending',                // Initial status: pending
        created_by: user?.id || null,     // Track who created the request
        created_at: new Date().toISOString(), // Creation timestamp
        notes: requestData.notes || ''    // Additional notes
      };
      
      // Send the request to the API
      const response = await fetchWithAuth(API_URLS.galSalRequests, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      if (!response) {
        throw new Error('Sunucudan yanıt alınamadı.');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Talep oluşturulurken hata: ${errorText}`);
      }
      
      // Get the response data
      const data = await response.json();
      
      // Email notification placeholder - to be implemented later
      // sendEmailNotification(data);
      
      // Reset form after successful submission
      setRequestData({
        cap: '2.50',
        kod_2: 'NIT',
        kaplama: '50',
        min_mukavemet: '350',
        max_mukavemet: '550',
        kg: '500',
        ic_cap: 45,
        dis_cap: 75,
        tolerans_plus: '0.05',
        tolerans_minus: '0.06',
        shrink: 'evet',
        unwinding: '',
        cast_kont: '',
        helix_kont: '',
        elongation: '',
        notes: ''
      });
      
      // Show success message
      setSuccessMessage('Talep başarıyla oluşturuldu.');
      toast.success('Talep başarıyla oluşturuldu.');
      
    } catch (error) {
      console.error('Talep oluşturma hatası:', error);
      setError(error.message || 'Talep oluşturulurken bir hata meydana geldi.');
      toast.error(error.message || 'Talep oluşturulurken bir hata meydana geldi.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Galvanizli Tel Talebi Oluştur
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left column - Basic information */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tel Çapı (mm)</label>
            <input
              type="text"
              name="cap"
              value={requestData.cap}
              onChange={handleCapChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Örn: 2.50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kaplama Türü</label>
            <select
              name="kod_2"
              value={requestData.kod_2}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="NIT">NIT</option>
              <option value="PAD">PAD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kaplama (gr/m²)</label>
            <input
              type="text"
              name="kaplama"
              value={requestData.kaplama}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Örn: 50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Mukavemet (MPa)</label>
            <input
              type="text"
              name="min_mukavemet"
              value={requestData.min_mukavemet}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Örn: 350"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maksimum Mukavemet (MPa)</label>
            <input
              type="text"
              name="max_mukavemet"
              value={requestData.max_mukavemet}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Örn: 550"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ağırlık (kg)</label>
            <input
              type="text"
              name="kg"
              value={requestData.kg}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Örn: 500"
            />
          </div>
        </div>
        
        {/* Right column - Additional details */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İç Çap (cm)</label>
            <select
              name="ic_cap"
              value={requestData.ic_cap}
              onChange={handleIcCapChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={45}>45 cm</option>
              <option value={50}>50 cm</option>
              <option value={55}>55 cm</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dış Çap (cm)</label>
            <input
              type="text"
              name="dis_cap"
              value={requestData.dis_cap}
              disabled
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">Dış çap, iç çap ve tel çapına göre otomatik hesaplanır.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tolerans+ (mm)</label>
              <input
                type="text"
                name="tolerans_plus"
                value={requestData.tolerans_plus}
                onChange={handleInputChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: 0.05"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tolerans- (mm)</label>
              <input
                type="text"
                name="tolerans_minus"
                value={requestData.tolerans_minus}
                onChange={handleInputChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: 0.06"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shrink</label>
            <select
              name="shrink"
              value={requestData.shrink}
              onChange={handleInputChange}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="evet">Evet</option>
              <option value="hayir">Hayır</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ek Notlar</label>
            <textarea
              name="notes"
              value={requestData.notes}
              onChange={handleInputChange}
              rows={3}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Talep hakkında ek bilgiler..."
            ></textarea>
          </div>
        </div>
      </div>
      
      {/* Optional fields */}
      <div className="mb-6">
        <details className="bg-gray-50 rounded-md p-3">
          <summary className="font-medium text-gray-700 cursor-pointer">Opsiyonel Alanlar</summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unwinding</label>
              <input
                type="text"
                name="unwinding"
                value={requestData.unwinding}
                onChange={handleInputChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cast Kontrolü</label>
              <input
                type="text"
                name="cast_kont"
                value={requestData.cast_kont}
                onChange={handleInputChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Helix Kontrolü</label>
              <input
                type="text"
                name="helix_kont"
                value={requestData.helix_kont}
                onChange={handleInputChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Elongation</label>
              <input
                type="text"
                name="elongation"
                value={requestData.elongation}
                onChange={handleInputChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </details>
      </div>
      
      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={submitRequest}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              İşleniyor...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Talep Oluştur
            </>
          )}
        </button>
      </div>
      
      {/* Error and success messages */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}
      
      {/* Email notification placeholder */}
      <div className="mt-8 p-4 border border-dashed border-gray-300 rounded-md bg-gray-50">
        <h3 className="text-md font-medium text-gray-700 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email Bildirimi
        </h3>
        <p className="text-sm text-gray-600">
          Talep oluşturulduğunda üretim ekibine otomatik e-posta bildirimi gönderilecektir. 
          Bu özellik yakında eklenecektir.
        </p>
      </div>
    </div>
  );
};

export default SatisGalvanizRequest;