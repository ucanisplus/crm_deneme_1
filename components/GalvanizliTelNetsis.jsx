// GalvanizliTelNetsis.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth } from '@/api-config';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

// Galvanizli Tel Context
const GalvanizliTelContext = createContext();

// Validation Schema
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

// Context Provider Bileşeni
export const GalvanizliTelProvider = ({ children }) => {
  // Form verilerini saklama state'leri
  const [mmGtData, setMmGtData] = useState(null);
  const [ymGtData, setYmGtData] = useState(null);
  const [ymStList, setYmStList] = useState([]);
  const [selectedYmSt, setSelectedYmSt] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [dataExist, setDataExist] = useState(false);
  const [activeTab, setActiveTab] = useState("mm-gt-tanimla");
  const { user } = useAuth();

  // Context değerleri
  const contextValue = {
    mmGtData, setMmGtData,
    ymGtData, setYmGtData,
    ymStList, setYmStList,
    selectedYmSt, setSelectedYmSt,
    loading, setLoading,
    error, setError,
    successMessage, setSuccessMessage,
    isEditMode, setIsEditMode,
    dataExist, setDataExist,
    activeTab, setActiveTab,
    searchProducts,
    saveMMGT,
    saveYMGT,
    saveYMST,
    generateExcel,
    getCurrentSequence,
    incrementSequence,
  };

  // Mevcut ürün dizilimini alma fonksiyonu
  async function getCurrentSequence(kod2, cap) {
    try {
      const response = await fetchWithAuth(`${API_URLS.galSequence}?kod_2=${kod2}&cap=${cap}`);
      
      if (!response.ok) {
        throw new Error('Sıra numarası alınamadı');
      }
      
      const data = await response.json();
      return data.sequence || 1;
    } catch (error) {
      console.error('Sıra numarası alınırken hata oluştu:', error);
      setError('Sıra numarası alınırken hata oluştu');
      return 1;
    }
  }

  // Dizilim artırma fonksiyonu
  async function incrementSequence(kod2, cap) {
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
  }

  // Ürün arama fonksiyonu
  async function searchProducts(searchParams) {
    setLoading(true);
    setError(null);
    setDataExist(false);

    try {
      // Parametreleri URL'ye dönüştür
      const queryParams = new URLSearchParams();
      
      if (searchParams.stok_kodu) {
        queryParams.append('stok_kodu', searchParams.stok_kodu);
      }
      if (searchParams.cap) {
        queryParams.append('cap', searchParams.cap);
      }
      if (searchParams.kod_2) {
        queryParams.append('kod_2', searchParams.kod_2);
      }
      if (searchParams.kg) {
        queryParams.append('kg', searchParams.kg);
      }
      
      // MM GT verilerini sorgula
      const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}?${queryParams.toString()}`);
      
      if (!mmGtResponse.ok) {
        throw new Error('MM GT verileri getirilemedi');
      }
      
      const mmGtResults = await mmGtResponse.json();
      
      if (mmGtResults && mmGtResults.length > 0) {
        const mmGt = mmGtResults[0];
        setMmGtData(mmGt);
        setDataExist(true);
        
        // YM GT verisini al
        const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${mmGt.id}`);
        
        if (!ymGtResponse.ok && ymGtResponse.status !== 404) {
          throw new Error('YM GT verileri getirilemedi');
        }
        
        const ymGtResults = await ymGtResponse.json();
        
        if (ymGtResults && ymGtResults.length > 0) {
          setYmGtData(ymGtResults[0]);
        }
        
        // İlişkili YM ST verilerini al
        const ymStRelResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
        
        if (!ymStRelResponse.ok && ymStRelResponse.status !== 404) {
          throw new Error('YM ST ilişkileri getirilemedi');
        }
        
        const ymStRelResults = await ymStRelResponse.json();
        
        if (ymStRelResults && ymStRelResults.length > 0) {
          const ymStIds = ymStRelResults.map(item => item.ym_st_id);
          
          // YM ST detaylarını al
          const ymStDetailsResponse = await fetchWithAuth(`${API_URLS.galYmSt}?ids=${ymStIds.join(',')}`);
          
          if (!ymStDetailsResponse.ok) {
            throw new Error('YM ST detayları getirilemedi');
          }
          
          const ymStDetails = await ymStDetailsResponse.json();
          
          if (ymStDetails && ymStDetails.length > 0) {
            setSelectedYmSt(ymStDetails);
          }
        }
        
        setIsEditMode(true);
      } else {
        setDataExist(false);
        setMmGtData(null);
        setYmGtData(null);
        setSelectedYmSt([]);
        setIsEditMode(false);
      }
    } catch (error) {
      console.error('Ürün arama hatası:', error);
      setError('Ürün arama sırasında bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // MM GT kaydetme fonksiyonu
  async function saveMMGT(values) {
    setLoading(true);
    setError(null);

    try {
      // Stok Kodu formatını oluştur
      const stockCode = `GT.${values.kod_2}.${values.cap.toString().padStart(4, '0')}.${values.sequence.toString().padStart(2, '0')}`;

      // Gümrük tarife kodunu belirle
      let gumrukTarifeKodu = '';
      if (values.cap >= 0.8 && values.cap <= 1.5) {
        gumrukTarifeKodu = '721720300011';
      } else if (values.cap > 1.5 && values.cap <= 6.0) {
        gumrukTarifeKodu = '721720300012';
      } else if (values.cap > 6.0) {
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

      // MM GT verilerini hazırla
      const mmGtDataToSave = {
        ...values,
        stok_kodu: stockCode,
        stok_adi: `Galvanizli Tel ${values.cap.toString().replace('.', ',')} mm -${values.tolerans_minus.toString().replace('.', ',')}/+${values.tolerans_plus.toString().replace('.', ',')} ${values.kaplama} gr/m²${values.min_mukavemet}-${values.max_mukavemet} MPa ID:${values.ic_cap} cm OD:${values.dis_cap} cm ${values.kg} kg`,
        ingilizce_isim: `Galvanized Steel Wire ${values.cap.toString().replace('.', ',')} mm -${values.tolerans_minus.toString().replace('.', ',')}/+${values.tolerans_plus.toString().replace('.', ',')} ${values.kaplama} gr/m²${values.min_mukavemet}-${values.max_mukavemet} MPa ID:${values.ic_cap} cm OD:${values.dis_cap} cm ${values.kg} kg`,
        grup_kodu: 'MM',
        kod_1: 'GT',
        muh_detay: '26',
        depo_kodu: '36',
        br_1: 'KG',
        br_2: 'TN',
        fiyat_birimi: 1,
        satis_kdv_orani: 20,
        alis_kdv_orani: 20,
        stok_turu: 'D',
        esnek_yapilandir: 'H',
        super_recete_kullanilsin: 'H',
        alis_doviz_tipi: 2,
        gumruk_tarife_kodu: gumrukTarifeKodu,
        mensei: '052',
        material: 'Galvanizli Tel',
        dia_mm: values.cap.toString().replace('.', ','),
        dia_tol_mm_plus: values.tolerans_plus.toString().replace('.', ','),
        dia_tol_mm_minus: values.tolerans_minus.toString().replace('.', ','),
        zing_coating_gr_m2: values.kaplama.toString(),
        tensile_st_mpa_min: values.min_mukavemet.toString(),
        tensile_st_mpa_max: values.max_mukavemet.toString(),
        wax: '+',
        lifting_lugs: '+',
        coil_dimensions_cm_id: values.ic_cap.toString(),
        coil_dimensions_cm_od: values.dis_cap.toString(),
        coil_weight_kg: values.kg.toString(),
        amb_shrink: ambShrink,
        created_by: user.id,
        updated_by: user.id
      };

      const response = await fetchWithAuth(API_URLS.galMmGt, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mmGtDataToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'MM GT kaydedilemedi');
      }

      const result = await response.json();
      setMmGtData(result);
      setSuccessMessage(isEditMode ? 'MM GT kaydı başarıyla güncellendi' : 'MM GT kaydı başarıyla oluşturuldu');
      toast.success(isEditMode ? 'MM GT kaydı başarıyla güncellendi' : 'MM GT kaydı başarıyla oluşturuldu');

      // Eğer yeni kayıt yapıldıysa sequence'ı artır
      if (!isEditMode) {
        await incrementSequence(values.kod_2, values.cap);
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
  }

  // YM GT kaydetme fonksiyonu
  async function saveYMGT(values, mmGtId) {
    setLoading(true);
    setError(null);

    try {
      // MM GT verisini API'den al
      const response = await fetchWithAuth(`${API_URLS.galMmGt}?id=${mmGtId}`);
      
      if (!response.ok) {
        throw new Error('MM GT bulunamadı');
      }
      
      const mmGtResult = await response.json();
      const mmGt = mmGtResult[0]; // API dizi döndürüyor
      
      if (!mmGt) {
        throw new Error('MM GT bulunamadı');
      }

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
        fiyat_birimi: 1,
        satis_kdv_orani: 20,
        alis_kdv_orani: 20,
        stok_turu: 'D',
        esnek_yapilandir: 'H',
        super_recete_kullanilsin: 'H',
        created_by: user.id,
        updated_by: user.id
      };

      // Önce var mı kontrol et
      const checkRes = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${mmGtId}`);
      
      if (!checkRes.ok && checkRes.status !== 404) {
        throw new Error('YM GT kontrolü yapılamadı');
      }
      
      const existing = await checkRes.json();
      
      let saveRes;
      if (existing && existing.length > 0) {
        // Güncelle
        ymGtDataToSave.id = existing[0].id;
        saveRes = await fetchWithAuth(API_URLS.galYmGt, {
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
      setYmGtData(savedData);
      return savedData;
    } catch (error) {
      console.error('YM GT kaydetme hatası:', error);
      setError('YM GT kaydı sırasında bir hata oluştu: ' + error.message);
      toast.error('YM GT kaydı sırasında bir hata oluştu: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  // YM ST kaydetme fonksiyonu
  async function saveYMST(values, mmGtId) {
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
          payda_1: 1.0,
          cevrim_degeri_1: 0,
          cevrim_pay_2: 1,
          cevrim_payda_2: 1,
          cevrim_degeri_2: 1,
          cap: values.cap,
          filmasin: values.filmasin,
          quality: values.quality,
          stok_turu: 'D',
          esnek_yapilandir: 'H',
          super_recete_kullanilsin: 'H',
          created_by: user.id,
          updated_by: user.id
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
            created_by: user.id,
            updated_by: user.id
          }),
        });
        
        if (!relationRes.ok) {
          throw new Error('YM ST ilişkisi kurulamadı');
        }

        setSelectedYmSt(prev => [...prev, savedData]);
        setSuccessMessage('YM ST kaydı başarıyla eklendi');
        toast.success('YM ST kaydı başarıyla eklendi');
        return savedData;
      } else {
        // Mevcut YM ST için sadece ilişki kur
        const relationRes = await fetchWithAuth(API_URLS.galMmGtYmSt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mm_gt_id: mmGtId,
            ym_st_id: values.id,
            created_by: user.id,
            updated_by: user.id
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
  }

  // Excel oluşturma fonksiyonu
  async function generateExcel(mmGtId) {
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
  }

  // Reçeteleri kontrol et ve gerekirse oluştur
  async function checkAndCreateRecipes(mmGt, ymGt, ymStList) {
    // MM GT reçetesini kontrol et
    const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
    
    if (!mmGtReceteRes.ok && mmGtReceteRes.status !== 404) {
      throw new Error('MM GT reçetesi kontrol edilemedi');
    }
    
    const mmGtReceteData = await mmGtReceteRes.json();
    
    if (!mmGtReceteData || mmGtReceteData.length === 0) {
      // Reçete yoksa oluştur
      await createMMGTRecete(mmGt.id, ymGt.id);
    }

    // YM GT reçetesini kontrol et
    const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
    
    if (!ymGtReceteRes.ok && ymGtReceteRes.status !== 404) {
      throw new Error('YM GT reçetesi kontrol edilemedi');
    }
    
    const ymGtReceteData = await ymGtReceteRes.json();
    
    if (!ymGtReceteData || ymGtReceteData.length === 0) {
      // Reçete yoksa oluştur
      await createYMGTRecete(ymGt.id);
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
        await createYMSTRecete(ymSt.id);
      }
    }
  }

  // MM GT Reçete oluşturma
  async function createMMGTRecete(mmGtId, ymGtId) {
    // MM GT verilerini al
    const mmGtRes = await fetchWithAuth(`${API_URLS.galMmGt}?id=${mmGtId}`);
    
    if (!mmGtRes.ok) {
      throw new Error('MM GT verisi alınamadı');
    }
    
    const mmGtData = await mmGtRes.json();
    const mmGt = mmGtData[0];

    // YM GT stok kodunu al
    const ymGtRes = await fetchWithAuth(`${API_URLS.galYmGt}?id=${ymGtId}`);
    
    if (!ymGtRes.ok) {
      throw new Error('YM GT verisi alınamadı');
    }
    
    const ymGtData = await ymGtRes.json();
    const ymGt = ymGtData[0];

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
        created_by: user.id,
        updated_by: user.id,
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
        miktar: 0.02,
        aciklama: 'Paketleme Operasyonu',
        uretim_suresi: 0.02,
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user.id,
        updated_by: user.id,
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
        created_by: user.id,
        updated_by: user.id,
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
        created_by: user.id,
        updated_by: user.id,
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
        created_by: user.id,
        updated_by: user.id,
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
        created_by: user.id,
        updated_by: user.id,
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
        created_by: user.id,
        updated_by: user.id,
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
        created_by: user.id,
        updated_by: user.id,
        mm_gt_id: mmGtId
      }
    ];

    // Reçeteyi veritabanına kaydet
    const receteRes = await fetchWithAuth(API_URLS.galMmGtRecete, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receteItems),
    });
    
    if (!receteRes.ok) {
      throw new Error('MM GT reçetesi kaydedilemedi');
    }
  }

  // YM GT Reçete oluşturma
  async function createYMGTRecete(ymGtId) {
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
    
    // 150 03 değeri: 0.032 - (0.0029 * Diameter)
    const value15003 = Math.max(0.001, 0.032 - (0.0029 * diameter)).toFixed(6);
    
    // SM.HİDROLİK.ASİT değeri
    let asitValue = 0;
    if (ymGt.kod_2 === 'NIT') {
      // NIT için değer
      if (diameter < 1.5) {
        asitValue = 0.002;
      } else if (diameter >= 1.5 && diameter < 2.5) {
        asitValue = 0.0025;
      } else {
        asitValue = 0.003;
      }
    } else {
      // PAD için değer
      if (diameter < 1.5) {
        asitValue = 0.001;
      } else if (diameter >= 1.5 && diameter < 2.5) {
        asitValue = 0.0015;
      } else {
        asitValue = 0.002;
      }
    }
    
    // SM.DESİ.PAK değeri
    const desiValue = ymGt.kg > 800 ? 0.002 : 0.0013;
    
    // GTPKT01 değeri
    const gtpktValue = 0.020;
    
    // GLV01 değeri: 1.15 - (0.125 * Diameter)
    const glvValue = Math.max(0.001, 1.15 - (0.125 * diameter)).toFixed(6);

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
        created_by: user.id,
        updated_by: user.id,
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
        miktar: parseFloat(value15003),
        aciklama: 'Boraks Tüketim Miktarı',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user.id,
        updated_by: user.id,
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
        miktar: asitValue,
        aciklama: 'Asit Tüketim Miktarı',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user.id,
        updated_by: user.id,
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
        miktar: desiValue,
        aciklama: 'Desisifiye Tüketim Miktarı',
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user.id,
        updated_by: user.id,
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
        miktar: gtpktValue,
        aciklama: 'Paketleme Operasyonu',
        uretim_suresi: gtpktValue,
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user.id,
        updated_by: user.id,
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
        miktar: parseFloat(glvValue),
        aciklama: 'Galvanizleme Operasyonu',
        uretim_suresi: parseFloat(glvValue),
        ua_dahil_edilsin: 'evet',
        son_operasyon: 'evet',
        created_by: user.id,
        updated_by: user.id,
        ym_gt_id: ymGtId
      }
    ];

    // Reçeteyi veritabanına kaydet
    const receteRes = await fetchWithAuth(API_URLS.galYmGtRecete, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receteItems),
    });
    
    if (!receteRes.ok) {
      throw new Error('YM GT reçetesi kaydedilemedi');
    }
  }

  // YM ST Reçete oluşturma
  async function createYMSTRecete(ymStId) {
    // YM ST verilerini al
    const ymStRes = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
    
    if (!ymStRes.ok) {
      throw new Error('YM ST verisi alınamadı');
    }
    
    const ymStData = await ymStRes.json();
    const ymSt = ymStData[0];

    // TLC01 değeri hesapla: 0.2/(Diameter^1.5)
    const diameter = parseFloat(ymSt.cap);
    const tlcValue = (0.2 / Math.pow(diameter, 1.5)).toFixed(9);

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
        created_by: user.id,
        updated_by: user.id,
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
        miktar: parseFloat(tlcValue),
        aciklama: 'Tel Çekme Operasyonu',
        uretim_suresi: parseFloat(tlcValue),
        created_by: user.id,
        updated_by: user.id,
        ym_st_id: ymStId
      }
    ];

    // Reçeteyi veritabanına kaydet
    const receteRes = await fetchWithAuth(API_URLS.galYmStRecete, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receteItems),
    });
    
    if (!receteRes.ok) {
      throw new Error('YM ST reçetesi kaydedilemedi');
    }
  }

  // Excel oluşturma fonksiyonları
  async function createStokKartiExcel(mmGt, ymGt, ymStList) {
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook();
    
    // MM GT sayfasını ekle
    const mmGtSheet = workbook.addWorksheet('MM GT');
    
    // MM GT başlıkları
    mmGtSheet.columns = [
      { header: 'STOK KODU', key: 'stok_kodu', width: 20 },
      { header: 'STOK ADI', key: 'stok_adi', width: 50 },
      { header: 'İNGİLİZCE İSİM', key: 'ingilizce_isim', width: 50 },
      { header: 'GRUP KODU', key: 'grup_kodu', width: 12 },
      { header: 'KOD-1', key: 'kod_1', width: 10 },
      { header: 'KOD-2', key: 'kod_2', width: 10 },
      { header: 'MUH. DETAY', key: 'muh_detay', width: 12 },
      { header: 'DEPO KODU', key: 'depo_kodu', width: 12 },
      { header: 'BR.1', key: 'br_1', width: 10 },
      { header: 'BR.2', key: 'br_2', width: 10 },
      { header: 'FİYAT BİRİMİ', key: 'fiyat_birimi', width: 15 },
      { header: 'SATIŞ KDV ORANI', key: 'satis_kdv_orani', width: 18 },
      { header: 'ALIŞ KDV ORANI', key: 'alis_kdv_orani', width: 18 },
      { header: 'STOK TÜRÜ', key: 'stok_turu', width: 12 },
      { header: 'GÜMRÜK TARİFE KODU', key: 'gumruk_tarife_kodu', width: 22 },
      { header: 'MENŞEİ', key: 'mensei', width: 10 },
      { header: 'DIA (MM)', key: 'dia_mm', width: 10 },
      { header: 'DIA TOL (MM) (+)', key: 'dia_tol_mm_plus', width: 18 },
      { header: 'DIA TOL (MM) (-)', key: 'dia_tol_mm_minus', width: 18 },
      { header: 'ZINC COATING (GR/M2)', key: 'zing_coating_gr_m2', width: 22 },
      { header: 'TENSILE ST. (MPA) MIN', key: 'tensile_st_mpa_min', width: 22 },
      { header: 'TENSILE ST. (MPA) MAX', key: 'tensile_st_mpa_max', width: 22 },
      { header: 'WAX', key: 'wax', width: 10 },
      { header: 'LIFTING LUGS', key: 'lifting_lugs', width: 15 },
      { header: 'COIL DIMENSIONS (CM) ID', key: 'coil_dimensions_cm_id', width: 25 },
      { header: 'COIL DIMENSIONS (CM) OD', key: 'coil_dimensions_cm_od', width: 25 },
      { header: 'COIL WEIGHT (KG)', key: 'coil_weight_kg', width: 18 },
      { header: 'AMB.SHRINK', key: 'amb_shrink', width: 20 },
      { header: 'UNWINDING', key: 'unwinding', width: 15 },
      { header: 'CAST KONT', key: 'cast_kont', width: 12 },
      { header: 'HELIX KONT', key: 'helix_kont', width: 12 },
      { header: 'ELONGATION', key: 'elongation', width: 12 }
    ];
    
    // MM GT verisini ekle
    mmGtSheet.addRow({
      stok_kodu: mmGt.stok_kodu,
      stok_adi: mmGt.stok_adi,
      ingilizce_isim: mmGt.ingilizce_isim,
      grup_kodu: mmGt.grup_kodu,
      kod_1: mmGt.kod_1,
      kod_2: mmGt.kod_2,
      muh_detay: mmGt.muh_detay,
      depo_kodu: mmGt.depo_kodu,
      br_1: mmGt.br_1,
      br_2: mmGt.br_2,
      fiyat_birimi: mmGt.fiyat_birimi,
      satis_kdv_orani: mmGt.satis_kdv_orani,
      alis_kdv_orani: mmGt.alis_kdv_orani,
      stok_turu: mmGt.stok_turu,
      gumruk_tarife_kodu: mmGt.gumruk_tarife_kodu,
      mensei: mmGt.mensei,
      dia_mm: mmGt.dia_mm,
      dia_tol_mm_plus: mmGt.dia_tol_mm_plus,
      dia_tol_mm_minus: mmGt.dia_tol_mm_minus,
      zing_coating_gr_m2: mmGt.zing_coating_gr_m2,
      tensile_st_mpa_min: mmGt.tensile_st_mpa_min,
      tensile_st_mpa_max: mmGt.tensile_st_mpa_max,
      wax: mmGt.wax,
      lifting_lugs: mmGt.lifting_lugs,
      coil_dimensions_cm_id: mmGt.coil_dimensions_cm_id,
      coil_dimensions_cm_od: mmGt.coil_dimensions_cm_od,
      coil_weight_kg: mmGt.coil_weight_kg,
      amb_shrink: mmGt.amb_shrink,
      unwinding: mmGt.unwinding,
      cast_kont: mmGt.cast_kont,
      helix_kont: mmGt.helix_kont,
      elongation: mmGt.elongation
    });
    
    // YM GT sayfasını ekle
    const ymGtSheet = workbook.addWorksheet('YM GT');
    
    // YM GT başlıkları
    ymGtSheet.columns = [
      { header: 'STOK KODU', key: 'stok_kodu', width: 20 },
      { header: 'STOK ADI', key: 'stok_adi', width: 50 },
      { header: 'İNGİLİZCE İSİM', key: 'ingilizce_isim', width: 50 },
      { header: 'GRUP KODU', key: 'grup_kodu', width: 12 },
      { header: 'KOD-1', key: 'kod_1', width: 10 },
      { header: 'KOD-2', key: 'kod_2', width: 10 },
      { header: 'MUH. DETAY', key: 'muh_detay', width: 12 },
      { header: 'DEPO KODU', key: 'depo_kodu', width: 12 },
      { header: 'BR.1', key: 'br_1', width: 10 },
      { header: 'BR.2', key: 'br_2', width: 10 },
      { header: 'FİYAT BİRİMİ', key: 'fiyat_birimi', width: 15 },
      { header: 'SATIŞ KDV ORANI', key: 'satis_kdv_orani', width: 18 },
      { header: 'ALIŞ KDV ORANI', key: 'alis_kdv_orani', width: 18 },
      { header: 'STOK TÜRÜ', key: 'stok_turu', width: 12 }
    ];
    
   // Continuing from where we left off - Excel generation functions

    // YM GT verisini ekle
    ymGtSheet.addRow({
      stok_kodu: ymGt.stok_kodu,
      stok_adi: ymGt.stok_adi,
      ingilizce_isim: ymGt.ingilizce_isim,
      grup_kodu: ymGt.grup_kodu,
      kod_1: ymGt.kod_1,
      kod_2: ymGt.kod_2,
      muh_detay: ymGt.muh_detay,
      depo_kodu: ymGt.depo_kodu,
      br_1: ymGt.br_1,
      br_2: ymGt.br_2,
      fiyat_birimi: ymGt.fiyat_birimi,
      satis_kdv_orani: ymGt.satis_kdv_orani,
      alis_kdv_orani: ymGt.alis_kdv_orani,
      stok_turu: ymGt.stok_turu
    });
    
    // YM ST sayfasını ekle
    const ymStSheet = workbook.addWorksheet('YM ST');
    
    // YM ST başlıkları
    ymStSheet.columns = [
      { header: 'STOK KODU', key: 'stok_kodu', width: 24 },
      { header: 'STOK ADI', key: 'stok_adi', width: 40 },
      { header: 'GRUP KODU', key: 'grup_kodu', width: 12 },
      { header: 'KOD-1', key: 'kod_1', width: 10 },
      { header: 'MUH. DETAY', key: 'muh_detay', width: 12 },
      { header: 'DEPO KODU', key: 'depo_kodu', width: 12 },
      { header: 'SATIŞ KDV ORANI', key: 'satis_kdv_orani', width: 18 },
      { header: 'ÖZEL SAHA 1 (SAY.)', key: 'ozel_saha_1_say', width: 18 },
      { header: 'ÇAP', key: 'cap', width: 10 },
      { header: 'FİLMAŞİN', key: 'filmasin', width: 10 },
      { header: 'KALİTE', key: 'quality', width: 10 }
    ];
    
    // YM ST verilerini ekle
    ymStList.forEach(ymSt => {
      ymStSheet.addRow({
        stok_kodu: ymSt.stok_kodu,
        stok_adi: ymSt.stok_adi,
        grup_kodu: ymSt.grup_kodu,
        kod_1: ymSt.kod_1,
        muh_detay: ymSt.muh_detay,
        depo_kodu: ymSt.depo_kodu,
        satis_kdv_orani: ymSt.satis_kdv_orani,
        ozel_saha_1_say: ymSt.ozel_saha_1_say,
        cap: ymSt.cap,
        filmasin: ymSt.filmasin,
        quality: ymSt.quality
      });
    });
    
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
  }

  async function createReceteExcel(mmGt, ymGt, ymStList) {
    // Excel workbook oluştur
    const workbook = new ExcelJS.Workbook();
    
    // MM GT REÇETE sayfası
    const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');
    
    // MM GT REÇETE başlıkları
    mmGtReceteSheet.columns = [
      { header: 'MAMÜL KODU', key: 'mamul_kodu', width: 22 },
      { header: 'REÇETE TOP.', key: 'recete_top', width: 12 },
      { header: 'FİRE ORANI', key: 'fire_orani', width: 12 },
      { header: 'ÖLÇÜ BR.', key: 'olcu_br', width: 10 },
      { header: 'SIRA NO', key: 'sira_no', width: 10 },
      { header: 'OPERASYON/BİLEŞEN', key: 'operasyon_bilesen', width: 20 },
      { header: 'BİLEŞEN KODU', key: 'bilesen_kodu', width: 22 },
      { header: 'ÖLÇÜ BR. BİLEŞEN', key: 'olcu_br_bilesen', width: 18 },
      { header: 'MİKTAR', key: 'miktar', width: 10 },
      { header: 'ÜRETİM SÜRESİ', key: 'uretim_suresi', width: 15 },
      { header: 'AÇIKLAMA', key: 'aciklama', width: 35 },
      { header: 'UA DAHİL EDİLSİN', key: 'ua_dahil_edilsin', width: 16 },
      { header: 'SON OPERASYON', key: 'son_operasyon', width: 16 }
    ];
    
    // MM GT REÇETE verilerini al ve ekle
    const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
    if (mmGtReceteRes.ok) {
      const mmGtReceteData = await mmGtReceteRes.json();
      mmGtReceteData.forEach(item => {
        mmGtReceteSheet.addRow({
          mamul_kodu: item.mamul_kodu,
          recete_top: item.recete_top,
          fire_orani: item.fire_orani,
          olcu_br: item.olcu_br,
          sira_no: item.sira_no,
          operasyon_bilesen: item.operasyon_bilesen,
          bilesen_kodu: item.bilesen_kodu,
          olcu_br_bilesen: item.olcu_br_bilesen,
          miktar: item.miktar,
          uretim_suresi: item.uretim_suresi || '',
          aciklama: item.aciklama,
          ua_dahil_edilsin: item.ua_dahil_edilsin,
          son_operasyon: item.son_operasyon
        });
      });
    }
    
    // YM GT REÇETE sayfası
    const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');
    
    // YM GT REÇETE başlıkları
    ymGtReceteSheet.columns = [
      { header: 'MAMÜL KODU', key: 'mamul_kodu', width: 22 },
      { header: 'REÇETE TOP.', key: 'recete_top', width: 12 },
      { header: 'FİRE ORANI', key: 'fire_orani', width: 12 },
      { header: 'ÖLÇÜ BR.', key: 'olcu_br', width: 10 },
      { header: 'SIRA NO', key: 'sira_no', width: 10 },
      { header: 'OPERASYON/BİLEŞEN', key: 'operasyon_bilesen', width: 20 },
      { header: 'BİLEŞEN KODU', key: 'bilesen_kodu', width: 22 },
      { header: 'ÖLÇÜ BR. BİLEŞEN', key: 'olcu_br_bilesen', width: 18 },
      { header: 'MİKTAR', key: 'miktar', width: 10 },
      { header: 'ÜRETİM SÜRESİ', key: 'uretim_suresi', width: 15 },
      { header: 'AÇIKLAMA', key: 'aciklama', width: 35 },
      { header: 'UA DAHİL EDİLSİN', key: 'ua_dahil_edilsin', width: 16 },
      { header: 'SON OPERASYON', key: 'son_operasyon', width: 16 }
    ];
    
    // YM GT REÇETE verilerini al ve ekle
    const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
    if (ymGtReceteRes.ok) {
      const ymGtReceteData = await ymGtReceteRes.json();
      ymGtReceteData.forEach(item => {
        ymGtReceteSheet.addRow({
          mamul_kodu: item.mamul_kodu,
          recete_top: item.recete_top,
          fire_orani: item.fire_orani,
          olcu_br: item.olcu_br,
          sira_no: item.sira_no,
          operasyon_bilesen: item.operasyon_bilesen,
          bilesen_kodu: item.bilesen_kodu,
          olcu_br_bilesen: item.olcu_br_bilesen,
          miktar: item.miktar,
          uretim_suresi: item.uretim_suresi || '',
          aciklama: item.aciklama,
          ua_dahil_edilsin: item.ua_dahil_edilsin,
          son_operasyon: item.son_operasyon
        });
      });
    }
    
    // YM ST REÇETE sayfası
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    
    // YM ST REÇETE başlıkları
    ymStReceteSheet.columns = [
      { header: 'MAMÜL KODU', key: 'mamul_kodu', width: 22 },
      { header: 'REÇETE TOP.', key: 'recete_top', width: 12 },
      { header: 'ÖLÇÜ BR.', key: 'olcu_br', width: 10 },
      { header: 'SIRA NO', key: 'sira_no', width: 10 },
      { header: 'OPERASYON/BİLEŞEN', key: 'operasyon_bilesen', width: 20 },
      { header: 'BİLEŞEN KODU', key: 'bilesen_kodu', width: 22 },
      { header: 'ÖLÇÜ BR. BİLEŞEN', key: 'olcu_br_bilesen', width: 18 },
      { header: 'MİKTAR', key: 'miktar', width: 10 },
      { header: 'ÜRETİM SÜRESİ', key: 'uretim_suresi', width: 15 },
      { header: 'AÇIKLAMA', key: 'aciklama', width: 35 }
    ];
    
    // YM ST REÇETE verilerini al ve ekle
    for (const ymSt of ymStList) {
      const ymStReceteRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
      if (ymStReceteRes.ok) {
        const ymStReceteData = await ymStReceteRes.json();
        ymStReceteData.forEach(item => {
          ymStReceteSheet.addRow({
            mamul_kodu: item.mamul_kodu,
            recete_top: item.recete_top,
            olcu_br: item.olcu_br,
            sira_no: item.sira_no,
            operasyon_bilesen: item.operasyon_bilesen,
            bilesen_kodu: item.bilesen_kodu,
            olcu_br_bilesen: item.olcu_br_bilesen,
            miktar: item.miktar,
            uretim_suresi: item.uretim_suresi || '',
            aciklama: item.aciklama
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
  }

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

// Ana Galvanizli Tel bileşeni
const GalvanizliTelNetsis = () => {
  const { user, hasPermission } = useAuth();
  const {
    mmGtData, setMmGtData,
    ymGtData, setYmGtData,
    ymStList, setYmStList,
    selectedYmSt, setSelectedYmSt,
    loading, setLoading,
    error, setError,
    successMessage, setSuccessMessage,
    isEditMode, setIsEditMode,
    dataExist, setDataExist,
    activeTab, setActiveTab,
    searchProducts,
    saveMMGT,
    saveYMGT,
    saveYMST,
    generateExcel,
    getCurrentSequence,
  } = useGalvanizliTel();

  // State'ler
  const [showYmStSearchModal, setShowYmStSearchModal] = useState(false);
  const [showYmStCreateModal, setShowYmStCreateModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sequence, setSequence] = useState(1);
  const [searchYmSt, setSearchYmSt] = useState("");
  const [filteredYmStList, setFilteredYmStList] = useState([]);
  const [selectedYmStToAdd, setSelectedYmStToAdd] = useState(null);

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
    sequence: 1
  };
  
  const [formValues, setFormValues] = useState(initialFormValues);

  // İzin kontrolü
  useEffect(() => {
    if (!hasPermission('access:galvanizli-tel')) {
      setError('Bu modüle erişim izniniz bulunmamaktadır.');
    } else {
      loadYmStList();
    }
  }, [hasPermission]);

// Boş veritabanı tablolarıyla çalışabilecek şekilde iyileştirilmiş loadYmStList fonksiyonu
const loadYmStList = async () => {
  try {
    setLoading(true);
    
    // API isteği yapılır
    const response = await fetchWithAuth(API_URLS.galYmSt);
    
    // Eğer cevap 404 (bulunamadı) ise, bu normal bir durumdur ve boş liste kullanabiliriz
    if (response.status === 404) {
      console.log('YM ST listesi boş veya tablo mevcut değil, boş liste kullanılıyor');
      setYmStList([]);
      setFilteredYmStList([]);
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
      setFilteredYmStList([]);
    } else {
      // Veriler başarıyla alındı
      setYmStList(data);
      setFilteredYmStList(data);
    }
  } catch (error) {
    console.error('YM ST listesi yüklenirken hata oluştu:', error);
    // Hata durumunda da boş dizi ile devam et, böylece uygulama çalışmaya devam eder
    setYmStList([]);
    setFilteredYmStList([]);
    setError('YM ST listesi yüklenirken bir hata oluştu');
  } finally {
    setLoading(false);
  }
};

  // Dizilim numarasını al
  const fetchSequence = async (kod2, cap) => {
    const seq = await getCurrentSequence(kod2, cap);
    setSequence(seq);
    setFormValues(prev => ({ ...prev, sequence: seq }));
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
  };

  // MM GT oluştur/güncelle
  const handleSaveMMGT = async () => {
    const savedMmGt = await saveMMGT(formValues);
    
    if (savedMmGt) {
      // YM GT kaydet
      await saveYMGT(formValues, savedMmGt.id);
      setIsEditMode(true);
      setActiveTab("ym-st-sec"); // YM ST Seç sekmesine geç
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
    setSelectedYmStToAdd(ymSt);
  };

  // YM ST ekle
  const handleAddYmSt = async () => {
    if (!mmGtData) {
      setError('Önce MM GT kaydı oluşturmalısınız');
      return;
    }
    
    if (selectedYmStToAdd) {
      await saveYMST(selectedYmStToAdd, mmGtData.id);
      setShowYmStSearchModal(false);
      setSelectedYmStToAdd(null);
      setSearchYmSt("");
    } else {
      setError('Lütfen bir YM ST seçin');
    }
  };

  // YM ST kaldır
  const handleRemoveYmSt = async (ymStId) => {
    try {
      const response = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGtData.id}&ym_st_id=${ymStId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('YM ST ilişkisi silinemedi');
      }

      setSelectedYmSt(prev => prev.filter(item => item.id !== ymStId));
      setSuccessMessage('YM ST başarıyla kaldırıldı');
      toast.success('YM ST başarıyla kaldırıldı');
    } catch (error) {
      setError('YM ST kaldırılırken bir hata oluştu');
      toast.error('YM ST kaldırılırken bir hata oluştu');
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
    
    await saveYMST(ymStData, mmGtData.id);
    setShowYmStCreateModal(false);
    loadYmStList();
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
    }
  };

  // Ürün temizle
  const handleNewProduct = () => {
    setMmGtData(null);
    setYmGtData(null);
    setSelectedYmSt([]);
    setIsEditMode(false);
    setDataExist(false);
    setActiveTab("mm-gt-tanimla");
    setFormValues(initialFormValues);
  };

  // Excel oluştur
  const handleGenerateExcel = async () => {
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
    
    await generateExcel(mmGtData.id);
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

  // Ürün kodu oluştur
  const productCode = formValues.kod_2 && formValues.cap 
    ? `GT.${formValues.kod_2}.${formValues.cap.toString().padStart(4, '0')}.${sequence.toString().padStart(2, '0')}`
    : 'Oluşturulacak';

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
        <h2 className="text-xl mb-4 font-bold text-gray-700">Galvanizli Tel Netsis Entegrasyonu</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowSearchModal(true)}
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Ürün Ara
          </button>
          <button 
            onClick={handleNewProduct}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Yeni Ürün
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex border-b border-gray-300">
          <div 
            onClick={() => setActiveTab("mm-gt-tanimla")}
            className={`px-4 py-2 cursor-pointer ${activeTab === "mm-gt-tanimla" 
              ? "border-b-2 border-red-600 font-medium text-red-600" 
              : "text-gray-600 hover:text-gray-800"}`}
          >
            MM GT Tanımla
          </div>
          <div 
            onClick={() => mmGtData && setActiveTab("ym-st-sec")}
            className={`px-4 py-2 cursor-pointer ${!mmGtData ? "opacity-50 cursor-not-allowed" : ""} ${
              activeTab === "ym-st-sec" 
                ? "border-b-2 border-red-600 font-medium text-red-600" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            YM ST Seç
          </div>
          <div 
            onClick={() => mmGtData && selectedYmSt.length > 0 && setActiveTab("excel-olustur")}
            className={`px-4 py-2 cursor-pointer ${!mmGtData || selectedYmSt.length === 0 ? "opacity-50 cursor-not-allowed" : ""} ${
              activeTab === "excel-olustur" 
                ? "border-b-2 border-red-600 font-medium text-red-600" 
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Excel Oluştur
          </div>
        </div>
      </div>
      
      {/* MM GT Tanımlama */}
      {activeTab === "mm-gt-tanimla" && (
        <div className="bg-white rounded-md shadow-sm p-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">MM GT Ürün Özellikleri</h3>
          
          <Formik
            initialValues={formValues}
            validationSchema={mmGtValidationSchema}
            onSubmit={handleSaveMMGT}
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
                      placeholder="2,50"
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
                    <span className="font-bold text-gray-800">{productCode}</span>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting || loading}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'İşleniyor...' : isEditMode ? 'Güncelle' : 'Oluştur'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      )}
      
      {/* YM ST Seçme */}
      {activeTab === "ym-st-sec" && (
        <div className="bg-white rounded-md shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-700">Seçilen Hammaddeler (YM ST)</h3>
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.cap}</td>
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
              onClick={() => setActiveTab("mm-gt-tanimla")}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Geri
            </button>
            <button 
              onClick={() => setActiveTab("excel-olustur")}
              disabled={selectedYmSt.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              İleri
            </button>
          </div>
        </div>
      )}
      
      {/* Excel Oluşturma */}
      {activeTab === "excel-olustur" && (
        <div className="bg-white rounded-md shadow-sm p-6">
          <h3 className="text-lg font-medium mb-4 text-gray-700">Excel Oluşturmaya Hazır</h3>
          
          <div className="p-4 bg-gray-50 rounded-md mb-6">
            <p className="mb-4">
              Aşağıdaki Excel oluştur butonuna tıklayarak iki ayrı Excel dosyası oluşturabilirsiniz:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li className="text-gray-700"><span className="font-medium">Stok Kartı Excel</span>: MM GT, YM GT ve YM ST sayfalarını içerir.</li>
              <li className="text-gray-700"><span className="font-medium">Reçete Excel</span>: MM GT REÇETE, YM GT REÇETE ve YM ST REÇETE sayfalarını içerir.</li>
            </ul>
          </div>
          
          <div className="flex justify-between mt-8 pt-4 border-t">
            <button 
              onClick={() => setActiveTab("ym-st-sec")}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Geri
            </button>
            <button 
              onClick={handleGenerateExcel}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Excel Oluşturuluyor...' : 'Excel Oluştur'}
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
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.cap}</td>
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
      
      {/* Yeni YM ST Oluşturma Modal */}
      {showYmStCreateModal && (
        <div className="fixed inset-0 z-20 overflow-y-auto">
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
                  filmasin: '',
                  quality: '1006'
                }}
                onSubmit={handleCreateYmSt}
                validationSchema={Yup.object({
                  cap: Yup.number().required('Çap zorunludur'),
                  filmasin: Yup.number().required('Filmaşin çapı zorunludur').min(550, 'En az 550').max(1000, 'En fazla 1000'),
                  quality: Yup.string().required('Kalite zorunludur')
                })}
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
                          Filmaşin Çapı (0550-1000) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
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
                        <select
                          name="quality"
                          value={values.quality}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="1006">1006</option>
                          <option value="1008">1008</option>
                          <option value="1010">1010</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400"
                      >
                        {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
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
      
      {/* Ürün Arama Modal */}
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
                          placeholder="GT.NIT.0250.01"
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                          Çap (mm)
                        </label>
                        <input
                          type="number"
                          name="cap"
                          value={values.cap}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          step="0.01"
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="2.50"
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
                          Ağırlık (kg)
                        </label>
                        <input
                          type="number"
                          name="kg"
                          value={values.kg}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="750"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={isSubmitting || loading}
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400"
                      >
                        {isSubmitting || loading ? 'Aranıyor...' : 'Ara'}
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
