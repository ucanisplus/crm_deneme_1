// GalvanizliTelNetsis.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth } from '@/api-config';
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

  // Excel oluşturma fonksiyonları
  async function createStokKartiExcel(mmGt, ymGt, ymStList) {
    // Excel işlemleri burada yapılacak
    const workbook = new ExcelJS.Workbook();
    
    // Excel sayfalarını ve verilerini ekle
    const mmGtSheet = workbook.addWorksheet('MM GT');
    // MM GT verilerini ekle
    
    const ymGtSheet = workbook.addWorksheet('YM GT');
    // YM GT verilerini ekle
    
    const ymStSheet = workbook.addWorksheet('YM ST');
    // YM ST verilerini ekle
    
    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `StokKarti_${mmGt.stok_kodu.replace(/\./g, '_')}.xlsx`);
  }

  async function createReceteExcel(mmGt, ymGt, ymStList) {
    // Excel işlemleri burada yapılacak
    const workbook = new ExcelJS.Workbook();
    
    // Excel sayfalarını ve verilerini ekle
    const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');
    // MM GT REÇETE verilerini ekle
    
    const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');
    // YM GT REÇETE verilerini ekle
    
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    // YM ST REÇETE verilerini ekle
    
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
  const [formValues, setFormValues] = useState({
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
  });

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
      setFilteredYmStList(data || []);
    } catch (error) {
      console.error('YM ST listesi yüklenirken hata oluştu:', error);
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
    } catch (error) {
      setError('YM ST kaldırılırken bir hata oluştu');
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
    setFormValues({
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
    });
  };

  // Excel oluştur
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

  if (error && error === 'YM ST listesi yüklenirken bir hata oluştu') {
    return (
      <div>
        <div style={{ color: 'red', marginBottom: '10px' }}>
          YM ST listesi yüklenirken bir hata oluştu
        </div>
        <button onClick={loadYmStList}>Tekrar Dene</button>
      </div>
    );
  }

  if (!hasPermission('access:galvanizli-tel')) {
    return <div>Bu modüle erişim izniniz bulunmamaktadır.</div>;
  }

  // Ürün kodu oluştur
  const productCode = formValues.kod_2 && formValues.cap 
    ? `GT.${formValues.kod_2}.${formValues.cap.toString().padStart(4, '0')}.${sequence.toString().padStart(2, '0')}`
    : 'Oluşturulacak';

  return (
    <div>
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '10px' }}>X</button>
        </div>
      )}
      
      {successMessage && (
        <div style={{ color: 'green', marginBottom: '10px' }}>
          {successMessage}
          <button onClick={() => setSuccessMessage('')} style={{ marginLeft: '10px' }}>X</button>
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <div>Galvanizli Tel Netsis Entegrasyonu</div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button onClick={() => setShowSearchModal(true)}>Ürün Ara</button>
          <button onClick={handleNewProduct}>Yeni Ürün</button>
        </div>
      </div>
      
      <div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <div 
            onClick={() => setActiveTab("mm-gt-tanimla")}
            style={{ 
              cursor: 'pointer', 
              fontWeight: activeTab === "mm-gt-tanimla" ? 'bold' : 'normal',
              textDecoration: activeTab === "mm-gt-tanimla" ? 'underline' : 'none'
            }}
          >
            MM GT Tanımla
          </div>
          <div 
            onClick={() => mmGtData && setActiveTab("ym-st-sec")}
            style={{ 
              cursor: mmGtData ? 'pointer' : 'not-allowed', 
              opacity: mmGtData ? 1 : 0.5,
              fontWeight: activeTab === "ym-st-sec" ? 'bold' : 'normal',
              textDecoration: activeTab === "ym-st-sec" ? 'underline' : 'none'
            }}
          >
            YM ST Seç
          </div>
          <div 
            onClick={() => mmGtData && selectedYmSt.length > 0 && setActiveTab("excel-olustur")}
            style={{ 
              cursor: mmGtData && selectedYmSt.length > 0 ? 'pointer' : 'not-allowed', 
              opacity: mmGtData && selectedYmSt.length > 0 ? 1 : 0.5,
              fontWeight: activeTab === "excel-olustur" ? 'bold' : 'normal',
              textDecoration: activeTab === "excel-olustur" ? 'underline' : 'none'
            }}
          >
            Excel Oluştur
          </div>
        </div>
        
        {/* MM GT Tanımlama */}
        {activeTab === "mm-gt-tanimla" && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Çap (mm)
                <input
                  type="number"
                  name="cap"
                  value={formValues.cap}
                  onChange={handleInputChange}
                  step="0.01"
                  placeholder="2,50"
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Kaplama Türü
                <select
                  name="kod_2"
                  value={formValues.kod_2}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                >
                  <option value="NIT">NIT</option>
                  <option value="PAD">PAD</option>
                </select>
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Kaplama (gr/m²)
                <input
                  type="number"
                  name="kaplama"
                  value={formValues.kaplama}
                  onChange={handleInputChange}
                  disabled={formValues.kod_2 === 'PAD'}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Min Mukavemet (MPa)
                <input
                  type="number"
                  name="min_mukavemet"
                  value={formValues.min_mukavemet}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Max Mukavemet (MPa)
                <input
                  type="number"
                  name="max_mukavemet"
                  value={formValues.max_mukavemet}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Tolerans (+) (mm)
                <input
                  type="number"
                  name="tolerans_plus"
                  value={formValues.tolerans_plus}
                  onChange={handleInputChange}
                  step="0.01"
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Tolerans (-) (mm)
                <input
                  type="number"
                  name="tolerans_minus"
                  value={formValues.tolerans_minus}
                  onChange={handleInputChange}
                  step="0.01"
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                İç Çap (cm)
                <select
                  name="ic_cap"
                  value={formValues.ic_cap}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                >
                  <option value="45">45</option>
                  <option value="50">50</option>
                  <option value="55">55</option>
                </select>
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Dış Çap (cm)
                <input
                  type="number"
                  name="dis_cap"
                  value={formValues.dis_cap}
                  readOnly
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Ağırlık (kg)
                <input
                  type="number"
                  name="kg"
                  value={formValues.kg}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Sarım Yönü
                <select
                  name="unwinding"
                  value={formValues.unwinding || ""}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                >
                  <option value="">Anti-Clockwise (Varsayılan)</option>
                  <option value="Clockwise">Clockwise</option>
                </select>
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Shrink
                <select
                  name="shrink"
                  value={formValues.shrink}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                >
                  <option value="evet">Evet</option>
                  <option value="hayır">Hayır</option>
                </select>
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                CAST KONT (İsteğe Bağlı)
                <input
                  type="text"
                  name="cast_kont"
                  value={formValues.cast_kont}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                HELIX KONT (İsteğe Bağlı)
                <input
                  type="text"
                  name="helix_kont"
                  value={formValues.helix_kont}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                ELONGATION (İsteğe Bağlı)
                <input
                  type="text"
                  name="elongation"
                  value={formValues.elongation}
                  onChange={handleInputChange}
                  style={{ display: 'block', width: '100%', marginTop: '5px' }}
                />
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <div>
                <span>Ürün Kodu: </span>
                <strong>{productCode}</strong>
              </div>
              
              <button 
                onClick={handleSaveMMGT}
                disabled={loading}
              >
                {loading ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        )}
        
        {/* YM ST Seçme */}
        {activeTab === "ym-st-sec" && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>Seçilen Hammaddeler (YM ST)</h3>
              <button onClick={() => setShowYmStSearchModal(true)}>Hammadde Ekle</button>
            </div>
            
            {selectedYmSt.length === 0 ? (
              <div>
                Henüz hammadde seçilmemiş. En az bir YM ST kaydı eklemelisiniz.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Stok Kodu</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Stok Adı</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Çap</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Filmaşin</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Kalite</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedYmSt.map(item => (
                    <tr key={item.id}>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.stok_kodu}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.stok_adi}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.cap}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.filmasin}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quality}</td>
                      <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                        <button onClick={() => handleRemoveYmSt(item.id)}>Kaldır</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setActiveTab("mm-gt-tanimla")}>Geri</button>
              <button 
                onClick={() => setActiveTab("excel-olustur")}
                disabled={selectedYmSt.length === 0}
              >
                İleri
              </button>
            </div>
          </div>
        )}
        
        {/* Excel Oluşturma */}
        {activeTab === "excel-olustur" && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3>Excel Oluşturmaya Hazır</h3>
              <p>
                Aşağıdaki Excel oluştur butonuna tıklayarak iki ayrı Excel dosyası oluşturabilirsiniz:
              </p>
              <ul>
                <li><strong>Stok Kartı Excel</strong>: MM GT, YM GT ve YM ST sayfalarını içerir.</li>
                <li><strong>Reçete Excel</strong>: MM GT REÇETE, YM GT REÇETE ve YM ST REÇETE sayfalarını içerir.</li>
              </ul>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setActiveTab("ym-st-sec")}>Geri</button>
              <button 
                onClick={handleGenerateExcel}
                disabled={loading}
              >
                {loading ? 'Excel Oluşturuluyor...' : 'Excel Oluştur'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* YM ST Arama Modal */}
      {showYmStSearchModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '5px', 
            width: '80%', 
            maxHeight: '80%',
            overflowY: 'auto'
          }}>
            <h3>YM ST Seç</h3>
            
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Ara..."
                value={searchYmSt}
                onChange={handleYmStSearch}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Stok Kodu</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Stok Adı</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Çap</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Filmaşin</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Kalite</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Seç</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredYmStList.map(item => {
                    const isSelected = selectedYmSt.some(sel => sel.id === item.id);
                    const isActive = selectedYmStToAdd?.id === item.id;
                    
                    return (
                      <tr key={item.id} style={{ backgroundColor: isSelected ? '#f0f0f0' : 'white' }}>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.stok_kodu}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.stok_adi}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.cap}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.filmasin}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.quality}</td>
                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                          <button
                            onClick={() => handleSelectYmSt(item)}
                            disabled={isSelected}
                            style={{ backgroundColor: isActive ? 'green' : 'initial', color: isActive ? 'white' : 'initial' }}
                          >
                            {isSelected ? 'Seçildi' : isActive ? 'Seçildi' : 'Seç'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredYmStList.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '10px' }}>
                        Arama kriterine uygun YM ST bulunamadı
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <div>
                <button onClick={() => setShowYmStCreateModal(true)}>Yeni YM ST Oluştur</button>
              </div>
              <div>
                <button onClick={() => {
                  setShowYmStSearchModal(false);
                  setSelectedYmStToAdd(null);
                  setSearchYmSt("");
                }} style={{ marginRight: '10px' }}>
                  İptal
                </button>
                <button
                  onClick={handleAddYmSt}
                  disabled={!selectedYmStToAdd}
                >
                  Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Yeni YM ST Oluşturma Modal */}
      {showYmStCreateModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          zIndex: 1001
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '5px', 
            width: '50%'
          }}>
            <h3>Yeni YM ST Oluştur</h3>
            
            <Formik
              initialValues={{
                cap: mmGtData?.cap || '',
                filmasin: '',
                quality: '1006'
              }}
              onSubmit={handleCreateYmSt}
            >
              {({ values, handleChange, handleSubmit, isSubmitting }) => (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      Çap (mm)
                      <input
                        type="number"
                        name="cap"
                        value={values.cap}
                        onChange={handleChange}
                        step="0.01"
                        style={{ display: 'block', width: '100%', marginTop: '5px' }}
                      />
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      Filmaşin Çapı (0550-1000)
                      <input
                        type="number"
                        name="filmasin"
                        value={values.filmasin}
                        onChange={handleChange}
                        style={{ display: 'block', width: '100%', marginTop: '5px' }}
                      />
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      Kalite
                      <select
                        name="quality"
                        value={values.quality}
                        onChange={handleChange}
                        style={{ display: 'block', width: '100%', marginTop: '5px' }}
                      >
                        <option value="1006">1006</option>
                        <option value="1008">1008</option>
                        <option value="1010">1010</option>
                      </select>
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setShowYmStCreateModal(false)}
                      style={{ marginRight: '10px' }}
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                  </div>
                </form>
              )}
            </Formik>
          </div>
        </div>
      )}
      
      {/* Ürün Arama Modal */}
      {showSearchModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '5px', 
            width: '50%'
          }}>
            <h3>Ürün Ara</h3>
            
            <Formik
              initialValues={{
                stok_kodu: '',
                cap: '',
                kod_2: '',
                kg: ''
              }}
              onSubmit={handleSearch}
            >
              {({ values, handleChange, handleSubmit, isSubmitting }) => (
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      Stok Kodu
                      <input
                        type="text"
                        name="stok_kodu"
                        value={values.stok_kodu}
                        onChange={handleChange}
                        style={{ display: 'block', width: '100%', marginTop: '5px' }}
                      />
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      Çap (mm)
                      <input
                        type="number"
                        name="cap"
                        value={values.cap}
                        onChange={handleChange}
                        step="0.01"
                        style={{ display: 'block', width: '100%', marginTop: '5px' }}
                      />
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      Kaplama Türü
                      <select
                        name="kod_2"
                        value={values.kod_2}
                        onChange={handleChange}
                        style={{ display: 'block', width: '100%', marginTop: '5px' }}
                      >
                        <option value="">Seçiniz</option>
                        <option value="NIT">NIT</option>
                        <option value="PAD">PAD</option>
                      </select>
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>
                      Ağırlık (kg)
                      <input
                        type="number"
                        name="kg"
                        value={values.kg}
                        onChange={handleChange}
                        style={{ display: 'block', width: '100%', marginTop: '5px' }}
                      />
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setShowSearchModal(false)}
                      style={{ marginRight: '10px' }}
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || loading}
                    >
                      {isSubmitting || loading ? 'Aranıyor...' : 'Ara'}
                    </button>
                  </div>
                </form>
              )}
            </Formik>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalvanizliTelNetsis;
