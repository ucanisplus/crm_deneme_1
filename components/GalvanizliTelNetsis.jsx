import React, { useState, useEffect } from 'react';

const GalvanizliTelNetsis = () => {
  // Sekme durumu
  const [activeTab, setActiveTab] = useState('mm-gt-tanimla');
  
  // Durum bildirimleri
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // MM GT form verileri
  const [formData, setFormData] = useState({
    cap: '', // Çap (mm)
    kaplama_turu: 'NIT', // NIT veya PAD
    kaplama_miktari: '', // gr/m²
    min_mukavemet: '', // Min MPa
    max_mukavemet: '', // Max MPa
    tolerans_pozitif: '0', // +Tolerans (mm)
    tolerans_negatif: '0,06', // -Tolerans (mm)
    ic_cap: '45', // İç Çap (cm)
    dis_cap: '75', // Dış Çap (cm)
    agirlik: '', // Ağırlık (kg)
    sarim_yonu: 'Anti-Clockwise', // Clockwise veya Anti-Clockwise
    shrink: 'evet', // evet veya hayır
    cast_kont: '', // İsteğe bağlı
    helix_kont: '', // İsteğe bağlı
    elongation: '', // İsteğe bağlı
  });
  
  // YM ST seçimleri
  const [ymStList, setYmStList] = useState([]);
  const [selectedYmSt, setSelectedYmSt] = useState([]);
  const [newYmSt, setNewYmSt] = useState({
    cap: '',
    filmasin: '',
    kalite: '1006'
  });
  
  // Form değişikliklerini yönet
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Kaplama türü PAD ise kaplama miktarını 50 olarak ayarla
    if (name === 'kaplama_turu' && value === 'PAD') {
      setFormData(prev => ({
        ...prev,
        kaplama_miktari: '50'
      }));
    }
  };
  
  // MM GT doğrulama
  const validateMMGT = () => {
    // Çap kontrolü
    const cap = parseFloat(formData.cap.replace(',', '.'));
    if (isNaN(cap) || cap < 0.8 || cap > 8.0) {
      setErrorMessage('Çap 0.8 ile 8.0 mm arasında olmalıdır.');
      return false;
    }
    
    // Kaplama miktarı kontrolü
    const kaplama = parseInt(formData.kaplama_miktari);
    if (formData.kaplama_turu === 'NIT' && (isNaN(kaplama) || kaplama < 50 || kaplama > 400)) {
      setErrorMessage('NIT kaplama 50 ile 400 gr/m² arasında olmalıdır.');
      return false;
    }
    
    // Mukavemet kontrolü
    const minMukavemet = parseInt(formData.min_mukavemet);
    const maxMukavemet = parseInt(formData.max_mukavemet);
    if (isNaN(minMukavemet) || minMukavemet < 350 || minMukavemet > 1000) {
      setErrorMessage('Min mukavemet 350 ile 1000 MPa arasında olmalıdır.');
      return false;
    }
    if (isNaN(maxMukavemet) || maxMukavemet < minMukavemet || maxMukavemet > 1000) {
      setErrorMessage('Max mukavemet min mukavemetten büyük ve 1000 MPa\'dan küçük olmalıdır.');
      return false;
    }
    
    // Ağırlık kontrolü
    const agirlik = parseInt(formData.agirlik);
    if (isNaN(agirlik) || agirlik < 250 || agirlik > 1250) {
      setErrorMessage('Ağırlık 250 ile 1250 kg arasında olmalıdır.');
      return false;
    }
    
    setErrorMessage('');
    return true;
  };
  
  // MM GT oluştur
  const handleCreateMMGT = async () => {
    if (!validateMMGT()) return;
    
    setLoading(true);
    try {
      // API çağrısı simülasyonu
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Başarılı sonuç
      setSuccessMessage('MM GT ve YM GT başarıyla oluşturuldu.');
      setActiveTab('ym-st-sec');
    } catch (error) {
      setErrorMessage('MM GT oluşturulurken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Yeni YM ST ekle
  const handleAddNewYmSt = () => {
    if (!newYmSt.cap || !newYmSt.filmasin) {
      setErrorMessage('Çap ve Filmaşin alanları zorunludur.');
      return;
    }
    
    const newItem = {
      id: Date.now(),
      cap: newYmSt.cap,
      filmasin: newYmSt.filmasin,
      kalite: newYmSt.kalite,
      name: `YM Siyah Tel ${newYmSt.cap} mm HM:${newYmSt.filmasin}.${newYmSt.kalite}`
    };
    
    setSelectedYmSt(prev => [...prev, newItem]);
    setNewYmSt({
      cap: '',
      filmasin: '',
      kalite: '1006'
    });
    setErrorMessage('');
  };
  
  // YM ST listesinden seç
  const handleSelectYmSt = (item) => {
    if (!selectedYmSt.some(st => st.id === item.id)) {
      setSelectedYmSt(prev => [...prev, item]);
    }
  };
  
  // Seçili YM ST'yi çıkar
  const handleRemoveYmSt = (id) => {
    setSelectedYmSt(prev => prev.filter(item => item.id !== id));
  };
  
  // Excel oluştur
  const handleGenerateExcel = async () => {
    if (selectedYmSt.length === 0) {
      setErrorMessage('En az bir YM ST seçmelisiniz.');
      return;
    }
    
    setLoading(true);
    try {
      // API çağrısı simülasyonu
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Başarılı sonuç
      setSuccessMessage('Excel dosyaları başarıyla oluşturuldu.');
    } catch (error) {
      setErrorMessage('Excel oluşturulurken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // İlk yükleme - örnek YM ST listesi
  useEffect(() => {
    // Örnek veri
    setYmStList([
      { id: 1, cap: '0250', filmasin: '0600', kalite: '1006', name: 'YM Siyah Tel 0250 mm HM:0600.1006' },
      { id: 2, cap: '0350', filmasin: '0600', kalite: '1008', name: 'YM Siyah Tel 0350 mm HM:0600.1008' },
      { id: 3, cap: '0500', filmasin: '0700', kalite: '1010', name: 'YM Siyah Tel 0500 mm HM:0700.1010' },
    ]);
  }, []);
  
  // İç Çap değiştiğinde Dış Çap otomatik güncelleme
  useEffect(() => {
    const boyutlar = {
      '45': '75',
      '50': '90',
      '55': '105'
    };
    
    if (boyutlar[formData.ic_cap]) {
      setFormData(prev => ({
        ...prev,
        dis_cap: boyutlar[formData.ic_cap]
      }));
    }
  }, [formData.ic_cap]);

  return (
    <div className="space-y-4">
      {/* Bilgi ve Hata mesajları */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setErrorMessage('')}
                className="inline-flex text-red-400 focus:outline-none focus:text-red-500"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setSuccessMessage('')}
                className="inline-flex text-green-400 focus:outline-none focus:text-green-500"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sekmeler */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('mm-gt-tanimla')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'mm-gt-tanimla'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            MM GT Tanımla
          </button>
          <button
            onClick={() => setActiveTab('ym-st-sec')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'ym-st-sec'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            disabled={!successMessage && activeTab !== 'ym-st-sec'}
          >
            YM ST Seç
          </button>
          <button
            onClick={() => setActiveTab('excel-olustur')}
            className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
              activeTab === 'excel-olustur'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            disabled={selectedYmSt.length === 0 && activeTab !== 'excel-olustur'}
          >
            Excel Oluştur
          </button>
        </nav>
      </div>
      
      {/* MM GT Tanımla Sekmesi */}
      {activeTab === 'mm-gt-tanimla' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Çap */}
            <div>
              <label htmlFor="cap" className="block text-sm font-medium text-gray-700">
                Çap (mm)
              </label>
              <input
                type="text"
                id="cap"
                name="cap"
                value={formData.cap}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="2,50"
              />
            </div>
            
            {/* Kaplama Türü */}
            <div>
              <label htmlFor="kaplama_turu" className="block text-sm font-medium text-gray-700">
                Kaplama Türü
              </label>
              <select
                id="kaplama_turu"
                name="kaplama_turu"
                value={formData.kaplama_turu}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="NIT">NIT</option>
                <option value="PAD">PAD</option>
              </select>
            </div>
            
            {/* Kaplama */}
            <div>
              <label htmlFor="kaplama_miktari" className="block text-sm font-medium text-gray-700">
                Kaplama (gr/m²)
              </label>
              <input
                type="text"
                id="kaplama_miktari"
                name="kaplama_miktari"
                value={formData.kaplama_miktari}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="120"
                disabled={formData.kaplama_turu === 'PAD'}
              />
            </div>
            
            {/* Min Mukavemet */}
            <div>
              <label htmlFor="min_mukavemet" className="block text-sm font-medium text-gray-700">
                Min Mukavemet (MPa)
              </label>
              <input
                type="text"
                id="min_mukavemet"
                name="min_mukavemet"
                value={formData.min_mukavemet}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="400"
              />
            </div>
            
            {/* Max Mukavemet */}
            <div>
              <label htmlFor="max_mukavemet" className="block text-sm font-medium text-gray-700">
                Max Mukavemet (MPa)
              </label>
              <input
                type="text"
                id="max_mukavemet"
                name="max_mukavemet"
                value={formData.max_mukavemet}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="500"
              />
            </div>
            
            {/* Tolerans (+) */}
            <div>
              <label htmlFor="tolerans_pozitif" className="block text-sm font-medium text-gray-700">
                Tolerans (+) (mm)
              </label>
              <input
                type="text"
                id="tolerans_pozitif"
                name="tolerans_pozitif"
                value={formData.tolerans_pozitif}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="0"
              />
            </div>
            
            {/* Tolerans (-) */}
            <div>
              <label htmlFor="tolerans_negatif" className="block text-sm font-medium text-gray-700">
                Tolerans (-) (mm)
              </label>
              <input
                type="text"
                id="tolerans_negatif"
                name="tolerans_negatif"
                value={formData.tolerans_negatif}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="0,06"
              />
            </div>
            
            {/* İç Çap */}
            <div>
              <label htmlFor="ic_cap" className="block text-sm font-medium text-gray-700">
                İç Çap (cm)
              </label>
              <select
                id="ic_cap"
                name="ic_cap"
                value={formData.ic_cap}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="45">45</option>
                <option value="50">50</option>
                <option value="55">55</option>
              </select>
            </div>
            
            {/* Dış Çap */}
            <div>
              <label htmlFor="dis_cap" className="block text-sm font-medium text-gray-700">
                Dış Çap (cm)
              </label>
              <input
                type="text"
                id="dis_cap"
                name="dis_cap"
                value={formData.dis_cap}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                readOnly
              />
            </div>
            
            {/* Ağırlık */}
            <div>
              <label htmlFor="agirlik" className="block text-sm font-medium text-gray-700">
                Ağırlık (kg)
              </label>
              <input
                type="text"
                id="agirlik"
                name="agirlik"
                value={formData.agirlik}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="750"
              />
            </div>
            
            {/* Sarım Yönü */}
            <div>
              <label htmlFor="sarim_yonu" className="block text-sm font-medium text-gray-700">
                Sarım Yönü
              </label>
              <select
                id="sarim_yonu"
                name="sarim_yonu"
                value={formData.sarim_yonu}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="Anti-Clockwise">Anti-Clockwise (Varsayılan)</option>
                <option value="Clockwise">Clockwise</option>
              </select>
            </div>
            
            {/* Shrink */}
            <div>
              <label htmlFor="shrink" className="block text-sm font-medium text-gray-700">
                Shrink
              </label>
              <select
                id="shrink"
                name="shrink"
                value={formData.shrink}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="evet">Evet</option>
                <option value="hayir">Hayır</option>
              </select>
            </div>
            
            {/* İsteğe bağlı alanlar */}
            <div>
              <label htmlFor="cast_kont" className="block text-sm font-medium text-gray-700">
                CAST KONT (İsteğe Bağlı)
              </label>
              <input
                type="text"
                id="cast_kont"
                name="cast_kont"
                value={formData.cast_kont}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="helix_kont" className="block text-sm font-medium text-gray-700">
                HELIX KONT (İsteğe Bağlı)
              </label>
              <input
                type="text"
                id="helix_kont"
                name="helix_kont"
                value={formData.helix_kont}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="elongation" className="block text-sm font-medium text-gray-700">
                ELONGATION (İsteğe Bağlı)
              </label>
              <input
                type="text"
                id="elongation"
                name="elongation"
                value={formData.elongation}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
            </div>
          </div>
          
          {/* MM GT Oluştur butonu */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleCreateMMGT}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {loading ? 'İşleniyor...' : 'Oluşturulacak'}
            </button>
          </div>
        </div>
      )}
      
      {/* YM ST Seç Sekmesi */}
      {activeTab === 'ym-st-sec' && (
        <div className="space-y-4">
          {/* Mevcut YM ST'ler */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Mevcut YM ST Seçimi</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <input
                type="text"
                placeholder="YM ST Ara..."
                className="block w-full mb-4 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
              
              <div className="max-h-60 overflow-y-auto">
                {ymStList.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectYmSt(item)}
                      className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                      disabled={selectedYmSt.some(st => st.id === item.id)}
                    >
                      {selectedYmSt.some(st => st.id === item.id) ? 'Seçildi' : 'Seç'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Yeni YM ST Oluştur */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Yeni YM ST Oluştur</h3>
            <div className="bg-gray-50 p-4 rounded-md grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Çap */}
              <div>
                <label htmlFor="new_cap" className="block text-sm font-medium text-gray-700">
                  Çap
                </label>
                <input
                  type="text"
                  id="new_cap"
                  value={newYmSt.cap}
                  onChange={(e) => setNewYmSt({...newYmSt, cap: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="0250"
                />
              </div>
              
              {/* Filmaşin */}
              <div>
                <label htmlFor="new_filmasin" className="block text-sm font-medium text-gray-700">
                  Filmaşin
                </label>
                <input
                  type="text"
                  id="new_filmasin"
                  value={newYmSt.filmasin}
                  onChange={(e) => setNewYmSt({...newYmSt, filmasin: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="0600"
                />
              </div>
              
              {/* Kalite */}
              <div>
                <label htmlFor="new_kalite" className="block text-sm font-medium text-gray-700">
                  Kalite
                </label>
                <select
                  id="new_kalite"
                  value={newYmSt.kalite}
                  onChange={(e) => setNewYmSt({...newYmSt, kalite: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                >
                  <option value="1006">1006</option>
                  <option value="1008">1008</option>
                  <option value="1010">1010</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleAddNewYmSt}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Ekle
              </button>
            </div>
          </div>
          
          {/* Seçilen YM ST'ler */}
          {selectedYmSt.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Seçilen YM ST'ler</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {selectedYmSt.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveYmSt(item.id)}
                      className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
                    >
                      Kaldır
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Butonlar */}
          <div className="pt-4 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab('mm-gt-tanimla')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Geri
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('excel-olustur')}
              disabled={selectedYmSt.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              İleri
            </button>
          </div>
        </div>
      )}
      
      {/* Excel Oluştur Sekmesi */}
      {activeTab === 'excel-olustur' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-6 rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Oluşturulacak Excel Dosyaları</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-md border border-gray-200">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Stok Kartı Excel
                </h4>
                <div className="ml-7 mt-2 text-sm text-gray-600">
                  <p>• MM GT Sayfası</p>
                  <p>• YM GT Sayfası</p>
                  <p>• YM ST Sayfası ({selectedYmSt.length} adet)</p>
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-md border border-gray-200">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Reçete Excel
                </h4>
                <div className="ml-7 mt-2 text-sm text-gray-600">
                  <p>• MM GT REÇETE Sayfası</p>
                  <p>• YM GT REÇETE Sayfası</p>
                  <p>• YM ST REÇETE Sayfası</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleGenerateExcel}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {loading ? 'Oluşturuluyor...' : 'Excel Dosyalarını Oluştur'}
              </button>
            </div>
          </div>
          
          {/* Butonlar */}
          <div className="pt-4 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab('ym-st-sec')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Geri
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalvanizliTelNetsis;
