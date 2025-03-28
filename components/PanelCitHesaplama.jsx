// PanelCitHesaplama.jsx
import React, { useState, useEffect } from 'react';
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
  Search
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

// Lookup tables for pallet weights
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

// Helper function to get closest height for pallet weight lookup
const getClosestHeight = (height, panelType, widthStr) => {
  const lookupTable = PALLET_WEIGHTS[panelType]?.[widthStr];
  if (!lookupTable) return null;
  
  const heights = Object.keys(lookupTable).map(Number);
  
  // Find exact match
  if (lookupTable[height.toString()]) {
    return height.toString();
  }
  
  // Find closest match
  const closestHeight = heights.reduce((prev, curr) => {
    return (Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev);
  });
  
  return closestHeight.toString();
};

// Güvenli float değer dönüştürme yardımcı fonksiyonu (boş, null ve virgül değerlerini işler)
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'string') value = value.replace(',', '.');
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Görüntüleme için format yardımcı fonksiyonu (gereksiz ondalık basamakları önler)
const formatDisplayValue = (value, decimals = 5) => {
  if (value === null || value === undefined || isNaN(value)) return '';
  
  const num = parseFloat(value);
  if (Number.isInteger(num)) return num.toString();
  
  // Format with up to 5 decimals, removing trailing zeros
  return parseFloat(num.toFixed(decimals)).toString().replace(/,/g, '.');
};

const PanelCitHesaplama = () => {
  // State tanımlamaları
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
  const [panelSearch, setPanelSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [resultFilter, setResultFilter] = useState({
    currency: 'all',
    unit: 'all',
    type: 'all'
  });

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });

  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    fetchInitialData();
  }, []);

  // İlk verileri çekme fonksiyonu
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Verileri paralel olarak çek
      const [
        genelRes, 
        panelCitRes, 
        profilRes, 
        panelListRes
      ] = await Promise.all([
        axios.get(API_URLS.genelDegiskenler),
        axios.get(API_URLS.panelCitDegiskenler),
        axios.get(API_URLS.profilDegiskenler),
        axios.get(API_URLS.panelList),
      ]);
  
      // En son değişkenleri al - ID'ye göre azalan sıralama yaparak en son kaydı al
      const latestGenelDegisken = genelRes.data.sort((a, b) => b.id - a.id)[0] || {};
      const latestPanelCitDegisken = panelCitRes.data.sort((a, b) => b.unique_key - a.unique_key)[0] || {};
      const latestProfilDegisken = profilRes.data.sort((a, b) => b.id - a.id)[0] || {};

      // Ondalık noktası kullanmak için değerleri formatla
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
      
      // Nelerin alındığını log'a yaz (hata ayıklama için)
      console.log('En son genel değişkenler:', latestGenelDegisken);
      console.log('En son panel çit değişkenler:', latestPanelCitDegisken);
      console.log('En son profil değişkenler:', latestProfilDegisken);
      
      // Döviz kurlarını çek
      fetchCurrencyRates();
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      alert('Veri çekerken hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Sadece belirli bir bölümü yenileme fonksiyonu
  const fetchSectionData = async (section) => {
    try {
      setSectionLoading(prev => ({ ...prev, [section]: true }));
      
      let endpoint = '';
      let setter = null;
      
      switch(section) {
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
      
      // En son kaydı al (en yüksek ID'li kayıt)
      let latestRecord;
      if (section === 'panelCit') {
        latestRecord = response.data.sort((a, b) => b.unique_key - a.unique_key)[0] || {};
      } else {
        latestRecord = response.data.sort((a, b) => b.id - a.id)[0] || {};
      }

      // Formatlamadan önce değerleri işle
      const formattedRecord = {};
      Object.entries(latestRecord).forEach(([key, value]) => {
        if (typeof value === 'number') {
          formattedRecord[key] = formatDisplayValue(value);
        } else {
          formattedRecord[key] = value;
        }
      });

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
          usd_tl: formatDisplayValue(usdTry, 5),
          eur_usd: formatDisplayValue(eurUsd, 5)
        }));
        
        console.log('Döviz kurları güncellendi:', { usdTry, eurUsd });
      }
    } catch (error) {
      console.error('Döviz kuru çekme hatası:', error);
      // API başarısız olursa mevcut değerleri kullan
      alert('Döviz kurları güncellenirken hata oluştu. Mevcut değerler kullanılacak.');
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
        const panelKodu = (panel.panel_kodu || '').toLowerCase();
        const panelYukseklik = String(panel.panel_yuksekligi || '');
        const panelGenislik = String(panel.panel_genisligi || '');
        
        // Farklı panel özelliklerinde tüm arama terimlerini eşleştir
        return searchTerms.every(term => 
          panelKodu.includes(term) || 
          panelYukseklik.includes(term) || 
          panelGenislik.includes(term)
        );
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

  // Panel listesini sıralama
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
      if (a[key] === null || a[key] === undefined) return 1;
      if (b[key] === null || b[key] === undefined) return -1;
      
      // Sayıları karşılaştırıyorsak
      if (typeof a[key] === 'number' && typeof b[key] === 'number') {
        return direction === 'ascending' ? a[key] - b[key] : b[key] - a[key];
      }
      
      // String karşılaştırması
      const aString = String(a[key]).toLowerCase();
      const bString = String(b[key]).toLowerCase();
      
      if (aString < bString) return direction === 'ascending' ? -1 : 1;
      if (aString > bString) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
    
    setFilteredPanelList(sortedList);
  };

  // Filtre değiştiğinde panel listesini güncelle
  useEffect(() => {
    filterPanelList();
  }, [panelSearch, selectedPanelType, columnFilters, panelList]);

