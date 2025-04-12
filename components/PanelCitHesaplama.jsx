// PanelCitHesaplama.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import { API_URLS } from '../api-config';
import {
  Calculator,
  Filter,
  FileSpreadsheet,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Edit,
  Search,
  Sparkles,
  DollarSign,
  Euro,
  TrendingUp
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Palet ağırlıkları için referans tabloları - UPDATED with exact values from the requirements
const PALLET_WEIGHTS = {
  Single: {
    '250': {
      '63': 10.8, '70': 12, '83': 14.11, '100': 17, '103': 16.30833,
      '120': 19, '123': 18.04, '150': 22, '153': 28.305, '170': 31.45,
      '173': 32.005, '183': 33.855, '200': 37, '203': 37.555
    },
    '200': {
      '63': 8.64, '70': 9.6, '83': 11.288, '100': 13.6, '103': 13.04667,
      '120': 15.2, '123': 14.432, '150': 17.6, '153': 22.644, '170': 25.16,
      '173': 25.604, '183': 27.084, '200': 29.6, '203': 30.044
    }
  },
  Double: {
    '250': {
      '63': 12, '83': 14, '103': 18, '123': 20, '143': 23,
      '163': 28, '183': 30, '203': 33, '223': 36.25123
    },
    '200': {
      '63': 9.6, '83': 11.2, '103': 14.4, '123': 16, '143': 18.4,
      '163': 22.4, '183': 24, '203': 26.4, '223': 29.00099
    }
  }
};

// En yakın yükseklik değerini bulma yardımcı fonksiyonu - IMPROVED for accuracy
const getClosestHeight = (height, panelType, widthStr) => {
  const lookupTable = PALLET_WEIGHTS[panelType]?.[widthStr];
  if (!lookupTable) return null;

  // Convert height to string and check for exact match
  const heightStr = height.toString();
  if (lookupTable[heightStr]) {
    return heightStr;
  }

  // If no exact match, find the closest value
  const heights = Object.keys(lookupTable).map(Number);

  // Sort heights numerically to find closest
  const closestHeight = heights.reduce((prev, curr) => {
    return (Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev);
  });

  return closestHeight.toString();
};

// Güvenli float değer dönüştürme yardımcı fonksiyonu - DÜZELTILDI
// Bu fonksiyon virgül ve nokta kullanımını düzgün şekilde işleyecek
// Ondalık sayı inputları için güvenli çevirme fonksiyonu
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  
  // Hem virgül hem nokta ondalık ayırıcı olarak kabul edilir
  if (typeof value === 'string') {
    value = value.replace(/\s/g, '').replace(',', '.');
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Ekran değeri formatlaması için güncellendi - sıfırları ve ondalık noktaları korur
const formatDisplayValue = (value) => {
  // Null/undefined/NaN durumları
  if (value === null || value === undefined || isNaN(value)) return '';
  
  // Kullanıcı girişi sırasında virgül veya nokta içeren bir string ise, olduğu gibi döndür
  if (typeof value === 'string' && (value.includes(',') || value.includes('.'))) {
    return value.replace(',', '.'); // Tutarlılık için noktalara dönüştür
  }
  
  const num = parseFloat(value);
  
  // Sıfır ise "0" döndür
  if (num === 0) return '0';
  
  // Değeri olduğu gibi döndür, sondaki sıfırları koruyarak
  return num.toString();
};

// Tablo hücresi için değer formatlaması - farklı kolon tipleri için
const formatTableValue = (value, columnType) => {
  if (value === null || value === undefined) return '';
  
  // Eğer boş string ise boş döndür, ancak 0 değeri için boş döndürme
  if (value === '' && value !== 0) return '';

  const num = parseFloat(value);
  if (isNaN(num) && value !== '0') return value; // Sayı değilse orijinal değeri döndür

  // Sıfır için özel durum
  if (num === 0) return '0';

  switch (columnType) {
    case 'tel_capi':
    case 'goz_araligi':
      // Tel çapı veya göz aralığı için format - sondaki sıfırlar olmadan ondalık göster
      return num.toString().replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    case 'price':
      // Fiyatlar için - tablolarda 5 ondalık basamak
      return num.toFixed(5);
    case 'decimal':
      // Diğer ondalık değerler için, sondaki sıfırlar olmadan
      return num.toString().replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    default:
      // Tamsayılar için, ondalık nokta gösterme
      return Number.isInteger(num) ? num.toString() : num.toString().replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
};

// Input değişikliği için tutarlı işleme - DÜZELTILDI
const handleInputChange = (value, setter, field) => {
  // Virgülleri noktalara dönüştür, ancak mevcut noktaları koru
  let processedValue = value;
  
  if (typeof value === 'string') {
    processedValue = value.replace(',', '.');
  }
  
  // State'i işlenmiş değerle güncelle
  setter(prev => ({
    ...prev,
    [field]: processedValue
  }));
};

// Ana PanelCitHesaplama bileşeni
const PanelCitHesaplama = () => {
  // State tanımlamaları
  const [satisListesi, setSatisListesi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState({
    genel: false,
    panelCit: false,
    profil: false,
    panelList: false
  });
  const [calculating, setCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('main-panel');
  const [genelDegiskenler, setGenelDegiskenler] = useState({});
  const [panelCitDegiskenler, setPanelCitDegiskenler] = useState({});
  const [profilDegiskenler, setProfilDegiskenler] = useState({});
  const [panelList, setPanelList] = useState([]);
  const [filteredPanelList, setFilteredPanelList] = useState([]);
  const [maliyetListesi, setMaliyetListesi] = useState([]);
  const [geciciHesaplar, setGeciciHesaplar] = useState([]);
  const [ozelPanelList, setOzelPanelList] = useState([]);
  const [selectedPanelType, setSelectedPanelType] = useState('all');
  const [showResults, setShowResults] = useState(false);
  const [showSalesView, setShowSalesView] = useState(false);
  const [panelSearch, setPanelSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [resultFilter, setResultFilter] = useState({
    currency: 'all',
    unit: 'all',
    type: 'all'
  });
  const [salesFilter, setSalesFilter] = useState({
    currency: 'USD',
    unit: 'all'
  });
  const [salesMargins, setSalesMargins] = useState({
    bronze: 10,
    silver: 20,
    gold: 30
  });
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });

  // Debounce için zamanlayıcı
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    fetchInitialData();
  }, []);

	useEffect(() => {
	  // This needs to run after the component renders when activeTab is 'special-panel'
	  if (activeTab === 'special-panel') {
	    // Using setTimeout to ensure the DOM elements are fully rendered
	    setTimeout(() => {
	      const tableContainer = document.getElementById('ozelPanelTableContainer');
	      if (tableContainer) {
	        const topScrollbar = tableContainer.previousSibling;
	        if (topScrollbar) {
	          // Set up the scroll event listener on the top scrollbar
	          topScrollbar.addEventListener('scroll', (e) => {
	            tableContainer.scrollLeft = e.target.scrollLeft;
	          });
	          
	          // Set up the scroll event listener on the main table container
	          tableContainer.addEventListener('scroll', (e) => {
	            topScrollbar.scrollLeft = e.target.scrollLeft;
	          });
	        }
	      }
	    }, 100);
	  }
	}, [activeTab, ozelPanelList.length]);

  // İlk verileri çekme fonksiyonu - FIXED with proper variable scoping
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Verileri sırayla çek - Promise.all yerine
      const genelRes = await axios.get(API_URLS.genelDegiskenler).catch(error => {
        console.error("Genel değişkenler getirme hatası:", error);
        return { data: [] };
      });

      const panelCitRes = await axios.get(API_URLS.panelCitDegiskenler).catch(error => {
        console.error("Panel çit değişkenleri getirme hatası:", error);
        return { data: [] };
      });

      const profilRes = await axios.get(API_URLS.profilDegiskenler).catch(error => {
        console.error("Profil değişkenleri getirme hatası:", error);
        return { data: [] };
      });

      const panelListRes = await axios.get(API_URLS.panelList).catch(error => {
        console.error("Panel listesi getirme hatası:", error);
        return { data: [] };
      });

      console.log("Genel değişkenler veri:", genelRes.data);
      console.log("Panel çit değişkenler veri:", panelCitRes.data);

      // En son değişkenleri al
      const latestGenelDegisken = genelRes.data.length > 0 ?
        genelRes.data.sort((a, b) => b.id - a.id)[0] : {};

      // Panel Çit için unique_key kullanıyoruz
      const latestPanelCitDegisken = panelCitRes.data.length > 0 ?
        panelCitRes.data.sort((a, b) => {
          if (a.unique_key && b.unique_key) return b.unique_key - a.unique_key;
          return b.id - a.id;
        })[0] : {};

      const latestProfilDegisken = profilRes.data.length > 0 ?
        profilRes.data.sort((a, b) => b.id - a.id)[0] : {};

      // Ondalık noktası formatlaması
      const formattedGenelDegiskenler = {};
      Object.entries(latestGenelDegisken).forEach(([key, value]) => {
        if (typeof value === 'number') {
          formattedGenelDegiskenler[key] = formatDisplayValue(value);
        } else {
          formattedGenelDegiskenler[key] = value;
        }
      });

      const formattedPanelCitDegiskenler = {};
      Object.entries(latestPanelCitDegisken).forEach(([key, value]) => {
        if (typeof value === 'number') {
          formattedPanelCitDegiskenler[key] = formatDisplayValue(value);
        } else {
          formattedPanelCitDegiskenler[key] = value;
        }
      });

      const formattedProfilDegiskenler = {};
      Object.entries(latestProfilDegisken).forEach(([key, value]) => {
        if (typeof value === 'number') {
          formattedProfilDegiskenler[key] = formatDisplayValue(value);
        } else {
          formattedProfilDegiskenler[key] = value;
        }
      });

      // Formatlanmış verileri state'e kaydet
      setGenelDegiskenler(formattedGenelDegiskenler);
      setPanelCitDegiskenler(formattedPanelCitDegiskenler);
      setProfilDegiskenler(formattedProfilDegiskenler);
      setPanelList(panelListRes.data);
      setFilteredPanelList(panelListRes.data);

      // Döviz kurlarını çek
      fetchCurrencyRates();
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      alert('Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin ve tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Sadece belirli bir bölümü yenileme fonksiyonu - FIXED with proper error handling
  const fetchSectionData = async (section) => {
    try {
      setSectionLoading(prev => ({ ...prev, [section]: true }));

      let endpoint = '';
      let setter = null;

      switch (section) {
        case 'genel':
          endpoint = API_URLS.genelDegiskenler;
          setter = setGenelDegiskenler;
          break;
        case 'panelCit':
          endpoint = API_URLS.panelCitDegiskenler;
          setter = setPanelCitDegiskenler;
          break;
        case 'profil':
          endpoint = API_URLS.profilDegiskenler;
          setter = setProfilDegiskenler;
          break;
        case 'panelList':
          endpoint = API_URLS.panelList;
          const response = await axios.get(endpoint);
          console.log(`${section} veri:`, response.data);
          setPanelList(response.data);
          setFilteredPanelList(response.data);
          setSectionLoading(prev => ({ ...prev, [section]: false }));
          return;
        default:
          console.error('Geçersiz bölüm:', section);
          setSectionLoading(prev => ({ ...prev, [section]: false }));
          return;
      }

      const response = await axios.get(endpoint);
      console.log(`${section} veri:`, response.data);

      // Check if data exists
      if (!response.data || response.data.length === 0) {
        console.warn(`${section} için veri bulunamadı`);
        setSectionLoading(prev => ({ ...prev, [section]: false }));
        return;
      }

      // En son kaydı al (en yüksek ID'li kayıt)
      let latestRecord;
      if (section === 'panelCit') {
        latestRecord = response.data.sort((a, b) => {
          if (a.unique_key && b.unique_key) return b.unique_key - a.unique_key;
          return b.id - a.id;
        })[0] || {};
      } else {
        latestRecord = response.data.sort((a, b) => b.id - a.id)[0] || {};
      }

      console.log(`En son ${section} kaydı:`, latestRecord);

      // Formatlamadan önce değerleri işle
      const formattedRecord = {};
      Object.entries(latestRecord).forEach(([key, value]) => {
        if (typeof value === 'number') {
          formattedRecord[key] = formatDisplayValue(value);
        } else {
          formattedRecord[key] = value;
        }
      });

      // Add missing fields for genel section if needed
      if (section === 'genel') {
        if (!formattedRecord.usd_tl) formattedRecord.usd_tl = '';
        if (!formattedRecord.eur_usd) formattedRecord.eur_usd = '';
      }

      setter(formattedRecord);

      if (section === 'genel') {
        fetchCurrencyRates();
      }
    } catch (error) {
      console.error(`${section} verileri çekme hatası:`, error);
      alert(`${section} verileri çekilirken hata oluştu. Lütfen daha sonra tekrar deneyin.`);
    } finally {
      setSectionLoading(prev => ({ ...prev, [section]: false }));
    }
  };

  // Döviz kurlarını çekme fonksiyonu
  const fetchCurrencyRates = async () => {
    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
      if (response.data && response.data.rates) {
        const usdTry = response.data.rates.TRY;
        const eurUsd = 1 / response.data.rates.EUR;

        // Çekilen değerlerle genelDegiskenler state'ini güncelle
        setGenelDegiskenler(prev => ({
          ...prev,
          usd_tl: formatDisplayValue(usdTry),
          eur_usd: formatDisplayValue(eurUsd)
        }));

        console.log('Döviz kurları güncellendi:', { usdTry, eurUsd });
      }
    } catch (error) {
      console.error('Döviz kuru çekme hatası:', error);
      // APı başarısız olursa mevcut değerleri kullan (sessizce devam et)
    }
  };

  // Panel listesini filtreleme
  const filterPanelList = () => {
    let filtered = [...panelList];

    // Eğer 'all' değilse panel tipi filtresini uygula
    if (selectedPanelType !== 'all') {
      filtered = filtered.filter(panel => {
        const panelKodu = (panel.panel_kodu || '').toUpperCase();
        return panelKodu.startsWith(selectedPanelType.toUpperCase());
      });
    }

    // Arama terimi varsa arama filtresini uygula
	if (panelSearch && panelSearch.trim() !== '') {
	  const searchTerms = panelSearch.toLowerCase().split(' ');
	  
	  filtered = filtered.filter(panel => {
	    // Sadece Panel Kodu'nu ara, diğer alanları değil
	    const panelKodu = String(panel.panel_kodu || '').toLowerCase();
	    
	    return searchTerms.every(term => panelKodu.includes(term));
	  });
	}

    // Sütun filtrelerini uygula (Excel benzeri filtreleme)
    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue.trim() !== '') {
        filtered = filtered.filter(panel => {
          const value = String(panel[column] || '').toLowerCase();
          return value.includes(filterValue.toLowerCase());
        });
      }
    });

    setFilteredPanelList(filtered);
  };

  // Excel benzeri sütun filtresi ayarlama
  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Panel listesini sıralama - IMPROVED for better sorting
  const sortPanelList = (key) => {
    let direction = 'ascending';

    // Aynı tuşa tıklanırsa sıralama yönünü değiştir
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }

    setSortConfig({ key, direction });

    // Filtrelenmiş listenin sıralanmış bir kopyasını oluştur
    const sortedList = [...filteredPanelList].sort((a, b) => {
      // Boş değerler için varsayılan
      if (a[key] === null || a[key] === undefined) return direction === 'ascending' ? 1 : -1;
      if (b[key] === null || b[key] === undefined) return direction === 'ascending' ? -1 : 1;

      // Sayıları karşılaştırıyorsak
      if (typeof a[key] === 'number' && typeof b[key] === 'number') {
        return direction === 'ascending' ? a[key] - b[key] : b[key] - a[key];
      }

      // String karşılaştırması
      const aStr = String(a[key]).toLowerCase();
      const bStr = String(b[key]).toLowerCase();

      if (aStr < bStr) return direction === 'ascending' ? -1 : 1;
      if (aStr > bStr) return direction === 'ascending' ? 1 : -1;
      return 0;
    });

    setFilteredPanelList(sortedList);
  };

  // Filtre değiştiğinde panelleri yeniden filtrele
  useEffect(() => {
    filterPanelList();
  }, [panelSearch, selectedPanelType, columnFilters, panelList]);

  // Maliyet tablosunu filtreleme - IMPROVED to handle more search fields
  const filterMaliyetListesi = () => {
    // Önce temel filtreleme - arama terimi
    let filtered = [...maliyetListesi];

    if (panelSearch && panelSearch.trim() !== '') {
      const searchTerms = panelSearch.toLowerCase().split(' ');
      filtered = filtered.filter(item => {
        const panelKodu = (item.panel_kodu || '').toLowerCase();
        const manualOrder = (item.manual_order || '').toLowerCase();
        const panelYukseklik = String(item.panel_yuksekligi || '').toLowerCase();
        const panelGenislik = String(item.panel_genisligi || '').toLowerCase();

        return searchTerms.some(term =>
          panelKodu.includes(term) ||
          manualOrder.includes(term) ||
          panelYukseklik.includes(term) ||
          panelGenislik.includes(term)
        );
      });
    }

    return filtered;
  };

  // Panel Kodu Oluşturma
