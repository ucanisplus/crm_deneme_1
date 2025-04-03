import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { API_URLS } from '@/config/api-config';
import { 
  Button, 
  Table, 
  Checkbox, 
  Input, 
  Spinner, 
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from '@/components/ui';
import { 
  AlertCircle,
  Save, 
  RefreshCw, 
  FileSpreadsheet, 
  Calculator,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

const PanelCitHesaplama = () => {
  // Yükleme göstergeleri için state
  const [loading, setLoading] = useState({
    panelList: false,
    variables: false,
    calculation: false,
    saving: false
  });

  // Seçili paneller için state
  const [selectedPanels, setSelectedPanels] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Panel listesi ve filtrelenmiş paneller için state
  const [panelList, setPanelList] = useState([]);
  const [filteredPanels, setFilteredPanels] = useState([]);
  
  // Maliyet hesaplama sonuçları için state
  const [costResults, setCostResults] = useState([]);
  const [filteredCostResults, setFilteredCostResults] = useState([]);

  // Özel panel girişleri için state
  const [customPanelData, setCustomPanelData] = useState({
    panel_type: 'Single',
    panel_yuksekligi: 100,
    panel_genisligi: 250,
    dikey_tel_capi: 4,
    yatay_tel_capi: 4,
    renk: 0,
    adet: 1,
    dikey_goz_araligi: 5,
    yatay_goz_araligi: 20,
  });

  // Özel panel hesaplamaları için state
  const [customPanelCalculations, setCustomPanelCalculations] = useState({
    adet_m2: 0,
    bukum_sayisi: 0,
    bukumdeki_cubuk_sayisi: 0,
    dikey_cubuk_adet: 0,
    yatay_cubuk_adet: 0,
    adet_agirligi: 0,
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
    stok_kodu: '', // Stok Kodu Formülü Buraya Gelecek
  });

  // Filtreler için state
  const [filters, setFilters] = useState({
    panel_type: '',
    min_height: '',
    max_height: '',
    min_width: '',
    max_width: '',
    dikey_tel_capi: '',
    yatay_tel_capi: '',
    searchTerm: ''
  });

  // Maliyet sonuçları için filtre state'i
  const [costFilters, setCostFilters] = useState({
    panel_type: '',
    min_height: '',
    max_height: '',
    min_width: '',
    max_width: '',
    dikey_tel_capi: '',
    yatay_tel_capi: '',
    searchTerm: ''
  });

  // Değişkenler için state
  const [variables, setVariables] = useState({
    // Panel Çit Değişkenler
    panel_kesme_isci_sayisi_ad: 0,
    panel_kaynak_isci_sayisi_ad: 0,
    panel_boya_isci_sayisi_ad: 0,
    panel_vardiya_sayisi_ad: 0,
    panel_aylik_calisma_gunu_ad: 0,
    panel_vardiya_suresi_saat_ad: 0,
    panel_kesme_kaynak_hat_sayisi_ad: 0,
    panel_boya_hat_sayisi_ad: 0,
    panel_kesme_kaynak_verimlilik_ad: 0,
    panel_boya_verimlilik_ad: 0,
    panel_aylik_kesme_kaynak_kapasite_ad: 0,
    panel_aylik_boya_kapasite_ad: 0,
    panel_usd_satis_fiyat_carpan_ad: 0,
    panel_eur_satis_fiyat_carpan_ad: 0,
    panel_try_satis_fiyat_carpan_ad: 0,
    
    // Profil Değişkenler
    profil_40x60x1_5_usd_kg_ad: 0,
    profil_40x60x2_usd_kg_ad: 0,
    profil_50x50x1_5_usd_kg_ad: 0,
    profil_25x25x1_5_usd_kg_ad: 0,
    profil_30x30x1_5_usd_kg_ad: 0,
    profil_menteşe_1_kg_tel_usd_kg_ad: 0,
    
    // Statik Değişkenler
    celik_tel_usd_kg_ad: 0,
    panel_boy_fire_ad: 0,
    panel_en_fire_ad: 0,
    kaynak_fire_ad: 0,
    panel_boya_usd_kg_ad: 0,
    ortalama_isci_maasi_usd_ad: 0,
    elektrik_tuketim_kwh_usd_ad: 0,
    dogalgaz_standart_m3_saat_usd_ad: 0,
    su_ton_usd_ad: 0,
    kesme_hatti_elektrik_sarfiyat_kwh_ad: 0,
    kaynak_hatti_elektrik_sarfiyat_kwh_ad: 0,
    kaynak_hatti_su_sarfiyat_ton_ad: 0,
    boya_hatti_elektrik_sarfiyat_kwh_ad: 0,
    boya_hatti_dogalgaz_sarfiyat_m3_ad: 0,
    kira_ay_usd_ad: 0,
    diger_maliyetler_ay_usd_ad: 0,
    finansman_gideri_ay_usd_ad: 0,
    amortismanlar_ay_usd_ad: 0,
    fabrika_alani_m2_ad: 0,
    
    // Genel Değişkenler
    palet_usd_adet_ad: 0,
    set_40x60_panel_direk_usd_adet_ad: 0,
    set_40x60_panel_ayak_usd_adet_ad: 0,
    set_40x60_panel_kelepce_usd_adet_ad: 0,
    set_40x60_panel_kapak_usd_adet_ad: 0,
    set_40x60_panel_civata_usd_adet_ad: 0,
    set_50x50_panel_direk_usd_adet_ad: 0,
    set_50x50_panel_ayak_usd_adet_ad: 0,
    set_50x50_panel_kelepce_usd_adet_ad: 0,
    set_50x50_panel_kapak_usd_adet_ad: 0,
    set_50x50_panel_civata_usd_adet_ad: 0,
    
    // Döviz Kurları
    usd_to_try_ad: 0,
    eur_to_try_ad: 0,
    usd_to_eur_ad: 0,
  });

  // Veri çekme fonksiyonları
  const fetchPanelList = useCallback(async () => {
    setLoading(prev => ({ ...prev, panelList: true }));
    try {
      const response = await axios.get(API_URLS.panelList);
      setPanelList(response.data);
      setFilteredPanels(response.data);
    } catch (error) {
      console.error('Panel listesi yüklenirken hata oluştu:', error);
      toast.error('Panel listesi yüklenemedi');
    } finally {
      setLoading(prev => ({ ...prev, panelList: false }));
    }
  }, []);

  const fetchVariables = useCallback(async () => {
    setLoading(prev => ({ ...prev, variables: true }));
    try {
      // Tüm değişken türlerini paralel olarak çek
      const [
        panelCitDegiskenlerResponse, 
        profilDegiskenlerResponse,
        statikDegiskenlerResponse,
        genelDegiskenlerResponse,
        currencyResponse
      ] = await Promise.all([
        axios.get(API_URLS.panelCitDegiskenler),
        axios.get(API_URLS.profilDegiskenler),
        axios.get(API_URLS.statikDegiskenler),
        axios.get(API_URLS.genelDegiskenler),
        axios.get(API_URLS.currency)
      ]);

      // Yanıtları işle
      const panelCitVars = panelCitDegiskenlerResponse.data.length > 0 ? panelCitDegiskenlerResponse.data[0] : {};
      const profilVars = profilDegiskenlerResponse.data.length > 0 ? profilDegiskenlerResponse.data[0] : {};
      const statikVars = statikDegiskenlerResponse.data.length > 0 ? statikDegiskenlerResponse.data[0] : {};
      const genelVars = genelDegiskenlerResponse.data.length > 0 ? genelDegiskenlerResponse.data[0] : {};
      const currencyVars = currencyResponse.data.length > 0 ? currencyResponse.data[0] : {};

      // State'i tüm değişkenlerle güncelle
      setVariables({
        // Panel Çit Değişkenler
        panel_kesme_isci_sayisi_ad: parseFloat(panelCitVars.panel_kesme_isci_sayisi_ad || 0),
        panel_kaynak_isci_sayisi_ad: parseFloat(panelCitVars.panel_kaynak_isci_sayisi_ad || 0),
        panel_boya_isci_sayisi_ad: parseFloat(panelCitVars.panel_boya_isci_sayisi_ad || 0),
        panel_vardiya_sayisi_ad: parseFloat(panelCitVars.panel_vardiya_sayisi_ad || 0),
        panel_aylik_calisma_gunu_ad: parseFloat(panelCitVars.panel_aylik_calisma_gunu_ad || 0),
        panel_vardiya_suresi_saat_ad: parseFloat(panelCitVars.panel_vardiya_suresi_saat_ad || 0),
        panel_kesme_kaynak_hat_sayisi_ad: parseFloat(panelCitVars.panel_kesme_kaynak_hat_sayisi_ad || 0),
        panel_boya_hat_sayisi_ad: parseFloat(panelCitVars.panel_boya_hat_sayisi_ad || 0),
        panel_kesme_kaynak_verimlilik_ad: parseFloat(panelCitVars.panel_kesme_kaynak_verimlilik_ad || 0) / 100,
        panel_boya_verimlilik_ad: parseFloat(panelCitVars.panel_boya_verimlilik_ad || 0) / 100,
        panel_aylik_kesme_kaynak_kapasite_ad: parseFloat(panelCitVars.panel_aylik_kesme_kaynak_kapasite_ad || 0),
        panel_aylik_boya_kapasite_ad: parseFloat(panelCitVars.panel_aylik_boya_kapasite_ad || 0),
        panel_usd_satis_fiyat_carpan_ad: parseFloat(panelCitVars.panel_usd_satis_fiyat_carpan_ad || 0),
        panel_eur_satis_fiyat_carpan_ad: parseFloat(panelCitVars.panel_eur_satis_fiyat_carpan_ad || 0),
        panel_try_satis_fiyat_carpan_ad: parseFloat(panelCitVars.panel_try_satis_fiyat_carpan_ad || 0),
        
        // Profil Değişkenler
        profil_40x60x1_5_usd_kg_ad: parseFloat(profilVars.profil_40x60x1_5_usd_kg_ad || 0),
        profil_40x60x2_usd_kg_ad: parseFloat(profilVars.profil_40x60x2_usd_kg_ad || 0),
        profil_50x50x1_5_usd_kg_ad: parseFloat(profilVars.profil_50x50x1_5_usd_kg_ad || 0),
        profil_25x25x1_5_usd_kg_ad: parseFloat(profilVars.profil_25x25x1_5_usd_kg_ad || 0),
        profil_30x30x1_5_usd_kg_ad: parseFloat(profilVars.profil_30x30x1_5_usd_kg_ad || 0),
        profil_menteşe_1_kg_tel_usd_kg_ad: parseFloat(profilVars.profil_menteşe_1_kg_tel_usd_kg_ad || 0),
        
        // Statik Değişkenler
        celik_tel_usd_kg_ad: parseFloat(statikVars.celik_tel_usd_kg_ad || 0),
        panel_boy_fire_ad: parseFloat(statikVars.panel_boy_fire_ad || 0) / 100,
        panel_en_fire_ad: parseFloat(statikVars.panel_en_fire_ad || 0) / 100,
        kaynak_fire_ad: parseFloat(statikVars.kaynak_fire_ad || 0) / 100,
        panel_boya_usd_kg_ad: parseFloat(statikVars.panel_boya_usd_kg_ad || 0),
        ortalama_isci_maasi_usd_ad: parseFloat(statikVars.ortalama_isci_maasi_usd_ad || 0),
        elektrik_tuketim_kwh_usd_ad: parseFloat(statikVars.elektrik_tuketim_kwh_usd_ad || 0),
        dogalgaz_standart_m3_saat_usd_ad: parseFloat(statikVars.dogalgaz_standart_m3_saat_usd_ad || 0),
        su_ton_usd_ad: parseFloat(statikVars.su_ton_usd_ad || 0),
        kesme_hatti_elektrik_sarfiyat_kwh_ad: parseFloat(statikVars.kesme_hatti_elektrik_sarfiyat_kwh_ad || 0),
        kaynak_hatti_elektrik_sarfiyat_kwh_ad: parseFloat(statikVars.kaynak_hatti_elektrik_sarfiyat_kwh_ad || 0),
        kaynak_hatti_su_sarfiyat_ton_ad: parseFloat(statikVars.kaynak_hatti_su_sarfiyat_ton_ad || 0),
        boya_hatti_elektrik_sarfiyat_kwh_ad: parseFloat(statikVars.boya_hatti_elektrik_sarfiyat_kwh_ad || 0),
        boya_hatti_dogalgaz_sarfiyat_m3_ad: parseFloat(statikVars.boya_hatti_dogalgaz_sarfiyat_m3_ad || 0),
        kira_ay_usd_ad: parseFloat(statikVars.kira_ay_usd_ad || 0),
        diger_maliyetler_ay_usd_ad: parseFloat(statikVars.diger_maliyetler_ay_usd_ad || 0),
        finansman_gideri_ay_usd_ad: parseFloat(statikVars.finansman_gideri_ay_usd_ad || 0),
        amortismanlar_ay_usd_ad: parseFloat(statikVars.amortismanlar_ay_usd_ad || 0),
        fabrika_alani_m2_ad: parseFloat(statikVars.fabrika_alani_m2_ad || 0),
        
        // Genel Değişkenler
        palet_usd_adet_ad: parseFloat(genelVars.palet_usd_adet_ad || 0),
        set_40x60_panel_direk_usd_adet_ad: parseFloat(genelVars.set_40x60_panel_direk_usd_adet_ad || 0),
        set_40x60_panel_ayak_usd_adet_ad: parseFloat(genelVars.set_40x60_panel_ayak_usd_adet_ad || 0),
        set_40x60_panel_kelepce_usd_adet_ad: parseFloat(genelVars.set_40x60_panel_kelepce_usd_adet_ad || 0),
        set_40x60_panel_kapak_usd_adet_ad: parseFloat(genelVars.set_40x60_panel_kapak_usd_adet_ad || 0),
        set_40x60_panel_civata_usd_adet_ad: parseFloat(genelVars.set_40x60_panel_civata_usd_adet_ad || 0),
        set_50x50_panel_direk_usd_adet_ad: parseFloat(genelVars.set_50x50_panel_direk_usd_adet_ad || 0),
        set_50x50_panel_ayak_usd_adet_ad: parseFloat(genelVars.set_50x50_panel_ayak_usd_adet_ad || 0),
        set_50x50_panel_kelepce_usd_adet_ad: parseFloat(genelVars.set_50x50_panel_kelepce_usd_adet_ad || 0),
        set_50x50_panel_kapak_usd_adet_ad: parseFloat(genelVars.set_50x50_panel_kapak_usd_adet_ad || 0),
        set_50x50_panel_civata_usd_adet_ad: parseFloat(genelVars.set_50x50_panel_civata_usd_adet_ad || 0),
        
        // Döviz Kurları
        usd_to_try_ad: parseFloat(currencyVars.usd_to_try_ad || 0),
        eur_to_try_ad: parseFloat(currencyVars.eur_to_try_ad || 0),
        usd_to_eur_ad: parseFloat(currencyVars.usd_to_eur_ad || 0),
      });
      
      // Eğer kapasite değerleri yoksa, hesapla
      if (!panelCitVars.panel_aylik_kesme_kaynak_kapasite_ad || !panelCitVars.panel_aylik_boya_kapasite_ad) {
        calculateCapacities();
      }
    } catch (error) {
      console.error('Değişkenler yüklenirken hata oluştu:', error);
      toast.error('Değişkenler yüklenemedi');
    } finally {
      setLoading(prev => ({ ...prev, variables: false }));
    }
  }, []);

  const fetchCostResults = useCallback(async () => {
    try {
      const response = await axios.get(API_URLS.maliyetListesi);
      
      // Maliyet sonuçlarını sırala (manual_order veya id'ye göre)
      const sortedResults = response.data.sort((a, b) => {
        if (a.manual_order !== undefined && b.manual_order !== undefined) {
          return a.manual_order - b.manual_order;
        }
        return a.id - b.id;
      });
      
      setCostResults(sortedResults);
      setFilteredCostResults(sortedResults);
    } catch (error) {
      console.error('Maliyet sonuçları yüklenirken hata oluştu:', error);
      toast.error('Maliyet sonuçları yüklenemedi');
    }
  }, []);

  // Kapasite hesaplama
  const calculateCapacities = useCallback(() => {
    // Panel kesme/kaynak kapasitesi hesaplama
    const kesmePanelKapasite = 
      variables.panel_vardiya_sayisi_ad * 
      variables.panel_aylik_calisma_gunu_ad * 
      variables.panel_vardiya_suresi_saat_ad * 
      variables.panel_kesme_kaynak_hat_sayisi_ad * 
      variables.panel_kesme_kaynak_verimlilik_ad;
    
    // Panel boya kapasitesi hesaplama
    const boyaPanelKapasite = 
      variables.panel_vardiya_sayisi_ad * 
      variables.panel_aylik_calisma_gunu_ad * 
      variables.panel_vardiya_suresi_saat_ad * 
      variables.panel_boya_hat_sayisi_ad * 
      variables.panel_boya_verimlilik_ad;
    
    // State'i güncelle
    setVariables(prev => ({
      ...prev,
      panel_aylik_kesme_kaynak_kapasite_ad: parseFloat(kesmePanelKapasite.toFixed(2)),
      panel_aylik_boya_kapasite_ad: parseFloat(boyaPanelKapasite.toFixed(2))
    }));
    
    return { kesmePanelKapasite, boyaPanelKapasite };
  }, [variables]);

  // Değişkenleri kaydetme fonksiyonu
  const saveVariables = async (variableType) => {
    setLoading(prev => ({ ...prev, saving: true }));
    
    try {
      let endpoint;
      let data = {};
      
      // Hangi değişken türünün kaydedileceğini belirle
      switch(variableType) {
        case 'panelCit':
          endpoint = API_URLS.panelCitDegiskenler;
          data = {
            panel_kesme_isci_sayisi_ad: variables.panel_kesme_isci_sayisi_ad,
            panel_kaynak_isci_sayisi_ad: variables.panel_kaynak_isci_sayisi_ad,
            panel_boya_isci_sayisi_ad: variables.panel_boya_isci_sayisi_ad,
            panel_vardiya_sayisi_ad: variables.panel_vardiya_sayisi_ad,
            panel_aylik_calisma_gunu_ad: variables.panel_aylik_calisma_gunu_ad,
            panel_vardiya_suresi_saat_ad: variables.panel_vardiya_suresi_saat_ad,
            panel_kesme_kaynak_hat_sayisi_ad: variables.panel_kesme_kaynak_hat_sayisi_ad,
            panel_boya_hat_sayisi_ad: variables.panel_boya_hat_sayisi_ad,
            panel_kesme_kaynak_verimlilik_ad: variables.panel_kesme_kaynak_verimlilik_ad * 100, // Veritabanında yüzde olarak saklanıyor
            panel_boya_verimlilik_ad: variables.panel_boya_verimlilik_ad * 100, // Veritabanında yüzde olarak saklanıyor
            panel_aylik_kesme_kaynak_kapasite_ad: variables.panel_aylik_kesme_kaynak_kapasite_ad,
            panel_aylik_boya_kapasite_ad: variables.panel_aylik_boya_kapasite_ad,
            panel_usd_satis_fiyat_carpan_ad: variables.panel_usd_satis_fiyat_carpan_ad,
            panel_eur_satis_fiyat_carpan_ad: variables.panel_eur_satis_fiyat_carpan_ad,
            panel_try_satis_fiyat_carpan_ad: variables.panel_try_satis_fiyat_carpan_ad,
          };
          break;
        case 'profil':
          endpoint = API_URLS.profilDegiskenler;
          data = {
            profil_40x60x1_5_usd_kg_ad: variables.profil_40x60x1_5_usd_kg_ad,
            profil_40x60x2_usd_kg_ad: variables.profil_40x60x2_usd_kg_ad,
            profil_50x50x1_5_usd_kg_ad: variables.profil_50x50x1_5_usd_kg_ad,
            profil_25x25x1_5_usd_kg_ad: variables.profil_25x25x1_5_usd_kg_ad,
            profil_30x30x1_5_usd_kg_ad: variables.profil_30x30x1_5_usd_kg_ad,
            profil_menteşe_1_kg_tel_usd_kg_ad: variables.profil_menteşe_1_kg_tel_usd_kg_ad,
          };
          break;
        case 'statik':
          endpoint = API_URLS.statikDegiskenler;
          data = {
            celik_tel_usd_kg_ad: variables.celik_tel_usd_kg_ad,
            panel_boy_fire_ad: variables.panel_boy_fire_ad * 100, // Veritabanında yüzde olarak saklanıyor
            panel_en_fire_ad: variables.panel_en_fire_ad * 100, // Veritabanında yüzde olarak saklanıyor
            kaynak_fire_ad: variables.kaynak_fire_ad * 100, // Veritabanında yüzde olarak saklanıyor
            panel_boya_usd_kg_ad: variables.panel_boya_usd_kg_ad,
            ortalama_isci_maasi_usd_ad: variables.ortalama_isci_maasi_usd_ad,
            elektrik_tuketim_kwh_usd_ad: variables.elektrik_tuketim_kwh_usd_ad,
            dogalgaz_standart_m3_saat_usd_ad: variables.dogalgaz_standart_m3_saat_usd_ad,
            su_ton_usd_ad: variables.su_ton_usd_ad,
            kesme_hatti_elektrik_sarfiyat_kwh_ad: variables.kesme_hatti_elektrik_sarfiyat_kwh_ad,
            kaynak_hatti_elektrik_sarfiyat_kwh_ad: variables.kaynak_hatti_elektrik_sarfiyat_kwh_ad,
            kaynak_hatti_su_sarfiyat_ton_ad: variables.kaynak_hatti_su_sarfiyat_ton_ad,
            boya_hatti_elektrik_sarfiyat_kwh_ad: variables.boya_hatti_elektrik_sarfiyat_kwh_ad,
            boya_hatti_dogalgaz_sarfiyat_m3_ad: variables.boya_hatti_dogalgaz_sarfiyat_m3_ad,
            kira_ay_usd_ad: variables.kira_ay_usd_ad,
            diger_maliyetler_ay_usd_ad: variables.diger_maliyetler_ay_usd_ad,
            finansman_gideri_ay_usd_ad: variables.finansman_gideri_ay_usd_ad,
            amortismanlar_ay_usd_ad: variables.amortismanlar_ay_usd_ad,
            fabrika_alani_m2_ad: variables.fabrika_alani_m2_ad,
          };
          break;
        case 'genel':
          endpoint = API_URLS.genelDegiskenler;
          data = {
            palet_usd_adet_ad: variables.palet_usd_adet_ad,
            set_40x60_panel_direk_usd_adet_ad: variables.set_40x60_panel_direk_usd_adet_ad,
            set_40x60_panel_ayak_usd_adet_ad: variables.set_40x60_panel_ayak_usd_adet_ad,
            set_40x60_panel_kelepce_usd_adet_ad: variables.set_40x60_panel_kelepce_usd_adet_ad,
            set_40x60_panel_kapak_usd_adet_ad: variables.set_40x60_panel_kapak_usd_adet_ad,
            set_40x60_panel_civata_usd_adet_ad: variables.set_40x60_panel_civata_usd_adet_ad,
            set_50x50_panel_direk_usd_adet_ad: variables.set_50x50_panel_direk_usd_adet_ad,
            set_50x50_panel_ayak_usd_adet_ad: variables.set_50x50_panel_ayak_usd_adet_ad,
            set_50x50_panel_kelepce_usd_adet_ad: variables.set_50x50_panel_kelepce_usd_adet_ad,
            set_50x50_panel_kapak_usd_adet_ad: variables.set_50x50_panel_kapak_usd_adet_ad,
            set_50x50_panel_civata_usd_adet_ad: variables.set_50x50_panel_civata_usd_adet_ad,
          };
          break;
        case 'currency':
          endpoint = API_URLS.currency;
          data = {
            usd_to_try_ad: variables.usd_to_try_ad,
            eur_to_try_ad: variables.eur_to_try_ad,
            usd_to_eur_ad: variables.usd_to_eur_ad,
          };
          break;
        default:
          throw new Error('Geçersiz değişken türü');
      }
      
      // Her tablodaki ilk kaydı güncelle veya yeni kayıt oluştur
      const response = await axios.get(endpoint);
      
      if (response.data && response.data.length > 0) {
        // Mevcut kaydı güncelle
        const id = response.data[0].id;
        await axios.put(`${endpoint}/${id}`, data);
        toast.success(`${variableType} değişkenleri başarıyla güncellendi`);
      } else {
        // Yeni kayıt oluştur
        await axios.post(endpoint, data);
        toast.success(`${variableType} değişkenleri başarıyla oluşturuldu`);
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      toast.error(`${variableType} değişkenleri kaydedilemedi: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  };

  // Panel filtreleme fonksiyonu
  const applyFilters = useCallback(() => {
    let result = [...panelList];
    
    // Panel tipi filtreleme
    if (filters.panel_type) {
      result = result.filter(p => p.panel_cinsi === filters.panel_type);
    }
    
    // Yükseklik filtreleme
    if (filters.min_height) {
      result = result.filter(p => p.panel_yuksekligi >= parseInt(filters.min_height));
    }
    if (filters.max_height) {
      result = result.filter(p => p.panel_yuksekligi <= parseInt(filters.max_height));
    }
    
    // Genişlik filtreleme
    if (filters.min_width) {
      result = result.filter(p => p.panel_genisligi >= parseInt(filters.min_width));
    }
    if (filters.max_width) {
      result = result.filter(p => p.panel_genisligi <= parseInt(filters.max_width));
    }
    
    // Tel çapı filtreleme
    if (filters.dikey_tel_capi) {
      result = result.filter(p => p.dikey_tel_capi === parseFloat(filters.dikey_tel_capi));
    }
    if (filters.yatay_tel_capi) {
      result = result.filter(p => p.yatay_tel_capi === parseFloat(filters.yatay_tel_capi));
    }
    
    // Arama terimi filtreleme
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(p => 
        p.stok_kodu?.toLowerCase().includes(searchLower) || 
        p.panel_kodu?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredPanels(result);
  }, [panelList, filters]);

  // Maliyet sonuçları filtreleme fonksiyonu
  const applyCostFilters = useCallback(() => {
    let result = [...costResults];
    
    // Panel tipi filtreleme
    if (costFilters.panel_type) {
      result = result.filter(p => {
        const panelCode = p.panel_kodu || '';
        return costFilters.panel_type === 'Single' 
          ? panelCode.startsWith('SP-') 
          : panelCode.startsWith('DP-');
      });
    }
    
    // Yükseklik filtreleme
    if (costFilters.min_height || costFilters.max_height) {
      result = result.filter(p => {
        const panelCode = p.panel_kodu || '';
        const heightMatch = panelCode.match(/\d+(?=\/)/);
        if (!heightMatch) return true;
        
        const height = parseInt(heightMatch[0]);
        
        if (costFilters.min_height && height < parseInt(costFilters.min_height)) return false;
        if (costFilters.max_height && height > parseInt(costFilters.max_height)) return false;
        
        return true;
      });
    }
    
    // Genişlik filtreleme
    if (costFilters.min_width || costFilters.max_width) {
      result = result.filter(p => {
        const panelCode = p.panel_kodu || '';
        const widthMatch = panelCode.match(/\/(\d+)/);
        if (!widthMatch) return true;
        
        const width = parseInt(widthMatch[1]);
        
        if (costFilters.min_width && width < parseInt(costFilters.min_width)) return false;
        if (costFilters.max_width && width > parseInt(costFilters.max_width)) return false;
        
        return true;
      });
    }
    
    // Tel çapı filtreleme
    if (costFilters.dikey_tel_capi || costFilters.yatay_tel_capi) {
      result = result.filter(p => {
        const panelCode = p.panel_kodu || '';
        const wireDiameterMatch = panelCode.match(/-(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/);
        if (!wireDiameterMatch) return true;
        
        const verticalDiameter = parseFloat(wireDiameterMatch[1]);
        const horizontalDiameter = parseFloat(wireDiameterMatch[2]);
        
        if (costFilters.dikey_tel_capi && verticalDiameter !== parseFloat(costFilters.dikey_tel_capi)) return false;
        if (costFilters.yatay_tel_capi && horizontalDiameter !== parseFloat(costFilters.yatay_tel_capi)) return false;
        
        return true;
      });
    }
    
    // Arama terimi filtreleme
    if (costFilters.searchTerm) {
      const searchLower = costFilters.searchTerm.toLowerCase();
      result = result.filter(p => 
        p.panel_kodu?.toLowerCase().includes(searchLower) ||
        p.stok_kodu?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredCostResults(result);
  }, [costResults, costFilters]);

  // Panel seçim fonksiyonları
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedPanels([]);
    } else {
      setSelectedPanels(filteredPanels.map(panel => panel.id));
    }
    setSelectAll(!selectAll);
  };

  const togglePanelSelection = (id) => {
    if (selectedPanels.includes(id)) {
      setSelectedPanels(selectedPanels.filter(panelId => panelId !== id));
      setSelectAll(false);
    } else {
      setSelectedPanels([...selectedPanels, id]);
      // Tüm paneller seçildi mi kontrol et
      if (selectedPanels.length + 1 === filteredPanels.length) {
        setSelectAll(true);
      }
    }
  };

  // Özel panel hesaplamaları
  const calculateCustomPanel = useCallback(() => {
    const {
      panel_type,
      panel_yuksekligi,
      panel_genisligi,
      dikey_tel_capi,
      yatay_tel_capi,
      renk,
      adet,
      dikey_goz_araligi,
      yatay_goz_araligi
    } = customPanelData;

    // Adet_M² hesaplama
    const adet_m2 = (panel_yuksekligi * panel_genisligi / 10000) * adet;

    // bukum_sayisi hesaplama
    let bukum_sayisi = 0;
    if (panel_type === 'Single') {
      if (panel_yuksekligi >= 100) {
        bukum_sayisi = Math.round(panel_yuksekligi / 50);
      } else {
        bukum_sayisi = Math.floor((panel_yuksekligi / 50) + 1);
      }
    }

    // Bükümdeki Çubuk Sayısı hesaplama - Sabit bir değer atanabilir
    const bukumdeki_cubuk_sayisi = panel_type === 'Single' ? 2 : 0;

    // dikey_cubuk_adet hesaplama
    let dikey_cubuk_adet;
    if (dikey_goz_araligi < 5.5) {
      dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz_araligi) + 1;
    } else if (dikey_goz_araligi < 6) {
      dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz_araligi);
    } else {
      dikey_cubuk_adet = Math.ceil(panel_genisligi / dikey_goz_araligi) + 1;
    }

    // yatay_cubuk_adet hesaplama
    let yatay_cubuk_adet;
    if (panel_type === 'Double') {
      yatay_cubuk_adet = (((panel_yuksekligi - 3) / yatay_goz_araligi) + 1) * 2;
    } else if (panel_type === 'Single' && yatay_goz_araligi === 20) {
      yatay_cubuk_adet = ((panel_yuksekligi - 3 - (bukum_sayisi * 10)) / yatay_goz_araligi) + 1 + (bukum_sayisi * 2);
    } else if (panel_type === 'Single' && yatay_goz_araligi === 15 && panel_yuksekligi < 200) {
      yatay_cubuk_adet = Math.round((panel_yuksekligi / yatay_goz_araligi) + (bukum_sayisi * 2));
    } else if (panel_type === 'Single' && yatay_goz_araligi === 15 && panel_yuksekligi >= 200) {
      yatay_cubuk_adet = Math.ceil((panel_yuksekligi / yatay_goz_araligi) + (bukum_sayisi * 2));
    } else {
      yatay_cubuk_adet = 0; // Varsayılan değer
    }

    // adet_agirligi hesaplama
    let adet_agirligi;
    if (panel_type === 'Double') {
      adet_agirligi = ((dikey_tel_capi * dikey_tel_capi * 7.85 * Math.PI / 4000) * ((panel_yuksekligi / 100) * dikey_cubuk_adet)) + 
                    ((yatay_tel_capi * yatay_tel_capi * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk_adet);
    } else if (panel_type === 'Single' && yatay_goz_araligi === 20) {
      adet_agirligi = ((dikey_tel_capi * dikey_tel_capi * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.1)) / 100) * dikey_cubuk_adet) + 
                    ((yatay_tel_capi * yatay_tel_capi * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk_adet);
    } else if (panel_type === 'Single' && yatay_goz_araligi === 15) {
      adet_agirligi = ((dikey_tel_capi * dikey_tel_capi * 7.85 * Math.PI / 4000) * ((panel_yuksekligi + (bukum_sayisi * 2.6)) / 100) * dikey_cubuk_adet) + 
                    ((yatay_tel_capi * yatay_tel_capi * 7.85 * Math.PI / 4000) * ((panel_genisligi + 0.6) / 100) * yatay_cubuk_adet);
    } else {
      adet_agirligi = 0; // Varsayılan değer
    }

    // boya_kg hesaplama
    let boya_kg;
    if (renk === 0) {
      boya_kg = 0;
    } else if (panel_type === 'Double') {
      boya_kg = adet * 0.06;
    } else if (panel_type === 'Single') {
      boya_kg = adet * 0.03;
    } else {
      boya_kg = 0;
    }

    // boyali_hali hesaplama
    const boyali_hali = adet_agirligi + boya_kg;

    // m2_agirlik hesaplama
    const m2_agirlik = adet > 0 ? boyali_hali / adet_m2 : 0;

    // paletteki_panel_sayisi hesaplama
    let paletteki_panel_sayisi;
    if (panel_type === 'Double' && yatay_tel_capi >= 7) {
      paletteki_panel_sayisi = 25;
    } else if (panel_type === 'Double' && yatay_tel_capi < 7) {
      paletteki_panel_sayisi = 30;
    } else if (panel_type === 'Single') {
      paletteki_panel_sayisi = 100;
    } else {
      paletteki_panel_sayisi = 0;
    }

    // palet_bos_agirlik hesaplama
    let palet_bos_agirlik = 0;
    // Sabit değerlere göre palet ağırlığı hesaplaması:
    const paletAgirlikVerileri = {
      Single: {
        250: {
          63: 10.8, 70: 12, 83: 14.11, 100: 17, 103: 16.30833, 120: 19, 123: 18.04, 
          150: 22, 153: 28.305, 170: 31.45, 173: 32.005, 183: 33.855, 200: 37, 203: 37.555
        },
        200: {
          63: 8.64, 70: 9.6, 83: 11.288, 100: 13.6, 103: 13.04667, 120: 15.2, 123: 14.432, 
          150: 17.6, 153: 22.644, 170: 25.16, 173: 25.604, 183: 27.084, 200: 29.6, 203: 30.044
        }
      },
      Double: {
        250: {
          63: 12, 83: 14, 103: 18, 123: 20, 143: 23, 163: 28, 183: 30, 203: 33, 223: 36.25123
        },
        200: {
          63: 9.6, 83: 11.2, 103: 14.4, 123: 16, 143: 18.4, 163: 22.4, 183: 24, 203: 26.4, 223: 29.00099
        }
      }
    };

    // Panel yüksekliğine en yakın değeri bul
    const yukseklikler = Object.keys(paletAgirlikVerileri[panel_type]?.[panel_genisligi] || {}).map(Number);
    if (yukseklikler.length > 0) {
      let enYakinYukseklik = yukseklikler[0];
      let enKucukFark = Math.abs(panel_yuksekligi - enYakinYukseklik);
      
      for (const yukseklik of yukseklikler) {
        const fark = Math.abs(panel_yuksekligi - yukseklik);
        if (fark < enKucukFark) {
          enKucukFark = fark;
          enYakinYukseklik = yukseklik;
        }
      }
      
      palet_bos_agirlik = paletAgirlikVerileri[panel_type]?.[panel_genisligi]?.[enYakinYukseklik] || 0;
    }

    // paletsiz_toplam_agirlik hesaplama
    const paletsiz_toplam_agirlik = paletteki_panel_sayisi * adet_agirligi;

    // palet_dolu_agirlik hesaplama
    const palet_dolu_agirlik = palet_bos_agirlik + paletsiz_toplam_agirlik;

    // bos_palet_yuksekligi hesaplama
    const bos_palet_yuksekligi = panel_type === 'Double' ? 14 : panel_type === 'Single' ? 17 : 0;

    // adet_panel_yuksekligi hesaplama
    let adet_panel_yuksekligi;
    if (panel_type === 'Double') {
      if (yatay_tel_capi < 5) {
        adet_panel_yuksekligi = 0.875;
      } else if (yatay_tel_capi > 8) {
        adet_panel_yuksekligi = 1.33;
      } else {
        adet_panel_yuksekligi = 0.875 + ((yatay_tel_capi - 5) / (8 - 5)) * (1.33 - 0.875);
      }
    } else if (panel_type === 'Single') {
      if (yatay_tel_capi < 3) {
        adet_panel_yuksekligi = 0.769;
      } else if (yatay_tel_capi > 5.5) {
        adet_panel_yuksekligi = 1;
      } else {
        adet_panel_yuksekligi = 0.769 + ((yatay_tel_capi - 3) / (5.5 - 3)) * (1 - 0.769);
      }
    } else {
      adet_panel_yuksekligi = 0;
    }

    // paletsiz_toplam_panel_yuksekligi hesaplama
    const paletsiz_toplam_panel_yuksekligi = adet_panel_yuksekligi * paletteki_panel_sayisi;

    // paletli_yukseklik hesaplama
    const paletli_yukseklik = paletsiz_toplam_panel_yuksekligi + bos_palet_yuksekligi;

    // icube_code hesaplama
    let icube_code = '';
    if (panel_type === 'Double') {
      icube_code = `DP-${panel_yuksekligi}/${panel_genisligi}-${dikey_tel_capi}/${yatay_tel_capi}`;
      if (renk === 6005) icube_code += '-Ysl';
      else if (renk === 7016) icube_code += '-Antrst';
      else if (renk === 0) icube_code += '-Rnksz';
    } else if (panel_type === 'Single') {
      icube_code = `SP-${panel_yuksekligi}/${panel_genisligi}-${dikey_tel_capi}/${yatay_tel_capi}`;
      if (renk === 6005) icube_code += '-Ysl';
      else if (renk === 7016) icube_code += '-Antrst';
      else if (renk === 0) icube_code += '-Rnksz';
    }

    // icube_code_adetli hesaplama
    const icube_code_adetli = `${icube_code}_(${paletteki_panel_sayisi}-Adet)`;

    // stok_kodu hesaplama - Placeholder
    const stok_kodu = `${panel_type === 'Single' ? 'SP' : 'DP'}_Cap:${dikey_tel_capi} * ${yatay_tel_capi}_Eb:${panel_yuksekligi} * ${panel_genisligi}_Gz:${dikey_goz_araligi} * ${yatay_goz_araligi}_Buk:${bukum_sayisi}-${bukumdeki_cubuk_sayisi}_Rnk:${renk === 0 ? 'Kplmsz' : renk === 6005 ? 'Yesil' : renk === 7016 ? 'Antrasit' : renk.toString()}`;

    setCustomPanelCalculations({
      adet_m2,
      bukum_sayisi,
      bukumdeki_cubuk_sayisi,
      dikey_cubuk_adet,
      yatay_cubuk_adet,
      adet_agirligi,
      boyali_hali,
      boya_kg,
      m2_agirlik,
      paletteki_panel_sayisi,
      palet_bos_agirlik,
      paletsiz_toplam_agirlik,
      palet_dolu_agirlik,
      bos_palet_yuksekligi,
      adet_panel_yuksekligi,
      paletsiz_toplam_panel_yuksekligi,
      paletli_yukseklik,
      icube_code,
      icube_code_adetli,
      stok_kodu,
    });
  }, [customPanelData]);

  // Maliyet hesaplama fonksiyonu
  const calculateCosts = async () => {
    if (selectedPanels.length === 0) {
      toast.error('Lütfen en az bir panel seçin');
      return;
    }
    
    setLoading(prev => ({ ...prev, calculation: true }));
    
    try {
      // Seçilen panellerin verilerini al
      const selectedPanelData = panelList.filter(panel => selectedPanels.includes(panel.id));
      
      // Geçici hesaplar tablosunu temizle
      await axios.delete(`${API_URLS.geciciHesaplar}/all`);
      
      // Maliyet listesi tablosunu temizle
      await axios.delete(`${API_URLS.maliyetListesi}/all`);
      
      // İşçi maliyetlerini hesapla
      const ortalamaIsciMaasiUSD = variables.ortalama_isci_maasi_usd_ad;
      const isciSayisiPanelKesme = variables.panel_kesme_isci_sayisi_ad;
      const isciSayisiPanelKaynak = variables.panel_kaynak_isci_sayisi_ad;
      const isciSayisiPanelBoya = variables.panel_boya_isci_sayisi_ad;
      const yalnizPanelAylikKapasite = variables.panel_aylik_kesme_kaynak_kapasite_ad;
      const boyaAylikKapasite = variables.panel_aylik_boya_kapasite_ad;
      
      const yalnizPanelIsciM2 = (ortalamaIsciMaasiUSD * (isciSayisiPanelKesme + isciSayisiPanelKaynak)) / yalnizPanelAylikKapasite;
      const panelBoyaIsciM2 = (ortalamaIsciMaasiUSD * isciSayisiPanelBoya) / boyaAylikKapasite;
      
      // Enerji maliyetlerini hesapla
      const elektrikFiyatUSD = variables.elektrik_tuketim_kwh_usd_ad;
      const dogalgazFiyatUSD = variables.dogalgaz_standart_m3_saat_usd_ad;
      const suFiyatUSD = variables.su_ton_usd_ad;
      
      const kesmeElektrikSarfiyat = variables.kesme_hatti_elektrik_sarfiyat_kwh_ad;
      const kaynakElektrikSarfiyat = variables.kaynak_hatti_elektrik_sarfiyat_kwh_ad;
      const kaynakSuSarfiyat = variables.kaynak_hatti_su_sarfiyat_ton_ad;
      const boyaElektrikSarfiyat = variables.boya_hatti_elektrik_sarfiyat_kwh_ad;
      const boyaDogalgazSarfiyat = variables.boya_hatti_dogalgaz_sarfiyat_m3_ad;
      
      const kesmeElektrikMaliyetiUSD = kesmeElektrikSarfiyat * elektrikFiyatUSD;
      const kaynakElektrikMaliyetiUSD = kaynakElektrikSarfiyat * elektrikFiyatUSD;
      const kaynakSuMaliyetiUSD = kaynakSuSarfiyat * suFiyatUSD;
      const boyaElektrikMaliyetiUSD = boyaElektrikSarfiyat * elektrikFiyatUSD;
      const boyaDogalgazMaliyetiUSD = boyaDogalgazSarfiyat * dogalgazFiyatUSD;
      
      // Sabitler
      const celikTelFiyatiUSD = variables.celik_tel_usd_kg_ad;
      const boyaFiyatiUSD = variables.panel_boya_usd_kg_ad;
      const panelBoyFire = variables.panel_boy_fire_ad; // Oran olarak
      const panelEnFire = variables.panel_en_fire_ad; // Oran olarak
      const kaynakFire = variables.kaynak_fire_ad; // Oran olarak
      
      // Genel gider hesaplamaları
      const kiraAylikUSD = variables.kira_ay_usd_ad;
      const digerMaliyetlerAylikUSD = variables.diger_maliyetler_ay_usd_ad;
      const finansmanGideriAylikUSD = variables.finansman_gideri_ay_usd_ad;
      const amortismanlarAylikUSD = variables.amortismanlar_ay_usd_ad;
      const fabrikaAlaniM2 = variables.fabrika_alani_m2_ad;
      
      const genelGiderlerAylikToplam = kiraAylikUSD + digerMaliyetlerAylikUSD + finansmanGideriAylikUSD + amortismanlarAylikUSD;
      const genelGiderM2Aylik = fabrikaAlaniM2 > 0 ? genelGiderlerAylikToplam / fabrikaAlaniM2 : 0;
      
      // Panel başına genel gider dağıtımı (aylık kapasite üzerinden)
      const panelGenelGiderM2 = yalnizPanelAylikKapasite > 0 ? genelGiderlerAylikToplam / yalnizPanelAylikKapasite : 0;
      
      // Set maliyetleri
      const set40x60DirekUSD = variables.set_40x60_panel_direk_usd_adet_ad;
      const set40x60AyakUSD = variables.set_40x60_panel_ayak_usd_adet_ad;
      const set40x60KelepceUSD = variables.set_40x60_panel_kelepce_usd_adet_ad;
      const set40x60KapakUSD = variables.set_40x60_panel_kapak_usd_adet_ad;
      const set40x60CivataUSD = variables.set_40x60_panel_civata_usd_adet_ad;
      
      const set50x50DirekUSD = variables.set_50x50_panel_direk_usd_adet_ad;
      const set50x50AyakUSD = variables.set_50x50_panel_ayak_usd_adet_ad;
      const set50x50KelepceUSD = variables.set_50x50_panel_kelepce_usd_adet_ad;
      const set50x50KapakUSD = variables.set_50x50_panel_kapak_usd_adet_ad;
      const set50x50CivataUSD = variables.set_50x50_panel_civata_usd_adet_ad;
      
      // Set toplam maliyeti hesaplama
      const set40x60ToplamUSD = set40x60DirekUSD + set40x60AyakUSD + set40x60KelepceUSD + set40x60KapakUSD + set40x60CivataUSD;
      const set50x50ToplamUSD = set50x50DirekUSD + set50x50AyakUSD + set50x50KelepceUSD + set50x50KapakUSD + set50x50CivataUSD;
      
      // Döviz kurları
      const usdToTry = variables.usd_to_try_ad;
      const usdToEur = variables.usd_to_eur_ad;
      const eurToTry = variables.eur_to_try_ad;
      
      // Dönüşüm fonksiyonları
      const usdToEurFn = (usd) => usd * usdToEur;
      const usdToTryFn = (usd) => usd * usdToTry;
      const eurToTryFn = (eur) => eur * eurToTry;
      
      // Satış fiyatı çarpanları
      const usdSatisFiyatCarpan = variables.panel_usd_satis_fiyat_carpan_ad;
      const eurSatisFiyatCarpan = variables.panel_eur_satis_fiyat_carpan_ad;
      const trySatisFiyatCarpan = variables.panel_try_satis_fiyat_carpan_ad;
      
      // Toplu veri işleme için hazırlık
      const geciciHesaplarBatch = [];
      const maliyetListesiBatch = [];
      
      // Her panel için hesaplama yap
      for (const panel of selectedPanelData) {
        const {
          id,
          stok_kodu,
          panel_yuksekligi,
          panel_genisligi,
          panel_cinsi,
          dikey_tel_capi,
          yatay_tel_capi,
          renk,
          adet,
          adet_m2,
          bukum_sayisi,
          bukumdeki_cubuk_sayisi,
          dikey_goz_araligi,
          yatay_goz_araligi,
          dikey_cubuk_adet,
          yatay_cubuk_adet,
          adet_agirligi,
          boyali_hali,
          boya_kg,
          m2_agirlik,
          panel_kodu
        } = panel;
        
        // Tel kesiti ve ağırlık hesaplamaları
        const dikeyTelKesitMM2 = Math.PI * Math.pow(dikey_tel_capi, 2) / 4;
        const yatayTelKesitMM2 = Math.PI * Math.pow(yatay_tel_capi, 2) / 4;
        
        const dikeyTelKgMetre = dikeyTelKesitMM2 * 7.85 / 1000;
        const yatayTelKgMetre = yatayTelKesitMM2 * 7.85 / 1000;
        
        // Fire dahil panel boyutları
        const panelBoyFireli = panel_yuksekligi * (1 + panelBoyFire);
        const panelEnFireli = panel_genisligi * (1 + panelEnFire);
        
        // Dikey ve yatay tel maliyeti hesaplama
        const dikeyTelUzunlukMetre = panelBoyFireli / 100; // cm'den metreye çevir
        const yatayTelUzunlukMetre = panelEnFireli / 100; // cm'den metreye çevir
        
        const dikeyTellerToplamKg = dikeyTelKgMetre * dikeyTelUzunlukMetre * dikey_cubuk_adet;
        const yatayTellerToplamKg = yatayTelKgMetre * yatayTelUzunlukMetre * yatay_cubuk_adet;
        
        const telToplamKg = (dikeyTellerToplamKg + yatayTellerToplamKg) * (1 + kaynakFire);
        
        // Hammadde maliyeti hesaplama
        const hammaddeMaliyetiUSD = telToplamKg * celikTelFiyatiUSD;
        
        // İşçilik maliyeti hesaplama
        const iscilikMaliyetiUSD = adet_m2 * yalnizPanelIsciM2;
        
        // Enerji maliyeti hesaplama
        const enerjiMaliyetiUSD = (kesmeElektrikMaliyetiUSD + kaynakElektrikMaliyetiUSD + kaynakSuMaliyetiUSD) * adet_m2 / yalnizPanelAylikKapasite;
        
        // Çıplak panel maliyeti hesaplama
        const ciplakPanelMaliyetiUSD = hammaddeMaliyetiUSD + iscilikMaliyetiUSD + enerjiMaliyetiUSD + (adet_m2 * panelGenelGiderM2);
        
        // Boya maliyeti hesaplama
        const boyaMaliyetiUSD = boya_kg * boyaFiyatiUSD;
        const boyaIscilikMaliyetiUSD = renk > 0 ? adet_m2 * panelBoyaIsciM2 : 0;
        const boyaEnerjiMaliyetiUSD = renk > 0 ? (boyaElektrikMaliyetiUSD + boyaDogalgazMaliyetiUSD) * adet_m2 / boyaAylikKapasite : 0;
        
        // Boyalı panel maliyeti hesaplama
        const boyaliPanelMaliyetiUSD = ciplakPanelMaliyetiUSD + boyaMaliyetiUSD + boyaIscilikMaliyetiUSD + boyaEnerjiMaliyetiUSD;
        
        // Set eklemeli maliyet hesaplama (40x60 ve 50x50 için)
        const setliCiplakPanelMaliyeti40x60USD = ciplakPanelMaliyetiUSD + set40x60ToplamUSD;
        const setliCiplakPanelMaliyeti50x50USD = ciplakPanelMaliyetiUSD + set50x50ToplamUSD;
        
        const setliBoyaliPanelMaliyeti40x60USD = boyaliPanelMaliyetiUSD + set40x60ToplamUSD;
        const setliBoyaliPanelMaliyeti50x50USD = boyaliPanelMaliyetiUSD + set50x50ToplamUSD;
        
        // Geçici hesaplar tablosuna eklenecek veri
        const geciciHesapItem = {
          panel_id: id,
          stok_kodu,
          panel_kodu,
          panel_yuksekligi,
          panel_genisligi,
          panel_cinsi,
          dikey_tel_capi,
          yatay_tel_capi,
          renk,
          adet,
          adet_m2,
          bukum_sayisi,
          bukumdeki_cubuk_sayisi,
          dikey_goz_araligi,
          yatay_goz_araligi,
          dikey_cubuk_adet,
          yatay_cubuk_adet,
          adet_agirligi,
          boyali_hali,
          boya_kg,
          m2_agirlik,
          dikey_tel_kesit_mm2: dikeyTelKesitMM2,
          yatay_tel_kesit_mm2: yatayTelKesitMM2,
          dikey_tel_kg_metre: dikeyTelKgMetre,
          yatay_tel_kg_metre: yatayTelKgMetre,
          panel_boy_fireli: panelBoyFireli,
          panel_en_fireli: panelEnFireli,
          dikey_tel_uzunluk_metre: dikeyTelUzunlukMetre,
          yatay_tel_uzunluk_metre: yatayTelUzunlukMetre,
          dikey_teller_toplam_kg: dikeyTellerToplamKg,
          yatay_teller_toplam_kg: yatayTellerToplamKg,
          tel_toplam_kg: telToplamKg,
          hammadde_maliyeti_usd: hammaddeMaliyetiUSD,
          iscilik_maliyeti_usd: iscilikMaliyetiUSD,
          enerji_maliyeti_usd: enerjiMaliyetiUSD,
          ciplak_panel_maliyeti_usd: ciplakPanelMaliyetiUSD,
          boya_maliyeti_usd: boyaMaliyetiUSD,
          boya_iscilik_maliyeti_usd: boyaIscilikMaliyetiUSD,
          boya_enerji_maliyeti_usd: boyaEnerjiMaliyetiUSD,
          boyali_panel_maliyeti_usd: boyaliPanelMaliyetiUSD,
          setli_ciplak_panel_maliyeti_40x60_usd: setliCiplakPanelMaliyeti40x60USD,
          setli_ciplak_panel_maliyeti_50x50_usd: setliCiplakPanelMaliyeti50x50USD,
          setli_boyali_panel_maliyeti_40x60_usd: setliBoyaliPanelMaliyeti40x60USD,
          setli_boyali_panel_maliyeti_50x50_usd: setliBoyaliPanelMaliyeti50x50USD,
          yalniz_panel_isci_m2: yalnizPanelIsciM2,
          panel_boya_isci_m2: panelBoyaIsciM2,
        };
        
        // Maliyet sonuçlarını hesapla (Adet/M²/Kg bazında)
        const ciplakAdetUSD = ciplakPanelMaliyetiUSD;
        const ciplakAdetEUR = usdToEurFn(ciplakAdetUSD);
        const ciplakAdetTRY = usdToTryFn(ciplakAdetUSD);
        
        const ciplakM2USD = adet_m2 > 0 ? ciplakPanelMaliyetiUSD / adet_m2 : 0;
        const ciplakM2EUR = usdToEurFn(ciplakM2USD);
        const ciplakM2TRY = usdToTryFn(ciplakM2USD);
        
        const ciplakKgUSD = adet_agirligi > 0 ? ciplakPanelMaliyetiUSD / adet_agirligi : 0;
        const ciplakKgEUR = usdToEurFn(ciplakKgUSD);
        const ciplakKgTRY = usdToTryFn(ciplakKgUSD);
        
        const boyaliAdetUSD = boyaliPanelMaliyetiUSD;
        const boyaliAdetEUR = usdToEurFn(boyaliAdetUSD);
        const boyaliAdetTRY = usdToTryFn(boyaliAdetUSD);
        
        const boyaliM2USD = adet_m2 > 0 ? boyaliPanelMaliyetiUSD / adet_m2 : 0;
        const boyaliM2EUR = usdToEurFn(boyaliM2USD);
        const boyaliM2TRY = usdToTryFn(boyaliM2USD);
        
        const boyaliKgUSD = boyali_hali > 0 ? boyaliPanelMaliyetiUSD / boyali_hali : 0;
        const boyaliKgEUR = usdToEurFn(boyaliKgUSD);
        const boyaliKgTRY = usdToTryFn(boyaliKgUSD);
        
        // 40x60 set için
        const standartSetliBoyasizAdetUSD_40x60 = setliCiplakPanelMaliyeti40x60USD;
        const standartSetliBoyasizAdetEUR_40x60 = usdToEurFn(standartSetliBoyasizAdetUSD_40x60);
        const standartSetliBoyasizAdetTRY_40x60 = usdToTryFn(standartSetliBoyasizAdetUSD_40x60);
        
        const standartSetliBoyasizM2USD_40x60 = adet_m2 > 0 ? setliCiplakPanelMaliyeti40x60USD / adet_m2 : 0;
        const standartSetliBoyasizM2EUR_40x60 = usdToEurFn(standartSetliBoyasizM2USD_40x60);
        const standartSetliBoyasizM2TRY_40x60 = usdToTryFn(standartSetliBoyasizM2USD_40x60);
        
        const standartSetliBoyasizKgUSD_40x60 = adet_agirligi > 0 ? setliCiplakPanelMaliyeti40x60USD / adet_agirligi : 0;
        const standartSetliBoyasizKgEUR_40x60 = usdToEurFn(standartSetliBoyasizKgUSD_40x60);
        const standartSetliBoyasizKgTRY_40x60 = usdToTryFn(standartSetliBoyasizKgUSD_40x60);
        
        const standartSetliBoyaliAdetUSD_40x60 = setliBoyaliPanelMaliyeti40x60USD;
        const standartSetliBoyaliAdetEUR_40x60 = usdToEurFn(standartSetliBoyaliAdetUSD_40x60);
        const standartSetliBoyaliAdetTRY_40x60 = usdToTryFn(standartSetliBoyaliAdetUSD_40x60);
        
        const standartSetliBoyaliM2USD_40x60 = adet_m2 > 0 ? setliBoyaliPanelMaliyeti40x60USD / adet_m2 : 0;
        const standartSetliBoyaliM2EUR_40x60 = usdToEurFn(standartSetliBoyaliM2USD_40x60);
        const standartSetliBoyaliM2TRY_40x60 = usdToTryFn(standartSetliBoyaliM2USD_40x60);
        
        const standartSetliBoyaliKgUSD_40x60 = boyali_hali > 0 ? setliBoyaliPanelMaliyeti40x60USD / boyali_hali : 0;
        const standartSetliBoyaliKgEUR_40x60 = usdToEurFn(standartSetliBoyaliKgUSD_40x60);
        const standartSetliBoyaliKgTRY_40x60 = usdToTryFn(standartSetliBoyaliKgUSD_40x60);
        
        // Maliyet listesi tablosuna eklenecek veri
        const maliyetItem = {
          panel_id: id,
          stok_kodu,
          panel_kodu,
          // Manuel sıralama için
          manual_order: selectedPanelData.findIndex(p => p.id === id) + 1,
          
          // Çıplak panel maliyetleri
          ciplak_adet_usd: ciplakAdetUSD * usdSatisFiyatCarpan,
          ciplak_adet_eur: ciplakAdetEUR * eurSatisFiyatCarpan,
          ciplak_adet_try: ciplakAdetTRY * trySatisFiyatCarpan,
          
          ciplak_m2_usd: ciplakM2USD * usdSatisFiyatCarpan,
          ciplak_m2_eur: ciplakM2EUR * eurSatisFiyatCarpan,
          ciplak_m2_try: ciplakM2TRY * trySatisFiyatCarpan,
          
          ciplak_kg_usd: ciplakKgUSD * usdSatisFiyatCarpan,
          ciplak_kg_eur: ciplakKgEUR * eurSatisFiyatCarpan,
          ciplak_kg_try: ciplakKgTRY * trySatisFiyatCarpan,
          
          // Boyalı panel maliyetleri
          boyali_adet_usd: boyaliAdetUSD * usdSatisFiyatCarpan,
          boyali_adet_eur: boyaliAdetEUR * eurSatisFiyatCarpan,
          boyali_adet_try: boyaliAdetTRY * trySatisFiyatCarpan,
          
          boyali_m2_usd: boyaliM2USD * usdSatisFiyatCarpan,
          boyali_m2_eur: boyaliM2EUR * eurSatisFiyatCarpan,
          boyali_m2_try: boyaliM2TRY * trySatisFiyatCarpan,
          
          boyali_kg_usd: boyaliKgUSD * usdSatisFiyatCarpan,
          boyali_kg_eur: boyaliKgEUR * eurSatisFiyatCarpan,
          boyali_kg_try: boyaliKgTRY * trySatisFiyatCarpan,
          
          // 40x60 setli panel maliyetleri
          standart_setli_boyasiz_adet_usd: standartSetliBoyasizAdetUSD_40x60 * usdSatisFiyatCarpan,
          standart_setli_boyasiz_adet_eur: standartSetliBoyasizAdetEUR_40x60 * eurSatisFiyatCarpan,
          standart_setli_boyasiz_adet_try: standartSetliBoyasizAdetTRY_40x60 * trySatisFiyatCarpan,
          
          standart_setli_boyasiz_m2_usd: standartSetliBoyasizM2USD_40x60 * usdSatisFiyatCarpan,
          standart_setli_boyasiz_m2_eur: standartSetliBoyasizM2EUR_40x60 * eurSatisFiyatCarpan,
          standart_setli_boyasiz_m2_try: standartSetliBoyasizM2TRY_40x60 * trySatisFiyatCarpan,
          
          standart_setli_boyasiz_kg_usd: standartSetliBoyasizKgUSD_40x60 * usdSatisFiyatCarpan,
          standart_setli_boyasiz_kg_eur: standartSetliBoyasizKgEUR_40x60 * eurSatisFiyatCarpan,
          standart_setli_boyasiz_kg_try: standartSetliBoyasizKgTRY_40x60 * trySatisFiyatCarpan,
          
          standart_setli_boyali_adet_usd: standartSetliBoyaliAdetUSD_40x60 * usdSatisFiyatCarpan,
          standart_setli_boyali_adet_eur: standartSetliBoyaliAdetEUR_40x60 * eurSatisFiyatCarpan,
          standart_setli_boyali_adet_try: standartSetliBoyaliAdetTRY_40x60 * trySatisFiyatCarpan,
          
          standart_setli_boyali_m2_usd: standartSetliBoyaliM2USD_40x60 * usdSatisFiyatCarpan,
          standart_setli_boyali_m2_eur: standartSetliBoyaliM2EUR_40x60 * eurSatisFiyatCarpan,
          standart_setli_boyali_m2_try: standartSetliBoyaliM2TRY_40x60 * trySatisFiyatCarpan,
          
          standart_setli_boyali_kg_usd: standartSetliBoyaliKgUSD_40x60 * usdSatisFiyatCarpan,
          standart_setli_boyali_kg_eur: standartSetliBoyaliKgEUR_40x60 * eurSatisFiyatCarpan,
          standart_setli_boyali_kg_try: standartSetliBoyaliKgTRY_40x60 * trySatisFiyatCarpan,
        };
        
        // Batch dizilere ekle
        geciciHesaplarBatch.push(geciciHesapItem);
        maliyetListesiBatch.push(maliyetItem);
      }
      
      // Batch verileri 25'erli gruplar halinde veritabanına yaz
      const batchSize = 25;
      
      // Geçici hesaplar için
      for (let i = 0; i < geciciHesaplarBatch.length; i += batchSize) {
        const batch = geciciHesaplarBatch.slice(i, i + batchSize);
        for (const item of batch) {
          await axios.post(API_URLS.geciciHesaplar, item);
        }
        
        // İlerleme durumunu göster
        const progress = Math.min(100, Math.round((i + batch.length) / geciciHesaplarBatch.length * 100));
        toast.success(`Geçici hesaplar kaydediliyor: %${progress}`);
      }
      
      // Maliyet listesi için
      for (let i = 0; i < maliyetListesiBatch.length; i += batchSize) {
        const batch = maliyetListesiBatch.slice(i, i + batchSize);
        for (const item of batch) {
          await axios.post(API_URLS.maliyetListesi, item);
        }
        
        // İlerleme durumunu göster
        const progress = Math.min(100, Math.round((i + batch.length) / maliyetListesiBatch.length * 100));
        toast.success(`Maliyet sonuçları kaydediliyor: %${progress}`);
      }
      
      // İşlem tamamlandıktan sonra sonuçları çek
      await fetchCostResults();
      
      toast.success('Maliyet hesaplaması tamamlandı');
    } catch (error) {
      console.error('Hesaplama hatası:', error);
      toast.error(`Hesaplama hatası: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, calculation: false }));
    }
  };

  // Özel panel için maliyet hesaplama
  const calculateCustomPanelCost = async () => {
    setLoading(prev => ({ ...prev, calculation: true }));
    
    try {
      // Özel panel verilerini al
      const {
        panel_type,
        panel_yuksekligi,
        panel_genisligi,
        dikey_tel_capi,
        yatay_tel_capi,
        renk,
        adet,
        dikey_goz_araligi,
        yatay_goz_araligi
      } = customPanelData;
      
      // Hesaplamaları yap
      const {
        adet_m2,
        bukum_sayisi,
        bukumdeki_cubuk_sayisi,
        dikey_cubuk_adet,
        yatay_cubuk_adet,
        adet_agirligi,
        boyali_hali,
        boya_kg,
        stok_kodu
      } = customPanelCalculations;
      
      // Özel panel kodunu oluştur
      const panel_kodu = panel_type === 'Single' 
        ? `SP-${panel_yuksekligi}/${panel_genisligi}-${dikey_tel_capi}/${yatay_tel_capi}${renk === 6005 ? '-Ysl' : renk === 7016 ? '-Antrst' : renk === 0 ? '-Rnksz' : ''}`
        : `DP-${panel_yuksekligi}/${panel_genisligi}-${dikey_tel_capi}/${yatay_tel_capi}${renk === 6005 ? '-Ysl' : renk === 7016 ? '-Antrst' : renk === 0 ? '-Rnksz' : ''}`;
      
      // Aynı maliyet hesaplama algoritmasını kullan
      // İşçi maliyetlerini hesapla
      const ortalamaIsciMaasiUSD = variables.ortalama_isci_maasi_usd_ad;
      const isciSayisiPanelKesme = variables.panel_kesme_isci_sayisi_ad;
      const isciSayisiPanelKaynak = variables.panel_kaynak_isci_sayisi_ad;
      const isciSayisiPanelBoya = variables.panel_boya_isci_sayisi_ad;
      const yalnizPanelAylikKapasite = variables.panel_aylik_kesme_kaynak_kapasite_ad;
      const boyaAylikKapasite = variables.panel_aylik_boya_kapasite_ad;
      
      const yalnizPanelIsciM2 = (ortalamaIsciMaasiUSD * (isciSayisiPanelKesme + isciSayisiPanelKaynak)) / yalnizPanelAylikKapasite;
      const panelBoyaIsciM2 = (ortalamaIsciMaasiUSD * isciSayisiPanelBoya) / boyaAylikKapasite;
      
      // Enerji maliyetlerini hesapla
      const elektrikFiyatUSD = variables.elektrik_tuketim_kwh_usd_ad;
      const dogalgazFiyatUSD = variables.dogalgaz_standart_m3_saat_usd_ad;
      const suFiyatUSD = variables.su_ton_usd_ad;
      
      const kesmeElektrikSarfiyat = variables.kesme_hatti_elektrik_sarfiyat_kwh_ad;
      const kaynakElektrikSarfiyat = variables.kaynak_hatti_elektrik_sarfiyat_kwh_ad;
      const kaynakSuSarfiyat = variables.kaynak_hatti_su_sarfiyat_ton_ad;
      const boyaElektrikSarfiyat = variables.boya_hatti_elektrik_sarfiyat_kwh_ad;
      const boyaDogalgazSarfiyat = variables.boya_hatti_dogalgaz_sarfiyat_m3_ad;
      
      const kesmeElektrikMaliyetiUSD = kesmeElektrikSarfiyat * elektrikFiyatUSD;
      const kaynakElektrikMaliyetiUSD = kaynakElektrikSarfiyat * elektrikFiyatUSD;
      const kaynakSuMaliyetiUSD = kaynakSuSarfiyat * suFiyatUSD;
      const boyaElektrikMaliyetiUSD = boyaElektrikSarfiyat * elektrikFiyatUSD;
      const boyaDogalgazMaliyetiUSD = boyaDogalgazSarfiyat * dogalgazFiyatUSD;
      
      // Sabitler
      const celikTelFiyatiUSD = variables.celik_tel_usd_kg_ad;
      const boyaFiyatiUSD = variables.panel_boya_usd_kg_ad;
      const panelBoyFire = variables.panel_boy_fire_ad; // Oran olarak
      const panelEnFire = variables.panel_en_fire_ad; // Oran olarak
      const kaynakFire = variables.kaynak_fire_ad; // Oran olarak
      
      // Genel gider hesaplamaları
      const kiraAylikUSD = variables.kira_ay_usd_ad;
      const digerMaliyetlerAylikUSD = variables.diger_maliyetler_ay_usd_ad;
      const finansmanGideriAylikUSD = variables.finansman_gideri_ay_usd_ad;
      const amortismanlarAylikUSD = variables.amortismanlar_ay_usd_ad;
      const fabrikaAlaniM2 = variables.fabrika_alani_m2_ad;
      
      const genelGiderlerAylikToplam = kiraAylikUSD + digerMaliyetlerAylikUSD + finansmanGideriAylikUSD + amortismanlarAylikUSD;
      const genelGiderM2Aylik = fabrikaAlaniM2 > 0 ? genelGiderlerAylikToplam / fabrikaAlaniM2 : 0;
      
      // Panel başına genel gider dağıtımı (aylık kapasite üzerinden)
      const panelGenelGiderM2 = yalnizPanelAylikKapasite > 0 ? genelGiderlerAylikToplam / yalnizPanelAylikKapasite : 0;
      
      // Set maliyetleri
      const set40x60DirekUSD = variables.set_40x60_panel_direk_usd_adet_ad;
      const set40x60AyakUSD = variables.set_40x60_panel_ayak_usd_adet_ad;
      const set40x60KelepceUSD = variables.set_40x60_panel_kelepce_usd_adet_ad;
      const set40x60KapakUSD = variables.set_40x60_panel_kapak_usd_adet_ad;
      const set40x60CivataUSD = variables.set_40x60_panel_civata_usd_adet_ad;
      
      const set50x50DirekUSD = variables.set_50x50_panel_direk_usd_adet_ad;
      const set50x50AyakUSD = variables.set_50x50_panel_ayak_usd_adet_ad;
      const set50x50KelepceUSD = variables.set_50x50_panel_kelepce_usd_adet_ad;
      const set50x50KapakUSD = variables.set_50x50_panel_kapak_usd_adet_ad;
      const set50x50CivataUSD = variables.set_50x50_panel_civata_usd_adet_ad;
      
      // Set toplam maliyeti hesaplama
      const set40x60ToplamUSD = set40x60DirekUSD + set40x60AyakUSD + set40x60KelepceUSD + set40x60KapakUSD + set40x60CivataUSD;
      const set50x50ToplamUSD = set50x50DirekUSD + set50x50AyakUSD + set50x50KelepceUSD + set50x50KapakUSD + set50x50CivataUSD;
      
      // Döviz kurları
      const usdToTry = variables.usd_to_try_ad;
      const usdToEur = variables.usd_to_eur_ad;
      const eurToTry = variables.eur_to_try_ad;
      
      // Dönüşüm fonksiyonları
      const usdToEurFn = (usd) => usd * usdToEur;
      const usdToTryFn = (usd) => usd * usdToTry;
      const eurToTryFn = (eur) => eur * eurToTry;
      
      // Satış fiyatı çarpanları
      const usdSatisFiyatCarpan = variables.panel_usd_satis_fiyat_carpan_ad;
      const eurSatisFiyatCarpan = variables.panel_eur_satis_fiyat_carpan_ad;
      const trySatisFiyatCarpan = variables.panel_try_satis_fiyat_carpan_ad;
      
      // Tel kesiti ve ağırlık hesaplamaları
      const dikeyTelKesitMM2 = Math.PI * Math.pow(dikey_tel_capi, 2) / 4;
      const yatayTelKesitMM2 = Math.PI * Math.pow(yatay_tel_capi, 2) / 4;
      
      const dikeyTelKgMetre = dikeyTelKesitMM2 * 7.85 / 1000;
      const yatayTelKgMetre = yatayTelKesitMM2 * 7.85 / 1000;
      
      // Fire dahil panel boyutları
      const panelBoyFireli = panel_yuksekligi * (1 + panelBoyFire);
      const panelEnFireli = panel_genisligi * (1 + panelEnFire);
      
      // Dikey ve yatay tel maliyeti hesaplama
      const dikeyTelUzunlukMetre = panelBoyFireli / 100; // cm'den metreye çevir
      const yatayTelUzunlukMetre = panelEnFireli / 100; // cm'den metreye çevir
      
      const dikeyTellerToplamKg = dikeyTelKgMetre * dikeyTelUzunlukMetre * dikey_cubuk_adet;
      const yatayTellerToplamKg = yatayTelKgMetre * yatayTelUzunlukMetre * yatay_cubuk_adet;
      
      const telToplamKg = (dikeyTellerToplamKg + yatayTellerToplamKg) * (1 + kaynakFire);
      
      // Hammadde maliyeti hesaplama
      const hammaddeMaliyetiUSD = telToplamKg * celikTelFiyatiUSD;
      
      // İşçilik maliyeti hesaplama
      const iscilikMaliyetiUSD = adet_m2 * yalnizPanelIsciM2;
      
      // Enerji maliyeti hesaplama
      const enerjiMaliyetiUSD = (kesmeElektrikMaliyetiUSD + kaynakElektrikMaliyetiUSD + kaynakSuMaliyetiUSD) * adet_m2 / yalnizPanelAylikKapasite;
      
      // Çıplak panel maliyeti hesaplama
      const ciplakPanelMaliyetiUSD = hammaddeMaliyetiUSD + iscilikMaliyetiUSD + enerjiMaliyetiUSD + (adet_m2 * panelGenelGiderM2);
      
      // Boya maliyeti hesaplama
      const boyaMaliyetiUSD = boya_kg * boyaFiyatiUSD;
      const boyaIscilikMaliyetiUSD = renk > 0 ? adet_m2 * panelBoyaIsciM2 : 0;
      const boyaEnerjiMaliyetiUSD = renk > 0 ? (boyaElektrikMaliyetiUSD + boyaDogalgazMaliyetiUSD) * adet_m2 / boyaAylikKapasite : 0;
      
      // Boyalı panel maliyeti hesaplama
      const boyaliPanelMaliyetiUSD = ciplakPanelMaliyetiUSD + boyaMaliyetiUSD + boyaIscilikMaliyetiUSD + boyaEnerjiMaliyetiUSD;
      
      // Set eklemeli maliyet hesaplama (40x60 ve 50x50 için)
      const setliCiplakPanelMaliyeti40x60USD = ciplakPanelMaliyetiUSD + set40x60ToplamUSD;
      const setliCiplakPanelMaliyeti50x50USD = ciplakPanelMaliyetiUSD + set50x50ToplamUSD;
      
      const setliBoyaliPanelMaliyeti40x60USD = boyaliPanelMaliyetiUSD + set40x60ToplamUSD;
      const setliBoyaliPanelMaliyeti50x50USD = boyaliPanelMaliyetiUSD + set50x50ToplamUSD;
      
      // Geçici hesaplar tablosuna eklenecek veri
      const geciciHesapItem = {
        panel_id: 'custom',
        stok_kodu,
        panel_kodu,
        panel_yuksekligi,
        panel_genisligi,
        panel_cinsi: panel_type,
        dikey_tel_capi,
        yatay_tel_capi,
        renk,
        adet,
        adet_m2,
        bukum_sayisi,
        bukumdeki_cubuk_sayisi,
        dikey_goz_araligi,
        yatay_goz_araligi,
        dikey_cubuk_adet,
        yatay_cubuk_adet,
        adet_agirligi,
        boyali_hali,
        boya_kg,
        m2_agirlik: customPanelCalculations.m2_agirlik,
        dikey_tel_kesit_mm2: dikeyTelKesitMM2,
        yatay_tel_kesit_mm2: yatayTelKesitMM2,
        dikey_tel_kg_metre: dikeyTelKgMetre,
        yatay_tel_kg_metre: yatayTelKgMetre,
        panel_boy_fireli: panelBoyFireli,
        panel_en_fireli: panelEnFireli,
        dikey_tel_uzunluk_metre: dikeyTelUzunlukMetre,
        yatay_tel_uzunluk_metre: yatayTelUzunlukMetre,
        dikey_teller_toplam_kg: dikeyTellerToplamKg,
        yatay_teller_toplam_kg: yatayTellerToplamKg,
        tel_toplam_kg: telToplamKg,
        hammadde_maliyeti_usd: hammaddeMaliyetiUSD,
        iscilik_maliyeti_usd: iscilikMaliyetiUSD,
        enerji_maliyeti_usd: enerjiMaliyetiUSD,
        ciplak_panel_maliyeti_usd: ciplakPanelMaliyetiUSD,
        boya_maliyeti_usd: boyaMaliyetiUSD,
        boya_iscilik_maliyeti_usd: boyaIscilikMaliyetiUSD,
        boya_enerji_maliyeti_usd: boyaEnerjiMaliyetiUSD,
        boyali_panel_maliyeti_usd: boyaliPanelMaliyetiUSD,
        setli_ciplak_panel_maliyeti_40x60_usd: setliCiplakPanelMaliyeti40x60USD,
        setli_ciplak_panel_maliyeti_50x50_usd: setliCiplakPanelMaliyeti50x50USD,
        setli_boyali_panel_maliyeti_40x60_usd: setliBoyaliPanelMaliyeti40x60USD,
        setli_boyali_panel_maliyeti_50x50_usd: setliBoyaliPanelMaliyeti50x50USD,
        yalniz_panel_isci_m2: yalnizPanelIsciM2,
        panel_boya_isci_m2: panelBoyaIsciM2,
      };
      
      // Maliyet sonuçlarını hesapla (Adet/M²/Kg bazında)
      const ciplakAdetUSD = ciplakPanelMaliyetiUSD;
      const ciplakAdetEUR = usdToEurFn(ciplakAdetUSD);
      const ciplakAdetTRY = usdToTryFn(ciplakAdetUSD);
      
      const ciplakM2USD = adet_m2 > 0 ? ciplakPanelMaliyetiUSD / adet_m2 : 0;
      const ciplakM2EUR = usdToEurFn(ciplakM2USD);
      const ciplakM2TRY = usdToTryFn(ciplakM2USD);
      
      const ciplakKgUSD = adet_agirligi > 0 ? ciplakPanelMaliyetiUSD / adet_agirligi : 0;
      const ciplakKgEUR = usdToEurFn(ciplakKgUSD);
      const ciplakKgTRY = usdToTryFn(ciplakKgUSD);
      
      const boyaliAdetUSD = boyaliPanelMaliyetiUSD;
      const boyaliAdetEUR = usdToEurFn(boyaliAdetUSD);
      const boyaliAdetTRY = usdToTryFn(boyaliAdetUSD);
      
      const boyaliM2USD = adet_m2 > 0 ? boyaliPanelMaliyetiUSD / adet_m2 : 0;
      const boyaliM2EUR = usdToEurFn(boyaliM2USD);
      const boyaliM2TRY = usdToTryFn(boyaliM2USD);
      
      const boyaliKgUSD = boyali_hali > 0 ? boyaliPanelMaliyetiUSD / boyali_hali : 0;
      const boyaliKgEUR = usdToEurFn(boyaliKgUSD);
      const boyaliKgTRY = usdToTryFn(boyaliKgUSD);
      
      // 40x60 set için
      const standartSetliBoyasizAdetUSD_40x60 = setliCiplakPanelMaliyeti40x60USD;
      const standartSetliBoyasizAdetEUR_40x60 = usdToEurFn(standartSetliBoyasizAdetUSD_40x60);
      const standartSetliBoyasizAdetTRY_40x60 = usdToTryFn(standartSetliBoyasizAdetUSD_40x60);
      
      const standartSetliBoyasizM2USD_40x60 = adet_m2 > 0 ? setliCiplakPanelMaliyeti40x60USD / adet_m2 : 0;
      const standartSetliBoyasizM2EUR_40x60 = usdToEurFn(standartSetliBoyasizM2USD_40x60);
      const standartSetliBoyasizM2TRY_40x60 = usdToTryFn(standartSetliBoyasizM2USD_40x60);
      
      const standartSetliBoyasizKgUSD_40x60 = adet_agirligi > 0 ? setliCiplakPanelMaliyeti40x60USD / adet_agirligi : 0;
      const standartSetliBoyasizKgEUR_40x60 = usdToEurFn(standartSetliBoyasizKgUSD_40x60);
      const standartSetliBoyasizKgTRY_40x60 = usdToTryFn(standartSetliBoyasizKgUSD_40x60);
      
      const standartSetliBoyaliAdetUSD_40x60 = setliBoyaliPanelMaliyeti40x60USD;
      const standartSetliBoyaliAdetEUR_40x60 = usdToEurFn(standartSetliBoyaliAdetUSD_40x60);
      const standartSetliBoyaliAdetTRY_40x60 = usdToTryFn(standartSetliBoyaliAdetUSD_40x60);
      
      const standartSetliBoyaliM2USD_40x60 = adet_m2 > 0 ? setliBoyaliPanelMaliyeti40x60USD / adet_m2 : 0;
      const standartSetliBoyaliM2EUR_40x60 = usdToEurFn(standartSetliBoyaliM2USD_40x60);
      const standartSetliBoyaliM2TRY_40x60 = usdToTryFn(standartSetliBoyaliM2USD_40x60);
      
      const standartSetliBoyaliKgUSD_40x60 = boyali_hali > 0 ? setliBoyaliPanelMaliyeti40x60USD / boyali_hali : 0;
      const standartSetliBoyaliKgEUR_40x60 = usdToEurFn(standartSetliBoyaliKgUSD_40x60);
      const standartSetliBoyaliKgTRY_40x60 = usdToTryFn(standartSetliBoyaliKgUSD_40x60);
      
      // Maliyet listesi tablosuna eklenecek veri
      const maliyetItem = {
        panel_id: 'custom',
        stok_kodu,
        panel_kodu,
        // Manuel sıralama için
        manual_order: 0, // Özel panel için en başa
        
        // Çıplak panel maliyetleri
        ciplak_adet_usd: ciplakAdetUSD * usdSatisFiyatCarpan,
        ciplak_adet_eur: ciplakAdetEUR * eurSatisFiyatCarpan,
        ciplak_adet_try: ciplakAdetTRY * trySatisFiyatCarpan,
        
        ciplak_m2_usd: ciplakM2USD * usdSatisFiyatCarpan,
        ciplak_m2_eur: ciplakM2EUR * eurSatisFiyatCarpan,
        ciplak_m2_try: ciplakM2TRY * trySatisFiyatCarpan,
        
        ciplak_kg_usd: ciplakKgUSD * usdSatisFiyatCarpan,
        ciplak_kg_eur: ciplakKgEUR * eurSatisFiyatCarpan,
        ciplak_kg_try: ciplakKgTRY * trySatisFiyatCarpan,
        
        // Boyalı panel maliyetleri
        boyali_adet_usd: boyaliAdetUSD * usdSatisFiyatCarpan,
        boyali_adet_eur: boyaliAdetEUR * eurSatisFiyatCarpan,
        boyali_adet_try: boyaliAdetTRY * trySatisFiyatCarpan,
        
        boyali_m2_usd: boyaliM2USD * usdSatisFiyatCarpan,
        boyali_m2_eur: boyaliM2EUR * eurSatisFiyatCarpan,
        boyali_m2_try: boyaliM2TRY * trySatisFiyatCarpan,
        
        boyali_kg_usd: boyaliKgUSD * usdSatisFiyatCarpan,
        boyali_kg_eur: boyaliKgEUR * eurSatisFiyatCarpan,
        boyali_kg_try: boyaliKgTRY * trySatisFiyatCarpan,
        
        // 40x60 setli panel maliyetleri
        standart_setli_boyasiz_adet_usd: standartSetliBoyasizAdetUSD_40x60 * usdSatisFiyatCarpan,
        standart_setli_boyasiz_adet_eur: standartSetliBoyasizAdetEUR_40x60 * eurSatisFiyatCarpan,
        standart_setli_boyasiz_adet_try: standartSetliBoyasizAdetTRY_40x60 * trySatisFiyatCarpan,
        
        standart_setli_boyasiz_m2_usd: standartSetliBoyasizM2USD_40x60 * usdSatisFiyatCarpan,
        standart_setli_boyasiz_m2_eur: standartSetliBoyasizM2EUR_40x60 * eurSatisFiyatCarpan,
        standart_setli_boyasiz_m2_try: standartSetliBoyasizM2TRY_40x60 * trySatisFiyatCarpan,
        
        standart_setli_boyasiz_kg_usd: standartSetliBoyasizKgUSD_40x60 * usdSatisFiyatCarpan,
        standart_setli_boyasiz_kg_eur: standartSetliBoyasizKgEUR_40x60 * eurSatisFiyatCarpan,
        standart_setli_boyasiz_kg_try: standartSetliBoyasizKgTRY_40x60 * trySatisFiyatCarpan,
        
        standart_setli_boyali_adet_usd: standartSetliBoyaliAdetUSD_40x60 * usdSatisFiyatCarpan,
        standart_setli_boyali_adet_eur: standartSetliBoyaliAdetEUR_40x60 * eurSatisFiyatCarpan,
        standart_setli_boyali_adet_try: standartSetliBoyaliAdetTRY_40x60 * trySatisFiyatCarpan,
        
        standart_setli_boyali_m2_usd: standartSetliBoyaliM2USD_40x60 * usdSatisFiyatCarpan,
        standart_setli_boyali_m2_eur: standartSetliBoyaliM2EUR_40x60 * eurSatisFiyatCarpan,
        standart_setli_boyali_m2_try: standartSetliBoyaliM2TRY_40x60 * trySatisFiyatCarpan,
        
        standart_setli_boyali_kg_usd: standartSetliBoyaliKgUSD_40x60 * usdSatisFiyatCarpan,
        standart_setli_boyali_kg_eur: standartSetliBoyaliKgEUR_40x60 * eurSatisFiyatCarpan,
        standart_setli_boyali_kg_try: standartSetliBoyaliKgTRY_40x60 * trySatisFiyatCarpan,
      };
      
      // Önce geçici hesapları temizle ve ardından yeni hesapları ekle
      await axios.delete(`${API_URLS.geciciHesaplar}/all`);
      await axios.delete(`${API_URLS.maliyetListesi}/all`);
      
      // Verileri kaydet
      await axios.post(API_URLS.geciciHesaplar, geciciHesapItem);
      await axios.post(API_URLS.maliyetListesi, maliyetItem);
      
      // Sonuçları çek
      await fetchCostResults();
      
      toast.success('Özel panel maliyet hesaplaması tamamlandı');
    } catch (error) {
      console.error('Özel panel hesaplama hatası:', error);
      toast.error(`Hesaplama hatası (${stok_kodu}): ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, calculation: false }));
    }
  };

  // Excel'e aktarma fonksiyonu
  const exportToExcel = () => {
    if (filteredCostResults.length === 0) {
      toast.error('Dışa aktarılacak veri bulunamadı');
      return;
    }
    
    try {
      // Excel'de düzgün görünecek şekilde verileri hazırla
      const data = filteredCostResults.map(item => ({
        'ID': item.id,
        'Panel Kodu': item.panel_kodu,
        'Stok Kodu': item.stok_kodu,
        'Manuel Sıralama': item.manual_order,
        
        // Çıplak maliyet
        'Çıplak Adet USD': item.ciplak_adet_usd,
        'Çıplak Adet EUR': item.ciplak_adet_eur,
        'Çıplak Adet TRY': item.ciplak_adet_try,
        
        'Çıplak M² USD': item.ciplak_m2_usd,
        'Çıplak M² EUR': item.ciplak_m2_eur,
        'Çıplak M² TRY': item.ciplak_m2_try,
        
        'Çıplak Kg USD': item.ciplak_kg_usd,
        'Çıplak Kg EUR': item.ciplak_kg_eur,
        'Çıplak Kg TRY': item.ciplak_kg_try,
        
        // Boyalı maliyet
        'Boyalı Adet USD': item.boyali_adet_usd,
        'Boyalı Adet EUR': item.boyali_adet_eur,
        'Boyalı Adet TRY': item.boyali_adet_try,
        
        'Boyalı M² USD': item.boyali_m2_usd,
        'Boyalı M² EUR': item.boyali_m2_eur,
        'Boyalı M² TRY': item.boyali_m2_try,
        
        'Boyalı Kg USD': item.boyali_kg_usd,
        'Boyalı Kg EUR': item.boyali_kg_eur,
        'Boyalı Kg TRY': item.boyali_kg_try,
        
        // Standart Set+Boyasız
        'Standart Setli + Boyasız Adet USD': item.standart_setli_boyasiz_adet_usd,
        'Standart Setli + Boyasız Adet EUR': item.standart_setli_boyasiz_adet_eur,
        'Standart Setli + Boyasız Adet TRY': item.standart_setli_boyasiz_adet_try,
        
        'Standart Setli + Boyasız M² USD': item.standart_setli_boyasiz_m2_usd,
        'Standart Setli + Boyasız M² EUR': item.standart_setli_boyasiz_m2_eur,
        'Standart Setli + Boyasız M² TRY': item.standart_setli_boyasiz_m2_try,
        
        'Standart Setli + Boyasız Kg USD': item.standart_setli_boyasiz_kg_usd,
        'Standart Setli + Boyasız Kg EUR': item.standart_setli_boyasiz_kg_eur,
        'Standart Setli + Boyasız Kg TRY': item.standart_setli_boyasiz_kg_try,
        
        // Standart Set+Boyalı
        'Standart Setli + Boyalı Adet USD': item.standart_setli_boyali_adet_usd,
        'Standart Setli + Boyalı Adet EUR': item.standart_setli_boyali_adet_eur,
        'Standart Setli + Boyalı Adet TRY': item.standart_setli_boyali_adet_try,
        
        'Standart Setli + Boyalı M² USD': item.standart_setli_boyali_m2_usd,
        'Standart Setli + Boyalı M² EUR': item.standart_setli_boyali_m2_eur,
        'Standart Setli + Boyalı M² TRY': item.standart_setli_boyali_m2_try,
        
        'Standart Setli + Boyalı Kg USD': item.standart_setli_boyali_kg_usd,
        'Standart Setli + Boyalı Kg EUR': item.standart_setli_boyali_kg_eur,
        'Standart Setli + Boyalı Kg TRY': item.standart_setli_boyali_kg_try,
      }));
      
      // Excel oluştur
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Maliyet Listesi');
      
      // Dosyayı indir
      XLSX.writeFile(wb, 'panel_cit_maliyet_listesi.xlsx');
      
      toast.success('Excel dosyası başarıyla oluşturuldu');
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast.error('Excel dosyası oluşturulamadı');
    }
  };

  // İlk yükleme
  useEffect(() => {
    fetchPanelList();
    fetchVariables();
    fetchCostResults();
  }, [fetchPanelList, fetchVariables, fetchCostResults]);

  // Filtreleme etkisi
  useEffect(() => {
    applyFilters();
  }, [filters, applyFilters]);

  // Maliyet sonuçları filtreleme etkisi
  useEffect(() => {
    applyCostFilters();
  }, [costFilters, applyCostFilters]);

  // Özel panel veri güncellendiğinde hesapla
  useEffect(() => {
    calculateCustomPanel();
  }, [customPanelData, calculateCustomPanel]);

  // Değişken formatlamak için yardımcı fonksiyon
  const formatNumber = (value, decimalPlaces = 2) => {
    if (value === undefined || value === null) return "0";
    
    // Sayıya çevir
    const num = parseFloat(value);
    
    // NaN kontrolü
    if (isNaN(num)) return "0";
    
    // Sıfır değerler için ondalık gösterme
    if (num === 0) return "0";
    
    // Ondalık kısmı varsa formatla
    const formatted = num.toFixed(decimalPlaces);
    
    // Sonundaki sıfırları kaldır
    return formatted.replace(/\.?0+$/, '');
  };

  return (
    <div className="space-y-6">
      {/* Panel Çit Listesi */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Panel Çit Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Panel Tipi Filtrele:</h3>
              <Select
                value={filters.panel_type || ""}
                onChange={(e) => setFilters({ ...filters, panel_type: e.target.value })}
                className="w-full"
              >
                <option value="">Tümü</option>
                <option value="Single">Single</option>
                <option value="Double">Double</option>
              </Select>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Yükseklik (cm):</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.min_height}
                  onChange={(e) => setFilters({ ...filters, min_height: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.max_height}
                  onChange={(e) => setFilters({ ...filters, max_height: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Genişlik (cm):</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.min_width}
                  onChange={(e) => setFilters({ ...filters, min_width: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.max_width}
                  onChange={(e) => setFilters({ ...filters, max_width: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Dikey Tel Çapı (mm):</h3>
              <Select
                value={filters.dikey_tel_capi || ""}
                onChange={(e) => setFilters({ ...filters, dikey_tel_capi: e.target.value })}
                className="w-full"
              >
                <option value="">Tümü</option>
                {Array.from(new Set(panelList.map(p => p.dikey_tel_capi))).sort().map(cap => (
                  <option key={`dikey-${cap}`} value={cap}>{cap}</option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Yatay Tel Çapı (mm):</h3>
              <Select
                value={filters.yatay_tel_capi || ""}
                onChange={(e) => setFilters({ ...filters, yatay_tel_capi: e.target.value })}
                className="w-full"
              >
                <option value="">Tümü</option>
                {Array.from(new Set(panelList.map(p => p.yatay_tel_capi))).sort().map(cap => (
                  <option key={`yatay-${cap}`} value={cap}>{cap}</option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Panel Ara:</h3>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Panel kodu, stok kodu..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="flex-grow"
                />
                <Button variant="outline" size="icon" onClick={() => setFilters({ ...filters, searchTerm: '' })}>
                  <Search size={18} />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="relative overflow-x-auto border rounded-md">
            <Table>
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 w-12">
                    <Checkbox
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      aria-label="Tümünü seç"
                    />
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Panel Kodu</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yükseklik</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Genişlik</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">D.Tel Çapı</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Y.Tel Çapı</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">D.Göz Aralığı</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Y.Göz Aralığı</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renk</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading.panelList ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <Spinner size="md" />
                        <span className="ml-2">Yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPanels.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 text-center text-gray-500">
                      Hiç panel bulunamadı veya filtrelere uygun sonuç yok
                    </td>
                  </tr>
                ) : (
                  filteredPanels.map(panel => (
                    <tr key={panel.id} className="hover:bg-gray-50">
                      <td className="p-2 w-12">
                        <Checkbox
                          checked={selectedPanels.includes(panel.id)}
                          onChange={() => togglePanelSelection(panel.id)}
                          aria-label={`Seç ${panel.panel_kodu}`}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{panel.panel_kodu}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{panel.stok_kodu}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{panel.panel_cinsi}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{panel.panel_yuksekligi}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{panel.panel_genisligi}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{panel.dikey_tel_capi}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{panel.yatay_tel_capi}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{panel.dikey_goz_araligi}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{panel.yatay_goz_araligi}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {panel.renk === 0 ? 'Renksiz' : 
                         panel.renk === 6005 ? 'Yeşil (6005)' : 
                         panel.renk === 7016 ? 'Antrasit (7016)' : panel.renk}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
          
          <div className="mt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPanels([]);
                setSelectAll(false);
              }}
              disabled={selectedPanels.length === 0}
            >
              Seçimi Temizle
            </Button>
            
            <Button
              onClick={calculateCosts}
              disabled={selectedPanels.length === 0 || loading.calculation}
            >
              {loading.calculation ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Hesaplanıyor...
                </>
              ) : (
                <>
                  <Calculator size={16} className="mr-2" />
                  Maliyet Hesapla ({selectedPanels.length} panel)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Özel Panel Bilgileri ve Hesaplama */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Özel Panel & Palet Bilgilerini Hesaplama</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Panel Tipi:</h3>
              <Select
                value={customPanelData.panel_type}
                onChange={(e) => setCustomPanelData({ ...customPanelData, panel_type: e.target.value })}
                className="w-full"
              >
                <option value="Single">Single</option>
                <option value="Double">Double</option>
              </Select>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Panel Yüksekliği (cm):</h3>
              <Input
                type="number"
                value={customPanelData.panel_yuksekligi}
                onChange={(e) => setCustomPanelData({ ...customPanelData, panel_yuksekligi: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Panel Genişliği (cm):</h3>
              <Input
                type="number"
                value={customPanelData.panel_genisligi}
                onChange={(e) => setCustomPanelData({ ...customPanelData, panel_genisligi: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Renk:</h3>
              <Select
                value={customPanelData.renk}
                onChange={(e) => setCustomPanelData({ ...customPanelData, renk: parseInt(e.target.value) })}
                className="w-full"
              >
                <option value={0}>Renksiz</option>
                <option value={6005}>Yeşil (6005)</option>
                <option value={7016}>Antrasit (7016)</option>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Dikey Tel Çapı (mm):</h3>
              <Input
                type="number"
                value={customPanelData.dikey_tel_capi}
                onChange={(e) => setCustomPanelData({ ...customPanelData, dikey_tel_capi: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Yatay Tel Çapı (mm):</h3>
              <Input
                type="number"
                value={customPanelData.yatay_tel_capi}
                onChange={(e) => setCustomPanelData({ ...customPanelData, yatay_tel_capi: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Dikey Göz Aralığı (cm):</h3>
              <Input
                type="number"
                value={customPanelData.dikey_goz_araligi}
                onChange={(e) => setCustomPanelData({ ...customPanelData, dikey_goz_araligi: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Yatay Göz Aralığı (cm):</h3>
              <Input
                type="number"
                value={customPanelData.yatay_goz_araligi}
                onChange={(e) => setCustomPanelData({ ...customPanelData, yatay_goz_araligi: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Adet:</h3>
              <Input
                type="number"
                value={customPanelData.adet}
                onChange={(e) => setCustomPanelData({ ...customPanelData, adet: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Adet M²:</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.adet_m2)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Büküm Sayısı:</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.bukum_sayisi, 0)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Bükümdeki Çubuk Sayısı:</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.bukumdeki_cubuk_sayisi, 0)}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Dikey Çubuk Adet:</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.dikey_cubuk_adet, 0)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Yatay Çubuk Adet:</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.yatay_cubuk_adet, 0)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Adet Ağırlığı (kg):</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.adet_agirligi)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Boya Kg:</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.boya_kg)}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Boyalı Hali (kg):</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.boyali_hali)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">M² Ağırlık (kg):</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.m2_agirlik)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Paletteki Panel Sayısı:</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.paletteki_panel_sayisi, 0)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Palet Boş Ağırlık (kg):</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.palet_bos_agirlik)}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Paletsiz Toplam Ağırlık (kg):</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.paletsiz_toplam_agirlik)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Palet Dolu Ağırlık (kg):</h3>
              <Input
                type="text"
                value={formatNumber(customPanelCalculations.palet_dolu_agirlik)}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Icube Kodu:</h3>
              <Input
                type="text"
                value={customPanelCalculations.icube_code}
                readOnly
                className="bg-gray-50"
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Stok Kodu:</h3>
              <Input
                type="text"
                value={customPanelCalculations.stok_kodu}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button
              onClick={calculateCustomPanelCost}
              disabled={loading.calculation}
            >
              {loading.calculation ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Hesaplanıyor...
                </>
              ) : (
                <>
                  <Calculator size={16} className="mr-2" />
                  Maliyet Hesapla
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Değişkenler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Çit Değişkenler */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Panel Çit Değişkenler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Panel Kesme İşçi Sayısı:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_kesme_isci_sayisi_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_kesme_isci_sayisi_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Panel Kaynak İşçi Sayısı:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_kaynak_isci_sayisi_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_kaynak_isci_sayisi_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Panel Boya İşçi Sayısı:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_boya_isci_sayisi_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_boya_isci_sayisi_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Vardiya Sayısı:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_vardiya_sayisi_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_vardiya_sayisi_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Aylık Çalışma Günü:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_aylik_calisma_gunu_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_aylik_calisma_gunu_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Vardiya Süresi (Saat):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_vardiya_suresi_saat_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_vardiya_suresi_saat_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Kesme/Kaynak Hat Sayısı:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_kesme_kaynak_hat_sayisi_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_kesme_kaynak_hat_sayisi_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Boya Hat Sayısı:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_boya_hat_sayisi_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_boya_hat_sayisi_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Kesme/Kaynak Verimlilik (%):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_kesme_kaynak_verimlilik_ad * 100)}
                  onChange={(e) => setVariables({ ...variables, panel_kesme_kaynak_verimlilik_ad: (parseFloat(e.target.value) || 0) / 100 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Boya Verimlilik (%):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_boya_verimlilik_ad * 100)}
                  onChange={(e) => setVariables({ ...variables, panel_boya_verimlilik_ad: (parseFloat(e.target.value) || 0) / 100 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Aylık Kesme/Kaynak Kapasite (m²):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_aylik_kesme_kaynak_kapasite_ad)}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Aylık Boya Kapasite (m²):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_aylik_boya_kapasite_ad)}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">USD Satış Fiyat Çarpanı:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_usd_satis_fiyat_carpan_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_usd_satis_fiyat_carpan_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">EUR Satış Fiyat Çarpanı:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_eur_satis_fiyat_carpan_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_eur_satis_fiyat_carpan_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">TRY Satış Fiyat Çarpanı:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_try_satis_fiyat_carpan_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_try_satis_fiyat_carpan_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={calculateCapacities}
              >
                <RefreshCw size={16} className="mr-2" />
                Kapasiteleri Yeniden Hesapla
              </Button>
              
              <Button
                onClick={() => saveVariables('panelCit')}
                disabled={loading.saving}
              >
                {loading.saving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Değişkenleri Kaydet
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Profil Değişkenler */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Profil Değişkenler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Profil 40x60x1.5 (USD/kg):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.profil_40x60x1_5_usd_kg_ad)}
                  onChange={(e) => setVariables({ ...variables, profil_40x60x1_5_usd_kg_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Profil 40x60x2 (USD/kg):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.profil_40x60x2_usd_kg_ad)}
                  onChange={(e) => setVariables({ ...variables, profil_40x60x2_usd_kg_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Profil 50x50x1.5 (USD/kg):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.profil_50x50x1_5_usd_kg_ad)}
                  onChange={(e) => setVariables({ ...variables, profil_50x50x1_5_usd_kg_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Profil 25x25x1.5 (USD/kg):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.profil_25x25x1_5_usd_kg_ad)}
                  onChange={(e) => setVariables({ ...variables, profil_25x25x1_5_usd_kg_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Profil 30x30x1.5 (USD/kg):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.profil_30x30x1_5_usd_kg_ad)}
                  onChange={(e) => setVariables({ ...variables, profil_30x30x1_5_usd_kg_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Profil Menteşe 1 kg Tel (USD/kg):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.profil_menteşe_1_kg_tel_usd_kg_ad)}
                  onChange={(e) => setVariables({ ...variables, profil_menteşe_1_kg_tel_usd_kg_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => saveVariables('profil')}
                disabled={loading.saving}
              >
                {loading.saving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Değişkenleri Kaydet
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Statik Değişkenler */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Statik Değişkenler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Çelik Tel (USD/kg):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.celik_tel_usd_kg_ad)}
                  onChange={(e) => setVariables({ ...variables, celik_tel_usd_kg_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Panel Boy Fire (%):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_boy_fire_ad * 100)}
                  onChange={(e) => setVariables({ ...variables, panel_boy_fire_ad: (parseFloat(e.target.value) || 0) / 100 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Panel En Fire (%):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_en_fire_ad * 100)}
                  onChange={(e) => setVariables({ ...variables, panel_en_fire_ad: (parseFloat(e.target.value) || 0) / 100 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Kaynak Fire (%):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.kaynak_fire_ad * 100)}
                  onChange={(e) => setVariables({ ...variables, kaynak_fire_ad: (parseFloat(e.target.value) || 0) / 100 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Panel Boya (USD/kg):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.panel_boya_usd_kg_ad)}
                  onChange={(e) => setVariables({ ...variables, panel_boya_usd_kg_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Ortalama İşçi Maaşı (USD):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.ortalama_isci_maasi_usd_ad)}
                  onChange={(e) => setVariables({ ...variables, ortalama_isci_maasi_usd_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Elektrik Tüketim (USD/kWh):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.elektrik_tuketim_kwh_usd_ad)}
                  onChange={(e) => setVariables({ ...variables, elektrik_tuketim_kwh_usd_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Doğalgaz (USD/m³/saat):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.dogalgaz_standart_m3_saat_usd_ad)}
                  onChange={(e) => setVariables({ ...variables, dogalgaz_standart_m3_saat_usd_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Su (USD/ton):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.su_ton_usd_ad)}
                  onChange={(e) => setVariables({ ...variables, su_ton_usd_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Kesme Hattı Elektrik (kWh):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.kesme_hatti_elektrik_sarfiyat_kwh_ad)}
                  onChange={(e) => setVariables({ ...variables, kesme_hatti_elektrik_sarfiyat_kwh_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Kaynak Hattı Elektrik (kWh):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.kaynak_hatti_elektrik_sarfiyat_kwh_ad)}
                  onChange={(e) => setVariables({ ...variables, kaynak_hatti_elektrik_sarfiyat_kwh_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Kaynak Hattı Su (ton):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.kaynak_hatti_su_sarfiyat_ton_ad)}
                  onChange={(e) => setVariables({ ...variables, kaynak_hatti_su_sarfiyat_ton_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Boya Hattı Elektrik (kWh):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.boya_hatti_elektrik_sarfiyat_kwh_ad)}
                  onChange={(e) => setVariables({ ...variables, boya_hatti_elektrik_sarfiyat_kwh_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Boya Hattı Doğalgaz (m³):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.boya_hatti_dogalgaz_sarfiyat_m3_ad)}
                  onChange={(e) => setVariables({ ...variables, boya_hatti_dogalgaz_sarfiyat_m3_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Kira (USD/ay):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.kira_ay_usd_ad)}
                  onChange={(e) => setVariables({ ...variables, kira_ay_usd_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Diğer Maliyetler (USD/ay):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.diger_maliyetler_ay_usd_ad)}
                  onChange={(e) => setVariables({ ...variables, diger_maliyetler_ay_usd_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Finansman Gideri (USD/ay):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.finansman_gideri_ay_usd_ad)}
                  onChange={(e) => setVariables({ ...variables, finansman_gideri_ay_usd_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Amortismanlar (USD/ay):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.amortismanlar_ay_usd_ad)}
                  onChange={(e) => setVariables({ ...variables, amortismanlar_ay_usd_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Fabrika Alanı (m²):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.fabrika_alani_m2_ad)}
                  onChange={(e) => setVariables({ ...variables, fabrika_alani_m2_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => saveVariables('statik')}
                disabled={loading.saving}
              >
                {loading.saving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Değişkenleri Kaydet
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Genel Değişkenler ve Kurlar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Genel Değişkenler ve Döviz Kurları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Palet (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.palet_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, palet_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">40x60 Panel Direk (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_40x60_panel_direk_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_40x60_panel_direk_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">40x60 Panel Ayak (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_40x60_panel_ayak_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_40x60_panel_ayak_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">40x60 Panel Kelepçe (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_40x60_panel_kelepce_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_40x60_panel_kelepce_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">40x60 Panel Kapak (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_40x60_panel_kapak_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_40x60_panel_kapak_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">40x60 Panel Civata (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_40x60_panel_civata_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_40x60_panel_civata_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">50x50 Panel Direk (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_50x50_panel_direk_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_50x50_panel_direk_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">50x50 Panel Ayak (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_50x50_panel_ayak_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_50x50_panel_ayak_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">50x50 Panel Kelepçe (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_50x50_panel_kelepce_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_50x50_panel_kelepce_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">50x50 Panel Kapak (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_50x50_panel_kapak_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_50x50_panel_kapak_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">50x50 Panel Civata (USD/adet):</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.set_50x50_panel_civata_usd_adet_ad)}
                  onChange={(e) => setVariables({ ...variables, set_50x50_panel_civata_usd_adet_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">USD/TRY Kuru:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.usd_to_try_ad)}
                  onChange={(e) => setVariables({ ...variables, usd_to_try_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">EUR/TRY Kuru:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.eur_to_try_ad)}
                  onChange={(e) => setVariables({ ...variables, eur_to_try_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">USD/EUR Kuru:</h3>
                <Input
                  type="number"
                  value={formatNumber(variables.usd_to_eur_ad)}
                  onChange={(e) => setVariables({ ...variables, usd_to_eur_ad: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <div className="flex gap-4">
                <Button
                  onClick={() => saveVariables('genel')}
                  disabled={loading.saving}
                >
                  {loading.saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Genel Değişkenleri Kaydet
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => saveVariables('currency')}
                  disabled={loading.saving}
                >
                  {loading.saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Kurları Kaydet
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Maliyet Hesaplama Sonuçları */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Maliyet Hesaplama Sonuçları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Panel Tipi Filtrele:</h3>
              <Select
                value={costFilters.panel_type || ""}
                onChange={(e) => setCostFilters({ ...costFilters, panel_type: e.target.value })}
                className="w-full"
              >
                <option value="">Tümü</option>
                <option value="Single">Single</option>
                <option value="Double">Double</option>
              </Select>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Yükseklik (cm):</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={costFilters.min_height}
                  onChange={(e) => setCostFilters({ ...costFilters, min_height: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={costFilters.max_height}
                  onChange={(e) => setCostFilters({ ...costFilters, max_height: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Genişlik (cm):</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={costFilters.min_width}
                  onChange={(e) => setCostFilters({ ...costFilters, min_width: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={costFilters.max_width}
                  onChange={(e) => setCostFilters({ ...costFilters, max_width: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Dikey Tel Çapı (mm):</h3>
              <Select
                value={costFilters.dikey_tel_capi || ""}
                onChange={(e) => setCostFilters({ ...costFilters, dikey_tel_capi: e.target.value })}
                className="w-full"
              >
                <option value="">Tümü</option>
                {Array.from(new Set(panelList.map(p => p.dikey_tel_capi))).sort().map(cap => (
                  <option key={`cost-dikey-${cap}`} value={cap}>{cap}</option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Yatay Tel Çapı (mm):</h3>
              <Select
                value={costFilters.yatay_tel_capi || ""}
                onChange={(e) => setCostFilters({ ...costFilters, yatay_tel_capi: e.target.value })}
                className="w-full"
              >
                <option value="">Tümü</option>
                {Array.from(new Set(panelList.map(p => p.yatay_tel_capi))).sort().map(cap => (
                  <option key={`cost-yatay-${cap}`} value={cap}>{cap}</option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Panel Ara:</h3>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Panel kodu, stok kodu..."
                  value={costFilters.searchTerm}
                  onChange={(e) => setCostFilters({ ...costFilters, searchTerm: e.target.value })}
                  className="flex-grow"
                />
                <Button variant="outline" size="icon" onClick={() => setCostFilters({ ...costFilters, searchTerm: '' })}>
                  <Search size={18} />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={exportToExcel}
              disabled={filteredCostResults.length === 0}
            >
              <FileSpreadsheet size={16} className="mr-2" />
              Excel'e Aktar
            </Button>
          </div>

          <div className="relative overflow-x-auto border rounded-md">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Panel Kodu</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıplak Adet USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıplak Adet EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıplak Adet TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıplak M² USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıplak M² EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıplak M² TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıplak Kg USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıplak Kg EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çıplak Kg TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı Adet USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı Adet EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı Adet TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı M² USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı M² EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı M² TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı Kg USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı Kg EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boyalı Kg TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyasız Adet USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyasız Adet EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyasız Adet TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyasız M² USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyasız M² EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyasız M² TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyasız Kg USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyasız Kg EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyasız Kg TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyalı Adet USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyalı Adet EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyalı Adet TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyalı M² USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyalı M² EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyalı M² TRY</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyalı Kg USD</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyalı Kg EUR</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Set+Boyalı Kg TRY</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCostResults.length === 0 ? (
                    <tr>
                      <td colSpan={29} className="px-4 py-4 text-center text-gray-500">
                        Sonuç bulunamadı veya filtrelere uygun sonuç yok
                      </td>
                    </tr>
                  ) : (
                    filteredCostResults.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{item.panel_kodu}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{item.stok_kodu}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.ciplak_adet_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.ciplak_adet_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.ciplak_adet_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.ciplak_m2_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.ciplak_m2_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.ciplak_m2_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.ciplak_kg_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.ciplak_kg_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.ciplak_kg_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.boyali_adet_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.boyali_adet_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.boyali_adet_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.boyali_m2_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.boyali_m2_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.boyali_m2_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.boyali_kg_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.boyali_kg_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.boyali_kg_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyasiz_adet_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyasiz_adet_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyasiz_adet_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyasiz_m2_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyasiz_m2_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyasiz_m2_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyasiz_kg_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyasiz_kg_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyasiz_kg_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyali_adet_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyali_adet_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyali_adet_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyali_m2_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyali_m2_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyali_m2_try)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyali_kg_usd)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyali_kg_eur)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatNumber(item.standart_setli_boyali_kg_try)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PanelCitHesaplama;