// Maliyet hesaplama fonksiyonu
  const calculateCosts = async (isPanelList = true) => {
    setCalculating(true);
    setShowResults(false);
    
    try {
      // Önce hesaplanacak veri olup olmadığını kontrol et
      const panelsToCalculate = isPanelList ? filteredPanelList : ozelPanelList;
      
      if (panelsToCalculate.length === 0) {
        alert('Hesaplanacak panel bulunamadı. Lütfen panel listesinde filtrelerinizi kontrol edin veya özel paneller ekleyin.');
        setCalculating(false);
        return;
      }
      

      console.log('🧮 Panels to calculate:', panelsToCalculate);

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
      
      // Önce geçici hesaplar tablosunu temizle - Yeni endpoint ile
      await axios.delete(`${API_URLS.geciciHesaplar}/all`);
      console.log('✔️ Deleted gecici hesaplar');

      // Maliyet listesini temizle - Yeni endpoint ile
      await axios.delete(`${API_URLS.maliyetListesi}/all`);
      console.log('✔️ Deleted gecici hesaplar');
     
      // Güvenli float değerleri işleme yardımcı fonksiyonu
      const safeParseFloat = (value, defaultValue = 0) => {
        if (value === null || value === undefined || value === '') return defaultValue;
        if (typeof value === 'string') value = value.replace(',', '.');
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      // Statik değişkenleri hazırla
      const staticVars = {
        boya_kg_usd: safeParseFloat(genelDegiskenler.boya_fiyati_kg_eur) / safeParseFloat(genelDegiskenler.eur_usd, 1),
        elektrik_kw_usd: safeParseFloat(genelDegiskenler.elektrik_fiyati_kw_tl) / safeParseFloat(genelDegiskenler.usd_tl, 1),
        dogalgaz_m3_usd: safeParseFloat(genelDegiskenler.dogalgaz_fiyati_stn_m3_tl) / safeParseFloat(genelDegiskenler.usd_tl, 1),
        isci_maasi_usd: safeParseFloat(genelDegiskenler.ort_isci_maasi) / safeParseFloat(genelDegiskenler.usd_tl, 1),
        flans_usd: safeParseFloat(profilDegiskenler.flans_ad_tl) / safeParseFloat(genelDegiskenler.usd_tl, 1),
        vida_usd: safeParseFloat(profilDegiskenler.vida_ad_tl) / safeParseFloat(genelDegiskenler.usd_tl, 1),
        klips_usd: safeParseFloat(profilDegiskenler.klips_ad_tl) / safeParseFloat(genelDegiskenler.usd_tl, 1),
        dubel_usd: safeParseFloat(profilDegiskenler.dubel_ad_tl) / safeParseFloat(genelDegiskenler.usd_tl, 1),
        kapak_usd: safeParseFloat(profilDegiskenler.kapak_ad_tl) / safeParseFloat(genelDegiskenler.usd_tl, 1)
      };
      
      console.log("📦 Statik gönderilen:", statikDegiskenlerPayload);

      // Statik değişkenleri kaydet (only valid DB columns)
      await axios.post(API_URLS.statikDegiskenler, {
        boya_kg_usd: genelDegiskenler.boya_kg_usd,
        elektrik_kw_usd: genelDegiskenler.elektrik_kw_usd,
        dogalgaz_m3_usd: genelDegiskenler.dogalgaz_m3_usd,
        ort_isci_maasi_usd: genelDegiskenler.ort_isci_maasi_usd,
        flans_usd: genelDegiskenler.flans_usd,
        vida_usd: genelDegiskenler.vida_usd,
        klips_usd: genelDegiskenler.klips_usd,
        dubel_usd: genelDegiskenler.dubel_usd,
        kapak_usd: genelDegiskenler.kapak_usd,
      });

      
      // Hesaplama algoritmasını çalıştır
      await performCalculation(panelsToCalculate, staticVars);
      
      // Hesaplama sonuçlarını al
      const maliyetRes = await axios.get(API_URLS.maliyetListesi);

      console.log('📊 Maliyet sonucu:', maliyetRes.data);

      setMaliyetListesi(maliyetRes.data);
      
      // Ara hesapları al
      const geciciRes = await axios.get(API_URLS.geciciHesaplar);
      setGeciciHesaplar(geciciRes.data);
      
      // Sonuçlar sayfasına geç
      setShowResults(true);
      setActiveTab('results');
    } catch (error) {
      console.error('Hesaplama hatası:', error);
      alert('Hesaplama sırasında hata oluştu: ' + error.message);
    } finally {
      setCalculating(false);
    }
  };

  // Ondalık sayı formatını düzenleme
  const formatDecimal = (value) => {
    if (typeof value === 'string') {
      return value.replace(/,/g, '.');
    }
    return value;
  };
  
  // Genel Değişkenleri Güncelleme
  const updateGenelDegiskenler = async () => {
    try {
      // Veriyi kaydetmek için işle ve hazırla
      const processedData = {};
      Object.entries(genelDegiskenler).forEach(([key, value]) => {
        // Boş string veya undefined değerleri işle
        if (value === '' || value === undefined) {
          processedData[key] = null;
        } else if (typeof value === 'string' && !isNaN(parseFloat(value.replace(',', '.')))) {
          // Virgüllü string sayıları gerçek sayılara dönüştür
          processedData[key] = parseFloat(value.replace(',', '.'));
        } else {
          processedData[key] = value;
        }
      });
      
      // Yeni bir zaman damgası ekle
      const dataToSave = {
        ...processedData,
        genel_latest_update: new Date().toISOString()
      };
      
      const response = await axios.post(API_URLS.genelDegiskenler, dataToSave);
      if (response.status === 200 || response.status === 201) {
        alert('Genel değişkenler başarıyla kaydedildi.');
        fetchSectionData('genel'); // Sadece genel değişkenleri güncelle
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Değişkenler kaydedilirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  // Panel Çit Değişkenlerini Güncelleme
  const updatePanelCitDegiskenler = async () => {
    try {
      // Veriyi kaydetmek için işle ve hazırla
      const processedData = {};
      Object.entries(panelCitDegiskenler).forEach(([key, value]) => {
        // Boş string veya undefined değerleri işle
        if (value === '' || value === undefined) {
          processedData[key] = null;
        } else if (typeof value === 'string' && !isNaN(parseFloat(value.replace(',', '.')))) {
          // Virgüllü string sayıları gerçek sayılara dönüştür
          processedData[key] = parseFloat(value.replace(',', '.'));
        } else {
          processedData[key] = value;
        }
      });
      
      // Yeni bir zaman damgası ekle
      const dataToSave = {
        ...processedData,
        panel_cit_latest_update: new Date().toISOString()
      };
      
      const response = await axios.post(API_URLS.panelCitDegiskenler, dataToSave);
      if (response.status === 200 || response.status === 201) {
        alert('Panel çit değişkenleri başarıyla kaydedildi.');
        fetchSectionData('panelCit'); // Sadece panel çit değişkenlerini güncelle
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Değişkenler kaydedilirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  // Profil Değişkenlerini Güncelleme
  const updateProfilDegiskenler = async () => {
    try {
      // Veriyi kaydetmek için işle ve hazırla
      const processedData = {};
      Object.entries(profilDegiskenler).forEach(([key, value]) => {
        // Boş string veya undefined değerleri işle
        if (value === '' || value === undefined) {
          processedData[key] = null;
        } else if (typeof value === 'string' && !isNaN(parseFloat(value.replace(',', '.')))) {
          // Virgüllü string sayıları gerçek sayılara dönüştür
          processedData[key] = parseFloat(value.replace(',', '.'));
        } else {
          processedData[key] = value;
        }
      });
      
      // Yeni bir zaman damgası ekle
      const dataToSave = {
        ...processedData,
        profil_latest_update: new Date().toISOString()
      };
      
      const response = await axios.post(API_URLS.profilDegiskenler, dataToSave);
      if (response.status === 200 || response.status === 201) {
        alert('Profil değişkenleri başarıyla kaydedildi.');
        fetchSectionData('profil'); // Sadece profil değişkenlerini güncelle
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Değişkenler kaydedilirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  // Panel Kodu Oluşturma
  const calculatePanelKodu = (panel) => {
    if (!panel.panel_tipi) return '';
    
    const prefix = panel.panel_tipi === 'Single' 
      ? 'SP' 
      : (panel.panel_tipi === 'Guvenlik' ? 'GP' : 'DP');
    
    const capStr = `${panel.dikey_tel_capi || 0} * ${panel.yatay_tel_capi || 0}`;
    const ebatStr = `${panel.panel_yuksekligi || 0} * ${panel.panel_genisligi || 0}`;
    const gozStr = `${panel.yatay_goz_araligi || 0} * ${panel.dikey_goz_araligi || 0}`;
    const bukumStr = `${panel.bukum_sayisi || 0}-1`; // Şimdilik sabit ikinci kısım
    
    return `${prefix}_Cap:${capStr}_Eb:${ebatStr}_Gz:${gozStr}_Buk:${bukumStr}_Rnk:"Kplmsz"`;
  };
  
  // Özel panel ekleme 
  const addOzelPanel = () => {
    const newPanel = {
      manual_order: '', 
      panel_tipi: 'Single',
      panel_kodu: '',
      panel_yuksekligi: 200,  // Varsayılan değerler
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
      icube_code_adetli: ''
    };

    // Otomatik hesaplamalar
    const panel_yuksekligi = parseFloat(newPanel.panel_yuksekligi);
    const panel_genisligi = parseFloat(newPanel.panel_genisligi);
    
    // Adet m2 hesaplama (Excel: =(B2*C2/10000)*H2) - H2 varsayılan olarak 1 olsun
    newPanel.adet_m2 = (panel_yuksekligi * panel_genisligi / 10000);
    
    // Büküm sayısı hesaplama (Excel: =EĞER(VE(D2="Single";B2>=100);YUVARLA(B2/50;0);EĞER(VE(D2="Single";B2<100);TABANAYUVARLA((B2/50)+1;1);0)))
    if (newPanel.panel_tipi === "Single" && panel_yuksekligi >= 100) {
      newPanel.bukum_sayisi = Math.round(panel_yuksekligi / 50);
    } else if (newPanel.panel_tipi === "Single" && panel_yuksekligi < 100) {
      newPanel.bukum_sayisi = Math.floor((panel_yuksekligi / 50) + 1);
    } else {
      newPanel.bukum_sayisi = 0;
    }
    
    const bukum_sayisi = parseFloat(newPanel.bukum_sayisi);
    
    // Dikey çubuk adet hesaplama (Excel: =EĞER(M2<5.5;TAVANAYUVARLA(C2/M2;1)+1;EĞER(M2<6;TAVANAYUVARLA(C2/M2;1);TAVANAYUVARLA(C2/M2;1)+1)))
    const dikey_goz = parseFloat(newPanel.dikey_goz_araligi);
    
    if (dikey_goz < 5.5) {
      newPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz) + 1;
    } else if (dikey_goz < 6) {
      newPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz);
    } else {
      newPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz) + 1;
    }
    
    // Yatay çubuk adet hesaplama 
    // Excel: =EĞER(D2="Double";(((B2-3)/L2)+1)*2;EĞER(VE(D2="Single";L2=20);((((B2-3)-(J2*10))/L2)+1)+(J2*2);EĞER(VE(D2="Single";L2=15;B2<200);YUVARLA(((B2/L2)+(J2*2));0);EĞER(VE(D2="Single";L2=15;B2>=200);TAVANAYUVARLA(((B2/L2)+(J2*2));1);"---"))))
    const yatay_goz = parseFloat(newPanel.yatay_goz_araligi);
    
    if (newPanel.panel_tipi === "Double") {
      newPanel.yatay_cubuk_adet = (((panel_yuksekligi - 3) / yatay_goz) + 1) * 2;
    } else if (newPanel.panel_tipi === "Single" && yatay_goz === 20) {
      newPanel.yatay_cubuk_adet = ((((panel_yuksekligi - 3) - (bukum_sayisi * 10)) / yatay_goz) + 1) + (bukum_sayisi * 2);
    } else if (newPanel.panel_tipi === "Single" && yatay_goz === 15 && panel_yuksekligi < 200) {
      newPanel.yatay_cubuk_adet = Math.round(((panel_yuksekligi / yatay_goz) + (bukum_sayisi * 2)));
    } else if (newPanel.panel_tipi === "Single" && yatay_goz === 15 && panel_yuksekligi >= 200) {
      newPanel.yatay_cubuk_adet = Math.ceil(((panel_yuksekligi / yatay_goz) + (bukum_sayisi * 2)));
    }
    
    // Ağırlık hesaplama
    // Excel: =EĞER(D2="Double";((E2*E2*7.85*Pİ()/4000)*((B2/100)*N2))+((F2*F2*7.85*Pİ()/4000)*((C2+0.6)/100)*O2);EĞER(VE(D2="Single";L2=20);((E2*E2*7.85*Pİ()/4000)*((B2+(J2*2.1))/100)*N2+((F2*F2*7.85*Pİ()/4000)*((C2+0.6)/100)*O2));EĞER(VE(D2="Single";L2=15);((E2*E2*7.85*Pİ()/4000)*((B2+(J2*2.6))/100)*N2+((F2*F2*7.85*Pİ()/4000)*((C2+0.6)/100)*O2)))))
    const dikey_tel = parseFloat(newPanel.dikey_tel_capi);
    const yatay_tel = parseFloat(newPanel.yatay_tel_capi);
    const dikey_cubuk = parseFloat(newPanel.dikey_cubuk_adet);
    const yatay_cubuk = parseFloat(newPanel.yatay_cubuk_adet);

    if (newPanel.panel_tipi === "Double") {
      // Double panel ağırlık hesaplaması
      newPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi / 100) * dikey_cubuk)) + 
                        ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    } 
    else if (newPanel.panel_tipi === "Single") {
      if (yatay_goz === 20) {
        // Single panel 20 göz aralığı için ağırlık hesaplaması
        newPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                          ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      } 
      else if (yatay_goz === 15) {
        // Single panel 15 göz aralığı için ağırlık hesaplaması
        newPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.6)) / 100) * dikey_cubuk) + 
                          ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      }
      else {
        // Diğer Single panel tipleri için varsayılan hesaplama
        newPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                          ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      }
    }
    else if (newPanel.panel_tipi === "Guvenlik") {
      // Güvenlik panel ağırlık hesaplaması
      newPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                        ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    }
    
    // Yeni palet ile ilgili hesaplamalar
    
    // Boyalı Hali: =P2+R2 (agirlik + boya_kg)
    newPanel.boya_kg = calculateBoyaKg(newPanel);
    newPanel.boyali_hali = newPanel.agirlik + newPanel.boya_kg;
    
    // M²_Ağırlık: =Q2/I2 (boyali_hali / adet_m2)
    newPanel.m2_agirlik = newPanel.adet_m2 > 0 ? newPanel.boyali_hali / newPanel.adet_m2 : 0;
    
    // Paletteki panel sayısı
    newPanel.paletteki_panel_sayisi = calculatePalettekiPanelSayisi(newPanel);
    
    // Palet Boş Ağırlık
    newPanel.palet_bos_agirlik = calculatePaletBosAgirlik(newPanel);
    
    // Paletsiz Toplam Ağırlık: =T2*Q2 (paletteki_panel_sayisi * boyali_hali)
    newPanel.paletsiz_toplam_agirlik = newPanel.paletteki_panel_sayisi * newPanel.boyali_hali;
    
    // Palet Dolu Ağırlık: =V2+U2 (paletsiz_toplam_agirlik + palet_bos_agirlik)
    newPanel.palet_dolu_agirlik = newPanel.paletsiz_toplam_agirlik + newPanel.palet_bos_agirlik;
    
    // Boş Palet Yüksekliği
    newPanel.bos_palet_yuksekligi = newPanel.panel_tipi === "Double" ? 14 : (newPanel.panel_tipi === "Single" ? 17 : 0);
    
    // Adet Panel Yüksekliği
    newPanel.adet_panel_yuksekligi = calculateAdetPanelYuksekligi(newPanel);
    
    // Paletsiz Toplam Panel Yüksekliği: =Y2*T2 (adet_panel_yuksekligi * paletteki_panel_sayisi)
    newPanel.paletsiz_toplam_panel_yuksekligi = newPanel.adet_panel_yuksekligi * newPanel.paletteki_panel_sayisi;
    
    // Paletli Yükseklik: =Z2+X2 (paletsiz_toplam_panel_yuksekligi + bos_palet_yuksekligi)
    newPanel.paletli_yukseklik = newPanel.paletsiz_toplam_panel_yuksekligi + newPanel.bos_palet_yuksekligi;
    
    // Icube-Code 
    newPanel.icube_code = calculateIcubeCode(newPanel);
    
    // Icube-Code(Adetli): =AB2 & "_(" & T2 & "-Adet)" 
    newPanel.icube_code_adetli = `${newPanel.icube_code}_(${newPanel.paletteki_panel_sayisi}-Adet)`;
    
    // Sayısal alanları yuvarlama
    if (!isNaN(newPanel.adet_m2)) newPanel.adet_m2 = parseFloat(newPanel.adet_m2.toFixed(5));
    if (!isNaN(newPanel.dikey_cubuk_adet)) newPanel.dikey_cubuk_adet = Math.round(newPanel.dikey_cubuk_adet);
    if (!isNaN(newPanel.yatay_cubuk_adet)) newPanel.yatay_cubuk_adet = Math.round(newPanel.yatay_cubuk_adet);
    if (!isNaN(newPanel.agirlik)) newPanel.agirlik = parseFloat(newPanel.agirlik.toFixed(5));
    if (!isNaN(newPanel.boyali_hali)) newPanel.boyali_hali = parseFloat(newPanel.boyali_hali.toFixed(5));
    if (!isNaN(newPanel.boya_kg)) newPanel.boya_kg = parseFloat(newPanel.boya_kg.toFixed(5));
    if (!isNaN(newPanel.m2_agirlik)) newPanel.m2_agirlik = parseFloat(newPanel.m2_agirlik.toFixed(5));
    if (!isNaN(newPanel.palet_bos_agirlik)) newPanel.palet_bos_agirlik = parseFloat(newPanel.palet_bos_agirlik.toFixed(5));
    if (!isNaN(newPanel.paletsiz_toplam_agirlik)) newPanel.paletsiz_toplam_agirlik = parseFloat(newPanel.paletsiz_toplam_agirlik.toFixed(5));
    if (!isNaN(newPanel.palet_dolu_agirlik)) newPanel.palet_dolu_agirlik = parseFloat(newPanel.palet_dolu_agirlik.toFixed(5));
    if (!isNaN(newPanel.adet_panel_yuksekligi)) newPanel.adet_panel_yuksekligi = parseFloat(newPanel.adet_panel_yuksekligi.toFixed(5));
    if (!isNaN(newPanel.paletsiz_toplam_panel_yuksekligi)) newPanel.paletsiz_toplam_panel_yuksekligi = parseFloat(newPanel.paletsiz_toplam_panel_yuksekligi.toFixed(5));
    if (!isNaN(newPanel.paletli_yukseklik)) newPanel.paletli_yukseklik = parseFloat(newPanel.paletli_yukseklik.toFixed(5));
    
    // Panel kodu otomatik hesaplama
    newPanel.panel_kodu = calculatePanelKodu(newPanel);
    
    setOzelPanelList(prev => [...prev, newPanel]);
  };

  // Özel panel silme
  const removeOzelPanel = (id) => {
    setOzelPanelList(prev => prev.filter(panel => panel.id !== id));
  };

  // Boya kilogram hesaplama
  const calculateBoyaKg = (panel) => {
    // Excel: =EĞER(G2=0;0;EĞER(D2="Double";I2*0.06;EĞER(D2="Single";I2*0.03;0)))
    if (!panel || !panel.panel_tipi) return 0;
    
    const adetM2 = safeParseFloat(panel.adet_m2);
    
    if (panel.panel_tipi === "Double") {
      return adetM2 * 0.06;
    } else if (panel.panel_tipi === "Single") {
      return adetM2 * 0.03;
    } else {
      return 0;
    }
  };

  // Paletteki panel sayısı hesaplama
  const calculatePalettekiPanelSayisi = (panel) => {
    // Excel: =EĞER(VE(D2="Double";F2>=7);25;EĞER(VE(D2="Double";F2<7);30;EĞER(D2="Single";100;0)))
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
    } else {
      return 0;
    }
  };

  // Palet boş ağırlık hesaplama
  const calculatePaletBosAgirlik = (panel) => {
    if (!panel || !panel.panel_tipi) return 0;
    
    const panelType = panel.panel_tipi;
    const height = safeParseFloat(panel.panel_yuksekligi);
    const width = safeParseFloat(panel.panel_genisligi);
    
    // Only handle the specific widths in our lookup tables
    const widthStr = width === 250 ? '250' : (width === 200 ? '200' : null);
    if (!widthStr) return 0;
    
    // Get the closest height for lookup
    const closestHeight = getClosestHeight(height, panelType, widthStr);
    if (!closestHeight) return 0;
    
    // Return the weight from the lookup table
    return PALLET_WEIGHTS[panelType][widthStr][closestHeight] || 0;
  };

  // Adet panel yüksekliği hesaplama
  const calculateAdetPanelYuksekligi = (panel) => {
    // Excel formula for Adet_Panel_Yuksekligi
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
    } else {
      return 0;
    }
  };

  // Icube-Code hesaplama
  const calculateIcubeCode = (panel) => {
    // Excel: =EĞER(D2="Double";"DP-"&B2&"/"&C2&"-"&E2&"/"&F2&EĞER(G2+0=6005;"-Ysl";EĞER(G2+0=7016;"-Antrst";EĞER(G2+0=0;"-Rnksz";"")));EĞER(D2="Single";"SP-"&B2&"/"&C2&"-"&E2&"/"&F2&EĞER(G2+0=6005;"-Ysl";EĞER(G2+0=7016;"-Antrst";EĞER(G2+0=0;"-Rnksz";"")));""))
    if (!panel || !panel.panel_tipi) return '';
    
    const panelType = panel.panel_tipi;
    const height = safeParseFloat(panel.panel_yuksekligi);
    const width = safeParseFloat(panel.panel_genisligi);
    const dikeyCap = safeParseFloat(panel.dikey_tel_capi);
    const yatayCap = safeParseFloat(panel.yatay_tel_capi);
    
    // For simplicity, we'll just consider it as not colored
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

  // Özel panel güncelleme
  const updateOzelPanel = (id, field, value) => {
    const updatedList = ozelPanelList.map(panel => {
      if (panel.id === id) {
        // Virgülleri noktalara dönüştür
        const formattedValue = formatDecimal(value);
        const updatedPanel = { ...panel, [field]: formattedValue };
        
        // Otomatik hesaplamalar - sadece bazı alanlar değiştiğinde
        if (['panel_yuksekligi', 'panel_genisligi', 'dikey_goz_araligi', 'yatay_goz_araligi', 
            'dikey_tel_capi', 'yatay_tel_capi', 'panel_tipi', 'bukum_sayisi'].includes(field)) {
          
          // Panel kodu otomatik hesaplama
          updatedPanel.panel_kodu = calculatePanelKodu(updatedPanel);
          
          // adet_m2 hesaplama
          const panel_yuksekligi = safeParseFloat(updatedPanel.panel_yuksekligi);
          const panel_genisligi = safeParseFloat(updatedPanel.panel_genisligi);
          updatedPanel.adet_m2 = (panel_yuksekligi * panel_genisligi / 10000);
          
          // büküm sayısı hesaplama - sadece panel_tipi veya panel_yuksekligi değiştiğinde
          if (['panel_tipi', 'panel_yuksekligi'].includes(field)) {
            if (updatedPanel.panel_tipi === "Single" && panel_yuksekligi >= 100) {
              updatedPanel.bukum_sayisi = Math.round(panel_yuksekligi / 50);
            } else if (updatedPanel.panel_tipi === "Single" && panel_yuksekligi < 100) {
              updatedPanel.bukum_sayisi = Math.floor((panel_yuksekligi / 50) + 1);
            } else {
              updatedPanel.bukum_sayisi = 0;
            }
          }
          
          const bukum_sayisi = safeParseFloat(updatedPanel.bukum_sayisi);
          
          // dikey_cubuk_adet hesaplama
          const dikey_goz = safeParseFloat(updatedPanel.dikey_goz_araligi);
          
          if (dikey_goz < 5.5) {
            updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz) + 1;
          } else if (dikey_goz < 6) {
            updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz);
          } else {
            updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz) + 1;
          }
          
          // yatay_cubuk_adet hesaplama 
          const panel_tipi = updatedPanel.panel_tipi;
          const yatay_goz = safeParseFloat(updatedPanel.yatay_goz_araligi);
          
          if (panel_tipi === "Double") {
            updatedPanel.yatay_cubuk_adet = (((panel_yuksekligi - 3) / yatay_goz) + 1) * 2;
          } else if (panel_tipi === "Single" && yatay_goz === 20) {
            updatedPanel.yatay_cubuk_adet = ((((panel_yuksekligi - 3) - (bukum_sayisi * 10)) / yatay_goz) + 1) + (bukum_sayisi * 2);
          } else if (panel_tipi === "Single" && yatay_goz === 15 && panel_yuksekligi < 200) {
            updatedPanel.yatay_cubuk_adet = Math.round(((panel_yuksekligi / yatay_goz) + (bukum_sayisi * 2)));
          } else if (panel_tipi === "Single" && yatay_goz === 15 && panel_yuksekligi >= 200) {
            updatedPanel.yatay_cubuk_adet = Math.ceil(((panel_yuksekligi / yatay_goz) + (bukum_sayisi * 2)));
          }
          
          // ağırlık hesaplama
          const dikey_tel = safeParseFloat(updatedPanel.dikey_tel_capi);
          const yatay_tel = safeParseFloat(updatedPanel.yatay_tel_capi);
          const dikey_cubuk = safeParseFloat(updatedPanel.dikey_cubuk_adet);
          const yatay_cubuk = safeParseFloat(updatedPanel.yatay_cubuk_adet);

          if (panel_tipi === "Double") {
            // Double panel ağırlık hesaplaması
            updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi / 100) * dikey_cubuk)) + 
                                  ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
          } 
          else if (panel_tipi === "Single") {
            if (yatay_goz === 20) {
              // Single panel 20 göz aralığı için ağırlık hesaplaması
              updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                                    ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
            } 
            else if (yatay_goz === 15) {
              // Single panel 15 göz aralığı için ağırlık hesaplaması
              updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.6)) / 100) * dikey_cubuk) + 
                                    ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
            }
            else {
              // Diğer Single panel tipleri için varsayılan hesaplama
              updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                                    ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
            }
          }
          else if (panel_tipi === "Guvenlik") {
            // Güvenlik panel ağırlık hesaplaması
            updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                                  ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
          }

          // Palet hesaplamaları
          updatedPanel.boya_kg = calculateBoyaKg(updatedPanel);
          updatedPanel.boyali_hali = updatedPanel.agirlik + updatedPanel.boya_kg;
          updatedPanel.m2_agirlik = updatedPanel.adet_m2 > 0 ? updatedPanel.boyali_hali / updatedPanel.adet_m2 : 0;
          updatedPanel.paletteki_panel_sayisi = calculatePalettekiPanelSayisi(updatedPanel);
          updatedPanel.palet_bos_agirlik = calculatePaletBosAgirlik(updatedPanel);
          updatedPanel.paletsiz_toplam_agirlik = updatedPanel.paletteki_panel_sayisi * updatedPanel.boyali_hali;
          updatedPanel.palet_dolu_agirlik = updatedPanel.paletsiz_toplam_agirlik + updatedPanel.palet_bos_agirlik;
          updatedPanel.bos_palet_yuksekligi = updatedPanel.panel_tipi === "Double" ? 14 : (updatedPanel.panel_tipi === "Single" ? 17 : 0);
          updatedPanel.adet_panel_yuksekligi = calculateAdetPanelYuksekligi(updatedPanel);
          updatedPanel.paletsiz_toplam_panel_yuksekligi = updatedPanel.adet_panel_yuksekligi * updatedPanel.paletteki_panel_sayisi;
          updatedPanel.paletli_yukseklik = updatedPanel.paletsiz_toplam_panel_yuksekligi + updatedPanel.bos_palet_yuksekligi;
          updatedPanel.icube_code = calculateIcubeCode(updatedPanel);
          updatedPanel.icube_code_adetli = `${updatedPanel.icube_code}_(${updatedPanel.paletteki_panel_sayisi}-Adet)`;
          
          // Sayısal alanları yuvarlama
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
        }
        
        return updatedPanel;
      }
      return panel;
    });
    
    setOzelPanelList(updatedList);
  };
  
  // Özel paneli veritabanına kaydetme
  const saveOzelPanelToDatabase = async (panel) => {
    try {
      // Özel alanları temizle
      const { isNew, id, icube_code, icube_code_adetli, boya_kg, boyali_hali, m2_agirlik, 
              paletteki_panel_sayisi, palet_bos_agirlik, paletsiz_toplam_agirlik, 
              palet_dolu_agirlik, bos_palet_yuksekligi, adet_panel_yuksekligi, 
              paletsiz_toplam_panel_yuksekligi, paletli_yukseklik, ...panelData } = panel;
      
      // Veritabanına kaydet
      const response = await axios.post(API_URLS.panelList, {
        ...panelData,
        kayit_tarihi: new Date().toISOString()
      });
      
      if (response.status === 200 || response.status === 201) {
        alert(`${panel.panel_kodu} kodlu panel başarıyla kaydedildi.`);
        
        // Mevcut panel listesini güncelle
        fetchSectionData('panelList');
        
        // Özel panel listesinden kaldır
        setOzelPanelList(ozelPanelList.filter(p => p.id !== panel.id));
      }
    } catch (error) {
      console.error('Panel kaydetme hatası:', error);
      alert('Panel kaydedilirken hata oluştu: ' + (error.response?.data?.message || error.message));
    }
  };

  // Detaylı hesaplama algoritması
  const performCalculation = async (panelsToCalculate, staticVars) => {
    // Panel hesaplamaları için bir döngü
    for (const panel of panelsToCalculate) {
      try {
        // Panel değerlerini al
        const materialHeight = parseFloat(panel.panel_yuksekligi);
        const materialWidth = parseFloat(panel.panel_genisligi);
        const weightKg = parseFloat(panel.agirlik);
        const panelType = panel.panel_tipi || '';
        const panelKodu = panel.panel_kodu || '';
        const manualOrder = panel.manual_order || '';
        
        // Yüzey alanı hesapla
        const l1Metre = (materialHeight * materialWidth) / 10000;
        
        // Panel kapasitesi hesapla
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
        
        // Boya kapasitesi hesapla
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
        
        // Diğer değerleri al
        const panelBoyaVardiya = safeParseFloat(panelCitDegiskenler.panel_boya_vardiya);
        const panelKesmeVardiya = safeParseFloat(panelCitDegiskenler.panel_kesme_vardiya);
        const galvanizliTel = safeParseFloat(panelCitDegiskenler.galvanizli_tel_ton_usd);
        const elektrikFiyatiUSD = safeParseFloat(genelDegiskenler.elektrik_fiyati_kw_tl || 0) / safeParseFloat(genelDegiskenler.usd_tl || 1);
        const dogalgazFiyatiUSD = safeParseFloat(genelDegiskenler.dogalgaz_fiyati_stn_m3_tl || 0) / safeParseFloat(genelDegiskenler.usd_tl || 1);
        const amortismanUSD = safeParseFloat(genelDegiskenler.amortisman_diger_usd);
        const ortalamaIsciMaasiUSD = safeParseFloat(genelDegiskenler.ort_isci_maasi || 0) / safeParseFloat(genelDegiskenler.usd_tl || 1);
        
        const panelKaynakElektrik = safeParseFloat(panelCitDegiskenler.panel_kaynak_makinesi_elektrik_tuketim_kwh);
        const panelKesmeElektrik = safeParseFloat(panelCitDegiskenler.panel_kesme_elektrik_tuketim_kwh);
        const panelBoyaElektrik = safeParseFloat(panelCitDegiskenler.panel_boya_makinesi_elektrik_tuketim_kwh);
        const panelDogalgazTuketim = safeParseFloat(panelCitDegiskenler.panel_dogalgaz_tuketim_stn_m3);
        
        // Kapasiteleri hesapla
        const yalnizPanelAylikKapasite = ((panelBoyaVardiya + panelKesmeVardiya) / 2) * 26 * 7 * panelKapasite;
        const boyaAylikKapasite = panelBoyaVardiya * 26 * 7 * boyaKapasite;
        
        // Elektrik maliyetlerini hesapla
        const panelKaynakElektrikM2 = (elektrikFiyatiUSD * panelKaynakElektrik) / panelKapasite;
        const panelKesmeElektrikM2 = (elektrikFiyatiUSD * panelKesmeElektrik) / panelKapasite;
        const panelBoyaElektrikM2 = (elektrikFiyatiUSD * panelBoyaElektrik) / boyaKapasite;
        
        // İşçilik ve doğalgaz maliyetlerini hesapla
        const isciSayisiPanelKesme = safeParseFloat(panelCitDegiskenler.panel_kesme_isci_sayisi_ad);
        const isciSayisiPanelKaynak = safeParseFloat(panelCitDegiskenler.panel_kaynak_isci_sayisi_ad);
        const isciSayisiPanelBoya = safeParseFloat(panelCitDegiskenler.panel_boya_isci_sayisi_ad);
        
        const yalnizPanelIsciM2 = (ortalamaIsciMaasiUSD * (isciSayisiPanelKesme + isciSayisiPanelKaynak)) / yalnizPanelAylikKapasite;
        const panelBoyaIsciM2 = (ortalamaIsciMaasiUSD * isciSayisiPanelBoya) / boyaAylikKapasite;
        // Doğalgaz ve diğer maliyetleri hesapla
        const digerM2 = amortismanUSD / panelKapasite;
        const panelDogalgazM2 = (dogalgazFiyatiUSD * panelDogalgazTuketim) / panelKapasite;
        
        // Malzeme maliyetlerini hesapla
        const galvanizTelKg = galvanizliTel / 1000;
        
        // Boya maliyetlerini hesapla
        const dpBoyaMetreKare = safeParseFloat(panelCitDegiskenler.dp_boya_tuketim_miktari);
        const spBoyaMetreKare = safeParseFloat(panelCitDegiskenler.sp_boya_tuketim_miktari);
        const guvenlikBoyaMetreKare = safeParseFloat(panelCitDegiskenler.guvenlik_boya_tuketim_miktari_gr);
        
        const boyaFiyatiUSD = safeParseFloat(genelDegiskenler.boya_fiyati_kg_eur || 0) / safeParseFloat(genelDegiskenler.eur_usd || 1);
        
        const dpBoyaM2 = (boyaFiyatiUSD / 1000) * dpBoyaMetreKare;
        const spBoyaM2 = (boyaFiyatiUSD / 1000) * spBoyaMetreKare;
        const guvenlikBoyaM2 = (boyaFiyatiUSD / 1000) * guvenlikBoyaMetreKare;
        
        // Profil hesaplamaları
        const profilEn1 = safeParseFloat(profilDegiskenler.profil_en1);
        const profilEn2 = safeParseFloat(profilDegiskenler.profil_en2);
        const profilBoyaTuketim = safeParseFloat(profilDegiskenler.profil_boya_tuketim);
        const profilEtKalinligi = safeParseFloat(profilDegiskenler.profil_et_kalinligi);
        
        // Profil boya maliyeti
        const profilBoyaTuketimAdUSD = ((2 * profilEn1 + 2 * profilEn2) * materialHeight / 10000) * 
                                   profilBoyaTuketim * (boyaFiyatiUSD / 1000);
        
        // Profil elektrik maliyetleri
        const profilKesmeElektrikTuketim = safeParseFloat(profilDegiskenler.profil_kesme_elektrik_tuketim_kwh);
        const profilKaynakElektrikTuketim = safeParseFloat(profilDegiskenler.profil_kaynak_makinesi_elektrik_tuketim_kwh);
        
        const profilElektrikKesmeAd = (profilKesmeElektrikTuketim / (1000 / 7)) * elektrikFiyatiUSD;
        const profilElektrikKaynakAd = (profilKaynakElektrikTuketim / (450 / 7)) * elektrikFiyatiUSD;
        
        // Profil işçilik maliyeti
        const profilIsciSayisi = safeParseFloat(profilDegiskenler.profil_isci_sayisi_ad);
        const vardiyaProfil = safeParseFloat(profilDegiskenler.profil_vardiya);
        const profilOrtalama = safeParseFloat(profilDegiskenler.profil_uretim_kapasitesi_m2_h);
        
        const profilKapasiteAd = profilOrtalama * 26 * 7 * vardiyaProfil;
        const profilAylikKapasite = profilKapasiteAd;
        
        const profilIsciUretimAd = (ortalamaIsciMaasiUSD * profilIsciSayisi) / profilAylikKapasite;
        
        // Parça sayılarını hesapla
        const flansAdet = 1;
        const dubelAdet = 4;
        const kapakAdet = 1;
        
        // Vida ve klips adetleri
        let vidaAdet = 2;
        let klipsAdet = 2;
        
        const adjustedHeight = Math.min(200, Math.max(60, Math.round(materialHeight / 10) * 10));
        
        if (adjustedHeight > 100) {
          vidaAdet = klipsAdet = 3;
        } else if (adjustedHeight > 150) {
          vidaAdet = klipsAdet = 4;
        }
        
        // Hammadde maliyetini hesapla
        const profilUSD = [
          safeParseFloat(staticVars.flans_usd) || 0,
          safeParseFloat(staticVars.vida_usd) || 0,
          safeParseFloat(staticVars.klips_usd) || 0,
          safeParseFloat(staticVars.dubel_usd) || 0,
          safeParseFloat(staticVars.kapak_usd) || 0
        ];
        
        const profilHammaddeToplamAd = (flansAdet * profilUSD[0]) + 
        (vidaAdet * profilUSD[1]) + 
        (klipsAdet * profilUSD[2]) + 
        (dubelAdet * profilUSD[3]) + 
        (kapakAdet * profilUSD[4]);

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
        const profilDogalgazKullanim = safeParseFloat(profilDegiskenler.profil_dogalgaz_tuketim_stn_m3);
        const profilBoyaElektrikKullanim = safeParseFloat(profilDegiskenler.profil_boya_makinesi_elektrik_tuketim_kwh);
        
        const profilDogalgazTuketimOran = profilDogalgazKullanim / profilSaatlikUretimKapasitesi;
        const profilBoyaElektrikTuketimOran = profilBoyaElektrikKullanim / profilSaatlikUretimKapasitesi;
        
        // Galvanizli/Galvanizsiz profil fiyatlarını hesapla
        const galvanizsizProfilFiyatKg = safeParseFloat(profilDegiskenler.galvanizsiz_profil_kg_usd) / 1000;
        const galvanizliProfilFiyatKg = safeParseFloat(profilDegiskenler.galvanizli_profil_kg_usd) / 1000;
        
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
            boyam2 = spBoyaM2; // Single ve Ozel için
        }
        
        const boyaAdetUSD = (boyam2 * l1Metre) + 
                          (panelBoyaElektrikM2 * l1Metre) + 
                          (panelDogalgazM2 * l1Metre) + 
                          (panelBoyaIsciM2 * l1Metre);
        
        // Son maliyetleri hesapla
        const boyaliAdetUSD = adetUSD + boyaAdetUSD;
        const profilAgirlik = ((2 * profilEn1 + 2 * profilEn2 + 2 * materialHeight) * profilEtKalinligi * 7.85) / 1000;
        
        // Geçici hesaplara kaydet
        const geciciHesap = {
          panel_kapasite: panelKapasite,
          yalniz_panel_aylik: yalnizPanelAylikKapasite,
          panel_kaynak_elektrik: panelKaynakElektrikM2,
          panel_kesme_elektrik: panelKesmeElektrikM2,
          diger_m2: digerM2,
          yalniz_panel_isci_m2: yalnizPanelIsciM2,
          galvaniz_tel_kg: galvanizTelKg,
          boya_kapasite: boyaKapasite,
          boya_aylik_kapasite: boyaAylikKapasite,
          panel_boya_elektrik: panelBoyaElektrikM2,
          panel_dogalgaz_m2: panelDogalgazM2,
          panel_boya_isci_m2: panelBoyaIsciM2,
          dp_boya_m2: dpBoyaM2,
          sp_boya_m2: spBoyaM2,
          profil_kapasite_ad: profilKapasiteAd,
          profil_aylik_kapasite: profilAylikKapasite,
          profil_boya_tuketim: profilBoyaTuketimAdUSD,
          profil_elektrik_kesme_ad: profilElektrikKesmeAd,
          profil_elektrik_kaynak_ad: profilElektrikKaynakAd,
          profil_isci_sayisi_ad: profilIsciUretimAd,
          profil_hammadde_toplam: profilHammaddeToplamAd,
          galvanizsiz_profil_fiyat_kg: galvanizsizProfilFiyatKg,
          galvanizli_profil_fiyat_kg: galvanizliProfilFiyatKg,
          profil_dogalgaz_tuketim: profilDogalgazTuketimOran,
          profil_boya_elk_tuketim: profilBoyaElektrikTuketimOran,
          adet_usd: adetUSD,
          boyam2: boyam2,
          boya_adet_usd: boyaAdetUSD,
          boyali_adet_usd: boyaliAdetUSD,
          manual_order: manualOrder,
          panel_kodu: panelKodu,
          profil_yukseklik: materialHeight,
          profil_agirlik: profilAgirlik,
          flans_adet: flansAdet,
          vida_adet: vidaAdet,
          klips_adet: klipsAdet,
          dubel_adet: dubelAdet,
          kapak_adet: kapakAdet,
          profil_saatlik_uretim: profilSaatlikUretimKapasitesi,
          panel_adet_m2: l1Metre,
          panel_adet_agirlik: weightKg,
          created_at: new Date().toISOString()
        };
        
        // Geçici hesapları veritabanına kaydet
        await axios.post(API_URLS.geciciHesaplar, geciciHesap);
        
        // Maliyet hesaplamalarını yap
        const usdTlKuru = safeParseFloat(genelDegiskenler.usd_tl) || 1;
        const eurUsdKuru = safeParseFloat(genelDegiskenler.eur_usd) || 1;
        
        // SetUSD hesapla
        const SetUSD = profilBoyaTuketimAdUSD +
                      profilElektrikKesmeAd +
                      profilElektrikKaynakAd +
                      profilIsciUretimAd +
                      profilHammaddeToplamAd +
                      (galvanizsizProfilFiyatKg * profilAgirlik) +
                      profilDogalgazTuketimOran +
                      profilBoyaElektrikTuketimOran;
                      
        // Maliyet hesaplamaları
        const maliyetKalemi = {
          manual_order: manualOrder,
          panel_kodu: panelKodu,
          
          // Çıplak Adet hesaplamaları
          ciplak_adet_usd: parseFloat((adetUSD).toFixed(5)),
          ciplak_adet_eur: parseFloat((adetUSD / eurUsdKuru).toFixed(5)),
          ciplak_adet_try: parseFloat((adetUSD * usdTlKuru).toFixed(5)),
          
          // Çıplak M2 hesaplamaları
          ciplak_m2_usd: l1Metre > 0 ? parseFloat((adetUSD / l1Metre).toFixed(5)) : 0,
          ciplak_m2_eur: l1Metre > 0 ? parseFloat(((adetUSD / l1Metre) / eurUsdKuru).toFixed(5)) : 0,
          ciplak_m2_try: l1Metre > 0 ? parseFloat(((adetUSD / l1Metre) * usdTlKuru).toFixed(5)) : 0,
          
          // Çıplak Kg hesaplamaları
          ciplak_kg_usd: weightKg > 0 ? parseFloat((adetUSD / weightKg).toFixed(5)) : 0,
          ciplak_kg_eur: weightKg > 0 ? parseFloat(((adetUSD / weightKg) / eurUsdKuru).toFixed(5)) : 0,
          ciplak_kg_try: weightKg > 0 ? parseFloat(((adetUSD / weightKg) * usdTlKuru).toFixed(5)) : 0,
        
          
          // Boyalı Adet hesaplamaları
          boyali_adet_usd: parseFloat((boyaliAdetUSD).toFixed(5)),
          boyali_adet_eur: parseFloat((boyaliAdetUSD / eurUsdKuru).toFixed(5)),
          boyali_adet_try: parseFloat((boyaliAdetUSD * usdTlKuru).toFixed(5)),
          
          // Boyalı M2 hesaplamaları
          boyali_m2_usd: l1Metre > 0 ? parseFloat((boyaliAdetUSD / l1Metre).toFixed(5)) : 0,
          boyali_m2_eur: l1Metre > 0 ? parseFloat(((boyaliAdetUSD / l1Metre) / eurUsdKuru).toFixed(5)) : 0,
          boyali_m2_try: l1Metre > 0 ? parseFloat(((boyaliAdetUSD / l1Metre) * usdTlKuru).toFixed(5)) : 0,
          
          // Boyalı Kg hesaplamaları
          boyali_kg_usd: weightKg > 0 ? parseFloat((boyaliAdetUSD / weightKg).toFixed(5)) : 0,
          boyali_kg_eur: weightKg > 0 ? parseFloat(((boyaliAdetUSD / weightKg) / eurUsdKuru).toFixed(5)) : 0,
          boyali_kg_try: weightKg > 0 ? parseFloat(((boyaliAdetUSD / weightKg) * usdTlKuru).toFixed(5)) : 0,
          
          // Setli + Boyasız Adet hesaplamaları
          setli_boyasiz_adet_usd: parseFloat((adetUSD + SetUSD).toFixed(5)),
          setli_boyasiz_adet_eur: parseFloat(((adetUSD + SetUSD) / eurUsdKuru).toFixed(5)),
          setli_boyasiz_adet_try: parseFloat(((adetUSD + SetUSD) * usdTlKuru).toFixed(5)),
          
          // Setli + Boyasız M2 hesaplamaları
          setli_boyasiz_m2_usd: l1Metre > 0 ? parseFloat(((adetUSD + SetUSD) / l1Metre).toFixed(5)) : 0,
          setli_boyasiz_m2_eur: l1Metre > 0 ? parseFloat((((adetUSD + SetUSD) / l1Metre) / eurUsdKuru).toFixed(5)) : 0,
          setli_boyasiz_m2_try: l1Metre > 0 ? parseFloat((((adetUSD + SetUSD) / l1Metre) * usdTlKuru).toFixed(5)) : 0,
          
          // Setli + Boyasız Kg hesaplamaları
          setli_boyasiz_kg_usd: weightKg > 0 ? parseFloat(((adetUSD + SetUSD) / weightKg).toFixed(5)) : 0,
          setli_boyasiz_kg_eur: weightKg > 0 ? parseFloat((((adetUSD + SetUSD) / weightKg) / eurUsdKuru).toFixed(5)) : 0,
          setli_boyasiz_kg_try: weightKg > 0 ? parseFloat((((adetUSD + SetUSD) / weightKg) * usdTlKuru).toFixed(5)) : 0,
          
          // Setli + Boyalı Adet hesaplamaları
          setli_boyali_adet_usd: parseFloat((boyaliAdetUSD + SetUSD).toFixed(5)),
          setli_boyali_adet_eur: parseFloat(((boyaliAdetUSD + SetUSD) / eurUsdKuru).toFixed(5)),
          setli_boyali_adet_try: parseFloat(((boyaliAdetUSD + SetUSD) * usdTlKuru).toFixed(5)),
          
          // Setli + Boyalı M2 hesaplamaları
          setli_boyali_m2_usd: l1Metre > 0 ? parseFloat(((boyaliAdetUSD + SetUSD) / l1Metre).toFixed(5)) : 0,
          setli_boyali_m2_eur: l1Metre > 0 ? parseFloat((((boyaliAdetUSD + SetUSD) / l1Metre) / eurUsdKuru).toFixed(5)) : 0,
          setli_boyali_m2_try: l1Metre > 0 ? parseFloat((((boyaliAdetUSD + SetUSD) / l1Metre) * usdTlKuru).toFixed(5)) : 0,
          
          // Setli + Boyalı Kg hesaplamaları
          setli_boyali_kg_usd: weightKg > 0 ? parseFloat(((boyaliAdetUSD + SetUSD) / weightKg).toFixed(5)) : 0,
          setli_boyali_kg_eur: weightKg > 0 ? parseFloat((((boyaliAdetUSD + SetUSD) / weightKg) / eurUsdKuru).toFixed(5)) : 0,
          setli_boyali_kg_try: weightKg > 0 ? parseFloat((((boyaliAdetUSD + SetUSD) / weightKg) * usdTlKuru).toFixed(5)) : 0,
          
          created_at: new Date().toISOString()
        };
        
        // Maliyet kalemini veritabanına kaydet
        await axios.post(API_URLS.maliyetListesi, maliyetKalemi);
      } catch (error) {
        console.error(`Hesaplama hatası (${panel.panel_kodu}):`, error);
        throw error;
      }
    }
  };