const calculatePanelKodu = (panel) => {
  if (!panel || !panel.panel_tipi) return '';

  const prefix = panel.panel_tipi === "Single"
    ? 'SP'
    : (panel.panel_tipi === "Guvenlik" ? 'GP' : 'DP');

  // Tel çapı değerlerini düzgün formatlama
  const dikeyCap = parseFloat(panel.dikey_tel_capi) || 0;
  const yatayCap = parseFloat(panel.yatay_tel_capi) || 0;
  const capStr = `${dikeyCap.toString().replace(/\.0+$/, '')} * ${yatayCap.toString().replace(/\.0+$/, '')}`;
  
  // Ebat değerlerini düzgün formatlama
  const yukseklik = parseFloat(panel.panel_yuksekligi) || 0;
  const genislik = parseFloat(panel.panel_genisligi) || 0;
  const ebatStr = `${yukseklik.toString().replace(/\.0+$/, '')} * ${genislik.toString().replace(/\.0+$/, '')}`;
  
  // Göz aralığı değerlerini düzgün formatlama
  const yatayGoz = parseFloat(panel.yatay_goz_araligi) || 0;
  const dikeyGoz = parseFloat(panel.dikey_goz_araligi) || 0;
  const gozStr = `${yatayGoz.toString().replace(/\.0+$/, '')} * ${dikeyGoz.toString().replace(/\.0+$/, '')}`;
  
  // Büküm değeri
  const bukumStr = `${panel.bukum_sayisi || 0}-${panel.bukumdeki_cubuk_sayisi || 1}`;

  return `${prefix}_Cap:${capStr}_Eb:${ebatStr}_Gz:${gozStr}_Buk:${bukumStr}_Rnk:"Kplmsz"`;
};

  // Maliyet hesaplama fonksiyonu - geliştirilmiş performans ve doğruluk için optimize edildi
  const calculateCosts = async (isPanelList = true) => {
    setCalculating(true);
    setShowResults(false);
    setShowSalesView(false);
    setResultFilter({
      currency: 'all',
      unit: 'all',
      type: 'all'
    });

    try {
      // Önce hesaplanacak veri olup olmadığını kontrol et
      const panelsToCalculate = isPanelList ? filteredPanelList : ozelPanelList;

      if (panelsToCalculate.length === 0) {
        alert('Hesaplanacak panel bulunamadı. Lütfen panel listesinde filtrelerinizi kontrol edin veya özel paneller ekleyin.');
        setCalculating(false);
        return;
      }

      // Boş alanları kontrol et
      const emptyFields = [];

      // Genel Değişkenler kontrolü
      ['boya_fiyati_kg_eur', 'elektrik_fiyati_kw_tl', 'dogalgaz_fiyati_stn_m3_tl', 'amortisman_diger_usd', 'ort_isci_maasi', 'usd_tl', 'eur_usd'].forEach(field => {
        if (!genelDegiskenler[field]) {
          emptyFields.push(`Genel Değişkenler: ${field}`);
        }
      });

      // Panel Çit Değişkenleri kontrolü
      ['panel_boya_isci_sayisi_ad', 'panel_boya_vardiya', 'panel_kaynak_isci_sayisi_ad', 'panel_kaynak_vardiya', 'panel_kesme_isci_sayisi_ad', 'panel_kesme_vardiya',
        'panel_kaynak_makinesi_elektrik_tuketim_kwh', 'panel_kesme_elektrik_tuketim_kwh', 'panel_boya_makinesi_elektrik_tuketim_kwh', 'panel_dogalgaz_tuketim_stn_m3',
        'galvanizli_tel_ton_usd', 'sp_boya_tuketim_miktari', 'dp_boya_tuketim_miktari', 'guvenlik_boya_tuketim_miktari_gr'].forEach(field => {
          if (!panelCitDegiskenler[field]) {
            emptyFields.push(`Panel Çit Değişkenleri: ${field}`);
          }
        });

      // Profil Değişkenleri kontrolü
      ['galvanizli_profil_kg_usd', 'galvanizsiz_profil_kg_usd', 'profil_uretim_kapasitesi_m2_h', 'profil_isci_sayisi_ad', 'profil_vardiya',
        'profil_kaynak_makinesi_elektrik_tuketim_kwh', 'profil_kesme_elektrik_tuketim_kwh', 'profil_boya_makinesi_elektrik_tuketim_kwh', 'profil_dogalgaz_tuketim_stn_m3',
        'profil_boya_tuketim', 'flans_ad_tl', 'vida_ad_tl', 'klips_ad_tl', 'dubel_ad_tl', 'kapak_ad_tl',
        'profil_en1', 'profil_en2', 'profil_et_kalinligi'].forEach(field => {
          if (!profilDegiskenler[field]) {
            emptyFields.push(`Profil Değişkenleri: ${field}`);
          }
        });

      // Boş alanlar varsa kullanıcıya sor
      if (emptyFields.length > 0) {
        const emptyFieldsList = emptyFields.join('\n');
        const confirmEmptyFields = window.confirm(
          `Aşağıdaki alanlar boş bırakılmıştır:\n${emptyFieldsList}\n\nBu değerler olmadan hesaplama yapılamayabilir. Devam etmek istiyor musunuz?`
        );

        if (!confirmEmptyFields) {
          setCalculating(false);
          return;
        }
      }

      // Performans iyileştirmesi: önce tüm hesaplamaları hafızada yap
      // Sonuç olarak elde edilen değerleri birleştirip tek bir db işleminde kaydet

      // Geçici hesaplar ve maliyet listesi içindeki veriler
      const geciciHesaplarData = [];
      const maliyetListesiData = [];

      // Hesaplamaları client-side olarak yap
      const results = performClientSideCalculations(panelsToCalculate);

      geciciHesaplarData.push(...results.geciciHesaplar);
      maliyetListesiData.push(...results.maliyetListesi);

      // Satış listesini oluştur
      const satisListesiData = generateSalesList(maliyetListesiData);

      // Geçici hesapları ve maliyet listesini güncelle
      setGeciciHesaplar(geciciHesaplarData);
      setMaliyetListesi(maliyetListesiData);
      setSatisListesi(satisListesiData);

      // Veritabanını temizle ve yeni verileri kaydet (opsiyonel)
      // Bu kısmı asenkron olarak arkaplanda yapalım, UI bekletmeden sonuçları gösterelim
      saveToDatabaseAsync(geciciHesaplarData, maliyetListesiData);

      // Sonuçlar sayfasına geç
      setShowResults(true);
      setActiveTab('results');
    } catch (error) {
      console.error('Hesaplama hatası:', error);
      alert('Hesaplama sırasında hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setCalculating(false);
    }
  };

  // Veritabanına asenkron kaydetme - FIXED error handling
  const saveToDatabaseAsync = async (geciciHesaplarData, maliyetListesiData) => {
    try {
      // Önce geçici hesaplar tablosunu temizle
      await axios.delete(`${API_URLS.geciciHesaplar}/all`);
      console.log('Gecici Hesaplar Silindi');

      // Maliyet listesini temizle
      await axios.delete(`${API_URLS.maliyetListesi}/all`);
      console.log('Maliyet Listesi Silindi');

      // Statik değişkenleri kaydet
      const staticVars = calculateStaticVars();
      await axios.post(API_URLS.statikDegiskenler, staticVars);

      // Veritabanı performansı için batch işlemler kullan
      const batchSize = 50; // Her batch'te kaç kayıt işlenecek

      // Geçici hesapları batch olarak kaydet
      for (let i = 0; i < geciciHesaplarData.length; i += batchSize) {
        const batch = geciciHesaplarData.slice(i, i + batchSize);
        const promises = batch.map(hesap => axios.post(API_URLS.geciciHesaplar, hesap));
        await Promise.all(promises);
      }

      // Maliyet listesini batch olarak kaydet
      for (let i = 0; i < maliyetListesiData.length; i += batchSize) {
        const batch = maliyetListesiData.slice(i, i + batchSize);
        const promises = batch.map(maliyet => axios.post(API_URLS.maliyetListesi, maliyet));
        await Promise.all(promises);
      }

      console.log('Tüm veriler veritabanına başarıyla kaydedildi');
    } catch (error) {
      console.error('Veritabanına kaydetme hatası:', error);
      // Hata olsa bile kullanıcı arayüzünü etkilememesi için burada hata göstermiyoruz
    }
  };

  // Statik değişkenleri hesapla
  const calculateStaticVars = () => {
    const usdTl = safeParseFloat(genelDegiskenler.usd_tl, 1);
    const eurUsd = safeParseFloat(genelDegiskenler.eur_usd, 1);

    const boyaFiyatiUSD = safeParseFloat(genelDegiskenler.boya_fiyati_kg_eur) / eurUsd;
    const elektrikFiyatiUSD = safeParseFloat(genelDegiskenler.elektrik_fiyati_kw_tl) / usdTl;
    const dogalgazFiyatiUSD = safeParseFloat(genelDegiskenler.dogalgaz_fiyati_stn_m3_tl) / usdTl;
    const ortalamaIsciMaasiUSD = safeParseFloat(genelDegiskenler.ort_isci_maasi) / usdTl;

    // Profil fiyatları
    const flansUSD = safeParseFloat(profilDegiskenler.flans_ad_tl) / usdTl;
    const vidaUSD = safeParseFloat(profilDegiskenler.vida_ad_tl) / usdTl;
    const klipsUSD = safeParseFloat(profilDegiskenler.klips_ad_tl) / usdTl;
    const dubelUSD = safeParseFloat(profilDegiskenler.dubel_ad_tl) / usdTl;
    const kapakUSD = safeParseFloat(profilDegiskenler.kapak_ad_tl) / usdTl;

    return {
      boya_kg_usd: boyaFiyatiUSD,
      elektrik_kw_usd: elektrikFiyatiUSD,
      dogalgaz_m3_usd: dogalgazFiyatiUSD,
      ort_isci_maasi_usd: ortalamaIsciMaasiUSD,
      flans_usd: flansUSD,
      vida_usd: vidaUSD,
      klips_usd: klipsUSD,
      dubel_usd: dubelUSD,
      kapak_usd: kapakUSD
    };
  };

  // Client-side hesaplamalar - veritabanı ihtiyacını ortadan kaldırarak performansı artırır
  const performClientSideCalculations = (panelsToCalculate) => {
    // Sonuç arrayleri
    const geciciHesaplar = [];
    const maliyetListesi = [];

    // Döviz kurları
    const usdTl = safeParseFloat(genelDegiskenler.usd_tl, 1);
    const eurUsd = safeParseFloat(genelDegiskenler.eur_usd, 1);

    // Genel değerler
    const boyaFiyatiUSD = safeParseFloat(genelDegiskenler.boya_fiyati_kg_eur) / eurUsd;
    const elektrikFiyatiUSD = safeParseFloat(genelDegiskenler.elektrik_fiyati_kw_tl) / usdTl;
    const dogalgazFiyatiUSD = safeParseFloat(genelDegiskenler.dogalgaz_fiyati_stn_m3_tl) / usdTl;
    const amortismanUSD = safeParseFloat(genelDegiskenler.amortisman_diger_usd);
    const ortalamaIsciMaasiUSD = safeParseFloat(genelDegiskenler.ort_isci_maasi) / usdTl;

    // Panel değerleri
    const panelBoyaVardiya = safeParseFloat(panelCitDegiskenler.panel_boya_vardiya);
    const panelKesmeVardiya = safeParseFloat(panelCitDegiskenler.panel_kesme_vardiya);
    const galvanizliTel = safeParseFloat(panelCitDegiskenler.galvanizli_tel_ton_usd);
    const panelKaynakElektrik = safeParseFloat(panelCitDegiskenler.panel_kaynak_makinesi_elektrik_tuketim_kwh);
    const panelKesmeElektrik = safeParseFloat(panelCitDegiskenler.panel_kesme_elektrik_tuketim_kwh);
    const panelBoyaElektrik = safeParseFloat(panelCitDegiskenler.panel_boya_makinesi_elektrik_tuketim_kwh);
    const panelDogalgazTuketim = safeParseFloat(panelCitDegiskenler.panel_dogalgaz_tuketim_stn_m3);
    const isciSayisiPanelKesme = safeParseFloat(panelCitDegiskenler.panel_kesme_isci_sayisi_ad);
    const isciSayisiPanelKaynak = safeParseFloat(panelCitDegiskenler.panel_kaynak_isci_sayisi_ad);
    const isciSayisiPanelBoya = safeParseFloat(panelCitDegiskenler.panel_boya_isci_sayisi_ad);
    const dpBoyaMetreKare = safeParseFloat(panelCitDegiskenler.dp_boya_tuketim_miktari);
    const spBoyaMetreKare = safeParseFloat(panelCitDegiskenler.sp_boya_tuketim_miktari);
    const guvenlikBoyaMetreKare = safeParseFloat(panelCitDegiskenler.guvenlik_boya_tuketim_miktari_gr);

    // Profil değerleri
    const profilEn1 = safeParseFloat(profilDegiskenler.profil_en1);
    const profilEn2 = safeParseFloat(profilDegiskenler.profil_en2);
    const profilBoyaTuketim = safeParseFloat(profilDegiskenler.profil_boya_tuketim);
    const profilEtKalinligi = safeParseFloat(profilDegiskenler.profil_et_kalinligi);
    const vardiyaProfil = safeParseFloat(profilDegiskenler.profil_vardiya);
    const profilOrtalama = safeParseFloat(profilDegiskenler.profil_uretim_kapasitesi_m2_h);
    const profilIsciSayisi = safeParseFloat(profilDegiskenler.profil_isci_sayisi_ad);
    const profilDogalgazKullanim = safeParseFloat(profilDegiskenler.profil_dogalgaz_tuketim_stn_m3);
    const profilBoyaElektrikKullanim = safeParseFloat(profilDegiskenler.profil_boya_makinesi_elektrik_tuketim_kwh);
    const profilKaynakElektrikTuketim = safeParseFloat(profilDegiskenler.profil_kaynak_makinesi_elektrik_tuketim_kwh);
    const profilKesmeElektrikTuketim = safeParseFloat(profilDegiskenler.profil_kesme_elektrik_tuketim_kwh);

    // Profil fiyatları
    const flansUSD = safeParseFloat(profilDegiskenler.flans_ad_tl) / usdTl;
    const vidaUSD = safeParseFloat(profilDegiskenler.vida_ad_tl) / usdTl;
    const klipsUSD = safeParseFloat(profilDegiskenler.klips_ad_tl) / usdTl;
    const dubelUSD = safeParseFloat(profilDegiskenler.dubel_ad_tl) / usdTl;
    const kapakUSD = safeParseFloat(profilDegiskenler.kapak_ad_tl) / usdTl;

    // Profil fiyatları
    const galvanizsizProfilFiyatKg = safeParseFloat(profilDegiskenler.galvanizsiz_profil_kg_usd) / 1000;
    const galvanizliProfilFiyatKg = safeParseFloat(profilDegiskenler.galvanizli_profil_kg_usd) / 1000;

    // Sabit parça sayıları
    const flansAdet = 1;
    const dubelAdet = 4;
    const kapakAdet = 1;

    // Her panel için hesaplama yap
    for (const panel of panelsToCalculate) {
      try {
        // Panel verilerini al
        const materialHeight = safeParseFloat(panel.panel_yuksekligi);
        const materialWidth = safeParseFloat(panel.panel_genisligi);
        const weightKg = safeParseFloat(panel.agirlik);
        const panelType = panel.panel_tipi || '';
        const panelKodu = panel.panel_kodu || '';
        const manualOrder = panel.manual_order || '';

        // Yüzey alanı hesapla
        const l1Metre = (materialHeight * materialWidth) / 10000;

        // Panel Kapasite hesapla
        let panelKapasite = 0;
        if (panelType === "Single" || panelType === "Ozel") {
          if (materialHeight <= 70) panelKapasite = l1Metre * 125;
          else if (materialHeight <= 100) panelKapasite = l1Metre * 125;
          else if (materialHeight <= 120) panelKapasite = l1Metre * 110;
          else if (materialHeight <= 150) panelKapasite = l1Metre * 100;
          else if (materialHeight <= 170) panelKapasite = l1Metre * 100;
          else if (materialHeight <= 200) panelKapasite = l1Metre * 90;
          else panelKapasite = l1Metre * 80;
        } else if (panelType === "Double") {
          if (materialHeight <= 63) panelKapasite = l1Metre * 30;
          else if (materialHeight <= 83) panelKapasite = l1Metre * 35;
          else if (materialHeight <= 103) panelKapasite = l1Metre * 60;
          else if (materialHeight <= 123) panelKapasite = l1Metre * 60;
          else if (materialHeight <= 143) panelKapasite = l1Metre * 50;
          else if (materialHeight <= 163) panelKapasite = l1Metre * 50;
          else if (materialHeight <= 183) panelKapasite = l1Metre * 45;
          else if (materialHeight <= 203) panelKapasite = l1Metre * 45;
          else if (materialHeight <= 223) panelKapasite = l1Metre * 40;
          else if (materialHeight <= 243) panelKapasite = l1Metre * 40;
          else panelKapasite = l1Metre * 35;
        } else if (panelType === "Guvenlik") {
          if (materialHeight <= 63) panelKapasite = l1Metre * 20;
          else if (materialHeight <= 83) panelKapasite = l1Metre * 25;
          else if (materialHeight <= 103) panelKapasite = l1Metre * 30;
          else if (materialHeight <= 123) panelKapasite = l1Metre * 35;
          else if (materialHeight <= 143) panelKapasite = l1Metre * 40;
          else if (materialHeight <= 163) panelKapasite = l1Metre * 45;
          else if (materialHeight <= 183) panelKapasite = l1Metre * 40;
          else if (materialHeight <= 203) panelKapasite = l1Metre * 35;
          else if (materialHeight <= 223) panelKapasite = l1Metre * 30;
          else if (materialHeight <= 243) panelKapasite = l1Metre * 25;
          else panelKapasite = l1Metre * 25;
        }

        // Boya Kapasite hesapla
        let boyaKapasite = 0;
        if (panelType === "Single" || panelType === "Ozel") {
          if (materialHeight <= 70) boyaKapasite = 525;
          else if (materialHeight <= 100) boyaKapasite = 750;
          else if (materialHeight <= 120) boyaKapasite = 600;
          else if (materialHeight <= 150) boyaKapasite = 750;
          else if (materialHeight <= 170) boyaKapasite = 850;
          else if (materialHeight <= 200) boyaKapasite = 750;
          else boyaKapasite = 600;
        } else if (panelType === "Double") {
          if (materialHeight <= 63) boyaKapasite = 709;
          else if (materialHeight <= 83) boyaKapasite = 934;
          else if (materialHeight <= 103) boyaKapasite = 1159;
          else if (materialHeight <= 123) boyaKapasite = 923;
          else if (materialHeight <= 143) boyaKapasite = 1073;
          else if (materialHeight <= 163) boyaKapasite = 1223;
          else if (materialHeight <= 183) boyaKapasite = 1052;
          else if (materialHeight <= 203) boyaKapasite = 1167;
          else if (materialHeight <= 223) boyaKapasite = 1115;
          else if (materialHeight <= 243) boyaKapasite = 1215;
          else boyaKapasite = 1000;
        } else if (panelType === "Guvenlik") {
          if (materialHeight <= 63) boyaKapasite = 709;
          else if (materialHeight <= 83) boyaKapasite = 934;
          else if (materialHeight <= 103) boyaKapasite = 1159;
          else if (materialHeight <= 123) boyaKapasite = 923;
          else if (materialHeight <= 143) boyaKapasite = 1073;
          else if (materialHeight <= 163) boyaKapasite = 1223;
          else if (materialHeight <= 183) boyaKapasite = 1052;
          else if (materialHeight <= 203) boyaKapasite = 1167;
          else if (materialHeight <= 223) boyaKapasite = 1115;
          else if (materialHeight <= 243) boyaKapasite = 1215;
          else if (materialHeight <= 263) boyaKapasite = 1115;
          else if (materialHeight <= 283) boyaKapasite = 1015;
          else if (materialHeight <= 303) boyaKapasite = 915;
          else boyaKapasite = 1000;
        }

        // Kapasiteleri hesapla
        // Google Sheets'teki formüllerle tam uyum için aşağıdaki formüller kullanılır:
        const yalnizPanelAylikKapasite = ((panelBoyaVardiya + panelKesmeVardiya) / 2) * 26 * 7 * panelKapasite;
        const boyaAylikKapasite = panelBoyaVardiya * 26 * 7 * boyaKapasite;

        // Profil kapasitesini hesapla
        const profilKapasiteAd = profilOrtalama * 26 * 7 * vardiyaProfil;
        const profilAylikKapasite = profilKapasiteAd;

        // Elektrik maliyetlerini hesapla
        const panelKaynakElektrikM2 = (elektrikFiyatiUSD * panelKaynakElektrik) / panelKapasite;
        const panelKesmeElektrikM2 = (elektrikFiyatiUSD * panelKesmeElektrik) / panelKapasite;
        const panelBoyaElektrikM2 = (elektrikFiyatiUSD * panelBoyaElektrik) / boyaKapasite;

        // Doğalgaz ve diğer maliyetleri hesapla
        const digerM2 = amortismanUSD / panelKapasite;
        const panelDogalgazM2 = (dogalgazFiyatiUSD * panelDogalgazTuketim) / panelKapasite;

        // İşçi maliyetlerini hesapla - Google Sheets'teki formüllere tam uygun
        const yalnizPanelIsciM2 = (ortalamaIsciMaasiUSD * (isciSayisiPanelKesme + isciSayisiPanelKaynak)) / yalnizPanelAylikKapasite;
        const panelBoyaIsciM2 = (ortalamaIsciMaasiUSD * isciSayisiPanelBoya) / boyaAylikKapasite;

        // Malzeme maliyetlerini hesapla
        const galvanizTelKg = galvanizliTel / 1000;

        // Boya maliyetlerini hesapla
        const dpBoyaM2 = (boyaFiyatiUSD / 1000) * dpBoyaMetreKare;
        const spBoyaM2 = (boyaFiyatiUSD / 1000) * spBoyaMetreKare;
        const guvenlikBoyaM2 = (boyaFiyatiUSD / 1000) * guvenlikBoyaMetreKare;

        // Profil maliyetlerini hesapla
        const profilBoyaTuketimAdUSD = ((2 * profilEn1 + 2 * profilEn2) * materialHeight / 10000) *
          profilBoyaTuketim * (boyaFiyatiUSD / 1000);

        const profilElektrikKesmeAd = (profilKesmeElektrikTuketim / (1000 / 7)) * elektrikFiyatiUSD;
        const profilElektrikKaynakAd = (profilKaynakElektrikTuketim / (450 / 7)) * elektrikFiyatiUSD;

        const profilIsciUretimAd = (ortalamaIsciMaasiUSD * profilIsciSayisi) / profilAylikKapasite;

        // Vida/klips adetlerini hesapla
        let vidaAdet = 2;
        let klipsAdet = 2;

        const adjustedHeight = Math.min(200, Math.max(60, Math.round(materialHeight / 10) * 10));

        if (adjustedHeight > 100) {
          vidaAdet = klipsAdet = 3;
        } else if (adjustedHeight > 150) {
          vidaAdet = klipsAdet = 4;
        }

        // Hammadde maliyetini hesapla
        const profilHammaddeToplamAd = (flansAdet * flansUSD) +
          (vidaAdet * vidaUSD) +
          (klipsAdet * klipsUSD) +
          (dubelAdet * dubelUSD) +
          (kapakAdet * kapakUSD);

        // Üretim kapasitesini hesapla
        let profilSaatlikUretimKapasitesi = 0;
        let roundedHeight = materialHeight;

        if (roundedHeight <= 40) {
          roundedHeight = 40;
        } else if (roundedHeight > 220) {
          roundedHeight = 220;
        } else {
          roundedHeight = (roundedHeight % 10 <= 5) ?
            roundedHeight - (roundedHeight % 10) :
            roundedHeight + (10 - (roundedHeight % 10));
        }

        const heightProductionMap = {
          40: 2280, 50: 2280, 60: 2280,
          70: 1520, 100: 1520,
          120: 760, 150: 760, 170: 760, 200: 760, 220: 760
        };

        profilSaatlikUretimKapasitesi = heightProductionMap[roundedHeight] || 760;

        // Tüketim oranlarını hesapla
        const profilDogalgazTuketimOran = profilDogalgazKullanim / profilSaatlikUretimKapasitesi;
        const profilBoyaElektrikTuketimOran = profilBoyaElektrikKullanim / profilSaatlikUretimKapasitesi;

        // Adet maliyetlerini hesapla
        const adetUSD = (l1Metre * (yalnizPanelIsciM2 + panelKaynakElektrikM2 + panelKesmeElektrikM2 + digerM2)) +
          (weightKg * galvanizTelKg);

        // Boya maliyetlerini hesapla
        let boyam2;
        if (panelType === "Double") {
          boyam2 = dpBoyaM2;
        } else if (panelType === "Guvenlik") {
          boyam2 = guvenlikBoyaM2;
        } else {
          boyam2 = spBoyaM2; // Single ve Özel için
        }

        const boyaAdetUSD = (boyam2 * l1Metre) +
          (panelBoyaElektrikM2 * l1Metre) +
          (panelDogalgazM2 * l1Metre) +
          (panelBoyaIsciM2 * l1Metre);

        // Son maliyetleri hesapla
        const boyaliAdetUSD = adetUSD + boyaAdetUSD;
        const profilAgirlik = ((2 * profilEn1 + 2 * profilEn2 + 2 * materialHeight) * profilEtKalinligi * 7.85) / 1000;

        // SetUSD hesapla
        const SetUSD = profilBoyaTuketimAdUSD +
          profilElektrikKesmeAd +
          profilElektrikKaynakAd +
          profilIsciUretimAd +
          profilHammaddeToplamAd +
          (galvanizsizProfilFiyatKg * profilAgirlik) +
          profilDogalgazTuketimOran +
          profilBoyaElektrikTuketimOran;

        // Geçici hesap verilerini hazırla
        const geciciHesap = {
          panel_kapasite: Number(panelKapasite || 0),
          yalniz_panel_aylik: Number(yalnizPanelAylikKapasite || 0),
          panel_kaynak_elektrik: Number(panelKaynakElektrikM2 || 0),
          panel_kesme_elektrik: Number(panelKesmeElektrikM2 || 0),
          diger_m2: Number(digerM2 || 0),
          yalniz_panel_isci_m2: Number(yalnizPanelIsciM2 || 0),
          galvaniz_tel_kg: Number(galvanizTelKg || 0),
          boya_kapasite: Number(boyaKapasite || 0),
          boya_aylik_kapasite: Number(boyaAylikKapasite || 0),
          panel_boya_elektrik: Number(panelBoyaElektrikM2 || 0),
          panel_dogalgaz_m2: Number(panelDogalgazM2 || 0),
          panel_boya_isci_m2: Number(panelBoyaIsciM2 || 0),
          dp_boya_m2: Number(dpBoyaM2 || 0),
          sp_boya_m2: Number(spBoyaM2 || 0),
          profil_kapasite_ad: Number(profilKapasiteAd || 0),
          profil_aylik_kapasite: Number(profilAylikKapasite || 0),
          profil_boya_tuketim: Number(profilBoyaTuketimAdUSD || 0),
          profil_elektrik_kesme_ad: Number(profilElektrikKesmeAd || 0),
          profil_elektrik_kaynak_ad: Number(profilElektrikKaynakAd || 0),
          profil_isci_uretim_ad: Number(profilIsciUretimAd || 0),
          profil_hammadde_toplam: Number(profilHammaddeToplamAd || 0),
          galvanizsiz_profil_fiyat_kg: Number(galvanizsizProfilFiyatKg || 0),
          galvanizli_profil_fiyat_kg: Number(galvanizliProfilFiyatKg || 0),
          profil_dogalgaz_tuketim: Number(profilDogalgazTuketimOran || 0),
          profil_boya_elk_tuketim: Number(profilBoyaElektrikTuketimOran || 0),
          adet_usd: Number(adetUSD || 0),
          boyam2: Number(boyam2 || 0),
          boya_adet_usd: Number(boyaAdetUSD || 0),
          boyali_adet_usd: Number(boyaliAdetUSD || 0),
          manual_order: manualOrder,
          panel_kodu: panelKodu,
          profil_yukseklik: Number(materialHeight || 0),
          profil_agirlik: Number(profilAgirlik || 0),
          flans_adet: Number(flansAdet || 0),
          vida_adet: Number(vidaAdet || 0),
          klips_adet: Number(klipsAdet || 0),
          dubel_adet: Number(dubelAdet || 0),
          kapak_adet: Number(kapakAdet || 0),
          profil_saatlik_uretim: Number(profilSaatlikUretimKapasitesi || 0),
          panel_adet_m2: Number(l1Metre || 0),
          panel_adet_agirlik: Number(weightKg || 0),
        };

        // Maliyetleri hesapla
        const maliyet = {
          manual_order: manualOrder,
          panel_kodu: panelKodu,

          // Çıplak Adet hesaplamaları
          ciplak_adet_usd: Number(adetUSD || 0),
          ciplak_adet_eur: Number((adetUSD / eurUsd) || 0), // FIXED: * to /
          ciplak_adet_try: Number((adetUSD * usdTl) || 0),

          // Çıplak M2 hesaplamaları
          ciplak_m2_usd: l1Metre > 0 ? Number((adetUSD / l1Metre) || 0) : 0,
          ciplak_m2_eur: l1Metre > 0 ? Number(((adetUSD / l1Metre) / eurUsd) || 0) : 0, // FIXED: * to /
          ciplak_m2_try: l1Metre > 0 ? Number(((adetUSD / l1Metre) * usdTl) || 0) : 0,

          // Çıplak Kg hesaplamaları
          ciplak_kg_usd: weightKg > 0 ? Number((adetUSD / weightKg) || 0) : 0,
          ciplak_kg_eur: weightKg > 0 ? Number(((adetUSD / weightKg) / eurUsd) || 0) : 0, // FIXED: * to /
          ciplak_kg_try: weightKg > 0 ? Number(((adetUSD / weightKg) * usdTl) || 0) : 0,

          // Boyalı Adet hesaplamaları
          boyali_adet_usd: Number(boyaliAdetUSD || 0),
          boyali_adet_eur: Number((boyaliAdetUSD / eurUsd) || 0), // FIXED: * to /
          boyali_adet_try: Number((boyaliAdetUSD * usdTl) || 0),

          // Boyalı M2 hesaplamaları
          boyali_m2_usd: l1Metre > 0 ? Number((boyaliAdetUSD / l1Metre) || 0) : 0,
          boyali_m2_eur: l1Metre > 0 ? Number(((boyaliAdetUSD / l1Metre) / eurUsd) || 0) : 0, // FIXED: * to /
          boyali_m2_try: l1Metre > 0 ? Number(((boyaliAdetUSD / l1Metre) * usdTl) || 0) : 0,

          // Boyalı Kg hesaplamaları
          boyali_kg_usd: weightKg > 0 ? Number((boyaliAdetUSD / weightKg) || 0) : 0,
          boyali_kg_eur: weightKg > 0 ? Number(((boyaliAdetUSD / weightKg) / eurUsd) || 0) : 0, // FIXED: * to /
          boyali_kg_try: weightKg > 0 ? Number(((boyaliAdetUSD / weightKg) * usdTl) || 0) : 0,

          // Standart Setli + Boyasız Adet hesaplamaları
          standart_setli_boyasiz_adet_usd: Number((adetUSD + SetUSD) || 0),
          standart_setli_boyasiz_adet_eur: Number(((adetUSD + SetUSD) / eurUsd) || 0), // FIXED: * to /
          standart_setli_boyasiz_adet_try: Number(((adetUSD + SetUSD) * usdTl) || 0),

          // Standart Setli + Boyasız M2 hesaplamaları
          standart_setli_boyasiz_m2_usd: l1Metre > 0 ? Number(((adetUSD + SetUSD) / l1Metre) || 0) : 0,
          standart_setli_boyasiz_m2_eur: l1Metre > 0 ? Number((((adetUSD + SetUSD) / l1Metre) / eurUsd) || 0) : 0, // FIXED: * to /
          standart_setli_boyasiz_m2_try: l1Metre > 0 ? Number((((adetUSD + SetUSD) / l1Metre) * usdTl) || 0) : 0,

          // Standart Setli + Boyasız Kg hesaplamaları
          standart_setli_boyasiz_kg_usd: weightKg > 0 ? Number(((adetUSD + SetUSD) / weightKg) || 0) : 0,
          standart_setli_boyasiz_kg_eur: weightKg > 0 ? Number((((adetUSD + SetUSD) / weightKg) / eurUsd) || 0) : 0, // FIXED: * to /
          standart_setli_boyasiz_kg_try: weightKg > 0 ? Number((((adetUSD + SetUSD) / weightKg) * usdTl) || 0) : 0,

          // Standart Setli + Boyalı Adet hesaplamaları
          standart_setli_boyali_adet_usd: Number((boyaliAdetUSD + SetUSD) || 0),
          standart_setli_boyali_adet_eur: Number(((boyaliAdetUSD + SetUSD) / eurUsd) || 0), // FIXED: * to /
          standart_setli_boyali_adet_try: Number(((boyaliAdetUSD + SetUSD) * usdTl) || 0),

          // Standart Setli + Boyalı M2 hesaplamaları
          standart_setli_boyali_m2_usd: l1Metre > 0 ? Number(((boyaliAdetUSD + SetUSD) / l1Metre) || 0) : 0,
          standart_setli_boyali_m2_eur: l1Metre > 0 ? Number((((boyaliAdetUSD + SetUSD) / l1Metre) / eurUsd) || 0) : 0, // FIXED: * to /
          standart_setli_boyali_m2_try: l1Metre > 0 ? Number((((boyaliAdetUSD + SetUSD) / l1Metre) * usdTl) || 0) : 0,

          // Standart Setli + Boyalı Kg hesaplamaları
          standart_setli_boyali_kg_usd: weightKg > 0 ? Number(((boyaliAdetUSD + SetUSD) / weightKg) || 0) : 0,
          standart_setli_boyali_kg_eur: weightKg > 0 ? Number((((boyaliAdetUSD + SetUSD) / weightKg) / eurUsd) || 0) : 0, // FIXED: * to /
          standart_setli_boyali_kg_try: weightKg > 0 ? Number((((boyaliAdetUSD + SetUSD) / weightKg) * usdTl) || 0) : 0,

          // Ek panel bilgileri
          panel_tipi: panelType,
          panel_yuksekligi: materialHeight,
          panel_genisligi: materialWidth,
          dikey_tel_capi: panel.dikey_tel_capi,
          yatay_tel_capi: panel.yatay_tel_capi,
          dikey_goz_araligi: panel.dikey_goz_araligi,
          yatay_goz_araligi: panel.yatay_goz_araligi
        };

        // Sonuçları arraylere ekle
        geciciHesaplar.push(geciciHesap);
        maliyetListesi.push(maliyet);
      } catch (error) {
        console.error(`Hesaplama hatası (${panel.panel_kodu}):`, error);
        // Tek bir panel hatası için tüm işlemi durdurmak yerine, devam et
      }
    }

    return { geciciHesaplar, maliyetListesi };
  };

  // Satış listesi oluşturma fonksiyonu - güncellenmiş versiyon
  const generateSalesList = (maliyetListesi) => {
    const salesList = maliyetListesi.map(item => {
      // Her bir fiyat tipi için hesaplama yap
      return {
        ...item,
        bronze_usd: calculatePricesWithMargin(item, 'bronze', salesFilter.unit, 'usd'),
        bronze_eur: calculatePricesWithMargin(item, 'bronze', salesFilter.unit, 'eur'),
        bronze_try: calculatePricesWithMargin(item, 'bronze', salesFilter.unit, 'try'),
        silver_usd: calculatePricesWithMargin(item, 'silver', salesFilter.unit, 'usd'),
        silver_eur: calculatePricesWithMargin(item, 'silver', salesFilter.unit, 'eur'),
        silver_try: calculatePricesWithMargin(item, 'silver', salesFilter.unit, 'try'),
        gold_usd: calculatePricesWithMargin(item, 'gold', salesFilter.unit, 'usd'),
        gold_eur: calculatePricesWithMargin(item, 'gold', salesFilter.unit, 'eur'),
        gold_try: calculatePricesWithMargin(item, 'gold', salesFilter.unit, 'try')
      };
    });

    return salesList;
  };

  // Genel değişkenleri güncelleme - FIXED with better error handling
  const updateGenelDegiskenler = async () => {
    try {
      // Log the current state to see what we're working with
      console.log("Current genelDegiskenler state:", genelDegiskenler);

      // Veriyi kaydetmek için işle ve hazırla (sadece veritabanındaki alanları içerecek şekilde)
      const processedData = {
        boya_fiyati_kg_eur: safeParseFloat(genelDegiskenler.boya_fiyati_kg_eur),
        elektrik_fiyati_kw_tl: safeParseFloat(genelDegiskenler.elektrik_fiyati_kw_tl),
        dogalgaz_fiyati_stn_m3_tl: safeParseFloat(genelDegiskenler.dogalgaz_fiyati_stn_m3_tl),
        amortisman_diger_usd: safeParseFloat(genelDegiskenler.amortisman_diger_usd),
        kar_toplama_ek_percent: safeParseFloat(genelDegiskenler.kar_toplama_ek_percent),
        ort_isci_maasi: safeParseFloat(genelDegiskenler.ort_isci_maasi),
        genel_latest_update: new Date().toISOString()
      };

      console.log('Kaydedilecek genel veriler:', processedData);

      // Replace any NaN values with null to avoid server errors
      Object.keys(processedData).forEach(key => {
        if (key !== 'genel_latest_update' && (
          processedData[key] === undefined ||
          processedData[key] === '' ||
          Number.isNaN(processedData[key])
        )) {
          processedData[key] = null;
        }
      });

      console.log('NaN değerleri temizlenmiş veri:', processedData);

      // Her zaman yeni bir kayıt oluştur
      const response = await axios.post(API_URLS.genelDegiskenler, processedData);

      if (response.status === 200 || response.status === 201) {
        alert('Genel değişkenler başarıyla kaydedildi.');
        // En son kaydı getirmek için verileri yeniden çek
        fetchSectionData('genel');
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);

      // More detailed error logging
      if (error.response) {
        console.error('Server response data:', error.response.data);
        console.error('Server response status:', error.response.status);
        console.error('Server response headers:', error.response.headers);
      }

      alert(`Değişkenler kaydedilirken hata oluştu: ${error.response?.data?.message || error.message}`);
    }
  };

  // Panel Çit Değişkenlerini Güncelleme - FIXED to always add new row and fetch latest
  const updatePanelCitDegiskenler = async () => {
    try {
      // Veriyi kaydetmek için işle ve hazırla (sadece veritabanındaki alanları içerecek şekilde)
      const processedData = {
        galvanizli_tel_ton_usd: safeParseFloat(panelCitDegiskenler.galvanizli_tel_ton_usd),
        hurda_ton_usd: safeParseFloat(panelCitDegiskenler.hurda_ton_usd),
        panel_boya_isci_sayisi_ad: safeParseFloat(panelCitDegiskenler.panel_boya_isci_sayisi_ad),
        panel_boya_vardiya: safeParseFloat(panelCitDegiskenler.panel_boya_vardiya),
        panel_kaynak_isci_sayisi_ad: safeParseFloat(panelCitDegiskenler.panel_kaynak_isci_sayisi_ad),
        panel_kaynak_vardiya: safeParseFloat(panelCitDegiskenler.panel_kaynak_vardiya),
        panel_kesme_isci_sayisi_ad: safeParseFloat(panelCitDegiskenler.panel_kesme_isci_sayisi_ad),
        panel_kesme_vardiya: safeParseFloat(panelCitDegiskenler.panel_kesme_vardiya),
        panel_palet_isci_sayisi_ad: safeParseFloat(panelCitDegiskenler.panel_palet_isci_sayisi_ad),
        panel_palet_vardiya: safeParseFloat(panelCitDegiskenler.panel_palet_vardiya),
        sp_boya_tuketim_miktari: safeParseFloat(panelCitDegiskenler.sp_boya_tuketim_miktari),
        dp_boya_tuketim_miktari: safeParseFloat(panelCitDegiskenler.dp_boya_tuketim_miktari),
        guvenlik_boya_tuketim_miktari_gr: safeParseFloat(panelCitDegiskenler.guvenlik_boya_tuketim_miktari_gr),
        panel_kaynak_makinesi_elektrik_tuketim_kwh: safeParseFloat(panelCitDegiskenler.panel_kaynak_makinesi_elektrik_tuketim_kwh),
        panel_kesme_elektrik_tuketim_kwh: safeParseFloat(panelCitDegiskenler.panel_kesme_elektrik_tuketim_kwh),
        panel_boya_makinesi_elektrik_tuketim_kwh: safeParseFloat(panelCitDegiskenler.panel_boya_makinesi_elektrik_tuketim_kwh),
        panel_dogalgaz_tuketim_stn_m3: safeParseFloat(panelCitDegiskenler.panel_dogalgaz_tuketim_stn_m3),
        panel_cit_latest_update: new Date().toISOString()
      };

      // Her zaman yeni bir kayıt oluştur (unique_key gönderme)
      const response = await axios.post(API_URLS.panelCitDegiskenler, processedData);

      if (response.status === 200 || response.status === 201) {
        alert('Panel çit değişkenleri başarıyla kaydedildi.');
        // En son kaydı getirmek için verileri yeniden çek
        fetchSectionData('panelCit');
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert(`Değişkenler kaydedilirken hata oluştu: ${error.response?.data?.message || error.message}`);
    }
  };

  // Profil Değişkenlerini Güncelleme - FIXED to always add new row and fetch latest
  const updateProfilDegiskenler = async () => {
    try {
      // Veriyi kaydetmek için işle ve hazırla (sadece veritabanındaki alanları içerecek şekilde)
      const processedData = {
        galvanizli_profil_kg_usd: safeParseFloat(profilDegiskenler.galvanizli_profil_kg_usd),
        galvanizsiz_profil_kg_usd: safeParseFloat(profilDegiskenler.galvanizsiz_profil_kg_usd),
        profil_uretim_kapasitesi_m2_h: safeParseFloat(profilDegiskenler.profil_uretim_kapasitesi_m2_h),
        profil_isci_sayisi_ad: safeParseFloat(profilDegiskenler.profil_isci_sayisi_ad),
        profil_vardiya: safeParseFloat(profilDegiskenler.profil_vardiya),
        profil_kaynak_makinesi_elektrik_tuketim_kwh: safeParseFloat(profilDegiskenler.profil_kaynak_makinesi_elektrik_tuketim_kwh),
        profil_kesme_elektrik_tuketim_kwh: safeParseFloat(profilDegiskenler.profil_kesme_elektrik_tuketim_kwh),
        profil_boya_makinesi_elektrik_tuketim_kwh: safeParseFloat(profilDegiskenler.profil_boya_makinesi_elektrik_tuketim_kwh),
        profil_dogalgaz_tuketim_stn_m3: safeParseFloat(profilDegiskenler.profil_dogalgaz_tuketim_stn_m3),
        profil_boya_tuketim: safeParseFloat(profilDegiskenler.profil_boya_tuketim),
        flans_ad_tl: safeParseFloat(profilDegiskenler.flans_ad_tl),
        vida_ad_tl: safeParseFloat(profilDegiskenler.vida_ad_tl),
        klips_ad_tl: safeParseFloat(profilDegiskenler.klips_ad_tl),
        dubel_ad_tl: safeParseFloat(profilDegiskenler.dubel_ad_tl),
        kapak_ad_tl: safeParseFloat(profilDegiskenler.kapak_ad_tl),
        profil_en1: safeParseFloat(profilDegiskenler.profil_en1),
        profil_en2: safeParseFloat(profilDegiskenler.profil_en2),
        profil_et_kalinligi: safeParseFloat(profilDegiskenler.profil_et_kalinligi),
        profil_latest_update: new Date().toISOString()
      };

      // Her zaman yeni bir kayıt oluştur (id gönderme)
      const response = await axios.post(API_URLS.profilDegiskenler, processedData);

      if (response.status === 200 || response.status === 201) {
        alert('Profil değişkenleri başarıyla kaydedildi.');
        // En son kaydı getirmek için verileri yeniden çek
        fetchSectionData('profil');
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert(`Değişkenler kaydedilirken hata oluştu: ${error.response?.data?.message || error.message}`);
    }
  };
  // Özel panel ekleme - formüller tamamen iyileştirildi
  const addOzelPanel = () => {
    const newPanel = {
      manual_order: '',
      panel_tipi: 'Single',
      panel_kodu: '',
      panel_yuksekligi: 200,
      panel_genisligi: 250,
      dikey_tel_capi: 4.0,
      yatay_tel_capi: 4.0,
      dikey_goz_araligi: 20,
      yatay_goz_araligi: 5,
      dikey_cubuk_adet: 0,
      yatay_cubuk_adet: 0,
      adet_m2: 0,
      agirlik: 0,
      bukum_sayisi: 0,
      bukumdeki_cubuk_sayisi: 1,
      isNew: true,
      id: Date.now(),
      // Yeni palet bilgileri alanları
      boyali_hali: 0,
      boya_kg: 0,
      m2_agirlik: 0,
      paletteki_panel_sayisi: 0,
      palet_bos_agirlik: 0,
      paletsiz_toplam_agirlik: 0,
      palet_dolu_agirlik: 0,
      bos_palet_yuksekligi: 0,
      adet_panel_yuksekligi: 0,
      paletsiz_toplam_panel_yuksekligi: 0,
      paletli_yukseklik: 0,
      icube_code: '',
      icube_code_adetli: '',
      stok_kodu: '' // STOK KODU placeholder for future implementation
    };

    // Panel değerlerini hesapla ve güncelle
    const updatedPanel = calculatePanelValues(newPanel);

    setOzelPanelList(prev => [...prev, updatedPanel]);
  };

  // Özel panel değerlerini hesaplama - Excel formülleri tam implementasyonu
  const calculatePanelValues = (panel) => {
    const updatedPanel = { ...panel };

    const panel_yuksekligi = safeParseFloat(updatedPanel.panel_yuksekligi);
    const panel_genisligi = safeParseFloat(updatedPanel.panel_genisligi);

    // Adet m2 hesaplama: =(B2*C2/10000)
    updatedPanel.adet_m2 = (panel_yuksekligi * panel_genisligi / 10000);

    // Büküm sayısı hesaplama
    // =EĞER(VE(D2="Single";B2>=100);YUVARLA(B2/50;0);EĞER(VE(D2="Single";B2<100);TABANAYUVARLA((B2/50)+1;1);0))
    if (updatedPanel.panel_tipi === "Single") {
      if (panel_yuksekligi >= 100) {
        updatedPanel.bukum_sayisi = Math.round(panel_yuksekligi / 50);
      } else {
        updatedPanel.bukum_sayisi = Math.floor((panel_yuksekligi / 50) + 1);
      }
    } else {
      updatedPanel.bukum_sayisi = 0;
    }

    const bukum_sayisi = safeParseFloat(updatedPanel.bukum_sayisi);

    // Bükümdeki Çubuk Sayısı hesaplama
    // New logic as specified
    if (updatedPanel.panel_tipi === "Double") {
      updatedPanel.bukumdeki_cubuk_sayisi = 0;
    } else if (updatedPanel.panel_tipi === "Single") {
      // For specific height series
      const seriesWithValue1 = [63, 83, 103, 123, 153, 173, 183, 203, 223, 243];
      const seriesWithValue2 = [50, 70, 100, 120, 150, 170, 200, 220];

      if (seriesWithValue1.includes(panel_yuksekligi)) {
        updatedPanel.bukumdeki_cubuk_sayisi = 1;
      } else if (seriesWithValue2.includes(panel_yuksekligi)) {
        updatedPanel.bukumdeki_cubuk_sayisi = 2;
      } else {
        updatedPanel.bukumdeki_cubuk_sayisi = 1; // Default
      }
    } else {
      updatedPanel.bukumdeki_cubuk_sayisi = 0;
    }

    // Set default values for göz aralığı if not provided
    if (!updatedPanel.dikey_goz_araligi) {
      if (updatedPanel.panel_tipi === "Double") {
        updatedPanel.dikey_goz_araligi = 20;
      } else if (updatedPanel.panel_tipi === "Single") {
        // Series-based defaults
        const seriesWithValue20 = [63, 83, 103, 123, 153, 173, 183, 203, 223, 243];
        const seriesWithValue15 = [50, 70, 100, 120, 150, 170, 200, 220];

        if (seriesWithValue20.includes(panel_yuksekligi)) {
          updatedPanel.dikey_goz_araligi = 20;
        } else if (seriesWithValue15.includes(panel_yuksekligi)) {
          updatedPanel.dikey_goz_araligi = 15;
        } else {
          updatedPanel.dikey_goz_araligi = 20; // Default
        }
      } else {
        updatedPanel.dikey_goz_araligi = 20; // Default for other types
      }
    }

    if (!updatedPanel.yatay_goz_araligi) {
      if (updatedPanel.panel_tipi === "Double") {
        updatedPanel.yatay_goz_araligi = 5;
      } else {
        updatedPanel.yatay_goz_araligi = 5; // Default for Single and other types
      }
    }

    // Dikey çubuk adet hesaplama - CORRECTED
    // =EĞER(M2<5.5;TAVANAYUVARLA(C2/M2;1)+1;EĞER(M2<6;TAVANAYUVARLA(C2/M2;1);TAVANAYUVARLA(C2/M2;1)+1))
    const yatay_goz = safeParseFloat(updatedPanel.yatay_goz_araligi);

    // Note: We're using YATAY göz aralığı for DIKEY çubuk calculation!
    if (yatay_goz < 5.5) {
      updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / yatay_goz) + 1;
    } else if (yatay_goz < 6) {
      updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / yatay_goz);
    } else {
      updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / yatay_goz) + 1;
    }

    // Yatay çubuk adet hesaplama - CORRECTED
    // =EĞER(D2="Double";(((B2-3)/L2)+1)*2;EĞER(VE(D2="Single";L2=20);((((B2-3)-(J2*10))/L2)+1)+(J2*2);EĞER(VE(D2="Single";L2=15;B2<200);YUVARLA(((B2/L2)+(J2*2));0);EĞER(VE(D2="Single";L2=15;B2>=200);TAVANAYUVARLA(((B2/L2)+(J2*2));1);"---"))))
    const dikey_goz = safeParseFloat(updatedPanel.dikey_goz_araligi);

    // Note: We're using DIKEY göz aralığı for YATAY çubuk calculation!
    if (updatedPanel.panel_tipi === "Double") {
      updatedPanel.yatay_cubuk_adet = (((panel_yuksekligi - 3) / dikey_goz) + 1) * 2;
    } else if (updatedPanel.panel_tipi === "Single" && dikey_goz === 20) {
      updatedPanel.yatay_cubuk_adet = ((((panel_yuksekligi - 3) - (bukum_sayisi * 10)) / dikey_goz) + 1) + (bukum_sayisi * 2);
    } else if (updatedPanel.panel_tipi === "Single" && dikey_goz === 15 && panel_yuksekligi < 200) {
      updatedPanel.yatay_cubuk_adet = Math.round(((panel_yuksekligi / dikey_goz) + (bukum_sayisi * 2)));
    } else if (updatedPanel.panel_tipi === "Single" && dikey_goz === 15 && panel_yuksekligi >= 200) {
      updatedPanel.yatay_cubuk_adet = Math.ceil(((panel_yuksekligi / dikey_goz) + (bukum_sayisi * 2)));
    } else if (updatedPanel.panel_tipi === "Single") {
      // For other Single panels with different dikey_goz values
      updatedPanel.yatay_cubuk_adet = Math.ceil(((panel_yuksekligi / dikey_goz) + (bukum_sayisi * 2)));
    } else if (updatedPanel.panel_tipi === "Guvenlik") {
      // For Security panels
      updatedPanel.yatay_cubuk_adet = Math.ceil(((panel_yuksekligi / dikey_goz) + (bukum_sayisi * 2)));
    } else {
      // Default fallback for other panel types
      updatedPanel.yatay_cubuk_adet = 0;
    }

    // Ağırlık hesaplama
    // =EĞER(D2="Double";((E2*E2*7.85*Pİ()/4000)*((B2/100)*N2))+((F2*F2*7.85*Pİ()/4000)*((C2+0.6)/100)*O2);EĞER(VE(D2="Single";L2=20);((E2*E2*7.85*Pİ()/4000)*((B2+(J2*2.1))/100)*N2)+((F2*F2*7.85*Pİ()/4000)*((C2+0.6)/100)*O2);EĞER(VE(D2="Single";L2=15);((E2*E2*7.85*Pİ()/4000)*((B2+(J2*2.6))/100)*N2)+((F2*F2*7.85*Pİ()/4000)*((C2+0.6)/100)*O2))))
    const dikey_tel = safeParseFloat(updatedPanel.dikey_tel_capi);
    const yatay_tel = safeParseFloat(updatedPanel.yatay_tel_capi);
    const dikey_cubuk = safeParseFloat(updatedPanel.dikey_cubuk_adet);
    const yatay_cubuk = safeParseFloat(updatedPanel.yatay_cubuk_adet);

    if (updatedPanel.panel_tipi === "Double") {
      // Double panel ağırlık hesaplaması
      updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi / 100) * dikey_cubuk)) +
        ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    } else if (updatedPanel.panel_tipi === "Single") {
      if (dikey_goz === 20) {
        // Single panel 20 göz aralığı için ağırlık hesaplaması
        updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) +
          ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      } else if (dikey_goz === 15) {
        // Single panel 15 göz aralığı için ağırlık hesaplaması
        updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.6)) / 100) * dikey_cubuk) +
          ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      } else {
        // Diğer Single panel tipleri için varsayılan hesaplama
        updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) +
          ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      }
    } else if (updatedPanel.panel_tipi === "Guvenlik") {
      // Güvenlik panel ağırlık hesaplaması
      updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) +
        ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    }

    // Boya kilogram hesaplama
    // =EĞER(G2=0;0;EĞER(D2="Double";I2*0.06;EĞER(D2="Single";I2*0.03;0)))
    updatedPanel.boya_kg = calculateBoyaKg(updatedPanel);

    // Boyalı Hali 
    // =P2+R2
    updatedPanel.boyali_hali = updatedPanel.agirlik + updatedPanel.boya_kg;

    // M² Ağırlık
    // =Q2/I2
    updatedPanel.m2_agirlik = updatedPanel.adet_m2 > 0 ? updatedPanel.boyali_hali / updatedPanel.adet_m2 : 0;

    // Paletteki panel sayısı
    // =EĞER(VE(D2="Double";F2>=7);25;EĞER(VE(D2="Double";F2<7);30;EĞER(D2="Single";100;0)))
    updatedPanel.paletteki_panel_sayisi = calculatePalettekiPanelSayisi(updatedPanel);

    // Palet Boş Ağırlık - lookup table kullanımı
    updatedPanel.palet_bos_agirlik = calculatePaletBosAgirlik(updatedPanel);

    // Paletsiz Toplam Ağırlık
    // =T2*Q2
    updatedPanel.paletsiz_toplam_agirlik = updatedPanel.paletteki_panel_sayisi * updatedPanel.boyali_hali;

    // Palet Dolu Ağırlık
    // =V2+U2
    updatedPanel.palet_dolu_agirlik = updatedPanel.paletsiz_toplam_agirlik + updatedPanel.palet_bos_agirlik;

    // Boş Palet Yüksekliği
    // =EĞER(D2="Double";14;EĞER(D2="Single";17;0))
    updatedPanel.bos_palet_yuksekligi = updatedPanel.panel_tipi === "Double" ? 14 : (updatedPanel.panel_tipi === "Single" ? 17 : 0);

    // Adet Panel Yüksekliği
    // =EĞER(D2="Double";EĞER(F2<5; 0.875; EĞER(F2>8; 1.33; 0.875+((F2-5)/(8-5))*(1.33-0.875)));EĞER(D2="Single";EĞER(F2<3; 0.769; EĞER(F2>5.5; 1; 0.769+((F2-3)/(5.5-3))*(1-0.769)));0))
    updatedPanel.adet_panel_yuksekligi = calculateAdetPanelYuksekligi(updatedPanel);

    // Paletsiz Toplam Panel Yüksekliği
    // =Y2*T2
    updatedPanel.paletsiz_toplam_panel_yuksekligi = updatedPanel.adet_panel_yuksekligi * updatedPanel.paletteki_panel_sayisi;

    // Paletli Yükseklik
    // =Z2+X2
    updatedPanel.paletli_yukseklik = updatedPanel.paletsiz_toplam_panel_yuksekligi + updatedPanel.bos_palet_yuksekligi;

    // Icube-Code
    // =EĞER(D2="Double";"DP-"&B2&"/"&C2&"-"&E2&"/"&F2&EĞER(G2+0=6005;"-Ysl";EĞER(G2+0=7016;"-Antrst";EĞER(G2+0=0;"-Rnksz";""))));EĞER(D2="Single";"SP-"&B2&"/"&C2&"-"&E2&"/"&F2&EĞER(G2+0=6005;"-Ysl";EĞER(G2+0=7016;"-Antrst";EĞER(G2+0=0;"-Rnksz";"")));""))
    updatedPanel.icube_code = calculateIcubeCode(updatedPanel);

    // Icube-Code Adetli
    // =AB2 & "_(" & T2 & "-Adet)"
    updatedPanel.icube_code_adetli = `${updatedPanel.icube_code}_(${updatedPanel.paletteki_panel_sayisi}-Adet)`;

    // Sayısal alanları yuvarla (eksik hesapları gidermek için)
    if (!isNaN(updatedPanel.adet_m2)) updatedPanel.adet_m2 = parseFloat(updatedPanel.adet_m2.toFixed(5));
    if (!isNaN(updatedPanel.dikey_cubuk_adet)) updatedPanel.dikey_cubuk_adet = Math.round(updatedPanel.dikey_cubuk_adet);
    if (!isNaN(updatedPanel.yatay_cubuk_adet)) updatedPanel.yatay_cubuk_adet = Math.round(updatedPanel.yatay_cubuk_adet);
    if (!isNaN(updatedPanel.agirlik)) updatedPanel.agirlik = parseFloat(updatedPanel.agirlik.toFixed(5));
    if (!isNaN(updatedPanel.boyali_hali)) updatedPanel.boyali_hali = parseFloat(updatedPanel.boyali_hali.toFixed(5));
    if (!isNaN(updatedPanel.boya_kg)) updatedPanel.boya_kg = parseFloat(updatedPanel.boya_kg.toFixed(5));
    if (!isNaN(updatedPanel.m2_agirlik)) updatedPanel.m2_agirlik = parseFloat(updatedPanel.m2_agirlik.toFixed(5));
    if (!isNaN(updatedPanel.palet_bos_agirlik)) updatedPanel.palet_bos_agirlik = parseFloat(updatedPanel.palet_bos_agirlik.toFixed(5));
    if (!isNaN(updatedPanel.paletsiz_toplam_agirlik)) updatedPanel.paletsiz_toplam_agirlik = parseFloat(updatedPanel.paletsiz_toplam_agirlik.toFixed(5));
    if (!isNaN(updatedPanel.palet_dolu_agirlik)) updatedPanel.palet_dolu_agirlik = parseFloat(updatedPanel.palet_dolu_agirlik.toFixed(5));
    if (!isNaN(updatedPanel.adet_panel_yuksekligi)) updatedPanel.adet_panel_yuksekligi = parseFloat(updatedPanel.adet_panel_yuksekligi.toFixed(5));
    if (!isNaN(updatedPanel.paletsiz_toplam_panel_yuksekligi)) updatedPanel.paletsiz_toplam_panel_yuksekligi = parseFloat(updatedPanel.paletsiz_toplam_panel_yuksekligi.toFixed(5));
    if (!isNaN(updatedPanel.paletli_yukseklik)) updatedPanel.paletli_yukseklik = parseFloat(updatedPanel.paletli_yukseklik.toFixed(5));

    // Panel kodu oluştur
    updatedPanel.panel_kodu = calculatePanelKodu(updatedPanel);

    // STOK_KODU formülü - sonradan ekleneceğini belirten placeholder
    // Stok Kodu Formülü Buraya Gelecek
    updatedPanel.stok_kodu = `${updatedPanel.icube_code}-STOK`;

    return updatedPanel;
  };

  // Boya kilogram hesaplama
  const calculateBoyaKg = (panel) => {
    if (!panel || !panel.panel_tipi) return 0;

    const adetM2 = safeParseFloat(panel.adet_m2);

    if (panel.panel_tipi === "Double") {
      return adetM2 * 0.06;
    } else if (panel.panel_tipi === "Single") {
      return adetM2 * 0.03;
    } else if (panel.panel_tipi === "Guvenlik") {
      return adetM2 * 0.03; // Assume same as Single unless specified otherwise
    } else {
      return 0;
    }
  };

  // Paletteki panel sayısı hesaplama
  const calculatePalettekiPanelSayisi = (panel) => {
    if (!panel || !panel.panel_tipi) return 0;

    const yatayTelCapi = safeParseFloat(panel.yatay_tel_capi);

    if (panel.panel_tipi === "Double") {
      if (yatayTelCapi >= 7) {
        return 25;
      } else {
        return 30;
      }
    } else if (panel.panel_tipi === "Single") {
      return 100;
    } else if (panel.panel_tipi === "Guvenlik") {
      return 50; // Assume a default value for Guvenlik panels
    } else {
      return 0;
    }
  };

  // Palet boş ağırlık hesaplama - FIXED to correctly use lookup tables
  const calculatePaletBosAgirlik = (panel) => {
    if (!panel || !panel.panel_tipi) return 0;

    const panelType = panel.panel_tipi;
    const height = safeParseFloat(panel.panel_yuksekligi);
    const width = safeParseFloat(panel.panel_genisligi);

    // Spesifik genişlikleri kontrol et
    const widthStr = width === 250 ? '250' : (width === 200 ? '200' : null);
    if (!widthStr) return 0;

    // En yakın yüksekliği bul
    const closestHeight = getClosestHeight(height, panelType, widthStr);
    if (!closestHeight) return 0;

    // Lookup tablosundan ağırlığı al
    return PALLET_WEIGHTS[panelType]?.[widthStr]?.[closestHeight] || 0;
  };

  // Adet panel yüksekliği hesaplama
  const calculateAdetPanelYuksekligi = (panel) => {
    if (!panel || !panel.panel_tipi) return 0;

    const panelType = panel.panel_tipi;
    const yatayTelCapi = safeParseFloat(panel.yatay_tel_capi);

    if (panelType === "Double") {
      if (yatayTelCapi < 5) {
        return 0.875;
      } else if (yatayTelCapi > 8) {
        return 1.33;
      } else {
        return 0.875 + ((yatayTelCapi - 5) / (8 - 5)) * (1.33 - 0.875);
      }
    } else if (panelType === "Single") {
      if (yatayTelCapi < 3) {
        return 0.769;
      } else if (yatayTelCapi > 5.5) {
        return 1;
      } else {
        return 0.769 + ((yatayTelCapi - 3) / (5.5 - 3)) * (1 - 0.769);
      }
    } else if (panelType === "Guvenlik") {
      // Assume same formula as Single for Guvenlik panels
      if (yatayTelCapi < 3) {
        return 0.769;
      } else if (yatayTelCapi > 5.5) {
        return 1;
      } else {
        return 0.769 + ((yatayTelCapi - 3) / (5.5 - 3)) * (1 - 0.769);
      }
    } else {
      return 0;
    }
  };

  // Icube Code hesaplama
  const calculateIcubeCode = (panel) => {
    if (!panel || !panel.panel_tipi) return '';

    const panelType = panel.panel_tipi;
    const height = safeParseFloat(panel.panel_yuksekligi);
    const width = safeParseFloat(panel.panel_genisligi);
    const dikeyCap = safeParseFloat(panel.dikey_tel_capi);
    const yatayCap = safeParseFloat(panel.yatay_tel_capi);

    // Basitleştirilmiş renk eki
    const colorSuffix = "-Rnksz";

    if (panelType === "Double") {
      return `DP-${height}/${width}-${dikeyCap}/${yatayCap}${colorSuffix}`;
    } else if (panelType === "Single") {
      return `SP-${height}/${width}-${dikeyCap}/${yatayCap}${colorSuffix}`;
    } else if (panelType === "Guvenlik") {
      return `GP-${height}/${width}-${dikeyCap}/${yatayCap}${colorSuffix}`;
    } else {
      return '';
    }
  };

  // Özel panel silme
  const removeOzelPanel = (id) => {
    setOzelPanelList(prev => prev.filter(panel => panel.id !== id));
  };

