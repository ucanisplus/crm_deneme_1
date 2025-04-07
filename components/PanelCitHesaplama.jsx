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

// Palet ağırlıkları için referans tabloları
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

const [satisListesi, setSatisListesi] = useState([]);

// En yakın yükseklik değerini bulma yardımcı fonksiyonu
const getClosestHeight = (height, panelType, widthStr) => {
  const lookupTable = PALLET_WEIGHTS[panelType]?.[widthStr];
  if (!lookupTable) return null;
  
  const heights = Object.keys(lookupTable).map(Number);
  
  // Tam eşleşme ara
  if (lookupTable[height.toString()]) {
    return height.toString();
  }
  
  // En yakın değeri bul
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
const formatDisplayValue = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '';
  
  const num = parseFloat(value);
  
  // Tam sayı ise, ondalık gösterme
  if (Number.isInteger(num)) return num.toString();
  
  // Ondalıklı sayıysa, gereksiz sıfırları kaldır
  return num.toString().replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.$/, '');
};

// Ana PanelCitHesaplama bileşeni
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
    unit: 'adet'
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


// Part 2

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
      const latestPanelCitDegisken = panelCitRes.data.sort((a, b) => {
        // unique_key varsa ona göre sırala, yoksa id'ye göre sırala
        if (a.unique_key && b.unique_key) return b.unique_key - a.unique_key;
        return b.id - a.id;
      })[0] || {};
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
        latestRecord = response.data.sort((a, b) => {
          if (a.unique_key && b.unique_key) return b.unique_key - a.unique_key;
          return b.id - a.id;
        })[0] || {};
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
          usd_tl: formatDisplayValue(usdTry),
          eur_usd: formatDisplayValue(eurUsd)
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

//Part 3

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

  // Maliyet tablosunu filtreleme
  const filterMaliyetListesi = () => {
    // Arama terimi varsa arama filtresini uygula
    if (panelSearch && panelSearch.trim() !== '') {
      const searchTerm = panelSearch.toLowerCase();
      
      return maliyetListesi.filter(item => {
        const panelKodu = (item.panel_kodu || '').toLowerCase();
        return panelKodu.includes(searchTerm);
      });
    }
    
    return maliyetListesi;
  };

  // Panel Kodu Oluşturma
  const calculatePanelKodu = (panel) => {
    if (!panel || !panel.panel_tipi) return '';
    
    const prefix = panel.panel_tipi === 'Single' 
      ? 'SP' 
      : (panel.panel_tipi === 'Guvenlik' ? 'GP' : 'DP');
    
    const capStr = `${panel.dikey_tel_capi || 0} * ${panel.yatay_tel_capi || 0}`;
    const ebatStr = `${panel.panel_yuksekligi || 0} * ${panel.panel_genisligi || 0}`;
    const gozStr = `${panel.yatay_goz_araligi || 0} * ${panel.dikey_goz_araligi || 0}`;
    const bukumStr = `${panel.bukum_sayisi || 0}-1`; // Şimdilik sabit ikinci kısım
    
    return `${prefix}_Cap:${capStr}_Eb:${ebatStr}_Gz:${gozStr}_Buk:${bukumStr}_Rnk:"Kplmsz"`;
  };

  // Maliyet hesaplama fonksiyonu - geliştirilmiş performans ve doğruluk için optimize edildi
  const calculateCosts = async (isPanelList = true) => {
    setCalculating(true);
    setShowResults(false);
    setShowSalesView(false);
    
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
      alert('Hesaplama sırasında hata oluştu: ' + error.message);
    } finally {
      setCalculating(false);
    }
  };

//Part 4

