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

// Excel export column headers
const EXCEL_HEADERS = [ 'manual_order','panel_kodu','panel_tipi','panel_yuksekligi','panel_genisligi','dikey_tel_capi','yatay_tel_capi','dikey_goz_araligi','yatay_goz_araligi','ciplak_adet_usd','ciplak_adet_eur','ciplak_adet_try','ciplak_m2_usd','ciplak_m2_eur','ciplak_m2_try','ciplak_kg_usd','ciplak_kg_eur','ciplak_kg_try','boyali_adet_usd','boyali_adet_eur','boyali_adet_try','boyali_m2_usd','boyali_m2_eur','boyali_m2_try','boyali_kg_usd','boyali_kg_eur','boyali_kg_try','standart_setli_boyasiz_adet_usd','standart_setli_boyasiz_adet_eur','standart_setli_boyasiz_adet_try','standart_setli_boyasiz_m2_usd','standart_setli_boyasiz_m2_eur','standart_setli_boyasiz_m2_try','standart_setli_boyasiz_kg_usd','standart_setli_boyasiz_kg_eur','standart_setli_boyasiz_kg_try','standart_setli_boyali_adet_usd','standart_setli_boyali_adet_eur','standart_setli_boyali_adet_try','standart_setli_boyali_m2_usd','standart_setli_boyali_m2_eur','standart_setli_boyali_m2_try','standart_setli_boyali_kg_usd','standart_setli_boyali_kg_eur','standart_setli_boyali_kg_try' ];

// En yakın yükseklik değerini bulma yardımcı fonksiyonu
const getClosestHeight = (height, panelType, widthStr) => {
  // İlgili tablo yoksa
  if (!PALLET_WEIGHTS[panelType] || !PALLET_WEIGHTS[panelType][widthStr]) return null;
  // Mevcut yükseklik değerlerini al
  const heights = Object.keys(PALLET_WEIGHTS[panelType][widthStr]).map(h => parseInt(h));
  // En yakın yükseklik değerini bul
  const closestHeight = heights.reduce((prev, curr) => {
    return (Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev);
  });
  return closestHeight.toString();
};

