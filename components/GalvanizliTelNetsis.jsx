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

// Talep doğrulama şeması
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
  const [filteredTalepItems, setFilteredTalepItems] = useState([]);
  const [talepFilter, setTalepFilter] = useState({ status: 'pending', search: '' });
  const [talepCount, setTalepCount] = useState({ pending: 0, all: 0 });
  const [selectedTalep, setSelectedTalep] = useState(null);
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
      
      // MM GT Reçete listesini al
      const mmGtReceteRes = await fetchWithAuth(API_URLS.galMmGtRecete);
      let mmGtReceteList = [];
      if (mmGtReceteRes.ok) {
        mmGtReceteList = await mmGtReceteRes.json();
      }
      
      // YM GT Reçete listesini al
      const ymGtReceteRes = await fetchWithAuth(API_URLS.galYmGtRecete);
      let ymGtReceteList = [];
      if (ymGtReceteRes.ok) {
        ymGtReceteList = await ymGtReceteRes.json();
      }
      
      // YM ST Reçete listesini al
      const ymStReceteRes = await fetchWithAuth(API_URLS.galYmStRecete);
      let ymStReceteList = [];
      if (ymStReceteRes.ok) {
        ymStReceteList = await ymStReceteRes.json();
      }

      setProductDatabase({
        mmGtList: Array.isArray(mmGtList) ? mmGtList : [],
        ymGtList: Array.isArray(ymGtList) ? ymGtList : [],
        ymStList: Array.isArray(ymStList) ? ymStList : [],
        mmGtReceteList: Array.isArray(mmGtReceteList) ? mmGtReceteList : [],
        ymGtReceteList: Array.isArray(ymGtReceteList) ? ymGtReceteList : [],
        ymStReceteList: Array.isArray(ymStReceteList) ? ymStReceteList : []
      });
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
      
      let response;
      try {
        // Doğrudan API URL'ini kullan
        response = await fetchWithAuth('/api/gal_sal_requests');
      } catch (error) {
        // API endpoint bulunamadıysa boş liste döndür
        console.warn('Talep listesi alınamadı:', error);
        setTalepList([]);
        setLoading(false);
        return;
      }
      
      if (response && response.ok) {
        const data = await response.json();
        setTalepList(Array.isArray(data) ? data : []);
        
        // Talep sayılarını da getir
        await fetchTalepCount();
      } else {
        console.warn('Talep listesi alınamadı:', response ? response.status : 'Yanıt yok');
        setTalepList([]);
      }
    } catch (error) {
      console.warn('Talep listesi yüklenirken hata:', error);
      setTalepList([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Talep sayısını getir
  const fetchTalepCount = useCallback(async () => {
    try {
      // Endpoint kontrolü yap
      let pendingRes, allRes;
      
      try {
        // Bekleyen talep sayısını al
        pendingRes = await fetchWithAuth('/api/gal_sal_requests/count?status=pending');
        
        // Toplam talep sayısını al
        allRes = await fetchWithAuth('/api/gal_sal_requests/count');
      } catch (error) {
        console.warn('Talep sayısı endpoint erişimi hatası:', error);
        setTalepCount({ pending: 0, all: 0 });
        return;
      }
      
      if (pendingRes && pendingRes.ok && allRes && allRes.ok) {
        const pendingData = await pendingRes.json();
        const allData = await allRes.json();
        
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
    try {
      setLoading(true);
      
      let response;
      try {
        response = await fetchWithAuth(`/api/gal_sal_requests/${talepId}`);
      } catch (error) {
        console.warn('Talep detayları endpoint erişimi hatası:', error);
        setError('Talep detayları yüklenirken bir hata oluştu');
        return null;
      }
      
      if (response && response.ok) {
        const data = await response.json();
        setSelectedTalep(data);
        
        // Talep değerlerini form verilerine dönüştür
        const formValues = {
          cap: parseFloat(data.cap),
          kod_2: data.kod_2,
          kaplama: parseInt(data.kaplama),
          min_mukavemet: parseInt(data.min_mukavemet),
          max_mukavemet: parseInt(data.max_mukavemet),
          tolerans_plus: parseFloat(data.tolerans_plus),
          tolerans_minus: parseFloat(data.tolerans_minus),
          ic_cap: parseInt(data.ic_cap),
          dis_cap: parseInt(data.dis_cap),
          kg: parseInt(data.kg),
          unwinding: data.unwinding,
          shrink: data.shrink
        };
        
        // Form değerlerini ayarla ve otomatik hesaplamaları yap
        setMmGtData(null);
        setYmGtData(null);
        setSelectedYmSt([]);
        setReceteData(null);
        setIsEditMode(false);
        setDataExist(false);
        
        // Reçete ve YM ST değerlerini otomatik olarak hesapla
        await processAutomaticCalculations(formValues);
        
        return formValues;
      } else {
        throw new Error(`Talep detayları alınamadı: ${response ? response.status : 'Yanıt yok'}`);
      }
    } catch (error) {
      console.error('Talep detayları yüklenirken hata:', error);
      setError('Talep detayları yüklenirken bir hata oluştu');
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
      
      // Talep bilgilerini al
      const talepData = selectedTalep || await fetchTalepDetails(talepId);
      if (!talepData) {
        throw new Error('Talep bilgileri alınamadı');
      }
      
      // Form değerlerine dönüştür
      const formValues = {
        cap: parseFloat(talepData.cap),
        kod_2: talepData.kod_2,
        kaplama: parseInt(talepData.kaplama),
        min_mukavemet: parseInt(talepData.min_mukavemet), 
        max_mukavemet: parseInt(talepData.max_mukavemet),
        tolerans_plus: parseFloat(talepData.tolerans_plus),
        tolerans_minus: parseFloat(talepData.tolerans_minus),
        ic_cap: parseInt(talepData.ic_cap),
        dis_cap: parseInt(talepData.dis_cap),
        kg: parseInt(talepData.kg),
        unwinding: talepData.unwinding,
        shrink: talepData.shrink
      };
      
      // Ürünleri ve reçeteleri oluştur
      const { mmGt, ymGt, ymStList, recete } = await processAutomaticCalculations(formValues);
      
      // MM GT kaydet
      const savedMmGt = await saveMMGT(formValues);
      
      if (!savedMmGt) {
        throw new Error('MM GT kaydedilemedi');
      }
      
      // YM GT kaydet 
      const savedYmGt = await saveYMGT(formValues, savedMmGt.id);
      
      if (!savedYmGt) {
        throw new Error('YM GT kaydedilemedi');
      }
      
      // YM ST'leri kaydet
      for (const ymSt of selectedYmSt) {
        await saveYMST(ymSt, savedMmGt.id);
      }
      
      // Reçeteleri kaydet
      await saveRecete(receteData, savedMmGt.id, savedYmGt.id);
      
      // Talebi onayla
      const updateResponse = await fetchWithAuth(`/api/gal_sal_requests/${talepId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mm_gt_id: savedMmGt.id,
          processed_by: user?.id || 'system'
        })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Talep durumu güncellenemedi');
      }
      
      setSuccessMessage('Talep başarıyla onaylandı ve ürün oluşturuldu');
      toast.success('Talep başarıyla onaylandı ve ürün oluşturuldu');
      
      // Talep listesini güncelle
      await fetchTalepList();
      
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
      
      const response = await fetchWithAuth(`/api/gal_sal_requests/${talepId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processed_by: user?.id || 'system',
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
        sequenceNumber = sequence || 0;
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

  // YM ST'lerin otomatik seçimi - İyileştirilmiş ve veri kaynağını gösteren versiyon
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
        'YM.GT.NIT.0245.00': 'YM.ST.0240.0600.1006'
        // ...diğer eşleşmeler
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
    }
  };  // YM ST filtrele
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

  // Veritabanına kaydet - Optimizasyon yapılmış versiyon
  const handleSaveToDatabase = async () => {
    try {
      setLoading(true);

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
      }

      // Başlangıç zamanını kaydet (performans ölçümü için)
      const startTime = Date.now();
      toast.info('Veritabanına kayıt başlatıldı...', { autoClose: 1000 });

      // Veritabanı kaydetme işlemleri - Paralel işlemler için Promise.all kullanımı

      // 1. MM GT kaydet
      const savedMmGtPromise = saveMMGT(formValues);
      const savedMmGt = await savedMmGtPromise;

      if (!savedMmGt) {
        throw new Error('MM GT kaydedilemedi');
      }

      // 2. MM GT ve YM GT kaydetme işlemlerini paralel yap
      const savedYmGtPromise = saveYMGT(formValues, savedMmGt.id);

      // 3. YM ST'leri ve YM GT'yi paralel kaydet
      const savedYmGt = await savedYmGtPromise;

      if (!savedYmGt) {
        throw new Error('YM GT kaydedilemedi');
      }

      // 4. Tüm YM ST'leri paralel olarak kaydet
      const ymStPromises = uniqueYmSt.map(ymSt => saveYMST(ymSt, savedMmGt.id));
      await Promise.all(ymStPromises);

      // 5. Reçeteleri paralel olarak kaydet
      await saveReceteOptimized(receteFormValues, savedMmGt.id, savedYmGt.id, uniqueYmSt);

      // 6. State güncellemelerini yap
      setDatabaseSaved(true);
      setIsEditMode(true);
      setMmGtData(savedMmGt);
      setYmGtData(savedYmGt);
      setReceteData(receteFormValues);

      // 7. Veritabanı verilerini güncelle
      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000; // saniye cinsinden

      await fetchProductDatabase();

      toast.success(`Veriler başarıyla veritabanına kaydedildi (${elapsedTime.toFixed(2)} sn)`);
    } catch (error) {
      console.error('Veritabanı kaydetme hatası:', error);
      toast.error('Veritabanına kayıt sırasında hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Optimizasyon yapılmış reçete kaydetme fonksiyonu
  const saveReceteOptimized = async (receteData, mmGtId, ymGtId, ymStList) => {
    try {
      // MM GT, YM GT ve YM ST reçetelerini paralel oluştur
      const mmGtRecetePromise = createMMGTRecete(mmGtId, ymGtId, receteData);
      const ymGtRecetePromise = createYMGTRecete(ymGtId, receteData);

      // YM ST reçetelerini paralel oluştur
      const ymStRecetePromises = ymStList.map(ymSt => {
        if (ymSt && ymSt.id) {
          return createYMSTRecete(ymSt.id, receteData);
        }
        return Promise.resolve();
      });

      // Tüm reçete oluşturma işlemlerini paralel yürüt
      await Promise.all([mmGtRecetePromise, ymGtRecetePromise, ...ymStRecetePromises]);

      return true;
    } catch (error) {
      console.error('Reçete kaydetme hatası:', error);
      toast.error('Reçete kaydedilirken bir hata oluştu: ' + error.message);
      return false;
    }
  };

  // Excel oluştur (Artık client-side çalıştığı için uyarı gerekmiyor)
  const handleCreateExcelRequest = (type) => {
    // Reçete Excel'i artık client-side oluşturuluyor, veritabanına kaydedilmemiş olsa bile çalışabilir
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
    await handleSaveToDatabase();
    await handleCreateExcelOnly(type);
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
    setSelectedTalepId(talepId);
    const talepData = await fetchTalepDetails(talepId);
    if (talepData) {
      setShowTalepDetailModal(true);
      setCurrentStep('summary');
    }
  };

  // Talebi onaylama
  const handleApproveTalep = async () => {
    if (!selectedTalep || !selectedTalepId) {
      setError('İşlenecek talep seçilmedi');
      return;
    }
    
    try {
      setLoading(true);
      const result = await approveTalep(selectedTalepId);
      
      if (result) {
        setShowTalepDetailModal(false);
        setSelectedTalep(null);
        setSelectedTalepId(null);
        
        // Formları sıfırla
        handleNewProduct();
        
        // Talep listesini güncelle
        await fetchTalepList();
      }
    } catch (error) {
      console.error('Talep onaylama hatası:', error);
      setError('Talep onaylanırken bir hata oluştu: ' + error.message);
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
                    <button
                      onClick={handleEditYmSt}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Düzenle
                    </button>
                  </div>
                  
                  {selectedYmSt.length > 0 ? (
                    <div className="space-y-2">
                      {selectedYmSt.map((ymSt, index) => (
                        <div key={ymSt.id || ymSt.stok_kodu || index}
                            className={`border rounded-md p-3 ${
                              ymSt.source === 'auto-generated' ? 'border-green-300 bg-green-50' :
                              ymSt.source === 'database' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                            }`}>
                          <div className="flex flex-col space-y-2">
                            {/* Kaynak bilgisi */}
                            {ymSt.source && (
                              <div className="flex justify-end w-full">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  ymSt.source === 'auto-generated' ? 'bg-green-100 text-green-800 border border-green-300' :
                                  ymSt.source === 'database' ? 'bg-blue-100 text-blue-800 border border-blue-300' : ''
                                }`}>
                                  {ymSt.sourceLabel || (ymSt.source === 'auto-generated' ? 'Otomatik oluşturuldu' :
                                    ymSt.source === 'database' ? 'Veritabanından' : 'Bilinmiyor')}
                                </span>
                              </div>
                            )}

                            {/* Ana bilgiler */}
                            <div className="flex justify-between items-center w-full">
                              <div>
                                <span className="text-sm text-gray-500">Stok Kodu:</span>
                                <p className="font-medium">{ymSt.stok_kodu}</p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Çap (mm):</span>
                                <p className="font-medium">{ymSt.cap}</p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Filmaşin:</span>
                                <p className="font-medium">{ymSt.filmasin}.{ymSt.quality}</p>
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
                            <span className="text-sm text-gray-500">Paketleme ({receteGosterimValues.paketleme?.kod || 'GTPKT01'}):</span>
                            <p>{receteGosterimValues.paketleme?.deger || 0} {receteGosterimValues.paketleme?.birim || 'saat/t'}</p>
                          </div>
                          {receteGosterimValues.kaldirma_kancasi && (
                            <div>
                              <span className="text-sm text-gray-500">Kaldırma Kancası ({receteGosterimValues.kaldirma_kancasi?.kod || 'KNC'}):</span>
                              <p>{receteGosterimValues.kaldirma_kancasi?.deger || 0} {receteGosterimValues.kaldirma_kancasi?.birim || 'adet/t'}</p>
                            </div>
                          )}
                          {receteGosterimValues.karton && (
                            <div>
                              <span className="text-sm text-gray-500">Karton ({receteGosterimValues.karton?.kod || 'KRT'}):</span>
                              <p>{receteGosterimValues.karton?.deger || 0} {receteGosterimValues.karton?.birim || 'adet/t'}</p>
                            </div>
                          )}
                          {receteGosterimValues.naylon && (
                            <div>
                              <span className="text-sm text-gray-500">Naylon ({receteGosterimValues.naylon?.kod || 'NYL'}):</span>
                              <p>{receteGosterimValues.naylon?.deger || 0} {receteGosterimValues.naylon?.birim || 'kg/t'}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* YM GT Reçete Kategorisi */}
                      <div className="border-l-4 border-green-500 pl-3">
                        <h5 className="font-semibold text-green-700 mb-2">YM GT Reçete</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <span className="text-sm text-gray-500">Çinko Tüketimi ({receteGosterimValues.cinko?.kod || 'ZINC'}):</span>
                            <p>{receteGosterimValues.cinko?.deger || 0} {receteGosterimValues.cinko?.birim || 'kg/t'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">HCl Asit ({receteGosterimValues.asit?.kod || 'ACID'}):</span>
                            <p>{receteGosterimValues.asit?.deger || 0} {receteGosterimValues.asit?.birim || 'lt/t'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Silkajel ({receteGosterimValues.silkajel?.kod || 'SILKA'}):</span>
                            <p>{receteGosterimValues.silkajel?.deger || 0} {receteGosterimValues.silkajel?.birim || 'kg/t'}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">Galvanizleme ({receteGosterimValues.galvanizleme?.kod || 'GLV01'}):</span>
                            <p>{receteGosterimValues.galvanizleme?.deger || 0} {receteGosterimValues.galvanizleme?.birim || 'saat/t'}</p>
                          </div>
                          {receteGosterimValues.filmasin && (
                            <div>
                              <span className="text-sm text-gray-500">Filmaşin ({receteGosterimValues.filmasin?.kod || 'FILM'}):</span>
                              <p>{receteGosterimValues.filmasin?.deger || 0} {receteGosterimValues.filmasin?.birim || 'kg/t'}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* YM ST Reçete Kategorisi */}
                      <div className="border-l-4 border-purple-500 pl-3">
                        <h5 className="font-semibold text-purple-700 mb-2">YM ST Reçete</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <span className="text-sm text-gray-500">Tel Çekme ({receteGosterimValues.tel_cekme?.kod || 'TLC01'}):</span>
                            <p>{receteGosterimValues.tel_cekme?.deger || 0} {receteGosterimValues.tel_cekme?.birim || 'saat/t'}</p>
                          </div>
                          {receteGosterimValues.celik_cember && (
                            <div>
                              <span className="text-sm text-gray-500">Çelik Çember ({receteGosterimValues.celik_cember?.kod || 'CC'}):</span>
                              <p>{receteGosterimValues.celik_cember?.deger || 0} {receteGosterimValues.celik_cember?.birim || 'adet/kg'}</p>
                            </div>
                          )}
                          {receteGosterimValues.cember_tokasi && (
                            <div>
                              <span className="text-sm text-gray-500">Çember Tokası ({receteGosterimValues.cember_tokasi?.kod || 'CT'}):</span>
                              <p>{receteGosterimValues.cember_tokasi?.deger || 0} {receteGosterimValues.cember_tokasi?.birim || 'adet/kg'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Reçete verileri henüz oluşturulmadı</p>
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
                          <div className="flex flex-col space-y-2">
                            {/* Kaynak bilgisi */}
                            {ymSt.source && (
                              <div className="flex justify-end w-full">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  ymSt.source === 'auto-generated' ? 'bg-green-100 text-green-800 border border-green-300' :
                                  ymSt.source === 'database' ? 'bg-blue-100 text-blue-800 border border-blue-300' : ''
                                }`}>
                                  {ymSt.sourceLabel || (ymSt.source === 'auto-generated' ? 'Otomatik oluşturuldu' :
                                    ymSt.source === 'database' ? 'Veritabanından' : 'Bilinmiyor')}
                                </span>
                              </div>
                            )}

                            {/* Ana bilgiler */}
                            <div className="flex justify-between items-center w-full">
                              <div>
                                <span className="text-sm text-gray-500">Stok Kodu:</span>
                                <p className="font-medium">{ymSt.stok_kodu}</p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Çap (mm):</span>
                                <p className="font-medium">{ymSt.cap}</p>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Filmaşin:</span>
                                <p className="font-medium">{ymSt.filmasin}.{ymSt.quality}</p>
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
                <button
                  onClick={handleEditComplete}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ← Geri
                </button>
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
                onChange={(e) => {
                  setTalepFilter(prev => ({ ...prev, status: e.target.value }));
                  setTimeout(() => filterTalepItems(), 0);
                }}
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
                onChange={(e) => {
                  setTalepFilter(prev => ({ ...prev, search: e.target.value }));
                  setTimeout(() => filterTalepItems(), 0);
                }}
                placeholder="Ara..."
                className="p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
              />
              
              {/* Remove the Ara button as it's not needed */}
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

export default GalvanizliTelNetsis;
