// GalvanizliTelNetsis.jsx
import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth } from '@/api-config';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

// Validation Schema tanımlamaları
const mmGtValidationSchema = Yup.object().shape({
  cap: Yup.number()
    .required('Çap zorunludur')
    .min(0.8, 'Çap en az 0.8 olmalıdır')
    .max(8.0, 'Çap en fazla 8.0 olmalıdır'),
  kod_2: Yup.string().required('Kaplama türü zorunludur'),
  kaplama: Yup.number()
    .required('Kaplama zorunludur')
    .min(50, 'Kaplama en az 50 olmalıdır')
    .max(400, 'Kaplama en fazla 400 olmalıdır'),
  min_mukavemet: Yup.number()
    .required('Min mukavemet zorunludur')
    .min(350, 'Min mukavemet en az 350 olmalıdır')
    .max(1000, 'Min mukavemet en fazla 1000 olmalıdır'),
  max_mukavemet: Yup.number()
    .required('Max mukavemet zorunludur')
    .min(350, 'Max mukavemet en az 350 olmalıdır')
    .max(1000, 'Max mukavemet en fazla 1000 olmalıdır'),
  tolerans_plus: Yup.number()
    .required('Tolerans (+) zorunludur')
    .min(0, 'Tolerans (+) en az 0 olmalıdır')
    .max(0.1, 'Tolerans (+) en fazla 0.1 olmalıdır'),
  tolerans_minus: Yup.number()
    .required('Tolerans (-) zorunludur')
    .min(0, 'Tolerans (-) en az 0 olmalıdır')
    .max(0.1, 'Tolerans (-) en fazla 0.1 olmalıdır'),
  kg: Yup.number()
    .required('Ağırlık zorunludur')
    .min(250, 'Ağırlık en az 250 olmalıdır')
    .max(1250, 'Ağırlık en fazla 1250 olmalıdır'),
});

// YM ST formüllerine ait validation schema
const receteValidationSchema = Yup.object().shape({
  boraks_tuketimi: Yup.number()
    .required('Boraks tüketimi zorunludur')
    .min(0.001, 'Boraks tüketimi en az 0.001 olmalıdır'),
  asit_tuketimi: Yup.number()
    .required('Asit tüketimi zorunludur')
    .min(0.001, 'Asit tüketimi en az 0.001 olmalıdır'),
  desi_tuketimi: Yup.number()
    .required('Desi tüketimi zorunludur')
    .min(0.001, 'Desi tüketimi en az 0.001 olmalıdır'),
  paketleme_suresi: Yup.number()
    .required('Paketleme süresi zorunludur')
    .min(0.001, 'Paketleme süresi en az 0.001 olmalıdır'),
  galvanizleme_suresi: Yup.number()
    .required('Galvanizleme süresi zorunludur')
    .min(0.001, 'Galvanizleme süresi en az 0.001 olmalıdır'),
  tel_cekme_suresi: Yup.number()
    .required('Tel çekme süresi zorunludur')
    .min(0.0001, 'Tel çekme süresi en az 0.0001 olmalıdır'),
});

// Galvanizli Tel Context
const GalvanizliTelContext = createContext();

