// ProfilHesaplama.jsx
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Calculator,
  FileSpreadsheet,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle,
  DollarSign,
  Euro,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
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

// Güvenli float değer dönüştürme yardımcı fonksiyonu
const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  
  // Hem virgül hem nokta ondalık ayırıcı olarak kabul edilir
  if (typeof value === 'string') {
    value = value.replace(/\s/g, '').replace(',', '.');
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Güvenli float değer dönüştürme yardımcı fonksiyonu
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

// Input değişikliği için tutarlı işleme
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

// Tablo hücresi için değer formatlaması
const formatTableValue = (value, columnType) => {
  if (value === null || value === undefined) return '';
  
  if (value === '' && value !== 0) return '';

  const num = parseFloat(value);
  if (isNaN(num) && value !== '0') return value;

  if (num === 0) return '0';

  switch (columnType) {
    case 'price':
      return num.toFixed(5);
    case 'weight':
      return num.toFixed(5); // Always show 5 decimal places for weight
    case 'decimal':
      return num.toString().replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    default:
      return Number.isInteger(num) ? num.toString() : num.toString().replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
};

// Ana ProfilHesaplama bileşeni
const ProfilHesaplama = ({ 
  genelDegiskenler, 
  profilDegiskenler, 
  fetchGenelDegiskenler,
  fetchProfilDegiskenler,
  hidePrices = false
}) => {
  // State tanımlamaları
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [profilList, setProfilList] = useState([]);
  const [sonuclar, setSonuclar] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [resultFilter, setResultFilter] = useState({
    currency: 'all',
    option: 'galvanizli' // 'galvanizli' veya 'galvanizsiz'
  });
  const [showAccessories, setShowAccessories] = useState(false); // Toggle for accessory columns

  // Sayfa yüklendiğinde verileri kontrol et
  useEffect(() => {
    // Eğer gerekli değişkenler eksikse, yeniden çek
    if (!genelDegiskenler || Object.keys(genelDegiskenler).length === 0) {
      fetchGenelDegiskenler();
    }
    if (!profilDegiskenler || Object.keys(profilDegiskenler).length === 0) {
      fetchProfilDegiskenler();
    }
    
    // Başlangıçta bir profil ekle
    if (profilList.length === 0) {
      addProfil();
    }
  }, []);

  // Yeni profil ekleme
  const addProfil = () => {
    const newProfil = {
      id: Date.now(),
      yukseklik: 200, // cm
      galvanizli: false, // Default changed to false (Hayır)
      flansli: true,
      adet: 1,
      vida_adet: 3,
      klips_adet: 3,
      dubel_adet: 4,
      kapak_adet: 1
    };

    setProfilList(prev => [...prev, newProfil]);
  };

  // Profil silme
  const removeProfil = (id) => {
    setProfilList(prev => prev.filter(profil => profil.id !== id));
  };

  // Profil güncelleme
  const updateProfil = (id, field, value) => {
    setProfilList(prev => prev.map(profil => {
      if (profil.id === id) {
        // Virgülleri noktalara dönüştür
        const formattedValue = typeof value === 'string' ? 
          value.replace(',', '.') : 
          value;
        
        // Boolean değerler için doğru parse
        const parsedValue = field === 'galvanizli' || field === 'flansli' ? 
          (formattedValue === 'true' || formattedValue === true) : 
          formattedValue;
        
        return { ...profil, [field]: parsedValue };
      }
      return profil;
    }));
  };

  // Maliyet hesaplama
  const calculateCosts = () => {
    setCalculating(true);
    setShowResults(false);

    try {
      // Boş alanları kontrol et
      const emptyFields = [];

      // Genel Değişkenler kontrolü
      ['boya_fiyati_kg_eur', 'elektrik_fiyati_kw_tl', 'dogalgaz_fiyati_stn_m3_tl', 'amortisman_diger_usd', 'ort_isci_maasi', 'usd_tl', 'eur_usd'].forEach(field => {
        if (!genelDegiskenler[field]) {
          emptyFields.push(`Genel Değişkenler: ${field}`);
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

      // Client-side hesaplamalar
      const sonuclarData = performClientSideCalculations(profilList);
      setSonuclar(sonuclarData);
      setShowResults(true);
    } catch (error) {
      console.error('Hesaplama hatası:', error);
      alert('Hesaplama sırasında hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setCalculating(false);
    }
  };

  // Client-side hesaplamalar
  const performClientSideCalculations = (profilListesi) => {
    // Döviz kurları
    const usdTl = safeParseFloat(genelDegiskenler.usd_tl, 1);
    const eurUsd = safeParseFloat(genelDegiskenler.eur_usd, 1);

    // Genel değerler
    const boyaFiyatiUSD = safeParseFloat(genelDegiskenler.boya_fiyati_kg_eur) / eurUsd;
    const elektrikFiyatiUSD = safeParseFloat(genelDegiskenler.elektrik_fiyati_kw_tl) / usdTl;
    const dogalgazFiyatiUSD = safeParseFloat(genelDegiskenler.dogalgaz_fiyati_stn_m3_tl) / usdTl;
    const amortismanUSD = safeParseFloat(genelDegiskenler.amortisman_diger_usd);
    const ortalamaIsciMaasiUSD = safeParseFloat(genelDegiskenler.ort_isci_maasi) / usdTl;

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

    // Malzeme fiyatları
    const galvanizsizProfilFiyatKg = safeParseFloat(profilDegiskenler.galvanizsiz_profil_kg_usd) / 1000;
    const galvanizliProfilFiyatKg = safeParseFloat(profilDegiskenler.galvanizli_profil_kg_usd) / 1000;

    // Sonuç listesi
    const results = [];

    // Her profil için hesaplama yap
    for (const profil of profilListesi) {
      try {
        const yukseklik = safeParseFloat(profil.yukseklik);
        const galvanizli = profil.galvanizli === true;
        const flansli = profil.flansli === true;
        const adet = safeParseFloat(profil.adet, 1);
        const vidaAdet = safeParseFloat(profil.vida_adet, 0);
        const klipsAdet = safeParseFloat(profil.klips_adet, 0);
        const dubelAdet = safeParseFloat(profil.dubel_adet, 0);
        const kapakAdet = safeParseFloat(profil.kapak_adet, 0);

        // Profil ağırlık hesaplaması
        // Formül: Weight = Cross-sectional area × length × density / 1000
        // Standard hollow rectangular tube formula with corner radius correction
        // Corner radius typically = 1.5 × thickness (reduces weight by ~3%)
        const lengthInMm = yukseklik * 10; // cm to mm conversion
        
        // Method 1: Exact calculation (outer area - inner area)
        const outerArea = profilEn1 * profilEn2;
        const innerWidth = profilEn1 - 2 * profilEtKalinligi;
        const innerHeight = profilEn2 - 2 * profilEtKalinligi;
        const innerArea = innerWidth * innerHeight;
        const crossSectionalArea = outerArea - innerArea;
        
        // Apply corner radius correction factor (typically reduces weight by 1-2%)
        const cornerCorrectionFactor = 0.988; // 1.2% reduction for rounded corners
        const correctedArea = crossSectionalArea * cornerCorrectionFactor;
        
        // Density = 7.85 g/cm³ = 0.00785 kg/cm³
        const baseProfilAgirlik = (correctedArea * lengthInMm * 0.00785) / 1000;
        
        // Galvaniz kaplama ağırlığı hesaplaması
        // Tipik galvaniz kaplama: 275-600 g/m² (ortalama 400 g/m² kullanıyoruz)
        // Yüzey alanı = perimeter × length (mm² to m² conversion: /1,000,000)
        let profilAgirlik = baseProfilAgirlik;
        if (galvanizli) {
          const perimeter = 2 * (profilEn1 + profilEn2); // mm
          const surfaceAreaM2 = (perimeter * lengthInMm) / 1000000; // Convert mm² to m²
          const galvanizCoatingWeight = surfaceAreaM2 * 0.400; // 400 g/m² = 0.400 kg/m²
          profilAgirlik = baseProfilAgirlik + galvanizCoatingWeight;
        }
        
        // Flanş ağırlığı - sadece ağırlık hesaplamasına eklenir, maliyet hesaplamasına eklenmez
        // Her flanş 385g = 0.385 kg
        const profilAgirlikWithFlange = flansli ? profilAgirlik + 0.385 : profilAgirlik;
        
        // Toplam ağırlık (adet ile çarpılmış)
        const toplamAgirlik = profilAgirlikWithFlange * adet;

        // Profil kapasitesini hesapla
        const profilKapasiteAd = profilOrtalama * 26 * 7 * vardiyaProfil;
        
        // Profil aylık kapasite
        const profilAylikKapasite = profilKapasiteAd;

        // Boya tüketim hesaplaması
        const profilBoyaTuketimAdUSD = ((2 * profilEn1 + 2 * profilEn2) * yukseklik / 10000) *
          profilBoyaTuketim * (boyaFiyatiUSD / 1000);

        // Elektrik kesme ve kaynak maliyeti
        const profilElektrikKesmeAd = (profilKesmeElektrikTuketim / (1000 / 7)) * elektrikFiyatiUSD;
        const profilElektrikKaynakAd = (profilKaynakElektrikTuketim / (450 / 7)) * elektrikFiyatiUSD;

        // İşçi maliyeti
        const profilIsciUretimAd = (ortalamaIsciMaasiUSD * profilIsciSayisi) / profilAylikKapasite;

        // Individual accessory costs
        const flansMaliyet = flansli ? flansUSD : 0;
        const vidaMaliyet = vidaAdet * vidaUSD;
        const klipsMaliyet = klipsAdet * klipsUSD;
        const dubelMaliyet = dubelAdet * dubelUSD;
        const kapakMaliyet = kapakAdet * kapakUSD;
        
        // Hammadde maliyeti (total accessories)
        const profilHammaddeToplamAd = flansMaliyet + vidaMaliyet + klipsMaliyet + dubelMaliyet + kapakMaliyet;

        // Üretim kapasitesini hesapla
        let profilSaatlikUretimKapasitesi = 0;
        let roundedHeight = yukseklik;

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

        // Profil fiyatı seçimi (galvanizli veya galvanizsiz)
        const profilFiyatKg = galvanizli ? galvanizliProfilFiyatKg : galvanizsizProfilFiyatKg;

        // SetUSD hesapla
        const SetUSD = profilBoyaTuketimAdUSD +
          profilElektrikKesmeAd +
          profilElektrikKaynakAd +
          profilIsciUretimAd +
          profilHammaddeToplamAd +
          (profilFiyatKg * profilAgirlik) + // Maliyet hesaplamasında flanş ağırlığı dahil değil
          profilDogalgazTuketimOran +
          profilBoyaElektrikTuketimOran;

        // Toplam USD fiyat
        const totalUSD = SetUSD * adet;
        const totalEUR = totalUSD / eurUsd;
        const totalTRY = totalUSD * usdTl;

        results.push({
          id: profil.id,
          yukseklik: yukseklik,
          profil_en1: profilEn1,
          profil_en2: profilEn2,
          galvanizli: galvanizli,
          flansli: flansli,
          adet: adet,
          vida_adet: vidaAdet,
          klips_adet: klipsAdet,
          dubel_adet: dubelAdet,
          kapak_adet: kapakAdet,
          profil_agirlik: profilAgirlikWithFlange,
          toplam_agirlik: toplamAgirlik,
          hammadde_maliyet: profilHammaddeToplamAd,
          birim_fiyat_usd: SetUSD,
          birim_fiyat_eur: SetUSD / eurUsd,
          birim_fiyat_try: SetUSD * usdTl,
          toplam_fiyat_usd: totalUSD,
          toplam_fiyat_eur: totalEUR,
          toplam_fiyat_try: totalTRY,
          // Detaylı maliyet kalemleri
          boya_maliyet: profilBoyaTuketimAdUSD,
          elektrik_kesme: profilElektrikKesmeAd,
          elektrik_kaynak: profilElektrikKaynakAd,
          iscilik: profilIsciUretimAd,
          hammadde: profilHammaddeToplamAd,
          malzeme_maliyet: profilFiyatKg * profilAgirlik,
          dogalgaz: profilDogalgazTuketimOran,
          boya_elektrik: profilBoyaElektrikTuketimOran,
          // Individual accessory costs
          flans_maliyet_usd: flansMaliyet,
          flans_maliyet_eur: flansMaliyet / eurUsd,
          flans_maliyet_try: flansMaliyet * usdTl,
          vida_maliyet_usd: vidaMaliyet,
          vida_maliyet_eur: vidaMaliyet / eurUsd,
          vida_maliyet_try: vidaMaliyet * usdTl,
          klips_maliyet_usd: klipsMaliyet,
          klips_maliyet_eur: klipsMaliyet / eurUsd,
          klips_maliyet_try: klipsMaliyet * usdTl,
          dubel_maliyet_usd: dubelMaliyet,
          dubel_maliyet_eur: dubelMaliyet / eurUsd,
          dubel_maliyet_try: dubelMaliyet * usdTl,
          kapak_maliyet_usd: kapakMaliyet,
          kapak_maliyet_eur: kapakMaliyet / eurUsd,
          kapak_maliyet_try: kapakMaliyet * usdTl,
          // Total accessory costs per unit
          toplam_aksesuar_usd: profilHammaddeToplamAd,
          toplam_aksesuar_eur: profilHammaddeToplamAd / eurUsd,
          toplam_aksesuar_try: profilHammaddeToplamAd * usdTl,
          // Total accessory costs for all units
          toplam_aksesuar_adet_usd: profilHammaddeToplamAd * adet,
          toplam_aksesuar_adet_eur: (profilHammaddeToplamAd * adet) / eurUsd,
          toplam_aksesuar_adet_try: (profilHammaddeToplamAd * adet) * usdTl
        });
      } catch (error) {
        console.error(`Hesaplama hatası (Profil ${profil.id}):`, error);
      }
    }

    return results;
  };

  // Excel'e aktarma fonksiyonu
  const exportToExcel = () => {
    try {
      // Dışa aktarılacak sonuçları hazırla
      const dataToExport = sonuclar.map(result => {
        const baseData = {
          "Yükseklik (cm)": result.yukseklik,
          "Genişlik-1 (mm)": result.profil_en1,
          "Genişlik-2 (mm)": result.profil_en2,
          "Galvanizli": result.galvanizli ? "Evet" : "Hayır",
          "Flanşlı": result.flansli ? "Evet" : "Hayır",
          "Adet": result.adet,
          "Vida Adedi": result.vida_adet,
          "Klips Adedi": result.klips_adet,
          "Dubel Adedi": result.dubel_adet,
          "Kapak Adedi": result.kapak_adet,
          "Profil Ağırlık (kg)": formatTableValue(result.profil_agirlik, 'weight'),
          "Toplam Ağırlık (kg)": formatTableValue(result.toplam_agirlik, 'weight')
        };
        
        // Only add price data if not hidden
        if (!hidePrices) {
          // Para birimi filtresine göre fiyat kolonlarını ekle
          if (resultFilter.currency === 'all' || resultFilter.currency === 'usd') {
            baseData["Birim Fiyat (USD)"] = formatTableValue(result.birim_fiyat_usd, 'price');
            baseData["Toplam Fiyat (USD)"] = formatTableValue(result.toplam_fiyat_usd, 'price');
          }
          if (resultFilter.currency === 'all' || resultFilter.currency === 'eur') {
            baseData["Birim Fiyat (EUR)"] = formatTableValue(result.birim_fiyat_eur, 'price');
            baseData["Toplam Fiyat (EUR)"] = formatTableValue(result.toplam_fiyat_eur, 'price');
          }
          if (resultFilter.currency === 'all' || resultFilter.currency === 'try') {
            baseData["Birim Fiyat (TRY)"] = formatTableValue(result.birim_fiyat_try, 'price');
            baseData["Toplam Fiyat (TRY)"] = formatTableValue(result.toplam_fiyat_try, 'price');
          }
          
          // Aksesuar kolonlarını sadece showAccessories true ise ekle
          // Tabloda aksesuarlar sadece USD olarak gösteriliyor
          if (showAccessories) {
            baseData["Toplam Flanş (USD)"] = result.flansli ? formatTableValue(result.flans_maliyet_usd * result.adet, 'price') : '0';
            baseData["Toplam Vida (USD)"] = formatTableValue(result.vida_maliyet_usd * result.adet, 'price');
            baseData["Toplam Klips (USD)"] = formatTableValue(result.klips_maliyet_usd * result.adet, 'price');
            baseData["Toplam Dübel (USD)"] = formatTableValue(result.dubel_maliyet_usd * result.adet, 'price');
            baseData["Toplam Kapak (USD)"] = formatTableValue(result.kapak_maliyet_usd * result.adet, 'price');
            baseData["Toplam Aksesuar Maliyeti (USD)"] = formatTableValue(result.toplam_aksesuar_adet_usd, 'price');
          }
        }
        
        return baseData;
      });

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
        const columnWidth = 15;
        columnWidths.push({ wch: columnWidth });
      }
      worksheet['!cols'] = columnWidths;

      // Başlık hücrelerine stil uygula
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: 0, c: C });

        if (!worksheet[address]) worksheet[address] = { t: 's', v: '' };
        if (!worksheet[address].s) worksheet[address].s = {};

        worksheet[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "E6E6E6" } }
        };
      }

      // Workbook oluştur ve worksheet ekle
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Profil Hesaplama");

      // Excel dosyasını indir
      XLSX.writeFile(workbook, "Profil_Hesaplama.xlsx");
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      alert('Dışa aktarma sırasında bir hata oluştu: ' + error.message);
    }
  };

  // Sonuçları filtrele
  const getFilteredResults = () => {
    if (!sonuclar || sonuclar.length === 0) return [];
    
    // Para birimi filtreleme
    if (resultFilter.currency !== 'all') {
      // Sonuçları göster, ancak seçilen para birimine göre kolonları göster/gizle
      return sonuclar.map(result => ({
        ...result,
        // Seçili para birimi ile ilgili değerleri sakla, diğerlerini null yap
        // Bu değerler render sırasında kontrol edilecek
        currency_filter: resultFilter.currency
      }));
    }
    
    return sonuclar;
  };

  return (
    <div className="space-y-6">
      {/* Profil Ekleme Kartı */}
      <Card>
        <CardHeader className="bg-gray-900 text-white">
          <CardTitle className="flex justify-between items-center">
            <span>Profil Hesaplama</span>
            <div className="flex space-x-2">
              <button
                onClick={calculateCosts}
                disabled={calculating || profilList.length === 0}
                className="flex items-center px-3 py-2 h-10 bg-red-600 hover:bg-red-700 text-white rounded-md shadow transition-colors"
              >
                <Calculator className="mr-1 h-4 w-4" />
                Hesapla
              </button>
              <button
                onClick={addProfil}
                className="flex items-center px-3 py-2 h-10 bg-gray-700 hover:bg-gray-800 text-white rounded-md shadow transition-colors"
              >
                <Plus className="mr-1 h-4 w-4" />
                Yeni Profil
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4">
          {/* Profil Giriş Tablosu */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-800 text-white">
                  <TableHead width="100" className="hover:text-white">Yükseklik (cm)</TableHead>
                  <TableHead width="120" className="hover:text-white">Galvanizli</TableHead>
                  <TableHead width="120" className="hover:text-white">Flanşlı</TableHead>
                  <TableHead width="80" className="hover:text-white">Adet</TableHead>
                  <TableHead width="80" className="hover:text-white">Vida Adedi</TableHead>
                  <TableHead width="80" className="hover:text-white">Klips Adedi</TableHead>
                  <TableHead width="80" className="hover:text-white">Dubel Adedi</TableHead>
                  <TableHead width="80" className="hover:text-white">Kapak Adedi</TableHead>
                  <TableHead width="80" className="hover:text-white">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profilList.map((profil) => (
                  <TableRow key={profil.id}>
                    <TableCell>
                      <input
                        type="text"
                        value={profil.yukseklik}
                        onChange={(e) => updateProfil(profil.id, 'yukseklik', e.target.value)}
                        className="w-full p-1 border border-gray-400 rounded bg-gray-50"
                      />
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={profil.galvanizli ? "true" : "false"} 
                        onValueChange={(value) => updateProfil(profil.id, 'galvanizli', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>{profil.galvanizli ? "Evet" : "Hayır"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Evet</SelectItem>
                          <SelectItem value="false">Hayır</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={profil.flansli ? "true" : "false"} 
                        onValueChange={(value) => updateProfil(profil.id, 'flansli', value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>{profil.flansli ? "Evet" : "Hayır"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Evet</SelectItem>
                          <SelectItem value="false">Hayır</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={profil.adet}
                        onChange={(e) => updateProfil(profil.id, 'adet', e.target.value)}
                        className="w-full p-1 border border-gray-400 rounded bg-gray-50"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={profil.vida_adet}
                        onChange={(e) => updateProfil(profil.id, 'vida_adet', e.target.value)}
                        className="w-full p-1 border border-gray-400 rounded bg-gray-50"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={profil.klips_adet}
                        onChange={(e) => updateProfil(profil.id, 'klips_adet', e.target.value)}
                        className="w-full p-1 border border-gray-400 rounded bg-gray-50"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={profil.dubel_adet}
                        onChange={(e) => updateProfil(profil.id, 'dubel_adet', e.target.value)}
                        className="w-full p-1 border border-gray-400 rounded bg-gray-50"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="text"
                        value={profil.kapak_adet}
                        onChange={(e) => updateProfil(profil.id, 'kapak_adet', e.target.value)}
                        className="w-full p-1 border border-gray-400 rounded bg-gray-50"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => removeProfil(profil.id)}
                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sonuçlar Bölümü */}
      {showResults && (
        <Card>
          <CardHeader className="bg-gray-900 text-white">
            <CardTitle className="flex justify-between items-center">
              <span>Hesap Sonuçları</span>
              <div className="flex space-x-2">
                <button
                  onClick={exportToExcel}
                  className="flex items-center px-3 py-2 h-10 bg-red-600 hover:bg-red-700 text-white rounded-md shadow transition-colors"
                >
                  <FileSpreadsheet className="mr-1 h-4 w-4" />
                  Excel'e Aktar
                </button>
                <button
                  onClick={() => {
                    setSonuclar([]);
                    setShowResults(false);
                  }}
                  className="flex items-center px-3 py-2 h-10 bg-gray-600 hover:bg-gray-700 text-white rounded-md shadow transition-colors"
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Temizle
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-4">
            {/* Filtre Alanı */}
            {!hidePrices && (
              <div className="flex space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Para Birimi:</span>
                  <Select 
                    value={resultFilter.currency} 
                    onValueChange={(value) => setResultFilter(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue>{resultFilter.currency === 'all' ? 'Tümü' : resultFilter.currency.toUpperCase()}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="usd">USD</SelectItem>
                      <SelectItem value="eur">EUR</SelectItem>
                      <SelectItem value="try">TRY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowAccessories(!showAccessories)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      showAccessories 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {showAccessories ? 'Aksesuarları Gizle' : 'Aksesuarları Göster'}
                  </button>
                </div>
              </div>
            )}

            {/* Sonuç Tablosu */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-800 text-white">
                    <TableHead className="hover:text-white">Yükseklik (cm)</TableHead>
                    <TableHead className="hover:text-white">Galvanizli</TableHead>
                    <TableHead className="hover:text-white">Flanşlı</TableHead>
                    <TableHead className="hover:text-white">Adet</TableHead>
                    <TableHead className="hover:text-white">Profil Ağırlık (kg)</TableHead>
                    <TableHead className="hover:text-white">Toplam Ağırlık (kg)</TableHead>
                    {!hidePrices && (resultFilter.currency === 'all' || resultFilter.currency === 'usd') ? (
                      <TableHead className="hover:text-white">Birim Fiyat (USD)</TableHead>
                    ) : null}
                    {!hidePrices && (resultFilter.currency === 'all' || resultFilter.currency === 'eur') ? (
                      <TableHead className="hover:text-white">Birim Fiyat (EUR)</TableHead>
                    ) : null}
                    {!hidePrices && (resultFilter.currency === 'all' || resultFilter.currency === 'try') ? (
                      <TableHead className="hover:text-white">Birim Fiyat (TRY)</TableHead>
                    ) : null}
                    {!hidePrices && (resultFilter.currency === 'all' || resultFilter.currency === 'usd') ? (
                      <TableHead className="hover:text-white bg-green-800">Toplam Fiyat (USD)</TableHead>
                    ) : null}
                    {!hidePrices && (resultFilter.currency === 'all' || resultFilter.currency === 'eur') ? (
                      <TableHead className="hover:text-white">Toplam Fiyat (EUR)</TableHead>
                    ) : null}
                    {!hidePrices && (resultFilter.currency === 'all' || resultFilter.currency === 'try') ? (
                      <TableHead className="hover:text-white">Toplam Fiyat (TRY)</TableHead>
                    ) : null}
                    {/* Accessory columns - Only USD */}
                    {!hidePrices && showAccessories && (
                      <>
                        <TableHead className="hover:text-white">Toplam Flanş (USD)</TableHead>
                        <TableHead className="hover:text-white">Toplam Vida (USD)</TableHead>
                        <TableHead className="hover:text-white">Toplam Klips (USD)</TableHead>
                        <TableHead className="hover:text-white">Toplam Dübel (USD)</TableHead>
                        <TableHead className="hover:text-white">Toplam Kapak (USD)</TableHead>
                        <TableHead className="hover:text-white bg-blue-800">Toplam Aksesuar Maliyeti (USD)</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredResults().map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>{formatTableValue(result.yukseklik)}</TableCell>
                      <TableCell>{result.galvanizli ? "Evet" : "Hayır"}</TableCell>
                      <TableCell>{result.flansli ? "Evet" : "Hayır"}</TableCell>
                      <TableCell>{formatTableValue(result.adet)}</TableCell>
                      <TableCell>{formatTableValue(result.profil_agirlik, 'weight')}</TableCell>
                      <TableCell>{formatTableValue(result.toplam_agirlik, 'weight')}</TableCell>
                      {!hidePrices && (result.currency_filter === 'usd' || !result.currency_filter) && (
                        <TableCell>{formatTableValue(result.birim_fiyat_usd, 'price')}</TableCell>
                      )}
                      {!hidePrices && (result.currency_filter === 'eur' || !result.currency_filter) && (
                        <TableCell>{formatTableValue(result.birim_fiyat_eur, 'price')}</TableCell>
                      )}
                      {!hidePrices && (result.currency_filter === 'try' || !result.currency_filter) && (
                        <TableCell>{formatTableValue(result.birim_fiyat_try, 'price')}</TableCell>
                      )}
                      {!hidePrices && (result.currency_filter === 'usd' || !result.currency_filter) && (
                        <TableCell className="bg-green-50 font-semibold">{formatTableValue(result.toplam_fiyat_usd, 'price')}</TableCell>
                      )}
                      {!hidePrices && (result.currency_filter === 'eur' || !result.currency_filter) && (
                        <TableCell>{formatTableValue(result.toplam_fiyat_eur, 'price')}</TableCell>
                      )}
                      {!hidePrices && (result.currency_filter === 'try' || !result.currency_filter) && (
                        <TableCell>{formatTableValue(result.toplam_fiyat_try, 'price')}</TableCell>
                      )}
                      {/* Accessory data cells - Only USD with totals */}
                      {!hidePrices && showAccessories && (
                        <>
                          <TableCell>{result.flansli ? formatTableValue(result.flans_maliyet_usd * result.adet, 'price') : '0'}</TableCell>
                          <TableCell>{formatTableValue(result.vida_maliyet_usd * result.adet, 'price')}</TableCell>
                          <TableCell>{formatTableValue(result.klips_maliyet_usd * result.adet, 'price')}</TableCell>
                          <TableCell>{formatTableValue(result.dubel_maliyet_usd * result.adet, 'price')}</TableCell>
                          <TableCell>{formatTableValue(result.kapak_maliyet_usd * result.adet, 'price')}</TableCell>
                          <TableCell className="bg-blue-50 font-semibold">{formatTableValue(result.toplam_aksesuar_adet_usd, 'price')}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilHesaplama;