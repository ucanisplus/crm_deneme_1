// GalvanizliTelNetsis.jsx
import React, { useState, useEffect, useContext, createContext } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/contexts/AuthContext';
import { API_URLS, fetchWithAuth } from '@/utils/api-config';
import { supabase } from '@/utils/supabase-client';
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
      const { data, error } = await supabase
        .from('gal_cost_cal_sequence')
        .select('sequence')
        .eq('kod_2', kod2)
        .eq('cap', cap)
        .single();

      if (error) {
        // Eğer kayıt bulunamazsa yeni bir kayıt oluştur
        if (error.code === 'PGRST116') {
          const { data: newData, error: newError } = await supabase
            .from('gal_cost_cal_sequence')
            .insert({ kod_2: kod2, cap: cap, sequence: 1 })
            .select()
            .single();

          if (newError) throw newError;
          return newData.sequence;
        } else {
          throw error;
        }
      }

      return data.sequence;
    } catch (error) {
      console.error('Sıra numarası alınırken hata oluştu:', error);
      setError('Sıra numarası alınırken hata oluştu');
      return 1;
    }
  }

  // Dizilim artırma fonksiyonu
  async function incrementSequence(kod2, cap) {
    try {
      const currentSequence = await getCurrentSequence(kod2, cap);
      const nextSequence = currentSequence + 1;

      const { error } = await supabase
        .from('gal_cost_cal_sequence')
        .upsert({ kod_2: kod2, cap: cap, sequence: nextSequence })
        .select();

      if (error) throw error;
      return nextSequence;
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
      let query = supabase.from('gal_cost_cal_mm_gt').select('*');

      // Arama parametrelerini ekle
      if (searchParams.stok_kodu) {
        query = query.ilike('stok_kodu', `%${searchParams.stok_kodu}%`);
      }
      if (searchParams.cap) {
        query = query.eq('cap', searchParams.cap);
      }
      if (searchParams.kod_2) {
        query = query.eq('kod_2', searchParams.kod_2);
      }
      if (searchParams.kg) {
        query = query.eq('kg', searchParams.kg);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        setMmGtData(data[0]);
        setDataExist(true);
        
        // YM GT verisini al
        const { data: ymGtData, error: ymGtError } = await supabase
          .from('gal_cost_cal_ym_gt')
          .select('*')
          .eq('mm_gt_id', data[0].id)
          .single();

        if (ymGtError && ymGtError.code !== 'PGRST116') throw ymGtError;
        
        if (ymGtData) {
          setYmGtData(ymGtData);
          
          // İlişkili YM ST verilerini al
          const { data: ymStRelationData, error: ymStRelError } = await supabase
            .from('gal_cost_cal_mm_gt_ym_st')
            .select('ym_st_id')
            .eq('mm_gt_id', data[0].id);

          if (ymStRelError) throw ymStRelError;

          if (ymStRelationData && ymStRelationData.length > 0) {
            const ymStIds = ymStRelationData.map(item => item.ym_st_id);
            
            const { data: ymStData, error: ymStError } = await supabase
              .from('gal_cost_cal_ym_st')
              .select('*')
              .in('id', ymStIds);

            if (ymStError) throw ymStError;
            
            if (ymStData && ymStData.length > 0) {
              setSelectedYmSt(ymStData);
            }
          }
        }
      } else {
        setDataExist(false);
        setMmGtData(null);
        setYmGtData(null);
        setSelectedYmSt([]);
      }

    } catch (error) {
      console.error('Ürün arama hatası:', error);
      setError('Ürün arama sırasında bir hata oluştu');
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

      let savedMmGtData;
      
      if (isEditMode && mmGtData && mmGtData.id) {
        // Güncelleme işlemi
        const { data, error } = await supabase
          .from('gal_cost_cal_mm_gt')
          .update(mmGtDataToSave)
          .eq('id', mmGtData.id)
          .select()
          .single();

        if (error) throw error;
        savedMmGtData = data;
        setSuccessMessage('MM GT kaydı başarıyla güncellendi');
      } else {
        // Yeni kayıt oluşturma
        const { data, error } = await supabase
          .from('gal_cost_cal_mm_gt')
          .insert(mmGtDataToSave)
          .select()
          .single();

        if (error) throw error;
        savedMmGtData = data;
        setSuccessMessage('MM GT kaydı başarıyla oluşturuldu');
        
        // Dizilim numarasını artır
        await incrementSequence(values.kod_2, values.cap);
      }

      setMmGtData(savedMmGtData);
      return savedMmGtData;
      
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
      // MM GT verisini al
      const { data: mmGt, error: mmGtError } = await supabase
        .from('gal_cost_cal_mm_gt')
        .select('*')
        .eq('id', mmGtId)
        .single();

      if (mmGtError) throw mmGtError;

      // Stok Kodu formatını oluştur
      const stockCode = mmGt.stok_kodu.replace('GT.', 'YM.GT.');
      
      // YM GT verilerini hazırla
      const ymGtDataToSave = {
        ...values,
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
        ic_cap_boy_cubuk_ad: mmGt.ic_cap_boy_cubuk_ad,
        dis_cap_en_cubuk_ad: mmGt.dis_cap_en_cubuk_ad,
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

      // Mevcut YM GT kaydını kontrol et
      const { data: existingYmGt, error: ymGtQueryError } = await supabase
        .from('gal_cost_cal_ym_gt')
        .select('*')
        .eq('mm_gt_id', mmGtId)
        .maybeSingle();

      if (ymGtQueryError && ymGtQueryError.code !== 'PGRST116') throw ymGtQueryError;

      let savedYmGtData;

      if (existingYmGt) {
        // Güncelleme işlemi
        const { data, error } = await supabase
          .from('gal_cost_cal_ym_gt')
          .update(ymGtDataToSave)
          .eq('id', existingYmGt.id)
          .select()
          .single();

        if (error) throw error;
        savedYmGtData = data;
        setSuccessMessage('YM GT kaydı başarıyla güncellendi');
      } else {
        // Yeni kayıt oluşturma
        const { data, error } = await supabase
          .from('gal_cost_cal_ym_gt')
          .insert(ymGtDataToSave)
          .select()
          .single();

        if (error) throw error;
        savedYmGtData = data;
        setSuccessMessage('YM GT kaydı başarıyla oluşturuldu');
      }

      setYmGtData(savedYmGtData);
      return savedYmGtData;
      
    } catch (error) {
      console.error('YM GT kaydetme hatası:', error);
      setError('YM GT kaydedilirken bir hata oluştu: ' + error.message);
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
      // Yeni YM ST kaydı
      if (values.isNew) {
        // Stok kodu oluştur
        const stockCode = `YM.ST.${values.cap.toString().padStart(4, '0')}.${values.filmasin.toString().padStart(4, '0')}.${values.quality}`;
        
        // Stok adı oluştur
        const stockName = `YM Siyah Tel ${values.cap.toString().padStart(4, '0')} mm HM:${values.filmasin.toString().padStart(4, '0')}.${values.quality}`;
        
        // Özel Saha 1 değerini ayarla
        let ozelSaha1;
        if (values.cap < 2) ozelSaha1 = 1;
        else if (values.cap >= 2 && values.cap < 3) ozelSaha1 = 2;
        else if (values.cap >= 3 && values.cap < 4) ozelSaha1 = 3;
        else if (values.cap >= 4 && values.cap < 5) ozelSaha1 = 4;
        else if (values.cap >= 5 && values.cap < 6) ozelSaha1 = 5;
        else if (values.cap >= 6 && values.cap < 7) ozelSaha1 = 6;
        else if (values.cap >= 7 && values.cap < 8) ozelSaha1 = 7;
        else ozelSaha1 = 8;

        // YM ST verilerini hazırla
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
          payda_1: 1.000,
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

        // İlk olarak mevcut bir kaydın olup olmadığını kontrol et
        const { data: existingYmSt, error: existingError } = await supabase
          .from('gal_cost_cal_ym_st')
          .select('*')
          .eq('stok_kodu', stockCode)
          .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') throw existingError;

        let savedYmStData;

        if (existingYmSt) {
          // Kayıt zaten var, mevcut kaydı kullan
          savedYmStData = existingYmSt;
        } else {
          // Yeni kayıt oluştur
          const { data, error } = await supabase
            .from('gal_cost_cal_ym_st')
            .insert(ymStDataToSave)
            .select()
            .single();

          if (error) throw error;
          savedYmStData = data;
        }

        // İlişki tablosu için kaydı ekle
        const { error: relError } = await supabase
          .from('gal_cost_cal_mm_gt_ym_st')
          .insert({
            mm_gt_id: mmGtId,
            ym_st_id: savedYmStData.id,
            created_by: user.id,
            updated_by: user.id
          });

        if (relError) throw relError;

        // Mevcut seçili YM ST listesini güncelle
        setSelectedYmSt(prevList => [...prevList, savedYmStData]);
        setSuccessMessage('YM ST kaydı başarıyla eklendi');
        return savedYmStData;
      } 
      // Mevcut YM ST kaydını seç
      else {
        // Seçilen YM ST'nin ilişkisini kur
        const { error: relError } = await supabase
          .from('gal_cost_cal_mm_gt_ym_st')
          .insert({
            mm_gt_id: mmGtId,
            ym_st_id: values.id,
            created_by: user.id,
            updated_by: user.id
          });

        if (relError) throw relError;

        // Mevcut seçili YM ST listesini güncelle
        const { data: ymStData, error: ymStError } = await supabase
          .from('gal_cost_cal_ym_st')
          .select('*')
          .eq('id', values.id)
          .single();

        if (ymStError) throw ymStError;

        setSelectedYmSt(prevList => [...prevList, ymStData]);
        setSuccessMessage('YM ST ilişkisi başarıyla kuruldu');
        return ymStData;
      }
      
    } catch (error) {
      console.error('YM ST kaydetme hatası:', error);
      setError('YM ST kaydedilirken bir hata oluştu: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  // Excel Oluşturma Fonksiyonu
  async function generateExcel(mmGtId) {
    setLoading(true);
    setError(null);
    
    try {
      // MM GT verisini al
      const { data: mmGt, error: mmGtError } = await supabase
        .from('gal_cost_cal_mm_gt')
        .select('*')
        .eq('id', mmGtId)
        .single();

      if (mmGtError) throw mmGtError;

      // YM GT verisini al
      const { data: ymGt, error: ymGtError } = await supabase
        .from('gal_cost_cal_ym_gt')
        .select('*')
        .eq('mm_gt_id', mmGtId)
        .single();

      if (ymGtError) throw ymGtError;

      // İlişkili YM ST verilerini al
      const { data: ymStRelationData, error: ymStRelError } = await supabase
        .from('gal_cost_cal_mm_gt_ym_st')
        .select('ym_st_id')
        .eq('mm_gt_id', mmGtId);

      if (ymStRelError) throw ymStRelError;

      if (!ymStRelationData || ymStRelationData.length === 0) {
        throw new Error('İlişkili YM ST kaydı bulunmamaktadır');
      }

      const ymStIds = ymStRelationData.map(item => item.ym_st_id);
      
      const { data: ymStData, error: ymStError } = await supabase
        .from('gal_cost_cal_ym_st')
        .select('*')
        .in('id', ymStIds);

      if (ymStError) throw ymStError;
      
      if (!ymStData || ymStData.length === 0) {
        throw new Error('YM ST verileri bulunamadı');
      }

      // Reçete verilerini al
      const { data: mmGtReceteData, error: mmGtReceteError } = await supabase
        .from('gal_cost_cal_mm_gt_recete')
        .select('*')
        .eq('mm_gt_id', mmGtId)
        .order('sira_no', { ascending: true });

      if (mmGtReceteError) throw mmGtReceteError;

      const { data: ymGtReceteData, error: ymGtReceteError } = await supabase
        .from('gal_cost_cal_ym_gt_recete')
        .select('*')
        .eq('ym_gt_id', ymGt.id)
        .order('sira_no', { ascending: true });

      if (ymGtReceteError) throw ymGtReceteError;

      const ymStRecetePromises = ymStData.map(async (st) => {
        const { data, error } = await supabase
          .from('gal_cost_cal_ym_st_recete')
          .select('*')
          .eq('ym_st_id', st.id)
          .order('sira_no', { ascending: true });

        if (error) throw error;
        return { stId: st.id, receteData: data || [] };
      });

      const ymStReceteResults = await Promise.all(ymStRecetePromises);

      // Eğer reçete verileri boşsa, hesaplama yapıp oluştur
      if (!mmGtReceteData || mmGtReceteData.length === 0) {
        // MM GT reçete oluştur
        await createMMGTRecete(mmGt.id, ymGt.id);
      }

      if (!ymGtReceteData || ymGtReceteData.length === 0) {
        // YM GT reçete oluştur
        await createYMGTRecete(ymGt.id);
      }

      for (const result of ymStReceteResults) {
        if (!result.receteData || result.receteData.length === 0) {
          // YM ST reçete oluştur
          await createYMSTRecete(result.stId);
        }
      }

      // Excel oluştur
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

  // MM GT Reçete oluşturma fonksiyonu
  async function createMMGTRecete(mmGtId, ymGtId) {
    // MM GT verisini al
    const { data: mmGt, error: mmGtError } = await supabase
      .from('gal_cost_cal_mm_gt')
      .select('*')
      .eq('id', mmGtId)
      .single();

    if (mmGtError) throw mmGtError;

    // Reçete verileri
    const receteItems = [
      {
        mamul_kodu: mmGt.stok_kodu,
        recete_top: 1,
        fire_orani: 0.0004,
        olcu_br: 'KG',
        sira_no: 1,
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: `YM.GT.${mmGt.kod_2}.${mmGt.cap.toString().padStart(4, '0')}.${mmGt.stok_kodu.split('.').pop()}`,
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

//There was a break in the code so I dont know if the continuation is correct.

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

    // Reçeteleri veritabanına kaydet
    const { error } = await supabase
      .from('gal_cost_cal_mm_gt_recete')
      .insert(receteItems);

    if (error) throw error;
  }

  // YM GT Reçete oluşturma fonksiyonu
  async function createYMGTRecete(ymGtId) {
    // YM GT verisini al
    const { data: ymGt, error: ymGtError } = await supabase
      .from('gal_cost_cal_ym_gt')
      .select('*')
      .eq('id', ymGtId)
      .single();

    if (ymGtError) throw ymGtError;

    // Reçete hesaplamaları
    // Çap değerine bağlı olarak hesaplamalar
    const diameter = parseFloat(ymGt.cap);
    
    // 150 03 değeri: 0.032 - (0.0029 * Diameter)
    const value15003 = Math.max(0.001, 0.032 - (0.0029 * diameter)).toFixed(6);
    
    // SM.HİDROLİK.ASİT değeri: Çapa ve kaplamaya göre karmaşık formül
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
    
    // GTPKT01 değeri: Sabit 0.020
    const gtpktValue = 0.020;
    
    // GLV01 değeri: 1.15 - (0.125 * Diameter)
    const glvValue = Math.max(0.001, 1.15 - (0.125 * diameter)).toFixed(6);
    
    // TLC01 değeri: 0.2/(Diameter^1.5)
    const tlcValue = (0.2 / Math.pow(diameter, 1.5)).toFixed(6);

    // Reçete verileri
    const receteItems = [
      {
        mamul_kodu: ymGt.stok_kodu,
        recete_top: 1,
        fire_orani: 0.002,
        olcu_br: 'KG',
        sira_no: 1,
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: 'YM.ST.0250.0600.1006', // Bu değer gerçekte dinamik olmalı, şimdilik sabit
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

    // Reçeteleri veritabanına kaydet
    const { error } = await supabase
      .from('gal_cost_cal_ym_gt_recete')
      .insert(receteItems);

    if (error) throw error;
  }

  // YM ST Reçete oluşturma fonksiyonu
  async function createYMSTRecete(ymStId) {
    // YM ST verisini al
    const { data: ymSt, error: ymStError } = await supabase
      .from('gal_cost_cal_ym_st')
      .select('*')
      .eq('id', ymStId)
      .single();

    if (ymStError) throw ymStError;

    // Çap değerine bağlı TLC01 değeri hesapla: 0.2/(Diameter^1.5)
    const diameter = parseFloat(ymSt.cap);
    const tlcValue = (0.2 / Math.pow(diameter, 1.5)).toFixed(9);

    // Reçete verileri
    const receteItems = [
      {
        mamul_kodu: ymSt.stok_kodu,
        recete_top: 1,
        olcu_br: 'KG',
        sira_no: 1,
        operasyon_bilesen: 'Bileşen',
        bilesen_kodu: `FLM.${ymSt.filmasin.toString().padStart(4, '0')}.${ymSt.quality}`,
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

    // Reçeteleri veritabanına kaydet
    const { error } = await supabase
      .from('gal_cost_cal_ym_st_recete')
      .insert(receteItems);

    if (error) throw error;
  }

  // Stok Kartı Excel oluşturma
  async function createStokKartiExcel(mmGt, ymGt, ymStList) {
    // Excel dosyası oluştur
    const workbook = new ExcelJS.Workbook();
    
    // MM GT sayfası
    const mmGtSheet = workbook.addWorksheet('MM GT');
    // Sayfa başlık ve ayarları
    setupExcelSheet(mmGtSheet, 'MM GT Stok Kartı');
    
    // Tüm sütun başlıklarını ekle (şablona göre)
    addStokKartiHeaders(mmGtSheet);
    
    // MM GT verisini ekle
    addMMGTData(mmGtSheet, mmGt);
    
    // YM GT sayfası
    const ymGtSheet = workbook.addWorksheet('YM GT');
    // Sayfa başlık ve ayarları
    setupExcelSheet(ymGtSheet, 'YM GT Stok Kartı');
    
    // Tüm sütun başlıklarını ekle (şablona göre)
    addStokKartiHeaders(ymGtSheet);
    
    // YM GT verisini ekle
    addYMGTData(ymGtSheet, ymGt);
    
    // YM ST sayfası
    const ymStSheet = workbook.addWorksheet('YM ST');
    // Sayfa başlık ve ayarları
    setupExcelSheet(ymStSheet, 'YM ST Stok Kartı');
    
    // Tüm sütun başlıklarını ekle (şablona göre)
    addYMSTHeaders(ymStSheet);
    
    // YM ST verilerini ekle
    addYMSTData(ymStSheet, ymStList);
    
    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `StokKarti_${mmGt.stok_kodu.replace(/\./g, '_')}.xlsx`);
  }

  // Reçete Excel oluşturma
  async function createReceteExcel(mmGt, ymGt, ymStList) {
    // Excel dosyası oluştur
    const workbook = new ExcelJS.Workbook();
    
    // MM GT REÇETE sayfası
    const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');
    // Sayfa başlık ve ayarları
    setupExcelSheet(mmGtReceteSheet, 'MM GT Reçete Kartı');
    
    // Tüm sütun başlıklarını ekle (şablona göre)
    addReceteHeaders(mmGtReceteSheet);
    
    // MM GT reçete verisini al ve ekle
    const { data: mmGtReceteData, error: mmGtReceteError } = await supabase
      .from('gal_cost_cal_mm_gt_recete')
      .select('*')
      .eq('mm_gt_id', mmGt.id)
      .order('sira_no', { ascending: true });

    if (mmGtReceteError) throw mmGtReceteError;
    
    // Reçete verilerini ekle
    addReceteData(mmGtReceteSheet, mmGtReceteData);
    
    // YM GT REÇETE sayfası
    const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');
    // Sayfa başlık ve ayarları
    setupExcelSheet(ymGtReceteSheet, 'YM GT Reçete Kartı');
    
    // Tüm sütun başlıklarını ekle (şablona göre)
    addReceteHeaders(ymGtReceteSheet);
    
    // YM GT reçete verisini al ve ekle
    const { data: ymGtReceteData, error: ymGtReceteError } = await supabase
      .from('gal_cost_cal_ym_gt_recete')
      .select('*')
      .eq('ym_gt_id', ymGt.id)
      .order('sira_no', { ascending: true });

    if (ymGtReceteError) throw ymGtReceteError;
    
    // Reçete verilerini ekle
    addReceteData(ymGtReceteSheet, ymGtReceteData);
    
    // YM ST REÇETE sayfası
    const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');
    // Sayfa başlık ve ayarları
    setupExcelSheet(ymStReceteSheet, 'YM ST Reçete Kartı');
    
    // Tüm sütun başlıklarını ekle (şablona göre)
    addReceteHeaders(ymStReceteSheet);
    
    // YM ST reçete verilerini al
    let allYmStReceteData = [];
    
    for (const ymSt of ymStList) {
      const { data: ymStReceteData, error: ymStReceteError } = await supabase
        .from('gal_cost_cal_ym_st_recete')
        .select('*')
        .eq('ym_st_id', ymSt.id)
        .order('sira_no', { ascending: true });

      if (ymStReceteError) throw ymStReceteError;
      
      if (ymStReceteData && ymStReceteData.length > 0) {
        allYmStReceteData = [...allYmStReceteData, ...ymStReceteData];
      }
    }
    
    // Reçete verilerini ekle
    addReceteData(ymStReceteSheet, allYmStReceteData);
    
    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Recete_${mmGt.stok_kodu.replace(/\./g, '_')}.xlsx`);
  }

  // Excel sayfa ayarlarını yapma
  function setupExcelSheet(sheet, title) {
    // Sayfa başlığı
    sheet.mergeCells('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // İlk satırı boş bırak
    sheet.addRow([]);
  }

  // Stok Kartı başlıklarını ekleme
  function addStokKartiHeaders(sheet) {
    // MM GT ve YM GT için sütun başlıkları
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
    
    // Sütun genişliklerini ayarla
    headers.forEach((header, i) => {
      const col = sheet.getColumn(i + 1);
      col.width = Math.max(15, header.length * 1.2);
    });
  }

  // YM ST başlıklarını ekleme
  function addYMSTHeaders(sheet) {
    // YM ST için sütun başlıkları
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
    
    // Sütun genişliklerini ayarla
    headers.forEach((header, i) => {
      const col = sheet.getColumn(i + 1);
      col.width = Math.max(15, header.length * 1.2);
    });
  }

// Reçete başlıklarını ekleme - devam
function addReceteHeaders(sheet) {
  // Reçete için sütun başlıkları
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
  
  // Sütun genişliklerini ayarla
  headers.forEach((header, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = Math.max(15, header.length * 1.2);
  });
}

// MM GT verisini Excel sayfasına ekleme
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

// YM GT verisini Excel sayfasına ekleme
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

// YM ST verilerini Excel sayfasına ekleme
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
      ymSt.ozel_saha_1 || '',    // Özel Saha 1 (Say.)
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

// Reçete verilerini Excel sayfasına ekleme
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

// Kendi hook'umuzu oluşturalım
export const useGalvanizliTel = () => {
const context = useContext(GalvanizliTelContext);
if (context === undefined) {
  throw new Error('useGalvanizliTel must be used within a GalvanizliTelProvider');
}
return context;
};

// Ana Galvanizli Tel bileşeni
const GalvanizliTelComponent = () => {
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
    if (!hasPermission('galvanizli_tel_module')) {
      setError('Bu modüle erişim izniniz bulunmamaktadır.');
    } else {
      loadYmStList();
    }
  }, [hasPermission]);

  // YM ST listesini yükle
  const loadYmStList = async () => {
    try {
      const { data, error } = await supabase
        .from('gal_cost_cal_ym_st')
        .select('*')
        .order('stok_kodu', { ascending: true });

      if (error) throw error;
      
      setYmStList(data || []);
    } catch (error) {
      console.error('YM ST listesi yüklenirken hata oluştu:', error);
      setError('YM ST listesi yüklenirken bir hata oluştu');
    }
  };

  // YM ST listesini filtrele
  useEffect(() => {
    if (searchYmSt.trim() === '') {
      setFilteredYmStList(ymStList);
    } else {
      const filtered = ymStList.filter(item => 
        item.stok_kodu.toLowerCase().includes(searchYmSt.toLowerCase()) ||
        item.stok_adi.toLowerCase().includes(searchYmSt.toLowerCase()) ||
        item.cap.toString().includes(searchYmSt.toLowerCase()) ||
        item.filmasin.toString().includes(searchYmSt.toLowerCase())
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
      const { error } = await supabase
        .from('gal_cost_cal_mm_gt_ym_st')
        .delete()
        .eq('mm_gt_id', mmGtData.id)
        .eq('ym_st_id', ymStId);

      if (error) throw error;

      // Listeden kaldır
      setSelectedYmSt(prev => prev.filter(item => item.id !== ymStId));
      toast.success('YM ST başarıyla kaldırıldı');
    } catch (error) {
      console.error('YM ST kaldırılırken hata oluştu:', error);
      setError('YM ST kaldırılırken bir hata oluştu');
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
    <Container fluid className="galvanizli-tel-container">
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage('')} dismissible>
          {successMessage}
        </Alert>
      )}
      
      <Card className="mb-4">
        <Card.Header className="bg-secondary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Galvanizli Tel Hesaplama Aracı</h5>
            <div>
              <Button 
                variant="light" 
                size="sm" 
                className="mr-2"
                onClick={() => setShowSearchModal(true)}
              >
                Ürün Ara
              </Button>
              <Button 
                variant="light" 
                size="sm"
                onClick={() => {
                  setMmGtData(null);
                  setYmGtData(null);
                  setSelectedYmSt([]);
                  setIsEditMode(false);
                  setDataExist(false);
                }}
              >
                Yeni Ürün
              </Button>
            </div>
          </div>
        </Card.Header>
        
        <Card.Body>
          <Tabs 
            selectedIndex={activeTab} 
            onSelect={index => setActiveTab(index)}
            className="custom-tabs"
          >
            <TabList>
              <Tab>MM GT Tanımla</Tab>
              <Tab>YM ST Seç</Tab>
              <Tab>Excel Oluştur</Tab>
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
                    <Row>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Çap (mm)</FormLabel>
                          <Field
                            name="cap"
                            as={FormControl}
                            type="number"
                            step="0.01"
                            placeholder="2,50"
                          />
                          <ErrorMessage name="cap" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Kaplama Türü</FormLabel>
                          <Field
                            name="kod_2"
                            as="select"
                            className="form-control"
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
                          <ErrorMessage name="kod_2" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Kaplama (gr/m²)</FormLabel>
                          <Field
                            name="kaplama"
                            as={FormControl}
                            type="number"
                            disabled={values.kod_2 === 'PAD'}
                            placeholder="120"
                          />
                          <ErrorMessage name="kaplama" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Min Mukavemet (MPa)</FormLabel>
                          <Field
                            name="min_mukavemet"
                            as={FormControl}
                            type="number"
                            placeholder="400"
                          />
                          <ErrorMessage name="min_mukavemet" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Max Mukavemet (MPa)</FormLabel>
                          <Field
                            name="max_mukavemet"
                            as={FormControl}
                            type="number"
                            placeholder="500"
                          />
                          <ErrorMessage name="max_mukavemet" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Tolerans (+) (mm)</FormLabel>
                          <Field
                            name="tolerans_plus"
                            as={FormControl}
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                          />
                          <ErrorMessage name="tolerans_plus" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Tolerans (-) (mm)</FormLabel>
                          <Field
                            name="tolerans_minus"
                            as={FormControl}
                            type="number"
                            step="0.01"
                            placeholder="0,06"
                          />
                          <ErrorMessage name="tolerans_minus" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>İç Çap (cm)</FormLabel>
                          <Field
                            name="ic_cap"
                            as="select"
                            className="form-control"
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
                          <ErrorMessage name="ic_cap" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Dış Çap (cm)</FormLabel>
                          <Field
                            name="dis_cap"
                            as={FormControl}
                            type="number"
                            readOnly
                          />
                          <ErrorMessage name="dis_cap" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Ağırlık (kg)</FormLabel>
                          <Field
                            name="kg"
                            as={FormControl}
                            type="number"
                            placeholder="750"
                          />
                          <ErrorMessage name="kg" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Sarım Yönü</FormLabel>
                          <Field
                            name="unwinding"
                            as="select"
                            className="form-control"
                          >
                            <option value="">Anti-Clockwise (Varsayılan)</option>
                            <option value="Clockwise">Clockwise</option>
                          </Field>
                          <ErrorMessage name="unwinding" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Shrink</FormLabel>
                          <Field
                            name="shrink"
                            as="select"
                            className="form-control"
                          >
                            <option value="evet">Evet</option>
                            <option value="hayır">Hayır</option>
                          </Field>
                          <ErrorMessage name="shrink" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>CAST KONT (İsteğe Bağlı)</FormLabel>
                          <Field
                            name="cast_kont"
                            as={FormControl}
                            placeholder="CAST KONT değeri"
                          />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>HELIX KONT (İsteğe Bağlı)</FormLabel>
                          <Field
                            name="helix_kont"
                            as={FormControl}
                            placeholder="HELIX KONT değeri"
                          />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>ELONGATION (İsteğe Bağlı)</FormLabel>
                          <Field
                            name="elongation"
                            as={FormControl}
                            placeholder="ELONGATION değeri"
                          />
                        </FormGroup>
                      </Col>
                    </Row>
                    
                    <div className="d-flex justify-content-between mt-4">
                      <div>
                        <span className="text-muted">Ürün Kodu: </span>
                        <strong>{values.kod_2 && values.cap ? `GT.${values.kod_2}.${values.cap.toString().padStart(4, '0')}.${sequence.toString().padStart(2, '0')}` : 'Oluşturulacak'}</strong>
                      </div>
                      
                      <Button
                        type="submit"
                        variant="danger"
                        disabled={isSubmitting || loading}
                      >
                        {isSubmitting || loading ? (
                          <>
                            <Spinner animation="border" size="sm" className="mr-2" />
                            Kaydediliyor...
                          </>
                        ) : isEditMode ? 'Güncelle' : 'Oluştur'}
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </TabPanel>
            
            {/* YM ST Seçme Sekmesi */}
            <TabPanel>
              {!mmGtData ? (
                <Alert variant="warning">
                  Önce MM GT kaydı oluşturmalısınız. Lütfen önceki sekmeye dönün.
                </Alert>
              ) : (
                <>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>Seçilen Hammaddeler (YM ST)</h5>
                    <Button
                      variant="danger"
                      onClick={() => setShowYmStModal(true)}
                    >
                      Hammadde Ekle
                    </Button>
                  </div>
                  
                  {selectedYmSt.length === 0 ? (
                    <Alert variant="info">
                      Henüz hammadde seçilmemiş. En az bir YM ST kaydı eklemelisiniz.
                    </Alert>
                  ) : (
                    <Table striped bordered hover>
                      <thead>
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
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleRemoveYmSt(item.id)}
                              >
                                Kaldır
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                  
                  <div className="d-flex justify-content-between mt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setActiveTab(0)}
                    >
                      Geri
                    </Button>
                    
                    <Button
                      variant="danger"
                      onClick={() => setActiveTab(2)}
                      disabled={selectedYmSt.length === 0}
                    >
                      İleri
                    </Button>
                  </div>
                </>
              )}
            </TabPanel>
            
            {/* Excel Oluşturma Sekmesi */}
            <TabPanel>
              {!mmGtData ? (
                <Alert variant="warning">
                  Önce MM GT kaydı oluşturmalısınız. Lütfen ilk sekmeye dönün.
                </Alert>
              ) : selectedYmSt.length === 0 ? (
                <Alert variant="warning">
                  En az bir YM ST kaydı eklemelisiniz. Lütfen önceki sekmeye dönün.
                </Alert>
              ) : (
                <>
                  <Alert variant="info">
                    Excel dosyaları oluşturmaya hazırsınız. Aşağıdaki Excel oluştur butonuna tıklayarak iki ayrı Excel dosyası oluşturabilirsiniz:
                    <ul>
                      <li><strong>Stok Kartı Excel</strong>: MM GT, YM GT ve YM ST sayfalarını içerir.</li>
                      <li><strong>Reçete Excel</strong>: MM GT REÇETE, YM GT REÇETE ve YM ST REÇETE sayfalarını içerir.</li>
                    </ul>
                  </Alert>
                  
                  <div className="d-flex justify-content-between mt-4">
                    <Button
                      variant="secondary"
                      onClick={() => setActiveTab(1)}
                    >
                      Geri
                    </Button>
                    
                    <Button
                      variant="danger"
                      onClick={handleGenerateExcel}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="mr-2" />
                          Excel Oluşturuluyor...
                        </>
                      ) : 'Excel Oluştur'}
                    </Button>
                  </div>
                </>
              )}
            </TabPanel>
          </Tabs>
        </Card.Body>
      </Card>
      
      {/* YM ST Ekleme/Seçme Modalı */}
      <Modal
        show={showYmStModal}
        onHide={() => {
          setShowYmStModal(false);
          setSelectedYmStToAdd(null);
          setSearchYmSt("");
        }}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>YM ST Ekle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultIndex={0}>
            <TabList>
              <Tab>Mevcut YM ST Seç</Tab>
              <Tab>Yeni YM ST Oluştur</Tab>
            </TabList>
            
            <TabPanel>
              <div className="mb-3">
                <FormControl
                  type="text"
                  placeholder="Stok kodu, stok adı veya çap ile ara..."
                  value={searchYmSt}
                  onChange={(e) => setSearchYmSt(e.target.value)}
                />
              </div>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <Table striped bordered hover>
                  <thead>
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
                            <Button
                              variant={selectedYmStToAdd?.id === item.id ? "success" : "outline-danger"}
                              size="sm"
                              disabled={isAlreadySelected}
                              onClick={() => handleSelectYmSt(item)}
                            >
                              {isAlreadySelected ? 'Seçildi' : (selectedYmStToAdd?.id === item.id ? 'Seçildi' : 'Seç')}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {filteredYmStList.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center">
                          Arama kriterlerine uygun YM ST bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
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
                    <Row>
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Çap (mm)</FormLabel>
                          <Field
                            name="cap"
                            as={FormControl}
                            type="number"
                            step="0.01"
                            placeholder="Çap (mm)"
                          />
                          <ErrorMessage name="cap" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Filmaşin Çapı (0550-1000)</FormLabel>
                          <Field
                            name="filmasin"
                            as={FormControl}
                            type="number"
                            placeholder="Filmaşin çapı (örn: 600)"
                          />
                          <ErrorMessage name="filmasin" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                      
                      <Col md={4}>
                        <FormGroup className="mb-3">
                          <FormLabel>Kalite</FormLabel>
                          <Field
                            name="quality"
                            as="select"
                            className="form-control"
                          >
                            <option value="1006">1006</option>
                            <option value="1008">1008</option>
                            <option value="1010">1010</option>
                          </Field>
                          <ErrorMessage name="quality" component="div" className="text-danger" />
                        </FormGroup>
                      </Col>
                    </Row>
                    
                    <div className="d-flex justify-content-end mt-4">
                      <Button
                        type="submit"
                        variant="danger"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Spinner animation="border" size="sm" className="mr-2" />
                            Kaydediliyor...
                          </>
                        ) : 'Oluştur ve Ekle'}
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </TabPanel>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowYmStModal(false);
            setSelectedYmStToAdd(null);
            setSearchYmSt("");
          }}>
            İptal
          </Button>
          <Button 
            variant="danger" 
            onClick={handleAddYmSt}
            disabled={!selectedYmStToAdd}
          >
            Seçileni Ekle
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Ürün Arama Modalı */}
      <Modal
        show={showSearchModal}
        onHide={() => setShowSearchModal(false)}
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
                <FormGroup className="mb-3">
                  <FormLabel>Stok Kodu</FormLabel>
                  <Field
                    name="stok_kodu"
                    as={FormControl}
                    placeholder="Stok kodu"
                  />
                </FormGroup>
                
                <FormGroup className="mb-3">
                  <FormLabel>Çap (mm)</FormLabel>
                  <Field
                    name="cap"
                    as={FormControl}
                    type="number"
                    step="0.01"
                    placeholder="Çap (mm)"
                  />
                </FormGroup>
                
                <FormGroup className="mb-3">
                  <FormLabel>Kaplama Türü</FormLabel>
                  <Field
                    name="kod_2"
                    as="select"
                    className="form-control"
                  >
                    <option value="">Seçiniz</option>
                    <option value="NIT">NIT</option>
                    <option value="PAD">PAD</option>
                  </Field>
                </FormGroup>
                
                <FormGroup className="mb-3">
                  <FormLabel>Ağırlık (kg)</FormLabel>
                  <Field
                    name="kg"
                    as={FormControl}
                    type="number"
                    placeholder="Ağırlık (kg)"
                  />
                </FormGroup>
                
                <div className="d-flex justify-content-end mt-4">
                  <Button
                    type="submit"
                    variant="danger"
                    disabled={isSubmitting || loading}
                  >
                    {isSubmitting || loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="mr-2" />
                        Aranıyor...
                      </>
                    ) : 'Ara'}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default GalvanizliTelComponent;