// Güvenli float değer dönüştürme yardımcı fonksiyonu (boş, null ve virgül değerlerini işler)
const safeParseFloat = (value, defaultValue = 0) => {
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
  const [satisListesi, setSatisListesi] = useState([]);
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
      // Durumları state'e ata
      setGenelDegiskenler(formattedGenelDegiskenler);
      setPanelCitDegiskenler(formattedPanelCitDegiskenler);
      setProfilDegiskenler(formattedProfilDegiskenler);
      setPanelList(panelListRes.data);
      setFilteredPanelList(panelListRes.data);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      alert('Verileri çekerken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sadece belirli bir bölümü yenileme fonksiyonu
  const fetchSectionData = async (section) => {
    try {
      const response = await axios.get(API_URLS[section + 'Degiskenler']);
      let latestRecord;
      if (section === 'panelCit') {
        // Panel Çit değişkenleri listesinde unique_key varsa onu kullan
        latestRecord = response.data.sort((a, b) => {
          if (a.unique_key && b.unique_key) return b.unique_key - a.unique_key;
          return b.id - a.id;
        })[0] || {};
      } else {
        latestRecord = response.data.sort((a, b) => b.id - a.id)[0] || {};
      }
      const formattedRecord = {};
      Object.entries(latestRecord).forEach(([key, value]) => {
        if (typeof value === 'number') {
          formattedRecord[key] = formatDisplayValue(value);
        } else {
          formattedRecord[key] = value;
        }
      });
      if (section === 'genel') setGenelDegiskenler(formattedRecord);
      if (section === 'panelCit') setPanelCitDegiskenler(formattedRecord);
      if (section === 'profil') setProfilDegiskenler(formattedRecord);
    } catch (error) {
      console.error('Veri yenileme hatası:', error);
    }
  };

  // Döviz kurlarını çekme fonksiyonu
  const fetchCurrencyRates = async () => {
    try {
      const res = await axios.get(API_URLS.currencyRates);
      const rates = res.data?.conversion_rates;
      if (rates) {
        setGenelDegiskenler(prev => ({
          ...prev,
          usd_tl: formatDisplayValue(rates.TRY),
          eur_usd: formatDisplayValue(1 / rates.EUR)
        }));
      }
    } catch (error) {
      console.error('Kur bilgisi çekilemedi:', error);
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
    // Aynı sütuna tıklanırsa sıralama yönünü değiştir
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
    let data = [...maliyetListesi];
    // Arama kutusundan panel kodu filtresi
    if (panelSearch && panelSearch.trim() !== '') {
      const searchTerm = panelSearch.toLowerCase();
      data = data.filter(item => {
        const panelKodu = (item.panel_kodu || '').toLowerCase();
        return panelKodu.includes(searchTerm);
      });
    }
    // Kolon filtreleri (panel tipi, yükseklik, genişlik, tel çapları)
    Object.entries(columnFilters).forEach(([col, filterVal]) => {
      if (filterVal && filterVal.trim() !== '') {
        data = data.filter(item => {
          const itemVal = String(item[col] || '').toLowerCase();
          return itemVal.includes(filterVal.toLowerCase());
        });
      }
    });
    return data;
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
      ['panel_boya_isci_sayisi_ad', 'panel_boya_vardiya', 'panel_kaynak_isci_sayisi_ad', 'panel_kaynak_vardiya', 'panel_kesme_isci_sayisi_ad', 'panel_kesme_vardiya', 'panel_kapasite', 'boya_kapasite'].forEach(field => {
        if (!panelCitDegiskenler[field]) {
          emptyFields.push(`Panel Çit Değişkenleri: ${field}`);
        }
      });
      if (emptyFields.length > 0) {
        alert('Hesaplama için eksik değişkenler var:\n' + emptyFields.join('\n'));
        setCalculating(false);
        return;
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
      // saveToDatabaseAsync(geciciHesaplarData, maliyetListesiData); // Hesaplamalar bellek içinde yapılıyor
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
    const panelKapasite = safeParseFloat(panelCitDegiskenler.panel_kapasite);
    const boyaKapasite = safeParseFloat(panelCitDegiskenler.boya_kapasite);
    return {
      usd_tl: usdTl,
      eur_usd: eurUsd,
      panel_kapasite: panelKapasite,
      boya_kapasite: boyaKapasite
    };
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
      icube_code_adetli: '',
      stok_kodu: ''
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
    updatedPanel.stok_kodu = ""; // Stok Kodu Formülü Buraya Gelecek
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
    setOzelPanelList(ozelPanelList.filter(p => p.id !== id));
  };

  // Özel panel güncelleme
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
      [type]: value
    });
    // Satış listesi mevcutsa güncelle
    setSatisListesi(generateSalesList(maliyetListesi));
  };

  // Satış listesi oluşturan fonksiyon
  const generateSalesList = (maliyetData) => {
    // Boyalı birim fiyatlarını kullanarak bronz/gümüş/altın fiyatları hesapla
    return maliyetData.map(maliyet => {
      const basePriceAdetUSD = maliyet.boyali_adet_usd;
      const basePriceAdetEUR = maliyet.boyali_adet_eur;
      const basePriceAdetTRY = maliyet.boyali_adet_try;
      const basePriceM2USD = maliyet.boyali_m2_usd;
      const basePriceM2EUR = maliyet.boyali_m2_eur;
      const basePriceM2TRY = maliyet.boyali_m2_try;
      const basePriceKgUSD = maliyet.boyali_kg_usd;
      const basePriceKgEUR = maliyet.boyali_kg_eur;
      const basePriceKgTRY = maliyet.boyali_kg_try;
      // Mevcut seçimlere göre uygun basePrice seçimi (adet/m2/kg ve currency)
      // Not: Satış ekranında anlık filtreler ile halihazırdaki listeyi görüntülüyoruz,
      // burada tüm para birimlerini hesaplayıp saklıyoruz, ekranda seçilen birim ve kura göre gösterilecek.
      return {
        panel_kodu: maliyet.panel_kodu,
        panel_tipi: maliyet.panel_tipi,
        panel_yuksekligi: maliyet.panel_yuksekligi,
        panel_genisligi: maliyet.panel_genisligi,
        dikey_tel_capi: maliyet.dikey_tel_capi,
        yatay_tel_capi: maliyet.yatay_tel_capi,
        dikey_goz_araligi: maliyet.dikey_goz_araligi,
        yatay_goz_araligi: maliyet.yatay_goz_araligi,
        // Bronz, Gümüş, Altın fiyatları (USD/EUR/TRY) - adet bazında
        bronz_adet_usd: basePriceAdetUSD * (1 + salesMargins.bronze / 100),
        bronz_adet_eur: basePriceAdetEUR * (1 + salesMargins.bronze / 100),
        bronz_adet_try: basePriceAdetTRY * (1 + salesMargins.bronze / 100),
        gumus_adet_usd: basePriceAdetUSD * (1 + salesMargins.silver / 100),
        gumus_adet_eur: basePriceAdetEUR * (1 + salesMargins.silver / 100),
        gumus_adet_try: basePriceAdetTRY * (1 + salesMargins.silver / 100),
        altin_adet_usd: basePriceAdetUSD * (1 + salesMargins.gold / 100),
        altin_adet_eur: basePriceAdetEUR * (1 + salesMargins.gold / 100),
        altin_adet_try: basePriceAdetTRY * (1 + salesMargins.gold / 100),
        // Bronz, Gümüş, Altın fiyatları - m2 bazında
        bronz_m2_usd: basePriceM2USD * (1 + salesMargins.bronze / 100),
        bronz_m2_eur: basePriceM2EUR * (1 + salesMargins.bronze / 100),
        bronz_m2_try: basePriceM2TRY * (1 + salesMargins.bronze / 100),
        gumus_m2_usd: basePriceM2USD * (1 + salesMargins.silver / 100),
        gumus_m2_eur: basePriceM2EUR * (1 + salesMargins.silver / 100),
        gumus_m2_try: basePriceM2TRY * (1 + salesMargins.silver / 100),
        altin_m2_usd: basePriceM2USD * (1 + salesMargins.gold / 100),
        altin_m2_eur: basePriceM2EUR * (1 + salesMargins.gold / 100),
        altin_m2_try: basePriceM2TRY * (1 + salesMargins.gold / 100),
        // Bronz, Gümüş, Altın fiyatları - kg bazında
        bronz_kg_usd: basePriceKgUSD * (1 + salesMargins.bronze / 100),
        bronz_kg_eur: basePriceKgEUR * (1 + salesMargins.bronze / 100),
        bronz_kg_try: basePriceKgTRY * (1 + salesMargins.bronze / 100),
        gumus_kg_usd: basePriceKgUSD * (1 + salesMargins.silver / 100),
        gumus_kg_eur: basePriceKgEUR * (1 + salesMargins.silver / 100),
        gumus_kg_try: basePriceKgTRY * (1 + salesMargins.silver / 100),
        altin_kg_usd: basePriceKgUSD * (1 + salesMargins.gold / 100),
        altin_kg_eur: basePriceKgEUR * (1 + salesMargins.gold / 100),
        altin_kg_try: basePriceKgTRY * (1 + salesMargins.gold / 100)
      };
    });
  };

  // Sekme butonlarını render etme
  const renderTabButtons = () => (
    <div className="flex items-center justify-between">
      <div className="space-x-2">
        <button 
          onClick={() => { setActiveTab('main-panel'); setShowSalesView(false); }}
          className={`px-3 py-1 rounded-md text-sm ${activeTab === 'main-panel' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          Panel Çit Listesi
        </button>
        <button 
          onClick={() => { setActiveTab('special-panel'); setShowSalesView(false); }}
          className={`px-3 py-1 rounded-md text-sm ${activeTab === 'special-panel' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          Özel Panel & Palet Bilgileri
        </button>
        <button 
          onClick={() => { setActiveTab('results'); setShowSalesView(false); }}
          className={`px-3 py-1 rounded-md text-sm ${activeTab === 'results' && !showSalesView ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          Maliyet Hesaplama Sonuçları
        </button>
      </div>
      {activeTab === 'results' && !showSalesView && (
        <button 
          onClick={() => fetchCurrencyRates()}
          className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200"
        >
          <RefreshCw size={16} className="mr-1" />
          Kur Güncelle
        </button>
      )}
    </div>
  );

  // Değişkenler akordiyonunu render etme
  const renderDegiskenlerAccordion = () => (
    <Accordion type="single" collapsible className="w-full mt-4">
      <AccordionItem value="genel">
        <AccordionTrigger className="text-sm font-medium">Genel Değişkenler</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(genelDegiskenler).map(([key, value]) => (
              <div key={key} className="flex flex-col text-sm">
                <label className="font-medium capitalize">{key.replace(/_/g, ' ')}</label>
                <input 
                  type="text" 
                  value={value || ''} 
                  onChange={(e) => handleGenelDegiskenlerChange(key, e.target.value)} 
                  className="border rounded p-1 text-sm mt-1"
                />
              </div>
            ))}
          </div>
          <button 
            onClick={updateGenelDegiskenler}
            className="mt-3 px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
          >
            <Save className="w-4 h-4 mr-1" />
            Değişkenleri Kaydet
          </button>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="panelCit">
        <AccordionTrigger className="text-sm font-medium">Panel Çit Değişkenleri</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(panelCitDegiskenler).map(([key, value]) => (
              <div key={key} className="flex flex-col text-sm">
                <label className="font-medium capitalize">{key.replace(/_/g, ' ')}</label>
                <input 
                  type="text" 
                  value={value || ''} 
                  onChange={(e) => handlePanelCitDegiskenlerChange(key, e.target.value)} 
                  className="border rounded p-1 text-sm mt-1"
                />
              </div>
            ))}
          </div>
          <button 
            onClick={updatePanelCitDegiskenler}
            className="mt-3 px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
          >
            <Save className="w-4 h-4 mr-1" />
            Değişkenleri Kaydet
          </button>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="profil">
        <AccordionTrigger className="text-sm font-medium">Profil Değişkenleri</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(profilDegiskenler).map(([key, value]) => (
              <div key={key} className="flex flex-col text-sm">
                <label className="font-medium capitalize">{key.replace(/_/g, ' ')}</label>
                <input 
                  type="text" 
                  value={value || ''} 
                  onChange={(e) => handleProfilDegiskenlerChange(key, e.target.value)} 
                  className="border rounded p-1 text-sm mt-1"
                />
              </div>
            ))}
          </div>
          <button 
            onClick={updateProfilDegiskenler}
            className="mt-3 px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
          >
            <Save className="w-4 h-4 mr-1" />
            Değişkenleri Kaydet
          </button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  // Panel Çit Listesi (ana liste) görünümünü render etme
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
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 whitespace-nowrap">
                ID (Manual Order)
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-10 bg-gray-50 z-10 whitespace-nowrap">
                Panel Kodu
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Panel Tipi</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.panel_tipi || ''} onChange={(e) => handleColumnFilterChange('panel_tipi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Yükseklik</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.panel_yuksekligi || ''} onChange={(e) => handleColumnFilterChange('panel_yuksekligi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Genişlik</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.panel_genisligi || ''} onChange={(e) => handleColumnFilterChange('panel_genisligi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Dikey Tel Çapı</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.dikey_tel_capi || ''} onChange={(e) => handleColumnFilterChange('dikey_tel_capi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Yatay Tel Çapı</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.yatay_tel_capi || ''} onChange={(e) => handleColumnFilterChange('yatay_tel_capi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Dikey Göz Aralığı
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Yatay Göz Aralığı
              </th>
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
              {(resultFilter.unit === 'all' || resultFilter.unit === 'kg') && (resultFilter.type === 'all' || resultFilter.type === 'setli_boyali') && (
                <>
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'USD') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium bg-amber-50 text-amber-700 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı Kg USD
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'EUR') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium bg-amber-50 text-amber-700 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı Kg EUR
                    </th>
                  )}
                  {(resultFilter.currency === 'all' || resultFilter.currency === 'TRY') && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium bg-amber-50 text-amber-700 uppercase tracking-wider whitespace-nowrap">
                      Standart Setli + Boyalı Kg TRY
                    </th>
                  )}
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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
                {/* Standart Setli + Boyasiz Adet */}
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
                {/* Standart Setli + Boyasiz M2 */}
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
                {/* Standart Setli + Boyasiz Kg */}
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
                  Sonuç bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Özel Panel & Palet Bilgileri Hesaplama tablosu görünümü
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
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Panel Tipi
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Yükseklik
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Genişlik
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Dikey Tel Çapı
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Yatay Tel Çapı
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Dikey Göz Aralığı
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Yatay Göz Aralığı
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Büküm Sayısı
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Dikey Çubuk Adedi
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Yatay Çubuk Adedi
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Adet M²
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Ağırlık
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Boya Kg
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Boyalı Hali
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Panel Kodu
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Paletteki Panel Sayısı
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                Stok Kodu
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
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
                  <input
                    type="text"
                    value={panel.stok_kodu || ''}
                    className="w-32 border rounded p-1 text-sm"
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
              Excel'e Aktar
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
              {/* Standart Setli + Boyasiz Adet */}
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
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium
```jsx
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

// Excel export column headers
const EXCEL_HEADERS = [ 'manual_order','panel_kodu','panel_tipi','panel_yuksekligi','panel_genisligi','dikey_tel_capi','yatay_tel_capi','dikey_goz_araligi','yatay_goz_araligi','ciplak_adet_usd','ciplak_adet_eur','ciplak_adet_try','ciplak_m2_usd','ciplak_m2_eur','ciplak_m2_try','ciplak_kg_usd','ciplak_kg_eur','ciplak_kg_try','boyali_adet_usd','boyali_adet_eur','boyali_adet_try','boyali_m2_usd','boyali_m2_eur','boyali_m2_try','boyali_kg_usd','boyali_kg_eur','boyali_kg_try','standart_setli_boyasiz_adet_usd','standart_setli_boyasiz_adet_eur','standart_setli_boyasiz_adet_try','standart_setli_boyasiz_m2_usd','standart_setli_boyasiz_m2_eur','standart_setli_boyasiz_m2_try','standart_setli_boyasiz_kg_usd','standart_setli_boyasiz_kg_eur','standart_setli_boyasiz_kg_try','standart_setli_boyali_adet_usd','standart_setli_boyali_adet_eur','standart_setli_boyali_adet_try','standart_setli_boyali_m2_usd','standart_setli_boyali_m2_eur','standart_setli_boyali_m2_try','standart_setli_boyali_kg_usd','standart_setli_boyali_kg_eur','standart_setli_boyali_kg_try' ];

// En yakın yükseklik değerini bulma yardımcı fonksiyonu
const getClosestHeight = (height, panelType, widthStr) => {
  if (!PALLET_WEIGHTS[panelType] || !PALLET_WEIGHTS[panelType][widthStr]) return null;
  const heights = Object.keys(PALLET_WEIGHTS[panelType][widthStr]).map(h => parseInt(h));
  const closestHeight = heights.reduce((prev, curr) => (
    Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev
  ));
  return closestHeight.toString();
};

// Güvenli float değer dönüştürme yardımcı fonksiyonu (boş, null ve virgül değerlerini işler)
const safeParseFloat = (value, defaultValue = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Görüntüleme için format yardımcı fonksiyonu (gereksiz ondalık basamakları önler)
const formatDisplayValue = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '';
  const num = parseFloat(value);
  if (Number.isInteger(num)) return num.toString();
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
  const [satisListesi, setSatisListesi] = useState([]);
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
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    fetchInitialData();
  }, []);

  // İlk verileri çekme fonksiyonu
  const fetchInitialData = async () => {
    setLoading(true);
    try {
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
      const latestGenelDegisken = genelRes.data.sort((a, b) => b.id - a.id)[0] || {};
      const latestPanelCitDegisken = panelCitRes.data.sort((a, b) => {
        if (a.unique_key && b.unique_key) return b.unique_key - a.unique_key;
        return b.id - a.id;
      })[0] || {};
      const latestProfilDegisken = profilRes.data.sort((a, b) => b.id - a.id)[0] || {};
      const formattedGenelDegiskenler = {};
      Object.entries(latestGenelDegisken).forEach(([key, value]) => {
        formattedGenelDegiskenler[key] = (typeof value === 'number') ? formatDisplayValue(value) : value;
      });
      const formattedPanelCitDegiskenler = {};
      Object.entries(latestPanelCitDegisken).forEach(([key, value]) => {
        formattedPanelCitDegiskenler[key] = (typeof value === 'number') ? formatDisplayValue(value) : value;
      });
      const formattedProfilDegiskenler = {};
      Object.entries(latestProfilDegisken).forEach(([key, value]) => {
        formattedProfilDegiskenler[key] = (typeof value === 'number') ? formatDisplayValue(value) : value;
      });
      setGenelDegiskenler(formattedGenelDegiskenler);
      setPanelCitDegiskenler(formattedPanelCitDegiskenler);
      setProfilDegiskenler(formattedProfilDegiskenler);
      setPanelList(panelListRes.data);
      setFilteredPanelList(panelListRes.data);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      alert('Verileri çekerken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Belirli bir değişken grubunu yenileme
  const fetchSectionData = async (section) => {
    try {
      const response = await axios.get(API_URLS[section + 'Degiskenler']);
      let latestRecord;
      if (section === 'panelCit') {
        latestRecord = response.data.sort((a, b) => {
          if (a.unique_key && b.unique_key) return b.unique_key - a.unique_key;
          return b.id - a.id;
        })[0] || {};
      } else {
        latestRecord = response.data.sort((a, b) => b.id - a.id)[0] || {};
      }
      const formattedRecord = {};
      Object.entries(latestRecord).forEach(([key, value]) => {
        formattedRecord[key] = (typeof value === 'number') ? formatDisplayValue(value) : value;
      });
      if (section === 'genel') setGenelDegiskenler(formattedRecord);
      if (section === 'panelCit') setPanelCitDegiskenler(formattedRecord);
      if (section === 'profil') setProfilDegiskenler(formattedRecord);
    } catch (error) {
      console.error('Veri yenileme hatası:', error);
    }
  };

  // Döviz kurlarını güncelleme
  const fetchCurrencyRates = async () => {
    try {
      const res = await axios.get(API_URLS.currencyRates);
      const rates = res.data?.conversion_rates;
      if (rates) {
        setGenelDegiskenler(prev => ({
          ...prev,
          usd_tl: formatDisplayValue(rates.TRY),
          eur_usd: formatDisplayValue(1 / rates.EUR)
        }));
      }
    } catch (error) {
      console.error('Kur bilgisi çekilemedi:', error);
    }
  };

  // Panel listesi filtreleme
  const filterPanelList = () => {
    let filtered = [...panelList];
    if (selectedPanelType !== 'all') {
      filtered = filtered.filter(panel => {
        const panelKodu = (panel.panel_kodu || '').toUpperCase();
        return panelKodu.startsWith(selectedPanelType.toUpperCase());
      });
    }
    if (panelSearch && panelSearch.trim() !== '') {
      const searchTerms = panelSearch.toLowerCase().split(' ');
      filtered = filtered.filter(panel => {
        const panelKodu = (panel.panel_kodu || '').toLowerCase();
        const panelYukseklik = String(panel.panel_yuksekligi || '');
        const panelGenislik = String(panel.panel_genisligi || '');
        return searchTerms.every(term => 
          panelKodu.includes(term) || 
          panelYukseklik.includes(term) || 
          panelGenislik.includes(term)
        );
      });
    }
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

  // Sütun filtresi değişikliği
  const handleColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Panel listesi sıralama
  const sortPanelList = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    const sortedList = [...filteredPanelList].sort((a, b) => {
      if (a[key] === undefined || a[key] === null) return 1;
      if (b[key] === undefined || b[key] === null) return -1;
      if (typeof a[key] === 'number' && typeof b[key] === 'number') {
        return direction === 'ascending' ? a[key] - b[key] : b[key] - a[key];
      }
      const aStr = String(a[key]).toLowerCase();
      const bStr = String(b[key]).toLowerCase();
      if (aStr < bStr) return direction === 'ascending' ? -1 : 1;
      if (aStr > bStr) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
    setFilteredPanelList(sortedList);
  };

  useEffect(() => {
    filterPanelList();
  }, [panelSearch, selectedPanelType, columnFilters, panelList]);

  // Maliyet listesi filtreleme
  const filterMaliyetListesi = () => {
    let data = [...maliyetListesi];
    if (panelSearch && panelSearch.trim() !== '') {
      const searchTerm = panelSearch.toLowerCase();
      data = data.filter(item => (item.panel_kodu || '').toLowerCase().includes(searchTerm));
    }
    Object.entries(columnFilters).forEach(([col, filterVal]) => {
      if (filterVal && filterVal.trim() !== '') {
        data = data.filter(item => {
          const itemVal = String(item[col] || '').toLowerCase();
          return itemVal.includes(filterVal.toLowerCase());
        });
      }
    });
    return data;
  };

  // Panel kodu oluşturma
  const calculatePanelKodu = (panel) => {
    if (!panel || !panel.panel_tipi) return '';
    const prefix = panel.panel_tipi === 'Single' ? 'SP' : (panel.panel_tipi === 'Guvenlik' ? 'GP' : 'DP');
    const capStr = `${panel.dikey_tel_capi || 0} * ${panel.yatay_tel_capi || 0}`;
    const ebatStr = `${panel.panel_yuksekligi || 0} * ${panel.panel_genisligi || 0}`;
    const gozStr = `${panel.yatay_goz_araligi || 0} * ${panel.dikey_goz_araligi || 0}`;
    const bukumStr = `${panel.bukum_sayisi || 0}-1`;
    return `${prefix}_Cap:${capStr}_Eb:${ebatStr}_Gz:${gozStr}_Buk:${bukumStr}_Rnk:"Kplmsz"`;
  };

  // Maliyet hesaplama
  const calculateCosts = async (isPanelList = true) => {
    setCalculating(true);
    setShowResults(false);
    setShowSalesView(false);
    try {
      const panelsToCalculate = isPanelList ? filteredPanelList : ozelPanelList;
      if (panelsToCalculate.length === 0) {
        alert('Hesaplanacak panel bulunamadı. Lütfen panel listesinde filtrelerinizi kontrol edin veya özel paneller ekleyin.');
        setCalculating(false);
        return;
      }
      const emptyFields = [];
      ['boya_fiyati_kg_eur', 'elektrik_fiyati_kw_tl', 'dogalgaz_fiyati_stn_m3_tl', 'amortisman_diger_usd', 'ort_isci_maasi', 'usd_tl', 'eur_usd'].forEach(field => {
        if (!genelDegiskenler[field]) emptyFields.push(`Genel Değişkenler: ${field}`);
      });
      ['panel_boya_isci_sayisi_ad', 'panel_boya_vardiya', 'panel_kaynak_isci_sayisi_ad', 'panel_kaynak_vardiya', 'panel_kesme_isci_sayisi_ad', 'panel_kesme_vardiya', 'panel_kapasite', 'boya_kapasite'].forEach(field => {
        if (!panelCitDegiskenler[field]) emptyFields.push(`Panel Çit Değişkenleri: ${field}`);
      });
      if (emptyFields.length > 0) {
        alert('Hesaplama için eksik değişkenler var:\n' + emptyFields.join('\n'));
        setCalculating(false);
        return;
      }
      const geciciHesaplarData = [];
      const maliyetListesiData = [];
      const results = performClientSideCalculations(panelsToCalculate);
      geciciHesaplarData.push(...results.geciciHesaplar);
      maliyetListesiData.push(...results.maliyetListesi);
      const satisListesiData = generateSalesList(maliyetListesiData);
      setGeciciHesaplar(geciciHesaplarData);
      setMaliyetListesi(maliyetListesiData);
      setSatisListesi(satisListesiData);
      // saveToDatabaseAsync(geciciHesaplarData, maliyetListesiData); // Hesaplamalar bellek içinde yapılıyor
      setShowResults(true);
      setActiveTab('results');
    } catch (error) {
      console.error('Hesaplama hatası:', error);
      alert('Hesaplama sırasında hata oluştu: ' + error.message);
    } finally {
      setCalculating(false);
    }
  };

  // Veritabanına asenkron kaydetme
  const saveToDatabaseAsync = async (geciciHesaplarData, maliyetListesiData) => {
    try {
      await axios.delete(`${API_URLS.geciciHesaplar}/all`);
      await axios.delete(`${API_URLS.maliyetListesi}/all`);
      const staticVars = calculateStaticVars();
      await axios.post(API_URLS.statikDegiskenler, staticVars);
      for (const hesap of geciciHesaplarData) {
        await axios.post(API_URLS.geciciHesaplar, hesap);
      }
      for (const maliyet of maliyetListesiData) {
        await axios.post(API_URLS.maliyetListesi, maliyet);
      }
    } catch (error) {
      console.error('Veritabanına kaydetme hatası:', error);
    }
  };

  // Statik değişkenleri hesapla
  const calculateStaticVars = () => {
    const usdTl = safeParseFloat(genelDegiskenler.usd_tl, 1);
    const eurUsd = safeParseFloat(genelDegiskenler.eur_usd, 1);
    const panelKapasite = safeParseFloat(panelCitDegiskenler.panel_kapasite);
    const boyaKapasite = safeParseFloat(panelCitDegiskenler.boya_kapasite);
    return { usd_tl: usdTl, eur_usd: eurUsd, panel_kapasite: panelKapasite, boya_kapasite: boyaKapasite };
  };

  // Özel panel ekleme 
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
    const updatedPanel = calculatePanelValues(newPanel);
    setOzelPanelList(prev => [...prev, updatedPanel]);
  };

  // Özel panel değerlerini hesaplama
  const calculatePanelValues = (panel) => {
    const updatedPanel = { ...panel };
    const panel_yuksekligi = safeParseFloat(updatedPanel.panel_yuksekligi);
    const panel_genisligi = safeParseFloat(updatedPanel.panel_genisligi);
    updatedPanel.adet_m2 = (panel_yuksekligi * panel_genisligi / 10000);
    if (updatedPanel.panel_tipi === "Single" && panel_yuksekligi >= 100) {
      updatedPanel.bukum_sayisi = Math.round(panel_yuksekligi / 50);
    } else if (updatedPanel.panel_tipi === "Single" && panel_yuksekligi < 100) {
      updatedPanel.bukum_sayisi = Math.floor((panel_yuksekligi / 50) + 1);
    } else {
      updatedPanel.bukum_sayisi = 0;
    }
    const bukum_sayisi = safeParseFloat(updatedPanel.bukum_sayisi);
    const dikey_goz = safeParseFloat(updatedPanel.dikey_goz_araligi);
    if (dikey_goz < 5.5) {
      updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz) + 1;
    } else if (dikey_goz < 6) {
      updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz);
    } else {
      updatedPanel.dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz) + 1;
    }
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
    const dikey_tel = safeParseFloat(updatedPanel.dikey_tel_capi);
    const yatay_tel = safeParseFloat(updatedPanel.yatay_tel_capi);
    const dikey_cubuk = safeParseFloat(updatedPanel.dikey_cubuk_adet);
    const yatay_cubuk = safeParseFloat(updatedPanel.yatay_cubuk_adet);
    if (updatedPanel.panel_tipi === "Double") {
      updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi / 100) * dikey_cubuk)) + 
                              ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    } else if (updatedPanel.panel_tipi === "Single") {
      if (yatay_goz === 20) {
        updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                                ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      } else if (yatay_goz === 15) {
        updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.6)) / 100) * dikey_cubuk) + 
                                ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      } else {
        updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                                ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
      }
    } else if (updatedPanel.panel_tipi === "Guvenlik") {
      updatedPanel.agirlik = ((dikey_tel * dikey_tel * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk) + 
                            ((yatay_tel * yatay_tel * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk);
    }
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
    updatedPanel.panel_kodu = calculatePanelKodu(updatedPanel);
    updatedPanel.stok_kodu = ""; // Stok Kodu Formülü Buraya Gelecek
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
      return yatayTelCapi >= 7 ? 25 : 30;
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
    const widthStr = width === 250 ? '250' : (width === 200 ? '200' : null);
    if (!widthStr) return 0;
    const closestHeight = getClosestHeight(height, panelType, widthStr);
    if (!closestHeight) return 0;
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
    setOzelPanelList(ozelPanelList.filter(p => p.id !== id));
  };

  // Özel panel güncelleme
  const updateOzelPanel = (id, field, value) => {
    setOzelPanelList(prev => prev.map(panel => {
      if (panel.id === id) {
        const formattedValue = typeof value === 'string' ? value.replace(/,/g, '.') : value;
        const updatedPanel = { ...panel, [field]: formattedValue };
        if (['panel_yuksekligi', 'panel_genisligi', 'dikey_goz_araligi', 'yatay_goz_araligi', 'dikey_tel_capi', 'yatay_tel_capi', 'panel_tipi', 'bukum_sayisi'].includes(field)) {
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
      const { isNew, id, icube_code, icube_code_adetli, boya_kg, boyali_hali, m2_agirlik, 
              paletteki_panel_sayisi, palet_bos_agirlik, paletsiz_toplam_agirlik, 
              palet_dolu_agirlik, bos_palet_yuksekligi, adet_panel_yuksekligi, 
              paletsiz_toplam_panel_yuksekligi, paletli_yukseklik, ...panelData } = panel;
      const response = await axios.post(API_URLS.panelList, {
        ...panelData,
        kayit_tarihi: new Date().toISOString()
      });
      if (response.status === 200 || response.status === 201) {
        alert(`${panel.panel_kodu} kodlu panel başarıyla kaydedildi.`);
        fetchSectionData('panelList');
        setOzelPanelList(ozelPanelList.filter(p => p.id !== panel.id));
      }
    } catch (error) {
      console.error('Panel kaydetme hatası:', error);
      alert(`Panel kaydedilirken hata oluştu: ${error.response?.data?.error || error.message}`);
    }
  };

  // Sonuç filtresini güncelleme
  const handleResultFilterChange = (type, value) => {
    setResultFilter({ ...resultFilter, [type]: value });
  };

  // Satış filtresi güncelleme
  const handleSalesFilterChange = (type, value) => {
    setSalesFilter({ ...salesFilter, [type]: value });
    setSatisListesi(generateSalesList(maliyetListesi));
  };

  // Satış marjlarını güncelleme
  const handleSalesMarginChange = (type, value) => {
    setSalesMargins({ ...salesMargins, [type]: value });
    setSatisListesi(generateSalesList(maliyetListesi));
  };

  // Satış listesi oluşturma
  const generateSalesList = (maliyetData) => {
    return maliyetData.map(maliyet => {
      const baseUSD = maliyet.boyali_adet_usd;
      const baseEUR = maliyet.boyali_adet_eur;
      const baseTRY = maliyet.boyali_adet_try;
      const baseM2USD = maliyet.boyali_m2_usd;
      const baseM2EUR = maliyet.boyali_m2_eur;
      const baseM2TRY = maliyet.boyali_m2_try;
      const baseKgUSD = maliyet.boyali_kg_usd;
      const baseKgEUR = maliyet.boyali_kg_eur;
      const baseKgTRY = maliyet.boyali_kg_try;
      return {
        panel_kodu: maliyet.panel_kodu,
        panel_tipi: maliyet.panel_tipi,
        panel_yuksekligi: maliyet.panel_yuksekligi,
        panel_genisligi: maliyet.panel_genisligi,
        dikey_tel_capi: maliyet.dikey_tel_capi,
        yatay_tel_capi: maliyet.yatay_tel_capi,
        dikey_goz_araligi: maliyet.dikey_goz_araligi,
        yatay_goz_araligi: maliyet.yatay_goz_araligi,
        bronz_adet_usd: baseUSD * (1 + salesMargins.bronze / 100),
        bronz_adet_eur: baseEUR * (1 + salesMargins.bronze / 100),
        bronz_adet_try: baseTRY * (1 + salesMargins.bronze / 100),
        gumus_adet_usd: baseUSD * (1 + salesMargins.silver / 100),
        gumus_adet_eur: baseEUR * (1 + salesMargins.silver / 100),
        gumus_adet_try: baseTRY * (1 + salesMargins.silver / 100),
        altin_adet_usd: baseUSD * (1 + salesMargins.gold / 100),
        altin_adet_eur: baseEUR * (1 + salesMargins.gold / 100),
        altin_adet_try: baseTRY * (1 + salesMargins.gold / 100),
        bronz_m2_usd: baseM2USD * (1 + salesMargins.bronze / 100),
        bronz_m2_eur: baseM2EUR * (1 + salesMargins.bronze / 100),
        bronz_m2_try: baseM2TRY * (1 + salesMargins.bronze / 100),
        gumus_m2_usd: baseM2USD * (1 + salesMargins.silver / 100),
        gumus_m2_eur: baseM2EUR * (1 + salesMargins.silver / 100),
        gumus_m2_try: baseM2TRY * (1 + salesMargins.silver / 100),
        altin_m2_usd: baseM2USD * (1 + salesMargins.gold / 100),
        altin_m2_eur: baseM2EUR * (1 + salesMargins.gold / 100),
        altin_m2_try: baseM2TRY * (1 + salesMargins.gold / 100),
        bronz_kg_usd: baseKgUSD * (1 + salesMargins.bronze / 100),
        bronz_kg_eur: baseKgEUR * (1 + salesMargins.bronze / 100),
        bronz_kg_try: baseKgTRY * (1 + salesMargins.bronze / 100),
        gumus_kg_usd: baseKgUSD * (1 + salesMargins.silver / 100),
        gumus_kg_eur: baseKgEUR * (1 + salesMargins.silver / 100),
        gumus_kg_try: baseKgTRY * (1 + salesMargins.silver / 100),
        altin_kg_usd: baseKgUSD * (1 + salesMargins.gold / 100),
        altin_kg_eur: baseKgEUR * (1 + salesMargins.gold / 100),
        altin_kg_try: baseKgTRY * (1 + salesMargins.gold / 100)
      };
    });
  };

  // Sekme butonları
  const renderTabButtons = () => (
    <div className="flex items-center justify-between">
      <div className="space-x-2">
        <button 
          onClick={() => { setActiveTab('main-panel'); setShowSalesView(false); }}
          className={`px-3 py-1 rounded-md text-sm ${activeTab === 'main-panel' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          Panel Çit Listesi
        </button>
        <button 
          onClick={() => { setActiveTab('special-panel'); setShowSalesView(false); }}
          className={`px-3 py-1 rounded-md text-sm ${activeTab === 'special-panel' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          Özel Panel & Palet Bilgileri
        </button>
        <button 
          onClick={() => { setActiveTab('results'); setShowSalesView(false); }}
          className={`px-3 py-1 rounded-md text-sm ${activeTab === 'results' && !showSalesView ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          Maliyet Hesaplama Sonuçları
        </button>
      </div>
      {activeTab === 'results' && !showSalesView && (
        <button 
          onClick={fetchCurrencyRates}
          className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs hover:bg-blue-200"
        >
          <RefreshCw size={16} className="mr-1" />
          Kur Güncelle
        </button>
      )}
    </div>
  );

  // Değişkenler akordiyonu
  const renderDegiskenlerAccordion = () => (
    <Accordion type="single" collapsible className="w-full mt-4">
      {/* Genel Değişkenler */}
      <AccordionItem value="genel">
        <AccordionTrigger className="text-sm font-medium">Genel Değişkenler</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(genelDegiskenler).map(([key, value]) => (
              <div key={key} className="flex flex-col text-sm">
                <label className="font-medium capitalize">{key.replace(/_/g, ' ')}</label>
                <input 
                  type="text" 
                  value={value || ''} 
                  onChange={(e) => handleGenelDegiskenlerChange(key, e.target.value)} 
                  className="border rounded p-1 text-sm mt-1"
                />
              </div>
            ))}
          </div>
          <button 
            onClick={updateGenelDegiskenler}
            className="mt-3 px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
          >
            <Save className="w-4 h-4 mr-1" />
            Değişkenleri Kaydet
          </button>
        </AccordionContent>
      </AccordionItem>
      {/* Panel Çit Değişkenleri */}
      <AccordionItem value="panelCit">
        <AccordionTrigger className="text-sm font-medium">Panel Çit Değişkenleri</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(panelCitDegiskenler).map(([key, value]) => (
              <div key={key} className="flex flex-col text-sm">
                <label className="font-medium capitalize">{key.replace(/_/g, ' ')}</label>
                <input 
                  type="text" 
                  value={value || ''} 
                  onChange={(e) => handlePanelCitDegiskenlerChange(key, e.target.value)} 
                  className="border rounded p-1 text-sm mt-1"
                />
              </div>
            ))}
          </div>
          <button 
            onClick={updatePanelCitDegiskenler}
            className="mt-3 px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
          >
            <Save className="w-4 h-4 mr-1" />
            Değişkenleri Kaydet
          </button>
        </AccordionContent>
      </AccordionItem>
      {/* Profil Değişkenleri */}
      <AccordionItem value="profil">
        <AccordionTrigger className="text-sm font-medium">Profil Değişkenleri</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(profilDegiskenler).map(([key, value]) => (
              <div key={key} className="flex flex-col text-sm">
                <label className="font-medium capitalize">{key.replace(/_/g, ' ')}</label>
                <input 
                  type="text" 
                  value={value || ''} 
                  onChange={(e) => handleProfilDegiskenlerChange(key, e.target.value)} 
                  className="border rounded p-1 text-sm mt-1"
                />
              </div>
            ))}
          </div>
          <button 
            onClick={updateProfilDegiskenler}
            className="mt-3 px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
          >
            <Save className="w-4 h-4 mr-1" />
            Değişkenleri Kaydet
          </button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  // Panel Çit Listesi görünümü
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
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 whitespace-nowrap">
                ID (Manual Order)
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-10 bg-gray-50 z-10 whitespace-nowrap">
                Panel Kodu
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Panel Tipi</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.panel_tipi || ''} onChange={(e) => handleColumnFilterChange('panel_tipi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Yükseklik</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.panel_yuksekligi || ''} onChange={(e) => handleColumnFilterChange('panel_yuksekligi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Genişlik</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.panel_genisligi || ''} onChange={(e) => handleColumnFilterChange('panel_genisligi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Dikey Tel Çapı</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.dikey_tel_capi || ''} onChange={(e) => handleColumnFilterChange('dikey_tel_capi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <div className="flex flex-col">
                  <div className="flex items-center">Yatay Tel Çapı</div>
                  <input type="text" placeholder="Filtrele..." value={columnFilters.yatay_tel_capi || ''} onChange={(e) => handleColumnFilterChange('yatay_tel_capi', e.target.value)} className="mt-1 px-1 py-0.5 border border-gray-300 rounded text-xs w-full" onClick={(e) => e.stopPropagation()} />
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Dikey Göz Aralığı
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Yatay Göz Aralığı
              </th>
              {/* ... (Diğer tüm kolon başlıkları buraya gelir, aynı filtreleme mantığı ile) */}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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
                {/* ... (Diğer tüm kolon hücreleri buraya gelir, formatDisplayValue ile formatlanmış) */}
              </tr>
            ))}
            {filterMaliyetListesi().length === 0 && (
              <tr>
                <td colSpan="100%" className="px-4 py-4 text-center text-sm text-gray-500">
                  Sonuç bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Özel Panel & Palet Bilgileri Hesaplama görünümü
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
                Stok Kodu
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
                  <input
                    type="text"
                    value={panel.stok_kodu || ''}
                    className="w-32 border rounded p-1 text-sm"
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

  // Maliyet Hesaplama Sonuçları görünümü
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
              Excel'e Aktar
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
              {/* ... (Diğer kolon başlıkları benzeri şekilde) */}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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
                {/* ... (Diğer kolon hücreleri benzeri şekilde) */}
              </tr>
            ))}
            {filterMaliyetListesi().length === 0 && (
              <tr>
                <td colSpan="100%" className="px-4 py-4 text-center text-sm text-gray-500">
                  Sonuç bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Satış Fiyat Listesi görünümü
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
              Excel'e Aktar
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
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium bg-amber-50 text-amber-700 uppercase tracking-wider whitespace-nowrap">
                Bronz Fiyat ({salesFilter.currency})
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium bg-gray-100 text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Gümüş Fiyat ({salesFilter.currency})
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium bg-yellow-50 text-yellow-700 uppercase tracking-wider whitespace-nowrap">
                Altın Fiyat ({salesFilter.currency})
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filterMaliyetListesi().map((maliyet, index) => {
              const currentCurrency = salesFilter.currency.toLowerCase();
              const currentUnit = salesFilter.unit;
              const basePrice = currentUnit === 'adet' 
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
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium bg-amber-50">
                    {formatDisplayValue(bronzePrice)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium bg-gray-100">
                    {formatDisplayValue(silverPrice)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium bg-yellow-50">
                    {formatDisplayValue(goldPrice)}
                  </td>
                </tr>
              );
            })}
            {filterMaliyetListesi().length === 0 && (
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

  // Aktif sekme içeriği
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

  // Yükleniyor göstergesi
  const renderLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center">
        <RefreshCw className="animate-spin text-red-600 mb-4" size={40} />
        <p className="text-gray-600">Veriler yükleniyor, lütfen bekleyin...</p>
      </div>
    </div>
  );

  // Ana bileşen return
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