// Context Provider Bileşeni
export const GalvanizliTelProvider = ({ children }) => {
  // Form verilerini saklama state'leri
  const [mmGtData, setMmGtData] = useState(null);
  const [ymGtData, setYmGtData] = useState(null);
  const [ymStList, setYmStList] = useState([]);
  const [selectedYmSt, setSelectedYmSt] = useState([]);
  const [receteData, setReceteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [dataExist, setDataExist] = useState(false);
  const [activeTab, setActiveTab] = useState("mm-gt-tanimla");
  const [productDatabase, setProductDatabase] = useState({
    mmGtList: [],
    ymGtList: [],
    ymStList: []
  });
  const { user } = useAuth();

  // Ürün veritabanını yükleme
  const fetchProductDatabase = useCallback(async () => {
    try {
      setLoading(true);
      // MM GT listesini al
      const mmGtRes = await fetchWithAuth(API_URLS.galMmGt);
      let mmGtList = [];
      if (mmGtRes.ok) {
        mmGtList = await mmGtRes.json();
      }

      // YM GT listesini al
      const ymGtRes = await fetchWithAuth(API_URLS.galYmGt);
      let ymGtList = [];
      if (ymGtRes.ok) {
        ymGtList = await ymGtRes.json();
      }

      // YM ST listesini al
      const ymStRes = await fetchWithAuth(API_URLS.galYmSt);
      let ymStList = [];
      if (ymStRes.ok) {
        ymStList = await ymStRes.json();
      }

      setProductDatabase({
        mmGtList: Array.isArray(mmGtList) ? mmGtList : [],
        ymGtList: Array.isArray(ymGtList) ? ymGtList : [],
        ymStList: Array.isArray(ymStList) ? ymStList : []
      });
    } catch (error) {
      console.error('Veritabanı yüklenirken hata oluştu:', error);
      setError('Veritabanı yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);


//Silinecek
// Bu fonksiyonu component içine ekleyin
window.testFunctions = {
  // Ürün aramayı test et
  searchTest: async (stockCode) => {
    try {
      console.log(`${stockCode} için arama testi yapılıyor...`);
      const url = `${API_URLS.galMmGt}?stok_kodu=${encodeURIComponent(stockCode)}`;
      console.log('Test URL:', url);
      
      const response = await fetchWithAuth(url);
      console.log('Yanıt durumu:', response.status);
      
      const data = await response.json();
      console.log('Ürün verileri:', data);
      
      return data;
    } catch (error) {
      console.error('Arama testi hatası:', error);
      return null;
    }
  },
  
  // Silme işlemini test et
  deleteTest: async (id) => {
    try {
      // Önce sorgu parametresi dene
      const queryUrl = `${API_URLS.galMmGt}?id=${id}`;
      console.log('Sorgu parametresi testi:', queryUrl);
      
      const queryResponse = await fetch(queryUrl, {
        method: 'DELETE'
      });
      console.log('Sorgu parametresi yanıtı:', queryResponse.status);
      
      // Sonra yol parametresi dene
      const pathUrl = `${API_URLS.galMmGt}/${id}`;
      console.log('Yol parametresi testi:', pathUrl);
      
      const pathResponse = await fetch(pathUrl, {
        method: 'DELETE'
      });
      console.log('Yol parametresi yanıtı:', pathResponse.status);
      
      return {
        query: queryResponse.status,
        path: pathResponse.status
      };
    } catch (error) {
      console.error('Silme testi hatası:', error);
      return null;
    }
  }
};
//Silinecek


// Ürün silme fonksiyonu - ilişkili kayıtlar için önlem eklenmiş
const deleteProduct = async (type, id) => {
  try {
    setLoading(true);
    let endpoint;
    let successMsg;
    
    switch (type) {
      case 'mmGt':
        endpoint = `${API_URLS.galMmGt}/${id}`;
        successMsg = 'MM GT başarıyla silindi';
        break;
      case 'ymGt':
        endpoint = `${API_URLS.galYmGt}/${id}`;
        successMsg = 'YM GT başarıyla silindi';
        break;
      case 'ymSt':
        endpoint = `${API_URLS.galYmSt}/${id}`;
        successMsg = 'YM ST başarıyla silindi';
        break;
      default:
        throw new Error('Geçersiz ürün tipi');
    }
    
    // İlişkili kayıtlar için kullanıcıyı uyar
    if (type === 'mmGt') {
      // Önce ilişkileri kontrol et
      const relationsCheck = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${id}`);
      let hasRelations = false;
      
      if (relationsCheck.ok) {
        const relations = await relationsCheck.json();
        hasRelations = Array.isArray(relations) && relations.length > 0;
      }
      
      if (hasRelations) {
        const confirmed = window.confirm(
          "Bu ürünün ilişkili YM GT ve YM ST kayıtları var. Silme işlemi gerçekleştirilemeyebilir. Yine de denemek istiyor musunuz?"
        );
        
        if (!confirmed) {
          setLoading(false);
          return false;
        }
      }
    }
    
    // Silme isteği gönder
    const response = await fetchWithAuth(endpoint, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      // Hata durumunda daha anlamlı mesaj göster
      if (response.status === 500) {
        throw new Error(
          "Bu ürün diğer kayıtlarla ilişkili olduğu için silinemedi. " +
          "Önce ilişkili kayıtları kaldırmanız gerekiyor."
        );
      } else {
        throw new Error(`Silme işlemi başarısız: ${response.status}`);
      }
    }
    
    await fetchProductDatabase();
    toast.success(successMsg);
    return true;
  } catch (error) {
    console.error('Ürün silme hatası:', error);
    setError('Ürün silinirken bir hata oluştu: ' + error.message);
    toast.error('Ürün silinirken bir hata oluştu: ' + error.message);
    return false;
  } finally {
    setLoading(false);
  }
};

// Bu fonksiyon, veritabanı listesinden bir ürün seçildiğinde çalışır
const handleSelectDatabaseItem = async (item) => {
  try {
    setLoading(true); // Yükleniyor durumunu aktifleştir
    console.log('Seçilen ürün:', item); // Seçilen ürünü logla
    
    // Önce modalı kapat, sonra ürünü ara
    setShowDatabaseModal(false);
    
    // Ürünü ara
    await searchProducts({ stok_kodu: item.stok_kodu });
    
    // Formun güncellenmesi için biraz bekle
    setTimeout(() => {
      // Form değerlerini manuel olarak güncelle
      if (mmGtData) {
        console.log('Form değerleri güncelleniyor...');
        setFormValues({
          cap: mmGtData.cap || '',
          kod_2: mmGtData.kod_2 || 'NIT',
          kaplama: mmGtData.kaplama || 120,
          min_mukavemet: mmGtData.min_mukavemet || 400,
          max_mukavemet: mmGtData.max_mukavemet || 500,
          tolerans_plus: mmGtData.tolerans_plus || 0,
          tolerans_minus: mmGtData.tolerans_minus || 0.06,
          ic_cap: mmGtData.ic_cap || 45,
          dis_cap: mmGtData.dis_cap || 75,
          kg: mmGtData.kg || 750,
          unwinding: mmGtData.unwinding || null,
          shrink: mmGtData.shrink || 'evet',
          cast_kont: mmGtData.cast_kont || '',
          helix_kont: mmGtData.helix_kont || '',
          elongation: mmGtData.elongation || '',
          sequence: sequence
        });
      }
    }, 500);
    
  } catch (error) {
    console.error("Ürün seçme hatası:", error);
    toast.error("Ürün seçilirken bir hata oluştu");
  } finally {
    setLoading(false); // Yükleniyor durumunu kapat
  }
};

  // Mevcut ürün dizilimini alma fonksiyonu
  const getCurrentSequence = async (kod2, cap) => {
    try {
      const response = await fetchWithAuth(`${API_URLS.galSequence}?kod_2=${kod2}&cap=${cap}`);
      
      if (!response.ok) {
        throw new Error('Sıra numarası alınamadı');
      }
      
      const data = await response.json();
      // Yeni ürünler için sıra numarası 0'dan başlar
      return data.sequence !== undefined ? data.sequence : 0;
    } catch (error) {
      console.error('Sıra numarası alınırken hata oluştu:', error);
      setError('Sıra numarası alınırken hata oluştu');
      // Hata durumunda varsayılan değer 0
      return 0;
    }
  };

  // Dizilim artırma fonksiyonu
  const incrementSequence = async (kod2, cap) => {
    try {
      const response = await fetchWithAuth(API_URLS.galSequence, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kod_2: kod2, cap: cap }),
      });
      
      if (!response.ok) {
        throw new Error('Sıra numarası artırılamadı');
      }
      
      const data = await response.json();
      return data.sequence;
    } catch (error) {
      console.error('Sıra numarası güncellenirken hata oluştu:', error);
      setError('Sıra numarası güncellenirken hata oluştu');
      return null;
    }
  };

  // YM ST listesini yükleme fonksiyonu
  const loadYmStList = useCallback(async () => {
    try {
      setLoading(true);
      
      // API isteği yapılır
      const response = await fetchWithAuth(API_URLS.galYmSt);
      
      // Eğer cevap 404 (bulunamadı) ise, bu normal bir durumdur ve boş liste kullanabiliriz
      if (response.status === 404) {
        console.log('YM ST listesi boş veya tablo mevcut değil, boş liste kullanılıyor');
        setYmStList([]);
        return;
      }
      
      // Diğer hata durumları için
      if (!response.ok) {
        throw new Error(`YM ST listesi alınamadı: ${response.status} ${response.statusText}`);
      }
      
      // Başarılı cevap işlenir
      const data = await response.json();
      
      // Veri dizi değilse veya boşsa, boş dizi kullan
      if (!data || !Array.isArray(data)) {
        console.log('YM ST verisi dizi değil, boş liste kullanılıyor');
        setYmStList([]);
      } else {
        // Veriler başarıyla alındı
        setYmStList(data);
      }
    } catch (error) {
      console.error('YM ST listesi yüklenirken hata oluştu:', error);
      // Hata durumunda da boş dizi ile devam et, böylece uygulama çalışmaya devam eder
      setYmStList([]);
      setError('YM ST listesi yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

// Ürün arama fonksiyonu - düzeltilmiş ve basitleştirilmiş
const searchProducts = async (searchParams) => {
  setLoading(true);
  setError(null);
  setDataExist(false);

  try {
    console.log('Arama parametreleri:', searchParams);
    
    // Parametreleri URL'ye dönüştür
    const queryParams = new URLSearchParams();
    
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const url = `${API_URLS.galMmGt}?${queryParams.toString()}`;
    console.log('MM GT sorgu URL:', url);
    
    // MM GT verilerini sorgula
    const mmGtResponse = await fetchWithAuth(url);
    console.log('MM GT yanıt durumu:', mmGtResponse.status);
    
    if (!mmGtResponse.ok) {
      throw new Error('MM GT verileri getirilemedi');
    }
    
    const mmGtResults = await mmGtResponse.json();
    console.log('MM GT sonuçları:', mmGtResults);
    
    if (mmGtResults && Array.isArray(mmGtResults) && mmGtResults.length > 0) {
      const mmGt = mmGtResults[0];
      
      // Form değerlerini güncelle (setFormValues KULLANMA)
      if (formValues) {
        console.log('Form değerleri direkt güncelleniyor');
        
        // formValues.cap = mmGt.cap || ''; gibi atamalar YAPMA
        // Bunun yerine setFormValues hook'unu kullan
      }
      
      // State güncellemeleri
      setMmGtData(mmGt);
      setDataExist(true);
      setIsEditMode(true);
      
      // YM GT verisini al
      try {
        const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${mmGt.id}`);
        
        if (ymGtResponse.ok) {
          const ymGtResults = await ymGtResponse.json();
          if (Array.isArray(ymGtResults) && ymGtResults.length > 0) {
            setYmGtData(ymGtResults[0]);
          }
        }
      } catch (error) {
        console.error('YM GT verisi alınırken hata:', error);
      }
      
      // YM ST ilişkilerini al
      try {
        const ymStRelResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
        
        if (ymStRelResponse.ok) {
          const ymStRelResults = await ymStRelResponse.json();
          
          if (Array.isArray(ymStRelResults) && ymStRelResults.length > 0) {
            const ymStIds = ymStRelResults.map(item => item.ym_st_id);
            
            const ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?ids=${ymStIds.join(',')}`);
            
            if (ymStResponse.ok) {
              const ymStDetails = await ymStResponse.json();
              if (Array.isArray(ymStDetails) && ymStDetails.length > 0) {
                setSelectedYmSt(ymStDetails);
              }
            }
          }
        }
      } catch (error) {
        console.error('YM ST ilişkileri alınırken hata:', error);
      }
    } else {
      // Ürün bulunamadı
      setDataExist(false);
      setMmGtData(null);
      setYmGtData(null);
      setSelectedYmSt([]);
      setReceteData(null);
      setIsEditMode(false);
    }
  } catch (error) {
    console.error('Ürün arama hatası:', error);
    setError('Ürün arama sırasında bir hata oluştu: ' + error.message);
  } finally {
    setLoading(false);
  }
};

//EKLEME
// API endpoint'lerini test et - hata ayıklama için kullanışlı
const testApiEndpoints = async () => {
  console.log("API Endpoint Testi Başlatılıyor...");
  
  try {
    // MM GT endpoint test
    console.log("MM GT endpoint testi:");
    const mmGtTest = await fetchWithAuth(API_URLS.galMmGt);
    console.log("- GET yanıtı:", mmGtTest.status);
    
    if (mmGtTest.ok) {
      const data = await mmGtTest.json();
      console.log(`- ${data.length} adet kayıt bulundu`);
      
      if (data.length > 0) {
        // Bir kaydı al ve PUT/DELETE test et
        const testId = data[0].id;
        console.log(`- ID: ${testId} ile PUT/DELETE testi`);
        
        // PUT endpointi oluştur
        const putUrl = `${API_URLS.galMmGt}/${testId}`;
        console.log(`- PUT URL: ${putUrl}`);
        
        // DELETE endpointi oluştur
        const deleteUrl = `${API_URLS.galMmGt}/${testId}`;
        console.log(`- DELETE URL: ${deleteUrl} (gerçek silme yapılmayacak)`);
      }
    }
    
    // YM GT endpoint test
    console.log("\nYM GT endpoint testi:");
    const ymGtTest = await fetchWithAuth(API_URLS.galYmGt);
    console.log("- GET yanıtı:", ymGtTest.status);
    
    // YM ST endpoint test
    console.log("\nYM ST endpoint testi:");
    const ymStTest = await fetchWithAuth(API_URLS.galYmSt);
    console.log("- GET yanıtı:", ymStTest.status);
    
    // MM GT - YM ST ilişki tablosu testi
    console.log("\nMM GT - YM ST ilişki tablosu testi:");
    const relationTest = await fetchWithAuth(API_URLS.galMmGtYmSt);
    console.log("- GET yanıtı:", relationTest.status);
    
    // Reçete tabloları testi
    console.log("\nMM GT Reçete tablosu testi:");
    const mmGtReceteTest = await fetchWithAuth(API_URLS.galMmGtRecete);
    console.log("- GET yanıtı:", mmGtReceteTest.status);
    
    console.log("\nYM GT Reçete tablosu testi:");
    const ymGtReceteTest = await fetchWithAuth(API_URLS.galYmGtRecete);
    console.log("- GET yanıtı:", ymGtReceteTest.status);
    
    console.log("\nYM ST Reçete tablosu testi:");
    const ymStReceteTest = await fetchWithAuth(API_URLS.galYmStRecete);
    console.log("- GET yanıtı:", ymStReceteTest.status);
    
    console.log("\nSıra numarası tablosu testi:");
    const sequenceTest = await fetchWithAuth(API_URLS.galSequence);
    console.log("- GET yanıtı:", sequenceTest.status);
    
    console.log("\nAPI Endpoint Testi Tamamlandı");
  } catch (error) {
    console.error("API endpoint testi hatası:", error);
  }
};

//EKLEME
// Bu fonksiyon, stok kodunun veritabanında olup olmadığını kontrol eder
const checkProductExists = async (stokKodu) => {
  try {
    // API isteği yap - tam eşleşme için encodeURIComponent kullan
    const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu=${encodeURIComponent(stokKodu)}`);
    
    // Yanıt başarısız ise ürün yoktur
    if (!response.ok) {
      return false;
    }
    
    // Yanıtı JSON olarak çözümle
    const data = await response.json();
    
    // API tüm kayıtları döndürüyorsa, stok koduna göre filtrele
    if (Array.isArray(data) && data.length > 0) {
      // Tam eşleşme kontrolü yap
      return data.some(item => item.stok_kodu === stokKodu);
    }
    
    return false;
  } catch (error) {
    console.error('Ürün kontrolü hatası:', error);
    return false;
  }
};
//EKLEME

// Tamamen yeniden yazılmış MM GT kaydetme fonksiyonu
const saveMMGT = async (values) => {
  setLoading(true);
  setError(null);

  try {
    // Çap değerini nokta ile tutuyoruz (JS için)
    const capValue = parseFloat(values.cap);
    
    // Çap değerini doğru formatta (4 basamaklı) hazırlama
    const formattedCap = capValue.toFixed(2).replace('.', '').padStart(4, '0');
    
    // Sıra numarasını al
    let sequenceNumber = 0;
    try {
      const sequence = await getCurrentSequence(values.kod_2, capValue);
      sequenceNumber = sequence || 0;
    } catch (error) {
      console.warn('Sıra numarası alınamadı, varsayılan 0 kullanılıyor', error);
    }
    
    // Sıra numarasını formatla
    const formattedSequence = sequenceNumber.toString().padStart(2, '0');
    
    // Stok Kodu formatını oluştur: GT.NIT.0250.00
    const stockCode = `GT.${values.kod_2}.${formattedCap}.${formattedSequence}`;
    console.log('Oluşturulan stok kodu:', stockCode);

    // Ürün var mı kontrolünü ATLA - doğrudan kaydet
    // Varlık kontrolü sorun çıkardığı için kaldırıldı

    // Gümrük tarife kodunu belirle
    let gumrukTarifeKodu = '';
    if (capValue >= 0.8 && capValue <= 1.5) {
      gumrukTarifeKodu = '721720300011';
    } else if (capValue > 1.5 && capValue <= 6.0) {
      gumrukTarifeKodu = '721720300012';
    } else if (capValue > 6.0) {
      gumrukTarifeKodu = '721720300013';
    }

    // AMB.SHRİNK değerini belirle
    let ambShrink = '';
    if (values.ic_cap === 45 && values.dis_cap === 75) {
      ambShrink = 'AMB.SHRİNK.200*140CM';
    } else if (values.ic_cap === 50 && values.dis_cap === 90) {
      ambShrink = 'AMB.SHRİNK.200*160CM';
    } else if (values.ic_cap === 55 && values.dis_cap === 105) {
      ambShrink = 'AMB.SHRİNK.200*190CM';
    }

    // Yeni tarih ekle - veritabanında benzersiz kayıt oluşturmaya yardımcı olur
    const timestamp = new Date().getTime();

    // MM GT verilerini hazırla
    const mmGtDataToSave = {
      ...values,
      stok_kodu: `${stockCode}_${timestamp}`, // Benzersiz olmasını sağla
      stok_adi: `Galvanizli Tel ${capValue.toString().replace('.', ',')} mm -${values.tolerans_minus.toString().replace('.', ',')}/+${values.tolerans_plus.toString().replace('.', ',')} ${values.kaplama} gr/m²${values.min_mukavemet}-${values.max_mukavemet} MPa ID:${values.ic_cap} cm OD:${values.dis_cap} cm ${values.kg} kg`,
      ingilizce_isim: `Galvanized Steel Wire ${capValue.toString().replace('.', ',')} mm -${values.tolerans_minus.toString().replace('.', ',')}/+${values.tolerans_plus.toString().replace('.', ',')} ${values.kaplama} gr/m²${values.min_mukavemet}-${values.max_mukavemet} MPa ID:${values.ic_cap} cm OD:${values.dis_cap} cm ${values.kg} kg`,
      grup_kodu: 'MM',
      kod_1: 'GT',
      muh_detay: '26',
      depo_kodu: '36',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1000,
      cevrim_degeri_1: 0.001,
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      fiyat_birimi: 1,
      satis_kdv_orani: 20,
      alis_kdv_orani: 20,
      alis_fiyati: 0,
      satis_fiyati_1: 0,
      satis_fiyati_2: 0,
      satis_fiyati_3: 0,
      satis_fiyati_4: 0,
      doviz_alis: 0,
      doviz_maliyeti: 0,
      doviz_satis_fiyati: 0,
      azami_stok: 0,
      asgari_stok: 0,
      dov_tipi: 0,
      bekleme_suresi: 0,
      temin_suresi: 0,
      birim_agirlik: 0,
      nakliye_tutar: 0,
      stok_turu: 'D',
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H',
      alis_doviz_tipi: 2,
      gumruk_tarife_kodu: gumrukTarifeKodu,
      mensei: '052',
      metarial: 'Galvanizli Tel',
      dia_mm: capValue.toString().replace('.', ','),
      dia_tol_mm_plus: values.tolerans_plus.toString().replace('.', ','),
      dia_tol_mm_minus: values.tolerans_minus.toString().replace('.', ','),
      zing_coating: values.kaplama.toString(),
      tensile_st_min: values.min_mukavemet.toString(),
      tensile_st_max: values.max_mukavemet.toString(),
      wax: '+',
      lifting_lugs: '+',
      coil_dimensions_id: values.ic_cap.toString(),
      coil_dimensions_od: values.dis_cap.toString(),
      coil_weight: values.kg.toString(),
      amb_shrink: ambShrink,
      created_by: user?.id || null,
      updated_by: user?.id || null,
    };

    delete mmGtDataToSave.sequence;

    // API endpoint'ini ve metodu belirle
    const apiMethod = 'POST'; // Her zaman POST kullan
    const apiUrl = API_URLS.galMmGt; // Her zaman yeni oluştur
    
    console.log(`API isteği: ${apiMethod} ${apiUrl}`);
    console.log('Gönderilen veri:', mmGtDataToSave);

    // API isteğini gönder
    const response = await fetchWithAuth(apiUrl, {
      method: apiMethod,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mmGtDataToSave),
    });
    
    console.log('API yanıt durumu:', response.status);

    if (!response.ok) {
      let errorMessage = 'MM GT kaydedilemedi';
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch (e) {}
      
      throw new Error(errorMessage);
    }

    // Başarılı yanıt
    const result = await response.json();
    console.log('Kaydedilen MM GT:', result);
    
    setMmGtData(result);
    setSuccessMessage('MM GT kaydı başarıyla oluşturuldu');
    toast.success('MM GT kaydı başarıyla oluşturuldu');

    // Veritabanını güncelle
    await fetchProductDatabase();

    return result;
  } catch (error) {
    console.error('MM GT kaydetme hatası:', error);
    setError('MM GT kaydedilirken bir hata oluştu: ' + error.message);
    toast.error('MM GT kaydedilirken bir hata oluştu: ' + error.message);
    return null;
  } finally {
    setLoading(false);
  }
};
   
// Bu fonksiyon YM GT kaydeder
const saveYMGT = async (values, mmGtId) => {
  setLoading(true);
  setError(null);

  try {
    console.log('YM GT kaydediliyor, MM GT ID:', mmGtId);
    
    // MM GT verisini API'den al - sorgu parametresi olarak
    const response = await fetchWithAuth(`${API_URLS.galMmGt}?id=${mmGtId}`);
    
    if (!response.ok) {
      throw new Error('MM GT bulunamadı');
    }
    
    let mmGtResults = await response.json();
    
    // API yanıtı dizi değilse diziyi zorla
    if (!Array.isArray(mmGtResults)) {
      mmGtResults = [mmGtResults];
    }
    
    if (mmGtResults.length === 0) {
      throw new Error('MM GT bulunamadı');
    }
    
    const mmGt = mmGtResults[0];
    console.log('Bulunan MM GT:', mmGt);

    // Stok kodunu üret
    const stockCode = mmGt.stok_kodu.replace('GT.', 'YM.GT.');

    // YM GT verisini oluştur
    const ymGtDataToSave = {
      mm_gt_id: mmGtId,
      stok_kodu: stockCode,
      stok_adi: mmGt.stok_adi,
      ingilizce_isim: mmGt.ingilizce_isim,
      grup_kodu: 'YM',
      kod_1: 'GT',
      kod_2: mmGt.kod_2,
      cap: mmGt.cap,
      kaplama: mmGt.kaplama,
      min_mukavemet: mmGt.min_mukavemet,
      max_mukavemet: mmGt.max_mukavemet,
      kg: mmGt.kg,
      ic_cap: mmGt.ic_cap,
      dis_cap: mmGt.dis_cap,
      shrink: mmGt.shrink,
      tolerans_plus: mmGt.tolerans_plus,
      tolerans_minus: mmGt.tolerans_minus,
      muh_detay: '83',
      depo_kodu: '35',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1000,
      cevrim_degeri_1: 0.001,
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      alis_fiyati: 0,
      satis_fiyati_1: 0,
      satis_fiyati_2: 0,
      satis_fiyati_3: 0,
      satis_fiyati_4: 0,
      doviz_alis: 0,
      doviz_maliyeti: 0,
      doviz_satis_fiyati: 0,
      azami_stok: 0,
      asgari_stok: 0,
      dov_tutar: 0,
      dov_tipi: 0,
      bekleme_suresi: 0,
      temin_suresi: 0,
      birim_agirlik: 0,
      nakliye_tutar: 0,
      fiyat_birimi: 1,
      satis_kdv_orani: 20,
      alis_kdv_orani: 20,
      stok_turu: 'D',
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H',
      created_by: user?.id || null,
      updated_by: user?.id || null,
    };

    // Önce var mı kontrol et
    console.log('YM GT varlığı kontrol ediliyor, MM GT ID:', mmGtId);
    const checkRes = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${mmGtId}`);
    
    if (!checkRes.ok && checkRes.status !== 404) {
      throw new Error('YM GT kontrolü yapılamadı');
    }
    
    let existing = await checkRes.json();
    
    // API yanıtı dizi değilse diziyi zorla
    if (!Array.isArray(existing)) {
      existing = [existing];
    }
    
    let saveRes;
    if (existing.length > 0) {
      // Güncelleme
      console.log('Mevcut YM GT güncelleniyor, ID:', existing[0].id);
      
      // Path parametre kullanan endpoint
      const updateUrl = `${API_URLS.galYmGt}/${existing[0].id}`;
      console.log('Güncelleme URL:', updateUrl);
      
      saveRes = await fetchWithAuth(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ymGtDataToSave),
      });
      
      if (!saveRes.ok) {
        throw new Error('YM GT güncellenemedi');
      }
      
      setSuccessMessage('YM GT kaydı başarıyla güncellendi');
      toast.success('YM GT kaydı başarıyla güncellendi');
    } else {
      // Yeni kayıt
      console.log('Yeni YM GT oluşturuluyor');
      saveRes = await fetchWithAuth(API_URLS.galYmGt, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ymGtDataToSave),
      });
      
      if (!saveRes.ok) {
        throw new Error('YM GT oluşturulamadı');
      }
      
      setSuccessMessage('YM GT kaydı başarıyla oluşturuldu');
      toast.success('YM GT kaydı başarıyla oluşturuldu');
    }

    const savedData = await saveRes.json();
    console.log('Kaydedilen YM GT:', savedData);
    setYmGtData(savedData);

    // Veritabanını güncelle
    await fetchProductDatabase();

    return savedData;
  } catch (error) {
    console.error('YM GT kaydetme hatası:', error);
    setError('YM GT kaydı sırasında bir hata oluştu: ' + error.message);
    toast.error('YM GT kaydı sırasında bir hata oluştu: ' + error.message);
    return null;
  } finally {
    setLoading(false);
  }
};


  // YM ST kaydetme fonksiyonu
  const saveYMST = async (values, mmGtId) => {
    setLoading(true);
    setError(null);

    try {
      let ymStId;

      if (values.isNew) {
        // Yeni YM ST oluştur
        const stockCode = `YM.ST.${values.cap.toString().padStart(4, '0')}.${values.filmasin.toString().padStart(4, '0')}.${values.quality}`;
        const stockName = `YM Siyah Tel ${values.cap.toString().padStart(4, '0')} mm HM:${values.filmasin.toString().padStart(4, '0')}.${values.quality}`;

        // Özel saha 1 değerini belirle
        let ozelSaha1;
        if (values.cap < 2) ozelSaha1 = 1;
        else if (values.cap < 3) ozelSaha1 = 2;
        else if (values.cap < 4) ozelSaha1 = 3;
        else if (values.cap < 5) ozelSaha1 = 4;
        else if (values.cap < 6) ozelSaha1 = 5;
        else if (values.cap < 7) ozelSaha1 = 6;
        else if (values.cap < 8) ozelSaha1 = 7;
        else ozelSaha1 = 8;

        const ymStDataToSave = {
          stok_kodu: stockCode,
          stok_adi: stockName,
          grup_kodu: 'YM',
          kod_1: 'ST',
          muh_detay: '28',
          depo_kodu: '35',
          satis_kdv_orani: '20',
          ozel_saha_1_say: ozelSaha1,
          br_1: 'KG',
          br_2: 'TN',
          pay_1: 1,
          payda_1: 1000,
          cevrim_degeri_1: 0.001,
          cevrim_pay_2: 1,
          cevrim_payda_2: 1,
          cevrim_degeri_2: 1,
          alis_fiyati: 0,
          satis_fiyati_1: 0,
          satis_fiyati_2: 0,
          satis_fiyati_3: 0,
          satis_fiyati_4: 0,
          doviz_alis: 0,
          doviz_maliyeti: 0,
          doviz_satis_fiyati: 0,
          azami_stok: 0,
          asgari_stok: 0,
          dov_tipi: 0,
          alis_doviz_tipi: 0,
          bekleme_suresi: 0,
          temin_suresi: 0,
          birim_agirlik: 0,
          nakliye_tutar: 0,
          ozel_saha_2_say: 0,
          ozel_saha_3_say: 0,
          ozel_saha_4_say: 0,
          ozel_saha_5_say: 0,
          ozel_saha_6_say: 0,
          ozel_saha_7_say: 0,
          cap: values.cap,
          filmasin: values.filmasin,
          quality: values.quality,
          stok_turu: 'D',
          esnek_yapilandir: 'H',
          super_recete_kullanilsin: 'H',
          created_by: user?.id || null,
          updated_by: user?.id || null,
        };

        // Zaten var mı kontrol et
        const checkRes = await fetchWithAuth(`${API_URLS.galYmSt}?stok_kodu=${encodeURIComponent(stockCode)}`);
        
        if (!checkRes.ok && checkRes.status !== 404) {
          throw new Error('YM ST kontrolü yapılamadı');
        }
        
        const existing = await checkRes.json();
        
        let savedData;
        if (existing && existing.length > 0) {
          // Varsa mevcut kayıt kullan
          savedData = existing[0];
        } else {
          // Yoksa yeni oluştur
          const insertRes = await fetchWithAuth(API_URLS.galYmSt, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ymStDataToSave),
          });
          
          if (!insertRes.ok) {
            throw new Error('YM ST oluşturulamadı');
          }
          
          savedData = await insertRes.json();
        }

        ymStId = savedData.id;

        // MM GT - YM ST ilişkisini oluştur
        const relationRes = await fetchWithAuth(API_URLS.galMmGtYmSt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mm_gt_id: mmGtId,
            ym_st_id: ymStId,
            created_by: user?.id || null,
            updated_by: user?.id || null,
          }),
        });
        
        if (!relationRes.ok) {
          throw new Error('YM ST ilişkisi kurulamadı');
        }

        setSelectedYmSt(prev => [...prev, savedData]);
        setSuccessMessage('YM ST kaydı başarıyla eklendi');
        toast.success('YM ST kaydı başarıyla eklendi');

        // Veritabanını güncelle
        await fetchProductDatabase();

        return savedData;
      } else {
        // Mevcut YM ST için sadece ilişki kur
        const relationRes = await fetchWithAuth(API_URLS.galMmGtYmSt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mm_gt_id: mmGtId,
            ym_st_id: values.id,
            created_by: user?.id || null,
            updated_by: user?.id || null,
          }),
        });
        
        if (!relationRes.ok) {
          throw new Error('YM ST ilişkisi kurulamadı');
        }

        // YM ST detaylarını al
        const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?id=${values.id}`);
        
        if (!ymStRes.ok) {
          throw new Error('YM ST detayları alınamadı');
        }
        
        const ymStData = await ymStRes.json();
        
        if (!ymStData || ymStData.length === 0) {
          throw new Error('YM ST bulunamadı');
        }
        
        setSelectedYmSt(prev => [...prev, ymStData[0]]);
        setSuccessMessage('YM ST ilişkisi başarıyla kuruldu');
        toast.success('YM ST ilişkisi başarıyla kuruldu');

        // Veritabanını güncelle
        await fetchProductDatabase();

        return ymStData[0];
      }
    } catch (error) {
      console.error('YM ST kaydetme hatası:', error);
      setError('YM ST kaydedilirken bir hata oluştu: ' + error.message);
      toast.error('YM ST kaydedilirken bir hata oluştu: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

// MM GT Reçete oluşturma (mevcut olanı siler, yenisini ekler)
const createMMGTRecete = async (mmGtId, ymGtId, receteData = null) => {
  // MM GT verilerini al
  const mmGtRes = await fetchWithAuth(`${API_URLS.galMmGt}/${mmGtId}`);
  
  if (!mmGtRes.ok) {
    throw new Error('MM GT verisi alınamadı');
  }
  
  const mmGt = await mmGtRes.json();

  // YM GT stok kodunu al
  const ymGtRes = await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`);
  
  if (!ymGtRes.ok) {
    throw new Error('YM GT verisi alınamadı');
  }
  
  const ymGt = await ymGtRes.json();

  // Reçete öğelerini oluştur
  const receteItems = [
    {
      mamul_kodu: mmGt.stok_kodu,
      recete_top: 1,
      fire_orani: 0.0004,
      olcu_br: 'KG',
      sira_no: 1,
      operasyon_bilesen: 'Bileşen',
      bilesen_kodu: ymGt.stok_kodu,
      olcu_br_bilesen: '1',
      miktar: 1,
      aciklama: 'Galvanizli Tel Tüketim Miktarı',
      ua_dahil_edilsin: 'evet',
      son_operasyon: 'evet',
      created_by: user?.id || null,
      updated_by: user?.id || null,
      mm_gt_id: mmGtId
    },
    {
      mamul_kodu: mmGt.stok_kodu,
      recete_top: 1,
      fire_orani: 0.0004,
      olcu_br: 'DK',
      sira_no: 2,
      operasyon_bilesen: 'Operasyon',
      bilesen_kodu: 'GTPKT01',
      olcu_br_bilesen: '1',
      miktar: receteData ? receteData.paketleme_suresi : 0.02,
      aciklama: 'Paketleme Operasyonu',
      uretim_suresi: receteData ? receteData.paketleme_suresi : 0.02,
      ua_dahil_edilsin: 'evet',
      son_operasyon: 'evet',
      created_by: user?.id || null,
      updated_by: user?.id || null,
      mm_gt_id: mmGtId
    },
    {
      mamul_kodu: mmGt.stok_kodu,
      recete_top: 1,
      fire_orani: 0.0004,
      olcu_br: 'AD',
      sira_no: 3,
      operasyon_bilesen: 'Bileşen',
      bilesen_kodu: 'AMB.ÇEM.KARTON.GAL',
      olcu_br_bilesen: '1',
      miktar: 0.016,
      aciklama: 'Karton Tüketim Miktarı',
      ua_dahil_edilsin: 'evet',
      son_operasyon: 'evet',
      created_by: user?.id || null,
      updated_by: user?.id || null,
      mm_gt_id: mmGtId
    },
    {
      mamul_kodu: mmGt.stok_kodu,
      recete_top: 1,
      fire_orani: 0.0004,
      olcu_br: 'KG',
      sira_no: 4,
      operasyon_bilesen: 'Bileşen',
      bilesen_kodu: mmGt.amb_shrink,
      olcu_br_bilesen: '1',
      miktar: 0.002,
      aciklama: 'Naylon Tüketim Miktarı',
      ua_dahil_edilsin: 'evet',
      son_operasyon: 'evet',
      created_by: user?.id || null,
      updated_by: user?.id || null,
      mm_gt_id: mmGtId
    },
    {
      mamul_kodu: mmGt.stok_kodu,
      recete_top: 1,
      fire_orani: 0.0004,
      olcu_br: 'AD',
      sira_no: 5,
      operasyon_bilesen: 'Bileşen',
      bilesen_kodu: 'SM.7MMHALKA',
      olcu_br_bilesen: '1',
      miktar: 0.008,
      aciklama: 'Kaldırma Kancası Tüketim Miktarı',
      ua_dahil_edilsin: 'evet',
      son_operasyon: 'evet',
      created_by: user?.id || null,
      updated_by: user?.id || null,
      mm_gt_id: mmGtId
    },
    {
      mamul_kodu: mmGt.stok_kodu,
      recete_top: 1,
      fire_orani: 0.0004,
      olcu_br: 'KG',
      sira_no: 6,
      operasyon_bilesen: 'Bileşen',
      bilesen_kodu: 'AMB.APEX CEMBER 38X080',
      olcu_br_bilesen: '1',
      miktar: 0.0024,
      aciklama: 'Çelik çember Tüketim Miktarı',
      ua_dahil_edilsin: 'evet',
      son_operasyon: 'evet',
      created_by: user?.id || null,
      updated_by: user?.id || null,
      mm_gt_id: mmGtId
    },
    {
      mamul_kodu: mmGt.stok_kodu,
      recete_top: 1,
      fire_orani: 0.0004,
      olcu_br: 'AD',
      sira_no: 7,
      operasyon_bilesen: 'Bileşen',
      bilesen_kodu: 'AMB.TOKA.SIGNODE.114P. DKP',
      olcu_br_bilesen: '1',
      miktar: 0.008,
      aciklama: 'Çember Tokası Tüketim Miktarı',
      ua_dahil_edilsin: 'evet',
      son_operasyon: 'evet',
      created_by: user?.id || null,
      updated_by: user?.id || null,
      mm_gt_id: mmGtId
    },
    {
      mamul_kodu: mmGt.stok_kodu,
      recete_top: 1,
      fire_orani: 0.0004,
      olcu_br: 'AD',
      sira_no: 8,
      operasyon_bilesen: 'Bileşen',
      bilesen_kodu: 'SM.DESİ.PAK',
      olcu_br_bilesen: '1',
      miktar: 0.002,
      aciklama: 'Slikajel Tüketim Miktarı',
      ua_dahil_edilsin: 'evet',
      son_operasyon: 'evet',
      created_by: user?.id || null,
      updated_by: user?.id || null,
      mm_gt_id: mmGtId
    }
  ];

  // DÜZELTME: Mevcut reçeteleri doğru şekilde sil
  try {
    // Önce mevcut reçeteleri al
    const existingRecetesRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
    
    if (existingRecetesRes.ok) {
      const existingRecetes = await existingRecetesRes.json();
      console.log(`${existingRecetes.length} adet mevcut reçete bulundu, siliniyor...`);
      
      // Her bir reçeteyi tek tek sil
      for (const recete of existingRecetes) {
        const deleteUrl = `${API_URLS.galMmGtRecete}/${recete.id}`;
        console.log(`Reçete siliniyor: ${deleteUrl}`);
        
        const deleteRes = await fetchWithAuth(deleteUrl, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!deleteRes.ok) {
          console.warn(`Reçete silinemedi, ID: ${recete.id}, durum: ${deleteRes.status}`);
        }
      }
    }
  } catch (error) {
    console.warn('MM GT reçetesi silinirken hata oluştu:', error);
  }

  // Reçeteyi veritabanına kaydet
  const receteRes = await fetchWithAuth(API_URLS.galMmGtRecete, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(receteItems),
  });
  
  if (!receteRes.ok) {
    throw new Error('MM GT reçetesi kaydedilemedi');
  }
  
  console.log('MM GT reçetesi başarıyla kaydedildi');
};

  // YM GT Reçete oluşturma
  const createYMGTRecete = async (ymGtId, receteData = null) => {
    // YM GT verilerini al
    const ymGtRes = await fetchWithAuth(`${API_URLS.galYmGt}?id=${ymGtId}`);
    
    if (!ymGtRes.ok) {
      throw new Error('YM GT verisi alınamadı');
    }
    
    const ymGtData = await ymGtRes.json();
    const ymGt = ymGtData[0];

    // İlişkili YM ST'leri al
    const ymStRelRes = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${ymGt.mm_gt_id}`);
    
    if (!ymStRelRes.ok) {
      throw new Error('YM ST ilişkileri alınamadı');
    }
    
    const ymStRelData = await ymStRelRes.json();
    
    if (!ymStRelData || ymStRelData.length === 0) {
      throw new Error('İlişkili YM ST bulunamadı');
    }
    
    const ymStIds = ymStRelData.map(rel => rel.ym_st_id);

    // YM ST detaylarını al
    const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?ids=${ymStIds.join(',')}`);
    
    if (!ymStRes.ok) {
      throw new Error('YM ST verileri alınamadı');
    }
    
    const ymStData = await ymStRes.json();
    
    // Birincil YM ST'yi seç (normalde kullanıcı belirlemeli)
    const primaryYmSt = ymStData[0];

    // Çap değerine bağlı hesaplamalar
    const diameter = parseFloat(ymGt.cap);
    
    // Boraks değeri hesaplama: 0.032 - (0.0029 * Diameter)
    const boraksTuketimi = receteData ? receteData.boraks_tuketimi : Math.max(0.001, 0.032 - (0.0029 * diameter));
    
    // Asit değeri hesaplama
    let asitTuketimi;
    if (receteData) {
      asitTuketimi = receteData.asit_tuketimi;
    } else {
      if (ymGt.kod_2 === 'NIT') {
        // NIT için değer
        if (diameter < 1.5) {
          asitTuketimi = 0.002;
        } else if (diameter >= 1.5 && diameter < 2.5) {
          asitTuketimi = 0.0025;
        } else {
          asitTuketimi = 0.003;
        }
      } else {
        // PAD için değer
        if (diameter < 1.5) {
          asitTuketimi = 0.001;
        } else if (diameter >= 1.5 && diameter < 2.5) {
          asitTuketimi = 0.0015;
        } else {
          asitTuketimi = 0.002;
        }
      }
    }
    
    // Desi değeri hesaplama
    const desiTuketimi = receteData ? receteData.desi_tuketimi : (ymGt.kg > 800 ? 0.002 : 0.0013);
    
    // Paketleme süresi
    const paketlemeSuresi = receteData ? receteData.paketleme_suresi : 0.020;
    
    // Galvanizleme süresi hesaplama: 1.15 - (0.125 * Diameter)
    const galvanizlemeSuresi = receteData ? receteData.galvanizleme_suresi : Math.max(0.001, 1.15 - (0.125 * diameter));

    // Reçete öğelerini oluştur
    const receteItems = [
      {
        mamul_kodu: ymGt.stok_kodu,
        recete_top: 1,
        fire_orani: 0.002,
        olcu_br: 'KG',
        sira_no: 1,
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: primaryYmSt.stok_kodu,
        olcu_br_bilesen: '1',
        miktar: 1,
        aciklama: 'Siyah Tel Tüketim Miktarı',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user?.id || null,
        updated_by: user?.id || null,
        ym_gt_id: ymGtId
      },
      {
        mamul_kodu: ymGt.stok_kodu,
        recete_top: 1,
        fire_orani: 0.002,
        olcu_br: 'KG',
        sira_no: 2,
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: '150 03',
        olcu_br_bilesen: '1',
        miktar: boraksTuketimi,
        aciklama: 'Boraks Tüketim Miktarı',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user?.id || null,
        updated_by: user?.id || null,
        ym_gt_id: ymGtId
      },
      {
        mamul_kodu: ymGt.stok_kodu,
        recete_top: 1,
        fire_orani: 0.002,
        olcu_br: 'KG',
        sira_no: 3,
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: 'SM.HİDROLİK.ASİT',
        olcu_br_bilesen: '1',
        miktar: asitTuketimi,
        aciklama: 'Asit Tüketim Miktarı',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user?.id || null,
        updated_by: user?.id || null,
        ym_gt_id: ymGtId
      },
      {
        mamul_kodu: ymGt.stok_kodu,
        recete_top: 1,
        fire_orani: 0.002,
        olcu_br: 'KG',
        sira_no: 4,
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: 'SM.DESİ.PAK',
        olcu_br_bilesen: '1',
        miktar: desiTuketimi,
        aciklama: 'Desisifiye Tüketim Miktarı',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user?.id || null,
        updated_by: user?.id || null,
        ym_gt_id: ymGtId
      },
      {
        mamul_kodu: ymGt.stok_kodu,
        recete_top: 1,
        fire_orani: 0.002,
        olcu_br: 'DK',
        sira_no: 5,
        operasyon_bilesen: 'Operasyon',
        bilesen_kodu: 'GTPKT01',
        olcu_br_bilesen: '1',
        miktar: paketlemeSuresi,
        aciklama: 'Paketleme Operasyonu',
        uretim_suresi: paketlemeSuresi,
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user?.id || null,
        updated_by: user?.id || null,
        ym_gt_id: ymGtId
      },
      {
        mamul_kodu: ymGt.stok_kodu,
        recete_top: 1,
        fire_orani: 0.002,
        olcu_br: 'DK',
        sira_no: 6,
        operasyon_bilesen: 'Operasyon',
        bilesen_kodu: 'GLV01',
        olcu_br_bilesen: '1',
        miktar: galvanizlemeSuresi,
        aciklama: 'Galvanizleme Operasyonu',
        uretim_suresi: galvanizlemeSuresi,
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user?.id || null,
        updated_by: user?.id || null,
        ym_gt_id: ymGtId
      }
    ];

    // Önce mevcut reçeteyi sil
    try {
      await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn('YM GT reçetesi silinirken hata oluştu:', error);
    }

    // Reçeteyi veritabanına kaydet
    const receteRes = await fetchWithAuth(API_URLS.galYmGtRecete, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receteItems),
    });
    
    if (!receteRes.ok) {
      throw new Error('YM GT reçetesi kaydedilemedi');
    }
  };

  // YM ST Reçete oluşturma
  const createYMSTRecete = async (ymStId, receteData = null) => {
    // YM ST verilerini al
    const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
    
    if (!ymStRes.ok) {
      throw new Error('YM ST verisi alınamadı');
    }
    
    const ymStData = await ymStRes.json();
    const ymSt = ymStData[0];

    // TLC01 değeri hesapla: 0.2/(Diameter^1.5)
    const diameter = parseFloat(ymSt.cap);
    const telCekmeSuresi = receteData ? receteData.tel_cekme_suresi : (0.2 / Math.pow(diameter, 1.5));

    // Filmaşin belirle
    let filmasinKod = `FLM.${ymSt.filmasin.toString().padStart(4, '0')}.${ymSt.quality}`;

    // Reçete öğelerini oluştur
    const receteItems = [
      {
        mamul_kodu: ymSt.stok_kodu,
        recete_top: 1,
        olcu_br: 'KG',
        sira_no: 1,
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: filmasinKod,
        olcu_br_bilesen: '1',
        miktar: 1,
        aciklama: 'Filmaşin Tüketimi',
        created_by: user?.id || null,
        updated_by: user?.id || null,
        ym_st_id: ymStId
      },
      {
        mamul_kodu: ymSt.stok_kodu,
        recete_top: 1,
        olcu_br: 'DK',
        sira_no: 2,
        operasyon_bilesen: 'Operasyon',
        bilesen_kodu: 'TLC01',
        olcu_br_bilesen: '1',
        miktar: telCekmeSuresi,
        aciklama: 'Tel Çekme Operasyonu',
        uretim_suresi: telCekmeSuresi,
        created_by: user?.id || null,
        updated_by: user?.id || null,
        ym_st_id: ymStId
      }
    ];

    // Önce mevcut reçeteyi sil
    try {
      await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymStId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn('YM ST reçetesi silinirken hata oluştu:', error);
    }

    // Reçeteyi veritabanına kaydet
    const receteRes = await fetchWithAuth(API_URLS.galYmStRecete, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receteItems),
    });
    
    if (!receteRes.ok) {
      throw new Error('YM ST reçetesi kaydedilemedi');
    }
  };

  // Reçete kaydetme fonksiyonu
  const saveRecete = async (values, mmGtId, ymGtId) => {
    setLoading(true);
    setError(null);

    try {
      // Reçete verileri oluşturma
      await createMMGTRecete(mmGtId, ymGtId, values);
      await createYMGTRecete(ymGtId, values);
      
      if (selectedYmSt.length > 0) {
        for (const ymSt of selectedYmSt) {
          await createYMSTRecete(ymSt.id, values);
        }
      }

      setReceteData(values);
      setSuccessMessage('Reçete verileri başarıyla kaydedildi');
      toast.success('Reçete verileri başarıyla kaydedildi');
      return true;
    } catch (error) {
      console.error('Reçete kaydetme hatası:', error);
      setError('Reçete kaydedilirken bir hata oluştu: ' + error.message);
      toast.error('Reçete kaydedilirken bir hata oluştu: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Reçeteleri kontrol et ve gerekirse oluştur
  const checkAndCreateRecipes = async (mmGt, ymGt, ymStList) => {
    // MM GT reçetesini kontrol et
    const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
    
    if (!mmGtReceteRes.ok && mmGtReceteRes.status !== 404) {
      throw new Error('MM GT reçetesi kontrol edilemedi');
    }
    
    const mmGtReceteData = await mmGtReceteRes.json();
    
    if (!mmGtReceteData || mmGtReceteData.length === 0) {
      // Reçete yoksa oluştur
      await createMMGTRecete(mmGt.id, ymGt.id, receteData);
    }

    // YM GT reçetesini kontrol et
    const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
    
    if (!ymGtReceteRes.ok && ymGtReceteRes.status !== 404) {
      throw new Error('YM GT reçetesi kontrol edilemedi');
    }
    
    const ymGtReceteData = await ymGtReceteRes.json();
    
    if (!ymGtReceteData || ymGtReceteData.length === 0) {
      // Reçete yoksa oluştur
      await createYMGTRecete(ymGt.id, receteData);
    }

    // YM ST reçetelerini kontrol et
    for (const ymSt of ymStList) {
      const ymStReceteRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
      
      if (!ymStReceteRes.ok && ymStReceteRes.status !== 404) {
        throw new Error(`YM ST reçetesi kontrol edilemedi: ${ymSt.stok_kodu}`);
      }
      
      const ymStReceteData = await ymStReceteRes.json();
      
      if (!ymStReceteData || ymStReceteData.length === 0) {
        // Reçete yoksa oluştur
        await createYMSTRecete(ymSt.id, receteData);
      }
    }
  };

  // Stok Kartı Excel oluşturma fonksiyonu
  const createStokKartiExcel = async (mmGt, ymGt, ymStList) => {
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook();
    
    // MM GT sayfasını ekle
    const mmGtSheet = workbook.addWorksheet('MM GT');
    
    // MM GT başlıkları - "All table headers.txt" içindeki MM GT başlıkları ile tam eşleşir
    mmGtSheet.columns = [
      { header: 'Stok Kodu', key: 'stok_kodu', width: 20 },
      { header: 'Stok Adı', key: 'stok_adi', width: 50 },
      { header: 'Grup Kodu', key: 'grup_kodu', width: 12 },
      { header: 'Kod-1', key: 'kod_1', width: 10 },
      { header: 'Kod-2', key: 'kod_2', width: 10 },
      { header: 'Cari/Satıcı Kodu', key: 'cari_satici_kodu', width: 15 },
      { header: 'İngilizce İsim', key: 'ingilizce_isim', width: 50 },
      { header: 'Satıcı İsmi', key: 'satici_ismi', width: 20 },
      { header: 'Muh. Detay', key: 'muh_detay', width: 12 },
      { header: 'Depo Kodu', key: 'depo_kodu', width: 12 },
      { header: 'Br-1', key: 'br_1', width: 10 },
      { header: 'Br-2', key: 'br_2', width: 10 },
      { header: 'Pay-1', key: 'pay_1', width: 10 },
      { header: 'Payda-1', key: 'payda_1', width: 10 },
      { header: 'Çevrim Değeri-1', key: 'cevrim_degeri_1', width: 15 },
      { header: 'Ölçü Br-3', key: 'olcu_br_3', width: 10 },
      { header: 'Çevrim Pay-2', key: 'cevrim_pay_2', width: 15 },
      { header: 'Çevrim Payda-2', key: 'cevrim_payda_2', width: 15 },
      { header: 'Çevrim Değeri-2', key: 'cevrim_degeri_2', width: 15 },
      { header: 'Çap', key: 'cap', width: 10 },
      { header: 'Kaplama', key: 'kaplama', width: 10 },
      { header: 'Min Mukavemet', key: 'min_mukavemet', width: 15 },
      { header: 'Max Mukavemet', key: 'max_mukavemet', width: 15 },
      { header: 'KG', key: 'kg', width: 10 },
      { header: 'İç Çap/Boy Çubuk AD', key: 'ic_cap', width: 20 },
      { header: 'Dış Çap/En Çubuk AD', key: 'dis_cap', width: 20 },
      { header: 'Çap2', key: 'cap2', width: 10 },
      { header: 'Shrink', key: 'shrink', width: 10 },
      { header: 'Tolerans(+)', key: 'tolerans_plus', width: 12 },
      { header: 'Tolerans(-)', key: 'tolerans_minus', width: 12 },
      { header: 'Ebat(En)', key: 'ebat_en', width: 10 },
      { header: 'Göz Aralığı', key: 'goz_araligi', width: 12 },
      { header: 'Ebat(Boy)', key: 'ebat_boy', width: 10 },
      { header: 'Hasır Tipi', key: 'hasir_tipi', width: 12 },
      { header: 'Özel Saha 8 (Alf.)', key: 'ozel_saha_8_alf', width: 20 },
      { header: 'Alış Fiyatı', key: 'alis_fiyati', width: 12 },
      { header: 'Fiyat Birimi', key: 'fiyat_birimi', width: 12 },
      { header: 'Satış Fiyatı-1', key: 'satis_fiyati_1', width: 15 },
      { header: 'Satış Fiyatı-2', key: 'satis_fiyati_2', width: 15 },
      { header: 'Satış Fiyatı-3', key: 'satis_fiyati_3', width: 15 },
      { header: 'Satış Fiyatı-4', key: 'satis_fiyati_4', width: 15 },
      { header: 'Satış Tipi', key: 'satis_tipi', width: 12 },
      { header: 'Döviz Alış', key: 'doviz_alis', width: 12 },
      { header: 'Döviz Maliyeti', key: 'doviz_maliyeti', width: 15 },
      { header: 'Döviz Satış Fiyatı', key: 'doviz_satis_fiyati', width: 18 },
      { header: 'Azami Stok', key: 'azami_stok', width: 12 },
      { header: 'Asgari Stok', key: 'asgari_stok', width: 12 },
      { header: 'Döv.Tutar', key: 'dov_tutar', width: 12 },
      { header: 'Döv.Tipi', key: 'dov_tipi', width: 10 },
      { header: 'Bekleme Süresi', key: 'bekleme_suresi', width: 15 },
      { header: 'Temin Süresi', key: 'temin_suresi', width: 12 },
      { header: 'Birim Ağırlık', key: 'birim_agirlik', width: 12 },
      { header: 'Nakliye Tutar', key: 'nakliye_tutar', width: 12 },
      { header: 'Satış KDV Oranı', key: 'satis_kdv_orani', width: 15 },
      { header: 'Alış KDV Oranı', key: 'alis_kdv_orani', width: 15 },
      { header: 'Stok Türü', key: 'stok_turu', width: 10 },
      { header: 'Mali Grup Kodu', key: 'mali_grup_kodu', width: 15 },
      { header: 'Barkod 1', key: 'barkod_1', width: 12 },
      { header: 'Barkod 2', key: 'barkod_2', width: 12 },
      { header: 'Barkod 3', key: 'barkod_3', width: 12 },
      { header: 'Kod-3', key: 'kod_3', width: 10 },
      { header: 'Kod-4', key: 'kod_4', width: 10 },
      { header: 'Kod-5', key: 'kod_5', width: 10 },
      { header: 'Esnek Yapılandır', key: 'esnek_yapilandir', width: 18 },
      { header: 'Süper Reçete Kullanılsın', key: 'super_recete_kullanilsin', width: 22 },
      { header: 'Bağlı Stok Kodu', key: 'bagli_stok_kodu', width: 18 },
      { header: 'Yapılandırma Kodu', key: 'yapilandirma_kodu', width: 18 },
      { header: 'Yap. Açıklama', key: 'yap_aciklama', width: 15 },
      { header: 'Alış Döviz Tipi', key: 'alis_doviz_tipi', width: 15 },
      { header: 'Gümrük Tarife Kodu', key: 'gumruk_tarife_kodu', width: 18 },
      { header: 'Dağıtıcı Kodu', key: 'dagitici_kodu', width: 15 },
      { header: 'Menşei', key: 'mensei', width: 10 },
      { header: 'METARIAL', key: 'metarial', width: 12 },
      { header: 'DIA (MM)', key: 'dia_mm', width: 10 },
      { header: 'DIA TOL (MM) +', key: 'dia_tol_mm_plus', width: 15 },
      { header: 'DIA TOL (MM) -', key: 'dia_tol_mm_minus', width: 15 },
      { header: 'ZING COATING (GR/M2)', key: 'zing_coating', width: 20 },
      { header: 'TENSILE ST. (MPA) MIN', key: 'tensile_st_min', width: 20 },
      { header: 'TENSILE ST. (MPA) MAX', key: 'tensile_st_max', width: 20 },
      { header: 'WAX', key: 'wax', width: 10 },
      { header: 'LIFTING LUGS', key: 'lifting_lugs', width: 15 },
      { header: 'UNWINDING', key: 'unwinding', width: 15 },
      { header: 'CAST KONT. (CM)', key: 'cast_kont', width: 15 },
      { header: 'HELIX KONT. (CM)', key: 'helix_kont', width: 15 },
      { header: 'ELONGATION (%) MIN', key: 'elongation', width: 18 },
      { header: 'COIL DIMENSIONS (CM) ID', key: 'coil_dimensions_id', width: 22 },
      { header: 'COIL DIMENSIONS (CM) OD', key: 'coil_dimensions_od', width: 22 },
      { header: 'COIL WEIGHT (KG)', key: 'coil_weight', width: 18 },
      { header: 'COIL WEIGHT (KG) MIN', key: 'coil_weight_min', width: 20 },
      { header: 'COIL WEIGHT (KG) MAX', key: 'coil_weight_max', width: 20 }
    ];
    
    // MM GT verisini ekle
    mmGtSheet.addRow({
      stok_kodu: mmGt.stok_kodu,
      stok_adi: mmGt.stok_adi,
      grup_kodu: mmGt.grup_kodu,
      kod_1: mmGt.kod_1,
      kod_2: mmGt.kod_2,
      cari_satici_kodu: mmGt.cari_satici_kodu || "",
      ingilizce_isim: mmGt.ingilizce_isim || "",
      satici_ismi: mmGt.satici_ismi || "",
      muh_detay: mmGt.muh_detay,
      depo_kodu: mmGt.depo_kodu,
      br_1: mmGt.br_1,
      br_2: mmGt.br_2,
      pay_1: mmGt.pay_1 || 1,
      payda_1: mmGt.payda_1 || 1000,
      cevrim_degeri_1: mmGt.cevrim_degeri_1 || 0.001,
      olcu_br_3: mmGt.olcu_br_3 || "",
      cevrim_pay_2: mmGt.cevrim_pay_2 || 1,
      cevrim_payda_2: mmGt.cevrim_payda_2 || 1,
      cevrim_degeri_2: mmGt.cevrim_degeri_2 || 1,
      cap: mmGt.cap,
      kaplama: mmGt.kaplama,
      min_mukavemet: mmGt.min_mukavemet,
      max_mukavemet: mmGt.max_mukavemet,
      kg: mmGt.kg,
      ic_cap: mmGt.ic_cap,
      dis_cap: mmGt.dis_cap,
      cap2: mmGt.cap2 || "",
      shrink: mmGt.shrink,
      tolerans_plus: mmGt.tolerans_plus,
      tolerans_minus: mmGt.tolerans_minus,
      ebat_en: mmGt.ebat_en || "",
      goz_araligi: mmGt.goz_araligi || "",
      ebat_boy: mmGt.ebat_boy || "",
      hasir_tipi: mmGt.hasir_tipi || "",
      ozel_saha_8_alf: mmGt.ozel_saha_8_alf || "",
      alis_fiyati: mmGt.alis_fiyati || 0,
      fiyat_birimi: mmGt.fiyat_birimi || 1,
      satis_fiyati_1: mmGt.satis_fiyati_1 || 0,
      satis_fiyati_2: mmGt.satis_fiyati_2 || 0,
      satis_fiyati_3: mmGt.satis_fiyati_3 || 0,
      satis_fiyati_4: mmGt.satis_fiyati_4 || 0,
      satis_tipi: mmGt.satis_tipi || 1,
      doviz_alis: mmGt.doviz_alis || 0,
      doviz_maliyeti: mmGt.doviz_maliyeti || 0,
      doviz_satis_fiyati: mmGt.doviz_satis_fiyati || 0,
      azami_stok: mmGt.azami_stok || 0,
      asgari_stok: mmGt.asgari_stok || 0,
      dov_tutar: mmGt.dov_tutar || "",
      dov_tipi: mmGt.dov_tipi || 0,
      bekleme_suresi: mmGt.bekleme_suresi || 0,
      temin_suresi: mmGt.temin_suresi || 0,
      birim_agirlik: mmGt.birim_agirlik || 0,
      nakliye_tutar: mmGt.nakliye_tutar || 0,
      satis_kdv_orani: mmGt.satis_kdv_orani || "20",
      alis_kdv_orani: mmGt.alis_kdv_orani || "20",
      stok_turu: mmGt.stok_turu || "D",
      mali_grup_kodu: mmGt.mali_grup_kodu || "",
      barkod_1: mmGt.barkod_1 || "",
      barkod_2: mmGt.barkod_2 || "",
      barkod_3: mmGt.barkod_3 || "",
      kod_3: mmGt.kod_3 || "",
      kod_4: mmGt.kod_4 || "",
      kod_5: mmGt.kod_5 || "",
      esnek_yapilandir: mmGt.esnek_yapilandir || "H",
      super_recete_kullanilsin: mmGt.super_recete_kullanilsin || "H",
      bagli_stok_kodu: mmGt.bagli_stok_kodu || "",
      yapilandirma_kodu: mmGt.yapilandirma_kodu || "",
      yap_aciklama: mmGt.yap_aciklama || "",
      alis_doviz_tipi: mmGt.alis_doviz_tipi || 2,
      gumruk_tarife_kodu: mmGt.gumruk_tarife_kodu,
      dagitici_kodu: mmGt.dagitici_kodu || "",
      mensei: mmGt.mensei || "",
      metarial: mmGt.metarial || "Galvanizli Tel",
      dia_mm: mmGt.dia_mm || "",
      dia_tol_mm_plus: mmGt.dia_tol_mm_plus || "",
      dia_tol_mm_minus: mmGt.dia_tol_mm_minus || "",
      zing_coating: mmGt.zing_coating || "",
      tensile_st_min: mmGt.tensile_st_min || "",
      tensile_st_max: mmGt.tensile_st_max || "",
      wax: mmGt.wax || "",
      lifting_lugs: mmGt.lifting_lugs || "",
      unwinding: mmGt.unwinding || "",
      cast_kont: mmGt.cast_kont || "",
      helix_kont: mmGt.helix_kont || "",
      elongation: mmGt.elongation || "",
      coil_dimensions_id: mmGt.coil_dimensions_id || "",
      coil_dimensions_od: mmGt.coil_dimensions_od || "",
      coil_weight: mmGt.coil_weight || "",
      coil_weight_min: mmGt.coil_weight_min || "",
      coil_weight_max: mmGt.coil_weight_max || ""
    });
    
    // YM GT sayfasını ekle
    const ymGtSheet = workbook.addWorksheet('YM GT');
    
    // YM GT başlıkları - "All table headers.txt" içindeki YM GT başlıkları ile tam eşleşir
    ymGtSheet.columns = [
      { header: 'Stok Kodu', key: 'stok_kodu', width: 22 },
      { header: 'Stok Adı', key: 'stok_adi', width: 50 },
      { header: 'Grup Kodu', key: 'grup_kodu', width: 12 },
      { header: 'Kod-1', key: 'kod_1', width: 10 },
      { header: 'Kod-2', key: 'kod_2', width: 10 },
      { header: 'Cari/Satıcı Kodu', key: 'cari_satici_kodu', width: 18 },
      { header: 'İngilizce İsim', key: 'ingilizce_isim', width: 50 },
      { header: 'Satıcı İsmi', key: 'satici_ismi', width: 15 },
      { header: 'Muh. Detay', key: 'muh_detay', width: 12 },
      { header: 'Depo Kodu', key: 'depo_kodu', width: 12 },
      { header: 'Br-1', key: 'br_1', width: 10 },
      { header: 'Br-2', key: 'br_2', width: 10 },
      { header: 'Pay-1', key: 'pay_1', width: 10 },
      { header: 'Payda-1', key: 'payda_1', width: 10 },
      { header: 'Çevrim Değeri-1', key: 'cevrim_degeri_1', width: 15 },
      { header: 'Ölçü Br-3', key: 'olcu_br_3', width: 10 },
      { header: 'Çevrim Pay-2', key: 'cevrim_pay_2', width: 15 },
      { header: 'Çevrim Payda-2', key: 'cevrim_payda_2', width: 15 },
      { header: 'Çevrim Değeri-2', key: 'cevrim_degeri_2', width: 15 },
      { header: 'Çap', key: 'cap', width: 10 },
      { header: 'Kaplama', key: 'kaplama', width: 10 },
      { header: 'Min Mukavemet', key: 'min_mukavemet', width: 15 },
      { header: 'Max Mukavemet', key: 'max_mukavemet', width: 15 },
      { header: 'KG', key: 'kg', width: 10 },
      { header: 'İç Çap/Boy Çubuk AD', key: 'ic_cap', width: 20 },
      { header: 'Dış Çap/En Çubuk AD', key: 'dis_cap', width: 20 },
      { header: 'Çap2', key: 'cap2', width: 10 },
      { header: 'Shrink', key: 'shrink', width: 10 },
      { header: 'Tolerans(+)', key: 'tolerans_plus', width: 12 },
      { header: 'Tolerans(-)', key: 'tolerans_minus', width: 12 },
      { header: 'Ebat(En)', key: 'ebat_en', width: 10 },
      { header: 'Göz Aralığı', key: 'goz_araligi', width: 12 },
      { header: 'Ebat(Boy)', key: 'ebat_boy', width: 10 },
      { header: 'Hasır Tipi', key: 'hasir_tipi', width: 12 },
      { header: 'Özel Saha 8 (Alf.)', key: 'ozel_saha_8_alf', width: 20 },
      { header: 'Alış Fiyatı', key: 'alis_fiyati', width: 12 },
      { header: 'Fiyat Birimi', key: 'fiyat_birimi', width: 12 },
      { header: 'Satış Fiyatı-1', key: 'satis_fiyati_1', width: 15 },
      { header: 'Satış Fiyatı-2', key: 'satis_fiyati_2', width: 15 },
      { header: 'Satış Fiyatı-3', key: 'satis_fiyati_3', width: 15 },
      { header: 'Satış Fiyatı-4', key: 'satis_fiyati_4', width: 15 },
      { header: 'Satış Tipi', key: 'satis_tipi', width: 12 },
      { header: 'Döviz Alış', key: 'doviz_alis', width: 12 },
      { header: 'Döviz Maliyeti', key: 'doviz_maliyeti', width: 15 },
      { header: 'Döviz Satış Fiyatı', key: 'doviz_satis_fiyati', width: 18 },
      { header: 'Azami Stok', key: 'azami_stok', width: 12 },
      { header: 'Asgari Stok', key: 'asgari_stok', width: 12 },
      { header: 'Döv.Tutar', key: 'dov_tutar', width: 12 },
      { header: 'Döv.Tipi', key: 'dov_tipi', width: 10 },
      { header: 'Bekleme Süresi', key: 'bekleme_suresi', width: 15 },
      { header: 'Temin Süresi', key: 'temin_suresi', width: 12 },
      { header: 'Birim Ağırlık', key: 'birim_agirlik', width: 12 },
      { header: 'Nakliye Tutar', key: 'nakliye_tutar', width: 12 },
      { header: 'Satış KDV Oranı', key: 'satis_kdv_orani', width: 15 },
      { header: 'Alış KDV Oranı', key: 'alis_kdv_orani', width: 15 },
      { header: 'Stok Türü', key: 'stok_turu', width: 10 },
      { header: 'Mali Grup Kodu', key: 'mali_grup_kodu', width: 15 },
      { header: 'Barkod 1', key: 'barkod_1', width: 12 },
      { header: 'Barkod 2', key: 'barkod_2', width: 12 },
      { header: 'Barkod 3', key: 'barkod_3', width: 12 },
      { header: 'Kod-3', key: 'kod_3', width: 10 },
      { header: 'Kod-4', key: 'kod_4', width: 10 },
      { header: 'Kod-5', key: 'kod_5', width: 10 },
      { header: 'Esnek Yapılandır', key: 'esnek_yapilandir', width: 18 },
      { header: 'Süper Reçete Kullanılsın', key: 'super_recete_kullanilsin', width: 22 },
      { header: 'Bağlı Stok Kodu', key: 'bagli_stok_kodu', width: 18 },
      { header: 'Yapılandırma Kodu', key: 'yapilandirma_kodu', width: 18 },
      { header: 'Yap. Açıklama', key: 'yap_aciklama', width: 15 },
      { header: 'Alış Döviz Tipi', key: 'alis_doviz_tipi', width: 15 },
      { header: 'Gümrük Tarife Kodu', key: 'gumruk_tarife_kodu', width: 18 },
      { header: 'Dağıtıcı Kodu', key: 'dagitici_kodu', width: 15 },
      { header: 'Menşei', key: 'mensei', width: 10 }
    ];
    
    // YM GT verisini ekle
    ymGtSheet.addRow({
      stok_kodu: ymGt.stok_kodu,
      stok_adi: ymGt.stok_adi,
      grup_kodu: ymGt.grup_kodu,
      kod_1: ymGt.kod_1,
      kod_2: ymGt.kod_2,
      cari_satici_kodu: ymGt.cari_satici_kodu || "",
      ingilizce_isim: ymGt.ingilizce_isim || "",
      satici_ismi: ymGt.satici_ismi || "",
      muh_detay: ymGt.muh_detay,
      depo_kodu: ymGt.depo_kodu,
      br_1: ymGt.br_1,
      br_2: ymGt.br_2,
      pay_1: ymGt.pay_1 || 1,
      payda_1: ymGt.payda_1 || 1000,
      cevrim_degeri_1: ymGt.cevrim_degeri_1 || 0.001,
      olcu_br_3: ymGt.olcu_br_3 || "",
      cevrim_pay_2: ymGt.cevrim_pay_2 || 1,
      cevrim_payda_2: ymGt.cevrim_payda_2 || 1,
      cevrim_degeri_2: ymGt.cevrim_degeri_2 || 1,
      cap: ymGt.cap,
      kaplama: ymGt.kaplama,
      min_mukavemet: ymGt.min_mukavemet,
      max_mukavemet: ymGt.max_mukavemet,
      kg: ymGt.kg,
      ic_cap: ymGt.ic_cap,
      dis_cap: ymGt.dis_cap,
      cap2: ymGt.cap2 || "",
      shrink: ymGt.shrink,
      tolerans_plus: ymGt.tolerans_plus,
      tolerans_minus: ymGt.tolerans_minus,
      ebat_en: ymGt.ebat_en || "",
      goz_araligi: ymGt.goz_araligi || "",
      ebat_boy: ymGt.ebat_boy || "",
      hasir_tipi: ymGt.hasir_tipi || "",
      ozel_saha_8_alf: ymGt.ozel_saha_8_alf || "",
      alis_fiyati: ymGt.alis_fiyati || 0,
      fiyat_birimi: ymGt.fiyat_birimi || 1,
      satis_fiyati_1: ymGt.satis_fiyati_1 || 0,
      satis_fiyati_2: ymGt.satis_fiyati_2 || 0,
      satis_fiyati_3: ymGt.satis_fiyati_3 || 0,
      satis_fiyati_4: ymGt.satis_fiyati_4 || 0,
      satis_tipi: ymGt.satis_tipi || 1,
      doviz_alis: ymGt.doviz_alis || 0,
      doviz_maliyeti: ymGt.doviz_maliyeti || 0,
      doviz_satis_fiyati: ymGt.doviz_satis_fiyati || 0,
      azami_stok: ymGt.azami_stok || 0,
      asgari_stok: ymGt.asgari_stok || 0,
      dov_tutar: ymGt.dov_tutar || 0,
      dov_tipi: ymGt.dov_tipi || 0,
      bekleme_suresi: ymGt.bekleme_suresi || 0,
      temin_suresi: ymGt.temin_suresi || 0,
      birim_agirlik: ymGt.birim_agirlik || 0,
      nakliye_tutar: ymGt.nakliye_tutar || 0,
      satis_kdv_orani: ymGt.satis_kdv_orani || "20",
      alis_kdv_orani: ymGt.alis_kdv_orani || "20",
      stok_turu: ymGt.stok_turu || "D",
      mali_grup_kodu: ymGt.mali_grup_kodu || "",
      barkod_1: ymGt.barkod_1 || "",
      barkod_2: ymGt.barkod_2 || "",
      barkod_3: ymGt.barkod_3 || "",
      kod_3: ymGt.kod_3 || "",
      kod_4: ymGt.kod_4 || "",
      kod_5: ymGt.kod_5 || "",
      esnek_yapilandir: ymGt.esnek_yapilandir || "H",
      super_recete_kullanilsin: ymGt.super_recete_kullanilsin || "H",
      bagli_stok_kodu: ymGt.bagli_stok_kodu || "",
      yapilandirma_kodu: ymGt.yapilandirma_kodu || "",
      yap_aciklama: ymGt.yap_aciklama || "",
      alis_doviz_tipi: ymGt.alis_doviz_tipi || "",
      gumruk_tarife_kodu: ymGt.gumruk_tarife_kodu || "",
      dagitici_kodu: ymGt.dagitici_kodu || "",
      mensei: ymGt.mensei || ""
    });
    
    // YM ST sayfasını ekle
    const ymStSheet = workbook.addWorksheet('YM ST');
    
    // YM ST başlıkları - "All table headers.txt" içindeki YM ST başlıkları ile tam eşleşir
    ymStSheet.columns = [
      { header: 'Stok Kodu', key: 'stok_kodu', width: 24 },
      { header: 'Stok Adı', key: 'stok_adi', width: 40 },
      { header: 'Grup Kodu', key: 'grup_kodu', width: 12 },
      { header: 'Kod-1', key: 'kod_1', width: 10 },
      { header: 'Kod-2', key: 'kod_2', width: 10 },
      { header: 'Kod-3', key: 'kod_3', width: 10 },
      { header: 'Satış KDV Oranı', key: 'satis_kdv_orani', width: 15 },
      { header: 'Muh.Detay', key: 'muh_detay', width: 12 },
      { header: 'Depo Kodu', key: 'depo_kodu', width: 12 },
      { header: 'Br-1', key: 'br_1', width: 10 },
      { header: 'Br-2', key: 'br_2', width: 10 },
      { header: 'Pay-1', key: 'pay_1', width: 10 },
      { header: 'Payda-1', key: 'payda_1', width: 10 },
      { header: 'Çevrim Değeri-1', key: 'cevrim_degeri_1', width: 15 },
      { header: 'Ölçü Br-3', key: 'olcu_br_3', width: 10 },
      { header: 'Çevrim Pay-2', key: 'cevrim_pay_2', width: 15 },
      { header: 'Çevrim Payda-2', key: 'cevrim_payda_2', width: 15 },
      { header: 'Çevrim Değeri-2', key: 'cevrim_degeri_2', width: 15 },
      { header: 'Alış Fiyatı', key: 'alis_fiyati', width: 12 },
      { header: 'Fiyat Birimi', key: 'fiyat_birimi', width: 12 },
      { header: 'Satış Fiyatı-1', key: 'satis_fiyati_1', width: 15 },
      { header: 'Satış Fiyatı-2', key: 'satis_fiyati_2', width: 15 },
      { header: 'Satış Fiyatı-3', key: 'satis_fiyati_3', width: 15 },
      { header: 'Satış Fiyatı-4', key: 'satis_fiyati_4', width: 15 },
      { header: 'Döviz Tip', key: 'doviz_tip', width: 12 },
      { header: 'Döviz Alış', key: 'doviz_alis', width: 12 },
      { header: 'Döviz Maliyeti', key: 'doviz_maliyeti', width: 15 },
      { header: 'Döviz Satış Fiyatı', key: 'doviz_satis_fiyati', width: 18 },
      { header: 'Azami Stok', key: 'azami_stok', width: 12 },
      { header: 'Asgari Stok', key: 'asgari_stok', width: 12 },
      { header: 'Döv.Tutar', key: 'dov_tutar', width: 12 },
      { header: 'Döv.Tipi', key: 'dov_tipi', width: 10 },
      { header: 'Alış Döviz Tipi', key: 'alis_doviz_tipi', width: 15 },
      { header: 'Bekleme Süresi', key: 'bekleme_suresi', width: 15 },
      { header: 'Temin Süresi', key: 'temin_suresi', width: 12 },
      { header: 'Birim Ağırlık', key: 'birim_agirlik', width: 12 },
      { header: 'Nakliye Tutar', key: 'nakliye_tutar', width: 12 },
      { header: 'Stok Türü', key: 'stok_turu', width: 10 },
      { header: 'Mali Grup Kodu', key: 'mali_grup_kodu', width: 15 },
      { header: 'İngilizce İsim', key: 'ingilizce_isim', width: 20 },
      { header: 'Özel Saha 1 (Say.)', key: 'ozel_saha_1_say', width: 18 },
      { header: 'Özel Saha 2 (Say.)', key: 'ozel_saha_2_say', width: 18 },
      { header: 'Özel Saha 3 (Say.)', key: 'ozel_saha_3_say', width: 18 },
      { header: 'Özel Saha 4 (Say.)', key: 'ozel_saha_4_say', width: 18 },
      { header: 'Özel Saha 5 (Say.)', key: 'ozel_saha_5_say', width: 18 },
      { header: 'Özel Saha 6 (Say.)', key: 'ozel_saha_6_say', width: 18 },
      { header: 'Özel Saha 7 (Say.)', key: 'ozel_saha_7_say', width: 18 },
      { header: 'Özel Saha 8 (Say.)', key: 'ozel_saha_8_say', width: 18 },
      { header: 'Özel Saha 1 (Alf.)', key: 'ozel_saha_1_alf', width: 18 },
      { header: 'Özel Saha 2 (Alf.)', key: 'ozel_saha_2_alf', width: 18 },
      { header: 'Özel Saha 3 (Alf.)', key: 'ozel_saha_3_alf', width: 18 },
      { header: 'Özel Saha 4 (Alf.)', key: 'ozel_saha_4_alf', width: 18 },
      { header: 'Özel Saha 5 (Alf.)', key: 'ozel_saha_5_alf', width: 18 },
      { header: 'Özel Saha 6 (Alf.)', key: 'ozel_saha_6_alf', width: 18 },
      { header: 'Özel Saha 7 (Alf.)', key: 'ozel_saha_7_alf', width: 18 },
      { header: 'Özel Saha 8 (Alf.)', key: 'ozel_saha_8_alf', width: 18 },
      { header: 'Kod-4', key: 'kod_4', width: 10 },
      { header: 'Kod-5', key: 'kod_5', width: 10 },
      { header: 'Esnek Yapılandır', key: 'esnek_yapilandir', width: 18 },
      { header: 'Süper Reçete Kullanılsın', key: 'super_recete_kullanilsin', width: 22 },
      { header: 'Bağlı Stok Kodu', key: 'bagli_stok_kodu', width: 18 },
      { header: 'Yapılandırma Kodu', key: 'yapilandirma_kodu', width: 18 },
      { header: 'Yap. Açıklama', key: 'yap_aciklama', width: 15 }
    ];
    
    // YM ST verilerini ekle
    ymStList.forEach(ymSt => {
      ymStSheet.addRow({
        stok_kodu: ymSt.stok_kodu,
        stok_adi: ymSt.stok_adi,
        grup_kodu: ymSt.grup_kodu,
        kod_1: ymSt.kod_1,
        kod_2: ymSt.kod_2 || "",
        kod_3: ymSt.kod_3 || "",
        satis_kdv_orani: ymSt.satis_kdv_orani || "20",
        muh_detay: ymSt.muh_detay,
        depo_kodu: ymSt.depo_kodu,
        br_1: ymSt.br_1,
        br_2: ymSt.br_2,
        pay_1: ymSt.pay_1 || 1,
        payda_1: ymSt.payda_1 || 1000,
        cevrim_degeri_1: ymSt.cevrim_degeri_1 || 0.001,
        olcu_br_3: ymSt.olcu_br_3 || "",
        cevrim_pay_2: ymSt.cevrim_pay_2 || 1,
        cevrim_payda_2: ymSt.cevrim_payda_2 || 1,
        cevrim_degeri_2: ymSt.cevrim_degeri_2 || 1,
        alis_fiyati: ymSt.alis_fiyati || 0,
        fiyat_birimi: ymSt.fiyat_birimi || 1,
        satis_fiyati_1: ymSt.satis_fiyati_1 || 0,
        satis_fiyati_2: ymSt.satis_fiyati_2 || 0,
        satis_fiyati_3: ymSt.satis_fiyati_3 || 0,
        satis_fiyati_4: ymSt.satis_fiyati_4 || 0,
        doviz_tip: ymSt.doviz_tip || 1,
        doviz_alis: ymSt.doviz_alis || 0,
        doviz_maliyeti: ymSt.doviz_maliyeti || 0,
        doviz_satis_fiyati: ymSt.doviz_satis_fiyati || 0,
        azami_stok: ymSt.azami_stok || 0,
        asgari_stok: ymSt.asgari_stok || 0,
        dov_tutar: ymSt.dov_tutar || 0,
        dov_tipi: ymSt.dov_tipi || 0,
        alis_doviz_tipi: ymSt.alis_doviz_tipi || 0,
        bekleme_suresi: ymSt.bekleme_suresi || 0,
        temin_suresi: ymSt.temin_suresi || 0,
        birim_agirlik: ymSt.birim_agirlik || 0,
        nakliye_tutar: ymSt.nakliye_tutar || 0,
        stok_turu: ymSt.stok_turu || "D",
        mali_grup_kodu: ymSt.mali_grup_kodu || "",
        ingilizce_isim: ymSt.ingilizce_isim || "",
        ozel_saha_1_say: ymSt.ozel_saha_1_say || 0,
        ozel_saha_2_say: ymSt.ozel_saha_2_say || 0,
        ozel_saha_3_say: ymSt.ozel_saha_3_say || 0,
        ozel_saha_4_say: ymSt.ozel_saha_4_say || 0,
        ozel_saha_5_say: ymSt.ozel_saha_5_say || 0,
        ozel_saha_6_say: ymSt.ozel_saha_6_say || 0,
        ozel_saha_7_say: ymSt.ozel_saha_7_say || 0,
        ozel_saha_8_say: ymSt.ozel_saha_8_say || 0,
        ozel_saha_1_alf: ymSt.ozel_saha_1_alf || "",
        ozel_saha_2_alf: ymSt.ozel_saha_2_alf || "",
        ozel_saha_3_alf: ymSt.ozel_saha_3_alf || "",
        ozel_saha_4_alf: ymSt.ozel_saha_4_alf || "",
        ozel_saha_5_alf: ymSt.ozel_saha_5_alf || "",
        ozel_saha_6_alf: ymSt.ozel_saha_6_alf || "",
        ozel_saha_7_alf: ymSt.ozel_saha_7_alf || "",
        ozel_saha_8_alf: ymSt.ozel_saha_8_alf || "",
        kod_4: ymSt.kod_4 || "",
        kod_5: ymSt.kod_5 || "",
        esnek_yapilandir: ymSt.esnek_yapilandir || "H",
        super_recete_kullanilsin: ymSt.super_recete_kullanilsin || "H",
        bagli_stok_kodu: ymSt.bagli_stok_kodu || "",
        yapilandirma_kodu: ymSt.yapilandirma_kodu || "",
        yap_aciklama: ymSt.yap_aciklama || ""
      });
    });
    
    // Decimal formatını düzelt (UI'da nokta, Excel'de virgül)
    // Decimal alanları düzeltme fonksiyonu
    const formatDecimalCellsWithComma = (sheet) => {
      // Decimal değerlere sahip sütun indeksleri
      const decimalColumns = ['cap', 'tolerans_plus', 'tolerans_minus', 'cevrim_degeri_1'];
      
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 1) { // Başlık satırını atla
          decimalColumns.forEach(colName => {
            const col = sheet.getColumn(colName);
            if (col) {
              const cell = row.getCell(col.number);
              if (typeof cell.value === 'number') {
                cell.value = cell.value.toString().replace('.', ',');
              }
            }
          });
        }
      });
    };
    
    // Her sayfa için decimal formatlarını düzelt
    formatDecimalCellsWithComma(mmGtSheet);
    formatDecimalCellsWithComma(ymGtSheet);
    formatDecimalCellsWithComma(ymStSheet);
    
    // Stil ayarları
    [mmGtSheet, ymGtSheet, ymStSheet].forEach(sheet => {
      // Başlık satırı stilleri
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Kenarlık ekle
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          if (rowNumber > 1) {
            cell.alignment = { vertical: 'middle' };
          }
        });
      });
    });
    
    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `StokKarti_${mmGt.stok_kodu.replace(/\./g, '_')}.xlsx`);
  };

  // Reçete Excel oluşturma fonksiyonu
  const createReceteExcel = async (mmGt, ymGt, ymStList) => {
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook();
    
    // MM GT REÇETE sayfası
    const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');
    
    // MM GT REÇETE başlıkları - "All table headers.txt" içindeki MM GT REÇETE başlıkları ile tam eşleşir
    mmGtReceteSheet.columns = [
      { header: 'Mamul Kodu(*)', key: 'mamul_kodu', width: 22 },
      { header: 'Reçete Top.', key: 'recete_top', width: 12 },
      { header: 'Fire Oranı (%)', key: 'fire_orani', width: 12 },
      { header: 'Oto.Reç.', key: 'oto_rec', width: 10 },
      { header: 'Ölçü Br.', key: 'olcu_br', width: 10 },
      { header: 'Sıra No(*)', key: 'sira_no', width: 10 },
      { header: 'Operasyon Bileşen', key: 'operasyon_bilesen', width: 18 },
      { header: 'Bileşen Kodu(*)', key: 'bilesen_kodu', width: 18 },
      { header: 'Ölçü Br. - Bileşen', key: 'olcu_br_bilesen', width: 18 },
      { header: 'Miktar(*)', key: 'miktar', width: 10 },
      { header: 'Açıklama', key: 'aciklama', width: 35 },
      { header: 'Miktar Sabitle', key: 'miktar_sabitle', width: 15 },
      { header: 'Stok/Maliyet', key: 'stok_maliyet', width: 15 },
      { header: 'Fire Mik.', key: 'fire_mik', width: 10 },
      { header: 'Sabit Fire Mik.', key: 'sabit_fire_mik', width: 15 },
      { header: 'İstasyon Kodu', key: 'istasyon_kodu', width: 15 },
      { header: 'Hazırlık Süresi', key: 'hazirlik_suresi', width: 15 },
      { header: 'Üretim Süresi', key: 'uretim_suresi', width: 15 },
      { header: 'Ü.A.Dahil Edilsin', key: 'ua_dahil_edilsin', width: 18 },
      { header: 'Son Operasyon', key: 'son_operasyon', width: 15 },
      { header: 'Öncelik', key: 'oncelik', width: 10 },
      { header: 'Planlama Oranı', key: 'planlama_orani', width: 15 },
      { header: 'Alternatif Politika - D.A.Transfer Fişi', key: 'alt_pol_da_transfer', width: 30 },
      { header: 'Alternatif Politika - Ambar Ç. Fişi', key: 'alt_pol_ambar_cikis', width: 30 },
      { header: 'Alternatif Politika - Üretim S.Kaydı', key: 'alt_pol_uretim_kaydi', width: 30 },
      { header: 'Alternatif Politika - MRP', key: 'alt_pol_mrp', width: 22 },
      { header: 'İÇ/DIŞ', key: 'ic_dis', width: 10 }
    ];
    
    // MM GT REÇETE verilerini al ve ekle
    const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
    if (mmGtReceteRes.ok) {
      const mmGtReceteData = await mmGtReceteRes.json();
      mmGtReceteData.forEach(item => {
        // Miktar değerlerini string'e çevirip . yerine , kullan
        let miktar = item.miktar;
        if (typeof miktar === 'number') {
          miktar = miktar.toString().replace('.', ',');
        }
        
        let fireOrani = item.fire_orani;
        if (typeof fireOrani === 'number') {
          fireOrani = fireOrani.toString().replace('.', ',');
        }
        
        let uretimSuresi = item.uretim_suresi;
        if (typeof uretimSuresi === 'number') {
          uretimSuresi = uretimSuresi.toString().replace('.', ',');
        }
        
        mmGtReceteSheet.addRow({
          mamul_kodu: item.mamul_kodu,
          recete_top: item.recete_top,
          fire_orani: fireOrani,
          oto_rec: item.oto_rec || "",
          olcu_br: item.olcu_br,
          sira_no: item.sira_no,
          operasyon_bilesen: item.operasyon_bilesen,
          bilesen_kodu: item.bilesen_kodu,
          olcu_br_bilesen: item.olcu_br_bilesen,
          miktar: miktar,
          aciklama: item.aciklama || "",
          miktar_sabitle: item.miktar_sabitle || "",
          stok_maliyet: item.stok_maliyet || "",
          fire_mik: item.fire_mik || "",
          sabit_fire_mik: item.sabit_fire_mik || "",
          istasyon_kodu: item.istasyon_kodu || "",
          hazirlik_suresi: item.hazirlik_suresi || "",
          uretim_suresi: uretimSuresi || "",
          ua_dahil_edilsin: item.ua_dahil_edilsin || "evet",
          son_operasyon: item.son_operasyon || "evet",
          oncelik: item.oncelik || "",
          planlama_orani: item.planlama_orani || "",
          alt_pol_da_transfer: item.alt_pol_da_transfer || "",
          alt_pol_ambar_cikis: item.alt_pol_ambar_cikis || "",
          alt_pol_uretim_kaydi: item.alt_pol_uretim_kaydi || "",
          alt_pol_mrp: item.alt_pol_mrp || "",
          ic_dis: item.ic_dis || ""
        });
      });
    }
    
    // YM GT REÇETE sayfası
    const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');
    
    // YM GT REÇETE başlıkları - "All table headers.txt" içindeki YM GT REÇETE başlıkları ile tam eşleşir
    ymGtReceteSheet.columns = [
      { header: 'Mamul Kodu(*)', key: 'mamul_kodu', width: 22 },
      { header: 'Reçete Top.', key: 'recete_top', width: 12 },
      { header: 'Fire Oranı (%)', key: 'fire_orani', width: 12 },
      { header: 'Oto.Reç.', key: 'oto_rec', width: 10 },
      { header: 'Ölçü Br.', key: 'olcu_br', width: 10 },
      { header: 'Sıra No(*)', key: 'sira_no', width: 10 },
      { header: 'Operasyon Bileşen', key: 'operasyon_bilesen', width: 18 },
      { header: 'Bileşen Kodu(*)', key: 'bilesen_kodu', width: 18 },
      { header: 'Ölçü Br. - Bileşen', key: 'olcu_br_bilesen', width: 18 },
      { header: 'Miktar(*)', key: 'miktar', width: 10 },
      { header: 'Açıklama', key: 'aciklama', width: 35 },
      { header: 'Miktar Sabitle', key: 'miktar_sabitle', width: 15 },
      { header: 'Stok/Maliyet', key: 'stok_maliyet', width: 15 },
      { header: 'Fire Mik.', key: 'fire_mik', width: 10 },
      { header: 'Sabit Fire Mik.', key: 'sabit_fire_mik', width: 15 },
      { header: 'İstasyon Kodu', key: 'istasyon_kodu', width: 15 },
      { header: 'Hazırlık Süresi', key: 'hazirlik_suresi', width: 15 },
      { header: 'Üretim Süresi', key: 'uretim_suresi', width: 15 },
      { header: 'Ü.A.Dahil Edilsin', key: 'ua_dahil_edilsin', width: 18 },
      { header: 'Son Operasyon', key: 'son_operasyon', width: 15 },
      { header: 'Öncelik', key: 'oncelik', width: 10 },
      { header: 'Planlama Oranı', key: 'planlama_orani', width: 15 },
      { header: 'Alternatif Politika - D.A.Transfer Fişi', key: 'alt_pol_da_transfer', width: 30 },
      { header: 'Alternatif Politika - Ambar Ç. Fişi', key: 'alt_pol_ambar_cikis', width: 30 },
      { header: 'Alternatif Politika - Üretim S.Kaydı', key: 'alt_pol_uretim_kaydi', width: 30 },
      { header: 'Alternatif Politika - MRP', key: 'alt_pol_mrp', width: 22 },
      { header: 'İÇ/DIŞ', key: 'ic_dis', width: 10 }
    ];
    
    // YM GT REÇETE verilerini al ve ekle
    const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
    if (ymGtReceteRes.ok) {
      const ymGtReceteData = await ymGtReceteRes.json();
      ymGtReceteData.forEach(item => {
        // Miktar değerlerini string'e çevirip . yerine , kullan
        let miktar = item.miktar;
        if (typeof miktar === 'number') {
          miktar = miktar.toString().replace('.', ',');
        }
        
        let fireOrani = item.fire_orani;
        if (typeof fireOrani === 'number') {
          fireOrani = fireOrani.toString().replace('.', ',');
        }
        
        let uretimSuresi = item.uretim_suresi;
        if (typeof uretimSuresi === 'number') {
          uretimSuresi = uretimSuresi.toString().replace('.', ',');
        }
        
        ymGtReceteSheet.addRow({
          mamul_kodu: item.mamul_kodu,
          recete_top: item.recete_top,
          fire_orani: fireOrani,
          oto_rec: item.oto_rec || "",
          olcu_br: item.olcu_br,
          sira_no: item.sira_no,
          operasyon_bilesen: item.operasyon_bilesen,
          bilesen_kodu: item.bilesen_kodu,
          olcu_br_bilesen: item.olcu_br_bilesen,
          miktar: miktar,
          aciklama: item.aciklama || "",
          miktar_sabitle: item.miktar_sabitle || "",
          stok_maliyet: item.stok_maliyet || "",
          fire_mik: item.fire_mik || "",
          sabit_fire_mik: item.sabit_fire_mik || "",
          istasyon_kodu: item.istasyon_kodu || "",
          hazirlik_suresi: item.hazirlik_suresi || "",
          uretim_suresi: uretimSuresi || "",
          ua_dahil_edilsin: item.ua_dahil_edilsin || "evet",
          son_operasyon: item.son_operasyon || "evet",
          oncelik: item.oncelik || "",
          planlama_orani: item.planlama_orani || "",
          alt_pol_da_transfer: item.alt_pol_da_transfer || "",
          alt_pol_ambar_cikis: item.alt_pol_ambar_cikis || "",
          alt_pol_uretim_kaydi: item.alt_pol_uretim_kaydi || "",
          alt_pol_mrp: item.alt_pol_mrp || "",
          ic_dis: item.ic_dis || ""
        });
      });
    }
    
    // YM ST REÇETE sayfası
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    
    // YM ST REÇETE başlıkları - "All table headers.txt" içindeki YM ST REÇETE başlıkları ile tam eşleşir
    ymStReceteSheet.columns = [
      { header: 'Mamul Kodu(*)', key: 'mamul_kodu', width: 22 },
      { header: 'Reçete Top.', key: 'recete_top', width: 12 },
      { header: 'Fire Oranı (%)', key: 'fire_orani', width: 12 },
      { header: 'Oto.Reç.', key: 'oto_rec', width: 10 },
      { header: 'Ölçü Br.', key: 'olcu_br', width: 10 },
      { header: 'Sıra No(*)', key: 'sira_no', width: 10 },
      { header: 'Operasyon Bileşen', key: 'operasyon_bilesen', width: 18 },
      { header: 'Bileşen Kodu(*)', key: 'bilesen_kodu', width: 18 },
      { header: 'Ölçü Br. - Bileşen', key: 'olcu_br_bilesen', width: 18 },
      { header: 'Miktar(*)', key: 'miktar', width: 10 },
      { header: 'Açıklama', key: 'aciklama', width: 35 },
      { header: 'Miktar Sabitle', key: 'miktar_sabitle', width: 15 },
      { header: 'Stok/Maliyet', key: 'stok_maliyet', width: 15 },
      { header: 'Fire Mik.', key: 'fire_mik', width: 10 },
      { header: 'Sabit Fire Mik.', key: 'sabit_fire_mik', width: 15 },
      { header: 'İstasyon Kodu', key: 'istasyon_kodu', width: 15 },
      { header: 'Hazırlık Süresi', key: 'hazirlik_suresi', width: 15 },
      { header: 'Üretim Süresi', key: 'uretim_suresi', width: 15 },
      { header: 'Ü.A.Dahil Edilsin', key: 'ua_dahil_edilsin', width: 18 },
      { header: 'Son Operasyon', key: 'son_operasyon', width: 15 },
      { header: 'Öncelik', key: 'oncelik', width: 10 },
      { header: 'Planlama Oranı', key: 'planlama_orani', width: 15 },
      { header: 'Alternatif Politika - D.A.Transfer Fişi', key: 'alt_pol_da_transfer', width: 30 },
      { header: 'Alternatif Politika - Ambar Ç. Fişi', key: 'alt_pol_ambar_cikis', width: 30 },
      { header: 'Alternatif Politika - Üretim S.Kaydı', key: 'alt_pol_uretim_kaydi', width: 30 },
      { header: 'Alternatif Politika - MRP', key: 'alt_pol_mrp', width: 22 },
      { header: 'İÇ/DIŞ', key: 'ic_dis', width: 10 }
    ];
    
    // YM ST REÇETE verilerini al ve ekle
    for (const ymSt of ymStList) {
      const ymStReceteRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
      if (ymStReceteRes.ok) {
        const ymStReceteData = await ymStReceteRes.json();
        ymStReceteData.forEach(item => {
          // Miktar değerlerini string'e çevirip . yerine , kullan
          let miktar = item.miktar;
          if (typeof miktar === 'number') {
            miktar = miktar.toString().replace('.', ',');
          }
          
          let fireOrani = item.fire_orani;
          if (typeof fireOrani === 'number') {
            fireOrani = fireOrani.toString().replace('.', ',');
          }
          
          let uretimSuresi = item.uretim_suresi;
          if (typeof uretimSuresi === 'number') {
            uretimSuresi = uretimSuresi.toString().replace('.', ',');
          }
          
          ymStReceteSheet.addRow({
            mamul_kodu: item.mamul_kodu,
            recete_top: item.recete_top,
            fire_orani: fireOrani || "",
            oto_rec: item.oto_rec || "",
            olcu_br: item.olcu_br,
            sira_no: item.sira_no,
            operasyon_bilesen: item.operasyon_bilesen,
            bilesen_kodu: item.bilesen_kodu,
            olcu_br_bilesen: item.olcu_br_bilesen,
            miktar: miktar,
            aciklama: item.aciklama || "",
            miktar_sabitle: item.miktar_sabitle || "",
            stok_maliyet: item.stok_maliyet || "",
            fire_mik: item.fire_mik || "",
            sabit_fire_mik: item.sabit_fire_mik || "",
            istasyon_kodu: item.istasyon_kodu || "",
            hazirlik_suresi: item.hazirlik_suresi || "",
            uretim_suresi: uretimSuresi || "",
            ua_dahil_edilsin: item.ua_dahil_edilsin || "",
            son_operasyon: item.son_operasyon || "",
            oncelik: item.oncelik || "",
            planlama_orani: item.planlama_orani || "",
            alt_pol_da_transfer: item.alt_pol_da_transfer || "",
            alt_pol_ambar_cikis: item.alt_pol_ambar_cikis || "",
            alt_pol_uretim_kaydi: item.alt_pol_uretim_kaydi || "",
            alt_pol_mrp: item.alt_pol_mrp || "",
            ic_dis: item.ic_dis || ""
          });
        });
      }
    }
    
    // Stil ayarları
    [mmGtReceteSheet, ymGtReceteSheet, ymStReceteSheet].forEach(sheet => {
      // Başlık satırı stilleri
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCCCCC' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Kenarlık ekle
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          if (rowNumber > 1) {
            cell.alignment = { vertical: 'middle' };
          }
        });
      });
    });
    
    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Recete_${mmGt.stok_kodu.replace(/\./g, '_')}.xlsx`);
  };

  // Excel oluşturma fonksiyonu
  const generateExcel = async (mmGtId) => {
    setLoading(true);
    setError(null);
    
    try {
      // MM GT verisini al
      const mmGtRes = await fetchWithAuth(`${API_URLS.galMmGt}?id=${mmGtId}`);
      
      if (!mmGtRes.ok) {
        throw new Error('MM GT verisi alınamadı');
      }
      
      const mmGtData = await mmGtRes.json();
      
      if (!mmGtData || mmGtData.length === 0) {
        throw new Error('MM GT bulunamadı');
      }
      
      const mmGt = mmGtData[0];

      // YM GT verisini al
      const ymGtRes = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${mmGtId}`);
      
      if (!ymGtRes.ok) {
        throw new Error('YM GT verisi alınamadı');
      }
      
      const ymGtData = await ymGtRes.json();
      
      if (!ymGtData || ymGtData.length === 0) {
        throw new Error('YM GT bulunamadı');
      }
      
      const ymGt = ymGtData[0];

      // YM ST ilişkilerini al
      const ymStRelRes = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGtId}`);
      
      if (!ymStRelRes.ok) {
        throw new Error('YM ST ilişkileri alınamadı');
      }
      
      const ymStRelData = await ymStRelRes.json();
      
      if (!ymStRelData || ymStRelData.length === 0) {
        throw new Error('İlişkili YM ST bulunamadı');
      }
      
      const ymStIds = ymStRelData.map(rel => rel.ym_st_id);

      // YM ST detaylarını al
      const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?ids=${ymStIds.join(',')}`);
      
      if (!ymStRes.ok) {
        throw new Error('YM ST verileri alınamadı');
      }
      
      const ymStData = await ymStRes.json();
      
      if (!ymStData || ymStData.length === 0) {
        throw new Error('YM ST verileri bulunamadı');
      }

      // Reçete verilerini kontrol et ve gerekirse oluştur
      await checkAndCreateRecipes(mmGt, ymGt, ymStData);

      // Excel dosyalarını oluştur
      await createStokKartiExcel(mmGt, ymGt, ymStData);
      await createReceteExcel(mmGt, ymGt, ymStData);

      setSuccessMessage('Excel dosyaları başarıyla oluşturuldu');
      toast.success('Excel dosyaları başarıyla oluşturuldu');
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      setError('Excel oluşturulurken bir hata oluştu: ' + error.message);
      toast.error('Excel oluşturulurken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Context değerleri objesi
  const contextValue = {
    mmGtData, setMmGtData,
    ymGtData, setYmGtData,
    ymStList, setYmStList,
    selectedYmSt, setSelectedYmSt,
    receteData, setReceteData,
    loading, setLoading,
    error, setError,
    successMessage, setSuccessMessage,
    isEditMode, setIsEditMode,
    dataExist, setDataExist,
    activeTab, setActiveTab,
    productDatabase, setProductDatabase,
    searchProducts,
    saveMMGT,
    saveYMGT,
    saveYMST,
    saveRecete,
    generateExcel,
    getCurrentSequence,
    incrementSequence,
    fetchProductDatabase,
    deleteProduct,
    checkProductExists,
    loadYmStList,
  };


useEffect(() => {
  // baslangıcta calıstır
  console.log("Running API endpoint tests...");
  testApiEndpoints();
  
}, []);

  // İlk yüklemede veritabanını ve YM ST listesini getir
  useEffect(() => {
    fetchProductDatabase();
    loadYmStList();
  }, [fetchProductDatabase, loadYmStList]);

  return (
    <GalvanizliTelContext.Provider value={contextValue}>
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

// Ana Galvanizli Tel bileşeni - Gelişmiş iş akışı
const GalvanizliTelNetsis = () => {
  const { user, hasPermission } = useAuth();
  const {
    mmGtData, setMmGtData,
    ymGtData, setYmGtData,
    ymStList, setYmStList,
    selectedYmSt, setSelectedYmSt,
    receteData, setReceteData,
    loading, setLoading,
    error, setError,
    successMessage, setSuccessMessage,
    isEditMode, setIsEditMode,
    dataExist, setDataExist,
    productDatabase, setProductDatabase,
    searchProducts,
    saveMMGT,
    saveYMGT,
    saveYMST,
    saveRecete,
    generateExcel,
    getCurrentSequence,
    fetchProductDatabase,
    deleteProduct,
    checkProductExists,
    loadYmStList
  } = useGalvanizliTel();

  // State'ler
  const [showYmStSearchModal, setShowYmStSearchModal] = useState(false);
  const [showYmStCreateModal, setShowYmStCreateModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sequence, setSequence] = useState(0);
  const [searchYmSt, setSearchYmSt] = useState("");
  const [filteredYmStList, setFilteredYmStList] = useState([]);
  const [selectedYmStToAdd, setSelectedYmStToAdd] = useState(null);
  const [currentStep, setCurrentStep] = useState('form'); // 'form', 'ymst', 'recete', 'summary'
  const [excelCreated, setExcelCreated] = useState({
    stokKarti: false,
    recete: false
  });
  const [databaseSaved, setDatabaseSaved] = useState(false);
  const [databaseFilter, setDatabaseFilter] = useState({
    type: 'mmGt',
    search: ''
  });
  const [filteredDatabaseItems, setFilteredDatabaseItems] = useState([]);

  // Form değerleri
  const initialFormValues = {
    cap: '',
    kod_2: 'NIT',
    kaplama: 120,
    min_mukavemet: 400,
    max_mukavemet: 500,
    tolerans_plus: 0,
    tolerans_minus: 0.06,
    ic_cap: 45,
    dis_cap: 75,
    kg: 750,
    unwinding: null,
    shrink: 'evet',
    cast_kont: '',
    helix_kont: '',
    elongation: '',
    sequence: 0
  };

  const [formValues, setFormValues] = useState(initialFormValues);

  // Reçete değerleri için initial değerler
  const initialReceteValues = {
    boraks_tuketimi: 0.02, // 0.032 - (0.0029 * Diameter)
    asit_tuketimi: 0.002,  // Çapa göre farklı değer alır
    desi_tuketimi: 0.0013, // Ağırlığa göre farklı değer alır
    paketleme_suresi: 0.02, // Sabit değer
    galvanizleme_suresi: 0.9, // 1.15 - (0.125 * Diameter)
    tel_cekme_suresi: 0.15  // 0.2/(Diameter^1.5)
  };

  const [receteFormValues, setReceteFormValues] = useState(initialReceteValues);

  // İzin kontrolü
  useEffect(() => {
    if (!hasPermission('access:galvanizli-tel')) {
      setError('Bu modüle erişim izniniz bulunmamaktadır.');
    }
  }, [hasPermission]);

  // Veritabanı verilerini filtrele
  useEffect(() => {
    filterDatabaseItems();
  }, [databaseFilter, productDatabase]);

  // filteredYmStList ayarla
  useEffect(() => {
    setFilteredYmStList(ymStList);
  }, [ymStList]);

  // Veritabanı filtrele
  const filterDatabaseItems = () => {
    const { type, search } = databaseFilter;
    const searchTerm = search.toLowerCase();
    
    let filteredData = [];
    
    switch (type) {
      case 'mmGt':
        filteredData = productDatabase.mmGtList.filter(item => 
          !searchTerm || 
          (item.stok_kodu && item.stok_kodu.toLowerCase().includes(searchTerm)) ||
          (item.stok_adi && item.stok_adi.toLowerCase().includes(searchTerm)) ||
          (item.cap && item.cap.toString().includes(searchTerm))
        );
        break;
      case 'ymGt':
        filteredData = productDatabase.ymGtList.filter(item => 
          !searchTerm || 
          (item.stok_kodu && item.stok_kodu.toLowerCase().includes(searchTerm)) ||
          (item.stok_adi && item.stok_adi.toLowerCase().includes(searchTerm)) ||
          (item.cap && item.cap.toString().includes(searchTerm))
        );
        break;
      case 'ymSt':
        filteredData = productDatabase.ymStList.filter(item => 
          !searchTerm || 
          (item.stok_kodu && item.stok_kodu.toLowerCase().includes(searchTerm)) ||
          (item.stok_adi && item.stok_adi.toLowerCase().includes(searchTerm)) ||
          (item.cap && item.cap.toString().includes(searchTerm))
        );
        break;
      default:
        filteredData = [];
    }
    
    setFilteredDatabaseItems(filteredData);
  };

  // Dizilim numarasını al
  const fetchSequence = async (kod2, cap) => {
    try {
      const seq = await getCurrentSequence(kod2, cap);
      setSequence(seq);
      setFormValues(prev => ({ ...prev, sequence: seq }));
    } catch (error) {
      console.warn('Sıra numarası alınamadı, varsayılan 0 kullanılıyor', error);
      setSequence(0);
      setFormValues(prev => ({ ...prev, sequence: 0 }));
    }
  };

  // Form değerlerini güncelle
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === 'kod_2' && value === 'PAD' ? { ...formValues, kaplama: 50 } : {};
    
    // İç çap değişirse dış çapı otomatik ayarla
    if (name === 'ic_cap') {
      const icCap = parseInt(value);
      let disCap = 75;
      
      if (icCap === 50) disCap = 90;
      else if (icCap === 55) disCap = 105;
      
      newValue.dis_cap = disCap;
    }

    setFormValues({ ...formValues, ...newValue, [name]: value });
    
    // Kaplama türü ve çap değişirse dizilim numarasını güncelle
    if (name === 'kod_2' || name === 'cap') {
      if (formValues.kod_2 && formValues.cap) {
        fetchSequence(
          name === 'kod_2' ? value : formValues.kod_2, 
          name === 'cap' ? value : formValues.cap
        );
      }
    }
    
    // Çap değişirse reçete değerlerini otomatik güncelle
    if (name === 'cap' && value) {
      const capValue = parseFloat(value);
      if (!isNaN(capValue)) {
        // Boraks değeri: 0.032 - (0.0029 * Diameter)
        const boraksTuketimi = Math.max(0.001, 0.032 - (0.0029 * capValue)).toFixed(6);
        
        // Asit değeri
        let asitTuketimi;
        if (formValues.kod_2 === 'NIT') {
          // NIT için değer
          if (capValue < 1.5) {
            asitTuketimi = 0.002;
          } else if (capValue >= 1.5 && capValue < 2.5) {
            asitTuketimi = 0.0025;
          } else {
            asitTuketimi = 0.003;
          }
        } else {
          // PAD için değer
          if (capValue < 1.5) {
            asitTuketimi = 0.001;
          } else if (capValue >= 1.5 && capValue < 2.5) {
            asitTuketimi = 0.0015;
          } else {
            asitTuketimi = 0.002;
          }
        }
        
        // Galvanizleme süresi: 1.15 - (0.125 * Diameter)
        const galvanizlemeSuresi = Math.max(0.001, 1.15 - (0.125 * capValue)).toFixed(6);
        
        // Tel çekme süresi: 0.2/(Diameter^1.5)
        const telCekmeSuresi = (0.2 / Math.pow(capValue, 1.5)).toFixed(6);
        
        setReceteFormValues(prev => ({
          ...prev,
          boraks_tuketimi: parseFloat(boraksTuketimi),
          asit_tuketimi: asitTuketimi,
          galvanizleme_suresi: parseFloat(galvanizlemeSuresi),
          tel_cekme_suresi: parseFloat(telCekmeSuresi)
        }));
      }
    }
    
    // Ağırlık değişirse desi değerini güncelle
    if (name === 'kg' && value) {
      const kgValue = parseFloat(value);
      if (!isNaN(kgValue)) {
        // Desi değeri
        const desiTuketimi = kgValue > 800 ? 0.002 : 0.0013;
        
        setReceteFormValues(prev => ({
          ...prev,
          desi_tuketimi: desiTuketimi
        }));
      }
    }
  };

  // Reçete form değerlerini güncelle
  const handleReceteInputChange = (e) => {
    const { name, value } = e.target;
    setReceteFormValues({ ...receteFormValues, [name]: parseFloat(value) });
  };

// Bu fonksiyon form gönderildiğinde çalışır (MM GT oluştur/güncelle ve sonraki adıma geç)
const handleSubmit = async (values) => {
  console.log('Form değerleri:', values);
  try {
    // MM GT kaydet
    const savedMmGt = await saveMMGT(values);
    
    if (savedMmGt) {
      console.log('MM GT kaydedildi, YM GT kaydediliyor...');
      
      // YM GT kaydet
      const savedYmGt = await saveYMGT(values, savedMmGt.id);
      
      if (savedYmGt) {
        console.log('YM GT kaydedildi, YM ST seçim adımına geçiliyor');
        setIsEditMode(true);
        setCurrentStep('ymst'); // YM ST seçim adımına geç
      } else {
        setError('YM GT kaydedilemedi. Lütfen tekrar deneyin.');
        console.error('YM GT kaydedilemedi');
      }
    } else {
      setError('MM GT kaydedilemedi. Lütfen tekrar deneyin.');
      console.error('MM GT kaydedilemedi');
    }
  } catch (error) {
    console.error('Form gönderimi hatası:', error);
    setError('Form gönderilirken bir hata oluştu: ' + error.message);
    toast.error('Form gönderilirken bir hata oluştu: ' + error.message);
  }
};

  // YM ST filtrele
  const handleYmStSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    setSearchYmSt(searchTerm);
    
    if (searchTerm.trim() === '') {
      setFilteredYmStList(ymStList);
    } else {
      const filtered = ymStList.filter(item => 
        (item.stok_kodu && item.stok_kodu.toLowerCase().includes(searchTerm)) ||
        (item.stok_adi && item.stok_adi.toLowerCase().includes(searchTerm)) ||
        (item.cap && item.cap.toString().includes(searchTerm)) ||
        (item.filmasin && item.filmasin.toString().includes(searchTerm))
      );
      setFilteredYmStList(filtered);
    }
  };

  // YM ST seç
  const handleSelectYmSt = (ymSt) => {
    // Zaten seçili olan öğeye tekrar tıklanırsa seçimi kaldır
    if (selectedYmStToAdd && selectedYmStToAdd.id === ymSt.id) {
      setSelectedYmStToAdd(null);
    } else {
      setSelectedYmStToAdd(ymSt);
    }
  };

  // YM ST ekle
  const handleAddYmSt = async () => {
    if (!mmGtData) {
      setError('Önce MM GT kaydı oluşturmalısınız');
      return;
    }
    
    if (selectedYmStToAdd) {
      // Zaten eklenmiş mi kontrol et
      const alreadyAdded = selectedYmSt.some(item => item.id === selectedYmStToAdd.id);
      
      if (alreadyAdded) {
        toast.warning('Bu YM ST zaten eklenmiş');
        return;
      }
      
      const result = await saveYMST(selectedYmStToAdd, mmGtData.id);
      if (result) {
        setShowYmStSearchModal(false);
        setSelectedYmStToAdd(null);
        setSearchYmSt("");
      }
    } else {
      setError('Lütfen bir YM ST seçin');
    }
  };

// Bu fonksiyon YM ST ilişkisini kaldırır
const handleRemoveYmSt = async (ymStId) => {
  try {
    // İlişki tablosundaki kaydın ID'sini bul
    const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGtData.id}&ym_st_id=${ymStId}`);
    
    if (!relationResponse.ok) {
      throw new Error('YM ST ilişkisi bulunamadı');
    }
    
    const relations = await relationResponse.json();
    
    if (!relations || !Array.isArray(relations) || relations.length === 0) {
      throw new Error('YM ST ilişkisi bulunamadı');
    }
    
    // İlişki ID'sini kullanarak silme işlemi yap - sorgu parametresi kullan
    const relationId = relations[0].id;
    const response = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?id=${relationId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('YM ST ilişkisi silinemedi');
    }

    setSelectedYmSt(prev => prev.filter(item => item.id !== ymStId));
    setSuccessMessage('YM ST başarıyla kaldırıldı');
    toast.success('YM ST başarıyla kaldırıldı');
  } catch (error) {
    console.error('YM ST kaldırma hatası:', error);
    setError('YM ST kaldırılırken bir hata oluştu: ' + error.message);
    toast.error('YM ST kaldırılırken bir hata oluştu: ' + error.message);
  }
};

  // Yeni YM ST oluştur
  const handleCreateYmSt = async (values) => {
    if (!mmGtData) {
      setError('Önce MM GT kaydı oluşturmalısınız');
      return;
    }
    
    const ymStData = {
      ...values,
      isNew: true
    };
    
    const result = await saveYMST(ymStData, mmGtData.id);
    if (result) {
      setShowYmStCreateModal(false);
      await loadYmStList();
    }
  };

  // Ürün ara
  const handleSearch = async (values) => {
    await searchProducts(values);
    setShowSearchModal(false);
    
    // Eğer ürün bulunduysa form değerlerini güncelle
    if (mmGtData) {
      setFormValues({
        cap: mmGtData.cap || '',
        kod_2: mmGtData.kod_2 || 'NIT',
        kaplama: mmGtData.kaplama || 120,
        min_mukavemet: mmGtData.min_mukavemet || 400,
        max_mukavemet: mmGtData.max_mukavemet || 500,
        tolerans_plus: mmGtData.tolerans_plus || 0,
        tolerans_minus: mmGtData.tolerans_minus || 0.06,
        ic_cap: mmGtData.ic_cap || 45,
        dis_cap: mmGtData.dis_cap || 75,
        kg: mmGtData.kg || 750,
        unwinding: mmGtData.unwinding || null,
        shrink: mmGtData.shrink || 'evet',
        cast_kont: mmGtData.cast_kont || '',
        helix_kont: mmGtData.helix_kont || '',
        elongation: mmGtData.elongation || '',
        sequence: sequence
      });
      
      // Reçete verilerini de güncelle
      if (receteData) {
        setReceteFormValues({
          boraks_tuketimi: receteData.boraks_tuketimi || initialReceteValues.boraks_tuketimi,
          asit_tuketimi: receteData.asit_tuketimi || initialReceteValues.asit_tuketimi,
          desi_tuketimi: receteData.desi_tuketimi || initialReceteValues.desi_tuketimi,
          paketleme_suresi: receteData.paketleme_suresi || initialReceteValues.paketleme_suresi,
          galvanizleme_suresi: receteData.galvanizleme_suresi || initialReceteValues.galvanizleme_suresi,
          tel_cekme_suresi: receteData.tel_cekme_suresi || initialReceteValues.tel_cekme_suresi
        });
      }
    }
  };

  // Ürün temizle
  const handleNewProduct = () => {
    setMmGtData(null);
    setYmGtData(null);
    setSelectedYmSt([]);
    setReceteData(null);
    setIsEditMode(false);
    setDataExist(false);
    setCurrentStep('form');
    setFormValues(initialFormValues);
    setReceteFormValues(initialReceteValues);
    setExcelCreated({
      stokKarti: false,
      recete: false
    });
    setDatabaseSaved(false);
  };

  // YM ST seçimini tamamla ve reçete adımına geç
  const handleYmStSelectionComplete = () => {
    if (selectedYmSt.length === 0) {
      setError('Lütfen en az bir YM ST seçin');
      toast.error('Lütfen en az bir YM ST seçin');
      return;
    }
    
    setCurrentStep('recete');
  };

  // Reçete tamamla ve özet adımına geç
  const handleReceteComplete = async (values) => {
    if (!mmGtData || !ymGtData) {
      setError('Ürün bilgileri eksik. Lütfen baştan başlayın.');
      return;
    }
    
    // Reçete verilerini kaydet
    const result = await saveRecete(values, mmGtData.id, ymGtData.id);
    
    if (result) {
      setCurrentStep('summary');
    } else {
      setError('Reçete verileri kaydedilemedi. Lütfen tekrar deneyin.');
    }
  };

  // Veritabanına kaydet
  const handleSaveToDatabase = async () => {
    try {
      setLoading(true);
      
      // Veritabanı kaydetme işlemleri
      if (!isEditMode) {
        const savedMmGt = await saveMMGT(formValues);
        if (savedMmGt) {
          const savedYmGt = await saveYMGT(formValues, savedMmGt.id);
          if (savedYmGt) {
            for (const ymSt of selectedYmSt) {
              await saveYMST(ymSt, savedMmGt.id);
            }
            await saveRecete(receteFormValues, savedMmGt.id, savedYmGt.id);
          }
        }
      }
      
      setDatabaseSaved(true);
      toast.success('Veriler başarıyla veritabanına kaydedildi');
    } catch (error) {
      toast.error('Veritabanına kayıt sırasında hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Excel oluştur
  const handleCreateExcelOnly = async (type) => {
    if (!mmGtData) {
      setError('Excel oluşturmak için önce MM GT kaydı oluşturmalısınız');
      toast.error('Excel oluşturmak için önce MM GT kaydı oluşturmalısınız');
      return;
    }
    
    if (selectedYmSt.length === 0) {
      setError('Excel oluşturmak için en az bir YM ST kaydı gereklidir');
      toast.error('Excel oluşturmak için en az bir YM ST kaydı gereklidir');
      return;
    }
    
    setLoading(true);
    
    try {
      if (type === 'stokKarti' || type === 'both') {
        // Stok Kartı Excel oluştur
        await createStokKartiExcel(mmGtData, ymGtData, selectedYmSt);
        setExcelCreated(prev => ({ ...prev, stokKarti: true }));
        toast.success('Stok Kartı Excel dosyası başarıyla oluşturuldu');
      }
      
      if (type === 'recete' || type === 'both') {
        // Reçete Excel oluştur
        await createReceteExcel(mmGtData, ymGtData, selectedYmSt);
        setExcelCreated(prev => ({ ...prev, recete: true }));
        toast.success('Reçete Excel dosyası başarıyla oluşturuldu');
      }
    } catch (error) {
      toast.error('Excel oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Hem veritabanına kaydet hem de Excel oluştur
  const handleSaveAndCreateExcel = async (type) => {
    await handleSaveToDatabase();
    await handleCreateExcelOnly(type);
  };

  // Düzenleme moduna dön
  const handleEditProduct = () => {
    setCurrentStep('form');
  };

  // İptal et
  const handleCancel = () => {
    // Düzenleme yapıldıysa kullanıcıya sor
    if (isEditMode || mmGtData) {
      if (window.confirm('Değişiklikler kaydedilmeyecek. Devam etmek istiyor musunuz?')) {
        handleNewProduct();
      }
    } else {
      handleNewProduct();
    }
  };

// Veritabanından ürün seçme - daha basit ve güvenilir
const handleSelectDatabaseItem = async (item) => {
  try {
    setLoading(true);
    setShowDatabaseModal(false);
    
    // Ürün bilgilerini getir
    if (item.stok_kodu) {
      await searchProducts({ stok_kodu: item.stok_kodu });
    }
  } catch (error) {
    console.error('Ürün seçme hatası:', error);
    toast.error("Ürün yüklenirken bir hata oluştu");
  } finally {
    setLoading(false);
  }
};

  // Veritabanı ürününü sil
  const handleDeleteDatabaseItem = async (type, id) => {
    if (window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      const result = await deleteProduct(type, id);
      if (result) {
        await fetchProductDatabase();
      }
    }
  };

  // Stok kodu formatını göster
  const getFormattedStokKodu = () => {
    if (!formValues.kod_2 || !formValues.cap) return 'Oluşturulacak';
    
    const capValue = parseFloat(formValues.cap);
    const formattedCap = capValue.toFixed(2).replace('.', '').padStart(4, '0');
    const formattedSequence = sequence.toString().padStart(2, '0');
    
    return `GT.${formValues.kod_2}.${formattedCap}.${formattedSequence}`;
  };

  if (error && error === 'YM ST listesi yüklenirken bir hata oluştu') {
    return (
      <div className="flex flex-col items-center justify-center p-4 mt-6 rounded-md bg-red-50 text-red-800">
        <div className="mb-4">
          YM ST listesi yüklenirken bir hata oluştu
        </div>
        <button 
          onClick={loadYmStList}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!hasPermission('access:galvanizli-tel')) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-800 text-center">
        Bu modüle erişim izniniz bulunmamaktadır.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {error && (
        <div className="flex justify-between items-center mb-4 p-3 rounded-md bg-red-50 text-red-800">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="flex justify-between items-center mb-4 p-3 rounded-md bg-green-50 text-green-800">
          <span>{successMessage}</span>
          <button 
            onClick={() => setSuccessMessage('')} 
            className="ml-2 text-green-600 hover:text-green-800"
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="mb-6 bg-gray-100 p-4 rounded-md shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-700">Galvanizli Tel Netsis Entegrasyonu</h2>
          <div>
            <button
              onClick={() => setShowDatabaseModal(true)}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Veritabanı
            </button>
          </div>
        </div>
      </div>
      
      {/* Adımlar Gösterimi */}
      <div className="mb-6 flex items-center">
        <div className={`flex-1 pb-2 ${currentStep === 'form' ? 'border-b-2 border-red-600 text-red-600 font-medium' : 'border-b text-gray-500'}`}>
          1. Ürün Bilgileri
        </div>
        <div className="mx-2 text-gray-400">→</div>
        <div className={`flex-1 pb-2 ${currentStep === 'ymst' ? 'border-b-2 border-red-600 text-red-600 font-medium' : 'border-b text-gray-500'}`}>
          2. Hammadde Seçimi
        </div>
        <div className="mx-2 text-gray-400">→</div>
        <div className={`flex-1 pb-2 ${currentStep === 'recete' ? 'border-b-2 border-red-600 text-red-600 font-medium' : 'border-b text-gray-500'}`}>
          3. Reçete Bilgileri
        </div>
        <div className="mx-2 text-gray-400">→</div>
        <div className={`flex-1 pb-2 ${currentStep === 'summary' ? 'border-b-2 border-red-600 text-red-600 font-medium' : 'border-b text-gray-500'}`}>
          4. Özet ve İşlemler
        </div>
      </div>
      
      {/* Adım 1: Ürün Bilgileri Formu */}
      {currentStep === 'form' && (
        <div className="bg-white rounded-md shadow-sm p-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">MM GT Ürün Özellikleri</h3>
          
          <Formik
            initialValues={formValues}
            validationSchema={mmGtValidationSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
              <Form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Çap */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Çap (mm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="cap"
                      value={values.cap}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      step="0.01"
                      placeholder="2.50"
                      className={`w-full p-2 border rounded-md ${
                        errors.cap && touched.cap ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.cap && touched.cap && (
                      <div className="text-red-500 text-xs mt-1">{errors.cap}</div>
                    )}
                  </div>
                  
                  {/* Kaplama Türü */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Kaplama Türü <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="kod_2"
                      value={values.kod_2}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      className={`w-full p-2 border rounded-md ${
                        errors.kod_2 && touched.kod_2 ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="NIT">NIT</option>
                      <option value="PAD">PAD</option>
                    </select>
                    {errors.kod_2 && touched.kod_2 && (
                      <div className="text-red-500 text-xs mt-1">{errors.kod_2}</div>
                    )}
                  </div>
                  
                  {/* Kaplama */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Kaplama (gr/m²) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="kaplama"
                      value={values.kaplama}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      disabled={values.kod_2 === 'PAD'}
                      className={`w-full p-2 border rounded-md ${
                        errors.kaplama && touched.kaplama ? "border-red-500" : "border-gray-300"
                      } ${values.kod_2 === 'PAD' ? "bg-gray-100" : ""}`}
                    />
                    {errors.kaplama && touched.kaplama && (
                      <div className="text-red-500 text-xs mt-1">{errors.kaplama}</div>
                    )}
                  </div>
                  
                  {/* Min Mukavemet */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Min Mukavemet (MPa) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="min_mukavemet"
                      value={values.min_mukavemet}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      className={`w-full p-2 border rounded-md ${
                        errors.min_mukavemet && touched.min_mukavemet ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.min_mukavemet && touched.min_mukavemet && (
                      <div className="text-red-500 text-xs mt-1">{errors.min_mukavemet}</div>
                    )}
                  </div>
                  
                  {/* Max Mukavemet */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Max Mukavemet (MPa) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="max_mukavemet"
                      value={values.max_mukavemet}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      className={`w-full p-2 border rounded-md ${
                        errors.max_mukavemet && touched.max_mukavemet ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.max_mukavemet && touched.max_mukavemet && (
                      <div className="text-red-500 text-xs mt-1">{errors.max_mukavemet}</div>
                    )}
                  </div>
                  
                  {/* Tolerans (+) */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Tolerans (+) (mm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="tolerans_plus"
                      value={values.tolerans_plus}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      step="0.01"
                      className={`w-full p-2 border rounded-md ${
                        errors.tolerans_plus && touched.tolerans_plus ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.tolerans_plus && touched.tolerans_plus && (
                      <div className="text-red-500 text-xs mt-1">{errors.tolerans_plus}</div>
                    )}
                  </div>
                  
                  {/* Tolerans (-) */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Tolerans (-) (mm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="tolerans_minus"
                      value={values.tolerans_minus}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      step="0.01"
                      className={`w-full p-2 border rounded-md ${
                        errors.tolerans_minus && touched.tolerans_minus ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.tolerans_minus && touched.tolerans_minus && (
                      <div className="text-red-500 text-xs mt-1">{errors.tolerans_minus}</div>
                    )}
                  </div>
                  
                  {/* İç Çap */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      İç Çap (cm) <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="ic_cap"
                      value={values.ic_cap}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="45">45</option>
                      <option value="50">50</option>
                      <option value="55">55</option>
                    </select>
                  </div>
                  
                  {/* Dış Çap */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Dış Çap (cm)
                    </label>
                    <input
                      type="number"
                      name="dis_cap"
                      value={values.dis_cap}
                      readOnly
                      className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                    />
                  </div>
                  
                  {/* Ağırlık */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Ağırlık (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="kg"
                      value={values.kg}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      className={`w-full p-2 border rounded-md ${
                        errors.kg && touched.kg ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.kg && touched.kg && (
                      <div className="text-red-500 text-xs mt-1">{errors.kg}</div>
                    )}
                  </div>
                  
                  {/* Sarım Yönü */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Sarım Yönü
                    </label>
                    <select
                      name="unwinding"
                      value={values.unwinding || ""}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Anti-Clockwise (Varsayılan)</option>
                      <option value="Clockwise">Clockwise</option>
                    </select>
                  </div>
                  
                  {/* Shrink */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Shrink
                    </label>
                    <select
                      name="shrink"
                      value={values.shrink}
                      onChange={(e) => {
                        handleChange(e);
                        handleInputChange(e);
                      }}
                      onBlur={handleBlur}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="evet">Evet</option>
                      <option value="hayır">Hayır</option>
                    </select>
                  </div>
                </div>
                
                {/* İsteğe Bağlı Alanlar */}
                <div className="mt-6 border-t pt-6">
                  <h4 className="text-md font-medium mb-4 text-gray-700">İsteğe Bağlı Alanlar</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        CAST KONT
                      </label>
                      <input
                        type="text"
                        name="cast_kont"
                        value={values.cast_kont}
                        onChange={(e) => {
                          handleChange(e);
                          handleInputChange(e);
                        }}
                        onBlur={handleBlur}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        HELIX KONT
                      </label>
                      <input
                        type="text"
                        name="helix_kont"
                        value={values.helix_kont}
                        onChange={(e) => {
                          handleChange(e);
                          handleInputChange(e);
                        }}
                        onBlur={handleBlur}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        ELONGATION
                      </label>
                      <input
                        type="text"
                        name="elongation"
                        value={values.elongation}
                        onChange={(e) => {
                          handleChange(e);
                          handleInputChange(e);
                        }}
                        onBlur={handleBlur}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-8 pt-4 border-t">
                  <div>
                    <span className="text-gray-700 font-medium">Stok Kodu: </span>
                    <span className="font-bold text-gray-800">{getFormattedStokKodu()}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button" 
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      İptal
                    </button>
                    
                    <button 
                      type="submit"
                      disabled={isSubmitting || loading}
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
                    >
                      {loading ? 'İşleniyor...' : isEditMode ? 'Güncelle' : 'Oluştur'}
                    </button>
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}
      
      {/* Adım 2: YM ST Seçimi */}
      {currentStep === 'ymst' && (
        <div className="bg-white rounded-md shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-700">Hammadde Seçimi (YM ST)</h3>
            <button 
              onClick={() => setShowYmStSearchModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Hammadde Ekle
            </button>
          </div>
          
          {selectedYmSt.length === 0 ? (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
              Henüz hammadde seçilmemiş. En az bir YM ST kaydı eklemelisiniz.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Adı</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çap</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filmaşin</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalite</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedYmSt.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.stok_kodu}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.stok_adi}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.cap?.toString().replace('.', ',')}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.filmasin}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.quality}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <button 
                          onClick={() => handleRemoveYmSt(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Kaldır
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="flex justify-between mt-8 pt-4 border-t">
            <button 
              onClick={() => setCurrentStep('form')}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Geri
            </button>
            <button 
              onClick={handleYmStSelectionComplete}
              disabled={selectedYmSt.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              Devam Et
            </button>
          </div>
        </div>
      )}
      
      {/* Adım 3: Reçete Bilgileri */}
      {currentStep === 'recete' && (
        <div className="bg-white rounded-md shadow-sm p-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">Reçete Bilgileri</h3>
          
          <Formik
            initialValues={receteFormValues}
            validationSchema={receteValidationSchema}
            onSubmit={handleReceteComplete}
            enableReinitialize={true}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
              <Form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Boraks Tüketimi */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Boraks Tüketimi (150 03) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="boraks_tuketimi"
                      value={values.boraks_tuketimi}
                      onChange={(e) => {
                        handleChange(e);
                        handleReceteInputChange(e);
                      }}
                      onBlur={handleBlur}
                      step="0.000001"
                      className={`w-full p-2 border rounded-md ${
                        errors.boraks_tuketimi && touched.boraks_tuketimi ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Önerilen: {(0.032 - (0.0029 * parseFloat(formValues.cap))).toFixed(6)}
                    </div>
                    {errors.boraks_tuketimi && touched.boraks_tuketimi && (
                      <div className="text-red-500 text-xs mt-1">{errors.boraks_tuketimi}</div>
                    )}
                  </div>
                  
                  {/* Asit Tüketimi */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Asit Tüketimi (SM.HİDROLİK.ASİT) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="asit_tuketimi"
                      value={values.asit_tuketimi}
                      onChange={(e) => {
                        handleChange(e);
                        handleReceteInputChange(e);
                      }}
                      onBlur={handleBlur}
                      step="0.0001"
                      className={`w-full p-2 border rounded-md ${
                        errors.asit_tuketimi && touched.asit_tuketimi ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {formValues.kod_2 === 'NIT' ? (
                      <div className="text-xs text-gray-500 mt-1">
                        Önerilen: {
                          parseFloat(formValues.cap) < 1.5 ? "0.002" :
                          parseFloat(formValues.cap) < 2.5 ? "0.0025" : "0.003"
                        }
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 mt-1">
                        Önerilen: {
                          parseFloat(formValues.cap) < 1.5 ? "0.001" :
                          parseFloat(formValues.cap) < 2.5 ? "0.0015" : "0.002"
                        }
                      </div>
                    )}
                    {errors.asit_tuketimi && touched.asit_tuketimi && (
                      <div className="text-red-500 text-xs mt-1">{errors.asit_tuketimi}</div>
                    )}
                  </div>
                  
                  {/* Desi Tüketimi */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Desi Tüketimi (SM.DESİ.PAK) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="desi_tuketimi"
                      value={values.desi_tuketimi}
                      onChange={(e) => {
                        handleChange(e);
                        handleReceteInputChange(e);
                      }}
                      onBlur={handleBlur}
                      step="0.0001"
                      className={`w-full p-2 border rounded-md ${
                        errors.desi_tuketimi && touched.desi_tuketimi ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Önerilen: {parseInt(formValues.kg) > 800 ? "0.002" : "0.0013"}
                    </div>
                    {errors.desi_tuketimi && touched.desi_tuketimi && (
                      <div className="text-red-500 text-xs mt-1">{errors.desi_tuketimi}</div>
                    )}
                  </div>
                  
                  {/* Paketleme Süresi */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Paketleme Süresi (GTPKT01) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="paketleme_suresi"
                      value={values.paketleme_suresi}
                      onChange={(e) => {
                        handleChange(e);
                        handleReceteInputChange(e);
                      }}
                      onBlur={handleBlur}
                      step="0.001"
                      className={`w-full p-2 border rounded-md ${
                        errors.paketleme_suresi && touched.paketleme_suresi ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Önerilen: 0.020
                    </div>
                    {errors.paketleme_suresi && touched.paketleme_suresi && (
                      <div className="text-red-500 text-xs mt-1">{errors.paketleme_suresi}</div>
                    )}
                  </div>
                  
                  {/* Galvanizleme Süresi */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Galvanizleme Süresi (GLV01) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="galvanizleme_suresi"
                      value={values.galvanizleme_suresi}
                      onChange={(e) => {
                        handleChange(e);
                        handleReceteInputChange(e);
                      }}
                      onBlur={handleBlur}
                      step="0.000001"
                      className={`w-full p-2 border rounded-md ${
                        errors.galvanizleme_suresi && touched.galvanizleme_suresi ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Önerilen: {Math.max(0.001, 1.15 - (0.125 * parseFloat(formValues.cap))).toFixed(6)}
                    </div>
                    {errors.galvanizleme_suresi && touched.galvanizleme_suresi && (
                      <div className="text-red-500 text-xs mt-1">{errors.galvanizleme_suresi}</div>
                    )}
                  </div>
                  
                  {/* Tel Çekme Süresi */}
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-medium mb-2">
                      Tel Çekme Süresi (TLC01) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="tel_cekme_suresi"
                      value={values.tel_cekme_suresi}
                      onChange={(e) => {
                        handleChange(e);
                        handleReceteInputChange(e);
                      }}
                      onBlur={handleBlur}
                      step="0.000001"
                      className={`w-full p-2 border rounded-md ${
                        errors.tel_cekme_suresi && touched.tel_cekme_suresi ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Önerilen: {(0.2 / Math.pow(parseFloat(formValues.cap), 1.5)).toFixed(6)}
                    </div>
                    {errors.tel_cekme_suresi && touched.tel_cekme_suresi && (
                      <div className="text-red-500 text-xs mt-1">{errors.tel_cekme_suresi}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between mt-8 pt-4 border-t">
                  <button 
                    onClick={() => setCurrentStep('ymst')}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Geri
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'İşleniyor...' : 'Devam Et'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}
      
      {/* Adım 4: Özet ve İşlem Seçenekleri */}
      {currentStep === 'summary' && (
        <div className="bg-white rounded-md shadow-sm p-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">İşlem Özeti</h3>
          
          <div className="p-4 bg-gray-50 rounded-md mb-6">
            <div className="mb-2">
              <span className="font-medium">MM GT Stok Kodu:</span> {mmGtData?.stok_kodu}
            </div>
            <div className="mb-2">
              <span className="font-medium">MM GT Stok Adı:</span> {mmGtData?.stok_adi}
            </div>
            <div className="mb-2">
              <span className="font-medium">YM GT Stok Kodu:</span> {ymGtData?.stok_kodu}
            </div>
            <div className="mb-2">
              <span className="font-medium">Seçilen YM ST Sayısı:</span> {selectedYmSt.length}
            </div>
            <div className="mb-2">
              <span className="font-medium">Reçete:</span> Tamamlandı
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stok Kartı Excel Bölümü */}
            <div className="border p-4 rounded-md">
              <h4 className="font-medium text-gray-700 mb-3">Stok Kartı Excel</h4>
              <p className="text-sm text-gray-600 mb-4">
                MM GT, YM GT ve YM ST bilgilerini içeren Excel dosyası
              </p>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleCreateExcelOnly('stokKarti')}
                  disabled={loading}
                  className={`px-3 py-2 text-sm rounded-md ${
                    excelCreated.stokKarti 
                      ? "bg-green-600 text-white hover:bg-green-700" 
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } transition-colors disabled:bg-gray-400`}
                >
                  {loading ? 'İşleniyor...' : excelCreated.stokKarti ? 'Yeniden Oluştur' : 'Yalnızca Excel Oluştur'}
                </button>
                
                <button 
                  onClick={() => handleSaveAndCreateExcel('stokKarti')}
                  disabled={loading || databaseSaved}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'İşleniyor...' : 'Veritabanına Kaydet ve Excel Oluştur'}
                </button>
              </div>
            </div>
            
            {/* Reçete Excel Bölümü */}
            <div className="border p-4 rounded-md">
              <h4 className="font-medium text-gray-700 mb-3">Reçete Excel</h4>
              <p className="text-sm text-gray-600 mb-4">
                MM GT, YM GT ve YM ST reçete bilgilerini içeren Excel dosyası
              </p>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleCreateExcelOnly('recete')}
                  disabled={loading}
                  className={`px-3 py-2 text-sm rounded-md ${
                    excelCreated.recete 
                      ? "bg-green-600 text-white hover:bg-green-700" 
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } transition-colors disabled:bg-gray-400`}
                >
                  {loading ? 'İşleniyor...' : excelCreated.recete ? 'Yeniden Oluştur' : 'Yalnızca Excel Oluştur'}
                </button>
                
                <button 
                  onClick={() => handleSaveAndCreateExcel('recete')}
                  disabled={loading || databaseSaved}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'İşleniyor...' : 'Veritabanına Kaydet ve Excel Oluştur'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Tüm İşlemler */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-gray-700 mb-3">Hızlı İşlemler</h4>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => handleSaveToDatabase()}
                disabled={loading || databaseSaved}
                className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400"
              >
                {databaseSaved ? 'Veritabanına Kaydedildi' : 'Yalnızca Veritabanına Kaydet'}
              </button>
              
              <button 
                onClick={() => handleCreateExcelOnly('both')}
                disabled={loading}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                Tüm Excel Dosyalarını Oluştur
              </button>
              
              <button 
                onClick={() => handleSaveAndCreateExcel('both')}
                disabled={loading || databaseSaved}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
              >
                Kaydet ve Tüm Excel Dosyalarını Oluştur
              </button>
            </div>
          </div>
          
          <div className="flex justify-between mt-8 pt-4 border-t">
            <div>
              <button 
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors mr-2"
              >
                İptal
              </button>
              
              <button 
                onClick={handleEditProduct}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Düzenle
              </button>
            </div>
            
            <button 
              onClick={handleNewProduct}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Yeni Ürün
            </button>
          </div>
        </div>
      )}
      
      {/* YM ST Arama Modal */}
      {showYmStSearchModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">YM ST Seç</h3>
              </div>
              
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Ara..."
                    value={searchYmSt}
                    onChange={handleYmStSearch}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Adı</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çap</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filmaşin</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalite</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seç</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredYmStList.map(item => {
                        const isSelected = selectedYmSt.some(sel => sel.id === item.id);
                        const isActive = selectedYmStToAdd?.id === item.id;
                        
                        return (
                          <tr key={item.id} className={isSelected ? "bg-gray-100" : ""}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.stok_kodu}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.stok_adi}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.cap?.toString().replace('.', ',')}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.filmasin}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.quality}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <button
                                onClick={() => handleSelectYmSt(item)}
                                disabled={isSelected}
                                className={`px-3 py-1 rounded-md text-sm ${
                                  isSelected 
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                                    : isActive
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                }`}
                              >
                                {isSelected ? 'Seçildi' : isActive ? 'Seçildi' : 'Seç'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      
                      {filteredYmStList.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-gray-500">
                            Arama kriterine uygun YM ST bulunamadı
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleAddYmSt}
                  disabled={!selectedYmStToAdd}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400"
                >
                  Ekle
                </button>
                <button
                  onClick={() => {
                    setShowYmStSearchModal(false);
                    setSelectedYmStToAdd(null);
                    setSearchYmSt("");
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  İptal
                </button>
                <button 
                  onClick={() => setShowYmStCreateModal(true)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-gray-800 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Yeni YM ST Oluştur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* YM ST Oluşturma Modal */}
      {showYmStCreateModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Yeni YM ST Oluştur</h3>
              </div>
              
              <Formik
                initialValues={{
                  cap: mmGtData?.cap || '',
                  filmasin: '550',
                  quality: '1006'
                }}
                validationSchema={Yup.object().shape({
                  cap: Yup.number()
                    .required('Çap zorunludur')
                    .min(0.8, 'Çap en az 0.8 olmalıdır')
                    .max(8.0, 'Çap en fazla 8.0 olmalıdır'),
                  filmasin: Yup.string()
                    .required('Filmaşin zorunludur'),
                  quality: Yup.string()
                    .required('Kalite zorunludur')
                })}
                onSubmit={handleCreateYmSt}
              >
                {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                  <Form onSubmit={handleSubmit}>
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                          Çap (mm) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="cap"
                          value={values.cap}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          step="0.01"
                          className={`w-full p-2 border rounded-md ${
                            errors.cap && touched.cap ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {errors.cap && touched.cap && (
                          <div className="text-red-500 text-xs mt-1">{errors.cap}</div>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                          Filmaşin <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="filmasin"
                          value={values.filmasin}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`w-full p-2 border rounded-md ${
                            errors.filmasin && touched.filmasin ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {errors.filmasin && touched.filmasin && (
                          <div className="text-red-500 text-xs mt-1">{errors.filmasin}</div>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                          Kalite <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="quality"
                          value={values.quality}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`w-full p-2 border rounded-md ${
                            errors.quality && touched.quality ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {errors.quality && touched.quality && (
                          <div className="text-red-500 text-xs mt-1">{errors.quality}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={isSubmitting || loading}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400"
                      >
                        {loading ? 'İşleniyor...' : 'Oluştur'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowYmStCreateModal(false)}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        İptal
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      )}
      
      {/* Veritabanı Yönetim Modal */}
      {showDatabaseModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Veritabanı Yönetimi</h3>
              </div>
              
              <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4 flex items-center space-x-4">
                  <div className="flex-1">
                    <select
                      value={databaseFilter.type}
                      onChange={(e) => setDatabaseFilter({...databaseFilter, type: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="mmGt">MM GT</option>
                      <option value="ymGt">YM GT</option>
                      <option value="ymSt">YM ST</option>
                    </select>
                  </div>
                  <div className="flex-3">
                    <input
                      type="text"
                      placeholder="Ara..."
                      value={databaseFilter.search}
                      onChange={(e) => setDatabaseFilter({...databaseFilter, search: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <button 
                      onClick={() => fetchProductDatabase()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Yenile
                    </button>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Adı</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çap</th>
                        {databaseFilter.type === 'ymSt' && (
                          <>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filmaşin</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalite</th>
                          </>
                        )}
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDatabaseItems.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.stok_kodu}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.stok_adi}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.cap?.toString().replace('.', ',')}</td>
                          {databaseFilter.type === 'ymSt' && (
                            <>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.filmasin}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.quality}</td>
                            </>
                          )}
                          <td className="px-4 py-3 whitespace-nowrap text-sm flex space-x-2">
                            <button 
                              onClick={() => handleSelectDatabaseItem(item)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Seç
                            </button>
                            <button 
                              onClick={() => handleDeleteDatabaseItem(databaseFilter.type, item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                      
                      {filteredDatabaseItems.length === 0 && (
                        <tr>
                          <td colSpan={databaseFilter.type === 'ymSt' ? 6 : 4} className="text-center py-4 text-gray-500">
                            Arama kriterine uygun ürün bulunamadı
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => setShowDatabaseModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:w-auto sm:text-sm"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Arama Modal (Artık kullanılmıyor, ama ileride gerekebilir diye silmedim) */}
      {showSearchModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Ürün Ara</h3>
              </div>
              
              <Formik
                initialValues={{
                  stok_kodu: '',
                  cap: '',
                  kod_2: '',
                  kg: ''
                }}
                onSubmit={handleSearch}
              >
                {({ values, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                  <Form onSubmit={handleSubmit}>
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                          Stok Kodu
                        </label>
                        <input
                          type="text"
                          name="stok_kodu"
                          value={values.stok_kodu}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                          Çap
                        </label>
                        <input
                          type="number"
                          name="cap"
                          value={values.cap}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          step="0.01"
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                          Kaplama Türü
                        </label>
                        <select
                          name="kod_2"
                          value={values.kod_2}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Seçiniz</option>
                          <option value="NIT">NIT</option>
                          <option value="PAD">PAD</option>
                        </select>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                          Ağırlık (KG)
                        </label>
                        <input
                          type="number"
                          name="kg"
                          value={values.kg}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={isSubmitting || loading}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400"
                      >
                        {loading ? 'Aranıyor...' : 'Ara'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSearchModal(false)}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        İptal
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalvanizliTelNetsis;