// Özel panel güncelleme - düzeltilmiş fonksiyon
// Özel panel güncelleme - düzeltilmiş fonksiyon
const updateOzelPanel = (id, field, value) => {
  setOzelPanelList(prev => prev.map(panel => {
    if (panel.id === id) {
      // Virgülleri noktalara dönüştür
      const formattedValue = typeof value === 'string' ? value.replace(',', '.') : value;
      
      // Önce değeri güncelle
      const updatedPanel = { ...panel, [field]: formattedValue };
      
      // Tüm hesaplamaları yeniden yap - calculatePanelValues fonksiyonu tüm bağımlı alanları hesaplar
      return calculatePanelValues(updatedPanel);
    }
    return panel;
  }));
};


// Tüm bağımlı alanları hesapla - özel panel için tüm hesaplamalar - DÜZELTILDI 
const recalculateAllFields = (panel) => {
  const result = { ...panel };
  
  // Temel değerleri al - sayısal değerlere dönüştürerek
  const panel_yuksekligi = safeParseFloat(panel.panel_yuksekligi);
  const panel_genisligi = safeParseFloat(panel.panel_genisligi);
  const dikey_tel_capi = safeParseFloat(panel.dikey_tel_capi);
  const yatay_tel_capi = safeParseFloat(panel.yatay_tel_capi);
  const dikey_goz_araligi = safeParseFloat(panel.dikey_goz_araligi);
  const yatay_goz_araligi = safeParseFloat(panel.yatay_goz_araligi);
  
  // Büküm sayısını hesapla veya mevcut değeri kullan
  let bukum_sayisi = safeParseFloat(panel.bukum_sayisi);
  if (panel.panel_tipi === "Single") {
    if (panel_yuksekligi >= 100) {
      bukum_sayisi = Math.round(panel_yuksekligi / 50);
    } else {
      bukum_sayisi = Math.floor((panel_yuksekligi / 50) + 1);
    }
  } else {
    bukum_sayisi = 0;
  }
  result.bukum_sayisi = bukum_sayisi;
  
  // Bükümdeki çubuk sayısını hesapla
  if (panel.panel_tipi === "Double") {
    result.bukumdeki_cubuk_sayisi = 0;
  } else if (panel.panel_tipi === "Single") {
    // Belirli yükseklik serileri için
    const seriesWithValue1 = [63, 83, 103, 123, 153, 173, 183, 203, 223, 243];
    const seriesWithValue2 = [50, 70, 100, 120, 150, 170, 200, 220];

    if (seriesWithValue1.includes(panel_yuksekligi)) {
      result.bukumdeki_cubuk_sayisi = 1;
    } else if (seriesWithValue2.includes(panel_yuksekligi)) {
      result.bukumdeki_cubuk_sayisi = 2;
    } else {
      result.bukumdeki_cubuk_sayisi = 1; // Varsayılan
    }
  } else {
    result.bukumdeki_cubuk_sayisi = 0;
  }
  
  // Adet m2 hesapla
  result.adet_m2 = (panel_yuksekligi * panel_genisligi / 10000);
  
  // Dikey çubuk adet hesapla
  if (yatay_goz_araligi < 5.5) {
    result.dikey_cubuk_adet = Math.ceil(panel_genisligi / yatay_goz_araligi) + 1;
  } else if (yatay_goz_araligi < 6) {
    result.dikey_cubuk_adet = Math.ceil(panel_genisligi / yatay_goz_araligi);
  } else {
    result.dikey_cubuk_adet = Math.ceil(panel_genisligi / yatay_goz_araligi) + 1;
  }
  
  // Yatay çubuk adet hesapla
  if (panel.panel_tipi === "Double") {
    result.yatay_cubuk_adet = (((panel_yuksekligi - 3) / dikey_goz_araligi) + 1) * 2;
  } else if (panel.panel_tipi === "Single" && dikey_goz_araligi === 20) {
    result.yatay_cubuk_adet = ((((panel_yuksekligi - 3) - (bukum_sayisi * 10)) / dikey_goz_araligi) + 1) + (bukum_sayisi * 2);
  } else if (panel.panel_tipi === "Single" && dikey_goz_araligi === 15 && panel_yuksekligi < 200) {
    result.yatay_cubuk_adet = Math.round(((panel_yuksekligi / dikey_goz_araligi) + (bukum_sayisi * 2)));
  } else if (panel.panel_tipi === "Single" && dikey_goz_araligi === 15 && panel_yuksekligi >= 200) {
    result.yatay_cubuk_adet = Math.ceil(((panel_yuksekligi / dikey_goz_araligi) + (bukum_sayisi * 2)));
  } else if (panel.panel_tipi === "Single") {
    result.yatay_cubuk_adet = Math.ceil(((panel_yuksekligi / dikey_goz_araligi) + (bukum_sayisi * 2)));
  } else if (panel.panel_tipi === "Guvenlik") {
    result.yatay_cubuk_adet = Math.ceil(((panel_yuksekligi / dikey_goz_araligi) + (bukum_sayisi * 2)));
  }
  
  // Ağırlık hesapla
  const dikey_cubuk = safeParseFloat(result.dikey_cubuk_adet);
  const yatay_cubuk = safeParseFloat(result.yatay_cubuk_adet);
  
  if (panel.panel_tipi === "Double") {
    result.agirlik = ((dikey_tel_capi * dikey_tel_capi * 7.85 * Math.PI / 4000) * ((panel_yuksekligi / 100) * dikey_cubuk)) + 
                     ((yatay_tel_capi * yatay_tel_capi * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
  } else if (panel.panel_tipi === "Single") {
    if (dikey_goz_araligi === 20) {
      result.agirlik = ((dikey_tel_capi * dikey_tel_capi * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                       ((yatay_tel_capi * yatay_tel_capi * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    } else if (dikey_goz_araligi === 15) {
      result.agirlik = ((dikey_tel_capi * dikey_tel_capi * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.6)) / 100) * dikey_cubuk) + 
                       ((yatay_tel_capi * yatay_tel_capi * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    } else {
      result.agirlik = ((dikey_tel_capi * dikey_tel_capi * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                       ((yatay_tel_capi * yatay_tel_capi * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    }
  } else if (panel.panel_tipi === "Guvenlik") {
    result.agirlik = ((dikey_tel_capi * dikey_tel_capi * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                     ((yatay_tel_capi * yatay_tel_capi * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
  }
  
  // Boya kilogram hesapla - fonksiyonu doğrudan kullanmak yerine içeriği buraya dahil et
  if (panel.panel_tipi === "Double") {
    result.boya_kg = result.adet_m2 * 0.06;
  } else if (panel.panel_tipi === "Single" || panel.panel_tipi === "Guvenlik") {
    result.boya_kg = result.adet_m2 * 0.03;
  } else {
    result.boya_kg = 0;
  }
  
  // Boyalı Hali 
  result.boyali_hali = safeParseFloat(result.agirlik) + safeParseFloat(result.boya_kg);
  
  // M² Ağırlık
  result.m2_agirlik = result.adet_m2 > 0 ? result.boyali_hali / result.adet_m2 : 0;
  
  // Paletteki panel sayısı
  if (panel.panel_tipi === "Double") {
    if (yatay_tel_capi >= 7) {
      result.paletteki_panel_sayisi = 25;
    } else {
      result.paletteki_panel_sayisi = 30;
    }
  } else if (panel.panel_tipi === "Single") {
    result.paletteki_panel_sayisi = 100;
  } else if (panel.panel_tipi === "Guvenlik") {
    result.paletteki_panel_sayisi = 50;
  } else {
    result.paletteki_panel_sayisi = 0;
  }
  
  // Palet Boş Ağırlık
  const panelType = panel.panel_tipi;
  const widthStr = panel_genisligi === 250 ? '250' : (panel_genisligi === 200 ? '200' : null);
  
  if (widthStr && PALLET_WEIGHTS[panelType]?.[widthStr]) {
    const heights = Object.keys(PALLET_WEIGHTS[panelType][widthStr]).map(Number);
    const closestHeight = heights.reduce((prev, curr) => {
      return (Math.abs(curr - panel_yuksekligi) < Math.abs(prev - panel_yuksekligi) ? curr : prev);
    }, heights[0]);
    
    result.palet_bos_agirlik = PALLET_WEIGHTS[panelType][widthStr][closestHeight.toString()] || 0;
  } else {
    result.palet_bos_agirlik = 0;
  }
  
  // Paletsiz Toplam Ağırlık
  result.paletsiz_toplam_agirlik = result.paletteki_panel_sayisi * result.boyali_hali;
  
  // Palet Dolu Ağırlık
  result.palet_dolu_agirlik = result.paletsiz_toplam_agirlik + result.palet_bos_agirlik;
  
  // Boş Palet Yüksekliği
  result.bos_palet_yuksekligi = result.panel_tipi === "Double" ? 14 : (result.panel_tipi === "Single" ? 17 : 0);
  
  // Adet Panel Yüksekliği
  if (panel.panel_tipi === "Double") {
    if (yatay_tel_capi < 5) {
      result.adet_panel_yuksekligi = 0.875;
    } else if (yatay_tel_capi > 8) {
      result.adet_panel_yuksekligi = 1.33;
    } else {
      result.adet_panel_yuksekligi = 0.875 + ((yatay_tel_capi - 5) / (8 - 5)) * (1.33 - 0.875);
    }
  } else if (panel.panel_tipi === "Single" || panel.panel_tipi === "Guvenlik") {
    if (yatay_tel_capi < 3) {
      result.adet_panel_yuksekligi = 0.769;
    } else if (yatay_tel_capi > 5.5) {
      result.adet_panel_yuksekligi = 1;
    } else {
      result.adet_panel_yuksekligi = 0.769 + ((yatay_tel_capi - 3) / (5.5 - 3)) * (1 - 0.769);
    }
  } else {
    result.adet_panel_yuksekligi = 0;
  }
  
  // Paletsiz Toplam Panel Yüksekliği
  result.paletsiz_toplam_panel_yuksekligi = result.adet_panel_yuksekligi * result.paletteki_panel_sayisi;
  
  // Paletli Yükseklik
  result.paletli_yukseklik = result.paletsiz_toplam_panel_yuksekligi + result.bos_palet_yuksekligi;
  
  // Icube-Code
  result.icube_code = `${panel.panel_tipi === "Double" ? "DP" : (panel.panel_tipi === "Single" ? "SP" : "GP")}-${panel_yuksekligi}/${panel_genisligi}-${dikey_tel_capi}/${yatay_tel_capi}-Rnksz`;
  
  // Icube-Code Adetli
  result.icube_code_adetli = `${result.icube_code}_(${result.paletteki_panel_sayisi}-Adet)`;
  
  // Panel kodu oluştur
  const prefix = panel.panel_tipi === "Single" ? 'SP' : (panel.panel_tipi === "Guvenlik" ? 'GP' : 'DP');
  const capStr = `${formatDisplayValue(dikey_tel_capi) || 0} * ${formatDisplayValue(yatay_tel_capi) || 0}`;
  const ebatStr = `${formatDisplayValue(panel_yuksekligi) || 0} * ${formatDisplayValue(panel_genisligi) || 0}`;
  const gozStr = `${formatDisplayValue(yatay_goz_araligi) || 0} * ${formatDisplayValue(dikey_goz_araligi) || 0}`;
  const bukumStr = `${bukum_sayisi || 0}-1`;
  result.panel_kodu = `${prefix}_Cap:${capStr}_Eb:${ebatStr}_Gz:${gozStr}_Buk:${bukumStr}_Rnk:"Kplmsz"`;
  
  // STOK_KODU
  result.stok_kodu = `${result.icube_code}-STOK`;
  
  return result;
};

//Panel listesi excel exportu
const exportPanelListToExcel = () => {
  try {
    // Filtrelenmiş panel listesini al
    const dataToExport = filteredPanelList.map(panel => ({
      "Manual Order": panel.manual_order || '',
      "Panel Kodu": panel.panel_kodu || '',
      "Panel Tipi": panel.panel_tipi || '',
      "Yükseklik": panel.panel_yuksekligi || '',
      "Genişlik": panel.panel_genisligi || '',
      "Dikey Tel Çapı": formatTableValue(panel.dikey_tel_capi, 'tel_capi'),
      "Yatay Tel Çapı": formatTableValue(panel.yatay_tel_capi, 'tel_capi'),
      "Dikey Göz Aralığı": formatTableValue(panel.dikey_goz_araligi, 'goz_araligi'),
      "Yatay Göz Aralığı": formatTableValue(panel.yatay_goz_araligi, 'goz_araligi'),
      "Büküm Sayısı": panel.bukum_sayisi || '',
      "Bükümdeki Çubuk Sayısı": panel.bukumdeki_cubuk_sayisi || '',
      "Dikey Çubuk Adedi": panel.dikey_cubuk_adet || '',
      "Yatay Çubuk Adedi": panel.yatay_cubuk_adet || '',
      "Adet M²": formatTableValue(panel.adet_m2, 'decimal') || '',
      "Ağırlık": formatTableValue(panel.agirlik, 'decimal') || '',
      "Boya Kg": formatTableValue(panel.boya_kg, 'decimal') || '',
      "Boyalı Hali": formatTableValue(panel.boyali_hali, 'decimal') || '',
      "M² Ağırlık": formatTableValue(panel.m2_agirlik, 'decimal') || '',
      "Paletteki Panel Sayısı": panel.paletteki_panel_sayisi || '',
      "Palet Boş Ağırlık": formatTableValue(panel.palet_bos_agirlik, 'decimal') || '',
      "Paletsiz Toplam Ağırlık": formatTableValue(panel.paletsiz_toplam_agirlik, 'decimal') || '',
      "Palet Dolu Ağırlık": formatTableValue(panel.palet_dolu_agirlik, 'decimal') || '',
      "Boş Palet Yüksekliği": panel.bos_palet_yuksekligi || '',
      "Adet Panel Yüksekliği": formatTableValue(panel.adet_panel_yuksekligi, 'decimal') || '',
      "Paletsiz Toplam Panel Yüksekliği": formatTableValue(panel.paletsiz_toplam_panel_yuksekligi, 'decimal') || '',
      "Paletli Yükseklik": formatTableValue(panel.paletli_yukseklik, 'decimal') || '',
      "Icube Code": panel.icube_code || '',
      "Icube Code (Adetli)": panel.icube_code_adetli || '',
      "Stok Kodu": panel.stok_kodu || '',
      "Kayıt Tarihi": panel.kayit_tarihi ? new Date(panel.kayit_tarihi).toLocaleString('tr-TR') : ''
    }));

    if (dataToExport.length === 0) {
      alert('Dışa aktarılacak veri bulunamadı!');
      return;
    }

    // XLSX worksheet oluştur
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Başlıklar için stil tanımla
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // Tüm kolonların genişliklerini ayarla
    const columnWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      // Her kolon için varsayılan genişlik
      columnWidths.push({ wch: 15 });
    }
    worksheet['!cols'] = columnWidths;

    // Başlık hücrelerine stil uygula
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C });

      // Mevcut hücre yapılandırmasını al veya yeni oluştur
      if (!worksheet[address]) worksheet[address] = { t: 's', v: '' };

      // Stil bilgisini ekle
      if (!worksheet[address].s) worksheet[address].s = {};

      // Kalın yazı tipi ve arka plan rengi uygula
      worksheet[address].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "E6E6E6" } }
      };
    }

    // Workbook oluştur ve worksheet ekle
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Panel Listesi");

    // Excel dosyasını indir
    XLSX.writeFile(workbook, "Panel_Listesi.xlsx");
  } catch (error) {
    console.error('Excel dışa aktarma hatası:', error);
    alert('Dışa aktarma sırasında bir hata oluştu: ' + error.message);
  }
};

  // Özel paneli veritabanına kaydetme - FIXED to handle errors better
  const saveOzelPanelToDatabase = async (panel) => {
    try {
      // Özel alanları temizle
      const { isNew, id, icube_code, icube_code_adetli, boya_kg, boyali_hali, m2_agirlik,
        paletteki_panel_sayisi, palet_bos_agirlik, paletsiz_toplam_agirlik,
        palet_dolu_agirlik, bos_palet_yuksekligi, adet_panel_yuksekligi,
        paletsiz_toplam_panel_yuksekligi, paletli_yukseklik, stok_kodu, ...panelData } = panel;

      // Get the highest existing manual_order
      const panelListRes = await axios.get(API_URLS.panelList).catch(error => {
        console.error("Panel listesi getirme hatası:", error);
        return { data: [] };
      });

      // Find highest manual_order starting with 4 (for 400+)
      const highestManualOrder = panelListRes.data
        .filter(p => p.manual_order && p.manual_order.toString().startsWith('4'))
        .reduce((max, p) => {
          const order = parseInt(p.manual_order);
          return order > max ? order : max;
        }, 400);

      // Set the new manual_order
      const newManualOrder = (highestManualOrder + 1).toString();

      // API için hazırlanmış veriyi oluştur
      const dataToSave = {
        ...panelData,
        manual_order: newManualOrder,
        kayit_tarihi: new Date().toISOString()
      };

      // Veritabanına kaydet
      const response = await axios.post(API_URLS.panelList, dataToSave);

      if (response.status === 200 || response.status === 201) {
        alert(`${panel.panel_kodu || 'Panel'} başarıyla kaydedildi.`);

        // Mevcut panel listesini güncelle
        fetchSectionData('panelList');

        // Don't remove from özel panel list
        // Just show a success message
      } else {
        alert('Kayıt işlemi başarısız oldu.');
      }
    } catch (error) {
      console.error('Panel kaydetme hatası:', error);
      alert(`Panel kaydedilirken hata oluştu: ${error.response?.data?.error || error.message}`);
    }
  };

// Tel çapı input alanları için özel bileşen - ondalık noktayı düzgün işlemeyi sağlar
const NumberInput = ({ value, onChange, fieldName, panelId, className }) => {
  // Değeri string olarak ele al, böylece nokta girerken sorunları önle
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  
  // Input değiştiğinde hem yerel state'i hem de ana state'i güncelle
  const handleChange = (e) => {
    const newValue = e.target.value;
    // Sayısal giriş kontrolü - sadece rakamlar, nokta ve virgül
    if (/^[0-9]*[.,]?[0-9]*$/.test(newValue) || newValue === '') {
      setInputValue(newValue);
      // Ana state'i güncelle - virgülleri noktalara çevirir
      onChange(panelId, fieldName, newValue);
    }
  };
  
  // Value prop değişirse inputValue'yu güncelle
  useEffect(() => {
    if (value?.toString() !== inputValue) {
      setInputValue(value?.toString() || '');
    }
  }, [value]);
	return (
	    <input
	      type="text"
	      value={inputValue}
	      onChange={handleChange}
	      className={className || "w-16 border rounded p-1 text-sm bg-white"}
	    />
	  );
	};
// Güncellenen Özel Panel hücre bileşenleri
// Panel Tipi Seçimi
const renderPanelTypeSelector = (panel, updateOzelPanel) => (
  <select
    value={panel.panel_tipi || ''}
    onChange={(e) => updateOzelPanel(panel.id, 'panel_tipi', e.target.value)}
    className="w-full border rounded p-1 text-sm bg-white"
  >
    <option value="Single">Single</option>
    <option value="Double">Double</option>
    <option value="Guvenlik">Güvenlik</option>
  </select>
);

// Yükseklik Input
const renderHeightInput = (panel, updateOzelPanel) => (
  <NumberInput
    value={panel.panel_yuksekligi} 
    onChange={updateOzelPanel}
    fieldName="panel_yuksekligi"
    panelId={panel.id}
    className="w-16 border rounded p-1 text-sm bg-white"
  />
);

// Genişlik Input
const renderWidthInput = (panel, updateOzelPanel) => (
  <NumberInput
    value={panel.panel_genisligi} 
    onChange={updateOzelPanel}
    fieldName="panel_genisligi" 
    panelId={panel.id}
    className="w-16 border rounded p-1 text-sm bg-white"
  />
);

// Tel Çapı Input
const renderWireDiameterInput = (panel, updateOzelPanel, fieldName) => (
  <NumberInput
    value={formatTableValue(panel[fieldName], 'tel_capi')} 
    onChange={updateOzelPanel}
    fieldName={fieldName}
    panelId={panel.id}
    className="w-16 border rounded p-1 text-sm bg-white"
  />
);

// Göz Aralığı Input
const renderMeshSpacingInput = (panel, updateOzelPanel, fieldName) => (
  <NumberInput
    value={formatTableValue(panel[fieldName], 'goz_araligi')} 
    onChange={updateOzelPanel}
    fieldName={fieldName}
    panelId={panel.id}
    className="w-16 border rounded p-1 text-sm bg-white"
  />
);

// Hesaplanan Değer Input
const renderCalculatedInput = (panel, updateOzelPanel, fieldName, displayType = 'default', width = "w-16") => (
  <input
    type="text"
    value={displayType === 'decimal' ? formatTableValue(panel[fieldName], 'decimal') : panel[fieldName] || ''}
    onChange={(e) => updateOzelPanel(panel.id, fieldName, e.target.value)}
    className={`${width} border border-gray-200 rounded p-1 text-sm`}
  />
);

  // Tüm özel panelleri veritabanına kaydet - IMPROVED with automatic manual_order assignment
  const saveAllOzelPanelsToDatabase = async () => {
    if (ozelPanelList.length === 0) {
      alert('Kaydedilecek özel panel bulunamadı.');
      return;
    }

    const confirmSave = window.confirm(`${ozelPanelList.length} adet özel paneli veritabanına kaydetmek istiyor musunuz?`);
    if (!confirmSave) return;

    try {
      // Mevcut panelleri getir ve en yüksek manual_order değerini bul (400+ ile başlayanlar için)
      const panelListRes = await axios.get(API_URLS.panelList).catch(error => {
        console.error("Panel listesi getirme hatası:", error);
        return { data: [] };
      });

      // 400 ile başlayan manual_order değerlerini filtrele ve en yükseğini bul
      const highestManualOrder = panelListRes.data
        .filter(p => p.manual_order && p.manual_order.toString().startsWith('4'))
        .reduce((max, p) => {
          const order = parseInt(p.manual_order);
          return order > max ? order : max;
        }, 400 - 1); // 399 ile başla ki ilk eklenen 400 olsun (eğer hiç 400+ panel yoksa)

      let savedCount = 0;
      let errorCount = 0;
      let errorMessages = [];
      let nextManualOrder = highestManualOrder + 1;

      // Her bir paneli tek tek kaydet
      for (const panel of ozelPanelList) {
        try {
          // Özel alanları temizle
          const { isNew, id, icube_code, icube_code_adetli, boya_kg, boyali_hali, m2_agirlik,
            paletteki_panel_sayisi, palet_bos_agirlik, paletsiz_toplam_agirlik,
            palet_dolu_agirlik, bos_palet_yuksekligi, adet_panel_yuksekligi,
            paletsiz_toplam_panel_yuksekligi, paletli_yukseklik, stok_kodu, ...panelData } = panel;

          // Her panel için yeni bir manual_order değeri ata
          const manualOrderToUse = nextManualOrder.toString();
          nextManualOrder++; // Sonraki panel için arttır

          // Veritabanına kaydet
          const response = await axios.post(API_URLS.panelList, {
            ...panelData,
            manual_order: manualOrderToUse, // Yeni manual_order değerini kullan
            kayit_tarihi: new Date().toISOString()
          });

          if (response.status === 200 || response.status === 201) {
            savedCount++;
          }
        } catch (error) {
          console.error(`Panel kaydetme hatası (${panel.panel_kodu}):`, error);
          errorCount++;
          errorMessages.push(`${panel.panel_kodu}: ${error.response?.data?.error || error.message}`);
        }
      }

      // Sonucu bildir
      if (errorCount === 0) {
        alert(`Tüm paneller (${savedCount} adet) başarıyla kaydedildi.`);

        // Mevcut panel listesini güncelle
        fetchSectionData('panelList');

        // Özel panel listesini temizlemeyi kullanıcıya sor
        const shouldClearList = window.confirm('Özel panel listesini temizlemek ister misiniz?');
        if (shouldClearList) {
          setOzelPanelList([]);
        }
      } else {
        const errorDetails = errorMessages.length > 3
          ? errorMessages.slice(0, 3).join('\n') + `\n...ve ${errorMessages.length - 3} hata daha.`
          : errorMessages.join('\n');

        alert(`${savedCount} panel başarıyla kaydedildi, ${errorCount} panel kaydedilemedi.\n\nHatalar:\n${errorDetails}`);

        // Mevcut panel listesini güncelle
        fetchSectionData('panelList');

        // Başarıyla kaydedilen panelleri listeden kaldırmayı kullanıcıya sor
        const shouldRemoveSaved = window.confirm('Başarıyla kaydedilen panelleri listeden kaldırmak ister misiniz?');
        if (shouldRemoveSaved) {
          // Hata almayan panelleri bul ve listeden kaldır
          const successfulPanelIds = ozelPanelList
            .filter(panel => !errorMessages.some(err => err.startsWith(panel.panel_kodu)))
            .map(panel => panel.id);

          setOzelPanelList(prev => prev.filter(panel => !successfulPanelIds.includes(panel.id)));
        }
      }
    } catch (error) {
      console.error('Toplu panel kaydetme hatası:', error);
      alert(`Toplu panel kaydı sırasında beklenmeyen bir hata oluştu: ${error.message}`);
    }
  };

  // Ana panel listesinden özel paneller oluştur
  const createOzelPanelsFromFiltered = () => {
    if (filteredPanelList.length === 0) {
      alert('Filtrelenmiş panel listesi boş. Lütfen en az bir panel seçin.');
      return;
    }

    const confirmCreate = window.confirm(`Filtrelenmiş listeden (${filteredPanelList.length} adet) özel panel oluşturmak istiyor musunuz?`);
    if (!confirmCreate) return;

    // Filtrelenmiş panelleri özel panel listesine ekle
    const newOzelPanels = filteredPanelList.map(panel => {
      // Panel verilerini kopyala ve özel formatla
      const newPanel = {
        ...panel,
        isNew: true,
        id: Date.now() + Math.random(), // Benzersiz ID oluştur
        // Aşağıdaki alanları hesapla (calculatePanelValues fonksiyonu ile)
        bukum_sayisi: panel.bukum_sayisi || 0,
        bukumdeki_cubuk_sayisi: panel.bukumdeki_cubuk_sayisi || 1,
        boyali_hali: 0,
        boya_kg: 0,
        m2_agirlik: 0,
        paletteki_panel_sayisi: 0,
        palet_bos_agirlik: 0,
        paletsiz_toplam_agirlik: 0,
        palet_dolu_agirlik: 0,
        bos_palet_yuksekligi: 0,
        adet_panel_yuksekligi: 0,
        paletsiz_toplam_panel_yuksekligi: 0,
        paletli_yukseklik: 0,
        icube_code: '',
        icube_code_adetli: '',
        stok_kodu: ''
      };

      // Panel değerlerini hesapla
      return calculatePanelValues(newPanel);
    });

    // Özel panel listesine ekle
    setOzelPanelList(prev => [...prev, ...newOzelPanels]);

    // Özel panel sekmesine geç
    setActiveTab('special-panel');

    alert(`${newOzelPanels.length} adet panel özel panel listesine eklendi.`);
  };

  // Sonuç filtresini güncelleme
  const handleResultFilterChange = (type, value) => {
    setResultFilter({
      ...resultFilter,
      [type]: value
    });
  };

  // Satış filtresi güncelleme
  const handleSalesFilterChange = (type, value) => {
    setSalesFilter({
      ...salesFilter,
      [type]: value
    });

    // Satış listesini yeniden hesapla
    setSatisListesi(generateSalesList(maliyetListesi));
  };

  // Satış marjlarını güncelleme
  const handleSalesMarginChange = (type, value) => {
    setSalesMargins({
      ...salesMargins,
      [type]: safeParseFloat(value)
    });

    // Satış listesini yeniden hesapla
    setSatisListesi(generateSalesList(maliyetListesi));
  };

	const resetOzelPanelList = () => {
	  // Confirm before clearing
	  const confirmReset = window.confirm('Özel panel listesini sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.');
	  if (confirmReset) {
	    setOzelPanelList([]);
	  }
	};

  // Excel'e aktarma - IMPROVED to respect current view and formatting
  const exportToExcel = (listType = 'maliyet') => {
    try {
      // Hangi listenin dışa aktarılacağını belirle
      let dataToExport = [];
      let filename = '';
      let sheetName = '';

      // Sonuç tipine göre veri hazırla
      if (listType === 'maliyet') {
        // Maliyet listesi - filtrelenmiş verileri kulan
        const filteredData = filterMaliyetListesi();

        // Şu anda görünen sütunları ve verileri belirle - Tam olarak görüldüğü gibi
        dataToExport = filteredData.map(item => {
          const exportData = {
            "Panel Kodu": item.panel_kodu || '',
            "Panel Tipi": item.panel_tipi || '',
            "Yükseklik": item.panel_yuksekligi || '',
            "Genişlik": item.panel_genisligi || '',
            "Dikey Tel Çapı": formatTableValue(item.dikey_tel_capi, 'tel_capi'),
            "Yatay Tel Çapı": formatTableValue(item.yatay_tel_capi, 'tel_capi'),
            "Dikey Göz Aralığı": formatTableValue(item.dikey_goz_araligi, 'goz_araligi'),
            "Yatay Göz Aralığı": formatTableValue(item.yatay_goz_araligi, 'goz_araligi')
          };

          // Filtreye göre görünen sütunları ekle
          if ((resultFilter.unit === 'all' || resultFilter.unit === 'adet') &&
            (resultFilter.type === 'all' || resultFilter.type === 'ciplak')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Çıplak Adet USD"] = formatTableValue(item.ciplak_adet_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Çıplak Adet EUR"] = formatTableValue(item.ciplak_adet_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Çıplak Adet TRY"] = formatTableValue(item.ciplak_adet_try, 'price');
            }
          }

          // Diğer tüm sütunları filtreye göre ekle...
          // Çıplak M2
          if ((resultFilter.unit === 'all' || resultFilter.unit === 'm2') &&
            (resultFilter.type === 'all' || resultFilter.type === 'ciplak')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Çıplak M2 USD"] = formatTableValue(item.ciplak_m2_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Çıplak M2 EUR"] = formatTableValue(item.ciplak_m2_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Çıplak M2 TRY"] = formatTableValue(item.ciplak_m2_try, 'price');
            }
          }

          // Çıplak Kg
          if ((resultFilter.unit === 'all' || resultFilter.unit === 'kg') &&
            (resultFilter.type === 'all' || resultFilter.type === 'ciplak')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Çıplak Kg USD"] = formatTableValue(item.ciplak_kg_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Çıplak Kg EUR"] = formatTableValue(item.ciplak_kg_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Çıplak Kg TRY"] = formatTableValue(item.ciplak_kg_try, 'price');
            }
          }

          // Boyalı Adet
          if ((resultFilter.unit === 'all' || resultFilter.unit === 'adet') &&
            (resultFilter.type === 'all' || resultFilter.type === 'boyali')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Boyalı Adet USD"] = formatTableValue(item.boyali_adet_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Boyalı Adet EUR"] = formatTableValue(item.boyali_adet_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Boyalı Adet TRY"] = formatTableValue(item.boyali_adet_try, 'price');
            }
          }

          // Boyalı M2
          if ((resultFilter.unit === 'all' || resultFilter.unit === 'm2') &&
            (resultFilter.type === 'all' || resultFilter.type === 'boyali')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Boyalı M2 USD"] = formatTableValue(item.boyali_m2_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Boyalı M2 EUR"] = formatTableValue(item.boyali_m2_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Boyalı M2 TRY"] = formatTableValue(item.boyali_m2_try, 'price');
            }
          }

          // Boyalı Kg
          if ((resultFilter.unit === 'all' || resultFilter.unit === 'kg') &&
            (resultFilter.type === 'all' || resultFilter.type === 'boyali')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Boyalı Kg USD"] = formatTableValue(item.boyali_kg_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Boyalı Kg EUR"] = formatTableValue(item.boyali_kg_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Boyalı Kg TRY"] = formatTableValue(item.boyali_kg_try, 'price');
            }
          }

          // Standart Setli + Boyasız
          if ((resultFilter.unit === 'all' || resultFilter.unit === 'adet') &&
            (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Standart Setli + Boyasız Adet USD"] = formatTableValue(item.standart_setli_boyasiz_adet_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Standart Setli + Boyasız Adet EUR"] = formatTableValue(item.standart_setli_boyasiz_adet_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Standart Setli + Boyasız Adet TRY"] = formatTableValue(item.standart_setli_boyasiz_adet_try, 'price');
            }
          }

          if ((resultFilter.unit === 'all' || resultFilter.unit === 'm2') &&
            (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Standart Setli + Boyasız M2 USD"] = formatTableValue(item.standart_setli_boyasiz_m2_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Standart Setli + Boyasız M2 EUR"] = formatTableValue(item.standart_setli_boyasiz_m2_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Standart Setli + Boyasız M2 TRY"] = formatTableValue(item.standart_setli_boyasiz_m2_try, 'price');
            }
          }

          if ((resultFilter.unit === 'all' || resultFilter.unit === 'kg') &&
            (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Standart Setli + Boyasız Kg USD"] = formatTableValue(item.standart_setli_boyasiz_kg_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Standart Setli + Boyasız Kg EUR"] = formatTableValue(item.standart_setli_boyasiz_kg_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Standart Setli + Boyasız Kg TRY"] = formatTableValue(item.standart_setli_boyasiz_kg_try, 'price');
            }
          }

          // Standart Setli + Boyalı
          if ((resultFilter.unit === 'all' || resultFilter.unit === 'adet') &&
            (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Standart Setli + Boyalı Adet USD"] = formatTableValue(item.standart_setli_boyali_adet_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Standart Setli + Boyalı Adet EUR"] = formatTableValue(item.standart_setli_boyali_adet_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Standart Setli + Boyalı Adet TRY"] = formatTableValue(item.standart_setli_boyali_adet_try, 'price');
            }
          }

          if ((resultFilter.unit === 'all' || resultFilter.unit === 'm2') &&
            (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Standart Setli + Boyalı M2 USD"] = formatTableValue(item.standart_setli_boyali_m2_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Standart Setli + Boyalı M2 EUR"] = formatTableValue(item.standart_setli_boyali_m2_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Standart Setli + Boyalı M2 TRY"] = formatTableValue(item.standart_setli_boyali_m2_try, 'price');
            }
          }

          if ((resultFilter.unit === 'all' || resultFilter.unit === 'kg') &&
            (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali')) {
            if (resultFilter.currency === 'all' || resultFilter.currency === 'USD') {
              exportData["Standart Setli + Boyalı Kg USD"] = formatTableValue(item.standart_setli_boyali_kg_usd, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') {
              exportData["Standart Setli + Boyalı Kg EUR"] = formatTableValue(item.standart_setli_boyali_kg_eur, 'price');
            }
            if (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') {
              exportData["Standart Setli + Boyalı Kg TRY"] = formatTableValue(item.standart_setli_boyali_kg_try, 'price');
            }
          }

          return exportData;
        });

        filename = 'Panel_Cit_Maliyet_Listesi.xlsx';
        sheetName = 'Maliyet Listesi';
      } else if (listType === 'satis') {
        // Mevcut filtrelerle satış verilerini hazırla
        const filteredData = filterMaliyetListesi();

        // Satış listesi için ekstra bilgileri ve fiyat formatlarını ekleyerek
        dataToExport = filteredData.map(item => {
          const exportData = {
            "Panel Kodu": item.panel_kodu || '',
            "Panel Tipi": item.panel_tipi || '',
            "Yükseklik": item.panel_yuksekligi || '',
            "Genişlik": item.panel_genisligi || '',
            "Dikey Tel Çapı": formatTableValue(item.dikey_tel_capi, 'tel_capi'),
            "Yatay Tel Çapı": formatTableValue(item.yatay_tel_capi, 'tel_capi'),
            "Dikey Göz Aralığı": formatTableValue(item.dikey_goz_araligi, 'goz_araligi'),
            "Yatay Göz Aralığı": formatTableValue(item.yatay_goz_araligi, 'goz_araligi')
          };

          // Para birimi ve birim tipine göre fiyatları ekle
          const currency = salesFilter.currency.toLowerCase();

          // Adet fiyatları
          if (salesFilter.unit === 'all' || salesFilter.unit === 'adet') {
            exportData[`Bronz Fiyat - Adet (${salesFilter.currency})`] = formatTableValue(
              calculatePricesWithMargin(item, 'bronze', 'adet', currency), 'price'
            );
            exportData[`Gümüş Fiyat - Adet (${salesFilter.currency})`] = formatTableValue(
              calculatePricesWithMargin(item, 'silver', 'adet', currency), 'price'
            );
            exportData[`Altın Fiyat - Adet (${salesFilter.currency})`] = formatTableValue(
              calculatePricesWithMargin(item, 'gold', 'adet', currency), 'price'
            );
          }

          // M2 fiyatları
          if (salesFilter.unit === 'all' || salesFilter.unit === 'm2') {
            exportData[`Bronz Fiyat - m² (${salesFilter.currency})`] = formatTableValue(
              calculatePricesWithMargin(item, 'bronze', 'm2', currency), 'price'
            );
            exportData[`Gümüş Fiyat - m² (${salesFilter.currency})`] = formatTableValue(
              calculatePricesWithMargin(item, 'silver', 'm2', currency), 'price'
            );
            exportData[`Altın Fiyat - m² (${salesFilter.currency})`] = formatTableValue(
              calculatePricesWithMargin(item, 'gold', 'm2', currency), 'price'
            );
          }

          // Kg fiyatları
          if (salesFilter.unit === 'all' || salesFilter.unit === 'kg') {
            exportData[`Bronz Fiyat - kg (${salesFilter.currency})`] = formatTableValue(
              calculatePricesWithMargin(item, 'bronze', 'kg', currency), 'price'
            );
            exportData[`Gümüş Fiyat - kg (${salesFilter.currency})`] = formatTableValue(
              calculatePricesWithMargin(item, 'silver', 'kg', currency), 'price'
            );
            exportData[`Altın Fiyat - kg (${salesFilter.currency})`] = formatTableValue(
              calculatePricesWithMargin(item, 'gold', 'kg', currency), 'price'
            );
          }

          return exportData;
        });

        filename = 'Panel_Cit_Satis_Listesi.xlsx';
        sheetName = 'Satış Listesi';
      } else if (listType === 'ozel') {
        // Özel paneller için tüm alanları içeren export
        dataToExport = ozelPanelList.map(panel => ({
          "Panel Kodu": panel.panel_kodu || '',
          "Panel Tipi": panel.panel_tipi || '',
          "Yükseklik": panel.panel_yuksekligi || '',
          "Genişlik": panel.panel_genisligi || '',
          "Dikey Tel Çapı": formatTableValue(panel.dikey_tel_capi, 'tel_capi') || '',
          "Yatay Tel Çapı": formatTableValue(panel.yatay_tel_capi, 'tel_capi') || '',
          "Dikey Göz Aralığı": formatTableValue(panel.dikey_goz_araligi, 'goz_araligi') || '',
          "Yatay Göz Aralığı": formatTableValue(panel.yatay_goz_araligi, 'goz_araligi') || '',
          "Büküm Sayısı": panel.bukum_sayisi || '',
          "Bükümdeki Çubuk Sayısı": panel.bukumdeki_cubuk_sayisi || '',
          "Dikey Çubuk Adedi": panel.dikey_cubuk_adet || '',
          "Yatay Çubuk Adedi": panel.yatay_cubuk_adet || '',
          "Adet M²": formatTableValue(panel.adet_m2, 'decimal') || '',
          "Ağırlık": formatTableValue(panel.agirlik, 'decimal') || '',
          "Boya Kg": formatTableValue(panel.boya_kg, 'decimal') || '',
          "Boyalı Hali": formatTableValue(panel.boyali_hali, 'decimal') || '',
          "M² Ağırlık": formatTableValue(panel.m2_agirlik, 'decimal') || '',
          "Paletteki Panel Sayısı": panel.paletteki_panel_sayisi || '',
          "Palet Boş Ağırlık": formatTableValue(panel.palet_bos_agirlik, 'decimal') || '',
          "Paletsiz Toplam Ağırlık": formatTableValue(panel.paletsiz_toplam_agirlik, 'decimal') || '',
          "Palet Dolu Ağırlık": formatTableValue(panel.palet_dolu_agirlik, 'decimal') || '',
          "Boş Palet Yüksekliği": panel.bos_palet_yuksekligi || '',
          "Adet Panel Yüksekliği": formatTableValue(panel.adet_panel_yuksekligi, 'decimal') || '',
          "Paletsiz Toplam Panel Yüksekliği": formatTableValue(panel.paletsiz_toplam_panel_yuksekligi, 'decimal') || '',
          "Paletli Yükseklik": formatTableValue(panel.paletli_yukseklik, 'decimal') || '',
          "Icube Code": panel.icube_code || '',
          "Icube Code (Adetli)": panel.icube_code_adetli || '',
          "Stok Kodu": panel.stok_kodu || ''
        }));

        filename = 'Panel_Cit_Ozel_Panel_Listesi.xlsx';
        sheetName = 'Özel Panel Listesi';
      } else if (listType === 'gecici') {
        // Geçici hesaplamalar tablosu
        dataToExport = geciciHesaplar.map(hesap => ({
          "Panel Kodu": hesap.panel_kodu || '',
          "Panel Kapasite": formatTableValue(hesap.panel_kapasite, 'decimal') || '',
          "Yalnız Panel Aylık Kapasite": formatTableValue(hesap.yalniz_panel_aylik, 'decimal') || '',
          "Panel Kaynak Elektrik (m²)": formatTableValue(hesap.panel_kaynak_elektrik, 'price') || '',
          "Panel Kesme Elektrik (m²)": formatTableValue(hesap.panel_kesme_elektrik, 'price') || '',
          "Diğer (m²)": formatTableValue(hesap.diger_m2, 'price') || '',
          "Yalnız Panel İşçi (m²)": formatTableValue(hesap.yalniz_panel_isci_m2, 'price') || '',
          "Panel Boya İşçi (m²)": formatTableValue(hesap.panel_boya_isci_m2, 'price') || '',
          "Galvaniz Tel (kg)": formatTableValue(hesap.galvaniz_tel_kg, 'price') || '',
          "Boya Kapasite": formatTableValue(hesap.boya_kapasite, 'decimal') || '',
          "Boya Aylık Kapasite": formatTableValue(hesap.boya_aylik_kapasite, 'decimal') || '',
          "Panel Boya Elektrik (m²)": formatTableValue(hesap.panel_boya_elektrik, 'price') || '',
          "Panel Doğalgaz (m²)": formatTableValue(hesap.panel_dogalgaz_m2, 'price') || '',
          "Adet USD": formatTableValue(hesap.adet_usd, 'price') || '',
          "Boya Adet USD": formatTableValue(hesap.boya_adet_usd, 'price') || '',
          "Boyalı Adet USD": formatTableValue(hesap.boyali_adet_usd, 'price') || ''
        }));

        filename = 'Panel_Cit_Gecici_Hesaplar.xlsx';
        sheetName = 'Geçici Hesaplar';
      }

      if (dataToExport.length === 0) {
        alert('Dışa aktarılacak veri bulunamadı!');
        return;
      }

      // XLSX worksheet oluştur
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Başlıklar için stil tanımla - XLSX'in sınırlı stil desteklerine göre düzenlenmiş
      const range = XLSX.utils.decode_range(worksheet['!ref']);

      // Tüm kolonların genişliklerini ayarla
      const columnWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        // Her kolon için varsayılan genişlik
        columnWidths.push({ wch: 15 });
      }
      worksheet['!cols'] = columnWidths;

      // Başlık hücrelerine stil uygula
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });

        // Mevcut hücre yapılandırmasını al veya yeni oluştur
        if (!worksheet[address]) worksheet[address] = { t: 's', v: '' };

        // Stil bilgisini ekle
        if (!worksheet[address].s) worksheet[address].s = {};

        // Kalın yazı tipi ve arka plan rengi uygula
        worksheet[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E6E6E6" } }
        };
      }

      // Workbook oluştur ve worksheet ekle
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Excel dosyasını indir
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      alert('Dışa aktarma sırasında bir hata oluştu: ' + error.message);
    }
  };