// Sonuç filtresini güncelleme
  const handleResultFilterChange = (type, value) => {
    setResultFilter({
      ...resultFilter,
      [type]: value
    });
  };

  // Excel'e aktarma
  const exportToExcel = () => {
    if (!maliyetListesi.length) {
      alert('Dışa aktarılacak veri bulunamadı!');
      return;
    }
    
    // Filtrelere göre sütunları belirle
    let dataToExport = [...maliyetListesi];
    let columnsToInclude = [];
    
    // Her zaman dahil edilecek sütunlar
    columnsToInclude.push('manual_order', 'panel_kodu');
    
    // Birim bazında filtreleme
    if (resultFilter.unit === 'adet' || resultFilter.unit === 'all') {
      if (resultFilter.type === 'ciplak' || resultFilter.type === 'all') {
        columnsToInclude.push('ciplak_adet_usd', 'ciplak_adet_eur', 'ciplak_adet_try');
      }
      if (resultFilter.type === 'boyali' || resultFilter.type === 'all') {
        columnsToInclude.push('boyali_adet_usd', 'boyali_adet_eur', 'boyali_adet_try');
      }
      if (resultFilter.type === 'setli_boyasiz' || resultFilter.type === 'all') {
        columnsToInclude.push('setli_boyasiz_adet_usd', 'setli_boyasiz_adet_eur', 'setli_boyasiz_adet_try');
      }
      if (resultFilter.type === 'setli_boyali' || resultFilter.type === 'all') {
        columnsToInclude.push('setli_boyali_adet_usd', 'setli_boyali_adet_eur', 'setli_boyali_adet_try');
      }
    }
    
    if (resultFilter.unit === 'm2' || resultFilter.unit === 'all') {
      if (resultFilter.type === 'ciplak' || resultFilter.type === 'all') {
        columnsToInclude.push('ciplak_m2_usd', 'ciplak_m2_eur', 'ciplak_m2_try');
      }
      if (resultFilter.type === 'boyali' || resultFilter.type === 'all') {
        columnsToInclude.push('boyali_m2_usd', 'boyali_m2_eur', 'boyali_m2_try');
      }
      if (resultFilter.type === 'setli_boyasiz' || resultFilter.type === 'all') {
        columnsToInclude.push('setli_boyasiz_m2_usd', 'setli_boyasiz_m2_eur', 'setli_boyasiz_m2_try');
      }
      if (resultFilter.type === 'setli_boyali' || resultFilter.type === 'all') {
        columnsToInclude.push('setli_boyali_m2_usd', 'setli_boyali_m2_eur', 'setli_boyali_m2_try');
      }
    }
    
    if (resultFilter.unit === 'kg' || resultFilter.unit === 'all') {
      if (resultFilter.type === 'ciplak' || resultFilter.type === 'all') {
        columnsToInclude.push('ciplak_kg_usd', 'ciplak_kg_eur', 'ciplak_kg_try');
      }
      if (resultFilter.type === 'boyali' || resultFilter.type === 'all') {
        columnsToInclude.push('boyali_kg_usd', 'boyali_kg_eur', 'boyali_kg_try');
      }
      if (resultFilter.type === 'setli_boyasiz' || resultFilter.type === 'all') {
        columnsToInclude.push('setli_boyasiz_kg_usd', 'setli_boyasiz_kg_eur', 'setli_boyasiz_kg_try');
      }
      if (resultFilter.type === 'setli_boyali' || resultFilter.type === 'all') {
        columnsToInclude.push('setli_boyali_kg_usd', 'setli_boyali_kg_eur', 'setli_boyali_kg_try');
      }
    }
    
    // Para birimi bazında filtreleme
    if (resultFilter.currency !== 'all') {
      dataToExport = dataToExport.map(item => {
        const filteredItem = { manual_order: item.manual_order, panel_kodu: item.panel_kodu };
        
        Object.keys(item).forEach(key => {
          if (key.includes(resultFilter.currency.toLowerCase()) && columnsToInclude.includes(key)) {
            filteredItem[key] = item[key];
          }
        });
        
        return filteredItem;
      });
    }
    
    const filteredData = dataToExport.map(item => {
      const newItem = {};
      columnsToInclude.forEach(col => {
        if (resultFilter.currency === 'all' || col.includes(resultFilter.currency.toLowerCase()) || 
            col === 'manual_order' || col === 'panel_kodu') {
          newItem[col] = item[col];
        }
      });
      return newItem;
    });
    
    // Worksheet oluştur
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    
    // Workbook oluştur
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maliyet Listesi');
    
    // Excel dosyasını indir
    XLSX.writeFile(workbook, 'Panel_Cit_Maliyet_Listesi.xlsx');
  };

  // Genel değişkenleri güncelleme
  const handleGenelDegiskenlerChange = (field, value) => {
    // Virgülleri noktalara dönüştür
    const formattedValue = typeof value === 'string' ? value.replace(/,/g, '.') : value;
    setGenelDegiskenler({
      ...genelDegiskenler,
      [field]: formattedValue
    });
  };

  // Panel çit değişkenlerini güncelleme
  const handlePanelCitDegiskenlerChange = (field, value) => {
    // Virgülleri noktalara dönüştür
    const formattedValue = typeof value === 'string' ? value.replace(/,/g, '.') : value;
    setPanelCitDegiskenler({
      ...panelCitDegiskenler,
      [field]: formattedValue
    });
  };

  // Profil değişkenlerini güncelleme
  const handleProfilDegiskenlerChange = (field, value) => {
    // Virgülleri noktalara dönüştür
    const formattedValue = typeof value === 'string' ? value.replace(/,/g, '.') : value;
    setProfilDegiskenler({
      ...profilDegiskenler,
      [field]: formattedValue
    });
  };

  // Üst Kısım - Sekmeler
  const renderTabButtons = () => (
    <div className="flex flex-wrap gap-2 justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => setActiveTab('main-panel')} 
          className={`flex items-center px-4 py-2 rounded-md ${activeTab === 'main-panel' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <Filter className="w-5 h-5 mr-2" />
          Panel Çit Listesi
        </button>
        <button 
          onClick={() => setActiveTab('special-panel')} 
          className={`flex items-center px-4 py-2 rounded-md ${activeTab === 'special-panel' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          <Plus className="w-5 h-5 mr-2" />
          Özel Panel & Palet Bilgileri Hesaplama
        </button>
        {showResults && (
          <button 
            onClick={() => setActiveTab('results')} 
            className={`flex items-center px-4 py-2 rounded-md ${activeTab === 'results' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Calculator className="w-5 h-5 mr-2" />
            Sonuçlar
          </button>
        )}
        {showResults && (
          <button 
            onClick={() => setActiveTab('temp-calculations')} 
            className={`flex items-center px-4 py-2 rounded-md ${activeTab === 'temp-calculations' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Edit className="w-5 h-5 mr-2" />
            Geçici Hesaplar
          </button>
        )}
      </div>
      <div className="flex gap-2">
        {activeTab === 'results' && showResults && (
          <button 
            onClick={() => exportToExcel()}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Excel&apos;e Aktar
          </button>
        )}
      </div>
    </div>
  );
// Değişkenler Akordiyon
  const renderDegiskenlerAccordion = () => (
    <Accordion type="single" collapsible className="bg-white rounded-lg border shadow-sm">
      {/* Genel Değişkenler Akordiyon Öğesi */}
      <AccordionItem value="genel-degiskenler">
        <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-3">
              <RefreshCw size={18} />
            </div>
            <span className="font-semibold text-lg">Kur ve Genel Değişkenler</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 py-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {/* Kur Bilgileri */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                  <RefreshCw size={20} />
                </div>
                <h4 className="font-medium">KUR</h4>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">USD/TL</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.usd_tl || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('usd_tl', e.target.value)}
                    className="border rounded p-2"
                    step="0.00001"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">EUR/USD</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.eur_usd || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('eur_usd', e.target.value)}
                    className="border rounded p-2"
                    step="0.00001"
                  />
                </div>
              </div>
            </div>
            
            {/* Genel Değişkenler */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                  <Calculator size={20} />
                </div>
                <h4 className="font-medium">Genel Değişkenler</h4>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Boya Fiyatı (kg) (€)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.boya_fiyati_kg_eur || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('boya_fiyati_kg_eur', e.target.value)}
                    className="border rounded p-2"
                    step="0.00001"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Elektrik Fiyatı (kW) (₺)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.elektrik_fiyati_kw_tl || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('elektrik_fiyati_kw_tl', e.target.value)}
                    className="border rounded p-2"
                    step="0.00001"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Doğalgaz Fiyatı (Stn.m³) (₺)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.dogalgaz_fiyati_stn_m3_tl || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('dogalgaz_fiyati_stn_m3_tl', e.target.value)}
                    className="border rounded p-2"
                    step="0.00001"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Amortisman & Diğer ($)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.amortisman_diger_usd || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('amortisman_diger_usd', e.target.value)}
                    className="border rounded p-2"
                    step="0.00001"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">KAR Oranı (Toplama Ek %)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.kar_toplama_ek_percent || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('kar_toplama_ek_percent', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Ort. İşçi Maaşı (₺)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.ort_isci_maasi || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('ort_isci_maasi', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Save & Refresh Section at the Bottom */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
            <div className="text-sm text-gray-600 flex items-center">
              <span>Son Güncelleme:</span>
              <span className="ml-1 font-medium">
                {genelDegiskenler.genel_latest_update ? 
                  new Date(genelDegiskenler.genel_latest_update).toLocaleString('tr-TR') : 
                  'Bilinmiyor'}
              </span>
              <button 
                onClick={() => fetchSectionData('genel')} 
                className="ml-2 p-1 text-blue-600 rounded hover:bg-blue-50"
                title="Yenile"
                disabled={sectionLoading.genel}
              >
                <RefreshCw size={16} className={sectionLoading.genel ? 'animate-spin' : ''} />
              </button>
            </div>
            <button
              onClick={() => updateGenelDegiskenler()}
              className="px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center"
              disabled={sectionLoading.genel}
            >
              <Save className="w-4 h-4 mr-1.5" />
              Kur ve Genel Değişkenleri Kaydet
            </button>
          </div>
        </AccordionContent>
      </AccordionItem>
      
      {/* Panel Çit Değişkenleri Akordiyon Öğesi */}
      <AccordionItem value="panel-cit-degiskenler">
        <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
              <Filter size={18} />
            </div>
            <span className="font-semibold text-lg">Panel Çit Değişkenleri</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 py-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            {/* İşçi Sayıları ve Vardiyalar */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-3">İşçi Sayıları ve Vardiyalar</h4>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Boya İşçi Sayısı (ad)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_boya_isci_sayisi_ad || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_boya_isci_sayisi_ad', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Boya Vardiya</label>
                  <select
                    value={panelCitDegiskenler.panel_boya_vardiya || ''}
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_boya_vardiya', e.target.value)}
                    className="border rounded p-2"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Kaynak İşçi Sayısı (ad)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_kaynak_isci_sayisi_ad || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_kaynak_isci_sayisi_ad', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Kaynak Vardiya</label>
                  <select
                    value={panelCitDegiskenler.panel_kaynak_vardiya || ''}
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_kaynak_vardiya', e.target.value)}
                    className="border rounded p-2"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Kesme İşçi Sayısı (ad)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_kesme_isci_sayisi_ad || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_kesme_isci_sayisi_ad', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Kesme Vardiya</label>
                  <select
                    value={panelCitDegiskenler.panel_kesme_vardiya || ''}
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_kesme_vardiya', e.target.value)}
                    className="border rounded p-2"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Palet İşçi Sayısı (ad)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_palet_isci_sayisi_ad || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_palet_isci_sayisi_ad', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Palet Vardiya</label>
                  <select
                    value={panelCitDegiskenler.panel_palet_vardiya || ''}
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_palet_vardiya', e.target.value)}
                    className="border rounded p-2"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tüketim ve Malzeme */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-3">Tüketim ve Malzeme</h4>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Kaynak Elektrik Tüketim (kWh)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_kaynak_makinesi_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_kaynak_makinesi_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Kesme Elektrik Tüketim (kWh)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_kesme_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_kesme_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Boya Elektrik Tüketim (kWh)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_boya_makinesi_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_boya_makinesi_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Doğalgaz Tüketim (Stn.m³/h)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_dogalgaz_tuketim_stn_m3 || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_dogalgaz_tuketim_stn_m3', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Galvanizli Tel (Ton) ($)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.galvanizli_tel_ton_usd || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('galvanizli_tel_ton_usd', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Hurda (Ton) ($)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.hurda_ton_usd || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('hurda_ton_usd', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            
            {/* Boya ve Üretim Kapasitesi */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-3">Boya ve Üretim Kapasitesi</h4>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">SP Boya Tüketim Miktarı (gr/m²)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.sp_boya_tuketim_miktari || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('sp_boya_tuketim_miktari', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">DP Boya Tüketim Miktarı (gr/m²)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.dp_boya_tuketim_miktari || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('dp_boya_tuketim_miktari', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">GP Boya Tüketim Miktarı (gr/m²)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.guvenlik_boya_tuketim_miktari_gr || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('guvenlik_boya_tuketim_miktari_gr', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Ort. Panel Ürt. Kapasitesi (m²/Ay)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.uretim_kapasite || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('uretim_kapasite', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Ortalama Saatlik Üretim (m²/h)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.saatlik_uretim || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('saatlik_uretim', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Save & Refresh Section at the Bottom */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
            <div className="text-sm text-gray-600 flex items-center">
              <span>Son Güncelleme:</span>
              <span className="ml-1 font-medium">
                {panelCitDegiskenler.panel_cit_latest_update ? 
                  new Date(panelCitDegiskenler.panel_cit_latest_update).toLocaleString('tr-TR') : 
                  'Bilinmiyor'}
              </span>
              <button 
                onClick={() => fetchSectionData('panelCit')} 
                className="ml-2 p-1 text-blue-600 rounded hover:bg-blue-50"
                title="Yenile"
                disabled={sectionLoading.panelCit}
              >
                <RefreshCw size={16} className={sectionLoading.panelCit ? 'animate-spin' : ''} />
              </button>
            </div>
            <button
              onClick={() => updatePanelCitDegiskenler()}
              className="px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center"
              disabled={sectionLoading.panelCit}
            >
              <Save className="w-4 h-4 mr-1.5" />
              Panel Çit Değişkenlerini Kaydet
            </button>
          </div>
        </AccordionContent>
      </AccordionItem>

{/* Profil Değişkenleri Akordiyon Öğesi */}
      <AccordionItem value="profil-degiskenler">
        <AccordionTrigger className="px-4 py-2 hover:bg-gray-50">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-3">
              <Filter size={18} />
            </div>
            <span className="font-semibold text-lg">Profil Değişkenleri</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 py-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            {/* Profil Fiyatları */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-3">Profil Fiyatları</h4>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Galvanizli Profil (Ton) ($)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.galvanizli_profil_kg_usd || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('galvanizli_profil_kg_usd', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Galvanizsiz Profil (Ton) ($)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.galvanizsiz_profil_kg_usd || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('galvanizsiz_profil_kg_usd', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            
            {/* Üretim Kapasitesi ve İşçilik */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-3">Üretim Kapasitesi ve İşçilik</h4>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Min. Ürt. Kapasitesi (ad/h)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_uretim_kapasitesi_m2_h || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_uretim_kapasitesi_m2_h', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">profil_vardiya</label>
                  <select
                    value={profilDegiskenler.profil_vardiya || ''}
                    onChange={(e) => handleProfilDegiskenlerChange('profil_vardiya', e.target.value)}
                    className="border rounded p-2"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil İşçi Sayısı (ad)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_isci_sayisi_ad || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_isci_sayisi_ad', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
              </div>
            </div>
            {/* Elektrik Tüketimi */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-3">Elektrik Tüketimi</h4>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Kaynak Makinesi Elektrik Tüketim Miktarı (kWh)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_kaynak_makinesi_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_kaynak_makinesi_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Kesme Makinesi Elektrik Tüketim Miktarı (kWh)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_kesme_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_kesme_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Boya Makinesi Elektrik Tüketim Miktarı (kWh)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_boya_makinesi_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_boya_makinesi_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          
            {/* Doğalgaz ve Boya Tüketimi */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-3">Doğalgaz ve Boya Tüketimi</h4>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Doğalgaz Tüketim Miktarı (Stn.m³/h)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_dogalgaz_tuketim_stn_m3 || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_dogalgaz_tuketim_stn_m3', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Boya Tüketim Miktarı (gr/m²)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_boya_tuketim || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_boya_tuketim', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            
            {/* Fiziksel Özellikler */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-3">Fiziksel Özellikler</h4>
              <div className="space-y-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil En 1</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_en1 || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_en1', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil En 2</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_en2 || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_en2', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Et Kalınlığı</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_et_kalinligi || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_et_kalinligi', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            
            {/* Aksam Fiyatları */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="font-medium mb-3">Aksam Fiyatları</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Flans Fyt (ad) (₺)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.flans_ad_tl || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('flans_ad_tl', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Vida Fyt (ad) (₺)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.vida_ad_tl || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('vida_ad_tl', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Klips Fyt (ad) (₺)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.klips_ad_tl || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('klips_ad_tl', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Dubel Fyt (ad) (₺)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.dubel_ad_tl || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('dubel_ad_tl', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Kapak Fyt (ad) (₺)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.kapak_ad_tl || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('kapak_ad_tl', e.target.value)}
                    className="border rounded p-2"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Save & Refresh Section at the Bottom */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
            <div className="text-sm text-gray-600 flex items-center">
              <span>Son Güncelleme:</span>
              <span className="ml-1 font-medium">
                {profilDegiskenler.profil_latest_update ? 
                  new Date(profilDegiskenler.profil_latest_update).toLocaleString('tr-TR') : 
                  'Bilinmiyor'}
              </span>
              <button 
                onClick={() => fetchSectionData('profil')} 
                className="ml-2 p-1 text-blue-600 rounded hover:bg-blue-50"
                title="Yenile"
                disabled={sectionLoading.profil}
              >
                <RefreshCw size={16} className={sectionLoading.profil ? 'animate-spin' : ''} />
              </button>
            </div>
            <button
              onClick={() => updateProfilDegiskenler()}
              className="px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center"
              disabled={sectionLoading.profil}
            >
              <Save className="w-4 h-4 mr-1.5" />
              Profil Değişkenlerini Kaydet
            </button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  // Panel Listesi Gösterimi
  const renderPanelList = () => (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Panel Çit Listesi</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSelectedPanelType('all')}
              className={`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'all' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              Tümü
            </button>
            <button 
              onClick={() => setSelectedPanelType('SP')}
              className={`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'SP' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              SP
            </button>
            <button 
              onClick={() => setSelectedPanelType('DP')}
              className={`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'DP' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              DP
            </button>
            <button 
              onClick={() => setSelectedPanelType('GP')}
              className={`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'GP' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              GP
            </button>
            <button 
              onClick={() => setSelectedPanelType('OP')}
              className={`px-3 py-1 rounded-md text-sm ${selectedPanelType === 'OP' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              OP
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Panel kodu veya tanımı ara..." 
              value={panelSearch} 
              onChange={(e) => setPanelSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Toplam:</span>
            <span className="font-semibold">{filteredPanelList.length} panel</span>
          </div>
          
          <button 
            onClick={() => calculateCosts(true)}
            disabled={calculating || filteredPanelList.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
          >
            {calculating ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Hesaplanıyor...
              </>
            ) : (
              <>
                <Calculator className="w-5 h-5 mr-2" />
                Hesapla
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {[
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
                  key={column.key} 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortPanelList(column.key)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      {column.label}
                      {sortConfig.key === column.key && (
                        <span className="ml-1">
                          {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Filtrele..."
                      value={columnFilters[column.key] || ''}
                      onChange={(e) => handleColumnFilterChange(column.key, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPanelList.map((panel) => (
              <tr key={panel.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{panel.panel_kodu}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{panel.panel_tipi}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{panel.panel_yuksekligi}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{panel.panel_genisligi}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{panel.dikey_tel_capi}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{panel.yatay_tel_capi}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{panel.dikey_goz_araligi}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{panel.yatay_goz_araligi}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{panel.bukum_sayisi}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{panel.bukumdeki_cubuk_sayisi}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{typeof panel.adet_m2 === 'number' ? panel.adet_m2.toFixed(4) : panel.adet_m2}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{typeof panel.agirlik === 'number' ? panel.agirlik.toFixed(4) : panel.agirlik}</td>
              </tr>
            ))}
            {filteredPanelList.length === 0 && (
              <tr>
                <td colSpan="12" className="px-4 py-4 text-center text-sm text-gray-500">
                  {loading ? 'Yükleniyor...' : 'Eşleşen panel bulunamadı. Lütfen filtrelerinizi kontrol edin.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

// Özel Panel Girişi
const renderSpecialPanelEntry = () => (
  <div className="bg-white rounded-lg border shadow-sm">
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Özel Panel & Palet Bilgileri Hesaplama</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={addOzelPanel}
            className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Yeni Panel Ekle
          </button>
          <button 
            onClick={() => calculateCosts(false)}
            disabled={calculating || ozelPanelList.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 text-sm"
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
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Özel panel bilgilerini girin ve hesaplamaları yapın. Daha sonra isterseniz panelleri veritabanına kaydedebilirsiniz.
      </p>
    </div>
    
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Panel Tipi
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Yükseklik
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Genişlik
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dikey Tel Çapı
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Yatay Tel Çapı
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dikey Göz Aralığı
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Yatay Göz Aralığı
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Büküm Sayısı
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Dikey Çubuk Adedi
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Yatay Çubuk Adedi
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Adet M²
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ağırlık
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Boya Kg
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Boyalı Hali
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Panel Kodu
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Paletteki Panel Sayısı
            </th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {ozelPanelList.map((panel) => (
            <tr key={panel.id} className={panel.isNew ? 'bg-green-50' : ''}>
              <td className="px-3 py-2 whitespace-nowrap">
                <select
                  value={panel.panel_tipi || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'panel_tipi', e.target.value)}
                  className="w-full border rounded p-1 text-sm"
                >
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Guvenlik">Güvenlik</option>
                </select>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.panel_yuksekligi || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'panel_yuksekligi', e.target.value)}
                  className="w-16 border rounded p-1 text-sm"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.panel_genisligi || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'panel_genisligi', e.target.value)}
                  className="w-16 border rounded p-1 text-sm"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.dikey_tel_capi || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'dikey_tel_capi', e.target.value)}
                  className="w-16 border rounded p-1 text-sm"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.yatay_tel_capi || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'yatay_tel_capi', e.target.value)}
                  className="w-16 border rounded p-1 text-sm"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.dikey_goz_araligi || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'dikey_goz_araligi', e.target.value)}
                  className="w-16 border rounded p-1 text-sm"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.yatay_goz_araligi || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'yatay_goz_araligi', e.target.value)}
                  className="w-16 border rounded p-1 text-sm"
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.bukum_sayisi || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'bukum_sayisi', e.target.value)}
                  className="w-16 border rounded p-1 text-sm"
                  readOnly
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.dikey_cubuk_adet || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'dikey_cubuk_adet', e.target.value)}
                  className="w-16 border rounded p-1 text-sm"
                  readOnly
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.yatay_cubuk_adet || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'yatay_cubuk_adet', e.target.value)}
                  className="w-16 border rounded p-1 text-sm"
                  readOnly
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={typeof panel.adet_m2 === 'number' ? panel.adet_m2.toFixed(5) : panel.adet_m2 || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'adet_m2', e.target.value)}
                  className="w-20 border rounded p-1 text-sm"
                  readOnly
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={typeof panel.agirlik === 'number' ? panel.agirlik.toFixed(5) : panel.agirlik || ''}
                  onChange={(e) => updateOzelPanel(panel.id, 'agirlik', e.target.value)}
                  className="w-20 border rounded p-1 text-sm"
                  readOnly
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={typeof panel.boya_kg === 'number' ? panel.boya_kg.toFixed(5) : panel.boya_kg || ''}
                  className="w-20 border rounded p-1 text-sm"
                  readOnly
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={typeof panel.boyali_hali === 'number' ? panel.boyali_hali.toFixed(5) : panel.boyali_hali || ''}
                  className="w-20 border rounded p-1 text-sm"
                  readOnly
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.panel_kodu || ''}
                  className="w-48 border rounded p-1 text-sm"
                  readOnly
                />
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={panel.paletteki_panel_sayisi || ''}
                  className="w-20 border rounded p-1 text-sm"
                  readOnly
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
              <td colSpan="17" className="px-3 py-4 text-center text-sm text-gray-500">
                Henüz özel panel eklenmemiş. Yeni panel eklemek için yukarıdaki &quot;Yeni Panel Ekle&quot; düğmesini kullanın.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// Sonuçlar Tablosu
  const renderResults = () => (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold">Maliyet Hesaplama Sonuçları</h3>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Para Birimi:</span>
              <select
                value={resultFilter.currency}
                onChange={(e) => handleResultFilterChange('currency', e.target.value)}
                className="border rounded p-1 text-sm"
              >
                <option value="all">Tümü</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="TRY">TRY</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Birim:</span>
              <select
                value={resultFilter.unit}
                onChange={(e) => handleResultFilterChange('unit', e.target.value)}
                className="border rounded p-1 text-sm"
              >
                <option value="all">Tümü</option>
                <option value="adet">Adet</option>
                <option value="m2">m²</option>
                <option value="kg">kg</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Tip:</span>
              <select
                value={resultFilter.type}
                onChange={(e) => handleResultFilterChange('type', e.target.value)}
                className="border rounded p-1 text-sm"
              >
                <option value="all">Tümü</option>
                <option value="ciplak">Çıplak</option>
                <option value="boyali">Boyalı</option>
                <option value="setli_boyasiz">Setli + Boyasız</option>
                <option value="setli_boyali">Setli + Boyalı</option>
              </select>
            </div>
            
            <button 
              onClick={() => exportToExcel()}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              disabled={maliyetListesi.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Excel&apos;e Aktar
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Panel kodu ara..." 
              value={panelSearch} 
              onChange={(e) => setPanelSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Toplam:</span>
            <span className="font-semibold">{maliyetListesi.length} sonuç</span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Panel Kodu
              </th>
              
              {/* Dinamik olarak sütunları oluştur */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çıplak Adet USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çıplak Adet EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çıplak Adet TRY
                    </th>
                  )}
                </>
              )}
              
              {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boyalı Adet USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boyalı Adet EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boyalı Adet TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Setli + Boyasız Adet */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyasız Adet USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyasız Adet EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyasız Adet TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Setli + Boyalı Adet */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyalı Adet USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyalı Adet EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyalı Adet TRY
                    </th>
                  )}
                </>
              )}
              
              {/* M2 hesaplamaları */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çıplak M² USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çıplak M² EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çıplak M² TRY
                    </th>
                  )}
                </>
              )}
              
              {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boyalı M² USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boyalı M² EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boyalı M² TRY
                    </th>
                  )}
                </>
              )}
              
              {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyasız M² USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyasız M² EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyasız M² TRY
                    </th>
                  )}
                </>
              )}
              
              {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyalı M² USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyalı M² EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyalı M² TRY
                    </th>
                  )}
                </>
              )}
              
              {/* KG hesaplamaları */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çıplak KG USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çıplak KG EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çıplak KG TRY
                    </th>
                  )}
                </>
              )}
              
              {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boyalı KG USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boyalı KG EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Boyalı KG TRY
                    </th>
                  )}
                </>
              )}
              
              {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyasız KG USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyasız KG EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyasız KG TRY
                    </th>
                  )}
                </>
              )}
              
              {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyalı KG USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyalı KG EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Setli + Boyalı KG TRY
                    </th>
                  )}
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {maliyetListesi.map((maliyet, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white">
                  {maliyet.panel_kodu}
                </td>
                
                {/* Dinamik olarak hücreleri oluştur - Adet */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.ciplak_adet_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.ciplak_adet_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.ciplak_adet_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.boyali_adet_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.boyali_adet_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.boyali_adet_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {/* Setli + Boyasız */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyasiz_adet_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyasiz_adet_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyasiz_adet_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {/* Setli + Boyalı */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyali_adet_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyali_adet_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyali_adet_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {/* M2 hesaplamaları */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.ciplak_m2_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.ciplak_m2_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.ciplak_m2_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.boyali_m2_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.boyali_m2_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.boyali_m2_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyasiz_m2_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyasiz_m2_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyasiz_m2_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyali_m2_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyali_m2_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyali_m2_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {/* KG hesaplamaları */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.ciplak_kg_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.ciplak_kg_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.ciplak_kg_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.boyali_kg_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.boyali_kg_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.boyali_kg_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyasiz_kg_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyasiz_kg_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyasiz_kg_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
                
                {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyali_kg_usd?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyali_kg_eur?.toFixed(5)}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {maliyet.setli_boyali_kg_try?.toFixed(5)}
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
            
            {maliyetListesi.length === 0 && (
              <tr>
                <td colSpan="100%" className="px-4 py-4 text-center text-sm text-gray-500">
                  Hesaplama yapılmamış veya sonuçlar bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Geçici Hesaplar Görünümü
  const renderTempCalculations = () => (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Geçici Hesaplar</h3>
          <div className="text-sm text-gray-500">
            <span className="font-semibold">{geciciHesaplar.length}</span> adet hesaplama
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          Bu tablo, maliyet hesaplamalarında kullanılan ara değerleri göstermektedir. Sadece referans amaçlıdır.
        </p>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Panel Kodu
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Panel Kapasite
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Panel Kaynak Elektrik m²
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Panel Kesme Elektrik m²
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Panel İşçi m²
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Galvaniz Tel Kg
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Boya Kapasite
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Boya Elektrik m²
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Boya İşçi m²
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Adet USD
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Boyalı Adet USD
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {geciciHesaplar.map((hesap, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white">
                  {hesap.panel_kodu}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.panel_kapasite === 'number' ? hesap.panel_kapasite.toFixed(3) : hesap.panel_kapasite}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.panel_kaynak_elektrik === 'number' ? hesap.panel_kaynak_elektrik.toFixed(5) : hesap.panel_kaynak_elektrik}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.panel_kesme_elektrik === 'number' ? hesap.panel_kesme_elektrik.toFixed(5) : hesap.panel_kesme_elektrik}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.yalniz_panel_isci_m2 === 'number' ? hesap.yalniz_panel_isci_m2.toFixed(5) : hesap.yalniz_panel_isci_m2}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.galvaniz_tel_kg === 'number' ? hesap.galvaniz_tel_kg.toFixed(5) : hesap.galvaniz_tel_kg}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.boya_kapasite === 'number' ? hesap.boya_kapasite.toFixed(3) : hesap.boya_kapasite}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.panel_boya_elektrik === 'number' ? hesap.panel_boya_elektrik.toFixed(5) : hesap.panel_boya_elektrik}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.panel_boya_isci_m2 === 'number' ? hesap.panel_boya_isci_m2.toFixed(5) : hesap.panel_boya_isci_m2}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.adet_usd === 'number' ? hesap.adet_usd.toFixed(5) : hesap.adet_usd}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {typeof hesap.boyali_adet_usd === 'number' ? hesap.boyali_adet_usd.toFixed(5) : hesap.boyali_adet_usd}
                </td>
              </tr>
            ))}
            
            {geciciHesaplar.length === 0 && (
              <tr>
                <td colSpan="11" className="px-3 py-4 text-center text-sm text-gray-500">
                  Hesaplama yapılmamış veya geçici hesaplar bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Aktif tab içeriğini gösterme
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'main-panel':
        return renderPanelList();
      case 'special-panel':
        return renderSpecialPanelEntry();
      case 'results':
        return renderResults();
      case 'temp-calculations':
        return renderTempCalculations();
      default:
        return renderPanelList();
    }
  };

  // Loading göstergesi
  const renderLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center">
        <RefreshCw className="animate-spin text-red-600 mb-4" size={40} />
        <p className="text-gray-600">Veriler yükleniyor, lütfen bekleyin...</p>
      </div>
    </div>
  );

  // Main component return
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Panel Çit Maliyet Hesaplama</h2>
      
      {/* Üst kısım düğmeler ve sekmeler */}
      {renderTabButtons()}
      
      {/* Değişkenler Akordiyon */}
      {renderDegiskenlerAccordion()}
      
      {/* İçerik */}
      {loading ? renderLoading() : renderActiveTabContent()}
    </div>
  );
};

export default PanelCitHesaplama;
