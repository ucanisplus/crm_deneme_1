// GalvanizliTelNetsis.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth } from '@/api-config';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { 
  Container, Row, Col, Card, Button, 
  FormGroup, FormLabel, FormControl, 
  Table, Alert, Spinner, Modal
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Galvanizli Tel Context
const GalvanizliTelContext = createContext();

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
  const [activeTab, setActiveTab] = useState(0);
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

      // Eğer yeni kayıt yapıldıysa sequence'ı artır
      if (!isEditMode) {
        await incrementSequence(values.kod_2, values.cap);
      }

      return result;
    } catch (error) {
      console.error('MM GT kaydetme hatası:', error);
      setError('MM GT kaydedilirken bir hata oluştu: ' + error.message);
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
      }

      const savedData = await saveRes.json();
      setYmGtData(savedData);
      return savedData;
    } catch (error) {
      console.error('YM GT kaydetme hatası:', error);
      setError('YM GT kaydı sırasında bir hata oluştu: ' + error.message);
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
        return ymStData[0];
      }
    } catch (error) {
      console.error('YM ST kaydetme hatası:', error);
      setError('YM ST kaydedilirken bir hata oluştu: ' + error.message);
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
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      setError('Excel oluşturulurken bir hata oluştu: ' + error.message);
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
        olcu_br: 'KG',
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
        olcu_br: 'KG',
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

  // Stok Kartı Excel Oluşturma
  async function createStokKartiExcel(mmGt, ymGt, ymStList) {
    // Excel dosyası oluştur
    const workbook = new ExcelJS.Workbook();
    
    // MM GT sayfası
    const mmGtSheet = workbook.addWorksheet('MM GT');
    setupExcelSheet(mmGtSheet, 'MM GT Stok Kartı');
    addStokKartiHeaders(mmGtSheet);
    addMMGTData(mmGtSheet, mmGt);
    
    // YM GT sayfası
    const ymGtSheet = workbook.addWorksheet('YM GT');
    setupExcelSheet(ymGtSheet, 'YM GT Stok Kartı');
    addStokKartiHeaders(ymGtSheet);
    addYMGTData(ymGtSheet, ymGt);
    
    // YM ST sayfası
    const ymStSheet = workbook.addWorksheet('YM ST');
    setupExcelSheet(ymStSheet, 'YM ST Stok Kartı');
    addYMSTHeaders(ymStSheet);
    addYMSTData(ymStSheet, ymStList);
    
    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `StokKarti_${mmGt.stok_kodu.replace(/\./g, '_')}.xlsx`);
  }

  // Reçete Excel Oluşturma
  async function createReceteExcel(mmGt, ymGt, ymStList) {
    // Excel dosyası oluştur
    const workbook = new ExcelJS.Workbook();
    
    // MM GT REÇETE sayfası
    const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');
    setupExcelSheet(mmGtReceteSheet, 'MM GT Reçete Kartı');
    addReceteHeaders(mmGtReceteSheet);
    
    // MM GT reçetesini al
    const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
    
    if (!mmGtReceteRes.ok) {
      throw new Error('MM GT reçetesi alınamadı');
    }
    
    const mmGtReceteData = await mmGtReceteRes.json();
    addReceteData(mmGtReceteSheet, mmGtReceteData);
    
    // YM GT REÇETE sayfası
    const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');
    setupExcelSheet(ymGtReceteSheet, 'YM GT Reçete Kartı');
    addReceteHeaders(ymGtReceteSheet);
    
    // YM GT reçetesini al
    const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
    
    if (!ymGtReceteRes.ok) {
      throw new Error('YM GT reçetesi alınamadı');
    }
    
    const ymGtReceteData = await ymGtReceteRes.json();
    addReceteData(ymGtReceteSheet, ymGtReceteData);
    
    // YM ST REÇETE sayfası
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    setupExcelSheet(ymStReceteSheet, 'YM ST Reçete Kartı');
    addReceteHeaders(ymStReceteSheet);
    
    // Tüm YM ST reçetelerini al
    let allYmStReceteData = [];
    for (const ymSt of ymStList) {
      const ymStReceteRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
      
      if (!ymStReceteRes.ok) {
        throw new Error(`YM ST reçetesi alınamadı: ${ymSt.stok_kodu}`);
      }
      
      const ymStReceteData = await ymStReceteRes.json();
      
      if (ymStReceteData && ymStReceteData.length > 0) {
        allYmStReceteData = [...allYmStReceteData, ...ymStReceteData];
      }
    }
    
    addReceteData(ymStReceteSheet, allYmStReceteData);
    
    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Recete_${mmGt.stok_kodu.replace(/\./g, '_')}.xlsx`);
  }

  // Excel sayfa ayarları
  function setupExcelSheet(sheet, title) {
    sheet.mergeCells('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    sheet.addRow([]);
  }

  // Stok Kartı başlıkları
  function addStokKartiHeaders(sheet) {
    const headers = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Kod-2', 'Cari/Satıcı Kodu', 
      'İngilizce İsim', 'Satıcı İsmi', 'Muh. Detay', 'Depo Kodu', 'Br-1', 'Br-2', 
      'Pay-1', 'Payda-1', 'Çevrim Değeri-1', 'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2', 
      'Çevrim Değeri-2', 'Çap', 'Kaplama', 'Min Mukavemet', 'Max Mukavemet', 'KG', 
      'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Çap2', 'Shrink', 'Tolerans(+)', 
      'Tolerans(-)', 'Ebat(En)', 'Göz Aralığı', 'Ebat(Boy)', 'Hasır Tipi', 'Özel Saha 8 (Alf.)', 
      'Alış Fiyatı', 'Fiyat Birimi', 'Satış Fiyatı-1', 'Satış Fiyatı-2', 'Satış Fiyatı-3', 
      'Satış Fiyatı-4', 'Satış Tipi', 'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı', 
      'Azami Stok', 'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Bekleme Süresi', 'Temin Süresi', 
      'Birim Ağırlık', 'Nakliye Tutar', 'Satış KDV Oranı', 'Alış KDV Oranı', 'Stok Türü', 
      'Mali Grup Kodu', 'Barkod 1', 'Barkod 2', 'Barkod 3', 'Kod-3', 'Kod-4', 'Kod-5', 
      'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 'Bağlı Stok Kodu', 'Yapılandırma Kodu', 
      'Yap. Açıklama', 'Alış Döviz Tipi', 'Gümrük Tarife Kodu', 'Dağıtıcı Kodu', 'Menşei',
      'METARIAL', 'DIA (MM)', 'DIA TOL (MM) +', 'DIA TOL (MM) -', 'ZING COATING (GR/M2)', 
      'TENSILE ST. (MPA) MIN', 'TENSILE ST. (MPA) MAX', 'WAX', 'LIFTING LUGS', 'UNWINDING', 
      'CAST KONT. (CM)', 'HELIX KONT. (CM)', 'ELONGATION (%) MIN', 'COIL DIMENSIONS (CM) ID', 
      'COIL DIMENSIONS (CM) OD', 'COIL WEIGHT (KG)', 'COIL WEIGHT (KG) MIN', 'COIL WEIGHT (KG) MAX'
    ];
    
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    
    headers.forEach((header, i) => {
      const col = sheet.getColumn(i + 1);
      col.width = Math.max(15, header.length * 1.2);
    });
  }

  // YM ST başlıkları
  function addYMSTHeaders(sheet) {
    const headers = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Kod-2', 'Kod-3', 'Satış KDV Oranı', 
      'Muh.Detay', 'Depo Kodu', 'Br-1', 'Br-2', 'Pay-1', 'Payda-1', 'Çevrim Değeri-1', 
      'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2', 'Çevrim Değeri-2', 'Alış Fiyatı', 
      'Fiyat Birimi', 'Satış Fiyatı-1', 'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4', 
      'Döviz Tip', 'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı', 'Azami Stok', 
      'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Alış Döviz Tipi', 'Bekleme Süresi', 
      'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar', 'Stok Türü', 'Mali Grup Kodu', 
      'İngilizce İsim', 'Özel Saha 1 (Say.)', 'Özel Saha 2 (Say.)', 'Özel Saha 3 (Say.)', 
      'Özel Saha 4 (Say.)', 'Özel Saha 5 (Say.)', 'Özel Saha 6 (Say.)', 'Özel Saha 7 (Say.)', 
      'Özel Saha 8 (Say.)', 'Özel Saha 1 (Alf.)', 'Özel Saha 2 (Alf.)', 'Özel Saha 3 (Alf.)', 
      'Özel Saha 4 (Alf.)', 'Özel Saha 5 (Alf.)', 'Özel Saha 6 (Alf.)', 'Özel Saha 7 (Alf.)', 
    'Özel Saha 8 (Alf.)', 'Kod-4', 'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 
    'Bağlı Stok Kodu', 'Yapılandırma Kodu', 'Yap. Açıklama'
  ];
  
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center' };
  
  headers.forEach((header, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = Math.max(15, header.length * 1.2);
  });
}

// Reçete başlıkları
function addReceteHeaders(sheet) {
  const headers = [
    'Mamul Kodu(*)', 'Reçete Top.', 'Fire Oranı (%)', 'Oto.Reç.', 'Ölçü Br.', 
    'Sıra No(*)', 'Operasyon Bileşen', 'Bileşen Kodu(*)', 'Ölçü Br. - Bileşen', 
    'Miktar(*)', 'Açıklama', 'Miktar Sabitle', 'Stok/Maliyet', 'Fire Mik.', 
    'Sabit Fire Mik.', 'İstasyon Kodu', 'Hazırlık Süresi', 'Üretim Süresi', 
    'Ü.A.Dahil Edilsin', 'Son Operasyon', 'Öncelik', 'Planlama Oranı', 
    'Alternatif Politika - D.A.Transfer Fişi', 'Alternatif Politika - Ambar Ç. Fişi', 
    'Alternatif Politika - Üretim S.Kaydı', 'Alternatif Politika - MRP', 'İÇ/DIŞ'
  ];
  
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center' };
  
  headers.forEach((header, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = Math.max(15, header.length * 1.2);
  });
}

// MM GT verisini Excel'e ekle
function addMMGTData(sheet, mmGt) {
  const rowData = [
    mmGt.stok_kodu || '',
    mmGt.stok_adi || '',
    mmGt.grup_kodu || 'MM',
    mmGt.kod_1 || 'GT',
    mmGt.kod_2 || '',
    '',  // Cari/Satıcı Kodu
    mmGt.ingilizce_isim || '',
    '',  // Satıcı İsmi
    mmGt.muh_detay || '26',
    mmGt.depo_kodu || '36',
    'KG',  // Br-1
    'TN',  // Br-2
    1,     // Pay-1
    '1,000', // Payda-1
    0,     // Çevrim Değeri-1
    '',    // Ölçü Br-3
    1,     // Çevrim Pay-2
    1,     // Çevrim Payda-2
    1,     // Çevrim Değeri-2
    mmGt.cap?.toString()?.replace('.', ',') || '',
    mmGt.kaplama?.toString() || '',
    mmGt.min_mukavemet?.toString() || '',
    mmGt.max_mukavemet?.toString() || '',
    mmGt.kg?.toString() || '',
    mmGt.ic_cap?.toString() || '',
    mmGt.dis_cap?.toString() || '',
    '',    // Çap2
    mmGt.shrink || 'evet',
    mmGt.tolerans_plus?.toString()?.replace('.', ',') || '0',
    mmGt.tolerans_minus?.toString()?.replace('.', ',') || '0',
    '',    // Ebat(En)
    '',    // Göz Aralığı
    '',    // Ebat(Boy)
    '',    // Hasır Tipi
    '',    // Özel Saha 8 (Alf.)
    0,     // Alış Fiyatı
    1,     // Fiyat Birimi
    0,     // Satış Fiyatı-1
    0,     // Satış Fiyatı-2
    0,     // Satış Fiyatı-3
    0,     // Satış Fiyatı-4
    1,     // Satış Tipi
    0,     // Döviz Alış
    0,     // Döviz Maliyeti
    0,     // Döviz Satış Fiyatı
    0,     // Azami Stok
    0,     // Asgari Stok
    '',    // Döv.Tutar
    0,     // Döv.Tipi
    0,     // Bekleme Süresi
    0,     // Temin Süresi
    0,     // Birim Ağırlık
    0,     // Nakliye Tutar
    20,    // Satış KDV Oranı
    20,    // Alış KDV Oranı
    'D',   // Stok Türü
    '',    // Mali Grup Kodu
    '',    // Barkod 1
    '',    // Barkod 2
    '',    // Barkod 3
    '',    // Kod-3
    '',    // Kod-4
    '',    // Kod-5
    'H',   // Esnek Yapılandır
    'H',   // Süper Reçete Kullanılsın
    '',    // Bağlı Stok Kodu
    '',    // Yapılandırma Kodu
    '',    // Yap. Açıklama
    2,     // Alış Döviz Tipi
    mmGt.gumruk_tarife_kodu || '',
    '',    // Dağıtıcı Kodu
    '052', // Menşei
    'Galvanizli Tel',    // METARIAL
    mmGt.cap?.toString()?.replace('.', ','),    // DIA (MM)
    mmGt.tolerans_plus?.toString()?.replace('.', ',') || '0,00',    // DIA TOL (MM) +
    mmGt.tolerans_minus?.toString()?.replace('.', ',') || '0,00',    // DIA TOL (MM) -
    mmGt.kaplama?.toString() || '',    // ZING COATING (GR/M2)
    mmGt.min_mukavemet?.toString() || '',    // TENSILE ST. (MPA) MIN
    mmGt.max_mukavemet?.toString() || '',    // TENSILE ST. (MPA) MAX
    '+',    // WAX
    '+',    // LIFTING LUGS
    mmGt.unwinding || '',    // UNWINDING
    mmGt.cast_kont || '',    // CAST KONT. (CM)
    mmGt.helix_kont || '',    // HELIX KONT. (CM)
    mmGt.elongation || '',    // ELONGATION (%) MIN
    mmGt.ic_cap?.toString() || '',    // COIL DIMENSIONS (CM) ID
    mmGt.dis_cap?.toString() || '',    // COIL DIMENSIONS (CM) OD
    mmGt.kg?.toString() || '',    // COIL WEIGHT (KG)
    '',    // COIL WEIGHT (KG) MIN
    ''     // COIL WEIGHT (KG) MAX
  ];
  
  const dataRow = sheet.addRow(rowData);
  return dataRow;
}

// YM GT verisini Excel'e ekle
function addYMGTData(sheet, ymGt) {
  const rowData = [
    ymGt.stok_kodu || '',
    ymGt.stok_adi || '',
    ymGt.grup_kodu || 'YM',
    ymGt.kod_1 || 'GT',
    ymGt.kod_2 || '',
    '',  // Cari/Satıcı Kodu
    ymGt.ingilizce_isim || '',
    '',  // Satıcı İsmi
    ymGt.muh_detay || '83',
    ymGt.depo_kodu || '35',
    'KG',  // Br-1
    'TN',  // Br-2
    1,     // Pay-1
    '1,000', // Payda-1
    0,     // Çevrim Değeri-1
    '',    // Ölçü Br-3
    1,     // Çevrim Pay-2
    1,     // Çevrim Payda-2
    1,     // Çevrim Değeri-2
    ymGt.cap?.toString()?.replace('.', ',') || '',
    ymGt.kaplama?.toString() || '',
    ymGt.min_mukavemet?.toString() || '',
    ymGt.max_mukavemet?.toString() || '',
    ymGt.kg?.toString() || '',
    ymGt.ic_cap?.toString() || '',
    ymGt.dis_cap?.toString() || '',
    '',    // Çap2
    ymGt.shrink || 'evet',
    ymGt.tolerans_plus?.toString()?.replace('.', ',') || '0',
    ymGt.tolerans_minus?.toString()?.replace('.', ',') || '0',
    '',    // Ebat(En)
    '',    // Göz Aralığı
    '',    // Ebat(Boy)
    '',    // Hasır Tipi
    '',    // Özel Saha 8 (Alf.)
    0,     // Alış Fiyatı
    1,     // Fiyat Birimi
    0,     // Satış Fiyatı-1
    0,     // Satış Fiyatı-2
    0,     // Satış Fiyatı-3
    0,     // Satış Fiyatı-4
    1,     // Satış Tipi
    0,     // Döviz Alış
    0,     // Döviz Maliyeti
    0,     // Döviz Satış Fiyatı
    0,     // Azami Stok
    0,     // Asgari Stok
    '',    // Döv.Tutar
    0,     // Döv.Tipi
    0,     // Bekleme Süresi
    0,     // Temin Süresi
    0,     // Birim Ağırlık
    0,     // Nakliye Tutar
    20,    // Satış KDV Oranı
    20,    // Alış KDV Oranı
    'D',   // Stok Türü
    '',    // Mali Grup Kodu
    '',    // Barkod 1
    '',    // Barkod 2
    '',    // Barkod 3
    '',    // Kod-3
    '',    // Kod-4
    '',    // Kod-5
    'H',   // Esnek Yapılandır
    'H',   // Süper Reçete Kullanılsın
    '',    // Bağlı Stok Kodu
    '',    // Yapılandırma Kodu
    '',    // Yap. Açıklama
    0,     // Alış Döviz Tipi
    '',    // Gümrük Tarife Kodu
    '',    // Dağıtıcı Kodu
    ''     // Menşei
  ];
  
  const dataRow = sheet.addRow(rowData);
  return dataRow;
}

// YM ST verilerini Excel'e ekle
function addYMSTData(sheet, ymStList) {
  for (const ymSt of ymStList) {
    const rowData = [
      ymSt.stok_kodu || '',
      ymSt.stok_adi || '',
      ymSt.grup_kodu || 'YM',
      ymSt.kod_1 || 'ST',
      '',    // Kod-2
      '',    // Kod-3
      20,    // Satış KDV Oranı
      ymSt.muh_detay || '28',
      ymSt.depo_kodu || '35',
      'KG',  // Br-1
      'TN',  // Br-2
      1,     // Pay-1
      '1,000', // Payda-1
      0,     // Çevrim Değeri-1
      '',    // Ölçü Br-3
      1,     // Çevrim Pay-2
      1,     // Çevrim Payda-2
      1,     // Çevrim Değeri-2
      0,     // Alış Fiyatı
      1,     // Fiyat Birimi
      0,     // Satış Fiyatı-1
      0,     // Satış Fiyatı-2
      0,     // Satış Fiyatı-3
      0,     // Satış Fiyatı-4
      1,     // Döviz Tip
      0,     // Döviz Alış
      0,     // Döviz Maliyeti
      0,     // Döviz Satış Fiyatı
      0,     // Azami Stok
      0,     // Asgari Stok
      '',    // Döv.Tutar
      0,     // Döv.Tipi
      0,     // Alış Döviz Tipi
      0,     // Bekleme Süresi
      0,     // Temin Süresi
      0,     // Birim Ağırlık
      0,     // Nakliye Tutar
      'D',   // Stok Türü
      '',    // Mali Grup Kodu
      '',    // İngilizce İsim
      ymSt.ozel_saha_1_say || '',    // Özel Saha 1 (Say.)
      0,     // Özel Saha 2 (Say.)
      0,     // Özel Saha 3 (Say.)
      0,     // Özel Saha 4 (Say.)
      0,     // Özel Saha 5 (Say.)
      0,     // Özel Saha 6 (Say.)
      0,     // Özel Saha 7 (Say.)
      0,     // Özel Saha 8 (Say.)
      '',    // Özel Saha 1 (Alf.)
      '',    // Özel Saha 2 (Alf.)
      '',    // Özel Saha 3 (Alf.)
      '',    // Özel Saha 4 (Alf.)
      '',    // Özel Saha 5 (Alf.)
      '',    // Özel Saha 6 (Alf.)
      '',    // Özel Saha 7 (Alf.)
      '',    // Özel Saha 8 (Alf.)
      '',    // Kod-4
      '',    // Kod-5
      'H',   // Esnek Yapılandır
      'H',   // Süper Reçete Kullanılsın
      '',    // Bağlı Stok Kodu
      '',    // Yapılandırma Kodu
      ''     // Yap. Açıklama
    ];
    
    const dataRow = sheet.addRow(rowData);
  }
}

// Reçete verilerini Excel'e ekle
function addReceteData(sheet, receteData) {
  if (!receteData || receteData.length === 0) return;
  
  for (const recete of receteData) {
    const rowData = [
      recete.mamul_kodu || '',
      recete.recete_top || 1,
      recete.fire_orani || '',
      '',    // Oto.Reç.
      recete.olcu_br || '',
      recete.sira_no || '',
      recete.operasyon_bilesen || '',
      recete.bilesen_kodu || '',
      recete.olcu_br_bilesen || 1,
      recete.miktar || '',
      recete.aciklama || '',
      '',    // Miktar Sabitle
      '',    // Stok/Maliyet
      '',    // Fire Mik.
      '',    // Sabit Fire Mik.
      '',    // İstasyon Kodu
      '',    // Hazırlık Süresi
      recete.uretim_suresi || '',
      recete.ua_dahil_edilsin || 'evet',
      recete.son_operasyon || 'evet',
      '',    // Öncelik
      '',    // Planlama Oranı
      '',    // Alternatif Politika - D.A.Transfer Fişi
      '',    // Alternatif Politika - Ambar Ç. Fişi
      '',    // Alternatif Politika - Üretim S.Kaydı
      '',    // Alternatif Politika - MRP
      ''     // İÇ/DIŞ
    ];
    
    const dataRow = sheet.addRow(rowData);
  }
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
    incrementSequence,
  } = useGalvanizliTel();

  // State'ler
  const [showYmStModal, setShowYmStModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchParams, setSearchParams] = useState({});
  const [sequence, setSequence] = useState(1);
  const [searchYmSt, setSearchYmSt] = useState("");
  const [filteredYmStList, setFilteredYmStList] = useState([]);
  const [selectedYmStToAdd, setSelectedYmStToAdd] = useState(null);

  // İzin kontrolü
  useEffect(() => {
    if (!hasPermission('access:galvanizli-tel')) {
      setError('Bu modüle erişim izniniz bulunmamaktadır.');
    } else {
      loadYmStList();
    }
  }, [hasPermission]);

  // YM ST listesini yükle
  const loadYmStList = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(API_URLS.galYmSt);
      
      if (!response.ok) {
        throw new Error('YM ST listesi alınamadı');
      }
      
      const data = await response.json();
      setYmStList(data || []);
    } catch (error) {
      console.error('YM ST listesi yüklenirken hata oluştu:', error);
      setError('YM ST listesi yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // YM ST listesini filtrele
  useEffect(() => {
    if (searchYmSt.trim() === '') {
      setFilteredYmStList(ymStList);
    } else {
      const filtered = ymStList.filter(item => 
        item.stok_kodu?.toLowerCase().includes(searchYmSt.toLowerCase()) ||
        item.stok_adi?.toLowerCase().includes(searchYmSt.toLowerCase()) ||
        (item.cap && item.cap.toString().includes(searchYmSt.toLowerCase())) ||
        (item.filmasin && item.filmasin.toString().includes(searchYmSt.toLowerCase()))
      );
      setFilteredYmStList(filtered);
    }
  }, [searchYmSt, ymStList]);

  // Seçili YM ST ile işlem yapmak için
  const handleSelectYmSt = (ymSt) => {
    setSelectedYmStToAdd(ymSt);
  };

  // YM ST ekleme işlemi
  const handleAddYmSt = async () => {
    if (!mmGtData) {
      setError('Önce MM GT kaydı oluşturmalısınız');
      return;
    }
    
    if (selectedYmStToAdd) {
      // Mevcut bir YM ST ekle
      await saveYMST(selectedYmStToAdd, mmGtData.id);
    } else {
      setError('Lütfen bir YM ST seçin veya yeni bir tane oluşturun');
    }
    
    setShowYmStModal(false);
    setSelectedYmStToAdd(null);
    setSearchYmSt("");
  };

  // Yeni YM ST oluştur ve ekle
  const handleCreateAndAddYmSt = async (values) => {
    if (!mmGtData) {
      setError('Önce MM GT kaydı oluşturmalısınız');
      return;
    }
    
    // isNew bayrağı ekle
    const ymStData = {
      ...values,
      isNew: true
    };
    
    await saveYMST(ymStData, mmGtData.id);
    setShowYmStModal(false);
    loadYmStList(); // Listeyi yenile
  };

  // YM ST listeden kaldır
  const handleRemoveYmSt = async (ymStId) => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGtData.id}&ym_st_id=${ymStId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('YM ST ilişkisi silinemedi');
      }

      // Listeden kaldır
      setSelectedYmSt(prev => prev.filter(item => item.id !== ymStId));
      toast.success('YM ST başarıyla kaldırıldı');
    } catch (error) {
      console.error('YM ST kaldırılırken hata oluştu:', error);
      setError('YM ST kaldırılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Excel oluşturma işlemi
  const handleGenerateExcel = async () => {
    if (!mmGtData) {
      setError('Excel oluşturmak için önce MM GT kaydı oluşturmalısınız');
      return;
    }
    
    if (selectedYmSt.length === 0) {
      setError('Excel oluşturmak için en az bir YM ST kaydı gereklidir');
      return;
    }
    
    await generateExcel(mmGtData.id);
  };

  // MM GT formunun doğrulama şeması
  const mmGtValidationSchema = Yup.object({
    cap: Yup.number()
      .required('Çap gereklidir')
      .min(0.8, 'Çap en az 0.8 mm olmalıdır')
      .max(8.0, 'Çap en fazla 8.0 mm olmalıdır'),
    kod_2: Yup.string()
      .required('Kaplama Türü gereklidir')
      .oneOf(['NIT', 'PAD'], 'Kaplama Türü NIT veya PAD olmalıdır'),
    kaplama: Yup.number()
      .required('Kaplama miktarı gereklidir')
      .min(50, 'Kaplama miktarı en az 50 gr/m² olmalıdır')
      .max(400, 'Kaplama miktarı en fazla 400 gr/m² olmalıdır'),
    min_mukavemet: Yup.number()
      .required('Min Mukavemet gereklidir')
      .min(350, 'Min Mukavemet en az 350 MPa olmalıdır')
      .max(1000, 'Min Mukavemet en fazla 1000 MPa olmalıdır'),
    max_mukavemet: Yup.number()
      .required('Max Mukavemet gereklidir')
      .min(350, 'Max Mukavemet en az 350 MPa olmalıdır')
      .max(1000, 'Max Mukavemet en fazla 1000 MPa olmalıdır')
      .test('is-greater-than-min', 'Max Mukavemet, Min Mukavemet değerinden büyük olmalıdır', 
        function(value) {
          return !value || !this.parent.min_mukavemet || value > this.parent.min_mukavemet;
        }
      ),
    tolerans_plus: Yup.number()
      .required('Tolerans (+) gereklidir')
      .min(0, 'Tolerans (+) en az 0 olmalıdır')
      .max(0.1, 'Tolerans (+) en fazla 0.1 mm olmalıdır'),
    tolerans_minus: Yup.number()
      .required('Tolerans (-) gereklidir')
      .min(0, 'Tolerans (-) en az 0 olmalıdır')
      .max(0.1, 'Tolerans (-) en fazla 0.1 mm olmalıdır'),
    ic_cap: Yup.number()
      .required('İç Çap gereklidir')
      .oneOf([45, 50, 55], 'İç Çap 45, 50 veya 55 cm olmalıdır'),
    dis_cap: Yup.number()
      .required('Dış Çap gereklidir')
      .test('is-valid-outer-diameter', 'Dış Çap, İç Çap ile uyumlu olmalıdır', 
        function(value) {
          const icCap = this.parent.ic_cap;
          if (icCap === 45) return value === 75;
          if (icCap === 50) return value === 90;
          if (icCap === 55) return value === 105;
          return true;
        }
      ),
    kg: Yup.number()
      .required('Ağırlık gereklidir')
      .min(250, 'Ağırlık en az 250 kg olmalıdır')
      .max(1250, 'Ağırlık en fazla 1250 kg olmalıdır'),
    unwinding: Yup.string()
      .nullable()
      .oneOf(['Clockwise', null], 'Sarım yönü Clockwise veya boş olmalıdır'),
  });

  // YM ST formunun doğrulama şeması
  const ymStValidationSchema = Yup.object({
    cap: Yup.number()
      .required('Çap gereklidir')
      .min(0.8, 'Çap en az 0.8 mm olmalıdır')
      .max(8.0, 'Çap en fazla 8.0 mm olmalıdır'),
    filmasin: Yup.number()
      .required('Filmaşin çapı gereklidir')
      .min(550, 'Filmaşin çapı en az 550 (5.50 mm) olmalıdır')
      .max(1000, 'Filmaşin çapı en fazla 1000 (10.00 mm) olmalıdır'),
    quality: Yup.string()
      .required('Filmaşin kalitesi gereklidir')
      .oneOf(['1006', '1008', '1010'], 'Filmaşin kalitesi 1006, 1008 veya 1010 olmalıdır'),
  });

  // Dizilim numarasını al
  const fetchSequence = async (kod2, cap) => {
    const seq = await getCurrentSequence(kod2, cap);
    setSequence(seq);
  };

  // Form değerleri değiştiğinde dizilim numarasını güncelle
  const handleFormValuesChange = (values) => {
    if (values.kod_2 && values.cap) {
      fetchSequence(values.kod_2, values.cap);
    }
  };

  // Arama formunu gönderme
  const handleSearch = async (values) => {
    await searchProducts(values);
    setShowSearchModal(false);
  };

  return (
    <div className="galvanizli-tel-container px-0">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError(null)} 
            aria-label="Close"
          ></button>
        </div>
      )}
      
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successMessage}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setSuccessMessage('')}
            aria-label="Close"
          ></button>
        </div>
      )}
      
      <div className="card">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Galvanizli Tel Netsis Entegrasyonu</h5>
          <div>
            <button 
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={() => setShowSearchModal(true)}
            >
              <i className="bi bi-search me-1"></i> Ürün Ara
            </button>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                setMmGtData(null);
                setYmGtData(null);
                setSelectedYmSt([]);
                setIsEditMode(false);
                setDataExist(false);
                setActiveTab(0);
              }}
            >
              <i className="bi bi-plus-lg me-1"></i> Yeni Ürün
            </button>
          </div>
        </div>
        
        <div className="card-body">
          <Tabs 
            selectedIndex={activeTab} 
            onSelect={index => setActiveTab(index)}
            className="custom-tabs"
          >
            <TabList className="nav nav-tabs mb-3">
              <Tab className={`nav-item nav-link ${activeTab === 0 ? 'active' : ''}`}>
                MM GT Tanımla
              </Tab>
              <Tab className={`nav-item nav-link ${activeTab === 1 ? 'active' : ''}`}
                   disabled={!mmGtData}>
                YM ST Seç
              </Tab>
              <Tab className={`nav-item nav-link ${activeTab === 2 ? 'active' : ''}`}
                   disabled={!mmGtData || selectedYmSt.length === 0}>
                Excel Oluştur
              </Tab>
            </TabList>
            
            {/* MM GT Tanımlama Sekmesi */}
            <TabPanel>
              <Formik
                initialValues={{
                  cap: mmGtData?.cap || '',
                  kod_2: mmGtData?.kod_2 || 'NIT',
                  kaplama: mmGtData?.kaplama || 120,
                  min_mukavemet: mmGtData?.min_mukavemet || 400,
                  max_mukavemet: mmGtData?.max_mukavemet || 500,
                  tolerans_plus: mmGtData?.tolerans_plus || 0,
                  tolerans_minus: mmGtData?.tolerans_minus || 0.06,
                  ic_cap: mmGtData?.ic_cap || 45,
                  dis_cap: mmGtData?.dis_cap || 75,
                  kg: mmGtData?.kg || 750,
                  unwinding: mmGtData?.unwinding || null,
                  shrink: mmGtData?.shrink || 'evet',
                  cast_kont: mmGtData?.cast_kont || '',
                  helix_kont: mmGtData?.helix_kont || '',
                  elongation: mmGtData?.elongation || '',
                  sequence: sequence
                }}
                validationSchema={mmGtValidationSchema}
                onSubmit={async (values, { setSubmitting }) => {
                  setSubmitting(true);
                  
                  // MM GT kaydet
                  const savedMmGt = await saveMMGT(values);
                  
                  if (savedMmGt) {
                    // YM GT kaydet
                    await saveYMGT(values, savedMmGt.id);
                    setIsEditMode(true);
                    setActiveTab(1); // YM ST Seç sekmesine geç
                  }
                  
                  setSubmitting(false);
                }}
                enableReinitialize={true}
              >
                {({ isSubmitting, values, handleChange, setFieldValue }) => (
                  <Form onChange={() => handleFormValuesChange(values)}>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Çap (mm)</label>
                          <Field
                            name="cap"
                            type="number"
                            step="0.01"
                            placeholder="2,50"
                            className="form-control"
                          />
                          <ErrorMessage name="cap" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Kaplama Türü</label>
                          <Field
                            name="kod_2"
                            as="select"
                            className="form-select"
                            onChange={(e) => {
                              const value = e.target.value;
                              setFieldValue('kod_2', value);
                              
                              // PAD seçildiğinde kaplama değerini 50'ye sabitle
                              if (value === 'PAD') {
                                setFieldValue('kaplama', 50);
                              }
                            }}
                          >
                            <option value="NIT">NIT</option>
                            <option value="PAD">PAD</option>
                          </Field>
                          <ErrorMessage name="kod_2" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Kaplama (gr/m²)</label>
                          <Field
                            name="kaplama"
                            type="number"
                            className="form-control"
                            disabled={values.kod_2 === 'PAD'}
                            placeholder="120"
                          />
                          <ErrorMessage name="kaplama" component="div" className="text-danger small" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Min Mukavemet (MPa)</label>
                          <Field
                            name="min_mukavemet"
                            type="number"
                            className="form-control"
                            placeholder="400"
                          />
                          <ErrorMessage name="min_mukavemet" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Max Mukavemet (MPa)</label>
                          <Field
                            name="max_mukavemet"
                            type="number"
                            className="form-control"
                            placeholder="500"
                          />
                          <ErrorMessage name="max_mukavemet" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Tolerans (+) (mm)</label>
                          <Field
                            name="tolerans_plus"
                            type="number"
                            step="0.01"
                            className="form-control"
                            placeholder="0,00"
                          />
                          <ErrorMessage name="tolerans_plus" component="div" className="text-danger small" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Tolerans (-) (mm)</label>
                          <Field
                            name="tolerans_minus"
                            type="number"
                            step="0.01"
                            className="form-control"
                            placeholder="0,06"
                          />
                          <ErrorMessage name="tolerans_minus" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">İç Çap (cm)</label>
                          <Field
                            name="ic_cap"
                            as="select"
                            className="form-select"
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setFieldValue('ic_cap', value);
                              
                              // Dış çapı otomatik ayarla
                              if (value === 45) setFieldValue('dis_cap', 75);
                              else if (value === 50) setFieldValue('dis_cap', 90);
                              else if (value === 55) setFieldValue('dis_cap', 105);
                            }}
                          >
                            <option value="45">45</option>
                            <option value="50">50</option>
                            <option value="55">55</option>
                          </Field>
                          <ErrorMessage name="ic_cap" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Dış Çap (cm)</label>
                          <Field
                            name="dis_cap"
                            type="number"
                            className="form-control"
                            readOnly
                          />
                          <ErrorMessage name="dis_cap" component="div" className="text-danger small" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Ağırlık (kg)</label>
                          <Field
                            name="kg"
                            type="number"
                            className="form-control"
                            placeholder="750"
                          />
                          <ErrorMessage name="kg" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Sarım Yönü</label>
                          <Field
                            name="unwinding"
                            as="select"
                            className="form-select"
                          >
                            <option value="">Anti-Clockwise (Varsayılan)</option>
                            <option value="Clockwise">Clockwise</option>
                          </Field>
                          <ErrorMessage name="unwinding" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Shrink</label>
                          <Field
                            name="shrink"
                            as="select"
                            className="form-select"
                          >
                            <option value="evet">Evet</option>
                            <option value="hayır">Hayır</option>
                          </Field>
                          <ErrorMessage name="shrink" component="div" className="text-danger small" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">CAST KONT (İsteğe Bağlı)</label>
                          <Field
                            name="cast_kont"
                            className="form-control"
                            placeholder="CAST KONT değeri"
                          />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">HELIX KONT (İsteğe Bağlı)</label>
                          <Field
                            name="helix_kont"
                            className="form-control"
                            placeholder="HELIX KONT değeri"
                          />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">ELONGATION (İsteğe Bağlı)</label>
                          <Field
                            name="elongation"
                            className="form-control"
                            placeholder="ELONGATION değeri"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="d-flex justify-content-between mt-4">
                      <div>
                        <span className="text-muted">Ürün Kodu: </span>
                        <strong>{values.kod_2 && values.cap ? `GT.${values.kod_2}.${values.cap.toString().padStart(4, '0')}.${sequence.toString().padStart(2, '0')}` : 'Oluşturulacak'}</strong>
                      </div>
                      
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || loading}
                      >
                        {isSubmitting || loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Kaydediliyor...
                          </>
                        ) : isEditMode ? 'Güncelle' : 'Oluştur'}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </TabPanel>
            
            {/* YM ST Seçme Sekmesi */}
            <TabPanel>
              {!mmGtData ? (
                <div className="alert alert-warning">
                  Önce MM GT kaydı oluşturmalısınız. Lütfen önceki sekmeye dönün.
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>Seçilen Hammaddeler (YM ST)</h5>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowYmStModal(true)}
                    >
                      <i className="bi bi-plus-lg me-1"></i> Hammadde Ekle
                    </button>
                  </div>
                  
                  {selectedYmSt.length === 0 ? (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      Henüz hammadde seçilmemiş. En az bir YM ST kaydı eklemelisiniz.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Stok Kodu</th>
                            <th>Stok Adı</th>
                            <th>Çap</th>
                            <th>Filmaşin</th>
                            <th>Kalite</th>
                            <th>İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedYmSt.map(item => (
                            <tr key={item.id}>
                              <td>{item.stok_kodu}</td>
                              <td>{item.stok_adi}</td>
                              <td>{item.cap}</td>
                              <td>{item.filmasin}</td>
                              <td>{item.quality}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleRemoveYmSt(item.id)}
                                >
                                  <i className="bi bi-trash me-1"></i> Kaldır
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  <div className="d-flex justify-content-between mt-4">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab(0)}
                    >
                      <i className="bi bi-arrow-left me-1"></i> Geri
                    </button>
                    
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveTab(2)}
                      disabled={selectedYmSt.length === 0}
                    >
                      İleri <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </div>
                </>
              )}
            </TabPanel>
            
            {/* Excel Oluşturma Sekmesi */}
            <TabPanel>
              {!mmGtData ? (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Önce MM GT kaydı oluşturmalısınız. Lütfen ilk sekmeye dönün.
                </div>
              ) : selectedYmSt.length === 0 ? (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  En az bir YM ST kaydı eklemelisiniz. Lütfen önceki sekmeye dönün.
                </div>
              ) : (
                <>
                  <div className="alert alert-info">
                    <h5><i className="bi bi-info-circle me-2"></i> Excel Oluşturmaya Hazır</h5>
                    <p className="mb-0">
                      Aşağıdaki Excel oluştur butonuna tıklayarak iki ayrı Excel dosyası oluşturabilirsiniz:
                    </p>
                    <ul className="mt-2 mb-0">
                      <li><strong>Stok Kartı Excel</strong>: MM GT, YM GT ve YM ST sayfalarını içerir.</li>
                      <li><strong>Reçete Excel</strong>: MM GT REÇETE, YM GT REÇETE ve YM ST REÇETE sayfalarını içerir.</li>
                    </ul>
                  </div>
                  
                  <div className="d-flex justify-content-between mt-4">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setActiveTab(1)}
                    >
                      <i className="bi bi-arrow-left me-1"></i> Geri
                    </button>
                    
                    <button
                      className="btn btn-success"
                      onClick={handleGenerateExcel}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Excel Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-file-excel me-1"></i> Excel Oluştur
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </TabPanel>
          </Tabs>
        </div>
      </div>
      
      {/* YM ST Ekleme/Seçme Modalı */}
      <Modal
        show={showYmStModal}
        onHide={() => {
          setShowYmStModal(false);
          setSelectedYmStToAdd(null);
          setSearchYmSt("");
        }}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>YM ST Ekle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultIndex={0}>
            <TabList className="nav nav-tabs mb-3">
              <Tab className="nav-item nav-link">Mevcut YM ST Seç</Tab>
              <Tab className="nav-item nav-link">Yeni YM ST Oluştur</Tab>
            </TabList>
            
            <TabPanel>
              <div className="mb-3">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Stok kodu, stok adı veya çap ile ara..."
                    value={searchYmSt}
                    onChange={(e) => setSearchYmSt(e.target.value)}
                  />
                </div>
              </div>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table table-bordered table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Stok Kodu</th>
                      <th>Stok Adı</th>
                      <th>Çap</th>
                      <th>Filmaşin</th>
                      <th>Kalite</th>
                      <th>Seç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredYmStList.map(item => {
                      // Zaten seçilmiş olanları kontrol et
                      const isAlreadySelected = selectedYmSt.some(selected => selected.id === item.id);
                      
                      return (
                        <tr key={item.id} className={isAlreadySelected ? 'table-secondary' : ''}>
                          <td>{item.stok_kodu}</td>
                          <td>{item.stok_adi}</td>
                          <td>{item.cap}</td>
                          <td>{item.filmasin}</td>
                          <td>{item.quality}</td>
                          <td>
                            <button
                              className={`btn btn-sm ${selectedYmStToAdd?.id === item.id ? "btn-success" : "btn-outline-primary"}`}
                              disabled={isAlreadySelected}
                              onClick={() => handleSelectYmSt(item)}
                            >
                              {isAlreadySelected ? 'Seçildi' : (selectedYmStToAdd?.id === item.id ? 'Seçildi' : 'Seç')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {filteredYmStList.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-3">
                          <i className="bi bi-search me-2"></i>
                          Arama kriterlerine uygun YM ST bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabPanel>
            
            <TabPanel>
              <Formik
                initialValues={{
                  cap: mmGtData?.cap || '',
                  filmasin: '',
                  quality: '1006'
                }}
                validationSchema={ymStValidationSchema}
                onSubmit={handleCreateAndAddYmSt}
              >
                {({ isSubmitting }) => (
                  <Form>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Çap (mm)</label>
                          <Field
                            name="cap"
                            type="number"
                            step="0.01"
                            className="form-control"
                            placeholder="Çap (mm)"
                          />
                          <ErrorMessage name="cap" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Filmaşin Çapı (0550-1000)</label>
                          <Field
                            name="filmasin"
                            type="number"
                            className="form-control"
                            placeholder="Filmaşin çapı (örn: 600)"
                          />
                          <ErrorMessage name="filmasin" component="div" className="text-danger small" />
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-group mb-3">
                          <label className="form-label">Kalite</label>
                          <Field
                            name="quality"
                            as="select"
                            className="form-select"
                          >
                            <option value="1006">1006</option>
                            <option value="1008">1008</option>
                            <option value="1010">1010</option>
                          </Field>
                          <ErrorMessage name="quality" component="div" className="text-danger small" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="d-flex justify-content-end mt-4">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Kaydediliyor...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-plus-lg me-1"></i> Oluştur ve Ekle
                          </>
                        )}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </TabPanel>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setShowYmStModal(false);
              setSelectedYmStToAdd(null);
              setSearchYmSt("");
            }}
          >
            İptal
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleAddYmSt}
            disabled={!selectedYmStToAdd}
          >
            <i className="bi bi-plus-lg me-1"></i> Seçileni Ekle
          </button>
        </Modal.Footer>
      </Modal>
      
      {/* Ürün Arama Modalı */}
      <Modal
        show={showSearchModal}
        onHide={() => setShowSearchModal(false)}
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Ürün Ara</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={{
              stok_kodu: '',
              cap: '',
              kod_2: '',
              kg: ''
            }}
            onSubmit={handleSearch}
          >
            {({ isSubmitting }) => (
              <Form>
                <div className="form-group mb-3">
                  <label className="form-label">Stok Kodu</label>
                  <Field
                    name="stok_kodu"
                    className="form-control"
                    placeholder="Stok kodu"
                  />
                </div>
                
                <div className="form-group mb-3">
                  <label className="form-label">Çap (mm)</label>
                  <Field
                    name="cap"
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Çap (mm)"
                  />
                </div>
                
                <div className="form-group mb-3">
                  <label className="form-label">Kaplama Türü</label>
                  <Field
                    name="kod_2"
                    as="select"
                    className="form-select"
                  >
                    <option value="">Seçiniz</option>
                    <option value="NIT">NIT</option>
                    <option value="PAD">PAD</option>
                  </Field>
                </div>
                
                <div className="form-group mb-3">
                  <label className="form-label">Ağırlık (kg)</label>
                  <Field
                    name="kg"
                    type="number"
                    className="form-control"
                    placeholder="Ağırlık (kg)"
                  />
                </div>
                
                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || loading}
                  >
                    {isSubmitting || loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Aranıyor...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-search me-1"></i> Ara
                      </>
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default GalvanizliTelNetsis;