const calculatePricesWithMargin = (item, priceType, unit = 'adet', currency = 'usd') => {
  if (!item) return 0;

  const margin = salesMargins[priceType] / 100;

  // Birim ve para birimine göre temel fiyatı al
  let basePrice = 0;

  // Kullanılacak para birimi
  const currencyField = currency.toLowerCase();

  switch (unit) {
    case 'adet':
      basePrice = item[`boyali_adet_${currencyField}`];
      break;
    case 'm2':
      basePrice = item[`boyali_m2_${currencyField}`];
      break;
    case 'kg':
      basePrice = item[`boyali_kg_${currencyField}`];
      break;
    case 'all':
      // Varsayılan olarak adet fiyatını kullan
      basePrice = item[`boyali_adet_${currencyField}`];
      break;
    default:
      basePrice = item[`boyali_adet_${currencyField}`];
  }

  // Marjı uygula ve tam değeri hesapla (yuvarlamadan)
  return basePrice * (1 + margin);
};

  // Genel değişkenleri güncelleme

	const handleGenelDegiskenlerChange = (field, value) => {
	  handleInputChange(value, setGenelDegiskenler, field);
	};
	
	// For Panel Çit Değişkenler
	const handlePanelCitDegiskenlerChange = (field, value) => {
	  handleInputChange(value, setPanelCitDegiskenler, field);
	};
	
	// For Profil Değişkenler
	const handleProfilDegiskenlerChange = (field, value) => {
	  handleInputChange(value, setProfilDegiskenler, field);
	};

  // Bu bileşen, filtered ve sorted panel listesini ve filtre durumunu hesaplar
  const renderPanelList = () => (
    <div className= "bg-white rounded-lg border shadow-sm" >
    <div className="p-4 border-b" >
      <div className="flex items-center justify-between mb-4" >
        <h3 className="text-lg font-semibold" > Panel Çit Listesi </h3>
          < div className = "flex items-center gap-2" >
            <button 
              onClick={ () => setSelectedPanelType('all') }
  className = {`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'all' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`
}
            >
  Tümü
  </button>
  < button
onClick = {() => setSelectedPanelType('SP')}
className = {`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'SP' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
  SP
  </button>
  < button
onClick = {() => setSelectedPanelType('DP')}
className = {`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'DP' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
  DP
  </button>
  < button
onClick = {() => setSelectedPanelType('GP')}
className = {`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'GP' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
  GP
  </button>
  < button
onClick = {() => setSelectedPanelType('OP')}
className = {`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'OP' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
  OP
  </button>
  </div>
  </div>

  < div className = "flex items-center gap-2 mb-4" >
    <div className="relative flex-1" >
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size = { 18} />
        <input 
              type="text"
placeholder = "Panel kodu veya tanımı ara..."
value = { panelSearch }
onChange = {(e) => setPanelSearch(e.target.value)}
className = "pl-10 pr-4 py-2 border rounded-md w-full"
  />
  </div>
  < div className = "flex items-center gap-2" >
    <span className="text-sm text-gray-500" > Toplam: </span>
      < span className = "font-semibold" > { filteredPanelList.length } panel </span>
        </div>

        < button
onClick = {() => calculateCosts(true)}
disabled = { calculating || filteredPanelList.length === 0}
className = "flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
  >
{
  calculating?(
              <>
  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
    Hesaplanıyor...
</>
            ) : (
  <>
  <Calculator className= "w-5 h-5 mr-2" />
  Hesapla
  </>
            )}
</button>

<button
  onClick={() => exportPanelListToExcel()}
  disabled={filteredPanelList.length === 0}
  className="flex items-center px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-amber-300"
>
  <FileSpreadsheet className="w-5 h-5 mr-2" />
  Excel'e Aktar
</button>

  < button
onClick = {() => createOzelPanelsFromFiltered()}
disabled = { filteredPanelList.length === 0 }
className = "flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
  >
  <Plus className="w-5 h-5 mr-2" />
    Özel Panellere Ekle
      </button>
      </div>
      </div>

      < div className = "overflow-x-auto max-h-[500px] overflow-y-auto" >
        <table className="min-w-full divide-y divide-gray-200" >
          <thead className="bg-gray-50 sticky top-0" >
            <tr>
            {
              [
              { key: 'panel_kodu', label: 'Panel Kodu' },
              { key: 'panel_tipi', label: 'Panel Tipi' },
              { key: 'panel_yuksekligi', label: 'Yükseklik' },
              { key: 'panel_genisligi', label: 'Genişlik' },
              { key: 'dikey_tel_capi', label: 'Dikey Tel Çapı' },
              { key: 'yatay_tel_capi', label: 'Yatay Tel Çapı' },
              { key: 'dikey_goz_araligi', label: 'Dikey Göz Aralığı' },
              { key: 'yatay_goz_araligi', label: 'Yatay Göz Aralığı' },
              { key: 'bukum_sayisi', label: 'Büküm Sayısı' },
              { key: 'bukumdeki_cubuk_sayisi', label: 'Bükümdeki Çubuk Sayısı' },
              { key: 'adet_m2', label: 'Adet M²' },
              { key: 'agirlik', label: 'Ağırlık' }
              ].map(column => (
                <th 
                  key= { column.key } 
                  scope = "col" 
                  className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick = {() => sortPanelList(column.key)}
            >
            <div className="flex flex-col" >
              <div className="flex items-center" >
                { column.label }
{
  sortConfig.key === column.key && (
    <span className="ml-1" >
      { sortConfig.direction === 'ascending' ? '↑' : '↓' }
      </span>
                      )
}
</div>
  < input
type = "text"
placeholder = "Filtrele..."
value = { columnFilters[column.key] || '' }
onChange = {(e) => handleColumnFilterChange(column.key, e.target.value)}
onClick = {(e) => e.stopPropagation()}
className = "mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full"
  />
  </div>
  </th>
              ))}
</tr>
  </thead>
  < tbody className = "bg-white divide-y divide-gray-200" >
  {
    filteredPanelList.map((panel) => (
      <tr key= { panel.id } className = "hover:bg-gray-50" >
      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900" > { panel.panel_kodu } </td>
    < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { panel.panel_tipi } </td>
    < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { formatTableValue(panel.panel_yuksekligi, 'decimal') } </td>
    < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { formatTableValue(panel.panel_genisligi, 'decimal') } </td>
      < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { formatTableValue(panel.dikey_tel_capi, 'tel_capi') } </td>
        < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { formatTableValue(panel.yatay_tel_capi, 'tel_capi') } </td>
          < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { formatTableValue(panel.dikey_goz_araligi, 'goz_araligi') } </td>
            < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { formatTableValue(panel.yatay_goz_araligi, 'goz_araligi') } </td>
              < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { panel.bukum_sayisi } </td>
                < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { panel.bukumdeki_cubuk_sayisi } </td>
                  < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { formatTableValue(panel.adet_m2, 'decimal') } </td>
                    < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" > { formatTableValue(panel.agirlik, 'decimal') } </td>
                      </tr>
            ))}
{
  filteredPanelList.length === 0 && (
    <tr>
    <td colSpan="12" className = "px-4 py-4 text-center text-sm text-gray-500" >
      { loading? 'Yükleniyor...': 'Eşleşen panel bulunamadı. Lütfen filtrelerinizi kontrol edin.' }
      </td>
      </tr>
            )
}
</tbody>
  </table>
  </div>
  </div>
  );

// Değişkenler Akordiyon
const renderDegiskenlerAccordion = () => (
  <Accordion type= "single" collapsible className = "bg-white rounded-lg border shadow-sm mb-6" >
    {/* Genel Değişkenler Akordiyon Öğesi */ }
    < AccordionItem value = "genel-degiskenler" >
      <AccordionTrigger className="px-4 py-2 hover:bg-gray-50" >
        <div className="flex items-center" >
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-3" >
            <RefreshCw size={ 18 } />
              </div>
              < span className = "font-semibold text-lg" > Kur ve Genel Değişkenler </span>
                </div>
                </AccordionTrigger>
                < AccordionContent className = "px-4 py-4 border-t" >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4" >
                    {/* Kur Bilgileri */ }
                    < div className = "bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
                      <div className="flex items-center mb-3" >
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3" >
                          <RefreshCw size={ 20 } />
                            </div>
                            < h4 className = "font-medium" > KUR </h4>
                              </div>
                              < div className = "space-y-3" >
                                <div className="flex flex-col" >
                                  <label className="text-sm text-gray-500 mb-1" > USD / TL </label>
                                    < input
type = "text"
value = { genelDegiskenler.usd_tl || '' }
onChange = {(e) => handleGenelDegiskenlerChange('usd_tl', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > EUR / USD </label>
      < input
type = "text"
value = { genelDegiskenler.eur_usd || '' }
onChange = {(e) => handleGenelDegiskenlerChange('eur_usd', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  </div>
  </div>

{/* Genel Değişkenler */ }
<div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
  <div className="flex items-center mb-3" >
    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3" >
      <Calculator size={ 20 } />
        </div>
        < h4 className = "font-medium" > Genel Değişkenler </h4>
          </div>
          < div className = "space-y-3" >
            <div className="flex flex-col" >
              <label className="text-sm text-gray-500 mb-1" > Boya Fiyatı(kg)(€) </label>
                < input
type = "text"
value = { formatDisplayValue(genelDegiskenler.boya_fiyati_kg_eur) || ''}
onChange = {(e) => handleGenelDegiskenlerChange('boya_fiyati_kg_eur', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Elektrik Fiyatı(kW)(₺) </label>
      < input
type = "text"
value = { formatDisplayValue(genelDegiskenler.elektrik_fiyati_kw_tl) || ''}
onChange = {(e) => handleGenelDegiskenlerChange('elektrik_fiyati_kw_tl', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Doğalgaz Fiyatı(Stn.m³)(₺) </label>
      < input
type = "text"
value = { formatDisplayValue(genelDegiskenler.dogalgaz_fiyati_stn_m3_tl) || ''}
onChange = {(e) => handleGenelDegiskenlerChange('dogalgaz_fiyati_stn_m3_tl', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Amortisman & Diğer($) </label>
      < input
type = "text"
value = { formatDisplayValue(genelDegiskenler.amortisman_diger_usd) || ''}
onChange = {(e) => handleGenelDegiskenlerChange('amortisman_diger_usd', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > KAR Oranı(Toplama Ek %) </label>
      < input
type = "text"
value = { formatDisplayValue(genelDegiskenler.kar_toplama_ek_percent) || ''}
onChange = {(e) => handleGenelDegiskenlerChange('kar_toplama_ek_percent', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Ort.İşçi Maaşı(₺) </label>
      < input
type = "text"
value = { formatDisplayValue(genelDegiskenler.ort_isci_maasi) || ''}
onChange = {(e) => handleGenelDegiskenlerChange('ort_isci_maasi', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  </div>
  </div>
  </div>

{/* Satış Marjları */ }
<div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4" >
  <div className="flex items-center mb-3" >
    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-3" >
      <TrendingUp size={ 20 } />
        </div>
        < h4 className = "font-medium" > Satış Marjları </h4>
          </div>
          < div className = "grid grid-cols-1 md:grid-cols-3 gap-4" >
            <div className="flex flex-col" >
              <label className="text-sm text-gray-500 mb-1" > Bronz Marjı(%) </label>
                < input
type = "text"
value = { salesMargins.bronze || 10 }
onChange = {(e) => handleSalesMarginChange('bronze', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Gümüş Marjı(%) </label>
      < input
type = "text"
value = { salesMargins.silver || 20 }
onChange = {(e) => handleSalesMarginChange('silver', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Altın Marjı(%) </label>
      < input
type = "text"
value = { salesMargins.gold || 30 }
onChange = {(e) => handleSalesMarginChange('gold', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  </div>
  </div>

{/* Save & Refresh Section at the Bottom */ }
<div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center" >
  <div className="text-sm text-gray-600 flex items-center" >
    <span>Son Güncelleme: </span>
      < span className = "ml-1 font-medium" >
      {
        genelDegiskenler.genel_latest_update ?
          new Date(genelDegiskenler.genel_latest_update).toLocaleString('tr-TR') :
          'Bilinmiyor'
      }
        </span>
        < button
onClick = {() => fetchSectionData('genel')}
className = "ml-2 p-1 text-blue-600 rounded hover:bg-blue-50"
title = "Yenile"
disabled = { sectionLoading.genel }
  >
  <RefreshCw size={ 16 } className = { sectionLoading.genel ? 'animate-spin' : '' } />
    </button>
    </div>
    < button
onClick = {() => updateGenelDegiskenler()}
className = "px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center"
disabled = { sectionLoading.genel }
  >
  <Save className="w-4 h-4 mr-1.5" />
    Kur ve Genel Değişkenleri Kaydet
      </button>
      </div>
      </AccordionContent>
      </AccordionItem>

{/* Panel Çit Değişkenleri Akordiyon Öğesi */ }
<AccordionItem value="panel-cit-degiskenler" >
  <AccordionTrigger className="px-4 py-2 hover:bg-gray-50" >
    <div className="flex items-center" >
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3" >
        <Filter size={ 18 } />
          </div>
          < span className = "font-semibold text-lg" > Panel Çit Değişkenleri </span>
            </div>
            </AccordionTrigger>
            < AccordionContent className = "px-4 py-4 border-t" >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4" >
                {/* İşçi Sayıları ve Vardiyalar */ }
                < div className = "bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
                  <h4 className="font-medium mb-3" > İşçi Sayıları ve Vardiyalar </h4>
                    < div className = "space-y-3" >
                      <div className="flex flex-col" >
                        <label className="text-sm text-gray-500 mb-1" > Panel Boya İşçi Sayısı(ad) </label>
                          < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.panel_boya_isci_sayisi_ad) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_boya_isci_sayisi_ad', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Boya Vardiya </label>
      < select
value = { formatDisplayValue(panelCitDegiskenler.panel_boya_vardiya) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_boya_vardiya', e.target.value)}
className = "border rounded p-2"
  >
{
  [1, 2, 3, 4, 5, 6].map(num => (
    <option key= { num } value = { num } > { num } </option>
  ))
}
  </select>
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Panel Kaynak İşçi Sayısı(ad) </label>
      < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.panel_kaynak_isci_sayisi_ad) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_kaynak_isci_sayisi_ad', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Kaynak Vardiya </label>
      < select
value = { formatDisplayValue(panelCitDegiskenler.panel_kaynak_vardiya) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_kaynak_vardiya', e.target.value)}
className = "border rounded p-2"
  >
{
  [1, 2, 3, 4, 5, 6].map(num => (
    <option key= { num } value = { num } > { num } </option>
  ))
}
  </select>
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Panel Kesme İşçi Sayısı(ad) </label>
      < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.panel_kesme_isci_sayisi_ad) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_kesme_isci_sayisi_ad', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Kesme Vardiya </label>
      < select
value = { formatDisplayValue(panelCitDegiskenler.panel_kesme_vardiya) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_kesme_vardiya', e.target.value)}
className = "border rounded p-2"
  >
{
  [1, 2, 3, 4, 5, 6].map(num => (
    <option key= { num } value = { num } > { num } </option>
  ))
}
  </select>
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Panel Palet İşçi Sayısı(ad) </label>
      < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.panel_palet_isci_sayisi_ad) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_palet_isci_sayisi_ad', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Palet Vardiya </label>
      < select
value = { formatDisplayValue(panelCitDegiskenler.panel_palet_vardiya) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_palet_vardiya', e.target.value)}
className = "border rounded p-2"
  >
{
  [1, 2, 3, 4, 5, 6].map(num => (
    <option key= { num } value = { num } > { num } </option>
  ))
}
  </select>
  </div>
  </div>
  </div>

{/* Tüketim ve Malzeme */ }
<div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
  <h4 className="font-medium mb-3" > Tüketim ve Malzeme </h4>
    < div className = "space-y-3" >
      <div className="flex flex-col" >
        <label className="text-sm text-gray-500 mb-1" > Panel Kaynak Elektrik Tüketim(kWh) </label>
          < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.panel_kaynak_makinesi_elektrik_tuketim_kwh) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_kaynak_makinesi_elektrik_tuketim_kwh', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Panel Kesme Elektrik Tüketim(kWh) </label>
      < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.panel_kesme_elektrik_tuketim_kwh) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_kesme_elektrik_tuketim_kwh', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Panel Boya Elektrik Tüketim(kWh) </label>
      < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.panel_boya_makinesi_elektrik_tuketim_kwh) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_boya_makinesi_elektrik_tuketim_kwh', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Panel Doğalgaz Tüketim(Stn.m³/h)</label >
      <input 
                    type="text" 
                    value = { formatDisplayValue(panelCitDegiskenler.panel_dogalgaz_tuketim_stn_m3) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('panel_dogalgaz_tuketim_stn_m3', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Galvanizli Tel(Ton)($) </label>
      < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.galvanizli_tel_ton_usd) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('galvanizli_tel_ton_usd', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Hurda(Ton)($) </label>
      < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.hurda_ton_usd) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('hurda_ton_usd', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  </div>
  </div>

{/* Boya ve Üretim Kapasitesi */ }
<div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
  <h4 className="font-medium mb-3" > Boya ve Üretim Kapasitesi </h4>
    < div className = "space-y-3" >
      <div className="flex flex-col" >
        <label className="text-sm text-gray-500 mb-1" > SP Boya Tüketim Miktarı(gr / m²) </label>
          < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.sp_boya_tuketim_miktari) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('sp_boya_tuketim_miktari', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > DP Boya Tüketim Miktarı(gr / m²) </label>
      < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.dp_boya_tuketim_miktari) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('dp_boya_tuketim_miktari', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > GP Boya Tüketim Miktarı(gr / m²) </label>
      < input
type = "text"
value = { formatDisplayValue(panelCitDegiskenler.guvenlik_boya_tuketim_miktari_gr) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('guvenlik_boya_tuketim_miktari_gr', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Ort.Panel Ürt.Kapasitesi(m²/Ay)</label >
      <input 
                    type="text" 
                    value = { formatDisplayValue(panelCitDegiskenler.uretim_kapasite) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('uretim_kapasite', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Ortalama Saatlik Üretim(m²/h)</label >
      <input 
                    type="text" 
                    value = { formatDisplayValue(panelCitDegiskenler.saatlik_uretim) || ''}
onChange = {(e) => handlePanelCitDegiskenlerChange('saatlik_uretim', e.target.value)}
className = "border rounded p-2"
disabled
  />
  </div>
  </div>
  </div>
  </div>

{/* Save & Refresh Section at the Bottom */ }
<div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center" >
  <div className="text-sm text-gray-600 flex items-center" >
    <span>Son Güncelleme: </span>
      < span className = "ml-1 font-medium" >
      {
        panelCitDegiskenler.panel_cit_latest_update ?
          new Date(panelCitDegiskenler.panel_cit_latest_update).toLocaleString('tr-TR') :
          'Bilinmiyor'
      }
        </span>
        < button
onClick = {() => fetchSectionData('panelCit')}
className = "ml-2 p-1 text-blue-600 rounded hover:bg-blue-50"
title = "Yenile"
disabled = { sectionLoading.panelCit }
  >
  <RefreshCw size={ 16 } className = { sectionLoading.panelCit ? 'animate-spin' : '' } />
    </button>
    </div>
    < button
onClick = {() => updatePanelCitDegiskenler()}
className = "px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center"
disabled = { sectionLoading.panelCit }
  >
  <Save className="w-4 h-4 mr-1.5" />
    Panel Çit Değişkenlerini Kaydet
      </button>
      </div>
      </AccordionContent>
      </AccordionItem>

{/* Profil Değişkenleri Akordiyon Öğesi */ }
<AccordionItem value="profil-degiskenler" >
  <AccordionTrigger className="px-4 py-2 hover:bg-gray-50" >
    <div className="flex items-center" >
      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-3" >
        <Filter size={ 18 } />
          </div>
          < span className = "font-semibold text-lg" > Profil Değişkenleri </span>
            </div>
            </AccordionTrigger>
            < AccordionContent className = "px-4 py-4 border-t" >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4" >
                {/* Profil Fiyatları */ }
                < div className = "bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
                  <h4 className="font-medium mb-3" > Profil Fiyatları </h4>
                    < div className = "space-y-3" >
                      <div className="flex flex-col" >
                        <label className="text-sm text-gray-500 mb-1" > Galvanizli Profil(Ton)($) </label>
                          < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.galvanizli_profil_kg_usd) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('galvanizli_profil_kg_usd', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Galvanizsiz Profil(Ton)($) </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.galvanizsiz_profil_kg_usd) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('galvanizsiz_profil_kg_usd', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  </div>
  </div>

{/* Üretim Kapasitesi ve İşçilik */ }
<div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
  <h4 className="font-medium mb-3" > Üretim Kapasitesi ve İşçilik </h4>
    < div className = "space-y-3" >
      <div className="flex flex-col" >
        <label className="text-sm text-gray-500 mb-1" > Profil Min.Ürt.Kapasitesi(ad / h) </label>
          < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.profil_uretim_kapasitesi_m2_h) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_uretim_kapasitesi_m2_h', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Profil Vardiya </label>
      < select
value = { formatDisplayValue(profilDegiskenler.profil_isci_sayisi_ad) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_vardiya', e.target.value)}
className = "border rounded p-2"
  >
{
  [1, 2, 3, 4, 5, 6].map(num => (
    <option key= { num } value = { num } > { num } </option>
  ))
}
  </select>
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Profil İşçi Sayısı(ad) </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.profil_vardiya) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_isci_sayisi_ad', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  </div>
  </div>
{/* Elektrik Tüketimi */ }
<div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
  <h4 className="font-medium mb-3" > Elektrik Tüketimi </h4>
    < div className = "space-y-3" >
      <div className="flex flex-col" >
        <label className="text-sm text-gray-500 mb-1" > Profil Kaynak Makinesi Elektrik Tüketim Miktarı(kWh) </label>
          < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.profil_kaynak_makinesi_elektrik_tuketim_kwh) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_kaynak_makinesi_elektrik_tuketim_kwh', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Profil Kesme Makinesi Elektrik Tüketim Miktarı(kWh) </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.profil_kesme_elektrik_tuketim_kwh) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_kesme_elektrik_tuketim_kwh', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Profil Boya Makinesi Elektrik Tüketim Miktarı(kWh) </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.profil_boya_makinesi_elektrik_tuketim_kwh) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_boya_makinesi_elektrik_tuketim_kwh', e.target.value)}
className = "border rounded p-2"
  />
  {/* buraya dönebilirin */ }
  </div>
  </div>
  </div>

{/* Doğalgaz ve Boya Tüketimi */ }
<div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
  <h4 className="font-medium mb-3" > Doğalgaz ve Boya Tüketimi </h4>
    < div className = "space-y-3" >
      <div className="flex flex-col" >
        <label className="text-sm text-gray-500 mb-1" > Profil Doğalgaz Tüketim Miktarı(Stn.m³/h)</label >
          <input 
                    type="text" 
                    value = { formatDisplayValue(profilDegiskenler.profil_dogalgaz_tuketim_stn_m3) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_dogalgaz_tuketim_stn_m3', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Profil Boya Tüketim Miktarı(gr / m²) </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.profil_boya_tuketim) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_boya_tuketim', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  </div>
  </div>

{/* Fiziksel Özellikler */ }
<div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
  <h4 className="font-medium mb-3" > Fiziksel Özellikler </h4>
    < div className = "space-y-3" >
      <div className="flex flex-col" >
        <label className="text-sm text-gray-500 mb-1" > Profil En 1 </label>
          < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.profil_en1) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_en1', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Profil En 2 </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.profil_en2) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_en2', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Profil Et Kalınlığı </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.profil_et_kalinligi) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('profil_et_kalinligi', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  </div>
  </div>

{/* Aksam Fiyatları */ }
<div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm" >
  <h4 className="font-medium mb-3" > Aksam Fiyatları </h4>
    < div className = "grid grid-cols-2 gap-3" >
      <div className="flex flex-col" >
        <label className="text-sm text-gray-500 mb-1" > Flans Fyt(ad)(₺) </label>
          < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.flans_ad_tl) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('flans_ad_tl', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Vida Fyt(ad)(₺) </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.vida_ad_tl) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('vida_ad_tl', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Klips Fyt(ad)(₺) </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.klips_ad_tl) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('klips_ad_tl', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Dubel Fyt(ad)(₺) </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.dubel_ad_tl) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('dubel_ad_tl', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  < div className = "flex flex-col" >
    <label className="text-sm text-gray-500 mb-1" > Kapak Fyt(ad)(₺) </label>
      < input
type = "text"
value = { formatDisplayValue(profilDegiskenler.kapak_ad_tl) || ''}
onChange = {(e) => handleProfilDegiskenlerChange('kapak_ad_tl', e.target.value)}
className = "border rounded p-2"
  />
  </div>
  </div>
  </div>
  </div>

{/* Save & Refresh Section at the Bottom */ }
<div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center" >
  <div className="text-sm text-gray-600 flex items-center" >
    <span>Son Güncelleme: </span>
      < span className = "ml-1 font-medium" >
      {
        profilDegiskenler.profil_latest_update ?
          new Date(profilDegiskenler.profil_latest_update).toLocaleString('tr-TR') :
          'Bilinmiyor'
      }
        </span>
        < button
onClick = {() => fetchSectionData('profil')}
className = "ml-2 p-1 text-blue-600 rounded hover:bg-blue-50"
title = "Yenile"
disabled = { sectionLoading.profil }
  >
  <RefreshCw size={ 16 } className = { sectionLoading.profil ? 'animate-spin' : '' } />
    </button>
    </div>
    < button
onClick = {() => updateProfilDegiskenler()}
className = "px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center"
disabled = { sectionLoading.profil }
  >
  <Save className="w-4 h-4 mr-1.5" />
    Profil Değişkenlerini Kaydet
      </button>
      </div>
      </AccordionContent>
      </AccordionItem>
      </Accordion>
  );

// Özel Panel & Palet Bilgileri Hesaplama - COMPLETELY REDESIGNED to be fully interactive
const renderSpecialPanelEntry = () => {
  // NumberInput bileşeni - ondalık giriş sorunlarını önlemek için
  const NumberInput = ({ value, onChange, fieldName, panelId, className }) => {
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => {
          const newValue = e.target.value;
          // Sayı ve ondalık nokta/virgül kontrolü
          if (/^[0-9]*[.,]?[0-9]*$/.test(newValue) || newValue === '') {
            onChange(panelId, fieldName, newValue);
          }
        }}
        className={className || "w-20 border rounded p-1 text-sm"}
      />
    );
  };
  
  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Özel Panel & Palet Bilgileri Hesaplama</h3>
          <div className="flex items-center gap-2">
		<button 
		  onClick={addOzelPanel}
		  className="flex items-center px-4 py-2.5 bg-yellow-400 text-gray-800 rounded-md hover:bg-yellow-500 text-sm"
		>
		  <Plus className="w-4 h-4 mr-1" />
		  Yeni Panel Ekle
		</button>
		
		<button 
		  onClick={resetOzelPanelList}
		  disabled={ozelPanelList.length === 0}
		  className="flex items-center px-4 py-2.5 bg-red-200 text-gray-800 rounded-md hover:bg-red-300 disabled:bg-red-100 text-sm"
		>
		  <Trash2 className="w-4 h-4 mr-1" />
		  Sıfırla
		</button>
		
		<button
		  onClick={() => calculateCosts(false)}
		  disabled={calculating || ozelPanelList.length === 0}
		  className="flex items-center px-4 py-2.5 bg-blue-200 text-gray-800 rounded-md hover:bg-blue-300 disabled:bg-blue-100 text-sm"
		>
		  {calculating ? (
		    <>
		      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
		      Hesaplanıyor...
		    </>
		  ) : (
		    <>
		      <Calculator className="w-4 h-4 mr-1.5" />
		      Hesapla
		    </>
		  )}
		</button>
		
		<button
		  onClick={() => saveAllOzelPanelsToDatabase()}
		  disabled={ozelPanelList.length === 0}
		  className="flex items-center px-4 py-2.5 bg-green-200 text-gray-800 rounded-md hover:bg-green-300 disabled:bg-green-100 text-sm"
		>
		  <Save className="w-4 h-4 mr-1.5" />
		  Veritabanına Kaydet
		</button>
		
		<button
		  onClick={() => exportToExcel('ozel')}
		  disabled={ozelPanelList.length === 0}
		  className="flex items-center px-4 py-2.5 text-white rounded-md disabled:opacity-50 text-sm"
		  style={{ backgroundColor: "#1e6b3b", color: "#ffffff" }}
		>
		  <FileSpreadsheet className="w-4 h-4 mr-1.5" />
		  Excel'e Aktar
		</button>


          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Özel panel bilgilerini girin ve hesaplamaları yapın. Girdi alanları <span className="px-2 py-0.5 bg-blue-100 rounded">mavi</span> ile işaretlenmiştir, diğer alanlar otomatik hesaplanır. Daha sonra isterseniz panelleri veritabanına kaydedebilirsiniz.
        </p>
      </div>

	      <div className="flex flex-col">
	  {/* Top scrollbar */}
	  <div className="overflow-x-scroll overflow-y-hidden" style={{ height: "20px" }}>
	    <div style={{ width: "3000px", height: "1px" }}></div>
	  </div>
	  
	  {/* Main table with synchronized scrolling */}
	  <div 
	    className="overflow-x-scroll" 
	    id="ozelPanelTableContainer"
	    style={{ 
	      minWidth: "100%", 
	      paddingBottom: "8px",
	      marginBottom: "12px"
	    }}
	    onScroll={(e) => {
	      const topScrollbar = e.target.previousSibling;
	      if (topScrollbar) {
	        topScrollbar.scrollLeft = e.target.scrollLeft;
	      }
	    }}
	  >
        <table className="min-w-max divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Girdi alanları - mavi tonlu başlıklar */}
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium bg-blue-50 text-blue-800 uppercase tracking-wider">Panel Tipi</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium bg-blue-50 text-blue-800 uppercase tracking-wider">Yükseklik</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium bg-blue-50 text-blue-800 uppercase tracking-wider">Genişlik</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium bg-blue-50 text-blue-800 uppercase tracking-wider">Dikey Tel Çapı</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium bg-blue-50 text-blue-800 uppercase tracking-wider">Yatay Tel Çapı</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium bg-blue-50 text-blue-800 uppercase tracking-wider">Dikey Göz Aralığı</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium bg-blue-50 text-blue-800 uppercase tracking-wider">Yatay Göz Aralığı</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium bg-blue-50 text-blue-800 uppercase tracking-wider">Büküm Sayısı</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium bg-blue-50 text-blue-800 uppercase tracking-wider">Bükümdeki Çubuk Sayısı</th>

              {/* Hesaplanan alanlar - normal başlıklar */}
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dikey Çubuk Adedi</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yatay Çubuk Adedi</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adet M²</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ağırlık</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boya Kg</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı Hali</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">M² Ağırlık</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paletteki Panel Sayısı</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Palet Boş Ağırlık</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paletsiz Toplam Ağırlık</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Palet Dolu Ağırlık</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boş Palet Yüksekliği</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adet Panel Yüksekliği</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paletsiz Toplam Panel Yüksekliği</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paletli Yükseklik</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Panel Kodu</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Icube Code</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Icube-Code(Adetli)</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          
<tbody className="bg-white divide-y divide-gray-200">
            {ozelPanelList.map((panel) => (
              <tr key={panel.id} className={panel.isNew ? 'bg-green-50' : ''}>
                {/* Girdi alanları - mavi arkaplan ile */}
                <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                  <select
                    value={panel.panel_tipi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'panel_tipi', e.target.value)}
                    className="w-full border rounded p-1 text-sm bg-white"
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Guvenlik">Güvenlik</option>
                  </select>
                </td>
                <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                  <input
                    type="text"
                    value={panel.panel_yuksekligi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'panel_yuksekligi', e.target.value)}
                    className="w-16 border rounded p-1 text-sm bg-white"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                  <input
                    type="text"
                    value={panel.panel_genisligi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'panel_genisligi', e.target.value)}
                    className="w-16 border rounded p-1 text-sm bg-white"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                  <input
                    type="text"
                    value={panel.dikey_tel_capi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'dikey_tel_capi', e.target.value)}
                    className="w-16 border rounded p-1 text-sm bg-white"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                  <input
                    type="text"
                    value={panel.yatay_tel_capi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'yatay_tel_capi', e.target.value)}
                    className="w-16 border rounded p-1 text-sm bg-white"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                  <input
                    type="text"
                    value={panel.dikey_goz_araligi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'dikey_goz_araligi', e.target.value)}
                    className="w-16 border rounded p-1 text-sm bg-white"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                  <input
                    type="text"
                    value={panel.yatay_goz_araligi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'yatay_goz_araligi', e.target.value)}
                    className="w-16 border rounded p-1 text-sm bg-white"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                  <input
                    type="text"
                    value={panel.bukum_sayisi === 0 ? '0' : panel.bukum_sayisi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'bukum_sayisi', e.target.value)}
                    className="w-16 border rounded p-1 text-sm bg-white"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap bg-blue-50">
                  <input
                    type="text"
                    value={panel.bukumdeki_cubuk_sayisi === 0 ? '0' : panel.bukumdeki_cubuk_sayisi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'bukumdeki_cubuk_sayisi', e.target.value)}
                    className="w-16 border rounded p-1 text-sm bg-white"
                  />
                </td>

                {/* Hesaplanan alanlar - artık düzenlenebilir */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.dikey_cubuk_adet || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'dikey_cubuk_adet', e.target.value)}
                    className="w-16 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.yatay_cubuk_adet || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'yatay_cubuk_adet', e.target.value)}
                    className="w-16 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.adet_m2, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'adet_m2', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.agirlik, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'agirlik', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.boya_kg, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'boya_kg', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.boyali_hali, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'boyali_hali', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.m2_agirlik, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'm2_agirlik', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.paletteki_panel_sayisi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'paletteki_panel_sayisi', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.palet_bos_agirlik, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'palet_bos_agirlik', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.paletsiz_toplam_agirlik, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'paletsiz_toplam_agirlik', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.palet_dolu_agirlik, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'palet_dolu_agirlik', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.bos_palet_yuksekligi || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'bos_palet_yuksekligi', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.adet_panel_yuksekligi, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'adet_panel_yuksekligi', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.paletsiz_toplam_panel_yuksekligi, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'paletsiz_toplam_panel_yuksekligi', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={formatTableValue(panel.paletli_yukseklik, 'decimal') || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'paletli_yukseklik', e.target.value)}
                    className="w-20 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.panel_kodu || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'panel_kodu', e.target.value)}
                    className="w-56 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.icube_code || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'icube_code', e.target.value)}
                    className="w-40 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.icube_code_adetli || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'icube_code_adetli', e.target.value)}
                    className="w-48 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.stok_kodu || ''}
                    onChange={(e) => updateOzelPanel(panel.id, 'stok_kodu', e.target.value)}
                    className="w-40 border border-gray-200 rounded p-1 text-sm"
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => saveOzelPanelToDatabase(panel)}
                      className="text-green-600 hover:text-green-800"
                      title="Veritabanına Kaydet"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() => removeOzelPanel(panel.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {ozelPanelList.length === 0 && (
              <tr>
                <td colSpan="28" className="px-3 py-4 text-center text-sm text-gray-500">
                  Henüz özel panel eklenmemiş. Yeni panel eklemek için yukarıdaki "Yeni Panel Ekle" düğmesini kullanın.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Sonuçlar (Maliyet Listesi) Tablosu
const renderResults = () => (
  <div className= "bg-white rounded-lg border shadow-sm" >
  <div className="p-4 border-b" >
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4" >
      <h3 className="text-lg font-semibold" > Maliyet Hesaplama Sonuçları </h3>

        < div className = "flex items-center gap-3" >
          <div className="flex items-center gap-1" >
            <span className="text-sm text-gray-500" > Para Birimi: </span>
              < select
value = { resultFilter.currency }
onChange = {(e) => handleResultFilterChange('currency', e.target.value)}
className = "border rounded p-1 text-sm"
  >
  <option value="all" > Tümü </option>
    < option value = "USD" > USD </option>
      < option value = "EUR" > EUR </option>
        < option value = "TRY" > TRY </option>
          </select>
          </div>

          < div className = "flex items-center gap-1" >
            <span className="text-sm text-gray-500" > Birim: </span>
              < select
value = { resultFilter.unit }
onChange = {(e) => handleResultFilterChange('unit', e.target.value)}
className = "border rounded p-1 text-sm"
  >
  <option value="all" > Tümü </option>
    < option value = "adet" > Adet </option>
      < option value = "m2" > m²</option>
        < option value = "kg" > kg </option>
          </select>
          </div>

          < div className = "flex items-center gap-1" >
            <span className="text-sm text-gray-500" > Tip: </span>
              < select
value = { resultFilter.type }
onChange = {(e) => handleResultFilterChange('type', e.target.value)}
className = "border rounded p-1 text-sm"
  >
  <option value="all" > Tümü </option>
    < option value = "ciplak" > Çıplak </option>
      < option value = "boyali" > Boyalı </option>
        < option value = "setli_boyasiz" > Setli + Boyasız </option>
          < option value = "setli_boyali" > Setli + Boyalı </option>
            </select>
            </div>

            < button
onClick = {() => exportToExcel('maliyet')}
className = "flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
disabled = { maliyetListesi.length === 0 }
  >
  <FileSpreadsheet className="w-4 h-4 mr-1" />
    Excel'e Aktar
      </button>

      < button
onClick = {() => setShowSalesView(true)}
className = "flex items-center px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm"
disabled = { maliyetListesi.length === 0 }
  >
  <TrendingUp className="w-4 h-4 mr-1" />
    Satış Listesi
      </button>
      </div>
      </div>

      < div className = "flex items-center gap-2 mb-2" >
        <div className="relative flex-1" >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size = { 18} />
            <input 
              type="text"
placeholder = "Panel kodu ara..."
value = { panelSearch }
onChange = {(e) => setPanelSearch(e.target.value)}
className = "pl-10 pr-4 py-2 border rounded-md w-full"
  />
  </div>
  < div className = "flex items-center gap-2" >
    <span className="text-sm text-gray-500" > Toplam: </span>
      < span className = "font-semibold" > { maliyetListesi.length } sonuç </span>
        </div>
        </div>
        </div>

        < div className = "overflow-x-auto max-h-[500px] overflow-y-auto" >
          <table className="min-w-full divide-y divide-gray-200" >
            <thead className="bg-gray-50 sticky top-0" >
              <tr>
              <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 whitespace-nowrap" >
                ID(Manual Order)
                </th>
                < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-10 bg-gray-50 z-10 whitespace-nowrap" >
                  Panel Kodu
                    </th>
                    < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                      Panel Tipi
                        </th>
                        < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                          Panel Yüksekliği
                            </th>
                            < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                              Panel Genişliği
                                </th>
                                < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                                  Dikey Tel Çapı
                                    </th>
                                    < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                                      Yatay Tel Çapı
                                        </th>
                                        < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                                          Dikey Göz Aralığı
                                            </th>
                                            < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                                              Yatay Göz Aralığı
                                                </th>

{/* Çıplak Adet */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Çıplak Adet USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Çıplak Adet EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Çıplak Adet TRY
        </th>
                  )
}
</>
              )}

{/* Çıplak M2 */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Çıplak M2 USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Çıplak M2 EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Çıplak M2 TRY
        </th>
                  )
}
</>
              )}

{/* Çıplak Kg */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Çıplak Kg USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Çıplak Kg EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Çıplak Kg TRY
        </th>
                  )
}
</>
              )}

{/* Boyalı Adet */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Boyalı Adet USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Boyalı Adet EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Boyalı Adet TRY
        </th>
                  )
}
</>
              )}

{/* Boyalı M2 */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Boyalı M2 USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Boyalı M2 EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Boyalı M2 TRY
        </th>
                  )
}
</>
              )}

{/* Boyalı Kg */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Boyalı Kg USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Boyalı Kg EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Boyalı Kg TRY
        </th>
                  )
}
</>
              )}

{/* Standart Setli + Boyasız Adet */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Standart Setli + Boyasız Adet USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyasız Adet EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyasız Adet TRY
        </th>
                  )
}
</>
              )}

