import React, { useState, useEffect, useContext, createContext } from 'react';
import { API_URLS, fetchWithAuth } from '@/utils/api-config';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

// Context oluşturma
const GalvanizliTelContext = createContext();

// Context Provider
export const GalvanizliTelProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [mmgtList, setMmgtList] = useState([]);
  const [ymgtList, setYmgtList] = useState([]);
  const [ymstList, setYmstList] = useState([]);
  const [selectedMmgt, setSelectedMmgt] = useState(null);
  const [selectedYmst, setSelectedYmst] = useState([]);
  const [formData, setFormData] = useState({
    cap: '',
    kaplamaType: 'NIT', // Varsayılan değer
    kaplama: '',
    minMukavemet: '',
    maxMukavemet: '',
    icCap: '45',
    disCap: '75',
    kg: '',
    unwinding: 'Anti-Clockwise', // Varsayılan değer
    shrink: 'evet', // Varsayılan değer
    toleransArti: '0',
    toleransEksi: '0.06',
    castKont: '',
    helixKont: '',
    elongation: '',
  });
  const [step, setStep] = useState(1); // 1: MM GT formu, 2: MM GT önizleme, 3: YM ST seçimi
  const { showToast } = useToast();

  // MM GT ve YM GT kodu oluşturma fonksiyonu
  const generateStokKodu = (type, data) => {
    const prefix = type === 'MM' ? 'GT' : 'YM.GT';
    const kaplamaCode = data.kaplamaType || 'NIT';
    
    // Çap değerini formatlama (2.5 -> 0250)
    const diameter = data.cap.toString().replace(',', '.');
    const diameterFormatted = diameter.padStart(4, '0');
    
    // Sequence numarası alınacak (varsayılan 01)
    const sequence = data.sequence || '01';
    
    return type === 'MM' 
      ? `GT.${kaplamaCode}.${diameterFormatted}.${sequence}`
      : `YM.GT.${kaplamaCode}.${diameterFormatted}.${sequence}`;
  };

  // MM GT stok adı oluşturma
  const generateStokAdi = (data) => {
    // Çap virgüllü olacak (2.5 -> 2,5)
    const diameter = data.cap.toString().replace('.', ',');
    
    return `Galvanizli Tel ${diameter} mm -${data.toleransEksi}/+${data.toleransArti} ${data.kaplama} gr/m² ${data.minMukavemet}-${data.maxMukavemet} MPa ID:${data.icCap} cm OD:${data.disCap} cm ${data.kg} kg`;
  };

  // MM GT verisi oluşturma
  const createMmgtData = async (data) => {
    try {
      setLoading(true);
      
      // Sequence numarası alınıyor
      const sequenceResponse = await fetchWithAuth(`${API_URLS.galSequence}?cap=${data.cap}&kaplamaType=${data.kaplamaType}`);
      const sequence = sequenceResponse.sequence;
      
      // MM GT kodları oluşturuluyor
      const mmgtKod = generateStokKodu('MM', {...data, sequence});
      const ymgtKod = generateStokKodu('YM', {...data, sequence});
      
      // Stok adı oluşturuluyor
      const stokAdi = generateStokAdi({...data, sequence});
      
      // Gümrük tarife kodu belirleniyor
      let gumrukTarife = '';
      const cap = parseFloat(data.cap.toString().replace(',', '.'));
      
      if (cap <= 1.5) {
        gumrukTarife = '721720300011';
      } else if (cap <= 6.0) {
        gumrukTarife = '721720300012';
      } else {
        gumrukTarife = '721720300013';
      }
      
      // Ambalaj shrink belirleniyor
      let ambShrink = '';
      const icCap = parseInt(data.icCap);
      const disCap = parseInt(data.disCap);
      
      if (icCap === 45 && disCap === 75) {
        ambShrink = 'AMB.SHRİNK.200*140CM';
      } else if (icCap === 50 && disCap === 90) {
        ambShrink = 'AMB.SHRİNK.200*160CM';
      } else if (icCap === 55 && disCap === 105) {
        ambShrink = 'AMB.SHRİNK.200*190CM';
      }
      
      // MM GT ve YM GT nesneleri oluşturuluyor
      const mmgtObj = {
        stokKodu: mmgtKod,
        stokAdi: stokAdi,
        grupKodu: 'MM',
        kod1: 'GT',
        kod2: data.kaplamaType,
        depoKodu: '36',
        muhDetay: '26',
        gumrukTarifeKodu: gumrukTarife,
        cap: data.cap,
        kaplama: data.kaplama,
        minMukavemet: data.minMukavemet,
        maxMukavemet: data.maxMukavemet,
        icCap: data.icCap,
        disCap: data.disCap,
        kg: data.kg,
        unwinding: data.unwinding === 'Clockwise' ? 'Clockwise' : '', // Sadece Clockwise ise yazılır
        shrink: data.shrink,
        toleransArti: data.toleransArti,
        toleransEksi: data.toleransEksi,
        castKont: data.castKont,
        helixKont: data.helixKont,
        elongation: data.elongation,
        ambShrink: ambShrink,
      };
      
      const ymgtObj = {
        ...mmgtObj,
        stokKodu: ymgtKod,
        grupKodu: 'YM',
        depoKodu: '35',
        muhDetay: '83',
      };
      
      // Veritabanına kaydediliyor
      const response = await fetchWithAuth(API_URLS.galMmGt, {
        method: 'POST',
        body: JSON.stringify({
          mmgt: mmgtObj,
          ymgt: ymgtObj
        })
      });
      
      if (response.success) {
        setSelectedMmgt({
          ...mmgtObj,
          ymgt: ymgtObj
        });
        showToast('Galvanizli Tel kaydı oluşturuldu', 'success');
        setStep(2); // YM ST seçimi adımına geçiş
      } else {
        showToast('Bir hata oluştu: ' + response.error, 'error');
      }
    } catch (error) {
      showToast('İşlem sırasında bir hata oluştu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mevcut MM GT arama
  const searchMmgtList = async (filters) => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_URLS.galMmGt}?search=${filters.search || ''}`);
      setMmgtList(response.data || []);
    } catch (error) {
      showToast('Veri alınırken hata oluştu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // YM ST listesini alma
  const getYmstList = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(API_URLS.galYmSt);
      setYmstList(response.data || []);
    } catch (error) {
      showToast('YM ST verileri alınırken hata oluştu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // YM ST oluşturma veya seçme
  const selectYmst = (ymst) => {
    // Eğer zaten seçiliyse, seçimden kaldır
    if (selectedYmst.some(item => item.stokKodu === ymst.stokKodu)) {
      setSelectedYmst(selectedYmst.filter(item => item.stokKodu !== ymst.stokKodu));
    } else {
      setSelectedYmst([...selectedYmst, ymst]);
    }
  };

  // Yeni YM ST oluşturma
  const createYmst = async (ymstData) => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(API_URLS.galYmSt, {
        method: 'POST',
        body: JSON.stringify(ymstData)
      });
      
      if (response.success) {
        showToast('YM ST kaydı oluşturuldu', 'success');
        await getYmstList(); // Listeyi yenile
        selectYmst(response.data); // Yeni oluşturulan YM ST'yi seç
      } else {
        showToast('YM ST oluşturulurken hata: ' + response.error, 'error');
      }
    } catch (error) {
      showToast('İşlem sırasında bir hata oluştu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Excel oluşturma
  const createExcel = async () => {
    try {
      setLoading(true);
      
      if (!selectedMmgt || selectedYmst.length === 0) {
        showToast('Lütfen MM GT ve en az bir YM ST seçin', 'warning');
        return;
      }
      
      const response = await fetchWithAuth(API_URLS.galExcel, {
        method: 'POST',
        body: JSON.stringify({
          mmgt: selectedMmgt,
          ymst: selectedYmst
        })
      });
      
      if (response.success) {
        // Excel dosyasını indirme URL'i
        const downloadUrl = response.downloadUrl;
        window.open(downloadUrl, '_blank');
        showToast('Excel dosyaları oluşturuldu', 'success');
      } else {
        showToast('Excel oluşturulurken hata: ' + response.error, 'error');
      }
    } catch (error) {
      showToast('İşlem sırasında bir hata oluştu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Form değerlerini güncelleme
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Context değeri
  const value = {
    loading,
    mmgtList,
    ymgtList,
    ymstList,
    selectedMmgt,
    selectedYmst,
    formData,
    step,
    setStep,
    handleInputChange,
    createMmgtData,
    searchMmgtList,
    getYmstList,
    selectYmst,
    createYmst,
    createExcel,
    setFormData,
    setSelectedMmgt,
    setSelectedYmst
  };

  return (
    <GalvanizliTelContext.Provider value={value}>
      {children}
    </GalvanizliTelContext.Provider>
  );
};

// Context hook
export const useGalvanizliTel = () => {
  const context = useContext(GalvanizliTelContext);
  if (!context) {
    throw new Error('useGalvanizliTel must be used within a GalvanizliTelProvider');
  }
  return context;
};

// Ana Komponent
const GalvanizliTelNetsis = () => {
  const { 
    loading, 
    formData, 
    handleInputChange, 
    createMmgtData, 
    step, 
    setStep,
    mmgtList,
    searchMmgtList,
    selectedMmgt,
    setSelectedMmgt,
    ymstList,
    getYmstList,
    selectedYmst,
    selectYmst,
    createYmst,
    createExcel
  } = useGalvanizliTel();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('MM GT Tanımla');
  const [showExistingProducts, setShowExistingProducts] = useState(false);
  const [newYmstData, setNewYmstData] = useState({
    cap: '',
    filmasin: '',
    quality: '1006'
  });

  useEffect(() => {
    if (activeTab === 'YM ST Seç' && ymstList.length === 0) {
      getYmstList();
    }
  }, [activeTab, ymstList]);

  // MM GT arama
  const handleSearch = () => {
    searchMmgtList({ search: searchTerm });
  };

  // YM ST formu için input değişikliklerini ele alma
  const handleYmstInputChange = (e) => {
    const { name, value } = e.target;
    setNewYmstData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Yeni YM ST oluşturma
  const handleCreateYmst = () => {
    // YM ST kod formatı: YM.ST.{DIAMETER}.{FILMAŞIN}.{QUALITY}
    const capFormatted = newYmstData.cap.toString().padStart(4, '0');
    const filmasinFormatted = newYmstData.filmasin.toString().padStart(4, '0');
    
    const ymstData = {
      stokKodu: `YM.ST.${capFormatted}.${filmasinFormatted}.${newYmstData.quality}`,
      stokAdi: `YM Siyah Tel ${capFormatted} mm HM:${filmasinFormatted}.${newYmstData.quality}`,
      grupKodu: 'YM',
      kod1: 'ST',
      muhDetay: '28',
      depoKodu: '35',
      satisKdvOrani: '20',
      ozelSaha1: newYmstData.cap.toString()[0], // İlk hane
      cap: newYmstData.cap,
      filmasin: newYmstData.filmasin,
      quality: newYmstData.quality
    };
    
    createYmst(ymstData);
  };

  // MM GT formunu gönderme
  const handleSubmitMmgtForm = (e) => {
    e.preventDefault();
    
    // Form validasyonları
    if (!formData.cap || !formData.kaplama || !formData.minMukavemet || !formData.maxMukavemet || !formData.kg) {
      alert('Lütfen zorunlu alanları doldurun!');
      return;
    }
    
    createMmgtData(formData);
  };

  // Excel oluşturma ve indirme
  const handleCreateExcel = () => {
    createExcel();
  };

  // MM GT seçimi
  const handleSelectMmgt = (mmgt) => {
    setSelectedMmgt(mmgt);
    setStep(2);
    setActiveTab('YM ST Seç');
  };

  // Önerilen Filmaşin değerini hesaplama
  const getSuggestedFilmasin = (cap) => {
    const diameter = parseFloat(cap.replace(',', '.'));
    
    if (diameter < 2.0) return '0550';
    if (diameter >= 2.0 && diameter < 3.0) return '0600';
    if (diameter >= 3.0 && diameter < 4.5) return '0600';
    if (diameter >= 4.5 && diameter < 6.0) return '0700';
    if (diameter >= 6.0 && diameter < 7.5) return '0800';
    return '1000';
  };

  // Önerilen Quality değerini hesaplama
  const getSuggestedQuality = (cap) => {
    const diameter = parseFloat(cap.replace(',', '.'));
    
    if (diameter < 3.0) return '1006';
    if (diameter >= 3.0 && diameter < 6.0) return '1008';
    return '1010';
  };

  // Filmaşin değeri değiştiğinde
  useEffect(() => {
    if (selectedMmgt && newYmstData.cap === '') {
      // MM GT'nin çap değerinden YM ST için önerilen değerleri belirle
      const capValue = selectedMmgt.cap;
      const suggestedFilmasin = getSuggestedFilmasin(capValue);
      const suggestedQuality = getSuggestedQuality(capValue);
      
      setNewYmstData({
        cap: capValue,
        filmasin: suggestedFilmasin,
        quality: suggestedQuality
      });
    }
  }, [selectedMmgt]);

  return (
    <div className="space-y-6">
      {/* Sekme Navigasyonu */}
      <div className="bg-white border-b">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {['MM GT Tanımla', 'YM ST Seç', 'Excel Oluştur'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === 'YM ST Seç' && !selectedMmgt) {
                  alert('Önce MM GT tanımlamalısınız!');
                  return;
                }
                setActiveTab(tab);
              }}
              className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* İçerik */}
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        )}

        {/* MM GT Tanımlama Formu */}
        {activeTab === 'MM GT Tanımla' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Galvanizli Tel Tanımlama</h3>
              <button
                type="button"
                onClick={() => setShowExistingProducts(!showExistingProducts)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {showExistingProducts ? 'Yeni Ürün Oluştur' : 'Mevcut Ürünleri Göster'}
              </button>
            </div>

            {showExistingProducts ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ürün kodu veya adı ile arama yapın..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Ara
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Adı</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mmgtList.length > 0 ? (
                        mmgtList.map((item) => (
                          <tr key={item.stokKodu}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.stokKodu}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.stokAdi}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                type="button"
                                onClick={() => handleSelectMmgt(item)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Seç
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">Ürün bulunamadı. Lütfen arama yapın veya yeni ürün oluşturun.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitMmgtForm} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Çap */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Çap (mm)</label>
                  <input
                    type="text"
                    name="cap"
                    value={formData.cap}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="2,50"
                    required
                  />
                </div>

                {/* Kaplama Türü */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kaplama Türü</label>
                  <select
                    name="kaplamaType"
                    value={formData.kaplamaType}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="NIT">NIT</option>
                    <option value="PAD">PAD</option>
                  </select>
                </div>

                {/* Kaplama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kaplama (gr/m²)</label>
                  <input
                    type="text"
                    name="kaplama"
                    value={formData.kaplama}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="120"
                    required
                    disabled={formData.kaplamaType === 'PAD'}
                  />
                  {formData.kaplamaType === 'PAD' && (
                    <p className="mt-1 text-xs text-gray-500">PAD kaplama için değer 50 olarak sabitlenir.</p>
                  )}
                </div>

                {/* Min Mukavemet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Mukavemet (MPa)</label>
                  <input
                    type="text"
                    name="minMukavemet"
                    value={formData.minMukavemet}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="400"
                    required
                  />
                </div>

                {/* Max Mukavemet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Mukavemet (MPa)</label>
                  <input
                    type="text"
                    name="maxMukavemet"
                    value={formData.maxMukavemet}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="500"
                    required
                  />
                </div>

                {/* Tolerans + */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tolerans (+) (mm)</label>
                  <input
                    type="text"
                    name="toleransArti"
                    value={formData.toleransArti}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="0,00"
                  />
                </div>

                {/* Tolerans - */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tolerans (-) (mm)</label>
                  <input
                    type="text"
                    name="toleransEksi"
                    value={formData.toleransEksi}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="0,06"
                  />
                </div>

                {/* İç Çap */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">İç Çap (cm)</label>
                  <select
                    name="icCap"
                    value={formData.icCap}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="45">45</option>
                    <option value="50">50</option>
                    <option value="55">55</option>
                  </select>
                </div>

                {/* Dış Çap */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dış Çap (cm)</label>
                  <select
                    name="disCap"
                    value={formData.disCap}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="75">75</option>
                    <option value="90">90</option>
                    <option value="105">105</option>
                  </select>
                </div>

                {/* Ağırlık */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ağırlık (kg)</label>
                  <input
                    type="text"
                    name="kg"
                    value={formData.kg}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="750"
                    required
                  />
                </div>

                {/* Sarım Yönü */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sarım Yönü</label>
                  <select
                    name="unwinding"
                    value={formData.unwinding}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="Anti-Clockwise">Anti-Clockwise (Varsayılan)</option>
                    <option value="Clockwise">Clockwise</option>
                  </select>
                </div>

                {/* Shrink */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shrink</label>
                  <select
                    name="shrink"
                    value={formData.shrink}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="evet">Evet</option>
                    <option value="hayir">Hayır</option>
                  </select>
                </div>

                {/* İsteğe Bağlı Alanlar - Başlık */}
                <div className="col-span-2 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 border-b pb-2">İsteğe Bağlı Alanlar</h4>
                </div>

                {/* CAST KONT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">CAST KONT</label>
                  <input
                    type="text"
                    name="castKont"
                    value={formData.castKont}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="İsteğe bağlı"
                  />
                </div>

                {/* HELIX KONT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">HELIX KONT</label>
                  <input
                    type="text"
                    name="helixKont"
                    value={formData.helixKont}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="İsteğe bağlı"
                  />
                </div>

                {/* ELONGATION */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">ELONGATION</label>
                  <input
                    type="text"
                    name="elongation"
                    value={formData.elongation}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="İsteğe bağlı"
                  />
                </div>

                {/* Form Gönder Butonu */}
                <div className="col-span-2 mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Oluştur
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* YM ST Seçimi */}
        {activeTab === 'YM ST Seç' && selectedMmgt && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">YM ST (Siyah Tel) Seçimi</h3>
            
            {/* Seçilen MM GT Bilgisi */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Seçilen Galvanizli Tel</h4>
              <p className="text-sm text-gray-600">{selectedMmgt.stokKodu} - {selectedMmgt.stokAdi}</p>
            </div>
            
            {/* Yeni YM ST Oluşturma Formu */}
            <div className="border-t border-b py-4">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Yeni YM ST Oluştur</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Çap (mm)</label>
                  <input
                    type="text"
                    name="cap"
                    value={newYmstData.cap}
                    onChange={handleYmstInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="2,50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Filmaşin (mm)</label>
                  <input
                    type="text"
                    name="filmasin"
                    value={newYmstData.filmasin}
                    onChange={handleYmstInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    placeholder="0600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kalite</label>
                  <select
                    name="quality"
                    value={newYmstData.quality}
                    onChange={handleYmstInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
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
                  onClick={handleCreateYmst}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  YM ST Oluştur ve Ekle
                </button>
              </div>
            </div>
            
            {/* YM ST Listesi */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Mevcut YM ST'ler</h4>
              <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seç</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Adı</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ymstList.length > 0 ? (
                      ymstList.map((item) => (
                        <tr key={item.stokKodu}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedYmst.some(y => y.stokKodu === item.stokKodu)}
                              onChange={() => selectYmst(item)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.stokKodu}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.stokAdi}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">YM ST bulunamadı. Lütfen yeni YM ST oluşturun.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Devam Butonu */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (selectedYmst.length === 0) {
                    alert('Lütfen en az bir YM ST seçin!');
                    return;
                  }
                  setActiveTab('Excel Oluştur');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Excel Oluştur'a Geç
              </button>
            </div>
          </div>
        )}

        {/* Excel Oluşturma */}
        {activeTab === 'Excel Oluştur' && selectedMmgt && selectedYmst.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Excel Dosyaları Oluştur</h3>
            
            {/* Seçili Bilgiler Özeti */}
            <div className="bg-gray-50 p-4 rounded-md space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Mamül Galvanizli Tel (MM GT)</h4>
                <p className="text-sm text-gray-600">{selectedMmgt.stokKodu} - {selectedMmgt.stokAdi}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Yarı Mamül Galvanizli Tel (YM GT)</h4>
                <p className="text-sm text-gray-600">{selectedMmgt.ymgt?.stokKodu || ''} - {selectedMmgt.ymgt?.stokAdi || ''}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Seçilen Yarı Mamül Siyah Teller (YM ST)</h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {selectedYmst.map((item) => (
                    <li key={item.stokKodu}>{item.stokKodu} - {item.stokAdi}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Oluşturulacak Excel Dosyaları Bilgisi */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Oluşturulacak Excel Dosyaları:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600">
                <li>"Stok Kartı" Excel (MM GT, YM GT ve YM ST sayfaları)</li>
                <li>"Reçete" Excel (MM GT REÇETE, YM GT REÇETE ve YM ST REÇETE sayfaları)</li>
              </ul>
              <p className="mt-2 text-sm text-gray-500">Not: Dosyalar Netsis ERP uyumlu formatta olacaktır.</p>
            </div>
            
            {/* Excel Oluştur Butonu */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('YM ST Seç');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Geri Dön
              </button>
              <button
                type="button"
                onClick={handleCreateExcel}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Excel Dosyalarını Oluştur
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalvanizliTelNetsis;