// Veritabanına asenkron kaydetme - kullanıcı arayüzünü bloke etmeden
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
      
      // Her bir sonuç için veritabanına kaydetme işlemleri
      // Burada veritabanı performansı için batch işlemler yapılabilir
      
      // Geçici hesapları kaydet
      for (const hesap of geciciHesaplarData) {
        await axios.post(API_URLS.geciciHesaplar, hesap);
      }
      
      // Maliyet listesini kaydet
      for (const maliyet of maliyetListesiData) {
        await axios.post(API_URLS.maliyetListesi, maliyet);
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

//Part 5
        
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
          ciplak_adet_eur: Number((adetUSD / eurUsd) || 0),
          ciplak_adet_try: Number((adetUSD * usdTl) || 0),
          
          // Çıplak M2 hesaplamaları
          ciplak_m2_usd: l1Metre > 0 ? Number((adetUSD / l1Metre) || 0) : 0,
          ciplak_m2_eur: l1Metre > 0 ? Number(((adetUSD / l1Metre) / eurUsd) || 0) : 0,
          ciplak_m2_try: l1Metre > 0 ? Number(((adetUSD / l1Metre) * usdTl) || 0) : 0,
          
          // Çıplak Kg hesaplamaları
          ciplak_kg_usd: weightKg > 0 ? Number((adetUSD / weightKg) || 0) : 0,
          ciplak_kg_eur: weightKg > 0 ? Number(((adetUSD / weightKg) / eurUsd) || 0) : 0,
          ciplak_kg_try: weightKg > 0 ? Number(((adetUSD / weightKg) * usdTl) || 0) : 0,
          
          // Boyalı Adet hesaplamaları
          boyali_adet_usd: Number(boyaliAdetUSD || 0),
          boyali_adet_eur: Number((boyaliAdetUSD / eurUsd) || 0),
          boyali_adet_try: Number((boyaliAdetUSD * usdTl) || 0),
          
          // Boyalı M2 hesaplamaları
          boyali_m2_usd: l1Metre > 0 ? Number((boyaliAdetUSD / l1Metre) || 0) : 0,
          boyali_m2_eur: l1Metre > 0 ? Number(((boyaliAdetUSD / l1Metre) / eurUsd) || 0) : 0,
          boyali_m2_try: l1Metre > 0 ? Number(((boyaliAdetUSD / l1Metre) * usdTl) || 0) : 0,
          
          // Boyalı Kg hesaplamaları
          boyali_kg_usd: weightKg > 0 ? Number((boyaliAdetUSD / weightKg) || 0) : 0,
          boyali_kg_eur: weightKg > 0 ? Number(((boyaliAdetUSD / weightKg) / eurUsd) || 0) : 0,
          boyali_kg_try: weightKg > 0 ? Number(((boyaliAdetUSD / weightKg) * usdTl) || 0) : 0,
          
          // Standart Setli + Boyasız Adet hesaplamaları
          standart_setli_boyasiz_adet_usd: Number((adetUSD + SetUSD) || 0),
          standart_setli_boyasiz_adet_eur: Number(((adetUSD + SetUSD) / eurUsd) || 0),
          standart_setli_boyasiz_adet_try: Number(((adetUSD + SetUSD) * usdTl) || 0),
          
          // Standart Setli + Boyasız M2 hesaplamaları
          standart_setli_boyasiz_m2_usd: l1Metre > 0 ? Number(((adetUSD + SetUSD) / l1Metre) || 0) : 0,
          standart_setli_boyasiz_m2_eur: l1Metre > 0 ? Number((((adetUSD + SetUSD) / l1Metre) / eurUsd) || 0) : 0,
          standart_setli_boyasiz_m2_try: l1Metre > 0 ? Number((((adetUSD + SetUSD) / l1Metre) * usdTl) || 0) : 0,
          
          // Standart Setli + Boyasız Kg hesaplamaları
          standart_setli_boyasiz_kg_usd: weightKg > 0 ? Number(((adetUSD + SetUSD) / weightKg) || 0) : 0,
          standart_setli_boyasiz_kg_eur: weightKg > 0 ? Number((((adetUSD + SetUSD) / weightKg) / eurUsd) || 0) : 0,
          standart_setli_boyasiz_kg_try: weightKg > 0 ? Number((((adetUSD + SetUSD) / weightKg) * usdTl) || 0) : 0,
          
          // Standart Setli + Boyalı Adet hesaplamaları
          standart_setli_boyali_adet_usd: Number((boyaliAdetUSD + SetUSD) || 0),
          standart_setli_boyali_adet_eur: Number(((boyaliAdetUSD + SetUSD) / eurUsd) || 0),
          standart_setli_boyali_adet_try: Number(((boyaliAdetUSD + SetUSD) * usdTl) || 0),
          
          // Standart Setli + Boyalı M2 hesaplamaları
          standart_setli_boyali_m2_usd: l1Metre > 0 ? Number(((boyaliAdetUSD + SetUSD) / l1Metre) || 0) : 0,
          standart_setli_boyali_m2_eur: l1Metre > 0 ? Number((((boyaliAdetUSD + SetUSD) / l1Metre) / eurUsd) || 0) : 0,
          standart_setli_boyali_m2_try: l1Metre > 0 ? Number((((boyaliAdetUSD + SetUSD) / l1Metre) * usdTl) || 0) : 0,
          
          // Standart Setli + Boyalı Kg hesaplamaları
          standart_setli_boyali_kg_usd: weightKg > 0 ? Number(((boyaliAdetUSD + SetUSD) / weightKg) || 0) : 0,
          standart_setli_boyali_kg_eur: weightKg > 0 ? Number((((boyaliAdetUSD + SetUSD) / weightKg) / eurUsd) || 0) : 0,
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

//Part 6
  
  // Satış listesi oluşturma fonksiyonu
  const generateSalesList = (maliyetListesi) => {
    const salesList = maliyetListesi.map(item => {
      // Bronz, gümüş ve altın fiyatları hesapla
      const bronzPrice = (item) => {
        switch (salesFilter.unit) {
          case 'adet':
            return {
              usd: item.boyali_adet_usd * (1 + salesMargins.bronze / 100),
              eur: item.boyali_adet_eur * (1 + salesMargins.bronze / 100),
              try: item.boyali_adet_try * (1 + salesMargins.bronze / 100)
            };
          case 'm2':
            return {
              usd: item.boyali_m2_usd * (1 + salesMargins.bronze / 100),
              eur: item.boyali_m2_eur * (1 + salesMargins.bronze / 100),
              try: item.boyali_m2_try * (1 + salesMargins.bronze / 100)
            };
          case 'kg':
            return {
              usd: item.boyali_kg_usd * (1 + salesMargins.bronze / 100),
              eur: item.boyali_kg_eur * (1 + salesMargins.bronze / 100),
              try: item.boyali_kg_try * (1 + salesMargins.bronze / 100)
            };
          default:
            return {
              usd: item.boyali_adet_usd * (1 + salesMargins.bronze / 100),
              eur: item.boyali_adet_eur * (1 + salesMargins.bronze / 100),
              try: item.boyali_adet_try * (1 + salesMargins.bronze / 100)
            };
        }
      };
      
      const silverPrice = (item) => {
        switch (salesFilter.unit) {
          case 'adet':
            return {
              usd: item.boyali_adet_usd * (1 + salesMargins.silver / 100),
              eur: item.boyali_adet_eur * (1 + salesMargins.silver / 100),
              try: item.boyali_adet_try * (1 + salesMargins.silver / 100)
            };
          case 'm2':
            return {
              usd: item.boyali_m2_usd * (1 + salesMargins.silver / 100),
              eur: item.boyali_m2_eur * (1 + salesMargins.silver / 100),
              try: item.boyali_m2_try * (1 + salesMargins.silver / 100)
            };
          case 'kg':
            return {
              usd: item.boyali_kg_usd * (1 + salesMargins.silver / 100),
              eur: item.boyali_kg_eur * (1 + salesMargins.silver / 100),
              try: item.boyali_kg_try * (1 + salesMargins.silver / 100)
            };
          default:
            return {
              usd: item.boyali_adet_usd * (1 + salesMargins.silver / 100),
              eur: item.boyali_adet_eur * (1 + salesMargins.silver / 100),
              try: item.boyali_adet_try * (1 + salesMargins.silver / 100)
            };
        }
      };
      
      const goldPrice = (item) => {
        switch (salesFilter.unit) {
          case 'adet':
            return {
              usd: item.boyali_adet_usd * (1 + salesMargins.gold / 100),
              eur: item.boyali_adet_eur * (1 + salesMargins.gold / 100),
              try: item.boyali_adet_try * (1 + salesMargins.gold / 100)
            };
          case 'm2':
            return {
              usd: item.boyali_m2_usd * (1 + salesMargins.gold / 100),
              eur: item.boyali_m2_eur * (1 + salesMargins.gold / 100),
              try: item.boyali_m2_try * (1 + salesMargins.gold / 100)
            };
          case 'kg':
            return {
              usd: item.boyali_kg_usd * (1 + salesMargins.gold / 100),
              eur: item.boyali_kg_eur * (1 + salesMargins.gold / 100),
              try: item.boyali_kg_try * (1 + salesMargins.gold / 100)
            };
          default:
            return {
              usd: item.boyali_adet_usd * (1 + salesMargins.gold / 100),
              eur: item.boyali_adet_eur * (1 + salesMargins.gold / 100),
              try: item.boyali_adet_try * (1 + salesMargins.gold / 100)
            };
        }
      };
      
      const bronze = bronzPrice(item);
      const silver = silverPrice(item);
      const gold = goldPrice(item);
      
      return {
        ...item,
        bronze_usd: bronze.usd,
        bronze_eur: bronze.eur,
        bronze_try: bronze.try,
        silver_usd: silver.usd,
        silver_eur: silver.eur,
        silver_try: silver.try,
        gold_usd: gold.usd,
        gold_eur: gold.eur,
        gold_try: gold.try
      };
    });
    
    return salesList;
  };

  // Genel değişkenleri güncelleme
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
      alert(`Değişkenler kaydedilirken hata oluştu: ${error.response?.data?.error || error.message}`);
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
      alert(`Değişkenler kaydedilirken hata oluştu: ${error.response?.data?.error || error.message}`);
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
      alert(`Değişkenler kaydedilirken hata oluştu: ${error.response?.data?.error || error.message}`);
    }
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

    // Panel değerlerini hesapla ve güncelle
    const updatedPanel = calculatePanelValues(newPanel);
    
    setOzelPanelList(prev => [...prev, updatedPanel]);
  };

  // Özel panel değerlerini hesaplama
  const calculatePanelValues = (panel) => {
    const updatedPanel = { ...panel };
    
    const panel_yuksekligi = safeParseFloat(updatedPanel.panel_yuksekligi);
    const panel_genisligi = safeParseFloat(updatedPanel.panel_genisligi);
    
    // Adet m2 hesaplama
    updatedPanel.adet_m2 = (panel_yuksekligi * panel_genisligi / 10000);
    
    // Büküm sayısı hesaplama
    if (updatedPanel.panel_tipi === "Single" && panel_yuksekligi >= 100) {
      updatedPanel.bukum_sayisi = Math.round(panel_yuksekligi / 50);
    } else if (updatedPanel.panel_tipi === "Single" && panel_yuksekligi < 100) {
      updatedPanel.bukum_sayisi = Math.floor((panel_yuksekligi / 50) + 1);
    } else {
      updatedPanel.bukum_sayisi = 0;
    }
    
    const bukum_sayisi = safeParseFloat(updatedPanel.bukum_sayisi);
    
    // Dikey çubuk adet hesaplama
    const dikey_goz = safeParseFloat(updatedPanel.dikey_goz_araligi);
    
    if (dikey_goz < 5.5) {
      updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz) + 1;
    } else if (dikey_goz < 6) {
      updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz);
    } else {
      updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz) + 1;
    }
    
    // Yatay çubuk adet hesaplama
    const yatay_goz = safeParseFloat(updatedPanel.yatay_goz_araligi);
    
    if (updatedPanel.panel_tipi === "Double") {
      updatedPanel.yatay_cubuk_adet = (((panel_yuksekligi - 3) / yatay_goz) + 1) * 2;
    } else if (updatedPanel.panel_tipi === "Single" && yatay_goz === 20) {
      updatedPanel.yatay_cubuk_adet = ((((panel_yuksekligi - 3) - (bukum_sayisi * 10)) / yatay_goz) + 1) + (bukum_sayisi * 2);
    } else if (updatedPanel.panel_tipi === "Single" && yatay_goz === 15 && panel_yuksekligi < 200) {
      updatedPanel.yatay_cubuk_adet = Math.round(((panel_yuksekligi / yatay_goz) + (bukum_sayisi * 2)));
    } else if (updatedPanel.panel_tipi === "Single" && yatay_goz === 15 && panel_yuksekligi >= 200) {
      updatedPanel.yatay_cubuk_adet = Math.ceil(((panel_yuksekligi / yatay_goz) + (bukum_sayisi * 2)));
    }
    
    // Ağırlık hesaplama
    const dikey_tel = safeParseFloat(updatedPanel.dikey_tel_capi);
    const yatay_tel = safeParseFloat(updatedPanel.yatay_tel_capi);
    const dikey_cubuk = safeParseFloat(updatedPanel.dikey_cubuk_adet);
    const yatay_cubuk = safeParseFloat(updatedPanel.yatay_cubuk_adet);

    if (updatedPanel.panel_tipi === "Double") {
      // Double panel ağırlık hesaplaması
      updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi / 100) * dikey_cubuk)) + 
                            ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    } else if (updatedPanel.panel_tipi === "Single") {
      if (yatay_goz === 20) {
        // Single panel 20 göz aralığı için ağırlık hesaplaması
        updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                              ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      } else if (yatay_goz === 15) {
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


//Part 7

    
    // Boya kilogram hesaplama
    updatedPanel.boya_kg = calculateBoyaKg(updatedPanel);
    
    // Boyalı Hali 
    updatedPanel.boyali_hali = updatedPanel.agirlik + updatedPanel.boya_kg;
    
    // M² Ağırlık
    updatedPanel.m2_agirlik = updatedPanel.adet_m2 > 0 ? updatedPanel.boyali_hali / updatedPanel.adet_m2 : 0;
    
    // Paletteki panel sayısı
    updatedPanel.paletteki_panel_sayisi = calculatePalettekiPanelSayisi(updatedPanel);
    
    // Palet Boş Ağırlık
    updatedPanel.palet_bos_agirlik = calculatePaletBosAgirlik(updatedPanel);
    
    // Paletsiz Toplam Ağırlık
    updatedPanel.paletsiz_toplam_agirlik = updatedPanel.paletteki_panel_sayisi * updatedPanel.boyali_hali;
    
    // Palet Dolu Ağırlık
    updatedPanel.palet_dolu_agirlik = updatedPanel.paletsiz_toplam_agirlik + updatedPanel.palet_bos_agirlik;
    
    // Boş Palet Yüksekliği
    updatedPanel.bos_palet_yuksekligi = updatedPanel.panel_tipi === "Double" ? 14 : (updatedPanel.panel_tipi === "Single" ? 17 : 0);
    
    // Adet Panel Yüksekliği
    updatedPanel.adet_panel_yuksekligi = calculateAdetPanelYuksekligi(updatedPanel);
    
    // Paletsiz Toplam Panel Yüksekliği
    updatedPanel.paletsiz_toplam_panel_yuksekligi = updatedPanel.adet_panel_yuksekligi * updatedPanel.paletteki_panel_sayisi;
    
    // Paletli Yükseklik
    updatedPanel.paletli_yukseklik = updatedPanel.paletsiz_toplam_panel_yuksekligi + updatedPanel.bos_palet_yuksekligi;
    
    // Icube-Code
    updatedPanel.icube_code = calculateIcubeCode(updatedPanel);
    
    // Icube-Code Adetli
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
    
    // Panel kodu oluştur
    updatedPanel.panel_kodu = calculatePanelKodu(updatedPanel);
    
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
    } else {
      return 0;
    }
  };

  // Palet boş ağırlık hesaplama - lookup tablosunu kullanma
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
    return PALLET_WEIGHTS[panelType][widthStr][closestHeight] || 0;
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

  // Özel panel güncelleme - değişikliklerden sonra tüm bağımlı alanları tekrar hesapla
  const updateOzelPanel = (id, field, value) => {
    setOzelPanelList(prev => prev.map(panel => {
      if (panel.id === id) {
        // Virgülleri noktalara dönüştür
        const formattedValue = typeof value === 'string' ? value.replace(/,/g, '.') : value;
        
        // Değeri güncelle
        const updatedPanel = { ...panel, [field]: formattedValue };
        
        // Bağımlı alanlardan herhangi biri değiştiyse, panel değerlerini yeniden hesapla
        if (['panel_yuksekligi', 'panel_genisligi', 'dikey_goz_araligi', 'yatay_goz_araligi', 
             'dikey_tel_capi', 'yatay_tel_capi', 'panel_tipi', 'bukum_sayisi'].includes(field)) {
          return calculatePanelValues(updatedPanel);
        }
        
        return updatedPanel;
      }
      return panel;
    }));
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
      alert(`Panel kaydedilirken hata oluştu: ${error.response?.data?.error || error.message}`);
    }
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

  // Excel'e aktarma
  const exportToExcel = (listType = 'maliyet') => {
    const dataToExport = listType === 'maliyet' ? maliyetListesi : satisListesi;
    
    if (!dataToExport.length) {
      alert('Dışa aktarılacak veri bulunamadı!');
      return;
    }
    
    // Filtrelere göre sütunları belirle
    const exportData = [...dataToExport];
    
    // Worksheet oluştur
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Workbook oluştur
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, listType === 'maliyet' ? 'Maliyet Listesi' : 'Satış Listesi');
    
    // Excel dosyasını indir
    XLSX.writeFile(workbook, listType === 'maliyet' ? 'Panel_Cit_Maliyet_Listesi.xlsx' : 'Panel_Cit_Satis_Listesi.xlsx');
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