{/* Standart Setli + Boyasız M2 */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Standart Setli + Boyasız M2 USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyasız M2 EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyasız M2 TRY
        </th>
                  )
}
</>
              )}

{/* Standart Setli + Boyasız Kg */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Standart Setli + Boyasız Kg USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyasız Kg EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyasız Kg TRY
        </th>
                  )
}
</>
              )}

{/* Standart Setli + Boyalı Adet */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Standart Setli + Boyalı Adet USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyalı Adet EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyalı Adet TRY
        </th>
                  )
}
</>
              )}

{/* Standart Setli + Boyalı M2 */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Standart Setli + Boyalı M2 USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyalı M2 EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyalı M2 TRY
        </th>
                  )
}
</>
              )}

{/* Standart Setli + Boyalı Kg */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
        Standart Setli + Boyalı Kg USD
          </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyalı Kg EUR
        </th>
                  )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
      Standart Setli + Boyalı Kg TRY
        </th>
                  )
}
</>
              )}
</tr>
  </thead>
  < tbody className = "bg-white divide-y divide-gray-200" >
  {
    filterMaliyetListesi().map((maliyet, index) => (
      <tr key= { index } className = "hover:bg-gray-50" >
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white" >
      { maliyet.manual_order }
      </td>
    < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500 sticky left-10 bg-white" >
    { maliyet.panel_kodu }
    </td>
    < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
    { maliyet.panel_tipi }
    </td>
    < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
    { formatTableValue(maliyet.panel_yuksekligi, 'decimal')
  }
    </td>
    < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.panel_genisligi, 'decimal') }
      </td>
      < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.dikey_tel_capi, 'tel_capi') }
        </td>
        < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
          { formatTableValue(maliyet.yatay_tel_capi, 'tel_capi') }
          </td>
          < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
            { maliyet.dikey_goz_araligi }
            </td>
            < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
              { maliyet.yatay_goz_araligi }
              </td>

