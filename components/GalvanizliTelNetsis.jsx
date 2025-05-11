import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth } from '@/api-config';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

// Ortak galvanizli tel doğrulama şeması - Hem MM GT hem de Talep için kullanılacak
const galvanizliTelValidationSchema = Yup.object().shape({
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

// MM GT validation şeması (şimdi ortak şemayı kullanıyor)
const mmGtValidationSchema = galvanizliTelValidationSchema;

// YM ST formüllerine ait doğrulama şeması
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

// Talep doğrulama şeması (şimdi ortak şemayı kullanıyor)
const talepValidationSchema = galvanizliTelValidationSchema;

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
    ymStList: [],
    mmGtReceteList: [],
    ymGtReceteList: [],
    ymStReceteList: []
  });
  const [talepList, setTalepList] = useState([]);
  const [talepCount, setTalepCount] = useState({ pending: 0, all: 0 });
  const [selectedTalep, setSelectedTalep] = useState(null);
  const { user } = useAuth();

  // Ürün veritabanını yükleme
  const fetchProductDatabase = useCallback(async () => {
    try {
      setLoading(true);

      // Tüm API çağrılarını paralel olarak gerçekleştir
      const endpoints = [
        { key: 'mmGtList', url: API_URLS.galMmGt },
        { key: 'ymGtList', url: API_URLS.galYmGt },
        { key: 'ymStList', url: API_URLS.galYmSt },
        { key: 'mmGtReceteList', url: API_URLS.galMmGtRecete },
        { key: 'ymGtReceteList', url: API_URLS.galYmGtRecete },
        { key: 'ymStReceteList', url: API_URLS.galYmStRecete }
      ];

      // Tüm API çağrılarını bir arada yap
      const responses = await Promise.all(
        endpoints.map(endpoint => fetchWithAuth(endpoint.url))
      );

      // Tüm yanıtları paralel olarak JSON olarak işle
      const results = await Promise.all(
        responses.map(async (res, index) => {
          if (res && res.ok) {
            try {
              return await res.json();
            } catch (error) {
              console.error(`${endpoints[index].key} işlenirken hata:`, error);
              return [];
            }
          }
          return [];
        })
      );

      // Sonuçları endpointlerin sırasına göre bir nesne içinde topla
      const data = endpoints.reduce((acc, endpoint, index) => {
        acc[endpoint.key] = Array.isArray(results[index]) ? results[index] : [];
        return acc;
      }, {});

      // Ürün veritabanını güncelle
      setProductDatabase(data);
    } catch (error) {
      console.error('Veritabanı yüklenirken hata:', error);
      setError('Veritabanı yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Talep Listesini Yükleme
  const fetchTalepList = useCallback(async () => {
    try {
      setLoading(true);

      console.log("Fetching talepler from API:", API_URLS.galSalRequests);

      // API'den talep listesini al
      const response = await fetchWithAuth(API_URLS.galSalRequests);
      if (!response || !response.ok) {
        throw new Error(`API yanıtı alınamadı: ${response?.status}`);
      }

      const data = await response.json();
      console.log("Talep listesi API yanıtı:", data);

      // Veriyi state'e kaydet
      setTalepList(Array.isArray(data) ? data : []);

      // Talep sayılarını da güncelle
      await fetchTalepCount();

      setLoading(false);
    } catch (error) {
      console.warn('Talep listesi yüklenirken hata:', error);
      setTalepList([]);

      // Eğer 404 hatası alırsak, backend'in kurulu olmadığını varsayalım
      if (error.message && error.message.includes('404')) {
        toast.error('Talep API endpoint bulunamadı. Backend çalışıyor mu?');
      } else {
        toast.error(`Talep listesi yüklenemedi: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchTalepCount]);
  
  // Talep sayısını getir
  const fetchTalepCount = useCallback(async () => {
    try {
      // Endpoint listesi oluştur
      const endpoints = [
        { key: 'pending', url: `${API_URLS.galSalRequests}/count?status=pending` },
        { key: 'all', url: `${API_URLS.galSalRequests}/count` }
      ];

      try {
        // Talep sayımlarını paralel olarak getir
        const responses = await Promise.all(
          endpoints.map(endpoint => fetchWithAuth(endpoint.url))
        );

        // Tüm yanıtları kontrol et
        const allResponsesOk = responses.every(res => res && res.ok);

        if (allResponsesOk) {
          // Yanıtları paralel olarak JSON olarak işle
          const results = await Promise.all(
            responses.map(res => res.json())
          );

          // İndeksler üzerinden veriyi çıkar
          const [pendingData, allData] = results;
        
        setTalepCount({
          pending: pendingData.count || 0,
          all: allData.count || 0
        });
      } else {
        setTalepCount({ pending: 0, all: 0 });
      }
    } catch (error) {
      console.warn('Talep sayısı getirme hatası:', error);
      setTalepCount({ pending: 0, all: 0 });
    }
  }, []);

  // Talep Detaylarını Yükleme
  const fetchTalepDetails = useCallback(async (talepId) => {
    // İşlem başlamadan hata durumlarını sıfırla
    setError(null);

    // Talep ID'si kontrolü
    if (!talepId) {
      const errorMessage = 'İşlenecek talep seçilmedi';
      console.warn(errorMessage);
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }

    try {
      setLoading(true);

      console.log(`Fetching talep details for ID: ${talepId} from API:`, `${API_URLS.galSalRequests}/${talepId}`);

      // API'den talep detaylarını al
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${talepId}`);

      // API yanıtını kontrol et
      if (!response) {
        const errorMessage = 'Sunucudan yanıt alınamadı';
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      }

      // HTTP durum kodunu kontrol et
      if (!response.ok) {
        const errorStatus = response.status;
        let errorMessage;

        try {
          // API'den hata mesajını almaya çalış
          const errorData = await response.json();
          errorMessage = errorData.message || `Talep detayları alınamadı: HTTP ${errorStatus}`;
        } catch {
          // JSON parse hatası durumunda genel hata mesajı
          errorMessage = `Talep detayları alınamadı: HTTP ${errorStatus}`;
        }

        console.error(errorMessage);
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      }

      // Başarılı yanıt işleme
      const data = await response.json();
      console.log("Talep detayları API yanıtı:", data);
    } catch (error) {
        const errorMessage = `Talep detayları alınamadı: ${error.message || 'Bağlantı hatası'}`;
        console.error('Talep detayları endpoint erişimi hatası:', error);
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      }

      // API yanıtını kontrol et
      if (!response) {
        const errorMessage = 'Sunucudan yanıt alınamadı';
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      }

      // HTTP durum kodunu kontrol et
      if (!response.ok) {
        const errorStatus = response.status;
        let errorMessage;

        try {
          // API'den hata mesajını almaya çalış
          const errorData = await response.json();
          errorMessage = errorData.message || `Talep detayları alınamadı: HTTP ${errorStatus}`;
        } catch {
          // JSON parse hatası durumunda genel hata mesajı
          errorMessage = `Talep detayları alınamadı: HTTP ${errorStatus}`;
        }

        console.error(errorMessage);
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      }

      // Başarılı yanıt işleme
      try {
        const data = await response.json();

        // Veri bütünlüğü kontrolü
        if (!data || typeof data !== 'object') {
          const errorMessage = 'Geçersiz talep verisi alındı';
          setError(errorMessage);
          toast.error(errorMessage);
          return null;
        }

        // Gerekli alanların kontrolü
        const requiredFields = ['cap', 'kod_2', 'kaplama', 'min_mukavemet', 'max_mukavemet',
          'tolerans_plus', 'tolerans_minus', 'ic_cap', 'dis_cap', 'kg'];

        const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null);

        if (missingFields.length > 0) {
          const errorMessage = `Talep verisinde eksik alanlar: ${missingFields.join(', ')}`;
          setError(errorMessage);
          toast.error(errorMessage);
          return null;
        }

        // Talep verisini kaydet
        setSelectedTalep(data);

        // Form değerlerini güvenli bir şekilde dönüştür
        const formValues = {
          cap: parseFloat(data.cap) || 0,
          kod_2: data.kod_2 || '',
          kaplama: parseInt(data.kaplama) || 0,
          min_mukavemet: parseInt(data.min_mukavemet) || 0,
          max_mukavemet: parseInt(data.max_mukavemet) || 0,
          tolerans_plus: parseFloat(data.tolerans_plus) || 0,
          tolerans_minus: parseFloat(data.tolerans_minus) || 0,
          ic_cap: parseInt(data.ic_cap) || 0,
          dis_cap: parseInt(data.dis_cap) || 0,
          kg: parseInt(data.kg) || 0,
          unwinding: data.unwinding || false,
          shrink: data.shrink || false
        };

        // Mantıksal doğrulama kontrolleri
        if (formValues.min_mukavemet > formValues.max_mukavemet) {
          const errorMessage = 'Minimum mukavemet değeri maksimum değerden büyük olamaz';
          setError(errorMessage);
          toast.warning(errorMessage);
          // Hata ciddi değil, işleme devam edebiliriz
        }

        // Form değerlerini sıfırla ve otomatik hesaplamaları yap
        setMmGtData(null);
        setYmGtData(null);
        setSelectedYmSt([]);
        setReceteData(null);
        setIsEditMode(false);
        setDataExist(false);

        // Reçete ve YM ST değerlerini otomatik olarak hesapla
        try {
          await processAutomaticCalculations(formValues);
          toast.success('Talep detayları başarıyla yüklendi');
        } catch (error) {
          console.error('Otomatik hesaplama hatası:', error);
          toast.warning('Talep detayları yüklendi ancak hesaplamalar tamamlanamadı');
        }

        return formValues;
      } catch (error) {
        const errorMessage = `Talep verisi işlenirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`;
        console.error(errorMessage, error);
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      }
    } catch (error) {
      const errorMessage = `Talep detayları yüklenirken beklenmeyen bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`;
      console.error(errorMessage, error);
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Otomatik hesaplamaları işle
  const processAutomaticCalculations = async (formValues) => {
    try {
      // Sayısal değerleri doğru formatta olduğundan emin ol
      const processedValues = {
        ...formValues,
        cap: parseFloat(formValues.cap),
        kaplama: parseInt(formValues.kaplama),
        min_mukavemet: parseInt(formValues.min_mukavemet),
        max_mukavemet: parseInt(formValues.max_mukavemet),
        tolerans_plus: parseFloat(formValues.tolerans_plus),
        tolerans_minus: parseFloat(formValues.tolerans_minus),
        ic_cap: parseInt(formValues.ic_cap),
        dis_cap: parseInt(formValues.dis_cap),
        kg: parseInt(formValues.kg),
      };
      
      // 1. Önce MM GT verilerini oluştur (kaydetmeden)
      const mmGtPreview = createMmGtPreview(processedValues);
      setMmGtData(mmGtPreview);
      
      // 2. YM GT verilerini oluştur
      const ymGtPreview = createYmGtPreview(processedValues, mmGtPreview);
      setYmGtData(ymGtPreview);
      
      // 3. YM ST seçimini yap
      const selectedItems = await autoSelectYmSt(processedValues);
      
      // 4. Reçete değerlerini hesapla
      const calculatedReceteData = calculateReceteValues(processedValues);
      setReceteData(calculatedReceteData);
      
      return {
        mmGt: mmGtPreview,
        ymGt: ymGtPreview,
        ymStList: selectedItems,
        recete: calculatedReceteData
      };
    } catch (error) {
      console.error('Otomatik hesaplama hatası:', error);
      throw error;
    }
  };

  // MM GT önizlemesi oluştur (kaydetmeden)
  const createMmGtPreview = (values) => {
    // Çap değerini nokta ile tutuyoruz
    const capValue = parseFloat(values.cap);
    
    // Çap değerini doğru formatta (4 basamaklı) hazırlama
    const formattedCap = capValue.toFixed(2).replace('.', '').padStart(4, '0');
    
    // Sıra numarası - önizlemede varsayılan 00
    const formattedSequence = "00";
    
    // Stok Kodu formatını oluştur: GT.NIT.0250.00
    const stockCode = `GT.${values.kod_2}.${formattedCap}.${formattedSequence}`;

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
    if (values.ic_cap === 45) {
      ambShrink = 'AMB.SHRİNK.200*140CM';
    } else if (values.ic_cap === 50) {
      ambShrink = 'AMB.SHRİNK.200*160CM';
    } else if (values.ic_cap === 55) {
      ambShrink = 'AMB.SHRİNK.200*190CM';
    }

    // MM GT verilerini hazırla
    return {
      ...values,
      stok_kodu: stockCode,
      stok_adi: `Galvanizli Tel ${capValue} mm -${values.tolerans_minus}/+${values.tolerans_plus} ${values.kaplama} gr/m²${values.min_mukavemet}-${values.max_mukavemet} MPa ID:${values.ic_cap} cm OD:${values.dis_cap} cm ${values.kg} kg`,
      ingilizce_isim: `Galvanized Steel Wire ${capValue} mm -${values.tolerans_minus}/+${values.tolerans_plus} ${values.kaplama} gr/m²${values.min_mukavemet}-${values.max_mukavemet} MPa ID:${values.ic_cap} cm OD:${values.dis_cap} cm ${values.kg} kg`,
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
      dia_mm: capValue.toString(),
      dia_tol_mm_plus: values.tolerans_plus.toString(),
      dia_tol_mm_minus: values.tolerans_minus.toString(),
      zing_coating: values.kaplama.toString(),
      tensile_st_min: values.min_mukavemet.toString(),
      tensile_st_max: values.max_mukavemet.toString(),
      wax: '+',
      lifting_lugs: '+',
      coil_dimensions_id: values.ic_cap.toString(),
      coil_dimensions_od: values.dis_cap.toString(),
      coil_weight: values.kg.toString(),
      amb_shrink: ambShrink,
      // Önizleme için geçici ID
      preview_id: 'preview_' + new Date().getTime()
    };
  };

  // YM GT önizlemesi oluştur
  const createYmGtPreview = (values, mmGtPreview) => {
    return {
      mm_gt_id: mmGtPreview.preview_id, // Geçici ID bağlantısı
      stok_kodu: mmGtPreview.stok_kodu.replace('GT.', 'YM.GT.'),
      stok_adi: mmGtPreview.stok_adi,
      ingilizce_isim: mmGtPreview.ingilizce_isim,
      grup_kodu: 'YM',
      kod_1: 'GT',
      kod_2: mmGtPreview.kod_2,
      cap: mmGtPreview.cap,
      kaplama: mmGtPreview.kaplama,
      min_mukavemet: mmGtPreview.min_mukavemet,
      max_mukavemet: mmGtPreview.max_mukavemet,
      kg: mmGtPreview.kg,
      ic_cap: mmGtPreview.ic_cap,
      dis_cap: mmGtPreview.dis_cap,
      shrink: mmGtPreview.shrink,
      tolerans_plus: mmGtPreview.tolerans_plus,
      tolerans_minus: mmGtPreview.tolerans_minus,
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
      // Önizleme için geçici ID
      preview_id: 'preview_ym_gt_' + new Date().getTime()
    };
  };

  // Talebi onaylama ve ürün oluştur
  const approveTalep = useCallback(async (talepId) => {
    try {
      setLoading(true);
      console.log('Starting approveTalep for talepId:', talepId);

      // Talep bilgilerini al
      console.log('Selected talep state:', selectedTalep);
      const talepData = selectedTalep || await fetchTalepDetails(talepId);

      if (!talepData) {
        const errorMsg = 'Talep bilgileri alınamadı';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Talep data for approval:', talepData);

      // Talebi onayla - API isteği gönder
      console.log(`Sending approve request to: ${API_URLS.galSalRequests}/${talepId}/approve`);
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${talepId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          processed_by: user?.id || 'system'
        })
      });

      console.log('Approve API response:', response);

      if (!response || !response.ok) {
        const responseText = await response?.text();
        console.error('Response error:', responseText);
        throw new Error(`Talep onaylanamadı: ${response?.status} - ${responseText || 'Bilinmeyen hata'}`);
      }

      // Talep lisesini yenile
      await fetchTalepList();
      setSelectedTalep(null);
      setSelectedTalepId(null);
      setShowTalepDetailModal(false);
      toast.success('Talep başarıyla onaylandı');

      return true;
    } catch (error) {
      console.error('Talep onaylama hatası:', error);
      setError(`Talep onaylanırken bir hata oluştu: ${error.message}`);
      toast.error(`Talep onaylanırken bir hata oluştu: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, selectedTalep, receteData, selectedYmSt]);

  // Talebi reddet
  const rejectTalep = useCallback(async (talepId, rejectionReason) => {
    try {
      setLoading(true);

      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${talepId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processed_by: user?.id || 'system',
          status: 'rejected',
          rejection_reason: rejectionReason
        })
      });

      if (!response.ok) {
        throw new Error('Talep durumu güncellenemedi');
      }
      
      setSuccessMessage('Talep başarıyla reddedildi');
      toast.success('Talep başarıyla reddedildi');
      
      // Talep listesini güncelle
      await fetchTalepList();
      
      return true;
    } catch (error) {
      console.error('Talep reddetme hatası:', error);
      setError(`Talep reddedilirken bir hata oluştu: ${error.message}`);
      toast.error(`Talep reddedilirken bir hata oluştu: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // İlişkileri kontrol et ve sil
  const checkAndDeleteRelations = async (type, id) => {
    try {
      // MM GT silinecekse, ilişkili YM GT ve MM GT-YM ST ilişkilerini sil
      if (type === 'mmGt') {
        // YM GT ilişkilerini bul
        const ymGtRes = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${id}`);
        
        if (ymGtRes.ok) {
          const ymGtList = await ymGtRes.json();
          
          if (Array.isArray(ymGtList) && ymGtList.length > 0) {
            // Her bir YM GT'yi sil
            for (const ymGt of ymGtList) {
              // Önce YM GT reçetelerini sil
              const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
              
              if (ymGtReceteRes.ok) {
                const ymGtRecetes = await ymGtReceteRes.json();
                
                if (Array.isArray(ymGtRecetes) && ymGtRecetes.length > 0) {
                  for (const recete of ymGtRecetes) {
                    await fetchWithAuth(`${API_URLS.galYmGtRecete}/${recete.id}`, {
                      method: 'DELETE'
                    });
                  }
                }
              }
              
              // YM GT'yi sil
              await fetchWithAuth(`${API_URLS.galYmGt}/${ymGt.id}`, {
                method: 'DELETE'
              });
            }
          }
        }
        
        // MM GT-YM ST ilişkilerini bul ve sil
        const mmGtYmStRes = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${id}`);
        
        if (mmGtYmStRes.ok) {
          const mmGtYmStList = await mmGtYmStRes.json();
          
          if (Array.isArray(mmGtYmStList) && mmGtYmStList.length > 0) {
            // Her bir ilişkiyi sil
            for (const relation of mmGtYmStList) {
              await fetchWithAuth(`${API_URLS.galMmGtYmSt}/${relation.id}`, {
                method: 'DELETE'
              });
            }
          }
        }
        
        // MM GT reçetelerini sil
        const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${id}`);
        
        if (mmGtReceteRes.ok) {
          const mmGtRecetes = await mmGtReceteRes.json();
          
          if (Array.isArray(mmGtRecetes) && mmGtRecetes.length > 0) {
            for (const recete of mmGtRecetes) {
              await fetchWithAuth(`${API_URLS.galMmGtRecete}/${recete.id}`, {
                method: 'DELETE'
              });
            }
          }
        }
      }
      
      // YM GT silinecekse, ilişkili reçeteleri sil
      if (type === 'ymGt') {
        const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${id}`);
        
        if (ymGtReceteRes.ok) {
          const ymGtRecetes = await ymGtReceteRes.json();
          
          if (Array.isArray(ymGtRecetes) && ymGtRecetes.length > 0) {
            for (const recete of ymGtRecetes) {
              await fetchWithAuth(`${API_URLS.galYmGtRecete}/${recete.id}`, {
                method: 'DELETE'
              });
            }
          }
        }
      }
      
      // YM ST silinecekse, ilişkili reçeteleri ve MM GT-YM ST ilişkilerini sil
      if (type === 'ymSt') {
        // YM ST reçetelerini sil
        const ymStReceteRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${id}`);
        
        if (ymStReceteRes.ok) {
          const ymStRecetes = await ymStReceteRes.json();
          
          if (Array.isArray(ymStRecetes) && ymStRecetes.length > 0) {
            for (const recete of ymStRecetes) {
              await fetchWithAuth(`${API_URLS.galYmStRecete}/${recete.id}`, {
                method: 'DELETE'
              });
            }
          }
        }
        
        // MM GT-YM ST ilişkilerini bul ve sil
        const mmGtYmStRes = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?ym_st_id=${id}`);
        
        if (mmGtYmStRes.ok) {
          const mmGtYmStList = await mmGtYmStRes.json();
          
          if (Array.isArray(mmGtYmStList) && mmGtYmStList.length > 0) {
            // Her bir ilişkiyi sil
            for (const relation of mmGtYmStList) {
              await fetchWithAuth(`${API_URLS.galMmGtYmSt}/${relation.id}`, {
                method: 'DELETE'
              });
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('İlişkiler silinirken hata:', error);
      return false;
    }
  };

  // Ürün silme fonksiyonu - ilişkili kayıtlar için kademeli silme eklenmiş
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
        case 'mmGtRecete':
          endpoint = `${API_URLS.galMmGtRecete}/${id}`;
          successMsg = 'MM GT Reçetesi başarıyla silindi';
          break;
        case 'ymGtRecete':
          endpoint = `${API_URLS.galYmGtRecete}/${id}`;
          successMsg = 'YM GT Reçetesi başarıyla silindi';
          break;
        case 'ymStRecete':
          endpoint = `${API_URLS.galYmStRecete}/${id}`;
          successMsg = 'YM ST Reçetesi başarıyla silindi';
          break;
        default:
          throw new Error('Geçersiz ürün tipi');
      }
      
      // İlişkili kayıtlar için kullanıcıyı uyar ve onay al
      const confirmed = window.confirm(
        "Bu işlem, ürün ve ilişkili tüm kayıtları silecektir. Devam etmek istiyor musunuz?"
      );
      
      if (!confirmed) {
        setLoading(false);
        return false;
      }
      
      // Silme işlemi başladı bildirimi
      toast.info('Silme işlemi başlatıldı. Lütfen bekleyin...', {
        autoClose: false,
        toastId: 'delete-process'
      });
      
      // Önce ilişkili kayıtları sil
      const relationsDeleted = await checkAndDeleteRelations(type, id);
      
      if (!relationsDeleted) {
        toast.dismiss('delete-process');
        throw new Error("İlişkili kayıtlar silinemedi. İşlem iptal edildi.");
      }
      
      // Ürünü sil
      const response = await fetchWithAuth(endpoint, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        toast.dismiss('delete-process');
        if (response.status === 500) {
          throw new Error(
            "Bu ürün diğer kayıtlarla ilişkili olduğu için silinemedi. " +
            "Önce ilişkili kayıtları kaldırmanız gerekiyor."
          );
        } else {
          throw new Error(`Silme işlemi başarısız: ${response.status}`);
        }
      }
      
      toast.dismiss('delete-process');
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

  // Mevcut ürün dizilimini alma fonksiyonu
  const getCurrentSequence = async (kod2, cap) => {
    try {
      const response = await fetchWithAuth(`${API_URLS.galSequence}?kod_2=${kod2}&cap=${cap}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // 404 hatası normal - sıra numarası henüz oluşturulmamış
          return 0;
        }
        throw new Error('Sıra numarası alınamadı');
      }
      
      const data = await response.json();
      // Yeni ürünler için sıra numarası 0'dan başlar
      return data.sequence !== undefined ? data.sequence : 0;
    } catch (error) {
      console.error('Sıra numarası alınırken hata:', error);
      // Hata durumunda varsayılan değer 0
      return 0;
    }
  };

  // Dizilim artırma fonksiyonu
  const incrementSequence = async (kod2, cap) => {
    try {
      // Yükleniyor bildirimi
      toast.info('Sıra numarası oluşturuluyor...', {
        autoClose: false,
        toastId: 'sequence-process'
      });
      
      const response = await fetchWithAuth(API_URLS.galSequence, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kod_2: kod2, cap: cap }),
      });
      
      toast.dismiss('sequence-process');
      
      if (!response.ok) {
        // 500 hatası için detayları göster
        if (response.status === 500) {
          const errorText = await response.text();
          throw new Error(`Sıra numarası artırılamadı: ${errorText}`);
        }
        
        throw new Error('Sıra numarası artırılamadı');
      }
      
      const data = await response.json();
      return data.sequence;
    } catch (error) {
      console.error('Sıra numarası güncelleme hatası:', error);
      toast.error('Sıra numarası güncellenirken hata oluştu: ' + error.message);
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
        setYmStList([]);
      } else {
        // Veriler başarıyla alındı
        setYmStList(data);
      }
    } catch (error) {
      console.error('YM ST listesi yükleme hatası:', error);
      // Hata durumunda da boş dizi ile devam et, böylece uygulama çalışmaya devam eder
      setYmStList([]);
      setError('YM ST listesi yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Ürün arama fonksiyonu
  const searchProducts = async (searchParams) => {
    setLoading(true);
    setError(null);
    setDataExist(false);

    try {
      // Eğer stok kodu arama parametresi varsa, önce mevcut mu kontrol et
      if (searchParams.stok_kodu) {
        // Stok koduna göre arama yapmak için onu düzgün şekilde encode et
        const stokKodu = encodeURIComponent(searchParams.stok_kodu.trim());
        const checkUrl = `${API_URLS.galMmGt}?stok_kodu=${stokKodu}`;
        
        const checkResponse = await fetchWithAuth(checkUrl);
        
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          
          if (Array.isArray(checkData) && checkData.length > 0) {
            // MM GT verisini al
            const mmGt = checkData[0];
            
            // State'leri güncelle
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
                  
                  // İlişkili YM ST'leri al
                  if (ymStIds.length > 0) {
                    // Tekil sorgular için
                    const ymStDetails = [];
                    
                    for (const ymStId of ymStIds) {
                      const ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
                      
                      if (ymStResponse.ok) {
                        const ymStData = await ymStResponse.json();
                        
                        if (Array.isArray(ymStData) && ymStData.length > 0) {
                          ymStDetails.push(ymStData[0]);
                        } else if (ymStData && ymStData.id) {
                          ymStDetails.push(ymStData);
                        }
                      }
                    }
                    
                    if (ymStDetails.length > 0) {
                      setSelectedYmSt(ymStDetails);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('YM ST ilişkileri alınırken hata:', error);
            }
            
            // Reçete verilerini al
            try {
              // MM GT reçete verilerinden formülleri almaya çalış
              const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
              
              if (mmGtReceteRes.ok) {
                const mmGtReceteData = await mmGtReceteRes.json();
                
                if (Array.isArray(mmGtReceteData) && mmGtReceteData.length > 0) {
                  // Paketleme süresi verisini bul
                  const paketlemeSuresi = mmGtReceteData.find(
                    item => item.operasyon_bilesen === 'Operasyon' && 
                    item.bilesen_kodu === 'GTPKT01'
                  )?.miktar || 0.02;
                  
                  // YM GT reçetelerini kontrol et
                  const ymGtId = ymGtResults[0]?.id;
                  
                  if (ymGtId) {
                    const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`);
                    
                    if (ymGtReceteRes.ok) {
                      const ymGtReceteData = await ymGtReceteRes.json();
                      
                      if (Array.isArray(ymGtReceteData) && ymGtReceteData.length > 0) {
                        // Boraks, asit, desi ve galvanizleme verilerini bul
                        const boraksTuketimi = ymGtReceteData.find(
                          item => item.bilesen_kodu === '150 03'
                        )?.miktar || 0.02;
                        
                        const asitTuketimi = ymGtReceteData.find(
                          item => item.bilesen_kodu === 'SM.HİDROLİK.ASİT'
                        )?.miktar || 0.002;
                        
                        const desiTuketimi = ymGtReceteData.find(
                          item => item.bilesen_kodu === 'SM.DESİ.PAK'
                        )?.miktar || 0.0013;
                        
                        const galvanizlemeSuresi = ymGtReceteData.find(
                          item => item.operasyon_bilesen === 'Operasyon' && 
                          item.bilesen_kodu === 'GLV01'
                        )?.miktar || 0.9;
                        
                        // YM ST reçetelerinden tel çekme süresini bul
                        let telCekmeSuresi = 0.15;
                        
                        if (selectedYmSt.length > 0) {
                          const ymStId = selectedYmSt[0].id;
                          const ymStReceteRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymStId}`);
                          
                          if (ymStReceteRes.ok) {
                            const ymStReceteData = await ymStReceteRes.json();
                            
                            if (Array.isArray(ymStReceteData) && ymStReceteData.length > 0) {
                              const telCekmeItem = ymStReceteData.find(
                                item => item.operasyon_bilesen === 'Operasyon' && 
                                item.bilesen_kodu === 'TLC01'
                              );
                              
                              if (telCekmeItem) {
                                telCekmeSuresi = telCekmeItem.miktar;
                              }
                            }
                          }
                        }
                        
                        // Reçete verilerini ayarla
                        setReceteData({
                          boraks_tuketimi: parseFloat(boraksTuketimi),
                          asit_tuketimi: parseFloat(asitTuketimi),
                          desi_tuketimi: parseFloat(desiTuketimi),
                          paketleme_suresi: parseFloat(paketlemeSuresi),
                          galvanizleme_suresi: parseFloat(galvanizlemeSuresi),
                          tel_cekme_suresi: parseFloat(telCekmeSuresi)
                        });
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Reçete verileri alınırken hata:', error);
            }
            
            return true;
          }
        }
      }
      
      // Eğer stok kodu araması başarısız olursa veya farklı parametrelerle arama yapılıyorsa
      // Parametreleri URL'ye dönüştür
      const queryParams = new URLSearchParams();
      
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const url = `${API_URLS.galMmGt}?${queryParams.toString()}`;
      
      // MM GT verilerini sorgula
      const mmGtResponse = await fetchWithAuth(url);
      
      if (!mmGtResponse.ok) {
        if (mmGtResponse.status === 404) {
          // Ürün bulunamadı, kullanıcıya bildir
          setDataExist(false);
          setMmGtData(null);
          setYmGtData(null);
          setSelectedYmSt([]);
          setReceteData(null);
          setIsEditMode(false);
          setError('Arama kriterlerine uygun ürün bulunamadı.');
          return false;
        }
        throw new Error('MM GT verileri getirilemedi');
      }
      
      const mmGtResults = await mmGtResponse.json();
      
      if (mmGtResults && Array.isArray(mmGtResults) && mmGtResults.length > 0) {
        const mmGt = mmGtResults[0];
        
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
              
              // İlişkili YM ST'leri al
              if (ymStIds.length > 0) {
                // Tekil sorgular için
                const ymStDetails = [];
                
                for (const ymStId of ymStIds) {
                  const ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
                  
                  if (ymStResponse.ok) {
                    const ymStData = await ymStResponse.json();
                    
                    if (Array.isArray(ymStData) && ymStData.length > 0) {
                      ymStDetails.push(ymStData[0]);
                    } else if (ymStData && ymStData.id) {
                      ymStDetails.push(ymStData);
                    }
                  }
                }
                
                if (ymStDetails.length > 0) {
                  setSelectedYmSt(ymStDetails);
                }
              }
            }
          }
        } catch (error) {
          console.error('YM ST ilişkileri alınırken hata:', error);
        }
        
        // Reçete verilerini al
        try {
          // MM GT reçete verilerinden formülleri almaya çalış
          const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
          
          if (mmGtReceteRes.ok) {
            const mmGtReceteData = await mmGtReceteRes.json();
            
            if (Array.isArray(mmGtReceteData) && mmGtReceteData.length > 0) {
              // Paketleme süresi verisini bul
              const paketlemeSuresi = mmGtReceteData.find(
                item => item.operasyon_bilesen === 'Operasyon' && 
                item.bilesen_kodu === 'GTPKT01'
              )?.miktar || 0.02;
              
              // YM GT reçetelerini kontrol et
              const ymGtId = ymGtResults[0]?.id;
              
              if (ymGtId) {
                const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`);
                
                if (ymGtReceteRes.ok) {
                  const ymGtReceteData = await ymGtReceteRes.json();
                  
                  if (Array.isArray(ymGtReceteData) && ymGtReceteData.length > 0) {
                    // Boraks, asit, desi ve galvanizleme verilerini bul
                    const boraksTuketimi = ymGtReceteData.find(
                      item => item.bilesen_kodu === '150 03'
                    )?.miktar || 0.02;
                    
                    const asitTuketimi = ymGtReceteData.find(
                      item => item.bilesen_kodu === 'SM.HİDROLİK.ASİT'
                    )?.miktar || 0.002;
                    
                    const desiTuketimi = ymGtReceteData.find(
                      item => item.bilesen_kodu === 'SM.DESİ.PAK'
                    )?.miktar || 0.0013;
                    
                    const galvanizlemeSuresi = ymGtReceteData.find(
                      item => item.operasyon_bilesen === 'Operasyon' && 
                      item.bilesen_kodu === 'GLV01'
                    )?.miktar || 0.9;
                    
                    // YM ST reçetelerinden tel çekme süresini bul
                    let telCekmeSuresi = 0.15;
                    
                    if (selectedYmSt.length > 0) {
                      const ymStId = selectedYmSt[0].id;
                      const ymStReceteRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymStId}`);
                      
                      if (ymStReceteRes.ok) {
                        const ymStReceteData = await ymStReceteRes.json();
                        
                        if (Array.isArray(ymStReceteData) && ymStReceteData.length > 0) {
                          const telCekmeItem = ymStReceteData.find(
                            item => item.operasyon_bilesen === 'Operasyon' && 
                            item.bilesen_kodu === 'TLC01'
                          );
                          
                          if (telCekmeItem) {
                            telCekmeSuresi = telCekmeItem.miktar;
                          }
                        }
                      }
                    }
                    
                    // Reçete verilerini ayarla
                    setReceteData({
                      boraks_tuketimi: parseFloat(boraksTuketimi),
                      asit_tuketimi: parseFloat(asitTuketimi),
                      desi_tuketimi: parseFloat(desiTuketimi),
                      paketleme_suresi: parseFloat(paketlemeSuresi),
                      galvanizleme_suresi: parseFloat(galvanizlemeSuresi),
                      tel_cekme_suresi: parseFloat(telCekmeSuresi)
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Reçete verileri alınırken hata:', error);
        }
      } else {
        // Ürün bulunamadı
        setDataExist(false);
        setMmGtData(null);
        setYmGtData(null);
        setSelectedYmSt([]);
        setReceteData(null);
        setIsEditMode(false);
        setError('Arama kriterlerine uygun ürün bulunamadı');
      }
      
      return true;
    } catch (error) {
      console.error('Ürün arama hatası:', error);
      setError('Ürün arama sırasında bir hata oluştu: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Ürün var mı kontrolü
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

  // MM GT kaydetme fonksiyonu
  const saveMMGT = async (values) => {
    setLoading(true);
    setError(null);

    try {
      // Sayısal değerleri doğru formatta olduğundan emin ol
      const processedValues = {
        ...values,
        cap: parseFloat(values.cap),
        kaplama: parseInt(values.kaplama),
        min_mukavemet: parseInt(values.min_mukavemet),
        max_mukavemet: parseInt(values.max_mukavemet),
        tolerans_plus: parseFloat(values.tolerans_plus),
        tolerans_minus: parseFloat(values.tolerans_minus),
        ic_cap: parseInt(values.ic_cap),
        dis_cap: parseInt(values.dis_cap),
        kg: parseInt(values.kg),
      };
      
      // Çap değerini nokta ile tutuyoruz (JS için)
      const capValue = parseFloat(processedValues.cap);
      
      // Çap değerini doğru formatta (4 basamaklı) hazırlama
      const formattedCap = capValue.toFixed(2).replace('.', '').padStart(4, '0');
      
      // Sıra numarasını al
      let sequenceNumber = 0;
      try {
        const sequence = await getCurrentSequence(processedValues.kod_2, capValue);
        // Always increment sequence to ensure unique products with different variables
        sequenceNumber = (sequence || 0) + 1;
      } catch (error) {
        console.warn('Sıra numarası alınamadı, varsayılan 0 kullanılıyor', error);
      }
      
      // Sıra numarasını formatla
      const formattedSequence = sequenceNumber.toString().padStart(2, '0');
      
      // Stok Kodu formatını oluştur: GT.NIT.0250.00
      const stockCode = `GT.${processedValues.kod_2}.${formattedCap}.${formattedSequence}`;

      // Eğer düzenleme modu değilse, var olan stok kodunu kontrol et
      if (!isEditMode) {
        const exists = await checkProductExists(stockCode);
        
        if (exists) {
          // Ürün zaten var, kullanıcıya bildir ve düzenleme moduna geç
          toast.info(`${stockCode} kodlu ürün zaten mevcut. Düzenleme moduna geçiliyor.`);
          
          // Mevcut ürünü getir
          await searchProducts({ stok_kodu: stockCode });
          
          return mmGtData; // Mevcut ürünü döndür
        }
      }

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
      if (processedValues.ic_cap === 45) {
        ambShrink = 'AMB.SHRİNK.200*140CM';
      } else if (processedValues.ic_cap === 50) {
        ambShrink = 'AMB.SHRİNK.200*160CM';
      } else if (processedValues.ic_cap === 55) {
        ambShrink = 'AMB.SHRİNK.200*190CM';
      }

      // MM GT verilerini hazırla
      const mmGtDataToSave = {
        ...processedValues,
        stok_kodu: stockCode,
        stok_adi: `Galvanizli Tel ${capValue} mm -${processedValues.tolerans_minus}/+${processedValues.tolerans_plus} ${processedValues.kaplama} gr/m²${processedValues.min_mukavemet}-${processedValues.max_mukavemet} MPa ID:${processedValues.ic_cap} cm OD:${processedValues.dis_cap} cm ${processedValues.kg} kg`,
        ingilizce_isim: `Galvanized Steel Wire ${capValue} mm -${processedValues.tolerans_minus}/+${processedValues.tolerans_plus} ${processedValues.kaplama} gr/m²${processedValues.min_mukavemet}-${processedValues.max_mukavemet} MPa ID:${processedValues.ic_cap} cm OD:${processedValues.dis_cap} cm ${processedValues.kg} kg`,
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
        dia_mm: capValue.toString(),
        dia_tol_mm_plus: processedValues.tolerans_plus.toString(),
        dia_tol_mm_minus: processedValues.tolerans_minus.toString(),
        zing_coating: processedValues.kaplama.toString(),
        tensile_st_min: processedValues.min_mukavemet.toString(),
        tensile_st_max: processedValues.max_mukavemet.toString(),
        wax: '+',
        lifting_lugs: '+',
        coil_dimensions_id: processedValues.ic_cap.toString(),
        coil_dimensions_od: processedValues.dis_cap.toString(),
        coil_weight: processedValues.kg.toString(),
        amb_shrink: ambShrink,
      };

      // Sequence ve ID'yi çıkar
      delete mmGtDataToSave.sequence;
      delete mmGtDataToSave.id;

      // API endpoint'ini ve metodu belirle
      let apiMethod, apiUrl;
      
      if (isEditMode && mmGtData && mmGtData.id) {
        apiMethod = 'PUT';
        apiUrl = `${API_URLS.galMmGt}/${mmGtData.id}`;
      } else {
        apiMethod = 'POST';
        apiUrl = API_URLS.galMmGt;
      }
      
      // Yükleniyor bildirimi
      toast.info('MM GT kaydediliyor...', {
        autoClose: false,
        toastId: 'save-mmgt'
      });

      // API isteğini gönder
      const response = await fetchWithAuth(apiUrl, {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mmGtDataToSave),
      });
      
      // Yükleniyor bildirimini kapat
      toast.dismiss('save-mmgt');

      if (!response.ok) {
        let errorMessage = 'MM GT kaydedilemedi';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // JSON çözümleme hatası, response.text() dene
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (e2) {
            // Text olarak da alınamadı, status kodunu kullan
            errorMessage = `MM GT kaydedilemedi (${response.status})`;
          }
        }
        
        throw new Error(errorMessage);
      }

      // Başarılı yanıt
      const result = await response.json();
      
      setMmGtData(result);
      setSuccessMessage(isEditMode ? 'MM GT kaydı başarıyla güncellendi' : 'MM GT kaydı başarıyla oluşturuldu');
      toast.success(isEditMode ? 'MM GT kaydı başarıyla güncellendi' : 'MM GT kaydı başarıyla oluşturuldu');

      // Veritabanını güncelle
      await fetchProductDatabase();

      // Sıra numarasını artır (yeni kayıt ise)
      if (!isEditMode) {
        await incrementSequence(processedValues.kod_2, capValue);
      }

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
   
  // YM GT kaydetme fonksiyonu
  const saveYMGT = async (values, mmGtId) => {
    setLoading(true);
    setError(null);

    try {
      // MM GT verisini API'den al
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
      };

      // ID'yi temizle
      delete ymGtDataToSave.id;
      
      // Yükleniyor bildirimi
      toast.info('YM GT kaydediliyor...', {
        autoClose: false,
        toastId: 'save-ymgt'
      });

      // Önce var mı kontrol et
      const checkRes = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${mmGtId}`);
      
      let existing = [];
      if (checkRes.ok) {
        existing = await checkRes.json();
        if (!Array.isArray(existing)) {
          existing = [existing];
        }
      }
      
      let saveRes;
      if (existing.length > 0) {
        // Güncelleme
        const updateUrl = `${API_URLS.galYmGt}/${existing[0].id}`;
        
        saveRes = await fetchWithAuth(updateUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ymGtDataToSave),
        });
        
        if (!saveRes.ok) {
          let errorMessage = 'YM GT güncellenemedi';
          try {
            const errorData = await saveRes.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            try {
              const errorText = await saveRes.text();
              if (errorText) {
                errorMessage = errorText;
              }
            } catch (e2) {
              errorMessage = `YM GT güncellenemedi (${saveRes.status})`;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        setSuccessMessage('YM GT kaydı başarıyla güncellendi');
        toast.success('YM GT kaydı başarıyla güncellendi');
      } else {
        // Yeni kayıt
        saveRes = await fetchWithAuth(API_URLS.galYmGt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ymGtDataToSave),
        });
        
        if (!saveRes.ok) {
          let errorMessage = 'YM GT oluşturulamadı';
          try {
            const errorData = await saveRes.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            try {
              const errorText = await saveRes.text();
              if (errorText) {
                errorMessage = errorText;
              }
            } catch (e2) {
              errorMessage = `YM GT oluşturulamadı (${saveRes.status})`;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        setSuccessMessage('YM GT kaydı başarıyla oluşturuldu');
        toast.success('YM GT kaydı başarıyla oluşturuldu');
      }
      
      // Yükleniyor bildirimini kapat
      toast.dismiss('save-ymgt');

      const savedData = await saveRes.json();
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

  // YM ST'lerin otomatik seçimi - yeni ayrıntılı implementasyon
  const autoSelectYmSt = async (values) => {
    try {
      setLoading(true);

      toast.info('YM ST önerileri oluşturuluyor...', { autoClose: 2000 });

      // Mevcut YM ST'leri temizle
      setSelectedYmSt([]);

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
        // Diğer eşleşmeler için benzeri eklenebilir
      };
      
      // Stok kodu formatını oluştur
      const formattedCap = capValue.toFixed(2).replace('.', '').padStart(4, '0');
      const ymGtKey = `YM.GT.${kod2}.${formattedCap}.00`; // Ana kod
      const ymGtKey2 = `YM.GT.${kod2}.${formattedCap}.01`; // Varyasyon
      
      // Özel eşleşme varsa kullan
      const specialMatch = specialMatchMap[ymGtKey] || specialMatchMap[ymGtKey2];
      if (specialMatch) {
        // Özel eşleşmeyi veritabanında ara
        const matchedYmSt = ymStLookupList.find(item => item.stok_kodu === specialMatch);
        if (matchedYmSt) {
          selectedItems.push(matchedYmSt);
        }
      }
      
      // 2. Eğer özel eşleşme yoksa veya bulunamadıysa, çap ve türe göre hesapla
      if (selectedItems.length === 0) {
        if (kod2 === 'NIT') {
          // NIT için YM ST çapı, MM GT çapından %0-6.5 daha küçük olmalı
          const minCap = capValue * 0.935; // %6.5 küçültme
          const maxCap = capValue * 0.995; // %0.5 küçültme
          
          // NIT için çap aralıklarına göre filtre
          let filmasin, quality;
          
          if (capValue >= 0.8 && capValue <= 1.7) {
            filmasin = 600;
            quality = '1006';
          } else if (capValue > 1.7 && capValue <= 3.0) {
            filmasin = 600;
            quality = capValue <= 2.5 ? '1006' : '1008';
          } else if (capValue > 3.0 && capValue <= 4.0) {
            filmasin = 600;
            quality = '1008';
          }
          
          // Uygun YM ST'leri bul
          const matches = ymStLookupList.filter(item => {
            const itemCap = parseFloat(item.cap);
            return !isNaN(itemCap) && 
                   itemCap >= minCap && 
                   itemCap <= maxCap &&
                   (!filmasin || item.filmasin === filmasin) &&
                   (!quality || item.quality === quality);
          });
          
          // En fazla 3 eşleşmeyi ekle
          if (matches.length > 0) {
            selectedItems = matches.slice(0, 3);
          }
        } else if (kod2 === 'PAD') {
          // PAD tipi için özel çap aralıkları
          let filmasin, quality;
          
          if (capValue >= 0.8 && capValue <= 1.4) {
            filmasin = 550;
            quality = '1006';
          } else if (capValue > 1.4 && capValue <= 2.55) {
            filmasin = 600;
            quality = '1006';
          } else if (capValue > 2.55 && capValue <= 4.25) {
            filmasin = 600;
            quality = '1008';
          } else if (capValue > 4.25 && capValue <= 5.9) {
            filmasin = 700;
            quality = '1010';
          } else if (capValue > 5.9 && capValue <= 7.0) {
            filmasin = 800;
            quality = '1010';
          } else if (capValue > 7.0 && capValue <= 7.4) {
            filmasin = 900;
            quality = '1010';
          } else if (capValue > 7.4 && capValue <= 8.0) {
            filmasin = 1000;
            quality = '1010';
          }
          
          // PAD için aynı çap değerinde YM ST ara
          const matches = ymStLookupList.filter(item => {
            const itemCap = parseFloat(item.cap);
            // PAD için çap tam eşleşmesi veya yakın değerleri kullan
            return !isNaN(itemCap) && 
                   itemCap >= capValue * 0.95 &&
                   itemCap <= capValue * 1.05 &&
                   (!filmasin || item.filmasin === filmasin) &&
                   (!quality || item.quality === quality);
          });
          
          // En fazla 3 eşleşmeyi ekle
          if (matches.length > 0) {
            selectedItems = matches.slice(0, 3);
          }
        }
      }
      
      // 3. Yine de eşleşme bulunamadıysa, çapa en yakın olanları kullan
      if (selectedItems.length === 0) {
        // Çap için bir hesaplama yap
        let targetCap;
        if (kod2 === 'NIT') {
          targetCap = capValue * 0.96; // NIT için %4 küçültme
        } else {
          targetCap = capValue; // PAD için aynı
        }
        
        // Çapa göre en yakın YM ST'leri bul
        const allMatches = ymStLookupList
          .filter(item => {
            const itemCap = parseFloat(item.cap);
            return !isNaN(itemCap) && itemCap > 0;
          })
          .sort((a, b) => {
            const diffA = Math.abs(parseFloat(a.cap) - targetCap);
            const diffB = Math.abs(parseFloat(b.cap) - targetCap);
            return diffA - diffB;
          });
        
        if (allMatches.length > 0) {
          selectedItems = allMatches.slice(0, 3);
        }
      }
      
      // 4. Yine de bulunamadıysa, yeni YM ST oluşturma önerisi
      if (selectedItems.length === 0) {
        // Çap hesaplaması
        const adjustedCap = kod2 === 'NIT' ? 
            (capValue * 0.96).toFixed(2) : // NIT için %4 küçültme
            capValue.toFixed(2);           // PAD için aynı
        
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
          cap: parseFloat(adjustedCap),
          filmasin: filmasin,
          quality: quality,
          isNew: true // Yeni oluşturulduğunu belirtmek için flag
        };
        
        selectedItems = [newYmSt];
      }
      
      // Tekrarlama durumunu kontrol et - her bir ürünün benzersiz olduğundan emin ol
      const uniqueItems = [];
      const seenStokKodu = new Set();
      
      selectedItems.forEach(item => {
        if (!seenStokKodu.has(item.stok_kodu)) {
          seenStokKodu.add(item.stok_kodu);
          uniqueItems.push(item);
        }
      });
      
      // YM ST'leri state'e ekle
      setSelectedYmSt(uniqueItems);
      
      return uniqueItems;
    } catch (error) {
      console.error('YM ST otomatik seçme hatası:', error);
      setError('YM ST otomatik seçme sırasında bir hata oluştu');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Reçete değerlerini otomatik hesaplama - yeni ayrıntılı implementasyon
  const calculateReceteValues = (values) => {
    try {
      const capValue = parseFloat(values.cap);
      const kgValue = parseFloat(values.kg);
      const kaplamaValue = parseInt(values.kaplama);
      
      if (isNaN(capValue) || isNaN(kgValue) || isNaN(kaplamaValue)) {
        console.warn('Reçete değerleri hesaplanamadı: Geçersiz çap, kaplama veya ağırlık değeri');
        return {
          boraks_tuketimi: 0.02,
          asit_tuketimi: 0.002,
          desi_tuketimi: 0.0013,
          paketleme_suresi: 0.02,
          galvanizleme_suresi: 0.9,
          tel_cekme_suresi: 0.15
        };
      }
      
      // Ara değişkenler
      const ash = 5.54; // Kg/tonne
      const lapa = 2.73; // Kg/tonne
      const yuzeyAlani = 1000 * 4000 / Math.PI / capValue / capValue / 7.85 * capValue * Math.PI / 1000;
      const tuketilenAsit = 0.0647625; // kg/m2
      const paketlemeDkAdet = 10;
      
      // 150 03 (Çinko): =((1000*4000/3.14/7.85/'DIA (MM)'/'DIA (MM)'*'DIA (MM)'*3.14/1000*'ZING COATING (GR/M2)'/1000)+('Ash'*0.6)+('Lapa'*0.7))/1000
      const boraksTuketimi = ((1000 * 4000 / Math.PI / 7.85 / capValue / capValue * capValue * Math.PI / 1000 * kaplamaValue / 1000) + (ash * 0.6) + (lapa * 0.7)) / 1000;
      
      // Asit tüketimi: =('YuzeyAlani'*'TuketilenAsit')/1000
      const asitTuketimi = (yuzeyAlani * tuketilenAsit) / 1000;
      
      // Desi tüketimi ağırlığa göre hesaplama
      let desiTuketimi;
      if (kgValue === 500) {
        desiTuketimi = 0.0020;
      } else if (kgValue === 600) {
        desiTuketimi = 0.0017;
      } else if (kgValue === 650) {
        desiTuketimi = 0.0015;
      } else if (kgValue >= 750 && kgValue <= 800) {
        desiTuketimi = 0.0013;
      } else if (kgValue === 850) {
        desiTuketimi = 0.0012;
      } else if (kgValue === 900) {
        desiTuketimi = 0.0011;
      } else if (kgValue === 1100) {
        desiTuketimi = 0.0009;
      } else {
        // Çapa göre varsayılan desi tüketimi
        if (capValue < 2.0) {
          desiTuketimi = 0.0020;
        } else if (capValue >= 2.0 && capValue <= 4.0) {
          desiTuketimi = 0.0013;
        } else {
          desiTuketimi = 0.0011;
        }
      }
      
      // Paketleme süresi: (1000/Coil Weight * PaketlemeDkAdet) / 1000
      const paketlemeSuresi = (1000 / kgValue * paketlemeDkAdet) / 1000;
      
      // Galvanizleme süresi: 1.159 / Çap
      const galvanizlemeSuresi = 1.159 / capValue;
      
      // Tel çekme süresi: 0.2/(Diameter^1.7) + 0.02
      const telCekmeSuresi = 0.2 / Math.pow(capValue, 1.7) + 0.02;
      
      // Reçete verilerini ayarla
      const calculatedReceteData = {
        boraks_tuketimi: parseFloat(boraksTuketimi.toFixed(6)),
        asit_tuketimi: parseFloat(asitTuketimi.toFixed(6)),
        desi_tuketimi: parseFloat(desiTuketimi.toFixed(6)),
        paketleme_suresi: parseFloat(paketlemeSuresi.toFixed(6)),
        galvanizleme_suresi: parseFloat(galvanizlemeSuresi.toFixed(6)),
        tel_cekme_suresi: parseFloat(telCekmeSuresi.toFixed(6))
      };
      
      setReceteData(calculatedReceteData);
      return calculatedReceteData;
    } catch (error) {
      console.error('Reçete değerleri hesaplama hatası:', error);
      return {
        boraks_tuketimi: 0.02,
        asit_tuketimi: 0.002,
        desi_tuketimi: 0.0013,
        paketleme_suresi: 0.02,
        galvanizleme_suresi: 0.9,
        tel_cekme_suresi: 0.15
      };
    }
  };

  // YM ST kaydetme ve MM GT ile ilişkilendirme fonksiyonu
  const saveYMST = async (values, mmGtId) => {
    setLoading(true);
    setError(null);

    try {
      let ymStId;

      if (values.isNew) {
        // Yeni YM ST oluştur
        const diameter = parseFloat(values.cap);
        
        // Çap değeri doğru formatta (leading zeros ile)
        const formattedCap = diameter.toFixed(2).replace('.', '').padStart(4, '0');
        
        // Stok kodu formatla - YM.ST.0240.0550.1006
        const stockCode = `YM.ST.${formattedCap}.${values.filmasin.toString().padStart(4, '0')}.${values.quality}`;
        const stockName = `YM Siyah Tel ${formattedCap} mm HM:${values.filmasin.toString().padStart(4, '0')}.${values.quality}`;

        // Özel saha 1 değerini belirle
        let ozelSaha1;
        if (diameter < 2) ozelSaha1 = 1;
        else if (diameter < 3) ozelSaha1 = 2;
        else if (diameter < 4) ozelSaha1 = 3;
        else if (diameter < 5) ozelSaha1 = 4;
        else if (diameter < 6) ozelSaha1 = 5;
        else if (diameter < 7) ozelSaha1 = 6;
        else if (diameter < 8) ozelSaha1 = 7;
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
          dov_tutar: 0,
          dov_tipi: 0,
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
          cap: diameter,
          filmasin: values.filmasin,
          quality: values.quality,
          stok_turu: 'D',
          esnek_yapilandir: 'H',
          super_recete_kullanilsin: 'H'
        };
        
        // Yükleniyor bildirimi
        toast.info('YM ST kaydediliyor...', {
          autoClose: false,
          toastId: 'save-ymst'
        });

        // Zaten var mı kontrol et
        const checkRes = await fetchWithAuth(`${API_URLS.galYmSt}?stok_kodu=${encodeURIComponent(stockCode)}`);
        
        let existing = [];
        if (checkRes.ok) {
          existing = await checkRes.json();
          if (!Array.isArray(existing)) {
            existing = [existing];
          }
        }
        
        let savedData;
        if (existing.length > 0) {
          // Varsa mevcut kayıt kullan
          savedData = existing[0];
          toast.info(`${stockCode} kodlu YM ST zaten mevcut. Mevcut kayıt kullanılacak.`);
        } else {
          // Yoksa yeni oluştur
          const insertRes = await fetchWithAuth(API_URLS.galYmSt, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ymStDataToSave),
          });
          
          if (!insertRes.ok) {
            let errorMessage = 'YM ST oluşturulamadı';
            try {
              const errorData = await insertRes.json();
              if (errorData && errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (e) {
              try {
                const errorText = await insertRes.text();
                if (errorText) {
                  errorMessage = errorText;
                }
              } catch (e2) {
                errorMessage = `YM ST oluşturulamadı (${insertRes.status})`;
              }
            }
            
            throw new Error(errorMessage);
          }
          
          savedData = await insertRes.json();
          toast.success(`${stockCode} kodlu YM ST başarıyla oluşturuldu.`);
        }
        
        toast.dismiss('save-ymst');
        ymStId = savedData.id;
      } else {
        // Mevcut YM ST kullan
        ymStId = values.id;
      }
      
      // İlişki zaten var mı kontrol et
      const checkRelationRes = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGtId}&ym_st_id=${ymStId}`);
      let relationExists = false;
      let existingRelation = null;
      
      if (checkRelationRes.ok) {
        const existingRelations = await checkRelationRes.json();
        
        if (Array.isArray(existingRelations) && existingRelations.length > 0) {
          relationExists = true;
          existingRelation = existingRelations[0];
        }
      }
      
      // İlişki zaten varsa, UI'ya ekle ama yeniden oluşturma
      if (relationExists) {
        // İlişkili YM ST'yi al
        const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
        
        if (ymStRes.ok) {
          const ymStData = await ymStRes.json();
          
          // API'den dönen veri kontrolü
          let ymStItem;
          if (Array.isArray(ymStData) && ymStData.length > 0) {
            ymStItem = ymStData[0];
          } else if (ymStData && ymStData.id) {
            ymStItem = ymStData;
          }
          
          if (ymStItem) {
            // Eğer UI'da yoksa ekle
            if (!selectedYmSt.some(item => item.id === ymStId)) {
              setSelectedYmSt(prev => [...prev, ymStItem]);
              toast.info(`${ymStItem.stok_kodu} YM ST eklendi.`);
            } else {
              toast.info(`${ymStItem.stok_kodu} YM ST zaten eklenmiş.`);
            }
          }
        }
        
        return true;
      }
      
      // Yükleniyor bildirimi
      toast.info('YM ST ilişkisi oluşturuluyor...', {
        autoClose: false,
        toastId: 'save-ymst-relation'
      });

      // İlişki yoksa oluştur
      const relationData = {
        mm_gt_id: mmGtId,
        ym_st_id: ymStId
      };
      
      const relationRes = await fetchWithAuth(API_URLS.galMmGtYmSt, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relationData),
      });
      
      toast.dismiss('save-ymst-relation');
      
      if (!relationRes.ok) {
        let errorMessage = 'YM ST ilişkisi kurulamadı';
        try {
          const errorData = await relationRes.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          try {
            const errorText = await relationRes.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch (e2) {
            errorMessage = `YM ST ilişkisi kurulamadı (${relationRes.status})`;
          }
        }
        
        throw new Error(errorMessage);
      }

      // İlişkili YM ST'yi al ve UI'a ekle
      const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
      
      if (!ymStRes.ok) {
        throw new Error('YM ST detayları alınamadı');
      }
      
      const ymStData = await ymStRes.json();
      
      // API'den dönen veri kontrolü
      let ymStItem;
      if (Array.isArray(ymStData) && ymStData.length > 0) {
        ymStItem = ymStData[0];
      } else if (ymStData && ymStData.id) {
        ymStItem = ymStData;
      } else {
        throw new Error('YM ST bulunamadı');
      }
      
      // Öncekilerle tekrarlama kontrolü
      if (!selectedYmSt.some(item => item.id === ymStItem.id)) {
        setSelectedYmSt(prev => [...prev, ymStItem]);
        setSuccessMessage('YM ST ilişkisi başarıyla kuruldu');
        toast.success(`${ymStItem.stok_kodu} YM ST başarıyla eklendi.`);
      }

      // YM ST reçetesini oluştur
      await createYMSTRecete(ymStId, receteData);

      // Veritabanını güncelle
      await fetchProductDatabase();

      return ymStItem;
    } catch (error) {
      console.error('YM ST kaydetme hatası:', error);
      setError('YM ST kaydedilirken bir hata oluştu: ' + error.message);
      toast.error('YM ST kaydedilirken bir hata oluştu: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // MM GT Reçete oluşturma
  const createMMGTRecete = async (mmGtId, ymGtId, receteData = null) => {
    try {
      // MM GT verilerini al
      const mmGtRes = await fetchWithAuth(`${API_URLS.galMmGt}?id=${mmGtId}`);
      
      if (!mmGtRes.ok) {
        throw new Error('MM GT verisi alınamadı');
      }
      
      const mmGtData = await mmGtRes.json();
      let mmGt;
      
      if (Array.isArray(mmGtData) && mmGtData.length > 0) {
        mmGt = mmGtData[0];
      } else if (mmGtData && mmGtData.id) {
        mmGt = mmGtData;
      } else {
        throw new Error('MM GT verisi alınamadı');
      }

      // YM GT stok kodunu al
      const ymGtRes = await fetchWithAuth(`${API_URLS.galYmGt}?id=${ymGtId}`);
      
      if (!ymGtRes.ok) {
        throw new Error('YM GT verisi alınamadı');
      }
      
      const ymGtData = await ymGtRes.json();
      let ymGt;
      
      if (Array.isArray(ymGtData) && ymGtData.length > 0) {
        ymGt = ymGtData[0];
      } else if (ymGtData && ymGtData.id) {
        ymGt = ymGtData;
      } else {
        throw new Error('YM GT verisi alınamadı');
      }

      // Kilo bilgisi
      const coilWeight = parseFloat(mmGt.coil_weight || mmGt.kg);

      // Formül hesaplamaları: ONEMLI prompt'tan
      
      // NAYLON (KG/TON): =(1*(1000/coilWeight))/1000
      const naylonMiktar = (1 * (1000 / coilWeight)) / 1000;

      // AMB.APEX CEMBER 38X080: =(1.2*(1000/coilWeight))/1000
      const cemberMiktar = (1.2 * (1000 / coilWeight)) / 1000;

      // AMB.TOKA.SIGNODE.114P. DKP: =(4*(1000/coilWeight))/1000
      const tokaMiktar = (4 * (1000 / coilWeight)) / 1000;

      // SM.7MMHALKA: =(4*(1000/coilWeight))/1000
      const halkaMiktar = (4 * (1000 / coilWeight)) / 1000;

      // AMB.ÇEM.KARTON.GAL: (8*(1000/coilWeight))/1000
      const kartonMiktar = (8 * (1000 / coilWeight)) / 1000;
      
      // Reçete öğelerini oluştur - MM GT için doğru kategorizasyon (9 satır)
      const receteItems = [
        {
          mamul_kodu: mmGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0.0004",
          olcu_br: 'KG',
          sira_no: 1,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: ymGt.stok_kodu,
          olcu_br_bilesen: '1',
          miktar: "1",
          aciklama: 'Galvanizli Tel Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          mm_gt_id: mmGtId
        },
        {
          mamul_kodu: mmGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0.0004",
          olcu_br: 'DK',
          sira_no: 2,
          operasyon_bilesen: 'Operasyon',
          bilesen_kodu: 'GTPKT01', // MM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: receteData ? parseFloat(receteData.paketleme_suresi).toString() : "0.0125",
          aciklama: 'Paketleme Operasyonu',
          uretim_suresi: receteData ? parseFloat(receteData.paketleme_suresi) : 0.0125,
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          mm_gt_id: mmGtId
        },
        {
          mamul_kodu: mmGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0.0004",
          olcu_br: 'AD',
          sira_no: 3,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'AMB.ÇEM.KARTON.GAL', // MM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: "0.01",
          aciklama: 'Karton Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          mm_gt_id: mmGtId
        },
        {
          mamul_kodu: mmGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0.0004",
          olcu_br: 'KG',
          sira_no: 4,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'AMB.SHRİNK.200*140CM', // MM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: "0.00125",
          aciklama: 'Naylon Tüketim Miktarı (Shrink)',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          mm_gt_id: mmGtId
        },
        {
          mamul_kodu: mmGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0.0004",
          olcu_br: 'AD',
          sira_no: 5,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'SM.7MMHALKA', // MM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: "0.005",
          aciklama: 'Kaldırma Kancası Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          mm_gt_id: mmGtId
        },
        {
          mamul_kodu: mmGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0.0004",
          olcu_br: 'KG',
          sira_no: 6,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'AMB.APEX CEMBER 38X080', // MM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: "0.0015",
          aciklama: 'Çelik çember Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          mm_gt_id: mmGtId
        },
        {
          mamul_kodu: mmGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0.0004",
          olcu_br: 'AD',
          sira_no: 7,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'AMB.TOKA.SIGNODE.114P. DKP', // MM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: "0.005",
          aciklama: 'Çember Tokası Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          mm_gt_id: mmGtId
        },
        {
          mamul_kodu: mmGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0.0004",
          olcu_br: 'AD',
          sira_no: 8,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'SM.DESİ.PAK', // MM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: "0.00125",
          aciklama: 'Desi Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          mm_gt_id: mmGtId
        },
        {
          mamul_kodu: mmGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0.0004",
          olcu_br: 'KG',
          sira_no: 9,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'Naylon', // MM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: receteData ? parseFloat(receteData.desi_tuketimi) : 0.002,
          aciklama: 'Slikajel Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          mm_gt_id: mmGtId
        }
      ];

      // Mevcut reçeteleri bul ve sil
      try {
        // Reçeteleri al
        const existingRecetesRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
        
        if (existingRecetesRes.ok) {
          const existingRecetes = await existingRecetesRes.json();
          
          // Her bir reçeteyi sil
          if (Array.isArray(existingRecetes) && existingRecetes.length > 0) {
            for (const recete of existingRecetes) {
              await fetchWithAuth(`${API_URLS.galMmGtRecete}/${recete.id}`, {
                method: 'DELETE'
              });
            }
          }
        }
      } catch (error) {
        console.warn('MM GT reçetesi silinirken hata oluştu:', error);
      }
      
      // Yükleniyor bildirimi
      toast.info('MM GT reçeteleri kaydediliyor...', {
        autoClose: false,
        toastId: 'save-mmgt-recete'
      });

      // Her bir reçete öğesini ayrı ayrı kaydet
      for (const item of receteItems) {
        const receteRes = await fetchWithAuth(API_URLS.galMmGtRecete, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        
        if (!receteRes.ok) {
          let errorMessage = 'MM GT reçetesi kaydedilemedi';
          try {
            const errorData = await receteRes.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            try {
              const errorText = await receteRes.text();
              if (errorText) {
                errorMessage = errorText;
              }
            } catch (e2) {
              errorMessage = `MM GT reçetesi kaydedilemedi (${receteRes.status})`;
            }
          }
          
          throw new Error(errorMessage);
        }
      }
      
      toast.dismiss('save-mmgt-recete');
      return true;
    } catch (error) {
      console.error('MM GT reçete oluşturma hatası:', error);
      throw error;
    }
  };

  // YM GT Reçete oluşturma
  const createYMGTRecete = async (ymGtId, receteData = null) => {
    try {
      // YM GT verilerini al
      const ymGtRes = await fetchWithAuth(`${API_URLS.galYmGt}?id=${ymGtId}`);
      
      if (!ymGtRes.ok) {
        throw new Error('YM GT verisi alınamadı');
      }
      
      const ymGtData = await ymGtRes.json();
      let ymGt;
      
      if (Array.isArray(ymGtData) && ymGtData.length > 0) {
        ymGt = ymGtData[0];
      } else if (ymGtData && ymGtData.id) {
        ymGt = ymGtData;
      } else {
        throw new Error('YM GT verisi alınamadı');
      }

      // MM GT verilerini al
      const mmGtRes = await fetchWithAuth(`${API_URLS.galMmGt}?id=${ymGt.mm_gt_id}`);
      
      if (!mmGtRes.ok) {
        throw new Error('MM GT verisi alınamadı');
      }
      
      const mmGtData = await mmGtRes.json();
      let mmGt;
      
      if (Array.isArray(mmGtData) && mmGtData.length > 0) {
        mmGt = mmGtData[0];
      } else if (mmGtData && mmGtData.id) {
        mmGt = mmGtData;
      } else {
        throw new Error('MM GT verisi alınamadı');
      }

      // İlişkili YM ST'leri al
      const ymStRelRes = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${ymGt.mm_gt_id}`);
      
      if (!ymStRelRes.ok) {
        throw new Error('YM ST ilişkileri alınamadı');
      }
      
      const ymStRelData = await ymStRelRes.json();
      
      if (!Array.isArray(ymStRelData) || ymStRelData.length === 0) {
        throw new Error('İlişkili YM ST bulunamadı');
      }
      
      const ymStIds = ymStRelData.map(rel => rel.ym_st_id);

      // YM ST detaylarını al
      const ymStDetails = [];
      
      for (const ymStId of ymStIds) {
        const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
        
        if (ymStRes.ok) {
          const ymStData = await ymStRes.json();
          
          if (Array.isArray(ymStData) && ymStData.length > 0) {
            ymStDetails.push(ymStData[0]);
          } else if (ymStData && ymStData.id) {
            ymStDetails.push(ymStData);
          }
        }
      }
      
      if (ymStDetails.length === 0) {
        throw new Error('YM ST verileri alınamadı');
      }
      
      // Birincil YM ST'yi seç
      const primaryYmSt = ymStDetails[0];

      // Çap değeri
      const capValue = parseFloat(ymGt.cap);
      const zingCoating = parseFloat(mmGt.zing_coating || ymGt.kaplama);
      const coilWeight = parseFloat(mmGt.coil_weight || ymGt.kg);
      
      // Orta değişkenler hesaplama (ONEMLI prompt'tan)
      const ash = 5.54; // Kg/tonne
      const lapa = 2.73; // Kg/tonne
      const yuzeyAlani = 1000 * 4000 / Math.PI / capValue / capValue / 7.85 * capValue * Math.PI / 1000;
      const tuketilenAsit = 0.0647625; // kg/m2
      const paketlemeDkAdet = 10;
      
      // Formülle 150 03 hesaplama
      const boraksTuketimi = ((1000 * 4000 / 3.14 / 7.85 / capValue / capValue * capValue * 3.14 / 1000 * zingCoating / 1000) + (ash * 0.6) + (lapa * 0.7)) / 1000;
      
      // Asit değeri hesaplama: Yüzey alanı * Tüketilen asit / 1000
      const asitTuketimi = (yuzeyAlani * tuketilenAsit) / 1000;
      
      // Paketleme süresi: (1000/Coil Weight * PaketlemeDkAdet) / 1000
      const paketlemeSuresi = (1000 / coilWeight * paketlemeDkAdet) / 1000;
      
      // Galvanizleme süresi: 1.159 / Çap
      const galvanizlemeSuresi = 1.159 / capValue;
      
      // Desi değerini ağırlığa göre hesapla
      const desiTuketimi = getPaketDesiValue(coilWeight, capValue);
      
      // Reçete değerlerini belirle (formüllerden veya manuel girilen değerlerden)
      const finalBoraksTuketimi = receteData ? parseFloat(receteData.boraks_tuketimi) : boraksTuketimi;
      const finalAsitTuketimi = receteData ? parseFloat(receteData.asit_tuketimi) : asitTuketimi;
      const finalDesiTuketimi = receteData ? parseFloat(receteData.desi_tuketimi) : desiTuketimi;
      const finalPaketlemeSuresi = receteData ? parseFloat(receteData.paketleme_suresi) : paketlemeSuresi;
      const finalGalvanizlemeSuresi = receteData ? parseFloat(receteData.galvanizleme_suresi) : galvanizlemeSuresi;

      // Reçete öğelerini oluştur - YM GT için doğru kategorizasyon, without SM.DESİ.PAK and GTPKT01
      const receteItems = [
        {
          mamul_kodu: ymGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0",
          olcu_br: 'KG',
          sira_no: 1,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: primaryYmSt.stok_kodu, // YM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: "1",
          aciklama: 'Galvanizli Tel Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          ym_gt_id: ymGtId
        },
        {
          mamul_kodu: ymGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0",
          olcu_br: 'KG',
          sira_no: 2,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'GLV01', // YM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: finalGalvanizlemeSuresi.toString(),
          aciklama: 'Galvanizleme Operasyonu',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          ym_gt_id: ymGtId
        },
        {
          mamul_kodu: ymGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0",
          olcu_br: 'KG',
          sira_no: 3,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: '150 03', // YM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: finalBoraksTuketimi.toString(),
          aciklama: 'Çinko Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          ym_gt_id: ymGtId
        },
        {
          mamul_kodu: ymGt.stok_kodu,
          recete_top: "1",
          fire_orani: "0",
          olcu_br: 'KG',
          sira_no: 4,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'SM.HİDROLİK.ASİT', // YM GT Reçete kategori
          olcu_br_bilesen: '1',
          miktar: finalAsitTuketimi.toString(),
          aciklama: 'Asit Tüketim Miktarı',
          ua_dahil_edilsin: 'evet',
          son_operasyon: 'evet',
          ym_gt_id: ymGtId
        }
      ];

      // Önce mevcut reçeteyi sil
      try {
        // Mevcut reçeteleri al
        const existingRecetesRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`);
        
        if (existingRecetesRes.ok) {
          const existingRecetes = await existingRecetesRes.json();
          
          // Her bir reçeteyi sil
          if (Array.isArray(existingRecetes) && existingRecetes.length > 0) {
            for (const recete of existingRecetes) {
              await fetchWithAuth(`${API_URLS.galYmGtRecete}/${recete.id}`, {
                method: 'DELETE'
              });
            }
          }
        }
      } catch (error) {
        console.warn('YM GT reçetesi silinirken hata oluştu:', error);
      }
      
      // Yükleniyor bildirimi
      toast.info('YM GT reçeteleri kaydediliyor...', {
        autoClose: false,
        toastId: 'save-ymgt-recete'
      });

      // Her bir reçete öğesini ayrı ayrı kaydet
      for (const item of receteItems) {
        const receteRes = await fetchWithAuth(API_URLS.galYmGtRecete, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        
        if (!receteRes.ok) {
          let errorMessage = 'YM GT reçetesi kaydedilemedi';
          try {
            const errorData = await receteRes.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            try {
              const errorText = await receteRes.text();
              if (errorText) {
                errorMessage = errorText;
              }
            } catch (e2) {
              errorMessage = `YM GT reçetesi kaydedilemedi (${receteRes.status})`;
            }
          }
          
          throw new Error(errorMessage);
        }
      }
      
      toast.dismiss('save-ymgt-recete');
      return true;
    } catch (error) {
      console.error('YM GT reçete oluşturma hatası:', error);
      throw error;
    }
  };
  
  // Desi değerini ağırlık ve çapa göre hesaplama
  const getPaketDesiValue = (weight, diameter) => {
    // Ağırlığa göre kontrol
    if (weight === 500) return 0.0020;
    if (weight === 600) return 0.0017;
    if (weight === 650) return 0.0015;
    if (weight >= 750 && weight <= 800) return 0.0013;
    if (weight === 850) return 0.0012;
    if (weight === 900) return 0.0011;
    if (weight === 1100) return 0.0009;
    
    // Çapa göre varsayılan değerler
    if (diameter < 2.0) return 0.0020;
    if (diameter >= 2.0 && diameter <= 4.0) return 0.0013;
    return 0.0011;
  };

  // YM ST Reçete oluşturma
  const createYMSTRecete = async (ymStId, receteData = null) => {
    try {
      // YM ST verilerini al
      const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
      
      if (!ymStRes.ok) {
        throw new Error('YM ST verisi alınamadı');
      }
      
      const ymStData = await ymStRes.json();
      let ymSt;
      
      if (Array.isArray(ymStData) && ymStData.length > 0) {
        ymSt = ymStData[0];
      } else if (ymStData && ymStData.id) {
        ymSt = ymStData;
      } else {
        throw new Error('YM ST verisi alınamadı');
      }

      // Çap değeri
      const capValue = parseFloat(ymSt.cap);
      
      // Tel çekme süresi: 0.2 / Çap^1.7 + 0.02
      const telCekmeSuresi = receteData ? parseFloat(receteData.tel_cekme_suresi) : (0.2 / Math.pow(capValue, 1.7) + 0.02);

      // Filmaşin kodu belirle
      let filmasinKod = `FLM.${ymSt.filmasin.toString().padStart(4, '0')}.${ymSt.quality}`;
      
      // Alternatif filmaşin kodları belirleme
      let filmasinCods = [];
      
      // Çap aralıklarına göre filmaşin ve kalite belirleme
      if (capValue >= 0.88 && capValue <= 1.19) {
        filmasinCods.push(`FLM.0550.1005`);
      } else if (capValue >= 1.20 && capValue <= 1.49) {
        filmasinCods.push(`FLM.0550.1006`);
        filmasinCods.push(`FLM.0600.1006`);
      } else if (capValue >= 1.50 && capValue <= 4.50) {
        filmasinCods.push(`FLM.0600.1006`);
      } else if (capValue >= 2.00 && capValue <= 4.49) {
        filmasinCods.push(`FLM.0600.1008`);
      } else if (capValue >= 4.50 && capValue <= 6.10) {
        filmasinCods.push(`FLM.0700.1008`);
        filmasinCods.push(`FLM.0700.1010`);
      } else if (capValue >= 3.50 && capValue <= 6.10) {
        filmasinCods.push(`FLM.0700.1010`);
      } else if (capValue >= 5.50 && capValue <= 6.90) {
        filmasinCods.push(`FLM.0800.1010`);
      } else if (capValue >= 7.00 && capValue <= 7.50) {
        filmasinCods.push(`FLM.0900.1010`);
      }
      
      // Eğer filmaşin kodu tabloda belirtilmemişse, mevcut filmaşin kodunu kullan
      if (filmasinCods.length === 0) {
        filmasinCods.push(filmasinKod);
      }
      
      // Filmaşin kodunu ilk maddedeki kod ile değiştir (varsa)
      if (filmasinCods.length > 0) {
        filmasinKod = filmasinCods[0];
      }

      // Reçete öğelerini oluştur - YM ST için doğru kategorizasyon (2 satır)
      const receteItems = [
        {
          mamul_kodu: ymSt.stok_kodu,
          recete_top: "1",
          olcu_br: 'KG',
          sira_no: 1,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: filmasinKod, // YM ST Reçete kategori: "Filmaşin"
          olcu_br_bilesen: '1',
          miktar: "1",
          aciklama: 'Filmaşin Tüketimi',
          ym_st_id: ymStId
        },
        {
          mamul_kodu: ymSt.stok_kodu,
          recete_top: "1",
          olcu_br: 'DK',
          sira_no: 2,
          operasyon_bilesen: 'Operasyon',
          bilesen_kodu: 'TLC01', // YM ST Reçete kategori
          olcu_br_bilesen: '1',
          miktar: telCekmeSuresi.toString(),
          aciklama: 'Tel Çekme Operasyonu',
          uretim_suresi: telCekmeSuresi,
          ym_st_id: ymStId
        }
      ];
      
      // Alternatif filmaşin kodları için de reçete öğeleri ekle
      let siraNo = 3;
      for (let i = 1; i < filmasinCods.length; i++) {
        receteItems.push({
          mamul_kodu: ymSt.stok_kodu,
          recete_top: 1,
          olcu_br: 'KG',
          sira_no: siraNo++,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: filmasinCods[i],
          olcu_br_bilesen: '1',
          miktar: 1,
          aciklama: 'Alternatif Filmaşin Tüketimi',
          ym_st_id: ymStId,
          alternatif_no: i
        });
      }

      // Önce mevcut reçeteyi sil
      try {
        // Mevcut reçeteleri al
        const existingRecetesRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymStId}`);
        
        if (existingRecetesRes.ok) {
          const existingRecetes = await existingRecetesRes.json();
          
          // Her bir reçeteyi sil
          if (Array.isArray(existingRecetes) && existingRecetes.length > 0) {
            for (const recete of existingRecetes) {
              await fetchWithAuth(`${API_URLS.galYmStRecete}/${recete.id}`, {
                method: 'DELETE'
              });
            }
          }
        }
      } catch (error) {
        console.warn('YM ST reçetesi silinirken hata oluştu:', error);
      }
      
      // Yükleniyor bildirimi
      toast.info('YM ST reçeteleri kaydediliyor...', {
        autoClose: false,
        toastId: 'save-ymst-recete'
      });

      // Her bir reçete öğesini ayrı ayrı kaydet
      for (const item of receteItems) {
        const receteRes = await fetchWithAuth(API_URLS.galYmStRecete, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        
        if (!receteRes.ok) {
          let errorMessage = 'YM ST reçetesi kaydedilemedi';
          try {
            const errorData = await receteRes.json();
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            try {
              const errorText = await receteRes.text();
              if (errorText) {
                errorMessage = errorText;
              }
            } catch (e2) {
              errorMessage = `YM ST reçetesi kaydedilemedi (${receteRes.status})`;
            }
          }
          
          throw new Error(errorMessage);
        }
      }
      
      toast.dismiss('save-ymst-recete');
      return true;
    } catch (error) {
      console.error('YM ST reçete oluşturma hatası:', error);
      throw error;
    }
  };

  // Reçete kaydetme fonksiyonu
  const saveRecete = async (values, mmGtId, ymGtId) => {
    setLoading(true);
    setError(null);

    try {
      // Yükleniyor bildirimi
      toast.info('Reçete verileri kaydediliyor...', {
        autoClose: false,
        toastId: 'save-recete'
      });
      
      // Reçete verileri oluşturma
      await createMMGTRecete(mmGtId, ymGtId, values);
      await createYMGTRecete(ymGtId, values);
      
      if (selectedYmSt.length > 0) {
        for (const ymSt of selectedYmSt) {
          await createYMSTRecete(ymSt.id, values);
        }
      }

      toast.dismiss('save-recete');
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

  // Stok Kartı Excel oluşturma fonksiyonu - Netsis formatına uygun şekilde revize edildi
  // Excel yardımcı fonksiyonları
  const setupWorksheet = (workbook, sheetName, columns) => {
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = columns;
    return sheet;
  };

  const applyWorksheetStyles = (sheets) => {
    sheets.forEach(sheet => {
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
  };

  const saveExcelFile = async (workbook, fileName) => {
    try {
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), fileName);
      return true;
    } catch (error) {
      console.error("Excel indirme hatası: ", error);
      toast.error("Excel dosyası oluşturulurken bir hata oluştu.");
      return false;
    }
  };

  const formatDecimal = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).indexOf('.') === -1 ? String(value) + ',0' : String(value).replace('.', ',');
  };

  // Excel kolon tanımları
  const mmGtColumns = [
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
    { header: 'Çrp.Kt.1', key: 'crp_kt_1', width: 10 },
    { header: 'Çrp.Kt.2', key: 'crp_kt_2', width: 10 },
    { header: 'Kod-3', key: 'kod_3', width: 10 },
    { header: 'Kod-4', key: 'kod_4', width: 10 },
    { header: 'Kod-5', key: 'kod_5', width: 10 },
    { header: 'Peş.Fiy', key: 'pes_fiy', width: 12 },
    { header: 'Cri.Fiy', key: 'cri_fiy', width: 12 },
    { header: 'Lis.Fiy', key: 'lis_fiy', width: 12 },
    { header: 'Dov.Sat', key: 'dov_sat', width: 10 },
    { header: 'İhr.Fiy', key: 'ihr_fiy', width: 12 },
    { header: 'Dov.Alış', key: 'dov_alis', width: 10 },
    { header: 'K.D.V', key: 'kdv', width: 10 },
    { header: 'Raf', key: 'raf', width: 10 },
    { header: 'Desi/Kg', key: 'desi_kg', width: 10 },
    { header: 'Max', key: 'max', width: 10 },
    { header: 'Min', key: 'min', width: 10 },
    { header: 'Al.Sip', key: 'al_sip', width: 10 },
    { header: 'E.K.Noktası', key: 'ek_noktasi', width: 10 },
    { header: 'Gereksinim', key: 'gereksinim', width: 10 },
    { header: 'Em.Kts', key: 'em_kts', width: 10 },
    { header: 'Ka.Yön', key: 'ka_yon', width: 10 },
    { header: 'Kal.Yön', key: 'kal_yon', width: 10 },
    { header: 'Uzn.Boy', key: 'uzn_boy', width: 10 },
    { header: 'Gn.Boy', key: 'gn_boy', width: 10 },
    { header: 'Yük.Boy', key: 'yuk_boy', width: 10 },
    { header: 'Ö.S.1Say', key: 'ozel_saha_1_say', width: 12 },
    { header: 'Ö.S.1Carp', key: 'ozel_saha_1_carp', width: 12 },
    { header: 'Ö.S.2Say', key: 'ozel_saha_2_say', width: 12 },
    { header: 'Ö.S.3Say', key: 'ozel_saha_3_say', width: 12 },
    { header: 'Ö.S.4Say', key: 'ozel_saha_4_say', width: 12 },
    { header: 'Ö.S.5Say', key: 'ozel_saha_5_say', width: 12 },
    { header: 'Ö.S.6Say', key: 'ozel_saha_6_say', width: 12 },
    { header: 'Ö.S.7Say', key: 'ozel_saha_7_say', width: 12 },
    { header: 'Ö.S.8Say', key: 'ozel_saha_8_say', width: 12 },
    { header: 'Ö.S.9Say', key: 'ozel_saha_9_say', width: 12 },
    { header: 'Ö.S.10Say', key: 'ozel_saha_10_say', width: 12 },
    { header: 'Ö.A.1', key: 'ozel_alan_1', width: 12 },
    { header: 'Ö.A.2', key: 'ozel_alan_2', width: 12 },
    { header: 'Ö.A.3', key: 'ozel_alan_3', width: 12 },
    { header: 'Ö.A.4', key: 'ozel_alan_4', width: 12 },
    { header: 'Ö.A.5', key: 'ozel_alan_5', width: 12 },
    { header: 'Ö.A.6', key: 'ozel_alan_6', width: 12 },
    { header: 'Ö.A.7', key: 'ozel_alan_7', width: 12 },
    { header: 'Ö.A.8', key: 'ozel_alan_8', width: 12 },
    { header: 'Ö.A.9', key: 'ozel_alan_9', width: 12 },
    { header: 'Ö.A.10', key: 'ozel_alan_10', width: 12 },
    { header: 'Not 1', key: 'not_1', width: 20 },
    { header: 'Not 2', key: 'not_2', width: 20 },
    { header: 'Not 3', key: 'not_3', width: 20 },
    { header: 'Not 4', key: 'not_4', width: 20 },
    { header: 'Note 1', key: 'note_1', width: 20 },
    { header: 'Note 2', key: 'note_2', width: 20 },
    { header: 'Note 3', key: 'note_3', width: 20 },
    { header: 'Note 4', key: 'note_4', width: 20 },
    { header: 'Ürt.Çev.Sür', key: 'uretim_cevirim_suresi', width: 15 },
    { header: 'Parti Ol.Mi.', key: 'parti_olcum_miktari', width: 15 },
    { header: 'Fire Oranı', key: 'fire_orani', width: 15 },
    { header: 'İhtiyaç Hesabı', key: 'ihtiyac_hesabi', width: 15 },
    { header: 'Planlamaya Dâhil', key: 'planlamaya_dahil', width: 15 },
    { header: 'Y.Talep Oranı', key: 'y_talep_orani', width: 15 },
    { header: 'Raf Ölçüleri', key: 'raf_olculeri', width: 15 },
    { header: 'Kalite Not', key: 'kalite_not', width: 20 },
    { header: 'Açıklama', key: 'aciklama', width: 30 },
    { header: 'Etiket Kodu', key: 'etiket_kodu', width: 15 },
    { header: 'Etiket Metni', key: 'etiket_metni', width: 20 },
    { header: 'Etiket Metni (İng.)', key: 'etiket_metni_ing', width: 20 },
    { header: 'Dur.Tut.', key: 'dur_tut', width: 10 },
    { header: 'Hur.Sip', key: 'hur_sip', width: 10 },
    { header: 'Hur.Lot', key: 'hur_lot', width: 10 },
    { header: 'Sev.Onay', key: 'sev_onay', width: 10 },
    { header: 'Gün.End', key: 'gun_end', width: 10 },
    { header: 'Web.Onay', key: 'web_onay', width: 10 },
    { header: 'Mas.Merk', key: 'mas_merk', width: 10 },
    { header: 'Ok.Yaz.End.', key: 'ok_yaz_end', width: 15 },
    { header: 'Men.Ülk.', key: 'men_ulk', width: 10 },
    { header: 'G.T.İ.P', key: 'gtip', width: 15 },
    { header: 'Kilogram', key: 'kilogram', width: 10 },
    { header: 'GTIP Adı (T)', key: 'gtip_adi_t', width: 20 },
    { header: 'GTIP Adı (E)', key: 'gtip_adi_e', width: 20 },
    { header: 'GTIP Açk.', key: 'gtip_ack', width: 20 },
    { header: 'G-Servis', key: 'g_servis', width: 12 },
    { header: 'G-Kapasite', key: 'g_kapasite', width: 12 },
    { header: 'G-PozSatış', key: 'g_poz_satis', width: 12 },
    { header: 'G-Etiket', key: 'g_etiket', width: 12 },
    { header: 'G-Krlt', key: 'g_krlt', width: 12 },
    { header: 'Müş.Sip.Krl', key: 'mus_sip_krl', width: 15 },
    { header: 'E-Fat.Tipi', key: 'e_fat_tipi', width: 12 },
    { header: 'Vrs.Cd.', key: 'vrs_cd', width: 10 },
    { header: 'Sür.G-Grup', key: 'sur_g_grup', width: 12 },
    { header: 'Kur Cinsi', key: 'kur_cinsi', width: 12 },
    { header: 'Gümrük Değeri', key: 'gumruk_degeri', width: 15 },
    { header: 'Gümrük Birim', key: 'gumruk_birim', width: 15 },
    { header: 'Gümrük Kıymet', key: 'gumruk_kiymet', width: 15 },
    { header: 'Maliyet Yönt.', key: 'maliyet_yont', width: 15 },
    { header: 'Vergi Istisnası', key: 'vergi_istisnasi', width: 15 },
    { header: 'UTS Bil.', key: 'uts_bil', width: 12 },
    { header: 'Dur', key: 'dur', width: 8 },
    { header: 'Lot Tak', key: 'lot_tak', width: 12 },
    { header: 'G-Oto Üret', key: 'g_oto_uret', width: 12 },
    { header: 'KY Kuralı 1', key: 'ky_kurali_1', width: 12 },
    { header: 'KY Kuralı 2', key: 'ky_kurali_2', width: 12 },
    { header: 'KY Kuralı 3', key: 'ky_kurali_3', width: 12 },
    { header: 'KY Kuralı 4', key: 'ky_kurali_4', width: 12 },
    { header: 'KY Kuralı 5', key: 'ky_kurali_5', width: 12 },
    { header: 'Parti Büt.', key: 'parti_but', width: 12 },
    { header: 'Var. Analiz', key: 'var_analiz', width: 12 },
    { header: 'Men.Şeh.', key: 'men_seh', width: 12 },
    { header: 'Karş. Mas. Mrk', key: 'kars_mas_mrk', width: 15 },
    { header: 'Dep.Pos', key: 'dep_pos', width: 10 },
    { header: 'Teslim Lim.', key: 'teslim_lim', width: 12 },
  ];

  const receteColumns = [
    { header: 'Mamul Kodu(*)', key: 'mamul_kodu', width: 22 },
    { header: 'Reçete Top.', key: 'recete_top', width: 12 },
    { header: 'Fire Oranı (%)', key: 'fire_orani', width: 15 },
    { header: 'Oto.Reç.', key: 'oto_rec', width: 10 },
    { header: 'Ölçü Br.', key: 'olcu_br', width: 10 },
    { header: 'Sıra No(*)', key: 'sira_no', width: 10 },
    { header: 'Operasyon Bileşen', key: 'operasyon_bilesen', width: 18 },
    { header: 'Bileşen Kodu(*)', key: 'bilesen_kodu', width: 18 },
    { header: 'Ölçü Br. - Bileşen', key: 'olcu_br_bilesen', width: 18 },
    { header: 'Miktar(*)', key: 'miktar', width: 10 },
    { header: 'Açıklama', key: 'aciklama', width: 35 },
    { header: 'Miktar Sabitle', key: 'miktar_sabitle', width: 15 },
    { header: 'Seri Girilecek', key: 'seri_girilecek', width: 15 },
    { header: 'Alt Menü Üret', key: 'alt_menu_uret', width: 15 },
    { header: 'Talep Oluşacak', key: 'talep_olusacak', width: 15 },
    { header: 'İhtiyaç Değil', key: 'ihtiyac_degil', width: 15 },
    { header: 'Rota İstasyon No', key: 'rota_istasyon_no', width: 17 },
    { header: 'Hurda', key: 'hurda', width: 10 },
    { header: 'İlk Miktar(*)', key: 'ilk_miktar', width: 12 },
    { header: 'Son Miktar(*)', key: 'son_miktar', width: 12 },
    { header: 'Opr.Krl.', key: 'opr_krl', width: 10 },
    { header: 'Opr.Br.Kat', key: 'opr_br_kat', width: 12 },
    { header: 'Opr.Br.', key: 'opr_br', width: 10 },
    { header: 'F.M.Kar.Bel', key: 'fm_kar_bel', width: 12 },
    { header: 'Miktar Maliyet', key: 'miktar_maliyet', width: 15 },
    { header: 'Firma Alternatif', key: 'firma_alternatif', width: 17 },
  ];

  // Veri işleme yardımcı fonksiyonları
  const formatMmGtData = (mmGt) => ({
    stok_kodu: mmGt.stok_kodu,
    stok_adi: mmGt.stok_adi.replace(/(\d+)\.(\d+)/g, '$1,$2'),
    grup_kodu: '711', // MAMÜL - KANGAL
    kod_1: 'HASIR',
    kod_2: mmGt.kod_2, // ZN60 / ZN70 / ZN80 (kaplama türü)
    cari_satici_kodu: '',
    ingilizce_isim: (mmGt.stok_adi + ' WIRE').replace(/(\d+)\.(\d+)/g, '$1,$2'),
    satici_ismi: '',
    muh_detay: '411',
    depo_kodu: '131',
    br_1: 'KG',
    br_2: 'KG',
    crp_kt_1: '1',
    crp_kt_2: '1',
    kod_3: '',
    kod_4: '',
    kod_5: '',
    pes_fiy: '0',
    cri_fiy: '0',
    lis_fiy: '0',
    dov_sat: 'TRL',
    ihr_fiy: '0',
    dov_alis: 'TRL',
    kdv: '10',
    raf: '',
    desi_kg: '0',
    max: '999999',
    min: '0',
    al_sip: '',
    ek_noktasi: '',
    gereksinim: '0',
    em_kts: '1', // Emniyet katsayısı
    ka_yon: '1', // Kalite yönetimi
    kal_yon: '1', // Kalınlık oranı?
    uzn_boy: '0',
    gn_boy: '0',
    yuk_boy: '0',
    ozel_saha_1_say: formatDecimal(mmGt.cap),
    ozel_saha_1_carp: '',
    ozel_saha_2_say: formatDecimal(mmGt.kaplama),
    ozel_saha_3_say: formatDecimal(mmGt.min_mukavemet),
    ozel_saha_4_say: formatDecimal(mmGt.max_mukavemet),
    ozel_saha_5_say: formatDecimal(mmGt.tolerans_plus),
    ozel_saha_6_say: formatDecimal(mmGt.tolerans_minus),
    ozel_saha_7_say: '',
    ozel_saha_8_say: '',
    ozel_saha_9_say: '',
    ozel_saha_10_say: '',
    ozel_alan_1: mmGt.stok_kodu, // ÇAP
    ozel_alan_2: '', // KATKI
    ozel_alan_3: '', // MENŞE-PAKET TİPİ
    ozel_alan_4: '', // ISIL İŞLEM
    ozel_alan_5: '', // ANKARA
    ozel_alan_6: mmGt.stok_kodu,
    ozel_alan_7: '', // STOK ADI
    ozel_alan_8: '', // MENŞE
    ozel_alan_9: '', // REZERVE EDİLECEK
    ozel_alan_10: '', // PARTI NO
    not_1: 'ÇAP: ' + formatDecimal(mmGt.cap),
    not_2: 'KAPLAMA GR/M2: ' + formatDecimal(mmGt.kaplama),
    not_3: 'MİN MUKAVEMET: ' + formatDecimal(mmGt.min_mukavemet),
    not_4: 'MAX MUKAVEMET: ' + formatDecimal(mmGt.max_mukavemet),
    note_1: 'DIAMETER: ' + formatDecimal(mmGt.cap),
    note_2: 'COATING GR/M2: ' + formatDecimal(mmGt.kaplama),
    note_3: 'MIN STRENGTH: ' + formatDecimal(mmGt.min_mukavemet),
    note_4: 'MAX STRENGTH: ' + formatDecimal(mmGt.max_mukavemet),
    uretim_cevirim_suresi: '0',
    parti_olcum_miktari: '0',
    fire_orani: '0',
    ihtiyac_hesabi: '0',
    planlamaya_dahil: 'E',
    y_talep_orani: '1',
    raf_olculeri: '',
    kalite_not: '',
    aciklama: '',
    etiket_kodu: '',
    etiket_metni: '',
    etiket_metni_ing: '',
    dur_tut: '0',
    hur_sip: '0',
    hur_lot: '0',
    sev_onay: '0',
    gun_end: '0',
    web_onay: '0',
    mas_merk: '',
    ok_yaz_end: '0',
    men_ulk: 'TR',
    gtip: '72172030000000',
    kilogram: '1',
    gtip_adi_t: 'GALVANİZLİ DEMİR/ÇELİK TELLER',
    gtip_adi_e: 'GALVANIZED IRON/STEEL WIRE',
    gtip_ack: 'Karbon < %0.25, 0.8mm < çap < 1.5mm',
    g_servis: '0',
    g_kapasite: '0',
    g_poz_satis: '0',
    g_etiket: '0',
    g_krlt: '0',
    mus_sip_krl: '0',
    e_fat_tipi: '',
    vrs_cd: '0',
    sur_g_grup: '',
    kur_cinsi: '',
    gumruk_degeri: '0',
    gumruk_birim: '',
    gumruk_kiymet: '0',
    maliyet_yont: '',
    vergi_istisnasi: '',
    uts_bil: '0',
    dur: 'A',
    lot_tak: '1',
    g_oto_uret: '0',
    ky_kurali_1: '0',
    ky_kurali_2: '0',
    ky_kurali_3: '0',
    ky_kurali_4: '0',
    ky_kurali_5: '0',
    parti_but: '0',
    var_analiz: '0',
    men_seh: '',
    kars_mas_mrk: '',
    dep_pos: '0',
    teslim_lim: '0',
  });

  const formatYmGtData = (ymGt) => ({
    stok_kodu: ymGt.stok_kodu,
    stok_adi: ymGt.stok_adi.replace(/^Galvanizli/, 'YM Galvanizli').replace(/(\d+)\.(\d+)/g, '$1,$2'),
    grup_kodu: '731', // YARI MAMÜL - KANGAL
    kod_1: 'HASIR',
    kod_2: ymGt.kod_2, // ZN60 / ZN70 / ZN80 (kaplama türü)
    cari_satici_kodu: '',
    ingilizce_isim: (ymGt.stok_adi + ' WIRE').replace(/^Galvanizli/, 'YM Galvanizli').replace(/(\d+)\.(\d+)/g, '$1,$2'),
    satici_ismi: '',
    muh_detay: '411',
    depo_kodu: '131',
    br_1: 'KG',
    br_2: 'KG',
    crp_kt_1: '1',
    crp_kt_2: '1',
    kod_3: '',
    kod_4: '',
    kod_5: '',
    pes_fiy: '0',
    cri_fiy: '0',
    lis_fiy: '0',
    dov_sat: 'TRL',
    ihr_fiy: '0',
    dov_alis: 'TRL',
    kdv: '10',
    raf: '',
    desi_kg: '0',
    max: '0',
    min: '0',
    al_sip: '',
    ek_noktasi: '',
    gereksinim: '0',
    em_kts: '1',
    ka_yon: '1',
    kal_yon: '1',
    uzn_boy: '0',
    gn_boy: '0',
    yuk_boy: '0',
    ozel_saha_1_say: formatDecimal(ymGt.cap),
    ozel_saha_1_carp: '',
    ozel_saha_2_say: formatDecimal(ymGt.kaplama),
    ozel_saha_3_say: formatDecimal(ymGt.min_mukavemet),
    ozel_saha_4_say: formatDecimal(ymGt.max_mukavemet),
    ozel_saha_5_say: formatDecimal(ymGt.tolerans_plus),
    ozel_saha_6_say: formatDecimal(ymGt.tolerans_minus),
    ozel_saha_7_say: '',
    ozel_saha_8_say: '',
    ozel_saha_9_say: '',
    ozel_saha_10_say: '',
    ozel_alan_1: ymGt.stok_kodu,
    ozel_alan_2: '',
    ozel_alan_3: '',
    ozel_alan_4: '',
    ozel_alan_5: '',
    ozel_alan_6: ymGt.stok_kodu,
    ozel_alan_7: '',
    ozel_alan_8: '',
    ozel_alan_9: '',
    ozel_alan_10: '',
    not_1: 'ÇAP: ' + formatDecimal(ymGt.cap),
    not_2: 'KAPLAMA GR/M2: ' + formatDecimal(ymGt.kaplama),
    not_3: 'MİN MUKAVEMET: ' + formatDecimal(ymGt.min_mukavemet),
    not_4: 'MAX MUKAVEMET: ' + formatDecimal(ymGt.max_mukavemet),
    note_1: 'DIAMETER: ' + formatDecimal(ymGt.cap),
    note_2: 'COATING GR/M2: ' + formatDecimal(ymGt.kaplama),
    note_3: 'MIN STRENGTH: ' + formatDecimal(ymGt.min_mukavemet),
    note_4: 'MAX STRENGTH: ' + formatDecimal(ymGt.max_mukavemet),
    uretim_cevirim_suresi: '0',
    parti_olcum_miktari: '0',
    fire_orani: '0',
    ihtiyac_hesabi: '0',
    planlamaya_dahil: '',
    y_talep_orani: '1',
    raf_olculeri: '',
    kalite_not: '',
    aciklama: '',
    etiket_kodu: '',
    etiket_metni: '',
    etiket_metni_ing: '',
    dur_tut: '0',
    hur_sip: '0',
    hur_lot: '0',
    sev_onay: '0',
    gun_end: '0',
    web_onay: '0',
    mas_merk: '',
    ok_yaz_end: '0',
    men_ulk: 'TR',
    gtip: '72172030000000',
    kilogram: '1',
    gtip_adi_t: 'GALVANİZLİ DEMİR/ÇELİK TELLER',
    gtip_adi_e: 'GALVANIZED IRON/STEEL WIRE',
    gtip_ack: 'Karbon < %0.25, 0.8mm < çap < 1.5mm',
    g_servis: '0',
    g_kapasite: '0',
    g_poz_satis: '0',
    g_etiket: '0',
    g_krlt: '0',
    mus_sip_krl: '0',
    e_fat_tipi: '',
    vrs_cd: '0',
    sur_g_grup: '',
    kur_cinsi: '',
    gumruk_degeri: '0',
    gumruk_birim: '',
    gumruk_kiymet: '0',
    maliyet_yont: '',
    vergi_istisnasi: '',
    uts_bil: '0',
    dur: 'A',
    lot_tak: '1',
    g_oto_uret: '0',
    ky_kurali_1: '0',
    ky_kurali_2: '0',
    ky_kurali_3: '0',
    ky_kurali_4: '0',
    ky_kurali_5: '0',
    parti_but: '0',
    var_analiz: '0',
    men_seh: '',
    kars_mas_mrk: '',
    dep_pos: '0',
    teslim_lim: '0',
  });

  const formatYmStData = (ymSt) => {
    // ÇAP değerine göre Özel Saha1 değerini ayarla
    let ozelSaha1Say = 0;
    const capValue = parseFloat(ymSt.cap);

    if (capValue < 2) {
      ozelSaha1Say = 1;
    } else if (capValue < 3) {
      ozelSaha1Say = 2;
    } else if (capValue < 4) {
      ozelSaha1Say = 3;
    } else if (capValue < 5) {
      ozelSaha1Say = 4;
    } else if (capValue < 6) {
      ozelSaha1Say = 5;
    } else if (capValue < 7) {
      ozelSaha1Say = 6;
    } else if (capValue < 8) {
      ozelSaha1Say = 7;
    } else if (capValue < 9) {
      ozelSaha1Say = 8;
    } else if (capValue < 10) {
      ozelSaha1Say = 9;
    } else {
      ozelSaha1Say = 10;
    }

    return {
      stok_kodu: ymSt.stok_kodu,
      stok_adi: ymSt.stok_adi.startsWith('YM Siyah Tel') ? ymSt.stok_adi : `YM Siyah Tel ${ymSt.stok_kodu.substring(6, 10)} mm HM:${ymSt.stok_kodu.substring(11, 22)}`,
      grup_kodu: '731', // YARI MAMÜL - KANGAL
      kod_1: 'HASIR',
      kod_2: 'ST', // Siyah Tel
      cari_satici_kodu: '',
      ingilizce_isim: (ymSt.stok_adi.startsWith('YM Siyah Tel') ? ymSt.stok_adi : `YM Siyah Tel ${ymSt.stok_kodu.substring(6, 10)} mm HM:${ymSt.stok_kodu.substring(11, 22)}`) + ' WIRE',
      satici_ismi: '',
      muh_detay: '411',
      depo_kodu: '131',
      br_1: 'KG',
      br_2: 'KG',
      crp_kt_1: '1',
      crp_kt_2: '1',
      kod_3: '',
      kod_4: '',
      kod_5: '',
      pes_fiy: '0',
      cri_fiy: '0',
      lis_fiy: '0',
      dov_sat: 'TRL',
      ihr_fiy: '0',
      dov_alis: 'TRL',
      kdv: '10',
      raf: '',
      desi_kg: '0',
      max: '0',
      min: '0',
      al_sip: '',
      ek_noktasi: '',
      gereksinim: '0',
      em_kts: '1',
      ka_yon: '1',
      kal_yon: '1',
      uzn_boy: '0',
      gn_boy: '0',
      yuk_boy: '0',
      ozel_saha_1_say: ozelSaha1Say,
      ozel_saha_1_carp: '',
      ozel_saha_2_say: '',
      ozel_saha_3_say: formatDecimal(ymSt.min_mukavemet),
      ozel_saha_4_say: formatDecimal(ymSt.max_mukavemet),
      ozel_saha_5_say: '',
      ozel_saha_6_say: '',
      ozel_saha_7_say: '',
      ozel_saha_8_say: '',
      ozel_saha_9_say: '',
      ozel_saha_10_say: '',
      ozel_alan_1: ymSt.stok_kodu,
      ozel_alan_2: '',
      ozel_alan_3: '',
      ozel_alan_4: '',
      ozel_alan_5: '',
      ozel_alan_6: ymSt.stok_kodu,
      ozel_alan_7: '',
      ozel_alan_8: '',
      ozel_alan_9: '',
      ozel_alan_10: '',
      not_1: 'ÇAP: ' + formatDecimal(ymSt.cap),
      not_2: '',
      not_3: 'MİN MUKAVEMET: ' + formatDecimal(ymSt.min_mukavemet),
      not_4: 'MAX MUKAVEMET: ' + formatDecimal(ymSt.max_mukavemet),
      note_1: 'DIAMETER: ' + formatDecimal(ymSt.cap),
      note_2: '',
      note_3: 'MIN STRENGTH: ' + formatDecimal(ymSt.min_mukavemet),
      note_4: 'MAX STRENGTH: ' + formatDecimal(ymSt.max_mukavemet),
      uretim_cevirim_suresi: '0',
      parti_olcum_miktari: '0',
      fire_orani: '0',
      ihtiyac_hesabi: '0',
      planlamaya_dahil: '',
      y_talep_orani: '1',
      raf_olculeri: '',
      kalite_not: '',
      aciklama: '',
      etiket_kodu: '',
      etiket_metni: '',
      etiket_metni_ing: '',
      dur_tut: '0',
      hur_sip: '0',
      hur_lot: '0',
      sev_onay: '0',
      gun_end: '0',
      web_onay: '0',
      mas_merk: '',
      ok_yaz_end: '0',
      men_ulk: 'TR',
      gtip: '72171080000000',
      kilogram: '1',
      gtip_adi_t: 'DEMİR/ÇELİK TELLER-KAPLANMAMIŞ',
      gtip_adi_e: 'IRON/STEEL WIRE-NOT COATED',
      gtip_ack: 'Karbon < %0.25, 0.8mm < çap',
      g_servis: '0',
      g_kapasite: '0',
      g_poz_satis: '0',
      g_etiket: '0',
      g_krlt: '0',
      mus_sip_krl: '0',
      e_fat_tipi: '',
      vrs_cd: '0',
      sur_g_grup: '',
      kur_cinsi: '',
      gumruk_degeri: '0',
      gumruk_birim: '',
      gumruk_kiymet: '0',
      maliyet_yont: '',
      vergi_istisnasi: '',
      uts_bil: '0',
      dur: 'A',
      lot_tak: '1',
      g_oto_uret: '0',
      ky_kurali_1: '0',
      ky_kurali_2: '0',
      ky_kurali_3: '0',
      ky_kurali_4: '0',
      ky_kurali_5: '0',
      parti_but: '0',
      var_analiz: '0',
      men_seh: '',
      kars_mas_mrk: '',
      dep_pos: '0',
      teslim_lim: '0',
    };
  };

  const createStokKartiExcel = async (mmGt, ymGt, ymStList) => {
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook();

    // Sayfaları oluştur ve kolon tanımlarını ayarla
    const mmGtSheet = setupWorksheet(workbook, 'MM GT', mmGtColumns);
    const ymGtSheet = setupWorksheet(workbook, 'YM GT', mmGtColumns);
    const ymStSheet = setupWorksheet(workbook, 'YM ST', mmGtColumns);

    try {
      // MM GT verisini ekle
      mmGtSheet.addRow(formatMmGtData(mmGt));

      // YM GT verisini ekle
      ymGtSheet.addRow(formatYmGtData(ymGt));

      // YM ST verilerini ekle
      for (const ymSt of ymStList) {
        ymStSheet.addRow(formatYmStData(ymSt));
      }

      // Stilleri uygula
      applyWorksheetStyles([mmGtSheet, ymGtSheet, ymStSheet]);

      // Excel'i indir
      return await saveExcelFile(workbook, `StokKarti_${mmGt.stok_kodu.replace(/\./g, '_')}.xlsx`);
    } catch (error) {
      console.error("Excel oluşturulurken hata: ", error);
      toast.error("Excel dosyası oluşturulurken bir hata oluştu.");
      return false;
    }
  };

const createReceteExcel = async (mmGt, ymGt, ymStList) => {
  // Excel workbook oluştur
  const workbook = new ExcelJS.Workbook();

  // ============== MM GT REÇETE SAYFASI (tam olarak 8 satır) ==============
  const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');

  // MM GT REÇETE başlıkları - tam formattan alındı
  mmGtReceteSheet.columns = [
    { header: 'Mamul Kodu(*)', key: 'mamul_kodu', width: 22 },
    { header: 'Reçete Top.', key: 'recete_top', width: 12 },
    { header: 'Fire Oranı (%)', key: 'fire_orani', width: 15 },
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

  try {
    // Veritabanından MM GT reçete verilerini almayı dene
    const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
    let mmGtReceteData = [];
    
    if (mmGtReceteRes && mmGtReceteRes.ok) {
      const data = await mmGtReceteRes.json();
      if (Array.isArray(data) && data.length > 0) {
        mmGtReceteData = data;
      }
    }
    
    // MM GT Stok Kodu
    const mmGtStokKodu = mmGt.stok_kodu || `GT.${formValues.kod_2}.${parseFloat(formValues.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
    
    if (mmGtReceteData.length === 8) {
      // Veritabanından tam 8 satır varsa direkt olarak ekle
      mmGtReceteData.forEach(item => {
        mmGtReceteSheet.addRow({
          mamul_kodu: item.mamul_kodu,
          recete_top: item.recete_top,
          fire_orani: item.fire_orani,
          oto_rec: item.oto_rec || "",
          olcu_br: item.olcu_br,
          sira_no: item.sira_no,
          operasyon_bilesen: item.operasyon_bilesen,
          bilesen_kodu: item.bilesen_kodu,
          olcu_br_bilesen: item.olcu_br_bilesen,
          miktar: item.miktar,
          aciklama: item.aciklama || "",
          miktar_sabitle: item.miktar_sabitle || "",
          stok_maliyet: item.stok_maliyet || "",
          fire_mik: item.fire_mik || "",
          sabit_fire_mik: item.sabit_fire_mik || "",
          istasyon_kodu: item.istasyon_kodu || "",
          hazirlik_suresi: item.hazirlik_suresi || "",
          uretim_suresi: item.uretim_suresi || "",
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
    } else {
      // Tam 8 satırlı MM GT reçetesi oluştur - sağlanan örneğe göre
      
      // 1. Satır - YM GT
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: '1',
        fire_orani: '0.0004',
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: '1',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: ymGt.stok_kodu,
        olcu_br_bilesen: '1',
        miktar: '1',
        aciklama: 'Galvanizli Tel Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 2. Satır - GTPKT01
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: '1',
        fire_orani: '0.0004',
        oto_rec: '',
        olcu_br: 'DK',
        sira_no: '2',
        operasyon_bilesen: 'Operasyon',
        bilesen_kodu: 'GTPKT01',
        olcu_br_bilesen: '1',
        miktar: '0.0125',
        aciklama: 'Paketleme Operasyonu',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '0.0125',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 3. Satır - AMB.ÇEM.KARTON.GAL
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: '1',
        fire_orani: '0.0004',
        oto_rec: '',
        olcu_br: 'AD',
        sira_no: '3',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: 'AMB.ÇEM.KARTON.GAL',
        olcu_br_bilesen: '1',
        miktar: '0.01',
        aciklama: 'Karton Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 4. Satır - AMB.SHRINK
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: '1',
        fire_orani: '0.0004',
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: '4',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: mmGt.amb_shrink || 'AMB.SHRİNK.200*140CM',
        olcu_br_bilesen: '1',
        miktar: '0.00125',
        aciklama: 'Naylon Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 5. Satır - Kaldırma Kancası
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: '1',
        fire_orani: '0.0004',
        oto_rec: '',
        olcu_br: 'AD',
        sira_no: '5',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: 'SM.7MMHALKA',
        olcu_br_bilesen: '1',
        miktar: '0.005',
        aciklama: 'Kaldırma Kancası Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 6. Satır - Çelik Çember
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: '1',
        fire_orani: '0.0004',
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: '6',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: 'AMB.APEX CEMBER 38X080',
        olcu_br_bilesen: '1',
        miktar: '0.0015',
        aciklama: 'Çelik çember Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 7. Satır - Çember Tokası
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: '1',
        fire_orani: '0.0004',
        oto_rec: '',
        olcu_br: 'AD',
        sira_no: '7',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: 'AMB.TOKA.SIGNODE.114P. DKP',
        olcu_br_bilesen: '1',
        miktar: '0.005',
        aciklama: 'Çember Tokası Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 8. Satır - Slikajel
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: '1',
        fire_orani: '0.0004',
        oto_rec: '',
        olcu_br: 'AD',
        sira_no: '8',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: 'SM.DESİ.PAK',
        olcu_br_bilesen: '1',
        miktar: '0.00125',
        aciklama: 'Slikajel Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
    }
  } catch (error) {
    console.warn('MM GT Reçete Excel oluşturma hatası:', error);
    
    // Hata durumunda minimum bir satır ekle
    const mmGtStokKodu = mmGt.stok_kodu || `GT.${formValues.kod_2}.${parseFloat(formValues.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
    mmGtReceteSheet.addRow({
      mamul_kodu: mmGtStokKodu,
      recete_top: '1',
      fire_orani: '0.0004',
      olcu_br: 'KG',
      sira_no: '1',
      operasyon_bilesen: 'Bileşen',
      bilesen_kodu: ymGt.stok_kodu,
      olcu_br_bilesen: '1',
      miktar: '1',
      aciklama: 'Galvanizli Tel Tüketim Miktarı',
      ua_dahil_edilsin: 'evet',
      son_operasyon: 'evet'
    });
  }

  // ============== YM GT REÇETE SAYFASI (tam olarak 4 satır) ==============
  const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');

  // YM GT REÇETE başlıkları - aynı başlıkları kullan
  ymGtReceteSheet.columns = [...mmGtReceteSheet.columns];

  try {
    // Veritabanından YM GT reçete verilerini almayı dene
    const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
    let ymGtReceteData = [];
    
    if (ymGtReceteRes && ymGtReceteRes.ok) {
      const data = await ymGtReceteRes.json();
      if (Array.isArray(data) && data.length > 0) {
        // Veritabanı verilerini kullan, ancak toplam 4 satır olmalı
        ymGtReceteData = data.slice(0, 4);
      }
    }
    
    // YM GT Stok Kodu
    const ymGtStokKodu = ymGt.stok_kodu || `YM.GT.${formValues.kod_2}.${parseFloat(formValues.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
    
    if (ymGtReceteData.length === 4) {
      // Veritabanından tam 4 satır varsa direkt olarak ekle
      ymGtReceteData.forEach(item => {
        ymGtReceteSheet.addRow({
          mamul_kodu: item.mamul_kodu,
          recete_top: item.recete_top,
          fire_orani: item.fire_orani || 0,
          oto_rec: item.oto_rec || "",
          olcu_br: item.olcu_br,
          sira_no: item.sira_no,
          operasyon_bilesen: item.operasyon_bilesen,
          bilesen_kodu: item.bilesen_kodu,
          olcu_br_bilesen: item.olcu_br_bilesen,
          miktar: item.miktar,
          aciklama: item.aciklama || "",
          miktar_sabitle: item.miktar_sabitle || "",
          stok_maliyet: item.stok_maliyet || "",
          fire_mik: item.fire_mik || "",
          sabit_fire_mik: item.sabit_fire_mik || "",
          istasyon_kodu: item.istasyon_kodu || "",
          hazirlik_suresi: item.hazirlik_suresi || "",
          uretim_suresi: item.uretim_suresi || "",
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
    } else {
      // 4 satırlı YM GT reçetesi oluştur - örneğe göre tam format
      
      // 1. Satır - YM ST
      ymGtReceteSheet.addRow({
        mamul_kodu: ymGtStokKodu,
        recete_top: '1',
        fire_orani: '0',
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: '1',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: ymStList && ymStList.length > 0 ? ymStList[0].stok_kodu : 'YM.ST.0245.0600.1006',
        olcu_br_bilesen: '1',
        miktar: '1',
        aciklama: 'Galvanizli Tel Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: '',
        son_operasyon: '',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 2. Satır - Galvanizleme Operasyonu
      ymGtReceteSheet.addRow({
        mamul_kodu: ymGtStokKodu,
        recete_top: '1',
        fire_orani: '0',
        oto_rec: '',
        olcu_br: 'DK',
        sira_no: '2',
        operasyon_bilesen: 'Operasyon',
        bilesen_kodu: 'GLV01',
        olcu_br_bilesen: '1',
        miktar: '0.463417487',
        aciklama: 'Galvanizleme Operasyonu',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '0.463417487',
        ua_dahil_edilsin: '',
        son_operasyon: '',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 3. Satır - Çinko
      ymGtReceteSheet.addRow({
        mamul_kodu: ymGtStokKodu,
        recete_top: '1',
        fire_orani: '0',
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: '3',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: '150 03',
        olcu_br_bilesen: '1',
        miktar: '0.060580828',
        aciklama: 'Çinko Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: '',
        son_operasyon: '',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 4. Satır - Asit
      ymGtReceteSheet.addRow({
        mamul_kodu: ymGtStokKodu,
        recete_top: '1',
        fire_orani: '0',
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: '4',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: 'SM.HİDROLİK.ASİT',
        olcu_br_bilesen: '1',
        miktar: '0.005714286',
        aciklama: 'Asit Tüketim Miktarı',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: '',
        son_operasyon: '',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
    }
  } catch (error) {
    console.warn('YM GT Reçete Excel oluşturma hatası:', error);
    
    // Hata durumunda minimum bir satır ekle
    const ymGtStokKodu = ymGt.stok_kodu || `YM.GT.${formValues.kod_2}.${parseFloat(formValues.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
    ymGtReceteSheet.addRow({
      mamul_kodu: ymGtStokKodu,
      recete_top: '1',
      fire_orani: '0',
      olcu_br: 'KG',
      sira_no: '1',
      operasyon_bilesen: 'Bileşen',
      bilesen_kodu: ymStList && ymStList.length > 0 ? ymStList[0].stok_kodu : 'YM.ST.0245.0600.1006',
      olcu_br_bilesen: '1',
      miktar: '1',
      aciklama: 'Galvanizli Tel Tüketim Miktarı',
    });
  }

  // ============== YM ST REÇETE SAYFASI (her YM ST için tam olarak 2 satır) ==============
  const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');

  // YM ST REÇETE başlıkları - aynı başlıkları kullan
  ymStReceteSheet.columns = [...mmGtReceteSheet.columns];

  // Her YM ST için tam 2 satır reçete verisi
  for (const ymSt of ymStList) {
    try {
      let ymStReceteData = [];
      
      // Veritabanına kaydedilmiş YM ST'ler için reçete verilerini al
      if (ymSt.id) {
        const ymStReceteRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
        if (ymStReceteRes && ymStReceteRes.ok) {
          const data = await ymStReceteRes.json();
          if (Array.isArray(data) && data.length === 2) {
            ymStReceteData = data;
          }
        }
      }
      
      // YM ST stok kodu
      const ymStStokKodu = ymSt.stok_kodu || `YM.ST.${parseFloat(ymSt.cap).toFixed(2).replace('.', '').padStart(4, '0')}.${ymSt.filmasin || '0800'}.${ymSt.quality || '1010'}`;
      
      if (ymStReceteData.length === 2) {
        // Veritabanından tam 2 satır varsa direkt olarak ekle
        ymStReceteData.forEach(item => {
          ymStReceteSheet.addRow({
            mamul_kodu: item.mamul_kodu,
            recete_top: item.recete_top || '1',
            fire_orani: item.fire_orani || '',
            oto_rec: item.oto_rec || '',
            olcu_br: item.olcu_br || 'KG',
            sira_no: item.sira_no,
            operasyon_bilesen: item.operasyon_bilesen,
            bilesen_kodu: item.bilesen_kodu,
            olcu_br_bilesen: item.olcu_br_bilesen || '1',
            miktar: item.miktar,
            aciklama: item.aciklama || "",
            miktar_sabitle: item.miktar_sabitle || "",
            stok_maliyet: item.stok_maliyet || "",
            fire_mik: item.fire_mik || "",
            sabit_fire_mik: item.sabit_fire_mik || "",
            istasyon_kodu: item.istasyon_kodu || "",
            hazirlik_suresi: item.hazirlik_suresi || "",
            uretim_suresi: item.uretim_suresi || "",
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
      } else {
        // 2 satırlı YM ST reçetesi oluştur - örneğe göre tam format
        
        // 1. Satır - Filmaşin Tüketimi
        ymStReceteSheet.addRow({
          mamul_kodu: ymStStokKodu,
          recete_top: '1',
          fire_orani: '',
          oto_rec: '',
          olcu_br: 'KG',
          sira_no: '1',
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: `FLM.${ymSt.filmasin || '0800'}.${ymSt.quality || '1010'}`,
          olcu_br_bilesen: '1',
          miktar: '1',
          aciklama: 'Filmaşin Tüketimi',
          miktar_sabitle: '',
          stok_maliyet: '',
          fire_mik: '',
          sabit_fire_mik: '',
          istasyon_kodu: '',
          hazirlik_suresi: '',
          uretim_suresi: '',
          ua_dahil_edilsin: '',
          son_operasyon: '',
          oncelik: '',
          planlama_orani: '',
          alt_pol_da_transfer: '',
          alt_pol_ambar_cikis: '',
          alt_pol_uretim_kaydi: '',
          alt_pol_mrp: '',
          ic_dis: ''
        });
        
        // 2. Satır - Tel Çekme Operasyonu
        ymStReceteSheet.addRow({
          mamul_kodu: ymStStokKodu,
          recete_top: '1',
          fire_orani: '',
          oto_rec: '',
          olcu_br: 'DK',
          sira_no: '2',
          operasyon_bilesen: 'Operasyon',
          bilesen_kodu: 'TLC01',
          olcu_br_bilesen: '1',
          miktar: '0.022986979',
          aciklama: 'Tel Çekme Operasyonu',
          miktar_sabitle: '',
          stok_maliyet: '',
          fire_mik: '',
          sabit_fire_mik: '',
          istasyon_kodu: '',
          hazirlik_suresi: '',
          uretim_suresi: '0.022986979',
          ua_dahil_edilsin: '',
          son_operasyon: '',
          oncelik: '',
          planlama_orani: '',
          alt_pol_da_transfer: '',
          alt_pol_ambar_cikis: '',
          alt_pol_uretim_kaydi: '',
          alt_pol_mrp: '',
          ic_dis: ''
        });
      }
    } catch (error) {
      console.warn(`YM ST Reçete Excel oluşturma hatası (${ymSt.stok_kodu}):`, error);
      
      // Hata durumunda örnek satırlar ekle
      const ymStStokKodu = ymSt.stok_kodu || `YM.ST.${parseFloat(ymSt.cap).toFixed(2).replace('.', '').padStart(4, '0')}.${ymSt.filmasin || '0800'}.${ymSt.quality || '1010'}`;
      
      // 1. Satır - Filmaşin Tüketimi
      ymStReceteSheet.addRow({
        mamul_kodu: ymStStokKodu,
        recete_top: '1',
        olcu_br: 'KG',
        sira_no: '1',
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: `FLM.${ymSt.filmasin || '0800'}.${ymSt.quality || '1010'}`,
        olcu_br_bilesen: '1',
        miktar: '1',
        aciklama: 'Filmaşin Tüketimi'
      });
      
      // 2. Satır - Tel Çekme Operasyonu
      ymStReceteSheet.addRow({
        mamul_kodu: ymStStokKodu,
        recete_top: '1',
        olcu_br: 'DK',
        sira_no: '2',
        operasyon_bilesen: 'Operasyon',
        bilesen_kodu: 'TLC01',
        olcu_br_bilesen: '1',
        miktar: '0.022986979',
        aciklama: 'Tel Çekme Operasyonu',
        uretim_suresi: '0.022986979'
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
  saveAs(new Blob([buffer]), `Recete_${mmGt.stok_kodu ? mmGt.stok_kodu.replace(/\./g, '_') : 'new_recipe'}.xlsx`);

  return true;
};
  // Excel oluşturma fonksiyonu
  const generateExcel = async (mmGtId) => {
    setLoading(true);
    setError(null);
    
    try {
      // Yükleniyor bildirimi
      toast.info('Excel dosyaları oluşturuluyor...', {
        autoClose: false,
        toastId: 'generate-excel'
      });
      
      // MM GT verisini al
      const mmGtRes = await fetchWithAuth(`${API_URLS.galMmGt}?id=${mmGtId}`);
      
      if (!mmGtRes.ok) {
        throw new Error('MM GT verisi alınamadı');
      }
      
      const mmGtData = await mmGtRes.json();
      
      let mmGt;
      if (Array.isArray(mmGtData) && mmGtData.length > 0) {
        mmGt = mmGtData[0];
      } else if (mmGtData && mmGtData.id) {
        mmGt = mmGtData;
      } else {
        throw new Error('MM GT bulunamadı');
      }

      // YM GT verisini al
      const ymGtRes = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${mmGtId}`);
      
      if (!ymGtRes.ok) {
        throw new Error('YM GT verisi alınamadı');
      }
      
      const ymGtData = await ymGtRes.json();
      
      let ymGt;
      if (Array.isArray(ymGtData) && ymGtData.length > 0) {
        ymGt = ymGtData[0];
      } else if (ymGtData && ymGtData.id) {
        ymGt = ymGtData;
      } else {
        throw new Error('YM GT bulunamadı');
      }

      // YM ST ilişkilerini al
      const ymStRelRes = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGtId}`);
      
      if (!ymStRelRes.ok) {
        throw new Error('YM ST ilişkileri alınamadı');
      }
      
      const ymStRelData = await ymStRelRes.json();
      
      if (!Array.isArray(ymStRelData) || ymStRelData.length === 0) {
        throw new Error('İlişkili YM ST bulunamadı');
      }
      
      const ymStIds = ymStRelData.map(rel => rel.ym_st_id);

      // YM ST detaylarını al
      const ymStDetails = [];
      
      for (const ymStId of ymStIds) {
        const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
        
        if (ymStRes.ok) {
          const ymStData = await ymStRes.json();
          
          if (Array.isArray(ymStData) && ymStData.length > 0) {
            ymStDetails.push(ymStData[0]);
          } else if (ymStData && ymStData.id) {
            ymStDetails.push(ymStData);
          }
        }
      }
      
      if (ymStDetails.length === 0) {
        throw new Error('YM ST verileri bulunamadı');
      }

      // Reçete verilerini kontrol et ve gerekirse oluştur
      await checkAndCreateRecipes(mmGt, ymGt, ymStDetails);

      // Excel dosyalarını oluştur
      await createStokKartiExcel(mmGt, ymGt, ymStDetails);
      await createReceteExcel(mmGt, ymGt, ymStDetails);

      toast.dismiss('generate-excel');
      setSuccessMessage('Excel dosyaları başarıyla oluşturuldu');
      toast.success('Excel dosyaları başarıyla oluşturuldu');
      return true;
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast.dismiss('generate-excel');
      setError('Excel oluşturulurken bir hata oluştu: ' + error.message);
      toast.error('Excel oluşturulurken bir hata oluştu: ' + error.message);
      return false;
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
    talepList, setTalepList,
    talepCount, setTalepCount,
    selectedTalep, setSelectedTalep,
    fetchTalepList,
    fetchTalepCount,
    fetchTalepDetails,
    approveTalep,
    rejectTalep,
    searchProducts,
    saveMMGT,
    saveYMGT,
    saveYMST,
    saveRecete,
    generateExcel,
    autoSelectYmSt,
    calculateReceteValues,
    processAutomaticCalculations,
    getCurrentSequence,
    incrementSequence,
    fetchProductDatabase,
    deleteProduct,
    checkProductExists,
    loadYmStList,
    createStokKartiExcel,
    createReceteExcel
  };

  // İlk yüklemede veritabanını, YM ST listesini ve talepleri getir
  useEffect(() => {
    fetchProductDatabase();
    loadYmStList();
    fetchTalepList();
  }, [fetchProductDatabase, loadYmStList, fetchTalepList]);

  return (
    <GalvanizliTelContext.Provider value={contextValue}>
      {children}
    </GalvanizliTelContext.Provider>
  );
};


// GalvanizliTelNetsis Bileşeni - Ana UI Kodu
export const useGalvanizliTel = () => {
  const context = useContext(GalvanizliTelContext);
  if (!context) {
    throw new Error('useGalvanizliTel must be used within a GalvanizliTelProvider');
  }
  return context;
};

// Ana Galvanizli Tel bileşeni - Kullanıcı Arayüzü
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
    activeTab, setActiveTab,
    productDatabase, setProductDatabase,
    talepList, setTalepList,
    talepCount,
    selectedTalep, setSelectedTalep,
    fetchTalepList,
    fetchTalepDetails,
    approveTalep,
    rejectTalep,
    searchProducts,
    saveMMGT,
    saveYMGT,
    saveYMST,
    saveRecete,
    generateExcel,
    autoSelectYmSt,
    calculateReceteValues,
    processAutomaticCalculations,
    getCurrentSequence,
    incrementSequence,
    fetchProductDatabase,
    deleteProduct,
    checkProductExists,
    loadYmStList,
    createStokKartiExcel,
    createReceteExcel
  } = useGalvanizliTel();

  // State'ler 
  const [showYmStSearchModal, setShowYmStSearchModal] = useState(false);
  const [showYmStCreateModal, setShowYmStCreateModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showTalepDetailModal, setShowTalepDetailModal] = useState(false);
  const [showRejectTalepModal, setShowRejectTalepModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [sequence, setSequence] = useState(0);
  const [searchYmSt, setSearchYmSt] = useState("");
  const [filteredYmStList, setFilteredYmStList] = useState([]);
  const [selectedYmStToAdd, setSelectedYmStToAdd] = useState(null);
  const [activePage, setActivePage] = useState('uretim'); // 'uretim', 'talepler'
  const [currentStep, setCurrentStep] = useState('form'); // 'form', 'summary', 'edit-ymst', 'edit-recete'
  const [excelCreated, setExcelCreated] = useState({
    stokKarti: false,
    recete: false
  });
  const [databaseSaved, setDatabaseSaved] = useState(false);
  const [databaseFilter, setDatabaseFilter] = useState({
    type: 'mmGt',
    search: ''
  });
  const [talepFilter, setTalepFilter] = useState({
    status: 'pending',
    search: ''
  });
  const [filteredDatabaseItems, setFilteredDatabaseItems] = useState([]);
  const [filteredTalepItems, setFilteredTalepItems] = useState([]);
  const [selectedTalepId, setSelectedTalepId] = useState(null);
  const [showExcelWithoutSaveWarning, setShowExcelWithoutSaveWarning] = useState(false);
  const [excelTypeToGenerate, setExcelTypeToGenerate] = useState(null);
  const [refreshingDatabase, setRefreshingDatabase] = useState(false);

  // Form değerleri
  const initialFormValues = {
    cap: '2.50', // Varsayılan çap değeri
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
    boraks_tuketimi: 0.02, 
    asit_tuketimi: 0.002,  
    desi_tuketimi: 0.0013, 
    paketleme_suresi: 0.02, 
    galvanizleme_suresi: 0.9, 
    tel_cekme_suresi: 0.15,
    celik_cember_tuketimi: 0.0024,
    cember_tokasi_tuketimi: 0.008,
    kaldirma_kancasi_tuketimi: 0.008,
    karton_tuketimi: 0.016,
    naylon_tuketimi: 0.002
  };

  const [receteFormValues, setReceteFormValues] = useState(initialReceteValues);
  const [receteGosterimValues, setReceteGosterimValues] = useState(null);

  // İzin kontrolü
  useEffect(() => {
    if (!hasPermission('access:galvanizli-tel')) {
      setError('Bu modüle erişim izniniz bulunmamaktadır.');
    }
  }, [hasPermission]);

  // Veritabanı verilerini filtrele
  useEffect(() => {
    filterDatabaseItems();
  }, [databaseFilter, productDatabase, filterDatabaseItems]);

  // Talep listesini filtrele
  useEffect(() => {
    filterTalepItems();
  }, [talepFilter, talepList, filterTalepItems]);

  // filteredYmStList ayarla
  useEffect(() => {
    setFilteredYmStList(ymStList);
  }, [ymStList]);

  // API endpoint uyarlanması için tarayıcı açılışında bir kez çalıştır
  useEffect(() => {
    // Tarayıcı ortamında olduğundan emin olalım
    if (typeof window !== 'undefined') {
      const apiRoot = window.location.origin;
      // API URL'lerini güncelle - API dosyasında tanımlanmışsa
      if (window.API_URLS) {
        window.API_URLS.galTalepList = `${apiRoot}/api/gal_cost_cal_sal_requests`;
        window.API_URLS.galTalepCount = `${apiRoot}/api/gal_cost_cal_sal_requests/count`;
      }
    }

    // Talep listesini yükle
    if (activePage === 'talepler') {
      fetchTalepList();
    }
  }, [activePage, fetchTalepList]);

  // Sayfa yüklendiğinde ve mmGtData değiştiğinde form değerlerini güncelle
  useEffect(() => {
    if (mmGtData && isEditMode) {
      setFormValues({
        cap: mmGtData.cap?.toString() || '2.50',
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
          tel_cekme_suresi: receteData.tel_cekme_suresi || initialReceteValues.tel_cekme_suresi,
          // Diğer reçete değerlerini hesapla
          celik_cember_tuketimi: receteData.celik_cember_tuketimi || calculateCelikCemberTuketimi(mmGtData.kg || 750),
          cember_tokasi_tuketimi: receteData.cember_tokasi_tuketimi || calculateCemberTokasiTuketimi(mmGtData.kg || 750),
          kaldirma_kancasi_tuketimi: receteData.kaldirma_kancasi_tuketimi || calculateKaldirmaKancasiTuketimi(mmGtData.kg || 750),
          karton_tuketimi: receteData.karton_tuketimi || calculateKartonTuketimi(mmGtData.kg || 750),
          naylon_tuketimi: receteData.naylon_tuketimi || calculateNaylonTuketimi(mmGtData.kg || 750)
        });
        
        // Görüntülenecek reçete bilgilerini oluştur
        updateReceteGosterimValues(receteData, mmGtData.kg || 750);
      }
    }
  }, [mmGtData, isEditMode, receteData, sequence, initialReceteValues,
     calculateCelikCemberTuketimi, calculateCemberTokasiTuketimi,
     calculateKaldirmaKancasiTuketimi, calculateKartonTuketimi,
     calculateNaylonTuketimi, updateReceteGosterimValues]);

  // Reçete görüntüleme değerlerini güncelle
  const updateReceteGosterimValues = (receteData, kg) => {
    // If no reçete data exists, create default values
    if (!receteData) {
      // Calculate default values
      const defaultTelCekmeSuresi = 0.02;
      const defaultPaketlemeSuresi = 0.02;
      const defaultGalvanizlemeSuresi = 1.159 / parseFloat(formValues.cap);
      const defaultBoraksTuketimi = 0.001;
      const defaultAsitTuketimi = 0.001;
      const defaultDesiTuketimi = 0.002;

      // Create default reçete data
      receteData = {
        tel_cekme_suresi: defaultTelCekmeSuresi,
        paketleme_suresi: defaultPaketlemeSuresi,
        galvanizleme_suresi: defaultGalvanizlemeSuresi,
        boraks_tuketimi: defaultBoraksTuketimi,
        asit_tuketimi: defaultAsitTuketimi,
        desi_tuketimi: defaultDesiTuketimi,
        karton_tuketimi: calculateKartonTuketimi(kg),
        naylon_tuketimi: calculateNaylonTuketimi(kg)
      };

      // Update state with default values
      setReceteFormValues(receteData);
    }
    
    const gosterimValues = {
      celik_cember: {
        kod: 'AMB.APEX CEMBER 38X080',
        deger: receteData.celik_cember_tuketimi || calculateCelikCemberTuketimi(kg),
        birim: 'KG'
      },
      cember_tokasi: {
        kod: 'AMB.TOKA.SIGNODE.114P. DKP',
        deger: receteData.cember_tokasi_tuketimi || calculateCemberTokasiTuketimi(kg),
        birim: 'AD'
      },
      kaldirma_kancasi: {
        kod: 'SM.7MMHALKA',
        deger: receteData.kaldirma_kancasi_tuketimi || calculateKaldirmaKancasiTuketimi(kg),
        birim: 'AD'
      },
      karton: {
        kod: 'AMB.ÇEM.KARTON.GAL',
        deger: receteData.karton_tuketimi || calculateKartonTuketimi(kg),
        birim: 'AD'
      },
      naylon: {
        kod: getNaylonKodu(formValues.ic_cap || 45),
        deger: receteData.naylon_tuketimi || calculateNaylonTuketimi(kg),
        birim: 'KG'
      },
      cinko: {
        kod: '150 03',
        deger: receteData.boraks_tuketimi,
        birim: 'KG'
      },
      asit: {
        kod: 'SM.HİDROLİK.ASİT',
        deger: receteData.asit_tuketimi,
        birim: 'KG'
      },
      silkajel: {
        kod: 'SM.DESİ.PAK',
        deger: receteData.desi_tuketimi,
        birim: 'AD'
      },
      paketleme: {
        kod: 'GTPKT01',
        deger: receteData.paketleme_suresi,
        birim: 'DK'
      },
      galvanizleme: {
        kod: 'GLV01',
        deger: receteData.galvanizleme_suresi,
        birim: 'DK'
      },
      tel_cekme: {
        kod: 'TLC01',
        deger: receteData.tel_cekme_suresi,
        birim: 'DK'
      },
      filmasin: {
        kod: selectedYmSt.length > 0 ? (
          selectedYmSt[0].filmasin && selectedYmSt[0].quality ? 
          `FLM.${selectedYmSt[0].filmasin.toString().padStart(4, '0')}.${selectedYmSt[0].quality}` : 
          'FLM1'
        ) : 'FLM1',
        deger: 1,
        birim: 'KG'
      }
    };
    
    setReceteGosterimValues(gosterimValues);
  };

  // Naylon kodunu iç çapa göre belirle
  const getNaylonKodu = (icCap) => {
    if (icCap === 45) return 'AMB.SHRİNK.200*140CM';
    if (icCap === 50) return 'AMB.SHRİNK.200*160CM';
    if (icCap === 55) return 'AMB.SHRİNK.200*190CM';
    return 'AMB.SHRİNK.200*140CM'; // Varsayılan
  };

  // Reçete hesaplama formülleri
  const calculateCelikCemberTuketimi = (kg) => (1.2 * (1000 / kg)) / 1000;
  const calculateCemberTokasiTuketimi = (kg) => (4 * (1000 / kg)) / 1000;
  const calculateKaldirmaKancasiTuketimi = (kg) => (4 * (1000 / kg)) / 1000;
  const calculateKartonTuketimi = (kg) => (8 * (1000 / kg)) / 1000;
  const calculateNaylonTuketimi = (kg) => (1 * (1000 / kg)) / 1000;

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
      case 'mmGtRecete':
        filteredData = productDatabase.mmGtReceteList.filter(item => 
          !searchTerm || 
          (item.mamul_kodu && item.mamul_kodu.toLowerCase().includes(searchTerm)) ||
          (item.bilesen_kodu && item.bilesen_kodu.toLowerCase().includes(searchTerm))
        );
        break;
      case 'ymGtRecete':
        filteredData = productDatabase.ymGtReceteList.filter(item => 
          !searchTerm || 
          (item.mamul_kodu && item.mamul_kodu.toLowerCase().includes(searchTerm)) ||
          (item.bilesen_kodu && item.bilesen_kodu.toLowerCase().includes(searchTerm))
        );
        break;
      case 'ymStRecete':
        filteredData = productDatabase.ymStReceteList.filter(item => 
          !searchTerm || 
          (item.mamul_kodu && item.mamul_kodu.toLowerCase().includes(searchTerm)) ||
          (item.bilesen_kodu && item.bilesen_kodu.toLowerCase().includes(searchTerm))
        );
        break;
      default:
        filteredData = [];
    }
    
    setFilteredDatabaseItems(filteredData);
  };

  // Talep listesi filtrele
  const filterTalepItems = () => {
    const { status, search } = talepFilter;
    const searchTerm = search.toLowerCase();

    if (!Array.isArray(talepList)) {
      console.warn('Talep listesi dizi değil:', talepList);
      setFilteredTalepItems([]);
      return;
    }

    // Sample rows (test data) to ensure the table isn't empty
    const sampleRows = [
      {
        id: 'sample-1',
        cap: 3.0,
        kod_2: 'ZN-P',
        kaplama: 200,
        min_mukavemet: 450,
        max_mukavemet: 600,
        tolerans_plus: 0.05,
        tolerans_minus: 0.05,
        kg: 500,
        status: 'pending',
        created_at: new Date().toISOString()
      },
      {
        id: 'sample-2',
        cap: 2.5,
        kod_2: 'NIT',
        kaplama: 150,
        min_mukavemet: 400,
        max_mukavemet: 550,
        tolerans_plus: 0.04,
        tolerans_minus: 0.04,
        kg: 450,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    ];

    // No need to combine with sample data anymore since we're using mock data directly
    console.log('Using talep list data:', talepList);
    const combinedList = talepList;

    const filteredData = combinedList.filter(item =>
      (status === 'all' || item.status === status) &&
      (!searchTerm ||
        (item.cap && item.cap.toString().includes(searchTerm)) ||
        (item.kod_2 && item.kod_2.toLowerCase().includes(searchTerm)))
    );
    
    setFilteredTalepItems(filteredData);
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
    let newValues = { ...formValues };
    
    // Sayısal değerler için virgül yerine nokta kullan
    if (['cap', 'tolerans_plus', 'tolerans_minus', 'kaplama', 'min_mukavemet', 
         'max_mukavemet', 'kg'].includes(name)) {
      newValues[name] = value.replace(',', '.');
    } else {
      newValues[name] = value;
    }
    
    // Kod_2 PAD ise kaplamayı otomatik ayarla
    if (name === 'kod_2' && value === 'PAD') {
      newValues.kaplama = 50;
    }
    
    // İç çap değişirse dış çapı otomatik ayarla
    if (name === 'ic_cap') {
      const icCap = parseInt(value);
      let disCap = 75;
      
      if (icCap === 50) disCap = 90;
      else if (icCap === 55) disCap = 105;
      
      newValues.dis_cap = disCap;
    }
    
    // Ana değeri güncelle
    setFormValues(newValues);
    
    // Kaplama türü ve çap değişirse dizilim numarasını güncelle
    if (name === 'kod_2' || name === 'cap') {
      if (newValues.kod_2 && newValues.cap) {
        fetchSequence(
          newValues.kod_2, 
          parseFloat(newValues.cap)
        );
      }
    }
    
    // Çap değişirse reçete değerlerini otomatik güncelle
    if (name === 'cap' && value) {
      const capValue = parseFloat(value.replace(',', '.'));
      if (!isNaN(capValue)) {
        // Çap değeri değiştiğinde otomatik hesaplama başlat
        const calculatedRecete = calculateReceteValues({
          ...newValues,
          cap: capValue,
        });
        if (calculatedRecete) {
          setReceteFormValues({
            ...calculatedRecete,
            celik_cember_tuketimi: calculateCelikCemberTuketimi(newValues.kg),
            cember_tokasi_tuketimi: calculateCemberTokasiTuketimi(newValues.kg),
            kaldirma_kancasi_tuketimi: calculateKaldirmaKancasiTuketimi(newValues.kg),
            karton_tuketimi: calculateKartonTuketimi(newValues.kg),
            naylon_tuketimi: calculateNaylonTuketimi(newValues.kg)
          });
          
          // Reçete görüntüleme değerlerini güncelle
          updateReceteGosterimValues(calculatedRecete, newValues.kg);
        }
      }
    }
    
    // Ağırlık değişirse desi değerini ve diğer ağırlığa bağlı değerleri güncelle
    if (name === 'kg' && value) {
      const kgValue = parseFloat(value.replace(',', '.'));
      if (!isNaN(kgValue)) {
        // Ağırlık değiştiğinde otomatik hesaplama başlat
        const calculatedRecete = calculateReceteValues({
          ...newValues,
          kg: kgValue,
        });
        
        if (calculatedRecete) {
          // Hesaplanan değerleri reçete formuna tanımla
          const updatedRecete = {
            ...calculatedRecete,
            celik_cember_tuketimi: calculateCelikCemberTuketimi(kgValue),
            cember_tokasi_tuketimi: calculateCemberTokasiTuketimi(kgValue),
            kaldirma_kancasi_tuketimi: calculateKaldirmaKancasiTuketimi(kgValue),
            karton_tuketimi: calculateKartonTuketimi(kgValue),
            naylon_tuketimi: calculateNaylonTuketimi(kgValue)
          };
          
          setReceteFormValues(updatedRecete);
          
          // Reçete görüntüleme değerlerini güncelle
          updateReceteGosterimValues(updatedRecete, kgValue);
        }
      }
    }
  };

  // Reçete form değerlerini güncelle
  const handleReceteInputChange = (e) => {
    const { name, value } = e.target;
    // Virgül yerine nokta kullan
    const formattedValue = value.replace(',', '.');
    const numValue = parseFloat(formattedValue);
    
    // Reçete değerlerini güncelle
    const updatedRecete = { 
      ...receteFormValues, 
      [name]: isNaN(numValue) ? 0 : numValue 
    };
    
    setReceteFormValues(updatedRecete);
    
    // Reçete görüntüleme değerlerini güncelle
    updateReceteGosterimValues(updatedRecete, formValues.kg);
  };

  // Form gönderildiğinde çalışır
  const handleSubmit = async (values) => {
    try {
      // Sayısal değerlerin doğru formatta olduğundan emin ol
      const processedValues = {
        ...values,
        cap: parseFloat(values.cap),
        kaplama: parseInt(values.kaplama),
        min_mukavemet: parseInt(values.min_mukavemet),
        max_mukavemet: parseInt(values.max_mukavemet),
        tolerans_plus: parseFloat(values.tolerans_plus),
        tolerans_minus: parseFloat(values.tolerans_minus),
        ic_cap: parseInt(values.ic_cap),
        dis_cap: parseInt(values.dis_cap),
        kg: parseInt(values.kg),
      };
      
      // Otomatik hesaplamalar yap
      const results = await processAutomaticCalculations(processedValues);
      
      // YM ST önerileri için doğru hesaplama
      await handleYmStAutoSelect(processedValues);
      
      // Reçete değerlerini güncelle
      const updatedRecete = {
        ...results.recete,
        celik_cember_tuketimi: calculateCelikCemberTuketimi(processedValues.kg),
        cember_tokasi_tuketimi: calculateCemberTokasiTuketimi(processedValues.kg),
        kaldirma_kancasi_tuketimi: calculateKaldirmaKancasiTuketimi(processedValues.kg),
        karton_tuketimi: calculateKartonTuketimi(processedValues.kg),
        naylon_tuketimi: calculateNaylonTuketimi(processedValues.kg)
      };
      
      setReceteFormValues(updatedRecete);
      setReceteData(updatedRecete);
      
      // Reçete görüntüleme değerlerini güncelle
      updateReceteGosterimValues(updatedRecete, processedValues.kg);
      
      // Özet ekranına geç
      setCurrentStep('summary');
    } catch (error) {
      console.error('Form gönderme hatası:', error);
      setError('Form gönderilirken bir hata oluştu: ' + error.message);
      toast.error('Form gönderilirken bir hata oluştu: ' + error.message);
    }
  };

  // YM ST önerilerini otomatik hesapla ve seç
  const handleYmStAutoSelect = async (values) => {
    try {
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
      
      // Gerçek veritabanı araması yerine, uygun YM ST önerileri oluştur
      const calculatedCap = ((minCap + maxCap) / 2).toFixed(2);
      
      // Çap değerini doğru formatta (4 basamaklı) hazırlama
      const formattedCap = calculatedCap.replace('.', '').padStart(4, '0');
      
      // Özel saha 1 değerini belirle
      let ozelSaha1;
      const capNum = parseFloat(calculatedCap);
      if (capNum < 2) ozelSaha1 = 1;
      else if (capNum < 3) ozelSaha1 = 2;
      else if (capNum < 4) ozelSaha1 = 3;
      else if (capNum < 5) ozelSaha1 = 4;
      else if (capNum < 6) ozelSaha1 = 5;
      else if (capNum < 7) ozelSaha1 = 6;
      else if (capNum < 8) ozelSaha1 = 7;
      else ozelSaha1 = 8;
      
      // Yeni YM ST kodu oluştur
      const stockCode = `YM.ST.${formattedCap}.${filmasin.toString().padStart(4, '0')}.${quality}`;
      const stockName = `YM Siyah Tel ${calculatedCap} mm HM:${filmasin.toString().padStart(4, '0')}.${quality}`;
      
      // YM ST öneri listesi oluştur (önce mevcut YM ST'leri kontrol et)
      let suggestions = [];
      
      // Veritabanından aralığa uygun YM ST'leri bul
      const existingYmSt = ymStList.filter(item => {
        const itemCap = parseFloat(item.cap);
        return !isNaN(itemCap) && itemCap >= minCap && itemCap <= maxCap;
      });
      
      if (existingYmSt.length > 0) {
        // Veritabanında uygun YM ST'ler var, öneri olarak bunları kullan
        suggestions = existingYmSt.slice(0, 3); // En fazla 3 öneri
      } else {
        // Veritabanında uygun YM ST yok, yeni oluştur
        suggestions = [{
          id: 'new_' + Date.now(),
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
          cap: capNum,
          filmasin: filmasin,
          quality: quality,
          isNew: true
        }];
      }
      
      // Önerileri benzersiz hale getir
      const uniqueSuggestions = [];
      const seenStokKodu = new Set();
      
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
    if (!mmGtData && !formValues) {
      setError('Önce MM GT bilgileri gereklidir');
      return;
    }
    
    if (selectedYmStToAdd) {
      // Zaten eklenmiş mi kontrol et
      const alreadyAdded = selectedYmSt.some(item => item.id === selectedYmStToAdd.id);
      
      if (alreadyAdded) {
        toast.warning('Bu YM ST zaten eklenmiş');
        return;
      }
      
      // MM GT çapı ile uyumluluk kontrolü
      const mmGtCap = parseFloat(mmGtData?.cap || formValues.cap);
      const ymStCap = parseFloat(selectedYmStToAdd.cap);
      
      if (ymStCap >= mmGtCap) {
        toast.warning('Seçilen YM ST çapı MM GT çapından küçük olmalıdır. Galvanizleme işlemi tel çapını arttırır.');
        return;
      }
      
      setSelectedYmSt(prev => [...prev, selectedYmStToAdd]);
      toast.success(`${selectedYmStToAdd.stok_kodu} YM ST eklendi`);
      setShowYmStSearchModal(false);
      setSelectedYmStToAdd(null);
      setSearchYmSt("");
    } else {
      setError('Lütfen bir YM ST seçin');
    }
  };

  // YM ST ilişkisini kaldır
  const handleRemoveYmSt = async (ymStId) => {
    setSelectedYmSt(prev => prev.filter(item => item.id !== ymStId));
    toast.success('YM ST başarıyla kaldırıldı');
  };

  // Yeni YM ST oluştur
  const handleCreateYmSt = async (values) => {
    if (!mmGtData && !formValues) {
      setError('Önce MM GT bilgileri gereklidir');
      return;
    }
    
    const diameter = parseFloat(values.cap);
    const mmGtCap = parseFloat(mmGtData?.cap || formValues.cap);
    
    // MM GT çapı ile uyumluluk kontrolü
    if (diameter >= mmGtCap) {
      toast.warning('Oluşturulan YM ST çapı MM GT çapından küçük olmalıdır. Galvanizleme işlemi tel çapını arttırır.');
      return;
    }
    
    // Çap değeri doğru formatta (leading zeros ile)
    const formattedCap = diameter.toFixed(2).replace('.', '').padStart(4, '0');
    
    // Stok kodu formatla - YM.ST.0240.0550.1006
    const stockCode = `YM.ST.${formattedCap}.${values.filmasin.toString().padStart(4, '0')}.${values.quality}`;
    const stockName = `YM Siyah Tel ${formattedCap} mm HM:${values.filmasin.toString().padStart(4, '0')}.${values.quality}`;

    // Özel saha 1 değerini belirle
    let ozelSaha1;
    if (diameter < 2) ozelSaha1 = 1;
    else if (diameter < 3) ozelSaha1 = 2;
    else if (diameter < 4) ozelSaha1 = 3;
    else if (diameter < 5) ozelSaha1 = 4;
    else if (diameter < 6) ozelSaha1 = 5;
    else if (diameter < 7) ozelSaha1 = 6;
    else if (diameter < 8) ozelSaha1 = 7;
    else ozelSaha1 = 8;
    
    const newYmSt = {
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
      cap: diameter,
      filmasin: values.filmasin,
      quality: values.quality,
      isNew: true
    };
    
    // Aynı çap, filmaşin ve kalitede zaten seçili bir YM ST var mı kontrol et
    const duplicate = selectedYmSt.find(item => 
      item.cap === diameter && 
      item.filmasin === values.filmasin && 
      item.quality === values.quality
    );
    
    if (duplicate) {
      toast.warning('Aynı özelliklerde bir YM ST zaten eklenmiş');
      setShowYmStCreateModal(false);
      return;
    }
    
    setSelectedYmSt(prev => [...prev, newYmSt]);
    setShowYmStCreateModal(false);
    toast.success(`${stockCode} YM ST eklendi (değişiklikler henüz veritabanına kaydedilmedi)`);
  };

  // Ürün ara
  const handleSearch = async (values) => {
    try {
      await searchProducts(values);
      setShowSearchModal(false);
      
      // Sonuç dönerse özete git
      if (mmGtData) {
        setCurrentStep('summary');
      }
    } catch (error) {
      console.error('Ürün arama hatası:', error);
      setError('Ürün arama hatası: ' + error.message);
    }
  };

  // Yeni ürün oluşturma
  const handleNewProduct = () => {
    setMmGtData(null);
    setYmGtData(null);
    setSelectedYmSt([]);
    setReceteData(null);
    setReceteGosterimValues(null);
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

  // Tüm reçete değerlerini otomatik hesaplayan fonksiyon
  const handleAutoCalculateAllRecete = () => {
    try {
      // Mevcut reçete verilerinin kopyasını oluştur
      const updatedRecete = { ...receteFormValues };

      // Çap ve ağırlık değerlerini al
      const capValue = parseFloat(formValues.cap);
      const kgValue = parseFloat(formValues.kg);
      const kaplamaValue = parseInt(formValues.kaplama);

      if (isNaN(capValue) || isNaN(kgValue) || isNaN(kaplamaValue)) {
        toast.warning('Hesaplama için geçerli çap, ağırlık ve kaplama değerleri gereklidir.');
        return;
      }

      // 1. YM ST için reçete değerlerini hesapla
      // Bu kısım her ürün için özelleştirilmiş olabilir

      // 2. YM GT için reçete değerlerini hesapla

      // 3. MM GT için reçete değerlerini hesapla
      // Temel reçete değerlerini hesapla
      const calculatedRecete = calculateReceteValues({
        ...formValues,
        cap: capValue,
        kg: kgValue,
        kaplama: kaplamaValue
      });

      // 4. Diğer paketleme/ambalaj ürünlerini hesapla
      const updatedValues = {
        ...calculatedRecete,
        celik_cember_tuketimi: calculateCelikCemberTuketimi(kgValue),
        cember_tokasi_tuketimi: calculateCemberTokasiTuketimi(kgValue),
        kaldirma_kancasi_tuketimi: calculateKaldirmaKancasiTuketimi(kgValue),
        karton_tuketimi: calculateKartonTuketimi(kgValue),
        naylon_tuketimi: calculateNaylonTuketimi(kgValue)
      };

      // 5. Reçete form değerlerini güncelle
      setReceteFormValues(updatedValues);

      // 6. Görüntüleme değerlerini güncelle
      updateReceteGosterimValues(updatedValues, kgValue);

      // Başarı mesajı göster
      toast.success('Tüm reçete değerleri otomatik olarak hesaplandı');
    } catch (error) {
      console.error('Reçete hesaplama hatası:', error);
      toast.error('Reçete hesaplanırken bir hata oluştu: ' + error.message);
    }
  };

  const handleSaveToDatabase = async () => {
    try {
      // Tüm gerekli alanların dolu olduğunu kontrol et
      const requiredFields = [
        { field: formValues.cap, name: 'Çap' },
        { field: formValues.tolerans_minus, name: 'Tolerans -' },
        { field: formValues.tolerans_plus, name: 'Tolerans +' },
        { field: formValues.kaplama, name: 'Kaplama' },
        { field: formValues.min_mukavemet, name: 'Min Mukavemet' },
        { field: formValues.max_mukavemet, name: 'Max Mukavemet' },
        { field: formValues.ic_cap, name: 'İç Çap' },
        { field: formValues.dis_cap, name: 'Dış Çap' },
        { field: formValues.kg, name: 'Ağırlık (kg)' }
      ];

      const missingFields = requiredFields.filter(item => !item.field).map(item => item.name);

      if (missingFields.length > 0) {
        toast.error(`Lütfen tüm zorunlu alanları doldurun: ${missingFields.join(', ')}`);
        return { success: false, message: `Eksik alanlar: ${missingFields.join(', ')}` };
      }

      // YM ST seçili mi kontrol et
      if (selectedYmSt.length === 0) {
        toast.error('En az bir YM ST seçmelisiniz');
        return { success: false, message: 'En az bir YM ST seçmelisiniz' };
      }

      setLoading(true);

      // Performans ölçümü için zaman hesaplama
      const startTime = Date.now();

      // YM ST listesini benzersiz hale getir
      const uniqueYmSt = [];
      const ymStMap = new Map();

      selectedYmSt.forEach(item => {
        if (!ymStMap.has(item.stok_kodu)) {
          ymStMap.set(item.stok_kodu, item);
          uniqueYmSt.push(item);
        }
      });

      // Eğer seçili YM ST tekrarlanıyorsa güncelle
      if (uniqueYmSt.length !== selectedYmSt.length) {
        setSelectedYmSt(uniqueYmSt);
        toast.info(`${selectedYmSt.length - uniqueYmSt.length} adet tekrarlanan YM ST kaydı temizlendi`);
      }

      // Oluşturulan ürünleri saklayacak dizi
      const createdProducts = [];
      let lastMmGt = null;
      let lastYmGt = null;
      let failedProducts = [];

      // Her YM ST için ayrı MM GT ve YM GT oluştur (1-to-1-to-1 model)
      for (let i = 0; i < uniqueYmSt.length; i++) {
        try {
          const ymSt = uniqueYmSt[i];
          const currentFormValues = {...formValues};

          // İlerleme durumunu kullanıcıya bildir
          toast.info(`${i+1}/${uniqueYmSt.length} ürün işleniyor...`, {
            autoClose: 1000,
            toastId: `progress-${i}`
          });

          // MM GT kaydet
          const savedMmGt = await saveMMGT(currentFormValues);
          if (!savedMmGt) {
            console.error(`${i+1}. ürün için MM GT kaydedilemedi`);
            toast.error(`${i+1}. ürün için MM GT kaydedilemedi`);
            failedProducts.push({
              index: i+1,
              ymSt: ymSt,
              step: 'MM GT',
              error: 'Kayıt başarısız'
            });
            continue;
          }

          // YM GT kaydet
          const savedYmGt = await saveYMGT(currentFormValues, savedMmGt.id);
          if (!savedYmGt) {
            console.error(`${i+1}. ürün için YM GT kaydedilemedi`);
            toast.error(`${i+1}. ürün için YM GT kaydedilemedi`);
            failedProducts.push({
              index: i+1,
              ymSt: ymSt,
              step: 'YM GT',
              error: 'Kayıt başarısız',
              partialData: { mmGt: savedMmGt }
            });
            continue;
          }

          // İlgili YM ST'yi kaydet - her MM GT için bir YM ST
          const savedYmSt = await saveYMST(ymSt, savedMmGt.id);
          if (!savedYmSt) {
            console.error(`${i+1}. ürün için YM ST kaydedilemedi`);
            toast.error(`${i+1}. ürün için YM ST kaydedilemedi`);
            failedProducts.push({
              index: i+1,
              ymSt: ymSt,
              step: 'YM ST',
              error: 'Kayıt başarısız',
              partialData: { mmGt: savedMmGt, ymGt: savedYmGt }
            });
            continue;
          }

          // Reçeteleri kaydet
          const savedRecete = await saveRecete(receteFormValues, savedMmGt.id, savedYmGt.id);
          if (!savedRecete) {
            console.error(`${i+1}. ürün için reçete kaydedilemedi`);
            toast.error(`${i+1}. ürün için reçete kaydedilemedi`);
            failedProducts.push({
              index: i+1,
              ymSt: ymSt,
              step: 'Reçete',
              error: 'Kayıt başarısız',
              partialData: { mmGt: savedMmGt, ymGt: savedYmGt, ymSt: savedYmSt }
            });
            continue;
          }

          // Oluşturulan ürünü diziye ekle
          createdProducts.push({
            mmGt: savedMmGt,
            ymGt: savedYmGt,
            ymSt: savedYmSt,
            recete: savedRecete
          });

          // Son ürünü sakla - UI güncellemesi için
          lastMmGt = savedMmGt;
          lastYmGt = savedYmGt;

          console.log(`${i+1}/${uniqueYmSt.length} ürün başarıyla kaydedildi`);
          toast.success(`${i+1}/${uniqueYmSt.length} ürün başarıyla kaydedildi`, {
            autoClose: 2000,
            toastId: `success-${i}`
          });
        } catch (innerError) {
          console.error(`${i+1}. ürün kaydedilirken hata oluştu:`, innerError);
          toast.error(`${i+1}. ürün kaydedilirken hata oluştu: ${innerError.message}`);
          failedProducts.push({
            index: i+1,
            ymSt: uniqueYmSt[i],
            step: 'İşlem',
            error: innerError.message || 'Bilinmeyen hata'
          });
        }
      }

      // En az bir ürün başarıyla oluşturulduysa
      if (createdProducts.length > 0) {
        setDatabaseSaved(true);
        setIsEditMode(true);

        // Son oluşturulan ürünün bilgilerini UI'da göster
        setMmGtData(lastMmGt);
        setYmGtData(lastYmGt);
        setReceteData(receteFormValues);

        // Veritabanı verilerini güncelle
        await fetchProductDatabase();

        // Performans ölçümü sonucu
        const endTime = Date.now();
        const elapsedTime = (endTime - startTime) / 1000;
        setSavingTime(elapsedTime);

        // Hata durumları detaylı özet
        if (failedProducts.length > 0) {
          console.warn('Başarısız ürünler:', failedProducts);

          // Kullanıcıya detaylı geri bildirim
          const successRate = `${createdProducts.length}/${uniqueYmSt.length}`;
          const failureDetails = failedProducts.map(f =>
            `${f.index}. ürün (${f.ymSt.stok_kodu}): ${f.step} aşamasında hata`
          ).join('\n');

          toast.warning(`${successRate} ürün veritabanına kaydedildi (${elapsedTime.toFixed(2)} saniye)`, {
            autoClose: 5000
          });

          // Hata özeti için console
          console.info(`Kayıt özeti: ${successRate} başarılı, ${failedProducts.length} başarısız.
Başarısız ürünler:
${failureDetails}`);

          return {
            success: true,
            partial: true,
            created: createdProducts.length,
            failed: failedProducts.length,
            total: uniqueYmSt.length,
            failedDetails: failedProducts,
            elapsedTime
          };
        } else {
          toast.success(`${createdProducts.length} ürün başarıyla veritabanına kaydedildi (${elapsedTime.toFixed(2)} saniye)`);

          return {
            success: true,
            created: createdProducts.length,
            failed: 0,
            total: uniqueYmSt.length,
            elapsedTime
          };
        }
      } else {
        toast.error('Hiçbir ürün kaydedilemedi.');
        return {
          success: false,
          message: 'Hiçbir ürün kaydedilemedi.',
          failedDetails: failedProducts
        };
      }
    } catch (error) {
      console.error('Veritabanı kaydetme hatası:', error);
      toast.error('Veritabanına kayıt sırasında hata oluştu: ' + error.message);
      return {
        success: false,
        message: 'Veritabanına kayıt sırasında hata oluştu: ' + error.message
      };
    } finally {
      setLoading(false);
    }
  };

  // Excel oluştur (Kaydedilmemiş durumlarda uyarı göster)
  const handleCreateExcelRequest = (type) => {
    if (!databaseSaved) {
      setExcelTypeToGenerate(type);
      setShowExcelWithoutSaveWarning(true);
      return;
    }
    
    handleCreateExcelOnly(type);
  };

  // Excel oluştur
  const handleCreateExcelOnly = async (type) => {
    if (selectedYmSt.length === 0) {
      setError('Excel oluşturmak için en az bir YM ST kaydı gereklidir');
      toast.error('Excel oluşturmak için en az bir YM ST kaydı gereklidir');
      return;
    }
    
    setLoading(true);
    
    try {
      // Geçici ID oluştur - veritabanında kaydedilmemiş veriler için
      const tempMmGt = mmGtData || {
        id: 'temp_' + Date.now(),
        ...formValues,
        stok_kodu: getFormattedStokKodu(),
        stok_adi: `Galvanizli Tel ${formValues.cap} mm -${formValues.tolerans_minus}/+${formValues.tolerans_plus} ${formValues.kaplama} gr/m²${formValues.min_mukavemet}-${formValues.max_mukavemet} MPa ID:${formValues.ic_cap} cm OD:${formValues.dis_cap} cm ${formValues.kg} kg`,
        ingilizce_isim: `Galvanized Steel Wire ${formValues.cap} mm -${formValues.tolerans_minus}/+${formValues.tolerans_plus} ${formValues.kaplama} gr/m²${formValues.min_mukavemet}-${formValues.max_mukavemet} MPa ID:${formValues.ic_cap} cm OD:${formValues.dis_cap} cm ${formValues.kg} kg`,
        gumruk_tarife_kodu: getGumrukTarifeKodu(parseFloat(formValues.cap)),
        amb_shrink: getNaylonKodu(formValues.ic_cap),
        metarial: 'Galvanizli Tel',
        wax: '+',
        lifting_lugs: '+',
        unwinding: formValues.unwinding || '',
        coil_dimensions_id: formValues.ic_cap.toString(),
        coil_dimensions_od: formValues.dis_cap.toString(),
        coil_weight: formValues.kg.toString(),
        dia_mm: formValues.cap.toString(),
        dia_tol_mm_plus: formValues.tolerans_plus.toString(),
        dia_tol_mm_minus: formValues.tolerans_minus.toString(),
        zing_coating: formValues.kaplama.toString(),
        tensile_st_min: formValues.min_mukavemet.toString(),
        tensile_st_max: formValues.max_mukavemet.toString()
      };
      
      const tempYmGt = ymGtData || {
        id: 'temp_ym_' + Date.now(),
        mm_gt_id: tempMmGt.id,
        stok_kodu: tempMmGt.stok_kodu.replace('GT.', 'YM.GT.'),
        stok_adi: tempMmGt.stok_adi,
        ingilizce_isim: tempMmGt.ingilizce_isim,
        grup_kodu: 'YM',
        kod_1: 'GT',
        kod_2: formValues.kod_2,
        cap: parseFloat(formValues.cap),
        kaplama: formValues.kaplama,
        min_mukavemet: formValues.min_mukavemet,
        max_mukavemet: formValues.max_mukavemet,
        kg: formValues.kg,
        ic_cap: formValues.ic_cap,
        dis_cap: formValues.dis_cap,
        shrink: formValues.shrink,
        tolerans_plus: formValues.tolerans_plus,
        tolerans_minus: formValues.tolerans_minus
      };
      
      if (type === 'stokKarti' || type === 'both') {
        // Stok Kartı Excel oluştur
        await createStokKartiExcel(tempMmGt, tempYmGt, selectedYmSt);
        setExcelCreated(prev => ({ ...prev, stokKarti: true }));
        toast.success('Stok Kartı Excel dosyası başarıyla oluşturuldu');
      }
      
      if (type === 'recete' || type === 'both') {
        // Reçete Excel oluştur
        await createReceteExcel(tempMmGt, tempYmGt, selectedYmSt);
        setExcelCreated(prev => ({ ...prev, recete: true }));
        toast.success('Reçete Excel dosyası başarıyla oluşturuldu');
      }
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast.error('Excel oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
      setShowExcelWithoutSaveWarning(false);
    }
  };

  // Gümrük tarife kodunu çapa göre belirle
  const getGumrukTarifeKodu = (capValue) => {
    if (capValue >= 0.8 && capValue <= 1.5) {
      return '721720300011';
    } else if (capValue > 1.5 && capValue <= 6.0) {
      return '721720300012';
    } else if (capValue > 6.0) {
      return '721720300013';
    }
    return '';
  };

  // Hem veritabanına kaydet hem de Excel oluştur
  const handleSaveAndCreateExcel = async (type) => {
    try {
      setLoading(true);

      // Tüm zorunlu alanları kontrol et
      const requiredFields = [
        { field: formValues.cap, name: 'Çap' },
        { field: formValues.tolerans_minus, name: 'Tolerans -' },
        { field: formValues.tolerans_plus, name: 'Tolerans +' },
        { field: formValues.kaplama, name: 'Kaplama' },
        { field: formValues.min_mukavemet, name: 'Min Mukavemet' },
        { field: formValues.max_mukavemet, name: 'Max Mukavemet' },
        { field: formValues.ic_cap, name: 'İç Çap' },
        { field: formValues.dis_cap, name: 'Dış Çap' },
        { field: formValues.kg, name: 'Ağırlık (kg)' }
      ];

      const missingFields = requiredFields.filter(item => !item.field).map(item => item.name);

      if (missingFields.length > 0) {
        toast.error(`Lütfen tüm zorunlu alanları doldurun: ${missingFields.join(', ')}`);
        setLoading(false);
        return;
      }

      // YM ST seçilmiş mi kontrol et
      if (selectedYmSt.length === 0) {
        toast.error('Excel oluşturmak için en az bir YM ST seçmelisiniz');
        setLoading(false);
        return;
      }

      // İlerleme bildirimi
      toast.info('Kaydetme ve Excel oluşturma işlemi başlatıldı...', {
        autoClose: false,
        toastId: 'save-excel'
      });

      // Veritabanına kaydet
      const saveSuccess = await handleSaveToDatabase();

      // Kapatma işlemi
      toast.dismiss('save-excel');

      if (saveSuccess) {
        // Excel için ilerleme bildirimi
        toast.info('Excel dosyası oluşturuluyor...', {
          autoClose: false,
          toastId: 'create-excel'
        });

        try {
          // Excel oluştur
          await handleCreateExcelOnly(type);
          toast.dismiss('create-excel');
          toast.success('Excel dosyası başarıyla oluşturuldu');
        } catch (excelError) {
          toast.dismiss('create-excel');
          console.error('Excel oluşturma hatası:', excelError);
          toast.error('Excel oluşturulurken bir hata oluştu: ' + excelError.message);
        }
      } else {
        toast.error('Veritabanına kaydedilmeden Excel oluşturulamadı');
      }
    } catch (error) {
      console.error('Kaydet ve Excel oluştur hatası:', error);
      toast.error('İşlem sırasında bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Tüm Excel'leri oluştur
  const handleGenerateAllExcels = async () => {
    if (!databaseSaved) {
      setExcelTypeToGenerate('both');
      setShowExcelWithoutSaveWarning(true);
      return;
    }
    
    if (!mmGtData?.id) {
      setError('Excel oluşturmak için önce veritabanına kayıt yapmalısınız');
      toast.error('Excel oluşturmak için önce veritabanına kayıt yapmalısınız');
      return;
    }
    
    await generateExcel(mmGtData.id);
  };

  // Düzenleme moduna dön
  const handleEditProduct = () => {
    setCurrentStep('form');
  };

  // YM ST Düzenleme ekranına git
  const handleEditYmSt = () => {
    setCurrentStep('edit-ymst');
  };

  // Reçete Düzenleme ekranına git
  const handleEditRecete = () => {
    setCurrentStep('edit-recete');
  };

  // Düzenleme tamamlandı - Özete dön
  const handleEditComplete = () => {
    setCurrentStep('summary');
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

  // Veritabanından ürün seç
  const handleSelectDatabaseItem = async (item) => {
    try {
      setLoading(true);
      setShowDatabaseModal(false);
      
      // Ürün bilgilerini getir
      if (item.stok_kodu) {
        await searchProducts({ stok_kodu: item.stok_kodu });
        setCurrentStep('summary');
      }
    } catch (error) {
      console.error("Ürün yükleme hatası:", error);
      toast.error("Ürün yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  // Veritabanı ürününü sil
  const handleDeleteDatabaseItem = async (type, id) => {
    if (window.confirm('Bu ürünü silmek istediğinizden emin misiniz? Bu işlem tüm ilişkili kayıtları da silecektir.')) {
      const result = await deleteProduct(type, id);
      if (result) {
        await fetchProductDatabase();
      }
    }
  };

  // Veritabanını yenile
  const handleRefreshDatabase = async () => {
    setRefreshingDatabase(true);
    try {
      await fetchProductDatabase();
      toast.success('Veritabanı başarıyla yenilendi');
    } catch (error) {
      console.error('Veritabanı yenileme hatası:', error);
      toast.error('Veritabanı yenilenirken bir hata oluştu');
    } finally {
      setRefreshingDatabase(false);
    }
  };

  // Talep detaylarını görüntüleme
  const handleViewTalepDetails = async (talepId) => {
    if (!talepId) {
      toast.error('İşlenecek talep seçilmedi');
      return;
    }

    try {
      setLoading(true);
      setSelectedTalepId(talepId);

      // Log the request attempt
      console.log(`Attempting to fetch talepId: ${talepId}`);

      const talepData = await fetchTalepDetails(talepId);
      console.log('Fetched talep data:', talepData);

      if (talepData) {
        // Set both selectedTalep and selectedTalepId
        setSelectedTalep(talepData);
        setShowTalepDetailModal(true);
        setCurrentStep('summary');
      } else {
        toast.error('Talep detayları yüklenemedi');
      }
    } catch (error) {
      console.error('Talep detayları yükleme hatası:', error);
      toast.error('Talep detayları yüklenirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  // Talebi onaylama
  const handleApproveTalep = async () => {
    if (!selectedTalep || !selectedTalepId) {
      const errorMsg = 'İşlenecek talep seçilmedi';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      setLoading(true);
      console.log(`Attempting to approve talep: ${selectedTalepId}`, selectedTalep);

      const result = await approveTalep(selectedTalepId);
      console.log('Approve talep result:', result);

      if (result) {
        toast.success('Talep başarıyla onaylandı');
        setShowTalepDetailModal(false);
        setSelectedTalep(null);
        setSelectedTalepId(null);

        // Formları sıfırla
        handleNewProduct();

        // Talep listesini güncelle
        await fetchTalepList();
      } else {
        toast.error('Talep onaylanamadı');
      }
    } catch (error) {
      console.error('Talep onaylama hatası:', error);
      const errorMsg = 'Talep onaylanırken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Talep reddetme modalını göster
  const handleShowRejectModal = () => {
    if (!selectedTalep) {
      setError('İşlenecek talep seçilmedi');
      return;
    }
    
    setShowRejectTalepModal(true);
  };

  // Talebi reddetme
  const handleRejectTalep = async () => {
    if (!selectedTalep || !selectedTalepId) {
      setError('İşlenecek talep seçilmedi');
      return;
    }
    
    if (!rejectionReason.trim()) {
      setError('Lütfen red nedeni belirtin');
      return;
    }
    
    try {
      setLoading(true);
      const result = await rejectTalep(selectedTalepId, rejectionReason);
      
      if (result) {
        setShowRejectTalepModal(false);
        setShowTalepDetailModal(false);
        setSelectedTalep(null);
        setSelectedTalepId(null);
        setRejectionReason('');
        
        // Talep listesini güncelle
        await fetchTalepList();
      }
    } catch (error) {
      console.error('Talep reddetme hatası:', error);
      setError('Talep reddedilirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Talep durum filtresi değiştirme
  const handleTalepStatusChange = (e) => {
    setTalepFilter({
      ...talepFilter,
      status: e.target.value
    });
  };

  // Talep arama filtresi değiştirme
  const handleTalepSearchChange = (e) => {
    setTalepFilter({
      ...talepFilter,
      search: e.target.value
    });
  };

  // Stok kodu formatını göster
  const getFormattedStokKodu = () => {
    if (!formValues.kod_2 || !formValues.cap) return 'Oluşturulacak';
    
    const capValue = parseFloat(formValues.cap);
    const formattedCap = capValue.toFixed(2).replace('.', '').padStart(4, '0');
    const formattedSequence = sequence.toString().padStart(2, '0');
    
    return `GT.${formValues.kod_2}.${formattedCap}.${formattedSequence}`;
  };

  // Hata durumlarını kontrol et
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

  // İzin kontrolü
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
          <div className="space-x-2">
            <button
              onClick={() => {
                setActivePage('uretim');
                handleNewProduct();
              }}
              className={`px-4 py-2 ${activePage === 'uretim' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'} rounded-md hover:bg-red-700 hover:text-white transition-colors`}
            >
              Üretim
            </button>
            <button
              onClick={() => {
                setActivePage('talepler');
                fetchTalepList();
              }}
              className={`px-4 py-2 ${activePage === 'talepler' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'} rounded-md hover:bg-red-700 hover:text-white transition-colors relative`}
            >
              Talepler
              {talepCount.pending > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {talepCount.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowDatabaseModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Veritabanı
            </button>
          </div>
        </div>
      </div>
      
      {/* İçerik Alanı */}
      {activePage === 'uretim' && (
        <>
          {currentStep === 'form' && (
            <div className="bg-white p-6 rounded-md shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">MM GT Ürün Tanımlama</h3>
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Ara
                </button>
              </div>
              <Formik
                initialValues={formValues}
                validationSchema={mmGtValidationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
              >
                {({ values, setFieldValue, isSubmitting, errors, touched }) => (
                  <Form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Çap (mm)
                        </label>
                        <Field
                          type="text"
                          name="cap"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="cap" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kaplama Türü
                        </label>
                        <Field
                          as="select"
                          name="kod_2"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        >
                          <option value="NIT">NIT</option>
                          <option value="PAD">PAD</option>
                        </Field>
                        <ErrorMessage name="kod_2" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kaplama (gr/m²)
                        </label>
                        <Field
                          type="text"
                          name="kaplama"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="kaplama" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Mukavemet (MPa)
                        </label>
                        <Field
                          type="text"
                          name="min_mukavemet"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="min_mukavemet" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Mukavemet (MPa)
                        </label>
                        <Field
                          type="text"
                          name="max_mukavemet"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="max_mukavemet" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tolerans (+)
                        </label>
                        <Field
                          type="text"
                          name="tolerans_plus"
                          step="0.01"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="tolerans_plus" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tolerans (-)
                        </label>
                        <Field
                          type="text"
                          name="tolerans_minus"
                          step="0.01"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="tolerans_minus" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ağırlık (kg)
                        </label>
                        <Field
                          type="text"
                          name="kg"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="kg" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          İç Çap (cm)
                        </label>
                        <Field
                          as="select"
                          name="ic_cap"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        >
                          <option value={45}>45</option>
                          <option value={50}>50</option>
                          <option value={55}>55</option>
                        </Field>
                        <ErrorMessage name="ic_cap" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dış Çap (cm)
                        </label>
                        <Field
                          type="text"
                          name="dis_cap"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          disabled
                        />
                        <ErrorMessage name="dis_cap" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Shrink
                        </label>
                        <Field
                          as="select"
                          name="shrink"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        >
                          <option value="evet">Evet</option>
                          <option value="hayır">Hayır</option>
                        </Field>
                        <ErrorMessage name="shrink" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dizilim Numarası
                        </label>
                        <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-100">
                          {sequence}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stok Kodu
                        </label>
                        <div className="w-full p-2 border border-gray-300 rounded-md bg-gray-100">
                          {getFormattedStokKodu()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-6">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        {isSubmitting ? 'İşleniyor...' : 'Oluştur'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          )}

          {currentStep === 'summary' && (
            <div className="bg-white p-6 rounded-md shadow-md">
              <h3 className="text-lg font-bold mb-4">Ürün Özeti</h3>
              
              <div className="space-y-6">
                {/* MM GT Bilgileri */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-semibold">MM GT Bilgileri</h4>
                    <button
                      onClick={handleEditProduct}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Düzenle
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <span className="text-sm text-gray-500">Stok Kodu:</span>
                      <p>{mmGtData?.stok_kodu || getFormattedStokKodu()}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Çap (mm):</span>
                      <p>{formValues.cap}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Kaplama Türü:</span>
                      <p>{formValues.kod_2}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Kaplama (gr/m²):</span>
                      <p>{formValues.kaplama}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Mukavemet (MPa):</span>
                      <p>{formValues.min_mukavemet}-{formValues.max_mukavemet}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Tolerans:</span>
                      <p>-{formValues.tolerans_minus}/+{formValues.tolerans_plus}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Bobın Ölçüleri (ID/OD):</span>
                      <p>{formValues.ic_cap}/{formValues.dis_cap} cm</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Ağırlık (kg):</span>
                      <p>{formValues.kg}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Shrink:</span>
                      <p>{formValues.shrink}</p>
                    </div>
                  </div>
                </div>
                
                {/* YM GT Bilgileri */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-md font-semibold mb-2">YM GT Bilgileri</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <span className="text-sm text-gray-500">Stok Kodu:</span>
                      <p>{ymGtData?.stok_kodu || (mmGtData?.stok_kodu ? mmGtData.stok_kodu.replace('GT.', 'YM.GT.') : getFormattedStokKodu().replace('GT.', 'YM.GT.'))}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Stok Adı:</span>
                      <p>{ymGtData?.stok_adi || `YM ${formValues.kod_2} Galvanizli Tel ${formValues.cap} mm`}</p>
                    </div>
                  </div>
                </div>
                
                {/* YM ST Bilgileri */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-semibold">YM ST Bilgileri</h4>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => autoSelectYmSt(formValues)}
                        type="button"
                        className="text-green-600 hover:text-green-800"
                      >
                        Otomatik Oluştur
                      </button>
                      <button
                        onClick={handleEditYmSt}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Düzenle
                      </button>
                    </div>
                  </div>
                  
                  {selectedYmSt.length > 0 ? (
                    <div className="space-y-2">
                      {selectedYmSt.map((ymSt, index) => (
                        <div key={ymSt.id || ymSt.stok_kodu || index}
                            className={`border rounded-md p-3 ${
                              ymSt.source === 'auto-generated' ? 'border-green-300 bg-green-50' :
                              ymSt.source === 'database' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                            }`}>
                          {/* Source indicator */}
                          {ymSt.source && (
                            <div className="mb-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                ymSt.source === 'auto-generated' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {ymSt.sourceLabel || (ymSt.source === 'auto-generated' ? 'Otomatik oluşturuldu' : 'Veritabanından')}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-sm text-gray-500">Stok Kodu:</span>
                              <p>{ymSt.stok_kodu}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Çap (mm):</span>
                              <p>{ymSt.cap}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Filmaşin:</span>
                              <p>{ymSt.filmasin}.{ymSt.quality}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveYmSt(ymSt.id || ymSt.stok_kodu)}
                              className="text-red-500 hover:text-red-700"
                              title="Kaldır"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Henüz YM ST seçilmedi</p>
                  )}
                </div>
                
                {/* Reçete Bilgileri */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-semibold">Reçete Bilgileri</h4>
                    <button
                      onClick={handleEditRecete}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Düzenle
                    </button>
                  </div>
                  
                  {receteGosterimValues ? (
                    <div className="space-y-4">
                      {/* MM GT Reçete Kategorisi */}
                      <div className="border-l-4 border-blue-500 pl-3">
                        <h5 className="font-semibold text-blue-700 mb-2">MM GT Reçete</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <span className="text-sm text-gray-500">Paket (GTPKT01):</span>
                            <p>{receteGosterimValues.paketleme.deger} {receteGosterimValues.paketleme.birim}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Karton (AMB.ÇEM.KARTON.GAL):</span>
                            <p>{receteGosterimValues.karton.deger} {receteGosterimValues.karton.birim}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Shrink (AMB.SHRİNK.200*140CM):</span>
                            <p>{receteGosterimValues.naylon.deger} {receteGosterimValues.naylon.birim}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Halka (SM.7MMHALKA):</span>
                            <p>{receteGosterimValues.kaldirma_kancasi.deger} {receteGosterimValues.kaldirma_kancasi.birim}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Çember (AMB.APEX CEMBER 38X080):</span>
                            <p>{receteGosterimValues.celik_cember.deger} {receteGosterimValues.celik_cember.birim}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Toka (AMB.TOKA.SIGNODE.114P.DKP):</span>
                            <p>{receteGosterimValues.cember_tokasi.deger} {receteGosterimValues.cember_tokasi.birim}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Desi (SM.DESİ.PAK):</span>
                            <p>{receteGosterimValues.silkajel.deger} {receteGosterimValues.silkajel.birim}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Naylon:</span>
                            <p>{receteGosterimValues.naylon.deger} {receteGosterimValues.naylon.birim}</p>
                          </div>
                        </div>
                      </div>

                      {/* YM GT Reçete Kategorisi */}
                      <div className="border-l-4 border-green-500 pl-3">
                        <h5 className="font-semibold text-green-700 mb-2">YM GT Reçete</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <span className="text-sm text-gray-500">Galvanizleme (GLV01):</span>
                            <p>{receteGosterimValues.galvanizleme.deger} {receteGosterimValues.galvanizleme.birim}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Çinko (150 03):</span>
                            <p>{receteGosterimValues.cinko.deger} {receteGosterimValues.cinko.birim}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Asit (SM.HİDROLİK.ASİT):</span>
                            <p>{receteGosterimValues.asit.deger} {receteGosterimValues.asit.birim}</p>
                          </div>
                        </div>
                      </div>

                      {/* YM ST Reçete Kategorisi */}
                      <div className="border-l-4 border-purple-500 pl-3">
                        <h5 className="font-semibold text-purple-700 mb-2">YM ST Reçete</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <span className="text-sm text-gray-500">Filmaşin:</span>
                            <p>{selectedYmSt && selectedYmSt.length > 0 ?
                                `FLM.${selectedYmSt[0].filmasin || '0600'}.${selectedYmSt[0].quality || '1006'}` :
                                receteGosterimValues.filmasin ? receteGosterimValues.filmasin.kod : 'Filmaşin'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Tel Çekme (TLC01):</span>
                            <p>{receteGosterimValues.tel_cekme ? receteGosterimValues.tel_cekme.deger : '0.02'} DK</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-500 italic mb-2">Reçete verileri hesaplanıyor...</p>
                      <button
                        onClick={() => updateReceteGosterimValues(receteFormValues, formValues.kg)}
                        className="px-2 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                      >
                        Reçete Verilerini Oluştur
                      </button>
                    </div>
                  )}
                </div>
                
                {/* İşlem Butonları */}
                <div className="flex flex-col md:flex-row justify-between space-y-2 md:space-y-0 md:space-x-2 mt-4">
                  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      İptal
                    </button>
                    
                    {selectedTalep ? (
                      <>
                        <button
                          onClick={handleApproveTalep}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                          disabled={loading}
                        >
                          {loading ? 'İşleniyor...' : 'Talebi Onayla'}
                        </button>
                        <button
                          onClick={handleShowRejectModal}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                          disabled={loading}
                        >
                          {loading ? 'İşleniyor...' : 'Talebi Reddet'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleSaveToDatabase}
                        className={`px-4 py-2 ${databaseSaved ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-md hover:bg-blue-700 transition-colors`}
                        disabled={loading}
                      >
                        {loading ? 'Kaydediliyor...' : databaseSaved ? 'Veritabanına Kaydedildi' : 'Veritabanına Kaydet'}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                    <button
                      onClick={() => handleCreateExcelRequest('stokKarti')}
                      className={`px-4 py-2 ${excelCreated.stokKarti ? 'bg-green-600' : 'bg-orange-600'} text-white rounded-md hover:bg-orange-700 transition-colors`}
                      disabled={loading}
                    >
                      {loading ? 'İşleniyor...' : excelCreated.stokKarti ? 'Stok Kartı Excel Oluşturuldu' : 'Stok Kartı Excel Oluştur'}
                    </button>
                    
                    <button
                      onClick={() => handleCreateExcelRequest('recete')}
                      className={`px-4 py-2 ${excelCreated.recete ? 'bg-green-600' : 'bg-orange-600'} text-white rounded-md hover:bg-orange-700 transition-colors`}
                      disabled={loading}
                    >
                      {loading ? 'İşleniyor...' : excelCreated.recete ? 'Reçete Excel Oluşturuldu' : 'Reçete Excel Oluştur'}
                    </button>
                    
                    <button
                      onClick={handleGenerateAllExcels}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      disabled={loading}
                    >
                      {loading ? 'İşleniyor...' : 'Tüm Excel Dosyalarını Oluştur'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'edit-ymst' && (
            <div className="bg-white p-6 rounded-md shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">YM ST Düzenleme</h3>
                <button
                  onClick={handleEditComplete}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ← Geri
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Seçili YM ST'ler */}
                <div>
                  <h4 className="text-md font-semibold mb-2">Seçili YM ST'ler</h4>
                  
                  {selectedYmSt.length > 0 ? (
                    <div className="space-y-2">
                      {selectedYmSt.map((ymSt, index) => (
                        <div key={ymSt.id || ymSt.stok_kodu || index}
                            className={`border rounded-md p-3 ${
                              ymSt.source === 'auto-generated' ? 'border-green-300 bg-green-50' :
                              ymSt.source === 'database' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                            }`}>
                          {/* Source indicator */}
                          {ymSt.source && (
                            <div className="mb-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                ymSt.source === 'auto-generated' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {ymSt.sourceLabel || (ymSt.source === 'auto-generated' ? 'Otomatik oluşturuldu' : 'Veritabanından')}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-sm text-gray-500">Stok Kodu:</span>
                              <p>{ymSt.stok_kodu}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Çap (mm):</span>
                              <p>{ymSt.cap}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Filmaşin:</span>
                              <p>{ymSt.filmasin}.{ymSt.quality}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveYmSt(ymSt.id || ymSt.stok_kodu)}
                              className="text-red-500 hover:text-red-700"
                              title="Kaldır"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Henüz YM ST seçilmedi</p>
                  )}
                </div>
                
                {/* YM ST Arama & Ekleme Butonları */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowYmStSearchModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Mevcut YM ST Ekle
                  </button>
                  <button
                    onClick={() => setShowYmStCreateModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Yeni YM ST Oluştur
                  </button>
                </div>
                
                {/* Otomatik YM ST Hesaplama Butonu */}
                <div className="mt-4">
                  <button
                    onClick={() => handleYmStAutoSelect(formValues)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    YM ST Önerilerini Yeniden Hesapla
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Bu işlem mevcut YM ST listesini silip, MM GT çapına uygun YM ST önerilerini otomatik olarak hesaplar.
                  </p>
                </div>
                
                {/* İşlem Butonları */}
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={handleEditComplete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Tamamla
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'edit-recete' && (
            <div className="bg-white p-6 rounded-md shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Reçete Düzenleme</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      // Otomatik Hesapla fonksiyonu
                      try {
                        // MM GT, YM GT ve YM ST reçete verilerini hesapla
                        const updatedValues = calculateReceteValues();

                        // Reçete form değerlerini güncelle
                        setReceteFormValues(updatedValues);

                        toast.success('Reçete değerleri otomatik hesaplandı');
                      } catch (error) {
                        console.error('Otomatik hesaplama hatası:', error);
                        toast.error('Reçete hesaplanamadı: ' + error.message);
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Otomatik Hesapla
                  </button>
                  <button
                    onClick={handleEditComplete}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    ← Geri
                  </button>
                </div>
              </div>
              
              <Formik
                initialValues={receteFormValues}
                validationSchema={receteValidationSchema}
                onSubmit={(values) => {
                  setReceteFormValues(values);
                  setReceteData(values);
                  updateReceteGosterimValues(values, formValues.kg);
                  handleEditComplete();
                }}
                enableReinitialize
              >
                {({ values, setFieldValue, isSubmitting, errors, touched }) => (
                  <Form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Çinko Tüketimi (150 03)
                        </label>
                        <Field
                          type="text"
                          name="boraks_tuketimi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                        <ErrorMessage name="boraks_tuketimi" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Asit Tüketimi (SM.HİDROLİK.ASİT)
                        </label>
                        <Field
                          type="text"
                          name="asit_tuketimi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                        <ErrorMessage name="asit_tuketimi" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Desi Tüketimi (SM.DESİ.PAK)
                        </label>
                        <Field
                          type="text"
                          name="desi_tuketimi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                        <ErrorMessage name="desi_tuketimi" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Paketleme Süresi (GTPKT01)
                        </label>
                        <Field
                          type="text"
                          name="paketleme_suresi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                        <ErrorMessage name="paketleme_suresi" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Galvanizleme Süresi (GLV01)
                        </label>
                        <Field
                          type="text"
                          name="galvanizleme_suresi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                        <ErrorMessage name="galvanizleme_suresi" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tel Çekme Süresi (TLC01)
                        </label>
                        <Field
                          type="text"
                          name="tel_cekme_suresi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                        <ErrorMessage name="tel_cekme_suresi" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Çelik Çember (AMB.APEX CEMBER 38X080)
                        </label>
                        <Field
                          type="text"
                          name="celik_cember_tuketimi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Çember Tokası (AMB.TOKA.SIGNODE.114P. DKP)
                        </label>
                        <Field
                          type="text"
                          name="cember_tokasi_tuketimi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kaldırma Kancası (SM.7MMHALKA)
                        </label>
                        <Field
                          type="text"
                          name="kaldirma_kancasi_tuketimi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Karton (AMB.ÇEM.KARTON.GAL)
                        </label>
                        <Field
                          type="text"
                          name="karton_tuketimi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Naylon ({getNaylonKodu(formValues.ic_cap)})
                        </label>
                        <Field
                          type="text"
                          name="naylon_tuketimi"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleReceteInputChange}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-4">
                      <button
                        type="button"
                        onClick={handleEditComplete}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          )}
        </>
      )}

      {activePage === 'talepler' && (
        <div className="bg-white p-6 rounded-md shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Talepler</h3>
            
            <div className="flex space-x-2">
              <select
                value={talepFilter.status}
                onChange={handleTalepStatusChange}
                className="p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              >
                <option value="pending">Bekleyen Talepler</option>
                <option value="approved">Onaylanan Talepler</option>
                <option value="rejected">Reddedilen Talepler</option>
                <option value="all">Tüm Talepler</option>
              </select>
              
              <input
                type="text"
                value={talepFilter.search}
                onChange={handleTalepSearchChange}
                placeholder="Ara..."
                className="p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
              
              <button
                onClick={fetchTalepList}
                className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                title="Yenile"
              >
                ↻
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="text-gray-500">Yükleniyor...</div>
            </div>
          ) : filteredTalepItems.length === 0 ? (
            <div className="bg-gray-50 p-4 text-center text-gray-500 rounded-md">
              {talepFilter.search ? 
                'Arama kriterlerine uygun talep bulunamadı.' : 
                talepFilter.status === 'pending' ? 
                  'Bekleyen talep bulunmamaktadır.' : 
                  talepFilter.status === 'approved' ? 
                    'Onaylanmış talep bulunmamaktadır.' : 
                    talepFilter.status === 'rejected' ? 
                      'Reddedilmiş talep bulunmamaktadır.' : 
                      'Talep bulunmamaktadır.'
              }
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çap
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kaplama Türü
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kaplama
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mukavemet
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oluşturma Tarihi
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTalepItems.map((talep, index) => (
                    <tr key={talep.id || index} className={talep.status === 'pending' ? 'bg-yellow-50' : talep.status === 'approved' ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {talep.cap} mm
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {talep.kod_2}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {talep.kaplama} gr/m²
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {talep.min_mukavemet}-{talep.max_mukavemet} MPa
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${talep.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            talep.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {talep.status === 'pending' ? 'Bekliyor' : 
                           talep.status === 'approved' ? 'Onaylandı' : 
                           'Reddedildi'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(talep.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewTalepDetails(talep.id)}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          Görüntüle
                        </button>
                        {talep.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                handleViewTalepDetails(talep.id).then(() => {
                                  handleApproveTalep();
                                });
                              }}
                              className="text-green-600 hover:text-green-900 mr-2"
                            >
                              Onayla
                            </button>
                            <button
                              onClick={() => {
                                handleViewTalepDetails(talep.id).then(() => {
                                  handleShowRejectModal();
                                });
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reddet
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Modaller */}
      {/* Arama Modalı */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Ürün Ara</h3>
            
            <Formik
              initialValues={{
                stok_kodu: '',
                cap: '',
                kod_2: '',
                kaplama: ''
              }}
              onSubmit={handleSearch}
            >
              {({ values, handleChange, isSubmitting }) => (
                <Form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stok Kodu
                    </label>
                    <Field
                      type="text"
                      name="stok_kodu"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Çap (mm)
                    </label>
                    <Field
                      type="text"
                      name="cap"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kaplama Türü
                    </label>
                    <Field
                      as="select"
                      name="kod_2"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Seçiniz</option>
                      <option value="NIT">NIT</option>
                      <option value="PAD">PAD</option>
                    </Field>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kaplama (gr/m²)
                    </label>
                    <Field
                      type="text"
                      name="kaplama"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowSearchModal(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      {isSubmitting ? 'Aranıyor...' : 'Ara'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
      
      {/* Veritabanı Modalı */}
      {showDatabaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-5xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Veritabanı İçeriği</h3>
              
              <div className="flex space-x-2">
                <select
                  value={databaseFilter.type}
                  onChange={(e) => setDatabaseFilter({...databaseFilter, type: e.target.value})}
                  className="p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                >
                  <option value="mmGt">MM GT</option>
                  <option value="ymGt">YM GT</option>
                  <option value="ymSt">YM ST</option>
                  <option value="mmGtRecete">MM GT Reçete</option>
                  <option value="ymGtRecete">YM GT Reçete</option>
                  <option value="ymStRecete">YM ST Reçete</option>
                </select>
                
                <input
                  type="text"
                  value={databaseFilter.search}
                  onChange={(e) => setDatabaseFilter({...databaseFilter, search: e.target.value})}
                  placeholder="Ara..."
                  className="p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                />
                
                <button
                  onClick={handleRefreshDatabase}
                  className={`p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${refreshingDatabase ? 'animate-spin' : ''}`}
                  disabled={refreshingDatabase}
                  title="Veritabanını Yenile"
                >
                  ↻
                </button>
              </div>
              
              <button
                onClick={() => setShowDatabaseModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {loading || refreshingDatabase ? (
              <div className="flex justify-center items-center p-8">
                <div className="text-gray-500">Yükleniyor...</div>
              </div>
            ) : filteredDatabaseItems.length === 0 ? (
              <div className="bg-gray-50 p-4 text-center text-gray-500 rounded-md">
                Ürün bulunamadı
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {databaseFilter.type === 'mmGt' || databaseFilter.type === 'ymGt' || databaseFilter.type === 'ymSt' ? (
                        <>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stok Kodu
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Çap
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kaplama Türü
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kaplama
                          </th>
                        </>
                      ) : (
                        <>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mamul Kodu
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bileşen Kodu
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Miktar
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Birim
                          </th>
                        </>
                      )}
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDatabaseItems.map((item) => (
                      <tr key={item.id}>
                        {databaseFilter.type === 'mmGt' || databaseFilter.type === 'ymGt' || databaseFilter.type === 'ymSt' ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.stok_kodu}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.cap} mm
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.kod_2}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.kaplama} gr/m²
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.mamul_kodu}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.bilesen_kodu}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.miktar}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.olcu_br}
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {(databaseFilter.type === 'mmGt' || databaseFilter.type === 'ymGt' || databaseFilter.type === 'ymSt') && (
                            <button
                              onClick={() => handleSelectDatabaseItem(item)}
                              className="text-blue-600 hover:text-blue-900 mr-2"
                            >
                              Seç
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteDatabaseItem(databaseFilter.type, item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDatabaseModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* YM ST Arama Modalı */}
      {showYmStSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">YM ST Seçimi</h3>
              
              <button
                onClick={() => {
                  setShowYmStSearchModal(false);
                  setSelectedYmStToAdd(null);
                  setSearchYmSt("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                value={searchYmSt}
                onChange={handleYmStSearch}
                placeholder="YM ST Ara..."
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="text-gray-500">Yükleniyor...</div>
              </div>
            ) : filteredYmStList.length === 0 ? (
              <div className="bg-gray-50 p-4 text-center text-gray-500 rounded-md">
                YM ST bulunamadı
              </div>
            ) : (
              <div className="overflow-y-auto max-h-80 mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seç
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stok Kodu
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Çap
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Filmaşin
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kalite
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredYmStList.map((ymSt) => (
                      <tr 
                        key={ymSt.id || ymSt.stok_kodu}
                        onClick={() => handleSelectYmSt(ymSt)}
                        className={`cursor-pointer ${selectedYmStToAdd && selectedYmStToAdd.id === ymSt.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="radio"
                            name="selectedYmSt"
                            checked={selectedYmStToAdd && selectedYmStToAdd.id === ymSt.id}
                            onChange={() => handleSelectYmSt(ymSt)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {ymSt.stok_kodu}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ymSt.cap} mm
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ymSt.filmasin}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ymSt.quality}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowYmStSearchModal(false);
                  setSelectedYmStToAdd(null);
                  setSearchYmSt("");
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddYmSt}
                disabled={!selectedYmStToAdd}
                className={`px-4 py-2 ${selectedYmStToAdd ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'} text-white rounded-md transition-colors`}
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* YM ST Oluşturma Modalı */}
      {showYmStCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Yeni YM ST Oluştur</h3>
              
              <button
                onClick={() => setShowYmStCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <Formik
              initialValues={{
                cap: formValues.kod_2 === 'NIT' ? (parseFloat(formValues.cap) * 0.96).toFixed(2) : formValues.cap, // NIT için %4 küçültme
                filmasin: 600,
                quality: '1006'
              }}
              onSubmit={handleCreateYmSt}
            >
              {({ values, setFieldValue, isSubmitting }) => (
                <Form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Çap (mm)
                    </label>
                    <Field
                      type="text"
                      name="cap"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Not: YM ST çapı, MM GT çapından ({formValues.cap} mm) küçük olmalıdır. 
                      Galvanizleme işlemi tel çapını arttırır.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filmaşin
                    </label>
                    <Field
                      as="select"
                      name="filmasin"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      <option value={550}>550</option>
                      <option value={600}>600</option>
                      <option value={700}>700</option>
                      <option value={800}>800</option>
                      <option value={900}>900</option>
                      <option value={1000}>1000</option>
                    </Field>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kalite
                    </label>
                    <Field
                      as="select"
                      name="quality"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="1005">1005</option>
                      <option value="1006">1006</option>
                      <option value="1008">1008</option>
                      <option value="1010">1010</option>
                    </Field>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowYmStCreateModal(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}

      {/* Excel Oluşturma Uyarı Modalı */}
      {showExcelWithoutSaveWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-yellow-600">Uyarı</h3>
              
              <button
                onClick={() => setShowExcelWithoutSaveWarning(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Netsis yükleme Excel'i oluşturmak istiyorsunuz, ancak bu ürün henüz veritabanına kaydedilmemiş. 
                Excel oluşturma işlemini veritabanına kaydetmeden devam etmek istediğinizden emin misiniz?
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowExcelWithoutSaveWarning(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => handleCreateExcelOnly(excelTypeToGenerate)}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
              >
                Excel Oluştur
              </button>
              <button
                onClick={() => handleSaveAndCreateExcel(excelTypeToGenerate)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Kaydet ve Excel Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Talep Detay Modalı */}
      {showTalepDetailModal && selectedTalep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Talep Detayları</h3>
              
              <button
                onClick={() => {
                  setShowTalepDetailModal(false);
                  setSelectedTalep(null);
                  setSelectedTalepId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Çap (mm):</span>
                  <p>{selectedTalep.cap}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Kaplama Türü:</span>
                  <p>{selectedTalep.kod_2}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Kaplama (gr/m²):</span>
                  <p>{selectedTalep.kaplama}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Mukavemet (MPa):</span>
                  <p>{selectedTalep.min_mukavemet}-{selectedTalep.max_mukavemet}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Tolerans:</span>
                  <p>-{selectedTalep.tolerans_minus}/+{selectedTalep.tolerans_plus}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Bobın Ölçüleri (ID/OD):</span>
                  <p>{selectedTalep.ic_cap}/{selectedTalep.dis_cap} cm</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Ağırlık (kg):</span>
                  <p>{selectedTalep.kg}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Unwinding:</span>
                  <p>{selectedTalep.unwinding || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Shrink:</span>
                  <p>{selectedTalep.shrink || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Durum:</span>
                  <p className={`
                    ${selectedTalep.status === 'pending' ? 'text-yellow-600' : 
                      selectedTalep.status === 'approved' ? 'text-green-600' : 
                      'text-red-600'}`}>
                    {selectedTalep.status === 'pending' ? 'Bekliyor' : 
                     selectedTalep.status === 'approved' ? 'Onaylandı' : 
                     'Reddedildi'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Oluşturma Tarihi:</span>
                  <p>{new Date(selectedTalep.created_at).toLocaleString('tr-TR')}</p>
                </div>
                
                {selectedTalep.processed_at && (
                  <div>
                    <span className="text-sm text-gray-500">İşlem Tarihi:</span>
                    <p>{new Date(selectedTalep.processed_at).toLocaleString('tr-TR')}</p>
                  </div>
                )}
                
                {selectedTalep.processed_by && (
                  <div>
                    <span className="text-sm text-gray-500">İşleyen Kullanıcı:</span>
                    <p>{selectedTalep.processed_by}</p>
                  </div>
                )}
                
                {selectedTalep.rejection_reason && (
                  <div className="col-span-2">
                    <span className="text-sm text-gray-500">Red Nedeni:</span>
                    <p className="text-red-600">{selectedTalep.rejection_reason}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => {
                    setShowTalepDetailModal(false);
                    setSelectedTalep(null);
                    setSelectedTalepId(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Kapat
                </button>
                
                {selectedTalep.status === 'pending' && (
                  <>
                    <button
                      onClick={handleApproveTalep}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      disabled={loading}
                    >
                      {loading ? 'İşleniyor...' : 'Onayla'}
                    </button>
                    <button
                      onClick={handleShowRejectModal}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      disabled={loading}
                    >
                      {loading ? 'İşleniyor...' : 'Reddet'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Talep Reddetme Modalı */}
      {showRejectTalepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Talebi Reddet</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Red Nedeni
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                rows={4}
                placeholder="Talebi neden reddettiğinizi açıklayın..."
              />
              {error && !rejectionReason.trim() && (
                <div className="text-red-500 text-sm mt-1">Red nedeni belirtmelisiniz</div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRejectTalepModal(false);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleRejectTalep}
                disabled={loading || !rejectionReason.trim()}
                className={`px-4 py-2 ${!rejectionReason.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white rounded-md transition-colors`}
              >
                {loading ? 'İşleniyor...' : 'Reddet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Default export
export default GalvanizliTelNetsis;
