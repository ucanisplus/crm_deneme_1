import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth } from '@/api-config';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

// Doğrulama Şeması tanımlamaları
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
    .required('Min. mukavemet zorunludur')
    .min(350, 'Min. mukavemet en az 350 olmalıdır')
    .max(2000, 'Min. mukavemet en fazla 2000 olmalıdır'),
  max_mukavemet: Yup.number()
    .required('Max. mukavemet zorunludur')
    .min(350, 'Max. mukavemet en az 350 olmalıdır')
    .max(2000, 'Max. mukavemet en fazla 2000 olmalıdır'),
  ic_cap: Yup.number()
    .required('İç çap zorunludur')
    .min(30, 'İç çap en az 30 olmalıdır')
    .max(80, 'İç çap en fazla 80 olmalıdır'),
  dis_cap: Yup.number()
    .required('Dış çap zorunludur')
    .min(30, 'Dış çap en az 30 olmalıdır')
    .max(120, 'Dış çap en fazla 120 olmalıdır'),
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

const receteValidationSchema = Yup.object().shape({
  recete_kodu: Yup.string().required('Reçete kodu zorunludur'),
  recete_adi: Yup.string().required('Reçete adı zorunludur'),
  mamul_kodu: Yup.string().required('Mamul kodu zorunludur'),
  yari_mamul_kodu: Yup.string().required('Yarı mamul kodu zorunludur'),
  quantity: Yup.number()
    .required('Miktar zorunludur')
    .min(0.1, 'Miktar en az 0.1 olmalıdır')
    .max(100, 'Miktar en fazla 100 olmalıdır'),
  fire_orani: Yup.number()
    .required('Fire oranı zorunludur')
    .min(0, 'Fire oranı en az 0 olmalıdır')
    .max(100, 'Fire oranı en fazla 100 olmalıdır'),
});