{/* Çıplak Adet */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.ciplak_adet_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.ciplak_adet_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.ciplak_adet_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Çıplak M2 */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.ciplak_m2_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.ciplak_m2_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.ciplak_m2_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Çıplak Kg */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.ciplak_kg_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.ciplak_kg_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.ciplak_kg_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Boyalı Adet */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.boyali_adet_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.boyali_adet_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.boyali_adet_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Boyalı M2 */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.boyali_m2_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.boyali_m2_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.boyali_m2_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Boyalı Kg */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.boyali_kg_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.boyali_kg_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.boyali_kg_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Standart Setli + Boyasız Adet */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.standart_setli_boyasiz_adet_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyasiz_adet_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyasiz_adet_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Standart Setli + Boyasız M2 */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.standart_setli_boyasiz_m2_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyasiz_m2_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyasiz_m2_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Standart Setli + Boyasız Kg */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.standart_setli_boyasiz_kg_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyasiz_kg_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyasiz_kg_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Standart Setli + Boyalı Adet */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.standart_setli_boyali_adet_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyali_adet_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyali_adet_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Standart Setli + Boyalı M2 */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.standart_setli_boyali_m2_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyali_m2_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyali_m2_try, 'price') }
      </td>
                    )
}
</>
                )}

{/* Standart Setli + Boyalı Kg */ }
{
  (resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
    <>
    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(maliyet.standart_setli_boyali_kg_usd, 'price') }
        </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyali_kg_eur, 'price') }
      </td>
                    )
}
{
  (resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(maliyet.standart_setli_boyali_kg_try, 'price') }
      </td>
                    )
}
</>
                )}
</tr>
            ))}

{
  filterMaliyetListesi().length === 0 && (
    <tr>
    <td colSpan="100%" className = "px-4 py-4 text-center text-sm text-gray-500" >
      Hesaplama yapılmamış veya sonuçlar bulunamadı.
                </td>
        </tr>
            )
}
</tbody>
  </table>
  </div>
  </div>
  );

// Satış Listesi Tablosu - IMPROVED colors for different tiers
const renderSalesView = () => (
  <div className= "bg-white rounded-lg border shadow-sm" >
  <div className="p-4 border-b" >
    <div className="flex flex-wrap items-center justify-between gap-2 mb-4" >
      <h3 className="text-lg font-semibold flex items-center" >
        <Sparkles className="mr-2 text-amber-500" size = { 20} />
          Satış Fiyat Listesi
            </h3>

            < div className = "flex items-center gap-3" >
              <div className="flex items-center gap-1" >
                <span className="text-sm text-gray-500" > Para Birimi: </span>
                  < select
value = { salesFilter.currency }
onChange = {(e) => handleSalesFilterChange('currency', e.target.value)}
className = "border rounded p-1 text-sm"
  >
  <option value="USD" > USD </option>
    < option value = "EUR" > EUR </option>
      < option value = "TRY" > TRY </option>
        </select>
        </div>

        < div className = "flex items-center gap-1" >
          <span className="text-sm text-gray-500" > Birim: </span>
            < select
value = { salesFilter.unit }
onChange = {(e) => handleSalesFilterChange('unit', e.target.value)}
className = "border rounded p-1 text-sm"
  >
  <option value="adet" > Adet </option>
    < option value = "m2" > m²</option>
      < option value = "kg" > kg </option>
        </select>
        </div>

        < button
onClick = {() => exportToExcel('satis')}
className = "flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
disabled = { satisListesi.length === 0 }
  >
  <FileSpreadsheet className="w-4 h-4 mr-1" />
    Excel & apos;e Aktar
      </button>

      < button
onClick = {() => setShowSalesView(false)}
className = "flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
  >
  <Calculator className="w-4 h-4 mr-1" />
    Maliyet Listesi
      </button>
      </div>
      </div>

      < div className = "flex items-center gap-2 mb-2" >
        <div className="relative flex-1" >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size = { 18} />
            <input 
              type="text"
placeholder = "Panel kodu ara..."
value = { panelSearch }
onChange = {(e) => setPanelSearch(e.target.value)}
className = "pl-10 pr-4 py-2 border rounded-md w-full"
  />
  </div>
  < div className = "flex items-center gap-2" >
    <span className="text-sm text-gray-500" > Toplam: </span>
      < span className = "font-semibold" > { satisListesi.length } sonuç </span>
        </div>
        </div>
        </div>

        < div className = "overflow-x-auto max-h-[500px] overflow-y-auto" >
          <table className="min-w-full divide-y divide-gray-200" >
            <thead className="bg-gray-50 sticky top-0" >
              <tr>
              <th scope="col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 whitespace-nowrap" >
                Panel Kodu
                  </th>
                  < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                    Panel Tipi
                      </th>
                      < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                        Panel Yüksekliği
                          </th>
                          < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                            Panel Genişliği
                              </th>
                              < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                                Dikey Tel Çapı
                                  </th>
                                  < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                                    Yatay Tel Çapı
                                      </th>
                                      < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                                        Dikey Göz Aralığı
                                          </th>
                                          < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap" >
                                            Yatay Göz Aralığı
                                              </th>

{/* Özel birim filtrelemeyi destekler */ }
{
  salesFilter.unit === 'all' || salesFilter.unit === 'adet' ? (
    <>
    <th scope= "col" className = "px-4 py-3 text-left text-xs font-medium bg-amber-50 text-amber-700 uppercase tracking-wider whitespace-nowrap" >
      Bronz Fiyat - Adet({ salesFilter.currency })
        </th>
        < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium bg-gray-100 text-gray-700 uppercase tracking-wider whitespace-nowrap" >
          Gümüş Fiyat - Adet({ salesFilter.currency })
            </th>
            < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium bg-yellow-100 text-yellow-800 uppercase tracking-wider whitespace-nowrap" >
              Altın Fiyat - Adet({ salesFilter.currency })
                </th>
                </>
              ) : null
}

{
  salesFilter.unit === 'all' || salesFilter.unit === 'm2' ? (
    <>
    <th scope= "col" className = "px-4 py-3 text-left text-xs font-medium bg-amber-50 text-amber-700 uppercase tracking-wider whitespace-nowrap" >
      Bronz Fiyat - m² ({ salesFilter.currency })
        </th>
        < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium bg-gray-100 text-gray-700 uppercase tracking-wider whitespace-nowrap" >
          Gümüş Fiyat - m² ({ salesFilter.currency })
            </th>
            < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium bg-yellow-100 text-yellow-800 uppercase tracking-wider whitespace-nowrap" >
              Altın Fiyat - m² ({ salesFilter.currency })
                </th>
                </>
              ) : null
}

{
  salesFilter.unit === 'all' || salesFilter.unit === 'kg' ? (
    <>
    <th scope= "col" className = "px-4 py-3 text-left text-xs font-medium bg-amber-50 text-amber-700 uppercase tracking-wider whitespace-nowrap" >
      Bronz Fiyat - kg({ salesFilter.currency })
        </th>
        < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium bg-gray-100 text-gray-700 uppercase tracking-wider whitespace-nowrap" >
          Gümüş Fiyat - kg({ salesFilter.currency })
            </th>
            < th scope = "col" className = "px-4 py-3 text-left text-xs font-medium bg-yellow-100 text-yellow-800 uppercase tracking-wider whitespace-nowrap" >
              Altın Fiyat - kg({ salesFilter.currency })
                </th>
                </>
              ) : null
}
</tr>
  </thead>
  < tbody className = "bg-white divide-y divide-gray-200" >
  {
    filterMaliyetListesi().map((item, index) => {
      const currency = salesFilter.currency.toLowerCase();

      return (
        <tr key= { index } className = "hover:bg-gray-50" >
          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white" >
            { item.panel_kodu }
            </td>
            < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
              { item.panel_tipi }
              </td>
              < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
                { item.panel_yuksekligi }
                </td>
                < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
                  { item.panel_genisligi }
                  </td>
                  < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
                    { formatTableValue(item.dikey_tel_capi, 'tel_capi')
  }
    </td>
    < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
      { formatTableValue(item.yatay_tel_capi, 'tel_capi') }
      </td>
      < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
        { formatTableValue(item.dikey_goz_araligi, 'goz_araligi') }
        </td>
        < td className = "px-4 py-2 whitespace-nowrap text-sm text-gray-500" >
          { formatTableValue(item.yatay_goz_araligi, 'goz_araligi') }
          </td>

{/* Fiyatlar - Adet */ }
{
  salesFilter.unit === 'all' || salesFilter.unit === 'adet' ? (
    <>
    <td className= "px-4 py-2 whitespace-nowrap text-sm font-medium bg-amber-50 text-amber-700" >
    { formatTableValue(calculatePricesWithMargin(item, 'bronze', 'adet', currency), 'price')
}
</td>
  < td className = "px-4 py-2 whitespace-nowrap text-sm font-medium bg-gray-100 text-gray-700" >
    { formatTableValue(calculatePricesWithMargin(item, 'silver', 'adet', currency), 'price')}
</td>
  < td className = "px-4 py-2 whitespace-nowrap text-sm font-medium bg-yellow-100 text-yellow-800" >
    { formatTableValue(calculatePricesWithMargin(item, 'gold', 'adet', currency), 'price')}
</td>
  </>
                  ) : null}

{/* Fiyatlar - m² */ }
{
  salesFilter.unit === 'all' || salesFilter.unit === 'm2' ? (
    <>
    <td className= "px-4 py-2 whitespace-nowrap text-sm font-medium bg-amber-50 text-amber-700" >
    { formatTableValue(calculatePricesWithMargin(item, 'bronze', 'm2', currency), 'price')
}
</td>
  < td className = "px-4 py-2 whitespace-nowrap text-sm font-medium bg-gray-100 text-gray-700" >
    { formatTableValue(calculatePricesWithMargin(item, 'silver', 'm2', currency), 'price')}
</td>
  < td className = "px-4 py-2 whitespace-nowrap text-sm font-medium bg-yellow-100 text-yellow-800" >
    { formatTableValue(calculatePricesWithMargin(item, 'gold', 'm2', currency), 'price')}
</td>
  </>
                  ) : null}

{/* Fiyatlar - kg */ }
{
  salesFilter.unit === 'all' || salesFilter.unit === 'kg' ? (
    <>
    <td className= "px-4 py-2 whitespace-nowrap text-sm font-medium bg-amber-50 text-amber-700" >
    { formatTableValue(calculatePricesWithMargin(item, 'bronze', 'kg', currency), 'price')
}
</td>
  < td className = "px-4 py-2 whitespace-nowrap text-sm font-medium bg-gray-100 text-gray-700" >
    { formatTableValue(calculatePricesWithMargin(item, 'silver', 'kg', currency), 'price')}
</td>
  < td className = "px-4 py-2 whitespace-nowrap text-sm font-medium bg-yellow-100 text-yellow-800" >
    { formatTableValue(calculatePricesWithMargin(item, 'gold', 'kg', currency), 'price')}
</td>
  </>
                  ) : null}
</tr>
              );
            })}

{
  maliyetListesi.length === 0 && (
    <tr>
    <td colSpan="20" className = "px-4 py-4 text-center text-sm text-gray-500" >
      Satış fiyat listesi bulunamadı veya hiç hesaplama yapılmadı.
                </td>
        </tr>
            )
}
</tbody>
  </table>
  </div>
  </div>
  );