//Part 8

// Bu bileşen, filtered ve sorted panel listesini ve filtre durumunu hesaplar
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
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{typeof panel.adet_m2 === 'number' ? formatDisplayValue(panel.adet_m2) : panel.adet_m2}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{typeof panel.agirlik === 'number' ? formatDisplayValue(panel.agirlik) : panel.agirlik}</td>
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
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">EUR/USD</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.eur_usd || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('eur_usd', e.target.value)}
                    className="border rounded p-2"
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
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Elektrik Fiyatı (kW) (₺)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.elektrik_fiyati_kw_tl || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('elektrik_fiyati_kw_tl', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Doğalgaz Fiyatı (Stn.m³) (₺)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.dogalgaz_fiyati_stn_m3_tl || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('dogalgaz_fiyati_stn_m3_tl', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Amortisman & Diğer ($)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.amortisman_diger_usd || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('amortisman_diger_usd', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">KAR Oranı (Toplama Ek %)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.kar_toplama_ek_percent || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('kar_toplama_ek_percent', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Ort. İşçi Maaşı (₺)</label>
                  <input 
                    type="text" 
                    value={genelDegiskenler.ort_isci_maasi || ''} 
                    onChange={(e) => handleGenelDegiskenlerChange('ort_isci_maasi', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Satış Marjları (Yeni Eklendi) */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-3">
                <TrendingUp size={20} />
              </div>
              <h4 className="font-medium">Satış Marjları</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="text-sm text-gray-500 mb-1">Bronz Marjı (%)</label>
                <input 
                  type="text"
                  value={salesMargins.bronze || 10}
                  onChange={(e) => handleSalesMarginChange('bronze', e.target.value)}
                  className="border rounded p-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-500 mb-1">Gümüş Marjı (%)</label>
                <input 
                  type="text"
                  value={salesMargins.silver || 20}
                  onChange={(e) => handleSalesMarginChange('silver', e.target.value)}
                  className="border rounded p-2"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-500 mb-1">Altın Marjı (%)</label>
                <input 
                  type="text"
                  value={salesMargins.gold || 30}
                  onChange={(e) => handleSalesMarginChange('gold', e.target.value)}
                  className="border rounded p-2"
                />
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


// Part 9

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
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Kesme Elektrik Tüketim (kWh)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_kesme_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_kesme_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Boya Elektrik Tüketim (kWh)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_boya_makinesi_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_boya_makinesi_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Panel Doğalgaz Tüketim (Stn.m³/h)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.panel_dogalgaz_tuketim_stn_m3 || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('panel_dogalgaz_tuketim_stn_m3', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Galvanizli Tel (Ton) ($)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.galvanizli_tel_ton_usd || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('galvanizli_tel_ton_usd', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Hurda (Ton) ($)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.hurda_ton_usd || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('hurda_ton_usd', e.target.value)}
                    className="border rounded p-2"
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
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">DP Boya Tüketim Miktarı (gr/m²)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.dp_boya_tuketim_miktari || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('dp_boya_tuketim_miktari', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">GP Boya Tüketim Miktarı (gr/m²)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.guvenlik_boya_tuketim_miktari_gr || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('guvenlik_boya_tuketim_miktari_gr', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Ort. Panel Ürt. Kapasitesi (m²/Ay)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.uretim_kapasite || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('uretim_kapasite', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Ortalama Saatlik Üretim (m²/h)</label>
                  <input 
                    type="text" 
                    value={panelCitDegiskenler.saatlik_uretim || ''} 
                    onChange={(e) => handlePanelCitDegiskenlerChange('saatlik_uretim', e.target.value)}
                    className="border rounded p-2"
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
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Galvanizsiz Profil (Ton) ($)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.galvanizsiz_profil_kg_usd || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('galvanizsiz_profil_kg_usd', e.target.value)}
                    className="border rounded p-2"
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
                  <label className="text-sm text-gray-500 mb-1">Profil Vardiya</label>
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
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Kesme Makinesi Elektrik Tüketim Miktarı (kWh)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_kesme_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_kesme_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Boya Makinesi Elektrik Tüketim Miktarı (kWh)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_boya_makinesi_elektrik_tuketim_kwh || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_boya_makinesi_elektrik_tuketim_kwh', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
              </div>
            </div>

//Part 10


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
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Boya Tüketim Miktarı (gr/m²)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_boya_tuketim || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_boya_tuketim', e.target.value)}
                    className="border rounded p-2"
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
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil En 2</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_en2 || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_en2', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Profil Et Kalınlığı</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.profil_et_kalinligi || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('profil_et_kalinligi', e.target.value)}
                    className="border rounded p-2"
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
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Vida Fyt (ad) (₺)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.vida_ad_tl || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('vida_ad_tl', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Klips Fyt (ad) (₺)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.klips_ad_tl || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('klips_ad_tl', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Dubel Fyt (ad) (₺)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.dubel_ad_tl || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('dubel_ad_tl', e.target.value)}
                    className="border rounded p-2"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm text-gray-500 mb-1">Kapak Fyt (ad) (₺)</label>
                  <input 
                    type="text" 
                    value={profilDegiskenler.kapak_ad_tl || ''} 
                    onChange={(e) => handleProfilDegiskenlerChange('kapak_ad_tl', e.target.value)}
                    className="border rounded p-2"
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

  // Özel Panel & Palet Bilgileri Hesaplama
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
                    className="w-16 border rounded p-1 text-sm"
                    readOnly
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.dikey_cubuk_adet || ''}
                    className="w-16 border rounded p-1 text-sm"
                    readOnly
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={panel.yatay_cubuk_adet || ''}
                    className="w-16 border rounded p-1 text-sm"
                    readOnly
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={typeof panel.adet_m2 === 'number' ? formatDisplayValue(panel.adet_m2) : panel.adet_m2 || ''}
                    className="w-20 border rounded p-1 text-sm"
                    readOnly
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={typeof panel.agirlik === 'number' ? formatDisplayValue(panel.agirlik) : panel.agirlik || ''}
                    className="w-20 border rounded p-1 text-sm"
                    readOnly
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={typeof panel.boya_kg === 'number' ? formatDisplayValue(panel.boya_kg) : panel.boya_kg || ''}
                    className="w-20 border rounded p-1 text-sm"
                    readOnly
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={typeof panel.boyali_hali === 'number' ? formatDisplayValue(panel.boyali_hali) : panel.boyali_hali || ''}
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
                  Henüz özel panel eklenmemiş. Yeni panel eklemek için yukarıdaki "Yeni Panel Ekle" düğmesini kullanın.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );


// Part 11

// Sonuçlar (Maliyet Listesi) Tablosu
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
              onClick={() => exportToExcel('maliyet')}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              disabled={maliyetListesi.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Excel&apos;e Aktar
            </button>
            
            <button 
              onClick={() => setShowSalesView(true)}
              className="flex items-center px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm"
              disabled={maliyetListesi.length === 0}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Satış Listesi
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
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 whitespace-nowrap">
                ID (Manual Order)
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-10 bg-gray-50 z-10 whitespace-nowrap">
                Panel Kodu
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Panel Tipi
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Panel Yüksekliği
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Panel Genişliği
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Dikey Tel Çapı
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Yatay Tel Çapı
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Dikey Göz Aralığı
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Yatay Göz Aralığı
              </th>
              
              {/* Çıplak Adet */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Çıplak Adet USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Çıplak Adet EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Çıplak Adet TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Çıplak M2 */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Çıplak M2 USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Çıplak M2 EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Çıplak M2 TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Çıplak Kg */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Çıplak Kg USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Çıplak Kg EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Çıplak Kg TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Boyalı Adet */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Boyalı Adet USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Boyalı Adet EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Boyalı Adet TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Boyalı M2 */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Boyalı M2 USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Boyalı M2 EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Boyalı M2 TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Boyalı Kg */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Boyalı Kg USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Boyalı Kg EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Boyalı Kg TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Standart Setli + Boyasız Adet */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyasız Adet USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyasız Adet EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyasız Adet TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Standart Setli + Boyasız M2 */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyasız M2 USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyasız M2 EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyasız M2 TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Standart Setli + Boyasız Kg */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyasız Kg USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyasız Kg EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyasız Kg TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Standart Setli + Boyalı Adet */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı Adet USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı Adet EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı Adet TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Standart Setli + Boyalı M2 */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı M2 USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı M2 EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı M2 TRY
                    </th>
                  )}
                </>
              )}
              
              {/* Standart Setli + Boyalı Kg */}
              {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı Kg USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı Kg EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı Kg TRY
                    </th>
                  )}
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">


// Part 12


{filterMaliyetListesi().map((maliyet, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white">
                  {maliyet.manual_order}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 sticky left-10 bg-white">
                  {maliyet.panel_kodu}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {maliyet.panel_tipi}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {maliyet.panel_yuksekligi}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {maliyet.panel_genisligi}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {maliyet.dikey_tel_capi}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {maliyet.yatay_tel_capi}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {maliyet.dikey_goz_araligi}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {maliyet.yatay_goz_araligi}
                </td>
                
                {/* Çıplak Adet */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.ciplak_adet_usd === 'number' ? formatDisplayValue(maliyet.ciplak_adet_usd) : maliyet.ciplak_adet_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.ciplak_adet_eur === 'number' ? formatDisplayValue(maliyet.ciplak_adet_eur) : maliyet.ciplak_adet_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.ciplak_adet_try === 'number' ? formatDisplayValue(maliyet.ciplak_adet_try) : maliyet.ciplak_adet_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Çıplak M2 */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.ciplak_m2_usd === 'number' ? formatDisplayValue(maliyet.ciplak_m2_usd) : maliyet.ciplak_m2_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.ciplak_m2_eur === 'number' ? formatDisplayValue(maliyet.ciplak_m2_eur) : maliyet.ciplak_m2_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.ciplak_m2_try === 'number' ? formatDisplayValue(maliyet.ciplak_m2_try) : maliyet.ciplak_m2_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Çıplak Kg */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'ciplak') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.ciplak_kg_usd === 'number' ? formatDisplayValue(maliyet.ciplak_kg_usd) : maliyet.ciplak_kg_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.ciplak_kg_eur === 'number' ? formatDisplayValue(maliyet.ciplak_kg_eur) : maliyet.ciplak_kg_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.ciplak_kg_try === 'number' ? formatDisplayValue(maliyet.ciplak_kg_try) : maliyet.ciplak_kg_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Boyalı Adet */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.boyali_adet_usd === 'number' ? formatDisplayValue(maliyet.boyali_adet_usd) : maliyet.boyali_adet_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.boyali_adet_eur === 'number' ? formatDisplayValue(maliyet.boyali_adet_eur) : maliyet.boyali_adet_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.boyali_adet_try === 'number' ? formatDisplayValue(maliyet.boyali_adet_try) : maliyet.boyali_adet_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Boyalı M2 */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.boyali_m2_usd === 'number' ? formatDisplayValue(maliyet.boyali_m2_usd) : maliyet.boyali_m2_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.boyali_m2_eur === 'number' ? formatDisplayValue(maliyet.boyali_m2_eur) : maliyet.boyali_m2_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.boyali_m2_try === 'number' ? formatDisplayValue(maliyet.boyali_m2_try) : maliyet.boyali_m2_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Boyalı Kg */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.boyali_kg_usd === 'number' ? formatDisplayValue(maliyet.boyali_kg_usd) : maliyet.boyali_kg_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.boyali_kg_eur === 'number' ? formatDisplayValue(maliyet.boyali_kg_eur) : maliyet.boyali_kg_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.boyali_kg_try === 'number' ? formatDisplayValue(maliyet.boyali_kg_try) : maliyet.boyali_kg_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Standart Setli + Boyasız Adet */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyasiz_adet_usd === 'number' ? formatDisplayValue(maliyet.standart_setli_boyasiz_adet_usd) : maliyet.standart_setli_boyasiz_adet_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyasiz_adet_eur === 'number' ? formatDisplayValue(maliyet.standart_setli_boyasiz_adet_eur) : maliyet.standart_setli_boyasiz_adet_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyasiz_adet_try === 'number' ? formatDisplayValue(maliyet.standart_setli_boyasiz_adet_try) : maliyet.standart_setli_boyasiz_adet_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Standart Setli + Boyasız M2 */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyasiz_m2_usd === 'number' ? formatDisplayValue(maliyet.standart_setli_boyasiz_m2_usd) : maliyet.standart_setli_boyasiz_m2_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyasiz_m2_eur === 'number' ? formatDisplayValue(maliyet.standart_setli_boyasiz_m2_eur) : maliyet.standart_setli_boyasiz_m2_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyasiz_m2_try === 'number' ? formatDisplayValue(maliyet.standart_setli_boyasiz_m2_try) : maliyet.standart_setli_boyasiz_m2_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Standart Setli + Boyasız Kg */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyasiz') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyasiz_kg_usd === 'number' ? formatDisplayValue(maliyet.standart_setli_boyasiz_kg_usd) : maliyet.standart_setli_boyasiz_kg_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyasiz_kg_eur === 'number' ? formatDisplayValue(maliyet.standart_setli_boyasiz_kg_eur) : maliyet.standart_setli_boyasiz_kg_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyasiz_kg_try === 'number' ? formatDisplayValue(maliyet.standart_setli_boyasiz_kg_try) : maliyet.standart_setli_boyasiz_kg_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Standart Setli + Boyalı Adet */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'adet') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyali_adet_usd === 'number' ? formatDisplayValue(maliyet.standart_setli_boyali_adet_usd) : maliyet.standart_setli_boyali_adet_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyali_adet_eur === 'number' ? formatDisplayValue(maliyet.standart_setli_boyali_adet_eur) : maliyet.standart_setli_boyali_adet_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyali_adet_try === 'number' ? formatDisplayValue(maliyet.standart_setli_boyali_adet_try) : maliyet.standart_setli_boyali_adet_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Standart Setli + Boyalı M2 */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'm2') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyali_m2_usd === 'number' ? formatDisplayValue(maliyet.standart_setli_boyali_m2_usd) : maliyet.standart_setli_boyali_m2_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyali_m2_eur === 'number' ? formatDisplayValue(maliyet.standart_setli_boyali_m2_eur) : maliyet.standart_setli_boyali_m2_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyali_m2_try === 'number' ? formatDisplayValue(maliyet.standart_setli_boyali_m2_try) : maliyet.standart_setli_boyali_m2_try}
                      </td>
                    )}
                  </>
                )}
                
                {/* Standart Setli + Boyalı Kg */}
                {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                  <>
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyali_kg_usd === 'number' ? formatDisplayValue(maliyet.standart_setli_boyali_kg_usd) : maliyet.standart_setli_boyali_kg_usd}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyali_kg_eur === 'number' ? formatDisplayValue(maliyet.standart_setli_boyali_kg_eur) : maliyet.standart_setli_boyali_kg_eur}
                      </td>
                    )}
                    {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {typeof maliyet.standart_setli_boyali_kg_try === 'number' ? formatDisplayValue(maliyet.standart_setli_boyali_kg_try) : maliyet.standart_setli_boyali_kg_try}
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
            
            {filterMaliyetListesi().length === 0 && (
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

  // Satış Listesi Tablosu (Yeni)
  const renderSalesView = () => (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Sparkles className="mr-2 text-amber-500" size={20} />
            Satış Fiyat Listesi
          </h3>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Para Birimi:</span>
              <select
                value={salesFilter.currency}
                onChange={(e) => handleSalesFilterChange('currency', e.target.value)}
                className="border rounded p-1 text-sm"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="TRY">TRY</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Birim:</span>
              <select
                value={salesFilter.unit}
                onChange={(e) => handleSalesFilterChange('unit', e.target.value)}
                className="border rounded p-1 text-sm"
              >
                <option value="adet">Adet</option>
                <option value="m2">m²</option>
                <option value="kg">kg</option>
              </select>
            </div>
            
            <button 
              onClick={() => exportToExcel('satis')}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              disabled={satisListesi.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Excel&apos;e Aktar
            </button>
            
            <button 
              onClick={() => setShowSalesView(false)}
              className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <Calculator className="w-4 h-4 mr-1" />
              Maliyet Listesi
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
            <span className="font-semibold">{satisListesi.length} sonuç</span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 whitespace-nowrap">
                Panel Kodu
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Panel Tipi
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Panel Yüksekliği
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Panel Genişliği
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Dikey Tel Çapı
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Yatay Tel Çapı
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Dikey Göz Aralığı
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Yatay Göz Aralığı
              </th>
              
              {/* Bronz Fiyat */}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium bg-amber-50 text-amber-700 uppercase tracking-wider whitespace-nowrap">
                Bronz Fiyat ({salesFilter.currency})
              </th>
              
              {/* Gümüş Fiyat */}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium bg-gray-100 text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Gümüş Fiyat ({salesFilter.currency})
              </th>
              
              {/* Altın Fiyat */}
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium bg-yellow-50 text-yellow-700 uppercase tracking-wider whitespace-nowrap">
                Altın Fiyat ({salesFilter.currency})
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
//Part 13
{filterMaliyetListesi().map((maliyet, index) => {
  const currentCurrency = salesFilter.currency.toLowerCase();
  const currentUnit = 'adet'; // Varsayilan birim
  const basePrice =
    currentUnit === 'adet'
      ? maliyet[`boyali_adet_${currentCurrency}`]
      : currentUnit === 'm2'
      ? maliyet[`boyali_m2_${currentCurrency}`]
      : maliyet[`boyali_kg_${currentCurrency}`];

  const bronzePrice = basePrice * (1 + salesMargins.bronze / 100);
  const silverPrice = basePrice * (1 + salesMargins.silver / 100);
  const goldPrice = basePrice * (1 + salesMargins.gold / 100);

  return (
    <tr key={index} className="hover:bg-gray-50">
      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
        {maliyet.panel_kodu}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
        {maliyet.panel_tipi}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
        {maliyet.panel_yuksekligi}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
        {maliyet.panel_genisligi}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
        {maliyet.dikey_tel_capi}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
        {maliyet.yatay_tel_capi}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
        {maliyet.dikey_goz_araligi}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
        {maliyet.yatay_goz_araligi}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium bg-amber-50 text-amber-700">
        {formatDisplayValue(bronzePrice)}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium bg-gray-100 text-gray-700">
        {formatDisplayValue(silverPrice)}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium bg-yellow-50 text-yellow-700">
        {formatDisplayValue(goldPrice)}
      </td>
    </tr>
  );
})}

{maliyetListesi.length === 0 && (
  <tr>
    <td colSpan="11" className="px-4 py-4 text-center text-sm text-gray-500">
      Satış fiyat listesi bulunamadı veya hiç hesaplama yapılmadı.
    </td>
  </tr>
)}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Sekme butonlarını render eden fonksiyon
  const renderTabButtons = () => (
    <div className="flex space-x-2">
      <button onClick={() => setActiveTab('main-panel')} className={activeTab === 'main-panel' ? 'bg-blue-500 text-white' : 'bg-gray-200'}>
        Ana Panel Listesi
      </button>
      <button onClick={() => setActiveTab('special-panel')} className={activeTab === 'special-panel' ? 'bg-blue-500 text-white' : 'bg-gray-200'}>
        Özel Panel Girişi
      </button>
      <button onClick={() => setActiveTab('results')} className={activeTab === 'results' ? 'bg-blue-500 text-white' : 'bg-gray-200'}>
        Hesap Sonuçları
      </button>
      <button onClick={() => setActiveTab('temp-calculations')} className={activeTab === 'temp-calculations' ? 'bg-blue-500 text-white' : 'bg-gray-200'}>
        Geçici Hesaplamalar
      </button>
    </div>
  );

  // Sekme içeriklerini gösteren fonksiyon
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'main-panel':
        return renderPanelList();
      case 'special-panel':
        return renderSpecialPanelEntry();
      case 'results':
        return showSalesView ? renderSalesView() : renderResults();
      case 'temp-calculations':
        return renderTempCalculations();
      default:
        return renderPanelList();
    }
  };

  // Geçici hesaplamaların görüntülenmesi
  const renderTempCalculations = () => (
    <div className="p-4 bg-gray-50 rounded shadow">
      <p className="text-gray-700">Geçici hesaplama verileri burada görüntülenecek...</p>
    </div>
  );

  // Yükleme animasyonu
  const renderLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center">
        <RefreshCw className="animate-spin text-red-600 mb-4" size={40} />
        <p className="text-gray-600">Veriler yükleniyor, lütfen bekleyin...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Panel Çit Maliyet Hesaplama</h2>
      {renderTabButtons()}
      {renderDegiskenlerAccordion()}
      {loading ? renderLoading() : renderActiveTabContent()}
    </div>
  );
};

export default PanelCitHesaplama;