const talepValidationSchema = Yup.object().shape({
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
    .required('Min. mukavemet zorunludur')
    .min(350, 'Min. mukavemet en az 350 olmalıdır')
    .max(2000, 'Min. mukavemet en fazla 2000 olmalıdır'),
  max_mukavemet: Yup.number()
    .required('Max. mukavemet zorunludur')
    .min(350, 'Max. mukavemet en az 350 olmalıdır')
    .max(2000, 'Max. mukavemet en fazla 2000 olmalıdır'),
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

// Galvanizli Tel Context
const GalvanizliTelContext = createContext();

// Main Component Definition
const GalvanizliTelNetsis = () => {
  // State Management
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
    mamul: [],
    yari_mamul: [],
    hammadde: []
  });
  const [talepList, setTalepList] = useState([]);
  const [filteredTalepItems, setFilteredTalepItems] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showYmStCreateModal, setShowYmStCreateModal] = useState(false);
  const [showTalepModal, setShowTalepModal] = useState(false);
  const [newTalepData, setNewTalepData] = useState({});
  const [showModifyTalepModal, setShowModifyTalepModal] = useState(false);
  const [currentTalep, setCurrentTalep] = useState(null);
  const [showRejectTalepModal, setShowRejectTalepModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [uniqueYmSt, setUniqueYmSt] = useState([]);
  const [savingTime, setSavingTime] = useState(null);
  const [formValues, setFormValues] = useState({
    cap: '',
    kod_2: '',
    kaplama: '',
    min_mukavemet: '',
    max_mukavemet: '',
    ic_cap: '',
    dis_cap: '',
    tolerans_plus: '',
    tolerans_minus: '',
    kg: '',
  });
  
  const { user } = useAuth();

  // YM ST parametrelerini hesaplama fonksiyonu
  const calculateYmStParameters = (values) => {
    // Galvanizleme mantığına göre YM ST çapı, MM GT çapından daha küçük olmalı
    const capValue = parseFloat(values.cap);
    const kod2 = values.kod_2;

    // YM ST için çap aralığı hesapla (MM GT çapının %3.5-6.5 daha küçük)
    let minCap, maxCap;

    if (kod2 === 'NIT') {
      // NIT için çap hesabı
      minCap = capValue * 0.935; // %6.5 küçültme
      maxCap = capValue * 0.965; // %3.5 küçültme
    } else {
      // PAD için çap hesabı - daha az küçültme
      minCap = capValue * 0.95; // %5 küçültme
      maxCap = capValue * 0.98; // %2 küçültme
    }

    // Filmaşin ve kalite belirle
    let filmasin, quality;
      
    if (capValue < 1.5) {
      filmasin = 550;
      quality = '1006';
    } else if (capValue < 2.5) {
      filmasin = 600;
      quality = '1006';
    } else if (capValue < 4.5) {
      filmasin = 600;
      quality = '1008';
    } else if (capValue < 6.0) {
      filmasin = 700;
      quality = '1010';
    } else if (capValue < 7.0) {
      filmasin = 800;
      quality = '1010';
    } else {
      filmasin = 900;
      quality = '1010';
    }

    return {
      minCap,
      maxCap,
      filmasin,
      quality
    };
  };

  // YM ST'lerin otomatik seçimi - İyileştirilmiş ve veri kaynağını gösteren versiyon
  const autoSelectYmSt = async (values) => {
    try {
      setLoading(true);

      toast.info('YM ST önerileri oluşturuluyor...', { autoClose: 2000 });

      // Mevcut YM ST'leri temizle
      setSelectedYmSt([]);

      // YM ST parametrelerini hesapla
      const params = calculateYmStParameters(values);
      
      // Ürün tipi ve çapına göre YM ST önerileri bul
      const capValue = parseFloat(values.cap);
      const kod2 = values.kod_2;

      // Tüm YM ST'leri yükle (eğer yoksa)
      if (ymStList.length === 0) {
        await loadYmStList();
      }

      // YM ST seçimi için daha detaylı bir algoritma
      let selectedItems = [];
      let ymStLookupList = [...ymStList]; // Var olan listeyi kopyala

      // 1. Önce özel eşleşme tablosunu kontrol et
      const specialMatchMap = {
        // NIT tipi ürünler için özel eşleşmeler
        'YM.GT.NIT.0150.00': 'YM.ST.0142.0600.1006',
        'YM.GT.NIT.0170.00': 'YM.ST.0159.0600.1006',
        'YM.GT.NIT.0245.00': 'YM.ST.0240.0600.1006',
        'YM.GT.NIT.0245.01': 'YM.ST.0238.0600.1006',
        'YM.GT.NIT.0245.02': 'YM.ST.0238.0600.1006',
        'YM.GT.NIT.0246.00': 'YM.ST.0242.0600.1006',
        'YM.GT.NIT.0246.02': 'YM.ST.0244.0600.1006',
        'YM.GT.NIT.0250.00': 'YM.ST.0245.0600.1006',
        'YM.GT.NIT.0250.01': 'YM.ST.0245.0600.1006',
        'YM.GT.NIT.0270.00': 'YM.ST.0258.0600.1008',
        'YM.GT.NIT.0296.00': 'YM.ST.0290.0600.1008',
        'YM.GT.NIT.0300.00': 'YM.ST.0292.0600.1008',
        'YM.GT.NIT.0300.01': 'YM.ST.0292.0600.1008',
        'YM.GT.NIT.0300.02': 'YM.ST.0294.0600.1008',
        'YM.GT.NIT.0340.00': 'YM.ST.0340.0600.1008',
        'YM.GT.NIT.0376.00': 'YM.ST.0368.0600.1008',
        'YM.GT.NIT.0376.01': 'YM.ST.0368.0600.1008',
        'YM.GT.NIT.0390.00': 'YM.ST.0386.0600.1008',
        'YM.GT.NIT.0400.00': 'YM.ST.0388.0600.1008',

        // PAD tipi ürünler için özel eşleşmeler
        'YM.GT.PAD.0120.00': 'YM.ST.0120.0550.1006',
        'YM.GT.PAD.0120.01': 'YM.ST.0120.0550.1006',
        'YM.GT.PAD.0130.00': 'YM.ST.0130.0550.1006',
        'YM.GT.PAD.0140.00': 'YM.ST.0140.0550.1006'
      };

      // YM GT stok kodu
      const ymGtStokKodu = `YM.GT.${kod2}.${parseFloat(values.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
      const specialMatch = specialMatchMap[ymGtStokKodu];
      
      // Özel eşleşme varsa ekle
      if (specialMatch) {
        const matchedYmSt = ymStLookupList.find(item => item.stok_kodu === specialMatch);
        if (matchedYmSt) {
          // Kaynağı belirt - veritabanından alındı
          matchedYmSt.source = 'database';
          matchedYmSt.sourceLabel = 'Veritabanından';
          selectedItems.push(matchedYmSt);
        }
      }

      // 2. Eğer özel eşleşme yoksa veya bulunamadıysa, çap ve türe göre hesapla
      if (selectedItems.length < 3) { // En az 3 öneri yapmaya çalış
        if (kod2 === 'NIT') {
          // Hesaplanmış parametreleri kullan
          const { minCap, maxCap, filmasin, quality } = params;

          // Uygun YM ST'leri bul
          const matches = ymStLookupList.filter(item => {
            const itemCap = parseFloat(item.cap);
            return !isNaN(itemCap) &&
                   itemCap >= minCap &&
                   itemCap <= maxCap &&
                   (!filmasin || item.filmasin === filmasin) &&
                   (!quality || item.quality === quality) &&
                   !selectedItems.some(selected => selected.stok_kodu === item.stok_kodu); // Zaten eklenmiş olanları hariç tut
          });

          // Bulunanları ekle (toplam 3'e kadar)
          if (matches.length > 0) {
            const matchesToAdd = matches.slice(0, 3 - selectedItems.length);
            matchesToAdd.forEach(item => {
              item.source = 'database';
              item.sourceLabel = 'Veritabanından';
            });
            selectedItems = [...selectedItems, ...matchesToAdd];
          }
        } else if (kod2 === 'PAD') {
          // Hesaplanmış parametreleri kullan
          const { minCap, maxCap, filmasin, quality } = params;

          // PAD için hesaplanmış çap aralığında YM ST ara
          const matches = ymStLookupList.filter(item => {
            const itemCap = parseFloat(item.cap);
            // PAD için hesaplanmış çap aralığını kullan
            return !isNaN(itemCap) &&
                   itemCap >= minCap &&
                   itemCap <= maxCap &&
                   (!filmasin || item.filmasin === filmasin) &&
                   (!quality || item.quality === quality) &&
                   !selectedItems.some(selected => selected.stok_kodu === item.stok_kodu); // Zaten eklenmiş olanları hariç tut
          });

          // Bulunanları ekle (toplam 3'e kadar)
          if (matches.length > 0) {
            const matchesToAdd = matches.slice(0, 3 - selectedItems.length);
            matchesToAdd.forEach(item => {
              item.source = 'database';
              item.sourceLabel = 'Veritabanından';
            });
            selectedItems = [...selectedItems, ...matchesToAdd];
          }
        }
      }

      // 3. Hala yeterli YM ST önerisi yoksa (3'ten az), yeni öneriler oluştur
      if (selectedItems.length < 3) {
        // Kaç tane otomaik YM ST önerisi oluşturmak istiyoruz (toplam 3'e tamamla)
        const needCount = 3 - selectedItems.length;
        
        // Auto generating YM ST for remaining spots
        for (let i = 0; i < needCount; i++) {
          // Her yeni öneri için çap değerini biraz daha küçültmek için düzeltme faktörü
          const newItemIndex = selectedItems.filter(item => item.isNew).length;
          const adjustmentFactor = 1.0 - (0.01 * newItemIndex); // Her yeni öneride çapı biraz daha küçült

          // Çap hesaplaması
          const adjustedCap = kod2 === 'NIT' ?
              (capValue * 0.96 * adjustmentFactor).toFixed(2) : // NIT için %4 küçültme + ek küçültme
              (capValue * adjustmentFactor).toFixed(2);         // PAD için minimal küçültme

          // Çap değerlerine göre filmaşin ve kalite belirle
          let filmasin, quality;

          if (capValue < 1.5) {
            filmasin = 550;
            quality = '1006';
          } else if (capValue < 2.5) {
            filmasin = 600;
            quality = '1006';
          } else if (capValue < 4.5) {
            filmasin = 600;
            quality = '1008';
          } else if (capValue < 6.0) {
            filmasin = 700;
            quality = '1010';
          } else if (capValue < 7.0) {
            filmasin = 800;
            quality = '1010';
          } else {
            filmasin = 900;
            quality = '1010';
          }

          // Çap değerini doğru formatta (4 basamaklı) hazırlama
          const formattedStCap = adjustedCap.replace('.', '').padStart(4, '0');

          // Yeni YM ST için stok kodu oluştur
          const stockCode = `YM.ST.${formattedStCap}.${filmasin.toString().padStart(4, '0')}.${quality}`;
          const stockName = `YM Siyah Tel ${formattedStCap} mm HM:${filmasin.toString().padStart(4, '0')}.${quality}`;

          // Özel saha 1 değerini belirle
          let ozelSaha1 = 1;
          if (adjustedCap >= 2 && adjustedCap < 3) ozelSaha1 = 2;
          else if (adjustedCap >= 3 && adjustedCap < 4) ozelSaha1 = 3;
          else if (adjustedCap >= 4 && adjustedCap < 5) ozelSaha1 = 4;
          else if (adjustedCap >= 5 && adjustedCap < 6) ozelSaha1 = 5;
          else if (adjustedCap >= 6 && adjustedCap < 7) ozelSaha1 = 6;
          else if (adjustedCap >= 7 && adjustedCap < 8) ozelSaha1 = 7;
          else if (adjustedCap >= 8) ozelSaha1 = 8;

          // Yeni YM ST oluştur
          const newYmSt = {
            stok_kodu: stockCode,
            cap: adjustedCap,
            filmasin: filmasin,
            quality: quality,
            ozel_saha_1: ozelSaha1,
            stok_adi: stockName,
            isNew: true, // Yeni oluşturulduğunu belirt
            source: 'auto-generated',
            sourceLabel: 'Otomatik oluşturuldu'
          };

          // Eğer aynı stok kodunda eklenmemişse listeye ekle
          if (!selectedItems.some(item => item.stok_kodu === newYmSt.stok_kodu)) {
            selectedItems.push(newYmSt);
          }
        }
      }

      // YM ST önerilerini daha kolay yönetmek için düzenleme
      const suggestions = selectedItems.map((item, index) => ({
        ...item,
        id: item.id || `ym-st-${index}`, // Eğer id yoksa yeni bir id oluştur
        status: 'selected' // Otomatik seçim yapıldığını belirt
      }));

      // Tekrarlanan kayıtları filtrele (stok koduna göre)
      const seenStokKodu = new Set();
      const uniqueSuggestions = [];
      
      suggestions.forEach(item => {
        if (!seenStokKodu.has(item.stok_kodu)) {
          seenStokKodu.add(item.stok_kodu);
          uniqueSuggestions.push(item);
        }
      });
      
      // Seçili YM ST'leri temizle ve yeni önerilerle doldur
      setSelectedYmSt(uniqueSuggestions);
      return uniqueSuggestions;
    } catch (error) {
      console.error('YM ST otomatik seçim hatası:', error);
      setError('YM ST önerileri oluşturulurken bir hata oluştu');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // YM ST önerilerini otomatik hesapla ve seç
  const handleYmStAutoSelect = async (values) => {
    try {
      // YM ST önerilerini oluşturmak için autoSelectYmSt'yi çağır
      // Bu fonksiyon artık tüm işi yapıyor ve state'leri güncelliyor
      return await autoSelectYmSt(values);
    } catch (error) {
      console.error('YM ST otomatik seçim hatası:', error);
      setError('YM ST önerileri oluşturulurken bir hata oluştu: ' + error.message);
      return [];
    }
  };

  // MM GT stok kodu oluşturma
  const createMmGtStockCode = (values) => {
    // Çap değerini doğru formatta (4 basamaklı) hazırlama
    const formattedCap = parseFloat(values.cap).toFixed(2).replace('.', '').padStart(4, '0');
    
    // Stok kodunu oluştur
    return `MM.GT.${values.kod_2}.${formattedCap}.00`;
  };

  // YM GT stok kodu oluşturma
  const createYmGtStockCode = (values) => {
    // Çap değerini doğru formatta (4 basamaklı) hazırlama
    const formattedCap = parseFloat(values.cap).toFixed(2).replace('.', '').padStart(4, '0');

    // Stok kodunu oluştur
    return `YM.GT.${values.kod_2}.${formattedCap}.00`;
  };

  // YM ST listesini yükleme
  const loadYmStList = async () => {
    try {
      const response = await fetchWithAuth(API_URLS.GET_YM_ST_LIST, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setYmStList(data);
        return data;
      } else {
        throw new Error('YM ST listesi yüklenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('YM ST listesi hatası:', error);
      setError('YM ST listesi yüklenirken bir hata oluştu: ' + error.message);
      return [];
    }
  };

  // Render the component
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Galvanizli Tel NETSIS Stok Oluşturma</h1>
      
      {/* Error messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Success messages */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}
      
      {/* Main content would go here */}
      {/* For a real implementation, you would need to add all the UI components and forms */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <p>Bu bileşen, galvanizli tel için NETSIS stok oluşturma işlemlerini içerir.</p>
        <p>Geliştirme devam etmektedir.</p>
      </div>
    </div>
  );
};

export default GalvanizliTelNetsis;