// Geçici Hesaplamalar tablosunu göster - daha ayrıntılı bilgilerle
const renderTempCalculations = () => (
  <div className= "bg-white rounded-lg border shadow-sm" >
  <div className="p-4 border-b" >
    <div className="flex items-center justify-between mb-4" >
      <h3 className="text-lg font-semibold" > Geçici Hesaplamalar </h3>
        < button
onClick = {() => exportToExcel('gecici')}
className = "flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
disabled = { geciciHesaplar.length === 0 }
  >
  <FileSpreadsheet className="w-4 h-4 mr-1" />
    Excel'e Aktar
      </button>
      </div>
      < p className = "text-sm text-gray-600 mb-4" >
        Bu sayfada, maliyet hesaplarken kullanılan ara hesaplamalar görüntülenir. 
          Bu veriler, hesaplamaların doğruluğunu kontrol etmek ve detaylı analiz yapmak için kullanılabilir.
        </p>
  </div>

  < div className = "overflow-x-auto max-h-[500px] overflow-y-auto" >
    <table className="min-w-full divide-y divide-gray-200" >
      <thead className="bg-gray-50 sticky top-0" >
        <tr>
        <th scope="col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10" >
          Panel Kodu
            </th>
            < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
              Panel Kapasite
                </th>
                < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                  Yalnız Panel Aylık Kapasite
                    </th>
                    < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                      Panel Kaynak Elektrik(m²)
                        </th>
                        < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                          Panel Kesme Elektrik(m²)
                            </th>
                            < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                              Diğer(m²)
                              </th>
                              < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                Yalnız Panel İşçi(m²)
                                  </th>
                                  < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                    Panel Boya İşçi(m²)
                                      </th>
                                      < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                        Galvaniz Tel(kg)
                                          </th>
                                          < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                            Boya Kapasite
                                              </th>
                                              < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                                Boya Aylık Kapasite
                                                  </th>
                                                  < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                                    Panel Boya Elektrik(m²)
                                                      </th>
                                                      < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                                        Panel Doğalgaz(m²)
                                                          </th>
                                                          < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                                            Adet USD
                                                              </th>
                                                              < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                                                Boya Adet USD
                                                                  </th>
                                                                  < th scope = "col" className = "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" >
                                                                    Boyalı Adet USD
                                                                      </th>
                                                                      </tr>
                                                                      </thead>
                                                                      < tbody className = "bg-white divide-y divide-gray-200" >
                                                                      {
                                                                        geciciHesaplar.map((hesap, index) => (
                                                                          <tr key= { index } className = "hover:bg-gray-50" >
                                                                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white" >
                                                                          { hesap.panel_kodu }
                                                                          </td>
                                                                        < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                        { formatTableValue(hesap.panel_kapasite, 'decimal')
                                                                      }
                                                                        </td>
                                                                        < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                          { formatTableValue(hesap.yalniz_panel_aylik, 'decimal') }
                                                                          </td>
                                                                          < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                            { formatTableValue(hesap.panel_kaynak_elektrik, 'price') }
                                                                            </td>
                                                                            < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                              { formatTableValue(hesap.panel_kesme_elektrik, 'price') }
                                                                              </td>
                                                                              < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                { formatTableValue(hesap.diger_m2, 'price') }
                                                                                </td>
                                                                                < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                  { formatTableValue(hesap.yalniz_panel_isci_m2, 'price') }
                                                                                  </td>
                                                                                  < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                    { formatTableValue(hesap.panel_boya_isci_m2, 'price') }
                                                                                    </td>
                                                                                    < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                      { formatTableValue(hesap.galvaniz_tel_kg, 'price') }
                                                                                      </td>
                                                                                      < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                        { formatTableValue(hesap.boya_kapasite, 'decimal') }
                                                                                        </td>
                                                                                        < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                          { formatTableValue(hesap.boya_aylik_kapasite, 'decimal') }
                                                                                          </td>
                                                                                          < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                            { formatTableValue(hesap.panel_boya_elektrik, 'price') }
                                                                                            </td>
                                                                                            < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                              { formatTableValue(hesap.panel_dogalgaz_m2, 'price') }
                                                                                              </td>
                                                                                              < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                                { formatTableValue(hesap.adet_usd, 'price') }
                                                                                                </td>
                                                                                                < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                                  { formatTableValue(hesap.boya_adet_usd, 'price') }
                                                                                                  </td>
                                                                                                  < td className = "px-3 py-2 whitespace-nowrap text-sm text-gray-500" >
                                                                                                    { formatTableValue(hesap.boyali_adet_usd, 'price') }
                                                                                                    </td>
                                                                                                    </tr>
            ))}
{
  geciciHesaplar.length === 0 && (
    <tr>
    <td colSpan="16" className = "px-3 py-4 text-center text-sm text-gray-500" >
      Henüz hesaplama yapılmamış.Hesaplama yapmak için önce panelleri seçin ve "Hesapla" düğmesine tıklayın.
                </td>
        </tr>
            )
}
</tbody>
  </table>
  </div>
  </div>
  );

// Sekme butonlarını render eden fonksiyon
const renderTabButtons = () => (
  <div className= "flex flex-wrap gap-2 mb-4" >
  <button
        onClick={() => setActiveTab('main-panel')}
className = {`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === 'main-panel'
    ? 'bg-red-600 text-white'
    : 'bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white'
  }`}
      >
  Ana Panel Listesi
    </button>
    < button
onClick = {() => setActiveTab('special-panel')}
className = {`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === 'special-panel'
    ? 'bg-red-600 text-white'
    : 'bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white'
  }`}
      >
  Özel Panel Girişi
    </button>
    < button
onClick = {() => setActiveTab('results')}
className = {`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === 'results'
    ? 'bg-red-600 text-white'
    : 'bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white'
  }`}
      >
  Hesap Sonuçları
    </button>
    < button
onClick = {() => setActiveTab('temp-calculations')}
className = {`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === 'temp-calculations'
    ? 'bg-red-600 text-white'
    : 'bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white'
  }`}
      >
  Geçici Hesaplamalar
    </button>
    </div>
  );

// Sekme içeriklerini gösteren fonksiyon
const renderActiveTabContent = () => {
  return (
    <>
    { activeTab === 'main-panel' && (
      <div key= "main-panel-content" className = "tab-panel" >
        { renderPanelList() }
        </div>
      )}

{
  activeTab === 'special-panel' && (
    <div key="special-panel-content" className = "tab-panel" >
      { renderSpecialPanelEntry() }
      </div>
      )
}

{
  activeTab === 'results' && (
    <div key="results-content" className = "tab-panel" >
      { showSalesView? renderSalesView(): renderResults()
}
</div>
      )}

{
  activeTab === 'temp-calculations' && (
    <div key="temp-calculations-content" className = "tab-panel" >
      { renderTempCalculations() }
      </div>
      )
}
</>
  );
};

// Yükleme animasyonu
const renderLoading = () => (
  <div className= "flex items-center justify-center h-64" >
  <div className="flex flex-col items-center" >
    <RefreshCw className="animate-spin text-red-600 mb-4" size = { 40} />
      <p className="text-gray-600" > Veriler yükleniyor, lütfen bekleyin...</p>
        </div>
        </div>
  );

return (
  <div className= "space-y-6" >
  <h2 className="text-2xl font-bold" > Panel Çit Maliyet Hesaplama </h2>
{ renderTabButtons() }
{ renderDegiskenlerAccordion() }
{ loading ? renderLoading() : renderActiveTabContent() }
</div>
  );
};

export default PanelCitHesaplama;
